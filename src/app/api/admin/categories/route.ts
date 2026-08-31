import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getAdminSupabase } from '@/lib/supabase/admin';

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

/**
 * GET /api/admin/categories
 * Get all categories with product count
 */
export async function GET() {
  await requireAdmin();
  const supabase = getAdminSupabase();

  const { data: categories, error } = await supabase
    .from('categories')
    .select('*, products(id)')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const result = (categories || []).map((cat) => {
    const products = cat.products || [];
    return {
      ...cat,
      product_count: products.length,
    };
  });

  return NextResponse.json({ categories: result });
}

/**
 * POST /api/admin/categories
 * Create a new category
 */
export async function POST(request: Request) {
  const admin = await requireAdmin();

  const body = await request.json();
  const { name, slug, emoji, sortOrder, isActive } = body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'Tên danh mục là bắt buộc.' }, { status: 400 });
  }

  const finalSlug = slug && slug.trim() ? generateSlug(slug) : generateSlug(name);
  const finalEmoji = emoji && emoji.trim() ? emoji.trim() : '📦';
  const finalSortOrder = typeof sortOrder === 'number' ? sortOrder : parseInt(sortOrder || '0', 10);
  const finalIsActive = isActive !== undefined ? Boolean(isActive) : true;

  const supabase = getAdminSupabase();

  const { data, error } = await supabase
    .from('categories')
    .insert({
      name: name.trim(),
      slug: finalSlug,
      emoji: finalEmoji,
      sort_order: isNaN(finalSortOrder) ? 0 : finalSortOrder,
      is_active: finalIsActive,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: `Slug "${finalSlug}" đã tồn tại. Vui lòng nhập slug khác.` }, { status: 400 });
    }
    return NextResponse.json({ error: `Lỗi tạo danh mục: ${error.message}` }, { status: 400 });
  }

  await supabase.from('audit_logs').insert({
    actor_type: 'ADMIN',
    actor_admin_id: admin.id,
    action: 'CREATE_CATEGORY',
    entity_type: 'CATEGORY',
    entity_id: data.id,
    metadata: { name: data.name, slug: data.slug },
  });

  return NextResponse.json({ success: true, category: data });
}

/**
 * PUT /api/admin/categories
 * Update existing category or toggle active status
 */
export async function PUT(request: Request) {
  const admin = await requireAdmin();

  const body = await request.json();
  const { id, name, slug, emoji, sortOrder, isActive } = body;

  if (!id) {
    return NextResponse.json({ error: 'ID danh mục là bắt buộc.' }, { status: 400 });
  }

  const supabase = getAdminSupabase();

  // Quick toggle active status
  if (isActive !== undefined && !name && !slug && sortOrder === undefined) {
    const { data: toggleData, error: toggleErr } = await supabase
      .from('categories')
      .update({
        is_active: Boolean(isActive),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (toggleErr) {
      return NextResponse.json({ error: `Lỗi cập nhật: ${toggleErr.message}` }, { status: 400 });
    }

    await supabase.from('audit_logs').insert({
      actor_type: 'ADMIN',
      actor_admin_id: admin.id,
      action: 'TOGGLE_CATEGORY_ACTIVE',
      entity_type: 'CATEGORY',
      entity_id: id,
      metadata: { is_active: isActive },
    });

    return NextResponse.json({ success: true, category: toggleData });
  }

  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'Tên danh mục là bắt buộc.' }, { status: 400 });
  }

  const finalSlug = slug && slug.trim() ? generateSlug(slug) : generateSlug(name);
  const finalEmoji = emoji && emoji.trim() ? emoji.trim() : '📦';
  const finalSortOrder = typeof sortOrder === 'number' ? sortOrder : parseInt(sortOrder || '0', 10);
  const finalIsActive = isActive !== undefined ? Boolean(isActive) : true;

  const { data, error } = await supabase
    .from('categories')
    .update({
      name: name.trim(),
      slug: finalSlug,
      emoji: finalEmoji,
      sort_order: isNaN(finalSortOrder) ? 0 : finalSortOrder,
      is_active: finalIsActive,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: `Slug "${finalSlug}" đã được sử dụng ở danh mục khác.` }, { status: 400 });
    }
    return NextResponse.json({ error: `Lỗi cập nhật: ${error.message}` }, { status: 400 });
  }

  await supabase.from('audit_logs').insert({
    actor_type: 'ADMIN',
    actor_admin_id: admin.id,
    action: 'UPDATE_CATEGORY',
    entity_type: 'CATEGORY',
    entity_id: id,
    metadata: { name: data.name, slug: data.slug },
  });

  return NextResponse.json({ success: true, category: data });
}

/**
 * DELETE /api/admin/categories?id={id}
 * Delete category (resets products.category_id to null before deleting)
 */
export async function DELETE(request: Request) {
  const admin = await requireAdmin();

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'ID danh mục là bắt buộc.' }, { status: 400 });
  }

  const supabase = getAdminSupabase();

  // Reset category_id for any attached products to avoid foreign key failure
  await supabase.from('products').update({ category_id: null }).eq('category_id', id);

  const { error } = await supabase.from('categories').delete().eq('id', id);

  if (error) {
    return NextResponse.json({ error: `Không thể xóa danh mục: ${error.message}` }, { status: 400 });
  }

  await supabase.from('audit_logs').insert({
    actor_type: 'ADMIN',
    actor_admin_id: admin.id,
    action: 'DELETE_CATEGORY',
    entity_type: 'CATEGORY',
    entity_id: id,
    metadata: { category_id: id },
  });

  return NextResponse.json({ success: true });
}
