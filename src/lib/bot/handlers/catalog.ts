import { TelegramCallbackQuery, TelegramMessage } from '../types';
import { sendMessage, sendPhoto, editMessageText, answerCallbackQuery, buildInlineKeyboard } from '@/lib/telegram';
import { getAdminSupabase } from '@/lib/supabase/admin';
import { formatVND, formatVNDShort } from '@/lib/format';
import { MSG, CB } from '@/lib/constants';
import { setUserLastProduct } from '../user-session';

/**
 * Render category catalog menu.
 */
export async function handleCatalogMenu(chatId: number, messageId?: number) {
  const supabase = getAdminSupabase();

  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, emoji, products(id, is_active)')
    .eq('is_active', true)
    .order('sort_order');

  // Filter categories to only those containing at least 1 active product
  const activeCategories = (categories || []).filter((cat) => {
    const prods = (cat.products || []) as { id: string; is_active: boolean }[];
    return prods.some((p) => p.is_active);
  });

  if (!activeCategories || activeCategories.length === 0) {
    const text = '🛒 Hiện tại chưa có sản phẩm nào đang mở bán.';
    if (messageId) {
      await editMessageText({ chat_id: chatId, message_id: messageId, text });
    } else {
      await sendMessage({ chat_id: chatId, text });
    }
    return;
  }

  // Build category inline buttons
  const rows = activeCategories.map((cat) => [
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
    .eq('is_active', true)
    .single();

  if (!product) {
    await editMessageText({
      chat_id: chatId,
      message_id: messageId,
      text: '❌ Sản phẩm này hiện đang tạm ẩn hoặc ngừng kinh doanh.',
      reply_markup: buildInlineKeyboard([
        [{ text: '« Quay lại danh mục', callback_data: CB.MENU_HOME }],
      ]),
    });
    return;
  }

  // Store last viewed product for quantity text input (e.g. typing "10")
  setUserLastProduct(chatId, product.id);

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
    availableStock,
    soldCount: 4537,
    description: product.description,
    minQuantity: product.min_quantity || 1,
    maxQuantity: Math.min(product.max_quantity || 59, availableStock),
  });

  const buttons: { text: string; callback_data: string }[][] = [];

  if (inStock) {
    // Quick quantity choices (1, 2, 5, 10)
    buttons.push([
      { text: '🛒 Mua 1', callback_data: `${CB.CHECKOUT}${product.id}:1` },
      { text: '🛒 Mua 2', callback_data: `${CB.CHECKOUT}${product.id}:2` },
      { text: '🛒 Mua 5', callback_data: `${CB.CHECKOUT}${product.id}:5` },
      { text: '🛒 Mua 10', callback_data: `${CB.CHECKOUT}${product.id}:10` },
    ]);
  }

  const categoryRel = product.categories as unknown as { id: string; name: string } | null;
  const categoryId = categoryRel?.id;
  
  const backRow: { text: string; callback_data: string }[] = [];
  if (categoryId) {
    backRow.push({
      text: '« Quay lại danh sách',
      callback_data: `${CB.CATEGORY}${categoryId}`,
    });
  }
  backRow.push({ text: '❌ Hủy', callback_data: CB.MENU_HOME });
  buttons.push(backRow);

  // If product has an image URL, send or edit photo
  if (product.image_url) {
    const fullImageUrl = product.image_url.startsWith('http')
      ? product.image_url
      : `https://venture-rounds-fraser-sur.trycloudflare.com${product.image_url}`;

    await sendPhoto({
      chat_id: chatId,
      photo: fullImageUrl,
      caption: detailText,
      parse_mode: 'HTML',
      reply_markup: buildInlineKeyboard(buttons),
    });
  } else {
    await editMessageText({
      chat_id: chatId,
      message_id: messageId,
      text: detailText,
      parse_mode: 'HTML',
      reply_markup: buildInlineKeyboard(buttons),
    });
  }
}
