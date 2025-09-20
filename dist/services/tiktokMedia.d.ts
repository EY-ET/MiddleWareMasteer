declare class TikTokMediaService {
    private static instance;
    private readonly MAX_RETRIES;
    private readonly RETRY_DELAY;
    private constructor();
    static getInstance(): TikTokMediaService;
    uploadImage(imagePath: string, accountId?: string, retryCount?: number): Promise<string>;
    private initializeUploadSession;
    private uploadFileToTikTok;
    private commitUpload;
    uploadMultipleImages(imagePaths: string[], accountId?: string): Promise<string[]>;
    uploadBase64Images(base64Images: string[], accountId?: string): Promise<string[]>;
    private shouldRetryUpload;
    private delay;
}
export declare const tiktokMedia: TikTokMediaService;
export {};
