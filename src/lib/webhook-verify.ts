import crypto from 'crypto';

/**
 * SePay webhook HMAC-SHA256 + timestamp verification.
 *
 * Signing payload format: `${timestamp}.${rawBody}`
 * Expected signature header format: `sha256={hex_digest}`
 *
 * Requirements:
 * - Read raw body BEFORE JSON.parse
 * - Verify timestamp freshness (max 300s default)
 * - Use crypto.timingSafeEqual for comparison
 * - Only parse JSON after signature is verified
 */

export interface VerifySepaySignatureInput {
  rawBody: string;
  signature: string | null;
  timestamp: string | null;
  secret: string;
  maxAgeSeconds?: number;
}

/**
 * Verify SePay webhook signature.
 * Returns true only if signature and timestamp are both valid.
 */
export function verifySepaySignature(
  input: VerifySepaySignatureInput
): boolean {
  const { rawBody, signature, timestamp, secret, maxAgeSeconds = 300 } = input;

  // 1. Check required headers exist
  if (!signature || !timestamp) {
    return false;
  }

  // 2. Validate timestamp is a valid integer
  const ts = parseInt(timestamp, 10);
  if (isNaN(ts)) {
    return false;
  }

  // 3. Check timestamp freshness (replay protection)
  const nowSeconds = Math.floor(Date.now() / 1000);
  const age = Math.abs(nowSeconds - ts);
  if (age > maxAgeSeconds) {
    return false;
  }

  // 4. Compute expected HMAC-SHA256
  const signingPayload = `${timestamp}.${rawBody}`;
  const expectedHmac = crypto
    .createHmac('sha256', secret)
    .update(signingPayload, 'utf8')
    .digest('hex');

  const expectedSignature = `sha256=${expectedHmac}`;

  // 5. Timing-safe comparison
  const sigBuf = Buffer.from(signature, 'utf8');
  const expectedBuf = Buffer.from(expectedSignature, 'utf8');

  if (sigBuf.length !== expectedBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(sigBuf, expectedBuf);
}
