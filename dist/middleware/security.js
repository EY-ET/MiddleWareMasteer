"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.compressionMiddleware = exports.securityHeaders = exports.corsOptions = exports.uploadRateLimiter = exports.rateLimiter = void 0;
exports.requestLogger = requestLogger;
exports.securityValidation = securityValidation;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const compression_1 = __importDefault(require("compression"));
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
// Rate limiting middleware
exports.rateLimiter = (0, express_rate_limit_1.default)({
    windowMs: config_1.config.rateLimit.windowMs,
    max: config_1.config.rateLimit.maxRequests,
    message: {
        success: false,
        error: 'Too many requests, please try again later',
        code: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger_1.safeLogger.warn('Rate limit exceeded', {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            endpoint: req.path
        });
        res.status(429).json({
            success: false,
            error: 'Too many requests, please try again later',
            code: 'RATE_LIMIT_EXCEEDED',
            details: {
                windowMs: config_1.config.rateLimit.windowMs,
                maxRequests: config_1.config.rateLimit.maxRequests
            }
        });
    }
});
// Stricter rate limiting for upload endpoints
exports.uploadRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: config_1.config.rateLimit.windowMs,
    max: Math.floor(config_1.config.rateLimit.maxRequests / 4), // 1/4 of normal rate
    message: {
        success: false,
        error: 'Upload rate limit exceeded, please wait before uploading again',
        code: 'UPLOAD_RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        // Skip rate limiting for trusted environments if needed
        return false;
    }
});
// CORS configuration
exports.corsOptions = (0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, etc.)
        if (!origin)
            return callback(null, true);
        if (config_1.config.cors.origins.includes(origin) || config_1.config.cors.origins.includes('*')) {
            return callback(null, true);
        }
        logger_1.safeLogger.warn('CORS origin blocked', { origin, allowedOrigins: config_1.config.cors.origins });
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
        'X-Admin-Key'
    ],
    maxAge: 86400 // 24 hours
});
// Security headers
exports.securityHeaders = (0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "https://open-api.tiktok.com"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"]
        }
    },
    crossOriginEmbedderPolicy: false,
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
});
// Request logging middleware
function requestLogger(req, res, next) {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        const logData = {
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            contentLength: res.get('Content-Length')
        };
        if (res.statusCode >= 400) {
            logger_1.safeLogger.warn('Request completed with error', logData);
        }
        else {
            logger_1.safeLogger.info('Request completed', logData);
        }
    });
    next();
}
// Compression middleware
exports.compressionMiddleware = (0, compression_1.default)({
    filter: (req, res) => {
        if (req.headers['x-no-compression']) {
            return false;
        }
        return compression_1.default.filter(req, res);
    },
    threshold: 1024 // Only compress if larger than 1KB
});
// Basic security validation middleware (lightweight)
function securityValidation(req, res, next) {
    // Only basic checks to prevent obvious malicious patterns
    const bodyString = JSON.stringify(req.body);
    // Check for extremely suspicious patterns only
    if (bodyString.length > 100000) { // Prevent extremely large payloads
        logger_1.safeLogger.warn('Request body too large', {
            size: bodyString.length,
            ip: req.ip,
            endpoint: req.path
        });
        res.status(413).json({
            success: false,
            error: 'Request payload too large',
            code: 'PAYLOAD_TOO_LARGE'
        });
        return;
    }
    next();
}
//# sourceMappingURL=security.js.map