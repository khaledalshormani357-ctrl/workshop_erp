import React, { useState } from 'react';
import { useERP } from '../context/ERPContext';
import { PurchaseOrderLine } from '../types';
import {
  ShoppingCart,
  Plus,
  Search,
  Truck,
  CheckCircle2,
  Trash2,
  X,
  Layers,
  DollarSign
} from 'lucide-react';

export const PurchasesView: React.FC = () => {
  const { state, lang, createPurchaseOrder } = useERP();
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [supplierId, setSupplierId] = useState(state.suppliers[0]?.id || '');
  const [warehouseId, setWarehouseId] = useState(state.warehouses[0]?.id || 'wh-main');
  const [lines, setLines] = useState<PurchaseOrderLine[]>([
    {
      id: 'pol-1',
      product_id: state.products.find((p) => p.type === 'profile' || p.type === 'raw')?.id || state.products[0]?.id || '',
      description: 'مقاطع ألمنيوم 6 متر',
      quantity: 50,
      unit_cost: 12500,
      total: 625000,
    },
  ]);

  const rawProducts = state.products.filter((p) => p.type === 'profile' || p.type === 'glass' || p.type === 'accessory' || p.type === 'raw');

  const addLine = () => {
    const prod = rawProducts[0] || state.products[0];
    if (!prod) return;
    setLines([
      ...lines,
      {
        id: `pol-${Date.now()}`,
        product_id: prod.id,
        description: prod.name_ar || prod.name,
        quantity: 10,
        unit_cost: prod.unit_cost,
        total: 10 * prod.unit_cost,
      },
    ]);
  };

  const removeLine = (index: number) => {
    if (lines.length <= 1) return;
    setLines(lines.filter((_, i) => i !== index));
  };

  const updateLine = (index: number, field: 'product_id' | 'quantity' | 'unit_cost', value: any) => {
    const newLines = [...lines];
    const line = { ...newLines[index] };

    if (field === 'product_id') {
      line.product_id = value;
      const p = state.products.find((prod) => prod.id === value);
      if (p) {
        line.description = p.name_ar || p.name;
        line.unit_cost = p.unit_cost;
      }
    } else if (field === 'quantity') {
      line.quantity = Number(value);
    } else if (field === 'unit_cost') {
      line.unit_cost = Number(value);
    }

    line.total = line.quantity * line.unit_cost;
    newLines[index] = line;
    setLines(newLines);
  };

  const totalAmount = lines.reduce((acc, l) => acc + l.total, 0);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId || lines.length === 0) return;

    createPurchaseOrder({
      tenant_id: state.tenant.id,
      supplier_id: supplierId,
      warehouse_id: warehouseId,
      date: new Date().toISOString().split('T')[0],
      expected_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      lines,
      total_amount: totalAmount,
      paid_amount: 0,
    });

    setShowModal(false);
  };

  const filteredPOs = state.purchaseOrders.filter((po) => {
    const sup = state.suppliers.find((s) => s.id === po.supplier_id);
    const q = searchQuery.toLowerCase();
    return (
      po.po_number.toLowerCase().includes(q) ||
      (sup && (sup.name.toLowerCase().includes(q) || (sup.name_ar && sup.name_ar.toLowerCase().includes(q))))
    );
  });

  const totalPurchasesSum = state.purchaseOrders.reduce((acc, po) => acc + po.total_amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <ShoppingCart className="w-7 h-7 text-amber-400" />
            <span>{lang === 'ar' ? 'أوامر الشراء وتوريد المواد الخام' : 'Purchase Orders & Materials Inward'}</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {lang === 'ar'
              ? 'إدارة مشتريات مقاطع الألمنيوم، الزجاج، وتأثيرها على المخزون وحسابات الموردين'
              : 'Procurement of aluminium billets/profiles, glass sheets, and auto stock updates.'}
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="min-h-[48px] px-5 py-3 rounded-xl font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
          <span>{lang === 'ar' ? 'أمر شراء جديد' : 'New Purchase Order'}</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase">
              {lang === 'ar' ? 'إجمالي أوامر الشراء' : 'Total Purchase Orders'}
            </span>
            <div className="text-2xl font-extrabold text-white mt-1">{state.purchaseOrders.length}</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <ShoppingCart className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase">
              {lang === 'ar' ? 'إجمالي قيمة المشتريات' : 'Total Purchases Value'}
            </span>
            <div className="text-2xl font-extrabold text-amber-400 mt-1">
              {totalPurchasesSum.toLocaleString()} {state.tenant.currency_symbol}
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase">
              {lang === 'ar' ? 'أوامر مستلمة بالمستودع' : 'Received In Stock'}
            </span>
            <div className="text-2xl font-extrabold text-emerald-400 mt-1">
              {state.purchaseOrders.filter((po) => po.status === 'received' || po.status === 'invoiced').length}
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Truck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 rtl:right-3 rtl:left-auto left-auto top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={lang === 'ar' ? 'البحث برقم أمر الشراء أو المورد...' : 'Search PO # or supplier...'}
            className="w-full min-h-[44px] bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-4 rtl:pr-9 rtl:pl-4 text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Orders List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredPOs.map((po) => {
          const sup = state.suppliers.find((s) => s.id === po.supplier_id);
          const isReceived = po.status === 'received' || po.status === 'invoiced';

          return (
            <div
              key={po.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between shadow-md space-y-4"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="font-mono font-bold text-amber-400 text-sm">{po.po_number}</span>
                    <h3 className="text-base font-bold text-white mt-1">
                      {sup ? (lang === 'ar' ? sup.name_ar || sup.name : sup.name) : '-'}
                    </h3>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold border ${
                      isReceived
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    }`}
                  >
                    {isReceived ? (lang === 'ar' ? 'تم الاستلام بالمستودع' : 'Received') : (lang === 'ar' ? 'قيد التوريد' : 'Pending')}
                  </span>
                </div>

                <div className="mt-3 space-y-2 bg-slate-950/60 rounded-xl p-3 border border-slate-800/80 text-xs">
                  {po.lines.map((line, idx) => {
                    const prod = state.products.find((p) => p.id === line.product_id);
                    return (
                      <div key={idx} className="flex items-center justify-between text-slate-300">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center text-[10px] font-bold">
                            {idx + 1}
                          </span>
                          <span className="font-medium truncate max-w-[200px]">
                            {prod ? (lang === 'ar' ? prod.name_ar || prod.name : prod.name) : line.description}
                          </span>
                        </div>
                        <span className="font-bold text-white font-mono">
                          {line.quantity} × {line.unit_cost.toLocaleString()}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-3 flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
                  <span>{lang === 'ar' ? 'تاريخ التوريد:' : 'PO Date:'} <span className="font-mono text-slate-300">{po.date}</span></span>
                  <div className="text-right rtl:text-left">
                    <span className="text-xs text-slate-400">{lang === 'ar' ? 'الإجمالي:' : 'Total:'} </span>
                    <span className="text-base font-extrabold text-amber-400 font-mono">
                      {po.total_amount.toLocaleString()} {state.tenant.currency_symbol}
                    </span>
                  </div>
                </div>
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
                <ShoppingCart className="w-5 h-5 text-amber-400" />
                <span>{lang === 'ar' ? 'إنشاء أمر شراء مواد خام جديد' : 'New Purchase Order'}</span>
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
                    {lang === 'ar' ? 'المورد المعتمد' : 'Supplier'} *
                  </label>
                  <select
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="w-full min-h-[44px] bg-slate-950 border border-slate-800 rounded-xl px-3 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    {state.suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {lang === 'ar' ? s.name_ar || s.name : s.name} ({s.phone})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    {lang === 'ar' ? 'مستودع الاستلام' : 'Receiving Warehouse'}
                  </label>
                  <select
                    value={warehouseId}
                    onChange={(e) => setWarehouseId(e.target.value)}
                    className="w-full min-h-[44px] bg-slate-950 border border-slate-800 rounded-xl px-3 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    {state.warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {lang === 'ar' ? w.name_ar : w.name} ({w.location})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Lines */}
              <div className="space-y-2 border-t border-slate-800 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">
                    {lang === 'ar' ? 'بنود الأصناف المطلوبة' : 'Items & Quantities'}
                  </span>
                  <button
                    type="button"
                    onClick={addLine}
                    className="min-h-[36px] px-3 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{lang === 'ar' ? 'إضافة بند' : 'Add Item'}</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {lines.map((line, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-950 border border-slate-800 rounded-xl p-3 grid grid-cols-12 gap-2 items-center text-xs"
                    >
                      <div className="col-span-6 sm:col-span-5">
                        <label className="text-[10px] text-slate-400 block mb-0.5">{lang === 'ar' ? 'الصنف' : 'Product'}</label>
                        <select
                          value={line.product_id}
                          onChange={(e) => updateLine(idx, 'product_id', e.target.value)}
                          className="w-full min-h-[38px] bg-slate-900 border border-slate-800 rounded-lg px-2 text-xs text-white"
                        >
                          {state.products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.sku} - {lang === 'ar' ? p.name_ar || p.name : p.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-3 sm:col-span-3">
                        <label className="text-[10px] text-slate-400 block mb-0.5">{lang === 'ar' ? 'الكمية' : 'Qty'}</label>
                        <input
                          type="number"
                          value={line.quantity}
                          onChange={(e) => updateLine(idx, 'quantity', e.target.value)}
                          className="w-full min-h-[38px] bg-slate-900 border border-slate-800 rounded-lg px-2 text-center text-white font-mono"
                        />
                      </div>
                      <div className="col-span-3 sm:col-span-3">
                        <label className="text-[10px] text-slate-400 block mb-0.5">{lang === 'ar' ? 'التكلفة' : 'Unit Cost'}</label>
                        <input
                          type="number"
                          value={line.unit_cost}
                          onChange={(e) => updateLine(idx, 'unit_cost', e.target.value)}
                          className="w-full min-h-[38px] bg-slate-900 border border-slate-800 rounded-lg px-2 text-center text-white font-mono"
                        />
                      </div>
                      <div className="col-span-12 sm:col-span-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => removeLine(idx)}
                          className="text-slate-500 hover:text-rose-400 p-1.5 transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Summary */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex justify-between items-center text-xs">
                <span className="text-slate-400 font-semibold">{lang === 'ar' ? 'إجمالي قيمة أمر الشراء:' : 'Total Purchase Order Amount:'}</span>
                <span className="text-base font-black text-amber-400 font-mono">
                  {totalAmount.toLocaleString()} {state.tenant.currency_symbol}
                </span>
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
                  {lang === 'ar' ? 'حفظ وتأكيد أمر الشراء' : 'Save Purchase Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
