import React from 'react';
import { useERP } from '../context/ERPContext';
import {
  Settings,
  HardDrive,
  Download,
  RotateCcw,
  Users,
  Building,
  ShieldCheck,
  CheckCircle,
  FileSpreadsheet
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { state, lang, resetAllData, exportDatabaseBackup } = useERP();

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Workshop Profile Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Building className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                {lang === 'ar' ? 'بيانات الورشة والمستأجر (Tenant Profile)' : 'Workshop Tenant Profile'}
              </h3>
              <p className="text-xs text-slate-400">
                {lang === 'ar' ? 'إعدادات المنشأة والعملة والضريبة المطبقة' : 'Organization config, tax and base currency'}
              </p>
            </div>
          </div>
          <span className="font-mono text-xs text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
            {state.tenant.code}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-slate-400 block mb-1">{lang === 'ar' ? 'اسم الورشة (عربي)' : 'Workshop Name (AR)'}</span>
            <span className="font-bold text-slate-100 text-sm">{state.tenant.name_ar}</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-slate-400 block mb-1">{lang === 'ar' ? 'اسم الورشة (EN)' : 'Workshop Name (EN)'}</span>
            <span className="font-bold text-slate-100 text-sm">{state.tenant.name}</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-slate-400 block mb-1">{lang === 'ar' ? 'العملة الأساسية' : 'Base Currency'}</span>
            <span className="font-bold text-amber-400 text-sm">{state.tenant.currency} ({state.tenant.currency_symbol})</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-slate-400 block mb-1">{lang === 'ar' ? 'نسبة الضريبة الافتراضية' : 'Default Tax Rate'}</span>
            <span className="font-bold text-emerald-400 text-sm">{(state.tenant.tax_rate * 100).toFixed(0)}%</span>
          </div>
        </div>
      </div>

      {/* Role-Based Access Control (RBAC) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
          <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-base text-white">
              {lang === 'ar' ? 'إدارة المستخدمين والصلاحيات (RBAC)' : 'User Permissions & Roles'}
            </h3>
            <p className="text-xs text-slate-400">
              {lang === 'ar' ? 'تخصيص الأدوار لضمان الفصل المحاسبي والتشغيلي' : 'Granular roles separating bookkeeping, storekeeping, and shop floor'}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left rtl:text-right text-xs text-slate-300">
            <thead className="bg-slate-950/60 text-slate-400 text-xs uppercase border-b border-slate-800">
              <tr>
                <th className="p-3">{lang === 'ar' ? 'الاسم' : 'Name'}</th>
                <th className="p-3">{lang === 'ar' ? 'الدور الوظيفي' : 'Role'}</th>
                <th className="p-3">{lang === 'ar' ? 'البريد الإلكتروني' : 'Email'}</th>
                <th className="p-3">{lang === 'ar' ? 'الحالة' : 'Status'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {state.users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-800/40">
                  <td className="p-3 font-semibold text-slate-100">
                    {lang === 'ar' ? u.name_ar : u.name}
                  </td>
                  <td className="p-3 font-mono text-amber-400 uppercase font-bold">{u.role}</td>
                  <td className="p-3 text-slate-400">{u.email}</td>
                  <td className="p-3">
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Active
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Database Backup & Restore */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
          <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
            <HardDrive className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-base text-white">
              {lang === 'ar' ? 'النسخ الاحتياطي وإعادة الضبط' : 'Backup & Reset Engine'}
            </h3>
            <p className="text-xs text-slate-400">
              {lang === 'ar' ? 'تصدير نسخة كاملة مشفرة من قاعدة البيانات المحلية' : 'Export atomic encrypted snapshot of local SQLite store'}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-slate-950 border border-slate-800">
          <div>
            <div className="text-sm font-bold text-slate-200">
              {lang === 'ar' ? 'تصدير ملف النسخ الاحتياطي (.json)' : 'Export Full Local Database'}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              {lang === 'ar' ? 'يشمل كافة القيود وحركات المخزون وصندوق الصادر' : 'Includes all JVs, stock movements, BOMs, and outbox logs.'}
            </div>
          </div>
          <button
            onClick={exportDatabaseBackup}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition flex items-center justify-center gap-2 shadow-md shadow-amber-500/20"
          >
            <Download className="w-4 h-4" />
            <span>{lang === 'ar' ? 'تنزيل النسخة الاحتياطية' : 'Download Backup'}</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-rose-950/20 border border-rose-500/30">
          <div>
            <div className="text-sm font-bold text-rose-300">
              {lang === 'ar' ? 'إعادة ضبط البيانات للوضع الافتراضي' : 'Reset to Factory Seed Data'}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              {lang === 'ar' ? 'إعادة تهيئة بيانات ورشة الأندلس النموذجية' : 'Reinitializes initial mock dataset for testing and verification.'}
            </div>
          </div>
          <button
            onClick={() => {
              if (window.confirm(lang === 'ar' ? 'هل أنت متأكد من إعادة ضبط البيانات؟' : 'Reset all data to default?')) {
                resetAllData();
              }
            }}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-600 text-white font-semibold text-xs transition flex items-center justify-center gap-1.5"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{lang === 'ar' ? 'إعادة الضبط' : 'Reset All'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
