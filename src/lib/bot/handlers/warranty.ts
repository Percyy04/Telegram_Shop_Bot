import { TelegramMessage } from '../types';
import { sendMessage } from '@/lib/telegram';

export async function handleWarrantyCommand(message: TelegramMessage) {
  const chatId = message.chat.id;

  const text =
    '🛡 Bảo hành & Hỗ trợ sản phẩm:\n\n' +
    '✈️ Telegram: @percy004\n\n' +
    'Nếu sản phẩm gặp sự cố, vui lòng nhắn tin trực tiếp kèm Mã đơn hàng để được hỗ trợ và xử lý nhanh nhất.';

  await sendMessage({ chat_id: chatId, text });
}
