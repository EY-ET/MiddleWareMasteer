"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const controllers_1 = require("../controllers");
const middleware_1 = require("../middleware");
const validation_1 = require("../utils/validation");
const joi_1 = __importDefault(require("joi"));
// Define common schemas locally
const commonSchemas = {
    jobId: joi_1.default.object({
        id: joi_1.default.string().pattern(/^job_\d+_[a-z0-9]+$/).required()
    }),
    pagination: joi_1.default.object({
        page: joi_1.default.number().integer().min(1).default(1),
        limit: joi_1.default.number().integer().min(1).max(100).default(10)
    })
};
const router = (0, express_1.Router)();
// Health check endpoints
router.get('/health', controllers_1.healthCheck);
router.get('/health/detailed', middleware_1.adminAuth, controllers_1.detailedHealth);
// Main carousel creation endpoint
router.post('/create-carousel', middleware_1.uploadRateLimiter, // Stricter rate limiting for uploads
middleware_1.optionalJwtAuth, // Optional JWT auth
middleware_1.handleMultipleImages, // Handle multipart file uploads
middleware_1.validateUploadedFiles, // Validate and set has_files flag
(0, middleware_1.validateRequest)({ body: validation_1.createCarouselSchema }), // Validate request body
middleware_1.handleUploadErrors, // Handle multer errors
controllers_1.createCarousel);
// Job status endpoints
router.get('/jobs/:id', (0, middleware_1.validateRequest)({ params: commonSchemas.jobId }), controllers_1.getJobStatus);
router.get('/jobs', (0, middleware_1.validateRequest)({ query: commonSchemas.pagination }), controllers_1.listJobs);
router.delete('/jobs/:id', middleware_1.adminAuth, // Only admins can cancel jobs
(0, middleware_1.validateRequest)({ params: commonSchemas.jobId }), controllers_1.cancelJob);
// Webhook endpoint for n8n uploads
router.post('/webhook/n8n-upload', middleware_1.uploadRateLimiter, (0, middleware_1.validateContentType)(['multipart/form-data']), middleware_1.handleMultipleImages, middleware_1.validateUploadedFiles, (0, middleware_1.validateRequest)({ body: validation_1.webhookUploadSchema }), middleware_1.handleUploadErrors, controllers_1.webhookUpload);
// Domain verification callback for TikTok
router.post('/verify-domain-callback', middleware_1.adminAuth, // Protect with admin auth
controllers_1.verifyDomainCallback);
router.get('/verify-domain-callback', controllers_1.verifyDomainCallback // Allow GET for verification
);
exports.default = router;
//# sourceMappingURL=api.js.map