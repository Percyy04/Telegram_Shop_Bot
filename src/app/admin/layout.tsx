import Link from 'next/link';
import { getAuthenticatedAdmin } from '@/lib/auth';

import {
  LayoutDashboard,
  Package,
  Boxes,
  ShoppingCart,
  ShieldAlert,
  LogOut,
  Bot,
} from 'lucide-react';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await getAuthenticatedAdmin();

  return (
    <div className="min-h-screen flex bg-slate-950 text-slate-100 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between shrink-0">
        <div>
          {/* Logo / Brand Header */}
          <div className="h-16 flex items-center px-6 border-b border-slate-800 gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-sm leading-none text-slate-100">Shop Bot Admin</h2>
              <span className="text-[10px] text-emerald-400 font-medium">SePay Webhook Active</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            <Link
              href="/admin"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <LayoutDashboard className="w-4 h-4 text-emerald-400" />
              <span>Tổng quan</span>
            </Link>

            <Link
              href="/admin/products"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <Package className="w-4 h-4 text-blue-400" />
              <span>Sản phẩm</span>
            </Link>

            <Link
              href="/admin/stock"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <Boxes className="w-4 h-4 text-purple-400" />
              <span>Nhập kho (Stock)</span>
            </Link>

            <Link
              href="/admin/orders"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <ShoppingCart className="w-4 h-4 text-amber-400" />
              <span>Đơn hàng</span>
            </Link>

            <Link
              href="/admin/warranties"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <span>Bảo hành</span>
            </Link>
          </nav>
        </div>

        {/* User Info Footer */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between">
          <div className="truncate">
            <p className="text-xs font-medium text-slate-200 truncate">
              {admin?.display_name || admin?.email || 'Administrator'}
            </p>
            <p className="text-[10px] text-slate-500 truncate">{admin?.email}</p>
          </div>
          <form action="/api/admin/logout" method="POST">
            <button
              type="submit"
              title="Đăng xuất"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        <header className="h-16 border-b border-slate-800 px-8 flex items-center justify-between bg-slate-900/50 backdrop-blur">
          <h1 className="text-sm font-semibold text-slate-200">Quản trị hệ thống bán hàng Telegram</h1>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              SePay Webhook Online
            </span>
          </div>
        </header>

        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
