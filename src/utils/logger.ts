import winston from 'winston';
import { config } from '../config';
import path from 'path';
import fs from 'fs';

// Ensure log directory exists
const logDir = path.dirname(config.logging.filePath);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logger = winston.createLogger({
  level: config.logging.level,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'tiktok-carousel-middleware' },
  transports: [
    new winston.transports.File({ 
      filename: config.logging.filePath,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length ? safeStringify(meta, 2) : '';
          return `${timestamp} [${level}]: ${message} ${metaStr}`;
        })
      )
    })
  ]
});

// Safe stringify function that handles circular references
function safeStringify(obj: any, indent?: number): string {
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
function sanitizeLogData(data: any, depth = 0): any {
  if (depth > 10 || typeof data !== 'object' || data === null) return data;
  
  const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];
  const seen = new WeakSet();
  
  function sanitizeObject(obj: any, currentDepth: number): any {
    if (currentDepth > 10 || typeof obj !== 'object' || obj === null) return obj;
    if (seen.has(obj)) return '[Circular]';
    seen.add(obj);
    
    const sanitized: any = Array.isArray(obj) ? [] : {};
    
    for (const key in obj) {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof obj[key] === 'object') {
        sanitized[key] = sanitizeObject(obj[key], currentDepth + 1);
      } else {
        sanitized[key] = obj[key];
      }
    }
    return sanitized;
  }
  
  return sanitizeObject(data, depth);
}

// Export wrapper functions for safe logging
export const safeLogger = {
  error: (message: string, meta?: any) => logger.error(message, sanitizeLogData(meta)),
  warn: (message: string, meta?: any) => logger.warn(message, sanitizeLogData(meta)),
  info: (message: string, meta?: any) => logger.info(message, sanitizeLogData(meta)),
  debug: (message: string, meta?: any) => logger.debug(message, sanitizeLogData(meta))
};

export { logger };