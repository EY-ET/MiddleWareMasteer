import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { safeLogger } from '../utils/logger';

// Generic validation middleware factory
export function validateRequest(schema: {
  body?: Joi.ObjectSchema;
  query?: Joi.ObjectSchema;
  params?: Joi.ObjectSchema;
}) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const validationErrors: string[] = [];
    
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
      } else {
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
      } else {
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
      } else {
        req.params = value;
      }
    }
    
    if (validationErrors.length > 0) {
      safeLogger.warn('Request validation failed', {
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
export const commonSchemas = {
  jobId: Joi.object({
    id: Joi.string().pattern(/^job_\d+_[a-z0-9]+$/).required()
  }),
  
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10)
  }),
  
  tiktokAccountId: Joi.string().pattern(/^\d+$/).optional()
};

// Content-Type validation middleware
export function validateContentType(allowedTypes: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentType = req.get('Content-Type') || '';
    
    const isAllowed = allowedTypes.some(type => 
      contentType.toLowerCase().includes(type.toLowerCase())
    );
    
    if (!isAllowed) {
      safeLogger.warn('Invalid content type', {
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
export function validateRequestSize(maxSizeBytes: number) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = parseInt(req.get('Content-Length') || '0');
    
    if (contentLength > maxSizeBytes) {
      safeLogger.warn('Request too large', {
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