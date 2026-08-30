import { TelegramCallbackQuery, TelegramMessage } from '../types';
import { sendMessage, editMessageText, answerCallbackQuery, buildInlineKeyboard } from '@/lib/telegram';
import { getAdminSupabase } from '@/lib/supabase/admin';
import { formatVND, formatVNDShort } from '@/lib/format';
import { MSG, CB } from '@/lib/constants';

/**
 * Render category catalog menu.
 */
export async function handleCatalogMenu(chatId: number, messageId?: number) {
  const supabase = getAdminSupabase();

  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, emoji')
    .eq('is_active', true)
    .order('sort_order');

  if (!categories || categories.length === 0) {
    const text = '🛒 Hiện tại chưa có danh mục sản phẩm nào.';
    if (messageId) {
      await editMessageText({ chat_id: chatId, message_id: messageId, text });
    } else {
      await sendMessage({ chat_id: chatId, text });
    }
    return;
  }

  // Build category inline buttons
  const rows = categories.map((cat) => [
    {
      text: `${cat.emoji || '📦'} ${cat.name}`,
      callback_data: `${CB.CATEGORY}${cat.id}`,
    },
  ]);

  const replyMarkup = buildInlineKeyboard(rows);

  if (messageId) {
    await editMessageText({
      chat_id: chatId,
      message_id: messageId,
      text: MSG.CATEGORY_LIST,
      reply_markup: replyMarkup,
    });
  } else {
    await sendMessage({
      chat_id: chatId,
      text: MSG.CATEGORY_LIST,
      reply_markup: replyMarkup,
    });
  }
}

/**
 * Handle category click -> render product list in category.
 */
export async function handleCategorySelect(
  callback: TelegramCallbackQuery,
  categoryId: string,
  page: number = 1
) {
  const chatId = callback.message?.chat.id;
  const messageId = callback.message?.message_id;
  if (!chatId || !messageId) return;

  await answerCallbackQuery(callback.id);

  const supabase = getAdminSupabase();
  const PAGE_SIZE = 5;

  // Fetch category info
  const { data: category } = await supabase
    .from('categories')
    .select('name')
    .eq('id', categoryId)
    .single();

  // Fetch products in category
  const { data: products, count } = await supabase
    .from('products')
    .select('id, name, sale_price, min_quantity, max_quantity', { count: 'exact' })
    .eq('category_id', categoryId)
    .eq('is_active', true)
    .order('name')
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (!products || products.length === 0) {
    await editMessageText({
      chat_id: chatId,
      message_id: messageId,
      text: '📦 Chưa có sản phẩm trong danh mục này.',
      reply_markup: buildInlineKeyboard([
        [{ text: '« Quay lại danh mục', callback_data: CB.MENU_HOME }],
      ]),
    });
    return;
  }

  // Check available stock count for each product
  const rows: { text: string; callback_data: string }[][] = [];

  for (const p of products) {
    const { count: stockCount } = await supabase
      .from('stock_units')
      .select('*', { count: 'exact', head: true })
      .eq('product_id', p.id)
      .eq('status', 'AVAILABLE');

    const inStock = (stockCount || 0) > 0;
    const priceText = formatVNDShort(Number(p.sale_price));
    const label = `${inStock ? '🟢' : '🔴'} ${p.name} — ${priceText}${
      inStock ? '' : ' (Hết hàng)'
    }`;

    rows.push([
      {
        text: label,
        callback_data: `${CB.PRODUCT}${p.id}`,
      },
    ]);
  }

  // Pagination buttons
  const totalPages = Math.ceil((count || 0) / PAGE_SIZE);
  const navRow = [];

  if (page > 1) {
    navRow.push({
      text: '« Trang trước',
      callback_data: `page:${categoryId}:${page - 1}`,
    });
  }
  if (page < totalPages) {
    navRow.push({
      text: 'Trang sau »',
      callback_data: `page:${categoryId}:${page + 1}`,
    });
  }

  if (navRow.length > 0) rows.push(navRow);
  rows.push([{ text: '« Danh mục chính', callback_data: CB.MENU_HOME }]);

  await editMessageText({
    chat_id: chatId,
    message_id: messageId,
    text: MSG.PRODUCT_LIST(category?.name || 'Danh mục', page, totalPages),
    reply_markup: buildInlineKeyboard(rows),
  });
}

/**
 * Handle product detail view.
 */
export async function handleProductDetail(
  callback: TelegramCallbackQuery,
  productId: string
) {
  const chatId = callback.message?.chat.id;
  const messageId = callback.message?.message_id;
  if (!chatId || !messageId) return;

  await answerCallbackQuery(callback.id);

  const supabase = getAdminSupabase();

  const { data: product } = await supabase
    .from('products')
    .select('*, categories(id, name)')
    .eq('id', productId)
    .single();

  if (!product) {
    await answerCallbackQuery(callback.id, 'Sản phẩm không tồn tại.', true);
    return;
  }

  // Check stock
  const { count: stockCount } = await supabase
    .from('stock_units')
    .select('*', { count: 'exact', head: true })
    .eq('product_id', productId)
    .eq('status', 'AVAILABLE');

  const availableStock = stockCount || 0;
  const inStock = availableStock > 0;

  const detailText = MSG.PRODUCT_DETAIL({
    name: product.name,
    price: formatVND(Number(product.sale_price)),
    inStock,
    warrantyText: product.warranty_text,
    deliveryNote: product.delivery_note,
    description: product.description,
  });

  const buttons: { text: string; callback_data: string }[][] = [];

  if (inStock) {
    buttons.push([
      {
        text: `🛒 Mua ngay (Còn ${availableStock})`,
        callback_data: `${CB.CHECKOUT}${product.id}:1`,
      },
    ]);
  }

  const categoryRel = product.categories as unknown as { id: string; name: string } | null;
  const categoryId = categoryRel?.id;
  if (categoryId) {
    buttons.push([
      {
        text: '« Quay lại danh sách',
        callback_data: `${CB.CATEGORY}${categoryId}`,
      },
    ]);
  }

  await editMessageText({
    chat_id: chatId,
    message_id: messageId,
    text: detailText,
    parse_mode: 'MarkdownV2',
    reply_markup: buildInlineKeyboard(buttons),
  });
}
