import { Request, Response } from 'express';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { tiktokMedia, tiktokPost } from '../services';
import { jobManager } from '../utils/jobManager';
import { safeLogger } from '../utils/logger';
import { validateBase64Image, validateImageUrl } from '../utils/validation';
import { CreateCarouselRequest, CreateCarouselResponse } from '../types';
import fs from 'fs';

export const createCarousel = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as CreateCarouselRequest;
  const files = req.files as Express.Multer.File[];
  
  safeLogger.info('Creating carousel post request', {
    hasFiles: body.has_files,
    hasUrls: body.image_urls?.length || 0,
    hasBase64: body.image_base64?.length || 0,
    sync: body.sync,
    caption: body.caption?.substring(0, 100) + '...' // Log first 100 chars
  });

  try {
    const accountId = body.tiktok_account_id || 'default';
    let mediaIds: string[] = [];
    let imageCount = 0;

    // Determine sync vs async mode
    const isSync = body.sync !== false; // Default to sync

    // Count total images
    if (files && files.length > 0) {
      imageCount = files.length;
    } else if (body.image_urls && body.image_urls.length > 0) {
      imageCount = body.image_urls.length;
    } else if (body.image_base64 && body.image_base64.length > 0) {
      imageCount = body.image_base64.length;
    }

    if (imageCount === 0) {
      throw createError.badRequest('No images provided');
    }

    if (imageCount > 10) {
      throw createError.badRequest('TikTok supports a maximum of 10 images per carousel');
    }

    // Validate caption and tags
    const contentValidation = tiktokPost.validatePostContent(body.caption, body.tags);
    if (!contentValidation.valid) {
      throw createError.badRequest(`Invalid post content: ${contentValidation.error}`);
    }

    if (isSync) {
      // Synchronous processing - process and return immediately
      safeLogger.info('Processing carousel synchronously', { imageCount, accountId });

      if (files && files.length > 0) {
        // Upload multipart files
        const filePaths = files.map(file => file.path);
        mediaIds = await tiktokMedia.uploadMultipleImages(filePaths, accountId);
        
        // Clean up uploaded files after processing
        filePaths.forEach(path => {
          try {
            if (fs.existsSync(path)) {
              fs.unlinkSync(path);
            }
          } catch (error) {
            safeLogger.warn('Failed to cleanup uploaded file', { path, error: (error as Error).message });
          }
        });
      } else if (body.image_urls && body.image_urls.length > 0) {
        // Validate URLs and download/upload them
        for (const url of body.image_urls) {
          const urlValidation = validateImageUrl(url);
          if (!urlValidation.valid) {
            throw createError.badRequest(`Invalid image URL: ${urlValidation.error}`);
          }
        }
        
        // TODO: Implement URL downloading and uploading
        // For now, throw an error as this requires additional implementation
        throw createError.badRequest('URL-based image upload not yet implemented');
      } else if (body.image_base64 && body.image_base64.length > 0) {
        // Upload base64 images
        for (const base64 of body.image_base64) {
          const base64Validation = validateBase64Image(base64);
          if (!base64Validation.valid) {
            throw createError.badRequest(`Invalid base64 image: ${base64Validation.error}`);
          }
        }
        
        mediaIds = await tiktokMedia.uploadBase64Images(body.image_base64, accountId);
      }

      // Create the carousel post
      const postResult = await tiktokPost.createCarouselPost(
        mediaIds,
        {
          caption: body.caption,
          tags: body.tags,
          postAsDraft: body.post_as_draft
        },
        accountId
      );

      const response: CreateCarouselResponse = {
        success: true,
        tiktok_post_id: postResult.post_id,
        details: {
          media_count: mediaIds.length,
          post_url: postResult.share_url,
          draft: body.post_as_draft || false
        }
      };

      safeLogger.info('Carousel created successfully (sync)', {
        postId: postResult.post_id,
        mediaCount: mediaIds.length,
        accountId
      });

      res.json(response);
    } else {
      // Asynchronous processing - create job and return job ID
      const job = jobManager.createJob(imageCount);
      
      safeLogger.info('Processing carousel asynchronously', { 
        jobId: job.id, 
        imageCount, 
        accountId 
      });

      // Process asynchronously (don't await)
      processCarouselAsync(job.id, files, body, accountId).catch(error => {
        safeLogger.error('Async carousel processing failed', {
          jobId: job.id,
          error: (error as Error).message,
          accountId
        });
        jobManager.failJob(job.id, (error as Error).message);
      });

      const response: CreateCarouselResponse = {
        success: true,
        job_id: job.id,
        details: {
          media_count: imageCount
        }
      };

      res.json(response);
    }
  } catch (error) {
    safeLogger.error('Carousel creation failed', {
      error: (error as Error).message,
      hasFiles: body.has_files,
      sync: body.sync
    });

    // Clean up files on error if they exist
    if (files && files.length > 0) {
      files.forEach(file => {
        try {
          if (file.path && fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        } catch (cleanupError) {
          safeLogger.warn('Failed to cleanup file after error', { 
            path: file.path, 
            error: (cleanupError as Error).message 
          });
        }
      });
    }

    throw error;
  }
});

// Async processing function
async function processCarouselAsync(
  jobId: string, 
  files: Express.Multer.File[] | undefined,
  body: CreateCarouselRequest, 
  accountId: string
): Promise<void> {
  try {
    let mediaIds: string[] = [];
    let processedCount = 0;

    // Update job status
    jobManager.updateJob(jobId, { status: 'processing' });

    if (files && files.length > 0) {
      // Upload multipart files one by one
      const filePaths = files.map(file => file.path);
      
      for (const filePath of filePaths) {
        const mediaId = await tiktokMedia.uploadImage(filePath, accountId);
        mediaIds.push(mediaId);
        processedCount++;
        
        jobManager.updateJobProgress(jobId, processedCount, mediaId);
        
        // Clean up the file after processing
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (error) {
          safeLogger.warn('Failed to cleanup uploaded file', { filePath, error: (error as Error).message });
        }
      }
    } else if (body.image_base64 && body.image_base64.length > 0) {
      // Upload base64 images
      mediaIds = await tiktokMedia.uploadBase64Images(body.image_base64, accountId);
      jobManager.updateJobProgress(jobId, body.image_base64.length);
    } else if (body.image_urls && body.image_urls.length > 0) {
      // TODO: Implement URL downloading and uploading
      throw new Error('URL-based image upload not yet implemented');
    }

    // Create the carousel post
    const postResult = await tiktokPost.createCarouselPost(
      mediaIds,
      {
        caption: body.caption,
        tags: body.tags,
        postAsDraft: body.post_as_draft
      },
      accountId
    );

    // Mark job as completed
    jobManager.completeJob(jobId, postResult.post_id, {
      post_url: postResult.share_url,
      media_count: mediaIds.length,
      draft: body.post_as_draft || false
    });

    safeLogger.info('Async carousel processing completed', {
      jobId,
      postId: postResult.post_id,
      mediaCount: mediaIds.length
    });
  } catch (error) {
    safeLogger.error('Async carousel processing failed', {
      jobId,
      error: (error as Error).message
    });
    
    // Clean up any remaining files
    if (files && files.length > 0) {
      files.forEach(file => {
        try {
          if (file.path && fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        } catch (cleanupError) {
          safeLogger.warn('Failed to cleanup file after async error', { 
            path: file.path, 
            error: (cleanupError as Error).message 
          });
        }
      });
    }
    
    throw error;
  }
}