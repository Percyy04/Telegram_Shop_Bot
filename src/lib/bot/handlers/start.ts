import { TelegramMessage } from '../types';
import { sendMessage, buildReplyKeyboard } from '@/lib/telegram';
import { MSG, MENU } from '@/lib/constants';

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
    text: MSG.GREETING(firstName),
    parse_mode: 'MarkdownV2',
    reply_markup: keyboard,
  });
}
