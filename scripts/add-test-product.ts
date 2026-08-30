import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { encryptPayload } from '../src/lib/crypto';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const encryptionKey = process.env.INVENTORY_ENCRYPTION_KEY!;

if (!supabaseUrl || !serviceRoleKey || !encryptionKey) {
  console.error('❌ Missing environment variables in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const TEST_PAYLOADS = [
  'MÃ TEST #1: TEST-KEY-888111-AAA (Hệ thống giao hàng tự động thành công!)',
  'MÃ TEST #2: TEST-KEY-888222-BBB (Hệ thống giao hàng tự động thành công!)',
  'MÃ TEST #3: TEST-KEY-888333-CCC (Hệ thống giao hàng tự động thành công!)',
  'MÃ TEST #4: TEST-KEY-888444-DDD (Hệ thống giao hàng tự động thành công!)',
  'MÃ TEST #5: TEST-KEY-888555-EEE (Hệ thống giao hàng tự động thành công!)',
];

async function main() {
  console.log('🧪 Adding Test Category, Test Product & Stock Units...');

  // 1. Create or get Category
  let { data: category } = await supabase
    .from('categories')
    .select('id')
    .eq('slug', 'test-category')
    .single();

  if (!category) {
    const { data: newCat, error: catErr } = await supabase
      .from('categories')
      .insert({
        name: 'Danh Mục Test',
        slug: 'test-category',
        emoji: '🧪',
        sort_order: 99,
        is_active: true,
      })
      .select('id')
      .single();

    if (catErr) {
      console.error('❌ Failed to create test category:', catErr.message);
      process.exit(1);
    }
    category = newCat;
    console.log('✅ Created Category: Danh Mục Test 🧪');
  } else {
    console.log('ℹ️ Category Danh Mục Test already exists.');
  }

  // 2. Create or get Product
  let { data: product } = await supabase
    .from('products')
    .select('id')
    .eq('sku', 'SKU-TEST-1K')
    .single();

  if (!product) {
    const { data: newProd, error: prodErr } = await supabase
      .from('products')
      .insert({
        category_id: category!.id,
        sku: 'SKU-TEST-1K',
        name: 'Sản phẩm Test 1.000đ',
        description: 'Sản phẩm test hệ thống tự động xác nhận thanh toán & trả hàng (Giá: 1.000 VNĐ).',
        sale_price: 1000,
        warranty_text: 'Hỗ trợ test hệ thống 24/7',
        delivery_note: 'Giao mã test ngay lập tức sau khi chuyển khoản',
        min_quantity: 1,
        max_quantity: 5,
        low_stock_threshold: 1,
        is_active: true,
      })
      .select('id')
      .single();

    if (prodErr) {
      console.error('❌ Failed to create test product:', prodErr.message);
      process.exit(1);
    }
    product = newProd;
    console.log('✅ Created Product: Sản phẩm Test 1.000đ 📦');
  } else {
    console.log('ℹ️ Product Sản phẩm Test 1.000đ already exists.');
  }

  // 3. Encrypt and add stock units
  let addedCount = 0;
  for (let i = 0; i < TEST_PAYLOADS.length; i++) {
    const payload = TEST_PAYLOADS[i];
    const encryptedPayload = encryptPayload(payload, encryptionKey);

    const { error: stockErr } = await supabase.from('stock_units').insert({
      product_id: product!.id,
      delivery_payload_encrypted: encryptedPayload,
      status: 'AVAILABLE',
      import_note: `Kho mã test #${i + 1}`,
    });

    if (stockErr) {
      console.error(`⚠️ Error adding stock unit ${i + 1}:`, stockErr.message);
    } else {
      addedCount++;
    }
  }

  console.log(`✅ Successfully added ${addedCount} stock units for Test product!`);
  console.log('🎉 ALL DONE! Test Category & 1,000đ Product are ready in Telegram Shop Bot.');
}

main().catch(console.error);
