import { Request, Response } from 'express';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { jobManager } from '../utils/jobManager';
import { JobStatusResponse } from '../types';
import { safeLogger } from '../utils/logger';

export const getJobStatus = asyncHandler(async (req: Request, res: Response) => {
  const jobId = req.params.id;
  
  if (!jobId) {
    throw createError.badRequest('Job ID is required');
  }

  const job = jobManager.getJob(jobId);
  
  if (!job) {
    throw createError.notFound(`Job not found: ${jobId}`);
  }

  const response: JobStatusResponse = {
    job_id: job.id,
    status: job.status,
    progress: job.progress,
    created_at: job.createdAt.toISOString(),
    updated_at: job.updatedAt.toISOString(),
    details: job.details
  };

  safeLogger.debug('Job status retrieved', {
    jobId: job.id,
    status: job.status,
    progress: job.progress
  });

  res.json(response);
});

export const listJobs = asyncHandler(async (req: Request, res: Response) => {
  // This is a simple in-memory implementation
  // In production, you'd want pagination and filtering
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
  const status = req.query.status as string;

  // Get all jobs (in a real implementation, this would be from a database)
  const allJobIds = Object.keys(jobManager as any); // This is a hack since jobs are private
  const jobs = [];
  
  // This is a simplified implementation since jobManager doesn't expose a list method
  safeLogger.info('Jobs list requested', {
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

export const cancelJob = asyncHandler(async (req: Request, res: Response) => {
  const jobId = req.params.id;
  
  if (!jobId) {
    throw createError.badRequest('Job ID is required');
  }

  const job = jobManager.getJob(jobId);
  
  if (!job) {
    throw createError.notFound(`Job not found: ${jobId}`);
  }

  if (job.status === 'completed' || job.status === 'failed') {
    throw createError.badRequest(`Cannot cancel job with status: ${job.status}`);
  }

  // Mark job as failed with cancellation message
  const cancelledJob = jobManager.failJob(jobId, 'Job cancelled by user');

  if (!cancelledJob) {
    throw createError.internal('Failed to cancel job');
  }

  safeLogger.info('Job cancelled', {
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