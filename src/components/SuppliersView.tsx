import React, { useState } from 'react';
import { useERP } from '../context/ERPContext';
import { Supplier } from '../types';
import { StatusBadge } from './ui/StatusBadge';
import { EmptyState } from './ui/EmptyState';
import {
  Truck,
  Plus,
  Search,
  Phone,
  MapPin,
  Tag,
  DollarSign,
  X,
  ShoppingCart,
  Layers
} from 'lucide-react';

export const SuppliersView: React.FC = () => {
  const { state, lang, createSupplier, setActiveTab } = useERP();
  const [searchQuery, setSearchQuery] = useState('');
  const [catFilter, setCatFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [category, setCategory] = useState<Supplier['category']>('aluminium');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [openingBalance, setOpeningBalance] = useState(0);

  const filteredSuppliers = state.suppliers.filter((s) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      s.name.toLowerCase().includes(q) ||
      (s.name_ar && s.name_ar.toLowerCase().includes(q)) ||
      s.phone.includes(q);
    const matchesCat = catFilter === 'all' || s.category === catFilter;
    return matchesSearch && matchesCat;
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name && !nameAr) return;

    createSupplier({
      tenant_id: state.tenant.id,
      name: name || nameAr,
      name_ar: nameAr || name,
      category,
      phone,
      address,
      opening_balance: Number(openingBalance),
      current_balance: Number(openingBalance),
      status: 'active',
    });

    setName('');
    setNameAr('');
    setPhone('');
    setAddress('');
    setShowModal(false);
  };

  const totalPayables = state.suppliers.reduce((acc, s) => acc + (s.current_balance || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <Truck className="w-7 h-7 text-amber-400" />
            <span>{lang === 'ar' ? 'سجل الموردين وشركات الخام' : 'Suppliers & Raw Material Vendors'}</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {lang === 'ar'
              ? 'موردي مقاطع الألمنيوم، الزجاج، الإكسسوارات، والحديد مع تتبع الالتزامات'
              : 'Aluminium extruders, glass float suppliers, hardware & steel vendors.'}
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="min-h-[48px] px-5 py-3 rounded-xl font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
          <span>{lang === 'ar' ? 'إضافة مورد جديد' : 'Add New Supplier'}</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase">
              {lang === 'ar' ? 'إجمالي الموردين' : 'Total Suppliers'}
            </span>
            <div className="text-2xl font-extrabold text-white mt-1">{state.suppliers.length}</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Truck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase">
              {lang === 'ar' ? 'إجمالي الديون للموردين' : 'Total Payables'}
            </span>
            <div className="text-2xl font-extrabold text-rose-400 mt-1">
              {totalPayables.toLocaleString()} {state.tenant.currency_symbol}
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase">
              {lang === 'ar' ? 'موردي قطاعات الألمنيوم' : 'Aluminium Extruders'}
            </span>
            <div className="text-2xl font-extrabold text-amber-400 mt-1">
              {state.suppliers.filter((s) => s.category === 'aluminium').length}
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Layers className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 rtl:right-3 rtl:left-auto left-auto top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={lang === 'ar' ? 'البحث باسم المورد أو الهاتف...' : 'Search supplier name or phone...'}
            className="w-full min-h-[44px] bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-4 rtl:pr-9 rtl:pl-4 text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {[
            { id: 'all', labelAr: 'الكل', labelEn: 'All' },
            { id: 'aluminium', labelAr: 'مقاطع ألمنيوم', labelEn: 'Aluminium' },
            { id: 'glass', labelAr: 'مصانع زجاج', labelEn: 'Glass' },
            { id: 'hardware', labelAr: 'إكسسوارات ومفصلات', labelEn: 'Hardware' },
            { id: 'steel', labelAr: 'حديد ومواسير', labelEn: 'Steel' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setCatFilter(tab.id)}
              className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                catFilter === tab.id
                  ? 'bg-amber-500 text-slate-950 shadow-sm font-bold'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {lang === 'ar' ? tab.labelAr : tab.labelEn}
            </button>
          ))}
        </div>
      </div>

      {/* Suppliers Grid or Empty State */}
      {filteredSuppliers.length === 0 ? (
        <EmptyState
          icon={Truck}
          titleAr="لم يتم العثور على أي موردين"
          titleEn="No Suppliers Found"
          descriptionAr={searchQuery ? 'لا توجد نتائج مطابقة لبحثك الحالي.' : 'ابدأ بإضافة أول مورد أو شركة توريد خام للورشة.'}
          descriptionEn={searchQuery ? 'No suppliers match your query.' : 'Add your first raw material supplier.'}
          actionLabelAr={searchQuery ? undefined : 'إضافة مورد جديد الآن'}
          actionLabelEn={searchQuery ? undefined : 'Add Supplier'}
          onAction={searchQuery ? undefined : () => setShowModal(true)}
          lang={lang}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredSuppliers.map((sup) => (
            <div
              key={sup.id}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 flex flex-col justify-between transition group shadow-md"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h3 className="text-base font-bold text-white group-hover:text-amber-400 transition">
                      {lang === 'ar' ? sup.name_ar || sup.name : sup.name}
                    </h3>
                    <span className="inline-block mt-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-amber-400 border border-slate-700 capitalize">
                      {sup.category}
                    </span>
                  </div>
                  <div className="text-right rtl:text-left">
                    <span className="text-[11px] text-slate-400 font-medium block">
                      {lang === 'ar' ? 'الرصيد الدائن' : 'Payable Balance'}
                    </span>
                    <span
                      className={`text-sm font-extrabold ${
                        sup.current_balance > 0 ? 'text-rose-400' : 'text-slate-400'
                      }`}
                    >
                      {sup.current_balance.toLocaleString()} {state.tenant.currency_symbol}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-slate-400 border-t border-slate-800/80 pt-3">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                    <a href={`tel:${sup.phone}`} className="hover:text-amber-400 transition dir-ltr font-mono">
                      {sup.phone}
                    </a>
                  </div>
                  {sup.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      <span className="truncate">{sup.address}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                <button
                  onClick={() => setActiveTab('purchases')}
                  className="min-h-[40px] flex-1 py-2 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span>{lang === 'ar' ? 'أمر شراء جديد' : 'New PO'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Supplier Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Truck className="w-5 h-5 text-amber-400" />
                <span>{lang === 'ar' ? 'إضافة مورد خام جديد' : 'Add New Supplier'}</span>
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
                    {lang === 'ar' ? 'اسم المورد (عربي)' : 'Supplier Name (Arabic)'} *
                  </label>
                  <input
                    type="text"
                    required
                    value={nameAr}
                    onChange={(e) => setNameAr(e.target.value)}
                    placeholder="مثال: شركة اليمن لسحب الألمنيوم"
                    className="w-full min-h-[44px] bg-slate-950 border border-slate-800 rounded-xl px-3 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    {lang === 'ar' ? 'الاسم بالإنجليزية' : 'Supplier Name (English)'}
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Yemen Aluminium Extrusion Co."
                    className="w-full min-h-[44px] bg-slate-950 border border-slate-800 rounded-xl px-3 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    {lang === 'ar' ? 'تصنيف المورد' : 'Category'}
                  </label>
                  <select
                    value={category}
                    onChange={(e: any) => setCategory(e.target.value)}
                    className="w-full min-h-[44px] bg-slate-950 border border-slate-800 rounded-xl px-3 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="aluminium">{lang === 'ar' ? 'مقاطع ألمنيوم' : 'Aluminium Profiles'}</option>
                    <option value="glass">{lang === 'ar' ? 'مصانع وموردي زجاج' : 'Glass Factory'}</option>
                    <option value="hardware">{lang === 'ar' ? 'إكسسوارات ومفصلات ومقابض' : 'Hardware & Accessories'}</option>
                    <option value="steel">{lang === 'ar' ? 'حديد ومواسير وصاج' : 'Steel & Metal'}</option>
                    <option value="consumable">{lang === 'ar' ? 'مستهلكات وعدد تصنيع' : 'Consumables & Tools'}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    {lang === 'ar' ? 'رقم الهاتف / المبيعات' : 'Phone / Contact'} *
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+967 770 000 000"
                    className="w-full min-h-[44px] bg-slate-950 border border-slate-800 rounded-xl px-3 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500 dir-ltr"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  {lang === 'ar' ? 'عنوان المخازن أو المقر' : 'Address / Warehouse'}
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="مثال: صنعاء - عصر - الشارع العام"
                  className="w-full min-h-[44px] bg-slate-950 border border-slate-800 rounded-xl px-3 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  {lang === 'ar' ? 'الرصيد الافتتاحي المستحق للمورد (ر.ي)' : 'Opening Payable Balance (YER)'}
                </label>
                <input
                  type="number"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(Number(e.target.value))}
                  className="w-full min-h-[44px] bg-slate-950 border border-slate-800 rounded-xl px-3 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
                />
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
                  {lang === 'ar' ? 'حفظ المورد' : 'Save Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
