import { TelegramMessage } from '../types';
import { sendMessage, buildReplyKeyboard } from '@/lib/telegram';
import { MENU } from '@/lib/constants';
import { handleCatalogMenu } from './catalog';

export async function handleStartCommand(message: TelegramMessage) {
  const chatId = message.chat.id;
  const firstName = message.from?.first_name || 'bạn';

  const keyboard = buildReplyKeyboard([
    [MENU.BUY, MENU.ORDERS],
    [MENU.PROFILE, MENU.WARRANTY],
    [MENU.SUPPORT],
  ]);

  await sendMessage({
    chat_id: chatId,
    text: `👋 Xin chào ${firstName}!\n\nChào mừng bạn đến với cửa hàng.`,
    reply_markup: keyboard,
  });

  // Automatically display inline category catalog
  await handleCatalogMenu(chatId);
}
