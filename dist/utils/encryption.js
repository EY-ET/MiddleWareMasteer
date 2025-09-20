"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.encrypt = encrypt;
exports.decrypt = decrypt;
const crypto_1 = __importDefault(require("crypto"));
const config_1 = require("../config");
const algorithm = 'aes-256-gcm';
const secretKey = (() => {
    const key = Buffer.from(config_1.config.security.encryptionKey, 'hex');
    if (key.length !== 32) {
        throw new Error(`Encryption key must be 32 bytes (64 hex characters), got ${key.length} bytes`);
    }
    return key;
})();
function encrypt(text) {
    const iv = crypto_1.default.randomBytes(12); // 96-bit IV for GCM
    const cipher = crypto_1.default.createCipheriv(algorithm, secretKey, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    // Return iv:ciphertext:authTag
    return iv.toString('hex') + ':' + encrypted + ':' + authTag.toString('hex');
}
function decrypt(encryptedText) {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
        throw new Error('Invalid encrypted text format');
    }
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const authTag = Buffer.from(parts[2], 'hex');
    const decipher = crypto_1.default.createDecipheriv(algorithm, secretKey, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}
//# sourceMappingURL=encryption.js.map