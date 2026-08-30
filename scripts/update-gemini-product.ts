import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updateGeminiProduct() {
  console.log('--- Updating Gemini Pro 18 Month Product ---');

  // 1. Find product by SKU
  const { data: product, error: findErr } = await supabase
    .from('products')
    .select('id, category_id')
    .eq('sku', 'SKU-GEMINI-18M')
    .single();

  let productId = product?.id;

  const productData = {
    name: '🤖 [LINK] Gemini Pro 18 Tháng',
    sale_price: 13000,
    sku: 'SKU-GEMINI-18M',
    description:
      '• Link nhận gói Gemini AI Pro hạn 18 tháng.\n• Không cần thêm thẻ, không cần sử dụng vpn.\n• Mua về chỉ cần login gmail -> dán link -> kích hoạt gói.\n• Bảo hành 12 giờ mua về sử dụng liền không bảo hành những trường hợp ngâm link quá 12h kể từ lúc mua.\n• Hướng dẫn sử dụng: https://t.me/taphoagiare_update/99',
    warranty_text: 'Bảo hành 12 giờ mua về sử dụng liền không bảo hành những trường hợp ngâm link quá 12h kể từ lúc mua.',
    delivery_note: 'Dán link -> kích hoạt gói',
    image_url: '/images/gemini-pro-banner.png',
    min_quantity: 1,
    max_quantity: 59,
    low_stock_threshold: 5,
    is_active: true,
  };

  if (productId) {
    const { error: updateErr } = await supabase
      .from('products')
      .update(productData)
      .eq('id', productId);
    if (updateErr) throw updateErr;
    console.log('✅ Updated existing product:', productId);
  } else {
    // Get first category
    const { data: cat } = await supabase.from('categories').select('id').limit(1).single();
    const { data: newProd, error: insertErr } = await supabase
      .from('products')
      .insert({ ...productData, category_id: cat?.id })
      .select()
      .single();
    if (insertErr) throw insertErr;
    productId = newProd.id;
    console.log('✅ Created product:', productId);
  }

  // 2. Clear old stock for this product and create exactly 59 available items
  await supabase.from('stock_units').delete().eq('product_id', productId).eq('status', 'AVAILABLE');

  const stockUnits = [];
  for (let i = 1; i <= 59; i++) {
    stockUnits.push({
      product_id: productId,
      payload_encrypted: `LINK_GEMINI_PRO_18M_SAMPLE_KEY_${String(i).padStart(3, '0')}: https://one.google.com/explore-plan/gemini-advanced?token=GEMINI-18M-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
      status: 'AVAILABLE',
    });
  }

  const { error: stockErr } = await supabase.from('stock_units').insert(stockUnits);
  if (stockErr) throw stockErr;

  console.log('✅ Successfully added 59 stock units to Gemini Pro 18 Month product!');
}

updateGeminiProduct().catch(console.error);
