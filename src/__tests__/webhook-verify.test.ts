import { describe, it, expect } from 'vitest';
import { verifySepaySignature } from '../lib/webhook-verify';
import crypto from 'crypto';

describe('SePay Webhook Verification', () => {
  const secret = 'my_super_secret_key_123';
  const rawBody = JSON.stringify({ id: 1, transferAmount: 125000 });
  const nowTs = Math.floor(Date.now() / 1000).toString();

  function computeValidSig(body: string, ts: string, sec: string): string {
    const payload = `${ts}.${body}`;
    const hmac = crypto.createHmac('sha256', sec).update(payload, 'utf8').digest('hex');
    return `sha256=${hmac}`;
  }

  it('should pass with valid signature and fresh timestamp', () => {
    const sig = computeValidSig(rawBody, nowTs, secret);
    const valid = verifySepaySignature({
      rawBody,
      signature: sig,
      timestamp: nowTs,
      secret,
    });
    expect(valid).toBe(true);
  });

  it('should fail with missing headers', () => {
    expect(verifySepaySignature({ rawBody, signature: null, timestamp: nowTs, secret })).toBe(false);
    expect(verifySepaySignature({ rawBody, signature: 'sig', timestamp: null, secret })).toBe(false);
  });

  it('should fail with stale timestamp (> 300s)', () => {
    const staleTs = (Math.floor(Date.now() / 1000) - 400).toString();
    const sig = computeValidSig(rawBody, staleTs, secret);
    expect(verifySepaySignature({ rawBody, signature: sig, timestamp: staleTs, secret })).toBe(false);
  });

  it('should fail with wrong secret', () => {
    const sig = computeValidSig(rawBody, nowTs, 'wrong_secret');
    expect(verifySepaySignature({ rawBody, signature: sig, timestamp: nowTs, secret })).toBe(false);
  });
});
