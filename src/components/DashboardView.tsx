import React from 'react';
import { useERP } from '../context/ERPContext';
import { InventoryEngine } from '../services/inventoryEngine';
import { AccountingEngine } from '../services/accountingEngine';
import {
  DollarSign,
  Boxes,
  Hammer,
  AlertCircle,
  ArrowUpRight,
  Plus,
  RefreshCw,
  FileCheck2,
  TrendingUp,
  ShieldCheck,
  CheckCircle,
  Activity,
  ArrowRight
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const { state, lang, setActiveTab, triggerSync, toggleOnline } = useERP();

  const stockSummaries = InventoryEngine.computeStockSummary(state.products, state.stockMovements);
  const totalInventoryValue = stockSummaries.reduce((sum, s) => sum + s.totalValue, 0);
  const lowStockItems = stockSummaries.filter((s) => s.isLowStock);

  const trialBalance = AccountingEngine.generateTrialBalance(state.accounts, state.journalEntries);
  const pnl = AccountingEngine.generateProfitAndLoss(state.accounts, state.journalEntries);

  const totalCashBank = state.cashBankAccounts.reduce((sum, cb) => sum + cb.current_balance, 0);
  const totalReceivable = state.customers.reduce((sum, c) => sum + c.current_balance, 0);
  const activeWorkOrders = state.productionOrders.filter((o) => o.current_stage !== 'closed');
  const pendingOutbox = state.syncOutbox.filter((o) => o.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Welcome & Review Gate Banner if pending */}
      {!state.isReviewGateApproved && (
        <div className="bg-gradient-to-r from-amber-950/80 via-slate-900 to-amber-950/40 border border-amber-500/40 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <FileCheck2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-amber-300">
                  {lang === 'ar'
                    ? 'المرحلة 0: مراجعة واعتماد معمارية النظام'
                    : 'Phase 0: Architecture Specification Review Gate'}
                </h2>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-amber-500 text-slate-950">
                  Action Required
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
                {lang === 'ar'
                  ? 'تم تجهيز مواصفات المعمارية ودليل الحسابات وشجرة المواد المتغيرة ومحرك التزامن. يرجى مراجعة وتوقيع القرارات الهندسية للانتقال للمرحلة 1.'
                  : 'Domain specifications, double-entry accounting engine, parametric BOM and sync outbox are ready for stakeholder approval.'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('review_gate')}
            className="w-full md:w-auto px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
          >
            <span>{lang === 'ar' ? 'مراجعة وتوقيع المرحلة 0' : 'Review & Sign Off Gate'}</span>
            <ArrowRight className="w-4 h-4 rtl:rotate-180" />
          </button>
        </div>
      )}

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Cash & Bank Liquidity */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-sm hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>{lang === 'ar' ? 'السيولة النقدية والبنكية' : 'Cash & Bank Liquidity'}</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-white">
            {totalCashBank.toLocaleString()} <span className="text-xs text-amber-400 font-normal">{state.tenant.currency_symbol}</span>
          </div>
          <div className="mt-2 text-xs text-emerald-400 flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'الخزينة + بنك الكريمي' : 'Safe + Kuraimi Bank'}</span>
          </div>
        </div>

        {/* Total Accounts Receivable */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-sm hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>{lang === 'ar' ? 'مستحقات العملاء (آجل)' : 'Accounts Receivable'}</span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-white">
            {totalReceivable.toLocaleString()} <span className="text-xs text-amber-400 font-normal">{state.tenant.currency_symbol}</span>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            {lang === 'ar' ? `${state.customers.length} عملاء نشطين` : `${state.customers.length} active clients`}
          </div>
        </div>

        {/* Total Stock Valuation */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-sm hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>{lang === 'ar' ? 'تقييم المخزون المالي' : 'Inventory Valuation'}</span>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-white">
            {Math.round(totalInventoryValue).toLocaleString()} <span className="text-xs text-amber-400 font-normal">{state.tenant.currency_symbol}</span>
          </div>
          <div className="mt-2 text-xs text-purple-300">
            {lang === 'ar' ? 'حسب المتوسط المرجح WAC' : 'Weighted Avg Costing'}
          </div>
        </div>

        {/* Active Production Orders */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-sm hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>{lang === 'ar' ? 'أوامر التصنيع النشطة' : 'Active Work Orders'}</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <Hammer className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-white">
            {activeWorkOrders.length} <span className="text-xs text-slate-400 font-normal">{lang === 'ar' ? 'أمر تصنيع' : 'Orders'}</span>
          </div>
          <div className="mt-2 text-xs text-amber-400">
            {lang === 'ar' ? 'قيد التجميع والقص والرقابة' : 'In Cutting / QC Stages'}
          </div>
        </div>
      </div>

      {/* Quick Actions & Offline Health Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase text-slate-400">
            {lang === 'ar' ? 'إجراءات سريعة:' : 'Quick Actions:'}
          </span>
          <button
            onClick={() => setActiveTab('operations')}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition flex items-center gap-1.5 border border-slate-700"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" />
            <span>{lang === 'ar' ? 'فاتورة مبيعات جديدة' : 'New Sales Invoice'}</span>
          </button>
          <button
            onClick={() => setActiveTab('manufacturing')}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition flex items-center gap-1.5 border border-slate-700"
          >
            <Hammer className="w-3.5 h-3.5 text-amber-400" />
            <span>{lang === 'ar' ? 'حاسبة شجرة المواد (BOM)' : 'BOM Calculator'}</span>
          </button>
          <button
            onClick={() => setActiveTab('accounting')}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition flex items-center gap-1.5 border border-slate-700"
          >
            <Activity className="w-3.5 h-3.5 text-purple-400" />
            <span>{lang === 'ar' ? 'ميزان المراجعة والأستاذ' : 'Trial Balance'}</span>
          </button>
        </div>

        {/* Live Double-Entry Balancing Check */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-950 border border-slate-800 text-xs">
          <ShieldCheck className={`w-4 h-4 ${trialBalance.isBalanced ? 'text-emerald-400' : 'text-rose-400'}`} />
          <span className="text-slate-300">
            {lang === 'ar' ? 'صحة القيود المحاسبية:' : 'Double-Entry Health:'}
          </span>
          <span className={`font-bold ${trialBalance.isBalanced ? 'text-emerald-400' : 'text-rose-400'}`}>
            {trialBalance.isBalanced ? (lang === 'ar' ? 'متزن 100%' : 'Balanced 100%') : (lang === 'ar' ? 'غير متزن!' : 'Unbalanced!')}
          </span>
        </div>
      </div>

      {/* Grid: Active Work Orders + Low Stock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Work Orders Stage Progression */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-white">
                {lang === 'ar' ? 'مراحل خط الإنتاج والتصنيع' : 'Production Orders Pipeline'}
              </h3>
              <p className="text-xs text-slate-400">
                {lang === 'ar' ? 'متابعة أوامر التشغيل عبر مراحل التصنيع الـ 12' : 'Track orders across 12 configurable stages'}
              </p>
            </div>
            <button
              onClick={() => setActiveTab('manufacturing')}
              className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1"
            >
              <span>{lang === 'ar' ? 'عرض الكل' : 'View All'}</span>
              <ArrowUpRight className="w-3.5 h-3.5 rtl:rotate-90" />
            </button>
          </div>

          <div className="space-y-3">
            {state.productionOrders.slice(0, 3).map((order) => {
              const prod = state.products.find((p) => p.id === order.product_id);
              const cust = state.customers.find((c) => c.id === order.customer_id);

              return (
                <div
                  key={order.id}
                  className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        {order.order_number}
                      </span>
                      <span className="text-xs text-slate-400">
                        {cust ? (lang === 'ar' ? cust.name_ar : cust.name) : 'Stock Order'}
                      </span>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 uppercase">
                      {order.current_stage.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="text-sm font-semibold text-slate-200">
                    {prod ? (lang === 'ar' ? prod.name_ar : prod.name) : 'Fabrication Item'} ({order.quantity} units)
                  </div>

                  {order.dimensions && (
                    <div className="text-xs text-slate-400 font-mono">
                      {order.dimensions.width}W × {order.dimensions.height}H cm • {order.dimensions.color || 'White'}
                    </div>
                  )}

                  {/* Stage Progress Visualizer */}
                  <div className="pt-1">
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full"
                        style={{
                          width: `${
                            order.current_stage === 'ready' || order.current_stage === 'delivered'
                              ? 90
                              : order.current_stage === 'quality_control'
                              ? 75
                              : order.current_stage === 'assembly' || order.current_stage === 'glass'
                              ? 50
                              : order.current_stage === 'cutting'
                              ? 35
                              : 20
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Low Stock Alerts & Outbox Queue */}
        <div className="space-y-6">
          {/* Low Stock Alerts */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-rose-400">
              <AlertCircle className="w-5 h-5" />
              <h3 className="font-bold text-sm text-white">
                {lang === 'ar' ? 'تنبيهات انخفاض المخزون' : 'Low Stock Watchlist'}
              </h3>
            </div>
            <p className="text-xs text-slate-400">
              {lang === 'ar' ? 'أصناف بلغت حد الطلب الأدنى وتحتاج شراء' : 'Items at or below reorder threshold'}
            </p>

            <div className="space-y-2">
              {stockSummaries.slice(0, 3).map((item) => (
                <div
                  key={item.product.id}
                  className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-semibold text-slate-200">
                      {lang === 'ar' ? item.product.name_ar : item.product.name}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      SKU: {item.product.sku}
                    </div>
                  </div>
                  <div className="text-right rtl:text-left">
                    <div className={`font-bold ${item.isLowStock ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {item.physicalQty} {item.product.unit_id.replace('u-', '')}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Min: {item.product.min_stock}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setActiveTab('inventory')}
              className="w-full py-2 text-xs font-semibold text-amber-400 hover:text-amber-300 text-center block transition"
            >
              {lang === 'ar' ? 'فتح سجل حركات المخزون ←' : 'Open Stock Movements →'}
            </button>
          </div>

          {/* Sync Outbox Status Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-sm text-white">
                  {lang === 'ar' ? 'صندوق الصادر للتزامن (Outbox)' : 'Sync Outbox Queue'}
                </h3>
              </div>
              <span
                className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                  pendingOutbox > 0 ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'
                }`}
              >
                {pendingOutbox > 0 ? `${pendingOutbox} Pending` : 'Up-to-date'}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {lang === 'ar'
                ? 'الحركات المسجلة أوفلاين يتم تجميعها وتأكيدها محلياً أولاً.'
                : 'Atomic offline writes safely queued for cloud sync.'}
            </p>
            <div className="text-xs text-slate-400 space-y-1">
              <div className="flex justify-between">
                <span>{lang === 'ar' ? 'حالة الشبكة:' : 'Network:'}</span>
                <span className={state.isOnline ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                  {state.isOnline ? 'Connected' : 'Offline'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>{lang === 'ar' ? 'آخر مزامنة:' : 'Last Synced:'}</span>
                <span className="font-mono text-slate-300">
                  {state.lastSyncedAt ? new Date(state.lastSyncedAt).toLocaleTimeString() : 'Never'}
                </span>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('sync_architecture')}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-semibold text-slate-200 transition"
            >
              {lang === 'ar' ? 'فحص جداول SQLite ومحرك التزامن' : 'Inspect SQLite & Outbox Engine'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
