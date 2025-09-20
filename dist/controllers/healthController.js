"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detailedHealth = exports.healthCheck = void 0;
const errorHandler_1 = require("../middleware/errorHandler");
const services_1 = require("../services");
const logger_1 = require("../utils/logger");
const config_1 = require("../config");
exports.healthCheck = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const startTime = Date.now();
    // Basic health check
    let tiktokApiStatus = 'disconnected';
    try {
        // Check if we have any stored credentials
        const accountIds = services_1.tiktokAuth.getAccountIds();
        if (accountIds.length > 0) {
            // Try to get user info for the first account to test connectivity
            try {
                const defaultAccount = accountIds[0];
                if (services_1.tiktokAuth.hasCredentials(defaultAccount)) {
                    // This will validate and refresh token if needed
                    await services_1.tiktokAuth.getValidAccessToken(defaultAccount);
                    tiktokApiStatus = 'connected';
                }
            }
            catch (error) {
                logger_1.safeLogger.warn('TikTok API health check failed', {
                    error: error.message
                });
                tiktokApiStatus = 'error';
            }
        }
    }
    catch (error) {
        logger_1.safeLogger.error('Health check error', { error: error.message });
        tiktokApiStatus = 'error';
    }
    const response = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        uptime: Math.floor(process.uptime()),
        tiktok_api_status: tiktokApiStatus
    };
    const duration = Date.now() - startTime;
    logger_1.safeLogger.info('Health check completed', {
        status: response.status,
        tiktokApiStatus,
        duration: `${duration}ms`,
        uptime: response.uptime
    });
    res.json(response);
});
exports.detailedHealth = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const startTime = Date.now();
    const details = {
        service: 'tiktok-carousel-middleware',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: config_1.config.env,
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
            api_base_url: config_1.config.tiktok.apiBaseUrl,
            accounts_configured: services_1.tiktokAuth.getAccountIds().length,
            accounts: services_1.tiktokAuth.getAccountIds().map(id => ({
                id,
                has_credentials: services_1.tiktokAuth.hasCredentials(id)
            }))
        },
        configuration: {
            port: config_1.config.port,
            host: config_1.config.host,
            max_file_size: `${config_1.config.upload.maxFileSizeMB}MB`,
            max_files_per_request: config_1.config.upload.maxFilesPerRequest,
            allowed_mime_types: config_1.config.upload.allowedMimeTypes,
            rate_limit: {
                window_ms: config_1.config.rateLimit.windowMs,
                max_requests: config_1.config.rateLimit.maxRequests
            },
            cors_origins: config_1.config.cors.origins,
            log_level: config_1.config.logging.level
        }
    };
    const duration = Date.now() - startTime;
    logger_1.safeLogger.debug('Detailed health check completed', {
        duration: `${duration}ms`,
        accountsConfigured: details.tiktok.accounts_configured
    });
    res.json({
        status: 'healthy',
        timestamp: details.timestamp,
        details
    });
});
//# sourceMappingURL=healthController.js.map