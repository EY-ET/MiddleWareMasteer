import express from 'express';
import { config } from './config';
import { safeLogger } from './utils/logger';
import {
  rateLimiter,
  corsOptions,
  securityHeaders,
  requestLogger,
  compressionMiddleware,
  errorHandler,
  notFoundHandler
} from './middleware';
import { cleanupOldFiles } from './middleware/upload';

const app = express();

// Trust proxy for accurate IP addresses behind load balancers
app.set('trust proxy', true);

// Global middleware
app.use(compressionMiddleware);
app.use(securityHeaders);
app.use(corsOptions);
app.use(requestLogger);
app.use(rateLimiter);

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes (to be added)
// app.use('/api', routes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    uptime: process.uptime(),
    tiktok_api_status: 'disconnected' // TODO: Implement TikTok API health check
  });
});

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Cleanup old files every hour
setInterval(() => {
  cleanupOldFiles(24 * 60 * 60 * 1000); // Clean files older than 24 hours
}, 60 * 60 * 1000);

// Graceful shutdown
process.on('SIGTERM', () => {
  safeLogger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  safeLogger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

const server = app.listen(config.port, config.host, () => {
  safeLogger.info('Server started', {
    port: config.port,
    host: config.host,
    env: config.env,
    nodeVersion: process.version
  });
});

export default app;