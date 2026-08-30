import { describe, it, expect } from 'vitest';
import {
  generatePaymentReference,
  generateOrderCode,
  extractPaymentReference,
  normalizePaymentReference,
  PAYMENT_REFERENCE_REGEX,
} from '../lib/payment-code';

describe('Payment Code Generator & Parser', () => {
  it('should generate valid TG-XXXXXX code from unambiguous alphabet', () => {
    const code = generatePaymentReference();
    expect(code).toMatch(/^TG-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/);

    // Verify ambiguous characters (0, O, 1, I, L) are not used
    expect(code).not.toMatch(/[01IOL]/i);
  });

  it('should extract strict payment reference from transfer content', () => {
    expect(extractPaymentReference('TG-8KZ2XM')).toBe('TG-8KZ2XM');
    expect(extractPaymentReference('Thanh toan TG-8KZ2XM')).toBe('TG-8KZ2XM');
    expect(extractPaymentReference('TG-8KZ2XM mua hàng ngay')).toBe('TG-8KZ2XM');
    expect(extractPaymentReference('No reference here')).toBeNull();
    expect(extractPaymentReference('TG8KZ2XM')).toBeNull(); // Missing dash
    expect(extractPaymentReference('TG-8KZ2X')).toBeNull(); // 5 chars
  });

  it('should normalize payment reference', () => {
    expect(normalizePaymentReference('tg-8kz2xm')).toBe('TG-8KZ2XM');
    expect(normalizePaymentReference('invalid')).toBeNull();
  });
});
