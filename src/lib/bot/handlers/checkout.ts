import { TelegramCallbackQuery } from '../types';
import {
  sendMessage,
  sendPhoto,
  editMessageText,
  answerCallbackQuery,
} from '@/lib/telegram';
import { getAdminSupabase } from '@/lib/supabase/admin';
import { formatVND, formatDateVN } from '@/lib/format';
import { generatePaymentReference, generateOrderCode } from '@/lib/payment-code';
import { generateQRUrl } from '@/lib/vietqr';
import { getEnv } from '@/lib/config';
import { MSG } from '@/lib/constants';

/**
 * Execute checkout process directly for a chat, user, product, and quantity.
 */
export async function processCheckoutDirect(params: {
  chatId: number;
  user: { id: number; username?: string; first_name?: string };
  productId: string;
  quantity: number;
  messageId?: number;
}) {
  const { chatId, user, productId, quantity, messageId } = params;

  const env = getEnv();
  const supabase = getAdminSupabase();

  const orderCode = generateOrderCode();
  const paymentRef = generatePaymentReference();

  // Expiry time (default 30 mins)
  const expiresAt = new Date(
    Date.now() + env.ORDER_EXPIRE_MINUTES * 60 * 1000
  ).toISOString();

  // Call atomic RPC
  const { data: rawResult, error: rpcError } = await supabase.rpc(
    'create_order_and_reserve_stock',
    {
      p_telegram_user_id: user.id,
      p_telegram_username: user.username || null,
      p_telegram_first_name: user.first_name || null,
      p_product_id: productId,
      p_quantity: quantity,
      p_order_code: orderCode,
      p_payment_reference: paymentRef,
      p_expires_at: expiresAt,
    }
  );

  const result = rawResult as {
    status?: string;
    order_id?: string;
    available?: number;
    total_amount?: number;
    expires_at?: string;
    order_code?: string;
    product_name?: string;
    quantity?: number;
  } | null;

  if (rpcError || !result || result.status !== 'SUCCESS') {
    const errorMsg =
      result?.status === 'INSUFFICIENT_STOCK'
        ? `❌ Rất tiếc, chỉ còn ${result.available} sản phẩm trong kho.`
        : MSG.SYSTEM_ERROR;

    if (messageId) {
      await editMessageText({
        chat_id: chatId,
        message_id: messageId,
        text: errorMsg,
      });
    } else {
      await sendMessage({ chat_id: chatId, text: errorMsg });
    }
    return;
  }

  // Success — Order created & stock reserved!
  const formattedTotal = formatVND(Number(result.total_amount || 0));
  const formattedExpiry = formatDateVN(result.expires_at || new Date().toISOString());

  // Generate VietQR Image URL
  const qrUrl = generateQRUrl({
    bankCode: env.VIETQR_BANK_CODE,
    accountNumber: env.VIETQR_ACCOUNT_NUMBER,
    accountName: env.VIETQR_ACCOUNT_NAME,
    amount: Number(result.total_amount || 0),
    reference: paymentRef,
  });

  const paymentText = MSG.PAYMENT_INSTRUCTION({
    orderCode: result.order_code || orderCode,
    productName: result.product_name || 'Sản phẩm',
    quantity: result.quantity || 1,
    formattedTotal,
    bankName: env.VIETQR_BANK_CODE,
    accountNumber: env.VIETQR_ACCOUNT_NUMBER,
    accountName: env.VIETQR_ACCOUNT_NAME,
    paymentReference: paymentRef,
    expiryTime: formattedExpiry,
  });

  // Send VietQR photo with instruction text caption
  const photoRes = await sendPhoto({
    chat_id: chatId,
    photo: qrUrl,
    caption: paymentText,
  });

  if (photoRes.ok && photoRes.result?.message_id && result?.order_id) {
    // Store QR payment message ID in delivery_attempts for auto-deletion upon completion
    await supabase.from('delivery_attempts').upsert(
      {
        order_id: result.order_id,
        telegram_chat_id: chatId,
        telegram_message_ids: [photoRes.result.message_id],
      },
      { onConflict: 'order_id' }
    );
  }
}

/**
 * Handle checkout button click.
 */
export async function handleCheckout(
  callback: TelegramCallbackQuery,
  productId: string,
  quantity: number = 1
) {
  const chatId = callback.message?.chat.id;
  const messageId = callback.message?.message_id;
  if (!chatId) return;

  await answerCallbackQuery(callback.id, 'Đang tạo đơn hàng...');

  await processCheckoutDirect({
    chatId,
    user: callback.from,
    productId,
    quantity,
    messageId,
  });
}
