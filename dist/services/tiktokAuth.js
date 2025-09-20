"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tiktokAuth = void 0;
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
const encryption_1 = require("../utils/encryption");
class TikTokAuthService {
    constructor() {
        this.credentials = new Map();
    }
    static getInstance() {
        if (!TikTokAuthService.instance) {
            TikTokAuthService.instance = new TikTokAuthService();
        }
        return TikTokAuthService.instance;
    }
    // Generate OAuth URL for authorization
    generateAuthUrl(accountId, scopes = ['content.read', 'content.write']) {
        const params = new URLSearchParams({
            client_key: config_1.config.tiktok.clientId,
            response_type: 'code',
            redirect_uri: config_1.config.tiktok.redirectUri,
            scope: scopes.join(','),
            state: accountId || 'default'
        });
        return `https://www.tiktok.com/auth/authorize/?${params.toString()}`;
    }
    // Exchange authorization code for access token
    async exchangeCodeForToken(code, accountId = 'default') {
        const url = `${config_1.config.tiktok.apiBaseUrl}/v2/oauth/token/`;
        const body = {
            client_key: config_1.config.tiktok.clientId,
            client_secret: config_1.config.tiktok.clientSecret,
            code,
            grant_type: 'authorization_code',
            redirect_uri: config_1.config.tiktok.redirectUri
        };
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });
            const data = await response.json();
            if (!response.ok || data.error) {
                throw new Error(`TikTok auth error: ${data.error_description || data.message || 'Unknown error'}`);
            }
            const tokenData = data.data;
            const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));
            const credentials = {
                clientId: config_1.config.tiktok.clientId,
                clientSecret: config_1.config.tiktok.clientSecret,
                redirectUri: config_1.config.tiktok.redirectUri,
                appId: config_1.config.tiktok.appId,
                accessToken: (0, encryption_1.encrypt)(tokenData.access_token),
                refreshToken: (0, encryption_1.encrypt)(tokenData.refresh_token),
                expiresAt
            };
            this.credentials.set(accountId, credentials);
            logger_1.safeLogger.info('TikTok token obtained successfully', {
                accountId,
                expiresAt: expiresAt.toISOString(),
                scopes: tokenData.scope
            });
            return credentials;
        }
        catch (error) {
            logger_1.safeLogger.error('Failed to exchange code for token', {
                error: error.message,
                accountId
            });
            throw error;
        }
    }
    // Refresh access token using refresh token
    async refreshToken(accountId = 'default') {
        const credentials = this.credentials.get(accountId);
        if (!credentials || !credentials.refreshToken) {
            throw new Error(`No refresh token available for account: ${accountId}`);
        }
        const url = `${config_1.config.tiktok.apiBaseUrl}/v2/oauth/token/`;
        const body = {
            client_key: config_1.config.tiktok.clientId,
            client_secret: config_1.config.tiktok.clientSecret,
            grant_type: 'refresh_token',
            refresh_token: (0, encryption_1.decrypt)(credentials.refreshToken)
        };
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });
            const data = await response.json();
            if (!response.ok || data.error) {
                throw new Error(`TikTok refresh token error: ${data.error_description || data.message || 'Unknown error'}`);
            }
            const tokenData = data.data;
            const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));
            // Update credentials
            credentials.accessToken = (0, encryption_1.encrypt)(tokenData.access_token);
            credentials.expiresAt = expiresAt;
            if (tokenData.refresh_token) {
                credentials.refreshToken = (0, encryption_1.encrypt)(tokenData.refresh_token);
            }
            this.credentials.set(accountId, credentials);
            logger_1.safeLogger.info('TikTok token refreshed successfully', {
                accountId,
                expiresAt: expiresAt.toISOString()
            });
            return credentials;
        }
        catch (error) {
            logger_1.safeLogger.error('Failed to refresh token', {
                error: error.message,
                accountId
            });
            // Remove invalid credentials
            this.credentials.delete(accountId);
            throw error;
        }
    }
    // Get valid access token (refreshing if necessary)
    async getValidAccessToken(accountId = 'default') {
        let credentials = this.credentials.get(accountId);
        if (!credentials) {
            throw new Error(`No credentials found for account: ${accountId}. Please authorize first.`);
        }
        // Check if token is expired or will expire in next 5 minutes
        const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
        if (credentials.expiresAt && credentials.expiresAt <= fiveMinutesFromNow) {
            logger_1.safeLogger.info('Access token expired or expiring soon, refreshing', {
                accountId,
                expiresAt: credentials.expiresAt.toISOString()
            });
            credentials = await this.refreshToken(accountId);
        }
        if (!credentials.accessToken) {
            throw new Error(`No access token available for account: ${accountId}`);
        }
        return (0, encryption_1.decrypt)(credentials.accessToken);
    }
    // Store credentials (for existing tokens)
    storeCredentials(accountId, credentials) {
        this.credentials.set(accountId, credentials);
        logger_1.safeLogger.info('Credentials stored', { accountId });
    }
    // Check if credentials exist for account
    hasCredentials(accountId = 'default') {
        return this.credentials.has(accountId);
    }
    // Remove credentials for account
    removeCredentials(accountId = 'default') {
        this.credentials.delete(accountId);
        logger_1.safeLogger.info('Credentials removed', { accountId });
    }
    // Get all account IDs with credentials
    getAccountIds() {
        return Array.from(this.credentials.keys());
    }
}
exports.tiktokAuth = TikTokAuthService.getInstance();
//# sourceMappingURL=tiktokAuth.js.map