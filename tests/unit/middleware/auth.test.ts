import request from 'supertest';
import express from 'express';
import { adminAuth, optionalJwtAuth } from '../../../src/middleware/auth';
import jwt from 'jsonwebtoken';

// Mock logger first to avoid path issues
jest.mock('../../../src/utils/logger', () => ({
  safeLogger: {
    warn: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn()
  }
}));

// Mock config
jest.mock('../../../src/config', () => ({
  config: {
    security: {
      jwtSecret: 'test-jwt-secret-for-testing-only-must-be-32-chars',
      adminApiKey: 'test-admin-key-16chars'
    }
  }
}));

describe('Auth Middleware', () => {
  let app: express.Application;
  
  beforeEach(() => {
    app = express();
    app.use(express.json());
  });


  describe('adminAuth middleware', () => {
    beforeEach(() => {
      app.use('/admin', adminAuth);
      app.get('/admin', (req, res) => {
        res.json({ success: true, admin: true, isAdmin: req.isAdmin });
      });
    });

    it('should accept valid admin API key', async () => {
      const response = await request(app)
        .get('/admin')
        .set('X-Admin-Key', 'test-admin-key-16chars')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.admin).toBe(true);
      expect(response.body.isAdmin).toBe(true);
    });

    it('should reject request without API key', async () => {
      const response = await request(app)
        .get('/admin')
        .expect(401);

      expect(response.body.error).toContain('Admin API key required');
    });

    it('should reject invalid API key', async () => {
      const response = await request(app)
        .get('/admin')
        .set('X-Admin-Key', 'wrong-key')
        .expect(403);

      expect(response.body.error).toContain('Invalid admin API key');
    });

    it('should reject empty API key', async () => {
      const response = await request(app)
        .get('/admin')
        .set('X-Admin-Key', '')
        .expect(401);

      expect(response.body.error).toContain('Admin API key required');
    });
  });

  describe('optionalJwtAuth middleware', () => {
    beforeEach(() => {
      app.use('/optional', optionalJwtAuth);
      app.get('/optional', (req, res) => {
        res.json({ 
          success: true, 
          authenticated: !!req.user,
          user: req.user 
        });
      });
    });

    it('should work without authentication', async () => {
      const response = await request(app)
        .get('/optional')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.authenticated).toBe(false);
      expect(response.body.user).toBeUndefined();
    });

    it('should accept valid JWT token when provided', async () => {
      const token = jwt.sign(
        { sub: 'user123' },
        'test-jwt-secret',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/optional')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.authenticated).toBe(true);
      expect(response.body.user.sub).toBe('user123');
    });

    it('should ignore invalid token and proceed without auth', async () => {
      const response = await request(app)
        .get('/optional')
        .set('Authorization', 'Bearer invalid-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.authenticated).toBe(false);
      expect(response.body.user).toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('should handle missing admin key header', async () => {
      app.use('/test', adminAuth);
      app.get('/test', (req, res) => res.json({ success: true }));

      const response = await request(app)
        .get('/test')
        .expect(401);

      expect(response.body.error).toContain('Admin API key required');
    });
  });
});