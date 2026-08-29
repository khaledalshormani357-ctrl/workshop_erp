// ============================================================================
// Workshop ERP - Sales Repository (Phase 3 Sales & Invoicing Module)
// ============================================================================

import { DatabaseService } from '../db/databaseService';
import { SalesInvoice, SaleInvoiceLine, InvoiceStatus, PaymentStatus } from '../db/types';
import { SyncOutboxRepository } from './SyncOutboxRepository';

export interface CreateInvoiceInput {
  customer_id: string;
  invoice_number?: string;
  date: string;
  due_date?: string;
  status?: InvoiceStatus;
  payment_status?: PaymentStatus;
  notes?: string;
  journal_entry_id?: string;
  lines: {
    product_id?: string;
    description?: string;
    quantity: number;
    unit_price: number;
    discount?: number;
    tax_rate?: number;
    line_order?: number;
  }[];
}

export class SalesRepository {
  private db = DatabaseService.getInstance();
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

  private async generateInvoiceNumber(): Promise<string> {
    const tenantId = this.db.getTenantId();
    const year = new Date().getFullYear();
    const prefix = `INV-${year}-`;
    const last = await this.db.queryOne<{ invoice_number: string }>(
      `SELECT invoice_number FROM sales_invoices WHERE tenant_id = ? AND invoice_number LIKE ? ORDER BY created_at DESC LIMIT 1`,
      [tenantId, `${prefix}%`]
    );
    if (!last || !last.invoice_number) {
      return `${prefix}0001`;
    }
    const parts = last.invoice_number.split('-');
    const seq = parseInt(parts[parts.length - 1], 10);
    const nextSeq = isNaN(seq) ? 1 : seq + 1;
    return `${prefix}${nextSeq.toString().padStart(4, '0')}`;
  }

  async createInvoice(input: CreateInvoiceInput): Promise<SalesInvoice & { lines: SaleInvoiceLine[] }> {
    return await this.db.transaction(async () => {
      const id = this.generateUUID();
      const tenantId = this.db.getTenantId();
      const now = new Date().toISOString();
      const invoiceNumber = input.invoice_number || (await this.generateInvoiceNumber());

      let subtotal = 0;
      let discountTotal = 0;
      let taxTotal = 0;

      // 1. Prepare invoice lines
      const computedLines: SaleInvoiceLine[] = input.lines.map((line, idx) => {
        const lineId = this.generateUUID();
        const qty = Number(line.quantity);
        const price = Number(line.unit_price);
        const disc = Number(line.discount || 0);
        const taxRate = Number(line.tax_rate || 0);

        const lineSubtotal = (qty * price) - disc;
        const lineTax = lineSubtotal * taxRate;
        const lineTotal = lineSubtotal + lineTax;

        subtotal += (qty * price);
        discountTotal += disc;
        taxTotal += lineTax;

        return {
          id: lineId,
          tenant_id: tenantId,
          invoice_id: id,
          product_id: line.product_id || undefined,
          description: line.description,
          quantity: qty,
          unit_price: price,
          discount: disc,
          tax_rate: taxRate,
          total: lineTotal,
          line_order: line.line_order !== undefined ? line.line_order : (idx + 1)
        };
      });

      const grandTotal = (subtotal - discountTotal) + taxTotal;
      const status: InvoiceStatus = input.status || 'draft';
      const paymentStatus: PaymentStatus = input.payment_status || 'unpaid';

      const invoice: SalesInvoice = {
        id,
        tenant_id: tenantId,
        customer_id: input.customer_id,
        invoice_number: invoiceNumber,
        date: input.date,
        due_date: input.due_date,
        status,
        payment_status: paymentStatus,
        subtotal,
        discount_total: discountTotal,
        tax_total: taxTotal,
        grand_total: grandTotal,
        paid_amount: 0,
        balance: grandTotal,
        notes: input.notes,
        journal_entry_id: input.journal_entry_id,
        sync_status: 'pending',
        sync_version: 1,
        created_at: now,
        updated_at: now,
        deleted_at: null
      };

      // 2. Insert Invoice
      const invoiceSql = `
        INSERT INTO sales_invoices (
          id, tenant_id, customer_id, invoice_number, date, issue_date, due_date,
          status, payment_status, subtotal, discount_total, discount_amount,
          tax_total, tax_amount, grand_total, total_amount, paid_amount, balance,
          notes, journal_entry_id, sync_status, sync_version, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await this.db.run(invoiceSql, [
        invoice.id,
        invoice.tenant_id,
        invoice.customer_id,
        invoice.invoice_number,
        invoice.date,
        invoice.date,
        invoice.due_date || null,
        invoice.status,
        invoice.payment_status,
        invoice.subtotal,
        invoice.discount_total,
        invoice.discount_total,
        invoice.tax_total,
        invoice.tax_total,
        invoice.grand_total,
        invoice.grand_total,
        invoice.paid_amount,
        invoice.balance,
        invoice.notes || null,
        invoice.journal_entry_id || null,
        invoice.sync_status,
        invoice.sync_version,
        invoice.created_at,
        invoice.updated_at
      ]);

      // 3. Insert Lines
      for (const line of computedLines) {
        await this.db.run(
          `INSERT INTO sale_invoice_lines (
            id, tenant_id, invoice_id, product_id, description, quantity, unit_price,
            discount, tax_rate, total, line_order
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            line.id,
            line.tenant_id,
            line.invoice_id,
            line.product_id || null,
            line.description || null,
            line.quantity,
            line.unit_price,
            line.discount,
            line.tax_rate,
            line.total,
            line.line_order
          ]
        );
      }

      // 4. Queue Outbox Event
      await this.outboxRepo.queueSync('sales_invoices', invoice.id, 'INSERT', {
        ...invoice,
        lines: computedLines
      });

      return {
        ...invoice,
        lines: computedLines
      };
    });
  }

  async findById(id: string): Promise<(SalesInvoice & { lines: SaleInvoiceLine[] }) | null> {
    const tenantId = this.db.getTenantId();
    const invoice = await this.db.queryOne<any>(
      `SELECT * FROM sales_invoices WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL`,
      [id, tenantId]
    );
    if (!invoice) return null;

    const lines = await this.db.query<SaleInvoiceLine>(
      `SELECT * FROM sale_invoice_lines WHERE invoice_id = ? AND tenant_id = ? ORDER BY line_order ASC`,
      [id, tenantId]
    );

    return {
      ...invoice,
      lines
    };
  }

  async list(filter?: { customerId?: string; status?: InvoiceStatus }): Promise<SalesInvoice[]> {
    const tenantId = this.db.getTenantId();
    let sql = `SELECT * FROM sales_invoices WHERE tenant_id = ? AND deleted_at IS NULL`;
    const params: any[] = [tenantId];

    if (filter?.customerId) {
      sql += ` AND customer_id = ?`;
      params.push(filter.customerId);
    }
    if (filter?.status) {
      sql += ` AND status = ?`;
      params.push(filter.status);
    }

    sql += ` ORDER BY created_at DESC`;
    return this.db.query<SalesInvoice>(sql, params);
  }

  async postInvoice(id: string, journalEntryId?: string): Promise<SalesInvoice> {
    return await this.db.transaction(async () => {
      const invoice = await this.findById(id);
      if (!invoice) {
        throw new Error(`Invoice with ID ${id} not found.`);
      }
      if (invoice.status === 'posted') {
        return invoice;
      }

      const tenantId = this.db.getTenantId();
      const now = new Date().toISOString();

      await this.db.run(
        `UPDATE sales_invoices SET
          status = 'posted',
          journal_entry_id = COALESCE(?, journal_entry_id),
          sync_status = 'pending',
          sync_version = sync_version + 1,
          updated_at = ?
        WHERE id = ? AND tenant_id = ?`,
        [journalEntryId || null, now, id, tenantId]
      );

      const updated = {
        ...invoice,
        status: 'posted' as InvoiceStatus,
        journal_entry_id: journalEntryId || invoice.journal_entry_id,
        updated_at: now
      };

      await this.outboxRepo.queueSync('sales_invoices', id, 'UPDATE', updated);
      return updated;
    });
  }

  async updatePayment(id: string, paidAmount: number): Promise<SalesInvoice> {
    return await this.db.transaction(async () => {
      const invoice = await this.findById(id);
      if (!invoice) {
        throw new Error(`Invoice with ID ${id} not found.`);
      }

      const tenantId = this.db.getTenantId();
      const now = new Date().toISOString();
      const newPaid = Number(invoice.paid_amount || 0) + Number(paidAmount);
      const newBalance = Math.max(0, Number(invoice.grand_total) - newPaid);
      const paymentStatus: PaymentStatus = newBalance === 0 ? 'paid' : newPaid > 0 ? 'partially_paid' : 'unpaid';

      await this.db.run(
        `UPDATE sales_invoices SET
          paid_amount = ?,
          balance = ?,
          payment_status = ?,
          sync_status = 'pending',
          sync_version = sync_version + 1,
          updated_at = ?
        WHERE id = ? AND tenant_id = ?`,
        [newPaid, newBalance, paymentStatus, now, id, tenantId]
      );

      const updated: SalesInvoice = {
        ...invoice,
        paid_amount: newPaid,
        balance: newBalance,
        payment_status: paymentStatus,
        updated_at: now
      };

      await this.outboxRepo.queueSync('sales_invoices', id, 'UPDATE', updated);
      return updated;
    });
  }
}

// Backward compatibility export alias
export { SalesRepository as SalesInvoicesRepository };
