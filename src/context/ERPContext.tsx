import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  Language,
  User,
  UserRole,
  Tenant,
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
  PurchaseOrderLine,
  BillOfMaterials,
  ProductionOrder,
  ProductionStage,
  Account,
  JournalEntry,
  JournalEntryLine,
  CashBankAccount,
  AuditLog,
  SyncOutboxItem,
  ClarificationAnswer,
  Project,
  MeasurementRecord,
} from '../types';

import { AppState, StorageService } from '../services/storageService';
import { AccountingEngine } from '../services/accountingEngine';
import { BOMEngine } from '../services/bomEngine';

export type ActiveTab =
  | 'dashboard'
  | 'customers'
  | 'suppliers'
  | 'products'
  | 'inventory'
  | 'sales'
  | 'purchases'
  | 'quotations'
  | 'projects'
  | 'measurements'
  | 'manufacturing'
  | 'accounting'
  | 'reports'
  | 'settings'
  | 'operations'
  | 'sync_architecture'
  | 'review_gate';

interface ERPContextType {
  state: AppState;
  lang: Language;
  setLang: (lang: Language) => void;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  currentUser: User;
  setCurrentUserRole: (role: UserRole) => void;
  toggleOnline: () => void;
  triggerSync: () => Promise<void>;
  
  // Business Actions (Atomic with Audit + Outbox + Accounting)
  createCustomer: (customer: Omit<Customer, 'id' | 'created_at'>) => void;
  createSupplier: (supplier: Omit<Supplier, 'id' | 'created_at'>) => void;
  createProduct: (product: Omit<Product, 'id'>) => void;
  createSalesInvoice: (invoice: Omit<SalesInvoice, 'id' | 'created_at' | 'status' | 'invoice_number'>) => void;
  createPurchaseOrder: (po: Omit<PurchaseOrder, 'id' | 'created_at' | 'status' | 'po_number'>) => void;
  createProject: (project: Omit<Project, 'id' | 'created_at' | 'project_code'>) => void;
  createMeasurement: (meas: Omit<MeasurementRecord, 'id' | 'created_at' | 'tag_number' | 'status'>) => void;
  convertMeasurementToBOM: (measId: string) => void;
  createStockMovement: (movement: Omit<StockMovement, 'id' | 'created_at' | 'created_by'>) => void;
  updateProductionStage: (orderId: string, nextStage: ProductionStage, notes?: string) => void;
  createJournalEntry: (entry: { reference: string; date: string; lines: JournalEntryLine[]; notes?: string }) => { success: boolean; error?: string };
  reverseJournalEntry: (entryId: string, reason: string) => void;
  createQuotation: (quote: Omit<Quotation, 'id' | 'quote_number' | 'created_at'>) => void;
  convertQuotationToWorkOrder: (quoteId: string) => void;
  updateClarification: (id: number, answer: string, status: 'recommended' | 'confirmed' | 'customized') => void;
  approveReviewGate: () => void;
  resetAllData: () => void;
  exportDatabaseBackup: () => void;
}

const ERPContext = createContext<ERPContextType | undefined>(undefined);

export const ERPProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(() => StorageService.loadInitialState());
  const [lang, setLangState] = useState<Language>('ar');
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  // Sync state to local storage whenever it changes
  useEffect(() => {
    StorageService.saveState(state);
  }, [state]);

  // Set HTML dir attribute dynamically
  const setLang = (newLang: Language) => {
    setLangState(newLang);
    document.documentElement.lang = newLang;
    document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
  };

  const setCurrentUserRole = (role: UserRole) => {
    const foundUser = state.users.find((u) => u.role === role) || {
      id: `user-${role}`,
      tenant_id: state.tenant.id,
      name: `${role.toUpperCase()} User`,
      name_ar: `مستخدم ${role}`,
      email: `${role}@alandalus.com`,
      role,
      active: true,
    };
    setState((prev) => ({ ...prev, currentUser: foundUser }));
  };

  const toggleOnline = () => {
    setState((prev) => {
      const nextOnline = !prev.isOnline;
      const log: AuditLog = {
        id: `log-${Date.now()}`,
        tenant_id: prev.tenant.id,
        user_name: prev.currentUser.name,
        device_id: 'Android-Client-Node',
        entity: 'Network',
        action: 'UPDATE',
        record_id: 'Connectivity',
        details: `Toggled network connectivity: ${nextOnline ? 'ONLINE' : 'OFFLINE'}`,
        details_ar: `تم تبديل حالة الاتصال: ${nextOnline ? 'متصل' : 'غير متصل (أوفلاين)'}`,
        created_at: new Date().toISOString(),
      };
      return {
        ...prev,
        isOnline: nextOnline,
        auditLogs: [log, ...prev.auditLogs],
      };
    });
  };

  const triggerSync = async () => {
    if (!state.isOnline) return;

    setState((prev) => ({ ...prev, isSyncing: true }));

    // Simulate network delay and outbox flushing
    await new Promise((resolve) => setTimeout(resolve, 800));

    setState((prev) => {
      const updatedOutbox = prev.syncOutbox.map((item) => ({
        ...item,
        status: 'synced' as const,
        last_attempt: new Date().toISOString(),
      }));

      const syncAudit: AuditLog = {
        id: `log-sync-${Date.now()}`,
        tenant_id: prev.tenant.id,
        user_name: prev.currentUser.name,
        device_id: 'Android-Client-Node',
        entity: 'SyncEngine',
        action: 'SYNC',
        record_id: 'BatchSync',
        details: `Successfully synchronized ${updatedOutbox.length} local outbox events to remote Postgres/Supabase instance.`,
        details_ar: `تمت مزامنة ${updatedOutbox.length} عملية بنجاح مع الخادم السحابي.`,
        created_at: new Date().toISOString(),
      };

      return {
        ...prev,
        isSyncing: false,
        syncOutbox: updatedOutbox,
        lastSyncedAt: new Date().toISOString(),
        auditLogs: [syncAudit, ...prev.auditLogs],
      };
    });
  };

  // ATOMIC BUSINESS EVENT: Create Sales Invoice
  const createSalesInvoice = (
    invoiceData: Omit<SalesInvoice, 'id' | 'created_at' | 'status' | 'invoice_number'>
  ) => {
    const invId = `inv-${Date.now().toString().slice(-6)}`;
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(state.salesInvoices.length + 1).padStart(3, '0')}`;
    const now = new Date().toISOString();

    const newInvoice: SalesInvoice = {
      ...invoiceData,
      id: invId,
      invoice_number: invoiceNumber,
      status: 'posted',
      created_at: now,
    };

    // 1. Immutable Stock Movements for each line
    const movements: StockMovement[] = invoiceData.lines.map((line, idx) => {
      const prod = state.products.find((p) => p.id === line.product_id);
      return {
        id: `sm-inv-${Date.now()}-${idx}`,
        tenant_id: state.tenant.id,
        product_id: line.product_id,
        warehouse_id: invoiceData.warehouse_id,
        type: 'sale_delivery',
        quantity: line.quantity,
        unit_cost: prod ? prod.unit_cost : 0,
        direction: 'out',
        reference_type: 'invoice',
        reference_id: invoiceNumber,
        notes: `Auto stock delivery for sales invoice ${invoiceNumber}`,
        created_by: state.currentUser.name,
        created_at: now,
      };
    });

    // 2. Double-Entry Balanced Journal Entry
    // Debit: Accounts Receivable (Total amount)
    // Credit: Sales Revenue (Subtotal)
    // Credit: Sales Tax Payable (Tax amount)
    // Debit: Cost of Goods Sold (COGS)
    // Credit: Finished Goods / Inventory
    const totalCogs = invoiceData.lines.reduce((sum, line) => {
      const prod = state.products.find((p) => p.id === line.product_id);
      return sum + line.quantity * (prod ? prod.unit_cost : 0);
    }, 0);

    const journalLines: JournalEntryLine[] = [
      {
        id: `jel-${Date.now()}-1`,
        account_id: 'acc-1130',
        account_code: '1130',
        account_name: 'Accounts Receivable (Trade Debtors)',
        description: `Customer credit invoice ${invoiceNumber}`,
        debit: invoiceData.total_amount,
        credit: 0,
      },
      {
        id: `jel-${Date.now()}-2`,
        account_id: 'acc-4110',
        account_code: '4110',
        account_name: 'Aluminium Fabrication Sales Revenue',
        description: `Sales revenue for ${invoiceNumber}`,
        debit: 0,
        credit: invoiceData.subtotal,
      },
    ];

    if (invoiceData.tax_amount > 0) {
      journalLines.push({
        id: `jel-${Date.now()}-3`,
        account_id: 'acc-2130',
        account_code: '2130',
        account_name: 'Sales Tax Payable',
        description: `Tax on invoice ${invoiceNumber}`,
        debit: 0,
        credit: invoiceData.tax_amount,
      });
    }

    if (totalCogs > 0) {
      journalLines.push(
        {
          id: `jel-${Date.now()}-4`,
          account_id: 'acc-5110',
          account_code: '5110',
          account_name: 'Cost of Goods Sold (COGS)',
          description: `COGS recognized for ${invoiceNumber}`,
          debit: totalCogs,
          credit: 0,
        },
        {
          id: `jel-${Date.now()}-5`,
          account_id: 'acc-1143',
          account_code: '1143',
          account_name: 'Inventory - Finished Goods',
          description: `Inventory reduction for ${invoiceNumber}`,
          debit: 0,
          credit: totalCogs,
        }
      );
    }

    const totalDebits = journalLines.reduce((s, l) => s + l.debit, 0);
    const totalCredits = journalLines.reduce((s, l) => s + l.credit, 0);

    const journalEntry: JournalEntry = {
      id: `je-inv-${Date.now()}`,
      tenant_id: state.tenant.id,
      entry_number: `JV-${new Date().getFullYear()}-${String(state.journalEntries.length + 1).padStart(3, '0')}`,
      date: invoiceData.date,
      reference: invoiceNumber,
      source_entity: 'sales_invoice',
      source_id: invId,
      status: 'posted',
      created_by: state.currentUser.name,
      created_at: now,
      lines: journalLines,
      total_debit: totalDebits,
      total_credit: totalCredits,
    };

    // 3. Update Customer Balance
    const updatedCustomers = state.customers.map((c) => {
      if (c.id === invoiceData.customer_id) {
        return {
          ...c,
          current_balance: c.current_balance + invoiceData.total_amount,
        };
      }
      return c;
    });

    // 4. Audit Log
    const auditLog: AuditLog = {
      id: `log-${Date.now()}`,
      tenant_id: state.tenant.id,
      user_name: state.currentUser.name,
      device_id: 'Android-Device-01',
      entity: 'SalesInvoice',
      action: 'POST',
      record_id: invoiceNumber,
      details: `Created invoice ${invoiceNumber} total ${invoiceData.total_amount} YER with ${movements.length} stock movements and balanced journal entry.`,
      details_ar: `إنشاء وترحيل فاتورة المبيعات ${invoiceNumber} بمبلغ ${invoiceData.total_amount} ر.ي مع إنشاء حركات مخزنية وقيد محاسبي متزن.`,
      created_at: now,
    };

    // 5. Sync Outbox Item
    const outboxItem: SyncOutboxItem = {
      id: `outbox-${Date.now()}`,
      tenant_id: state.tenant.id,
      local_entity: 'sales_invoices',
      local_id: invId,
      operation: 'INSERT',
      payload: newInvoice,
      status: state.isOnline ? 'synced' : 'pending',
      retry_count: 0,
      created_at: now,
      last_attempt: state.isOnline ? now : undefined,
    };

    setState((prev) => ({
      ...prev,
      salesInvoices: [newInvoice, ...prev.salesInvoices],
      stockMovements: [...movements, ...prev.stockMovements],
      journalEntries: [journalEntry, ...prev.journalEntries],
      customers: updatedCustomers,
      auditLogs: [auditLog, ...prev.auditLogs],
      syncOutbox: [outboxItem, ...prev.syncOutbox],
    }));
  };

  // Create Stock Movement (Adjustment / Transfer / Receipt)
  const createStockMovement = (
    movementData: Omit<StockMovement, 'id' | 'created_at' | 'created_by'>
  ) => {
    const now = new Date().toISOString();
    const movId = `sm-${Date.now()}`;
    const newMovement: StockMovement = {
      ...movementData,
      id: movId,
      created_by: state.currentUser.name,
      created_at: now,
    };

    const auditLog: AuditLog = {
      id: `log-${Date.now()}`,
      tenant_id: state.tenant.id,
      user_name: state.currentUser.name,
      device_id: 'Android-Client',
      entity: 'StockMovement',
      action: 'CREATE',
      record_id: movId,
      details: `Stock ${movementData.direction.toUpperCase()} ${movementData.quantity} units for product ${movementData.product_id} (${movementData.type})`,
      details_ar: `حركة مخزنية ${movementData.direction === 'in' ? 'وارد' : 'صادر'} بعدد ${movementData.quantity} وحدة للصنف (${movementData.type})`,
      created_at: now,
    };

    const outboxItem: SyncOutboxItem = {
      id: `outbox-${Date.now()}`,
      tenant_id: state.tenant.id,
      local_entity: 'stock_movements',
      local_id: movId,
      operation: 'INSERT',
      payload: newMovement,
      status: state.isOnline ? 'synced' : 'pending',
      retry_count: 0,
      created_at: now,
    };

    setState((prev) => ({
      ...prev,
      stockMovements: [newMovement, ...prev.stockMovements],
      auditLogs: [auditLog, ...prev.auditLogs],
      syncOutbox: [outboxItem, ...prev.syncOutbox],
    }));
  };

  // Advance Production Stage
  const updateProductionStage = (orderId: string, nextStage: ProductionStage, notes?: string) => {
    const now = new Date().toISOString();
    setState((prev) => {
      const order = prev.productionOrders.find((o) => o.id === orderId);
      if (!order) return prev;

      const updatedOrders = prev.productionOrders.map((o) => {
        if (o.id === orderId) {
          const updatedHistory = [
            ...o.stages_history.map((h, i) =>
              i === o.stages_history.length - 1 ? { ...h, completed_at: now } : h
            ),
            {
              stage: nextStage,
              entered_at: now,
              responsible_employee: prev.currentUser.name,
              notes,
            },
          ];

          return {
            ...o,
            current_stage: nextStage,
            stages_history: updatedHistory,
          };
        }
        return o;
      });

      const audit: AuditLog = {
        id: `log-${Date.now()}`,
        tenant_id: prev.tenant.id,
        user_name: prev.currentUser.name,
        device_id: 'Android-Terminal-Production',
        entity: 'ProductionOrder',
        action: 'UPDATE',
        record_id: order.order_number,
        details: `Advanced production order ${order.order_number} to stage: ${nextStage.toUpperCase()}`,
        details_ar: `ترقية أمر التصنيع ${order.order_number} إلى مرحلة: ${nextStage}`,
        created_at: now,
      };

      const outbox: SyncOutboxItem = {
        id: `outbox-${Date.now()}`,
        tenant_id: prev.tenant.id,
        local_entity: 'production_orders',
        local_id: orderId,
        operation: 'UPDATE',
        payload: { orderId, nextStage },
        status: prev.isOnline ? 'synced' : 'pending',
        retry_count: 0,
        created_at: now,
      };

      return {
        ...prev,
        productionOrders: updatedOrders,
        auditLogs: [audit, ...prev.auditLogs],
        syncOutbox: [outbox, ...prev.syncOutbox],
      };
    });
  };

  // Create Custom Journal Entry with Double-Entry Balance check
  const createJournalEntry = (entryData: {
    reference: string;
    date: string;
    lines: JournalEntryLine[];
    notes?: string;
  }): { success: boolean; error?: string } => {
    const { isValid, difference } = AccountingEngine.validateJournalBalance(entryData.lines);
    if (!isValid) {
      return {
        success: false,
        error: `Journal entry is out of balance by ${difference.toLocaleString()} YER. Debits must equal Credits.`,
      };
    }

    const now = new Date().toISOString();
    const entryNumber = `JV-${new Date().getFullYear()}-${String(state.journalEntries.length + 1).padStart(3, '0')}`;
    const totalDebit = entryData.lines.reduce((s, l) => s + Number(l.debit || 0), 0);
    const totalCredit = entryData.lines.reduce((s, l) => s + Number(l.credit || 0), 0);

    const newEntry: JournalEntry = {
      id: `je-manual-${Date.now()}`,
      tenant_id: state.tenant.id,
      entry_number: entryNumber,
      date: entryData.date,
      reference: entryData.reference,
      source_entity: 'manual',
      status: 'posted',
      created_by: state.currentUser.name,
      created_at: now,
      lines: entryData.lines,
      total_debit: totalDebit,
      total_credit: totalCredit,
    };

    const audit: AuditLog = {
      id: `log-${Date.now()}`,
      tenant_id: state.tenant.id,
      user_name: state.currentUser.name,
      device_id: 'Android-Tablet-Accountant',
      entity: 'JournalEntry',
      action: 'POST',
      record_id: entryNumber,
      details: `Posted balanced manual journal entry ${entryNumber} (Total: ${totalDebit} YER)`,
      details_ar: `ترحيل قيد يومية يدوي متزن ${entryNumber} (المجموع: ${totalDebit} ر.ي)`,
      created_at: now,
    };

    setState((prev) => ({
      ...prev,
      journalEntries: [newEntry, ...prev.journalEntries],
      auditLogs: [audit, ...prev.auditLogs],
    }));

    return { success: true };
  };

  // Reversal of Posted Journal Entry (Immutable accounting rule: ADR-004)
  const reverseJournalEntry = (entryId: string, reason: string) => {
    const entry = state.journalEntries.find((e) => e.id === entryId);
    if (!entry || entry.status !== 'posted') return;

    const now = new Date().toISOString();
    const revEntryNumber = `REV-${entry.entry_number}`;

    // Swap Debits and Credits
    const reversedLines: JournalEntryLine[] = entry.lines.map((line, idx) => ({
      id: `rev-jel-${Date.now()}-${idx}`,
      account_id: line.account_id,
      account_code: line.account_code,
      account_name: line.account_name,
      description: `Reversal of [${line.description}] - Reason: ${reason}`,
      debit: line.credit,
      credit: line.debit,
    }));

    const reversalEntry: JournalEntry = {
      id: `je-rev-${Date.now()}`,
      tenant_id: state.tenant.id,
      entry_number: revEntryNumber,
      date: new Date().toISOString().split('T')[0],
      reference: `Reversal of ${entry.entry_number}`,
      source_entity: 'manual',
      status: 'posted',
      created_by: state.currentUser.name,
      created_at: now,
      lines: reversedLines,
      total_debit: entry.total_credit,
      total_credit: entry.total_debit,
    };

    const updatedEntries = state.journalEntries.map((e) =>
      e.id === entryId ? { ...e, status: 'reversed' as const } : e
    );

    const audit: AuditLog = {
      id: `log-${Date.now()}`,
      tenant_id: state.tenant.id,
      user_name: state.currentUser.name,
      device_id: 'Android-Device',
      entity: 'JournalEntry',
      action: 'REVERSE',
      record_id: entry.entry_number,
      details: `Reversed journal entry ${entry.entry_number} with counter entry ${revEntryNumber}. Reason: ${reason}`,
      details_ar: `عكس قيد اليومية ${entry.entry_number} بالقيد العكسي ${revEntryNumber}. السبب: ${reason}`,
      created_at: now,
    };

    setState((prev) => ({
      ...prev,
      journalEntries: [reversalEntry, ...updatedEntries],
      auditLogs: [audit, ...prev.auditLogs],
    }));
  };

  const createQuotation = (
    quoteData: Omit<Quotation, 'id' | 'quote_number' | 'created_at'>
  ) => {
    const quoteNumber = `QT-${new Date().getFullYear()}-${String(state.quotations.length + 1).padStart(3, '0')}`;
    const newQuote: Quotation = {
      ...quoteData,
      id: `qt-${Date.now()}`,
      quote_number: quoteNumber,
      created_at: new Date().toISOString(),
    };

    const audit: AuditLog = {
      id: `log-${Date.now()}`,
      tenant_id: state.tenant.id,
      user_name: state.currentUser.name,
      device_id: 'Android-Device',
      entity: 'Quotation',
      action: 'CREATE',
      record_id: quoteNumber,
      details: `Created quotation ${quoteNumber} total ${quoteData.total_amount} YER`,
      details_ar: `إنشاء عرض سعر رقم ${quoteNumber} بمبلغ إجمالي ${quoteData.total_amount} ر.ي`,
      created_at: new Date().toISOString(),
    };

    setState((prev) => ({
      ...prev,
      quotations: [newQuote, ...prev.quotations],
      auditLogs: [audit, ...prev.auditLogs],
    }));
  };

  const convertQuotationToWorkOrder = (quoteId: string) => {
    const quote = state.quotations.find((q) => q.id === quoteId);
    if (!quote) return;

    const woNumber = `WO-${new Date().getFullYear()}-${String(state.productionOrders.length + 90).padStart(3, '0')}`;
    const firstItem = quote.items[0];

    const newOrder: ProductionOrder = {
      id: `wo-${Date.now()}`,
      tenant_id: state.tenant.id,
      order_number: woNumber,
      order_type: 'make-to-order',
      product_id: firstItem ? firstItem.product_id : 'p-fin-window-sliding-120',
      bom_id: 'bom-window-sliding-120',
      customer_id: quote.customer_id,
      quotation_id: quote.quote_number,
      quantity: firstItem ? firstItem.quantity : 1,
      dimensions: {
        width: firstItem?.width || 120,
        height: firstItem?.height || 120,
        color: 'White RAL 9016',
      },
      due_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      current_stage: 'approved',
      stages_history: [
        { stage: 'draft', entered_at: new Date().toISOString(), completed_at: new Date().toISOString() },
        { stage: 'approved', entered_at: new Date().toISOString(), responsible_employee: state.currentUser.name },
      ],
      estimated_material_cost: firstItem ? firstItem.estimated_cost * 0.75 : 100000,
      actual_material_cost: 0,
      estimated_labor_cost: 30000,
      actual_labor_cost: 0,
      estimated_overhead_cost: 15000,
      actual_overhead_cost: 0,
      created_at: new Date().toISOString(),
    };

    const updatedQuotations = state.quotations.map((q) =>
      q.id === quoteId ? { ...q, status: 'converted' as const } : q
    );

    const audit: AuditLog = {
      id: `log-${Date.now()}`,
      tenant_id: state.tenant.id,
      user_name: state.currentUser.name,
      device_id: 'Android-Device',
      entity: 'Quotation',
      action: 'UPDATE',
      record_id: quote.quote_number,
      details: `Converted quotation ${quote.quote_number} to Production Order ${woNumber}`,
      details_ar: `تحويل عرض السعر ${quote.quote_number} إلى أمر تصنيع وتشغيل ${woNumber}`,
      created_at: new Date().toISOString(),
    };

    setState((prev) => ({
      ...prev,
      quotations: updatedQuotations,
      productionOrders: [newOrder, ...prev.productionOrders],
      auditLogs: [audit, ...prev.auditLogs],
    }));
  };

  const updateClarification = (
    id: number,
    answer: string,
    status: 'recommended' | 'confirmed' | 'customized'
  ) => {
    setState((prev) => ({
      ...prev,
      clarifications: prev.clarifications.map((c) =>
        c.id === id ? { ...c, proposed_answer: answer, status } : c
      ),
    }));
  };

  const createCustomer = (customerData: Omit<Customer, 'id' | 'created_at'>) => {
    const newCust: Customer = {
      ...customerData,
      id: `cust-${Date.now().toString().slice(-6)}`,
      created_at: new Date().toISOString(),
    };
    const audit: AuditLog = {
      id: `log-${Date.now()}`,
      tenant_id: state.tenant.id,
      user_name: state.currentUser.name,
      device_id: 'Android-Device',
      entity: 'Customer',
      action: 'CREATE',
      record_id: newCust.id,
      details: `Created customer ${newCust.name} (${newCust.phone})`,
      details_ar: `إضافة عميل جديد ${newCust.name_ar || newCust.name} (${newCust.phone})`,
      created_at: new Date().toISOString(),
    };
    setState((prev) => ({
      ...prev,
      customers: [newCust, ...prev.customers],
      auditLogs: [audit, ...prev.auditLogs],
    }));
  };

  const createSupplier = (supplierData: Omit<Supplier, 'id' | 'created_at'>) => {
    const newSup: Supplier = {
      ...supplierData,
      id: `sup-${Date.now().toString().slice(-6)}`,
      created_at: new Date().toISOString(),
    };
    const audit: AuditLog = {
      id: `log-${Date.now()}`,
      tenant_id: state.tenant.id,
      user_name: state.currentUser.name,
      device_id: 'Android-Device',
      entity: 'Supplier',
      action: 'CREATE',
      record_id: newSup.id,
      details: `Created supplier ${newSup.name} (${newSup.category})`,
      details_ar: `إضافة مورد جديد ${newSup.name_ar || newSup.name} (${newSup.category})`,
      created_at: new Date().toISOString(),
    };
    setState((prev) => ({
      ...prev,
      suppliers: [newSup, ...prev.suppliers],
      auditLogs: [audit, ...prev.auditLogs],
    }));
  };

  const createProduct = (productData: Omit<Product, 'id'>) => {
    const newProd: Product = {
      ...productData,
      id: `prod-${Date.now().toString().slice(-6)}`,
    };
    const audit: AuditLog = {
      id: `log-${Date.now()}`,
      tenant_id: state.tenant.id,
      user_name: state.currentUser.name,
      device_id: 'Android-Device',
      entity: 'Product',
      action: 'CREATE',
      record_id: newProd.sku,
      details: `Created product ${newProd.sku} - ${newProd.name}`,
      details_ar: `إضافة صنف جديد ${newProd.sku} - ${newProd.name_ar || newProd.name}`,
      created_at: new Date().toISOString(),
    };
    setState((prev) => ({
      ...prev,
      products: [newProd, ...prev.products],
      auditLogs: [audit, ...prev.auditLogs],
    }));
  };

  const createPurchaseOrder = (poData: Omit<PurchaseOrder, 'id' | 'created_at' | 'status' | 'po_number'>) => {
    const poNumber = `PO-${new Date().getFullYear()}-${String(state.purchaseOrders.length + 1).padStart(3, '0')}`;
    const newPO: PurchaseOrder = {
      ...poData,
      id: `po-${Date.now().toString().slice(-6)}`,
      po_number: poNumber,
      status: 'approved',
      created_at: new Date().toISOString(),
    };

    // Create stock receipts for items
    const movements: StockMovement[] = poData.lines.map((line, idx) => ({
      id: `sm-po-${Date.now()}-${idx}`,
      tenant_id: state.tenant.id,
      product_id: line.product_id,
      warehouse_id: poData.warehouse_id,
      type: 'purchase_receipt',
      quantity: line.quantity,
      unit_cost: line.unit_cost,
      direction: 'in',
      reference_type: 'purchase_order',
      reference_id: poNumber,
      notes: `Direct purchase order receipt for ${poNumber}`,
      created_by: state.currentUser.name,
      created_at: new Date().toISOString(),
    }));

    const audit: AuditLog = {
      id: `log-${Date.now()}`,
      tenant_id: state.tenant.id,
      user_name: state.currentUser.name,
      device_id: 'Android-Device',
      entity: 'PurchaseOrder',
      action: 'CREATE',
      record_id: poNumber,
      details: `Created purchase order ${poNumber} total ${poData.total_amount} YER`,
      details_ar: `إنشاء أمر شراء وتوريد مواد ${poNumber} بمبلغ ${poData.total_amount} ر.ي`,
      created_at: new Date().toISOString(),
    };

    setState((prev) => ({
      ...prev,
      purchaseOrders: [newPO, ...prev.purchaseOrders],
      stockMovements: [...movements, ...prev.stockMovements],
      auditLogs: [audit, ...prev.auditLogs],
    }));
  };

  const createProject = (projectData: Omit<Project, 'id' | 'created_at' | 'project_code'>) => {
    const projectCode = `PRJ-${new Date().getFullYear()}-${String(state.projects.length + 1).padStart(3, '0')}`;
    const newProj: Project = {
      ...projectData,
      id: `proj-${Date.now().toString().slice(-6)}`,
      project_code: projectCode,
      created_at: new Date().toISOString(),
    };
    const audit: AuditLog = {
      id: `log-${Date.now()}`,
      tenant_id: state.tenant.id,
      user_name: state.currentUser.name,
      device_id: 'Android-Device',
      entity: 'Project',
      action: 'CREATE',
      record_id: projectCode,
      details: `Created project ${projectCode} - ${newProj.name}`,
      details_ar: `إنشاء مشروع موقعي جديد ${projectCode} - ${newProj.name_ar || newProj.name}`,
      created_at: new Date().toISOString(),
    };
    setState((prev) => ({
      ...prev,
      projects: [newProj, ...prev.projects],
      auditLogs: [audit, ...prev.auditLogs],
    }));
  };

  const createMeasurement = (measData: Omit<MeasurementRecord, 'id' | 'created_at' | 'tag_number' | 'status'>) => {
    const tagNumber = `M-${String(state.measurements.length + 1).padStart(3, '0')}`;
    const newMeas: MeasurementRecord = {
      ...measData,
      id: `meas-${Date.now().toString().slice(-6)}`,
      tag_number: tagNumber,
      status: 'verified',
      created_at: new Date().toISOString(),
    };
    const audit: AuditLog = {
      id: `log-${Date.now()}`,
      tenant_id: state.tenant.id,
      user_name: state.currentUser.name,
      device_id: 'Android-Tablet-Technician',
      entity: 'Measurement',
      action: 'CREATE',
      record_id: tagNumber,
      details: `Logged measurement ${tagNumber} (${measData.width}x${measData.height} cm, qty: ${measData.quantity})`,
      details_ar: `تسجيل مقاس ميداني ${tagNumber} (${measData.width}×${measData.height} سم، الكمية: ${measData.quantity})`,
      created_at: new Date().toISOString(),
    };
    setState((prev) => ({
      ...prev,
      measurements: [newMeas, ...prev.measurements],
      auditLogs: [audit, ...prev.auditLogs],
    }));
  };

  const convertMeasurementToBOM = (measId: string) => {
    const meas = state.measurements.find((m) => m.id === measId);
    if (!meas) return;

    const cutList = BOMEngine.generateCutListFromMeasurement({
      width: meas.width,
      height: meas.height,
      depth: meas.depth,
      product_type: meas.product_type,
      quantity: meas.quantity,
      color: meas.color,
      glass_spec: meas.glass_spec,
    });

    const woNumber = `WO-M-${new Date().getFullYear()}-${String(state.productionOrders.length + 1).padStart(3, '0')}`;
    const newOrder: ProductionOrder = {
      id: `wo-meas-${Date.now()}`,
      tenant_id: state.tenant.id,
      order_number: woNumber,
      order_type: 'make-to-order',
      product_id: 'p-fin-window-sliding-120',
      bom_id: 'bom-window-sliding-120',
      customer_id: meas.customer_id,
      project_id: meas.project_id,
      quantity: meas.quantity || 1,
      dimensions: {
        width: meas.width,
        height: meas.height,
        depth: meas.depth,
        color: meas.color,
      },
      due_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      current_stage: 'approved',
      stages_history: [
        { stage: 'draft', entered_at: new Date().toISOString(), completed_at: new Date().toISOString() },
        { stage: 'approved', entered_at: new Date().toISOString(), responsible_employee: state.currentUser.name },
      ],
      estimated_material_cost: cutList.reduce((acc, c) => acc + c.lengthCm * 250, 0),
      actual_material_cost: 0,
      estimated_labor_cost: 35000 * (meas.quantity || 1),
      actual_labor_cost: 0,
      estimated_overhead_cost: 15000,
      actual_overhead_cost: 0,
      created_at: new Date().toISOString(),
    };

    const updatedMeas = state.measurements.map((m) =>
      m.id === measId ? { ...m, status: 'converted_to_bom' as const } : m
    );

    const audit: AuditLog = {
      id: `log-${Date.now()}`,
      tenant_id: state.tenant.id,
      user_name: state.currentUser.name,
      device_id: 'Android-Tablet',
      entity: 'Measurement',
      action: 'UPDATE',
      record_id: meas.tag_number,
      details: `Converted measurement ${meas.tag_number} into Production Work Order ${woNumber}`,
      details_ar: `تحويل المقاس ${meas.tag_number} إلى أمر تصنيع وشجرة مواد ${woNumber}`,
      created_at: new Date().toISOString(),
    };

    setState((prev) => ({
      ...prev,
      measurements: updatedMeas,
      productionOrders: [newOrder, ...prev.productionOrders],
      auditLogs: [audit, ...prev.auditLogs],
    }));
  };

  const approveReviewGate = () => {
    const audit: AuditLog = {
      id: `log-${Date.now()}`,
      tenant_id: state.tenant.id,
      user_name: state.currentUser.name,
      device_id: 'Android-Master-Console',
      entity: 'Phase0ReviewGate',
      action: 'UPDATE',
      record_id: 'PHASE-0-SIGN-OFF',
      details: 'Principal Architect and Workshop Stakeholders officially signed off on Phase 0 Architecture & Domain Specification.',
      details_ar: 'تم اعتماد وتوقيع وثيقة معمارية ومحددات نطاق المرحلة الصفرية Phase 0 بنجاح.',
      created_at: new Date().toISOString(),
    };

    setState((prev) => ({
      ...prev,
      isReviewGateApproved: true,
      auditLogs: [audit, ...prev.auditLogs],
    }));
  };

  const resetAllData = () => {
    const fresh = StorageService.resetToDefault();
    setState(fresh);
  };

  const exportDatabaseBackup = () => {
    const backupJson = StorageService.exportBackup(state);
    const blob = new Blob([backupJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `WorkshopERP_Backup_v1_${state.tenant.code}_${new Date().toISOString().slice(0, 10)}.wbk.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <ERPContext.Provider
      value={{
        state,
        lang,
        setLang,
        activeTab,
        setActiveTab,
        currentUser: state.currentUser,
        setCurrentUserRole,
        toggleOnline,
        triggerSync,
        createCustomer,
        createSupplier,
        createProduct,
        createSalesInvoice,
        createPurchaseOrder,
        createProject,
        createMeasurement,
        convertMeasurementToBOM,
        createStockMovement,
        updateProductionStage,
        createJournalEntry,
        reverseJournalEntry,
        createQuotation,
        convertQuotationToWorkOrder,
        updateClarification,
        approveReviewGate,
        resetAllData,
        exportDatabaseBackup,
      }}
    >
      {children}
    </ERPContext.Provider>
  );
};

export const useERP = () => {
  const context = useContext(ERPContext);
  if (!context) {
    throw new Error('useERP must be used within an ERPProvider');
  }
  return context;
};
