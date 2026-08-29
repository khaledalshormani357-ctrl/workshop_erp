// ============================================================================
// Workshop ERP - Atomic Transaction Workflow Service (ACID Multi-Table Workflows)
// Ensures Invoices, Inventory Movements & Journal Entries execute atomically
// ============================================================================

import { DatabaseService } from './databaseService';
import {
  SalesInvoicesRepository,
  PurchaseOrdersRepository,
  JournalEntriesRepository,
  StockMovementsRepository,
  SyncOutboxRepository,
  AuditLogsRepository
} from './repositories';
import { SalesInvoiceEntity, SalesInvoiceLineEntity, PurchaseOrderEntity, PurchaseOrderLineEntity } from './types';

export class TransactionService {
  private db: DatabaseService;
  private salesRepo: SalesInvoicesRepository;
  private purchaseRepo: PurchaseOrdersRepository;
  private journalRepo: JournalEntriesRepository;
  private stockRepo: StockMovementsRepository;
  private outboxRepo: SyncOutboxRepository;
  private auditRepo: AuditLogsRepository;

  constructor() {
    this.db = DatabaseService.getInstance();
    this.salesRepo = new SalesInvoicesRepository();
    this.purchaseRepo = new PurchaseOrdersRepository();
    this.journalRepo = new JournalEntriesRepository();
    this.stockRepo = new StockMovementsRepository();
    this.outboxRepo = new SyncOutboxRepository();
    this.auditRepo = new AuditLogsRepository();
  }

  /**
   * Atomic Sales Invoice Workflow:
   * 1. Inserts Sales Invoice & Lines
   * 2. Logs Stock Movements (sales_issue out)
   * 3. Posts Balanced Double-Entry Journal Voucher (Dr: AR 10300, Cr: Revenue 40100, Cr: Tax 20200)
   * 4. Enqueues Outbox Sync & Audit Trail
   * ALL executed inside a single ACID Transaction.
   */
  async createSalesInvoiceWithInventoryAndJournal(params: {
    invoice: Omit<SalesInvoiceEntity, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>;
    lines: Omit<SalesInvoiceLineEntity, 'id' | 'tenant_id' | 'invoice_id' | 'created_at'>[];
    warehouseId: string;
    arAccountId?: string; // Default: 10300 (Accounts Receivable)
    revenueAccountId?: string; // Default: 40100 (Sales Revenue)
    taxAccountId?: string; // Default: 20200 (Output Tax Payable)
    cogsAccountId?: string; // Default: 50100 (COGS)
    inventoryAccountId?: string; // Default: 10510 (Inventory)
  }): Promise<{ invoice: SalesInvoiceEntity; journalEntryId: string }> {
    const tid = this.db.getTenantId();
    const arAcc = params.arAccountId || 'acc-10300';
    const revAcc = params.revenueAccountId || 'acc-40100';
    const taxAcc = params.taxAccountId || 'acc-20200';

    return await this.db.transaction(async () => {
      // 1. Post balanced journal entry first to link to invoice
      const journalResult = await this.journalRepo.postEntry(
        {
          date: params.invoice.issue_date,
          reference_type: 'sales_invoice',
          narration: `Sales Invoice ${params.invoice.invoice_number} for customer ${params.invoice.customer_id}`,
          narration_ar: `فاتورة مبيعات رقم ${params.invoice.invoice_number}`,
          source_document: params.invoice.invoice_number,
          created_by: params.invoice.created_by,
          lines: [
            {
              account_id: arAcc,
              debit: params.invoice.total_amount,
              credit: 0,
              description: `Receivable from invoice ${params.invoice.invoice_number}`,
              partner_type: 'customer',
              partner_id: params.invoice.customer_id
            },
            {
              account_id: revAcc,
              debit: 0,
              credit: params.invoice.subtotal,
              description: `Sales revenue for invoice ${params.invoice.invoice_number}`
            },
            ...(params.invoice.tax_amount > 0
              ? [
                  {
                    account_id: taxAcc,
                    debit: 0,
                    credit: params.invoice.tax_amount,
                    description: `5% Output sales tax for ${params.invoice.invoice_number}`
                  }
                ]
              : [])
          ]
        },
        tid
      );

      // 2. Create Invoice record with linked journal entry
      const { invoice } = await this.salesRepo.createWithLines(
        {
          ...params.invoice,
          journal_entry_id: journalResult.header.id
        },
        params.lines
      );

      // 3. Issue stock items from warehouse (sale_delivery)
      for (const line of params.lines) {
        await this.stockRepo.recordMovement(
          {
            product_id: line.product_id,
            warehouse_id: params.warehouseId,
            type: 'sale_delivery',
            direction: 'out',
            quantity: line.quantity,
            unit_cost: line.unit_price * 0.7, // Estimated cost factor
            total_cost: line.quantity * line.unit_price * 0.7,
            reference_type: 'sales_invoice',
            reference_id: invoice.id,
            notes: `Delivery for invoice ${invoice.invoice_number}`,
            created_by: params.invoice.created_by
          },
          tid
        );
      }

      // 4. Enqueue Sync Outbox & Audit Log
      await this.outboxRepo.queueSync('sales_invoices', invoice.id, 'INSERT', invoice, tid);
      await this.auditRepo.log(
        'CREATE',
        'sales_invoices',
        invoice.id,
        `Created Sales Invoice ${invoice.invoice_number} with Total ${invoice.total_amount} and Journal Entry ${journalResult.header.entry_number}`,
        `تم إنشاء فاتورة المبيعات ${invoice.invoice_number} وترحيل القيد المحاسبي وحركة المخزن`,
        'System Operator',
        tid
      );

      return { invoice, journalEntryId: journalResult.header.id };
    });
  }

  /**
   * Atomic Purchase Receipt Workflow:
   * 1. Inserts Purchase Order & Lines
   * 2. Logs Stock Movements (purchase_receipt in)
   * 3. Posts Balanced Double-Entry Journal Voucher (Dr: Inventory 10510, Cr: AP 20100)
   * 4. Enqueues Outbox Sync & Audit Trail
   */
  async createPurchaseReceiptWithInventoryAndJournal(params: {
    order?: Omit<PurchaseOrderEntity, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>;
    purchaseOrder?: Omit<PurchaseOrderEntity, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>;
    lines: Omit<PurchaseOrderLineEntity, 'id' | 'tenant_id' | 'purchase_order_id' | 'created_at'>[];
    warehouseId: string;
    apAccountId?: string; // Default: 20100 (Accounts Payable)
    inventoryAccountId?: string; // Default: 10510 (Raw Aluminium Inventory)
  }): Promise<{ order: PurchaseOrderEntity; purchaseOrder: PurchaseOrderEntity; journalEntryId: string }> {
    const tid = this.db.getTenantId();
    const apAcc = params.apAccountId || 'acc-20100';
    const invAcc = params.inventoryAccountId || 'acc-10510';
    const targetOrder = (params.purchaseOrder || params.order)!;

    return await this.db.transaction(async () => {
      // 1. Post balanced journal entry
      const journalResult = await this.journalRepo.postEntry(
        {
          date: targetOrder.order_date,
          reference_type: 'purchase_order',
          narration: `Purchase Bill ${targetOrder.po_number} from supplier ${targetOrder.supplier_id}`,
          narration_ar: `فاتورة مشتريات وتوريد مخزني رقم ${targetOrder.po_number}`,
          source_document: targetOrder.po_number,
          created_by: targetOrder.created_by,
          lines: [
            {
              account_id: invAcc,
              debit: targetOrder.total_amount,
              credit: 0,
              description: `Stock receipt under PO ${targetOrder.po_number}`
            },
            {
              account_id: apAcc,
              debit: 0,
              credit: targetOrder.total_amount,
              description: `Payable for PO ${targetOrder.po_number}`,
              partner_type: 'supplier',
              partner_id: targetOrder.supplier_id
            }
          ]
        },
        tid
      );

      // 2. Create Purchase Order record with linked journal entry
      const { order } = await this.purchaseRepo.createWithLines(
        {
          ...targetOrder,
          journal_entry_id: journalResult.header.id
        },
        params.lines
      );

      // 3. Receive stock into warehouse
      for (const line of params.lines) {
        await this.stockRepo.recordMovement(
          {
            product_id: line.product_id,
            warehouse_id: params.warehouseId,
            type: 'purchase_receipt',
            direction: 'in',
            quantity: line.quantity_ordered,
            unit_cost: line.unit_cost,
            total_cost: line.total,
            reference_type: 'purchase_order',
            reference_id: order.id,
            notes: `Received stock under PO ${order.po_number}`,
            created_by: targetOrder.created_by
          },
          tid
        );
      }

      // 4. Enqueue Sync Outbox & Audit Log
      await this.outboxRepo.queueSync('purchase_orders', order.id, 'INSERT', order, tid);
      await this.auditRepo.log(
        'CREATE',
        'purchase_orders',
        order.id,
        `Created Purchase Order ${order.po_number} with Total ${order.total_amount} and Journal Entry ${journalResult.header.entry_number}`,
        `تم إنشاء أمر الشراء والتوريد ${order.po_number} وترحيل المخزون والقيد المحاسبي`,
        'System Operator',
        tid
      );

      return { order, purchaseOrder: order, journalEntryId: journalResult.header.id };
    });
  }

  async recordPaymentWithAccounting(params: {
    partnerId: string;
    partnerType: 'customer' | 'supplier';
    amount: number;
    paymentDate: string;
    referenceType?: string;
    referenceId?: string;
    cashAccountId?: string;
    contraAccountId?: string;
    paymentMethod?: string;
    createdBy?: string;
  }): Promise<{ journalEntryId: string }> {
    const tid = this.db.getTenantId();
    const isCustomer = params.partnerType === 'customer';
    const cashAcc = params.cashAccountId || 'acc-10100';
    const contraAcc = params.contraAccountId || (isCustomer ? 'acc-10300' : 'acc-20100');

    return await this.db.transaction(async () => {
      const journalLines = isCustomer
        ? [
            {
              account_id: cashAcc,
              debit: params.amount,
              credit: 0,
              description: `Receipt from customer ${params.partnerId}`
            },
            {
              account_id: contraAcc,
              debit: 0,
              credit: params.amount,
              description: `Settlement for customer ${params.partnerId}`,
              partner_type: 'customer' as const,
              partner_id: params.partnerId
            }
          ]
        : [
            {
              account_id: contraAcc,
              debit: params.amount,
              credit: 0,
              description: `Disbursement to supplier ${params.partnerId}`,
              partner_type: 'supplier' as const,
              partner_id: params.partnerId
            },
            {
              account_id: cashAcc,
              debit: 0,
              credit: params.amount,
              description: `Payment from cash/bank for supplier ${params.partnerId}`
            }
          ];

      const journalResult = await this.journalRepo.postEntry(
        {
          date: params.paymentDate,
          reference_type: params.referenceType || 'payment',
          reference_id: params.referenceId,
          narration: `Payment of ${params.amount} for ${params.partnerType} ${params.partnerId}`,
          narration_ar: `تسجيل دفعة بقيمة ${params.amount} للطرف ${params.partnerId}`,
          created_by: params.createdBy || 'usr-cashier-01',
          lines: journalLines
        },
        tid
      );

      return { journalEntryId: journalResult.header.id };
    });
  }
}

