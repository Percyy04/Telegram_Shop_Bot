import Link from 'next/link';
import { getAdminSupabase } from '@/lib/supabase/admin';
import { formatVND } from '@/lib/format';
import { Plus, Package, Edit, Boxes } from 'lucide-react';

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
          <h1 className="text-xl font-bold text-slate-100">Danh sách sản phẩm</h1>
          <p className="text-xs text-slate-400 mt-1">Quản lý danh mục và thông tin sản phẩm</p>
        </div>
        <Link
          href="/admin/products/new"
          className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2.5 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" /> Thêm sản phẩm mới
        </Link>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-6 py-3">Sản phẩm</th>
                <th className="px-6 py-3">Danh mục</th>
                <th className="px-6 py-3">Giá bán</th>
                <th className="px-6 py-3">Kho còn</th>
                <th className="px-6 py-3">Trạng thái</th>
                <th className="px-6 py-3 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {productsWithStock.length > 0 ? (
                productsWithStock.map((p) => {
                  const category = Array.isArray(p.categories) ? p.categories[0] : p.categories;

                  return (
                    <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
                            <Package className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-100">{p.name}</p>
                            <p className="text-xs font-mono text-slate-500">{p.sku}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-xs">
                        {category ? `${category.emoji || '📦'} ${category.name}` : 'Mặc định'}
                      </td>

                      <td className="px-6 py-4 font-semibold text-slate-200">
                        {formatVND(Number(p.sale_price))}
                      </td>

                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          p.availableStock > 0
                            ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          {p.availableStock} sản phẩm
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-medium border ${
                          p.is_active
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}>
                          {p.is_active ? 'Đang bán' : 'Tạm ẩn'}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href="/admin/stock"
                            title="Nhập kho"
                            className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-purple-400"
                          >
                            <Boxes className="w-4 h-4" />
                          </Link>
                          <Link
                            href={`/admin/products/${p.id}/edit`}
                            title="Chỉnh sửa"
                            className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-blue-400"
                          >
                            <Edit className="w-4 h-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-xs text-slate-500">
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
