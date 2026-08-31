/**
 * Delivery service — safe delivery state machine.
 *
 * Flow:
 * 1. claim_delivery_attempt RPC → PENDING → SENDING
 * 2. Decrypt assigned stock units
 * 3. Send Telegram message(s)
 * 4. Success → SENT → mark_order_delivered
 * 5. Known error → FAILED (admin retry)
 * 6. Timeout/unknown → UNCERTAIN (NO auto retry)
 */

import { getAdminSupabase } from './supabase/admin';
import { decryptPayload } from './crypto';
import { sendMessage, deleteMessage } from './telegram';
import { getEnv } from './config';
import { MSG } from './constants';
import {
  notifyDeliveryFailed,
  notifyDeliveryUncertain,
} from './admin-notify';

interface DeliveryResult {
  success: boolean;
  status: 'SENT' | 'FAILED' | 'UNCERTAIN' | 'NOT_CLAIMABLE';
  error?: string;
}

/**
 * Attempt delivery for a specific order.
 * Called by the delivery worker cron job.
 */
export async function attemptDelivery(
  orderId: string
): Promise<DeliveryResult> {
  const supabase = getAdminSupabase();
  const env = getEnv();

  // 1. Claim the delivery attempt (atomic)
  const { data: rawClaimResult, error: claimError } = await supabase.rpc(
    'claim_delivery_attempt',
    { p_order_id: orderId }
  );

  const claimResult = rawClaimResult as {
    status?: string;
    attempt_id?: string;
    telegram_chat_id?: number;
    stock_unit_ids?: string[];
  } | null;

  if (claimError || !claimResult || claimResult.status !== 'CLAIMED') {
    return { success: false, status: 'NOT_CLAIMABLE' };
  }

  const attempt_id = claimResult.attempt_id!;
  const telegram_chat_id = claimResult.telegram_chat_id!;
  const stock_unit_ids = claimResult.stock_unit_ids!;

  try {
    // 2. Fetch encrypted stock payloads
    const { data: stockUnits, error: stockError } = await supabase
      .from('stock_units')
      .select('id, delivery_payload_encrypted')
      .in('id', stock_unit_ids);

    if (stockError || !stockUnits || stockUnits.length === 0) {
      throw new Error('Failed to fetch stock units');
    }

    // 3. Get order details for the delivery message
    const { data: order } = await supabase
      .from('orders')
      .select('code, total_amount')
      .eq('id', orderId)
      .single();

    const { data: orderItems } = await supabase
      .from('order_items')
      .select('product_name_snapshot, product_id')
      .eq('order_id', orderId);

    // Get warranty text
    let warrantyText: string | null = null;
    if (orderItems && orderItems.length > 0) {
      const { data: product } = await supabase
        .from('products')
        .select('warranty_text')
        .eq('id', orderItems[0].product_id)
        .single();
      warrantyText = product?.warranty_text ?? null;
    }

    // Fetch previous payment QR photo message IDs for auto-deletion
    const { data: attemptRecord } = await supabase
      .from('delivery_attempts')
      .select('telegram_message_ids')
      .eq('id', attempt_id)
      .single();

    const previousMessageIds: number[] = Array.isArray(attemptRecord?.telegram_message_ids)
      ? (attemptRecord.telegram_message_ids as unknown as number[])
      : [];

    // 4. Decrypt all stock units and combine into 1 Telegram message
    const decryptedPayloads = stockUnits.map((unit, index) => {
      const decrypted = decryptPayload(
        unit.delivery_payload_encrypted,
        env.INVENTORY_ENCRYPTION_KEY
      );
      return stockUnits.length > 1 ? `${index + 1}. ${decrypted}` : decrypted;
    });

    const messageIds: number[] = [];

    // Chunk message if combined payload exceeds Telegram 4000 character limit
    const MAX_CHUNK_LENGTH = 3500;
    let currentChunk = '';
    const payloadChunks: string[] = [];

    for (const item of decryptedPayloads) {
      if ((currentChunk + '\n' + item).length > MAX_CHUNK_LENGTH) {
        payloadChunks.push(currentChunk);
        currentChunk = item;
      } else {
        currentChunk = currentChunk ? `${currentChunk}\n${item}` : item;
      }
    }
    if (currentChunk) {
      payloadChunks.push(currentChunk);
    }

    for (const chunk of payloadChunks) {
      const result = await sendMessage({
        chat_id: telegram_chat_id,
        text: MSG.DELIVERY_SUCCESS({
          orderCode: order?.code ?? 'N/A',
          payload: chunk,
          warrantyText,
        }),
      });

      if (result.ok && result.result) {
        messageIds.push(result.result.message_id);
      } else {
        throw new Error(
          `Telegram sendMessage failed: ${result.description || 'Unknown error'}`
        );
      }
    }

    // 5. Success — mark delivered
    const { error: deliverError } = await supabase.rpc(
      'mark_order_delivered',
      {
        p_order_id: orderId,
        p_attempt_id: attempt_id,
        p_message_ids: JSON.stringify(messageIds),
      }
    );

    if (deliverError) {
      console.error('mark_order_delivered failed:', deliverError);
      // Stock was sent but DB update failed — this is UNCERTAIN territory
      await supabase.rpc('mark_delivery_uncertain', {
        p_attempt_id: attempt_id,
        p_error: `DB update failed after Telegram send: ${deliverError.message}`,
      });
      await notifyDeliveryUncertain(order?.code ?? orderId);
      return { success: false, status: 'UNCERTAIN', error: deliverError.message };
    }

    // Auto-delete payment instruction & VietQR photo message from chat to keep history clean
    if (previousMessageIds.length > 0) {
      for (const msgId of previousMessageIds) {
        if (typeof msgId === 'number') {
          deleteMessage({
            chat_id: telegram_chat_id,
            message_id: msgId,
          }).catch((err) =>
            console.warn(`[AutoDelete] Could not delete payment message ${msgId}:`, err)
          );
        }
      }
    }

    return { success: true, status: 'SENT' };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    // Determine if this is a known failure or uncertain
    const isTimeout =
      errorMessage.includes('timeout') ||
      errorMessage.includes('ETIMEDOUT') ||
      errorMessage.includes('ECONNRESET') ||
      errorMessage.includes('AbortError');

    if (isTimeout) {
      // UNCERTAIN — message might have been sent
      await supabase.rpc('mark_delivery_uncertain', {
        p_attempt_id: attempt_id,
        p_error: errorMessage,
      });

      const { data: order } = await supabase
        .from('orders')
        .select('code')
        .eq('id', orderId)
        .single();
      await notifyDeliveryUncertain(order?.code ?? orderId);

      return { success: false, status: 'UNCERTAIN', error: errorMessage };
    } else {
      // FAILED — known error before send confirmed
      await supabase.rpc('mark_delivery_failed', {
        p_attempt_id: attempt_id,
        p_error: errorMessage,
      });

      const { data: order } = await supabase
        .from('orders')
        .select('code')
        .eq('id', orderId)
        .single();
      await notifyDeliveryFailed(order?.code ?? orderId, errorMessage);

      return { success: false, status: 'FAILED', error: errorMessage };
    }
  }
}
