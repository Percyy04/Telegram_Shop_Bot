'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  FolderTree,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  XCircle,
  Package,
} from 'lucide-react';

export interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  emoji: string | null;
  sort_order: number;
  is_active: boolean;
  product_count?: number;
}

interface CategoryManagerProps {
  initialCategories: CategoryItem[];
}

export default function CategoryManager({ initialCategories }: CategoryManagerProps) {
  const router = useRouter();
  const [categories, setCategories] = useState<CategoryItem[]>(initialCategories);

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [emoji, setEmoji] = useState('📦');
  const [sortOrder, setSortOrder] = useState<number>(0);
  const [isActive, setIsActive] = useState<boolean>(true);

  // Statuses
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  function resetForm() {
    setEditingId(null);
    setName('');
    setSlug('');
    setEmoji('📦');
    setSortOrder(0);
    setIsActive(true);
  }

  function handleEditClick(cat: CategoryItem) {
    setEditingId(cat.id);
    setName(cat.name);
    setSlug(cat.slug);
    setEmoji(cat.emoji || '📦');
    setSortOrder(cat.sort_order || 0);
    setIsActive(cat.is_active);
    setMessage(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setMessage({ type: 'error', text: 'Vui lòng nhập tên danh mục.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    const isEdit = Boolean(editingId);
    const endpoint = '/api/admin/categories';
    const method = isEdit ? 'PUT' : 'POST';
    const payload = {
      id: editingId,
      name: name.trim(),
      slug: slug.trim(),
      emoji: emoji.trim() || '📦',
      sortOrder,
      isActive,
    };

    try {
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Thao tác thất bại' });
      } else {
        setMessage({
          type: 'success',
          text: isEdit ? 'Cập nhật danh mục thành công!' : 'Tạo danh mục mới thành công!',
        });
        resetForm();
        router.refresh();
        fetchLatestCategories();
      }
    } catch (err: unknown) {
      setMessage({
        type: 'error',
        text: `Lỗi kết nối: ${err instanceof Error ? err.message : 'Không xác định'}`,
      });
    } finally {
      setLoading(false);
    }
  }

  async function fetchLatestCategories() {
    try {
      const res = await fetch('/api/admin/categories');
      if (res.ok) {
        const data = await res.json();
        if (data.categories) {
          setCategories(data.categories);
        }
      }
    } catch (err) {
      console.error('Failed to fetch latest categories:', err);
    }
  }

  async function handleToggleActive(cat: CategoryItem) {
    setActionId(cat.id);
    try {
      const res = await fetch('/api/admin/categories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: cat.id,
          isActive: !cat.is_active,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(`Cập nhật thất bại: ${data.error || 'Lỗi hệ thống'}`);
      } else {
        setCategories((prev) =>
          prev.map((c) => (c.id === cat.id ? { ...c, is_active: !cat.is_active } : c))
        );
        router.refresh();
      }
    } catch (err: unknown) {
      alert(`Lỗi kết nối: ${err instanceof Error ? err.message : 'Không xác định'}`);
    } finally {
      setActionId(null);
    }
  }

  async function handleDelete(cat: CategoryItem) {
    if (
      !confirm(
        `Bạn có chắc chắn muốn XÓA danh mục "${cat.name}"?\nCác sản phẩm thuộc danh mục này sẽ được chuyển về không phân loại.`
      )
    ) {
      return;
    }

    setActionId(cat.id);
    try {
      const res = await fetch(`/api/admin/categories?id=${cat.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) {
        alert(`Xóa thất bại: ${data.error || 'Lỗi hệ thống'}`);
      } else {
        setCategories((prev) => prev.filter((c) => c.id !== cat.id));
        if (editingId === cat.id) resetForm();
        router.refresh();
      }
    } catch (err: unknown) {
      alert(`Lỗi kết nối: ${err instanceof Error ? err.message : 'Không xác định'}`);
    } finally {
      setActionId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Quản lý danh mục</h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Phân loại và quản lý thứ tự hiển thị danh mục sản phẩm trên Telegram Bot
          </p>
        </div>
      </div>

      {/* Alert Notification */}
      {message && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 text-xs font-semibold ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Form Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
        <h2 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
          <FolderTree className="w-4 h-4 text-indigo-600" />
          {editingId ? 'Chỉnh sửa danh mục' : 'Thêm danh mục mới'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Emoji */}
            <div>
              <label htmlFor="catEmoji" className="block text-xs font-bold text-slate-700 mb-1.5">
                Emoji biểu tượng
              </label>
              <input
                id="catEmoji"
                type="text"
                value={emoji}
                onChange={(e) => setEmoji(e.target.value)}
                placeholder="📦"
                className="w-full text-center px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 min-h-[44px]"
              />
            </div>

            {/* Name */}
            <div className="md:col-span-2">
              <label htmlFor="catName" className="block text-xs font-bold text-slate-700 mb-1.5">
                Tên danh mục <span className="text-rose-500">*</span>
              </label>
              <input
                id="catName"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="VD: Tài khoản AI (ChatGPT, Claude)"
                required
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 min-h-[44px]"
              />
            </div>

            {/* Sort Order */}
            <div>
              <label htmlFor="catSortOrder" className="block text-xs font-bold text-slate-700 mb-1.5">
                Thứ tự hiển thị
              </label>
              <input
                id="catSortOrder"
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(parseInt(e.target.value || '0', 10))}
                placeholder="0"
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 min-h-[44px]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            {/* Slug */}
            <div>
              <label htmlFor="catSlug" className="block text-xs font-bold text-slate-700 mb-1.5">
                Đường dẫn Slug (Tùy chọn)
              </label>
              <input
                id="catSlug"
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="VD: ai-accounts (Tự tạo nếu để trống)"
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 min-h-[44px]"
              />
            </div>

            {/* Checkbox & Buttons */}
            <div className="flex items-center justify-between md:justify-end gap-4 pt-4 md:pt-0">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                />
                <span className="text-xs font-bold text-slate-700">Hiển thị danh mục (Active)</span>
              </label>

              <div className="flex items-center gap-2">
                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl min-h-[44px] transition-colors"
                  >
                    Hủy
                  </button>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 transition-colors min-h-[44px] shadow-sm disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : editingId ? (
                    'Cập nhật danh mục'
                  ) : (
                    <>
                      <Plus className="w-4 h-4" /> Thêm danh mục
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Categories Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50/80 text-slate-600 text-xs font-bold uppercase tracking-wider border-b border-slate-200/80">
              <tr>
                <th className="px-6 py-4 w-20">Thứ tự</th>
                <th className="px-6 py-4">Danh mục</th>
                <th className="px-6 py-4">Slug</th>
                <th className="px-6 py-4">Số sản phẩm</th>
                <th className="px-6 py-4">Trạng thái</th>
                <th className="px-6 py-4 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {categories.length > 0 ? (
                categories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 font-mono text-xs font-bold text-slate-700 border border-slate-200">
                        #{cat.sort_order}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200/80 flex items-center justify-center text-lg shrink-0">
                          {cat.emoji || '📦'}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{cat.name}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-xs font-mono font-medium text-slate-500">
                      {cat.slug}
                    </td>

                    <td className="px-6 py-4">
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200 inline-flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5" />
                        {cat.product_count || 0} sản phẩm
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                          cat.is_active
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {cat.is_active ? 'Đang hiện' : 'Tạm ẩn'}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleToggleActive(cat)}
                          disabled={actionId === cat.id}
                          title={cat.is_active ? 'Tạm ẩn danh mục' : 'Hiển thị danh mục'}
                          aria-label={`${cat.is_active ? 'Tạm ẩn' : 'Hiển thị'} ${cat.name}`}
                          className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border transition-colors shadow-2xs disabled:opacity-50 ${
                            cat.is_active
                              ? 'bg-amber-50 hover:bg-amber-600 text-amber-700 hover:text-white border-amber-200/80 hover:border-amber-600'
                              : 'bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border-emerald-200/80 hover:border-emerald-600'
                          }`}
                        >
                          {actionId === cat.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : cat.is_active ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>

                        <button
                          onClick={() => handleEditClick(cat)}
                          title="Chỉnh sửa danh mục"
                          aria-label={`Chỉnh sửa ${cat.name}`}
                          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-200/80 hover:border-blue-600 transition-colors shadow-2xs"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleDelete(cat)}
                          disabled={actionId === cat.id}
                          title="Xóa danh mục"
                          aria-label={`Xóa ${cat.name}`}
                          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200/80 hover:border-rose-600 transition-colors shadow-2xs disabled:opacity-50"
                        >
                          {actionId === cat.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-rose-600" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-xs text-slate-500 font-medium">
                    Chưa có danh mục nào. Điền thông tin vào mẫu trên để bắt đầu tạo.
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
