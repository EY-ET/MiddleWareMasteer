"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jobManager = void 0;
const logger_1 = require("./logger");
const config_1 = require("../config");
class JobManager {
    constructor() {
        this.jobs = new Map();
        // Clean up old jobs every hour
        this.cleanupInterval = setInterval(() => {
            this.cleanupOldJobs();
        }, 60 * 60 * 1000);
    }
    createJob(totalImages) {
        const job = {
            id: this.generateJobId(),
            status: 'pending',
            progress: 0,
            details: {
                totalImages,
                processedImages: 0,
                mediaIds: []
            },
            createdAt: new Date(),
            updatedAt: new Date()
        };
        this.jobs.set(job.id, job);
        logger_1.safeLogger.info('Job created', { jobId: job.id, totalImages });
        return job;
    }
    getJob(jobId) {
        return this.jobs.get(jobId);
    }
    updateJob(jobId, updates) {
        const job = this.jobs.get(jobId);
        if (!job)
            return undefined;
        const updatedJob = {
            ...job,
            ...updates,
            updatedAt: new Date()
        };
        this.jobs.set(jobId, updatedJob);
        logger_1.safeLogger.debug('Job updated', { jobId, updates });
        return updatedJob;
    }
    updateJobProgress(jobId, processedImages, mediaId) {
        const job = this.jobs.get(jobId);
        if (!job)
            return undefined;
        if (mediaId) {
            job.details.mediaIds.push(mediaId);
        }
        job.details.processedImages = processedImages;
        job.progress = Math.round((processedImages / job.details.totalImages) * 100);
        job.updatedAt = new Date();
        // Keep status as 'processing' until explicitly completed or failed
        if (job.status === 'pending') {
            job.status = 'processing';
        }
        this.jobs.set(jobId, job);
        return job;
    }
    completeJob(jobId, tiktokPostId, details) {
        const job = this.jobs.get(jobId);
        if (!job)
            return undefined;
        job.status = 'completed';
        job.progress = 100;
        job.details.tiktokPostId = tiktokPostId;
        job.updatedAt = new Date();
        if (details) {
            job.details = { ...job.details, ...details };
        }
        this.jobs.set(jobId, job);
        logger_1.safeLogger.info('Job completed', { jobId, tiktokPostId });
        return job;
    }
    failJob(jobId, error) {
        const job = this.jobs.get(jobId);
        if (!job)
            return undefined;
        job.status = 'failed';
        job.details.error = error;
        job.updatedAt = new Date();
        this.jobs.set(jobId, job);
        logger_1.safeLogger.error('Job failed', { jobId, error });
        return job;
    }
    generateJobId() {
        return 'job_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    cleanupOldJobs() {
        const cutoff = new Date(Date.now() - (config_1.config.jobs.cleanupAfterHours * 60 * 60 * 1000));
        const timeoutCutoff = new Date(Date.now() - config_1.config.jobs.timeoutMs);
        let cleaned = 0;
        let timedOut = 0;
        for (const [jobId, job] of this.jobs.entries()) {
            // Clean up old completed/failed jobs
            if (job.createdAt < cutoff && (job.status === 'completed' || job.status === 'failed')) {
                this.jobs.delete(jobId);
                cleaned++;
            }
            // Mark long-running jobs as failed
            else if (job.updatedAt < timeoutCutoff && (job.status === 'pending' || job.status === 'processing')) {
                job.status = 'failed';
                job.details.error = 'Job timed out';
                job.updatedAt = new Date();
                this.jobs.set(jobId, job);
                timedOut++;
            }
        }
        if (cleaned > 0 || timedOut > 0) {
            logger_1.safeLogger.info('Job cleanup completed', { cleaned, timedOut });
        }
    }
    destroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
    }
}
exports.jobManager = new JobManager();
//# sourceMappingURL=jobManager.js.map