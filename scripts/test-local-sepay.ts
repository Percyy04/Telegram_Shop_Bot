import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const sepaySecret = process.env.SEPAY_WEBHOOK_SECRET!;
const accountNumber = process.env.VIETQR_ACCOUNT_NUMBER || '00000931600';

const supabase = createClient(supabaseUrl, serviceRoleKey);

import { generatePaymentReference } from '../src/lib/payment-code';

async function runLocalSepayTest() {
  console.log('🧪 Starting End-to-End Local SePay Webhook Test...\n');

  // 1. Ensure category exists
  let { data: category } = await supabase
    .from('categories')
    .select('id')
    .eq('slug', 'test-category')
    .single();

  if (!category) {
    const { data: newCat, error: catErr } = await supabase
      .from('categories')
      .insert({ name: 'Test Category', slug: 'test-category', emoji: '🧪' })
      .select('id')
      .single();
    if (catErr) throw catErr;
    category = newCat;
  }

  // 2. Ensure product exists
  let { data: product } = await supabase
    .from('products')
    .select('id, sale_price')
    .eq('sku', 'SKU-TEST-01')
    .single();

  if (!product) {
    const { data: newProd, error: prodErr } = await supabase
      .from('products')
      .insert({
        category_id: category!.id,
        sku: 'SKU-TEST-01',
        name: 'Tài khoản Test Premium 1 Tháng',
        sale_price: 50000,
        min_quantity: 1,
        max_quantity: 5,
        is_active: true,
      })
      .select('id, sale_price')
      .single();
    if (prodErr) throw prodErr;
    product = newProd;
  }

  // 3. Add 1 encrypted stock unit
  const { data: stockUnit, error: stockErr } = await supabase
    .from('stock_units')
    .insert({
      product_id: product!.id,
      delivery_payload_encrypted: 'U2FsdGVkX1+test_encrypted_payload_data==',
      status: 'AVAILABLE',
    })
    .select('id')
    .single();

  if (stockErr) {
    console.warn('Stock insertion note:', stockErr.message);
  }

  // 4. Create Order via RPC with valid payment reference format
  const testOrderCode = generatePaymentReference();
  const paymentRef = testOrderCode;
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  console.log(`📦 Creating order: ${testOrderCode} (Ref: ${paymentRef}, Amount: 50,000 VND)...`);

  const { data: orderResult, error: rpcErr } = await supabase.rpc(
    'create_order_and_reserve_stock',
    {
      p_telegram_user_id: 8598083273,
      p_telegram_username: 'test_customer',
      p_telegram_first_name: 'Test Customer',
      p_product_id: product!.id,
      p_quantity: 1,
      p_order_code: testOrderCode,
      p_payment_reference: paymentRef,
      p_expires_at: expiresAt,
    }
  );

  if (rpcErr || (orderResult as any)?.status !== 'SUCCESS') {
    console.error('❌ Failed to create order:', rpcErr || orderResult);
    process.exit(1);
  }

  const orderId = (orderResult as any).order_id;
  console.log(`✅ Order created successfully. Order ID: ${orderId}`);
  console.log(`   Initial Order Status: AWAITING_PAYMENT\n`);

  // 5. Simulate SePay webhook POST request to localhost:3000
  const sepayTxnId = String(Math.floor(10000000 + Math.random() * 90000000));
  const webhookBody = JSON.stringify({
    id: sepayTxnId,
    gateway: 'TPBank',
    transactionDate: new Date().toISOString(),
    accountNumber: accountNumber,
    subAccount: null,
    amountIn: 50000,
    amountOut: 0,
    accumulated: 50000,
    code: paymentRef,
    content: `${paymentRef} chuyen khoan mua hang`,
    referenceNumber: `FT${sepayTxnId}`,
    transferType: 'in',
    transferAmount: 50000,
  });

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signingPayload = `${timestamp}.${webhookBody}`;
  const hmac = crypto
    .createHmac('sha256', sepaySecret)
    .update(signingPayload)
    .digest('hex');
  const signatureHeader = `sha256=${hmac}`;

  console.log(`📲 Sending SePay Webhook notification for Txn ID: ${sepayTxnId}...`);

  const response = await fetch('http://localhost:3000/api/webhooks/sepay', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-sepay-signature': signatureHeader,
      'x-sepay-timestamp': timestamp,
    },
    body: webhookBody,
  });

  const responseData = await response.json();
  console.log(`📩 Webhook HTTP Status: ${response.status}`, responseData);

  if (response.status !== 200 || !responseData.success) {
    console.error('❌ Webhook processing failed!');
    process.exit(1);
  }

  // 6. Verify order & payment status in DB
  const { data: updatedOrder } = await supabase
    .from('orders')
    .select('status, paid_at')
    .eq('id', orderId)
    .single();

  const { data: payment } = await supabase
    .from('payments')
    .select('status, verification_method, amount_received')
    .eq('order_id', orderId)
    .single();

  const { data: deliveryAttempt } = await supabase
    .from('delivery_attempts')
    .select('status, attempt_count')
    .eq('order_id', orderId)
    .single();

  console.log('\n================ RESULT VERIFICATION ================');
  console.log(`✨ Order Status:          ${updatedOrder?.status} (Expected: DELIVERY_PENDING)`);
  console.log(`💳 Payment Status:        ${payment?.status} (Verification: ${payment?.verification_method})`);
  console.log(`🚚 Delivery Queue Status: ${deliveryAttempt?.status} (Attempts: ${deliveryAttempt?.attempt_count})`);
  console.log('=====================================================\n');

  if (updatedOrder?.status === 'DELIVERY_PENDING' && payment?.status === 'CONFIRMED') {
    console.log('🎉 LOCAL SEPAY END-TO-END TEST PASSED SUCCESSFULLY 100%! 🎉');
  } else {
    console.error('❌ Status verification failed.');
  }
}

runLocalSepayTest().catch(console.error);
