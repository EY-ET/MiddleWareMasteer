"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tiktokPost = void 0;
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
const tiktokAuth_1 = require("./tiktokAuth");
class TikTokPostService {
    constructor() { }
    static getInstance() {
        if (!TikTokPostService.instance) {
            TikTokPostService.instance = new TikTokPostService();
        }
        return TikTokPostService.instance;
    }
    // Create a carousel post with uploaded media
    async createCarouselPost(mediaIds, options = {}, accountId = 'default') {
        if (!mediaIds || mediaIds.length === 0) {
            throw new Error('At least one media ID is required to create a carousel post');
        }
        if (mediaIds.length > 10) {
            throw new Error('TikTok carousel posts support a maximum of 10 images');
        }
        try {
            const accessToken = await tiktokAuth_1.tiktokAuth.getValidAccessToken(accountId);
            const url = `${config_1.config.tiktok.apiBaseUrl}/v2/post/publish/`;
            // Prepare caption with hashtags
            let finalCaption = options.caption || '';
            if (options.tags && options.tags.length > 0) {
                const hashtags = options.tags.map(tag => tag.startsWith('#') ? tag : `#${tag}`).join(' ');
                finalCaption = finalCaption ? `${finalCaption}\n\n${hashtags}` : hashtags;
            }
            // Ensure caption doesn't exceed TikTok's limit
            if (finalCaption.length > 2200) {
                finalCaption = finalCaption.substring(0, 2197) + '...';
                logger_1.safeLogger.warn('Caption truncated to fit TikTok limit', {
                    originalLength: options.caption?.length,
                    finalLength: finalCaption.length
                });
            }
            const body = {
                post_info: {
                    title: finalCaption.substring(0, 150), // Title has a shorter limit
                    text: finalCaption,
                    privacy_level: options.privacyLevel || 'FOLLOWER_OF_CREATOR',
                    disable_duet: false,
                    disable_comment: false,
                    disable_stitch: false,
                    video_cover_timestamp_ms: 0
                },
                source_info: {
                    source: 'FILE_UPLOAD',
                    photo_cover_index: 0, // Use first image as cover
                    photo_images: mediaIds.map(id => ({ media_id: id }))
                }
            };
            // Set as draft if requested
            if (options.postAsDraft) {
                body.post_info.privacy_level = 'SELF_ONLY';
            }
            logger_1.safeLogger.info('Creating TikTok carousel post', {
                mediaCount: mediaIds.length,
                captionLength: finalCaption.length,
                postAsDraft: options.postAsDraft,
                accountId
            });
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
                const errorMessage = data.error?.message || data.message || `HTTP ${response.status}: ${response.statusText}`;
                logger_1.safeLogger.error('Failed to create carousel post', {
                    error: errorMessage,
                    status: response.status,
                    accountId,
                    mediaIds
                });
                throw new Error(`Failed to create carousel post: ${errorMessage}`);
            }
            const postData = data.data;
            const result = {
                post_id: postData.publish_id,
                share_url: postData.share_url
            };
            logger_1.safeLogger.info('Carousel post created successfully', {
                postId: result.post_id,
                shareUrl: result.share_url,
                accountId,
                mediaCount: mediaIds.length,
                status: postData.status
            });
            return result;
        }
        catch (error) {
            logger_1.safeLogger.error('Error creating carousel post', {
                error: error.message,
                accountId,
                mediaCount: mediaIds.length
            });
            throw error;
        }
    }
    // Get post status (for checking processing status)
    async getPostStatus(postId, accountId = 'default') {
        try {
            const accessToken = await tiktokAuth_1.tiktokAuth.getValidAccessToken(accountId);
            const url = `${config_1.config.tiktok.apiBaseUrl}/v2/post/publish/status/get/`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    publish_id: postId
                })
            });
            const data = await response.json();
            if (!response.ok || data.error) {
                throw new Error(`Failed to get post status: ${data.error?.message || data.message || 'Unknown error'}`);
            }
            return data.data;
        }
        catch (error) {
            logger_1.safeLogger.error('Error getting post status', {
                postId,
                accountId,
                error: error.message
            });
            throw error;
        }
    }
    // Validate media IDs before creating post
    async validateMediaIds(mediaIds, accountId = 'default') {
        // This would ideally check with TikTok API if media IDs are valid and ready
        // For now, we'll do basic validation
        if (!mediaIds || mediaIds.length === 0) {
            return false;
        }
        // Check format of media IDs (TikTok typically uses numeric IDs)
        const validFormat = mediaIds.every(id => typeof id === 'string' && id.length > 0 && /^[a-zA-Z0-9_-]+$/.test(id));
        if (!validFormat) {
            logger_1.safeLogger.warn('Invalid media ID format detected', { mediaIds });
            return false;
        }
        return true;
    }
    // Get user information to validate account access
    async getUserInfo(accountId = 'default') {
        try {
            const accessToken = await tiktokAuth_1.tiktokAuth.getValidAccessToken(accountId);
            const url = `${config_1.config.tiktok.apiBaseUrl}/v2/user/info/`;
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });
            const data = await response.json();
            if (!response.ok || data.error) {
                throw new Error(`Failed to get user info: ${data.error?.message || data.message || 'Unknown error'}`);
            }
            logger_1.safeLogger.info('Retrieved user info', {
                accountId,
                username: data.data?.user?.display_name,
                userId: data.data?.user?.open_id
            });
            return data.data;
        }
        catch (error) {
            logger_1.safeLogger.error('Error getting user info', {
                accountId,
                error: error.message
            });
            throw error;
        }
    }
    // Validate caption and tags
    validatePostContent(caption, tags) {
        if (caption && caption.length > 2200) {
            return { valid: false, error: 'Caption exceeds 2200 character limit' };
        }
        if (tags && tags.length > 30) {
            return { valid: false, error: 'Too many tags (maximum 30 allowed)' };
        }
        if (tags) {
            const invalidTags = tags.filter(tag => tag.length > 100);
            if (invalidTags.length > 0) {
                return { valid: false, error: `Tag too long (maximum 100 characters): ${invalidTags[0]}` };
            }
        }
        return { valid: true };
    }
}
exports.tiktokPost = TikTokPostService.getInstance();
//# sourceMappingURL=tiktokPost.js.map