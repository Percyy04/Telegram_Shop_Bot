-- ================================================
-- 003_indexes.sql — Performance indexes
-- ================================================

-- Products
CREATE INDEX idx_products_category_active ON public.products(category_id, is_active);

-- Stock
CREATE INDEX idx_stock_available ON public.stock_units(product_id, status, created_at);
CREATE INDEX idx_stock_reserved_order ON public.stock_units(reserved_order_id);

-- Orders
CREATE INDEX idx_orders_customer_created ON public.orders(telegram_user_id, created_at DESC);
CREATE INDEX idx_orders_status_expiry ON public.orders(status, expires_at);

-- Order items
CREATE INDEX idx_order_items_order ON public.order_items(order_id);

-- Payments
CREATE UNIQUE INDEX idx_payments_webhook_txn
  ON public.payments(webhook_transaction_id)
  WHERE webhook_transaction_id IS NOT NULL;

-- Payment events
CREATE INDEX idx_payment_events_reference ON public.payment_events(payment_reference);
CREATE INDEX idx_payment_events_status ON public.payment_events(processing_status, created_at DESC);

-- Delivery attempts
CREATE INDEX idx_delivery_attempts_status ON public.delivery_attempts(status, created_at);

-- Warranty requests
CREATE INDEX idx_warranty_customer ON public.warranty_requests(telegram_user_id, created_at DESC);

-- Audit logs
CREATE INDEX idx_audit_entity ON public.audit_logs(entity_type, entity_id, created_at DESC);
