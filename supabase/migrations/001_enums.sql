-- ================================================
-- 001_enums.sql — Custom PostgreSQL enum types
-- ================================================

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
