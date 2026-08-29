// ============================================================================
// Workshop ERP - Products Repository (Phase 3 Inventory Module)
// ============================================================================

import { DatabaseService } from '../db/databaseService';
import { Product, ProductType } from '../db/types';
import { SyncOutboxRepository } from './SyncOutboxRepository';

export class ProductsRepository {
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

  async create(input: {
    id?: string;
    type?: ProductType;
    sku?: string;
    name: string;
    name_ar?: string;
    description?: string;
    category_id?: string | null;
    category?: string | null;
    unit_id?: string | null;
    unit?: string | null;
    cost_method?: 'weighted_average' | 'fifo' | 'standard';
    is_stockable?: boolean;
    is_sellable?: boolean;
    is_purchasable?: boolean;
    barcode?: string;
    min_stock_level?: number;
    min_stock?: number;
    max_stock_level?: number;
    max_stock?: number;
    reorder_point?: number;
    opening_stock?: number;
    opening_stock_date?: string;
    unit_price?: number;
    unit_cost?: number;
    track_inventory?: number;
  }): Promise<Product> {
    return await this.db.transaction(async () => {
      const id = input.id || this.generateUUID();
      const tenantId = this.db.getTenantId();
      const now = new Date().toISOString();

      const product: Product = {
        id,
        tenant_id: tenantId,
        type: input.type || 'raw_profile',
        sku: input.sku || undefined,
        name: input.name,
        name_ar: input.name_ar || input.name,
        description: input.description,
        category_id: input.category_id || null,
        unit_id: input.unit_id || null,
        cost_method: input.cost_method || 'weighted_average',
        is_stockable: input.is_stockable !== undefined ? input.is_stockable : (input.track_inventory !== undefined ? input.track_inventory === 1 : true),
        is_sellable: input.is_sellable !== undefined ? input.is_sellable : true,
        is_purchasable: input.is_purchasable !== undefined ? input.is_purchasable : true,
        barcode: input.barcode,
        min_stock_level: input.min_stock_level || input.min_stock || 0,
        max_stock_level: input.max_stock_level || input.max_stock || 0,
        reorder_point: input.reorder_point || 0,
        opening_stock: input.opening_stock || 0,
        opening_stock_date: input.opening_stock_date,
        sync_status: 'pending',
        sync_version: 1,
        created_at: now,
        updated_at: now,
        deleted_at: null
      };


      const sql = `
        INSERT INTO products (
          id, tenant_id, type, sku, name, name_ar, description, category_id, unit_id,
          cost_method, is_stockable, is_sellable, is_purchasable, barcode,
          min_stock_level, max_stock_level, reorder_point, opening_stock, opening_stock_date,
          sync_status, sync_version, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await this.db.run(sql, [
        product.id,
        product.tenant_id,
        product.type,
        product.sku || null,
        product.name,
        product.name_ar || null,
        product.description || null,
        product.category_id || null,
        product.unit_id || null,
        product.cost_method,
        product.is_stockable ? 1 : 0,
        product.is_sellable ? 1 : 0,
        product.is_purchasable ? 1 : 0,
        product.barcode || null,
        product.min_stock_level,
        product.max_stock_level,
        product.reorder_point,
        product.opening_stock,
        product.opening_stock_date || null,
        product.sync_status,
        product.sync_version,
        product.created_at,
        product.updated_at
      ]);

      await this.outboxRepo.queueSync('products', product.id, 'INSERT', product);
      return product;
    });
  }

  async update(id: string, updates: Partial<Product>): Promise<Product | null> {
    return await this.db.transaction(async () => {
      const existing = await this.findById(id);
      if (!existing) return null;

      const tenantId = this.db.getTenantId();
      const now = new Date().toISOString();
      const updated: Product = {
        ...existing,
        ...updates,
        updated_at: now,
        sync_version: (existing.sync_version || 1) + 1,
        sync_status: 'pending'
      };

      const sql = `
        UPDATE products SET
          type = ?, sku = ?, name = ?, name_ar = ?, description = ?,
          category_id = ?, unit_id = ?, cost_method = ?, is_stockable = ?,
          is_sellable = ?, is_purchasable = ?, barcode = ?, min_stock_level = ?,
          max_stock_level = ?, reorder_point = ?, opening_stock = ?, opening_stock_date = ?,
          sync_status = ?, sync_version = ?, updated_at = ?
        WHERE id = ? AND tenant_id = ?
      `;

      await this.db.run(sql, [
        updated.type,
        updated.sku || null,
        updated.name,
        updated.name_ar || null,
        updated.description || null,
        updated.category_id || null,
        updated.unit_id || null,
        updated.cost_method,
        updated.is_stockable ? 1 : 0,
        updated.is_sellable ? 1 : 0,
        updated.is_purchasable ? 1 : 0,
        updated.barcode || null,
        updated.min_stock_level,
        updated.max_stock_level,
        updated.reorder_point,
        updated.opening_stock,
        updated.opening_stock_date || null,
        updated.sync_status,
        updated.sync_version,
        updated.updated_at,
        id,
        tenantId
      ]);

      await this.outboxRepo.queueSync('products', id, 'UPDATE', updated);
      return updated;
    });
  }

  async findById(id: string): Promise<Product | null> {
    const tenantId = this.db.getTenantId();
    const row = await this.db.queryOne<any>(
      `SELECT * FROM products WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL`,
      [id, tenantId]
    );
    if (!row) return null;
    return this.mapRowToProduct(row);
  }

  async findBySku(sku: string): Promise<Product | null> {
    const tenantId = this.db.getTenantId();
    const row = await this.db.queryOne<any>(
      `SELECT * FROM products WHERE sku = ? AND tenant_id = ? AND deleted_at IS NULL`,
      [sku, tenantId]
    );
    if (!row) return null;
    return this.mapRowToProduct(row);
  }

  async list(filter?: { type?: ProductType; category_id?: string; search?: string }): Promise<Product[]> {
    const tenantId = this.db.getTenantId();
    let sql = `SELECT * FROM products WHERE tenant_id = ? AND deleted_at IS NULL`;
    const params: any[] = [tenantId];

    if (filter?.type) {
      sql += ` AND type = ?`;
      params.push(filter.type);
    }
    if (filter?.category_id) {
      sql += ` AND category_id = ?`;
      params.push(filter.category_id);
    }
    if (filter?.search) {
      sql += ` AND (name LIKE ? OR name_ar LIKE ? OR sku LIKE ? OR barcode LIKE ?)`;
      const s = `%${filter.search}%`;
      params.push(s, s, s, s);
    }

    sql += ` ORDER BY created_at DESC`;
    const rows = await this.db.query<any>(sql, params);
    return rows.map(r => this.mapRowToProduct(r));
  }

  async softDelete(id: string): Promise<boolean> {
    return await this.db.transaction(async () => {
      const existing = await this.findById(id);
      if (!existing) return false;

      const tenantId = this.db.getTenantId();
      const now = new Date().toISOString();

      await this.db.run(
        `UPDATE products SET deleted_at = ?, sync_status = 'pending', sync_version = sync_version + 1 WHERE id = ? AND tenant_id = ?`,
        [now, id, tenantId]
      );

      await this.outboxRepo.queueSync('products', id, 'DELETE', { id, deleted_at: now });
      return true;
    });
  }

  private mapRowToProduct(row: any): Product {
    return {
      ...row,
      is_stockable: Boolean(row.is_stockable),
      is_sellable: Boolean(row.is_sellable),
      is_purchasable: Boolean(row.is_purchasable)
    };
  }
}
