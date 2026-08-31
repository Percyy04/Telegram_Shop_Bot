/**
 * GET /api/cron/release-expired-orders
 *
 * Cron cleanup: expire unpaid orders and release reserved stock.
 * Protected by CRON_SECRET Bearer token.
 *
 * Linux crontab: every 5 minutes
 */

import { NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase/admin';
import { getEnv } from '@/lib/config';
import { sendMessage } from '@/lib/telegram';

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
    .select('id, code, telegram_user_id')
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

  // 3. Notify users on Telegram about expired orders
  if (expiredOrders && expiredOrders.length > 0) {
    for (const ord of expiredOrders) {
      if (ord.telegram_user_id) {
        try {
          await sendMessage({
            chat_id: ord.telegram_user_id,
            text: `⏰ Đơn hàng ${ord.code} đã quá 10 phút chưa nhận được thanh toán chuyển khoản nên đã tự động HỦY và hoàn trả sản phẩm về kho.\n\nNếu bạn vẫn muốn mua, vui lòng thực hiện tạo đơn mới nhé!`,
          });
        } catch (msgErr) {
          console.error(`Failed to send expiration notification to Telegram user ${ord.telegram_user_id}:`, msgErr);
        }
      }
    }
  }

  return NextResponse.json({
    success: true,
    expired_orders: result?.expired_orders ?? (expiredOrders?.length || 0),
    released_stock_units: result?.released_stock_units ?? 0,
    timestamp: new Date().toISOString(),
  });
}
