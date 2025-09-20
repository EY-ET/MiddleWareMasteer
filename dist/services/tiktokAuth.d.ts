import { TikTokCredentials } from '../types';
declare class TikTokAuthService {
    private static instance;
    private credentials;
    private constructor();
    static getInstance(): TikTokAuthService;
    generateAuthUrl(accountId?: string, scopes?: string[]): string;
    exchangeCodeForToken(code: string, accountId?: string): Promise<TikTokCredentials>;
    refreshToken(accountId?: string): Promise<TikTokCredentials>;
    getValidAccessToken(accountId?: string): Promise<string>;
    storeCredentials(accountId: string, credentials: TikTokCredentials): void;
    hasCredentials(accountId?: string): boolean;
    removeCredentials(accountId?: string): void;
    getAccountIds(): string[];
}
export declare const tiktokAuth: TikTokAuthService;
export {};
