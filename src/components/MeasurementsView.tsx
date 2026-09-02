import React, { useState } from 'react';
import { useERP } from '../context/ERPContext';
import {
  Ruler,
  Plus,
  Search,
  CheckCircle2,
  Layers,
  ArrowRight,
  X,
  Sparkles,
  Building,
  Scissors,
  DollarSign
} from 'lucide-react';
import { BOMEngine } from '../services/bomEngine';

export const MeasurementsView: React.FC = () => {
  const { state, lang, createMeasurement, convertMeasurementToBOM, setActiveTab } = useERP();
  const [searchQuery, setSearchQuery] = useState('');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [projectId, setProjectId] = useState(state.projects[0]?.id || '');
  const [customerId, setCustomerId] = useState(state.customers[0]?.id || '');
  const [locationName, setLocationName] = useState('');
  const [locationNameAr, setLocationNameAr] = useState('');
  const [productType, setProductType] = useState('sliding_window');
  const [width, setWidth] = useState(120);
  const [height, setHeight] = useState(150);
  const [depth, setDepth] = useState(10);
  const [quantity, setQuantity] = useState(1);
  const [color, setColor] = useState('White RAL 9016');
  const [glassSpec, setGlassSpec] = useState('Double Glazed 6mm Clear / 12mm Air / 6mm Low-E');
  const [notes, setNotes] = useState('');

  const filteredMeasurements = state.measurements.filter((m) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      m.tag_number.toLowerCase().includes(q) ||
      m.location_name.toLowerCase().includes(q) ||
      (m.location_name_ar && m.location_name_ar.toLowerCase().includes(q)) ||
      m.color.toLowerCase().includes(q);
    const matchesProject = projectFilter === 'all' || m.project_id === projectFilter;
    return matchesSearch && matchesProject;
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationName && !locationNameAr) return;

    createMeasurement({
      tenant_id: state.tenant.id,
      project_id: projectId,
      customer_id: customerId,
      location_name: locationName || locationNameAr,
      location_name_ar: locationNameAr || locationName,
      product_type: productType,
      width: Number(width),
      height: Number(height),
      depth: Number(depth),
      quantity: Number(quantity),
      color,
      glass_spec: glassSpec,
      notes,
    });

    setLocationName('');
    setLocationNameAr('');
    setNotes('');
    setShowModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <Ruler className="w-7 h-7 text-amber-400" />
            <span>{lang === 'ar' ? 'المسوحات الميدانية والمقاسات (Site Measurements)' : 'Field Measurements & Surveys'}</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {lang === 'ar'
              ? 'رفع مقاسات النوافذ والأبواب الميدانية وتحويلها آلياً لشجرة مواد وجداول تقطيع'
              : 'Record site dimensions (W x H) and auto-generate BOMs and cutting plans.'}
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="min-h-[48px] px-5 py-3 rounded-xl font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
          <span>{lang === 'ar' ? 'رفع مقاس جديد' : 'New Measurement'}</span>
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase">
              {lang === 'ar' ? 'إجمالي المقاسات المسجلة' : 'Total Survey Tags'}
            </span>
            <div className="text-2xl font-extrabold text-white mt-1">{state.measurements.length}</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Ruler className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase">
              {lang === 'ar' ? 'تم تحويلها لأوامر تصنيع' : 'Converted to BOM'}
            </span>
            <div className="text-2xl font-extrabold text-emerald-400 mt-1">
              {state.measurements.filter((m) => m.status === 'converted_to_bom').length}
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Sparkles className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase">
              {lang === 'ar' ? 'بانتظار تجهيز التقطيع' : 'Pending Fabrication'}
            </span>
            <div className="text-2xl font-extrabold text-amber-400 mt-1">
              {state.measurements.filter((m) => m.status !== 'converted_to_bom').length}
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Scissors className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 rtl:right-3 rtl:left-auto left-auto top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={lang === 'ar' ? 'البحث برقم المقاس أو الموقع...' : 'Search by tag # or room...'}
            className="w-full min-h-[44px] bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-4 rtl:pr-9 rtl:pl-4 text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="min-h-[40px] px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-slate-200 focus:outline-none focus:border-amber-500"
          >
            <option value="all">{lang === 'ar' ? 'جميع المشاريع' : 'All Projects'}</option>
            {state.projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.project_code} - {lang === 'ar' ? p.name_ar || p.name : p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid of Measurements */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredMeasurements.map((m) => {
          const proj = state.projects.find((p) => p.id === m.project_id);
          const isConverted = m.status === 'converted_to_bom';

          // Calculate parametric estimates on the fly
          const cutList = BOMEngine.generateCutListFromMeasurement({
            width: m.width,
            height: m.height,
            depth: m.depth,
            product_type: m.product_type,
            quantity: m.quantity,
            color: m.color,
            glass_spec: m.glass_spec,
          });

          const totalCutPieces = cutList.reduce((acc, c) => acc + c.count, 0);

          return (
            <div
              key={m.id}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 flex flex-col justify-between transition group shadow-md space-y-4"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="font-mono font-extrabold text-amber-400 text-sm">{m.tag_number}</span>
                    <h3 className="text-base font-bold text-white mt-0.5">
                      {lang === 'ar' ? m.location_name_ar || m.location_name : m.location_name}
                    </h3>
                    {proj && (
                      <span className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <Building className="w-3 h-3 text-slate-500" />
                        {lang === 'ar' ? proj.name_ar || proj.name : proj.name}
                      </span>
                    )}
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                      isConverted
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    }`}
                  >
                    {isConverted ? (lang === 'ar' ? 'مجهز للتصنيع' : 'In Production') : (lang === 'ar' ? 'مقاس معتمد' : 'Verified')}
                  </span>
                </div>

                {/* Dimension Box */}
                <div className="mt-3 grid grid-cols-3 gap-2 bg-slate-950 rounded-xl p-3 border border-slate-800/80 text-center font-mono">
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-sans font-semibold">
                      {lang === 'ar' ? 'العرض' : 'Width'}
                    </span>
                    <span className="text-base font-extrabold text-white">{m.width} cm</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-sans font-semibold">
                      {lang === 'ar' ? 'الارتفاع' : 'Height'}
                    </span>
                    <span className="text-base font-extrabold text-white">{m.height} cm</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-sans font-semibold">
                      {lang === 'ar' ? 'الكمية' : 'Qty'}
                    </span>
                    <span className="text-base font-extrabold text-amber-400">{m.quantity}</span>
                  </div>
                </div>

                {/* Specs */}
                <div className="mt-3 space-y-1.5 text-xs text-slate-400 border-t border-slate-800 pt-3">
                  <div className="flex justify-between">
                    <span>{lang === 'ar' ? 'النوع:' : 'Type:'}</span>
                    <span className="font-semibold text-slate-200 capitalize">{m.product_type.replace('_', ' ')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{lang === 'ar' ? 'اللون (RAL):' : 'Color:'}</span>
                    <span className="font-semibold text-slate-200">{m.color}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{lang === 'ar' ? 'مواصفة الزجاج:' : 'Glass:'}</span>
                    <span className="font-semibold text-slate-200 truncate max-w-[200px]">{m.glass_spec}</span>
                  </div>
                  <div className="flex justify-between text-amber-400 font-mono font-bold pt-1">
                    <span>{lang === 'ar' ? 'قطع التقطيع المقدرة:' : 'Calculated Cut Pieces:'}</span>
                    <span>{totalCutPieces} {lang === 'ar' ? 'قطعة' : 'pcs'}</span>
                  </div>
                </div>
              </div>

              {/* Action */}
              <div className="pt-2 border-t border-slate-800">
                {!isConverted ? (
                  <button
                    onClick={() => convertMeasurementToBOM(m.id)}
                    className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition shadow-md cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{lang === 'ar' ? 'توليد شجرة المواد وأمر الشغل (BOM & Cutting)' : 'Generate BOM & Cutting'}</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setActiveTab('manufacturing')}
                    className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{lang === 'ar' ? 'عرض في محرك التصنيع والتقطيع' : 'View in Manufacturing & Cutting'}</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Measurement Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Ruler className="w-5 h-5 text-amber-400" />
                <span>{lang === 'ar' ? 'تسجيل مقاس ميداني موقعي جديد' : 'Record Site Measurement'}</span>
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
                    {lang === 'ar' ? 'المشروع المرتبط' : 'Project'}
                  </label>
                  <select
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    className="w-full min-h-[44px] bg-slate-950 border border-slate-800 rounded-xl px-3 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="">{lang === 'ar' ? 'بدون مشروع (مباشر)' : 'Direct Order'}</option>
                    {state.projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.project_code} - {lang === 'ar' ? p.name_ar || p.name : p.name}
                      </option>
                    ))}
                  </select>
                </div>
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
                        {lang === 'ar' ? c.name_ar || c.name : c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    {lang === 'ar' ? 'الموقع / الغرفة (عربي)' : 'Room / Location (Arabic)'} *
                  </label>
                  <input
                    type="text"
                    required
                    value={locationNameAr}
                    onChange={(e) => setLocationNameAr(e.target.value)}
                    placeholder="مثال: مجلس الرجال - النافذة الأمامية"
                    className="w-full min-h-[44px] bg-slate-950 border border-slate-800 rounded-xl px-3 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    {lang === 'ar' ? 'نوع المنتج' : 'Product Type'}
                  </label>
                  <select
                    value={productType}
                    onChange={(e) => setProductType(e.target.value)}
                    className="w-full min-h-[44px] bg-slate-950 border border-slate-800 rounded-xl px-3 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="sliding_window">{lang === 'ar' ? 'نافذة سحاب (Sliding Window)' : 'Sliding Window'}</option>
                    <option value="hinged_window">{lang === 'ar' ? 'نافذة مفصلية (Hinged Window)' : 'Hinged Window'}</option>
                    <option value="sliding_door">{lang === 'ar' ? 'باب سحاب بلكونة (Sliding Door)' : 'Sliding Door'}</option>
                    <option value="hinged_door">{lang === 'ar' ? 'باب مفصلي (Hinged Door)' : 'Hinged Door'}</option>
                    <option value="handrail">{lang === 'ar' ? 'درابزين سلم / بلكونة (Handrail)' : 'Handrail'}</option>
                    <option value="curtain_wall">{lang === 'ar' ? 'واجهة زجاجية (Curtain Wall)' : 'Curtain Wall'}</option>
                  </select>
                </div>
              </div>

              {/* Dimensions */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    {lang === 'ar' ? 'العرض (سم)' : 'Width (cm)'} *
                  </label>
                  <input
                    type="number"
                    required
                    value={width}
                    onChange={(e) => setWidth(Number(e.target.value))}
                    className="w-full min-h-[44px] bg-slate-950 border border-slate-800 rounded-xl px-3 text-center text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    {lang === 'ar' ? 'الارتفاع (سم)' : 'Height (cm)'} *
                  </label>
                  <input
                    type="number"
                    required
                    value={height}
                    onChange={(e) => setHeight(Number(e.target.value))}
                    className="w-full min-h-[44px] bg-slate-950 border border-slate-800 rounded-xl px-3 text-center text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    {lang === 'ar' ? 'الكمية' : 'Qty'} *
                  </label>
                  <input
                    type="number"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full min-h-[44px] bg-slate-950 border border-slate-800 rounded-xl px-3 text-center text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    {lang === 'ar' ? 'كود اللون (RAL)' : 'Color'}
                  </label>
                  <input
                    type="text"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    placeholder="White RAL 9016 / Bronze"
                    className="w-full min-h-[44px] bg-slate-950 border border-slate-800 rounded-xl px-3 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    {lang === 'ar' ? 'مواصفة الزجاج' : 'Glass Spec'}
                  </label>
                  <input
                    type="text"
                    value={glassSpec}
                    onChange={(e) => setGlassSpec(e.target.value)}
                    placeholder="Double Glazed 6+12+6mm"
                    className="w-full min-h-[44px] bg-slate-950 border border-slate-800 rounded-xl px-3 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  {lang === 'ar' ? 'ملاحظات الفني الميداني' : 'Technician Notes'}
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="ملاحظات التركيب، العتب، نوع المقابض..."
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
                  {lang === 'ar' ? 'حفظ المقاس' : 'Save Measurement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
