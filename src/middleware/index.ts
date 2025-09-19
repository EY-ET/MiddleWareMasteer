// Export all middleware components for easy importing
export * from './auth';
export * from './security';
export * from './upload';
export * from './validation';
export * from './errorHandler';

// Re-export commonly used middleware combinations
export { 
  rateLimiter, 
  uploadRateLimiter, 
  corsOptions, 
  securityHeaders, 
  requestLogger,
  compressionMiddleware,
  securityValidation
} from './security';

export {
  adminAuth,
  optionalJwtAuth,
  requireJwtAuth
} from './auth';

export {
  handleMultipleImages,
  handleSingleImage,
  validateUploadedFiles,
  handleUploadErrors
} from './upload';

export {
  validateRequest,
  validateContentType,
  validateRequestSize,
  commonSchemas
} from './validation';

export {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  createError,
  CustomError
} from './errorHandler';