import { getAuthenticatedAdmin } from '@/lib/auth';
import AdminSidebar from './AdminSidebar';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await getAuthenticatedAdmin();

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50 text-slate-900 font-sans">
      <AdminSidebar
        adminEmail={admin?.email}
        adminName={admin?.display_name}
      />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        <header className="h-16 border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between bg-white/80 backdrop-blur sticky top-0 z-30">
          <h1 className="text-xs sm:text-sm font-bold text-slate-800 truncate pr-2">
            Quản trị hệ thống bán hàng Telegram
          </h1>
          <div className="flex items-center gap-3 shrink-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="hidden sm:inline">SePay Webhook Online</span>
              <span className="sm:hidden">Online</span>
            </span>
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}

