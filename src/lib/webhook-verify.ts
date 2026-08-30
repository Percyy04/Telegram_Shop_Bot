import crypto from 'crypto';

/**
 * SePay webhook HMAC-SHA256 + timestamp verification.
 * Supports standard SePay HMAC formats safely.
 */

export interface VerifySepaySignatureInput {
  rawBody: string;
  signature: string | null;
  timestamp: string | null;
  secret: string;
  maxAgeSeconds?: number;
}

function timingSafeMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Verify SePay webhook signature.
 * Robust against signature header variants.
 */
export function verifySepaySignature(
  input: VerifySepaySignatureInput
): boolean {
  const { rawBody, signature, timestamp, secret, maxAgeSeconds = 300 } = input;

  if (!signature) {
    return false;
  }

  // Clean signature (strip optional 'sha256=' prefix)
  const cleanSig = signature.replace(/^sha256=/i, '').trim();

  // If timestamp provided, check freshness (maxAgeSeconds)
  if (timestamp) {
    const ts = parseInt(timestamp, 10);
    if (!isNaN(ts)) {
      const nowSeconds = Math.floor(Date.now() / 1000);
      const age = Math.abs(nowSeconds - ts);
      if (age > maxAgeSeconds) {
        console.warn('SePay webhook signature timestamp expired:', { age });
        return false;
      }
    }
  }

  // Variant 1: ${timestamp}.${rawBody}
  if (timestamp) {
    const payloadWithTs = `${timestamp}.${rawBody}`;
    const hmac1 = crypto
      .createHmac('sha256', secret)
      .update(payloadWithTs, 'utf8')
      .digest('hex');
    if (timingSafeMatch(cleanSig, hmac1)) return true;
  }

  // Variant 2: rawBody directly
  const hmac2 = crypto
    .createHmac('sha256', secret)
    .update(rawBody, 'utf8')
    .digest('hex');
  if (timingSafeMatch(cleanSig, hmac2)) return true;

  // Variant 3: Direct Secret Key match (Fallback for simple test ping)
  if (timingSafeMatch(cleanSig, secret) || signature === secret) return true;

  return false;
}
