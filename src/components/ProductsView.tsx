import React, { useState } from 'react';
import { useERP } from '../context/ERPContext';
import { Product, ProductType } from '../types';
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  Boxes,
  Layers,
  X,
  CheckCircle2,
  DollarSign
} from 'lucide-react';

export const ProductsView: React.FC = () => {
  const { state, lang, createProduct } = useERP();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<ProductType>('profile');
  const [categoryId, setCategoryId] = useState('cat-alu');
  const [unitId, setUnitId] = useState('unit-bar-6m');
  const [unitCost, setUnitCost] = useState(12500);
  const [unitPrice, setUnitPrice] = useState(16000);
  const [minStock, setMinStock] = useState(10);
  const [maxStock, setMaxStock] = useState(100);

  // Calculate current stock for each product
  const getProductStock = (productId: string) => {
    return state.stockMovements.reduce((total, sm) => {
      if (sm.product_id !== productId) return total;
      return sm.direction === 'in' ? total + sm.quantity : total - sm.quantity;
    }, 0);
  };

  const filteredProducts = state.products.filter((p) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      p.name.toLowerCase().includes(q) ||
      p.name_ar.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q);
    const matchesType = typeFilter === 'all' || p.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sku || (!name && !nameAr)) return;

    createProduct({
      tenant_id: state.tenant.id,
      sku,
      name: name || nameAr,
      name_ar: nameAr || name,
      description: description || name || nameAr,
      type,
      category_id: categoryId,
      unit_id: unitId,
      unit_cost: Number(unitCost),
      unit_price: Number(unitPrice),
      min_stock: Number(minStock),
      max_stock: Number(maxStock),
      is_stockable: true,
      is_sellable: type === 'finished' || type === 'service',
      is_purchasable: type !== 'finished',
    });

    setSku('');
    setName('');
    setNameAr('');
    setDescription('');
    setShowModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <Package className="w-7 h-7 text-amber-400" />
            <span>{lang === 'ar' ? 'دليل الأصناف والمنتجات المصنعة' : 'Products & Raw Materials Catalog'}</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {lang === 'ar'
              ? 'مقاطع الألمنيوم (عيدان 6م)، ألواح الزجاج، الإكسسوارات، والمنتجات تامة الصنع'
              : 'Aluminium profile bars (6m), glass sheets, hardware, and finished fabrication units.'}
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="min-h-[48px] px-5 py-3 rounded-xl font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
          <span>{lang === 'ar' ? 'إضافة صنف جديد' : 'Add New Item'}</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase">
              {lang === 'ar' ? 'إجمالي الأصناف' : 'Total Catalog SKUs'}
            </span>
            <div className="text-2xl font-extrabold text-white mt-1">{state.products.length}</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Package className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase">
              {lang === 'ar' ? 'مقاطع وخامات ألمنيوم وزجاج' : 'Profiles & Glass'}
            </span>
            <div className="text-2xl font-extrabold text-amber-400 mt-1">
              {state.products.filter((p) => p.type === 'profile' || p.type === 'glass' || p.type === 'raw').length}
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase">
              {lang === 'ar' ? 'منتجات تامة الصنع' : 'Finished Goods'}
            </span>
            <div className="text-2xl font-extrabold text-emerald-400 mt-1">
              {state.products.filter((p) => p.type === 'finished').length}
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Boxes className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 rtl:right-3 rtl:left-auto left-auto top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={lang === 'ar' ? 'البحث بالاسم أو رمز SKU...' : 'Search by SKU or name...'}
            className="w-full min-h-[44px] bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-4 rtl:pr-9 rtl:pl-4 text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {[
            { id: 'all', labelAr: 'الكل', labelEn: 'All' },
            { id: 'profile', labelAr: 'مقاطع ألمنيوم', labelEn: 'Profiles' },
            { id: 'glass', labelAr: 'ألواح زجاج', labelEn: 'Glass' },
            { id: 'accessory', labelAr: 'إكسسوارات', labelEn: 'Accessories' },
            { id: 'finished', labelAr: 'منتج تام', labelEn: 'Finished' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setTypeFilter(tab.id)}
              className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                typeFilter === tab.id
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {lang === 'ar' ? tab.labelAr : tab.labelEn}
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProducts.map((p) => {
          const currentStock = getProductStock(p.id);
          const isLowStock = currentStock <= p.min_stock;

          return (
            <div
              key={p.id}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 flex flex-col justify-between transition group shadow-md space-y-4"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="font-mono font-bold text-amber-400 text-xs">{p.sku}</span>
                    <h3 className="text-base font-bold text-white group-hover:text-amber-400 transition mt-0.5">
                      {lang === 'ar' ? p.name_ar || p.name : p.name}
                    </h3>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-700 uppercase">
                    {p.type}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 bg-slate-950 rounded-xl p-3 border border-slate-800/80 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">{lang === 'ar' ? 'الرصيد المخزني:' : 'Stock:'}</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`text-base font-extrabold font-mono ${isLowStock ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {currentStock}
                      </span>
                      {isLowStock && <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />}
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[11px]">{lang === 'ar' ? 'حد الطلب الأدنى:' : 'Min Stock:'}</span>
                    <span className="text-base font-bold text-slate-300 font-mono mt-0.5 block">
                      {p.min_stock}
                    </span>
                  </div>
                </div>

                <div className="mt-3 space-y-1.5 text-xs text-slate-400 border-t border-slate-800/80 pt-3">
                  <div className="flex justify-between">
                    <span>{lang === 'ar' ? 'تكلفة الوحدة (Cost):' : 'Unit Cost:'}</span>
                    <span className="font-mono font-semibold text-slate-200">
                      {p.unit_cost.toLocaleString()} {state.tenant.currency_symbol}
                    </span>
                  </div>
                  {p.unit_price > 0 && (
                    <div className="flex justify-between">
                      <span>{lang === 'ar' ? 'سعر البيع (Price):' : 'Selling Price:'}</span>
                      <span className="font-mono font-semibold text-amber-400">
                        {p.unit_price.toLocaleString()} {state.tenant.currency_symbol}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Product Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-amber-400" />
                <span>{lang === 'ar' ? 'إضافة صنف جديد لدليل المنتجات' : 'Add Catalog Item'}</span>
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
                    {lang === 'ar' ? 'رمز الصنف (SKU)' : 'SKU Code'} *
                  </label>
                  <input
                    type="text"
                    required
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="e.g. ALU-ALUMIL-FRAME-6M"
                    className="w-full min-h-[44px] bg-slate-950 border border-slate-800 rounded-xl px-3 text-xs sm:text-sm text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    {lang === 'ar' ? 'نوع الصنف' : 'Item Type'}
                  </label>
                  <select
                    value={type}
                    onChange={(e: any) => setType(e.target.value)}
                    className="w-full min-h-[44px] bg-slate-950 border border-slate-800 rounded-xl px-3 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="profile">{lang === 'ar' ? 'مقطع ألمنيوم (Profile 6m)' : 'Profile (6m Bar)'}</option>
                    <option value="glass">{lang === 'ar' ? 'لوح زجاج (Glass Sheet)' : 'Glass Sheet'}</option>
                    <option value="accessory">{lang === 'ar' ? 'إكسسوار / مقبض / كفرات' : 'Accessory / Hardware'}</option>
                    <option value="raw">{lang === 'ar' ? 'مادة خام أخرى' : 'Raw Material'}</option>
                    <option value="finished">{lang === 'ar' ? 'منتج تام الصنع' : 'Finished Goods'}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    {lang === 'ar' ? 'اسم الصنف (عربي)' : 'Item Name (Arabic)'} *
                  </label>
                  <input
                    type="text"
                    required
                    value={nameAr}
                    onChange={(e) => setNameAr(e.target.value)}
                    placeholder="مثال: مقطع فريم نافذة سحاب 6 متر"
                    className="w-full min-h-[44px] bg-slate-950 border border-slate-800 rounded-xl px-3 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    {lang === 'ar' ? 'الاسم بالإنجليزية' : 'Item Name (English)'}
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Sliding Frame Profile 6m"
                    className="w-full min-h-[44px] bg-slate-950 border border-slate-800 rounded-xl px-3 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    {lang === 'ar' ? 'تكلفة الوحدة (ر.ي)' : 'Unit Cost (YER)'}
                  </label>
                  <input
                    type="number"
                    value={unitCost}
                    onChange={(e) => setUnitCost(Number(e.target.value))}
                    className="w-full min-h-[44px] bg-slate-950 border border-slate-800 rounded-xl px-3 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    {lang === 'ar' ? 'سعر البيع (ر.ي)' : 'Selling Price (YER)'}
                  </label>
                  <input
                    type="number"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(Number(e.target.value))}
                    className="w-full min-h-[44px] bg-slate-950 border border-slate-800 rounded-xl px-3 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    {lang === 'ar' ? 'حد الطلب الأدنى' : 'Min Stock Level'}
                  </label>
                  <input
                    type="number"
                    value={minStock}
                    onChange={(e) => setMinStock(Number(e.target.value))}
                    className="w-full min-h-[44px] bg-slate-950 border border-slate-800 rounded-xl px-3 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    {lang === 'ar' ? 'الحد الأعلى للمخزون' : 'Max Stock Level'}
                  </label>
                  <input
                    type="number"
                    value={maxStock}
                    onChange={(e) => setMaxStock(Number(e.target.value))}
                    className="w-full min-h-[44px] bg-slate-950 border border-slate-800 rounded-xl px-3 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
                  />
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
                  {lang === 'ar' ? 'حفظ الصنف' : 'Save Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
