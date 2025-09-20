"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.commonSchemas = void 0;
exports.validateRequest = validateRequest;
exports.validateContentType = validateContentType;
exports.validateRequestSize = validateRequestSize;
const joi_1 = __importDefault(require("joi"));
const logger_1 = require("../utils/logger");
// Generic validation middleware factory
function validateRequest(schema) {
    return (req, res, next) => {
        const validationErrors = [];
        // Validate request body
        if (schema.body) {
            const { error, value } = schema.body.validate(req.body, {
                abortEarly: false,
                allowUnknown: true, // Allow multipart files and other fields
                stripUnknown: true
            });
            if (error) {
                error.details.forEach(detail => {
                    validationErrors.push(`Body: ${detail.message}`);
                });
            }
            else {
                req.body = value;
            }
        }
        // Validate query parameters
        if (schema.query) {
            const { error, value } = schema.query.validate(req.query, {
                abortEarly: false,
                allowUnknown: false,
                stripUnknown: true
            });
            if (error) {
                error.details.forEach(detail => {
                    validationErrors.push(`Query: ${detail.message}`);
                });
            }
            else {
                req.query = value;
            }
        }
        // Validate route parameters
        if (schema.params) {
            const { error, value } = schema.params.validate(req.params, {
                abortEarly: false,
                allowUnknown: false,
                stripUnknown: true
            });
            if (error) {
                error.details.forEach(detail => {
                    validationErrors.push(`Params: ${detail.message}`);
                });
            }
            else {
                req.params = value;
            }
        }
        if (validationErrors.length > 0) {
            logger_1.safeLogger.warn('Request validation failed', {
                errors: validationErrors,
                endpoint: req.path,
                method: req.method,
                ip: req.ip
            });
            res.status(400).json({
                success: false,
                error: 'Validation failed',
                code: 'VALIDATION_ERROR',
                details: {
                    errors: validationErrors
                }
            });
            return;
        }
        next();
    };
}
// Common validation schemas
exports.commonSchemas = {
    jobId: joi_1.default.object({
        id: joi_1.default.string().pattern(/^job_\d+_[a-z0-9]+$/).required()
    }),
    pagination: joi_1.default.object({
        page: joi_1.default.number().integer().min(1).default(1),
        limit: joi_1.default.number().integer().min(1).max(100).default(10)
    }),
    tiktokAccountId: joi_1.default.string().pattern(/^\d+$/).optional()
};
// Content-Type validation middleware
function validateContentType(allowedTypes) {
    return (req, res, next) => {
        const contentType = req.get('Content-Type') || '';
        const isAllowed = allowedTypes.some(type => contentType.toLowerCase().includes(type.toLowerCase()));
        if (!isAllowed) {
            logger_1.safeLogger.warn('Invalid content type', {
                contentType,
                allowedTypes,
                endpoint: req.path
            });
            res.status(415).json({
                success: false,
                error: `Unsupported content type: ${contentType}`,
                code: 'UNSUPPORTED_MEDIA_TYPE',
                details: {
                    allowedTypes
                }
            });
            return;
        }
        next();
    };
}
// Request size validation middleware
function validateRequestSize(maxSizeBytes) {
    return (req, res, next) => {
        const contentLength = parseInt(req.get('Content-Length') || '0');
        if (contentLength > maxSizeBytes) {
            logger_1.safeLogger.warn('Request too large', {
                contentLength,
                maxSizeBytes,
                endpoint: req.path
            });
            res.status(413).json({
                success: false,
                error: 'Request entity too large',
                code: 'REQUEST_TOO_LARGE',
                details: {
                    maxSize: `${Math.round(maxSizeBytes / 1024 / 1024)}MB`,
                    receivedSize: `${Math.round(contentLength / 1024 / 1024)}MB`
                }
            });
            return;
        }
        next();
    };
}
//# sourceMappingURL=validation.js.map