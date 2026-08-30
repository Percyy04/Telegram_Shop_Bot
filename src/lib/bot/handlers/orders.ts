import { TelegramMessage, TelegramCallbackQuery } from '../types';
import {
  sendMessage,
  editMessageText,
  answerCallbackQuery,
  buildInlineKeyboard,
} from '@/lib/telegram';
import { getAdminSupabase } from '@/lib/supabase/admin';
import { formatVND, formatDateVN } from '@/lib/format';
import { decryptPayload } from '@/lib/crypto';
import { getEnv } from '@/lib/config';
import { CB } from '@/lib/constants';

/**
 * Handle Order History menu (`/orders` command or `orders` callback).
 */
export async function handleOrdersCommand(
  target: TelegramMessage | TelegramCallbackQuery,
  page: number = 1
) {
  const isCallback = 'data' in target;
  const chatId = isCallback ? target.message?.chat.id : target.chat.id;
  const messageId = isCallback ? target.message?.message_id : undefined;
  const userId = isCallback ? target.from.id : target.from?.id;

  if (!chatId || !userId) return;
  if (isCallback) await answerCallbackQuery(target.id);

  const supabase = getAdminSupabase();
  const PAGE_SIZE = 10;

  const { data: orders, count } = await supabase
    .from('orders')
    .select(
      `
      id, code, total_amount, status, created_at,
      order_items ( product_name_snapshot, quantity )
    `,
      { count: 'exact' }
    )
    .eq('telegram_user_id', userId)
    .order('created_at', { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (!orders || orders.length === 0) {
    const emptyText = '📋 LỊCH SỬ MUA HÀNG\n\nBạn chưa có đơn hàng nào.';
    if (messageId) {
      await editMessageText({
        chat_id: chatId,
        message_id: messageId,
        text: emptyText,
      });
    } else {
      await sendMessage({ chat_id: chatId, text: emptyText });
    }
    return;
  }

  const buttons: { text: string; callback_data: string }[][] = [];

  for (const o of orders) {
    const item = Array.isArray(o.order_items) ? o.order_items[0] : o.order_items;
    const prodName = item?.product_name_snapshot || 'Sản phẩm';
    const priceStr = formatVND(Number(o.total_amount));
    const dateStr = formatDateVN(o.created_at, 'dd/MM HH:mm');

    // Build button label e.g.: 📦 ORDERMF9CAD74J0 - Netflix Premium 4K - 55.000đ (10/08 18:59)
    // Telegram inline button label max limit is 64 characters
    let rawLabel = `📦 ${o.code} - ${prodName} - ${priceStr} (${dateStr})`;
    if (rawLabel.length > 60) {
      const maxProdLen = Math.max(
        10,
        60 - (o.code.length + priceStr.length + dateStr.length + 12)
      );
      const truncatedProd =
        prodName.length > maxProdLen
          ? prodName.substring(0, maxProdLen) + '...'
          : prodName;
      rawLabel = `📦 ${o.code} - ${truncatedProd} - ${priceStr} (${dateStr})`;
    }

    buttons.push([
      {
        text: rawLabel,
        callback_data: `${CB.ORDER_DETAIL}${o.id}`,
      },
    ]);
  }

  // Pagination buttons
  const totalPages = Math.ceil((count || 0) / PAGE_SIZE);
  const navRow = [];

  if (page > 1) {
    navRow.push({
      text: '« Trang trước',
      callback_data: `${CB.ORDERS_PAGE}${page - 1}`,
    });
  }
  if (page < totalPages) {
    navRow.push({
      text: 'Trang sau »',
      callback_data: `${CB.ORDERS_PAGE}${page + 1}`,
    });
  }
  if (navRow.length > 0) buttons.push(navRow);
  buttons.push([{ text: '« Quay lại menu', callback_data: CB.MENU_HOME }]);

  const titleText = '📋 LỊCH SỬ MUA HÀNG\n\nChọn đơn để xem chi tiết:';
  const replyMarkup = buildInlineKeyboard(buttons);

  if (messageId) {
    await editMessageText({
      chat_id: chatId,
      message_id: messageId,
      text: titleText,
      reply_markup: replyMarkup,
    });
  } else {
    await sendMessage({
      chat_id: chatId,
      text: titleText,
      reply_markup: replyMarkup,
    });
  }
}

/**
 * Handle Order Detail view click (`order:{orderId}`).
 */
export async function handleOrderDetail(
  callback: TelegramCallbackQuery,
  orderId: string
) {
  const chatId = callback.message?.chat.id;
  const messageId = callback.message?.message_id;
  if (!chatId || !messageId) return;

  await answerCallbackQuery(callback.id);

  const supabase = getAdminSupabase();
  const env = getEnv();

  const { data: order } = await supabase
    .from('orders')
    .select(
      `
      id, code, total_amount, status, created_at,
      order_items ( product_name_snapshot, quantity )
    `
    )
    .eq('id', orderId)
    .single();

  if (!order) {
    await editMessageText({
      chat_id: chatId,
      message_id: messageId,
      text: '❌ Không tìm thấy thông tin đơn hàng.',
    });
    return;
  }

  const item = Array.isArray(order.order_items) ? order.order_items[0] : order.order_items;
  const prodName = item?.product_name_snapshot || 'Sản phẩm';
  const qty = item?.quantity || 1;

  // Status mapping
  let statusText = order.status as string;
  if (order.status === 'DELIVERED' || order.status === 'PAID') statusText = 'COMPLETED';
  else if (order.status === 'AWAITING_PAYMENT') statusText = 'CHỜ THANH TOÁN';
  else if (order.status === 'EXPIRED') statusText = 'ĐÃ HẾT HẠN';
  else if (order.status === 'CANCELLED') statusText = 'ĐÃ HỦY';

  // Fetch stock units delivered for this order
  const { data: stockUnits } = await supabase
    .from('stock_units')
    .select('delivery_payload_encrypted')
    .or(`reserved_order_id.eq.${orderId},sold_order_id.eq.${orderId}`);

  const payloads = (stockUnits || []).map((unit, idx) => {
    try {
      const decrypted = decryptPayload(
        unit.delivery_payload_encrypted,
        env.INVENTORY_ENCRYPTION_KEY
      );
      return `${idx + 1}. ${decrypted}`;
    } catch {
      return `${idx + 1}. [Không thể giải mã]`;
    }
  });

  let text = '📋 CHI TIẾT ĐƠN HÀNG\n\n';
  text += `🧾 Mã đơn: ${order.code}\n`;
  text += `📦 Sản phẩm: ${prodName}\n`;
  text += `🔢 Số lượng: ${qty}\n`;
  text += `💵 Thành tiền: ${formatVND(Number(order.total_amount))}\n`;
  text += `📌 Trạng thái: ${statusText}\n`;
  text += `🕒 Thời gian: ${formatDateVN(order.created_at, 'dd/MM/yyyy HH:mm')}\n\n`;

  if (payloads.length > 0) {
    text += `🔐 Tài khoản đã giao:\n${payloads.join('\n')}`;
  } else {
    text += `⚠️ Chưa giao sản phẩm.`;
  }

  const buttons = [
    [{ text: '« Quay lại lịch sử', callback_data: `${CB.ORDERS_PAGE}1` }],
  ];

  await editMessageText({
    chat_id: chatId,
    message_id: messageId,
    text,
    reply_markup: buildInlineKeyboard(buttons),
  });
}
