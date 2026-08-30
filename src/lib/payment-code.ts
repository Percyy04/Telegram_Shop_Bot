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
 * Strict regex for extracting payment reference from bank transfer content.
 * Matches exactly TG- followed by 6 characters from the unambiguous alphabet.
 * Word boundary ensures no partial matches.
 */
export const PAYMENT_REFERENCE_REGEX =
  /\bTG-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}\b/i;

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
 * Extract payment reference from bank transfer content using strict regex.
 *
 * Prioritize SePay-parsed `code` field if it matches, then fallback to regex on `content`.
 *
 * Accepted:
 *   "TG-8KZ2XM" → "TG-8KZ2XM"
 *   "Thanh toan TG-8KZ2XM" → "TG-8KZ2XM"
 *   "TG-8KZ2XM mua hang" → "TG-8KZ2XM"
 *
 * Rejected:
 *   "TG8KZ2XM" → null (missing dash)
 *   "TG-8KZ2X" → null (only 5 chars)
 *   "TG-8KZ2XM-TEST" → null (extra suffix — will match TG-8KZ2XM part actually)
 *   "Mua hang" → null (no reference)
 */
export function extractPaymentReference(content: string): string | null {
  const match = content.match(PAYMENT_REFERENCE_REGEX);
  return match ? match[0].toUpperCase() : null;
}

/**
 * Normalize a SePay-parsed code field.
 * Returns the code in uppercase if it matches the expected format, null otherwise.
 */
export function normalizePaymentReference(
  code: string | null | undefined
): string | null {
  if (!code) return null;
  const upper = code.toUpperCase().trim();
  return PAYMENT_REFERENCE_REGEX.test(upper) ? upper : null;
}
