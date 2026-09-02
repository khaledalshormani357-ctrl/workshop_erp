import React, { useState } from 'react';
import { useERP } from '../context/ERPContext';
import { QuotationItem } from '../types';
import {
  FileSpreadsheet,
  Plus,
  Search,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
  Printer,
  X,
  Trash2,
  DollarSign
} from 'lucide-react';

export const QuotationsView: React.FC = () => {
  const { state, lang, createQuotation, convertQuotationToWorkOrder } = useERP();
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [customerId, setCustomerId] = useState(state.customers[0]?.id || '');
  const [validUntil, setValidUntil] = useState(
    new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]
  );
  const [items, setItems] = useState<QuotationItem[]>([
    {
      id: 'qi-1',
      product_id: state.products.find((p) => p.type === 'finished')?.id || 'p-win-1',
      description: 'نافذة ألمنيوم سحاب دبل جلاس 120×150 سم',
      width: 150,
      height: 120,
      quantity: 4,
      unit_price: 52000,
      discount: 0,
      tax_rate: 0.05,
      total: 208000,
      estimated_cost: 38000,
    },
  ]);

  const addItem = () => {
    setItems([
      ...items,
      {
        id: `qi-${Date.now()}`,
        product_id: state.products.find((p) => p.type === 'finished')?.id || 'p-door-1',
        description: lang === 'ar' ? 'باب ألمنيوم مفصلي مع زجاج مثلج 210×90 سم' : 'Hinged Door Frosted Glass 210x90cm',
        width: 90,
        height: 210,
        quantity: 1,
        unit_price: 90000,
        discount: 0,
        tax_rate: 0.05,
        total: 90000,
        estimated_cost: 65000,
      },
    ]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    const item = { ...newItems[index] };

    if (field === 'description') {
      item.description = value;
    } else if (field === 'quantity') {
      item.quantity = Number(value);
      item.total = item.quantity * item.unit_price;
    } else if (field === 'unit_price') {
      item.unit_price = Number(value);
      item.total = item.quantity * item.unit_price;
    } else if (field === 'width') {
      item.width = Number(value);
    } else if (field === 'height') {
      item.height = Number(value);
    }

    newItems[index] = item;
    setItems(newItems);
  };

  const subtotal = items.reduce((acc, l) => acc + l.total, 0);
  const taxAmount = subtotal * state.tenant.tax_rate;
  const totalAmount = subtotal + taxAmount;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || items.length === 0) return;

    createQuotation({
      tenant_id: state.tenant.id,
      customer_id: customerId,
      items,
      subtotal,
      discount_amount: 0,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      status: 'draft',
      valid_until: validUntil,
      revision: 1,
      date: new Date().toISOString().split('T')[0],
      estimated_profit_margin: 25,
    });

    setShowModal(false);
  };

  const filteredQuotes = state.quotations.filter((q) => {
    const cust = state.customers.find((c) => c.id === q.customer_id);
    const search = searchQuery.toLowerCase();
    return (
      q.quote_number.toLowerCase().includes(search) ||
      (cust && (cust.name.toLowerCase().includes(search) || (cust.name_ar && cust.name_ar.toLowerCase().includes(search))))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <FileSpreadsheet className="w-7 h-7 text-amber-400" />
            <span>{lang === 'ar' ? 'عروض الأسعار والتسعير البارامتري' : 'Quotations & Parametric Estimates'}</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {lang === 'ar'
              ? 'إنشاء عروض أسعار دقيقة بالأبعاد (العرض × الارتفاع) مع هامش الربح والتحويل لأمر تصنيع'
              : 'Dimension-based quotations with instant margins, tax calculation & work order conversion.'}
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="min-h-[48px] px-5 py-3 rounded-xl font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
          <span>{lang === 'ar' ? 'عرض سعر جديد' : 'New Quotation'}</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase">
              {lang === 'ar' ? 'إجمالي عروض الأسعار' : 'Total Quotations'}
            </span>
            <div className="text-2xl font-extrabold text-white mt-1">{state.quotations.length}</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase">
              {lang === 'ar' ? 'قيمة العروض النشطة' : 'Active Quotes Value'}
            </span>
            <div className="text-2xl font-extrabold text-amber-400 mt-1">
              {state.quotations
                .filter((q) => q.status !== 'converted')
                .reduce((acc, q) => acc + q.total_amount, 0)
                .toLocaleString()}{' '}
              {state.tenant.currency_symbol}
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase">
              {lang === 'ar' ? 'العروض المقبولة والمحولة لتصنيع' : 'Converted to Work Orders'}
            </span>
            <div className="text-2xl font-extrabold text-emerald-400 mt-1">
              {state.quotations.filter((q) => q.status === 'converted' || q.status === 'approved').length}
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Sparkles className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 rtl:right-3 rtl:left-auto left-auto top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={lang === 'ar' ? 'البحث برقم العرض أو العميل...' : 'Search quote # or customer...'}
            className="w-full min-h-[44px] bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-4 rtl:pr-9 rtl:pl-4 text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Quotations List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredQuotes.map((q) => {
          const cust = state.customers.find((c) => c.id === q.customer_id);
          const isConverted = q.status === 'converted' || q.status === 'approved';

          return (
            <div
              key={q.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between shadow-md space-y-4"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="font-mono font-bold text-amber-400 text-sm">{q.quote_number}</span>
                    <h3 className="text-base font-bold text-white mt-1">
                      {cust ? (lang === 'ar' ? cust.name_ar || cust.name : cust.name) : '-'}
                    </h3>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold border ${
                      isConverted
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    }`}
                  >
                    {isConverted ? (lang === 'ar' ? 'مقبول ومحول لتصنيع' : 'Converted') : (lang === 'ar' ? 'قيد المراجعة' : 'Draft / Sent')}
                  </span>
                </div>

                {/* Items summary */}
                <div className="mt-3 space-y-2 bg-slate-950/60 rounded-xl p-3 border border-slate-800/80 text-xs">
                  {q.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-slate-300">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center text-[10px] font-bold">
                          {idx + 1}
                        </span>
                        <span className="font-medium truncate max-w-[200px]">{item.description}</span>
                        {item.width && item.height && (
                          <span className="text-[11px] text-amber-400/80 font-mono">
                            ({item.width}×{item.height} cm)
                          </span>
                        )}
                      </div>
                      <span className="font-bold text-white font-mono">
                        {item.quantity} × {item.unit_price.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    {lang === 'ar' ? 'صالح حتى: ' : 'Valid until: '}
                    <span className="font-mono text-slate-300">{q.valid_until}</span>
                  </span>
                  <div className="text-right rtl:text-left">
                    <span className="text-xs text-slate-400">{lang === 'ar' ? 'الإجمالي مع الضريبة:' : 'Total:'} </span>
                    <span className="text-base font-extrabold text-amber-400 font-mono">
                      {q.total_amount.toLocaleString()} {state.tenant.currency_symbol}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                {!isConverted && (
                  <button
                    onClick={() => convertQuotationToWorkOrder(q.id)}
                    className="min-h-[44px] flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-sm cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{lang === 'ar' ? 'قبول وتحويل لأمر تصنيع (Work Order)' : 'Convert to Work Order'}</span>
                  </button>
                )}
                {isConverted && (
                  <div className="min-h-[44px] flex-1 py-2.5 px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{lang === 'ar' ? 'تم إنشاء أمر الشغل ومحرك التقطيع' : 'Work Order Created'}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-amber-400" />
                <span>{lang === 'ar' ? 'إعداد عرض سعر بارامتري جديد' : 'New Parametric Quotation'}</span>
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    {lang === 'ar' ? 'العميل' : 'Customer'} *
                  </label>
                  <select
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    className="w-full min-h-[44px] bg-slate-950 border border-slate-800 rounded-xl px-3 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    {state.customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {lang === 'ar' ? c.name_ar || c.name : c.name} ({c.phone})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    {lang === 'ar' ? 'صلاحية العرض حتى تاريخ' : 'Valid Until Date'}
                  </label>
                  <input
                    type="date"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                    className="w-full min-h-[44px] bg-slate-950 border border-slate-800 rounded-xl px-3 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Items */}
              <div className="space-y-2 border-t border-slate-800 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">
                    {lang === 'ar' ? 'بنود الألمنيوم والزجاج والحديد' : 'Quotation Items'}
                  </span>
                  <button
                    type="button"
                    onClick={addItem}
                    className="min-h-[36px] px-3 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{lang === 'ar' ? 'إضافة بند' : 'Add Item'}</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {items.map((item, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2"
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => updateItem(idx, 'description', e.target.value)}
                          placeholder="وصف البند"
                          className="flex-1 min-h-[38px] bg-slate-900 border border-slate-800 rounded-lg px-2.5 text-xs text-white"
                        />
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          className="text-slate-500 hover:text-rose-400 p-1 transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-4 gap-2 text-xs">
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-0.5">{lang === 'ar' ? 'العرض (سم)' : 'Width (cm)'}</label>
                          <input
                            type="number"
                            value={item.width || 120}
                            onChange={(e) => updateItem(idx, 'width', e.target.value)}
                            className="w-full min-h-[36px] bg-slate-900 border border-slate-800 rounded-lg px-2 text-center text-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-0.5">{lang === 'ar' ? 'الارتفاع (سم)' : 'Height (cm)'}</label>
                          <input
                            type="number"
                            value={item.height || 150}
                            onChange={(e) => updateItem(idx, 'height', e.target.value)}
                            className="w-full min-h-[36px] bg-slate-900 border border-slate-800 rounded-lg px-2 text-center text-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-0.5">{lang === 'ar' ? 'الكمية' : 'Qty'}</label>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                            className="w-full min-h-[36px] bg-slate-900 border border-slate-800 rounded-lg px-2 text-center text-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-0.5">{lang === 'ar' ? 'سعر الوحدة' : 'Unit Price'}</label>
                          <input
                            type="number"
                            value={item.unit_price}
                            onChange={(e) => updateItem(idx, 'unit_price', e.target.value)}
                            className="w-full min-h-[36px] bg-slate-900 border border-slate-800 rounded-lg px-2 text-left rtl:text-left ltr:text-right text-white font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>{lang === 'ar' ? 'المجموع الفرعي:' : 'Subtotal:'}</span>
                  <span className="font-mono">{subtotal.toLocaleString()} {state.tenant.currency_symbol}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>{lang === 'ar' ? 'الضريبة (5%):' : 'Tax (5%):'}</span>
                  <span className="font-mono">{taxAmount.toLocaleString()} {state.tenant.currency_symbol}</span>
                </div>
                <div className="flex justify-between text-sm font-extrabold text-amber-400 pt-2 border-t border-slate-800">
                  <span>{lang === 'ar' ? 'الإجمالي النهائي:' : 'Final Total:'}</span>
                  <span className="font-mono text-base">{totalAmount.toLocaleString()} {state.tenant.currency_symbol}</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="min-h-[48px] px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs sm:text-sm font-semibold transition cursor-pointer"
                >
                  {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="min-h-[48px] px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm shadow-md transition cursor-pointer"
                >
                  {lang === 'ar' ? 'حفظ عرض السعر' : 'Save Quotation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
