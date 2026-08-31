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
        <span className="text-xs text-rose-700 font-bold bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200 shadow-xs">
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
            className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-colors disabled:opacity-50 min-h-[44px] shadow-sm"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <UserCheck className="w-4 h-4" />
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
            className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-colors disabled:opacity-50 min-h-[44px] shadow-sm"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Thử lại giao hàng
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
            className="bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 hover:border-rose-600 text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-colors disabled:opacity-50 min-h-[44px] shadow-xs"
          >
            <XCircle className="w-4 h-4" /> Hủy đơn & Trả kho
          </button>
        )}
      </div>
    </div>
  );
}
