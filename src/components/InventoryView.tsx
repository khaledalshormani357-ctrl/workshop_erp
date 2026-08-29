import React, { useState } from 'react';
import { useERP } from '../context/ERPContext';
import { InventoryEngine } from '../services/inventoryEngine';
import { StockMovementType } from '../types';
import {
  Boxes,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  AlertTriangle,
  Layers,
  Search,
  SlidersHorizontal,
  X
} from 'lucide-react';

export const InventoryView: React.FC = () => {
  const { state, lang, createStockMovement } = useERP();
  const [activeTab, setActiveTab] = useState<'summary' | 'movements' | 'warehouses'>('summary');
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // New Movement Modal State
  const [movProductId, setMovProductId] = useState(state.products[0]?.id || '');
  const [movWarehouseId, setMovWarehouseId] = useState(state.warehouses[0]?.id || 'wh-01');
  const [movType, setMovType] = useState<StockMovementType>('purchase_receipt');
  const [movQty, setMovQty] = useState(10);
  const [movNotes, setMovNotes] = useState('');

  const summaries = InventoryEngine.computeStockSummary(state.products, state.stockMovements);

  const handleSaveMovement = (e: React.FormEvent) => {
    e.preventDefault();
    const prod = state.products.find((p) => p.id === movProductId);
    if (!prod) return;

    const direction =
      movType === 'purchase_receipt' ||
      movType === 'production_output' ||
      movType === 'adjustment_pos' ||
      movType === 'sale_return' ||
      movType === 'transfer_in'
        ? 'in'
        : 'out';

    createStockMovement({
      tenant_id: state.tenant.id,
      product_id: movProductId,
      warehouse_id: movWarehouseId,
      type: movType,
      quantity: Number(movQty),
      unit_cost: prod.unit_cost,
      direction,
      reference_type: 'adjustment',
      reference_id: `ADJ-${Date.now().toString().slice(-4)}`,
      notes: movNotes || 'Manual stock operation from workshop console',
    });

    setShowMovementModal(false);
  };

  const getMovementTypeBadge = (type: StockMovementType, direction: 'in' | 'out') => {
    const isPositive = direction === 'in';
    return (
      <span
        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase flex items-center gap-1 w-fit ${
          isPositive
            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
            : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
        }`}
      >
        {isPositive ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
        <span>{type.replace('_', ' ')}</span>
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header & Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl">
          <button
            onClick={() => setActiveTab('summary')}
            className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition ${
              activeTab === 'summary'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            {lang === 'ar' ? 'أرصدة وتقييم الأصناف' : 'Stock Balances & Valuation'}
          </button>
          <button
            onClick={() => setActiveTab('movements')}
            className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition ${
              activeTab === 'movements'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            {lang === 'ar' ? 'سجل الحركات غير القابل للتعديل' : 'Immutable Movement Ledger'} ({state.stockMovements.length})
          </button>
          <button
            onClick={() => setActiveTab('warehouses')}
            className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition ${
              activeTab === 'warehouses'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            {lang === 'ar' ? 'المستودعات والمواقع' : 'Warehouses'} ({state.warehouses.length})
          </button>
        </div>

        <button
          onClick={() => setShowMovementModal(true)}
          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm transition flex items-center gap-1.5 shadow-md shadow-amber-500/20"
        >
          <Plus className="w-4 h-4" />
          <span>{lang === 'ar' ? 'تسجيل حركة / تسوية مخزنية' : 'Record Stock Movement'}</span>
        </button>
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
              ? 'بحث باسم الصنف، الكود SKU، نوع المادة...'
              : 'Search product by name, SKU, category...'
          }
          className="w-full pl-9 pr-4 rtl:pr-9 rtl:pl-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/60"
        />
      </div>

      {/* TAB 1: STOCK BALANCES */}
      {activeTab === 'summary' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left rtl:text-right text-xs sm:text-sm text-slate-300">
              <thead className="bg-slate-950/60 text-slate-400 font-bold text-xs uppercase border-b border-slate-800">
                <tr>
                  <th className="p-3.5">{lang === 'ar' ? 'كود الصنف' : 'SKU'}</th>
                  <th className="p-3.5">{lang === 'ar' ? 'اسم الصنف والمواصفة' : 'Product & Spec'}</th>
                  <th className="p-3.5">{lang === 'ar' ? 'النوع' : 'Type'}</th>
                  <th className="p-3.5">{lang === 'ar' ? 'الرصيد الفعلي' : 'Physical Qty'}</th>
                  <th className="p-3.5">{lang === 'ar' ? 'المحجوز للإنتاج' : 'Reserved'}</th>
                  <th className="p-3.5">{lang === 'ar' ? 'المتاح للبيع' : 'Available'}</th>
                  <th className="p-3.5">{lang === 'ar' ? 'تكلفة الوحدة' : 'Unit Cost'}</th>
                  <th className="p-3.5">{lang === 'ar' ? 'إجمالي القيمة' : 'Total Valuation'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {summaries
                  .filter((s) => {
                    const q = searchQuery.toLowerCase();
                    return (
                      s.product.sku.toLowerCase().includes(q) ||
                      s.product.name.toLowerCase().includes(q) ||
                      s.product.name_ar.includes(q)
                    );
                  })
                  .map((item) => (
                    <tr key={item.product.id} className="hover:bg-slate-800/40 transition">
                      <td className="p-3.5 font-mono text-amber-400 font-semibold">{item.product.sku}</td>
                      <td className="p-3.5">
                        <div className="font-bold text-slate-100">
                          {lang === 'ar' ? item.product.name_ar : item.product.name}
                        </div>
                        <div className="text-xs text-slate-500">{item.product.description}</div>
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700 uppercase">
                          {item.product.type}
                        </span>
                      </td>
                      <td className="p-3.5 font-bold text-white">
                        {item.physicalQty} <span className="text-xs text-slate-400">{item.product.unit_id.replace('u-', '')}</span>
                      </td>
                      <td className="p-3.5 text-amber-400 font-semibold">
                        {item.reservedQty}
                      </td>
                      <td className="p-3.5 text-emerald-400 font-bold">
                        {item.availableQty}
                      </td>
                      <td className="p-3.5 font-mono text-slate-300">
                        {item.product.unit_cost.toLocaleString()} {state.tenant.currency_symbol}
                      </td>
                      <td className="p-3.5 font-bold text-white font-mono">
                        {Math.round(item.totalValue).toLocaleString()} {state.tenant.currency_symbol}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: IMMUTABLE STOCK MOVEMENTS */}
      {activeTab === 'movements' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 bg-slate-950/40 border-b border-slate-800 text-xs text-slate-400 flex items-center justify-between">
            <span className="font-semibold text-slate-200">
              {lang === 'ar'
                ? 'مبدأ المعمارية ADR-005: الحركات المخزنية غير قابلة للحذف أو التعديل لضمان الأمان المحاسبي والتدقيق.'
                : 'Architecture Rule ADR-005: Stock movements are immutable transaction logs.'}
            </span>
            <span className="text-amber-400 font-mono">Total Movements: {state.stockMovements.length}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left rtl:text-right text-xs sm:text-sm text-slate-300">
              <thead className="bg-slate-950/60 text-slate-400 font-bold text-xs uppercase border-b border-slate-800">
                <tr>
                  <th className="p-3.5">{lang === 'ar' ? 'التاريخ والوقت' : 'Date & Time'}</th>
                  <th className="p-3.5">{lang === 'ar' ? 'الصنف' : 'Product'}</th>
                  <th className="p-3.5">{lang === 'ar' ? 'نوع الحركة' : 'Movement Type'}</th>
                  <th className="p-3.5">{lang === 'ar' ? 'الكمية' : 'Qty'}</th>
                  <th className="p-3.5">{lang === 'ar' ? 'المرجع' : 'Reference'}</th>
                  <th className="p-3.5">{lang === 'ar' ? 'المسؤول' : 'Logged By'}</th>
                  <th className="p-3.5">{lang === 'ar' ? 'البيان والملاحظات' : 'Notes'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono text-xs">
                {state.stockMovements.map((mov) => {
                  const prod = state.products.find((p) => p.id === mov.product_id);
                  return (
                    <tr key={mov.id} className="hover:bg-slate-800/40 transition">
                      <td className="p-3.5 text-slate-400">{new Date(mov.created_at).toLocaleString()}</td>
                      <td className="p-3.5 font-sans font-semibold text-slate-200">
                        {prod ? (lang === 'ar' ? prod.name_ar : prod.name) : mov.product_id}
                      </td>
                      <td className="p-3.5">{getMovementTypeBadge(mov.type, mov.direction)}</td>
                      <td className="p-3.5 font-bold text-white text-sm">
                        {mov.direction === 'in' ? '+' : '-'}{mov.quantity}
                      </td>
                      <td className="p-3.5 text-amber-400 font-semibold">{mov.reference_id}</td>
                      <td className="p-3.5 font-sans text-slate-300">{mov.created_by}</td>
                      <td className="p-3.5 font-sans text-slate-400">{mov.notes || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: WAREHOUSES */}
      {activeTab === 'warehouses' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {state.warehouses.map((wh) => (
            <div key={wh.id} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-base text-white">
                  {lang === 'ar' ? wh.name_ar : wh.name}
                </h4>
                <span className="font-mono text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  {wh.code}
                </span>
              </div>
              <p className="text-xs text-slate-400">{wh.location}</p>
              <div className="pt-2 text-xs text-emerald-400 flex items-center gap-1.5 font-medium">
                <Boxes className="w-4 h-4" />
                <span>{wh.is_default ? (lang === 'ar' ? 'المستودع الافتراضي' : 'Default Workshop Storage') : 'Secondary Yard'}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* RECORD MOVEMENT MODAL */}
      {showMovementModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-lg text-white">
                {lang === 'ar' ? 'تسجيل حركة / إدخال / تسوية مخزنية' : 'Record Stock Movement'}
              </h3>
              <button onClick={() => setShowMovementModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMovement} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {lang === 'ar' ? 'الصنف المخزني' : 'Product'}
                </label>
                <select
                  value={movProductId}
                  onChange={(e) => setMovProductId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  {state.products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {lang === 'ar' ? p.name_ar : p.name} ({p.sku})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {lang === 'ar' ? 'نوع الحركة' : 'Movement Type'}
                  </label>
                  <select
                    value={movType}
                    onChange={(e) => setMovType(e.target.value as StockMovementType)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="purchase_receipt">{lang === 'ar' ? 'استلام مشتريات (وارد +)' : 'Purchase Receipt (+)'}</option>
                    <option value="production_output">{lang === 'ar' ? 'إنتاج تام للورشة (وارد +)' : 'Production Output (+)'}</option>
                    <option value="adjustment_pos">{lang === 'ar' ? 'تسوية جردية موجبة (وارد +)' : 'Positive Adjustment (+)'}</option>
                    <option value="production_consumption">{lang === 'ar' ? 'صرف لتشغيل وقص (صادر -)' : 'Production Consumption (-)'}</option>
                    <option value="wastage">{lang === 'ar' ? 'هالك وقص وتالف (صادر -)' : 'Wastage / Scrap (-)'}</option>
                    <option value="adjustment_neg">{lang === 'ar' ? 'تسوية جردية سالبة (صادر -)' : 'Negative Adjustment (-)'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {lang === 'ar' ? 'الكمية' : 'Quantity'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={movQty}
                    onChange={(e) => setMovQty(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {lang === 'ar' ? 'المستودع المستهدف' : 'Target Warehouse'}
                </label>
                <select
                  value={movWarehouseId}
                  onChange={(e) => setMovWarehouseId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  {state.warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {lang === 'ar' ? w.name_ar : w.name} ({w.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {lang === 'ar' ? 'البيان والملاحظة التدقيقية' : 'Audit Note / Reason'}
                </label>
                <input
                  type="text"
                  value={movNotes}
                  onChange={(e) => setMovNotes(e.target.value)}
                  placeholder={lang === 'ar' ? 'مثال: استلام دفعة عيدان سرايا من المورد' : 'Intake from supplier batch'}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowMovementModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-semibold transition"
                >
                  {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition shadow-md shadow-amber-500/20"
                >
                  {lang === 'ar' ? 'تسجيل الحركة في السجل' : 'Commit Movement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
