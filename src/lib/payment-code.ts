import crypto from 'crypto';

/**
 * Payment reference generator and parser.
 *
 * Format: TG-{6 characters}
 * Alphabet: 23456789ABCDEFGHJKLMNPQRSTUVWXYZ
 * Excludes: 0, O, 1, I, L (ambiguous characters)
 */

const PAYMENT_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const REFERENCE_LENGTH = 6;
const PREFIX = 'TG-';

/**
 * Regex for extracting payment reference from bank transfer content.
 * Matches TG- or TG followed by 6 characters from the unambiguous alphabet.
 * Optional hyphen allows matching bank transfers where hyphens were stripped by apps/VietQR.
 */
export const PAYMENT_REFERENCE_REGEX =
  /\bTG-?([23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6})\b/i;

/**
 * Generate a unique payment reference.
 * Format: TG-XXXXXX (e.g., TG-8KZ2XM)
 *
 * Uses crypto.randomBytes for secure randomness.
 */
export function generatePaymentReference(): string {
  const bytes = crypto.randomBytes(REFERENCE_LENGTH);
  let code = '';
  for (let i = 0; i < REFERENCE_LENGTH; i++) {
    code += PAYMENT_ALPHABET[bytes[i] % PAYMENT_ALPHABET.length];
  }
  return `${PREFIX}${code}`;
}

/**
 * Generate a unique order code (same format as payment reference).
 */
export function generateOrderCode(): string {
  return generatePaymentReference();
}

/**
 * Extract payment reference from bank transfer content using regex.
 * Supports both "TG-XXXXXX" and "TGXXXXXX" (missing hyphen).
 * Always returns standardized "TG-XXXXXX" format in uppercase.
 *
 * Accepted:
 *   "TG-8KZ2XM" → "TG-8KZ2XM"
 *   "TG8KZ2XM" → "TG-8KZ2XM"
 *   "Thanh toan TG-8KZ2XM" → "TG-8KZ2XM"
 *   "144453548511 0783881764 TGQDAVPR" → "TG-QDAVPR"
 *   "TG27SPT8" → "TG-27SPT8"
 *
 * Rejected:
 *   "TG-8KZ2X" → null (only 5 chars)
 *   "Mua hang" → null (no reference)
 */
export function extractPaymentReference(content: string): string | null {
  const match = content.match(PAYMENT_REFERENCE_REGEX);
  if (!match) return null;
  // If match[1] is captured (group 1), construct standard TG-XXXXXX format
  const codePart = match[1] ? match[1] : match[0].replace(/^TG-?/i, '');
  return `TG-${codePart.toUpperCase()}`;
}

/**
 * Normalize a SePay-parsed code field.
 * Returns the code in standard "TG-XXXXXX" uppercase format if valid, null otherwise.
 */
export function normalizePaymentReference(
  code: string | null | undefined
): string | null {
  if (!code) return null;
  return extractPaymentReference(code.trim());
}
