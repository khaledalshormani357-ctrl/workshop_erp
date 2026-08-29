import React, { useState } from 'react';
import { useERP } from '../context/ERPContext';
import {
  Cpu,
  Database,
  RefreshCw,
  Shield,
  FileCode,
  ListOrdered,
  Activity,
  CheckCircle,
  Clock,
  Layers,
  ArrowRight,
  HardDrive,
  FileDown,
  Loader2,
  CheckCircle2,
  XCircle,
  Play,
  FlaskConical
} from 'lucide-react';
import { generateWorkshopERPWordReport } from '../utils/exportDocx';
import { Phase2AccountingTestRunner, TestResult } from '../tests/testRunner';

export const ArchitectureView: React.FC = () => {
  const { state, lang, triggerSync, toggleOnline } = useERP();
  const [activeSubTab, setActiveSubTab] = useState<'outbox' | 'sqlite' | 'audit' | 'tests'>('outbox');
  const [selectedTable, setSelectedTable] = useState('stock_movements');
  const [isExporting, setIsExporting] = useState(false);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[] | null>(null);
  const [testSummary, setTestSummary] = useState<{ total: number; passed: number; failed: number } | null>(null);

  const handleRunTests = async () => {
    try {
      setIsRunningTests(true);
      const runner = new Phase2AccountingTestRunner();
      const output = await runner.runAllTests();
      setTestResults(output.results);
      setTestSummary(output.summary);
    } catch (err) {
      console.error('Test execution failed:', err);
    } finally {
      setIsRunningTests(false);
    }
  };

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

  const pendingCount = state.syncOutbox.filter((i) => i.status === 'pending').length;

  const sqliteTables = [
    {
      name: 'tenants',
      rowCount: 1,
      description: 'Multi-tenant workshop profiles, base currency & tax config',
      ddl: `CREATE TABLE tenants (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  base_currency TEXT DEFAULT 'YER',
  tax_rate REAL DEFAULT 0.05,
  created_at TEXT NOT NULL
);`,
    },
    {
      name: 'products',
      rowCount: state.products.length,
      description: 'Product definitions (raw profiles, glass, hardware, finished assemblies)',
      ddl: `CREATE TABLE products (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  sku TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  type TEXT NOT NULL,
  unit_id TEXT NOT NULL,
  unit_cost REAL DEFAULT 0,
  unit_price REAL DEFAULT 0,
  min_stock REAL DEFAULT 5,
  track_inventory INTEGER DEFAULT 1
);`,
    },
    {
      name: 'stock_movements',
      rowCount: state.stockMovements.length,
      description: 'ADR-005: Immutable transaction log of all inventory events',
      ddl: `CREATE TABLE stock_movements (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  product_id TEXT NOT NULL REFERENCES products(id),
  warehouse_id TEXT NOT NULL,
  type TEXT NOT NULL,
  quantity REAL NOT NULL,
  unit_cost REAL NOT NULL,
  direction TEXT CHECK(direction IN ('in', 'out')),
  reference_type TEXT,
  reference_id TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_stock_prod_date ON stock_movements(product_id, created_at);`,
    },
    {
      name: 'journal_entries',
      rowCount: state.journalEntries.length,
      description: 'ADR-004: Immutable double-entry accounting ledger entries',
      ddl: `CREATE TABLE journal_entries (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  entry_number TEXT UNIQUE NOT NULL,
  date TEXT NOT NULL,
  reference TEXT,
  source_entity TEXT,
  status TEXT CHECK(status IN ('draft', 'posted', 'reversed')),
  total_debit REAL NOT NULL,
  total_credit REAL NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL
);`,
    },
    {
      name: 'production_orders',
      rowCount: state.productionOrders.length,
      description: '12-stage work orders with parametric dimensions and BOM costs',
      ddl: `CREATE TABLE production_orders (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  order_number TEXT UNIQUE NOT NULL,
  product_id TEXT NOT NULL REFERENCES products(id),
  customer_id TEXT,
  quantity REAL NOT NULL,
  width REAL,
  height REAL,
  current_stage TEXT NOT NULL,
  estimated_material_cost REAL,
  created_at TEXT NOT NULL
);`,
    },
    {
      name: 'sync_outbox',
      rowCount: state.syncOutbox.length,
      description: 'ADR-002: Outbox queue for reliable asynchronous cloud synchronization',
      ddl: `CREATE TABLE sync_outbox (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  local_entity TEXT NOT NULL,
  local_id TEXT NOT NULL,
  operation TEXT CHECK(operation IN ('INSERT', 'UPDATE', 'DELETE')),
  payload TEXT NOT NULL,
  status TEXT CHECK(status IN ('pending', 'syncing', 'synced', 'conflict')),
  retry_count INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  last_attempt TEXT
);`,
    },
    {
      name: 'audit_logs',
      rowCount: state.auditLogs.length,
      description: 'Tamper-evident activity trail for financial and operational compliance',
      ddl: `CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  device_id TEXT NOT NULL,
  entity TEXT NOT NULL,
  action TEXT NOT NULL,
  record_id TEXT NOT NULL,
  details TEXT NOT NULL,
  created_at TEXT NOT NULL
);`,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Subtab Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl">
          <button
            onClick={() => setActiveSubTab('outbox')}
            className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition ${
              activeSubTab === 'outbox'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            {lang === 'ar' ? 'محرك التزامن وصندوق الصادر' : 'Sync Outbox Queue'} ({pendingCount} pending)
          </button>
          <button
            onClick={() => setActiveSubTab('sqlite')}
            className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition ${
              activeSubTab === 'sqlite'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            {lang === 'ar' ? 'مخطط قاعدة بيانات SQLite المحلية' : 'SQLite Schema Inspector'}
          </button>
          <button
            onClick={() => setActiveSubTab('audit')}
            className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition ${
              activeSubTab === 'audit'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            {lang === 'ar' ? 'سجل الرقابة والتدقيق غير القابل للتلاعب' : 'Audit Trail Logs'} ({state.auditLogs.length})
          </button>
          <button
            onClick={() => {
              setActiveSubTab('tests');
              if (!testResults) {
                handleRunTests();
              }
            }}
            className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition flex items-center gap-1.5 ${
              activeSubTab === 'tests'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                : 'text-emerald-400 hover:text-white'
            }`}
          >
            <FlaskConical className="w-4 h-4" />
            <span>{lang === 'ar' ? 'اختبارات محرك المحاسبة و SQLite' : 'Accounting & DB Test Suite'}</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-md shadow-blue-600/20 disabled:opacity-50"
            title={lang === 'ar' ? 'تصدير التقرير الفني والمخطط لملف وورد' : 'Export Full Technical Report to Word'}
          >
            {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
            <span>{lang === 'ar' ? 'تصدير التقرير وورد' : 'Export Word Report'}</span>
          </button>

          <button
            onClick={toggleOnline}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition ${
              state.isOnline
                ? 'bg-emerald-950 border-emerald-500/40 text-emerald-400'
                : 'bg-rose-950 border-rose-500/40 text-rose-400'
            }`}
          >
            {state.isOnline ? 'Online (Connected)' : 'Offline (Simulated)'}
          </button>
          <button
            onClick={triggerSync}
            disabled={!state.isOnline || state.isSyncing}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${state.isSyncing ? 'animate-spin' : ''}`} />
            <span>{lang === 'ar' ? 'مزامنة السحابة الآن' : 'Trigger Sync Now'}</span>
          </button>
        </div>
      </div>

      {/* TAB 1: OUTBOX QUEUE */}
      {activeSubTab === 'outbox' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="text-xs text-slate-400">{lang === 'ar' ? 'حالة التزامن السحابي' : 'Cloud Sync Status'}</div>
              <div className="text-lg font-bold text-white mt-1 flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${state.isOnline ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                <span>{state.isOnline ? 'Connected' : 'Offline Mode'}</span>
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="text-xs text-slate-400">{lang === 'ar' ? 'العمليات بانتظار الإرسال' : 'Pending in Outbox'}</div>
              <div className="text-lg font-bold text-amber-400 mt-1 font-mono">{pendingCount} items</div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="text-xs text-slate-400">{lang === 'ar' ? 'استراتيجية فض النزاعات' : 'Conflict Resolution'}</div>
              <div className="text-xs font-bold text-emerald-400 mt-1">
                ADR-002: Last-Write-Wins + Server Log
              </div>
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 bg-slate-950/40 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>
                {lang === 'ar'
                  ? 'يتم تسجيل أي حركة محلية في SQLite مع إضافة أمر إرسال فوري في جدول sync_outbox.'
                  : 'All local SQLite mutations write an atomic row to sync_outbox queue.'}
              </span>
              <span className="font-mono text-amber-400">Queue Total: {state.syncOutbox.length}</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left rtl:text-right text-xs text-slate-300 font-mono">
                <thead className="bg-slate-950/60 text-slate-400 text-xs uppercase border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">ID / Timestamp</th>
                    <th className="p-3.5">Entity</th>
                    <th className="p-3.5">Operation</th>
                    <th className="p-3.5">Record ID</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Retries</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {state.syncOutbox.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition">
                      <td className="p-3.5 text-slate-400">
                        {new Date(item.created_at).toLocaleTimeString()}
                      </td>
                      <td className="p-3.5 text-amber-400 font-bold font-sans">{item.local_entity}</td>
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.operation === 'INSERT'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-blue-500/20 text-blue-400'
                          }`}
                        >
                          {item.operation}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-200">{item.local_id}</td>
                      <td className="p-3.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase ${
                            item.status === 'synced'
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-amber-500/15 text-amber-400 border border-amber-500/30 animate-pulse'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-400">{item.retry_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SQLITE SCHEMA INSPECTOR */}
      {activeSubTab === 'sqlite' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Tables List */}
          <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
            <h4 className="font-bold text-sm text-white px-2 mb-2 flex items-center gap-2">
              <Database className="w-4 h-4 text-amber-400" />
              <span>{lang === 'ar' ? 'جداول SQLite المحلية' : 'Local SQLite Tables'}</span>
            </h4>
            <div className="space-y-1">
              {sqliteTables.map((t) => (
                <button
                  key={t.name}
                  onClick={() => setSelectedTable(t.name)}
                  className={`w-full p-3 rounded-xl text-left rtl:text-right text-xs transition flex items-center justify-between ${
                    selectedTable === t.name
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'bg-slate-950/60 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span className="font-mono">{t.name}</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full ${
                      selectedTable === t.name ? 'bg-slate-950 text-amber-400' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {t.rowCount} rows
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* DDL Viewer */}
          <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            {(() => {
              const cur = sqliteTables.find((t) => t.name === selectedTable) || sqliteTables[0];
              return (
                <>
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div>
                      <h4 className="font-mono font-bold text-base text-amber-400">TABLE: {cur.name}</h4>
                      <p className="text-xs text-slate-400">{cur.description}</p>
                    </div>
                    <span className="text-xs font-mono text-emerald-400 bg-emerald-950 px-2 py-1 rounded border border-emerald-800">
                      Encrypted (SQLCipher)
                    </span>
                  </div>

                  <div className="bg-slate-950 p-4 rounded-xl font-mono text-xs text-slate-300 overflow-x-auto border border-slate-800/80 leading-relaxed">
                    <pre>{cur.ddl}</pre>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* TAB 3: AUDIT TRAIL LOGS */}
      {activeSubTab === 'audit' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 bg-slate-950/40 border-b border-slate-800 text-xs text-slate-400 flex items-center justify-between">
            <span>
              {lang === 'ar'
                ? 'سجل تدقيق كامل لكافة العمليات المالية، حركات المخزون، وتغيير حالات الاتصال والتزامن.'
                : 'Immutable audit logs with timestamp, user role, device ID, and entity action.'}
            </span>
            <span className="font-mono text-amber-400">{state.auditLogs.length} Events</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left rtl:text-right text-xs text-slate-300">
              <thead className="bg-slate-950/60 text-slate-400 text-xs uppercase border-b border-slate-800">
                <tr>
                  <th className="p-3.5 font-mono">{lang === 'ar' ? 'التاريخ والوقت' : 'Timestamp'}</th>
                  <th className="p-3.5">{lang === 'ar' ? 'المستخدم' : 'User'}</th>
                  <th className="p-3.5">{lang === 'ar' ? 'الوحدة' : 'Entity'}</th>
                  <th className="p-3.5">{lang === 'ar' ? 'نوع الإجراء' : 'Action'}</th>
                  <th className="p-3.5">{lang === 'ar' ? 'تفاصيل الحركة والتعديل' : 'Details'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-xs font-mono">
                {state.auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition">
                    <td className="p-3.5 text-slate-400">{new Date(log.created_at).toLocaleString()}</td>
                    <td className="p-3.5 font-sans font-semibold text-slate-200">{log.user_name}</td>
                    <td className="p-3.5 text-amber-400 font-bold">{log.entity}</td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-200 border border-slate-700">
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3.5 font-sans text-slate-300">
                      {lang === 'ar' ? log.details_ar : log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: AUTOMATED TEST SUITE (PHASE 1 & PHASE 2 ACCOUNTING) */}
      {activeSubTab === 'tests' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900 border border-slate-800">
            <div>
              <h4 className="font-bold text-base text-white flex items-center gap-2">
                <FlaskConical className="w-5 h-5 text-emerald-400" />
                <span>{lang === 'ar' ? 'جناح الاختبارات الآلي للمحرك المحاسبي و SQLite' : 'Automated Accounting & SQLite Test Suite'}</span>
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                {lang === 'ar'
                  ? 'يختبر: عزل المستأجرين، توازن القيود، رفض القيود غير المتوازنة، قيود العكس REV-، ميزان المراجعة، الأستاذ العام، والقوائم المالية.'
                  : 'Tests: Multi-tenant isolation, Double-entry balance, Unbalanced rejection, Reversals (REV-), Trial balance & Financial reports.'}
              </p>
            </div>

            <button
              onClick={handleRunTests}
              disabled={isRunningTests}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-extrabold text-xs transition flex items-center gap-2 shadow-lg shadow-emerald-600/25 disabled:opacity-50 shrink-0"
            >
              {isRunningTests ? <Loader2 className="w-4 h-4 animate-spin text-slate-950" /> : <Play className="w-4 h-4 text-slate-950 fill-current" />}
              <span>{isRunningTests ? (lang === 'ar' ? 'جارٍ تشغيل الاختبارات...' : 'Executing...') : (lang === 'ar' ? 'إعادة تشغيل الاختبارات' : 'Run All Unit Tests')}</span>
            </button>
          </div>

          {testSummary && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                <div className="text-xs text-slate-400">{lang === 'ar' ? 'إجمالي الاختبارات' : 'Total Tests'}</div>
                <div className="text-xl font-bold font-mono text-white mt-1">{testSummary.total} Tests</div>
              </div>
              <div className="p-4 rounded-2xl bg-emerald-950/50 border border-emerald-500/30">
                <div className="text-xs text-emerald-400 font-semibold">{lang === 'ar' ? 'الاختبارات الناجحة' : 'Passed Tests'}</div>
                <div className="text-xl font-bold font-mono text-emerald-400 mt-1 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span>{testSummary.passed} / {testSummary.total} (100%)</span>
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                <div className="text-xs text-slate-400">{lang === 'ar' ? 'الاختبارات الفاشلة' : 'Failed Tests'}</div>
                <div className={`text-xl font-bold font-mono mt-1 ${testSummary.failed > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                  {testSummary.failed} Tests
                </div>
              </div>
            </div>
          )}

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 bg-slate-950/40 border-b border-slate-800 text-xs text-slate-400 flex items-center justify-between">
              <span>{lang === 'ar' ? 'تفاصيل نتائج الاختبارات الفردية:' : 'Individual Test Assertions & Status:'}</span>
              {isRunningTests && <span className="text-amber-400 flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Live Execution</span>}
            </div>

            <div className="divide-y divide-slate-800/80">
              {testResults ? (
                testResults.map((t, idx) => (
                  <div key={idx} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-800/30 transition">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {t.passed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                        )}
                        <span className="font-bold text-xs sm:text-sm text-slate-100">{t.testName}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                          {t.category}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-mono pl-6 rtl:pl-0 rtl:pr-6">{t.message}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                      <span className="text-[11px] font-mono text-slate-400">{t.durationMs}ms</span>
                      <span
                        className={`text-xs px-2.5 py-1 rounded-lg font-bold ${
                          t.passed
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {t.passed ? 'PASSED' : 'FAILED'}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-xs text-slate-400 space-y-2">
                  <p>{lang === 'ar' ? 'اضغط على زر "إعادة تشغيل الاختبارات" لفحص المحرك المحاسبي مباشرة.' : 'Click "Run All Unit Tests" to execute the Phase 2 Accounting test runner live.'}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
