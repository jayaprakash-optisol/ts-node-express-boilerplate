import { encrypt, decrypt, isEncrypted } from '../../../src/utils/encryption.util';

jest.mock('../../../src/config/env.config', () => ({
  ENCRYPTION_KEY: 'test-encryption-key-32-bytes-long!',
}));

describe('Encryption Utility', () => {
  const testData = 'test data';
  let encryptedData: string;

  describe('encrypt', () => {
    it('should successfully encrypt data', () => {
      encryptedData = encrypt(testData);
      expect(encryptedData).toBeDefined();
      expect(typeof encryptedData).toBe('string');
      expect(encryptedData).not.toBe(testData);
    });

    it('should encrypt empty string', () => {
      const emptyEncrypted = encrypt('');
      expect(emptyEncrypted).toBeDefined();
      expect(typeof emptyEncrypted).toBe('string');
    });

    it('should throw error when encryption fails', () => {
      // @ts-expect-error - Testing invalid input
      expect(() => encrypt(null)).toThrow('Encryption failed');
    });

    it('should throw error when encryption key is not set', () => {
      const mockEnv = jest.requireMock('../../../src/config/env.config');
      const originalKey = mockEnv.ENCRYPTION_KEY;
      mockEnv.ENCRYPTION_KEY = undefined;
      expect(() => encrypt(testData)).toThrow('Encryption failed');
      mockEnv.ENCRYPTION_KEY = originalKey;
    });
  });

  describe('decrypt', () => {
    it('should successfully decrypt encrypted data', () => {
      const decryptedData = decrypt(encryptedData);
      expect(decryptedData).toBe(testData);
    });

    it('should throw error when decryption fails', () => {
      expect(() => decrypt('invalid-base64')).toThrow('Decryption failed');
    });

    it('should throw error when trying to decrypt with wrong key', () => {
      const mockEnv = jest.requireMock('../../../src/config/env.config');
      const originalKey = mockEnv.ENCRYPTION_KEY;
      const encryptedWithOriginalKey = encrypt(testData);
      mockEnv.ENCRYPTION_KEY = 'different-key-32-bytes-long!!';
      expect(() => decrypt(encryptedWithOriginalKey)).toThrow('Decryption failed');
      mockEnv.ENCRYPTION_KEY = originalKey;
    });

    it('should throw error when decryption key is not set', () => {
      const mockEnv = jest.requireMock('../../../src/config/env.config');
      const originalKey = mockEnv.ENCRYPTION_KEY;
      mockEnv.ENCRYPTION_KEY = undefined;
      expect(() => decrypt(encryptedData)).toThrow('Decryption failed');
      mockEnv.ENCRYPTION_KEY = originalKey;
    });

    it('should throw error when encrypted data is malformed', () => {
      const malformedData = Buffer.from('malformed').toString('base64');
      expect(() => decrypt(malformedData)).toThrow('Decryption failed');
    });
  });

  describe('isEncrypted', () => {
    it('should return true for encrypted data object', () => {
      const encryptedObj = { encrypted: 'some-encrypted-data' };
      expect(isEncrypted(encryptedObj)).toBe(true);
    });

    it('should return false for non-object values', () => {
      expect(isEncrypted(null)).toBe(false);
      expect(isEncrypted(undefined)).toBe(false);
      expect(isEncrypted('string')).toBe(false);
      expect(isEncrypted(123)).toBe(false);
      expect(isEncrypted(true)).toBe(false);
      expect(isEncrypted([])).toBe(false);
    });

    it('should return false for object without encrypted property', () => {
      const obj = { someOtherProp: 'value' };
      expect(isEncrypted(obj)).toBe(false);
    });

    it('should return false for object with non-string encrypted property', () => {
      const obj = { encrypted: 123 };
      expect(isEncrypted(obj)).toBe(false);
    });
  });
});
