// ============================================================================
// Workshop ERP - Atomic Transaction Service (Phase 3 Engine)
// Orchestrates ACID multi-table transactions across Sales, Purchases, Stock, and Accounting
// ============================================================================

import { DatabaseService } from '../db/databaseService';
import {
  ProductsRepository,
  StockRepository,
  SalesRepository,
  PurchasesRepository,
  PaymentsRepository,
  ChartOfAccountsRepository,
  JournalEntriesRepository,
  SyncOutboxRepository
} from '../repositories';
import {
  SalesInvoice,
  SaleInvoiceLine,
  PurchaseOrder,
  PurchaseOrderLine,
  SupplierInvoice,
  Payment,
  StockMovement,
  JournalEntry,
  CreateJournalEntryInput
} from '../db/types';

export class AtomicTransactionService {
  private db = DatabaseService.getInstance();
  private productsRepo = new ProductsRepository();
  private stockRepo = new StockRepository();
  private salesRepo = new SalesRepository();
  private purchasesRepo = new PurchasesRepository();
  private paymentsRepo = new PaymentsRepository();
  private coaRepo = new ChartOfAccountsRepository();
  private journalRepo = new JournalEntriesRepository();
  private outboxRepo = new SyncOutboxRepository();

  /**
   * Helper to retrieve an account ID by code (e.g. '10100', '10200', '10300', '20100', '20200', '40100', '50100').
   * If not found by exact 5-digit code, falls back to parent code prefix or creates/returns ID.
   */
  private async getAccountIdByCode(code: string, fallbackName?: string): Promise<string> {
    const acc = await this.coaRepo.findByCode(code);
    if (acc) return acc.id;

    // Search by prefix if specific leaf account doesn't exist
    const prefix = code.slice(0, 3);
    const all = await this.coaRepo.list();
    const match = all.find(a => a.code.startsWith(prefix) && a.is_postable) || all.find(a => a.code.startsWith(prefix));
    if (match) return match.id;

    // Auto-create if not found in test environment
    const created = await this.coaRepo.create({
      code,
      name: fallbackName || `Account ${code}`,
      name_ar: fallbackName || `حساب ${code}`,
      type: code.startsWith('1') ? 'asset' : code.startsWith('2') ? 'liability' : code.startsWith('3') ? 'equity' : code.startsWith('4') ? 'revenue' : 'expense',
      nature: (code.startsWith('1') || code.startsWith('5')) ? 'debit' : 'credit',
      is_postable: true,
      is_active: true
    });
    return created.id;
  }

  // ============================================================================
  // 1. SALES INVOICE WORKFLOW (Sale + Stock Out + Revenue & Tax & COGS Journal)
  // ============================================================================
  async processSaleWorkflow(params: {
    customer_id: string;
    invoice_number?: string;
    warehouse_id: string;
    date: string;
    due_date?: string;
    notes?: string;
    lines: {
      product_id: string;
      description?: string;
      quantity: number;
      unit_price: number;
      discount?: number;
      tax_rate?: number;
    }[];
    created_by?: string;
  }): Promise<{
    invoice: SalesInvoice & { lines: SaleInvoiceLine[] };
    movements: StockMovement[];
    journalEntry: JournalEntry;
  }> {
    return await this.db.transaction(async () => {
      // 1. Create Sales Invoice (with lines & totals)
      const invoice = await this.salesRepo.createInvoice({
        customer_id: params.customer_id,
        invoice_number: params.invoice_number,
        date: params.date,
        due_date: params.due_date,
        status: 'draft',
        notes: params.notes,
        lines: params.lines
      });

      // 2. Issue Stock Movements & Compute Cost of Goods Sold (COGS)
      const movements: StockMovement[] = [];
      let totalCOGS = 0;

      for (const line of invoice.lines) {
        if (!line.product_id) continue;
        const product = await this.productsRepo.findById(line.product_id);
        if (!product || !product.is_stockable) continue;

        // Get current average cost
        const balance = await this.stockRepo.getBalance(line.product_id, params.warehouse_id);
        const unitCost = balance && balance.average_cost > 0 ? balance.average_cost : 0;
        const lineTotalCost = line.quantity * unitCost;
        totalCOGS += lineTotalCost;

        const movement = await this.stockRepo.recordMovement({
          product_id: line.product_id,
          warehouse_id: params.warehouse_id,
          movement_type: 'sale_delivery',
          direction: 'out',
          quantity: line.quantity,
          unit_cost: unitCost,
          total_cost: lineTotalCost,
          reference_entity: 'sales_invoice',
          reference_id: invoice.id,
          notes: `Sale delivery for invoice ${invoice.invoice_number}`,
          created_by: params.created_by || 'system'
        });
        movements.push(movement);
      }

      // 3. Post Double-Entry Journal Voucher
      // Account Codes:
      // 10200 = Accounts Receivable (Debit: grand_total)
      // 40100 = Sales Revenue (Credit: net revenue)
      // 20201 or 20200 = VAT Output (Credit: tax_total)
      // If COGS > 0:
      // 50100 = Cost of Goods Sold (Debit: totalCOGS)
      // 10300 = Inventory (Credit: totalCOGS)

      const arAccountId = await this.getAccountIdByCode('10200', 'Accounts Receivable (العملاء)');
      const revenueAccountId = await this.getAccountIdByCode('40100', 'Sales Revenue (إيرادات المبيعات)');
      const vatOutputAccountId = await this.getAccountIdByCode('20201', 'VAT Output (ضريبة القيمة المضافة)');

      const netRevenue = Number(invoice.subtotal) - Number(invoice.discount_total || 0);
      const taxAmount = Number(invoice.tax_total || 0);
      const grandTotal = Number(invoice.grand_total);

      const journalLines: CreateJournalEntryInput['lines'] = [
        {
          account_id: arAccountId,
          debit: grandTotal,
          credit: 0,
          description: `Receivable for invoice ${invoice.invoice_number}`,
          partner_type: 'customer',
          partner_id: params.customer_id
        },
        {
          account_id: revenueAccountId,
          debit: 0,
          credit: netRevenue,
          description: `Sales revenue for invoice ${invoice.invoice_number}`
        }
      ];

      if (taxAmount > 0) {
        journalLines.push({
          account_id: vatOutputAccountId,
          debit: 0,
          credit: taxAmount,
          description: `VAT Output for invoice ${invoice.invoice_number}`
        });
      }

      if (totalCOGS > 0) {
        const cogsAccountId = await this.getAccountIdByCode('50100', 'Cost of Goods Sold (تكلفة المبيعات)');
        const inventoryAccountId = await this.getAccountIdByCode('10300', 'Inventory (المخزون)');

        journalLines.push({
          account_id: cogsAccountId,
          debit: totalCOGS,
          credit: 0,
          description: `COGS for invoice ${invoice.invoice_number}`
        });
        journalLines.push({
          account_id: inventoryAccountId,
          debit: 0,
          credit: totalCOGS,
          description: `Inventory reduction for invoice ${invoice.invoice_number}`
        });
      }

      const journalDraft = await this.journalRepo.createDraft({
        date: invoice.date,
        reference_type: 'sales_invoice',
        reference_id: invoice.id,
        source_document: invoice.invoice_number,
        narration: `Sales Invoice ${invoice.invoice_number} for customer ${params.customer_id}`,
        narration_ar: `فاتورة مبيعات رقم ${invoice.invoice_number}`,
        created_by: params.created_by || 'system',
        lines: journalLines
      });

      const journalEntry = await this.journalRepo.post(journalDraft.id, params.created_by || 'system');

      // 4. Mark invoice posted and link journal entry
      const postedInvoice = await this.salesRepo.postInvoice(invoice.id, journalEntry.id);

      return {
        invoice: {
          ...postedInvoice,
          lines: invoice.lines
        },
        movements,
        journalEntry
      };
    });
  }

  // ============================================================================
  // 2. PURCHASE WORKFLOW (Purchase Receipt + Stock In + AP & Tax Journal)
  // ============================================================================
  async processPurchaseWorkflow(params: {
    supplier_id: string;
    order_number?: string;
    warehouse_id: string;
    date: string;
    due_date?: string;
    notes?: string;
    lines: {
      product_id: string;
      description?: string;
      quantity: number;
      unit_price: number;
      tax_rate?: number;
    }[];
    created_by?: string;
  }): Promise<{
    order: PurchaseOrder & { lines: PurchaseOrderLine[] };
    invoice: SupplierInvoice;
    movements: StockMovement[];
    journalEntry: JournalEntry;
  }> {
    return await this.db.transaction(async () => {
      // 1. Create Purchase Order
      const order = await this.purchasesRepo.createPurchaseOrder({
        supplier_id: params.supplier_id,
        order_number: params.order_number,
        date: params.date,
        expected_date: params.due_date,
        status: 'received',
        notes: params.notes,
        lines: params.lines
      });

      // 2. Record Stock Movements (Inbound Receipt) & Update WAC Balances
      const movements: StockMovement[] = [];
      for (const line of order.lines) {
        if (!line.product_id) continue;
        const lineTotalCost = line.quantity * line.unit_price;

        const movement = await this.stockRepo.recordMovement({
          product_id: line.product_id,
          warehouse_id: params.warehouse_id,
          movement_type: 'purchase_receipt',
          direction: 'in',
          quantity: line.quantity,
          unit_cost: line.unit_price,
          total_cost: lineTotalCost,
          reference_entity: 'purchase_order',
          reference_id: order.id,
          notes: `Purchase receipt for PO ${order.order_number}`,
          created_by: params.created_by || 'system'
        });
        movements.push(movement);
      }

      // 3. Create Supplier Invoice (Bill)
      const supplierInvoice = await this.purchasesRepo.createSupplierInvoice({
        supplier_id: params.supplier_id,
        purchase_order_id: order.id,
        invoice_number: `BILL-${order.order_number}`,
        date: params.date,
        due_date: params.due_date,
        status: 'posted',
        subtotal: order.subtotal,
        tax_total: order.tax_total,
        grand_total: order.grand_total,
        notes: params.notes
      });

      // 4. Post Double-Entry Journal Entry
      // Account Codes:
      // 10300 = Inventory (Debit: subtotal)
      // 10250 / 20202 = VAT Input Recoverable (Debit: tax_total)
      // 20100 = Accounts Payable (Credit: grand_total)

      const inventoryAccountId = await this.getAccountIdByCode('10300', 'Inventory (المخزون)');
      const vatInputAccountId = await this.getAccountIdByCode('10250', 'VAT Input (ضريبة المدخلات)');
      const apAccountId = await this.getAccountIdByCode('20100', 'Accounts Payable (الموردون)');

      const subtotal = Number(order.subtotal);
      const taxAmount = Number(order.tax_total);
      const grandTotal = Number(order.grand_total);

      const journalLines: CreateJournalEntryInput['lines'] = [
        {
          account_id: inventoryAccountId,
          debit: subtotal,
          credit: 0,
          description: `Inventory purchase for PO ${order.order_number}`
        }
      ];

      if (taxAmount > 0) {
        journalLines.push({
          account_id: vatInputAccountId,
          debit: taxAmount,
          credit: 0,
          description: `VAT Input for PO ${order.order_number}`
        });
      }

      journalLines.push({
        account_id: apAccountId,
        debit: 0,
        credit: grandTotal,
        description: `Payable for PO ${order.order_number}`,
        partner_type: 'supplier',
        partner_id: params.supplier_id
      });

      const journalDraft = await this.journalRepo.createDraft({
        date: params.date,
        reference_type: 'purchase_order',
        reference_id: order.id,
        source_document: order.order_number,
        narration: `Purchase order ${order.order_number} from supplier ${params.supplier_id}`,
        narration_ar: `أمر شراء رقم ${order.order_number}`,
        created_by: params.created_by || 'system',
        lines: journalLines
      });

      const journalEntry = await this.journalRepo.post(journalDraft.id, params.created_by || 'system');

      // Link journal to supplier invoice
      await this.purchasesRepo.postSupplierInvoice(supplierInvoice.id, journalEntry.id);

      return {
        order,
        invoice: {
          ...supplierInvoice,
          journal_entry_id: journalEntry.id
        },
        movements,
        journalEntry
      };
    });
  }

  // ============================================================================
  // 3. CUSTOMER PAYMENT WORKFLOW (Payment + AR Settlement + Cash/Bank Journal)
  // ============================================================================
  async processCustomerPaymentWorkflow(params: {
    customer_id: string;
    invoice_id?: string;
    amount: number;
    payment_method?: 'cash' | 'bank_transfer' | 'cheque';
    cash_account_id?: string;
    date: string;
    notes?: string;
    created_by?: string;
  }): Promise<{
    payment: Payment;
    invoice?: SalesInvoice;
    journalEntry: JournalEntry;
  }> {
    return await this.db.transaction(async () => {
      // 1. Post Double-Entry Journal Entry
      // Dr Cash/Bank (10101/10102)
      // Cr Accounts Receivable (10200)
      const cashAccountId = params.payment_method === 'bank_transfer'
        ? await this.getAccountIdByCode('10102', 'Bank Account (البنك)')
        : await this.getAccountIdByCode('10101', 'Cash on Hand (الصندوق)');
      const arAccountId = await this.getAccountIdByCode('10200', 'Accounts Receivable (العملاء)');

      const journalLines: CreateJournalEntryInput['lines'] = [
        {
          account_id: cashAccountId,
          debit: params.amount,
          credit: 0,
          description: `Customer payment receipt from ${params.customer_id}`
        },
        {
          account_id: arAccountId,
          debit: 0,
          credit: params.amount,
          description: `Settlement for customer ${params.customer_id}`,
          partner_type: 'customer',
          partner_id: params.customer_id
        }
      ];

      const journalDraft = await this.journalRepo.createDraft({
        date: params.date,
        reference_type: 'payment',
        reference_id: params.invoice_id,
        narration: `Customer payment of ${params.amount} from ${params.customer_id}`,
        narration_ar: `قبض دفعة من عميل بقيمة ${params.amount}`,
        created_by: params.created_by || 'system',
        lines: journalLines
      });

      const journalEntry = await this.journalRepo.post(journalDraft.id, params.created_by || 'system');

      // 2. Record Payment
      const payment = await this.paymentsRepo.recordPayment({
        payment_type: 'customer_payment',
        reference_entity: 'sales_invoice',
        reference_id: params.invoice_id,
        amount: params.amount,
        payment_method: params.payment_method || 'cash',
        cash_account_id: params.cash_account_id,
        date: params.date,
        notes: params.notes,
        journal_entry_id: journalEntry.id
      });

      // 3. Update Invoice balance if linked
      let updatedInvoice: SalesInvoice | undefined;
      if (params.invoice_id) {
        updatedInvoice = await this.salesRepo.updatePayment(params.invoice_id, params.amount);
      }

      return {
        payment,
        invoice: updatedInvoice,
        journalEntry
      };
    });
  }

  // ============================================================================
  // 4. SUPPLIER PAYMENT WORKFLOW (Payment + AP Settlement + Cash/Bank Journal)
  // ============================================================================
  async processSupplierPaymentWorkflow(params: {
    supplier_id: string;
    invoice_id?: string;
    amount: number;
    payment_method?: 'cash' | 'bank_transfer' | 'cheque';
    cash_account_id?: string;
    date: string;
    notes?: string;
    created_by?: string;
  }): Promise<{
    payment: Payment;
    invoice?: SupplierInvoice;
    journalEntry: JournalEntry;
  }> {
    return await this.db.transaction(async () => {
      // 1. Post Double-Entry Journal Entry
      // Dr Accounts Payable (20100)
      // Cr Cash/Bank (10101/10102)
      const apAccountId = await this.getAccountIdByCode('20100', 'Accounts Payable (الموردون)');
      const cashAccountId = params.payment_method === 'bank_transfer'
        ? await this.getAccountIdByCode('10102', 'Bank Account (البنك)')
        : await this.getAccountIdByCode('10101', 'Cash on Hand (الصندوق)');

      const journalLines: CreateJournalEntryInput['lines'] = [
        {
          account_id: apAccountId,
          debit: params.amount,
          credit: 0,
          description: `Settlement for supplier ${params.supplier_id}`,
          partner_type: 'supplier',
          partner_id: params.supplier_id
        },
        {
          account_id: cashAccountId,
          debit: 0,
          credit: params.amount,
          description: `Disbursement to supplier ${params.supplier_id}`
        }
      ];

      const journalDraft = await this.journalRepo.createDraft({
        date: params.date,
        reference_type: 'payment',
        reference_id: params.invoice_id,
        narration: `Supplier payment of ${params.amount} to ${params.supplier_id}`,
        narration_ar: `صرف دفعة لمورد بقيمة ${params.amount}`,
        created_by: params.created_by || 'system',
        lines: journalLines
      });

      const journalEntry = await this.journalRepo.post(journalDraft.id, params.created_by || 'system');

      // 2. Record Payment
      const payment = await this.paymentsRepo.recordPayment({
        payment_type: 'supplier_payment',
        reference_entity: 'supplier_invoice',
        reference_id: params.invoice_id,
        amount: params.amount,
        payment_method: params.payment_method || 'cash',
        cash_account_id: params.cash_account_id,
        date: params.date,
        notes: params.notes,
        journal_entry_id: journalEntry.id
      });

      // 3. Update Supplier Invoice balance if linked
      let updatedInvoice: SupplierInvoice | undefined;
      if (params.invoice_id) {
        updatedInvoice = await this.purchasesRepo.updateSupplierInvoicePayment(params.invoice_id, params.amount);
      }

      return {
        payment,
        invoice: updatedInvoice,
        journalEntry
      };
    });
  }

  // ============================================================================
  // 5. INVENTORY ADJUSTMENT WORKFLOW (Adjustment + Stock Balance + Gain/Loss Journal)
  // ============================================================================
  async processInventoryAdjustmentWorkflow(params: {
    product_id: string;
    warehouse_id: string;
    direction: 'in' | 'out';
    quantity: number;
    unit_cost?: number;
    reason: string;
    date: string;
    created_by?: string;
  }): Promise<{
    movement: StockMovement;
    journalEntry: JournalEntry;
  }> {
    return await this.db.transaction(async () => {
      const balance = await this.stockRepo.getBalance(params.product_id, params.warehouse_id);
      const cost = params.unit_cost !== undefined ? params.unit_cost : (balance?.average_cost || 0);
      const totalCost = params.quantity * cost;

      const movement = await this.stockRepo.recordMovement({
        product_id: params.product_id,
        warehouse_id: params.warehouse_id,
        movement_type: params.direction === 'in' ? 'adjustment_in' : 'adjustment_out',
        direction: params.direction,
        quantity: params.quantity,
        unit_cost: cost,
        total_cost: totalCost,
        notes: params.reason,
        created_by: params.created_by || 'system'
      });

      const inventoryAccountId = await this.getAccountIdByCode('10300', 'Inventory (المخزون)');
      const adjustmentExpenseAccountId = await this.getAccountIdByCode('50300', 'Inventory Adjustment Loss (خسائر جرد)');
      const adjustmentGainAccountId = await this.getAccountIdByCode('40300', 'Inventory Adjustment Gain (أرباح جرد)');

      let journalLines: CreateJournalEntryInput['lines'] = [];
      if (params.direction === 'in') {
        // Gain: Dr Inventory, Cr Adjustment Gain
        journalLines = [
          { account_id: inventoryAccountId, debit: totalCost, credit: 0, description: `Inventory adjustment in (${params.reason})` },
          { account_id: adjustmentGainAccountId, debit: 0, credit: totalCost, description: `Inventory adjustment gain (${params.reason})` }
        ];
      } else {
        // Loss: Dr Adjustment Loss, Cr Inventory
        journalLines = [
          { account_id: adjustmentExpenseAccountId, debit: totalCost, credit: 0, description: `Inventory adjustment loss (${params.reason})` },
          { account_id: inventoryAccountId, debit: 0, credit: totalCost, description: `Inventory adjustment out (${params.reason})` }
        ];
      }

      const journalDraft = await this.journalRepo.createDraft({
        date: params.date,
        reference_type: 'inventory_adjustment',
        reference_id: movement.id,
        narration: `Stock Adjustment (${params.direction}): ${params.reason}`,
        narration_ar: `تسوية مخزون (${params.direction === 'in' ? 'زيادة' : 'عجز'}): ${params.reason}`,
        created_by: params.created_by || 'system',
        lines: journalLines
      });

      const journalEntry = await this.journalRepo.post(journalDraft.id, params.created_by || 'system');

      return {
        movement,
        journalEntry
      };
    });
  }
}
