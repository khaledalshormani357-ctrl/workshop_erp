import React from 'react';
import { useERP } from '../context/ERPContext';
import { InventoryEngine } from '../services/inventoryEngine';
import { AccountingEngine } from '../services/accountingEngine';
import { StatusBadge } from './ui/StatusBadge';
import { EmptyState } from './ui/EmptyState';
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
  ArrowRight,
  Receipt,
  FileSpreadsheet,
  ShoppingCart,
  HardDrive,
  Users,
  Layers,
  Sparkles,
  ChevronLeft
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const { state, lang, setActiveTab, triggerSync, currentUser } = useERP();

  const stockSummaries = InventoryEngine.computeStockSummary(state.products, state.stockMovements);
  const totalInventoryValue = stockSummaries.reduce((sum, s) => sum + s.totalValue, 0);
  const lowStockItems = stockSummaries.filter((s) => s.isLowStock);

  const trialBalance = AccountingEngine.generateTrialBalance(state.accounts, state.journalEntries);
  const pnl = AccountingEngine.generateProfitAndLoss(state.accounts, state.journalEntries);

  const totalCashBank = state.cashBankAccounts.reduce((sum, cb) => sum + cb.current_balance, 0);
  const totalReceivable = state.customers.reduce((sum, c) => sum + c.current_balance, 0);
  const totalPayable = state.suppliers.reduce((sum, s) => sum + s.current_balance, 0);
  const totalSalesAmount = state.salesInvoices.reduce((sum, inv) => sum + inv.total_amount, 0);
  const activeWorkOrders = state.productionOrders.filter((o) => o.current_stage !== 'closed');
  const pendingOutbox = state.syncOutbox.filter((o) => o.status === 'pending').length;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return lang === 'ar' ? 'صباح الخير' : 'Good morning';
    return lang === 'ar' ? 'مساء الخير' : 'Good evening';
  };

  const getUserDisplayName = () => {
    if (currentUser.role === 'owner') return lang === 'ar' ? 'خالد الشرماني' : 'Khaled (Owner)';
    if (currentUser.role === 'accountant') return lang === 'ar' ? 'أحمد الحيمي' : 'Ahmed (Accountant)';
    if (currentUser.role === 'production') return lang === 'ar' ? 'ياسر القاضي' : 'Yasser (Production)';
    if (currentUser.role === 'storekeeper') return lang === 'ar' ? 'سلطان' : 'Sultan (Storekeeper)';
    return lang === 'ar' ? 'مسؤول المبيعات' : 'Sales Representative';
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header Greeting & Summary Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900/90 to-amber-950/30 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400 mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'ملخص عمليات الورشة المباشر' : 'Workshop Live Operations Digest'}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {getGreeting()}، {getUserDisplayName()}
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
              {lang === 'ar'
                ? `لوحة المتابعة التشغيلية والمالية لـ "${state.tenant.name_ar}" — تعمل أوفلاين مع حفظ كامل في قاعدة البيانات المحلية SQLite المشفرة.`
                : `Operational and financial cockpit for "${state.tenant.name}" — running 100% offline-ready with local encrypted SQLite.`}
            </p>
          </div>

          {/* Quick Real-Time Status Pill */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
              <span className={`w-2.5 h-2.5 rounded-full ${state.isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span className="font-semibold text-slate-300">
                {state.isOnline ? (lang === 'ar' ? 'متصل بالسحابة' : 'Cloud Connected') : (lang === 'ar' ? 'وضع عدم الاتصال (أوفلاين)' : 'Offline Local Mode')}
              </span>
            </div>
            {pendingOutbox > 0 && (
              <button
                onClick={triggerSync}
                disabled={!state.isOnline || state.isSyncing}
                className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 hover:bg-amber-500/30 transition cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${state.isSyncing ? 'animate-spin' : ''}`} />
                <span>{pendingOutbox} {lang === 'ar' ? 'عملية بانتظار المزامنة' : 'pending sync'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Primary Financial & Operational KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
        {/* Total Cash & Bank Liquidity */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm hover:border-slate-700 transition flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span className="font-semibold">{lang === 'ar' ? 'السيولة النقدية والبنكية' : 'Cash & Banks'}</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {totalCashBank.toLocaleString()}
            </div>
            <div className="text-[11px] text-amber-400 font-semibold mt-0.5">
              {state.tenant.currency_symbol}
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
            <span>{lang === 'ar' ? 'الخزينة + بنك الكريمي' : 'Safe + Bank'}</span>
            <span className="text-emerald-400 font-bold">✓ {lang === 'ar' ? 'متاح' : 'Liquid'}</span>
          </div>
        </div>

        {/* Total Accounts Receivable */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm hover:border-slate-700 transition flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span className="font-semibold">{lang === 'ar' ? 'مستحقات العملاء (آجل)' : 'Receivables'}</span>
            <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {totalReceivable.toLocaleString()}
            </div>
            <div className="text-[11px] text-amber-400 font-semibold mt-0.5">
              {state.tenant.currency_symbol}
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
            <span>{state.customers.length} {lang === 'ar' ? 'عملاء مسجلين' : 'clients'}</span>
            <span className="text-sky-400 font-bold">{lang === 'ar' ? 'ذمم مدينة' : 'Debit'}</span>
          </div>
        </div>

        {/* Total Accounts Payable */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm hover:border-slate-700 transition flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span className="font-semibold">{lang === 'ar' ? 'مستحقات الموردين' : 'Payables'}</span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {totalPayable.toLocaleString()}
            </div>
            <div className="text-[11px] text-amber-400 font-semibold mt-0.5">
              {state.tenant.currency_symbol}
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
            <span>{state.suppliers.length} {lang === 'ar' ? 'موردين معتمدين' : 'vendors'}</span>
            <span className="text-amber-400 font-bold">{lang === 'ar' ? 'ذمم دائنة' : 'Credit'}</span>
          </div>
        </div>

        {/* Inventory Valuation */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm hover:border-slate-700 transition flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span className="font-semibold">{lang === 'ar' ? 'تقييم المخزون المالي' : 'Inventory Value'}</span>
            <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {Math.round(totalInventoryValue).toLocaleString()}
            </div>
            <div className="text-[11px] text-amber-400 font-semibold mt-0.5">
              {state.tenant.currency_symbol}
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
            <span>{state.products.length} {lang === 'ar' ? 'أصناف ومقاطع' : 'profiles'}</span>
            <span className="text-purple-400 font-mono text-[10px]">WAC</span>
          </div>
        </div>

        {/* Active Production Orders */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm hover:border-slate-700 transition flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span className="font-semibold">{lang === 'ar' ? 'أوامر التصنيع النشطة' : 'Active Orders'}</span>
            <div className="p-1.5 rounded-lg bg-orange-500/10 text-orange-400">
              <Hammer className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {activeWorkOrders.length}
            </div>
            <div className="text-[11px] text-slate-400 font-semibold mt-0.5">
              {lang === 'ar' ? 'أمر تصنيع بالخط' : 'Orders in shop'}
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
            <span>{lang === 'ar' ? 'قيد التجميع والقص' : 'In assembly'}</span>
            <span className="text-amber-400 font-bold">{lang === 'ar' ? 'نشط' : 'Active'}</span>
          </div>
        </div>

        {/* Total Invoiced Sales */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm hover:border-slate-700 transition flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span className="font-semibold">{lang === 'ar' ? 'إجمالي المبيعات' : 'Total Sales'}</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {totalSalesAmount.toLocaleString()}
            </div>
            <div className="text-[11px] text-amber-400 font-semibold mt-0.5">
              {state.tenant.currency_symbol}
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
            <span>{state.salesInvoices.length} {lang === 'ar' ? 'فواتير محررة' : 'invoices'}</span>
            <span className="text-emerald-400 font-bold">{lang === 'ar' ? 'مبيعات' : 'Revenue'}</span>
          </div>
        </div>
      </div>

      {/* 3. Quick Action Hub */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            {lang === 'ar' ? 'إجراءات تشغيلية سريعة:' : 'Quick Workflows:'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab('manufacturing')}
            className="min-h-[40px] px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition flex items-center gap-2 shadow-md shadow-amber-500/20 cursor-pointer active:scale-95"
          >
            <Hammer className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? '+ أمر تصنيع جديد' : '+ New Work Order'}</span>
          </button>

          <button
            onClick={() => setActiveTab('sales')}
            className="min-h-[40px] px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 font-semibold text-xs transition flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <Receipt className="w-3.5 h-3.5 text-emerald-400" />
            <span>{lang === 'ar' ? '+ فاتورة مبيعات' : '+ Sales Invoice'}</span>
          </button>

          <button
            onClick={() => setActiveTab('quotations')}
            className="min-h-[40px] px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 font-semibold text-xs transition flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-amber-400" />
            <span>{lang === 'ar' ? '+ عرض سعر جديد' : '+ New Quotation'}</span>
          </button>

          <button
            onClick={() => setActiveTab('purchases')}
            className="min-h-[40px] px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 font-semibold text-xs transition flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <ShoppingCart className="w-3.5 h-3.5 text-sky-400" />
            <span>{lang === 'ar' ? '+ أمر توريد خام' : '+ Purchase Order'}</span>
          </button>
        </div>
      </div>

      {/* 4. Grid: Production Pipeline & Inventory Watchlist */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Production Pipeline */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Hammer className="w-4 h-4 text-amber-400" />
                <span>{lang === 'ar' ? 'أوامر التصنيع وخط الإنتاج' : 'Production Orders Pipeline'}</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {lang === 'ar' ? 'متابعة أوامر التشغيل عبر مراحل التصنيع الـ 12 المعتمدة' : 'Real-time order tracking through 12 workshop stages'}
              </p>
            </div>
            <button
              onClick={() => setActiveTab('manufacturing')}
              className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer"
            >
              <span>{lang === 'ar' ? 'فتح شاشة التصنيع' : 'Open Production'}</span>
              <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
            </button>
          </div>

          {state.productionOrders.length === 0 ? (
            <EmptyState
              icon={Hammer}
              titleAr="لا توجد أوامر تصنيع حالياً"
              titleEn="No Production Orders Found"
              descriptionAr="يمكنك إنشاء أمر تصنيع جديد لحساب تكلفة المواد وقائمة القص تلقائياً."
              descriptionEn="Create a production order to calculate parametric BOM and cut list."
              actionLabelAr="إنشاء أمر تصنيع الآن"
              actionLabelEn="Create Work Order"
              onAction={() => setActiveTab('manufacturing')}
              lang={lang}
            />
          ) : (
            <div className="space-y-3">
              {state.productionOrders.slice(0, 4).map((order) => {
                const prod = state.products.find((p) => p.id === order.product_id);
                const cust = state.customers.find((c) => c.id === order.customer_id);

                return (
                  <div
                    key={order.id}
                    className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition space-y-2.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                          {order.order_number}
                        </span>
                        <span className="text-xs font-semibold text-slate-300">
                          {cust ? (lang === 'ar' ? cust.name_ar : cust.name) : (lang === 'ar' ? 'طلب مستودع' : 'Stock')}
                        </span>
                      </div>
                      <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 uppercase">
                        {order.current_stage.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-sm font-bold text-slate-100">
                        {prod ? (lang === 'ar' ? prod.name_ar : prod.name) : 'Aluminium Fabrication'} • {order.quantity} {lang === 'ar' ? 'وحدات' : 'units'}
                      </div>
                      {order.dimensions && (
                        <div className="text-xs text-slate-400 font-mono bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
                          {order.dimensions.width}W × {order.dimensions.height}H cm ({order.dimensions.color || 'White'})
                        </div>
                      )}
                    </div>

                    {/* Stage Progress Visualizer */}
                    <div className="pt-1">
                      <div className="h-2 w-full bg-slate-800/80 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full transition-all duration-500"
                          style={{
                            width: `${
                              order.current_stage === 'ready' || order.current_stage === 'delivered'
                                ? 100
                                : order.current_stage === 'quality_control'
                                ? 80
                                : order.current_stage === 'assembly' || order.current_stage === 'glass'
                                ? 60
                                : order.current_stage === 'cutting'
                                ? 40
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
          )}
        </div>

        {/* Low Stock Watchlist & Outbox Queue */}
        <div className="space-y-6">
          {/* Low Stock Alerts */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-400">
                <AlertCircle className="w-4 h-4" />
                <h3 className="font-bold text-sm text-white">
                  {lang === 'ar' ? 'تنبيهات انخفاض المخزون' : 'Low Stock Watchlist'}
                </h3>
              </div>
              <span className="text-xs font-mono font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                {lowStockItems.length} {lang === 'ar' ? 'أصناف' : 'items'}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {lang === 'ar' ? 'أصناف بلغت حد الطلب الأدنى وتحتاج إلى أمر شراء جديد' : 'Items at or below reorder threshold'}
            </p>

            <div className="space-y-2">
              {stockSummaries.slice(0, 4).map((item) => (
                <div
                  key={item.product.id}
                  className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs hover:border-slate-700 transition"
                >
                  <div className="max-w-[65%]">
                    <div className="font-bold text-slate-200 truncate">
                      {lang === 'ar' ? item.product.name_ar : item.product.name}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      SKU: {item.product.sku}
                    </div>
                  </div>
                  <div className="text-right rtl:text-left">
                    <div className={`font-black ${item.isLowStock ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {item.physicalQty} {item.product.unit_id.replace('u-', '')}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {lang === 'ar' ? 'الحد الأدنى:' : 'Min:'} {item.product.min_stock}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setActiveTab('inventory')}
              className="w-full min-h-[40px] py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold text-amber-400 transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>{lang === 'ar' ? 'فتح حركة المخزون والمستودعات' : 'Open Stock Movements'}</span>
              <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
            </button>
          </div>

          {/* Sync Outbox & Offline Status */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-sm text-white">
                  {lang === 'ar' ? 'صندوق التزامن (Outbox)' : 'Sync Outbox'}
                </h3>
              </div>
              <StatusBadge
                variant={pendingOutbox > 0 ? 'warning' : 'success'}
                label={pendingOutbox > 0 ? `${pendingOutbox} Pending` : 'Up-to-date'}
              />
            </div>
            <p className="text-xs text-slate-400">
              {lang === 'ar'
                ? 'الحركات المسجلة أوفلاين يتم تجميعها في Outbox محلي مشفر ومزامنتها تلقائياً عند توفر الإنترنت.'
                : 'Atomic offline operations are securely buffered in encrypted local SQLite.'}
            </p>
            <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 text-xs space-y-1.5">
              <div className="flex justify-between text-slate-400">
                <span>{lang === 'ar' ? 'حالة الاتصال:' : 'Network:'}</span>
                <span className={state.isOnline ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                  {state.isOnline ? (lang === 'ar' ? '🟢 متصل بالسحابة' : 'Online') : (lang === 'ar' ? '🟠 غير متصل (أوفلاين)' : 'Offline')}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>{lang === 'ar' ? 'آخر مزامنة ناجحة:' : 'Last Synced:'}</span>
                <span className="font-mono text-slate-300">
                  {state.lastSyncedAt ? new Date(state.lastSyncedAt).toLocaleTimeString() : (lang === 'ar' ? 'لم تتم بعد' : 'Never')}
                </span>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('sync_architecture')}
              className="w-full min-h-[40px] py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-200 transition cursor-pointer flex items-center justify-center gap-1"
            >
              <span>{lang === 'ar' ? 'فحص محرك SQLite والتزامن' : 'Inspect SQLite Sync'}</span>
              <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
            </button>
          </div>
        </div>
      </div>

      {/* 5. Isolated System Health & Governance Footer */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-slate-800 text-amber-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">
                {lang === 'ar' ? 'حالة النظام والحوكمة الهندسية' : 'System Health & Engineering Governance'}
              </h4>
              <p className="text-xs text-slate-400">
                {lang === 'ar' ? 'فحص جاهزية قاعدة البيانات المحلية والقيود المحاسبية واعتماد المرحلة 0' : 'Integrity verification of SQLite, Ledger Balance, and Phase 0 Gate'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('review_gate')}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <FileCheck2 className="w-3.5 h-3.5 text-amber-400" />
              <span>{lang === 'ar' ? 'بوابة الاعتماد Phase 0' : 'Review Gate'}</span>
            </button>
            <button
              onClick={() => setActiveTab('accounting')}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>{lang === 'ar' ? 'ميزان المراجعة' : 'Trial Balance'}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-amber-400" />
              <div>
                <div className="font-bold text-white">SQLite + SQLCipher</div>
                <div className="text-[11px] text-slate-400">{lang === 'ar' ? 'قاعدة بيانات محلية نشطة' : 'Local DB Active'}</div>
              </div>
            </div>
            <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              🔒 {lang === 'ar' ? 'مشفرة' : 'Encrypted'}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <div>
                <div className="font-bold text-white">{lang === 'ar' ? 'توازن القيود المزدوجة' : 'Double-Entry Balance'}</div>
                <div className="text-[11px] text-slate-400">{trialBalance.totalDebit.toLocaleString()} {state.tenant.currency_symbol}</div>
              </div>
            </div>
            <span className={`font-bold px-2 py-0.5 rounded border ${trialBalance.isBalanced ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-rose-400 bg-rose-500/10 border-rose-500/20'}`}>
              {trialBalance.isBalanced ? '✓ 100% متزن' : 'غير متزن!'}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-amber-400" />
              <div>
                <div className="font-bold text-white">{lang === 'ar' ? 'اعتماد المرحلة 0' : 'Phase 0 Gate'}</div>
                <div className="text-[11px] text-slate-400">{state.isReviewGateApproved ? (lang === 'ar' ? 'تم التوقيع والاعتماد' : 'Signed Off') : (lang === 'ar' ? 'بانتظار الاعتماد' : 'Pending')}</div>
              </div>
            </div>
            <span className={`font-bold px-2 py-0.5 rounded border ${state.isReviewGateApproved ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-amber-400 bg-amber-500/10 border-amber-500/20'}`}>
              {state.isReviewGateApproved ? 'Approved' : 'Pending'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
