import { Router } from 'express';
import { 
  createCarousel, 
  healthCheck, 
  detailedHealth,
  getJobStatus,
  listJobs,
  cancelJob,
  webhookUpload,
  verifyDomainCallback
} from '../controllers';
import { 
  handleMultipleImages, 
  validateUploadedFiles, 
  handleUploadErrors,
  validateRequest,
  validateContentType,
  uploadRateLimiter,
  adminAuth,
  optionalJwtAuth
} from '../middleware';
import { createCarouselSchema, webhookUploadSchema } from '../utils/validation';
import Joi from 'joi';

// Define common schemas locally
const commonSchemas = {
  jobId: Joi.object({
    id: Joi.string().pattern(/^job_\d+_[a-z0-9]+$/).required()
  }),
  
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10)
  })
};

const router = Router();

// Health check endpoints
router.get('/health', healthCheck);
router.get('/health/detailed', adminAuth, detailedHealth);

// Main carousel creation endpoint
router.post('/create-carousel',
  uploadRateLimiter, // Stricter rate limiting for uploads
  optionalJwtAuth, // Optional JWT auth
  handleMultipleImages, // Handle multipart file uploads
  validateUploadedFiles, // Validate and set has_files flag
  validateRequest({ body: createCarouselSchema }), // Validate request body
  handleUploadErrors, // Handle multer errors
  createCarousel
);

// Job status endpoints
router.get('/jobs/:id', 
  validateRequest({ params: commonSchemas.jobId }),
  getJobStatus
);

router.get('/jobs',
  validateRequest({ query: commonSchemas.pagination }),
  listJobs
);

router.delete('/jobs/:id',
  adminAuth, // Only admins can cancel jobs
  validateRequest({ params: commonSchemas.jobId }),
  cancelJob
);

// Webhook endpoint for n8n uploads
router.post('/webhook/n8n-upload',
  uploadRateLimiter,
  validateContentType(['multipart/form-data']),
  handleMultipleImages,
  validateUploadedFiles,
  validateRequest({ body: webhookUploadSchema }),
  handleUploadErrors,
  webhookUpload
);

// Domain verification callback for TikTok
router.post('/verify-domain-callback',
  adminAuth, // Protect with admin auth
  verifyDomainCallback
);

router.get('/verify-domain-callback',
  verifyDomainCallback // Allow GET for verification
);

export default router;