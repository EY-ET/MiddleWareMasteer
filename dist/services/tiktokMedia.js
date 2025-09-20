"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tiktokMedia = void 0;
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
const tiktokAuth_1 = require("./tiktokAuth");
const fs_1 = __importDefault(require("fs"));
const form_data_1 = __importDefault(require("form-data"));
class TikTokMediaService {
    constructor() {
        this.MAX_RETRIES = 3;
        this.RETRY_DELAY = 1000; // 1 second
    }
    static getInstance() {
        if (!TikTokMediaService.instance) {
            TikTokMediaService.instance = new TikTokMediaService();
        }
        return TikTokMediaService.instance;
    }
    // Upload image using TikTok's media transfer flow
    async uploadImage(imagePath, accountId = 'default', retryCount = 0) {
        try {
            logger_1.safeLogger.info('Starting image upload to TikTok', { imagePath, accountId, retryCount });
            // Step 1: Initialize upload session
            const uploadSession = await this.initializeUploadSession(accountId);
            // Step 2: Upload file to TikTok's upload URL
            await this.uploadFileToTikTok(imagePath, uploadSession.upload_url);
            // Step 3: Commit the upload
            await this.commitUpload(uploadSession.media_id, accountId);
            logger_1.safeLogger.info('Image uploaded successfully to TikTok', {
                imagePath,
                mediaId: uploadSession.media_id,
                accountId
            });
            return uploadSession.media_id;
        }
        catch (error) {
            const errorMessage = error.message;
            logger_1.safeLogger.error('Image upload failed', {
                imagePath,
                accountId,
                retryCount,
                error: errorMessage
            });
            // Retry logic for specific error types
            if (retryCount < this.MAX_RETRIES) {
                const shouldRetry = this.shouldRetryUpload(errorMessage);
                if (shouldRetry) {
                    logger_1.safeLogger.info('Retrying image upload', {
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
    async initializeUploadSession(accountId) {
        const accessToken = await tiktokAuth_1.tiktokAuth.getValidAccessToken(accountId);
        const url = `${config_1.config.tiktok.apiBaseUrl}/v2/post/publish/content/init/`;
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
        const data = await response.json();
        if (!response.ok || data.error) {
            throw new Error(`Failed to initialize upload session: ${data.error?.message || data.message || 'Unknown error'}`);
        }
        return {
            upload_url: data.data.upload_url,
            media_id: data.data.publish_id
        };
    }
    // Upload file directly to TikTok's upload URL
    async uploadFileToTikTok(filePath, uploadUrl) {
        const fileBuffer = fs_1.default.readFileSync(filePath);
        const formData = new form_data_1.default();
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
    async commitUpload(mediaId, accountId) {
        const accessToken = await tiktokAuth_1.tiktokAuth.getValidAccessToken(accountId);
        const url = `${config_1.config.tiktok.apiBaseUrl}/v2/post/publish/content/commit/`;
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
        const data = await response.json();
        if (!response.ok || data.error) {
            throw new Error(`Failed to commit upload: ${data.error?.message || data.message || 'Unknown error'}`);
        }
        // Check commit status
        if (data.data?.status !== 'PROCESSING_UPLOAD' && data.data?.status !== 'UPLOAD_COMPLETE') {
            throw new Error(`Upload commit returned unexpected status: ${data.data?.status}`);
        }
    }
    // Upload multiple images and return their media IDs
    async uploadMultipleImages(imagePaths, accountId = 'default') {
        const mediaIds = [];
        const errors = [];
        for (let i = 0; i < imagePaths.length; i++) {
            try {
                logger_1.safeLogger.info('Uploading image', {
                    index: i + 1,
                    total: imagePaths.length,
                    path: imagePaths[i]
                });
                const mediaId = await this.uploadImage(imagePaths[i], accountId);
                mediaIds.push(mediaId);
            }
            catch (error) {
                const errorMessage = `Image ${i + 1}: ${error.message}`;
                errors.push(errorMessage);
                logger_1.safeLogger.error('Failed to upload image in batch', {
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
        logger_1.safeLogger.info('Batch image upload completed', {
            totalImages: imagePaths.length,
            successfulUploads: mediaIds.length,
            accountId
        });
        return mediaIds;
    }
    // Upload base64 images
    async uploadBase64Images(base64Images, accountId = 'default') {
        const tempPaths = [];
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
                fs_1.default.writeFileSync(tempPath, buffer);
                tempPaths.push(tempPath);
            }
            // Upload the temporary files
            const mediaIds = await this.uploadMultipleImages(tempPaths, accountId);
            return mediaIds;
        }
        finally {
            // Clean up temporary files
            tempPaths.forEach(path => {
                try {
                    if (fs_1.default.existsSync(path)) {
                        fs_1.default.unlinkSync(path);
                    }
                }
                catch (error) {
                    logger_1.safeLogger.warn('Failed to cleanup temporary file', { path, error: error.message });
                }
            });
        }
    }
    // Check if we should retry the upload based on error
    shouldRetryUpload(errorMessage) {
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
        return retryableErrors.some(error => errorMessage.toLowerCase().includes(error.toLowerCase()));
    }
    // Delay utility for retry logic
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
exports.tiktokMedia = TikTokMediaService.getInstance();
//# sourceMappingURL=tiktokMedia.js.map