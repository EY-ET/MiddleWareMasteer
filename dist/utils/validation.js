"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.webhookUploadSchema = exports.createCarouselSchema = void 0;
exports.validateImageFile = validateImageFile;
exports.validateImageUrl = validateImageUrl;
exports.validateBase64Image = validateBase64Image;
const joi_1 = __importDefault(require("joi"));
const config_1 = require("../config");
exports.createCarouselSchema = joi_1.default.object({
    caption: joi_1.default.string().max(2200).optional(),
    tags: joi_1.default.array().items(joi_1.default.string().max(100)).max(30).optional(),
    post_as_draft: joi_1.default.boolean().optional(),
    tiktok_account_id: joi_1.default.string().optional(),
    sync: joi_1.default.boolean().optional(),
    image_urls: joi_1.default.array().items(joi_1.default.string().uri()).max(config_1.config.upload.maxFilesPerRequest).optional(),
    image_base64: joi_1.default.array().items(joi_1.default.string()).max(config_1.config.upload.maxFilesPerRequest).optional(),
    has_files: joi_1.default.boolean().optional() // Set by middleware to indicate multipart files present
}).unknown(true).custom((value, helpers) => {
    // Ensure at least one image source is provided
    const hasFiles = value.has_files === true;
    const hasUrls = value.image_urls && value.image_urls.length > 0;
    const hasBase64 = value.image_base64 && value.image_base64.length > 0;
    if (!hasFiles && !hasUrls && !hasBase64) {
        return helpers.error('custom.noImages');
    }
    // Ensure only one image source type is provided
    const sourcesCount = Number(hasFiles) + Number(hasUrls) + Number(hasBase64);
    if (sourcesCount > 1) {
        return helpers.error('custom.multipleImageSources');
    }
    return value;
}).messages({
    'custom.noImages': 'At least one image source must be provided (files, image_urls, or image_base64)',
    'custom.multipleImageSources': 'Only one image source type is allowed per request'
});
exports.webhookUploadSchema = joi_1.default.object({
    callback_url: joi_1.default.string().uri().optional(),
    metadata: joi_1.default.object().optional()
});
function validateImageFile(file) {
    // Check file size
    const maxSizeBytes = config_1.config.upload.maxFileSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
        return { valid: false, error: `File size exceeds ${config_1.config.upload.maxFileSizeMB}MB limit` };
    }
    // Check MIME type
    if (!config_1.config.upload.allowedMimeTypes.includes(file.mimetype)) {
        return { valid: false, error: `Invalid file type. Allowed types: ${config_1.config.upload.allowedMimeTypes.join(', ')}` };
    }
    return { valid: true };
}
function validateImageUrl(url) {
    try {
        new URL(url);
        return { valid: true };
    }
    catch {
        return { valid: false, error: 'Invalid URL format' };
    }
}
function validateBase64Image(base64) {
    // Handle both data URL format and raw base64
    let mimeType;
    let base64Data;
    const dataUrlMatches = base64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (dataUrlMatches && dataUrlMatches.length === 3) {
        // Data URL format
        mimeType = dataUrlMatches[1];
        base64Data = dataUrlMatches[2];
    }
    else {
        // Assume raw base64, try to detect format by header
        base64Data = base64;
        // Try to decode first few bytes to detect image type
        try {
            const buffer = Buffer.from(base64Data.slice(0, 32), 'base64');
            if (buffer[0] === 0xFF && buffer[1] === 0xD8) {
                mimeType = 'image/jpeg';
            }
            else if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
                mimeType = 'image/png';
            }
            else if (buffer.slice(0, 4).toString() === 'RIFF' && buffer.slice(8, 12).toString() === 'WEBP') {
                mimeType = 'image/webp';
            }
            else {
                return { valid: false, error: 'Unable to detect image format from base64 data' };
            }
        }
        catch {
            return { valid: false, error: 'Invalid base64 data' };
        }
    }
    if (!config_1.config.upload.allowedMimeTypes.includes(mimeType)) {
        return { valid: false, error: `Invalid image type. Allowed types: ${config_1.config.upload.allowedMimeTypes.join(', ')}` };
    }
    // Estimate file size from base64
    const sizeBytes = (base64Data.length * 3) / 4;
    const maxSizeBytes = config_1.config.upload.maxFileSizeMB * 1024 * 1024;
    if (sizeBytes > maxSizeBytes) {
        return { valid: false, error: `Image size exceeds ${config_1.config.upload.maxFileSizeMB}MB limit` };
    }
    return { valid: true, mimeType };
}
//# sourceMappingURL=validation.js.map