-- ================================================
-- 005_rpcs.sql — Database RPC functions
-- ================================================

-- -----------------------------------------------
-- RPC 1: create_order_and_reserve_stock
-- Atomic: validate product → reserve stock → create order
-- -----------------------------------------------
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
  -- 1. Lock and validate product
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

  -- 2. Validate quantity
  IF p_quantity < v_product.min_quantity OR p_quantity > v_product.max_quantity THEN
    RETURN jsonb_build_object(
      'status', 'INVALID_QUANTITY',
      'min', v_product.min_quantity,
      'max', v_product.max_quantity
    );
  END IF;

  -- 3. Select exactly N available stock units with row locking
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

  -- 4. Fail if not enough units
  IF v_reserved_count < p_quantity THEN
    RETURN jsonb_build_object(
      'status', 'INSUFFICIENT_STOCK',
      'available', v_reserved_count,
      'requested', p_quantity
    );
  END IF;

  -- 5. Calculate total
  v_total_amount := v_product.sale_price * p_quantity;

  -- 6. Create order
  INSERT INTO public.orders (
    code, telegram_user_id, telegram_username, telegram_first_name,
    status, total_amount, payment_reference, expires_at
  ) VALUES (
    p_order_code, p_telegram_user_id, p_telegram_username, p_telegram_first_name,
    'AWAITING_PAYMENT', v_total_amount, p_payment_reference, p_expires_at
  ) RETURNING id INTO v_order_id;

  -- 7. Create order item with price/name snapshot
  INSERT INTO public.order_items (
    order_id, product_id, product_name_snapshot, unit_price_snapshot, quantity
  ) VALUES (
    v_order_id, p_product_id, v_product.name, v_product.sale_price, p_quantity
  );

  -- 8. Reserve stock units
  UPDATE public.stock_units
    SET status = 'RESERVED',
        reserved_order_id = v_order_id,
        reserved_at = now(),
        updated_at = now()
    WHERE id = ANY(v_reserved_ids);

  -- 9. Create payment record
  INSERT INTO public.payments (
    order_id, amount, transfer_reference, status
  ) VALUES (
    v_order_id, v_total_amount, p_payment_reference, 'PENDING'
  );

  -- 10. Audit log
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

  -- 11. Return summary
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


-- -----------------------------------------------
-- RPC 2: record_sepay_transaction
-- Dedup, validate, and confirm payment from SePay webhook
-- -----------------------------------------------
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
  v_payment record;
  v_masked_account text;
  v_order_id uuid;
BEGIN
  -- Mask account number for storage
  v_masked_account := CASE
    WHEN length(p_account_number) > 4 THEN
      repeat('*', length(p_account_number) - 4) || right(p_account_number, 4)
    ELSE p_account_number
  END;

  -- 1. Dedup: try insert into payment_events
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

  -- 2. Check payment reference
  IF p_payment_reference IS NULL OR p_payment_reference = '' THEN
    UPDATE public.payment_events
      SET processing_status = 'NO_PAYMENT_REFERENCE'
      WHERE provider = 'SEPAY' AND provider_transaction_id = p_provider_transaction_id;
    RETURN jsonb_build_object('status', 'NO_PAYMENT_REFERENCE');
  END IF;

  -- 3. Find matching order
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

  -- 4. Check order status
  IF v_order.status NOT IN ('AWAITING_PAYMENT') THEN
    -- Already delivered or cancelled
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

  -- 5. Check expiry (RPC independently checks, not just cron)
  IF v_order.expires_at IS NOT NULL AND v_order.expires_at < now() THEN
    UPDATE public.payment_events
      SET processing_status = 'ORDER_EXPIRED'
      WHERE provider = 'SEPAY' AND provider_transaction_id = p_provider_transaction_id;
    RETURN jsonb_build_object('status', 'ORDER_EXPIRED', 'order_id', v_order.id);
  END IF;

  -- 6. Exact amount check
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

  -- 7. All checks passed — confirm payment
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

  -- 8. Update order → DELIVERY_PENDING
  UPDATE public.orders
    SET status = 'DELIVERY_PENDING',
        paid_at = now(),
        delivery_started_at = now(),
        updated_at = now()
    WHERE id = v_order.id;

  -- 9. Create delivery attempt
  INSERT INTO public.delivery_attempts (
    order_id, status, telegram_chat_id
  ) VALUES (
    v_order.id, 'PENDING', v_order.telegram_user_id
  );

  -- 10. Update payment event
  UPDATE public.payment_events
    SET processing_status = 'CONFIRMED'
    WHERE provider = 'SEPAY' AND provider_transaction_id = p_provider_transaction_id;

  -- 11. Audit log
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

  -- 12. Return success
  RETURN jsonb_build_object(
    'status', 'READY_FOR_DELIVERY',
    'order_id', v_order.id,
    'order_code', v_order.code
  );
END;
$$;


-- -----------------------------------------------
-- RPC 3: confirm_payment_manual
-- Admin fallback manual payment confirmation
-- -----------------------------------------------
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

  -- Confirm payment
  UPDATE public.payments
    SET status = 'CONFIRMED',
        verification_method = 'MANUAL',
        confirmed_by = p_admin_id,
        confirmed_at = now(),
        note = p_note,
        updated_at = now()
    WHERE order_id = p_order_id;

  -- Update order
  UPDATE public.orders
    SET status = 'DELIVERY_PENDING',
        paid_at = now(),
        delivery_started_at = now(),
        updated_at = now()
    WHERE id = p_order_id;

  -- Create delivery attempt
  INSERT INTO public.delivery_attempts (
    order_id, status, telegram_chat_id
  ) VALUES (
    p_order_id, 'PENDING', v_order.telegram_user_id
  );

  -- Audit
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


-- -----------------------------------------------
-- RPC 4: claim_delivery_attempt
-- Atomically claim a PENDING (or FAILED for retry) delivery attempt
-- -----------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_delivery_attempt(
  p_order_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_attempt record;
  v_stock_ids uuid[];
BEGIN
  -- Lock and find attempt
  SELECT * INTO v_attempt
    FROM public.delivery_attempts
    WHERE order_id = p_order_id
      AND status IN ('PENDING', 'FAILED')
    FOR UPDATE;

  IF v_attempt IS NULL THEN
    RETURN jsonb_build_object('status', 'NOT_CLAIMABLE');
  END IF;

  -- Update to SENDING
  UPDATE public.delivery_attempts
    SET status = 'SENDING',
        attempt_count = attempt_count + 1,
        started_at = now(),
        last_error = NULL,
        updated_at = now()
    WHERE id = v_attempt.id;

  -- Get assigned stock unit IDs (already reserved for this order)
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


-- -----------------------------------------------
-- RPC 5: mark_order_delivered
-- Finalize delivery after successful Telegram send
-- -----------------------------------------------
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
  -- Lock order
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

  -- Mark stock units as SOLD
  UPDATE public.stock_units
    SET status = 'SOLD',
        sold_order_id = p_order_id,
        sold_at = now(),
        updated_at = now()
    WHERE reserved_order_id = p_order_id
      AND status = 'RESERVED';

  -- Mark order DELIVERED
  UPDATE public.orders
    SET status = 'DELIVERED',
        delivered_at = now(),
        updated_at = now()
    WHERE id = p_order_id;

  -- Update delivery attempt
  UPDATE public.delivery_attempts
    SET status = 'SENT',
        telegram_message_ids = p_message_ids,
        sent_at = now(),
        updated_at = now()
    WHERE id = p_attempt_id;

  -- Audit
  INSERT INTO public.audit_logs (
    actor_type, action, entity_type, entity_id, metadata
  ) VALUES (
    'SYSTEM', 'ORDER_DELIVERED', 'ORDER', p_order_id,
    jsonb_build_object('attempt_id', p_attempt_id)
  );

  RETURN jsonb_build_object('status', 'DELIVERED', 'order_id', p_order_id);
END;
$$;


-- -----------------------------------------------
-- RPC 6: mark_delivery_failed
-- Record known delivery failure (admin can retry)
-- -----------------------------------------------
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


-- -----------------------------------------------
-- RPC 7: mark_delivery_uncertain
-- Record timeout/unknown outcome (NO auto retry)
-- -----------------------------------------------
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


-- -----------------------------------------------
-- RPC 8: release_expired_orders
-- Cron cleanup: expire unpaid orders and release stock
-- -----------------------------------------------
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
    -- Mark order expired
    UPDATE public.orders
      SET status = 'EXPIRED',
          cancelled_at = now(),
          cancel_reason = 'PAYMENT_EXPIRED',
          updated_at = now()
      WHERE id = v_order.id;

    -- Release reserved stock
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

    -- Audit
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
