import React, { useState } from 'react';
import { useERP } from '../context/ERPContext';
import { UserRole } from '../types';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  Globe,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  Layers,
  FileDown,
  Loader2,
  Menu,
  HardDrive
} from 'lucide-react';
import { generateWorkshopERPWordReport } from '../utils/exportDocx';

interface HeaderProps {
  onToggleMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileMenu }) => {
  const {
    state,
    lang,
    setLang,
    currentUser,
    setCurrentUserRole,
    toggleOnline,
    triggerSync,
    setActiveTab,
  } = useERP();

  const [isExportingDocx, setIsExportingDocx] = useState(false);

  const handleExportWord = async () => {
    try {
      setIsExportingDocx(true);
      await generateWorkshopERPWordReport();
    } catch (err) {
      console.error('Failed to generate Word report:', err);
    } finally {
      setIsExportingDocx(false);
    }
  };

  const pendingOutboxCount = state.syncOutbox.filter((item) => item.status === 'pending').length;

  const roles: { role: UserRole; labelEn: string; labelAr: string }[] = [
    { role: 'owner', labelEn: 'Owner (Khaled)', labelAr: 'المالك (خالد الشرماني)' },
    { role: 'accountant', labelEn: 'Accountant (Ahmed)', labelAr: 'المحاسب (أحمد الحيمي)' },
    { role: 'production', labelEn: 'Production (Yasser)', labelAr: 'مشرف الإنتاج (ياسر القاضي)' },
    { role: 'storekeeper', labelEn: 'Storekeeper (Sultan)', labelAr: 'أمين المستودع (سلطان)' },
    { role: 'sales', labelEn: 'Sales / Cashier', labelAr: 'مسؤول المبيعات' },
  ];

  return (
    <header className="bg-slate-900/95 backdrop-blur border-b border-slate-800 text-slate-100 sticky top-0 z-40 px-3 sm:px-4 py-2.5 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-3">
        {/* Left / Brand & Mobile Toggle */}
        <div className="flex items-center gap-2 sm:gap-3">
          {onToggleMobileMenu && (
            <button
              onClick={onToggleMobileMenu}
              className="md:hidden w-10 h-10 rounded-xl bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer transition active:scale-95"
              aria-label="Toggle Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <div
            onClick={() => setActiveTab('dashboard')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-amber-500/20 group-hover:scale-105 transition">
              <Layers className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-black text-sm sm:text-base tracking-tight text-white leading-tight">
                  {lang === 'ar' ? state.tenant.name_ar : state.tenant.name}
                </h1>
                <span className="hidden sm:inline-block text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  ERP v1.0
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden xs:block">
                {lang === 'ar'
                  ? 'نظام إدارة ورش الألمنيوم والحديد والواجهات'
                  : 'Aluminium & Steel Workshop ERP (Offline-First)'}
              </p>
            </div>
          </div>
        </div>

        {/* Right / Status Badges & Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Phase 0 Sign-Off Status Pill */}
          <button
            onClick={() => setActiveTab('review_gate')}
            className={`hidden lg:flex text-xs px-2.5 py-1.5 rounded-xl items-center gap-1.5 font-bold transition border cursor-pointer ${
              state.isReviewGateApproved
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20 animate-pulse'
            }`}
          >
            {state.isReviewGateApproved ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>{lang === 'ar' ? 'المرحلة 0: معتمدة' : 'Phase 0: Approved'}</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>{lang === 'ar' ? 'المرحلة 0: اعتماد' : 'Phase 0: Review'}</span>
              </>
            )}
          </button>

          {/* User Role Switcher */}
          <div className="hidden sm:flex items-center bg-slate-800/80 border border-slate-700/80 rounded-xl px-2.5 py-1 text-xs">
            <UserCheck className="w-3.5 h-3.5 text-amber-400 mr-1.5 rtl:ml-1.5 rtl:mr-0" />
            <select
              value={currentUser.role}
              onChange={(e) => setCurrentUserRole(e.target.value as UserRole)}
              className="bg-transparent text-slate-200 text-xs font-semibold focus:outline-none cursor-pointer pr-3 rtl:pl-3"
            >
              {roles.map((r) => (
                <option key={r.role} value={r.role} className="bg-slate-900 text-slate-200">
                  {lang === 'ar' ? r.labelAr : r.labelEn}
                </option>
              ))}
            </select>
          </div>

          {/* Offline/Online Network Indicator */}
          <button
            onClick={toggleOnline}
            title={lang === 'ar' ? 'التبديل بين وضع الاتصال ووضع عدم الاتصال' : 'Toggle Online/Offline mode'}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer min-h-[38px] ${
              state.isOnline
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                : 'bg-amber-500/15 border-amber-500/40 text-amber-400 hover:bg-amber-500/25'
            }`}
          >
            {state.isOnline ? (
              <>
                <Wifi className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">{lang === 'ar' ? 'متصل' : 'Online'}</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">{lang === 'ar' ? 'غير متصل (محلي)' : 'Offline (Local)'}</span>
              </>
            )}
          </button>

          {/* Outbox Sync Trigger */}
          <button
            onClick={triggerSync}
            disabled={!state.isOnline || state.isSyncing}
            title={lang === 'ar' ? 'مزامنة البيانات مع السحابة' : 'Sync data to cloud'}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer min-h-[38px] ${
              pendingOutboxCount > 0
                ? 'bg-amber-500 text-slate-950 border-amber-400 hover:bg-amber-400 shadow-md shadow-amber-500/20'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 disabled:opacity-50'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${state.isSyncing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{lang === 'ar' ? 'مزامنة' : 'Sync'}</span>
            {pendingOutboxCount > 0 && (
              <span className="bg-slate-950 text-amber-400 text-[10px] font-mono font-black px-1.5 py-0.2 rounded-full">
                {pendingOutboxCount}
              </span>
            )}
          </button>

          {/* Word (.docx) Technical Report Export */}
          <button
            onClick={handleExportWord}
            disabled={isExportingDocx}
            title={lang === 'ar' ? 'تصدير التقرير الفني الشامل بصيغة وورد (.docx)' : 'Export Technical Report as Word (.docx)'}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 shadow-sm transition disabled:opacity-50 cursor-pointer min-h-[38px]"
          >
            {isExportingDocx ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-300" />
            ) : (
              <FileDown className="w-3.5 h-3.5 text-blue-300" />
            )}
            <span>{lang === 'ar' ? 'تصدير وورد' : 'Word (.docx)'}</span>
          </button>

          {/* Language Switcher */}
          <button
            onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 transition cursor-pointer min-h-[38px]"
          >
            <Globe className="w-3.5 h-3.5 text-amber-400" />
            <span>{lang === 'ar' ? 'EN' : 'عربي'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
