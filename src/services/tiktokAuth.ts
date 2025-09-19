import { config } from '../config';
import { safeLogger } from '../utils/logger';
import { encrypt, decrypt } from '../utils/encryption';
import { TikTokCredentials } from '../types';

interface TikTokTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  refresh_expires_in: number;
  scope: string;
  token_type: string;
}

interface TikTokTokenRefreshResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  refresh_expires_in?: number;
}

class TikTokAuthService {
  private static instance: TikTokAuthService;
  private credentials: Map<string, TikTokCredentials> = new Map();

  private constructor() {}

  static getInstance(): TikTokAuthService {
    if (!TikTokAuthService.instance) {
      TikTokAuthService.instance = new TikTokAuthService();
    }
    return TikTokAuthService.instance;
  }

  // Generate OAuth URL for authorization
  generateAuthUrl(accountId?: string, scopes: string[] = ['content.read', 'content.write']): string {
    const params = new URLSearchParams({
      client_key: config.tiktok.clientId,
      response_type: 'code',
      redirect_uri: config.tiktok.redirectUri,
      scope: scopes.join(','),
      state: accountId || 'default'
    });

    return `https://www.tiktok.com/auth/authorize/?${params.toString()}`;
  }

  // Exchange authorization code for access token
  async exchangeCodeForToken(code: string, accountId: string = 'default'): Promise<TikTokCredentials> {
    const url = `${config.tiktok.apiBaseUrl}/v2/oauth/token/`;
    
    const body = {
      client_key: config.tiktok.clientId,
      client_secret: config.tiktok.clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: config.tiktok.redirectUri
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      const data = await response.json() as any;
      
      if (!response.ok || data.error) {
        throw new Error(`TikTok auth error: ${data.error_description || data.message || 'Unknown error'}`);
      }

      const tokenData = data.data as TikTokTokenResponse;
      const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));

      const credentials: TikTokCredentials = {
        clientId: config.tiktok.clientId,
        clientSecret: config.tiktok.clientSecret,
        redirectUri: config.tiktok.redirectUri,
        appId: config.tiktok.appId,
        accessToken: encrypt(tokenData.access_token),
        refreshToken: encrypt(tokenData.refresh_token),
        expiresAt
      };

      this.credentials.set(accountId, credentials);
      
      safeLogger.info('TikTok token obtained successfully', { 
        accountId, 
        expiresAt: expiresAt.toISOString(),
        scopes: tokenData.scope 
      });

      return credentials;
    } catch (error) {
      safeLogger.error('Failed to exchange code for token', { 
        error: (error as Error).message,
        accountId 
      });
      throw error;
    }
  }

  // Refresh access token using refresh token
  async refreshToken(accountId: string = 'default'): Promise<TikTokCredentials> {
    const credentials = this.credentials.get(accountId);
    
    if (!credentials || !credentials.refreshToken) {
      throw new Error(`No refresh token available for account: ${accountId}`);
    }

    const url = `${config.tiktok.apiBaseUrl}/v2/oauth/token/`;
    
    const body = {
      client_key: config.tiktok.clientId,
      client_secret: config.tiktok.clientSecret,
      grant_type: 'refresh_token',
      refresh_token: decrypt(credentials.refreshToken)
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      const data = await response.json() as any;
      
      if (!response.ok || data.error) {
        throw new Error(`TikTok refresh token error: ${data.error_description || data.message || 'Unknown error'}`);
      }

      const tokenData = data.data as TikTokTokenRefreshResponse;
      const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));

      // Update credentials
      credentials.accessToken = encrypt(tokenData.access_token);
      credentials.expiresAt = expiresAt;
      
      if (tokenData.refresh_token) {
        credentials.refreshToken = encrypt(tokenData.refresh_token);
      }

      this.credentials.set(accountId, credentials);
      
      safeLogger.info('TikTok token refreshed successfully', { 
        accountId, 
        expiresAt: expiresAt.toISOString()
      });

      return credentials;
    } catch (error) {
      safeLogger.error('Failed to refresh token', { 
        error: (error as Error).message,
        accountId 
      });
      // Remove invalid credentials
      this.credentials.delete(accountId);
      throw error;
    }
  }

  // Get valid access token (refreshing if necessary)
  async getValidAccessToken(accountId: string = 'default'): Promise<string> {
    let credentials = this.credentials.get(accountId);
    
    if (!credentials) {
      throw new Error(`No credentials found for account: ${accountId}. Please authorize first.`);
    }

    // Check if token is expired or will expire in next 5 minutes
    const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
    
    if (credentials.expiresAt && credentials.expiresAt <= fiveMinutesFromNow) {
      safeLogger.info('Access token expired or expiring soon, refreshing', { 
        accountId,
        expiresAt: credentials.expiresAt.toISOString()
      });
      
      credentials = await this.refreshToken(accountId);
    }

    if (!credentials.accessToken) {
      throw new Error(`No access token available for account: ${accountId}`);
    }

    return decrypt(credentials.accessToken);
  }

  // Store credentials (for existing tokens)
  storeCredentials(accountId: string, credentials: TikTokCredentials): void {
    this.credentials.set(accountId, credentials);
    safeLogger.info('Credentials stored', { accountId });
  }

  // Check if credentials exist for account
  hasCredentials(accountId: string = 'default'): boolean {
    return this.credentials.has(accountId);
  }

  // Remove credentials for account
  removeCredentials(accountId: string = 'default'): void {
    this.credentials.delete(accountId);
    safeLogger.info('Credentials removed', { accountId });
  }

  // Get all account IDs with credentials
  getAccountIds(): string[] {
    return Array.from(this.credentials.keys());
  }
}

export const tiktokAuth = TikTokAuthService.getInstance();