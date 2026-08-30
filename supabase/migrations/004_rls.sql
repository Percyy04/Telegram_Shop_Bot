-- ================================================
-- 004_rls.sql — Row Level Security policies
-- ================================================
-- MVP approach: all access goes through server-side route handlers
-- using the service role key. RLS is enabled to prevent accidental
-- direct client access.

-- Enable RLS on all tables
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

-- Public read access for categories and products (catalog)
CREATE POLICY "Public can view active categories"
  ON public.categories FOR SELECT
  USING (is_active = true);

CREATE POLICY "Public can view active products"
  ON public.products FOR SELECT
  USING (is_active = true);

-- Service role (used by server-side code) bypasses RLS automatically.
-- No additional policies needed for admin operations since we use
-- the service role key exclusively in route handlers.
