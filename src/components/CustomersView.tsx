import React, { useState } from 'react';
import { useERP } from '../context/ERPContext';
import { Customer } from '../types';
import { StatusBadge } from './ui/StatusBadge';
import { EmptyState } from './ui/EmptyState';
import {
  Users,
  Plus,
  Search,
  Phone,
  MapPin,
  CreditCard,
  Building,
  UserCheck,
  X,
  FileText,
  DollarSign
} from 'lucide-react';

export const CustomersView: React.FC = () => {
  const { state, lang, createCustomer, setActiveTab } = useERP();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [type, setType] = useState<Customer['type']>('individual');
  const [creditLimit, setCreditLimit] = useState(500000);
  const [openingBalance, setOpeningBalance] = useState(0);

  const filteredCustomers = state.customers.filter((c) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      c.name.toLowerCase().includes(q) ||
      (c.name_ar && c.name_ar.toLowerCase().includes(q)) ||
      c.phone.includes(q);
    const matchesType = typeFilter === 'all' || c.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name && !nameAr) return;

    createCustomer({
      tenant_id: state.tenant.id,
      name: name || nameAr,
      name_ar: nameAr || name,
      phone,
      address,
      type,
      credit_limit: Number(creditLimit),
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

  const totalReceivables = state.customers.reduce((acc, c) => acc + (c.current_balance || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <Users className="w-7 h-7 text-amber-400" />
            <span>{lang === 'ar' ? 'سجل العملاء والمقاولين' : 'Customers & Contractors'}</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {lang === 'ar'
              ? 'إدارة بيانات العملاء، الأرصدة المدينة، الحدود الائتمانية والمشاريع'
              : 'Manage customer profiles, credit limits, receivables, and contact info.'}
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="min-h-[48px] px-5 py-3 rounded-xl font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
          <span>{lang === 'ar' ? 'إضافة عميل جديد' : 'Add New Customer'}</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase">
              {lang === 'ar' ? 'إجمالي العملاء' : 'Total Customers'}
            </span>
            <div className="text-2xl font-extrabold text-white mt-1">{state.customers.length}</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase">
              {lang === 'ar' ? 'إجمالي الديون المستحقة' : 'Total Receivables'}
            </span>
            <div className="text-2xl font-extrabold text-amber-400 mt-1">
              {totalReceivables.toLocaleString()} {state.tenant.currency_symbol}
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase">
              {lang === 'ar' ? 'المقاولين والشركات' : 'Contractors & Companies'}
            </span>
            <div className="text-2xl font-extrabold text-emerald-400 mt-1">
              {state.customers.filter((c) => c.type === 'contractor' || c.type === 'company').length}
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Building className="w-6 h-6" />
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
            placeholder={lang === 'ar' ? 'البحث بالاسم أو رقم الهاتف...' : 'Search by name or phone...'}
            className="w-full min-h-[44px] bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-4 rtl:pr-9 rtl:pl-4 text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {[
            { id: 'all', labelAr: 'الكل', labelEn: 'All' },
            { id: 'individual', labelAr: 'أفراد', labelEn: 'Individuals' },
            { id: 'contractor', labelAr: 'مقاولين', labelEn: 'Contractors' },
            { id: 'company', labelAr: 'شركات', labelEn: 'Companies' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setTypeFilter(tab.id)}
              className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                typeFilter === tab.id
                  ? 'bg-amber-500 text-slate-950 shadow-sm font-bold'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {lang === 'ar' ? tab.labelAr : tab.labelEn}
            </button>
          ))}
        </div>
      </div>

      {/* Customers List / Grid */}
      {filteredCustomers.length === 0 ? (
        <EmptyState
          icon={Users}
          titleAr="لم يتم العثور على أي عملاء"
          titleEn="No Customers Found"
          descriptionAr={searchQuery ? 'لا توجد نتائج تطابق معايير البحث الحالية.' : 'ابدأ بإضافة أول عميل أو مقاول في سجل الورشة.'}
          descriptionEn={searchQuery ? 'No customers match your search criteria.' : 'Start by creating your first client or contractor.'}
          actionLabelAr={searchQuery ? undefined : 'إضافة عميل جديد الآن'}
          actionLabelEn={searchQuery ? undefined : 'Add Customer'}
          onAction={searchQuery ? undefined : () => setShowModal(true)}
          lang={lang}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredCustomers.map((cust) => (
            <div
              key={cust.id}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 flex flex-col justify-between transition group shadow-md"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h3 className="text-base font-bold text-white group-hover:text-amber-400 transition">
                      {lang === 'ar' ? cust.name_ar || cust.name : cust.name}
                    </h3>
                    <span className="inline-block mt-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                      {cust.type.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-right rtl:text-left">
                    <span className="text-[11px] text-slate-400 font-medium block">
                      {lang === 'ar' ? 'الرصيد المدين' : 'Current Balance'}
                    </span>
                    <span
                      className={`text-sm font-extrabold ${
                        cust.current_balance > 0 ? 'text-amber-400' : 'text-emerald-400'
                      }`}
                    >
                      {cust.current_balance.toLocaleString()} {state.tenant.currency_symbol}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-slate-400 border-t border-slate-800/80 pt-3">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                    <a href={`tel:${cust.phone}`} className="hover:text-amber-400 transition dir-ltr font-mono">
                      {cust.phone}
                    </a>
                  </div>
                  {cust.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      <span className="truncate">{cust.address}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                    <span>
                      {lang === 'ar' ? 'الحد الائتماني: ' : 'Credit Limit: '}
                      <span className="text-slate-300 font-semibold">
                        {cust.credit_limit.toLocaleString()} {state.tenant.currency_symbol}
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                <button
                  onClick={() => setActiveTab('sales')}
                  className="min-h-[40px] flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  <span>{lang === 'ar' ? 'فاتورة جديدة' : 'New Invoice'}</span>
                </button>
                <button
                  onClick={() => setActiveTab('quotations')}
                  className="min-h-[40px] flex-1 py-2 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{lang === 'ar' ? 'عرض سعر' : 'Quotation'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Customer Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-400" />
                <span>{lang === 'ar' ? 'إضافة عميل أو مقاول جديد' : 'Add New Customer'}</span>
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
                    {lang === 'ar' ? 'اسم العميل (عربي)' : 'Customer Name (Arabic)'} *
                  </label>
                  <input
                    type="text"
                    required
                    value={nameAr}
                    onChange={(e) => setNameAr(e.target.value)}
                    placeholder="مثال: الشيخ عبدالرحمن الحداد"
                    className="w-full min-h-[44px] bg-slate-950 border border-slate-800 rounded-xl px-3 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    {lang === 'ar' ? 'الاسم بالإنجليزية' : 'Customer Name (English)'}
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Abdulrahman Al-Haddad"
                    className="w-full min-h-[44px] bg-slate-950 border border-slate-800 rounded-xl px-3 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    {lang === 'ar' ? 'رقم الهاتف / الواتساب' : 'Phone / WhatsApp'} *
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
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    {lang === 'ar' ? 'نوع العميل' : 'Customer Type'}
                  </label>
                  <select
                    value={type}
                    onChange={(e: any) => setType(e.target.value)}
                    className="w-full min-h-[44px] bg-slate-950 border border-slate-800 rounded-xl px-3 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="individual">{lang === 'ar' ? 'فرد / مالك بناء' : 'Individual'}</option>
                    <option value="contractor">{lang === 'ar' ? 'مقاول تشييد' : 'Contractor'}</option>
                    <option value="company">{lang === 'ar' ? 'شركة / مؤسسة' : 'Company'}</option>
                    <option value="project">{lang === 'ar' ? 'مشروع عقاري' : 'Project'}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  {lang === 'ar' ? 'العنوان والموقع' : 'Address & Location'}
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="مثال: صنعاء - حي حدة - جوار فندق سبأ"
                  className="w-full min-h-[44px] bg-slate-950 border border-slate-800 rounded-xl px-3 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    {lang === 'ar' ? 'الحد الائتماني (ر.ي)' : 'Credit Limit (YER)'}
                  </label>
                  <input
                    type="number"
                    value={creditLimit}
                    onChange={(e) => setCreditLimit(Number(e.target.value))}
                    className="w-full min-h-[44px] bg-slate-950 border border-slate-800 rounded-xl px-3 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    {lang === 'ar' ? 'الرصيد الافتتاحي (ر.ي)' : 'Opening Balance (YER)'}
                  </label>
                  <input
                    type="number"
                    value={openingBalance}
                    onChange={(e) => setOpeningBalance(Number(e.target.value))}
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
                  {lang === 'ar' ? 'حفظ العميل' : 'Save Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
