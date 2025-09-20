"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomError = exports.createError = exports.asyncHandler = exports.notFoundHandler = exports.errorHandler = exports.commonSchemas = exports.validateRequestSize = exports.validateContentType = exports.validateRequest = exports.handleUploadErrors = exports.validateUploadedFiles = exports.handleSingleImage = exports.handleMultipleImages = exports.requireJwtAuth = exports.optionalJwtAuth = exports.adminAuth = exports.securityValidation = exports.compressionMiddleware = exports.requestLogger = exports.securityHeaders = exports.corsOptions = exports.uploadRateLimiter = exports.rateLimiter = void 0;
// Export all middleware components for easy importing
__exportStar(require("./auth"), exports);
__exportStar(require("./security"), exports);
__exportStar(require("./upload"), exports);
__exportStar(require("./validation"), exports);
__exportStar(require("./errorHandler"), exports);
// Re-export commonly used middleware combinations
var security_1 = require("./security");
Object.defineProperty(exports, "rateLimiter", { enumerable: true, get: function () { return security_1.rateLimiter; } });
Object.defineProperty(exports, "uploadRateLimiter", { enumerable: true, get: function () { return security_1.uploadRateLimiter; } });
Object.defineProperty(exports, "corsOptions", { enumerable: true, get: function () { return security_1.corsOptions; } });
Object.defineProperty(exports, "securityHeaders", { enumerable: true, get: function () { return security_1.securityHeaders; } });
Object.defineProperty(exports, "requestLogger", { enumerable: true, get: function () { return security_1.requestLogger; } });
Object.defineProperty(exports, "compressionMiddleware", { enumerable: true, get: function () { return security_1.compressionMiddleware; } });
Object.defineProperty(exports, "securityValidation", { enumerable: true, get: function () { return security_1.securityValidation; } });
var auth_1 = require("./auth");
Object.defineProperty(exports, "adminAuth", { enumerable: true, get: function () { return auth_1.adminAuth; } });
Object.defineProperty(exports, "optionalJwtAuth", { enumerable: true, get: function () { return auth_1.optionalJwtAuth; } });
Object.defineProperty(exports, "requireJwtAuth", { enumerable: true, get: function () { return auth_1.requireJwtAuth; } });
var upload_1 = require("./upload");
Object.defineProperty(exports, "handleMultipleImages", { enumerable: true, get: function () { return upload_1.handleMultipleImages; } });
Object.defineProperty(exports, "handleSingleImage", { enumerable: true, get: function () { return upload_1.handleSingleImage; } });
Object.defineProperty(exports, "validateUploadedFiles", { enumerable: true, get: function () { return upload_1.validateUploadedFiles; } });
Object.defineProperty(exports, "handleUploadErrors", { enumerable: true, get: function () { return upload_1.handleUploadErrors; } });
var validation_1 = require("./validation");
Object.defineProperty(exports, "validateRequest", { enumerable: true, get: function () { return validation_1.validateRequest; } });
Object.defineProperty(exports, "validateContentType", { enumerable: true, get: function () { return validation_1.validateContentType; } });
Object.defineProperty(exports, "validateRequestSize", { enumerable: true, get: function () { return validation_1.validateRequestSize; } });
Object.defineProperty(exports, "commonSchemas", { enumerable: true, get: function () { return validation_1.commonSchemas; } });
var errorHandler_1 = require("./errorHandler");
Object.defineProperty(exports, "errorHandler", { enumerable: true, get: function () { return errorHandler_1.errorHandler; } });
Object.defineProperty(exports, "notFoundHandler", { enumerable: true, get: function () { return errorHandler_1.notFoundHandler; } });
Object.defineProperty(exports, "asyncHandler", { enumerable: true, get: function () { return errorHandler_1.asyncHandler; } });
Object.defineProperty(exports, "createError", { enumerable: true, get: function () { return errorHandler_1.createError; } });
Object.defineProperty(exports, "CustomError", { enumerable: true, get: function () { return errorHandler_1.CustomError; } });
//# sourceMappingURL=index.js.map