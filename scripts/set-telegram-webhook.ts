/**
 * CLI script to set Telegram Webhook URL with secret token.
 * Usage: npx tsx scripts/set-telegram-webhook.ts <WEBHOOK_URL>
 */

import { getEnv } from '../src/lib/config';

async function main() {
  const webhookUrl = process.argv[2];

  if (!webhookUrl) {
    console.error('Usage: npx tsx scripts/set-telegram-webhook.ts <WEBHOOK_URL>');
    console.error('Example: npx tsx scripts/set-telegram-webhook.ts https://shop.example.com/api/telegram/webhook');
    process.exit(1);
  }

  const env = getEnv();
  const token = env.TELEGRAM_BOT_TOKEN;
  const secret = env.TELEGRAM_WEBHOOK_SECRET;

  const url = `https://api.telegram.org/bot${token}/setWebhook`;

  console.log(`Setting Telegram webhook to: ${webhookUrl}`);

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: webhookUrl,
      secret_token: secret,
      allowed_updates: ['message', 'callback_query'],
    }),
  });

  const data = await res.json();
  console.log('Result:', data);

  if (data.ok) {
    console.log('✅ Telegram Webhook configured successfully!');
  } else {
    console.error('❌ Failed to set webhook:', data.description);
  }
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
