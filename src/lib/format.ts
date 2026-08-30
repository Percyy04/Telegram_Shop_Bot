import { format, toZonedTime } from 'date-fns-tz';

/**
 * Format utilities for VND currency and Vietnamese timezone.
 */

const VN_TIMEZONE = 'Asia/Ho_Chi_Minh';

/**
 * Format an integer VND amount to Vietnamese currency string.
 * Does not use floating point — VND has no decimal digits.
 *
 * @example
 * formatVND(125000) // → "125.000đ"
 * formatVND(0)      // → "0đ"
 * formatVND(1500000) // → "1.500.000đ"
 */
export function formatVND(amount: number): string {
  if (amount === 0) return '0đ';

  const formatted = Math.abs(Math.round(amount))
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  return `${amount < 0 ? '-' : ''}${formatted}đ`;
}

/**
 * Format a short VND amount for Telegram button labels.
 *
 * @example
 * formatVNDShort(125000) // → "125K"
 * formatVNDShort(1500000) // → "1.500K"
 * formatVNDShort(500) // → "500đ"
 */
export function formatVNDShort(amount: number): string {
  if (amount >= 1000) {
    const k = Math.round(amount / 1000);
    const formatted = k.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${formatted}K`;
  }
  return formatVND(amount);
}

/**
 * Format a date to Vietnamese timezone display.
 *
 * @example
 * formatDateVN(new Date()) // → "30/08/2026 08:30"
 */
export function formatDateVN(
  date: Date | string,
  formatStr: string = 'dd/MM/yyyy HH:mm'
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const zonedDate = toZonedTime(d, VN_TIMEZONE);
  return format(zonedDate, formatStr, { timeZone: VN_TIMEZONE });
}

/**
 * Format a date to relative time description in Vietnamese.
 *
 * @example
 * formatTimeLeft(futureDate) // → "25 phút"
 */
export function formatTimeLeft(expiresAt: Date | string): string {
  const target = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt;
  const now = new Date();
  const diffMs = target.getTime() - now.getTime();

  if (diffMs <= 0) return 'Hết hạn';

  const minutes = Math.ceil(diffMs / 60000);
  if (minutes < 60) return `${minutes} phút`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0
    ? `${hours} giờ ${remainingMinutes} phút`
    : `${hours} giờ`;
}
