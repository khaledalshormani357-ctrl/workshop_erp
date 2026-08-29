import React, { useState } from 'react';
import { useERP } from '../context/ERPContext';
import { AccountingEngine } from '../services/accountingEngine';
import { JournalEntryLine } from '../types';
import {
  Calculator,
  Plus,
  ShieldCheck,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  FileSpreadsheet,
  Layers,
  X,
  Trash2
} from 'lucide-react';

export const AccountingView: React.FC = () => {
  const {
    state,
    lang,
    createJournalEntry,
    reverseJournalEntry,
  } = useERP();

  const [activeTab, setActiveTab] = useState<'journal' | 'trial_balance' | 'ledger' | 'coa' | 'pnl' | 'balance_sheet'>('journal');
  const [selectedLedgerAccountId, setSelectedLedgerAccountId] = useState<string>(state.accounts[0]?.id || '');
  const [showNewEntryModal, setShowNewEntryModal] = useState(false);
  const [reverseModalEntryId, setReverseModalEntryId] = useState<string | null>(null);
  const [reverseReason, setReverseReason] = useState('');
  const [entryError, setEntryError] = useState<string | null>(null);

  // New Journal Entry Form State
  const [entryReference, setEntryReference] = useState('');
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [entryLines, setEntryLines] = useState<JournalEntryLine[]>([
    {
      id: '1',
      account_id: state.accounts[0]?.id || 'acc-1110',
      account_code: state.accounts[0]?.code || '1110',
      account_name: state.accounts[0]?.name || 'Main Cash Safe',
      description: 'Capital deposit / cash receipt',
      debit: 50000,
      credit: 0,
    },
    {
      id: '2',
      account_id: state.accounts.find((a) => a.code === '4110')?.id || 'acc-4110',
      account_code: '4110',
      account_name: 'Aluminium Fabrication Sales Revenue',
      description: 'Cash sale revenue recognized',
      debit: 0,
      credit: 50000,
    },
  ]);

  const trialBalance = AccountingEngine.generateTrialBalance(state.accounts, state.journalEntries);
  const pnl = AccountingEngine.generateProfitAndLoss(state.accounts, state.journalEntries);
  const balanceSheet = AccountingEngine.generateBalanceSheet(state.accounts, state.journalEntries);

  const handleAccountSelect = (lineId: string, accountId: string) => {
    const acc = state.accounts.find((a) => a.id === accountId);
    if (!acc) return;

    setEntryLines((prev) =>
      prev.map((l) =>
        l.id === lineId
          ? {
              ...l,
              account_id: acc.id,
              account_code: acc.code,
              account_name: acc.name,
            }
          : l
      )
    );
  };

  const handleAddLine = () => {
    const nextAcc = state.accounts[0];
    setEntryLines((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        account_id: nextAcc.id,
        account_code: nextAcc.code,
        account_name: nextAcc.name,
        description: '',
        debit: 0,
        credit: 0,
      },
    ]);
  };

  const handleRemoveLine = (lineId: string) => {
    if (entryLines.length <= 2) return;
    setEntryLines((prev) => prev.filter((l) => l.id !== lineId));
  };

  const handleLineValueChange = (lineId: string, field: 'debit' | 'credit' | 'description', value: any) => {
    setEntryLines((prev) =>
      prev.map((l) => (l.id === lineId ? { ...l, [field]: field === 'description' ? value : Number(value) } : l))
    );
  };

  const currentTotalDebit = entryLines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
  const currentTotalCredit = entryLines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
  const isFormBalanced = Math.abs(currentTotalDebit - currentTotalCredit) < 0.01;

  const handleSubmitEntry = (e: React.FormEvent) => {
    e.preventDefault();
    setEntryError(null);

    const result = createJournalEntry({
      reference: entryReference || 'MANUAL-ENTRY',
      date: entryDate,
      lines: entryLines,
    });

    if (!result.success) {
      setEntryError(result.error || 'Failed to post entry.');
    } else {
      setShowNewEntryModal(false);
      setEntryReference('');
    }
  };

  const handleConfirmReverse = () => {
    if (!reverseModalEntryId || !reverseReason) return;
    reverseJournalEntry(reverseModalEntryId, reverseReason);
    setReverseModalEntryId(null);
    setReverseReason('');
  };

  return (
    <div className="space-y-6">
      {/* Header & Subtabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl">
          <button
            onClick={() => setActiveTab('journal')}
            className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition ${
              activeTab === 'journal'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            {lang === 'ar' ? 'دفتر قيود اليومية' : 'Journal Entries'} ({state.journalEntries.length})
          </button>
          <button
            onClick={() => setActiveTab('trial_balance')}
            className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition ${
              activeTab === 'trial_balance'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            {lang === 'ar' ? 'ميزان المراجعة' : 'Trial Balance'}
          </button>
          <button
            onClick={() => setActiveTab('ledger')}
            className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition ${
              activeTab === 'ledger'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            {lang === 'ar' ? 'الأستاذ العام' : 'General Ledger'}
          </button>
          <button
            onClick={() => setActiveTab('pnl')}
            className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition ${
              activeTab === 'pnl'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            {lang === 'ar' ? 'الأرباح والخسائر (P&L)' : 'Income Statement'}
          </button>
          <button
            onClick={() => setActiveTab('balance_sheet')}
            className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition ${
              activeTab === 'balance_sheet'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            {lang === 'ar' ? 'الميزانية العمومية' : 'Balance Sheet'}
          </button>
          <button
            onClick={() => setActiveTab('coa')}
            className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition ${
              activeTab === 'coa'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            {lang === 'ar' ? 'دليل الحسابات' : 'Chart of Accounts'}
          </button>
        </div>

        <button
          onClick={() => setShowNewEntryModal(true)}
          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm transition flex items-center gap-1.5 shadow-md shadow-amber-500/20"
        >
          <Plus className="w-4 h-4" />
          <span>{lang === 'ar' ? 'تسجيل قيد يومية متزن' : 'Post Journal Entry'}</span>
        </button>
      </div>

      {/* TAB 1: JOURNAL ENTRIES */}
      {activeTab === 'journal' && (
        <div className="space-y-4">
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2 text-slate-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>
                {lang === 'ar'
                  ? 'مبدأ ADR-004: القيود المرحلة غير قابلة للتعديل أو الحذف، ويتم التصحيح حصراً بقيود عكسية موثقة.'
                  : 'Architecture ADR-004: Posted journal entries are strictly immutable. Corrections via reversal entries only.'}
              </span>
            </div>
            <span className="text-amber-400 font-mono">Total Debits: {trialBalance.totalDebit.toLocaleString()} {state.tenant.currency_symbol}</span>
          </div>

          <div className="space-y-4">
            {state.journalEntries.map((je) => (
              <div
                key={je.id}
                className={`bg-slate-900/90 border rounded-2xl overflow-hidden shadow-sm transition ${
                  je.status === 'reversed' ? 'border-slate-800/60 opacity-75' : 'border-slate-800'
                }`}
              >
                {/* Entry Header */}
                <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-amber-400 text-sm">{je.entry_number}</span>
                    <span className="text-slate-400">{je.date}</span>
                    <span className="text-slate-400">Ref: <strong className="text-slate-200">{je.reference}</strong></span>
                    <span className="text-slate-400">By: {je.created_by}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full font-semibold uppercase text-xs ${
                        je.status === 'posted'
                          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                          : 'bg-rose-500/15 text-rose-300 border border-rose-500/30 line-through'
                      }`}
                    >
                      {je.status}
                    </span>
                    {je.status === 'posted' && (
                      <button
                        onClick={() => setReverseModalEntryId(je.id)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-300 text-xs font-semibold transition flex items-center gap-1"
                        title="Reverse Entry"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>{lang === 'ar' ? 'عكس القيد' : 'Reverse'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Entry Lines */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left rtl:text-right text-xs sm:text-sm text-slate-300">
                    <thead className="bg-slate-950/30 text-slate-400 text-xs uppercase border-b border-slate-800/60">
                      <tr>
                        <th className="p-3 font-mono">{lang === 'ar' ? 'رقم الحساب' : 'Code'}</th>
                        <th className="p-3">{lang === 'ar' ? 'اسم الحساب' : 'Account Name'}</th>
                        <th className="p-3">{lang === 'ar' ? 'البيان والتفصيل' : 'Description'}</th>
                        <th className="p-3 text-right rtl:text-left">{lang === 'ar' ? 'مدين (Debit)' : 'Debit'}</th>
                        <th className="p-3 text-right rtl:text-left">{lang === 'ar' ? 'دائن (Credit)' : 'Credit'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40 font-mono text-xs">
                      {je.lines.map((line) => (
                        <tr key={line.id} className="hover:bg-slate-800/20">
                          <td className="p-3 text-amber-400 font-bold">{line.account_code}</td>
                          <td className="p-3 font-sans font-semibold text-slate-200">{line.account_name}</td>
                          <td className="p-3 font-sans text-slate-400">{line.description}</td>
                          <td className="p-3 text-right rtl:text-left font-bold text-slate-100">
                            {line.debit > 0 ? line.debit.toLocaleString() : '—'}
                          </td>
                          <td className="p-3 text-right rtl:text-left font-bold text-slate-100">
                            {line.credit > 0 ? line.credit.toLocaleString() : '—'}
                          </td>
                        </tr>
                      ))}
                      {/* Entry Totals Footer */}
                      <tr className="bg-slate-950/50 font-bold text-slate-200">
                        <td colSpan={3} className="p-3 text-right rtl:text-left font-sans text-slate-400">
                          {lang === 'ar' ? 'إجمالي طرفي القيد:' : 'Total Balanced Movement:'}
                        </td>
                        <td className="p-3 text-right rtl:text-left text-amber-400">
                          {je.total_debit.toLocaleString()}
                        </td>
                        <td className="p-3 text-right rtl:text-left text-amber-400">
                          {je.total_credit.toLocaleString()}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: TRIAL BALANCE */}
      {activeTab === 'trial_balance' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-sm space-y-3">
          <div className="p-4 bg-slate-950/40 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-white">
                {lang === 'ar' ? 'ميزان المراجعة بالأرصدة' : 'Trial Balance Report'}
              </h3>
              <p className="text-xs text-slate-400">
                {lang === 'ar' ? 'تجميع حركة كافة الحسابات والتأكد من التوازن المحاسبي' : 'Aggregated balances across chart of accounts'}
              </p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-400 font-bold">
                {trialBalance.isBalanced ? 'Balanced = OK' : 'Out of Balance!'}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left rtl:text-right text-xs sm:text-sm text-slate-300">
              <thead className="bg-slate-950/60 text-slate-400 font-bold text-xs uppercase border-b border-slate-800">
                <tr>
                  <th className="p-3.5 font-mono">{lang === 'ar' ? 'رمز الحساب' : 'Code'}</th>
                  <th className="p-3.5">{lang === 'ar' ? 'اسم الحساب' : 'Account Name'}</th>
                  <th className="p-3.5">{lang === 'ar' ? 'نوع الحساب' : 'Category'}</th>
                  <th className="p-3.5 text-right rtl:text-left">{lang === 'ar' ? 'أرصدة مدينة (Debit)' : 'Debit'}</th>
                  <th className="p-3.5 text-right rtl:text-left">{lang === 'ar' ? 'أرصدة دائنة (Credit)' : 'Credit'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono text-xs">
                {trialBalance.rows.map((row) => (
                  <tr key={row.code} className="hover:bg-slate-800/40 transition">
                    <td className="p-3.5 font-bold text-amber-400">{row.code}</td>
                    <td className="p-3.5 font-sans font-semibold text-slate-200">
                      {lang === 'ar' ? row.name_ar : row.name}
                    </td>
                    <td className="p-3.5 font-sans">
                      <span className="px-2 py-0.5 rounded text-[11px] bg-slate-800 text-slate-300 uppercase">
                        {row.type}
                      </span>
                    </td>
                    <td className="p-3.5 text-right rtl:text-left font-bold text-slate-100">
                      {row.debit > 0 ? row.debit.toLocaleString() : '0.00'}
                    </td>
                    <td className="p-3.5 text-right rtl:text-left font-bold text-slate-100">
                      {row.credit > 0 ? row.credit.toLocaleString() : '0.00'}
                    </td>
                  </tr>
                ))}
                {/* Grand Total */}
                <tr className="bg-slate-950 text-amber-400 font-bold text-sm border-t-2 border-slate-700">
                  <td colSpan={3} className="p-4 font-sans text-right rtl:text-left">
                    {lang === 'ar' ? 'إجمالي ميزان المراجعة العام:' : 'Grand Total:'}
                  </td>
                  <td className="p-4 text-right rtl:text-left">
                    {trialBalance.totalDebit.toLocaleString()} {state.tenant.currency_symbol}
                  </td>
                  <td className="p-4 text-right rtl:text-left">
                    {trialBalance.totalCredit.toLocaleString()} {state.tenant.currency_symbol}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: PROFIT & LOSS */}
      {activeTab === 'pnl' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-sm max-w-2xl mx-auto space-y-6">
          <div className="text-center space-y-1 border-b border-slate-800 pb-4">
            <h3 className="font-extrabold text-lg text-white">
              {lang === 'ar' ? 'قائمة الأرباح والخسائر (الدخل التشغيلي)' : 'Profit & Loss Statement'}
            </h3>
            <p className="text-xs text-slate-400">
              {lang === 'ar' ? state.tenant.name_ar : state.tenant.name} • {state.tenant.currency}
            </p>
          </div>

          <div className="space-y-4 text-sm">
            {/* Revenue */}
            <div className="flex justify-between items-center py-2 border-b border-slate-800">
              <span className="font-bold text-slate-200">{lang === 'ar' ? 'إيرادات المبيعات والتشغيل' : 'Operating Revenue'}</span>
              <span className="font-mono font-bold text-emerald-400 text-base">
                {pnl.operatingRevenue.toLocaleString()} {state.tenant.currency_symbol}
              </span>
            </div>

            {/* COGS */}
            <div className="flex justify-between items-center py-2 border-b border-slate-800 text-rose-300">
              <span>{lang === 'ar' ? 'تكلفة البضاعة المباعة والمواد المصروفة (COGS)' : 'Cost of Goods Sold (COGS)'}</span>
              <span className="font-mono font-semibold">
                ({pnl.cogs.toLocaleString()}) {state.tenant.currency_symbol}
              </span>
            </div>

            {/* Gross Profit */}
            <div className="flex justify-between items-center p-3 rounded-xl bg-slate-950 border border-slate-800 font-bold text-white">
              <span>{lang === 'ar' ? 'مجمل الربح (Gross Profit)' : 'Gross Profit'}</span>
              <div className="text-right rtl:text-left">
                <div className="text-amber-400 font-mono text-base">{pnl.grossProfit.toLocaleString()} {state.tenant.currency_symbol}</div>
                <div className="text-xs text-slate-400 font-normal">Margin: {pnl.grossMarginPercent.toFixed(1)}%</div>
              </div>
            </div>

            {/* Operating Expenses */}
            <div className="flex justify-between items-center py-2 border-b border-slate-800 text-rose-300">
              <span>{lang === 'ar' ? 'المصاريف الإدارية والتشغيلية العامة' : 'Operating & Admin Expenses'}</span>
              <span className="font-mono font-semibold">
                ({pnl.operatingExpenses.toLocaleString()}) {state.tenant.currency_symbol}
              </span>
            </div>

            {/* Net Profit */}
            <div className="flex justify-between items-center p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-slate-950 border border-emerald-500/30 text-white font-extrabold text-lg">
              <span>{lang === 'ar' ? 'صافي الربح للفترة (Net Income):' : 'Net Profit:'}</span>
              <span className="font-mono text-emerald-400">
                {pnl.netProfit.toLocaleString()} {state.tenant.currency_symbol}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: BALANCE SHEET */}
      {activeTab === 'balance_sheet' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-sm max-w-3xl mx-auto space-y-6">
          <div className="text-center space-y-1 border-b border-slate-800 pb-4">
            <h3 className="font-extrabold text-lg text-white">
              {lang === 'ar' ? 'الميزانية العمومية (المركز المالي)' : 'Statement of Financial Position'}
            </h3>
            <p className="text-xs text-slate-400">
              {lang === 'ar' ? 'الأصول = الالتزامات + حقوق الملكية' : 'Assets = Liabilities + Owner Equity'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs sm:text-sm">
            {/* ASSETS */}
            <div className="space-y-3 p-4 rounded-xl bg-slate-950/60 border border-slate-800">
              <h4 className="font-bold text-amber-400 text-base border-b border-slate-800 pb-2">
                {lang === 'ar' ? 'الأصول (Assets)' : 'Assets'}
              </h4>
              <div className="flex justify-between py-1 text-slate-300">
                <span>{lang === 'ar' ? 'الأصول المتداولة (نقد، عملاء، مخزون)' : 'Current Assets'}</span>
                <span className="font-mono">{balanceSheet.currentAssets.toLocaleString()} {state.tenant.currency_symbol}</span>
              </div>
              <div className="flex justify-between py-1 text-slate-300">
                <span>{lang === 'ar' ? 'الأصول الثابتة (آلات ومعدات)' : 'Fixed Assets'}</span>
                <span className="font-mono">{balanceSheet.fixedAssets.toLocaleString()} {state.tenant.currency_symbol}</span>
              </div>
              <div className="pt-2 border-t border-slate-800 flex justify-between font-extrabold text-emerald-400 text-base">
                <span>{lang === 'ar' ? 'إجمالي الأصول:' : 'Total Assets:'}</span>
                <span className="font-mono">{balanceSheet.totalAssets.toLocaleString()} {state.tenant.currency_symbol}</span>
              </div>
            </div>

            {/* LIABILITIES & EQUITY */}
            <div className="space-y-3 p-4 rounded-xl bg-slate-950/60 border border-slate-800">
              <h4 className="font-bold text-amber-400 text-base border-b border-slate-800 pb-2">
                {lang === 'ar' ? 'الالتزامات وحقوق الملكية' : 'Liabilities & Equity'}
              </h4>
              <div className="flex justify-between py-1 text-slate-300">
                <span>{lang === 'ar' ? 'الالتزامات المتداولة (موردون، أجور مستحقة)' : 'Current Liabilities'}</span>
                <span className="font-mono">{balanceSheet.currentLiabilities.toLocaleString()} {state.tenant.currency_symbol}</span>
              </div>
              <div className="flex justify-between py-1 text-slate-300">
                <span>{lang === 'ar' ? 'رأس مال صاحب الورشة' : 'Owner Capital'}</span>
                <span className="font-mono">{balanceSheet.ownerEquity.toLocaleString()} {state.tenant.currency_symbol}</span>
              </div>
              <div className="flex justify-between py-1 text-slate-300">
                <span>{lang === 'ar' ? 'الأرباح المبقاة وصافي الدخل' : 'Retained Earnings & Net Income'}</span>
                <span className="font-mono">{(balanceSheet.retainedEarnings + balanceSheet.netIncomePeriod).toLocaleString()} {state.tenant.currency_symbol}</span>
              </div>
              <div className="pt-2 border-t border-slate-800 flex justify-between font-extrabold text-emerald-400 text-base">
                <span>{lang === 'ar' ? 'إجمالي الالتزامات والملكية:' : 'Total Liab. & Equity:'}</span>
                <span className="font-mono">{balanceSheet.totalEquityAndLiabilities.toLocaleString()} {state.tenant.currency_symbol}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: CHART OF ACCOUNTS TREE */}
      {activeTab === 'coa' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 bg-slate-950/40 border-b border-slate-800 text-xs text-slate-400">
            {lang === 'ar'
              ? 'دليل الحسابات المهيكل: الأصول 1xxxx، الالتزامات 2xxxx، حقوق الملكية 3xxxx، الإيرادات 4xxxx، المصروفات 5xxxx'
              : 'Standard 5-digit Chart of Accounts for fabrication & manufacturing'}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left rtl:text-right text-xs sm:text-sm text-slate-300">
              <thead className="bg-slate-950/60 text-slate-400 font-bold text-xs uppercase border-b border-slate-800">
                <tr>
                  <th className="p-3.5 font-mono">{lang === 'ar' ? 'رمز الحساب' : 'Code'}</th>
                  <th className="p-3.5">{lang === 'ar' ? 'اسم الحساب' : 'Account Name'}</th>
                  <th className="p-3.5">{lang === 'ar' ? 'التصنيف' : 'Category'}</th>
                  <th className="p-3.5">{lang === 'ar' ? 'النوع' : 'Type'}</th>
                  <th className="p-3.5 text-right rtl:text-left">{lang === 'ar' ? 'الرصيد القائم' : 'Balance'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {state.accounts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-slate-800/40 transition">
                    <td className="p-3.5 font-mono font-bold text-amber-400">{acc.code}</td>
                    <td className="p-3.5 font-bold text-slate-100">
                      {lang === 'ar' ? acc.name_ar : acc.name}
                    </td>
                    <td className="p-3.5 text-slate-400">
                      {lang === 'ar' ? acc.category_ar : acc.category}
                    </td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded text-xs bg-slate-800 text-slate-300 uppercase">
                        {acc.type}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono font-bold text-right rtl:text-left text-white">
                      {acc.balance.toLocaleString()} {state.tenant.currency_symbol}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: GENERAL LEDGER */}
      {activeTab === 'ledger' && (() => {
        const selectedAcc = state.accounts.find((a) => a.id === selectedLedgerAccountId) || state.accounts[0];
        const postedEntries = state.journalEntries.filter((e) => e.status === 'posted');
        
        let runningBalance = 0;
        const ledgerTransactions: {
          id: string;
          entryNumber: string;
          date: string;
          reference?: string;
          description: string;
          debit: number;
          credit: number;
          balance: number;
        }[] = [];

        if (selectedAcc) {
          postedEntries.forEach((entry) => {
            entry.lines.forEach((line) => {
              if (line.account_id === selectedAcc.id || line.account_code === selectedAcc.code) {
                const deb = Number(line.debit) || 0;
                const cred = Number(line.credit) || 0;
                
                if (selectedAcc.type === 'asset' || selectedAcc.type === 'expense') {
                  runningBalance += deb - cred;
                } else {
                  runningBalance += cred - deb;
                }

                ledgerTransactions.push({
                  id: `${entry.id}-${line.id}`,
                  entryNumber: entry.entry_number,
                  date: entry.date,
                  reference: entry.reference,
                  description: line.description || entry.reference || 'Journal Entry',
                  debit: deb,
                  credit: cred,
                  balance: runningBalance
                });
              }
            });
          });
        }

        const totalDebit = ledgerTransactions.reduce((s, t) => s + t.debit, 0);
        const totalCredit = ledgerTransactions.reduce((s, t) => s + t.credit, 0);

        return (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-slate-900 border border-slate-800 rounded-2xl">
              <div className="flex items-center gap-3">
                <label className="text-xs font-semibold text-slate-300">
                  {lang === 'ar' ? 'اختر الحساب لعرض كشف الأستاذ:' : 'Select Account for Ledger Statement:'}
                </label>
                <select
                  value={selectedLedgerAccountId}
                  onChange={(e) => setSelectedLedgerAccountId(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-amber-400 font-bold focus:outline-none focus:border-amber-500 font-mono"
                >
                  {state.accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.code} - {lang === 'ar' ? acc.name_ar : acc.name} ({acc.type})
                    </option>
                  ))}
                </select>
              </div>

              {selectedAcc && (
                <div className="flex items-center gap-4 text-xs font-mono">
                  <div className="text-slate-400">
                    {lang === 'ar' ? 'الرصيد الختامي:' : 'Closing Balance:'}{' '}
                    <span className="font-bold text-amber-400 text-sm">
                      {runningBalance.toLocaleString()} {state.tenant.currency_symbol}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                <div className="text-xs text-slate-400">{lang === 'ar' ? 'إجمالي المدين' : 'Total Debits'}</div>
                <div className="text-lg font-bold font-mono text-emerald-400 mt-1">
                  {totalDebit.toLocaleString()} {state.tenant.currency_symbol}
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                <div className="text-xs text-slate-400">{lang === 'ar' ? 'إجمالي الدائن' : 'Total Credits'}</div>
                <div className="text-lg font-bold font-mono text-sky-400 mt-1">
                  {totalCredit.toLocaleString()} {state.tenant.currency_symbol}
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                <div className="text-xs text-slate-400">{lang === 'ar' ? 'صافي حركة الحساب' : 'Net Account Balance'}</div>
                <div className="text-lg font-bold font-mono text-amber-400 mt-1">
                  {runningBalance.toLocaleString()} {state.tenant.currency_symbol}
                </div>
              </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="p-4 bg-slate-950/40 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span>
                  {lang === 'ar'
                    ? `حركات الحساب: ${selectedAcc?.code} - ${lang === 'ar' ? selectedAcc?.name_ar : selectedAcc?.name}`
                    : `Transactions for: ${selectedAcc?.code} - ${selectedAcc?.name}`}
                </span>
                <span className="font-mono text-amber-400">{ledgerTransactions.length} Movements</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left rtl:text-right text-xs text-slate-300">
                  <thead className="bg-slate-950/60 text-slate-400 uppercase text-xs border-b border-slate-800">
                    <tr>
                      <th className="p-3.5 font-mono">{lang === 'ar' ? 'التاريخ' : 'Date'}</th>
                      <th className="p-3.5 font-mono">{lang === 'ar' ? 'رقم القيد' : 'Entry #'}</th>
                      <th className="p-3.5">{lang === 'ar' ? 'البيان والتفاصيل' : 'Narration / Description'}</th>
                      <th className="p-3.5 font-mono text-right rtl:text-left text-emerald-400">{lang === 'ar' ? 'مدين (Dr)' : 'Debit'}</th>
                      <th className="p-3.5 font-mono text-right rtl:text-left text-sky-400">{lang === 'ar' ? 'دائن (Cr)' : 'Credit'}</th>
                      <th className="p-3.5 font-mono text-right rtl:text-left text-amber-400">{lang === 'ar' ? 'الرصيد التراكمي' : 'Running Balance'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 font-mono text-xs">
                    {ledgerTransactions.length > 0 ? (
                      ledgerTransactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-800/40 transition">
                          <td className="p-3.5 text-slate-400">{tx.date}</td>
                          <td className="p-3.5 font-bold text-amber-400">{tx.entryNumber}</td>
                          <td className="p-3.5 font-sans text-slate-200">{tx.description}</td>
                          <td className="p-3.5 text-right rtl:text-left text-emerald-400 font-semibold">
                            {tx.debit > 0 ? tx.debit.toLocaleString() : '-'}
                          </td>
                          <td className="p-3.5 text-right rtl:text-left text-sky-400 font-semibold">
                            {tx.credit > 0 ? tx.credit.toLocaleString() : '-'}
                          </td>
                          <td className="p-3.5 text-right rtl:text-left font-bold text-white">
                            {tx.balance.toLocaleString()} {state.tenant.currency_symbol}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-500 font-sans">
                          {lang === 'ar' ? 'لا توجد حركات مرحلة لهذا الحساب حتى الآن' : 'No posted transactions found for this account.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* NEW MANUAL JOURNAL ENTRY MODAL */}
      {showNewEntryModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-lg text-white">
                  {lang === 'ar' ? 'تسجيل قيد يومية مزدوج ومتزن' : 'Post Double-Entry Journal'}
                </h3>
                <p className="text-xs text-slate-400">
                  {lang === 'ar' ? 'إلزامية توازن طرفي القيد (المدين = الدائن)' : 'Debit and Credit totals must be strictly balanced.'}
                </p>
              </div>
              <button onClick={() => setShowNewEntryModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {entryError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{entryError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitEntry} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {lang === 'ar' ? 'المرجع / السند' : 'Reference'}
                  </label>
                  <input
                    type="text"
                    required
                    value={entryReference}
                    onChange={(e) => setEntryReference(e.target.value)}
                    placeholder="e.g. REC-2026-09"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {lang === 'ar' ? 'تاريخ القيد' : 'Date'}
                  </label>
                  <input
                    type="date"
                    required
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Journal Lines Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">{lang === 'ar' ? 'أطراف القيد:' : 'Journal Lines:'}</span>
                  <button
                    type="button"
                    onClick={handleAddLine}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-amber-400 transition flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{lang === 'ar' ? 'إضافة طرف' : 'Add Line'}</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {entryLines.map((line) => (
                    <div key={line.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <select
                          value={line.account_id}
                          onChange={(e) => handleAccountSelect(line.id, e.target.value)}
                          className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                        >
                          {state.accounts.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.code} - {lang === 'ar' ? a.name_ar : a.name}
                            </option>
                          ))}
                        </select>

                        <input
                          type="text"
                          placeholder={lang === 'ar' ? 'بيان الطرف...' : 'Description...'}
                          value={line.description}
                          onChange={(e) => handleLineValueChange(line.id, 'description', e.target.value)}
                          className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                        />
                      </div>

                      <div className="grid grid-cols-5 gap-2 items-center">
                        <div className="col-span-2">
                          <label className="text-[10px] text-slate-400 block mb-0.5">{lang === 'ar' ? 'مدين (Debit)' : 'Debit'}</label>
                          <input
                            type="number"
                            value={line.debit}
                            onChange={(e) => handleLineValueChange(line.id, 'debit', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="text-[10px] text-slate-400 block mb-0.5">{lang === 'ar' ? 'دائن (Credit)' : 'Credit'}</label>
                          <input
                            type="number"
                            value={line.credit}
                            onChange={(e) => handleLineValueChange(line.id, 'credit', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                          />
                        </div>
                        <div className="col-span-1 text-center pt-3">
                          {entryLines.length > 2 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveLine(line.id)}
                              className="p-1 rounded text-rose-400 hover:text-rose-300"
                            >
                              <Trash2 className="w-4 h-4 mx-auto" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* LIVE BALANCING FOOTER */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs flex items-center justify-between">
                <div>
                  <div className="text-slate-400">{lang === 'ar' ? 'إجمالي المدين:' : 'Total Debit:'} <strong className="text-white font-mono">{currentTotalDebit.toLocaleString()}</strong></div>
                  <div className="text-slate-400">{lang === 'ar' ? 'إجمالي الدائن:' : 'Total Credit:'} <strong className="text-white font-mono">{currentTotalCredit.toLocaleString()}</strong></div>
                </div>
                <div className="text-right rtl:text-left">
                  <span
                    className={`px-3 py-1 rounded-lg font-bold text-xs ${
                      isFormBalanced
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {isFormBalanced
                      ? (lang === 'ar' ? 'متزن ومكتمل ✓' : 'Balanced ✓')
                      : (lang === 'ar' ? `فارق: ${Math.abs(currentTotalDebit - currentTotalCredit)} ✗` : `Diff: ${Math.abs(currentTotalDebit - currentTotalCredit)} ✗`)}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewEntryModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-semibold transition"
                >
                  {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={!isFormBalanced}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition shadow-md shadow-amber-500/20 disabled:opacity-50"
                >
                  {lang === 'ar' ? 'ترحيل القيد رسمياً' : 'Post Balanced Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REVERSAL REASON MODAL */}
      {reverseModalEntryId && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-rose-400" />
              <span>{lang === 'ar' ? 'عكس قيد اليومية رسمياً' : 'Official Journal Reversal'}</span>
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {lang === 'ar'
                ? 'وفقاً لقواعد التدقيق ADR-004، سيتم إنشاء قيد معاكس تلقائي يبدل المدين بالدائن لتصحيح الخطأ وتوثيقه في الأثر الرقابي.'
                : 'In accordance with ADR-004, a counter-entry will be posted to cleanly reverse all balances without deleting history.'}
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {lang === 'ar' ? 'سبب وتبرير العكس:' : 'Reversal Reason:'}
              </label>
              <textarea
                rows={2}
                required
                value={reverseReason}
                onChange={(e) => setReverseReason(e.target.value)}
                placeholder={lang === 'ar' ? 'مثال: خطأ في احتساب نسبة الضريبة في الفاتورة' : 'Reason for entry reversal...'}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setReverseModalEntryId(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-semibold"
              >
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={handleConfirmReverse}
                disabled={!reverseReason}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition disabled:opacity-50"
              >
                {lang === 'ar' ? 'تأكيد وترحيل القيد العكسي' : 'Confirm Reversal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
