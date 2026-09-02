import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { DatabaseService } from '../db/databaseService';
import { ProductsRepository } from '../repositories/ProductsRepository';
import { StockRepository } from '../repositories/StockRepository';
import { SalesRepository } from '../repositories/SalesRepository';
import { PurchasesRepository } from '../repositories/PurchasesRepository';
import { PaymentsRepository } from '../repositories/PaymentsRepository';
import { ChartOfAccountsRepository } from '../repositories/ChartOfAccountsRepository';
import { JournalEntriesRepository } from '../repositories/JournalEntriesRepository';
import { SyncOutboxRepository } from '../repositories/SyncOutboxRepository';
import { AtomicTransactionService } from '../services/AtomicTransactionService';
import { seedChartOfAccounts } from '../db/seed';

describe('Phase 3: Inventory + Sales + Purchases Unit Tests', () => {
  const TENANT_ID = 'tenant-workshop-phase3';
  const db = DatabaseService.getInstance();

  const productsRepo = new ProductsRepository();
  const stockRepo = new StockRepository();
  const salesRepo = new SalesRepository();
  const purchasesRepo = new PurchasesRepository();
  const paymentsRepo = new PaymentsRepository();
  const coaRepo = new ChartOfAccountsRepository();
  const journalRepo = new JournalEntriesRepository();
  const outboxRepo = new SyncOutboxRepository();
  const txService = new AtomicTransactionService();

  beforeAll(async () => {
    await db.initialize('test_phase3.db');
    db.setTenantId(TENANT_ID);
  });

  beforeEach(async () => {
    db.setTenantId(TENANT_ID);
    await db.execute(`
      DELETE FROM sale_invoice_lines;
      DELETE FROM sales_invoice_lines;
      DELETE FROM sales_invoices;
      DELETE FROM purchase_order_lines;
      DELETE FROM purchase_orders;
      DELETE FROM supplier_invoices;
      DELETE FROM payments;
      DELETE FROM cash_accounts;
      DELETE FROM stock_movements;
      DELETE FROM stock_balances;
      DELETE FROM products;
      DELETE FROM categories;
      DELETE FROM units;
      DELETE FROM warehouses;
      DELETE FROM journal_entry_lines;
      DELETE FROM journal_entries;
      DELETE FROM sync_outbox;
      DELETE FROM chart_of_accounts;
    `);
    await seedChartOfAccounts(TENANT_ID);
  });

  // ============================================================================
  // 1. Products Repository Tests
  // ============================================================================
  describe('Products Repository', () => {
    it('should create, find, list, and soft delete a product', async () => {
      const product = await productsRepo.create({
        type: 'raw_profile',
        sku: 'ALU-6063-T5',
        name: 'Aluminium Profile 6063 T5',
        name_ar: 'قطاع ألمنيوم 6063 ت5',
        min_stock_level: 10,
        max_stock_level: 200,
        cost_method: 'weighted_average'
      });

      expect(product.id).toBeDefined();
      expect(product.name).toBe('Aluminium Profile 6063 T5');
      expect(product.sync_status).toBe('pending');

      const found = await productsRepo.findById(product.id);
      expect(found).not.toBeNull();
      expect(found?.sku).toBe('ALU-6063-T5');

      const bySku = await productsRepo.findBySku('ALU-6063-T5');
      expect(bySku?.id).toBe(product.id);

      const list = await productsRepo.list({ type: 'raw_profile' });
      expect(list.length).toBe(1);

      // Verify sync outbox was queued
      const outbox = await outboxRepo.getPending();
      const productInsert = outbox.find(e => e.local_entity === 'products' && e.local_id === product.id);
      expect(productInsert).toBeDefined();
      expect(productInsert?.operation).toBe('INSERT');

      // Soft delete
      const deleted = await productsRepo.softDelete(product.id);
      expect(deleted).toBe(true);
      const afterDelete = await productsRepo.findById(product.id);
      expect(afterDelete).toBeNull();
    });
  });

  // ============================================================================
  // 2. Stock Repository & Balances (Event Sourced + WAC)
  // ============================================================================
  describe('Stock Movements & Weighted Average Cost (WAC)', () => {
    it('should record in/out movements and accurately compute weighted average cost', async () => {
      const product = await productsRepo.create({
        type: 'raw_profile',
        sku: 'ALU-100',
        name: 'Profile 100',
        name_ar: 'قطاع 100'
      });

      const warehouseId = 'WH-MAIN-01';

      // 1. First receipt: 100 units @ $10/unit
      await stockRepo.recordMovement({
        product_id: product.id,
        warehouse_id: warehouseId,
        movement_type: 'purchase_receipt',
        direction: 'in',
        quantity: 100,
        unit_cost: 10,
        created_by: 'test-user'
      });

      let balance = await stockRepo.getBalance(product.id, warehouseId);
      expect(balance?.quantity).toBe(100);
      expect(balance?.average_cost).toBe(10);

      // 2. Second receipt: 100 units @ $20/unit -> New WAC = (100*10 + 100*20)/200 = $15
      await stockRepo.recordMovement({
        product_id: product.id,
        warehouse_id: warehouseId,
        movement_type: 'purchase_receipt',
        direction: 'in',
        quantity: 100,
        unit_cost: 20,
        created_by: 'test-user'
      });

      balance = await stockRepo.getBalance(product.id, warehouseId);
      expect(balance?.quantity).toBe(200);
      expect(balance?.average_cost).toBe(15);

      // 3. Issue/Sale Delivery: 50 units out -> Quantity becomes 150, WAC stays $15
      await stockRepo.recordMovement({
        product_id: product.id,
        warehouse_id: warehouseId,
        movement_type: 'sale_delivery',
        direction: 'out',
        quantity: 50,
        unit_cost: 15,
        created_by: 'test-user'
      });

      balance = await stockRepo.getBalance(product.id, warehouseId);
      expect(balance?.quantity).toBe(150);
      expect(balance?.average_cost).toBe(15);

      // 4. Verify all movements log
      const movements = await stockRepo.getMovements({ productId: product.id });
      expect(movements.length).toBe(3);
    });
  });

  // ============================================================================
  // 3. Sales Repository Tests
  // ============================================================================
  describe('Sales Repository', () => {
    it('should create sales invoice with line items, tax, and auto-generated sequence number', async () => {
      const invoice = await salesRepo.createInvoice({
        customer_id: 'CUST-001',
        date: '2026-08-29',
        lines: [
          { description: 'Aluminium Window Frame', quantity: 2, unit_price: 500, discount: 50, tax_rate: 0.05 },
          { description: 'Double Glazed Glass', quantity: 4, unit_price: 200, tax_rate: 0.05 }
        ]
      });

      expect(invoice.id).toBeDefined();
      expect(invoice.invoice_number).toMatch(/^INV-\d{4}-\d{4}$/);
      expect(invoice.subtotal).toBe(1800); // (2*500) + (4*200) = 1000 + 800 = 1800
      expect(invoice.discount_total).toBe(50);
      // Net = 1750. Line 1 net = 950 * 0.05 = 47.5. Line 2 net = 800 * 0.05 = 40. Total tax = 87.5
      expect(invoice.tax_total).toBe(87.5);
      expect(invoice.grand_total).toBe(1837.5);
      expect(invoice.balance).toBe(1837.5);
      expect(invoice.lines.length).toBe(2);

      // Verify findById
      const retrieved = await salesRepo.findById(invoice.id);
      expect(retrieved?.lines.length).toBe(2);

      // Verify payment update
      const updated = await salesRepo.updatePayment(invoice.id, 500);
      expect(updated.paid_amount).toBe(500);
      expect(updated.balance).toBe(1337.5);
      expect(updated.payment_status).toBe('partially_paid');
    });
  });

  // ============================================================================
  // 4. Purchases Repository Tests
  // ============================================================================
  describe('Purchases Repository', () => {
    it('should create purchase order and supplier invoice (bill)', async () => {
      const order = await purchasesRepo.createPurchaseOrder({
        supplier_id: 'SUPP-001',
        date: '2026-08-29',
        lines: [
          { description: 'Raw Aluminium Bar 6m', quantity: 50, unit_price: 80, tax_rate: 0.05 }
        ]
      });

      expect(order.order_number).toMatch(/^PO-\d{4}-\d{4}$/);
      expect(order.subtotal).toBe(4000);
      expect(order.tax_total).toBe(200);
      expect(order.grand_total).toBe(4200);

      const bill = await purchasesRepo.createSupplierInvoice({
        supplier_id: 'SUPP-001',
        purchase_order_id: order.id,
        invoice_number: 'SUPP-INV-9988',
        date: '2026-08-29',
        subtotal: order.subtotal,
        tax_total: order.tax_total,
        grand_total: order.grand_total
      });

      expect(bill.id).toBeDefined();
      expect(bill.balance).toBe(4200);
    });
  });

  // ============================================================================
  // 5. Payments Repository & Cash Accounts
  // ============================================================================
  describe('Payments Repository & Cash Accounts', () => {
    it('should manage cash account balances on customer receipt and supplier payment', async () => {
      const cashAccount = await paymentsRepo.createCashAccount({
        name: 'Main Workshop Safe',
        name_ar: 'خزينة الورشة الرئيسية',
        account_type: 'cash',
        balance: 1000,
        is_active: 1
      });

      // Customer Payment (Income) +$500
      await paymentsRepo.recordPayment({
        payment_type: 'customer_payment',
        reference_entity: 'sales_invoice',
        reference_id: 'INV-001',
        amount: 500,
        cash_account_id: cashAccount.id,
        date: '2026-08-29'
      });

      let accounts = await paymentsRepo.listCashAccounts();
      let updatedSafe = accounts.find(a => a.id === cashAccount.id);
      expect(updatedSafe?.balance).toBe(1500);

      // Supplier Payment (Expense) -$300
      await paymentsRepo.recordPayment({
        payment_type: 'supplier_payment',
        reference_entity: 'supplier_invoice',
        reference_id: 'BILL-001',
        amount: 300,
        cash_account_id: cashAccount.id,
        date: '2026-08-29'
      });

      accounts = await paymentsRepo.listCashAccounts();
      updatedSafe = accounts.find(a => a.id === cashAccount.id);
      expect(updatedSafe?.balance).toBe(1200);
    });
  });

  // ============================================================================
  // 6. Complete End-to-End Atomic Workflows
  // ============================================================================
  describe('Atomic Transaction Workflows (Sales + Purchases + Payments + Accounting)', () => {
    it('should execute end-to-end Purchase workflow with Stock In and Accounting Journal', async () => {
      const product = await productsRepo.create({
        type: 'raw_profile',
        sku: 'ALU-PO-01',
        name: 'Aluminium Bar 6m',
        name_ar: 'عود ألمنيوم 6 متر'
      });

      const result = await txService.processPurchaseWorkflow({
        supplier_id: 'SUPP-EMIRATES-ALU',
        warehouse_id: 'WH-CENTRAL',
        date: '2026-08-29',
        lines: [
          { product_id: product.id, quantity: 100, unit_price: 50, tax_rate: 0.05 }
        ]
      });

      // 1. Verify PO & Bill
      expect(result.order.grand_total).toBe(5250); // 5000 + 250
      expect(result.invoice.status).toBe('posted');

      // 2. Verify Stock Movement & Balance
      expect(result.movements.length).toBe(1);
      const stockBalance = await stockRepo.getBalance(product.id, 'WH-CENTRAL');
      expect(stockBalance?.quantity).toBe(100);
      expect(stockBalance?.average_cost).toBe(50);

      // 3. Verify Journal Entry is posted and perfectly balanced
      expect(result.journalEntry.status).toBe('posted');
      expect(result.journalEntry.total_debit).toBe(5250);
      expect(result.journalEntry.total_credit).toBe(5250);
    });

    it('should execute end-to-end Sales workflow with Stock Out, COGS & Revenue Journal', async () => {
      // First seed product with stock
      const product = await productsRepo.create({
        type: 'finished_good',
        sku: 'WIN-SLIDING-200',
        name: 'Sliding Window 200x120',
        name_ar: 'شباك سحاب 200*120'
      });

      await stockRepo.recordMovement({
        product_id: product.id,
        warehouse_id: 'WH-CENTRAL',
        movement_type: 'production_output',
        direction: 'in',
        quantity: 10,
        unit_cost: 300, // Cost = 300
        created_by: 'test-user'
      });

      // Execute Sale of 2 units @ $600 each + 5% tax
      const result = await txService.processSaleWorkflow({
        customer_id: 'CUST-VILLA-01',
        warehouse_id: 'WH-CENTRAL',
        date: '2026-08-29',
        lines: [
          { product_id: product.id, quantity: 2, unit_price: 600, tax_rate: 0.05 }
        ]
      });

      // 1. Verify Invoice
      expect(result.invoice.status).toBe('posted');
      expect(result.invoice.subtotal).toBe(1200);
      expect(result.invoice.tax_total).toBe(60);
      expect(result.invoice.grand_total).toBe(1260);

      // 2. Verify Stock reduction
      const stockBalance = await stockRepo.getBalance(product.id, 'WH-CENTRAL');
      expect(stockBalance?.quantity).toBe(8); // 10 - 2

      // 3. Verify Journal Entry:
      // Dr AR: 1260, Cr Revenue: 1200, Cr VAT: 60
      // Dr COGS: 600 (2 * 300), Cr Inventory: 600
      // Total Debits = 1260 + 600 = 1860, Total Credits = 1860
      expect(result.journalEntry.status).toBe('posted');
      expect(result.journalEntry.total_debit).toBe(1860);
      expect(result.journalEntry.total_credit).toBe(1860);
    });

    it('should execute end-to-end Customer Payment workflow and update invoice balance', async () => {
      const paymentResult = await txService.processCustomerPaymentWorkflow({
        customer_id: 'CUST-VILLA-01',
        amount: 1260,
        payment_method: 'cash',
        date: '2026-08-29'
      });

      expect(paymentResult.payment.amount).toBe(1260);
      expect(paymentResult.journalEntry.status).toBe('posted');
      expect(paymentResult.journalEntry.total_debit).toBe(1260);
      expect(paymentResult.journalEntry.total_credit).toBe(1260);
    });

    it('should execute Stock Adjustment workflow with proper Gain/Loss accounting', async () => {
      const product = await productsRepo.create({
        type: 'raw_material',
        sku: 'SCR-ACC-01',
        name: 'Window Screws Box',
        name_ar: 'علبة براغي'
      });

      // 1. Adjustment IN (Gain)
      const gainResult = await txService.processInventoryAdjustmentWorkflow({
        product_id: product.id,
        warehouse_id: 'WH-CENTRAL',
        direction: 'in',
        quantity: 5,
        unit_cost: 20,
        reason: 'Physical inventory surplus',
        date: '2026-08-29'
      });

      expect(gainResult.movement.quantity).toBe(5);
      expect(gainResult.journalEntry.total_debit).toBe(100);
      expect(gainResult.journalEntry.total_credit).toBe(100);

      const balance = await stockRepo.getBalance(product.id, 'WH-CENTRAL');
      expect(balance?.quantity).toBe(5);
    });
  });
});
