import {
  Tenant,
  User,
  Customer,
  Supplier,
  Product,
  Category,
  Unit,
  Warehouse,
  StockMovement,
  Quotation,
  SalesInvoice,
  PurchaseOrder,
  BillOfMaterials,
  ProductionOrder,
  Account,
  JournalEntry,
  CashBankAccount,
  AuditLog,
  SyncOutboxItem,
  ClarificationAnswer,
  Project,
  MeasurementRecord,
} from '../types';

import {
  initialTenant,
  initialUsers,
  initialCustomers,
  initialSuppliers,
  initialCategories,
  initialUnits,
  initialWarehouses,
  initialProducts,
  initialStockMovements,
  initialQuotations,
  initialSalesInvoices,
  initialBOMs,
  initialProductionOrders,
  initialChartOfAccounts,
  initialCashBankAccounts,
  initialJournalEntries,
  initialSyncOutbox,
  initialAuditLogs,
  initialClarifications,
  initialProjects,
  initialMeasurements,
} from './seedData';

const STORAGE_PREFIX = 'workshop_erp_phase0_';

export interface AppState {
  tenant: Tenant;
  users: User[];
  currentUser: User;
  customers: Customer[];
  suppliers: Supplier[];
  categories: Category[];
  units: Unit[];
  warehouses: Warehouse[];
  products: Product[];
  stockMovements: StockMovement[];
  quotations: Quotation[];
  salesInvoices: SalesInvoice[];
  purchaseOrders: PurchaseOrder[];
  projects: Project[];
  measurements: MeasurementRecord[];
  boms: BillOfMaterials[];
  productionOrders: ProductionOrder[];
  accounts: Account[];
  journalEntries: JournalEntry[];
  cashBankAccounts: CashBankAccount[];
  auditLogs: AuditLog[];
  syncOutbox: SyncOutboxItem[];
  clarifications: ClarificationAnswer[];
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncedAt?: string;
  isReviewGateApproved: boolean;
}

export class StorageService {
  static loadInitialState(): AppState {
    try {
      const saved = localStorage.getItem(`${STORAGE_PREFIX}state`);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...parsed,
          projects: parsed.projects || initialProjects,
          measurements: parsed.measurements || initialMeasurements,
          purchaseOrders: parsed.purchaseOrders || [],
          isOnline: true,
          isSyncing: false,
        };
      }
    } catch (e) {
      console.warn('Could not parse saved ERP state from localStorage:', e);
    }

    return {
      tenant: initialTenant,
      users: initialUsers,
      currentUser: initialUsers[0],
      customers: initialCustomers,
      suppliers: initialSuppliers,
      categories: initialCategories,
      units: initialUnits,
      warehouses: initialWarehouses,
      products: initialProducts,
      stockMovements: initialStockMovements,
      quotations: initialQuotations,
      salesInvoices: initialSalesInvoices,
      purchaseOrders: [],
      projects: initialProjects,
      measurements: initialMeasurements,
      boms: initialBOMs,
      productionOrders: initialProductionOrders,
      accounts: initialChartOfAccounts,
      journalEntries: initialJournalEntries,
      cashBankAccounts: initialCashBankAccounts,
      auditLogs: initialAuditLogs,
      syncOutbox: initialSyncOutbox,
      clarifications: initialClarifications,
      isOnline: true,
      isSyncing: false,
      lastSyncedAt: new Date().toISOString(),
      isReviewGateApproved: false,
    };
  }

  static saveState(state: AppState): void {
    try {
      localStorage.setItem(`${STORAGE_PREFIX}state`, JSON.stringify(state));
    } catch (e) {
      console.error('Failed to save ERP state to localStorage:', e);
    }
  }

  static resetToDefault(): AppState {
    localStorage.removeItem(`${STORAGE_PREFIX}state`);
    return this.loadInitialState();
  }

  static exportBackup(state: AppState): string {
    const backupData = {
      version: '1.0.0',
      format: 'WorkshopERP_Backup_v1',
      tenantId: state.tenant.id,
      timestamp: new Date().toISOString(),
      checksum: 'sha256-simulated-encrypted-db-payload',
      data: state,
    };
    return JSON.stringify(backupData, null, 2);
  }
}
