/**
 * Admin notification via Telegram.
 * Sends messages to admin Telegram IDs for important events.
 */

import { sendMessage } from './telegram';
import { getEnv } from './config';

type NotifyLevel = 'info' | 'warning' | 'error';

const LEVEL_EMOJI: Record<NotifyLevel, string> = {
  info: '✅',
  warning: '⚠️',
  error: '❌',
};

/**
 * Send a notification to all configured admin Telegram IDs.
 */
export async function notifyAdmin(
  message: string,
  level: NotifyLevel = 'info'
): Promise<void> {
  const env = getEnv();
  const emoji = LEVEL_EMOJI[level];
  const text = `${emoji} ${message}`;

  const promises = env.ADMIN_TELEGRAM_IDS.map((adminId) =>
    sendMessage({
      chat_id: adminId,
      text,
    }).catch((err) => {
      console.error(`Failed to notify admin ${adminId}:`, err.message);
    })
  );

  await Promise.allSettled(promises);
}

/**
 * Notify admin of auto-confirmed payment.
 */
export async function notifyAutoConfirm(
  orderCode: string,
  amount: number
): Promise<void> {
  await notifyAdmin(
    `Auto-confirm đơn ${orderCode} — ${amount.toLocaleString()}đ`,
    'info'
  );
}

/**
 * Notify admin of payment amount mismatch.
 */
export async function notifyAmountMismatch(
  reference: string,
  expected: number,
  received: number
): Promise<void> {
  await notifyAdmin(
    `Đơn ${reference}: nhận ${received.toLocaleString()}đ / cần ${expected.toLocaleString()}đ. Sai số tiền.`,
    'warning'
  );
}

/**
 * Notify admin of unmatched payment (no reference found).
 */
export async function notifyUnmatchedPayment(
  amount: number,
  content: string
): Promise<void> {
  await notifyAdmin(
    `CK không khớp mã đơn: ${amount.toLocaleString()}đ, ND: "${content}"`,
    'warning'
  );
}

/**
 * Notify admin of delivery failure.
 */
export async function notifyDeliveryFailed(
  orderCode: string,
  error: string
): Promise<void> {
  await notifyAdmin(
    `Giao hàng thất bại đơn ${orderCode}: ${error}`,
    'error'
  );
}

/**
 * Notify admin of uncertain delivery (timeout/crash).
 */
export async function notifyDeliveryUncertain(
  orderCode: string
): Promise<void> {
  await notifyAdmin(
    `Giao hàng không xác định đơn ${orderCode}. Cần kiểm tra Telegram chat.`,
    'error'
  );
}
