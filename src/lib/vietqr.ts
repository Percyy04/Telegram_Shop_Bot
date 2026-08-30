/**
 * VietQR URL builder.
 *
 * Generates static QR image URLs using VietQR API.
 * Format: https://img.vietqr.io/image/{BIN}-{ACCOUNT}-compact2.png?amount=...&addInfo=...&accountName=...
 */

export interface VietQRParams {
  bankCode: string;
  accountNumber: string;
  accountName: string;
  amount: number;
  reference: string;
}

/**
 * Generate a VietQR image URL.
 *
 * @param params Bank and payment details
 * @returns Full VietQR image URL
 *
 * @example
 * generateQRUrl({
 *   bankCode: '970422',
 *   accountNumber: '1234567890',
 *   accountName: 'NGUYEN VAN A',
 *   amount: 125000,
 *   reference: 'TG-8KZ2XM',
 * })
 * // → "https://img.vietqr.io/image/970422-1234567890-compact2.png?amount=125000&addInfo=TG-8KZ2XM&accountName=NGUYEN%20VAN%20A"
 */
export function generateQRUrl(params: VietQRParams): string {
  const { bankCode, accountNumber, accountName, amount, reference } = params;

  const baseUrl = `https://img.vietqr.io/image/${bankCode}-${accountNumber}-compact2.png`;
  const queryParams = new URLSearchParams({
    amount: String(amount),
    addInfo: reference,
    accountName: accountName,
  });

  return `${baseUrl}?${queryParams.toString()}`;
}
