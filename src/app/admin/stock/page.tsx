'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Boxes, Upload, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface ProductOption {
  id: string;
  name: string;
  sku: string;
  sale_price: number;
}

export default function AdminStockPage() {
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [stockLines, setStockLines] = useState('');
  const [importNote, setImportNote] = useState('');
  const [broadcastNotify, setBroadcastNotify] = useState(true);
  const [loading, setLoading] = useState(false);
  const [fetchingProducts, setFetchingProducts] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    async function loadProducts() {
      const supabase = createClient();
      const { data } = await supabase
        .from('products')
        .select('id, name, sku, sale_price')
        .eq('is_active', true)
        .order('name');

      if (data) {
        setProducts(data);
        if (data.length > 0) setSelectedProductId(data[0].id);
      }
      setFetchingProducts(false);
    }
    loadProducts();
  }, []);

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (!selectedProductId) {
      setMessage({ type: 'error', text: 'Vui lòng chọn sản phẩm.' });
      return;
    }

    const lineCount = stockLines.split('\n').filter((l) => l.trim().length > 0).length;
    if (lineCount === 0) {
      setMessage({ type: 'error', text: 'Vui lòng nhập ít nhất 1 dòng hàng.' });
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/admin/stock/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProductId,
          stockLines,
          importNote,
          broadcastNotify,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Nhập kho thất bại.' });
      } else {
        const notiMsg = data.broadcastSent ? ' (Đã bắn thông báo Telegram)' : '';
        setMessage({
          type: 'success',
          text: `✅ Đã mã hóa AES-256-GCM và nhập thành công ${data.importedCount} hàng cho sản phẩm "${data.productName}"!${notiMsg}`,
        });
        setStockLines('');
        setImportNote('');
      }
    } catch (err: unknown) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Đã xảy ra lỗi hệ thống.',
      });
    } finally {
      setLoading(false);
    }
  }

  const currentLinesCount = stockLines.split('\n').filter((l) => l.trim().length > 0).length;

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Boxes className="w-5 h-5 text-purple-600" />
          Nhập kho sản phẩm (Bulk Import)
        </h1>
        <p className="text-xs text-slate-500 font-medium mt-1">
          Dữ liệu từng dòng sẽ được mã hóa AES-256-GCM bảo mật trực tiếp trên Server trước khi lưu DB.
        </p>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl border text-sm font-semibold flex items-center gap-3 shadow-xs ${
            message.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <form onSubmit={handleImport} className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-6 space-y-6 shadow-xs">
        {/* Select Product */}
        <div>
          <label htmlFor="stock-product-select" className="block text-xs font-bold text-slate-700 mb-2">
            Chọn sản phẩm nhập kho
          </label>
          {fetchingProducts ? (
            <div className="text-xs text-slate-500 flex items-center gap-2 py-2 font-medium">
              <Loader2 className="w-4 h-4 animate-spin text-purple-600" /> Đang tải danh sách sản phẩm...
            </div>
          ) : (
            <select
              id="stock-product-select"
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-600/10 min-h-[44px]"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Textarea Bulk Input */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="stock-textarea" className="block text-xs font-bold text-slate-700">
              Danh sách tài khoản / Key / Hàng (Mỗi dòng 1 phần quà/account)
            </label>
            <span className="text-xs font-mono text-purple-700 font-bold bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
              {currentLinesCount} dòng được phát hiện
            </span>
          </div>

          <textarea
            id="stock-textarea"
            rows={10}
            value={stockLines}
            onChange={(e) => setStockLines(e.target.value)}
            placeholder={`Chèn danh sách hàng tại đây, mỗi dòng là 1 tài khoản:\nuser1@gmail.com|pass123|keyABC\nuser2@gmail.com|pass456|keyXYZ`}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-mono text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-600/10"
          />
        </div>

        {/* Import Note */}
        <div>
          <label htmlFor="stock-import-note" className="block text-xs font-bold text-slate-700 mb-2">
            Ghi chú đợt nhập (Tùy chọn)
          </label>
          <input
            id="stock-import-note"
            type="text"
            value={importNote}
            onChange={(e) => setImportNote(e.target.value)}
            placeholder="VD: Đợt hàng nhập ngày 30/08 từ đại lý A"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-600/10 min-h-[44px]"
          />
        </div>

        {/* Telegram Broadcast Checkbox */}
        <div className="pt-1">
          <label htmlFor="broadcastNotify" className="min-h-[44px] flex items-center gap-3 cursor-pointer text-sm font-bold text-purple-900 hover:text-purple-700 transition-colors">
            <input
              type="checkbox"
              id="broadcastNotify"
              checked={broadcastNotify}
              onChange={(e) => setBroadcastNotify(e.target.checked)}
              className="w-5 h-5 rounded border-slate-300 text-purple-600 focus:ring-purple-500 shrink-0"
            />
            <span>Gửi tin nhắn thông báo thêm hàng (Restock) lên Telegram</span>
          </label>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || fetchingProducts || currentLinesCount === 0}
          className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-4 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 min-h-[44px] shadow-sm"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Đang mã hóa AES-256 & Lưu kho...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" /> Mã hóa & Nhập {currentLinesCount} dòng kho
            </>
          )}
        </button>
      </form>
    </div>
  );
}
