import { TelegramMessage } from '../types';
import { sendMessage } from '@/lib/telegram';
import { getAdminSupabase } from '@/lib/supabase/admin';
import { formatVND, formatDateVN } from '@/lib/format';
import { MSG } from '@/lib/constants';

export async function handleOrdersCommand(message: TelegramMessage) {
  const chatId = message.chat.id;
  const userId = message.from?.id;
  if (!userId) return;

  const supabase = getAdminSupabase();

  const { data: orders } = await supabase
    .from('orders')
    .select(`
      id, code, total_amount, status, created_at,
      order_items ( product_name_snapshot, quantity )
    `)
    .eq('telegram_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);

  if (!orders || orders.length === 0) {
    await sendMessage({ chat_id: chatId, text: MSG.NO_ORDERS });
    return;
  }

  let text = '📦 Lịch sử đơn hàng của bạn (10 đơn gần nhất):\n\n';

  for (const o of orders) {
    const item = Array.isArray(o.order_items) ? o.order_items[0] : o.order_items;
    const statusIcon =
      o.status === 'DELIVERED'
        ? '✅'
        : o.status === 'AWAITING_PAYMENT'
        ? '⏳'
        : o.status === 'EXPIRED'
        ? '❌'
        : '📦';

    text += `${statusIcon} Mã đơn: ${o.code}\n`;
    if (item) text += `• Sản phẩm: ${item.product_name_snapshot} (${item.quantity}x)\n`;
    text += `• Tổng tiền: ${formatVND(Number(o.total_amount))}\n`;
    text += `• Trạng thái: ${o.status}\n`;
    text += `• Ngày tạo: ${formatDateVN(o.created_at)}\n\n`;
  }

  await sendMessage({ chat_id: chatId, text });
}
