import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getAdminSupabase } from '@/lib/supabase/admin';

export async function GET() {
  await requireAdmin();
  const supabase = getAdminSupabase();

  const { data: products, error } = await supabase
    .from('products')
    .select('*, categories(id, name)')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get available stock count for each product
  const productsWithStock = await Promise.all(
    (products || []).map(async (prod) => {
      const { count } = await supabase
        .from('stock_units')
        .select('*', { count: 'exact', head: true })
        .eq('product_id', prod.id)
        .eq('status', 'AVAILABLE');

      return {
        ...prod,
        available_stock: count || 0,
      };
    })
  );

  return NextResponse.json({ products: productsWithStock });
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  const body = await request.json();

  const {
    sku,
    name,
    description,
    categoryId,
    salePrice,
    warrantyText,
    deliveryNote,
    minQuantity,
    maxQuantity,
    lowStockThreshold,
    isActive,
  } = body;

  if (!sku || !name || salePrice === undefined) {
    return NextResponse.json(
      { error: 'SKU, tên sản phẩm và giá bán là bắt buộc.' },
      { status: 400 }
    );
  }

  const supabase = getAdminSupabase();

  const { data, error } = await supabase
    .from('products')
    .insert({
      sku,
      name,
      description: description || null,
      category_id: categoryId || null,
      sale_price: salePrice,
      warranty_text: warrantyText || null,
      delivery_note: deliveryNote || null,
      min_quantity: minQuantity || 1,
      max_quantity: maxQuantity || 1,
      low_stock_threshold: lowStockThreshold || 3,
      is_active: isActive !== undefined ? isActive : true,
    })
    .select()
    .single();

  if (error) {
    console.error('Create product error:', error);
    return NextResponse.json(
      { error: `Lỗi tạo sản phẩm: ${error.message}` },
      { status: 400 }
    );
  }

  await supabase.from('audit_logs').insert({
    actor_type: 'ADMIN',
    actor_admin_id: admin.id,
    action: 'CREATE_PRODUCT',
    entity_type: 'PRODUCT',
    entity_id: data.id,
    metadata: { name, sku, salePrice },
  });

  return NextResponse.json({ success: true, product: data });
}

export async function PUT(request: Request) {
  const admin = await requireAdmin();
  const body = await request.json();

  const {
    id,
    sku,
    name,
    description,
    categoryId,
    salePrice,
    warrantyText,
    deliveryNote,
    minQuantity,
    maxQuantity,
    lowStockThreshold,
    isActive,
  } = body;

  if (!id || !sku || !name || salePrice === undefined) {
    return NextResponse.json(
      { error: 'ID, SKU, tên sản phẩm và giá bán là bắt buộc.' },
      { status: 400 }
    );
  }

  const supabase = getAdminSupabase();

  const { data, error } = await supabase
    .from('products')
    .update({
      sku,
      name,
      description: description || null,
      category_id: categoryId || null,
      sale_price: salePrice,
      warranty_text: warrantyText || null,
      delivery_note: deliveryNote || null,
      min_quantity: minQuantity || 1,
      max_quantity: maxQuantity || 1,
      low_stock_threshold: lowStockThreshold || 3,
      is_active: isActive !== undefined ? isActive : true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Update product error:', error);
    return NextResponse.json(
      { error: `Lỗi cập nhật: ${error.message}` },
      { status: 400 }
    );
  }

  await supabase.from('audit_logs').insert({
    actor_type: 'ADMIN',
    actor_admin_id: admin.id,
    action: 'UPDATE_PRODUCT',
    entity_type: 'PRODUCT',
    entity_id: id,
    metadata: { name, sku, salePrice },
  });

  return NextResponse.json({ success: true, product: data });
}
