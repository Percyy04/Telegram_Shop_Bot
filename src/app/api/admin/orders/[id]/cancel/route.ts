import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getAdminSupabase } from '@/lib/supabase/admin';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  const { id: orderId } = await params;

  const supabase = getAdminSupabase();

  // Cancel order & release reserved stock
  const { data: order, error: fetchErr } = await supabase
    .from('orders')
    .select('id, code, status')
    .eq('id', orderId)
    .single();

  if (fetchErr || !order) {
    return NextResponse.json({ error: 'Đơn hàng không tồn tại.' }, { status: 404 });
  }

  if (order.status !== 'AWAITING_PAYMENT') {
    return NextResponse.json(
      { error: 'Chỉ có thể hủy đơn hàng đang ở trạng thái Chờ thanh toán.' },
      { status: 400 }
    );
  }

  // Update order to CANCELLED
  await supabase
    .from('orders')
    .update({
      status: 'CANCELLED',
      cancelled_at: new Date().toISOString(),
      cancel_reason: 'CANCELLED_BY_ADMIN',
    })
    .eq('id', orderId);

  // Release stock
  await supabase
    .from('stock_units')
    .update({
      status: 'AVAILABLE',
      reserved_order_id: null,
      reserved_at: null,
    })
    .eq('reserved_order_id', orderId)
    .eq('status', 'RESERVED');

  // Audit
  await supabase.from('audit_logs').insert({
    actor_type: 'ADMIN',
    actor_admin_id: admin.id,
    action: 'CANCEL_ORDER',
    entity_type: 'ORDER',
    entity_id: orderId,
    metadata: { order_code: order.code },
  });

  return NextResponse.json({ success: true, orderId });
}
