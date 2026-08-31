import Link from 'next/link';
import { getAdminSupabase } from '@/lib/supabase/admin';
import { formatVND } from '@/lib/format';
import { Plus, Package } from 'lucide-react';
import ProductActions from './ProductActions';

export const revalidate = 0;

export default async function AdminProductsPage() {
  const supabase = getAdminSupabase();

  const { data: products } = await supabase
    .from('products')
    .select(`
      id, sku, name, sale_price, is_active, min_quantity, max_quantity,
      categories ( name, emoji )
    `)
    .order('created_at', { ascending: false });

  // Get available stock count for each product
  const productsWithStock = [];
  if (products) {
    for (const p of products) {
      const { count } = await supabase
        .from('stock_units')
        .select('*', { count: 'exact', head: true })
        .eq('product_id', p.id)
        .eq('status', 'AVAILABLE');

      productsWithStock.push({
        ...p,
        availableStock: count || 0,
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Danh sách sản phẩm</h1>
          <p className="text-xs text-slate-500 font-medium mt-1">Quản lý danh mục và thông tin sản phẩm trên Telegram Bot</p>
        </div>
        <Link
          href="/admin/products/new"
          className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 transition-colors min-h-[44px] shadow-sm"
        >
          <Plus className="w-4 h-4" /> Thêm sản phẩm mới
        </Link>
      </div>

      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50/80 text-slate-600 text-xs font-bold uppercase tracking-wider border-b border-slate-200/80">
              <tr>
                <th className="px-6 py-4">Sản phẩm</th>
                <th className="px-6 py-4">Danh mục</th>
                <th className="px-6 py-4">Giá bán</th>
                <th className="px-6 py-4">Kho còn</th>
                <th className="px-6 py-4">Trạng thái</th>
                <th className="px-6 py-4 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {productsWithStock.length > 0 ? (
                productsWithStock.map((p) => {
                  const category = Array.isArray(p.categories) ? p.categories[0] : p.categories;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
                            <Package className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{p.name}</p>
                            <p className="text-xs font-mono text-slate-500 font-medium">{p.sku}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-xs font-semibold text-slate-700">
                        {category ? `${category.emoji || '📦'} ${category.name}` : 'Mặc định'}
                      </td>

                      <td className="px-6 py-4 font-bold text-slate-900">
                        {formatVND(Number(p.sale_price))}
                      </td>

                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                          p.availableStock > 0
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          {p.availableStock} sản phẩm
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                          p.is_active
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          {p.is_active ? 'Đang bán' : 'Tạm ẩn'}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <ProductActions productId={p.id} productName={p.name} isActive={p.is_active} />
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-xs text-slate-500 font-medium">
                    Chưa có sản phẩm nào. Bấm nút "Thêm sản phẩm mới" để bắt đầu.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
