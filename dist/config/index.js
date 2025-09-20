"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const joi_1 = __importDefault(require("joi"));
dotenv_1.default.config();
const configSchema = joi_1.default.object({
    NODE_ENV: joi_1.default.string().valid('development', 'production', 'test').default('development'),
    PORT: joi_1.default.number().port().default(5000),
    HOST: joi_1.default.string().default('0.0.0.0'),
    // TikTok API
    TIKTOK_CLIENT_ID: joi_1.default.string().required(),
    TIKTOK_CLIENT_SECRET: joi_1.default.string().required(),
    TIKTOK_REDIRECT_URI: joi_1.default.string().uri().required(),
    TIKTOK_APP_ID: joi_1.default.string().required(),
    TIKTOK_API_BASE_URL: joi_1.default.string().uri().default('https://open-api.tiktok.com'),
    // Security
    JWT_SECRET: joi_1.default.string().min(32).required(),
    ADMIN_API_KEY: joi_1.default.string().min(16).required(),
    ENCRYPTION_KEY: joi_1.default.string().length(64).pattern(/^[0-9a-fA-F]+$/).required(),
    // Rate Limiting
    RATE_LIMIT_WINDOW_MS: joi_1.default.number().default(15 * 60 * 1000), // 15 minutes
    RATE_LIMIT_MAX_REQUESTS: joi_1.default.number().default(100),
    // File Upload
    MAX_FILE_SIZE_MB: joi_1.default.number().default(10),
    MAX_FILES_PER_REQUEST: joi_1.default.number().default(10),
    ALLOWED_MIME_TYPES: joi_1.default.string().default('image/jpeg,image/png,image/webp'),
    // CORS
    CORS_ORIGINS: joi_1.default.string().default('http://localhost:5678'),
    // Logging
    LOG_LEVEL: joi_1.default.string().valid('error', 'warn', 'info', 'debug').default('info'),
    LOG_FILE_PATH: joi_1.default.string().default('./logs/app.log'),
    // Trust proxy for reverse proxy environments
    TRUST_PROXY: joi_1.default.boolean().default(false),
    // Jobs
    JOB_TIMEOUT_MS: joi_1.default.number().default(5 * 60 * 1000), // 5 minutes
    CLEANUP_JOBS_AFTER_HOURS: joi_1.default.number().default(24)
});
const { error, value: envVars } = configSchema.validate(process.env, {
    allowUnknown: true,
    stripUnknown: true
});
if (error) {
    throw new Error(`Config validation error: ${error.message}`);
}
exports.config = {
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
        allowedMimeTypes: envVars.ALLOWED_MIME_TYPES.split(',').map((type) => type.trim())
    },
    cors: {
        origins: envVars.CORS_ORIGINS.split(',').map((origin) => origin.trim())
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
//# sourceMappingURL=index.js.map