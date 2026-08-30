import { TelegramMessage } from '../types';
import { handleStartCommand } from './start';
import { handleCatalogMenu } from './catalog';
import { handleOrdersCommand } from './orders';
import { handleSupportCommand } from './support';
import { handleWarrantyCommand } from './warranty';
import { sendMessage } from '@/lib/telegram';
import { MENU, MSG } from '@/lib/constants';

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

  // 2. Command triggers (/start, /menu, /products, etc.)
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

  // 3. Fallback
  await sendMessage({
    chat_id: message.chat.id,
    text: 'Vui lòng chọn tính năng ở Menu bên dưới hoặc gõ /start để bắt đầu.',
  });
}
