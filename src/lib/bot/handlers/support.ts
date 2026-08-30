import { TelegramMessage } from '../types';
import { sendMessage } from '@/lib/telegram';
import { MSG } from '@/lib/constants';

export async function handleSupportCommand(message: TelegramMessage) {
  const chatId = message.chat.id;
  const contactInfo = '@percy004';

  await sendMessage({
    chat_id: chatId,
    text: MSG.SUPPORT(contactInfo),
  });
}
