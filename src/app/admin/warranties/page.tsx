import { getAdminSupabase } from '@/lib/supabase/admin';
import { formatDateVN } from '@/lib/format';
import { ShieldAlert } from 'lucide-react';

export const revalidate = 0;

export default async function AdminWarrantiesPage() {
  const supabase = getAdminSupabase();

  const { data: requests } = await supabase
    .from('warranty_requests')
    .select(`
      id, status, customer_message, admin_note, created_at, telegram_user_id,
      orders ( code, total_amount )
    `)
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-rose-400" />
          Yêu cầu bảo hành & Hỗ trợ
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Quản lý các sự cố tài khoản / sản phẩm do khách hàng tạo từ Telegram Bot.
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-6 py-3">Mã đơn</th>
                <th className="px-6 py-3">Telegram User ID</th>
                <th className="px-6 py-3">Nội dung phản ánh</th>
                <th className="px-6 py-3">Trạng thái</th>
                <th className="px-6 py-3">Ngày yêu cầu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {requests && requests.length > 0 ? (
                requests.map((r) => {
                  const order = Array.isArray(r.orders) ? r.orders[0] : r.orders;

                  return (
                    <tr key={r.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-6 py-4 font-mono text-emerald-400 font-bold">
                        {order?.code || 'N/A'}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-300">
                        {r.telegram_user_id}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-200 max-w-xs truncate">
                        {r.customer_message}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          {r.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-400">
                        {formatDateVN(r.created_at)}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-xs text-slate-500">
                    Chưa có yêu cầu bảo hành nào.
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
