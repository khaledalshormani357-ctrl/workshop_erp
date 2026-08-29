import React, { useState } from 'react';
import { useERP } from '../context/ERPContext';
import { UserRole } from '../types';
import {
  Shield,
  Wifi,
  WifiOff,
  RefreshCw,
  Globe,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Database,
  FileDown,
  Loader2
} from 'lucide-react';
import { generateWorkshopERPWordReport } from '../utils/exportDocx';

export const Header: React.FC = () => {
  const {
    state,
    lang,
    setLang,
    currentUser,
    setCurrentUserRole,
    toggleOnline,
    triggerSync,
    activeTab,
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
    <header className="bg-slate-900/90 backdrop-blur border-b border-slate-800 text-slate-100 sticky top-0 z-40 px-4 py-3 shadow-lg">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Left / Brand Info */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-amber-500/20">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-base sm:text-lg tracking-tight text-white">
                {lang === 'ar' ? state.tenant.name_ar : state.tenant.name}
              </h1>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                v0.9 Phase 0
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {lang === 'ar'
                ? 'نظام الورش الذكي • أوفلاين أولاً • قيد مزدوج • تصنيع ومخازن'
                : 'Offline-First • Multi-Tenant • Double-Entry • Manufacturing'}
            </p>
          </div>
        </div>

        {/* Right / Controls & Actions */}
        <div className="flex items-center flex-wrap gap-2 sm:gap-3">
          {/* Phase 0 Sign-Off Status Pill */}
          <button
            onClick={() => setActiveTab('review_gate')}
            className={`text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium transition border ${
              state.isReviewGateApproved
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25'
                : 'bg-amber-500/15 border-amber-500/30 text-amber-300 hover:bg-amber-500/25 animate-pulse'
            }`}
          >
            {state.isReviewGateApproved ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>{lang === 'ar' ? 'المرحلة 0: معتمدة وموقعة' : 'Phase 0: Signed Off'}</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>{lang === 'ar' ? 'المرحلة 0: بانتظار الاعتماد' : 'Phase 0: Review Gate'}</span>
              </>
            )}
          </button>

          {/* User Role Switcher */}
          <div className="relative flex items-center bg-slate-800/80 border border-slate-700/80 rounded-lg px-2 py-1 text-xs">
            <UserCheck className="w-3.5 h-3.5 text-slate-400 mr-1.5 rtl:ml-1.5 rtl:mr-0" />
            <select
              value={currentUser.role}
              onChange={(e) => setCurrentUserRole(e.target.value as UserRole)}
              className="bg-transparent text-slate-200 text-xs font-medium focus:outline-none cursor-pointer pr-4 rtl:pl-4"
            >
              {roles.map((r) => (
                <option key={r.role} value={r.role} className="bg-slate-900 text-slate-200">
                  {lang === 'ar' ? r.labelAr : r.labelEn}
                </option>
              ))}
            </select>
          </div>

          {/* Offline/Online Simulator Switch */}
          <button
            onClick={toggleOnline}
            title={lang === 'ar' ? 'محاكاة وضع الاتصال بالإنترنت' : 'Toggle Online/Offline State'}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
              state.isOnline
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-400 hover:bg-emerald-900/60'
                : 'bg-rose-950/60 border-rose-500/40 text-rose-400 hover:bg-rose-900/60'
            }`}
          >
            {state.isOnline ? (
              <>
                <Wifi className="w-3.5 h-3.5" />
                <span>{lang === 'ar' ? 'متصل' : 'Online'}</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5" />
                <span>{lang === 'ar' ? 'أوفلاين (محلي)' : 'Offline (Local)'}</span>
              </>
            )}
          </button>

          {/* Sync Trigger & Outbox Counter */}
          <button
            onClick={triggerSync}
            disabled={!state.isOnline || state.isSyncing}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
              pendingOutboxCount > 0
                ? 'bg-amber-500 text-slate-950 border-amber-400 hover:bg-amber-400 font-bold'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 disabled:opacity-50'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${state.isSyncing ? 'animate-spin' : ''}`} />
            <span>{lang === 'ar' ? 'مزامنة' : 'Sync'}</span>
            {pendingOutboxCount > 0 && (
              <span className="bg-slate-950 text-amber-400 text-[10px] font-extrabold px-1.5 py-0.2 rounded-full">
                {pendingOutboxCount}
              </span>
            )}
          </button>

          {/* Word (.docx) Report Export Button */}
          <button
            onClick={handleExportWord}
            disabled={isExportingDocx}
            title={lang === 'ar' ? 'تصدير التقرير الفني الشامل بصيغة ملف وورد (.docx)' : 'Export Technical Report as Word (.docx)'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white border border-blue-400/50 shadow-md shadow-blue-500/20 transition disabled:opacity-50"
          >
            {isExportingDocx ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileDown className="w-3.5 h-3.5 text-blue-200" />
            )}
            <span>{lang === 'ar' ? 'تصدير وورد (.docx)' : 'Export Word'}</span>
          </button>

          {/* Language Switcher */}
          <button
            onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 transition"
          >
            <Globe className="w-3.5 h-3.5 text-amber-400" />
            <span>{lang === 'ar' ? 'English' : 'عربي'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
