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
app.set('trust proxy', config.trustProxy);

// Global middleware
app.use(compressionMiddleware);
app.use(securityHeaders);
app.use(corsOptions);
app.use(requestLogger);
app.use(rateLimiter);

// Body parsing middleware  
app.use(express.json({ limit: '60mb' }));
app.use(express.urlencoded({ extended: true, limit: '60mb' }));

// Routes
import apiRoutes from './routes/api';
app.use('/api', apiRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'TikTok Carousel Middleware API',
    version: '1.0.0',
    status: 'running',
    documentation: {
      health: '/health',
      api: '/api',
      endpoints: {
        'POST /api/create-carousel': 'Create TikTok carousel',
        'GET /api/jobs/:id': 'Get job status',
        'GET /api/jobs': 'List jobs',
        'DELETE /api/jobs/:id': 'Cancel job (admin)',
        'POST /api/webhook/n8n-upload': 'Webhook upload',
        'GET /health': 'Health check'
      }
    },
    timestamp: new Date().toISOString()
  });
});

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