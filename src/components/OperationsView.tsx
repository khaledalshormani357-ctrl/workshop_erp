import React, { useState } from 'react';
import { useERP } from '../context/ERPContext';
import { SalesInvoice, Quotation, QuotationItem, SalesInvoiceLine } from '../types';
import {
  ShoppingCart,
  Plus,
  FileText,
  Users,
  CheckCircle,
  Clock,
  ArrowRight,
  Printer,
  Hammer,
  Eye,
  X,
  Search
} from 'lucide-react';

export const OperationsView: React.FC = () => {
  const {
    state,
    lang,
    createSalesInvoice,
    createQuotation,
    convertQuotationToWorkOrder,
    setActiveTab,
  } = useERP();

  const [activeSubTab, setActiveSubTab] = useState<'invoices' | 'quotations' | 'customers'>('invoices');
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<SalesInvoice | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Invoice Form State
  const [invCustomerId, setInvCustomerId] = useState(state.customers[0]?.id || '');
  const [invProductId, setInvProductId] = useState(state.products[0]?.id || '');
  const [invQuantity, setInvQuantity] = useState(2);
  const [invUnitPrice, setInvUnitPrice] = useState(state.products[0]?.unit_price || 65000);
  const [invDiscount, setInvDiscount] = useState(0);

  // Quote Form State
  const [quoteCustomerId, setQuoteCustomerId] = useState(state.customers[0]?.id || '');
  const [quoteProductId, setQuoteProductId] = useState(state.products[0]?.id || '');
  const [quoteWidth, setQuoteWidth] = useState(120);
  const [quoteHeight, setQuoteHeight] = useState(120);
  const [quoteQuantity, setQuoteQuantity] = useState(4);
  const [quoteUnitPrice, setQuoteUnitPrice] = useState(65000);
  const [quoteNotes, setQuoteNotes] = useState('');

  const handleProductChange = (prodId: string) => {
    setInvProductId(prodId);
    const prod = state.products.find((p) => p.id === prodId);
    if (prod) {
      setInvUnitPrice(prod.unit_price);
    }
  };

  const handleSaveInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    const prod = state.products.find((p) => p.id === invProductId);
    if (!prod) return;

    const subtotal = invQuantity * invUnitPrice - invDiscount;
    const taxRate = state.tenant.tax_rate;
    const taxAmount = subtotal * taxRate;
    const totalAmount = subtotal + taxAmount;

    const line: SalesInvoiceLine = {
      id: `invl-${Date.now()}`,
      product_id: invProductId,
      description: lang === 'ar' ? prod.name_ar : prod.name,
      quantity: Number(invQuantity),
      unit_price: Number(invUnitPrice),
      discount: Number(invDiscount),
      tax_rate: taxRate,
      subtotal,
      total: totalAmount,
    };

    createSalesInvoice({
      tenant_id: state.tenant.id,
      customer_id: invCustomerId,
      date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      payment_status: 'unpaid',
      lines: [line],
      subtotal,
      tax_amount: taxAmount,
      discount_amount: Number(invDiscount),
      total_amount: totalAmount,
      paid_amount: 0,
      warehouse_id: state.warehouses[0]?.id || 'wh-01',
    });

    setShowInvoiceModal(false);
  };

  const handleSaveQuotation = (e: React.FormEvent) => {
    e.preventDefault();
    const prod = state.products.find((p) => p.id === quoteProductId);
    if (!prod) return;

    const subtotal = quoteQuantity * quoteUnitPrice;
    const taxAmount = subtotal * state.tenant.tax_rate;
    const totalAmount = subtotal + taxAmount;
    const estimatedCost = (prod.unit_cost || 44200) * quoteQuantity;

    const item: QuotationItem = {
      id: `qti-${Date.now()}`,
      product_id: quoteProductId,
      description: `${lang === 'ar' ? prod.name_ar : prod.name} (${quoteWidth}×${quoteHeight} cm)`,
      quantity: Number(quoteQuantity),
      width: Number(quoteWidth),
      height: Number(quoteHeight),
      unit_price: Number(quoteUnitPrice),
      discount: 0,
      tax_rate: state.tenant.tax_rate,
      total: totalAmount,
      estimated_cost: estimatedCost,
    };

    createQuotation({
      tenant_id: state.tenant.id,
      customer_id: quoteCustomerId,
      revision: 1,
      status: 'sent',
      date: new Date().toISOString().split('T')[0],
      valid_until: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
      items: [item],
      subtotal,
      discount_amount: 0,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      estimated_profit_margin: Math.round(((totalAmount - estimatedCost) / totalAmount) * 100),
      notes: quoteNotes,
    });

    setShowQuoteModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Subtab Navigation & Top Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl">
          <button
            onClick={() => setActiveSubTab('invoices')}
            className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition ${
              activeSubTab === 'invoices'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            {lang === 'ar' ? 'فواتير المبيعات' : 'Sales Invoices'} ({state.salesInvoices.length})
          </button>
          <button
            onClick={() => setActiveSubTab('quotations')}
            className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition ${
              activeSubTab === 'quotations'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            {lang === 'ar' ? 'عروض الأسعار' : 'Quotations'} ({state.quotations.length})
          </button>
          <button
            onClick={() => setActiveSubTab('customers')}
            className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition ${
              activeSubTab === 'customers'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            {lang === 'ar' ? 'حسابات العملاء' : 'Customers'} ({state.customers.length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          {activeSubTab === 'invoices' && (
            <button
              onClick={() => setShowInvoiceModal(true)}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm transition flex items-center gap-1.5 shadow-md shadow-amber-500/20"
            >
              <Plus className="w-4 h-4" />
              <span>{lang === 'ar' ? 'إنشاء فاتورة مبيعات' : 'New Sales Invoice'}</span>
            </button>
          )}
          {activeSubTab === 'quotations' && (
            <button
              onClick={() => setShowQuoteModal(true)}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm transition flex items-center gap-1.5 shadow-md shadow-amber-500/20"
            >
              <Plus className="w-4 h-4" />
              <span>{lang === 'ar' ? 'إنشاء عرض سعر جديد' : 'New Quotation'}</span>
            </button>
          )}
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute top-3 left-3 rtl:right-3 rtl:left-auto" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={
            lang === 'ar'
              ? 'بحث برقم الفاتورة، اسم العميل، رقم العرض...'
              : 'Search by invoice number, customer name, quotation...'
          }
          className="w-full pl-9 pr-4 rtl:pr-9 rtl:pl-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/60"
        />
      </div>

      {/* INVOICES LIST */}
      {activeSubTab === 'invoices' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left rtl:text-right text-xs sm:text-sm text-slate-300">
              <thead className="bg-slate-950/60 text-slate-400 font-bold text-xs uppercase border-b border-slate-800">
                <tr>
                  <th className="p-3.5">{lang === 'ar' ? 'رقم الفاتورة' : 'Invoice #'}</th>
                  <th className="p-3.5">{lang === 'ar' ? 'العميل' : 'Customer'}</th>
                  <th className="p-3.5">{lang === 'ar' ? 'التاريخ' : 'Date'}</th>
                  <th className="p-3.5">{lang === 'ar' ? 'المبلغ الإجمالي' : 'Total Amount'}</th>
                  <th className="p-3.5">{lang === 'ar' ? 'المدفوع' : 'Paid'}</th>
                  <th className="p-3.5">{lang === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th className="p-3.5 text-center">{lang === 'ar' ? 'المعاينة' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {state.salesInvoices
                  .filter((inv) => {
                    const cust = state.customers.find((c) => c.id === inv.customer_id);
                    const q = searchQuery.toLowerCase();
                    return (
                      inv.invoice_number.toLowerCase().includes(q) ||
                      (cust && (cust.name.toLowerCase().includes(q) || cust.name_ar.includes(q)))
                    );
                  })
                  .map((inv) => {
                    const cust = state.customers.find((c) => c.id === inv.customer_id);
                    return (
                      <tr key={inv.id} className="hover:bg-slate-800/40 transition">
                        <td className="p-3.5 font-mono font-bold text-amber-400">{inv.invoice_number}</td>
                        <td className="p-3.5 font-semibold text-slate-200">
                          {cust ? (lang === 'ar' ? cust.name_ar : cust.name) : inv.customer_id}
                        </td>
                        <td className="p-3.5 text-slate-400">{inv.date}</td>
                        <td className="p-3.5 font-bold text-white">
                          {inv.total_amount.toLocaleString()} {state.tenant.currency_symbol}
                        </td>
                        <td className="p-3.5 text-emerald-400 font-semibold">
                          {inv.paid_amount.toLocaleString()} {state.tenant.currency_symbol}
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase ${
                              inv.payment_status === 'paid'
                                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                : inv.payment_status === 'partial'
                                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                            }`}
                          >
                            {inv.payment_status}
                          </span>
                        </td>
                        <td className="p-3.5 text-center">
                          <button
                            onClick={() => setSelectedInvoice(inv)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                            title="View Invoice & Accounting Journal Link"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* QUOTATIONS LIST */}
      {activeSubTab === 'quotations' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left rtl:text-right text-xs sm:text-sm text-slate-300">
              <thead className="bg-slate-950/60 text-slate-400 font-bold text-xs uppercase border-b border-slate-800">
                <tr>
                  <th className="p-3.5">{lang === 'ar' ? 'رقم العرض' : 'Quote #'}</th>
                  <th className="p-3.5">{lang === 'ar' ? 'العميل' : 'Customer'}</th>
                  <th className="p-3.5">{lang === 'ar' ? 'المقاس والبنود' : 'Items & Dims'}</th>
                  <th className="p-3.5">{lang === 'ar' ? 'الإجمالي' : 'Total'}</th>
                  <th className="p-3.5">{lang === 'ar' ? 'هامش الربح' : 'Margin'}</th>
                  <th className="p-3.5">{lang === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th className="p-3.5 text-center">{lang === 'ar' ? 'تحويل لتصنيع' : 'Convert'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {state.quotations.map((qt) => {
                  const cust = state.customers.find((c) => c.id === qt.customer_id);
                  const firstItem = qt.items[0];
                  return (
                    <tr key={qt.id} className="hover:bg-slate-800/40 transition">
                      <td className="p-3.5 font-mono font-bold text-amber-400">
                        {qt.quote_number} (Rev {qt.revision})
                      </td>
                      <td className="p-3.5 font-semibold text-slate-200">
                        {cust ? (lang === 'ar' ? cust.name_ar : cust.name) : qt.customer_id}
                      </td>
                      <td className="p-3.5 text-slate-300">
                        {firstItem?.description}
                      </td>
                      <td className="p-3.5 font-bold text-white">
                        {qt.total_amount.toLocaleString()} {state.tenant.currency_symbol}
                      </td>
                      <td className="p-3.5 text-emerald-400 font-semibold">
                        {qt.estimated_profit_margin}%
                      </td>
                      <td className="p-3.5">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700 uppercase">
                          {qt.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        {qt.status !== 'converted' ? (
                          <button
                            onClick={() => convertQuotationToWorkOrder(qt.id)}
                            className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition flex items-center gap-1 mx-auto"
                          >
                            <Hammer className="w-3.5 h-3.5" />
                            <span>{lang === 'ar' ? 'تحويل لأمر عمل' : 'Work Order'}</span>
                          </button>
                        ) : (
                          <span className="text-xs text-emerald-400 font-semibold flex items-center justify-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" />
                            {lang === 'ar' ? 'تم التحويل' : 'Converted'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CUSTOMERS DIRECTORY & BALANCES */}
      {activeSubTab === 'customers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {state.customers.map((cust) => (
            <div
              key={cust.id}
              className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-slate-100 text-base">
                    {lang === 'ar' ? cust.name_ar : cust.name}
                  </h4>
                  <span className="text-xs text-amber-400 uppercase font-medium">
                    {cust.type}
                  </span>
                </div>
                <div className="text-right rtl:text-left">
                  <div className="text-xs text-slate-400">{lang === 'ar' ? 'الرصيد القائم' : 'Balance'}</div>
                  <div className="text-base font-extrabold text-white">
                    {cust.current_balance.toLocaleString()} {state.tenant.currency_symbol}
                  </div>
                </div>
              </div>

              <div className="text-xs text-slate-400 space-y-1">
                <div>{lang === 'ar' ? 'الهاتف:' : 'Phone:'} {cust.phone}</div>
                <div>{lang === 'ar' ? 'العنوان:' : 'Address:'} {cust.address}</div>
                <div>{lang === 'ar' ? 'سقف الائتمان:' : 'Credit Limit:'} {cust.credit_limit.toLocaleString()} {state.tenant.currency_symbol}</div>
              </div>

              <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
                <span className="text-[11px] text-slate-500">
                  {lang === 'ar' ? 'مسجل في دفتر الأستاذ العام' : 'Synced to General Ledger (1130)'}
                </span>
                <span className="text-xs text-emerald-400 font-semibold">
                  {cust.status.toUpperCase()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE SALES INVOICE MODAL */}
      {showInvoiceModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-lg text-white">
                {lang === 'ar' ? 'إنشاء فاتورة مبيعات جديدة' : 'New Sales Invoice'}
              </h3>
              <button
                onClick={() => setShowInvoiceModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveInvoice} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {lang === 'ar' ? 'العميل' : 'Customer'}
                </label>
                <select
                  value={invCustomerId}
                  onChange={(e) => setInvCustomerId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  {state.customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {lang === 'ar' ? c.name_ar : c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {lang === 'ar' ? 'الصنف المباع' : 'Product'}
                </label>
                <select
                  value={invProductId}
                  onChange={(e) => handleProductChange(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  {state.products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {lang === 'ar' ? p.name_ar : p.name} (Cost: {p.unit_cost.toLocaleString()} {state.tenant.currency_symbol})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {lang === 'ar' ? 'الكمية' : 'Quantity'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={invQuantity}
                    onChange={(e) => setInvQuantity(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {lang === 'ar' ? 'سعر الوحدة' : 'Unit Price'}
                  </label>
                  <input
                    type="number"
                    value={invUnitPrice}
                    onChange={(e) => setInvUnitPrice(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Total Breakdown Callout */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1.5">
                <div className="flex justify-between text-slate-400">
                  <span>{lang === 'ar' ? 'المبلغ قبل الضريبة:' : 'Subtotal:'}</span>
                  <span>{(invQuantity * invUnitPrice).toLocaleString()} {state.tenant.currency_symbol}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>{lang === 'ar' ? 'ضريبة المبيعات (5%):' : 'Tax (5%):'}</span>
                  <span>{Math.round(invQuantity * invUnitPrice * 0.05).toLocaleString()} {state.tenant.currency_symbol}</span>
                </div>
                <div className="flex justify-between text-base font-bold text-amber-400 pt-1 border-t border-slate-800">
                  <span>{lang === 'ar' ? 'المبلغ الإجمالي المستحق:' : 'Total Amount:'}</span>
                  <span>{Math.round(invQuantity * invUnitPrice * 1.05).toLocaleString()} {state.tenant.currency_symbol}</span>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInvoiceModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-semibold transition"
                >
                  {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition shadow-md shadow-amber-500/20"
                >
                  {lang === 'ar' ? 'حفظ وترحيل الفاتورة والقيد' : 'Post Invoice & Accounting'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE QUOTATION MODAL */}
      {showQuoteModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-lg text-white">
                {lang === 'ar' ? 'إنشاء عرض سعر تفصيلي للمشروع' : 'New Workshop Quotation'}
              </h3>
              <button
                onClick={() => setShowQuoteModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQuotation} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {lang === 'ar' ? 'العميل' : 'Customer'}
                </label>
                <select
                  value={quoteCustomerId}
                  onChange={(e) => setQuoteCustomerId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  {state.customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {lang === 'ar' ? c.name_ar : c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {lang === 'ar' ? 'الصنف المعني' : 'Product / Model'}
                </label>
                <select
                  value={quoteProductId}
                  onChange={(e) => setQuoteProductId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  {state.products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {lang === 'ar' ? p.name_ar : p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {lang === 'ar' ? 'العرض (سم)' : 'Width (cm)'}
                  </label>
                  <input
                    type="number"
                    value={quoteWidth}
                    onChange={(e) => setQuoteWidth(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {lang === 'ar' ? 'الارتفاع (سم)' : 'Height (cm)'}
                  </label>
                  <input
                    type="number"
                    value={quoteHeight}
                    onChange={(e) => setQuoteHeight(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {lang === 'ar' ? 'العدد' : 'Qty'}
                  </label>
                  <input
                    type="number"
                    value={quoteQuantity}
                    onChange={(e) => setQuoteQuantity(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {lang === 'ar' ? 'سعر البيع المقترح للوحدة' : 'Proposed Unit Price'}
                </label>
                <input
                  type="number"
                  value={quoteUnitPrice}
                  onChange={(e) => setQuoteUnitPrice(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {lang === 'ar' ? 'ملاحظات التركيب والموقع' : 'Site Notes'}
                </label>
                <textarea
                  rows={2}
                  value={quoteNotes}
                  onChange={(e) => setQuoteNotes(e.target.value)}
                  placeholder={lang === 'ar' ? 'مثال: يشمل فوم التثبيت والسيليكون المقاوم للحرارة' : 'Includes silicone & installation'}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowQuoteModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-semibold transition"
                >
                  {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition shadow-md shadow-amber-500/20"
                >
                  {lang === 'ar' ? 'حفظ وإصدار عرض السعر' : 'Issue Quotation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW INVOICE MODAL */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-lg text-white font-mono">{selectedInvoice.invoice_number}</h3>
                <p className="text-xs text-slate-400">
                  {lang === 'ar' ? 'معاينة الفاتورة والأثر المحاسبي التلقائي' : 'Invoice Details & Double-Entry Link'}
                </p>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">{lang === 'ar' ? 'تاريخ الفاتورة:' : 'Date:'}</span>
                <span className="font-semibold text-slate-200">{selectedInvoice.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">{lang === 'ar' ? 'حالة الترحيل:' : 'Posting Status:'}</span>
                <span className="text-emerald-400 font-bold uppercase">{selectedInvoice.status}</span>
              </div>

              <div className="pt-2 border-t border-slate-800">
                <div className="font-bold text-slate-300 mb-1.5">{lang === 'ar' ? 'البنود:' : 'Items:'}</div>
                {selectedInvoice.lines.map((l) => (
                  <div key={l.id} className="flex justify-between text-slate-300 py-1">
                    <span>{l.description} (x{l.quantity})</span>
                    <span className="font-mono">{l.total.toLocaleString()} {state.tenant.currency_symbol}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-slate-800 flex justify-between font-bold text-amber-400 text-sm">
                <span>{lang === 'ar' ? 'الإجمالي النهائي:' : 'Total Amount:'}</span>
                <span>{selectedInvoice.total_amount.toLocaleString()} {state.tenant.currency_symbol}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setSelectedInvoice(null);
                  setActiveTab('accounting');
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-purple-300 transition"
              >
                {lang === 'ar' ? 'الانتقال لقيد اليومية المرتبط ←' : 'View Linked Journal Entry →'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
