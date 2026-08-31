import { DatabaseService } from '../db/databaseService';
import { Quotation, QuotationItem, QuotationRevision } from '../db/types';
import { SyncOutboxRepository } from './SyncOutboxRepository';

export class QuotationsRepository {
  private db = DatabaseService.getInstance();
  private outboxRepo = new SyncOutboxRepository();

  private generateUUID(): string {
    if (typeof crypto !== 'undefined' && (crypto as any).randomUUID) {
      return (crypto as any).randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  private async generateQuotationNumber(): Promise<string> {
    const tenantId = this.db.getTenantId();
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const prefix = `QUO-${year}${month}-`;
    const rows = await this.db.query<{ count: number }>(
      `SELECT COUNT(*) as count FROM quotations WHERE tenant_id = ? AND quotation_number LIKE ?`,
      [tenantId, `${prefix}%`]
    );
    const seq = (rows[0]?.count ?? 0) + 1;
    return `${prefix}${String(seq).padStart(5, '0')}`;
  }

  async createQuotation(params: {
    customer_id: string;
    project_id?: string;
    date: string;
    valid_until?: string;
    notes?: string;
    lines: Array<{
      product_id?: string;
      description?: string;
      quantity: number;
      unit_price: number;
      discount?: number;
      tax_rate?: number;
      line_order?: number;
    }>;
  }): Promise<{ quotation: Quotation; items: QuotationItem[] }> {
    return await this.db.transaction(async () => {
      const id = this.generateUUID();
      const tenantId = this.db.getTenantId();
      const quotation_number = await this.generateQuotationNumber();
      const now = new Date().toISOString();
      const revision = 1;

      let subtotal = 0;
      let discount_total = 0;
      let tax_total = 0;
      const itemsData: any[] = [];

      let lineOrder = 1;
      for (const line of params.lines) {
        const lineTotal = line.quantity * line.unit_price;
        const lineDiscount = line.discount || 0;
        const lineTax = (lineTotal - lineDiscount) * (line.tax_rate || 0);
        const finalTotal = lineTotal - lineDiscount + lineTax;
        subtotal += lineTotal;
        discount_total += lineDiscount;
        tax_total += lineTax;
        itemsData.push({
          id: this.generateUUID(),
          product_id: line.product_id ?? null,
          description: line.description ?? null,
          quantity: line.quantity,
          unit_price: line.unit_price,
          discount: line.discount ?? 0,
          tax_rate: line.tax_rate ?? 0,
          total: finalTotal,
          line_order: line.line_order ?? lineOrder,
        });
        lineOrder++;
      }

      const grand_total = subtotal - discount_total + tax_total;

      const sqlHeader = `
        INSERT INTO quotations (id, tenant_id, customer_id, project_id, quotation_number, revision, status, date, valid_until, subtotal, discount_total, tax_total, grand_total, notes, sync_status, sync_version, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, 'pending', 1, ?, ?)
      `;
      await this.db.run(sqlHeader, [
        id, tenantId, params.customer_id, params.project_id ?? null, quotation_number,
        revision, params.date, params.valid_until ?? null, subtotal, discount_total, tax_total,
        grand_total, params.notes ?? null, now, now
      ]);

      for (const item of itemsData) {
        const sqlItem = `
          INSERT INTO quotation_items (id, tenant_id, quotation_id, product_id, description, quantity, unit_price, discount, tax_rate, total, line_order)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        await this.db.run(sqlItem, [
          item.id, tenantId, id, item.product_id, item.description, item.quantity,
          item.unit_price, item.discount, item.tax_rate, item.total, item.line_order
        ]);
      }

      // حفظ المراجعة الأولى
      await this.saveRevision(id, revision, 'draft', subtotal, discount_total, tax_total, grand_total, params.notes);

      const quotation = await this.findById(id);
      const items = await this.getItems(id);
      if (quotation) {
        await this.outboxRepo.queueSync('quotations', id, 'INSERT', { quotation, items });
      }
      return { quotation: quotation!, items };
    });
  }

  async updateStatus(id: string, status: string): Promise<boolean> {
    const tenantId = this.db.getTenantId();
    const now = new Date().toISOString();
    const result = await this.db.run(
      `UPDATE quotations SET status = ?, updated_at = ?, sync_status = 'pending', sync_version = sync_version + 1 WHERE id = ? AND tenant_id = ?`,
      [status, now, id, tenantId]
    );
    if (result.changes > 0) {
      await this.outboxRepo.queueSync('quotations', id, 'UPDATE', { id, status });
    }
    return result.changes > 0;
  }

  async findById(id: string): Promise<Quotation | null> {
    const tenantId = this.db.getTenantId();
    return this.db.queryOne<Quotation>(
      `SELECT * FROM quotations WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL`,
      [id, tenantId]
    );
  }

  async getItems(quotationId: string): Promise<QuotationItem[]> {
    const tenantId = this.db.getTenantId();
    return this.db.query<QuotationItem>(
      `SELECT * FROM quotation_items WHERE quotation_id = ? AND tenant_id = ? ORDER BY line_order`,
      [quotationId, tenantId]
    );
  }

  async listRevisions(quotationId: string): Promise<QuotationRevision[]> {
    const tenantId = this.db.getTenantId();
    return this.db.query<QuotationRevision>(
      `SELECT * FROM quotation_revisions WHERE quotation_id = ? AND tenant_id = ? ORDER BY revision DESC`,
      [quotationId, tenantId]
    );
  }

  private async saveRevision(
    quotationId: string,
    revision: number,
    status: string,
    subtotal: number,
    discount_total: number,
    tax_total: number,
    grand_total: number,
    notes?: string
  ): Promise<void> {
    const tenantId = this.db.getTenantId();
    const id = this.generateUUID();
    const now = new Date().toISOString();
    const sql = `
      INSERT INTO quotation_revisions (id, tenant_id, quotation_id, revision, status, subtotal, discount_total, tax_total, grand_total, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await this.db.run(sql, [
      id, tenantId, quotationId, revision, status, subtotal, discount_total, tax_total, grand_total, notes ?? null, now
    ]);
  }
}
