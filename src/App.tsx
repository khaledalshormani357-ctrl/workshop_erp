import React, { Suspense, lazy, useState } from 'react';
import { ERPProvider, useERP } from './context/ERPContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { MobileBottomNav } from './components/MobileBottomNav';

// Lazy-loaded top-level view components
const DashboardView = lazy(() => import('./components/DashboardView').then(m => ({ default: m.DashboardView })));
const CustomersView = lazy(() => import('./components/CustomersView').then(m => ({ default: m.CustomersView })));
const SuppliersView = lazy(() => import('./components/SuppliersView').then(m => ({ default: m.SuppliersView })));
const ProductsView = lazy(() => import('./components/ProductsView').then(m => ({ default: m.ProductsView })));
const InventoryView = lazy(() => import('./components/InventoryView').then(m => ({ default: m.InventoryView })));
const OperationsView = lazy(() => import('./components/OperationsView').then(m => ({ default: m.OperationsView })));
const PurchasesView = lazy(() => import('./components/PurchasesView').then(m => ({ default: m.PurchasesView })));
const QuotationsView = lazy(() => import('./components/QuotationsView').then(m => ({ default: m.QuotationsView })));
const ProjectsView = lazy(() => import('./components/ProjectsView').then(m => ({ default: m.ProjectsView })));
const MeasurementsView = lazy(() => import('./components/MeasurementsView').then(m => ({ default: m.MeasurementsView })));
const ManufacturingView = lazy(() => import('./components/ManufacturingView').then(m => ({ default: m.ManufacturingView })));
const AccountingView = lazy(() => import('./components/AccountingView').then(m => ({ default: m.AccountingView })));
const ReportsView = lazy(() => import('./components/ReportsView').then(m => ({ default: m.ReportsView })));
const ArchitectureView = lazy(() => import('./components/ArchitectureView').then(m => ({ default: m.ArchitectureView })));
const ReviewGateView = lazy(() => import('./components/ReviewGateView').then(m => ({ default: m.ReviewGateView })));
const SettingsView = lazy(() => import('./components/SettingsView').then(m => ({ default: m.SettingsView })));

const ViewLoadingFallback: React.FC = () => (
  <div className="flex items-center justify-center min-h-[400px] w-full">
    <div className="flex flex-col items-center gap-3">
      <div className="w-9 h-9 border-3 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
      <span className="text-xs text-slate-400 font-bold">جاري تحميل البيانات...</span>
    </div>
  </div>
);

const MainLayout: React.FC = () => {
  const { activeTab } = useERP();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      <Header onToggleMobileMenu={() => setMobileNavOpen((prev) => !prev)} />
      <div className="flex-1 flex flex-col md:flex-row">
        <Sidebar mobileOpen={mobileNavOpen} onCloseMobile={() => setMobileNavOpen(false)} />
        <main className="flex-1 p-3 sm:p-5 md:p-7 max-w-7xl w-full mx-auto overflow-x-hidden pb-20 md:pb-8">
          <Suspense fallback={<ViewLoadingFallback />}>
            {activeTab === 'dashboard' && <DashboardView />}
            {activeTab === 'customers' && <CustomersView />}
            {activeTab === 'suppliers' && <SuppliersView />}
            {activeTab === 'products' && <ProductsView />}
            {activeTab === 'inventory' && <InventoryView />}
            {(activeTab === 'sales' || activeTab === 'operations') && <OperationsView />}
            {activeTab === 'purchases' && <PurchasesView />}
            {activeTab === 'quotations' && <QuotationsView />}
            {activeTab === 'projects' && <ProjectsView />}
            {activeTab === 'measurements' && <MeasurementsView />}
            {activeTab === 'manufacturing' && <ManufacturingView />}
            {activeTab === 'accounting' && <AccountingView />}
            {activeTab === 'reports' && <ReportsView />}
            {activeTab === 'sync_architecture' && <ArchitectureView />}
            {activeTab === 'review_gate' && <ReviewGateView />}
            {activeTab === 'settings' && <SettingsView />}
          </Suspense>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav onOpenMobileMenu={() => setMobileNavOpen(true)} />
    </div>
  );
};

export default function App() {
  return (
    <ERPProvider>
      <MainLayout />
    </ERPProvider>
  );
}
