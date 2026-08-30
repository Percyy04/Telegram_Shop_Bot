import crypto from 'crypto';

/**
 * AES-256-GCM encryption for inventory delivery payloads.
 *
 * Format: base64 JSON { v: 1, iv: hex, tag: hex, data: hex }
 *
 * INVENTORY_ENCRYPTION_KEY must be a base64-encoded 32-byte key.
 * Generate: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits recommended for GCM
const VERSION = 1;

interface EncryptedPayload {
  v: number;
  iv: string;
  tag: string;
  data: string;
}

function getKeyBuffer(base64Key: string): Buffer {
  const key = Buffer.from(base64Key, 'base64');
  if (key.length !== 32) {
    throw new Error(
      `INVENTORY_ENCRYPTION_KEY must be exactly 32 bytes (got ${key.length}). ` +
        'Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"'
    );
  }
  return key;
}

/**
 * Encrypt a plain text delivery payload.
 * Returns a base64-encoded JSON string.
 */
export function encryptPayload(
  plainText: string,
  base64Key: string
): string {
  const key = getKeyBuffer(base64Key);
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plainText, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  const payload: EncryptedPayload = {
    v: VERSION,
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
    data: encrypted.toString('hex'),
  };

  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

/**
 * Decrypt a base64-encoded encrypted payload.
 * Only call this server-side during delivery.
 * Never call in React client components.
 */
export function decryptPayload(
  encryptedBase64: string,
  base64Key: string
): string {
  const key = getKeyBuffer(base64Key);

  let payload: EncryptedPayload;
  try {
    const json = Buffer.from(encryptedBase64, 'base64').toString('utf8');
    payload = JSON.parse(json);
  } catch {
    throw new Error('Invalid encrypted payload format');
  }

  if (payload.v !== VERSION) {
    throw new Error(`Unsupported encryption version: ${payload.v}`);
  }

  const iv = Buffer.from(payload.iv, 'hex');
  const tag = Buffer.from(payload.tag, 'hex');
  const data = Buffer.from(payload.data, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(data),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}
