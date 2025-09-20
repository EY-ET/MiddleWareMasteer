import { Job } from '../types';
declare class JobManager {
    private jobs;
    private cleanupInterval;
    constructor();
    createJob(totalImages: number): Job;
    getJob(jobId: string): Job | undefined;
    updateJob(jobId: string, updates: Partial<Job>): Job | undefined;
    updateJobProgress(jobId: string, processedImages: number, mediaId?: string): Job | undefined;
    completeJob(jobId: string, tiktokPostId: string, details?: any): Job | undefined;
    failJob(jobId: string, error: string): Job | undefined;
    private generateJobId;
    private cleanupOldJobs;
    destroy(): void;
}
export declare const jobManager: JobManager;
export {};
