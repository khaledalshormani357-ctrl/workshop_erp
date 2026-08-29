import React, { useState } from 'react';
import { useERP } from '../context/ERPContext';
import {
  FileCheck2,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ShieldAlert,
  ArrowRight,
  BookOpen,
  MessageSquare,
  Award,
  Sparkles,
  HelpCircle,
  Edit3,
  Check,
  FileDown,
  Loader2
} from 'lucide-react';
import { generateWorkshopERPWordReport } from '../utils/exportDocx';

export const ReviewGateView: React.FC = () => {
  const { state, lang, approveReviewGate, updateClarification, setActiveTab } = useERP();
  const [editingClarificationId, setEditingClarificationId] = useState<number | null>(null);
  const [tempAnswer, setTempAnswer] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      await generateWorkshopERPWordReport();
    } catch (err) {
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  };

  const adrs = [
    {
      id: 'ADR-001',
      titleEn: 'Offline-First SQLite as Source of Truth',
      titleAr: 'قاعدة بيانات SQLite المحلية كمصدر حقيقة تشغيلي أول',
      status: 'ACCEPTED',
      rationaleEn:
        'Workshops operate in industrial areas with spotty connectivity. The local encrypted SQLite database processes all transactions locally with zero network latency.',
      rationaleAr:
        'تعمل الورش في مناطق صناعية ذات اتصال متقطع. تعالج قاعدة بيانات SQLite المحلية كافة الفواتير وحركات المخزون والقيود المحاسبية دون الاعتماد على الإنترنت.',
    },
    {
      id: 'ADR-002',
      titleEn: 'Asynchronous Outbox Sync Pattern',
      titleAr: 'نمط التزامن عبر صندوق الصادر (Outbox Pattern)',
      status: 'ACCEPTED',
      rationaleEn:
        'Mutations write an atomic record to the local outbox table inside the same SQLite transaction. A background worker pushes changes to cloud Postgres/Supabase when online.',
      rationaleAr:
        'يتم تسجيل أي حركة وتعديل في جدول صندوق الصادر outbox داخل نفس المعاملة الذرية، ثم يقوم المحرك بإرسالها للسحابة فور عودة الإنترنت.',
    },
    {
      id: 'ADR-003',
      titleEn: 'Multi-Tenant with Row-Level Isolation',
      titleAr: 'بنية تعدد المستأجرين مع عزل تام على مستوى الصف (tenant_id)',
      status: 'ACCEPTED',
      rationaleEn:
        'Every single entity and query enforces tenant_id scoping to guarantee complete isolation across fabrication workshops and subsidiaries.',
      rationaleAr:
        'جميع الجداول والاستعلامات تفرض وجود معرف الورشة المستأجرة tenant_id لمنع تداخل البيانات بين الورش والفروع.',
    },
    {
      id: 'ADR-004',
      titleEn: 'Immutable Double-Entry Accounting Ledger',
      titleAr: 'دفتر محاسبي غير قابل للتعديل بنظام القيد المزدوج',
      status: 'ACCEPTED',
      rationaleEn:
        'Journal entries cannot be edited or deleted after posting. Erroneous entries are strictly corrected using counter-reversal entries with audit logs.',
      rationaleAr:
        'القيود المحاسبية المرحلة غير قابلة للحذف أو التعديل، وأي تصحيح يتم عبر قيود يومية عكسية مبررة توثق في سجل الرقابة.',
    },
    {
      id: 'ADR-005',
      titleEn: 'Event-Sourced Inventory (Stock Movements)',
      titleAr: 'نموذج المخزون المبني على سجل الحركات غير القابل للتعديل',
      status: 'ACCEPTED',
      rationaleEn:
        'Products do not have a mutable quantity column. Balances and valuation are computed dynamically from immutable StockMovement rows.',
      rationaleAr:
        'لا يوجد حقل كمية قابل للتعديل اليدوي المباشر في جدول الأصناف، بل يُشتق الرصيد وقيمته من حاصل جمع سجل الحركات المخزنية الواردة والصادرة.',
    },
    {
      id: 'ADR-006',
      titleEn: 'Parametric BOM & 12-Stage Manufacturing Workflow',
      titleAr: 'شجرة مواد متغيرة الحساب (BOM) مع 12 مرحلة تصنيع',
      status: 'ACCEPTED',
      rationaleEn:
        'Aluminium & steel windows vary by dimension. Parametric formulas dynamically calculate 6m bars, glass area, scrap margin, labor, and suggested price.',
      rationaleAr:
        'تختلف النوافذ والأبواب بحسب مقاسات العرض والارتفاع؛ تطبق الصيغ الرياضية لحساب عدد عيدان الألمنيوم، مساحة الزجاج، الهالك، والتكلفة والتسعير آلياً.',
    },
  ];

  const handleStartEdit = (id: number, currentAnswer: string) => {
    setEditingClarificationId(id);
    setTempAnswer(currentAnswer);
  };

  const handleSaveClarification = (id: number) => {
    updateClarification(id, tempAnswer, 'confirmed');
    setEditingClarificationId(null);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Sign-Off Status Hero Header */}
      <div
        className={`rounded-3xl p-6 sm:p-8 border shadow-xl transition-all ${
          state.isReviewGateApproved
            ? 'bg-gradient-to-br from-emerald-950/80 via-slate-900 to-slate-950 border-emerald-500/40 text-slate-100'
            : 'bg-gradient-to-br from-amber-950/80 via-slate-900 to-slate-950 border-amber-500/40 text-slate-100'
        }`}
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div
              className={`p-3.5 rounded-2xl border shadow-lg ${
                state.isReviewGateApproved
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                  : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
              }`}
            >
              {state.isReviewGateApproved ? (
                <Award className="w-8 h-8" />
              ) : (
                <FileCheck2 className="w-8 h-8" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  Document Version 0.9
                </span>
                {state.isReviewGateApproved && (
                  <span className="text-xs font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>APPROVED FOR PHASE 1</span>
                  </span>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white mt-1.5">
                {lang === 'ar'
                  ? 'بوابة مراجعة واعتماد المرحلة الصفرية (Phase 0 Review Gate)'
                  : 'Phase 0 Architecture Specification Review Gate'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
                {lang === 'ar'
                  ? 'وفقاً لمحددات الوثيقة: "لا يتم الانتقال إلى المرحلة 1 (Phase 1: Database & Core Models) حتى يتم مراجعة واعتماد القرارات الهندسية والإجابة عن الأسئلة التوضيحية".'
                  : 'Mandate: Do not proceed to Phase 1 until explicit sign-off is given on architecture, ADRs, and domain rules.'}
              </p>
            </div>
          </div>

          {/* Action / Official Sign Off & Export Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch md:items-center gap-3">
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="px-5 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 shrink-0 disabled:opacity-50"
            >
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
              <span>{lang === 'ar' ? 'تحميل التقرير كملف وورد (.docx)' : 'Download Word Report'}</span>
            </button>

            {!state.isReviewGateApproved ? (
              <button
                onClick={approveReviewGate}
                className="w-full md:w-auto px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-extrabold text-sm transition flex items-center justify-center gap-2.5 shadow-xl shadow-amber-500/25 shrink-0"
              >
                <FileCheck2 className="w-5 h-5" />
                <span>{lang === 'ar' ? 'توقيع واعتماد المرحلة 0 رسمياً' : 'Official Phase 0 Sign-Off'}</span>
              </button>
            ) : (
              <div className="text-right rtl:text-left p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/30 shrink-0 space-y-1">
                <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{lang === 'ar' ? 'تم التوقيع والاعتماد رسميـاً' : 'Phase 0 Officially Signed Off'}</span>
                </div>
                <div className="text-[11px] text-slate-300">
                  Principal Software Architect & Al-Andalus Workshop
                </div>
                <button
                  onClick={() => setActiveTab('sync_architecture')}
                  className="mt-2 text-xs font-bold text-amber-400 hover:underline flex items-center gap-1"
                >
                  <span>{lang === 'ar' ? 'الانتقال لفحص هيكل SQLite للمرحلة 1' : 'Inspect Phase 1 SQLite DDL'}</span>
                  <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 6 Architectural Decision Records (ADRs) Grid */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="font-extrabold text-base sm:text-lg text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-amber-400" />
              <span>{lang === 'ar' ? 'القرارات المعمارية المعتمدة (ADRs)' : 'Architectural Decision Records (ADRs)'}</span>
            </h3>
            <p className="text-xs text-slate-400">
              {lang === 'ar'
                ? '6 ركائز هندسية تضمن استقرار النظام في بيئة الورش وأوفلاين أولاً'
                : '6 foundational pillars governing local SQLite, sync, accounting, and inventory.'}
            </p>
          </div>
          <span className="text-xs font-bold font-mono text-emerald-400 bg-emerald-950 px-2.5 py-1 rounded-lg border border-emerald-800">
            6 / 6 Accepted
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {adrs.map((adr) => (
            <div
              key={adr.id}
              className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-extrabold text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  {adr.id}
                </span>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800 uppercase">
                  {adr.status}
                </span>
              </div>
              <h4 className="font-bold text-sm text-slate-100">
                {lang === 'ar' ? adr.titleAr : adr.titleEn}
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                {lang === 'ar' ? adr.rationaleAr : adr.rationaleEn}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 5 Domain Clarifications & Business Questions */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="font-extrabold text-base sm:text-lg text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-amber-400" />
              <span>{lang === 'ar' ? 'الأسئلة التوضيحية للأعمال وحلولها المعتمدة' : 'Business Clarifications & Decisions'}</span>
            </h3>
            <p className="text-xs text-slate-400">
              {lang === 'ar'
                ? 'إجابات وتوصيات الأسئلة الخمسة المذكورة في وثيقة المعمارية'
                : 'Decisions answering the 5 domain questions outlined in the specification.'}
            </p>
          </div>
          <span className="text-xs text-slate-400">
            {lang === 'ar' ? 'قابلة للتخصيص' : 'Customizable'}
          </span>
        </div>

        <div className="space-y-4">
          {state.clarifications.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3 text-xs"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center shrink-0 text-xs border border-amber-500/30">
                    {item.id}
                  </span>
                  <div>
                    <h4 className="font-bold text-sm text-slate-100">
                      {lang === 'ar' ? item.question_ar : item.question}
                    </h4>
                    <span className="text-[11px] text-amber-400 font-medium uppercase">
                      Category: {item.category}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      item.status === 'confirmed'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    }`}
                  >
                    {item.status}
                  </span>
                  {editingClarificationId !== item.id && (
                    <button
                      onClick={() => handleStartEdit(item.id, item.proposed_answer)}
                      className="p-1 rounded text-slate-400 hover:text-amber-400 transition"
                      title="Edit decision"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Proposed Answer Box */}
              {editingClarificationId === item.id ? (
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <label className="block text-[11px] font-semibold text-slate-300">
                    {lang === 'ar' ? 'تعديل القرار المعتمد للورشة:' : 'Edit Approved Business Rule:'}
                  </label>
                  <textarea
                    rows={2}
                    value={tempAnswer}
                    onChange={(e) => setTempAnswer(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setEditingClarificationId(null)}
                      className="px-3 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold"
                    >
                      {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                    </button>
                    <button
                      onClick={() => handleSaveClarification(item.id)}
                      className="px-4 py-1 rounded-lg bg-amber-500 text-slate-950 text-xs font-bold transition flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{lang === 'ar' ? 'تأكيد واعتماد' : 'Confirm'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800/80 text-slate-300 leading-relaxed">
                  <span className="font-semibold text-amber-400 mr-1.5 rtl:ml-1.5 rtl:mr-0">
                    {lang === 'ar' ? 'القرار الهندسي المعتمد:' : 'Adopted Rule:'}
                  </span>
                  {item.proposed_answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
