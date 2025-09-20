import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import { safeLogger } from '../utils/logger';

// Rate limiting middleware
export const rateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    success: false,
    error: 'Too many requests, please try again later',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    safeLogger.warn('Rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      endpoint: req.path
    });
    
    res.status(429).json({
      success: false,
      error: 'Too many requests, please try again later',
      code: 'RATE_LIMIT_EXCEEDED',
      details: {
        windowMs: config.rateLimit.windowMs,
        maxRequests: config.rateLimit.maxRequests
      }
    });
  }
});

// Stricter rate limiting for upload endpoints
export const uploadRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: Math.floor(config.rateLimit.maxRequests / 4), // 1/4 of normal rate
  message: {
    success: false,
    error: 'Upload rate limit exceeded, please wait before uploading again',
    code: 'UPLOAD_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => {
    // Skip rate limiting for trusted environments if needed
    return false;
  }
});

// CORS configuration
export const corsOptions = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    if (config.cors.origins.includes(origin) || config.cors.origins.includes('*')) {
      return callback(null, true);
    }
    
    safeLogger.warn('CORS origin blocked', { origin, allowedOrigins: config.cors.origins });
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
export const securityHeaders = helmet({
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
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
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
      safeLogger.warn('Request completed with error', logData);
    } else {
      safeLogger.info('Request completed', logData);
    }
  });
  
  next();
}

// Compression middleware
export const compressionMiddleware = compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  threshold: 1024 // Only compress if larger than 1KB
});

// Basic security validation middleware (lightweight)
export function securityValidation(req: Request, res: Response, next: NextFunction): void {
  // Only basic checks to prevent obvious malicious patterns
  const bodyString = JSON.stringify(req.body);
  
  // Check for extremely suspicious patterns only
  if (bodyString.length > 100000) { // Prevent extremely large payloads
    safeLogger.warn('Request body too large', {
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