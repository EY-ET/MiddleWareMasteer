"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const config_1 = require("./config");
const logger_1 = require("./utils/logger");
const middleware_1 = require("./middleware");
const upload_1 = require("./middleware/upload");
const app = (0, express_1.default)();
// Trust proxy for accurate IP addresses behind load balancers
app.set('trust proxy', config_1.config.trustProxy);
// Global middleware
app.use(middleware_1.compressionMiddleware);
app.use(middleware_1.securityHeaders);
app.use(middleware_1.corsOptions);
app.use(middleware_1.requestLogger);
app.use(middleware_1.rateLimiter);
// Body parsing middleware  
app.use(express_1.default.json({ limit: '60mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '60mb' }));
// Routes
const api_1 = __importDefault(require("./routes/api"));
app.use('/api', api_1.default);
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
app.use(middleware_1.notFoundHandler);
app.use(middleware_1.errorHandler);
// Cleanup old files every hour
setInterval(() => {
    (0, upload_1.cleanupOldFiles)(24 * 60 * 60 * 1000); // Clean files older than 24 hours
}, 60 * 60 * 1000);
// Graceful shutdown
process.on('SIGTERM', () => {
    logger_1.safeLogger.info('SIGTERM received, shutting down gracefully');
    process.exit(0);
});
process.on('SIGINT', () => {
    logger_1.safeLogger.info('SIGINT received, shutting down gracefully');
    process.exit(0);
});
const server = app.listen(config_1.config.port, config_1.config.host, () => {
    logger_1.safeLogger.info('Server started', {
        port: config_1.config.port,
        host: config_1.config.host,
        env: config_1.config.env,
        nodeVersion: process.version
    });
});
exports.default = app;
//# sourceMappingURL=server.js.map