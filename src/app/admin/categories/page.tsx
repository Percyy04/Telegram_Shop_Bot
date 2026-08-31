import { getAdminSupabase } from '@/lib/supabase/admin';
import CategoryManager, { CategoryItem } from './CategoryManager';

export const revalidate = 0;

export default async function AdminCategoriesPage() {
  const supabase = getAdminSupabase();

  const { data: categories } = await supabase
    .from('categories')
    .select('*, products(id)')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  const categoriesWithCount: CategoryItem[] = (categories || []).map((cat) => {
    const products = Array.isArray(cat.products) ? cat.products : [];
    return {
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      emoji: cat.emoji,
      sort_order: cat.sort_order,
      is_active: cat.is_active,
      product_count: products.length,
    };
  });

  return <CategoryManager initialCategories={categoriesWithCount} />;
}
