'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserCheck, RefreshCw, XCircle, Loader2 } from 'lucide-react';

interface OrderActionsFormProps {
  orderId: string;
  orderStatus: string;
  deliveryStatus?: string;
}

export default function OrderActionsForm({
  orderId,
  orderStatus,
  deliveryStatus,
}: OrderActionsFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAction(actionUrl: string, confirmMsg: string) {
    if (!confirm(confirmMsg)) return;

    setError(null);
    setLoading(true);

    try {
      const res = await fetch(actionUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Thao tác thất bại.');
      } else {
        router.refresh();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Lỗi kết nối.');
    } finally {
      setLoading(false);
    }
  }

  const isPayable = orderStatus === 'AWAITING_PAYMENT';
  const canRetryDelivery =
    orderStatus === 'DELIVERY_PENDING' ||
    deliveryStatus === 'FAILED' ||
    deliveryStatus === 'UNCERTAIN';

  return (
    <div className="flex flex-col items-end gap-2">
      {error && (
        <span className="text-xs text-red-400 font-medium bg-red-500/10 px-3 py-1 rounded border border-red-500/20">
          {error}
        </span>
      )}

      <div className="flex items-center gap-2">
        {/* Manual Confirm Button */}
        {isPayable && (
          <button
            onClick={() =>
              handleAction(
                `/api/admin/orders/${orderId}/confirm-payment`,
                'Bạn có chắc chắn muốn XÁC NHẬN THANH TOÁN THỦ CÔNG cho đơn hàng này?'
              )
            }
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <UserCheck className="w-3.5 h-3.5" />
            )}
            Xác nhận thanh toán thủ công
          </button>
        )}

        {/* Retry Delivery Button */}
        {canRetryDelivery && (
          <button
            onClick={() =>
              handleAction(
                `/api/admin/orders/${orderId}/retry-delivery`,
                'Thử lại giao hàng qua Telegram cho đơn này?'
              )
            }
            disabled={loading}
            className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            Thử lại giao hàng (Retry Delivery)
          </button>
        )}

        {/* Cancel Order Button */}
        {isPayable && (
          <button
            onClick={() =>
              handleAction(
                `/api/admin/orders/${orderId}/cancel`,
                'Hủy đơn hàng và trả lại kho?'
              )
            }
            disabled={loading}
            className="bg-slate-800 hover:bg-rose-950 text-slate-300 hover:text-rose-400 border border-slate-700 hover:border-rose-800 text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <XCircle className="w-3.5 h-3.5" /> Hủy đơn & Trả kho
          </button>
        )}
      </div>
    </div>
  );
}
