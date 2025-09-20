"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleSingleImage = exports.handleMultipleImages = void 0;
exports.validateUploadedFiles = validateUploadedFiles;
exports.cleanupOldFiles = cleanupOldFiles;
exports.handleUploadErrors = handleUploadErrors;
const multer_1 = __importDefault(require("multer"));
const config_1 = require("../config");
const validation_1 = require("../utils/validation");
const logger_1 = require("../utils/logger");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const crypto_1 = __importDefault(require("crypto"));
// Ensure upload directory exists
const uploadDir = path_1.default.join(os_1.default.tmpdir(), 'tiktok-middleware-uploads');
if (!fs_1.default.existsSync(uploadDir)) {
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
}
// Configure multer for disk storage to avoid memory exhaustion
const storage = multer_1.default.diskStorage({
    destination: (req, file, callback) => {
        callback(null, uploadDir);
    },
    filename: (req, file, callback) => {
        // Generate secure filename to prevent path traversal
        const uniqueId = crypto_1.default.randomUUID();
        const sanitizedOriginalName = path_1.default.basename(file.originalname);
        const extension = path_1.default.extname(sanitizedOriginalName).toLowerCase();
        // Validate extension against allowed mime types
        const mimeExtMap = {
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
const fileFilter = (req, file, callback) => {
    const validation = (0, validation_1.validateImageFile)(file);
    if (!validation.valid) {
        logger_1.safeLogger.warn('File rejected by filter', {
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
const upload = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: {
        fileSize: config_1.config.upload.maxFileSizeMB * 1024 * 1024,
        files: config_1.config.upload.maxFilesPerRequest,
        fields: 10, // Limit number of non-file fields
        fieldSize: 1024 * 1024, // 1MB per field
        fieldNameSize: 100,
        headerPairs: 2000
    }
});
// Middleware for handling multiple image uploads
exports.handleMultipleImages = upload.array('images', config_1.config.upload.maxFilesPerRequest);
// Middleware for handling single image upload
exports.handleSingleImage = upload.single('image');
// Middleware to validate uploaded files and add metadata to request body
function validateUploadedFiles(req, res, next) {
    const files = req.files;
    if (files && files.length > 0) {
        // Add has_files flag to body for validation
        req.body.has_files = true;
        // Validate all files and clean up invalid ones
        const invalidFiles = [];
        for (const file of files) {
            const validation = (0, validation_1.validateImageFile)(file);
            if (!validation.valid) {
                logger_1.safeLogger.error('File validation failed after upload', {
                    filename: file.originalname,
                    path: file.path,
                    error: validation.error
                });
                // Clean up invalid file
                if (file.path && fs_1.default.existsSync(file.path)) {
                    fs_1.default.unlinkSync(file.path);
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
        logger_1.safeLogger.info('Files uploaded successfully', {
            fileCount: files.length,
            totalSize: files.reduce((sum, file) => sum + file.size, 0),
            uploadDir
        });
    }
    else {
        req.body.has_files = false;
    }
    next();
}
// Cleanup old uploaded files (should be called periodically)
function cleanupOldFiles(maxAgeMs = 24 * 60 * 60 * 1000) {
    try {
        const files = fs_1.default.readdirSync(uploadDir);
        const now = Date.now();
        let cleaned = 0;
        files.forEach(file => {
            const filePath = path_1.default.join(uploadDir, file);
            const stats = fs_1.default.statSync(filePath);
            if (now - stats.mtime.getTime() > maxAgeMs) {
                fs_1.default.unlinkSync(filePath);
                cleaned++;
            }
        });
        if (cleaned > 0) {
            logger_1.safeLogger.info('Cleaned up old upload files', { cleaned, uploadDir });
        }
    }
    catch (error) {
        logger_1.safeLogger.error('Error cleaning up old files', { error: error.message });
    }
}
// Error handling middleware for multer errors
function handleUploadErrors(error, req, res, next) {
    if (error instanceof multer_1.default.MulterError) {
        let errorMessage = 'File upload error';
        let errorCode = 'UPLOAD_ERROR';
        switch (error.code) {
            case 'LIMIT_FILE_SIZE':
                errorMessage = `File size exceeds ${config_1.config.upload.maxFileSizeMB}MB limit`;
                errorCode = 'FILE_TOO_LARGE';
                break;
            case 'LIMIT_FILE_COUNT':
                errorMessage = `Too many files. Maximum ${config_1.config.upload.maxFilesPerRequest} files allowed`;
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
        logger_1.safeLogger.error('Multer upload error', {
            code: error.code,
            message: error.message,
            field: error.field
        });
        res.status(400).json({
            success: false,
            error: errorMessage,
            code: errorCode,
            details: {
                maxFileSize: `${config_1.config.upload.maxFileSizeMB}MB`,
                maxFiles: config_1.config.upload.maxFilesPerRequest,
                allowedTypes: config_1.config.upload.allowedMimeTypes
            }
        });
        return;
    }
    // Handle other upload-related errors
    if (error.message?.includes('validation') || error.message?.includes('Invalid')) {
        logger_1.safeLogger.error('File validation error', { error: error.message });
        res.status(400).json({
            success: false,
            error: error.message,
            code: 'VALIDATION_ERROR'
        });
        return;
    }
    next(error);
}
//# sourceMappingURL=upload.js.map