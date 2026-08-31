/**
 * GET /api/cron/release-expired-orders
 *
 * Cron cleanup: expire unpaid orders and release reserved stock.
 * Protected by CRON_SECRET Bearer token.
 */

import { NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase/admin';
import { getEnv } from '@/lib/config';

export async function GET(request: Request) {
  const env = getEnv();

  // Validate cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getAdminSupabase();

  // 1. Fetch pending orders that have exceeded the 10-minute expiration window
  const { data: expiredOrders } = await supabase
    .from('orders')
    .select('id')
    .eq('status', 'AWAITING_PAYMENT')
    .lt('expires_at', new Date().toISOString());

  // 2. Execute atomic stock release & status update in Supabase
  const { data, error } = await supabase.rpc('release_expired_orders');

  const result = data as {
    expired_orders?: number;
    released_stock_units?: number;
  } | null;

  if (error) {
    console.error('release_expired_orders failed:', error);
    return NextResponse.json(
      { error: 'RPC failed' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    expired_orders: result?.expired_orders ?? (expiredOrders?.length || 0),
    released_stock_units: result?.released_stock_units ?? 0,
    timestamp: new Date().toISOString(),
  });
}
