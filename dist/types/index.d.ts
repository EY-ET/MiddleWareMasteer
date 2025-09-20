export interface TikTokCredentials {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    appId: string;
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: Date;
}
export interface TikTokMediaUploadResponse {
    upload_url: string;
    media_id: string;
}
export interface TikTokPostResponse {
    post_id: string;
    share_url?: string;
}
export interface Job {
    id: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress: number;
    details: {
        totalImages: number;
        processedImages: number;
        mediaIds: string[];
        tiktokPostId?: string;
        error?: string;
    };
    createdAt: Date;
    updatedAt: Date;
}
export interface CreateCarouselRequest {
    caption?: string;
    tags?: string[];
    post_as_draft?: boolean;
    tiktok_account_id?: string;
    sync?: boolean;
    image_urls?: string[];
    image_base64?: string[];
    has_files?: boolean;
}
export interface CreateCarouselResponse {
    success: boolean;
    tiktok_post_id?: string;
    job_id?: string;
    details?: {
        media_count: number;
        post_url?: string;
        draft?: boolean;
    };
    error?: string;
}
export interface WebhookUploadRequest {
    callback_url?: string;
    metadata?: Record<string, any>;
}
export interface WebhookUploadResponse {
    job_id: string;
    status_url: string;
    upload_id: string;
}
export interface JobStatusResponse {
    job_id: string;
    status: Job['status'];
    progress: number;
    created_at: string;
    updated_at: string;
    details: Job['details'];
}
export interface HealthCheckResponse {
    status: 'healthy' | 'unhealthy';
    timestamp: string;
    version: string;
    uptime: number;
    tiktok_api_status: 'connected' | 'disconnected' | 'error';
}
export interface ErrorResponse {
    success: false;
    error: string;
    code: string;
    details?: Record<string, any>;
}
export type ApiResponse<T = any> = T | ErrorResponse;
