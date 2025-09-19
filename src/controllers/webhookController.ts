import { Request, Response } from 'express';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { jobManager } from '../utils/jobManager';
import { safeLogger } from '../utils/logger';
import { WebhookUploadRequest, WebhookUploadResponse } from '../types';

export const webhookUpload = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as WebhookUploadRequest;
  const files = req.files as Express.Multer.File[];
  
  safeLogger.info('Webhook upload request received', {
    hasFiles: files?.length || 0,
    hasCallback: !!body.callback_url,
    metadata: body.metadata
  });

  if (!files || files.length === 0) {
    throw createError.badRequest('No files provided in webhook upload');
  }

  if (files.length > 10) {
    throw createError.badRequest('Too many files (maximum 10 allowed)');
  }

  try {
    // Create a job for tracking the upload
    const job = jobManager.createJob(files.length);
    
    const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const statusUrl = `/api/jobs/${job.id}`;

    // Store metadata in job details
    if (body.metadata || body.callback_url) {
      const currentJob = jobManager.getJob(job.id);
      if (currentJob) {
        // Store webhook-specific data separately or extend the job details type
        safeLogger.info('Storing webhook metadata for job', {
          jobId: currentJob.id,
          hasMetadata: !!body.metadata,
          hasCallback: !!body.callback_url,
          uploadId
        });
      }
    }

    const response: WebhookUploadResponse = {
      job_id: job.id,
      status_url: statusUrl,
      upload_id: uploadId
    };

    safeLogger.info('Webhook upload initiated', {
      jobId: job.id,
      uploadId,
      fileCount: files.length,
      callbackUrl: body.callback_url
    });

    // Process the files asynchronously
    processWebhookUpload(job.id, files, body).catch(error => {
      safeLogger.error('Webhook upload processing failed', {
        jobId: job.id,
        uploadId,
        error: (error as Error).message
      });
      jobManager.failJob(job.id, (error as Error).message);
      
      // TODO: Call callback URL if provided
      if (body.callback_url) {
        notifyCallback(body.callback_url, job.id, 'failed', (error as Error).message);
      }
    });

    res.status(202).json(response); // 202 Accepted for async processing
  } catch (error) {
    safeLogger.error('Webhook upload failed', {
      error: (error as Error).message,
      fileCount: files?.length || 0
    });
    throw error;
  }
});

// Process webhook upload asynchronously
async function processWebhookUpload(
  jobId: string,
  files: Express.Multer.File[],
  body: WebhookUploadRequest
): Promise<void> {
  try {
    // Update job status
    jobManager.updateJob(jobId, { status: 'processing' });

    // For webhook uploads, we just store/process the files
    // The actual TikTok posting would be done in a separate request to /create-carousel
    let processedCount = 0;

    for (const file of files) {
      // Validate and process each file
      // In a real implementation, you might:
      // 1. Store files in object storage
      // 2. Generate thumbnails
      // 3. Extract metadata
      // 4. Validate content

      processedCount++;
      jobManager.updateJobProgress(jobId, processedCount);
      
      safeLogger.info('Webhook file processed', {
        jobId,
        filename: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
        progress: `${processedCount}/${files.length}`
      });
    }

    // Complete the job
    const completedJob = jobManager.completeJob(jobId, 'webhook_processed', {
      processed_files: files.length,
      upload_completed_at: new Date().toISOString()
    });

    safeLogger.info('Webhook upload processing completed', {
      jobId,
      processedFiles: files.length
    });

    // Notify callback if provided
    if (body.callback_url && completedJob) {
      await notifyCallback(
        body.callback_url, 
        jobId, 
        'completed', 
        null, 
        {
          processed_files: files.length,
          status_url: `/api/jobs/${jobId}`
        }
      );
    }
  } catch (error) {
    safeLogger.error('Webhook upload processing error', {
      jobId,
      error: (error as Error).message
    });
    throw error;
  }
}

// Notify callback URL about job status
async function notifyCallback(
  callbackUrl: string,
  jobId: string,
  status: string,
  error?: string | null,
  data?: any
): Promise<void> {
  try {
    const payload = {
      job_id: jobId,
      status,
      timestamp: new Date().toISOString(),
      error,
      data
    };

    const response = await fetch(callbackUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'TikTok-Carousel-Middleware/1.0'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Callback failed: ${response.status} ${response.statusText}`);
    }

    safeLogger.info('Callback notification sent successfully', {
      jobId,
      callbackUrl,
      status,
      responseStatus: response.status
    });
  } catch (error) {
    safeLogger.error('Failed to send callback notification', {
      jobId,
      callbackUrl,
      status,
      error: (error as Error).message
    });
    // Don't throw - callback failures shouldn't affect the main process
  }
}

export const verifyDomainCallback = asyncHandler(async (req: Request, res: Response) => {
  // This endpoint is used for TikTok domain verification
  const verificationToken = req.query.token as string;
  
  safeLogger.info('Domain verification callback received', {
    token: verificationToken?.substring(0, 10) + '...',
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });

  // In a real implementation, you would:
  // 1. Validate the token against expected value
  // 2. Return the verification file content or redirect
  // 3. Store verification status

  if (!verificationToken) {
    throw createError.badRequest('Verification token is required');
  }

  // For now, return a generic success response
  res.json({
    success: true,
    message: 'Domain verification endpoint',
    token: verificationToken,
    timestamp: new Date().toISOString()
  });
});