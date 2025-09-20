// Jest setup file
import { jest } from '@jest/globals';

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only-must-be-32-chars';
process.env.ADMIN_API_KEY = 'test-admin-key-16chars';
process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.TIKTOK_CLIENT_ID = 'test-client-id';
process.env.TIKTOK_CLIENT_SECRET = 'test-client-secret';
process.env.TIKTOK_APP_ID = 'test-app-id';
process.env.TIKTOK_REDIRECT_URI = 'http://localhost:5000/auth/callback';
process.env.PORT = '5000';
process.env.HOST = '0.0.0.0';
process.env.LOG_LEVEL = 'error';
process.env.LOG_FILE_PATH = '/tmp/test-app.log';
process.env.CORS_ORIGINS = 'http://localhost:5678';
process.env.TRUST_PROXY = 'true';
process.env.RATE_LIMIT_WINDOW_MS = '900000';
process.env.RATE_LIMIT_MAX_REQUESTS = '100';
process.env.MAX_FILE_SIZE_MB = '60';
process.env.MAX_FILES_PER_REQUEST = '10';
process.env.ALLOWED_MIME_TYPES = 'image/jpeg,image/png,image/webp';
process.env.TIKTOK_API_BASE_URL = 'https://open-api.tiktok.com';
process.env.JOB_TIMEOUT_MS = '300000';
process.env.CLEANUP_JOBS_AFTER_HOURS = '24';

// Increase timeout for integration tests
jest.setTimeout(30000);

// Mock console.log in tests to reduce noise
beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});