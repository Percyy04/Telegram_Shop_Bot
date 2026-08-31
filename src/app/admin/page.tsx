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
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl text-white">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 mb-3 backdrop-blur-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Hệ thống tự động SePay Webhook Live
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Tổng quan Hệ thống Shop Bot
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
              Tự động hóa xử lý thanh toán QR Ngân hàng, mã hóa AES-256 kho tài khoản và phát hàng tức thì qua Telegram.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/stock"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-emerald-950 text-xs font-extrabold transition-all duration-200 shadow-md shadow-emerald-900/30 min-h-[44px]"
            >
              <Boxes className="w-4 h-4" /> Nhập kho nhanh
            </Link>
          </div>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Active Products */}
        <div className="group bg-white border border-slate-200/80 hover:border-blue-300 rounded-2xl p-6 transition-all duration-200 shadow-xs hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Sản phẩm đang bán</span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200/60 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 mt-4 tracking-tight">{productCount || 0}</p>
          <p className="text-[11px] text-slate-500 mt-2 font-medium">Sản phẩm active trên Bot Catalog</p>
        </div>

        {/* Stock Available */}
        <div className="group bg-white border border-slate-200/80 hover:border-purple-300 rounded-2xl p-6 transition-all duration-200 shadow-xs hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Hàng sẵn trong kho</span>
            <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200/60 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Boxes className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-4">
            <p className="text-3xl font-extrabold text-slate-900 tracking-tight">{availableStockCount || 0}</p>
            {Boolean(reservedStockCount) && (
              <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/80">
                {reservedStockCount} giữ
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 mt-2 font-medium">Đã mã hóa AES-256-GCM bảo mật</p>
        </div>

        {/* Orders Today */}
        <div className="group bg-white border border-slate-200/80 hover:border-amber-300 rounded-2xl p-6 transition-all duration-200 shadow-xs hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Đơn hàng hôm nay</span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/60 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <ShoppingCart className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 mt-4 tracking-tight">{ordersTodayCount || 0}</p>
          <p className="text-[11px] text-slate-500 mt-2 font-medium">Tổng số giao dịch tạo trong ngày</p>
        </div>

        {/* Auto Confirm (SePay) */}
        <div className="group bg-white border border-slate-200/80 hover:border-emerald-300 rounded-2xl p-6 transition-all duration-200 shadow-xs hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Auto SePay Hôm Nay</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/60 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Zap className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-4">
            <p className="text-3xl font-extrabold text-emerald-600 tracking-tight">{autoConfirmedToday || 0}</p>
            <span className="text-xs text-slate-500 font-semibold">/ {manualConfirmedToday || 0} thủ công</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 font-medium">Khớp chuyển khoản & tự động giao hàng</p>
        </div>
      </div>

      {/* Low Stock Alerts */}
      {lowStockProducts.length > 0 && (
        <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5 text-amber-800">
              <div className="p-2 rounded-xl bg-amber-100 border border-amber-300/60">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">Cảnh báo sắp hết hàng ({lowStockProducts.length})</h3>
                <p className="text-xs text-slate-600">Sản phẩm dưới ngưỡng tồn kho tối thiểu</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {lowStockProducts.map((p) => (
              <div
                key={p.id}
                className="bg-white border border-amber-200/60 rounded-xl p-4 flex items-center justify-between shadow-xs"
              >
                <div>
                  <p className="text-sm font-bold text-slate-900">{p.name}</p>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">{p.sku} — {formatVND(Number(p.sale_price))}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200/80">
                    Còn {p.stockLeft}
                  </span>
                  <Link
                    href="/admin/stock"
                    className="text-xs font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1 min-h-[44px] px-2"
                  >
                    Nhập kho <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Orders */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
        <div className="px-6 py-5 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="font-bold text-base text-slate-900">Đơn hàng mới nhất</h3>
            <p className="text-xs text-slate-500 mt-0.5">5 giao dịch gần đây nhất trên hệ thống</p>
          </div>
          <Link
            href="/admin/orders"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 border border-emerald-200/80 transition-colors min-h-[44px]"
          >
            Xem tất cả đơn <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="divide-y divide-slate-100">
          {recentOrders && recentOrders.length > 0 ? (
            recentOrders.map((order) => {
              const payment = Array.isArray(order.payments) ? order.payments[0] : order.payments;
              const isAuto = payment?.verification_method === 'WEBHOOK_SEPAY';

              return (
                <div key={order.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
                      <ShoppingCart className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-slate-900">{order.code}</span>
                        {payment?.status === 'CONFIRMED' && (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            isAuto
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}>
                            {isAuto ? <Zap className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                            {isAuto ? 'SePay Auto' : 'Thủ công'}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{order.telegram_first_name || 'Khách hàng'}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-6">
                    <span className="text-sm font-bold text-slate-900">
                      {formatVND(Number(order.total_amount))}
                    </span>

                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors min-h-[44px]"
                    >
                      Chi tiết <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-12 text-center text-xs text-slate-500 font-medium">Chưa có đơn hàng nào phát sinh</div>
          )}
        </div>
      </div>
    </div>
  );
}
