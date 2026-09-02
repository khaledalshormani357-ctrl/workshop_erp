// ============================================================================
// Workshop ERP - Sales Transaction Service
// Orchestrates Sales Invoices with Inventory and Double-Entry Accounting
// ============================================================================

import { DatabaseService } from '../db/databaseService';
import { SalesRepository } from '../repositories/SalesRepository';
import { StockRepository } from '../repositories/StockRepository';
import { JournalEntriesRepository } from '../repositories/JournalEntriesRepository';
import { PaymentsRepository } from '../repositories/PaymentsRepository';
import { ChartOfAccountsRepository } from '../repositories/ChartOfAccountsRepository';
import { SyncOutboxRepository } from '../repositories/SyncOutboxRepository';

export class SalesTransactionService {
  private db = DatabaseService.getInstance();
  private salesRepo = new SalesRepository();
  private stockRepo = new StockRepository();
  private journalRepo = new JournalEntriesRepository();
  private paymentsRepo = new PaymentsRepository();
  private accountsRepo = new ChartOfAccountsRepository();
  private outboxRepo = new SyncOutboxRepository();

  private generateUUID(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Complete sales invoice creation:
   * - Create sales invoice with lines
   * - Deduct stock (movement_type: 'sale_delivery')
   * - Post double-entry journal (AR debit / Revenue credit + Tax credit)
   * - Mark invoice as posted in atomic transaction
   */
  async createSaleInvoice(params: {
    customer_id: string;
    date: string;
    due_date?: string;
    notes?: string;
    created_by?: string;
    warehouse_id: string;
    lines: Array<{
      product_id: string;
      quantity: number;
      unit_price: number;
      discount?: number;
      tax_rate?: number;
      description?: string;
    }>;
  }): Promise<{ invoice: any; journal_entry_id: string }> {
    return await this.db.transaction(async () => {
      const tenantId = this.db.getTenantId();

      // 1. Create Sales Invoice
      const invoice = await this.salesRepo.createInvoice({
        customer_id: params.customer_id,
        date: params.date,
        due_date: params.due_date,
        notes: params.notes,
        lines: params.lines,
      });

      // 2. Issue stock movements for stockable products
      for (const line of params.lines) {
        const balance = await this.stockRepo.getBalance(line.product_id, params.warehouse_id);
        const currentQty = balance ? Number(balance.quantity) : 0;
        if (currentQty < line.quantity) {
          throw new Error('INSUFFICIENT_STOCK');
        }
        await this.stockRepo.recordMovement({
          product_id: line.product_id,
          warehouse_id: params.warehouse_id,
          movement_type: 'sale_delivery',
          direction: 'out',
          quantity: line.quantity,
          unit_cost: balance ? balance.average_cost : 0,
          reference_entity: 'sales_invoice',
          reference_id: invoice.id,
          notes: `Sale invoice ${invoice.invoice_number}`,
          created_by: params.created_by,
        });
      }

      // 3. Create & Post Journal Entry
      const accountsReceivable = await this.accountsRepo.findByCode('10300');
      const salesRevenue = await this.accountsRepo.findByCode('40100');
      const taxPayable = await this.accountsRepo.findByCode('20200');

      if (!accountsReceivable || !salesRevenue) {
        throw new Error('ACCOUNT_NOT_FOUND');
      }

      const linesForJournal: any[] = [
        {
          account_id: accountsReceivable.id,
          debit: invoice.grand_total,
          credit: 0,
          description: `Invoice ${invoice.invoice_number}`,
          partner_type: 'customer',
          partner_id: params.customer_id,
        },
        {
          account_id: salesRevenue.id,
          debit: 0,
          credit: invoice.subtotal - (invoice.discount_total || 0),
          description: `Revenue for ${invoice.invoice_number}`,
        },
      ];

      if (invoice.tax_total > 0 && taxPayable) {
        linesForJournal.push({
          account_id: taxPayable.id,
          debit: 0,
          credit: invoice.tax_total,
          description: `Tax for ${invoice.invoice_number}`,
        });
      }

      const journalEntry = await this.journalRepo.createDraft({
        date: invoice.date,
        reference_type: 'sales_invoice',
        reference_id: invoice.id,
        source_document: 'Sales Invoice',
        narration: `Sale invoice ${invoice.invoice_number}`,
        narration_ar: `فاتورة مبيعات ${invoice.invoice_number}`,
        created_by: params.created_by || 'system',
        lines: linesForJournal,
      });

      await this.journalRepo.post(journalEntry.id, params.created_by || 'system');

      // 4. Update invoice with journal link
      await this.db.run(
        `UPDATE sales_invoices SET journal_entry_id = ?, status = 'posted', payment_status = 'unpaid', updated_at = ? WHERE id = ? AND tenant_id = ?`,
        [journalEntry.id, new Date().toISOString(), invoice.id, tenantId]
      );

      await this.outboxRepo.queueSync('sales_invoices', invoice.id, 'UPDATE', {
        id: invoice.id,
        journal_entry_id: journalEntry.id,
        status: 'posted',
      });

      const updatedInvoice = await this.salesRepo.findById(invoice.id);
      return { invoice: updatedInvoice, journal_entry_id: journalEntry.id };
    });
  }

  /**
   * Record Customer Payment with cash account & journal entry
   */
  async recordCustomerPayment(params: {
    customer_id: string;
    invoice_id: string;
    amount: number;
    payment_method: 'cash' | 'bank_transfer' | 'cheque';
    cash_account_id: string;
    date: string;
    notes?: string;
    created_by?: string;
  }): Promise<{ payment: any; journal_entry_id: string }> {
    return await this.db.transaction(async () => {
      const tenantId = this.db.getTenantId();

      const cashAccount = await this.accountsRepo.findById(params.cash_account_id);
      const accountsReceivable = await this.accountsRepo.findByCode('10300');
      if (!cashAccount || !accountsReceivable) {
        throw new Error('ACCOUNT_NOT_FOUND');
      }

      const journalEntry = await this.journalRepo.createDraft({
        date: params.date,
        reference_type: 'payment',
        reference_id: params.invoice_id,
        source_document: 'Customer Payment',
        narration: `Payment received for invoice ${params.invoice_id}`,
        narration_ar: `دفعة من عميل للفاتورة ${params.invoice_id}`,
        created_by: params.created_by || 'system',
        lines: [
          {
            account_id: cashAccount.id,
            debit: params.amount,
            credit: 0,
            description: 'Cash receipt',
          },
          {
            account_id: accountsReceivable.id,
            debit: 0,
            credit: params.amount,
            description: `Customer payment - invoice ${params.invoice_id}`,
            partner_type: 'customer',
            partner_id: params.customer_id,
          },
        ],
      });

      await this.journalRepo.post(journalEntry.id, params.created_by || 'system');

      const payment = await this.paymentsRepo.recordPayment({
        payment_type: 'customer_payment',
        reference_entity: 'sales_invoice',
        reference_id: params.invoice_id,
        amount: params.amount,
        payment_method: params.payment_method,
        cash_account_id: params.cash_account_id,
        date: params.date,
        notes: params.notes,
        journal_entry_id: journalEntry.id,
      });

      // Update invoice payment balance
      const invoice = await this.salesRepo.findById(params.invoice_id);
      if (invoice) {
        const newPaidAmount = (invoice.paid_amount || 0) + params.amount;
        const newBalance = invoice.grand_total - newPaidAmount;
        let newStatus = invoice.status;
        let newPaymentStatus = invoice.payment_status;
        if (newBalance <= 0) {
          newPaymentStatus = 'paid';
          newStatus = 'paid';
        } else {
          newPaymentStatus = 'partially_paid';
          newStatus = 'partially_paid';
        }
        await this.db.run(
          `UPDATE sales_invoices SET paid_amount = ?, balance = ?, status = ?, payment_status = ?, updated_at = ?, sync_status = 'pending', sync_version = sync_version + 1 WHERE id = ? AND tenant_id = ?`,
          [newPaidAmount, newBalance, newStatus, newPaymentStatus, new Date().toISOString(), params.invoice_id, tenantId]
        );
        await this.outboxRepo.queueSync('sales_invoices', params.invoice_id, 'UPDATE', {
          id: params.invoice_id,
          paid_amount: newPaidAmount,
          balance: newBalance,
          status: newStatus,
          payment_status: newPaymentStatus,
        });
      }

      return { payment, journal_entry_id: journalEntry.id };
    });
  }
}
