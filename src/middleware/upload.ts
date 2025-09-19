import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import { validateImageFile } from '../utils/validation';
import { safeLogger } from '../utils/logger';
import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';

// Ensure upload directory exists
const uploadDir = path.join(os.tmpdir(), 'tiktok-middleware-uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for disk storage to avoid memory exhaustion
const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, uploadDir);
  },
  filename: (req, file, callback) => {
    // Generate secure filename to prevent path traversal
    const uniqueId = crypto.randomUUID();
    const sanitizedOriginalName = path.basename(file.originalname);
    const extension = path.extname(sanitizedOriginalName).toLowerCase();
    
    // Validate extension against allowed mime types
    const mimeExtMap: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg', 
      'image/png': '.png',
      'image/webp': '.webp'
    };
    
    const allowedExt = mimeExtMap[file.mimetype];
    if (!allowedExt || (extension && extension !== allowedExt)) {
      callback(new Error(`Invalid file extension for mime type ${file.mimetype}`), '');
      return;
    }
    
    // Use secure filename with proper extension
    const secureFilename = `${uniqueId}${allowedExt || extension}`;
    callback(null, secureFilename);
  }
});

// File filter function
const fileFilter = (req: Request, file: Express.Multer.File, callback: multer.FileFilterCallback): void => {
  const validation = validateImageFile(file);
  
  if (!validation.valid) {
    safeLogger.warn('File rejected by filter', {
      filename: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      error: validation.error
    });
    callback(new Error(validation.error));
    return;
  }
  
  callback(null, true);
};

// Create multer instance
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.upload.maxFileSizeMB * 1024 * 1024,
    files: config.upload.maxFilesPerRequest,
    fields: 10, // Limit number of non-file fields
    fieldSize: 1024 * 1024, // 1MB per field
    fieldNameSize: 100,
    headerPairs: 2000
  }
});

// Middleware for handling multiple image uploads
export const handleMultipleImages = upload.array('images', config.upload.maxFilesPerRequest);

// Middleware for handling single image upload
export const handleSingleImage = upload.single('image');

// Middleware to validate uploaded files and add metadata to request body
export function validateUploadedFiles(req: Request, res: Response, next: NextFunction): void {
  const files = req.files as Express.Multer.File[];
  
  if (files && files.length > 0) {
    // Add has_files flag to body for validation
    req.body.has_files = true;
    
    // Validate all files and clean up invalid ones
    const invalidFiles: string[] = [];
    
    for (const file of files) {
      const validation = validateImageFile(file);
      if (!validation.valid) {
        safeLogger.error('File validation failed after upload', {
          filename: file.originalname,
          path: file.path,
          error: validation.error
        });
        
        // Clean up invalid file
        if (file.path && fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
        
        invalidFiles.push(file.originalname);
      }
    }
    
    if (invalidFiles.length > 0) {
      res.status(400).json({
        success: false,
        error: `File validation failed for: ${invalidFiles.join(', ')}`,
        code: 'INVALID_FILE',
        details: {
          invalidFiles,
          validFileCount: files.length - invalidFiles.length
        }
      });
      return;
    }
    
    safeLogger.info('Files uploaded successfully', {
      fileCount: files.length,
      totalSize: files.reduce((sum, file) => sum + file.size, 0),
      uploadDir
    });
  } else {
    req.body.has_files = false;
  }
  
  next();
}

// Cleanup old uploaded files (should be called periodically)
export function cleanupOldFiles(maxAgeMs: number = 24 * 60 * 60 * 1000): void {
  try {
    const files = fs.readdirSync(uploadDir);
    const now = Date.now();
    let cleaned = 0;
    
    files.forEach(file => {
      const filePath = path.join(uploadDir, file);
      const stats = fs.statSync(filePath);
      
      if (now - stats.mtime.getTime() > maxAgeMs) {
        fs.unlinkSync(filePath);
        cleaned++;
      }
    });
    
    if (cleaned > 0) {
      safeLogger.info('Cleaned up old upload files', { cleaned, uploadDir });
    }
  } catch (error) {
    safeLogger.error('Error cleaning up old files', { error: (error as Error).message });
  }
}

// Error handling middleware for multer errors
export function handleUploadErrors(error: any, req: Request, res: Response, next: NextFunction): void {
  if (error instanceof multer.MulterError) {
    let errorMessage = 'File upload error';
    let errorCode = 'UPLOAD_ERROR';
    
    switch (error.code as string) {
      case 'LIMIT_FILE_SIZE':
        errorMessage = `File size exceeds ${config.upload.maxFileSizeMB}MB limit`;
        errorCode = 'FILE_TOO_LARGE';
        break;
      case 'LIMIT_FILE_COUNT':
        errorMessage = `Too many files. Maximum ${config.upload.maxFilesPerRequest} files allowed`;
        errorCode = 'TOO_MANY_FILES';
        break;
      case 'LIMIT_FIELD_COUNT':
        errorMessage = 'Too many form fields';
        errorCode = 'TOO_MANY_FIELDS';
        break;
      case 'LIMIT_FIELD_SIZE':
        errorMessage = 'Field value too large';
        errorCode = 'FIELD_TOO_LARGE';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        errorMessage = 'Unexpected field name for file upload';
        errorCode = 'UNEXPECTED_FIELD';
        break;
      default:
        errorMessage = error.message;
    }
    
    safeLogger.error('Multer upload error', {
      code: error.code,
      message: error.message,
      field: error.field
    });
    
    res.status(400).json({
      success: false,
      error: errorMessage,
      code: errorCode,
      details: {
        maxFileSize: `${config.upload.maxFileSizeMB}MB`,
        maxFiles: config.upload.maxFilesPerRequest,
        allowedTypes: config.upload.allowedMimeTypes
      }
    });
    return;
  }
  
  // Handle other upload-related errors
  if (error.message?.includes('validation') || error.message?.includes('Invalid')) {
    safeLogger.error('File validation error', { error: error.message });
    
    res.status(400).json({
      success: false,
      error: error.message,
      code: 'VALIDATION_ERROR'
    });
    return;
  }
  
  next(error);
}