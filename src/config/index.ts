import dotenv from 'dotenv';
import Joi from 'joi';

dotenv.config();

const configSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().port().default(5000),
  HOST: Joi.string().default('0.0.0.0'),
  
  // TikTok API
  TIKTOK_CLIENT_ID: Joi.string().required(),
  TIKTOK_CLIENT_SECRET: Joi.string().required(),
  TIKTOK_REDIRECT_URI: Joi.string().uri().required(),
  TIKTOK_APP_ID: Joi.string().required(),
  TIKTOK_API_BASE_URL: Joi.string().uri().default('https://open-api.tiktok.com'),
  
  // Security
  JWT_SECRET: Joi.string().min(32).required(),
  ADMIN_API_KEY: Joi.string().min(16).required(),
  ENCRYPTION_KEY: Joi.string().length(64).pattern(/^[0-9a-fA-F]+$/).required(),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: Joi.number().default(15 * 60 * 1000), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: Joi.number().default(100),
  
  // File Upload
  MAX_FILE_SIZE_MB: Joi.number().default(10),
  MAX_FILES_PER_REQUEST: Joi.number().default(10),
  ALLOWED_MIME_TYPES: Joi.string().default('image/jpeg,image/png,image/webp'),
  
  // CORS
  CORS_ORIGINS: Joi.string().default('http://localhost:5678'),
  
  // Logging
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
  LOG_FILE_PATH: Joi.string().default('./logs/app.log'),
  
  // Trust proxy for reverse proxy environments
  TRUST_PROXY: Joi.boolean().default(false),
  
  // Jobs
  JOB_TIMEOUT_MS: Joi.number().default(5 * 60 * 1000), // 5 minutes
  CLEANUP_JOBS_AFTER_HOURS: Joi.number().default(24)
});

const { error, value: envVars } = configSchema.validate(process.env, { 
  allowUnknown: true,
  stripUnknown: true 
});

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

export const config = {
  env: envVars.NODE_ENV,
  port: envVars.PORT,
  host: envVars.HOST,
  
  tiktok: {
    clientId: envVars.TIKTOK_CLIENT_ID,
    clientSecret: envVars.TIKTOK_CLIENT_SECRET,
    redirectUri: envVars.TIKTOK_REDIRECT_URI,
    appId: envVars.TIKTOK_APP_ID,
    apiBaseUrl: envVars.TIKTOK_API_BASE_URL
  },
  
  security: {
    jwtSecret: envVars.JWT_SECRET,
    adminApiKey: envVars.ADMIN_API_KEY,
    encryptionKey: envVars.ENCRYPTION_KEY
  },
  
  rateLimit: {
    windowMs: envVars.RATE_LIMIT_WINDOW_MS,
    maxRequests: envVars.RATE_LIMIT_MAX_REQUESTS
  },
  
  upload: {
    maxFileSizeMB: envVars.MAX_FILE_SIZE_MB,
    maxFilesPerRequest: envVars.MAX_FILES_PER_REQUEST,
    allowedMimeTypes: envVars.ALLOWED_MIME_TYPES.split(',').map((type: string) => type.trim())
  },
  
  cors: {
    origins: envVars.CORS_ORIGINS.split(',').map((origin: string) => origin.trim())
  },
  
  logging: {
    level: envVars.LOG_LEVEL,
    filePath: envVars.LOG_FILE_PATH
  },
  
  jobs: {
    timeoutMs: envVars.JOB_TIMEOUT_MS,
    cleanupAfterHours: envVars.CLEANUP_JOBS_AFTER_HOURS
  },
  
  // Trust proxy for correct IP addresses when behind reverse proxy (Nginx, load balancer)
  trustProxy: envVars.TRUST_PROXY || envVars.NODE_ENV === 'production'
};