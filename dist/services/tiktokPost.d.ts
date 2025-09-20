import { TikTokPostResponse } from '../types';
interface CreateCarouselOptions {
    caption?: string;
    tags?: string[];
    postAsDraft?: boolean;
    privacyLevel?: 'PUBLIC_TO_EVERYONE' | 'MUTUAL_FOLLOW_FRIEND' | 'FOLLOWER_OF_CREATOR' | 'SELF_ONLY';
}
declare class TikTokPostService {
    private static instance;
    private constructor();
    static getInstance(): TikTokPostService;
    createCarouselPost(mediaIds: string[], options?: CreateCarouselOptions, accountId?: string): Promise<TikTokPostResponse>;
    getPostStatus(postId: string, accountId?: string): Promise<any>;
    validateMediaIds(mediaIds: string[], accountId?: string): Promise<boolean>;
    getUserInfo(accountId?: string): Promise<any>;
    validatePostContent(caption?: string, tags?: string[]): {
        valid: boolean;
        error?: string;
    };
}
export declare const tiktokPost: TikTokPostService;
export {};
