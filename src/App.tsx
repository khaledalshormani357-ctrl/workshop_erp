import React from 'react';
import { ERPProvider, useERP } from './context/ERPContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { OperationsView } from './components/OperationsView';
import { InventoryView } from './components/InventoryView';
import { AccountingView } from './components/AccountingView';
import { ManufacturingView } from './components/ManufacturingView';
import { ArchitectureView } from './components/ArchitectureView';
import { ReviewGateView } from './components/ReviewGateView';
import { SettingsView } from './components/SettingsView';

const MainLayout: React.FC = () => {
  const { activeTab } = useERP();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      <Header />
      <div className="flex-1 flex flex-col md:flex-row">
        <Sidebar />
        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto overflow-x-hidden">
          {activeTab === 'dashboard' && <DashboardView />}
          {activeTab === 'operations' && <OperationsView />}
          {activeTab === 'inventory' && <InventoryView />}
          {activeTab === 'accounting' && <AccountingView />}
          {activeTab === 'manufacturing' && <ManufacturingView />}
          {activeTab === 'sync_architecture' && <ArchitectureView />}
          {activeTab === 'review_gate' && <ReviewGateView />}
          {activeTab === 'settings' && <SettingsView />}
        </main>
      </div>
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
