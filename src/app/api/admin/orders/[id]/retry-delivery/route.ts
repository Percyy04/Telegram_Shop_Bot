import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { attemptDelivery } from '@/lib/delivery';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireAdmin();
  const { id: orderId } = await params;

  // Trigger attemptDelivery
  const result = await attemptDelivery(orderId);

  if (!result.success) {
    return NextResponse.json(
      { error: result.error || `Thử lại giao hàng thất bại (trạng thái: ${result.status}).` },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true, orderId });
}
