"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancelJob = exports.listJobs = exports.getJobStatus = void 0;
const errorHandler_1 = require("../middleware/errorHandler");
const jobManager_1 = require("../utils/jobManager");
const logger_1 = require("../utils/logger");
exports.getJobStatus = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const jobId = req.params.id;
    if (!jobId) {
        throw errorHandler_1.createError.badRequest('Job ID is required');
    }
    const job = jobManager_1.jobManager.getJob(jobId);
    if (!job) {
        throw errorHandler_1.createError.notFound(`Job not found: ${jobId}`);
    }
    const response = {
        job_id: job.id,
        status: job.status,
        progress: job.progress,
        created_at: job.createdAt.toISOString(),
        updated_at: job.updatedAt.toISOString(),
        details: job.details
    };
    logger_1.safeLogger.debug('Job status retrieved', {
        jobId: job.id,
        status: job.status,
        progress: job.progress
    });
    res.json(response);
});
exports.listJobs = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    // This is a simple in-memory implementation
    // In production, you'd want pagination and filtering
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    const status = req.query.status;
    // Get all jobs (in a real implementation, this would be from a database)
    const allJobIds = Object.keys(jobManager_1.jobManager); // This is a hack since jobs are private
    const jobs = [];
    // This is a simplified implementation since jobManager doesn't expose a list method
    logger_1.safeLogger.info('Jobs list requested', {
        page,
        limit,
        status,
        message: 'Limited implementation - returns empty list'
    });
    res.json({
        jobs: [],
        pagination: {
            page,
            limit,
            total: 0,
            pages: 0
        },
        message: 'Job listing requires database implementation'
    });
});
exports.cancelJob = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const jobId = req.params.id;
    if (!jobId) {
        throw errorHandler_1.createError.badRequest('Job ID is required');
    }
    const job = jobManager_1.jobManager.getJob(jobId);
    if (!job) {
        throw errorHandler_1.createError.notFound(`Job not found: ${jobId}`);
    }
    if (job.status === 'completed' || job.status === 'failed') {
        throw errorHandler_1.createError.badRequest(`Cannot cancel job with status: ${job.status}`);
    }
    // Mark job as failed with cancellation message
    const cancelledJob = jobManager_1.jobManager.failJob(jobId, 'Job cancelled by user');
    if (!cancelledJob) {
        throw errorHandler_1.createError.internal('Failed to cancel job');
    }
    logger_1.safeLogger.info('Job cancelled', {
        jobId: job.id,
        previousStatus: job.status
    });
    res.json({
        success: true,
        message: 'Job cancelled successfully',
        job_id: jobId,
        status: 'failed'
    });
});
//# sourceMappingURL=jobController.js.map