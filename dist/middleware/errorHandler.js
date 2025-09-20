"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createError = exports.CustomError = void 0;
exports.notFoundHandler = notFoundHandler;
exports.errorHandler = errorHandler;
exports.asyncHandler = asyncHandler;
const logger_1 = require("../utils/logger");
const config_1 = require("../config");
// Custom error class
class CustomError extends Error {
    constructor(message, statusCode = 500, code, details) {
        super(message);
        this.statusCode = statusCode;
        this.code = code || 'INTERNAL_ERROR';
        this.details = details;
        // Maintains proper stack trace for where our error was thrown (only available on V8)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, CustomError);
        }
    }
}
exports.CustomError = CustomError;
// Not found middleware (404)
function notFoundHandler(req, res, next) {
    logger_1.safeLogger.warn('Route not found', {
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('User-Agent')
    });
    res.status(404).json({
        success: false,
        error: `Route ${req.method} ${req.url} not found`,
        code: 'ROUTE_NOT_FOUND'
    });
}
// Global error handler
function errorHandler(error, req, res, next) {
    // Don't send response if headers are already sent
    if (res.headersSent) {
        return next(error);
    }
    let statusCode = error.statusCode || 500;
    let errorCode = error.code || 'INTERNAL_ERROR';
    let message = error.message || 'Internal server error';
    let details = error.details;
    // Handle specific error types
    if (error.name === 'ValidationError') {
        statusCode = 400;
        errorCode = 'VALIDATION_ERROR';
        message = 'Request validation failed';
    }
    else if (error.name === 'UnauthorizedError') {
        statusCode = 401;
        errorCode = 'UNAUTHORIZED';
        message = 'Authentication required';
    }
    else if (error.name === 'ForbiddenError') {
        statusCode = 403;
        errorCode = 'FORBIDDEN';
        message = 'Access denied';
    }
    else if (error.name === 'NotFoundError') {
        statusCode = 404;
        errorCode = 'NOT_FOUND';
        message = 'Resource not found';
    }
    else if (error.name === 'MongoError' || error.name === 'SequelizeError') {
        statusCode = 500;
        errorCode = 'DATABASE_ERROR';
        message = 'Database operation failed';
        details = config_1.config.env === 'development' ? error.message : undefined;
    }
    else if (error.name === 'JsonWebTokenError') {
        statusCode = 401;
        errorCode = 'INVALID_TOKEN';
        message = 'Invalid authentication token';
    }
    else if (error.name === 'TokenExpiredError') {
        statusCode = 401;
        errorCode = 'TOKEN_EXPIRED';
        message = 'Authentication token has expired';
    }
    // Log error details
    const logLevel = statusCode >= 500 ? 'error' : 'warn';
    const logData = {
        statusCode,
        errorCode,
        message: error.message,
        stack: error.stack,
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        requestId: req.headers['x-request-id'],
        details: error.details
    };
    if (logLevel === 'error') {
        logger_1.safeLogger.error('Unhandled error', logData);
    }
    else {
        logger_1.safeLogger.warn('Request error', logData);
    }
    // Send error response
    const errorResponse = {
        success: false,
        error: message,
        code: errorCode
    };
    // Include details in development or for client errors
    if (details && (config_1.config.env === 'development' || statusCode < 500)) {
        errorResponse.details = details;
    }
    // Include stack trace in development
    if (config_1.config.env === 'development' && error.stack) {
        errorResponse.stack = error.stack;
    }
    res.status(statusCode).json(errorResponse);
}
// Async error wrapper utility
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
// Error factory functions
exports.createError = {
    badRequest: (message = 'Bad request', details) => new CustomError(message, 400, 'BAD_REQUEST', details),
    unauthorized: (message = 'Unauthorized', details) => new CustomError(message, 401, 'UNAUTHORIZED', details),
    forbidden: (message = 'Forbidden', details) => new CustomError(message, 403, 'FORBIDDEN', details),
    notFound: (message = 'Not found', details) => new CustomError(message, 404, 'NOT_FOUND', details),
    conflict: (message = 'Conflict', details) => new CustomError(message, 409, 'CONFLICT', details),
    tooLarge: (message = 'Request entity too large', details) => new CustomError(message, 413, 'REQUEST_TOO_LARGE', details),
    tooManyRequests: (message = 'Too many requests', details) => new CustomError(message, 429, 'TOO_MANY_REQUESTS', details),
    internal: (message = 'Internal server error', details) => new CustomError(message, 500, 'INTERNAL_ERROR', details),
    serviceUnavailable: (message = 'Service unavailable', details) => new CustomError(message, 503, 'SERVICE_UNAVAILABLE', details),
    tiktokError: (message, details) => new CustomError(`TikTok API error: ${message}`, 502, 'TIKTOK_API_ERROR', details)
};
//# sourceMappingURL=errorHandler.js.map