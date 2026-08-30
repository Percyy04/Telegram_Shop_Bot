import Link from 'next/link';
import { getAdminSupabase } from '@/lib/supabase/admin';
import { formatVND } from '@/lib/format';
import {
  Package,
  Boxes,
  ShoppingCart,
  Zap,
  UserCheck,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';

export const revalidate = 0; // Dynamic server page

export default async function AdminDashboardPage() {
  const supabase = getAdminSupabase();

  // 1. Fetch products & active stock count
  const { count: productCount } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);

  const { count: availableStockCount } = await supabase
    .from('stock_units')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'AVAILABLE');

  const { count: reservedStockCount } = await supabase
    .from('stock_units')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'RESERVED');

  // 2. Fetch orders stats today
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const { count: ordersTodayCount } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', startOfDay.toISOString());

  const { count: autoConfirmedToday } = await supabase
    .from('payments')
    .select('*', { count: 'exact', head: true })
    .eq('verification_method', 'WEBHOOK_SEPAY')
    .eq('status', 'CONFIRMED')
    .gte('confirmed_at', startOfDay.toISOString());

  const { count: manualConfirmedToday } = await supabase
    .from('payments')
    .select('*', { count: 'exact', head: true })
    .eq('verification_method', 'MANUAL')
    .eq('status', 'CONFIRMED')
    .gte('confirmed_at', startOfDay.toISOString());

  // 3. Low stock alert products
  const { data: products } = await supabase
    .from('products')
    .select('id, name, sku, low_stock_threshold, sale_price')
    .eq('is_active', true);

  const lowStockProducts = [];
  if (products) {
    for (const p of products) {
      const { count } = await supabase
        .from('stock_units')
        .select('*', { count: 'exact', head: true })
        .eq('product_id', p.id)
        .eq('status', 'AVAILABLE');

      const stockLeft = count || 0;
      if (stockLeft <= p.low_stock_threshold) {
        lowStockProducts.push({
          ...p,
          stockLeft,
        });
      }
    }
  }

  // 4. Recent 5 orders
  const { data: recentOrders } = await supabase
    .from('orders')
    .select(`
      id, code, total_amount, status, created_at, telegram_first_name,
      payments ( verification_method, status )
    `)
    .order('created_at', { ascending: false })
    .limit(5);

  return (
    <div className="space-y-8">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Products */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Sản phẩm đang bán</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-100 mt-2">{productCount || 0}</p>
        </div>

        {/* Stock Available */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Hàng có sẵn trong kho</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <p className="text-2xl font-bold text-slate-100">{availableStockCount || 0}</p>
            {Boolean(reservedStockCount) && (
              <span className="text-xs text-amber-400">({reservedStockCount} đang giữ)</span>
            )}
          </div>
        </div>

        {/* Orders Today */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Đơn hàng hôm nay</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-100 mt-2">{ordersTodayCount || 0}</p>
        </div>

        {/* Auto Confirm (SePay) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Auto SePay hôm nay</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <p className="text-2xl font-bold text-emerald-400">{autoConfirmedToday || 0}</p>
            <span className="text-xs text-slate-500">/ {manualConfirmedToday || 0} Thủ công</span>
          </div>
        </div>
      </div>

      {/* Low Stock Alerts */}
      {lowStockProducts.length > 0 && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-6">
          <div className="flex items-center gap-2 text-amber-400 mb-4">
            <AlertTriangle className="w-5 h-5" />
            <h3 className="font-semibold text-sm">Cảnh báo sắp hết hàng ({lowStockProducts.length} sản phẩm)</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {lowStockProducts.map((p) => (
              <div
                key={p.id}
                className="bg-slate-900/80 border border-slate-800 rounded-lg p-3 flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-slate-200">{p.name}</p>
                  <p className="text-xs text-slate-500">{p.sku} — {formatVND(Number(p.sale_price))}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    Còn {p.stockLeft}
                  </span>
                  <Link
                    href="/admin/stock"
                    className="text-xs text-blue-400 hover:underline flex items-center gap-1"
                  >
                    Nhập kho <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Orders */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-semibold text-sm text-slate-200">Đơn hàng mới nhất</h3>
          <Link
            href="/admin/orders"
            className="text-xs text-emerald-400 hover:underline flex items-center gap-1"
          >
            Xem tất cả <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="divide-y divide-slate-800/50">
          {recentOrders && recentOrders.length > 0 ? (
            recentOrders.map((order) => {
              const payment = Array.isArray(order.payments) ? order.payments[0] : order.payments;
              const isAuto = payment?.verification_method === 'WEBHOOK_SEPAY';

              return (
                <div key={order.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors">
                  <div className="flex items-center gap-4">
                    <div>
                      <span className="font-mono text-xs font-semibold text-emerald-400">{order.code}</span>
                      <p className="text-xs text-slate-400 mt-0.5">{order.telegram_first_name || 'Khách hàng'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    {/* Payment Verification Method Badge */}
                    {payment?.status === 'CONFIRMED' && (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border ${
                        isAuto
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                      }`}>
                        {isAuto ? <Zap className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                        {isAuto ? 'Auto' : 'Thủ công'}
                      </span>
                    )}

                    <span className="text-sm font-semibold text-slate-200">
                      {formatVND(Number(order.total_amount))}
                    </span>

                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="text-xs text-slate-400 hover:text-white"
                    >
                      Chi tiết &rarr;
                    </Link>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-xs text-slate-500">Chưa có đơn hàng nào</div>
          )}
        </div>
      </div>
    </div>
  );
}
