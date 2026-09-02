import React, { useState } from 'react';
import { useERP } from '../context/ERPContext';
import { BOMEngine, CutPiece, OptimizationResult, WorkshopModelType } from '../services/bomEngine';
import { ProductionStage, ProductionOrder } from '../types';
import {
  Hammer,
  Layers,
  ChevronRight,
  CheckCircle2,
  Clock,
  Sparkles,
  Ruler,
  Maximize2,
  DollarSign,
  ArrowRight,
  Settings2,
  Box,
  Scissors,
  Printer,
  FileSpreadsheet,
  X,
  QrCode,
  Check
} from 'lucide-react';

const STAGES_ORDER: { stage: ProductionStage; labelEn: string; labelAr: string; color: string }[] = [
  { stage: 'draft', labelEn: 'Draft', labelAr: 'مسودة', color: 'bg-slate-700' },
  { stage: 'approved', labelEn: 'Approved', labelAr: 'معتمد', color: 'bg-blue-600' },
  { stage: 'materials_reserved', labelEn: 'Reserved', labelAr: 'محجوز المواد', color: 'bg-indigo-600' },
  { stage: 'materials_issued', labelEn: 'Issued', labelAr: 'مصروف للورشة', color: 'bg-cyan-600' },
  { stage: 'cutting', labelEn: 'Cutting', labelAr: 'القص والتشريح', color: 'bg-amber-600' },
  { stage: 'assembly', labelEn: 'Assembly', labelAr: 'التجميع واللحام', color: 'bg-orange-600' },
  { stage: 'glass', labelEn: 'Glass', labelAr: 'تركيب الزجاج', color: 'bg-teal-600' },
  { stage: 'finishing', labelEn: 'Finishing', labelAr: 'التشطيب والأكسسوار', color: 'bg-purple-600' },
  { stage: 'quality_control', labelEn: 'Quality QC', labelAr: 'فحص الجودة', color: 'bg-pink-600' },
  { stage: 'ready', labelEn: 'Ready', labelAr: 'جاهز للتسليم', color: 'bg-emerald-600' },
  { stage: 'delivered', labelEn: 'Delivered', labelAr: 'تم التركيب', color: 'bg-emerald-700' },
  { stage: 'closed', labelEn: 'Closed', labelAr: 'مغلق ومحاسب', color: 'bg-slate-800' },
];

export const ManufacturingView: React.FC = () => {
  const { state, lang, updateProductionStage } = useERP();
  const [activeTab, setActiveTab] = useState<'pipeline' | 'bom_calc' | 'cutting_optimizer' | 'boms'>('pipeline');
  const [selectedTicketOrder, setSelectedTicketOrder] = useState<ProductionOrder | null>(null);

  // Parametric BOM Calculator State
  const [calcModelType, setCalcModelType] = useState<WorkshopModelType>('sliding_window');
  const [calcWidth, setCalcWidth] = useState(120);
  const [calcHeight, setCalcHeight] = useState(120);
  const [calcQuantity, setCalcQuantity] = useState(1);
  const [calcScrapFactor, setCalcScrapFactor] = useState(7); // 7% scrap
  const [calcTargetMargin, setCalcTargetMargin] = useState(30); // 30% margin

  // 1D Cutting Optimizer State
  const [optModelType, setOptModelType] = useState<WorkshopModelType>('sliding_window');
  const [optStockLength, setOptStockLength] = useState(600); // 600 cm (6.00 meters)
  const [optBladeKerf, setOptBladeKerf] = useState(0.4); // 4mm saw blade kerf
  const [optCuts, setOptCuts] = useState<CutPiece[]>(() =>
    BOMEngine.generateModelCutList('sliding_window', 120, 140, 3)
  );

  const bomResult = BOMEngine.calculateModelCost(
    calcModelType,
    calcWidth,
    calcHeight,
    calcQuantity,
    calcScrapFactor,
    calcTargetMargin
  );

  const cuttingOptimization: OptimizationResult = BOMEngine.optimizeCuttingStock(
    optCuts,
    optStockLength,
    optBladeKerf
  );

  const handleAdvanceStage = (order: ProductionOrder) => {
    const currentIndex = STAGES_ORDER.findIndex((s) => s.stage === order.current_stage);
    if (currentIndex < STAGES_ORDER.length - 1) {
      const nextStage = STAGES_ORDER[currentIndex + 1].stage;
      updateProductionStage(order.id, nextStage, `Moved by workshop supervisor at ${new Date().toLocaleTimeString()}`);
    }
  };

  const handleSyncCutListFromDimensions = (model: WorkshopModelType, w: number, h: number, q: number) => {
    setOptCuts(BOMEngine.generateModelCutList(model, w, h, q));
  };

  return (
    <div className="space-y-6">
      {/* Subtab Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto max-w-full">
          <button
            onClick={() => setActiveTab('pipeline')}
            className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition shrink-0 ${
              activeTab === 'pipeline'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            {lang === 'ar' ? 'خط إنتاج أوامر التشغيل (12 مرحلة)' : '12-Stage Pipeline'} ({state.productionOrders.length})
          </button>
          <button
            onClick={() => setActiveTab('cutting_optimizer')}
            className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition shrink-0 ${
              activeTab === 'cutting_optimizer'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Scissors className="w-3.5 h-3.5 text-amber-400" />
              <span>{lang === 'ar' ? 'مخطط تحسين وتقطيع العيدان (1D Optimizer)' : '1D Bar Cutting Optimizer'}</span>
            </span>
          </button>
          <button
            onClick={() => setActiveTab('bom_calc')}
            className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition shrink-0 ${
              activeTab === 'bom_calc'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>{lang === 'ar' ? 'حاسبة التكاليف والتسعير' : 'Parametric Costing'}</span>
            </span>
          </button>
          <button
            onClick={() => setActiveTab('boms')}
            className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition shrink-0 ${
              activeTab === 'boms'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            {lang === 'ar' ? 'قوالب شجرة المواد (BOM)' : 'BOM Templates'} ({state.boms.length})
          </button>
        </div>
      </div>

      {/* TAB 1: PRODUCTION PIPELINE */}
      {activeTab === 'pipeline' && (
        <div className="space-y-4">
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl text-xs text-slate-400 flex items-center justify-between">
            <span>
              {lang === 'ar'
                ? 'مراحل التصنيع الـ 12 تضمن تتبع دقيق لأوامر التشغيل من القص والتجميع والزجاج حتى التركيب النهائي وإصدار بطاقة التشغيل.'
                : '12-stage configurable workflow tracking work-in-progress (WIP) from cutting and assembly to site installation.'}
            </span>
            <span className="font-mono text-amber-400">
              Active Orders: {state.productionOrders.filter((o) => o.current_stage !== 'closed').length}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {state.productionOrders.map((order) => {
              const prod = state.products.find((p) => p.id === order.product_id);
              const cust = state.customers.find((c) => c.id === order.customer_id);
              const stageIdx = STAGES_ORDER.findIndex((s) => s.stage === order.current_stage);
              const currentStageObj = STAGES_ORDER[stageIdx] || STAGES_ORDER[0];
              const isClosed = order.current_stage === 'closed';

              return (
                <div
                  key={order.id}
                  className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 hover:border-slate-700 transition"
                >
                  {/* Order Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        {order.order_number}
                      </span>
                      <h4 className="font-bold text-slate-100 text-sm mt-1.5">
                        {prod ? (lang === 'ar' ? prod.name_ar : prod.name) : 'Aluminium Fabrication'}
                      </h4>
                      <p className="text-xs text-slate-400">
                        {cust ? (lang === 'ar' ? cust.name_ar : cust.name) : 'Stock Replenishment'}
                      </p>
                    </div>

                    <span
                      className={`text-[11px] px-2.5 py-1 rounded-full font-bold uppercase text-white ${currentStageObj.color}`}
                    >
                      {lang === 'ar' ? currentStageObj.labelAr : currentStageObj.labelEn}
                    </span>
                  </div>

                  {/* Dimensions & Quantity */}
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs space-y-1">
                    <div className="flex justify-between text-slate-300">
                      <span>{lang === 'ar' ? 'المقاسات:' : 'Dimensions:'}</span>
                      <span className="font-mono font-bold text-amber-400">
                        {order.dimensions?.width}W × {order.dimensions?.height}H cm
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>{lang === 'ar' ? 'الكمية المطلوبة:' : 'Quantity:'}</span>
                      <span className="font-bold text-white">{order.quantity} units</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>{lang === 'ar' ? 'تاريخ التسليم المستهدف:' : 'Due Date:'}</span>
                      <span className="text-slate-300">{order.due_date}</span>
                    </div>
                  </div>

                  {/* Stage Progress Visual */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>{lang === 'ar' ? 'المرحلة الحالية:' : 'Stage:'} {stageIdx + 1} / {STAGES_ORDER.length}</span>
                      <span>{Math.round(((stageIdx + 1) / STAGES_ORDER.length) * 100)}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 via-emerald-500 to-teal-400 rounded-full transition-all duration-300"
                        style={{ width: `${((stageIdx + 1) / STAGES_ORDER.length) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Buttons: Job Ticket & Advance */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setSelectedTicketOrder(order)}
                      className="py-2 px-3 rounded-xl bg-slate-950 hover:bg-slate-800 text-xs font-semibold text-amber-400 border border-slate-800 transition flex items-center justify-center gap-1.5"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>{lang === 'ar' ? 'بطاقة التشغيل' : 'Job Ticket'}</span>
                    </button>

                    {!isClosed ? (
                      <button
                        onClick={() => handleAdvanceStage(order)}
                        className="py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition flex items-center justify-center gap-1 shadow-md shadow-amber-500/20"
                      >
                        <span>{lang === 'ar' ? 'المرحلة التالية' : 'Next Stage'}</span>
                        <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
                      </button>
                    ) : (
                      <div className="py-2 text-center text-xs text-emerald-400 font-bold bg-emerald-950/40 rounded-xl border border-emerald-800/40">
                        {lang === 'ar' ? 'مكتمل ✓' : 'Closed ✓'}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: 1D BAR CUTTING OPTIMIZER & NESTING VISUALIZER */}
      {activeTab === 'cutting_optimizer' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Cut List Inputs */}
            <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="font-bold text-base text-white flex items-center gap-2">
                  <Scissors className="w-5 h-5 text-amber-400" />
                  <span>{lang === 'ar' ? 'قائمة المقاسات والقطع المطلوبة' : 'Cut List Specification'}</span>
                </h3>
                <span className="text-xs font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  Stock: {optStockLength} cm
                </span>
              </div>

              {/* Quick Template Generator */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300 block">
                    {lang === 'ar' ? 'نوع النموذج والمقاسات:' : 'Model Archetype & Dimensions:'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="col-span-2">
                    <select
                      value={optModelType}
                      onChange={(e) => {
                        const m = e.target.value as WorkshopModelType;
                        setOptModelType(m);
                        const w = Number((document.getElementById('quick-w') as HTMLInputElement)?.value || 120);
                        const h = Number((document.getElementById('quick-h') as HTMLInputElement)?.value || 140);
                        const q = Number((document.getElementById('quick-q') as HTMLInputElement)?.value || 3);
                        handleSyncCutListFromDimensions(m, w, h, q);
                      }}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-amber-400 font-semibold focus:outline-none focus:border-amber-500"
                    >
                      <option value="sliding_window">{lang === 'ar' ? '🪟 نافذة ألمنيوم سحاب (سرايا دبل)' : 'Sliding Window (Double Glazed)'}</option>
                      <option value="hinged_window">{lang === 'ar' ? '🪟 نافذة ألمنيوم مفصلي (قلاب/كاسمنت)' : 'Hinged / Casement Window'}</option>
                      <option value="sliding_door">{lang === 'ar' ? '🚪 باب ألمنيوم سحاب للصالات والبلكونات' : 'Sliding Patio Door'}</option>
                      <option value="hinged_door">{lang === 'ar' ? '🚪 باب ألمنيوم مفصلي ثقيل مع كباس' : 'Heavy Hinged Door'}</option>
                      <option value="handrail">{lang === 'ar' ? '🛡️ دربزين ألمنيوم وزجاج سيكوريت' : 'Glass Balustrade / Handrail'}</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400">{lang === 'ar' ? 'العرض سم' : 'W cm'}</label>
                    <input
                      type="number"
                      defaultValue={120}
                      id="quick-w"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-center text-slate-100 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400">{lang === 'ar' ? 'الارتفاع سم' : 'H cm'}</label>
                    <input
                      type="number"
                      defaultValue={140}
                      id="quick-h"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-center text-slate-100 font-mono"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] text-slate-400">{lang === 'ar' ? 'العدد المطلوب' : 'Quantity'}</label>
                    <input
                      type="number"
                      defaultValue={3}
                      id="quick-q"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-center text-slate-100 font-mono"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const w = Number((document.getElementById('quick-w') as HTMLInputElement)?.value || 120);
                    const h = Number((document.getElementById('quick-h') as HTMLInputElement)?.value || 140);
                    const q = Number((document.getElementById('quick-q') as HTMLInputElement)?.value || 3);
                    handleSyncCutListFromDimensions(optModelType, w, h, q);
                  }}
                  className="w-full py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition shadow-md shadow-amber-500/20"
                >
                  {lang === 'ar' ? 'توليد وتوزيع مقاسات القص آلياً' : 'Generate Model Cut Pieces'}
                </button>
              </div>

              {/* Table of Cut Pieces */}
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {optCuts.map((piece, idx) => (
                  <div
                    key={piece.id}
                    className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-slate-200">{lang === 'ar' ? piece.labelAr : piece.label}</div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {piece.lengthCm} cm × {piece.count} pcs
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        value={piece.count}
                        onChange={(e) => {
                          const newCount = Number(e.target.value);
                          setOptCuts((prev) =>
                            prev.map((p, i) => (i === idx ? { ...p, count: newCount } : p))
                          );
                        }}
                        className="w-14 bg-slate-900 border border-slate-700 rounded p-1 text-center font-mono text-white text-xs"
                      />
                      <span className="text-[10px] text-slate-400">{lang === 'ar' ? 'قطعة' : 'pcs'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Optimizer Bar Layout Diagram */}
            <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="font-bold text-base text-white">
                    {lang === 'ar' ? 'نتائج التقطيع ومخطط العيدان (Bar Nesting Diagram)' : 'Optimized Bar Nesting Plans'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {lang === 'ar'
                      ? 'تطبيق خوارزمية First-Fit Decreasing مع مراعاة سماكة منشار القص (4 ملم) وفرز الفواضل'
                      : 'First-Fit Decreasing algorithm with 4mm saw kerf compensation.'}
                  </p>
                </div>
                <div className="text-right rtl:text-left font-mono">
                  <div className="text-xl font-bold text-amber-400">{cuttingOptimization.totalBarsNeeded}</div>
                  <div className="text-[10px] text-slate-400">{lang === 'ar' ? 'عيدان 6م مطلوبة' : 'Bars Needed'}</div>
                </div>
              </div>

              {/* KPI Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 block">{lang === 'ar' ? 'إجمالي أطوال القص' : 'Total Cut Length'}</span>
                  <span className="font-mono font-bold text-slate-100 text-sm">{cuttingOptimization.totalLengthRequiredCm} cm</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 block">{lang === 'ar' ? 'مجموع الهالك والمتبقي' : 'Total Leftover'}</span>
                  <span className="font-mono font-bold text-rose-400 text-sm">{cuttingOptimization.totalWasteCm} cm</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 block">{lang === 'ar' ? 'فواضل صالحة للاستخدام' : 'Reusable (≥50cm)'}</span>
                  <span className="font-mono font-bold text-emerald-400 text-sm">{cuttingOptimization.reusableOffcutsCount} {lang === 'ar' ? 'وصلة' : 'pcs'}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 block">{lang === 'ar' ? 'نسبة الهالك الكلي' : 'Scrap Margin'}</span>
                  <span className="font-mono font-bold text-amber-400 text-sm">{cuttingOptimization.scrapWastePercentage}%</span>
                </div>
              </div>

              {/* Visual Bars Container */}
              <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
                {cuttingOptimization.barPlans.map((bar) => (
                  <div
                    key={bar.barIndex}
                    className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-bold text-amber-400">
                        {lang === 'ar' ? `عود ألمنيوم رقم ${bar.barIndex}` : `Bar #${bar.barIndex}`} (6.00m)
                      </span>
                      <div className="flex items-center gap-3 font-mono text-[11px]">
                        <span className="text-slate-300">Used: {bar.usedLengthCm} cm</span>
                        <span className={bar.isScrap ? 'text-rose-400' : 'text-emerald-400 font-bold'}>
                          Leftover: {bar.leftoverCm} cm ({bar.isScrap ? (lang === 'ar' ? 'هالك' : 'Scrap') : (lang === 'ar' ? 'فاضل صالح' : 'Reusable')})
                        </span>
                      </div>
                    </div>

                    {/* Bar Visual Strip */}
                    <div className="h-7 w-full bg-slate-900 rounded-lg overflow-hidden flex border border-slate-800/80 p-0.5 gap-0.5">
                      {bar.cuts.map((c, cIdx) => {
                        const widthPct = (c.lengthCm / optStockLength) * 100;
                        const colors = [
                          'bg-amber-500 text-slate-950',
                          'bg-blue-500 text-white',
                          'bg-emerald-500 text-slate-950',
                          'bg-cyan-500 text-slate-950',
                          'bg-purple-500 text-white',
                        ];
                        const colorClass = colors[cIdx % colors.length];

                        return (
                          <div
                            key={cIdx}
                            style={{ width: `${widthPct}%` }}
                            className={`h-full ${colorClass} rounded flex items-center justify-center text-[10px] font-mono font-bold truncate px-1 shadow-sm`}
                            title={`${c.labelAr || c.label}: ${c.lengthCm}cm`}
                          >
                            {c.lengthCm}cm
                          </div>
                        );
                      })}

                      {/* Leftover Scrap Section */}
                      {bar.leftoverCm > 0 && (
                        <div
                          style={{ width: `${(bar.leftoverCm / optStockLength) * 100}%` }}
                          className={`h-full rounded flex items-center justify-center text-[9px] font-mono font-bold truncate px-1 ${
                            bar.isScrap
                              ? 'bg-rose-950/60 text-rose-400 border border-rose-800/40'
                              : 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                          }`}
                        >
                          {bar.leftoverCm}cm
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PARAMETRIC BOM & FORMULA COSTING CALCULATOR */}
      {activeTab === 'bom_calc' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls & Dimensions Input */}
          <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-5 shadow-sm">
            <div>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Ruler className="w-5 h-5 text-amber-400" />
                <span>{lang === 'ar' ? 'مدخلات المقاسات والمعادلات' : 'Parametric Dimensions'}</span>
              </h3>
              <p className="text-xs text-slate-400">
                {lang === 'ar'
                  ? 'يقوم المحرك بتطبيق معادلات القص وحساب الهالك والتسعير المالي الفوري'
                  : 'Formulas evaluate raw materials, scrap margin, and suggested pricing.'}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {lang === 'ar' ? 'نوع النموذج والمصنعية:' : 'Workshop Model Archetype:'}
                </label>
                <select
                  value={calcModelType}
                  onChange={(e) => setCalcModelType(e.target.value as WorkshopModelType)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-amber-400 font-bold focus:outline-none focus:border-amber-500"
                >
                  <option value="sliding_window">{lang === 'ar' ? '🪟 نافذة ألمنيوم سحاب (سرايا دبل جلاس)' : 'Sliding Window (Double Glazed)'}</option>
                  <option value="hinged_window">{lang === 'ar' ? '🪟 نافذة ألمنيوم مفصلي (كاسمنت)' : 'Hinged / Casement Window'}</option>
                  <option value="sliding_door">{lang === 'ar' ? '🚪 باب ألمنيوم سحاب للصالات والبلكونات' : 'Sliding Patio Door'}</option>
                  <option value="hinged_door">{lang === 'ar' ? '🚪 باب ألمنيوم مفصلي ثقيل مع كباس' : 'Heavy Hinged Door'}</option>
                  <option value="handrail">{lang === 'ar' ? '🛡️ دربزين ألمنيوم وزجاج سيكوريت' : 'Glass Balustrade / Handrail'}</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {lang === 'ar' ? 'العرض (سم)' : 'Width (cm)'}
                  </label>
                  <input
                    type="number"
                    value={calcWidth}
                    onChange={(e) => setCalcWidth(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {lang === 'ar' ? 'الارتفاع (سم)' : 'Height (cm)'}
                  </label>
                  <input
                    type="number"
                    value={calcHeight}
                    onChange={(e) => setCalcHeight(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {lang === 'ar' ? 'العدد' : 'Quantity'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={calcQuantity}
                    onChange={(e) => setCalcQuantity(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {lang === 'ar' ? 'نسبة الهالك %' : 'Scrap %'}
                  </label>
                  <input
                    type="number"
                    value={calcScrapFactor}
                    onChange={(e) => setCalcScrapFactor(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {lang === 'ar' ? 'هامش الربح %' : 'Margin %'}
                  </label>
                  <input
                    type="number"
                    value={calcTargetMargin}
                    onChange={(e) => setCalcTargetMargin(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* Formulas Breakdown Notes */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 space-y-1.5">
              <div className="font-semibold text-amber-400">{lang === 'ar' ? 'معادلات الحساب المطبقة:' : 'Applied Parametric Formulas:'}</div>
              <div>• Profile Bars = <code className="text-slate-300">((2*W + 2*H) / 600) * Qty * 1.07</code></div>
              <div>• Glass Area = <code className="text-slate-300">((W * H) / 10000) * Qty</code> m²</div>
              <div>• Rubber Gasket = <code className="text-slate-300">((2*W + 2*H) / 100) * 2</code> meters</div>
            </div>
          </div>

          {/* BOM Costing & Suggested Price Breakdown */}
          <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-base text-white">
                  {lang === 'ar' ? 'تقرير التكاليف وتسعير المبيعات' : 'Cost Breakdown & Pricing'}
                </h3>
                <p className="text-xs text-slate-400">
                  نافذة سحاب ألمنيوم سرايا دبل جلاس ({calcWidth}×{calcHeight} سم)
                </p>
              </div>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-950 px-2.5 py-1 rounded-lg border border-emerald-800">
                WAC Costing
              </span>
            </div>

            {/* Calculated Material Quantities */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-slate-400">{lang === 'ar' ? 'عيدان الألمنيوم' : 'Aluminium Bars'}</div>
                <div className="text-base font-bold text-amber-400 font-mono mt-1">{bomResult.profileBarsNeeded} {lang === 'ar' ? 'عود 6م' : 'bars'}</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-slate-400">{lang === 'ar' ? 'مساحة الزجاج' : 'Glass Area'}</div>
                <div className="text-base font-bold text-cyan-400 font-mono mt-1">{bomResult.glassAreaM2} m²</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-slate-400">{lang === 'ar' ? 'الربر والكواشيك' : 'Rubber Gasket'}</div>
                <div className="text-base font-bold text-slate-200 font-mono mt-1">{bomResult.rubberMeters} {lang === 'ar' ? 'متر' : 'meters'}</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-slate-400">{lang === 'ar' ? 'أطقم كفرات وسكرة' : 'Hardware'}</div>
                <div className="text-base font-bold text-slate-200 font-mono mt-1">{bomResult.hardwareSets} {lang === 'ar' ? 'طقم' : 'sets'}</div>
              </div>
            </div>

            {/* Detailed Cost Breakdown Table */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-800 text-slate-300">
                <span>{lang === 'ar' ? 'تكلفة المواد الخام المباشرة:' : 'Direct Material Cost:'}</span>
                <span className="font-mono font-bold text-slate-100">{Math.round(bomResult.materialCost).toLocaleString()} {state.tenant.currency_symbol}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800 text-slate-300">
                <span>{lang === 'ar' ? 'تكلفة أجور الفنيين والقص المباشرة:' : 'Direct Labor Cost:'}</span>
                <span className="font-mono font-bold text-slate-100">{Math.round(bomResult.laborCost).toLocaleString()} {state.tenant.currency_symbol}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800 text-slate-300">
                <span>{lang === 'ar' ? 'المصاريف الصناعية غير المباشرة (كهرباء، استهلاك آلات):' : 'Factory Overheads:'}</span>
                <span className="font-mono font-bold text-slate-100">{Math.round(bomResult.overheadCost).toLocaleString()} {state.tenant.currency_symbol}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800 font-bold text-sm text-white">
                <span>{lang === 'ar' ? 'إجمالي تكلفة الإنتاج والتصنيع:' : 'Total Manufacturing Cost:'}</span>
                <span className="font-mono text-amber-400">{Math.round(bomResult.totalCost).toLocaleString()} {state.tenant.currency_symbol}</span>
              </div>
            </div>

            {/* Suggested Selling Price Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-slate-900 to-emerald-500/20 border border-amber-500/40 flex items-center justify-between">
              <div>
                <div className="text-xs text-amber-300 font-semibold">{lang === 'ar' ? 'سعر البيع المقترح بهامش ربح' : 'Suggested Selling Price'} ({calcTargetMargin}%):</div>
                <div className="text-2xl font-extrabold text-white font-mono mt-0.5">
                  {Math.round(bomResult.suggestedPrice).toLocaleString()} <span className="text-xs text-amber-400 font-normal">{state.tenant.currency_symbol}</span>
                </div>
              </div>

              <div className="text-right rtl:text-left">
                <div className="text-xs text-emerald-400 font-bold">
                  +{Math.round(bomResult.suggestedPrice - bomResult.totalCost).toLocaleString()} {state.tenant.currency_symbol}
                </div>
                <div className="text-[10px] text-slate-400">{lang === 'ar' ? 'صافي هامش الربح' : 'Net Gross Margin'}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: BOM TEMPLATES LIST */}
      {activeTab === 'boms' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {state.boms.map((bom) => (
            <div key={bom.id} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-base text-white">
                    {lang === 'ar' ? bom.name_ar : bom.name}
                  </h4>
                  <span className="text-xs text-slate-400">Ver {bom.revision} • {bom.name}</span>
                </div>
                <span className="text-xs text-emerald-400 font-bold bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                  ACTIVE
                </span>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-slate-800 text-xs text-slate-300">
                <div className="font-semibold text-amber-400">{lang === 'ar' ? 'المواد المكونة في القالب:' : 'Components:'}</div>
                {bom.components.map((c) => (
                  <div key={c.id} className="flex justify-between text-slate-400">
                    <span>{c.product_id.replace('p-raw-', '').replace('-', ' ')}</span>
                    <span className="font-mono text-slate-300">{c.quantity_formula || `${c.fixed_quantity} ${c.unit}`}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* JOB TICKET MODAL */}
      {selectedTicketOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">
                    {lang === 'ar' ? 'بطاقة تشغيل وأمر تصنيع ورشة' : 'Workshop Job Ticket & Cut Sheet'}
                  </h3>
                  <span className="font-mono text-xs text-amber-400">{selectedTicketOrder.order_number}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedTicketOrder(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Job Ticket Layout */}
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 text-xs font-sans">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <div className="font-extrabold text-sm text-white">{state.tenant.name_ar}</div>
                  <div className="text-[11px] text-slate-400">{state.tenant.phone} • {state.tenant.address}</div>
                </div>
                <div className="text-right rtl:text-left font-mono">
                  <div className="text-[10px] text-slate-400">{lang === 'ar' ? 'تاريخ الأمر' : 'Date'}</div>
                  <div className="text-slate-200 font-bold">{selectedTicketOrder.created_at.split('T')[0]}</div>
                </div>
              </div>

              {/* Order Specs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">{lang === 'ar' ? 'المنتج' : 'Product'}</span>
                  <span className="font-bold text-slate-200">نافذة سرايا دبل</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">{lang === 'ar' ? 'المقاس (عرض × ارتفاع)' : 'Dimensions'}</span>
                  <span className="font-bold text-amber-400 font-mono">
                    {selectedTicketOrder.dimensions?.width} × {selectedTicketOrder.dimensions?.height} cm
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">{lang === 'ar' ? 'الكمية' : 'Quantity'}</span>
                  <span className="font-bold text-white font-mono">{selectedTicketOrder.quantity} units</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">{lang === 'ar' ? 'اللون' : 'Color'}</span>
                  <span className="font-bold text-slate-200">{selectedTicketOrder.dimensions?.color || 'بني برونزي'}</span>
                </div>
              </div>

              {/* Cut List Table */}
              <div className="space-y-1.5">
                <div className="font-bold text-amber-400">{lang === 'ar' ? 'جدول مقاسات القص للفنيين:' : 'Technician Cut List:'}</div>
                <table className="w-full text-left rtl:text-right text-[11px] font-mono">
                  <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="p-2">القطعة / Profile</th>
                      <th className="p-2">الطول (سم)</th>
                      <th className="p-2">العدد الإجمالي</th>
                      <th className="p-2">زاوية القص</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850">
                    <tr>
                      <td className="p-2 font-sans">حلق أفقي (أعلى وسفلي)</td>
                      <td className="p-2 font-bold text-white">{selectedTicketOrder.dimensions?.width} cm</td>
                      <td className="p-2">{2 * selectedTicketOrder.quantity} pcs</td>
                      <td className="p-2 text-slate-400">45° / 45°</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-sans">حلق رأسي (قوائم جانبية)</td>
                      <td className="p-2 font-bold text-white">{selectedTicketOrder.dimensions?.height} cm</td>
                      <td className="p-2">{2 * selectedTicketOrder.quantity} pcs</td>
                      <td className="p-2 text-slate-400">45° / 45°</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-sans">قوائم درفة منزلقة</td>
                      <td className="p-2 font-bold text-white">{(selectedTicketOrder.dimensions?.height || 120) - 5.5} cm</td>
                      <td className="p-2">{4 * selectedTicketOrder.quantity} pcs</td>
                      <td className="p-2 text-slate-400">90° عدل</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-sans">زجاج دبل جلاس 6+6 ملم</td>
                      <td className="p-2 font-bold text-cyan-400">
                        {((selectedTicketOrder.dimensions?.width || 120) / 2 - 4.5).toFixed(1)} × {((selectedTicketOrder.dimensions?.height || 120) - 11.5).toFixed(1)} cm
                      </td>
                      <td className="p-2">{2 * selectedTicketOrder.quantity} لوح</td>
                      <td className="p-2 text-slate-400">Clear Double</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Technician Sign-Off Box */}
              <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-800 text-[10px]">
                <div className="p-2 rounded bg-slate-900 border border-slate-800">
                  <div className="text-slate-400">فني القص:</div>
                  <div className="mt-4 border-b border-slate-700"></div>
                </div>
                <div className="p-2 rounded bg-slate-900 border border-slate-800">
                  <div className="text-slate-400">فني التجميع والزجاج:</div>
                  <div className="mt-4 border-b border-slate-700"></div>
                </div>
                <div className="p-2 rounded bg-slate-900 border border-slate-800">
                  <div className="text-slate-400">مشرف الجودة (QC):</div>
                  <div className="mt-4 border-b border-slate-700"></div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setSelectedTicketOrder(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs"
              >
                {lang === 'ar' ? 'إغلاق' : 'Close'}
              </button>
              <button
                onClick={() => window.print()}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition flex items-center gap-1.5 shadow-md shadow-amber-500/20"
              >
                <Printer className="w-4 h-4" />
                <span>{lang === 'ar' ? 'طباعة بطاقة التشغيل' : 'Print Job Ticket'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
