import { describe, it, expect } from 'vitest';
import { encryptPayload, decryptPayload } from '../lib/crypto';
import crypto from 'crypto';

describe('Crypto Utility', () => {
  const sampleKey = crypto.randomBytes(32).toString('base64');
  const plainText = 'USER: admin123 | PASS: secretPass123! | KEY: XXX-YYY-ZZZ';

  it('should encrypt and decrypt payload successfully', () => {
    const encrypted = encryptPayload(plainText, sampleKey);
    expect(encrypted).toBeTypeOf('string');
    expect(encrypted).not.toBe(plainText);

    const decrypted = decryptPayload(encrypted, sampleKey);
    expect(decrypted).toBe(plainText);
  });

  it('should fail with invalid key length', () => {
    const invalidKey = crypto.randomBytes(16).toString('base64'); // 16 bytes instead of 32
    expect(() => encryptPayload(plainText, invalidKey)).toThrow('32 bytes');
  });

  it('should fail when decrypting tampered payload', () => {
    const encrypted = encryptPayload(plainText, sampleKey);
    const decoded = JSON.parse(Buffer.from(encrypted, 'base64').toString('utf8'));
    
    // Tamper with data
    decoded.data = '00'.repeat(decoded.data.length / 2);
    const tampered = Buffer.from(JSON.stringify(decoded)).toString('base64');

    expect(() => decryptPayload(tampered, sampleKey)).toThrow();
  });
});
