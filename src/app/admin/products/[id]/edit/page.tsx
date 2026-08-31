'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, Save, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import Link from 'next/link';

interface Category {
  id: string;
  name: string;
  emoji: string | null;
}

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const productId = resolvedParams.id;
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    id: '',
    sku: '',
    name: '',
    description: '',
    categoryId: '',
    salePrice: 0,
    warrantyText: '',
    deliveryNote: '',
    minQuantity: 1,
    maxQuantity: 1,
    lowStockThreshold: 3,
    isActive: true,
  });

  useEffect(() => {
    async function loadData() {
      const supabase = createClient();

      // Load Categories
      const { data: catData } = await supabase
        .from('categories')
        .select('id, name, emoji')
        .order('sort_order');
      if (catData) setCategories(catData);

      // Load Product
      const { data: product, error: prodErr } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();

      if (prodErr || !product) {
        setError('Không tìm thấy thông tin sản phẩm.');
      } else {
        setFormData({
          id: product.id,
          sku: product.sku || '',
          name: product.name || '',
          description: product.description || '',
          categoryId: product.category_id || '',
          salePrice: Number(product.sale_price) || 0,
          warrantyText: product.warranty_text || '',
          deliveryNote: product.delivery_note || '',
          minQuantity: product.min_quantity || 1,
          maxQuantity: product.max_quantity || 1,
          lowStockThreshold: product.low_stock_threshold || 3,
          isActive: product.is_active ?? true,
        });
      }
      setInitialLoading(false);
    }

    loadData();
  }, [productId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const res = await fetch('/api/admin/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Cập nhật sản phẩm thất bại.');
      } else {
        setSuccess('✅ Đã cập nhật thông tin sản phẩm thành công!');
        setTimeout(() => {
          router.push('/admin/products');
          router.refresh();
        }, 1200);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Đã xảy ra lỗi.');
    } finally {
      setLoading(false);
    }
  }

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-500 gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
        <span className="text-xs font-semibold">Đang tải thông tin sản phẩm...</span>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/products"
          aria-label="Quay lại danh sách sản phẩm"
          className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Chỉnh sửa sản phẩm</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Cập nhật thông tin chi tiết sản phẩm #{formData.sku}</p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-semibold flex items-center gap-3 shadow-xs">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold flex items-center gap-3 shadow-xs">
          <CheckCircle className="w-5 h-5 shrink-0 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200/80 rounded-2xl p-6 space-y-6 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="sku-input" className="block text-xs font-bold text-slate-700 mb-1.5">Mã SKU *</label>
            <input
              id="sku-input"
              type="text"
              required
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
              placeholder="VD: PROD-AI-01"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 font-mono focus:bg-white focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/10 transition-colors min-h-[44px]"
            />
          </div>

          <div>
            <label htmlFor="category-select" className="block text-xs font-bold text-slate-700 mb-1.5">Danh mục</label>
            <select
              id="category-select"
              value={formData.categoryId}
              onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/10 transition-colors min-h-[44px]"
            >
              <option value="">-- Chọn danh mục --</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.emoji || '📦'} {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="name-input" className="block text-xs font-bold text-slate-700 mb-1.5">Tên sản phẩm *</label>
          <input
            id="name-input"
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="VD: Tài khoản Pro 1 Tháng"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 font-semibold focus:bg-white focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/10 transition-colors min-h-[44px]"
          />
        </div>

        <div>
          <label htmlFor="price-input" className="block text-xs font-bold text-slate-700 mb-1.5">Giá bán (VND) *</label>
          <input
            id="price-input"
            type="number"
            required
            min={0}
            step="any"
            value={formData.salePrice}
            onChange={(e) => setFormData({ ...formData, salePrice: Number(e.target.value) })}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 font-bold focus:bg-white focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/10 transition-colors min-h-[44px]"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="warranty-input" className="block text-xs font-bold text-slate-700 mb-1.5">Thông tin bảo hành</label>
            <input
              id="warranty-input"
              type="text"
              value={formData.warrantyText}
              onChange={(e) => setFormData({ ...formData, warrantyText: e.target.value })}
              placeholder="VD: Bảo hành 30 ngày 1 đổi 1"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/10 transition-colors min-h-[44px]"
            />
          </div>

          <div>
            <label htmlFor="delivery-note-input" className="block text-xs font-bold text-slate-700 mb-1.5">Ghi chú giao hàng</label>
            <input
              id="delivery-note-input"
              type="text"
              value={formData.deliveryNote}
              onChange={(e) => setFormData({ ...formData, deliveryNote: e.target.value })}
              placeholder="VD: Giao ngay tự động qua Telegram"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/10 transition-colors min-h-[44px]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="min-qty-input" className="block text-xs font-bold text-slate-700 mb-1.5">Số lượng mua tối thiểu</label>
            <input
              id="min-qty-input"
              type="number"
              min={1}
              value={formData.minQuantity}
              onChange={(e) => setFormData({ ...formData, minQuantity: Number(e.target.value) })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/10 transition-colors min-h-[44px]"
            />
          </div>

          <div>
            <label htmlFor="max-qty-input" className="block text-xs font-bold text-slate-700 mb-1.5">Số lượng mua tối đa</label>
            <input
              id="max-qty-input"
              type="number"
              min={1}
              value={formData.maxQuantity}
              onChange={(e) => setFormData({ ...formData, maxQuantity: Number(e.target.value) })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/10 transition-colors min-h-[44px]"
            />
          </div>

          <div>
            <label htmlFor="low-stock-input" className="block text-xs font-bold text-slate-700 mb-1.5">Ngưỡng báo sắp hết hàng</label>
            <input
              id="low-stock-input"
              type="number"
              min={0}
              value={formData.lowStockThreshold}
              onChange={(e) => setFormData({ ...formData, lowStockThreshold: Number(e.target.value) })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/10 transition-colors min-h-[44px]"
            />
          </div>
        </div>

        <div>
          <label htmlFor="description-input" className="block text-xs font-bold text-slate-700 mb-1.5">Mô tả chi tiết</label>
          <textarea
            id="description-input"
            rows={4}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Mô tả sản phẩm hiển thị trên Telegram bot..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/10 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isActive"
            checked={formData.isActive}
            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
            className="w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 shrink-0"
          />
          <label htmlFor="isActive" className="text-sm font-bold text-slate-800 cursor-pointer min-h-[44px] flex items-center">
            Hiển thị bán hàng ngay (Active)
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 min-h-[44px] shadow-sm"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Đang cập nhật...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" /> Cập nhật sản phẩm
            </>
          )}
        </button>
      </form>
    </div>
  );
}
