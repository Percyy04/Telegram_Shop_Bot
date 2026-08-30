-- ================================================
-- 002_tables.sql — All application tables (11 tables)
-- ================================================

-- Admin users (linked to Supabase Auth)
CREATE TABLE public.admin_users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Product categories
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

-- Products
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

-- Orders
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

-- Order line items (snapshot of product at time of purchase)
CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  product_name_snapshot text NOT NULL,
  unit_price_snapshot numeric(14, 0) NOT NULL CHECK (unit_price_snapshot >= 0),
  quantity integer NOT NULL CHECK (quantity >= 1),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Stock units (encrypted delivery payloads)
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

-- Payments (one per order, valid payment records only)
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

-- Payment events (ALL webhook transactions for dedup and audit)
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

-- Delivery attempts (state machine for safe delivery)
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

-- Warranty requests
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

-- Audit logs
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
