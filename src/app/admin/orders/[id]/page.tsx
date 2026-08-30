import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getAdminSupabase } from '@/lib/supabase/admin';
import { formatVND, formatDateVN } from '@/lib/format';
import { decryptPayload } from '@/lib/crypto';
import { getEnv } from '@/lib/config';
import {
  ArrowLeft,
  Zap,
  UserCheck,
  AlertTriangle,
  Send,
  XCircle,
  Clock,
  User,
  Package,
} from 'lucide-react';
import OrderActionsForm from './OrderActionsForm';

export const revalidate = 0;

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = getAdminSupabase();
  const env = getEnv();

  // Fetch full order record
  const { data: order } = await supabase
    .from('orders')
    .select(`
      *,
      order_items ( id, product_name_snapshot, unit_price_snapshot, quantity, product_id ),
      payments ( * ),
      delivery_attempts ( * )
    `)
    .eq('id', id)
    .single();

  if (!order) {
    notFound();
  }

  const payment = Array.isArray(order.payments) ? order.payments[0] : order.payments;
  const delivery = Array.isArray(order.delivery_attempts)
    ? order.delivery_attempts[0]
    : order.delivery_attempts;
  const item = order.order_items?.[0];

  // Fetch assigned stock units & decrypt server-side if authorized admin
  const { data: assignedStock } = await supabase
    .from('stock_units')
    .select('id, delivery_payload_encrypted, status, reserved_at, sold_at')
    .or(`reserved_order_id.eq.${id},sold_order_id.eq.${id}`);

  const decryptedStockList = assignedStock?.map((s) => {
    let payloadText = '[Mã hóa AES-256-GCM]';
    try {
      payloadText = decryptPayload(s.delivery_payload_encrypted, env.INVENTORY_ENCRYPTION_KEY);
    } catch {
      payloadText = '[Lỗi giải mã payload]';
    }
    return {
      id: s.id,
      status: s.status,
      payload: payloadText,
    };
  }) || [];

  return (
    <div className="max-w-5xl space-y-8">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/orders"
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-100"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold font-mono text-emerald-400">
                Đơn hàng #{order.code}
              </h1>
              <span className="text-xs px-2.5 py-0.5 rounded font-medium bg-slate-800 text-slate-300 border border-slate-700">
                {order.status}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Tạo ngày {formatDateVN(order.created_at)}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <OrderActionsForm
          orderId={order.id}
          orderStatus={order.status}
          deliveryStatus={delivery?.status}
        />
      </div>

      {/* 2 Column Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Details (2 Cols) */}
        <div className="md:col-span-2 space-y-6">
          {/* Purchased Item Snapshot */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
            <h3 className="font-semibold text-sm text-slate-200 mb-4 flex items-center gap-2">
              <Package className="w-4 h-4 text-blue-400" />
              Sản phẩm mua
            </h3>

            {item ? (
              <div className="flex items-center justify-between p-4 rounded-lg bg-slate-950 border border-slate-800">
                <div>
                  <p className="font-semibold text-slate-100">{item.product_name_snapshot}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Đơn giá: {formatVND(Number(item.unit_price_snapshot))} × {item.quantity}
                  </p>
                </div>
                <span className="text-base font-bold text-emerald-400">
                  {formatVND(Number(order.total_amount))}
                </span>
              </div>
            ) : (
              <p className="text-xs text-slate-500">Không có dữ liệu chi tiết sản phẩm.</p>
            )}
          </div>

          {/* Assigned Stock / Decrypted Payload */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
            <h3 className="font-semibold text-sm text-slate-200 mb-4 flex items-center gap-2">
              <Send className="w-4 h-4 text-purple-400" />
              Thông tin kho phát cho khách ({decryptedStockList.length} hàng)
            </h3>

            {decryptedStockList.length > 0 ? (
              <div className="space-y-3">
                {decryptedStockList.map((s, idx) => (
                  <div key={s.id} className="p-4 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs text-emerald-300 relative group">
                    <span className="absolute top-2 right-2 text-[10px] text-slate-500 uppercase font-sans">
                      Dòng {idx + 1} • {s.status}
                    </span>
                    <pre className="whitespace-pre-wrap break-all">{s.payload}</pre>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-500 text-center">
                Chưa có mã hàng nào được giữ hoặc gán cho đơn hàng này.
              </div>
            )}
          </div>

          {/* Delivery Attempt Logs */}
          {delivery && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
              <h3 className="font-semibold text-sm text-slate-200 mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                Lịch sử giao hàng (Delivery State Machine)
              </h3>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-slate-400">Trạng thái hiện tại:</span>
                  <span className="font-semibold text-slate-200">{delivery.status}</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-slate-400">Số lần thử giao (Attempts):</span>
                  <span className="font-mono text-slate-200">{delivery.attempt_count}</span>
                </div>

                {delivery.last_error && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
                    <p className="font-semibold mb-1">Lỗi gần nhất:</p>
                    <p className="font-mono text-[11px]">{delivery.last_error}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Info (1 Col) */}
        <div className="space-y-6">
          {/* Customer Info */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
            <h3 className="font-semibold text-sm text-slate-200 flex items-center gap-2 border-b border-slate-800 pb-3">
              <User className="w-4 h-4 text-blue-400" />
              Khách hàng
            </h3>

            <div className="space-y-2 text-xs">
              <div>
                <span className="text-slate-500 block">Tên Telegram:</span>
                <span className="font-semibold text-slate-200">{order.telegram_first_name || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Username:</span>
                <span className="font-mono text-emerald-400">
                  {order.telegram_username ? `@${order.telegram_username}` : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Telegram User ID:</span>
                <span className="font-mono text-slate-300">{order.telegram_user_id}</span>
              </div>
            </div>
          </div>

          {/* Payment Info */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
            <h3 className="font-semibold text-sm text-slate-200 flex items-center gap-2 border-b border-slate-800 pb-3">
              <Zap className="w-4 h-4 text-emerald-400" />
              Thông tin thanh toán
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-500 block">Nội dung CK bắt buộc:</span>
                <span className="font-mono font-bold text-emerald-400 text-sm">{order.payment_reference}</span>
              </div>

              <div>
                <span className="text-slate-500 block">Phương thức xác nhận:</span>
                {payment?.verification_method === 'WEBHOOK_SEPAY' ? (
                  <span className="inline-flex items-center gap-1 text-emerald-400 font-medium mt-1">
                    <Zap className="w-3.5 h-3.5" /> 🤖 Auto SePay Webhook
                  </span>
                ) : payment?.verification_method === 'MANUAL' ? (
                  <span className="inline-flex items-center gap-1 text-blue-400 font-medium mt-1">
                    <UserCheck className="w-3.5 h-3.5" /> 👤 Admin xác nhận thủ công
                  </span>
                ) : (
                  <span className="text-slate-400 font-medium mt-1">Chưa xác nhận</span>
                )}
              </div>

              {payment?.transaction_received_at && (
                <div>
                  <span className="text-slate-500 block">Thời gian nhận tiền:</span>
                  <span className="text-slate-300">{formatDateVN(payment.transaction_received_at)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
