import Joi from 'joi';
import { config } from '../config';

export const createCarouselSchema = Joi.object({
  caption: Joi.string().max(2200).optional(),
  tags: Joi.array().items(Joi.string().max(100)).max(30).optional(),
  post_as_draft: Joi.boolean().optional(),
  tiktok_account_id: Joi.string().optional(),
  sync: Joi.boolean().optional(),
  image_urls: Joi.array().items(Joi.string().uri()).max(config.upload.maxFilesPerRequest).optional(),
  image_base64: Joi.array().items(Joi.string()).max(config.upload.maxFilesPerRequest).optional(),
  has_files: Joi.boolean().optional() // Set by middleware to indicate multipart files present
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

export const webhookUploadSchema = Joi.object({
  callback_url: Joi.string().uri().optional(),
  metadata: Joi.object().optional()
});

export function validateImageFile(file: Express.Multer.File): { valid: boolean; error?: string } {
  // Check file size
  const maxSizeBytes = config.upload.maxFileSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return { valid: false, error: `File size exceeds ${config.upload.maxFileSizeMB}MB limit` };
  }

  // Check MIME type
  if (!config.upload.allowedMimeTypes.includes(file.mimetype)) {
    return { valid: false, error: `Invalid file type. Allowed types: ${config.upload.allowedMimeTypes.join(', ')}` };
  }

  return { valid: true };
}

export function validateImageUrl(url: string): { valid: boolean; error?: string } {
  try {
    new URL(url);
    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
}

export function validateBase64Image(base64: string): { valid: boolean; error?: string; mimeType?: string } {
  // Handle both data URL format and raw base64
  let mimeType: string;
  let base64Data: string;
  
  const dataUrlMatches = base64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (dataUrlMatches && dataUrlMatches.length === 3) {
    // Data URL format
    mimeType = dataUrlMatches[1];
    base64Data = dataUrlMatches[2];
  } else {
    // Assume raw base64, try to detect format by header
    base64Data = base64;
    // Try to decode first few bytes to detect image type
    try {
      const buffer = Buffer.from(base64Data.slice(0, 32), 'base64');
      if (buffer[0] === 0xFF && buffer[1] === 0xD8) {
        mimeType = 'image/jpeg';
      } else if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
        mimeType = 'image/png';
      } else if (buffer.slice(0, 4).toString() === 'RIFF' && buffer.slice(8, 12).toString() === 'WEBP') {
        mimeType = 'image/webp';
      } else {
        return { valid: false, error: 'Unable to detect image format from base64 data' };
      }
    } catch {
      return { valid: false, error: 'Invalid base64 data' };
    }
  }

  if (!config.upload.allowedMimeTypes.includes(mimeType)) {
    return { valid: false, error: `Invalid image type. Allowed types: ${config.upload.allowedMimeTypes.join(', ')}` };
  }

  // Estimate file size from base64
  const sizeBytes = (base64Data.length * 3) / 4;
  const maxSizeBytes = config.upload.maxFileSizeMB * 1024 * 1024;
  
  if (sizeBytes > maxSizeBytes) {
    return { valid: false, error: `Image size exceeds ${config.upload.maxFileSizeMB}MB limit` };
  }

  return { valid: true, mimeType };
}