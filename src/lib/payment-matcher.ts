/**
 * Extract and match payment reference from bank transfer content.
 *
 * Uses strict regex from payment-code.ts — no fuzzy matching.
 */

import {
  extractPaymentReference,
  normalizePaymentReference,
} from './payment-code';

/**
 * SePay webhook transaction payload (relevant fields).
 */
export interface SepayTransaction {
  id: number;
  gateway: string;
  transactionDate: string;
  accountNumber: string;
  subAccount?: string;
  code?: string | null;
  content: string;
  transferType: 'in' | 'out';
  description?: string;
  transferAmount: number;
  accumulated?: number;
  referenceCode?: string;
}

/**
 * Try to extract the payment reference from a SePay transaction.
 *
 * Priority:
 * 1. SePay-parsed `code` field (if matches TG-XXXXXX format)
 * 2. Regex extraction from `content` field (fallback)
 */
export function matchPaymentReference(
  transaction: SepayTransaction
): string | null {
  // Priority 1: Use SePay-parsed code field
  const fromCode = normalizePaymentReference(transaction.code);
  if (fromCode) return fromCode;

  // Priority 2: Regex on content field
  return extractPaymentReference(transaction.content ?? '');
}

/**
 * Normalize account number for comparison.
 * Removes spaces, dashes, and leading zeros for consistent matching.
 */
export function normalizeAccountNumber(accountNumber: string): string {
  return accountNumber.replace(/[\s-]/g, '').replace(/^0+/, '');
}

/**
 * Check if the transaction's account number matches the expected shop account.
 */
export function isExpectedAccount(
  transactionAccountNumber: string,
  expectedAccountNumber: string
): boolean {
  return (
    normalizeAccountNumber(transactionAccountNumber) ===
    normalizeAccountNumber(expectedAccountNumber)
  );
}
