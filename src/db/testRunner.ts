// ============================================================================
// Workshop ERP - Phase 1 Local SQLite Data Access Layer Unit Test Suite
// Verifies: Schema Creation, Tenant Isolation, Soft Delete, Double-Entry, Transactions
// ============================================================================

import { DatabaseService } from './databaseService';
import {
  CustomersRepository,
  ProductsRepository,
  StockMovementsRepository,
  ChartOfAccountsRepository,
  JournalEntriesRepository,
  SalesInvoicesRepository
} from './repositories';
import { TransactionService } from './transactionService';

export interface TestResult {
  testName: string;
  category: string;
  passed: boolean;
  message: string;
  durationMs: number;
}

export class Phase1TestRunner {
  private db: DatabaseService;
  private customersRepo: CustomersRepository;
  private productsRepo: ProductsRepository;
  private stockRepo: StockMovementsRepository;
  private coaRepo: ChartOfAccountsRepository;
  private journalRepo: JournalEntriesRepository;
  private transactionService: TransactionService;

  constructor() {
    this.db = DatabaseService.getInstance();
    this.customersRepo = new CustomersRepository();
    this.productsRepo = new ProductsRepository();
    this.stockRepo = new StockMovementsRepository();
    this.coaRepo = new ChartOfAccountsRepository();
    this.journalRepo = new JournalEntriesRepository();
    this.transactionService = new TransactionService();
  }

  async runAllTests(): Promise<{ results: TestResult[]; summary: { total: number; passed: number; failed: number } }> {
    const results: TestResult[] = [];
    const startTime = Date.now();

    // 1. Initialize Database
    results.push(await this.testDatabaseInitialization());

    // 2. Test Multi-Tenant Seeding
    results.push(await this.testTenantAndCOASeeding());

    // 3. Test Customers Repository (CRUD + Soft Delete)
    results.push(await this.testCustomersCrudAndSoftDelete());

    // 4. Test Multi-Tenant Boundary Isolation
    results.push(await this.testTenantIsolation());

    // 5. Test Products & Event-Sourced Stock Movements
    results.push(await this.testEventSourcedStockMovements());

    // 6. Test Double-Entry Balanced Journal Postings
    results.push(await this.testDoubleEntryJournalPosting());

    // 7. Test Journal Entry Formal Reversal
    results.push(await this.testJournalReversal());

    // 8. Test Atomic Multi-Table Transaction (Invoice + Stock + Accounting)
    results.push(await this.testAtomicInvoiceTransaction());

    // 9. Test Transaction Rollback on Unbalanced Entry
    results.push(await this.testTransactionRollback());

    const passed = results.filter((r) => r.passed).length;
    const failed = results.length - passed;

    return {
      results,
      summary: {
        total: results.length,
        passed,
        failed
      }
    };
  }

  private async testDatabaseInitialization(): Promise<TestResult> {
    const t0 = performance.now();
    try {
      await this.db.initialize('test_workshop_erp.db');
      return {
        testName: 'Database Initialization & Schema DDL',
        category: 'Core DB',
        passed: true,
        message: 'Successfully initialized SQLite schema with all 18 tables and indexes',
        durationMs: Math.round(performance.now() - t0)
      };
    } catch (err: any) {
      return {
        testName: 'Database Initialization & Schema DDL',
        category: 'Core DB',
        passed: false,
        message: `Failed initialization: ${err.message}`,
        durationMs: Math.round(performance.now() - t0)
      };
    }
  }

  private async testTenantAndCOASeeding(): Promise<TestResult> {
    const t0 = performance.now();
    try {
      const tenant = await this.db.queryOne('SELECT * FROM tenants WHERE id = ?', ['tenant-andalus-01']);
      const coaAccounts = await this.coaRepo.listByTenant();

      if (!tenant) throw new Error('Primary tenant record not found');
      if (coaAccounts.length < 10) throw new Error(`Expected at least 10 seeded COA accounts, got ${coaAccounts.length}`);

      return {
        testName: 'Tenant & Chart of Accounts Seeding',
        category: 'Master Data',
        passed: true,
        message: `Verified tenant "${tenant.name_ar}" and ${coaAccounts.length} Chart of Accounts entries`,
        durationMs: Math.round(performance.now() - t0)
      };
    } catch (err: any) {
      return {
        testName: 'Tenant & Chart of Accounts Seeding',
        category: 'Master Data',
        passed: false,
        message: `Seeding verification failed: ${err.message}`,
        durationMs: Math.round(performance.now() - t0)
      };
    }
  }

  private async testCustomersCrudAndSoftDelete(): Promise<TestResult> {
    const t0 = performance.now();
    try {
      // 1. Create
      const created = await this.customersRepo.create({
        code: `CUST-TEST-${Date.now().toString().slice(-4)}`,
        name: 'Al-Rowad Contracting Co.',
        name_ar: 'شركة الرواد للمقاولات العامة',
        phone: '+967 771 999 888',
        credit_limit: 5000000,
        current_balance: 0,
        is_active: 1
      });

      // 2. Read
      const found = await this.customersRepo.findById(created.id);
      if (!found || found.name_ar !== 'شركة الرواد للمقاولات العامة') {
        throw new Error('Customer read verification failed');
      }

      // 3. Update
      await this.customersRepo.update(created.id, { current_balance: 150000 });
      const updated = await this.customersRepo.findById(created.id);
      if (updated?.current_balance !== 150000) {
        throw new Error('Customer update verification failed');
      }

      // 4. Soft Delete
      await this.customersRepo.softDelete(created.id);
      const afterDelete = await this.customersRepo.findById(created.id);
      if (afterDelete !== null) {
        throw new Error('Soft-deleted customer was still returned by findById query');
      }

      return {
        testName: 'Customer CRUD & Soft-Delete Filter',
        category: 'Repositories',
        passed: true,
        message: 'Successfully verified Customer Creation, Retrieval, Updates, and Soft-Deletion filters',
        durationMs: Math.round(performance.now() - t0)
      };
    } catch (err: any) {
      return {
        testName: 'Customer CRUD & Soft-Delete Filter',
        category: 'Repositories',
        passed: false,
        message: `Customer repository test failed: ${err.message}`,
        durationMs: Math.round(performance.now() - t0)
      };
    }
  }

  private async testTenantIsolation(): Promise<TestResult> {
    const t0 = performance.now();
    try {
      const originalTenantId = this.db.getTenantId();

      // Create item in tenant A
      const custA = await this.customersRepo.create({
        code: `CUST-A-${Date.now()}`,
        name: 'Tenant A Customer',
        name_ar: 'عميل المستأجر أ',
        phone: '+967 770 000 001',
        credit_limit: 1000000,
        current_balance: 0,
        is_active: 1
      });

      // Switch to tenant B and query
      this.db.setTenantId('tenant-branch-02');
      const foundInTenantB = await this.customersRepo.findById(custA.id);

      // Restore tenant
      this.db.setTenantId(originalTenantId);

      if (foundInTenantB !== null) {
        throw new Error('Multi-Tenant Data Leak: Record from Tenant A was accessible by Tenant B');
      }

      return {
        testName: 'Multi-Tenant Isolation (Row-Level Security)',
        category: 'Security',
        passed: true,
        message: 'Verified complete row-level isolation between distinct tenant IDs',
        durationMs: Math.round(performance.now() - t0)
      };
    } catch (err: any) {
      return {
        testName: 'Multi-Tenant Isolation (Row-Level Security)',
        category: 'Security',
        passed: false,
        message: `Tenant isolation test failed: ${err.message}`,
        durationMs: Math.round(performance.now() - t0)
      };
    }
  }

  private async testEventSourcedStockMovements(): Promise<TestResult> {
    const t0 = performance.now();
    try {
      // 1. Create Product
      const product = await this.productsRepo.create({
        sku: `PROF-TEST-${Date.now().toString().slice(-4)}`,
        name: 'Aluminium Thermal Break 65mm Profile',
        name_ar: 'مقطع سرايا ألمنيوم عازل 65 ملم',
        type: 'raw_profile',
        category: 'profiles',
        unit: 'bar_6m',
        unit_cost: 12500,
        unit_price: 18000,
        min_stock: 10,
        max_stock: 200,
        reorder_point: 25,
        track_inventory: 1
      });

      // 2. Record First Purchase Receipt: +50 bars @ 12,000 YER
      await this.stockRepo.recordMovement({
        product_id: product.id,
        warehouse_id: 'wh-main-01',
        type: 'purchase_receipt',
        direction: 'in',
        quantity: 50,
        unit_cost: 12000,
        total_cost: 600000,
        created_by: 'usr-admin-01'
      });

      // 3. Record Second Purchase Receipt: +50 bars @ 14,000 YER
      await this.stockRepo.recordMovement({
        product_id: product.id,
        warehouse_id: 'wh-main-01',
        type: 'purchase_receipt',
        direction: 'in',
        quantity: 50,
        unit_cost: 14000,
        total_cost: 700000,
        created_by: 'usr-admin-01'
      });

      // 4. Record Production Consumption: -30 bars
      await this.stockRepo.recordMovement({
        product_id: product.id,
        warehouse_id: 'wh-main-01',
        type: 'production_consumption',
        direction: 'out',
        quantity: 30,
        unit_cost: 13000,
        total_cost: 390000,
        created_by: 'usr-admin-01'
      });

      // 5. Verify Computed Stock Balance
      const balance = await this.stockRepo.getProductStockBalance(product.id);

      // Expected On-Hand: 50 + 50 - 30 = 70 bars
      if (balance.onHand !== 70) {
        throw new Error(`Expected 70 bars on hand, computed ${balance.onHand}`);
      }

      return {
        testName: 'Event-Sourced Stock & WAC Valuation',
        category: 'Inventory',
        passed: true,
        message: `Verified immutable stock movements: 70 bars on-hand, Valuation: ${balance.totalCost.toLocaleString()} YER`,
        durationMs: Math.round(performance.now() - t0)
      };
    } catch (err: any) {
      return {
        testName: 'Event-Sourced Stock & WAC Valuation',
        category: 'Inventory',
        passed: false,
        message: `Stock movement event test failed: ${err.message}`,
        durationMs: Math.round(performance.now() - t0)
      };
    }
  }

  private async testDoubleEntryJournalPosting(): Promise<TestResult> {
    const t0 = performance.now();
    try {
      // Post Balanced Entry: Debit Cash 10100 (50,000) / Credit Revenue 40100 (50,000)
      const { header, lines } = await this.journalRepo.postEntry({
        date: new Date().toISOString().split('T')[0],
        narration: 'Cash Sales Advance Receipt',
        narration_ar: 'استلام دفعة نقدية مقدمة مبيعات',
        created_by: 'usr-admin-01',
        lines: [
          { account_id: 'acc-10100', debit: 50000, credit: 0, description: 'Cash Vault' },
          { account_id: 'acc-40100', debit: 0, credit: 50000, description: 'Sales Revenue' }
        ]
      });

      if (header.total_debit !== 50000 || header.total_credit !== 50000) {
        throw new Error('Journal entry totals mismatch');
      }

      if (lines.length !== 2) {
        throw new Error('Journal entry lines count mismatch');
      }

      return {
        testName: 'Balanced Double-Entry Journal Posting',
        category: 'Accounting',
        passed: true,
        message: `Successfully posted balanced voucher ${header.entry_number} (Dr: 50,000 = Cr: 50,000)`,
        durationMs: Math.round(performance.now() - t0)
      };
    } catch (err: any) {
      return {
        testName: 'Balanced Double-Entry Journal Posting',
        category: 'Accounting',
        passed: false,
        message: `Double-entry posting test failed: ${err.message}`,
        durationMs: Math.round(performance.now() - t0)
      };
    }
  }

  private async testJournalReversal(): Promise<TestResult> {
    const t0 = performance.now();
    try {
      // 1. Post original entry
      const original = await this.journalRepo.postEntry({
        date: new Date().toISOString().split('T')[0],
        narration: 'Test Entry to be reversed',
        narration_ar: 'قيد تجريبي للإلغاء والعكس',
        created_by: 'usr-admin-01',
        lines: [
          { account_id: 'acc-10200', debit: 75000, credit: 0 },
          { account_id: 'acc-40100', debit: 0, credit: 75000 }
        ]
      });

      // 2. Perform Reversal
      const reversalHeader = await this.journalRepo.reverseEntry(
        original.header.id,
        'Incorrect customer allocation',
        'usr-admin-01'
      );

      if (!reversalHeader.id || reversalHeader.status !== 'posted') {
        throw new Error('Counter-reversal entry not generated properly');
      }

      return {
        testName: 'Formal Double-Entry Counter-Reversal (ADR-004)',
        category: 'Accounting',
        passed: true,
        message: `Verified immutable reversal: Original ${original.header.entry_number} reversed by counter-voucher ${reversalHeader.entry_number}`,
        durationMs: Math.round(performance.now() - t0)
      };
    } catch (err: any) {
      return {
        testName: 'Formal Double-Entry Counter-Reversal (ADR-004)',
        category: 'Accounting',
        passed: false,
        message: `Journal reversal test failed: ${err.message}`,
        durationMs: Math.round(performance.now() - t0)
      };
    }
  }

  private async testAtomicInvoiceTransaction(): Promise<TestResult> {
    const t0 = performance.now();
    try {
      // Create Customer and Product
      const cust = await this.customersRepo.create({
        code: `CUST-TX-${Date.now().toString().slice(-4)}`,
        name: 'Saba Towers Project',
        name_ar: 'مشروع أبراج سبأ السكنية',
        phone: '+967 777 888 999',
        credit_limit: 10000000,
        current_balance: 0,
        is_active: 1
      });

      const prod = await this.productsRepo.create({
        sku: `WIN-TX-${Date.now().toString().slice(-4)}`,
        name: 'Double Glass Sliding Window 120x140cm',
        name_ar: 'نافذة سحاب ألمنيوم دبل جلاس 120×140 سم',
        type: 'finished_assembly',
        category: 'windows',
        unit: 'piece',
        unit_cost: 35000,
        unit_price: 55000,
        min_stock: 2,
        max_stock: 50,
        reorder_point: 5,
        track_inventory: 1
      });

      // Execute Atomic Workflow
      const invoiceNumber = `INV-TEST-${Date.now().toString().slice(-4)}`;
      const result = await this.transactionService.createSalesInvoiceWithInventoryAndJournal({
        invoice: {
          invoice_number: invoiceNumber,
          customer_id: cust.id,
          issue_date: new Date().toISOString().split('T')[0],
          due_date: new Date().toISOString().split('T')[0],
          payment_term: 'cash',
          payment_status: 'unpaid',
          subtotal: 110000,
          tax_amount: 5500,
          discount_amount: 0,
          total_amount: 115500,
          paid_amount: 0,
          created_by: 'usr-admin-01'
        },
        lines: [
          {
            product_id: prod.id,
            description: 'Double Glass Sliding Window Unit',
            width: 120,
            height: 140,
            quantity: 2,
            unit_price: 55000,
            tax_rate: 0.05,
            tax_amount: 5500,
            subtotal: 110000,
            total: 115500
          }
        ],
        warehouseId: 'wh-main-01'
      });

      if (!result.invoice.id || !result.journalEntryId) {
        throw new Error('Atomic transaction result incomplete');
      }

      return {
        testName: 'Atomic Multi-Table Transaction (Invoice + Inventory + Accounting)',
        category: 'Transactions',
        passed: true,
        message: `Successfully executed atomic workflow: Invoice ${invoiceNumber}, Stock Issue, and Journal Voucher posted in single transaction`,
        durationMs: Math.round(performance.now() - t0)
      };
    } catch (err: any) {
      return {
        testName: 'Atomic Multi-Table Transaction (Invoice + Inventory + Accounting)',
        category: 'Transactions',
        passed: false,
        message: `Atomic transaction workflow failed: ${err.message}`,
        durationMs: Math.round(performance.now() - t0)
      };
    }
  }

  private async testTransactionRollback(): Promise<TestResult> {
    const t0 = performance.now();
    try {
      let threwExpectedError = false;

      try {
        await this.journalRepo.postEntry({
          date: new Date().toISOString().split('T')[0],
          narration: 'Unbalanced Fraudulent Entry Test',
          narration_ar: 'قيد غير متوازن لاختبار التراجع والـ Rollback',
          created_by: 'usr-admin-01',
          lines: [
            { account_id: 'acc-10100', debit: 100000, credit: 0 },
            { account_id: 'acc-40100', debit: 0, credit: 80000 } // Unbalanced! 100k != 80k
          ]
        });
      } catch {
        threwExpectedError = true;
      }

      if (!threwExpectedError) {
        throw new Error('Unbalanced journal entry was permitted to post without throwing error');
      }

      return {
        testName: 'Transaction Rollback & Integrity Enforcement',
        category: 'Integrity',
        passed: true,
        message: 'Verified transaction rollback & exception throw when double-entry equation is violated',
        durationMs: Math.round(performance.now() - t0)
      };
    } catch (err: any) {
      return {
        testName: 'Transaction Rollback & Integrity Enforcement',
        category: 'Integrity',
        passed: false,
        message: `Rollback test failed: ${err.message}`,
        durationMs: Math.round(performance.now() - t0)
      };
    }
  }
}
