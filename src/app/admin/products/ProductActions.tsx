'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Boxes, Edit, Trash2, Eye, EyeOff, Loader2 } from 'lucide-react';

interface ProductActionsProps {
  productId: string;
  productName: string;
  isActive: boolean;
}

export default function ProductActions({ productId, productName, isActive }: ProductActionsProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState(false);

  async function handleToggleActive() {
    setToggling(true);
    try {
      const res = await fetch('/api/admin/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: productId,
          isActive: !isActive,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(`Cập nhật thất bại: ${data.error || 'Lỗi hệ thống'}`);
      } else {
        router.refresh();
      }
    } catch (err: unknown) {
      alert(`Lỗi kết nối: ${err instanceof Error ? err.message : 'Không xác định'}`);
    } finally {
      setToggling(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Bạn có chắc chắn muốn XÓA sản phẩm "${productName}"?\nThao tác này không thể hoàn tác!`)) {
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/products?id=${productId}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) {
        alert(`Xóa thất bại: ${data.error || 'Lỗi hệ thống'}`);
      } else {
        router.refresh();
      }
    } catch (err: unknown) {
      alert(`Lỗi kết nối: ${err instanceof Error ? err.message : 'Không xác định'}`);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex items-center justify-end gap-1.5">
      <button
        onClick={handleToggleActive}
        disabled={toggling}
        title={isActive ? 'Tạm ẩn sản phẩm trên Telegram Bot' : 'Hiển thị bán hàng trên Telegram Bot'}
        aria-label={`${isActive ? 'Tạm ẩn' : 'Bật bán'} ${productName}`}
        className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border transition-colors shadow-2xs disabled:opacity-50 ${
          isActive
            ? 'bg-amber-50 hover:bg-amber-600 text-amber-700 hover:text-white border-amber-200/80 hover:border-amber-600'
            : 'bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border-emerald-200/80 hover:border-emerald-600'
        }`}
      >
        {toggling ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : isActive ? (
          <EyeOff className="w-4 h-4" />
        ) : (
          <Eye className="w-4 h-4" />
        )}
      </button>
      <Link
        href="/admin/stock"
        title="Nhập kho"
        aria-label={`Nhập kho cho ${productName}`}
        className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-purple-50 hover:bg-purple-600 text-purple-700 hover:text-white border border-purple-200/80 hover:border-purple-600 transition-colors shadow-2xs"
      >
        <Boxes className="w-4 h-4" />
      </Link>
      <Link
        href={`/admin/products/${productId}/edit`}
        title="Chỉnh sửa sản phẩm"
        aria-label={`Chỉnh sửa ${productName}`}
        className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-200/80 hover:border-blue-600 transition-colors shadow-2xs"
      >
        <Edit className="w-4 h-4" />
      </Link>
      <button
        onClick={handleDelete}
        disabled={deleting}
        title="Xóa sản phẩm"
        aria-label={`Xóa sản phẩm ${productName}`}
        className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200/80 hover:border-rose-600 transition-colors shadow-2xs disabled:opacity-50"
      >
        {deleting ? <Loader2 className="w-4 h-4 animate-spin text-rose-600" /> : <Trash2 className="w-4 h-4" />}
      </button>
    </div>
  );
}
