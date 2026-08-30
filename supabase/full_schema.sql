-- ================================================
-- Telegram Shop Bot — Full Database Schema & RPCs
-- Paste this entire script into Supabase SQL Editor
-- ================================================

-- -----------------------------------------------
-- 0. CLEANUP (Safely re-runnable)
-- -----------------------------------------------
DROP FUNCTION IF EXISTS public.create_order_and_reserve_stock CASCADE;
DROP FUNCTION IF EXISTS public.record_sepay_transaction CASCADE;
DROP FUNCTION IF EXISTS public.confirm_payment_manual CASCADE;
DROP FUNCTION IF EXISTS public.claim_delivery_attempt CASCADE;
DROP FUNCTION IF EXISTS public.mark_order_delivered CASCADE;
DROP FUNCTION IF EXISTS public.mark_delivery_failed CASCADE;
DROP FUNCTION IF EXISTS public.mark_delivery_uncertain CASCADE;
DROP FUNCTION IF EXISTS public.release_expired_orders CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column CASCADE;

DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.warranty_requests CASCADE;
DROP TABLE IF EXISTS public.delivery_attempts CASCADE;
DROP TABLE IF EXISTS public.payment_events CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.stock_units CASCADE;
DROP TABLE IF EXISTS public.order_items CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;
DROP TABLE IF EXISTS public.admin_users CASCADE;

DROP TYPE IF EXISTS public.order_status CASCADE;
DROP TYPE IF EXISTS public.stock_status CASCADE;
DROP TYPE IF EXISTS public.delivery_status CASCADE;
DROP TYPE IF EXISTS public.warranty_status CASCADE;

-- -----------------------------------------------
-- 1. ENUMS
-- -----------------------------------------------
CREATE TYPE public.order_status AS ENUM (
  'DRAFT',
  'AWAITING_PAYMENT',
  'PAID',
  'DELIVERY_PENDING',
  'DELIVERED',
  'CANCELLED',
  'EXPIRED',
  'REFUNDED'
);

CREATE TYPE public.stock_status AS ENUM (
  'AVAILABLE',
  'RESERVED',
  'SOLD',
  'DISABLED'
);

CREATE TYPE public.delivery_status AS ENUM (
  'PENDING',
  'SENDING',
  'SENT',
  'UNCERTAIN',
  'FAILED'
);

CREATE TYPE public.warranty_status AS ENUM (
  'OPEN',
  'IN_REVIEW',
  'RESOLVED',
  'REJECTED'
);

-- -----------------------------------------------
-- 2. TABLES (11 Tables)
-- -----------------------------------------------
CREATE TABLE public.admin_users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  emoji text DEFAULT '📦',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES public.categories(id),
  sku text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  sale_price numeric(14, 0) NOT NULL CHECK (sale_price >= 0),
  warranty_text text,
  delivery_note text,
  image_url text,
  min_quantity integer NOT NULL DEFAULT 1 CHECK (min_quantity >= 1),
  max_quantity integer NOT NULL DEFAULT 1 CHECK (max_quantity >= min_quantity),
  low_stock_threshold integer NOT NULL DEFAULT 3 CHECK (low_stock_threshold >= 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  telegram_user_id bigint NOT NULL,
  telegram_username text,
  telegram_first_name text,
  status public.order_status NOT NULL DEFAULT 'DRAFT',
  total_amount numeric(14, 0) NOT NULL CHECK (total_amount >= 0),
  payment_reference text NOT NULL UNIQUE,
  expires_at timestamptz,
  paid_at timestamptz,
  delivery_started_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz,
  cancel_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  product_name_snapshot text NOT NULL,
  unit_price_snapshot numeric(14, 0) NOT NULL CHECK (unit_price_snapshot >= 0),
  quantity integer NOT NULL CHECK (quantity >= 1),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.stock_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  delivery_payload_encrypted text NOT NULL,
  status public.stock_status NOT NULL DEFAULT 'AVAILABLE',
  reserved_order_id uuid REFERENCES public.orders(id) ON DELETE RESTRICT,
  sold_order_id uuid REFERENCES public.orders(id) ON DELETE RESTRICT,
  import_note text,
  imported_by uuid REFERENCES public.admin_users(id) ON DELETE SET NULL,
  reserved_at timestamptz,
  sold_at timestamptz,
  disabled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE RESTRICT,
  method text NOT NULL DEFAULT 'BANK_TRANSFER',
  amount numeric(14, 0) NOT NULL CHECK (amount >= 0),
  transfer_reference text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CONFIRMED')),
  verification_method text CHECK (verification_method IN ('WEBHOOK_SEPAY', 'MANUAL')),
  webhook_transaction_id text,
  transaction_content text,
  transaction_received_at timestamptz,
  amount_received numeric(14, 0),
  confirmed_by uuid REFERENCES public.admin_users(id) ON DELETE SET NULL,
  confirmed_at timestamptz,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'SEPAY',
  provider_transaction_id text NOT NULL,
  payment_reference text,
  transfer_amount numeric(14, 0),
  transfer_type text,
  account_number_masked text,
  transaction_content text,
  gateway text,
  reason text,
  processing_status text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(provider, provider_transaction_id)
);

CREATE TABLE public.delivery_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE RESTRICT,
  status public.delivery_status NOT NULL DEFAULT 'PENDING',
  attempt_count integer NOT NULL DEFAULT 0,
  telegram_chat_id bigint NOT NULL,
  telegram_message_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  last_error text,
  started_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.warranty_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  telegram_user_id bigint NOT NULL,
  status public.warranty_status NOT NULL DEFAULT 'OPEN',
  customer_message text NOT NULL,
  admin_note text,
  customer_response text,
  handled_by uuid REFERENCES public.admin_users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_type text NOT NULL CHECK (actor_type IN ('ADMIN', 'CUSTOMER', 'SYSTEM')),
  actor_admin_id uuid REFERENCES public.admin_users(id) ON DELETE SET NULL,
  actor_telegram_user_id bigint,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------
-- 3. INDEXES
-- -----------------------------------------------
CREATE INDEX idx_products_category_active ON public.products(category_id, is_active);
CREATE INDEX idx_stock_available ON public.stock_units(product_id, status, created_at);
CREATE INDEX idx_stock_reserved_order ON public.stock_units(reserved_order_id);
CREATE INDEX idx_orders_customer_created ON public.orders(telegram_user_id, created_at DESC);
CREATE INDEX idx_orders_status_expiry ON public.orders(status, expires_at);
CREATE INDEX idx_order_items_order ON public.order_items(order_id);
CREATE UNIQUE INDEX idx_payments_webhook_txn ON public.payments(webhook_transaction_id) WHERE webhook_transaction_id IS NOT NULL;
CREATE INDEX idx_payment_events_reference ON public.payment_events(payment_reference);
CREATE INDEX idx_payment_events_status ON public.payment_events(processing_status, created_at DESC);
CREATE INDEX idx_delivery_attempts_status ON public.delivery_attempts(status, created_at);
CREATE INDEX idx_warranty_customer ON public.warranty_requests(telegram_user_id, created_at DESC);
CREATE INDEX idx_audit_entity ON public.audit_logs(entity_type, entity_id, created_at DESC);

-- -----------------------------------------------
-- 4. ROW LEVEL SECURITY (RLS)
-- -----------------------------------------------
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warranty_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active categories" ON public.categories FOR SELECT USING (is_active = true);
CREATE POLICY "Public can view active products" ON public.products FOR SELECT USING (is_active = true);

-- -----------------------------------------------
-- 5. TRIGGERS
-- -----------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_stock_units_updated_at BEFORE UPDATE ON public.stock_units FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_delivery_attempts_updated_at BEFORE UPDATE ON public.delivery_attempts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_warranty_requests_updated_at BEFORE UPDATE ON public.warranty_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- -----------------------------------------------
-- 6. STORED PROCEDURES (RPCs)
-- -----------------------------------------------

-- RPC 1: create_order_and_reserve_stock
CREATE OR REPLACE FUNCTION public.create_order_and_reserve_stock(
  p_telegram_user_id bigint,
  p_telegram_username text,
  p_telegram_first_name text,
  p_product_id uuid,
  p_quantity integer,
  p_order_code text,
  p_payment_reference text,
  p_expires_at timestamptz
) RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_product record;
  v_order_id uuid;
  v_total_amount numeric(14, 0);
  v_reserved_ids uuid[];
  v_reserved_count integer;
BEGIN
  SELECT * INTO v_product
    FROM public.products
    WHERE id = p_product_id
    FOR UPDATE;

  IF v_product IS NULL THEN
    RETURN jsonb_build_object('status', 'PRODUCT_NOT_FOUND');
  END IF;

  IF NOT v_product.is_active THEN
    RETURN jsonb_build_object('status', 'PRODUCT_INACTIVE');
  END IF;

  IF p_quantity < v_product.min_quantity OR p_quantity > v_product.max_quantity THEN
    RETURN jsonb_build_object(
      'status', 'INVALID_QUANTITY',
      'min', v_product.min_quantity,
      'max', v_product.max_quantity
    );
  END IF;

  SELECT array_agg(id) INTO v_reserved_ids
    FROM (
      SELECT id FROM public.stock_units
        WHERE product_id = p_product_id
          AND status = 'AVAILABLE'
        ORDER BY created_at ASC
        FOR UPDATE SKIP LOCKED
        LIMIT p_quantity
    ) sub;

  v_reserved_count := COALESCE(array_length(v_reserved_ids, 1), 0);

  IF v_reserved_count < p_quantity THEN
    RETURN jsonb_build_object(
      'status', 'INSUFFICIENT_STOCK',
      'available', v_reserved_count,
      'requested', p_quantity
    );
  END IF;

  v_total_amount := v_product.sale_price * p_quantity;

  INSERT INTO public.orders (
    code, telegram_user_id, telegram_username, telegram_first_name,
    status, total_amount, payment_reference, expires_at
  ) VALUES (
    p_order_code, p_telegram_user_id, p_telegram_username, p_telegram_first_name,
    'AWAITING_PAYMENT', v_total_amount, p_payment_reference, p_expires_at
  ) RETURNING id INTO v_order_id;

  INSERT INTO public.order_items (
    order_id, product_id, product_name_snapshot, unit_price_snapshot, quantity
  ) VALUES (
    v_order_id, p_product_id, v_product.name, v_product.sale_price, p_quantity
  );

  UPDATE public.stock_units
    SET status = 'RESERVED',
        reserved_order_id = v_order_id,
        reserved_at = now(),
        updated_at = now()
    WHERE id = ANY(v_reserved_ids);

  INSERT INTO public.payments (
    order_id, amount, transfer_reference, status
  ) VALUES (
    v_order_id, v_total_amount, p_payment_reference, 'PENDING'
  );

  INSERT INTO public.audit_logs (
    actor_type, actor_telegram_user_id, action, entity_type, entity_id, metadata
  ) VALUES (
    'CUSTOMER', p_telegram_user_id, 'CREATE_ORDER', 'ORDER', v_order_id,
    jsonb_build_object(
      'product_id', p_product_id,
      'quantity', p_quantity,
      'total_amount', v_total_amount,
      'payment_reference', p_payment_reference
    )
  );

  RETURN jsonb_build_object(
    'status', 'SUCCESS',
    'order_id', v_order_id,
    'order_code', p_order_code,
    'payment_reference', p_payment_reference,
    'total_amount', v_total_amount,
    'product_name', v_product.name,
    'quantity', p_quantity,
    'expires_at', p_expires_at
  );
END;
$$;


-- RPC 2: record_sepay_transaction
CREATE OR REPLACE FUNCTION public.record_sepay_transaction(
  p_provider_transaction_id text,
  p_payment_reference text,
  p_transfer_amount numeric,
  p_transaction_content text,
  p_transfer_type text,
  p_gateway text,
  p_account_number text
) RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_order record;
  v_masked_account text;
BEGIN
  v_masked_account := CASE
    WHEN length(p_account_number) > 4 THEN
      repeat('*', length(p_account_number) - 4) || right(p_account_number, 4)
    ELSE p_account_number
  END;

  BEGIN
    INSERT INTO public.payment_events (
      provider, provider_transaction_id, payment_reference,
      transfer_amount, transfer_type, account_number_masked,
      transaction_content, gateway, processing_status
    ) VALUES (
      'SEPAY', p_provider_transaction_id, p_payment_reference,
      p_transfer_amount, p_transfer_type, v_masked_account,
      p_transaction_content, p_gateway, 'RECEIVED'
    );
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('status', 'DUPLICATE_TRANSACTION');
  END;

  IF p_payment_reference IS NULL OR p_payment_reference = '' THEN
    UPDATE public.payment_events
      SET processing_status = 'NO_PAYMENT_REFERENCE'
      WHERE provider = 'SEPAY' AND provider_transaction_id = p_provider_transaction_id;
    RETURN jsonb_build_object('status', 'NO_PAYMENT_REFERENCE');
  END IF;

  SELECT * INTO v_order
    FROM public.orders
    WHERE payment_reference = p_payment_reference
    FOR UPDATE;

  IF v_order IS NULL THEN
    UPDATE public.payment_events
      SET processing_status = 'NO_MATCHING_ORDER'
      WHERE provider = 'SEPAY' AND provider_transaction_id = p_provider_transaction_id;
    RETURN jsonb_build_object('status', 'NO_MATCHING_ORDER');
  END IF;

  IF v_order.status NOT IN ('AWAITING_PAYMENT') THEN
    IF v_order.status = 'DELIVERED' THEN
      UPDATE public.payment_events
        SET processing_status = 'ORDER_NOT_PAYABLE',
            reason = 'ALREADY_DELIVERED'
        WHERE provider = 'SEPAY' AND provider_transaction_id = p_provider_transaction_id;
      RETURN jsonb_build_object('status', 'ALREADY_DELIVERED', 'order_id', v_order.id);
    END IF;

    UPDATE public.payment_events
      SET processing_status = 'ORDER_NOT_PAYABLE',
          reason = v_order.status::text
      WHERE provider = 'SEPAY' AND provider_transaction_id = p_provider_transaction_id;
    RETURN jsonb_build_object('status', 'ORDER_NOT_PAYABLE', 'order_id', v_order.id);
  END IF;

  IF v_order.expires_at IS NOT NULL AND v_order.expires_at < now() THEN
    UPDATE public.payment_events
      SET processing_status = 'ORDER_EXPIRED'
      WHERE provider = 'SEPAY' AND provider_transaction_id = p_provider_transaction_id;
    RETURN jsonb_build_object('status', 'ORDER_EXPIRED', 'order_id', v_order.id);
  END IF;

  IF p_transfer_amount != v_order.total_amount THEN
    UPDATE public.payment_events
      SET processing_status = 'AMOUNT_MISMATCH',
          reason = format('expected=%s received=%s', v_order.total_amount, p_transfer_amount)
      WHERE provider = 'SEPAY' AND provider_transaction_id = p_provider_transaction_id;
    RETURN jsonb_build_object(
      'status', 'AMOUNT_MISMATCH',
      'expected', v_order.total_amount,
      'received', p_transfer_amount
    );
  END IF;

  UPDATE public.payments
    SET status = 'CONFIRMED',
        verification_method = 'WEBHOOK_SEPAY',
        webhook_transaction_id = p_provider_transaction_id,
        transaction_content = p_transaction_content,
        transaction_received_at = now(),
        amount_received = p_transfer_amount,
        confirmed_at = now(),
        updated_at = now()
    WHERE order_id = v_order.id;

  UPDATE public.orders
    SET status = 'DELIVERY_PENDING',
        paid_at = now(),
        delivery_started_at = now(),
        updated_at = now()
    WHERE id = v_order.id;

  INSERT INTO public.delivery_attempts (
    order_id, status, telegram_chat_id
  ) VALUES (
    v_order.id, 'PENDING', v_order.telegram_user_id
  );

  UPDATE public.payment_events
    SET processing_status = 'CONFIRMED'
    WHERE provider = 'SEPAY' AND provider_transaction_id = p_provider_transaction_id;

  INSERT INTO public.audit_logs (
    actor_type, action, entity_type, entity_id, metadata
  ) VALUES (
    'SYSTEM', 'AUTO_CONFIRM_PAYMENT', 'ORDER', v_order.id,
    jsonb_build_object(
      'verification_method', 'WEBHOOK_SEPAY',
      'amount_received', p_transfer_amount,
      'webhook_txn_id', p_provider_transaction_id
    )
  );

  RETURN jsonb_build_object(
    'status', 'READY_FOR_DELIVERY',
    'order_id', v_order.id,
    'order_code', v_order.code
  );
END;
$$;


-- RPC 3: confirm_payment_manual
CREATE OR REPLACE FUNCTION public.confirm_payment_manual(
  p_order_id uuid,
  p_admin_id uuid,
  p_note text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_order record;
BEGIN
  SELECT * INTO v_order
    FROM public.orders
    WHERE id = p_order_id
    FOR UPDATE;

  IF v_order IS NULL THEN
    RETURN jsonb_build_object('status', 'ORDER_NOT_FOUND');
  END IF;

  IF v_order.status != 'AWAITING_PAYMENT' THEN
    RETURN jsonb_build_object('status', 'ORDER_NOT_PAYABLE', 'current_status', v_order.status);
  END IF;

  UPDATE public.payments
    SET status = 'CONFIRMED',
        verification_method = 'MANUAL',
        confirmed_by = p_admin_id,
        confirmed_at = now(),
        note = p_note,
        updated_at = now()
    WHERE order_id = p_order_id;

  UPDATE public.orders
    SET status = 'DELIVERY_PENDING',
        paid_at = now(),
        delivery_started_at = now(),
        updated_at = now()
    WHERE id = p_order_id;

  INSERT INTO public.delivery_attempts (
    order_id, status, telegram_chat_id
  ) VALUES (
    p_order_id, 'PENDING', v_order.telegram_user_id
  );

  INSERT INTO public.audit_logs (
    actor_type, actor_admin_id, action, entity_type, entity_id, metadata
  ) VALUES (
    'ADMIN', p_admin_id, 'MANUAL_CONFIRM_PAYMENT', 'ORDER', p_order_id,
    jsonb_build_object('note', COALESCE(p_note, ''))
  );

  RETURN jsonb_build_object(
    'status', 'CONFIRMED',
    'order_id', p_order_id,
    'order_code', v_order.code
  );
END;
$$;


-- RPC 4: claim_delivery_attempt
CREATE OR REPLACE FUNCTION public.claim_delivery_attempt(
  p_order_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_attempt record;
  v_stock_ids uuid[];
BEGIN
  SELECT * INTO v_attempt
    FROM public.delivery_attempts
    WHERE order_id = p_order_id
      AND status IN ('PENDING', 'FAILED')
    FOR UPDATE;

  IF v_attempt IS NULL THEN
    RETURN jsonb_build_object('status', 'NOT_CLAIMABLE');
  END IF;

  UPDATE public.delivery_attempts
    SET status = 'SENDING',
        attempt_count = attempt_count + 1,
        started_at = now(),
        last_error = NULL,
        updated_at = now()
    WHERE id = v_attempt.id;

  SELECT array_agg(id) INTO v_stock_ids
    FROM public.stock_units
    WHERE reserved_order_id = p_order_id
      AND status = 'RESERVED';

  RETURN jsonb_build_object(
    'status', 'CLAIMED',
    'attempt_id', v_attempt.id,
    'telegram_chat_id', v_attempt.telegram_chat_id,
    'stock_unit_ids', to_jsonb(v_stock_ids),
    'attempt_count', v_attempt.attempt_count + 1
  );
END;
$$;


-- RPC 5: mark_order_delivered
CREATE OR REPLACE FUNCTION public.mark_order_delivered(
  p_order_id uuid,
  p_attempt_id uuid,
  p_message_ids jsonb
) RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_order record;
BEGIN
  SELECT * INTO v_order
    FROM public.orders
    WHERE id = p_order_id
    FOR UPDATE;

  IF v_order IS NULL THEN
    RETURN jsonb_build_object('status', 'ORDER_NOT_FOUND');
  END IF;

  IF v_order.status != 'DELIVERY_PENDING' THEN
    RETURN jsonb_build_object('status', 'INVALID_STATUS', 'current', v_order.status);
  END IF;

  UPDATE public.stock_units
    SET status = 'SOLD',
        sold_order_id = p_order_id,
        sold_at = now(),
        updated_at = now()
    WHERE reserved_order_id = p_order_id
      AND status = 'RESERVED';

  UPDATE public.orders
    SET status = 'DELIVERED',
        delivered_at = now(),
        updated_at = now()
    WHERE id = p_order_id;

  UPDATE public.delivery_attempts
    SET status = 'SENT',
        telegram_message_ids = p_message_ids,
        sent_at = now(),
        updated_at = now()
    WHERE id = p_attempt_id;

  INSERT INTO public.audit_logs (
    actor_type, action, entity_type, entity_id, metadata
  ) VALUES (
    'SYSTEM', 'ORDER_DELIVERED', 'ORDER', p_order_id,
    jsonb_build_object('attempt_id', p_attempt_id)
  );

  RETURN jsonb_build_object('status', 'DELIVERED', 'order_id', p_order_id);
END;
$$;


-- RPC 6: mark_delivery_failed
CREATE OR REPLACE FUNCTION public.mark_delivery_failed(
  p_attempt_id uuid,
  p_error text
) RETURNS jsonb
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.delivery_attempts
    SET status = 'FAILED',
        last_error = p_error,
        updated_at = now()
    WHERE id = p_attempt_id
      AND status = 'SENDING';

  RETURN jsonb_build_object('status', 'FAILED');
END;
$$;


-- RPC 7: mark_delivery_uncertain
CREATE OR REPLACE FUNCTION public.mark_delivery_uncertain(
  p_attempt_id uuid,
  p_error text
) RETURNS jsonb
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.delivery_attempts
    SET status = 'UNCERTAIN',
        last_error = p_error,
        updated_at = now()
    WHERE id = p_attempt_id
      AND status = 'SENDING';

  RETURN jsonb_build_object('status', 'UNCERTAIN');
END;
$$;


-- RPC 8: release_expired_orders
CREATE OR REPLACE FUNCTION public.release_expired_orders()
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_expired_count integer := 0;
  v_released_stock integer := 0;
  v_order record;
BEGIN
  FOR v_order IN
    SELECT id, code FROM public.orders
      WHERE status = 'AWAITING_PAYMENT'
        AND expires_at IS NOT NULL
        AND expires_at < now()
      FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE public.orders
      SET status = 'EXPIRED',
          cancelled_at = now(),
          cancel_reason = 'PAYMENT_EXPIRED',
          updated_at = now()
      WHERE id = v_order.id;

    UPDATE public.stock_units
      SET status = 'AVAILABLE',
          reserved_order_id = NULL,
          reserved_at = NULL,
          updated_at = now()
      WHERE reserved_order_id = v_order.id
        AND status = 'RESERVED';

    v_released_stock := v_released_stock + (
      SELECT count(*) FROM public.stock_units
        WHERE reserved_order_id IS NULL
          AND sold_order_id IS NULL
          AND status = 'AVAILABLE'
          AND updated_at >= now() - interval '1 second'
    );

    INSERT INTO public.audit_logs (
      actor_type, action, entity_type, entity_id, metadata
    ) VALUES (
      'SYSTEM', 'ORDER_EXPIRED', 'ORDER', v_order.id,
      jsonb_build_object('order_code', v_order.code)
    );

    v_expired_count := v_expired_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'expired_orders', v_expired_count,
    'released_stock_units', v_released_stock
  );
END;
$$;
