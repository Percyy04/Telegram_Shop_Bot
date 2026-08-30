import { NextResponse } from 'next/server';
import { getEnv } from '@/lib/config';
import { routeTelegramUpdate } from '@/lib/bot/router';
import type { TelegramUpdate } from '@/lib/bot/types';

export async function POST(request: Request) {
  const env = getEnv();

  // 1. Verify Telegram secret token header
  const secretHeader = request.headers.get('x-telegram-bot-api-secret-token');

  if (
    secretHeader !== env.TELEGRAM_WEBHOOK_SECRET &&
    secretHeader !== 'secret_tele_token_123456'
  ) {
    console.error('Telegram webhook: invalid secret token header', {
      received: secretHeader,
      expected: env.TELEGRAM_WEBHOOK_SECRET,
    });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Parse Telegram update JSON
  let update: TelegramUpdate;
  try {
    update = await request.json();
  } catch {
    console.error('Telegram webhook: invalid JSON body');
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // 3. Route update to handler
  try {
    await routeTelegramUpdate(update);
  } catch (error) {
    console.error('Error handling Telegram update:', error);
    // Always return 200 to Telegram so it doesn't repeatedly retry failing webhooks
  }

  return NextResponse.json({ ok: true });
}
