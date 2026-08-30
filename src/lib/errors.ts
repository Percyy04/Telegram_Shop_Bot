/**
 * Typed application errors.
 * Customer-facing messages in Vietnamese.
 * Never expose stack traces, SQL, env vars, or secrets.
 */

export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly customerMessage: string,
    public readonly statusCode: number = 400,
    public readonly details?: Record<string, unknown>
  ) {
    super(`[${code}] ${customerMessage}`);
    this.name = 'AppError';
  }
}

// --- Stock & Product Errors ---

export const ProductNotFoundError = () =>
  new AppError(
    'PRODUCT_NOT_FOUND',
    '❌ Sản phẩm không tồn tại hoặc đã bị xóa.',
    404
  );

export const ProductInactiveError = () =>
  new AppError(
    'PRODUCT_INACTIVE',
    '❌ Sản phẩm hiện không có sẵn.',
    400
  );

export const OutOfStockError = () =>
  new AppError(
    'OUT_OF_STOCK',
    '❌ Sản phẩm vừa hết hàng. Vui lòng chọn sản phẩm khác.',
    400
  );

export const InsufficientStockError = (available: number) =>
  new AppError(
    'INSUFFICIENT_STOCK',
    `❌ Không đủ hàng. Chỉ còn ${available} sản phẩm.`,
    400,
    { available }
  );

export const InvalidQuantityError = (min: number, max: number) =>
  new AppError(
    'INVALID_QUANTITY',
    `❌ Số lượng phải từ ${min} đến ${max}.`,
    400,
    { min, max }
  );

// --- Order Errors ---

export const OrderNotFoundError = () =>
  new AppError(
    'ORDER_NOT_FOUND',
    '❌ Đơn hàng không tồn tại.',
    404
  );

export const OrderExpiredError = () =>
  new AppError(
    'ORDER_EXPIRED',
    '❌ Đơn hàng này đã hết hạn thanh toán.',
    400
  );

export const OrderAlreadyProcessedError = () =>
  new AppError(
    'ORDER_ALREADY_PROCESSED',
    '❌ Đơn hàng đã được xử lý trước đó.',
    400
  );

export const OrderNotPayableError = () =>
  new AppError(
    'ORDER_NOT_PAYABLE',
    '❌ Đơn hàng không ở trạng thái chờ thanh toán.',
    400
  );

// --- Payment Errors ---

export const PaymentAmountMismatchError = () =>
  new AppError(
    'PAYMENT_AMOUNT_MISMATCH',
    '❌ Số tiền chuyển khoản không khớp với đơn hàng.',
    400
  );

export const DuplicateTransactionError = () =>
  new AppError(
    'DUPLICATE_TRANSACTION',
    '❌ Giao dịch này đã được xử lý.',
    400
  );

// --- Auth Errors ---

export const UnauthorizedError = () =>
  new AppError(
    'UNAUTHORIZED',
    '❌ Bạn không có quyền thực hiện hành động này.',
    401
  );

export const ForbiddenError = () =>
  new AppError(
    'FORBIDDEN',
    '❌ Truy cập bị từ chối.',
    403
  );

// --- Generic Errors ---

export const SystemBusyError = () =>
  new AppError(
    'SYSTEM_BUSY',
    '❌ Hệ thống đang bận, vui lòng thử lại sau ít phút.',
    503
  );

export const ValidationError = (details: string) =>
  new AppError(
    'VALIDATION_ERROR',
    `❌ Dữ liệu không hợp lệ: ${details}`,
    400
  );
