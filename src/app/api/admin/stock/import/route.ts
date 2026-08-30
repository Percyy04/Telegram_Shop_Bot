import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getAdminSupabase } from '@/lib/supabase/admin';
import { encryptPayload } from '@/lib/crypto';
import { getEnv } from '@/lib/config';
import { sendStockRestockNotification } from '@/lib/stock-notify';

export async function POST(request: Request) {
  // 1. Require admin auth
  const admin = await requireAdmin();

  const body = await request.json();
  const { productId, stockLines, importNote } = body;

  if (!productId || !stockLines || typeof stockLines !== 'string') {
    return NextResponse.json(
      { error: 'Dữ liệu nhập không hợp lệ.' },
      { status: 400 }
    );
  }

  // 2. Parse lines (trim whitespace, exclude empty lines)
  const lines = stockLines
    .split('\n')
    .map((l: string) => l.trim())
    .filter((l: string) => l.length > 0);

  if (lines.length === 0) {
    return NextResponse.json(
      { error: 'Không có dòng hàng nào để nhập.' },
      { status: 400 }
    );
  }

  const env = getEnv();
  const supabase = getAdminSupabase();

  // 3. Verify product exists
  const { data: product, error: prodErr } = await supabase
    .from('products')
    .select('id, name')
    .eq('id', productId)
    .single();

  if (prodErr || !product) {
    return NextResponse.json(
      { error: 'Sản phẩm không tồn tại.' },
      { status: 404 }
    );
  }

  // 4. Encrypt each line server-side
  const stockRecords = lines.map((plainLine: string) => {
    const encrypted = encryptPayload(plainLine, env.INVENTORY_ENCRYPTION_KEY);
    return {
      product_id: productId,
      delivery_payload_encrypted: encrypted,
      status: 'AVAILABLE' as const,
      import_note: importNote || null,
      imported_by: admin.id,
    };
  });

  // 5. Batch insert into stock_units
  const { error: insertErr } = await supabase
    .from('stock_units')
    .insert(stockRecords);

  if (insertErr) {
    console.error('Stock bulk import error:', insertErr);
    return NextResponse.json(
      { error: `Lỗi lưu DB: ${insertErr.message}` },
      { status: 500 }
    );
  }

  // 6. Audit log
  await supabase.from('audit_logs').insert({
    actor_type: 'ADMIN',
    actor_admin_id: admin.id,
    action: 'BULK_IMPORT_STOCK',
    entity_type: 'PRODUCT',
    entity_id: productId,
    metadata: {
      count: lines.length,
      note: importNote || '',
    },
  });

  // 7. Broadcast notification to Telegram (defaults to true)
  let broadcastSent = false;
  const shouldNotify = body.broadcastNotify !== undefined ? Boolean(body.broadcastNotify) : true;

  if (shouldNotify) {
    try {
      await sendStockRestockNotification({
        productIdOrSku: productId,
        addedCount: lines.length,
      });
      broadcastSent = true;
    } catch (err) {
      console.error('Failed to broadcast restock notification:', err);
    }
  }

  return NextResponse.json({
    success: true,
    importedCount: lines.length,
    productName: product.name,
    broadcastSent,
  });
}
