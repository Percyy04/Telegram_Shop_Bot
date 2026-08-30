import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getAdminSupabase } from '@/lib/supabase/admin';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  const { id: orderId } = await params;
  const body = await request.json().catch(() => ({}));

  const supabase = getAdminSupabase();

  // Call confirm_payment_manual RPC
  const { data, error } = await supabase.rpc('confirm_payment_manual', {
    p_order_id: orderId,
    p_admin_id: admin.id,
    p_note: body.note || 'Xác nhận thanh toán thủ công từ Admin Dashboard',
  });

  const result = data as { status?: string } | null;

  if (error || !result || result.status !== 'CONFIRMED') {
    return NextResponse.json(
      { error: result?.status || error?.message || 'Xác nhận thanh toán thất bại.' },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true, orderId });
}
