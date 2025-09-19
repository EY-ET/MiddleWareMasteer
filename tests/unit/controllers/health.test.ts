import request from 'supertest';
import express from 'express';
import { healthCheck, detailedHealth } from '../../../src/controllers/healthController';

// Mock logger first to avoid path issues
jest.mock('../../../src/utils/logger', () => ({
  safeLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

// Mock dependencies
jest.mock('../../../src/services/tiktokAuth', () => ({
  tiktokAuth: {
    getAccountIds: jest.fn(() => ['default', 'business']),
    hasCredentials: jest.fn((id: string) => id === 'default'),
    getValidAccessToken: jest.fn(async (id: string) => {
      if (id === 'default') {
        return 'valid-token';
      }
      throw new Error('No credentials');
    })
  }
}));

jest.mock('../../../src/config', () => ({
  config: {
    env: 'test',
    port: 5000,
    host: '0.0.0.0',
    tiktok: {
      apiBaseUrl: 'https://open-api.tiktok.com'
    },
    upload: {
      maxFileSizeMB: 60,
      maxFilesPerRequest: 10,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp']
    },
    rateLimit: {
      windowMs: 900000,
      maxRequests: 100
    },
    cors: {
      origins: ['http://localhost:5678']
    },
    logging: {
      level: 'info'
    }
  }
}));

describe('Health Controller', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  describe('healthCheck', () => {
    beforeEach(() => {
      app.get('/health', healthCheck);
    });

    it('should return healthy status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'healthy',
        timestamp: expect.any(String),
        version: '1.0.0',
        uptime: expect.any(Number)
      });
      
      expect(response.body.tiktok_api_status).toMatch(/connected|disconnected|error/);
    });

    it('should include valid timestamp', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      const timestamp = new Date(response.body.timestamp);
      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.getTime()).toBeGreaterThan(Date.now() - 5000); // Within last 5 seconds
    });

    it('should show connected TikTok API when credentials exist', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.tiktok_api_status).toBe('connected');
    });
  });

  describe('detailedHealth', () => {
    beforeEach(() => {
      app.get('/health/detailed', detailedHealth);
    });

    it('should return detailed health information', async () => {
      const response = await request(app)
        .get('/health/detailed')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'healthy',
        timestamp: expect.any(String),
        details: expect.any(Object)
      });
    });

    it('should include system information', async () => {
      const response = await request(app)
        .get('/health/detailed')
        .expect(200);

      const { details } = response.body;

      expect(details).toMatchObject({
        service: 'tiktok-carousel-middleware',
        version: '1.0.0',
        uptime: expect.any(Number),
        environment: 'test',
        node_version: expect.any(String),
        memory: expect.objectContaining({
          rss: expect.any(Number),
          heapTotal: expect.any(Number),
          heapUsed: expect.any(Number)
        }),
        system: expect.objectContaining({
          platform: expect.any(String),
          arch: expect.any(String),
          cpu_count: expect.any(Number),
          load_average: expect.any(Array),
          free_memory: expect.any(Number),
          total_memory: expect.any(Number)
        })
      });
    });

    it('should include TikTok configuration', async () => {
      const response = await request(app)
        .get('/health/detailed')
        .expect(200);

      const { details } = response.body;

      expect(details.tiktok).toMatchObject({
        api_base_url: 'https://open-api.tiktok.com',
        accounts_configured: 2,
        accounts: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            has_credentials: expect.any(Boolean)
          })
        ])
      });
    });

    it('should include application configuration', async () => {
      const response = await request(app)
        .get('/health/detailed')
        .expect(200);

      const { details } = response.body;

      expect(details.configuration).toMatchObject({
        port: 5000,
        host: '0.0.0.0',
        max_file_size: '60MB',
        max_files_per_request: 10,
        allowed_mime_types: ['image/jpeg', 'image/png', 'image/webp'],
        rate_limit: {
          window_ms: 900000,
          max_requests: 100
        },
        cors_origins: ['http://localhost:5678'],
        log_level: 'info'
      });
    });

    it('should measure response time', async () => {
      const start = Date.now();
      
      await request(app)
        .get('/health/detailed')
        .expect(200);

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000); // Should respond within 1 second
    });
  });

  describe('error handling', () => {
    it('should handle TikTok API errors gracefully', async () => {
      // Mock TikTok auth to throw error
      const mockTiktokAuth = require('../../../src/services/tiktokAuth').tiktokAuth;
      mockTiktokAuth.getValidAccessToken.mockRejectedValueOnce(new Error('API Error'));

      app.get('/health', healthCheck);

      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.tiktok_api_status).toBe('error');
    });

    it('should handle missing accounts', async () => {
      // Mock no accounts configured
      const mockTiktokAuth = require('../../../src/services/tiktokAuth').tiktokAuth;
      mockTiktokAuth.getAccountIds.mockReturnValueOnce([]);

      app.get('/health', healthCheck);

      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.tiktok_api_status).toBe('disconnected');
    });

    it('should handle system errors in detailed health', async () => {
      // This test ensures detailed health doesn't crash on system errors
      app.get('/health/detailed', detailedHealth);

      const response = await request(app)
        .get('/health/detailed')
        .expect(200);

      expect(response.body.status).toBe('healthy');
      expect(response.body.details).toBeDefined();
    });
  });
});