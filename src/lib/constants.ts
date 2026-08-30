/**
 * Vietnamese message templates and constants.
 * Structured for future i18n support.
 */

// --- Telegram Callback Data Prefixes ---
export const CB = {
  CATEGORY: 'cat:',
  PAGE: 'page:',
  PRODUCT: 'product:',
  QTY_INC: 'qty:inc:',
  QTY_DEC: 'qty:dec:',
  CHECKOUT: 'checkout:',
  ORDERS_PAGE: 'orders:',
  ORDER_DETAIL: 'order:',
  MENU_HOME: 'menu:home',
  WARRANTY_CREATE: 'warranty:create:',
  WARRANTY_LIST: 'warranty:list',
} as const;

// --- Reply Keyboard Buttons ---
export const MENU = {
  BUY: '🛒 Mua hàng',
  PROFILE: '👤 Hồ sơ',
  WALLET: '💰 Ví',
  ORDERS: '📦 Đơn hàng',
  WARRANTY: '🛡 Bảo hành',
  SUPPORT: '💬 Hỗ trợ',
  LANGUAGE: '🌐 Ngôn ngữ',
} as const;

// --- Message Templates ---
export const MSG = {
  GREETING: (firstName: string) =>
    `👋 Xin chào ${escapeMarkdown(firstName)}!\n\nChào mừng bạn đến với cửa hàng.\nHãy chọn sản phẩm bạn muốn mua ở menu bên dưới.`,

  MENU_SET: '🎉 Đã bật menu nhanh dưới ô chat.',

  CHOOSE_MENU: '🎉 Vui lòng chọn menu:',

  CATEGORY_LIST: '🛒 Mua hàng\n\nChọn danh mục sản phẩm:',

  PRODUCT_LIST: (categoryName: string, page: number, totalPages: number) =>
    `${categoryName}\nTrang ${page}/${totalPages}\n\nChọn sản phẩm để xem chi tiết.`,

  PRODUCT_DETAIL: (p: {
    name: string;
    price: string;
    inStock: boolean;
    availableStock?: number;
    soldCount?: number;
    description?: string | null;
    minQuantity?: number;
    maxQuantity?: number;
  }) => {
    let text = `${p.name}\n`;
    text += `💵 Giá: ${p.price}/tài khoản\n`;
    text += `💰 Tồn kho: ${p.availableStock ?? 59} tài khoản\n`;
    text += `📊 Đã bán: ${p.soldCount ?? 4537} tài khoản\n\n`;
    
    if (p.description) {
      text += `🗣️ Mô tả:\n${p.description}\n\n`;
    }
    
    if (p.inStock) {
      const maxQty = p.maxQuantity || p.availableStock || 59;
      text += `✏️ Vui lòng nhập số lượng muốn mua (1-${maxQty}):`;
    } else {
      text += `❌ Sản phẩm tạm thời hết hàng.`;
    }
    return text;
  },

  PAYMENT_INSTRUCTION: (p: {
    orderCode: string;
    productName: string;
    quantity: number;
    formattedTotal: string;
    bankName: string;
    accountNumber: string;
    accountName: string;
    paymentReference: string;
    expiryTime: string;
  }) =>
    `📋 Đơn hàng: ${p.orderCode}\n\n` +
    `💰 Số tiền cần chuyển: ${p.formattedTotal}\n` +
    `🏦 Ngân hàng: ${p.bankName}\n` +
    `💳 Số tài khoản: ${p.accountNumber}\n` +
    `👤 Chủ tài khoản: ${p.accountName}\n\n` +
    `📝 Nội dung chuyển khoản bắt buộc:\n${p.paymentReference}\n\n` +
    `⏱ Đơn được giữ đến: ${p.expiryTime}\n\n` +
    `⚠️ Hệ thống chỉ tự động giao hàng khi:\n` +
    `• Chuyển đúng ${p.formattedTotal}\n` +
    `• Nội dung chứa đúng mã ${p.paymentReference}\n` +
    `• Thanh toán trước thời gian hết hạn\n\n` +
    `Giao dịch sai số tiền hoặc sai nội dung sẽ không được giao hàng tự động.`,

  DELIVERY_SUCCESS: (p: {
    orderCode: string;
    payload: string;
    warrantyText?: string | null;
  }) =>
    `✅ Thanh toán đơn ${p.orderCode} đã được xác nhận.\n\n` +
    `Thông tin sản phẩm của bạn:\n\n${p.payload}\n\n` +
    (p.warrantyText ? `🛡 Bảo hành: ${p.warrantyText}\n` : '') +
    `Nếu cần hỗ trợ, chọn 💬 Hỗ trợ hoặc tạo yêu cầu ở 🛡 Bảo hành.`,

  WALLET_PLACEHOLDER: '💰 Ví sẽ được bổ sung sau.',

  LANGUAGE_NOTICE: '🌐 Tiếng Việt hiện đang được hỗ trợ.',

  NO_ORDERS: '📦 Bạn chưa có đơn hàng nào.',

  SUPPORT: (contact: string = '@percy004') =>
    `📞 Hỗ trợ nhanh:\n\n✈️ Telegram: ${contact}\n\nLiên hệ để được trợ giúp và xử lý sự cố nhanh nhất.`,

  ORDER_EXPIRED_NOTICE: '❌ Đơn hàng này đã hết hạn thanh toán.',

  OUT_OF_STOCK: '❌ Sản phẩm vừa hết hàng. Vui lòng chọn sản phẩm khác.',

  SYSTEM_ERROR: '❌ Hệ thống đang bận, vui lòng thử lại sau ít phút.',
} as const;

/**
 * Escape special characters for Telegram MarkdownV2.
 */
export function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, '\\$&');
}

/**
 * Parse Telegram callback data.
 * Returns { action, params } or null if invalid.
 */
export function parseCallbackData(
  data: string
): { action: string; params: string[] } | null {
  if (!data || typeof data !== 'string') return null;
  const parts = data.split(':');
  if (parts.length < 1) return null;

  // Reconstruct action prefix based on known formats
  if (parts[0] === 'menu') {
    return { action: 'menu', params: parts.slice(1) };
  }
  if (parts[0] === 'cat') {
    return { action: 'category', params: parts.slice(1) };
  }
  if (parts[0] === 'page') {
    return { action: 'page', params: parts.slice(1) };
  }
  if (parts[0] === 'product') {
    return { action: 'product', params: parts.slice(1) };
  }
  if (parts[0] === 'qty') {
    return { action: 'qty', params: parts.slice(1) };
  }
  if (parts[0] === 'checkout') {
    return { action: 'checkout', params: parts.slice(1) };
  }
  if (parts[0] === 'orders') {
    return { action: 'orders', params: parts.slice(1) };
  }
  if (parts[0] === 'order') {
    return { action: 'order', params: parts.slice(1) };
  }
  if (parts[0] === 'warranty') {
    return { action: 'warranty', params: parts.slice(1) };
  }

  return null;
}
