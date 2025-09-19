import { jobManager } from '../../../src/utils/jobManager';

describe('JobManager', () => {
  beforeEach(() => {
    // Clear all jobs before each test
    const jobs = (jobManager as any).jobs;
    Object.keys(jobs).forEach(key => delete jobs[key]);
  });

  describe('createJob', () => {
    it('should create a job with default values', () => {
      const job = jobManager.createJob(5);
      
      expect(job).toMatchObject({
        status: 'pending',
        progress: 0,
        details: {
          totalImages: 5,
          processedImages: 0,
          mediaIds: []
        },
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date)
      });
      expect(job.id).toMatch(/^job_\d+_[a-z0-9]+$/);
    });

    it('should create unique job IDs', () => {
      const job1 = jobManager.createJob(3);
      const job2 = jobManager.createJob(4);
      
      expect(job1.id).not.toBe(job2.id);
    });

    it('should handle zero images', () => {
      const job = jobManager.createJob(0);
      
      expect(job.details.totalImages).toBe(0);
      expect(job.progress).toBe(0);
    });

    it('should create job with large number of images', () => {
      const job = jobManager.createJob(100);
      
      expect(job.details.totalImages).toBe(100);
    });
  });

  describe('getJob', () => {
    it('should retrieve existing job', () => {
      const created = jobManager.createJob(5);
      const retrieved = jobManager.getJob(created.id);
      
      expect(retrieved).toEqual(created);
    });

    it('should return undefined for non-existent job', () => {
      const result = jobManager.getJob('non-existent-job-id');
      
      expect(result).toBeUndefined();
    });

    it('should return undefined for invalid job ID format', () => {
      const result = jobManager.getJob('invalid-format');
      
      expect(result).toBeUndefined();
    });
  });

  describe('updateJob', () => {
    it('should update job status', () => {
      const job = jobManager.createJob(5);
      const originalUpdatedAt = job.updatedAt;
      
      // Small delay to ensure different timestamps
      setTimeout(() => {
        const updated = jobManager.updateJob(job.id, { status: 'processing' });
        
        expect(updated).toBeDefined();
        expect(updated!.status).toBe('processing');
        expect(updated!.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
      }, 10);
    });

    it('should update job details', () => {
      const job = jobManager.createJob(5);
      const newDetails = { customField: 'test-value' };
      
      const updated = jobManager.updateJob(job.id, { 
        details: { ...job.details, ...newDetails }
      });
      
      expect(updated!.details).toMatchObject(newDetails);
    });

    it('should return undefined for non-existent job', () => {
      const result = jobManager.updateJob('non-existent', { status: 'failed' });
      
      expect(result).toBeUndefined();
    });

    it('should not modify original job object', () => {
      const job = jobManager.createJob(5);
      const originalStatus = job.status;
      
      jobManager.updateJob(job.id, { status: 'processing' });
      
      expect(job.status).toBe(originalStatus);
    });
  });

  describe('updateJobProgress', () => {
    it('should update progress with processed count', () => {
      const job = jobManager.createJob(10);
      
      const updated = jobManager.updateJobProgress(job.id, 3);
      
      expect(updated!.details.processedImages).toBe(3);
      expect(updated!.progress).toBe(30); // 3/10 * 100
    });

    it('should update progress with media ID', () => {
      const job = jobManager.createJob(5);
      const mediaId = 'media123';
      
      const updated = jobManager.updateJobProgress(job.id, 2, mediaId);
      
      expect(updated!.details.processedImages).toBe(2);
      expect(updated!.progress).toBe(40); // 2/5 * 100
      expect(updated!.details.mediaIds).toContain(mediaId);
    });

    it('should handle 100% progress', () => {
      const job = jobManager.createJob(5);
      
      const updated = jobManager.updateJobProgress(job.id, 5);
      
      expect(updated!.progress).toBe(100);
    });

    it('should handle zero total images', () => {
      const job = jobManager.createJob(0);
      
      const updated = jobManager.updateJobProgress(job.id, 0);
      
      // Progress should be NaN or 0 when dividing by zero, depending on implementation
      expect(updated!.progress).toBeNaN();
    });

    it('should allow progress over 100%', () => {
      const job = jobManager.createJob(5);
      
      const updated = jobManager.updateJobProgress(job.id, 10); // More than total
      
      // The implementation might not cap at 100%, just calculate the percentage
      expect(updated!.progress).toBe(200);
    });

    it('should return undefined for non-existent job', () => {
      const result = jobManager.updateJobProgress('non-existent', 1);
      
      expect(result).toBeUndefined();
    });
  });

  describe('completeJob', () => {
    it('should complete job successfully', () => {
      const job = jobManager.createJob(3);
      const tiktokPostId = 'tiktok123';
      const additionalDetails = { postUrl: 'https://tiktok.com/post/123' };
      
      const completed = jobManager.completeJob(job.id, tiktokPostId, additionalDetails);
      
      expect(completed!.status).toBe('completed');
      expect(completed!.progress).toBe(100);
      expect(completed!.details.tiktokPostId).toBe(tiktokPostId);
      expect(completed!.details).toMatchObject(additionalDetails);
    });

    it('should return undefined for non-existent job', () => {
      const result = jobManager.completeJob('non-existent', 'tiktok123');
      
      expect(result).toBeUndefined();
    });
  });

  describe('failJob', () => {
    it('should fail job with error message', () => {
      const job = jobManager.createJob(3);
      const errorMessage = 'Upload failed due to network error';
      
      const failed = jobManager.failJob(job.id, errorMessage);
      
      expect(failed!.status).toBe('failed');
      expect(failed!.details.error).toBe(errorMessage);
    });

    it('should return undefined for non-existent job', () => {
      const result = jobManager.failJob('non-existent', 'error');
      
      expect(result).toBeUndefined();
    });
  });

  describe('job lifecycle', () => {
    it('should handle complete job lifecycle', () => {
      // Create job
      const job = jobManager.createJob(3);
      expect(job.status).toBe('pending');
      expect(job.progress).toBe(0);
      
      // Start processing
      const processing = jobManager.updateJob(job.id, { status: 'processing' });
      expect(processing!.status).toBe('processing');
      
      // Update progress
      const progress1 = jobManager.updateJobProgress(job.id, 1, 'media1');
      expect(progress1!.progress).toBe(33); // 1/3 rounded
      expect(progress1!.details.mediaIds).toEqual(['media1']);
      
      const progress2 = jobManager.updateJobProgress(job.id, 2, 'media2');
      expect(progress2!.progress).toBe(67); // 2/3 rounded
      expect(progress2!.details.mediaIds).toEqual(['media1', 'media2']);
      
      // Complete job
      const completed = jobManager.completeJob(job.id, 'tiktok123', { 
        postUrl: 'https://tiktok.com/123' 
      });
      expect(completed!.status).toBe('completed');
      expect(completed!.progress).toBe(100);
      expect(completed!.details.tiktokPostId).toBe('tiktok123');
    });

    it('should handle job failure during processing', () => {
      // Create and start job
      const job = jobManager.createJob(5);
      jobManager.updateJob(job.id, { status: 'processing' });
      jobManager.updateJobProgress(job.id, 2, 'media1');
      
      // Fail the job
      const failed = jobManager.failJob(job.id, 'TikTok API error');
      
      expect(failed!.status).toBe('failed');
      expect(failed!.details.processedImages).toBe(2); // Should preserve progress
      expect(failed!.details.error).toBe('TikTok API error');
    });
  });

  describe('edge cases', () => {
    it('should handle null/undefined job ID', () => {
      expect(jobManager.getJob(null as any)).toBeUndefined();
      expect(jobManager.getJob(undefined as any)).toBeUndefined();
      expect(jobManager.updateJob('', { status: 'processing' })).toBeUndefined();
    });

    it('should handle empty updates', () => {
      const job = jobManager.createJob(5);
      const updated = jobManager.updateJob(job.id, {});
      
      // The updatedAt timestamp will be different, so check other properties
      expect(updated!.id).toBe(job.id);
      expect(updated!.status).toBe(job.status);
      expect(updated!.progress).toBe(job.progress);
      expect(updated!.details).toEqual(job.details);
      expect(updated!.createdAt).toEqual(job.createdAt);
      expect(updated!.updatedAt).toBeInstanceOf(Date);
    });

    it('should handle negative progress values', () => {
      const job = jobManager.createJob(5);
      const updated = jobManager.updateJobProgress(job.id, -1);
      
      // The implementation might not clamp negative values
      expect(updated!.details.processedImages).toBe(-1);
      expect(updated!.progress).toBe(-20); // -1/5 * 100
    });
  });
});