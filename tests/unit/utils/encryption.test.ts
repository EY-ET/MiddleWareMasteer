import { encrypt, decrypt } from '../../../src/utils/encryption';

describe('Encryption Utils', () => {
  const testData = 'This is sensitive test data';

  describe('encrypt', () => {
    it('should encrypt data successfully', () => {
      const encrypted = encrypt(testData);
      
      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(testData);
      expect(encrypted).toContain(':'); // Should contain IV separator
    });

    it('should produce different encrypted values for same data', () => {
      const encrypted1 = encrypt(testData);
      const encrypted2 = encrypt(testData);
      
      expect(encrypted1).not.toBe(encrypted2);
    });
  });

  describe('decrypt', () => {
    it('should decrypt data successfully', () => {
      const encrypted = encrypt(testData);
      const decrypted = decrypt(encrypted);
      
      expect(decrypted).toBe(testData);
    });

    it('should throw error with invalid encrypted format', () => {
      const invalidEncrypted = 'invalid-format';
      
      expect(() => decrypt(invalidEncrypted)).toThrow('Invalid encrypted text format');
    });

    it('should throw error with corrupted data', () => {
      const encrypted = encrypt(testData);
      const corrupted = encrypted.substring(0, encrypted.length - 10) + 'corrupted';
      
      expect(() => decrypt(corrupted)).toThrow();
    });
  });


  describe('round-trip encryption', () => {
    it('should handle empty string', () => {
      const encrypted = encrypt('');
      const decrypted = decrypt(encrypted);
      
      expect(decrypted).toBe('');
    });

    it('should handle special characters', () => {
      const specialData = '!@#$%^&*()_+[]{}|;:,.<>?`~';
      const encrypted = encrypt(specialData);
      const decrypted = decrypt(encrypted);
      
      expect(decrypted).toBe(specialData);
    });

    it('should handle unicode characters', () => {
      const unicodeData = '🚀 Hello 世界 🌍 Здравствуй мир!';
      const encrypted = encrypt(unicodeData);
      const decrypted = decrypt(encrypted);
      
      expect(decrypted).toBe(unicodeData);
    });

    it('should handle large data', () => {
      const largeData = 'x'.repeat(10000);
      const encrypted = encrypt(largeData);
      const decrypted = decrypt(encrypted);
      
      expect(decrypted).toBe(largeData);
    });
  });
});