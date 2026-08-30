/**
 * GET /api/cron/process-pending-deliveries
 *
 * Delivery worker cron: processes pending delivery attempts.
 * Protected by CRON_SECRET Bearer token.
 *
 * Linux crontab: every minute
 */

import { NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase/admin';
import { getEnv } from '@/lib/config';
import { attemptDelivery } from '@/lib/delivery';

const BATCH_SIZE = 5;

export async function GET(request: Request) {
  const env = getEnv();

  // Validate cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getAdminSupabase();

  // Fetch pending delivery attempts (bounded batch)
  const { data: pendingAttempts, error } = await supabase
    .from('delivery_attempts')
    .select('order_id')
    .in('status', ['PENDING', 'FAILED'])
    .order('created_at', { ascending: true })
    .limit(BATCH_SIZE);

  if (error) {
    console.error('Failed to fetch pending deliveries:', error);
    return NextResponse.json({ error: 'Query failed' }, { status: 500 });
  }

  if (!pendingAttempts || pendingAttempts.length === 0) {
    return NextResponse.json({
      success: true,
      processed: 0,
      timestamp: new Date().toISOString(),
    });
  }

  // Process each delivery attempt
  const results = await Promise.allSettled(
    pendingAttempts.map((attempt) => attemptDelivery(attempt.order_id))
  );

  const processed = results.filter(
    (r) => r.status === 'fulfilled' && r.value.success
  ).length;

  const failed = results.filter(
    (r) =>
      r.status === 'rejected' ||
      (r.status === 'fulfilled' && !r.value.success)
  ).length;

  return NextResponse.json({
    success: true,
    processed,
    failed,
    total: pendingAttempts.length,
    timestamp: new Date().toISOString(),
  });
}
