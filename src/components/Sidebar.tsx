import React, { useState } from 'react';
import { useERP, ActiveTab } from '../context/ERPContext';
import {
  LayoutDashboard,
  Users,
  Truck,
  Package,
  Boxes,
  ShoppingCart,
  Receipt,
  FileSpreadsheet,
  Building2,
  Ruler,
  Hammer,
  Calculator,
  BarChart3,
  Settings,
  Activity,
  FileCheck2,
  HardDrive,
  X,
  Search,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Zap
} from 'lucide-react';

interface SidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen = false, onCloseMobile }) => {
  const { lang, activeTab, setActiveTab, state } = useERP();
  const [navSearch, setNavSearch] = useState('');
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const pendingOutbox = state.syncOutbox.filter((i) => i.status === 'pending').length;

  const toggleSection = (sectionKey: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  };

  const navGroups: {
    key: string;
    titleAr: string;
    titleEn: string;
    items: {
      id: ActiveTab;
      labelAr: string;
      labelEn: string;
      icon: React.ReactNode;
      badge?: string | number;
      badgeVariant?: 'primary' | 'emerald' | 'amber' | 'blue' | 'purple' | 'slate';
    }[];
  }[] = [
    {
      key: 'operations',
      titleAr: 'التشغيل والمبيعات',
      titleEn: 'Operations & Sales',
      items: [
        {
          id: 'dashboard',
          labelAr: 'لوحة التحكم والمؤشرات',
          labelEn: 'Dashboard',
          icon: <LayoutDashboard className="w-4 h-4" />,
        },
        {
          id: 'sales',
          labelAr: 'فواتير المبيعات',
          labelEn: 'Sales Invoices',
          icon: <Receipt className="w-4 h-4" />,
          badge: state.salesInvoices.length,
          badgeVariant: 'emerald',
        },
        {
          id: 'customers',
          labelAr: 'سجل العملاء والمقاولين',
          labelEn: 'Customers & Clients',
          icon: <Users className="w-4 h-4" />,
          badge: state.customers.length,
          badgeVariant: 'blue',
        },
        {
          id: 'quotations',
          labelAr: 'عروض الأسعار والتسعير',
          labelEn: 'Quotations & Estimates',
          icon: <FileSpreadsheet className="w-4 h-4" />,
          badge: state.quotations.length,
          badgeVariant: 'amber',
        },
        {
          id: 'projects',
          labelAr: 'المشاريع الإنشائية',
          labelEn: 'Projects & Sites',
          icon: <Building2 className="w-4 h-4" />,
          badge: state.projects.length,
          badgeVariant: 'purple',
        },
        {
          id: 'measurements',
          labelAr: 'المسوحات والمقاسات',
          labelEn: 'Site Measurements',
          icon: <Ruler className="w-4 h-4" />,
          badge: state.measurements.length,
          badgeVariant: 'amber',
        },
      ],
    },
    {
      key: 'manufacturing',
      titleAr: 'التصنيع والهندسة',
      titleEn: 'Manufacturing & Engineering',
      items: [
        {
          id: 'manufacturing',
          labelAr: 'أوامر التصنيع ومحرك التقطيع',
          labelEn: 'Work Orders & Cutting',
          icon: <Hammer className="w-4 h-4" />,
          badge: state.productionOrders.length,
          badgeVariant: 'amber',
        },
      ],
    },
    {
      key: 'inventory',
      titleAr: 'المخزون والتوريد',
      titleEn: 'Supply & Inventory',
      items: [
        {
          id: 'inventory',
          labelAr: 'حركة المخزون والمستودعات',
          labelEn: 'Stock Movements',
          icon: <Boxes className="w-4 h-4" />,
        },
        {
          id: 'products',
          labelAr: 'دليل الأصناف والمقاطع',
          labelEn: 'Products & Profiles',
          icon: <Package className="w-4 h-4" />,
          badge: state.products.length,
          badgeVariant: 'slate',
        },
        {
          id: 'purchases',
          labelAr: 'أوامر الشراء وتوريد الخام',
          labelEn: 'Purchase Orders',
          icon: <ShoppingCart className="w-4 h-4" />,
          badge: state.purchaseOrders.length,
          badgeVariant: 'blue',
        },
        {
          id: 'suppliers',
          labelAr: 'سجل الموردين والخام',
          labelEn: 'Suppliers & Vendors',
          icon: <Truck className="w-4 h-4" />,
          badge: state.suppliers.length,
          badgeVariant: 'slate',
        },
      ],
    },
    {
      key: 'finance',
      titleAr: 'المالية والمحاسبة',
      titleEn: 'Finance & Accounting',
      items: [
        {
          id: 'accounting',
          labelAr: 'دفتر الأستاذ والقيود اليومية',
          labelEn: 'General Ledger (JVs)',
          icon: <Calculator className="w-4 h-4" />,
          badge: `${state.journalEntries.length}`,
          badgeVariant: 'purple',
        },
        {
          id: 'reports',
          labelAr: 'التقارير المالية وميزان المراجعة',
          labelEn: 'Financial Reports & P&L',
          icon: <BarChart3 className="w-4 h-4" />,
        },
      ],
    },
    {
      key: 'system',
      titleAr: 'النظام وحالة التشغيل',
      titleEn: 'System & Health',
      items: [
        {
          id: 'sync_architecture',
          labelAr: 'حالة النظام ومحرك التزامن',
          labelEn: 'System Health & SQLite',
          icon: <Activity className="w-4 h-4" />,
          badge: pendingOutbox > 0 ? `${pendingOutbox} معلق` : undefined,
          badgeVariant: pendingOutbox > 0 ? 'amber' : 'slate',
        },
        {
          id: 'review_gate',
          labelAr: 'حوكمة النظام (Review Gate)',
          labelEn: 'System Governance (Phase 0)',
          icon: <FileCheck2 className="w-4 h-4" />,
          badge: state.isReviewGateApproved ? 'معتمد' : 'بانتظار',
          badgeVariant: state.isReviewGateApproved ? 'emerald' : 'amber',
        },
        {
          id: 'settings',
          labelAr: 'الإعدادات والنسخ الاحتياطي',
          labelEn: 'Settings & DB Backup',
          icon: <Settings className="w-4 h-4" />,
        },
      ],
    },
  ];

  const handleItemClick = (id: ActiveTab) => {
    setActiveTab(id);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const getBadgeStyle = (variant?: string, isActive?: boolean) => {
    if (isActive) return 'bg-slate-950 text-amber-400 font-bold';
    switch (variant) {
      case 'emerald':
        return 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20';
      case 'amber':
        return 'bg-amber-500/15 text-amber-400 border border-amber-500/20';
      case 'blue':
        return 'bg-sky-500/15 text-sky-400 border border-sky-500/20';
      case 'purple':
        return 'bg-purple-500/15 text-purple-400 border border-purple-500/20';
      default:
        return 'bg-slate-800 text-slate-300 border border-slate-700';
    }
  };

  const sidebarContent = (
    <div className="flex flex-col h-full justify-between p-3.5 space-y-4">
      <div className="space-y-3">
        {/* Mobile Header with Close Button */}
        <div className="md:hidden flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-slate-950 font-black">
              W
            </div>
            <span className="font-bold text-white text-sm">
              {lang === 'ar' ? 'قائمة أقسام النظام' : 'Navigation Modules'}
            </span>
          </div>
          <button
            onClick={onCloseMobile}
            className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Nav Search Filter */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute right-3 rtl:right-3 rtl:left-auto left-auto top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={navSearch}
            onChange={(e) => setNavSearch(e.target.value)}
            placeholder={lang === 'ar' ? 'بحث سريع في القوائم...' : 'Quick find module...'}
            className="w-full min-h-[38px] bg-slate-950 border border-slate-800 rounded-xl pr-8 pl-3 rtl:pr-8 rtl:pl-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
          />
          {navSearch && (
            <button
              onClick={() => setNavSearch('')}
              className="absolute left-2.5 rtl:left-2.5 rtl:right-auto top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
            >
              ×
            </button>
          )}
        </div>

        {/* Navigation Groups */}
        <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-250px)] pr-0.5">
          {navGroups.map((group) => {
            const filteredItems = group.items.filter((item) => {
              if (!navSearch) return true;
              const q = navSearch.toLowerCase();
              return (
                item.labelAr.toLowerCase().includes(q) ||
                item.labelEn.toLowerCase().includes(q)
              );
            });

            if (filteredItems.length === 0) return null;
            const isCollapsed = !!collapsedSections[group.key] && !navSearch;

            return (
              <div key={group.key} className="space-y-1">
                <button
                  type="button"
                  onClick={() => toggleSection(group.key)}
                  className="w-full flex items-center justify-between px-2.5 py-1 text-[11px] font-bold text-slate-400 hover:text-slate-200 transition cursor-pointer"
                >
                  <span className="uppercase tracking-wider">
                    {lang === 'ar' ? group.titleAr : group.titleEn}
                  </span>
                  <span className="text-slate-500">
                    {isCollapsed ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
                  </span>
                </button>

                {!isCollapsed && (
                  <nav className="space-y-0.5">
                    {filteredItems.map((item) => {
                      const isActive = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleItemClick(item.id)}
                          className={`w-full min-h-[44px] flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                            isActive
                              ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                              : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className={isActive ? 'text-slate-950' : 'text-amber-400'}>
                              {item.icon}
                            </span>
                            <span className="truncate max-w-[140px] sm:max-w-[160px]">
                              {lang === 'ar' ? item.labelAr : item.labelEn}
                            </span>
                          </div>
                          {item.badge !== undefined && (
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-bold font-mono ${getBadgeStyle(
                                item.badgeVariant,
                                isActive
                              )}`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </nav>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* System Health / Local DB Footer */}
      <div className="pt-2 border-t border-slate-800/80 space-y-2">
        <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5 text-slate-200 font-bold text-[11px]">
              <HardDrive className="w-3.5 h-3.5 text-amber-400" />
              <span>SQLite + SQLCipher</span>
            </div>
            <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
              {lang === 'ar' ? 'مشفر محلياً' : 'Encrypted'}
            </span>
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <span>{lang === 'ar' ? 'المزامنة:' : 'Sync Queue:'}</span>
            <span className="font-mono font-bold text-slate-300">
              {pendingOutbox > 0
                ? `${pendingOutbox} ${lang === 'ar' ? 'عملية معلقة' : 'pending'}`
                : lang === 'ar'
                ? 'متطابق ومحدث'
                : 'Synced'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:block w-64 lg:w-72 bg-slate-900/90 border-r border-slate-800 shrink-0 min-h-[calc(100vh-61px)]">
        {sidebarContent}
      </aside>

      {/* Mobile Slide-Out Drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative w-4/5 max-w-xs bg-slate-900 border-r border-slate-800 h-full shadow-2xl z-10 flex flex-col animate-in slide-in-from-right rtl:slide-in-from-right ltr:slide-in-from-left">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
