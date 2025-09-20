"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.safeLogger = void 0;
const winston_1 = __importDefault(require("winston"));
const config_1 = require("../config");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Ensure log directory exists
const logDir = path_1.default.dirname(config_1.config.logging.filePath);
if (!fs_1.default.existsSync(logDir)) {
    fs_1.default.mkdirSync(logDir, { recursive: true });
}
const logger = winston_1.default.createLogger({
    level: config_1.config.logging.level,
    format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json()),
    defaultMeta: { service: 'tiktok-carousel-middleware' },
    transports: [
        new winston_1.default.transports.File({
            filename: config_1.config.logging.filePath,
            maxsize: 5242880, // 5MB
            maxFiles: 5
        }),
        new winston_1.default.transports.Console({
            format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.colorize(), winston_1.default.format.printf(({ timestamp, level, message, ...meta }) => {
                const metaStr = Object.keys(meta).length ? safeStringify(meta, 2) : '';
                return `${timestamp} [${level}]: ${message} ${metaStr}`;
            }))
        })
    ]
});
exports.logger = logger;
// Safe stringify function that handles circular references
function safeStringify(obj, indent) {
    const seen = new WeakSet();
    return JSON.stringify(obj, (key, value) => {
        if (typeof value === 'object' && value !== null) {
            if (seen.has(value)) {
                return '[Circular]';
            }
            seen.add(value);
        }
        return value;
    }, indent);
}
// Helper function to sanitize sensitive data from logs
function sanitizeLogData(data, depth = 0) {
    if (depth > 10 || typeof data !== 'object' || data === null)
        return data;
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];
    const seen = new WeakSet();
    function sanitizeObject(obj, currentDepth) {
        if (currentDepth > 10 || typeof obj !== 'object' || obj === null)
            return obj;
        if (seen.has(obj))
            return '[Circular]';
        seen.add(obj);
        const sanitized = Array.isArray(obj) ? [] : {};
        for (const key in obj) {
            if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
                sanitized[key] = '[REDACTED]';
            }
            else if (typeof obj[key] === 'object') {
                sanitized[key] = sanitizeObject(obj[key], currentDepth + 1);
            }
            else {
                sanitized[key] = obj[key];
            }
        }
        return sanitized;
    }
    return sanitizeObject(data, depth);
}
// Export wrapper functions for safe logging
exports.safeLogger = {
    error: (message, meta) => logger.error(message, sanitizeLogData(meta)),
    warn: (message, meta) => logger.warn(message, sanitizeLogData(meta)),
    info: (message, meta) => logger.info(message, sanitizeLogData(meta)),
    debug: (message, meta) => logger.debug(message, sanitizeLogData(meta))
};
//# sourceMappingURL=logger.js.map