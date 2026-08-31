import 'dotenv/config';
import { getAdminSupabase } from '../src/lib/supabase/admin';
import { attemptDelivery } from '../src/lib/delivery';

async function main() {
  const supabase = getAdminSupabase();
  const orderId = '40bcefea-c6a6-4063-a253-383cb82aa934'; // TG-CMREUN

  console.log('--- Step 1: Checking current status of order TG-CMREUN ---');
  const { data: orderBefore } = await supabase.from('orders').select('*').eq('id', orderId).single();
  console.log('Order before:', orderBefore?.code, 'Status:', orderBefore?.status);

  if (orderBefore && orderBefore.status === 'AWAITING_PAYMENT') {
    console.log('--- Step 2: Confirming payment manually via RPC ---');
    const { data: confirmRes, error: confirmErr } = await supabase.rpc('confirm_payment_manual', {
      p_order_id: orderId,
      p_admin_id: undefined as unknown as string,
      p_note: 'Manual confirmation for TG-CMREUN (TG-27SPT8)'
    });
    console.log('Confirm RPC result:', confirmRes, confirmErr);
  }

  console.log('--- Step 3: Running attemptDelivery for TG-CMREUN ---');
  const deliveryRes = await attemptDelivery(orderId);
  console.log('Delivery result for TG-CMREUN:', deliveryRes);

  console.log('--- Step 4: Checking all pending delivery attempts in DB ---');
  const { data: pending } = await supabase.from('delivery_attempts').select('order_id').eq('status', 'PENDING');
  console.log('Pending count:', pending?.length || 0);

  if (pending && pending.length > 0) {
    for (const p of pending) {
      console.log('Delivering order:', p.order_id);
      const res = await attemptDelivery(p.order_id);
      console.log('Delivery result:', res);
    }
  }
}

main().catch((err) => console.error('Execution error:', err));
