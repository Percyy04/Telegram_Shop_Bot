'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FolderTree,
  Package,
  Boxes,
  ShoppingCart,
  ShieldAlert,
  LogOut,
  Bot,
  Menu,
  X,
} from 'lucide-react';

interface AdminSidebarProps {
  adminEmail?: string | null;
  adminName?: string | null;
}

export default function AdminSidebar({ adminEmail, adminName }: AdminSidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  const navItems = [
    { href: '/admin', label: 'Tổng quan', icon: LayoutDashboard, color: 'text-emerald-600' },
    { href: '/admin/categories', label: 'Danh mục', icon: FolderTree, color: 'text-indigo-600' },
    { href: '/admin/products', label: 'Sản phẩm', icon: Package, color: 'text-blue-600' },
    { href: '/admin/stock', label: 'Nhập kho (Stock)', icon: Boxes, color: 'text-purple-600' },
    { href: '/admin/orders', label: 'Đơn hàng', icon: ShoppingCart, color: 'text-amber-600' },
    { href: '/admin/warranties', label: 'Bảo hành', icon: ShieldAlert, color: 'text-rose-600' },
  ];

  return (
    <>
      {/* Mobile Header Bar */}
      <div className="lg:hidden h-16 bg-white border-b border-slate-200 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-600 shadow-sm">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-xs leading-none text-slate-900">Shop Bot Admin</h2>
            <span className="text-[10px] text-emerald-600 font-semibold">SePay Active</span>
          </div>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? 'Đóng menu' : 'Mở menu'}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="lg:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40"
        />
      )}

      {/* Sidebar (Desktop + Mobile Drawer) */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0
          transition-transform duration-200 ease-in-out shadow-sm
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div>
          {/* Logo / Brand Header */}
          <div className="h-16 flex items-center px-6 border-b border-slate-200 gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-600 shadow-sm">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-sm leading-none text-slate-900">Shop Bot Admin</h2>
              <span className="text-[10px] text-emerald-600 font-semibold">SePay Webhook Active</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`group relative flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold transition-all duration-200 min-h-[44px] ${
                    isActive
                      ? 'bg-emerald-50/80 text-emerald-950 shadow-sm border border-emerald-200/80'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                  }`}
                >
                  {isActive && (
                    <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-emerald-600 shadow-sm shadow-emerald-500/30" />
                  )}
                  <div className={`p-1.5 rounded-lg ${isActive ? 'bg-white shadow-xs' : 'group-hover:bg-white'} transition-colors`}>
                    <Icon className={`w-4 h-4 ${item.color}`} />
                  </div>
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Info Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/60 flex items-center justify-between">
          <div className="truncate pr-2">
            <p className="text-xs font-bold text-slate-800 truncate">
              {adminName || adminEmail || 'Administrator'}
            </p>
            <p className="text-[10px] text-slate-500 truncate">{adminEmail}</p>
          </div>
          <form action="/api/admin/logout" method="POST">
            <button
              type="submit"
              title="Đăng xuất"
              aria-label="Đăng xuất khỏi hệ thống"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:text-rose-700 hover:bg-slate-200/60 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
