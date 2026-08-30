import { describe, it, expect } from 'vitest';
import {
  matchPaymentReference,
  normalizeAccountNumber,
  isExpectedAccount,
  SepayTransaction,
} from '../lib/payment-matcher';

describe('Payment Matcher Utility', () => {
  it('should prioritize SePay code field over content regex', () => {
    const txn: SepayTransaction = {
      id: 12345,
      gateway: 'MBBank',
      transactionDate: '2026-08-30 08:00:00',
      accountNumber: '0123456789',
      code: 'TG-999999',
      content: 'Chuyen tien TG-111111',
      transferType: 'in',
      transferAmount: 100000,
    };

    expect(matchPaymentReference(txn)).toBe('TG-999999');
  });

  it('should fallback to content regex when code field is missing or invalid', () => {
    const txn: SepayTransaction = {
      id: 12345,
      gateway: 'MBBank',
      transactionDate: '2026-08-30 08:00:00',
      accountNumber: '0123456789',
      code: null,
      content: 'ND chuyển khoản TG-8KZ2XM',
      transferType: 'in',
      transferAmount: 100000,
    };

    expect(matchPaymentReference(txn)).toBe('TG-8KZ2XM');
  });

  it('should normalize account numbers correctly', () => {
    expect(normalizeAccountNumber('0123-456-789')).toBe('123456789');
    expect(normalizeAccountNumber('  000987654321 ')).toBe('987654321');
  });

  it('should check expected receiver account', () => {
    expect(isExpectedAccount('0123456789', '123456789')).toBe(true);
    expect(isExpectedAccount('0999999999', '123456789')).toBe(false);
  });
});
