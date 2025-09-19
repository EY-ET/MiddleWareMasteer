import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { tiktokAuth } from '../services';
import { HealthCheckResponse } from '../types';
import { safeLogger } from '../utils/logger';
import { config } from '../config';

export const healthCheck = asyncHandler(async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  // Basic health check
  let tiktokApiStatus: 'connected' | 'disconnected' | 'error' = 'disconnected';
  
  try {
    // Check if we have any stored credentials
    const accountIds = tiktokAuth.getAccountIds();
    
    if (accountIds.length > 0) {
      // Try to get user info for the first account to test connectivity
      try {
        const defaultAccount = accountIds[0];
        if (tiktokAuth.hasCredentials(defaultAccount)) {
          // This will validate and refresh token if needed
          await tiktokAuth.getValidAccessToken(defaultAccount);
          tiktokApiStatus = 'connected';
        }
      } catch (error) {
        safeLogger.warn('TikTok API health check failed', { 
          error: (error as Error).message 
        });
        tiktokApiStatus = 'error';
      }
    }
  } catch (error) {
    safeLogger.error('Health check error', { error: (error as Error).message });
    tiktokApiStatus = 'error';
  }

  const response: HealthCheckResponse = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    uptime: Math.floor(process.uptime()),
    tiktok_api_status: tiktokApiStatus
  };

  const duration = Date.now() - startTime;
  
  safeLogger.info('Health check completed', {
    status: response.status,
    tiktokApiStatus,
    duration: `${duration}ms`,
    uptime: response.uptime
  });

  res.json(response);
});

export const detailedHealth = asyncHandler(async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  const details = {
    service: 'tiktok-carousel-middleware',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.env,
    node_version: process.version,
    memory: process.memoryUsage(),
    system: {
      platform: process.platform,
      arch: process.arch,
      cpu_count: require('os').cpus().length,
      load_average: require('os').loadavg(),
      free_memory: require('os').freemem(),
      total_memory: require('os').totalmem()
    },
    tiktok: {
      api_base_url: config.tiktok.apiBaseUrl,
      accounts_configured: tiktokAuth.getAccountIds().length,
      accounts: tiktokAuth.getAccountIds().map(id => ({
        id,
        has_credentials: tiktokAuth.hasCredentials(id)
      }))
    },
    configuration: {
      port: config.port,
      host: config.host,
      max_file_size: `${config.upload.maxFileSizeMB}MB`,
      max_files_per_request: config.upload.maxFilesPerRequest,
      allowed_mime_types: config.upload.allowedMimeTypes,
      rate_limit: {
        window_ms: config.rateLimit.windowMs,
        max_requests: config.rateLimit.maxRequests
      },
      cors_origins: config.cors.origins,
      log_level: config.logging.level
    }
  };

  const duration = Date.now() - startTime;
  
  safeLogger.debug('Detailed health check completed', {
    duration: `${duration}ms`,
    accountsConfigured: details.tiktok.accounts_configured
  });

  res.json({
    status: 'healthy',
    timestamp: details.timestamp,
    details
  });
});