import { config } from '../config';
import { safeLogger } from '../utils/logger';
import { tiktokAuth } from './tiktokAuth';
import { TikTokMediaUploadResponse } from '../types';
import fs from 'fs';
import FormData from 'form-data';

interface TikTokUploadSessionResponse {
  upload_url: string;
  media_id: string;
}

interface TikTokCommitUploadResponse {
  status: string;
  message?: string;
}

class TikTokMediaService {
  private static instance: TikTokMediaService;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000; // 1 second

  private constructor() {}

  static getInstance(): TikTokMediaService {
    if (!TikTokMediaService.instance) {
      TikTokMediaService.instance = new TikTokMediaService();
    }
    return TikTokMediaService.instance;
  }

  // Upload image using TikTok's media transfer flow
  async uploadImage(
    imagePath: string,
    accountId: string = 'default',
    retryCount: number = 0
  ): Promise<string> {
    try {
      safeLogger.info('Starting image upload to TikTok', { imagePath, accountId, retryCount });

      // Step 1: Initialize upload session
      const uploadSession = await this.initializeUploadSession(accountId);
      
      // Step 2: Upload file to TikTok's upload URL
      await this.uploadFileToTikTok(imagePath, uploadSession.upload_url);
      
      // Step 3: Commit the upload
      await this.commitUpload(uploadSession.media_id, accountId);

      safeLogger.info('Image uploaded successfully to TikTok', { 
        imagePath, 
        mediaId: uploadSession.media_id,
        accountId 
      });

      return uploadSession.media_id;
    } catch (error) {
      const errorMessage = (error as Error).message;
      
      safeLogger.error('Image upload failed', { 
        imagePath, 
        accountId, 
        retryCount,
        error: errorMessage 
      });

      // Retry logic for specific error types
      if (retryCount < this.MAX_RETRIES) {
        const shouldRetry = this.shouldRetryUpload(errorMessage);
        
        if (shouldRetry) {
          safeLogger.info('Retrying image upload', { 
            imagePath, 
            accountId, 
            retryCount: retryCount + 1 
          });
          
          await this.delay(this.RETRY_DELAY * Math.pow(2, retryCount)); // Exponential backoff
          return this.uploadImage(imagePath, accountId, retryCount + 1);
        }
      }

      throw new Error(`Failed to upload image after ${retryCount + 1} attempts: ${errorMessage}`);
    }
  }

  // Initialize upload session with TikTok
  private async initializeUploadSession(accountId: string): Promise<TikTokUploadSessionResponse> {
    const accessToken = await tiktokAuth.getValidAccessToken(accountId);
    const url = `${config.tiktok.apiBaseUrl}/v2/post/publish/content/init/`;

    const body = {
      post_info: {
        title: "Carousel Upload Session",
        description: "Media upload session for carousel",
        privacy_level: "FOLLOWER_OF_CREATOR" // Can be overridden later
      },
      source_info: {
        source: "FILE_UPLOAD",
        video_size: 0,
        chunk_size: 10485760, // 10MB chunks
        total_chunk_count: 1
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const data = await response.json() as any;
    
    if (!response.ok || data.error) {
      throw new Error(`Failed to initialize upload session: ${data.error?.message || data.message || 'Unknown error'}`);
    }

    return {
      upload_url: data.data.upload_url,
      media_id: data.data.publish_id
    };
  }

  // Upload file directly to TikTok's upload URL
  private async uploadFileToTikTok(filePath: string, uploadUrl: string): Promise<void> {
    const fileBuffer = fs.readFileSync(filePath);
    const formData = new FormData();
    
    formData.append('file', fileBuffer, {
      filename: 'image.jpg',
      contentType: 'image/jpeg'
    });

    const response = await fetch(uploadUrl, {
      method: 'PUT',
      body: fileBuffer,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Length': fileBuffer.length.toString()
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to upload file to TikTok: ${response.status} ${response.statusText} - ${errorText}`);
    }
  }

  // Commit the upload to finalize media
  private async commitUpload(mediaId: string, accountId: string): Promise<void> {
    const accessToken = await tiktokAuth.getValidAccessToken(accountId);
    const url = `${config.tiktok.apiBaseUrl}/v2/post/publish/content/commit/`;

    const body = {
      publish_id: mediaId
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const data = await response.json() as any;
    
    if (!response.ok || data.error) {
      throw new Error(`Failed to commit upload: ${data.error?.message || data.message || 'Unknown error'}`);
    }

    // Check commit status
    if (data.data?.status !== 'PROCESSING_UPLOAD' && data.data?.status !== 'UPLOAD_COMPLETE') {
      throw new Error(`Upload commit returned unexpected status: ${data.data?.status}`);
    }
  }

  // Upload multiple images and return their media IDs
  async uploadMultipleImages(
    imagePaths: string[],
    accountId: string = 'default'
  ): Promise<string[]> {
    const mediaIds: string[] = [];
    const errors: string[] = [];

    for (let i = 0; i < imagePaths.length; i++) {
      try {
        safeLogger.info('Uploading image', { 
          index: i + 1, 
          total: imagePaths.length, 
          path: imagePaths[i] 
        });
        
        const mediaId = await this.uploadImage(imagePaths[i], accountId);
        mediaIds.push(mediaId);
      } catch (error) {
        const errorMessage = `Image ${i + 1}: ${(error as Error).message}`;
        errors.push(errorMessage);
        safeLogger.error('Failed to upload image in batch', { 
          index: i + 1, 
          path: imagePaths[i], 
          error: errorMessage 
        });
      }
    }

    if (errors.length > 0) {
      throw new Error(`Failed to upload ${errors.length} images: ${errors.join('; ')}`);
    }

    if (mediaIds.length === 0) {
      throw new Error('No images were successfully uploaded');
    }

    safeLogger.info('Batch image upload completed', { 
      totalImages: imagePaths.length,
      successfulUploads: mediaIds.length,
      accountId
    });

    return mediaIds;
  }

  // Upload base64 images
  async uploadBase64Images(
    base64Images: string[],
    accountId: string = 'default'
  ): Promise<string[]> {
    const tempPaths: string[] = [];
    
    try {
      // Convert base64 to temporary files
      for (let i = 0; i < base64Images.length; i++) {
        const base64Data = base64Images[i];
        const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        
        if (!matches || matches.length !== 3) {
          throw new Error(`Invalid base64 format for image ${i + 1}`);
        }

        const mimeType = matches[1];
        const base64Content = matches[2];
        const extension = mimeType.includes('png') ? '.png' : 
                         mimeType.includes('webp') ? '.webp' : '.jpg';
        
        const tempPath = `/tmp/tiktok-base64-${Date.now()}-${i}${extension}`;
        const buffer = Buffer.from(base64Content, 'base64');
        
        fs.writeFileSync(tempPath, buffer);
        tempPaths.push(tempPath);
      }

      // Upload the temporary files
      const mediaIds = await this.uploadMultipleImages(tempPaths, accountId);
      
      return mediaIds;
    } finally {
      // Clean up temporary files
      tempPaths.forEach(path => {
        try {
          if (fs.existsSync(path)) {
            fs.unlinkSync(path);
          }
        } catch (error) {
          safeLogger.warn('Failed to cleanup temporary file', { path, error: (error as Error).message });
        }
      });
    }
  }

  // Check if we should retry the upload based on error
  private shouldRetryUpload(errorMessage: string): boolean {
    const retryableErrors = [
      'network error',
      'timeout',
      'temporary failure',
      'rate limit',
      'server error',
      '502',
      '503',
      '504'
    ];

    return retryableErrors.some(error => 
      errorMessage.toLowerCase().includes(error.toLowerCase())
    );
  }

  // Delay utility for retry logic
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const tiktokMedia = TikTokMediaService.getInstance();