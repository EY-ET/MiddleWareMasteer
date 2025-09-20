"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCarousel = void 0;
const errorHandler_1 = require("../middleware/errorHandler");
const services_1 = require("../services");
const jobManager_1 = require("../utils/jobManager");
const logger_1 = require("../utils/logger");
const validation_1 = require("../utils/validation");
const fs_1 = __importDefault(require("fs"));
exports.createCarousel = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const body = req.body;
    const files = req.files;
    logger_1.safeLogger.info('Creating carousel post request', {
        hasFiles: body.has_files,
        hasUrls: body.image_urls?.length || 0,
        hasBase64: body.image_base64?.length || 0,
        sync: body.sync,
        caption: body.caption?.substring(0, 100) + '...' // Log first 100 chars
    });
    try {
        const accountId = body.tiktok_account_id || 'default';
        let mediaIds = [];
        let imageCount = 0;
        // Determine sync vs async mode
        const isSync = body.sync !== false; // Default to sync
        // Count total images
        if (files && files.length > 0) {
            imageCount = files.length;
        }
        else if (body.image_urls && body.image_urls.length > 0) {
            imageCount = body.image_urls.length;
        }
        else if (body.image_base64 && body.image_base64.length > 0) {
            imageCount = body.image_base64.length;
        }
        if (imageCount === 0) {
            throw errorHandler_1.createError.badRequest('No images provided');
        }
        if (imageCount > 10) {
            throw errorHandler_1.createError.badRequest('TikTok supports a maximum of 10 images per carousel');
        }
        // Validate caption and tags
        const contentValidation = services_1.tiktokPost.validatePostContent(body.caption, body.tags);
        if (!contentValidation.valid) {
            throw errorHandler_1.createError.badRequest(`Invalid post content: ${contentValidation.error}`);
        }
        if (isSync) {
            // Synchronous processing - process and return immediately
            logger_1.safeLogger.info('Processing carousel synchronously', { imageCount, accountId });
            if (files && files.length > 0) {
                // Upload multipart files
                const filePaths = files.map(file => file.path);
                mediaIds = await services_1.tiktokMedia.uploadMultipleImages(filePaths, accountId);
                // Clean up uploaded files after processing
                filePaths.forEach(path => {
                    try {
                        if (fs_1.default.existsSync(path)) {
                            fs_1.default.unlinkSync(path);
                        }
                    }
                    catch (error) {
                        logger_1.safeLogger.warn('Failed to cleanup uploaded file', { path, error: error.message });
                    }
                });
            }
            else if (body.image_urls && body.image_urls.length > 0) {
                // Validate URLs and download/upload them
                for (const url of body.image_urls) {
                    const urlValidation = (0, validation_1.validateImageUrl)(url);
                    if (!urlValidation.valid) {
                        throw errorHandler_1.createError.badRequest(`Invalid image URL: ${urlValidation.error}`);
                    }
                }
                // TODO: Implement URL downloading and uploading
                // For now, throw an error as this requires additional implementation
                throw errorHandler_1.createError.badRequest('URL-based image upload not yet implemented');
            }
            else if (body.image_base64 && body.image_base64.length > 0) {
                // Upload base64 images
                for (const base64 of body.image_base64) {
                    const base64Validation = (0, validation_1.validateBase64Image)(base64);
                    if (!base64Validation.valid) {
                        throw errorHandler_1.createError.badRequest(`Invalid base64 image: ${base64Validation.error}`);
                    }
                }
                mediaIds = await services_1.tiktokMedia.uploadBase64Images(body.image_base64, accountId);
            }
            // Create the carousel post
            const postResult = await services_1.tiktokPost.createCarouselPost(mediaIds, {
                caption: body.caption,
                tags: body.tags,
                postAsDraft: body.post_as_draft
            }, accountId);
            const response = {
                success: true,
                tiktok_post_id: postResult.post_id,
                details: {
                    media_count: mediaIds.length,
                    post_url: postResult.share_url,
                    draft: body.post_as_draft || false
                }
            };
            logger_1.safeLogger.info('Carousel created successfully (sync)', {
                postId: postResult.post_id,
                mediaCount: mediaIds.length,
                accountId
            });
            res.json(response);
        }
        else {
            // Asynchronous processing - create job and return job ID
            const job = jobManager_1.jobManager.createJob(imageCount);
            logger_1.safeLogger.info('Processing carousel asynchronously', {
                jobId: job.id,
                imageCount,
                accountId
            });
            // Process asynchronously (don't await)
            processCarouselAsync(job.id, files, body, accountId).catch(error => {
                logger_1.safeLogger.error('Async carousel processing failed', {
                    jobId: job.id,
                    error: error.message,
                    accountId
                });
                jobManager_1.jobManager.failJob(job.id, error.message);
            });
            const response = {
                success: true,
                job_id: job.id,
                details: {
                    media_count: imageCount
                }
            };
            res.json(response);
        }
    }
    catch (error) {
        logger_1.safeLogger.error('Carousel creation failed', {
            error: error.message,
            hasFiles: body.has_files,
            sync: body.sync
        });
        // Clean up files on error if they exist
        if (files && files.length > 0) {
            files.forEach(file => {
                try {
                    if (file.path && fs_1.default.existsSync(file.path)) {
                        fs_1.default.unlinkSync(file.path);
                    }
                }
                catch (cleanupError) {
                    logger_1.safeLogger.warn('Failed to cleanup file after error', {
                        path: file.path,
                        error: cleanupError.message
                    });
                }
            });
        }
        throw error;
    }
});
// Async processing function
async function processCarouselAsync(jobId, files, body, accountId) {
    try {
        let mediaIds = [];
        let processedCount = 0;
        // Update job status
        jobManager_1.jobManager.updateJob(jobId, { status: 'processing' });
        if (files && files.length > 0) {
            // Upload multipart files one by one
            const filePaths = files.map(file => file.path);
            for (const filePath of filePaths) {
                const mediaId = await services_1.tiktokMedia.uploadImage(filePath, accountId);
                mediaIds.push(mediaId);
                processedCount++;
                jobManager_1.jobManager.updateJobProgress(jobId, processedCount, mediaId);
                // Clean up the file after processing
                try {
                    if (fs_1.default.existsSync(filePath)) {
                        fs_1.default.unlinkSync(filePath);
                    }
                }
                catch (error) {
                    logger_1.safeLogger.warn('Failed to cleanup uploaded file', { filePath, error: error.message });
                }
            }
        }
        else if (body.image_base64 && body.image_base64.length > 0) {
            // Upload base64 images
            mediaIds = await services_1.tiktokMedia.uploadBase64Images(body.image_base64, accountId);
            jobManager_1.jobManager.updateJobProgress(jobId, body.image_base64.length);
        }
        else if (body.image_urls && body.image_urls.length > 0) {
            // TODO: Implement URL downloading and uploading
            throw new Error('URL-based image upload not yet implemented');
        }
        // Create the carousel post
        const postResult = await services_1.tiktokPost.createCarouselPost(mediaIds, {
            caption: body.caption,
            tags: body.tags,
            postAsDraft: body.post_as_draft
        }, accountId);
        // Mark job as completed
        jobManager_1.jobManager.completeJob(jobId, postResult.post_id, {
            post_url: postResult.share_url,
            media_count: mediaIds.length,
            draft: body.post_as_draft || false
        });
        logger_1.safeLogger.info('Async carousel processing completed', {
            jobId,
            postId: postResult.post_id,
            mediaCount: mediaIds.length
        });
    }
    catch (error) {
        logger_1.safeLogger.error('Async carousel processing failed', {
            jobId,
            error: error.message
        });
        // Clean up any remaining files
        if (files && files.length > 0) {
            files.forEach(file => {
                try {
                    if (file.path && fs_1.default.existsSync(file.path)) {
                        fs_1.default.unlinkSync(file.path);
                    }
                }
                catch (cleanupError) {
                    logger_1.safeLogger.warn('Failed to cleanup file after async error', {
                        path: file.path,
                        error: cleanupError.message
                    });
                }
            });
        }
        throw error;
    }
}
//# sourceMappingURL=carouselController.js.map