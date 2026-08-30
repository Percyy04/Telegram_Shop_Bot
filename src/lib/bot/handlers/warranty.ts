import { TelegramMessage } from '../types';
import { sendMessage } from '@/lib/telegram';

export async function handleWarrantyCommand(message: TelegramMessage) {
  const chatId = message.chat.id;

  const text =
    '🛡 Bảo hành & Hỗ trợ sản phẩm\n\n' +
    'Nếu sản phẩm gặp sự cố, vui lòng nhắn tin trực tiếp nội dung sự cố kèm Mã đơn hàng vào đây.\n' +
    'Bộ phận CSKH sẽ kiểm tra và phản hồi trong thời gian sớm nhất.';

  await sendMessage({ chat_id: chatId, text });
}
