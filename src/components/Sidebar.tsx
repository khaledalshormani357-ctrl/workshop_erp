import React from 'react';
import { useERP, ActiveTab } from '../context/ERPContext';
import {
  LayoutDashboard,
  ShoppingCart,
  Boxes,
  Calculator,
  Hammer,
  RefreshCw,
  FileCheck2,
  Settings,
  HardDrive,
  Cpu,
  Receipt,
  FileText
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { lang, activeTab, setActiveTab, state } = useERP();

  const pendingOutbox = state.syncOutbox.filter((i) => i.status === 'pending').length;

  const navItems: {
    id: ActiveTab;
    labelEn: string;
    labelAr: string;
    icon: React.ReactNode;
    badge?: string | number;
    badgeColor?: string;
  }[] = [
    {
      id: 'dashboard',
      labelEn: 'Dashboard',
      labelAr: 'لوحة التحكم والمؤشرات',
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      id: 'operations',
      labelEn: 'Operations & Sales',
      labelAr: 'المبيعات والعمليات',
      icon: <ShoppingCart className="w-5 h-5" />,
      badge: state.salesInvoices.length,
      badgeColor: 'bg-blue-500/20 text-blue-400',
    },
    {
      id: 'inventory',
      labelEn: 'Inventory & Stock',
      labelAr: 'المخزون والمستودعات',
      icon: <Boxes className="w-5 h-5" />,
      badge: state.products.length,
      badgeColor: 'bg-emerald-500/20 text-emerald-400',
    },
    {
      id: 'accounting',
      labelEn: 'Double-Entry Accounting',
      labelAr: 'المحاسبة والقيد المزدوج',
      icon: <Calculator className="w-5 h-5" />,
      badge: `${state.journalEntries.length} JVs`,
      badgeColor: 'bg-purple-500/20 text-purple-400',
    },
    {
      id: 'manufacturing',
      labelEn: 'Workshop & Manufacturing',
      labelAr: 'التصنيع وشجرة المواد (BOM)',
      icon: <Hammer className="w-5 h-5" />,
      badge: state.productionOrders.length,
      badgeColor: 'bg-amber-500/20 text-amber-400',
    },
    {
      id: 'sync_architecture',
      labelEn: 'Sync Engine & SQLite',
      labelAr: 'المعمارية ومحرك التزامن',
      icon: <Cpu className="w-5 h-5" />,
      badge: pendingOutbox > 0 ? `${pendingOutbox} pending` : undefined,
      badgeColor: 'bg-amber-500 text-slate-950 font-bold',
    },
    {
      id: 'review_gate',
      labelEn: 'Phase 0 Review Gate',
      labelAr: 'بوابة اعتماد المرحلة 0',
      icon: <FileCheck2 className="w-5 h-5" />,
      badge: state.isReviewGateApproved ? 'Approved' : 'Pending',
      badgeColor: state.isReviewGateApproved
        ? 'bg-emerald-500/20 text-emerald-400'
        : 'bg-amber-500/20 text-amber-400 animate-pulse',
    },
    {
      id: 'settings',
      labelEn: 'Settings & Backup',
      labelAr: 'الإعدادات والنسخ الاحتياطي',
      icon: <Settings className="w-5 h-5" />,
    },
  ];

  return (
    <aside className="w-full md:w-64 bg-slate-900 border-r border-slate-800 md:min-h-[calc(100vh-65px)] p-3 flex flex-col justify-between">
      <div className="space-y-1">
        <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          {lang === 'ar' ? 'الوحدات التشغيلية للمصنع' : 'ERP Modules'}
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-bold'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={isActive ? 'text-slate-950' : 'text-amber-400'}>
                    {item.icon}
                  </span>
                  <span>{lang === 'ar' ? item.labelAr : item.labelEn}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-full ${
                      isActive ? 'bg-slate-950/20 text-slate-950' : item.badgeColor
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Workshop Local DB Status Card */}
      <div className="mt-6 p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5 text-slate-200 font-semibold">
            <HardDrive className="w-3.5 h-3.5 text-amber-400" />
            <span>SQLite + SQLCipher</span>
          </div>
          <span className="text-[10px] text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-800">
            Encrypted
          </span>
        </div>
        <p className="text-[11px] leading-relaxed text-slate-400">
          {lang === 'ar'
            ? 'قاعدة البيانات المحلية تعمل بكامل طاقتها دون الحاجة للإنترنت.'
            : 'Operational source of truth active on device.'}
        </p>
      </div>
    </aside>
  );
};
