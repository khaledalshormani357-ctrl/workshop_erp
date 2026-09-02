import React, { useState } from 'react';
import { useERP } from '../context/ERPContext';
import { Project } from '../types';
import {
  Building2,
  Plus,
  Search,
  MapPin,
  Calendar,
  DollarSign,
  Ruler,
  CheckCircle2,
  Clock,
  X,
  Layers,
  ArrowRight
} from 'lucide-react';

export const ProjectsView: React.FC = () => {
  const { state, lang, createProject, setActiveTab } = useERP();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [customerId, setCustomerId] = useState(state.customers[0]?.id || '');
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState<Project['status']>('in_progress');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
  );
  const [contractValue, setContractValue] = useState(2500000);
  const [notes, setNotes] = useState('');

  const filteredProjects = state.projects.filter((p) => {
    const cust = state.customers.find((c) => c.id === p.customer_id);
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      p.name.toLowerCase().includes(q) ||
      p.name_ar.toLowerCase().includes(q) ||
      p.project_code.toLowerCase().includes(q) ||
      (cust && (cust.name.toLowerCase().includes(q) || (cust.name_ar && cust.name_ar.toLowerCase().includes(q))));
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name && !nameAr) return;

    createProject({
      tenant_id: state.tenant.id,
      name: name || nameAr,
      name_ar: nameAr || name,
      customer_id: customerId,
      location,
      status,
      start_date: startDate,
      end_date: endDate,
      total_contract_value: Number(contractValue),
      notes,
    });

    setName('');
    setNameAr('');
    setLocation('');
    setNotes('');
    setShowModal(false);
  };

  const totalContractValue = state.projects.reduce((acc, p) => acc + p.total_contract_value, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <Building2 className="w-7 h-7 text-amber-400" />
            <span>{lang === 'ar' ? 'سجل المشاريع الإنشائية والميدانية' : 'Construction Projects & Site Works'}</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {lang === 'ar'
              ? 'تتبع مشاريع الفلل، الأبراج التجارية، الواجهات الزجاجية، ومطابقة عقود التركيب'
              : 'Track residential villas, commercial towers, structural facades, and contracts.'}
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="min-h-[48px] px-5 py-3 rounded-xl font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
          <span>{lang === 'ar' ? 'مشروع جديد' : 'New Project'}</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase">
              {lang === 'ar' ? 'إجمالي المشاريع' : 'Total Projects'}
            </span>
            <div className="text-2xl font-extrabold text-white mt-1">{state.projects.length}</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Building2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase">
              {lang === 'ar' ? 'إجمالي قيم العقود' : 'Total Contract Value'}
            </span>
            <div className="text-2xl font-extrabold text-amber-400 mt-1">
              {totalContractValue.toLocaleString()} {state.tenant.currency_symbol}
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase">
              {lang === 'ar' ? 'المشاريع قيد التنفيذ' : 'Active Projects'}
            </span>
            <div className="text-2xl font-extrabold text-emerald-400 mt-1">
              {state.projects.filter((p) => p.status === 'in_progress' || p.status === 'active').length}
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Clock className="w-6 h-6" />
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
            placeholder={lang === 'ar' ? 'البحث برمز المشروع أو الاسم أو العميل...' : 'Search project code, name, client...'}
            className="w-full min-h-[44px] bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-4 rtl:pr-9 rtl:pl-4 text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {[
            { id: 'all', labelAr: 'الكل', labelEn: 'All' },
            { id: 'in_progress', labelAr: 'قيد التنفيذ', labelEn: 'In Progress' },
            { id: 'active', labelAr: 'نشط', labelEn: 'Active' },
            { id: 'planning', labelAr: 'تخطيط وتصميم', labelEn: 'Planning' },
            { id: 'completed', labelAr: 'منجز ومسلم', labelEn: 'Completed' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {lang === 'ar' ? tab.labelAr : tab.labelEn}
            </button>
          ))}
        </div>
      </div>

      {/* Projects List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProjects.map((p) => {
          const cust = state.customers.find((c) => c.id === p.customer_id);
          const projectMeasurements = state.measurements.filter((m) => m.project_id === p.id);
          const projectWorkOrders = state.productionOrders.filter((wo) => wo.project_id === p.id);

          return (
            <div
              key={p.id}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 flex flex-col justify-between transition group shadow-md space-y-4"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="font-mono font-bold text-amber-400 text-xs">{p.project_code}</span>
                    <h3 className="text-base font-bold text-white group-hover:text-amber-400 transition mt-0.5">
                      {lang === 'ar' ? p.name_ar || p.name : p.name}
                    </h3>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-700 capitalize">
                    {p.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="mt-3 space-y-2 text-xs text-slate-400 border-t border-slate-800/80 pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">{lang === 'ar' ? 'العميل المعتمد:' : 'Client:'}</span>
                    <span className="font-bold text-white">
                      {cust ? (lang === 'ar' ? cust.name_ar || cust.name : cust.name) : '-'}
                    </span>
                  </div>

                  {p.location && (
                    <div className="flex items-center gap-1.5 truncate text-slate-400">
                      <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="truncate">{p.location}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">{lang === 'ar' ? 'قيمة العقد:' : 'Contract Value:'}</span>
                    <span className="font-mono font-extrabold text-amber-400">
                      {p.total_contract_value.toLocaleString()} {state.tenant.currency_symbol}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <Ruler className="w-3.5 h-3.5 text-blue-400" />
                      {projectMeasurements.length} {lang === 'ar' ? 'مقاسات ميدانية' : 'measurements'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-amber-400" />
                      {projectWorkOrders.length} {lang === 'ar' ? 'أوامر تصنيع' : 'orders'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('measurements')}
                  className="min-h-[40px] flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Ruler className="w-3.5 h-3.5 text-amber-400" />
                  <span>{lang === 'ar' ? 'المقاسات الميدانية' : 'Measurements'}</span>
                </button>
                <button
                  onClick={() => setActiveTab('manufacturing')}
                  className="min-h-[40px] flex-1 py-2 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>{lang === 'ar' ? 'أوامر الشغل' : 'Work Orders'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Project Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-amber-400" />
                <span>{lang === 'ar' ? 'إضافة مشروع جديد للورشة' : 'Add New Project'}</span>
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
                    {lang === 'ar' ? 'اسم المشروع (عربي)' : 'Project Name (Arabic)'} *
                  </label>
                  <input
                    type="text"
                    required
                    value={nameAr}
                    onChange={(e) => setNameAr(e.target.value)}
                    placeholder="مثال: فيلا الشيخ صالح السكنية"
                    className="w-full min-h-[44px] bg-slate-950 border border-slate-800 rounded-xl px-3 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    {lang === 'ar' ? 'الاسم بالإنجليزية' : 'Project Name (English)'}
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Sheikh Saleh Villa"
                    className="w-full min-h-[44px] bg-slate-950 border border-slate-800 rounded-xl px-3 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    {lang === 'ar' ? 'العميل المرتبط' : 'Customer'} *
                  </label>
                  <select
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    className="w-full min-h-[44px] bg-slate-950 border border-slate-800 rounded-xl px-3 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    {state.customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {lang === 'ar' ? c.name_ar || c.name : c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    {lang === 'ar' ? 'حالة المشروع' : 'Status'}
                  </label>
                  <select
                    value={status}
                    onChange={(e: any) => setStatus(e.target.value)}
                    className="w-full min-h-[44px] bg-slate-950 border border-slate-800 rounded-xl px-3 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="planning">{lang === 'ar' ? 'تخطيط وتصميم' : 'Planning'}</option>
                    <option value="active">{lang === 'ar' ? 'نشط ومعتمد' : 'Active'}</option>
                    <option value="in_progress">{lang === 'ar' ? 'قيد التنفيذ والتصنيع' : 'In Progress'}</option>
                    <option value="completed">{lang === 'ar' ? 'منجز ومسلم' : 'Completed'}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  {lang === 'ar' ? 'موقع المشروع والعنوان' : 'Project Location'}
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="مثال: صنعاء - بيت بوس - شارع الستين"
                  className="w-full min-h-[44px] bg-slate-950 border border-slate-800 rounded-xl px-3 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    {lang === 'ar' ? 'قيمة العقد (ر.ي)' : 'Contract Value (YER)'}
                  </label>
                  <input
                    type="number"
                    value={contractValue}
                    onChange={(e) => setContractValue(Number(e.target.value))}
                    className="w-full min-h-[44px] bg-slate-950 border border-slate-800 rounded-xl px-3 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    {lang === 'ar' ? 'تاريخ البدء' : 'Start Date'}
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full min-h-[44px] bg-slate-950 border border-slate-800 rounded-xl px-3 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  {lang === 'ar' ? 'ملاحظات تفصيلية ونطاق العمل' : 'Notes / Scope of Work'}
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="مثال: توريد وتركيب نوافذ دبل سحاب مع زجاج سيكوريت عاكس أزرق..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
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
                  {lang === 'ar' ? 'حفظ المشروع' : 'Save Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
