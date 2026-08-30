import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { encryptPayload } from '../src/lib/crypto';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const keyRaw = process.env.INVENTORY_ENCRYPTION_KEY || '';
const encryptionKey =
  keyRaw && Buffer.from(keyRaw, 'base64').length === 32
    ? keyRaw
    : 'AegeHcSQcJMZpQAAXfzSGXQDPS2dAFYd3mLLmcG5IAc=';

const supabase = createClient(supabaseUrl, serviceRoleKey);

const RAW_PAYLOAD = `https://serviceactivation.google.com/subscription/new/AQCpiIFwXiHo5tslxs2kwNCNZ9Q8R8aJFU-eUOb2xXPC0pdqz5JMIRdVSf_nlHZA6GTTSHSQqMhseKJe5jyMHVLW2sWFSvvlVYsEQiUlng60fv_jCllQ88vV_LWMkgnx-S_Id01cHi2Pu84QeQEKNlouO3PJcsB0HxQazBx87c-ILHVubhOG5DY781zB3jxHrlwFuzAcrbitJWhWYXm3enjCEYMaisMIUlWZG1v09jY2rWhnbu_InkGGPbTi8r4YlG-K0zawSSO2MZk7pg==`;

async function main() {
  console.log('🚀 Adding Gemini AI Category, Product & Stock Unit...');

  // 1. Create or get Category
  let { data: category } = await supabase
    .from('categories')
    .select('id')
    .eq('slug', 'gemini-ai')
    .single();

  if (!category) {
    const { data: newCat, error: catErr } = await supabase
      .from('categories')
      .insert({
        name: 'Gemini AI',
        slug: 'gemini-ai',
        emoji: '✨',
        sort_order: 1,
        is_active: true,
      })
      .select('id')
      .single();

    if (catErr) {
      console.error('❌ Failed to create category:', catErr.message);
      process.exit(1);
    }
    category = newCat;
    console.log('✅ Created Category: Gemini AI ✨');
  } else {
    console.log('ℹ️ Category Gemini AI already exists.');
  }

  // 2. Create or get Product
  let { data: product } = await supabase
    .from('products')
    .select('id')
    .eq('sku', 'SKU-GEMINI-18M')
    .single();

  if (!product) {
    const { data: newProd, error: prodErr } = await supabase
      .from('products')
      .insert({
        category_id: category!.id,
        sku: 'SKU-GEMINI-18M',
        name: 'Gemini Pro 18 Tháng',
        description: 'Tài khoản Google Gemini Pro / Advanced 18 Tháng kích hoạt chính chủ qua link.',
        sale_price: 50000, // Giá 50,000đ (bạn có thể thay đổi sau trong DB)
        warranty_text: 'Bảo hành 18 tháng 1 đổi 1',
        delivery_note: 'Giao link kích hoạt tự động 24/7',
        min_quantity: 1,
        max_quantity: 5,
        low_stock_threshold: 1,
        is_active: true,
      })
      .select('id')
      .single();

    if (prodErr) {
      console.error('❌ Failed to create product:', prodErr.message);
      process.exit(1);
    }
    product = newProd;
    console.log('✅ Created Product: Gemini Pro 18 Tháng 📦');
  } else {
    console.log('ℹ️ Product Gemini Pro 18 Tháng already exists.');
  }

  // 3. Encrypt payload and insert Stock Unit
  const encryptedPayload = encryptPayload(RAW_PAYLOAD, encryptionKey);

  const { data: stockUnit, error: stockErr } = await supabase
    .from('stock_units')
    .insert({
      product_id: product!.id,
      delivery_payload_encrypted: encryptedPayload,
      status: 'AVAILABLE',
      import_note: 'Tài khoản #1 - Gemini Pro 18 Tháng',
    })
    .select('id')
    .single();

  if (stockErr) {
    console.error('❌ Failed to add stock unit:', stockErr.message);
    process.exit(1);
  }

  console.log(`✅ Successfully added Stock Unit! Stock ID: ${stockUnit.id}`);
  console.log('\n🎉 ALL DONE! Gemini Pro 18 Tháng is now live in your Telegram Shop Bot!');
}

main().catch(console.error);
