import React, { useState } from 'react';
import { useERP } from '../context/ERPContext';
import {
  FileText,
  BarChart3,
  TrendingUp,
  Package,
  Layers,
  DollarSign,
  Printer,
  Calendar,
  Building,
  CheckCircle2,
  PieChart
} from 'lucide-react';
import { AccountingEngine } from '../services/accountingEngine';

export const ReportsView: React.FC = () => {
  const { state, lang } = useERP();
  const [activeReport, setActiveReport] = useState<
    'trial_balance' | 'income_statement' | 'stock_valuation' | 'sales_summary' | 'manufacturing_cost'
  >('trial_balance');

  // Compute live accounting reports
  const trialBalance = AccountingEngine.generateTrialBalance(
    state.accounts,
    state.journalEntries
  );

  const totalDebits = trialBalance.totalDebit;
  const totalCredits = trialBalance.totalCredit;

  // Income statement figures
  const pnl = AccountingEngine.generateProfitAndLoss(
    state.accounts,
    state.journalEntries
  );

  // Stock valuation
  const stockValuation = state.products.map((p) => {
    const qty = state.stockMovements.reduce((tot, m) => {
      if (m.product_id !== p.id) return tot;
      return m.direction === 'in' ? tot + m.quantity : tot - m.quantity;
    }, 0);
    const totalVal = Math.max(0, qty) * p.unit_cost;
    return {
      product: p,
      quantity: Math.max(0, qty),
      unitCost: p.unit_cost,
      totalValue: totalVal,
    };
  });

  const totalInventoryValue = stockValuation.reduce((acc, s) => acc + s.totalValue, 0);

  // Sales summary
  const totalInvoices = state.salesInvoices.length;
  const totalInvoicedSales = state.salesInvoices.reduce((acc, inv) => acc + inv.total_amount, 0);
  const totalTaxCollected = state.salesInvoices.reduce((acc, inv) => acc + inv.tax_amount, 0);

  // Manufacturing stats
  const totalWorkOrders = state.productionOrders.length;
  const completedOrders = state.productionOrders.filter((o) => o.current_stage === 'delivered').length;
  const inProgressOrders = state.productionOrders.filter((o) => o.current_stage !== 'delivered' && o.current_stage !== 'draft').length;
  const totalWIPCost = state.productionOrders.reduce((acc, o) => acc + (o.actual_material_cost + o.actual_labor_cost + o.actual_overhead_cost), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-amber-400" />
            <span>{lang === 'ar' ? 'التقارير المالية والمحاسبية والتشغيلية' : 'Financial & Operational Reports'}</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {lang === 'ar'
              ? 'ميزان المراجعة، الأرباح والخسائر، تقييم المخزون وتكاليف أوامر التصنيع'
              : 'Trial Balance, P&L Statement, Inventory Valuation, and Manufacturing Costs.'}
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="min-h-[44px] px-4 py-2.5 rounded-xl font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center gap-2 transition cursor-pointer"
        >
          <Printer className="w-4 h-4 text-amber-400" />
          <span>{lang === 'ar' ? 'طباعة التقرير (Print)' : 'Print Report'}</span>
        </button>
      </div>

      {/* Report Navigation Tabs */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-2 flex items-center gap-1.5 overflow-x-auto">
        {[
          { id: 'trial_balance', labelAr: 'ميزان المراجعة', labelEn: 'Trial Balance', icon: FileText },
          { id: 'income_statement', labelAr: 'قائمة الدخل (P&L)', labelEn: 'Income Statement', icon: TrendingUp },
          { id: 'stock_valuation', labelAr: 'تقييم المخزون', labelEn: 'Stock Valuation', icon: Package },
          { id: 'sales_summary', labelAr: 'المبيعات والإيرادات', labelEn: 'Sales & Revenue', icon: DollarSign },
          { id: 'manufacturing_cost', labelAr: 'تكاليف التصنيع والـ WIP', labelEn: 'Manufacturing Cost', icon: Layers },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeReport === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveReport(tab.id as any)}
              className={`min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{lang === 'ar' ? tab.labelAr : tab.labelEn}</span>
            </button>
          );
        })}
      </div>

      {/* 1. Trial Balance Report */}
      {activeReport === 'trial_balance' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg space-y-4 p-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-white">
                {lang === 'ar' ? 'ميزان المراجعة العام (Trial Balance)' : 'General Ledger Trial Balance'}
              </h3>
              <span className="text-xs text-slate-400">
                {lang === 'ar' ? 'للفترة المالية الحالية • نظام القيد المزدوج المتوازن' : 'Current Fiscal Period • Double-Entry Balanced'}
              </span>
            </div>
            <div className="text-right rtl:text-left font-mono">
              <span className="text-xs text-slate-400 block">{lang === 'ar' ? 'توازن القيود' : 'Balance Status'}</span>
              <span className="text-xs font-extrabold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                {trialBalance.isBalanced ? (lang === 'ar' ? '✓ متطابق ومتوازن' : '✓ Perfectly Balanced') : 'Unbalanced'}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right rtl:text-right ltr:text-left text-xs sm:text-sm">
              <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-3.5">{lang === 'ar' ? 'رقم الحساب' : 'Code'}</th>
                  <th className="p-3.5">{lang === 'ar' ? 'اسم الحساب' : 'Account Name'}</th>
                  <th className="p-3.5">{lang === 'ar' ? 'النوع' : 'Type'}</th>
                  <th className="p-3.5 text-left rtl:text-left ltr:text-right">{lang === 'ar' ? 'مدين (Debit)' : 'Debit'}</th>
                  <th className="p-3.5 text-left rtl:text-left ltr:text-right">{lang === 'ar' ? 'دائن (Credit)' : 'Credit'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {trialBalance.rows.map((row) => (
                  <tr key={row.code} className="hover:bg-slate-800/40 transition">
                    <td className="p-3.5 font-bold text-amber-400">{row.code}</td>
                    <td className="p-3.5 font-sans font-medium text-white">
                      {lang === 'ar' ? row.name_ar : row.name}
                    </td>
                    <td className="p-3.5 font-sans text-xs text-slate-400 capitalize">{row.type}</td>
                    <td className="p-3.5 text-left rtl:text-left ltr:text-right text-slate-200">
                      {row.debit > 0 ? row.debit.toLocaleString() : '-'}
                    </td>
                    <td className="p-3.5 text-left rtl:text-left ltr:text-right text-slate-200">
                      {row.credit > 0 ? row.credit.toLocaleString() : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-950 text-white font-mono font-black border-t-2 border-slate-700">
                <tr>
                  <td colSpan={3} className="p-4 text-right rtl:text-right ltr:text-left font-sans text-sm">
                    {lang === 'ar' ? 'الإجمالي الكلي للميزان:' : 'Total Trial Balance:'}
                  </td>
                  <td className="p-4 text-left rtl:text-left ltr:text-right text-amber-400 text-sm">
                    {totalDebits.toLocaleString()} {state.tenant.currency_symbol}
                  </td>
                  <td className="p-4 text-left rtl:text-left ltr:text-right text-amber-400 text-sm">
                    {totalCredits.toLocaleString()} {state.tenant.currency_symbol}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* 2. Income Statement */}
      {activeReport === 'income_statement' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-6">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-white">
              {lang === 'ar' ? 'قائمة الأرباح والخسائر (Income Statement)' : 'Income Statement (P&L)'}
            </h3>
            <span className="text-xs text-slate-400">
              {lang === 'ar' ? 'صافي أرباح الورشة من عقود الألمنيوم والحديد والتصنيع' : 'Net workshop fabrication income and expenses'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400 font-semibold uppercase">{lang === 'ar' ? 'إجمالي الإيرادات' : 'Operating Revenue'}</span>
              <div className="text-2xl font-extrabold text-emerald-400 mt-1 font-mono">
                {pnl.operatingRevenue.toLocaleString()} {state.tenant.currency_symbol}
              </div>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400 font-semibold uppercase">{lang === 'ar' ? 'تكلفة المبيعات (COGS)' : 'Cost of Goods Sold'}</span>
              <div className="text-2xl font-extrabold text-rose-400 mt-1 font-mono">
                {pnl.cogs.toLocaleString()} {state.tenant.currency_symbol}
              </div>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400 font-semibold uppercase">{lang === 'ar' ? 'صافي الربح' : 'Net Profit'}</span>
              <div className={`text-2xl font-extrabold mt-1 font-mono ${pnl.netProfit >= 0 ? 'text-amber-400' : 'text-rose-400'}`}>
                {pnl.netProfit.toLocaleString()} {state.tenant.currency_symbol}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-slate-950 rounded-xl p-4 space-y-3 text-xs sm:text-sm">
              <div className="flex justify-between text-slate-300">
                <span>{lang === 'ar' ? 'مجمل الربح (Gross Profit):' : 'Gross Profit:'}</span>
                <span className="font-mono font-bold text-white">{pnl.grossProfit.toLocaleString()} {state.tenant.currency_symbol}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>{lang === 'ar' ? 'هامش مجمل الربح:' : 'Gross Margin %:'}</span>
                <span className="font-mono font-bold text-emerald-400">{pnl.grossMarginPercent.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>{lang === 'ar' ? 'المصروفات التشغيلية والإدارية:' : 'Operating Expenses:'}</span>
                <span className="font-mono font-bold text-rose-300">{pnl.operatingExpenses.toLocaleString()} {state.tenant.currency_symbol}</span>
              </div>
              <div className="flex justify-between text-sm font-extrabold text-amber-400 pt-2 border-t border-slate-800">
                <span>{lang === 'ar' ? 'صافي الدخل النهائي:' : 'Net Profit:'}</span>
                <span className="font-mono text-base">{pnl.netProfit.toLocaleString()} {state.tenant.currency_symbol}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Stock Valuation */}
      {activeReport === 'stock_valuation' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-white">
                {lang === 'ar' ? 'تقرير تقييم المخزون الحالي (Stock Valuation)' : 'Inventory Valuation Report'}
              </h3>
              <span className="text-xs text-slate-400">
                {lang === 'ar' ? 'كميات وقيم مقاطع الألمنيوم وألواح الزجاج والإكسسوارات' : 'Aluminium profiles, glass float sheets, and hardware values'}
              </span>
            </div>
            <div className="text-right rtl:text-left font-mono">
              <span className="text-xs text-slate-400 block">{lang === 'ar' ? 'إجمالي قيمة المخزون' : 'Total Asset Value'}</span>
              <span className="text-base font-black text-amber-400">
                {totalInventoryValue.toLocaleString()} {state.tenant.currency_symbol}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right rtl:text-right ltr:text-left text-xs sm:text-sm">
              <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-3.5">SKU</th>
                  <th className="p-3.5">{lang === 'ar' ? 'اسم الصنف' : 'Item Name'}</th>
                  <th className="p-3.5 text-center">{lang === 'ar' ? 'الكمية المتوفرة' : 'On-Hand Qty'}</th>
                  <th className="p-3.5 text-left rtl:text-left ltr:text-right">{lang === 'ar' ? 'تكلفة الوحدة' : 'Unit Cost'}</th>
                  <th className="p-3.5 text-left rtl:text-left ltr:text-right">{lang === 'ar' ? 'القيمة الإجمالية' : 'Total Value'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {stockValuation.map((s) => (
                  <tr key={s.product.id} className="hover:bg-slate-800/40 transition">
                    <td className="p-3.5 font-bold text-amber-400">{s.product.sku}</td>
                    <td className="p-3.5 font-sans font-medium text-white">
                      {lang === 'ar' ? s.product.name_ar : s.product.name}
                    </td>
                    <td className="p-3.5 text-center font-bold text-white">{s.quantity}</td>
                    <td className="p-3.5 text-left rtl:text-left ltr:text-right text-slate-300">
                      {s.unitCost.toLocaleString()}
                    </td>
                    <td className="p-3.5 text-left rtl:text-left ltr:text-right font-bold text-emerald-400">
                      {s.totalValue.toLocaleString()} {state.tenant.currency_symbol}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. Sales Summary */}
      {activeReport === 'sales_summary' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-white">
              {lang === 'ar' ? 'تقرير المبيعات والفواتير الصادرة' : 'Sales Invoices & Revenue Summary'}
            </h3>
            <span className="text-xs text-slate-400">
              {lang === 'ar' ? 'تحصيل المبيعات وضريبة المبيعات 5%' : 'Sales tax and invoiced receivables overview'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400 font-semibold uppercase">{lang === 'ar' ? 'عدد الفواتير' : 'Invoices Count'}</span>
              <div className="text-2xl font-extrabold text-white mt-1">{totalInvoices}</div>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400 font-semibold uppercase">{lang === 'ar' ? 'إجمالي المبيعات' : 'Total Invoiced'}</span>
              <div className="text-2xl font-extrabold text-amber-400 mt-1 font-mono">
                {totalInvoicedSales.toLocaleString()} {state.tenant.currency_symbol}
              </div>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400 font-semibold uppercase">{lang === 'ar' ? 'ضريبة المبيعات المحصلة (5%)' : 'Tax Collected (5%)'}</span>
              <div className="text-2xl font-extrabold text-blue-400 mt-1 font-mono">
                {totalTaxCollected.toLocaleString()} {state.tenant.currency_symbol}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Manufacturing Cost & WIP Report */}
      {activeReport === 'manufacturing_cost' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-white">
              {lang === 'ar' ? 'تقرير تكاليف التصنيع والإنتاج تحت التشغيل (WIP)' : 'Manufacturing Costs & WIP Report'}
            </h3>
            <span className="text-xs text-slate-400">
              {lang === 'ar' ? 'تتبع تكاليف المواد المباشرة، أجور العمالة، والمصاريف الصناعية غير المباشرة' : 'Direct materials, direct labor, and overhead allocation per work order'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400 font-semibold uppercase">{lang === 'ar' ? 'أوامر التصنيع' : 'Total Orders'}</span>
              <div className="text-2xl font-extrabold text-white mt-1">{totalWorkOrders}</div>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400 font-semibold uppercase">{lang === 'ar' ? 'قيد التصنيع (WIP)' : 'Active WIP'}</span>
              <div className="text-2xl font-extrabold text-amber-400 mt-1">{inProgressOrders}</div>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400 font-semibold uppercase">{lang === 'ar' ? 'منجز ومسلم' : 'Delivered'}</span>
              <div className="text-2xl font-extrabold text-emerald-400 mt-1">{completedOrders}</div>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400 font-semibold uppercase">{lang === 'ar' ? 'إجمالي التكاليف الفعلية' : 'Total Actual Cost'}</span>
              <div className="text-2xl font-extrabold text-purple-400 mt-1 font-mono">
                {totalWIPCost.toLocaleString()} {state.tenant.currency_symbol}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
