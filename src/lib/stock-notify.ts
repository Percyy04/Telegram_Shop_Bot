import { sendMessage, buildInlineKeyboard } from './telegram';
import { getAdminSupabase } from './supabase/admin';
import { formatVND } from './format';
import { getEnv } from './config';
import { CB } from './constants';

export interface RestockNotifyParams {
  productIdOrSku: string;
  addedCount: number;
  targetChatIds?: (number | string)[];
}

/**
 * Send restock notification for a product matching the design format:
 *
 * {Product Name}
 * ➕ Thêm: {addedCount}
 * 📦 Tồn kho hiện tại: {totalStock}
 * 💵 Giá: {formattedPrice}
 *
 * [ 🛒 Mua ngay ]
 */
export async function sendStockRestockNotification(params: RestockNotifyParams) {
  const { productIdOrSku, addedCount, targetChatIds } = params;
  const supabase = getAdminSupabase();

  // Find product by ID or SKU
  let query = supabase.from('products').select('id, sku, name, sale_price');
  if (productIdOrSku.startsWith('SKU-') || productIdOrSku.length < 20) {
    query = query.eq('sku', productIdOrSku);
  } else {
    query = query.eq('id', productIdOrSku);
  }

  const { data: product, error: prodErr } = await query.single();
  if (prodErr || !product) {
    throw new Error(`Product not found for: ${productIdOrSku}`);
  }

  // Count current available stock
  const { count: availableStock } = await supabase
    .from('stock_units')
    .select('*', { count: 'exact', head: true })
    .eq('product_id', product.id)
    .eq('status', 'AVAILABLE');

  const currentStock = availableStock ?? 0;
  const formattedPrice = formatVND(Number(product.sale_price));

  const text =
    `${product.name}\n` +
    `➕ Thêm: ${addedCount}\n` +
    `📦 Tồn kho hiện tại: ${currentStock}\n` +
    `💵 Giá: ${formattedPrice}`;

  const keyboard = buildInlineKeyboard([
    [
      {
        text: '🛒 Mua ngay',
        callback_data: `${CB.PRODUCT_DETAIL}${product.id}`,
      },
    ],
  ]);

  // Determine target chats to send to
  let destinations: (number | string)[] = [];
  if (targetChatIds && targetChatIds.length > 0) {
    destinations = targetChatIds;
  } else {
    try {
      const env = getEnv();
      destinations = env.ADMIN_TELEGRAM_IDS;
    } catch {
      // Fallback
      destinations = ['8598083273'];
    }
  }

  const results = [];
  for (const chatId of destinations) {
    try {
      const res = await sendMessage({
        chat_id: chatId,
        text,
        reply_markup: keyboard,
      });
      results.push({ chatId, ok: res.ok });
    } catch (err) {
      console.error(`Failed to send restock notification to ${chatId}:`, err);
      results.push({ chatId, ok: false, error: err });
    }
  }

  return {
    success: true,
    product,
    addedCount,
    currentStock,
    results,
  };
}
