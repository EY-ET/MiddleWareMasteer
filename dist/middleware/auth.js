"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminAuth = adminAuth;
exports.optionalJwtAuth = optionalJwtAuth;
exports.requireJwtAuth = requireJwtAuth;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
function adminAuth(req, res, next) {
    const apiKey = req.headers['x-admin-key'];
    if (!apiKey) {
        res.status(401).json({
            success: false,
            error: 'Admin API key required in X-Admin-Key header',
            code: 'MISSING_ADMIN_KEY'
        });
        return;
    }
    if (apiKey !== config_1.config.security.adminApiKey) {
        logger_1.safeLogger.warn('Invalid admin API key attempt', {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            endpoint: req.path
        });
        res.status(403).json({
            success: false,
            error: 'Invalid admin API key',
            code: 'INVALID_ADMIN_KEY'
        });
        return;
    }
    req.isAdmin = true;
    next();
}
function optionalJwtAuth(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
        next();
        return;
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, config_1.config.security.jwtSecret);
        req.user = {
            id: decoded.id || decoded.sub,
            role: decoded.role || 'user'
        };
    }
    catch (error) {
        logger_1.safeLogger.debug('Invalid JWT token', { error: error.message });
        // Continue without user - optional auth
    }
    next();
}
function requireJwtAuth(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
        res.status(401).json({
            success: false,
            error: 'Authentication required',
            code: 'MISSING_TOKEN'
        });
        return;
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, config_1.config.security.jwtSecret);
        req.user = {
            id: decoded.id || decoded.sub,
            role: decoded.role || 'user'
        };
        next();
    }
    catch (error) {
        logger_1.safeLogger.warn('Invalid JWT token attempt', {
            error: error.message,
            ip: req.ip
        });
        res.status(403).json({
            success: false,
            error: 'Invalid or expired token',
            code: 'INVALID_TOKEN'
        });
    }
}
//# sourceMappingURL=auth.js.map