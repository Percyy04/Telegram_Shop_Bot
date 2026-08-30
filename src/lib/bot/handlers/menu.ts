import { TelegramMessage } from '../types';
import { handleStartCommand } from './start';
import { handleCatalogMenu } from './catalog';
import { handleOrdersCommand } from './orders';
import { handleSupportCommand } from './support';
import { handleWarrantyCommand } from './warranty';
import { sendMessage } from '@/lib/telegram';
import { MENU, MSG } from '@/lib/constants';
import { getUserLastProduct } from '../user-session';
import { processCheckoutDirect } from './checkout';
import { getAdminSupabase } from '@/lib/supabase/admin';

export async function handleTextMessage(message: TelegramMessage) {
  const text = message.text?.trim();
  if (!text) return;

  // 1. Reply Keyboard Button Triggers
  switch (text) {
    case MENU.BUY:
      await handleCatalogMenu(message.chat.id);
      return;
    case MENU.ORDERS:
      await handleOrdersCommand(message);
      return;
    case MENU.PROFILE:
      await sendMessage({
        chat_id: message.chat.id,
        text: `👤 Hồ sơ khách hàng:\n• Tên: ${message.from?.first_name || 'Khách'}\n• Username: @${message.from?.username || 'N/A'}\n• Telegram ID: ${message.from?.id}`,
      });
      return;
    case MENU.WARRANTY:
      await handleWarrantyCommand(message);
      return;
    case MENU.SUPPORT:
      await handleSupportCommand(message);
      return;
    case MENU.WALLET:
      await sendMessage({ chat_id: message.chat.id, text: MSG.WALLET_PLACEHOLDER });
      return;
    case MENU.LANGUAGE:
      await sendMessage({ chat_id: message.chat.id, text: MSG.LANGUAGE_NOTICE });
      return;
  }

  // 3. Command triggers (/start, /menu, /products, etc.)
  if (text.startsWith('/start')) {
    await handleStartCommand(message);
    return;
  }
  if (text === '/menu' || text === '/products') {
    await handleCatalogMenu(message.chat.id);
    return;
  }
  if (text === '/orders') {
    await handleOrdersCommand(message);
    return;
  }
  if (text === '/support') {
    await handleSupportCommand(message);
    return;
  }

  // 4. Numeric quantity input trigger (e.g. typing "10", "3", "50")
  if (/^\d+$/.test(text)) {
    const qty = parseInt(text, 10);
    if (qty > 0 && message.from) {
      let productId = getUserLastProduct(message.chat.id);
      if (!productId) {
        // Fallback to active Gemini Pro product or latest active product
        const supabase = getAdminSupabase();
        const { data: prod } = await supabase
          .from('products')
          .select('id')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        if (prod) productId = prod.id;
      }

      if (productId) {
        await sendMessage({
          chat_id: message.chat.id,
          text: `⏳ Đang tạo đơn hàng với số lượng ${qty}...`,
        });
        await processCheckoutDirect({
          chatId: message.chat.id,
          user: message.from,
          productId,
          quantity: qty,
        });
        return;
      }
    }
  }

  // 5. Fallback
  await sendMessage({
    chat_id: message.chat.id,
    text: 'Vui lòng chọn tính năng ở Menu bên dưới hoặc gõ /start để bắt đầu.',
  });
}
