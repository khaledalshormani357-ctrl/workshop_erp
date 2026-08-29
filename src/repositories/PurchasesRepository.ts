// ============================================================================
// Workshop ERP - Purchases Repository (Phase 3 Purchase Orders & Supplier Bills)
// ============================================================================

import { DatabaseService } from '../db/databaseService';
import { PurchaseOrder, PurchaseOrderLine, SupplierInvoice, PurchaseOrderStatus, InvoiceStatus, PaymentStatus } from '../db/types';
import { SyncOutboxRepository } from './SyncOutboxRepository';

export interface CreatePurchaseOrderInput {
  supplier_id: string;
  order_number?: string;
  date: string;
  expected_date?: string;
  status?: PurchaseOrderStatus;
  notes?: string;
  lines: {
    product_id?: string;
    description?: string;
    quantity: number;
    unit_price: number;
    tax_rate?: number;
    line_order?: number;
  }[];
}

export interface CreateSupplierInvoiceInput {
  supplier_id: string;
  purchase_order_id?: string;
  invoice_number?: string;
  date: string;
  due_date?: string;
  status?: InvoiceStatus;
  payment_status?: PaymentStatus;
  subtotal?: number;
  tax_total?: number;
  grand_total?: number;
  notes?: string;
  journal_entry_id?: string;
}

export class PurchasesRepository {
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

  private async generatePONumber(): Promise<string> {
    const tenantId = this.db.getTenantId();
    const year = new Date().getFullYear();
    const prefix = `PO-${year}-`;
    const last = await this.db.queryOne<{ order_number: string; po_number: string }>(
      `SELECT COALESCE(order_number, po_number) as num FROM purchase_orders WHERE tenant_id = ? AND (order_number LIKE ? OR po_number LIKE ?) ORDER BY created_at DESC LIMIT 1`,
      [tenantId, `${prefix}%`, `${prefix}%`]
    );
    if (!last || !last.num) {
      return `${prefix}0001`;
    }
    const parts = last.num.split('-');
    const seq = parseInt(parts[parts.length - 1], 10);
    const nextSeq = isNaN(seq) ? 1 : seq + 1;
    return `${prefix}${nextSeq.toString().padStart(4, '0')}`;
  }

  // ==========================================
  // PURCHASE ORDERS
  // ==========================================

  async createPurchaseOrder(input: CreatePurchaseOrderInput): Promise<PurchaseOrder & { lines: PurchaseOrderLine[] }> {
    return await this.db.transaction(async () => {
      const id = this.generateUUID();
      const tenantId = this.db.getTenantId();
      const now = new Date().toISOString();
      const orderNumber = input.order_number || (await this.generatePONumber());

      let subtotal = 0;
      let taxTotal = 0;

      const computedLines: PurchaseOrderLine[] = input.lines.map((line, idx) => {
        const lineId = this.generateUUID();
        const qty = Number(line.quantity);
        const price = Number(line.unit_price);
        const taxRate = Number(line.tax_rate || 0);

        const lineSubtotal = qty * price;
        const lineTax = lineSubtotal * taxRate;
        const lineTotal = lineSubtotal + lineTax;

        subtotal += lineSubtotal;
        taxTotal += lineTax;

        return {
          id: lineId,
          tenant_id: tenantId,
          purchase_order_id: id,
          product_id: line.product_id || undefined,
          description: line.description,
          quantity: qty,
          quantity_received: 0,
          unit_price: price,
          tax_rate: taxRate,
          total: lineTotal,
          line_order: line.line_order !== undefined ? line.line_order : (idx + 1)
        };
      });

      const grandTotal = subtotal + taxTotal;
      const status: PurchaseOrderStatus = input.status || 'draft';

      const order: PurchaseOrder = {
        id,
        tenant_id: tenantId,
        supplier_id: input.supplier_id,
        order_number: orderNumber,
        date: input.date,
        expected_date: input.expected_date,
        status,
        subtotal,
        tax_total: taxTotal,
        grand_total: grandTotal,
        notes: input.notes,
        sync_status: 'pending',
        sync_version: 1,
        created_at: now,
        updated_at: now,
        deleted_at: null
      };

      const poSql = `
        INSERT INTO purchase_orders (
          id, tenant_id, supplier_id, order_number, po_number, date, order_date,
          expected_date, expected_delivery_date, status, subtotal, tax_total,
          tax_amount, grand_total, total_amount, notes, sync_status, sync_version,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await this.db.run(poSql, [
        order.id,
        order.tenant_id,
        order.supplier_id,
        order.order_number,
        order.order_number,
        order.date,
        order.date,
        order.expected_date || null,
        order.expected_date || null,
        order.status,
        order.subtotal,
        order.tax_total,
        order.tax_total,
        order.grand_total,
        order.grand_total,
        order.notes || null,
        order.sync_status,
        order.sync_version,
        order.created_at,
        order.updated_at
      ]);

      for (const line of computedLines) {
        await this.db.run(
          `INSERT INTO purchase_order_lines (
            id, tenant_id, purchase_order_id, product_id, description, quantity,
            quantity_ordered, quantity_received, unit_cost, unit_price, tax_rate,
            tax_amount, subtotal, total, line_order, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            line.id,
            line.tenant_id,
            line.purchase_order_id,
            line.product_id || null,
            line.description || null,
            line.quantity,
            line.quantity,
            line.quantity_received,
            line.unit_price,
            line.unit_price,
            line.tax_rate,
            (line.quantity * line.unit_price * line.tax_rate),
            (line.quantity * line.unit_price),
            line.total,
            line.line_order,
            now
          ]
        );
      }

      await this.outboxRepo.queueSync('purchase_orders', order.id, 'INSERT', {
        ...order,
        lines: computedLines
      });

      return {
        ...order,
        lines: computedLines
      };
    });
  }

  async findPurchaseOrderById(id: string): Promise<(PurchaseOrder & { lines: PurchaseOrderLine[] }) | null> {
    const tenantId = this.db.getTenantId();
    const order = await this.db.queryOne<any>(
      `SELECT * FROM purchase_orders WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL`,
      [id, tenantId]
    );
    if (!order) return null;

    const lines = await this.db.query<PurchaseOrderLine>(
      `SELECT * FROM purchase_order_lines WHERE purchase_order_id = ? AND tenant_id = ? ORDER BY line_order ASC`,
      [id, tenantId]
    );

    return {
      ...order,
      order_number: order.order_number || order.po_number,
      date: order.date || order.order_date,
      expected_date: order.expected_date || order.expected_delivery_date,
      subtotal: Number(order.subtotal || 0),
      tax_total: Number(order.tax_total || order.tax_amount || 0),
      grand_total: Number(order.grand_total || order.total_amount || 0),
      lines
    };
  }

  async listPurchaseOrders(filter?: { supplierId?: string; status?: PurchaseOrderStatus }): Promise<PurchaseOrder[]> {
    const tenantId = this.db.getTenantId();
    let sql = `SELECT * FROM purchase_orders WHERE tenant_id = ? AND deleted_at IS NULL`;
    const params: any[] = [tenantId];

    if (filter?.supplierId) {
      sql += ` AND supplier_id = ?`;
      params.push(filter.supplierId);
    }
    if (filter?.status) {
      sql += ` AND status = ?`;
      params.push(filter.status);
    }

    sql += ` ORDER BY created_at DESC`;
    const rows = await this.db.query<any>(sql, params);
    return rows.map(order => ({
      ...order,
      order_number: order.order_number || order.po_number,
      date: order.date || order.order_date,
      expected_date: order.expected_date || order.expected_delivery_date,
      subtotal: Number(order.subtotal || 0),
      tax_total: Number(order.tax_total || order.tax_amount || 0),
      grand_total: Number(order.grand_total || order.total_amount || 0)
    }));
  }

  async updatePurchaseOrderStatus(id: string, status: PurchaseOrderStatus): Promise<boolean> {
    return await this.db.transaction(async () => {
      const order = await this.findPurchaseOrderById(id);
      if (!order) return false;

      const tenantId = this.db.getTenantId();
      const now = new Date().toISOString();

      await this.db.run(
        `UPDATE purchase_orders SET status = ?, sync_status = 'pending', sync_version = sync_version + 1, updated_at = ? WHERE id = ? AND tenant_id = ?`,
        [status, now, id, tenantId]
      );

      await this.outboxRepo.queueSync('purchase_orders', id, 'UPDATE', { id, status, updated_at: now });
      return true;
    });
  }

  // ==========================================
  // SUPPLIER INVOICES (BILLS)
  // ==========================================

  async createSupplierInvoice(input: CreateSupplierInvoiceInput): Promise<SupplierInvoice> {
    return await this.db.transaction(async () => {
      const id = this.generateUUID();
      const tenantId = this.db.getTenantId();
      const now = new Date().toISOString();

      const subtotal = Number(input.subtotal || 0);
      const taxTotal = Number(input.tax_total || 0);
      const grandTotal = Number(input.grand_total !== undefined ? input.grand_total : subtotal + taxTotal);
      const status: InvoiceStatus = input.status || 'draft';
      const paymentStatus: PaymentStatus = input.payment_status || 'unpaid';

      const invoice: SupplierInvoice = {
        id,
        tenant_id: tenantId,
        supplier_id: input.supplier_id,
        purchase_order_id: input.purchase_order_id,
        invoice_number: input.invoice_number,
        date: input.date,
        due_date: input.due_date,
        status,
        payment_status: paymentStatus,
        subtotal,
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

      const sql = `
        INSERT INTO supplier_invoices (
          id, tenant_id, supplier_id, purchase_order_id, invoice_number, date,
          due_date, status, payment_status, subtotal, tax_total, grand_total,
          paid_amount, balance, notes, journal_entry_id, sync_status, sync_version,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await this.db.run(sql, [
        invoice.id,
        invoice.tenant_id,
        invoice.supplier_id,
        invoice.purchase_order_id || null,
        invoice.invoice_number || null,
        invoice.date,
        invoice.due_date || null,
        invoice.status,
        invoice.payment_status,
        invoice.subtotal,
        invoice.tax_total,
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

      await this.outboxRepo.queueSync('supplier_invoices', invoice.id, 'INSERT', invoice);
      return invoice;
    });
  }

  async findSupplierInvoiceById(id: string): Promise<SupplierInvoice | null> {
    const tenantId = this.db.getTenantId();
    return this.db.queryOne<SupplierInvoice>(
      `SELECT * FROM supplier_invoices WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL`,
      [id, tenantId]
    );
  }

  async listSupplierInvoices(filter?: { supplierId?: string; status?: InvoiceStatus }): Promise<SupplierInvoice[]> {
    const tenantId = this.db.getTenantId();
    let sql = `SELECT * FROM supplier_invoices WHERE tenant_id = ? AND deleted_at IS NULL`;
    const params: any[] = [tenantId];

    if (filter?.supplierId) {
      sql += ` AND supplier_id = ?`;
      params.push(filter.supplierId);
    }
    if (filter?.status) {
      sql += ` AND status = ?`;
      params.push(filter.status);
    }

    sql += ` ORDER BY created_at DESC`;
    return this.db.query<SupplierInvoice>(sql, params);
  }

  async postSupplierInvoice(id: string, journalEntryId?: string): Promise<SupplierInvoice> {
    return await this.db.transaction(async () => {
      const invoice = await this.findSupplierInvoiceById(id);
      if (!invoice) {
        throw new Error(`Supplier Invoice with ID ${id} not found.`);
      }
      if (invoice.status === 'posted') {
        return invoice;
      }

      const tenantId = this.db.getTenantId();
      const now = new Date().toISOString();

      await this.db.run(
        `UPDATE supplier_invoices SET
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

      await this.outboxRepo.queueSync('supplier_invoices', id, 'UPDATE', updated);
      return updated;
    });
  }

  async updateSupplierInvoicePayment(id: string, paidAmount: number): Promise<SupplierInvoice> {
    return await this.db.transaction(async () => {
      const invoice = await this.findSupplierInvoiceById(id);
      if (!invoice) {
        throw new Error(`Supplier Invoice with ID ${id} not found.`);
      }

      const tenantId = this.db.getTenantId();
      const now = new Date().toISOString();
      const newPaid = Number(invoice.paid_amount || 0) + Number(paidAmount);
      const newBalance = Math.max(0, Number(invoice.grand_total) - newPaid);
      const paymentStatus: PaymentStatus = newBalance === 0 ? 'paid' : newPaid > 0 ? 'partially_paid' : 'unpaid';

      await this.db.run(
        `UPDATE supplier_invoices SET
          paid_amount = ?,
          balance = ?,
          payment_status = ?,
          sync_status = 'pending',
          sync_version = sync_version + 1,
          updated_at = ?
        WHERE id = ? AND tenant_id = ?`,
        [newPaid, newBalance, paymentStatus, now, id, tenantId]
      );

      const updated: SupplierInvoice = {
        ...invoice,
        paid_amount: newPaid,
        balance: newBalance,
        payment_status: paymentStatus,
        updated_at: now
      };

      await this.outboxRepo.queueSync('supplier_invoices', id, 'UPDATE', updated);
      return updated;
    });
  }
}

// Backward compatibility export alias
export { PurchasesRepository as PurchaseOrdersRepository };
