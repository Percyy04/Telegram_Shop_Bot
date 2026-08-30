import Link from 'next/link';
import { getAdminSupabase } from '@/lib/supabase/admin';
import { formatVND, formatDateVN } from '@/lib/format';
import { ShoppingCart, Zap, UserCheck, AlertTriangle } from 'lucide-react';

export const revalidate = 0;

export default async function AdminOrdersPage() {
  const supabase = getAdminSupabase();

  const { data: orders } = await supabase
    .from('orders')
    .select(`
      id, code, total_amount, status, created_at, telegram_user_id,
      telegram_username, telegram_first_name, payment_reference,
      payments ( verification_method, status, amount_received ),
      delivery_attempts ( status, attempt_count, last_error )
    `)
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-amber-400" />
          Quản lý đơn hàng
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Theo dõi trạng thái thanh toán tự động SePay, lịch sử giao hàng và xử lý sự cố.
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-6 py-3">Mã đơn / Nội dung CK</th>
                <th className="px-6 py-3">Khách hàng</th>
                <th className="px-6 py-3">Tổng tiền</th>
                <th className="px-6 py-3">Xác nhận thanh toán</th>
                <th className="px-6 py-3">Trạng thái giao hàng</th>
                <th className="px-6 py-3">Thời gian tạo</th>
                <th className="px-6 py-3 text-right">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {orders && orders.length > 0 ? (
                orders.map((o) => {
                  const payment = Array.isArray(o.payments) ? o.payments[0] : o.payments;
                  const delivery = Array.isArray(o.delivery_attempts)
                    ? o.delivery_attempts[0]
                    : o.delivery_attempts;
                  const isAuto = payment?.verification_method === 'WEBHOOK_SEPAY';

                  return (
                    <tr key={o.id} className="hover:bg-slate-800/40 transition-colors">
                      {/* Code */}
                      <td className="px-6 py-4">
                        <div>
                          <span className="font-mono font-bold text-emerald-400">{o.code}</span>
                          <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                            ND: {o.payment_reference}
                          </p>
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-slate-200">{o.telegram_first_name || 'Khách hàng'}</p>
                          <p className="text-xs text-slate-500 font-mono">
                            {o.telegram_username ? `@${o.telegram_username}` : `ID: ${o.telegram_user_id}`}
                          </p>
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="px-6 py-4 font-semibold text-slate-100">
                        {formatVND(Number(o.total_amount))}
                      </td>

                      {/* Payment Badge */}
                      <td className="px-6 py-4">
                        {payment?.status === 'CONFIRMED' ? (
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                              isAuto
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                            }`}
                          >
                            {isAuto ? <Zap className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                            {isAuto ? '🤖 Auto SePay' : '👤 Thủ công'}
                          </span>
                        ) : o.status === 'EXPIRED' ? (
                          <span className="px-2.5 py-1 rounded-full text-xs bg-slate-800 text-slate-500 border border-slate-700">
                            Hết hạn
                          </span>
                        ) : o.status === 'CANCELLED' ? (
                          <span className="px-2.5 py-1 rounded-full text-xs bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            Đã hủy
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
                            Chờ CK
                          </span>
                        )}
                      </td>

                      {/* Delivery Status Badge */}
                      <td className="px-6 py-4">
                        {o.status === 'DELIVERED' ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            ✅ Đã giao hàng
                          </span>
                        ) : delivery?.status === 'UNCERTAIN' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            <AlertTriangle className="w-3.5 h-3.5" /> Không rõ (Review)
                          </span>
                        ) : delivery?.status === 'FAILED' ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            ❌ Thất bại
                          </span>
                        ) : delivery?.status === 'SENDING' ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            ⏳ Đang gửi...
                          </span>
                        ) : o.status === 'DELIVERY_PENDING' ? (
                          <span className="px-2.5 py-1 rounded-full text-xs bg-purple-500/10 text-purple-400 border border-purple-500/20">
                            📦 Chờ Cron giao
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500">—</span>
                        )}
                      </td>

                      {/* Created At */}
                      <td className="px-6 py-4 text-xs text-slate-400">
                        {formatDateVN(o.created_at)}
                      </td>

                      {/* Action */}
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/admin/orders/${o.id}`}
                          className="text-xs text-blue-400 hover:underline font-medium"
                        >
                          Chi tiết &rarr;
                        </Link>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-xs text-slate-500">
                    Chưa có đơn hàng nào.
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
