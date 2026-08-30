import { NextRequest, NextResponse } from 'next/server';
import { sendStockRestockNotification } from '@/lib/stock-notify';
import { getEnv } from '@/lib/config';

/**
 * POST /api/admin/notify-restock
 * Body: { productIdOrSku: string, addedCount: number, channelId?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const env = getEnv();

    // Check authorization header against CRON_SECRET or Webhook secret
    if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { productIdOrSku, addedCount, channelId } = body;

    if (!productIdOrSku || !addedCount) {
      return NextResponse.json(
        { error: 'Missing productIdOrSku or addedCount' },
        { status: 400 }
      );
    }

    const result = await sendStockRestockNotification({
      productIdOrSku,
      addedCount: Number(addedCount),
      targetChatIds: channelId ? [channelId] : undefined,
    });

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
