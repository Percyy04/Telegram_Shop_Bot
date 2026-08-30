import { sendStockRestockNotification } from '../src/lib/stock-notify';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  const args = process.argv.slice(2);
  const skuOrId = args[0] || 'SKU-GEMINI-18M';
  const addedCount = parseInt(args[1] || '10', 10);
  const targetChatId = args[2];

  console.log(`--- Sending Restock Notification ---`);
  console.log(`Target Product: ${skuOrId}`);
  console.log(`Added Count: ${addedCount}`);

  const targetChatIds = targetChatId ? [targetChatId] : undefined;

  const res = await sendStockRestockNotification({
    productIdOrSku: skuOrId,
    addedCount,
    targetChatIds,
  });

  console.log('✅ Notification sent successfully!');
  console.log('Details:', res);
}

main().catch(console.error);
