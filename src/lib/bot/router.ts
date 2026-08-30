import { TelegramUpdate } from './types';
import { handleTextMessage } from './handlers/menu';
import {
  handleCatalogMenu,
  handleCategorySelect,
  handleProductDetail,
} from './handlers/catalog';
import { handleCheckout } from './handlers/checkout';
import { parseCallbackData, CB } from '@/lib/constants';
import { answerCallbackQuery } from '@/lib/telegram';

export async function routeTelegramUpdate(update: TelegramUpdate) {
  // 1. Handle incoming text messages
  if (update.message?.text) {
    await handleTextMessage(update.message);
    return;
  }

  // 2. Handle inline button callback queries
  if (update.callback_query?.data) {
    const callback = update.callback_query;
    const data = callback.data || '';

    // Menu Home
    if (data === CB.MENU_HOME) {
      await answerCallbackQuery(callback.id);
      if (callback.message?.chat.id && callback.message?.message_id) {
        await handleCatalogMenu(callback.message.chat.id, callback.message.message_id);
      }
      return;
    }

    const parsed = parseCallbackData(data);
    if (!parsed) {
      await answerCallbackQuery(callback.id);
      return;
    }

    const { action, params } = parsed;

    switch (action) {
      case 'category':
        if (params[0]) {
          await handleCategorySelect(callback, params[0], 1);
        }
        break;

      case 'page':
        if (params[0] && params[1]) {
          await handleCategorySelect(callback, params[0], parseInt(params[1], 10));
        }
        break;

      case 'product':
        if (params[0]) {
          await handleProductDetail(callback, params[0]);
        }
        break;

      case 'checkout':
        if (params[0]) {
          const qty = params[1] ? parseInt(params[1], 10) : 1;
          await handleCheckout(callback, params[0], qty);
        }
        break;

      default:
        await answerCallbackQuery(callback.id);
        break;
    }
  }
}
