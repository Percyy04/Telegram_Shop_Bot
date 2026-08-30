/**
 * POST /api/webhooks/sepay
 *
 * SePay webhook handler for automatic payment confirmation.
 * Follows the mandatory sequence from the spec.
 */

import { NextResponse } from 'next/server';
import { verifySepaySignature } from '@/lib/webhook-verify';
import { matchPaymentReference, isExpectedAccount } from '@/lib/payment-matcher';
import type { SepayTransaction } from '@/lib/payment-matcher';
import { getAdminSupabase } from '@/lib/supabase/admin';
import { getEnv } from '@/lib/config';
import { notifyAmountMismatch, notifyUnmatchedPayment } from '@/lib/admin-notify';

export async function POST(request: Request) {
  const env = getEnv();

  // 1. Read raw body BEFORE parsing
  const rawBody = await request.text();

  // 2. Verify HMAC signature + timestamp
  const isValid = verifySepaySignature({
    rawBody,
    signature: request.headers.get('x-sepay-signature'),
    timestamp: request.headers.get('x-sepay-timestamp'),
    secret: env.SEPAY_WEBHOOK_SECRET,
    maxAgeSeconds: 300,
  });

  if (!isValid) {
    console.error('SePay webhook: invalid signature');
    return NextResponse.json({ success: false }, { status: 401 });
  }

  // 3. Parse JSON only after signature passes
  let transaction: SepayTransaction;
  try {
    transaction = JSON.parse(rawBody);
  } catch {
    console.error('SePay webhook: invalid JSON body');
    return NextResponse.json({ success: false }, { status: 400 });
  }

  // 4. Ignore outgoing transactions
  if (transaction.transferType !== 'in') {
    return NextResponse.json({ success: true });
  }

  // 5. Validate receiver account number
  if (!isExpectedAccount(transaction.accountNumber, env.SEPAY_EXPECTED_ACCOUNT_NUMBER)) {
    console.warn('SePay webhook: account number mismatch', {
      received: transaction.accountNumber,
    });
    return NextResponse.json({ success: true });
  }

  // 6. Extract strict payment reference
  const paymentReference = matchPaymentReference(transaction);

  // 7. Call RPC to dedupe and validate
  const supabase = getAdminSupabase();
  const { data, error } = await supabase.rpc('record_sepay_transaction', {
    p_provider_transaction_id: String(transaction.id),
    p_payment_reference: paymentReference,
    p_transfer_amount: transaction.transferAmount,
    p_transaction_content: transaction.content ?? '',
    p_transfer_type: transaction.transferType,
    p_gateway: transaction.gateway ?? null,
    p_account_number: transaction.accountNumber,
  });

  if (error) {
    console.error('SePay RPC failed:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }

  // 8. Handle result — send admin notifications for non-success states
  const result = data as {
    status?: string;
    expected?: number;
    received?: number;
  } | null;

  const status = result?.status;

  if (status === 'AMOUNT_MISMATCH' && paymentReference) {
    await notifyAmountMismatch(
      paymentReference,
      Number(result?.expected || 0),
      Number(result?.received || 0)
    );
  } else if (status === 'NO_PAYMENT_REFERENCE' || status === 'NO_MATCHING_ORDER') {
    await notifyUnmatchedPayment(
      transaction.transferAmount,
      transaction.content ?? ''
    );
  }

  // 9. For READY_FOR_DELIVERY: delivery attempt stays PENDING
  //    The delivery worker cron will pick it up
  //    DO NOT attempt delivery inline — return 200 fast

  // 10. Always return success for validly authenticated webhooks
  return NextResponse.json({ success: true });
}
