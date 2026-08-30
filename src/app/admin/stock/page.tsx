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
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Nhập kho thất bại.' });
      } else {
        setMessage({
          type: 'success',
          text: `✅ Đã mã hóa AES-256-GCM và nhập thành công ${data.importedCount} hàng cho sản phẩm "${data.productName}"!`,
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
        <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <Boxes className="w-5 h-5 text-purple-400" />
          Nhập kho sản phẩm (Bulk Import)
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Dữ liệu từng dòng sẽ được mã hóa AES-256-GCM bảo mật trực tiếp trên Server trước khi lưu DB.
        </p>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl border text-sm flex items-center gap-3 ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-red-500/10 border-red-500/20 text-red-400'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <form onSubmit={handleImport} className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6 shadow-xl">
        {/* Select Product */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-2">
            Chọn sản phẩm nhập kho
          </label>
          {fetchingProducts ? (
            <div className="text-xs text-slate-500 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Đang tải danh sách sản phẩm...
            </div>
          ) : (
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
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
            <label className="block text-xs font-semibold text-slate-300">
              Danh sách tài khoản / Key / Hàng (Mỗi dòng 1 phần quà/account)
            </label>
            <span className="text-xs font-mono text-purple-400 font-semibold">
              {currentLinesCount} dòng được phát hiện
            </span>
          </div>

          <textarea
            rows={10}
            value={stockLines}
            onChange={(e) => setStockLines(e.target.value)}
            placeholder={`Chèn danh sách hàng tại đây, mỗi dòng là 1 tài khoản:\nuser1@gmail.com|pass123|keyABC\nuser2@gmail.com|pass456|keyXYZ`}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-4 font-mono text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
          />
        </div>

        {/* Import Note */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-2">
            Ghi chú đợt nhập (Tùy chọn)
          </label>
          <input
            type="text"
            value={importNote}
            onChange={(e) => setImportNote(e.target.value)}
            placeholder="VD: Đợt hàng nhập ngày 30/08 từ đại lý A"
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || fetchingProducts || currentLinesCount === 0}
          className="w-full bg-purple-600 hover:bg-purple-500 text-white font-semibold py-3 rounded-lg text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
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
