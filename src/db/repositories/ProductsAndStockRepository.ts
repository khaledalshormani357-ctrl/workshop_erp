// ============================================================================
// Workshop ERP - Products & Stock Movements Repositories (ADR-005 Event Sourcing)
// ============================================================================

import { BaseRepository } from './BaseRepository';
import { ProductEntity, StockMovementEntity, ProductType } from '../types';
import { DatabaseService } from '../databaseService';

export class ProductsRepository extends BaseRepository<ProductEntity> {
  constructor() {
    super('products');
  }

  async create(product: Omit<ProductEntity, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>): Promise<ProductEntity> {
    const id = this.generateUUID();
    const tenantId = this.getTenantId();
    const now = new Date().toISOString();

    const entity: ProductEntity = {
      id,
      tenant_id: tenantId,
      sku: product.sku,
      name: product.name,
      name_ar: product.name_ar,
      type: product.type,
      category: product.category,
      unit: product.unit,
      unit_cost: product.unit_cost || 0,
      unit_price: product.unit_price || 0,
      min_stock: product.min_stock || 5,
      max_stock: product.max_stock || 100,
      reorder_point: product.reorder_point || 10,
      track_inventory: product.track_inventory !== undefined ? product.track_inventory : 1,
      specifications: product.specifications || null,
      barcode: product.barcode || null,
      sync_status: 'pending',
      sync_version: 1,
      last_sync_at: null,
      created_at: now,
      updated_at: now,
      deleted_at: null
    };

    await this.db.run(
      `INSERT INTO products (id, tenant_id, sku, name, name_ar, type, category, unit, unit_cost, unit_price, min_stock, max_stock, reorder_point, track_inventory, specifications, barcode, sync_status, sync_version, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entity.id,
        entity.tenant_id,
        entity.sku,
        entity.name,
        entity.name_ar,
        entity.type,
        entity.category,
        entity.unit,
        entity.unit_cost,
        entity.unit_price,
        entity.min_stock,
        entity.max_stock,
        entity.reorder_point,
        entity.track_inventory,
        entity.specifications,
        entity.barcode,
        entity.sync_status,
        entity.sync_version,
        entity.created_at,
        entity.updated_at
      ]
    );

    return entity;
  }

  async update(id: string, updates: Partial<ProductEntity>): Promise<boolean> {
    const tenantId = this.getTenantId();
    const existing = await this.findById(id, tenantId);
    if (!existing) return false;

    const merged = { ...existing, ...updates, updated_at: new Date().toISOString() };

    const result = await this.db.run(
      `UPDATE products SET name = ?, name_ar = ?, type = ?, category = ?, unit = ?, unit_cost = ?, unit_price = ?, min_stock = ?, max_stock = ?, reorder_point = ?, track_inventory = ?, specifications = ?, barcode = ?, updated_at = ?
       WHERE id = ? AND tenant_id = ?`,
      [
        merged.name,
        merged.name_ar,
        merged.type,
        merged.category,
        merged.unit,
        merged.unit_cost,
        merged.unit_price,
        merged.min_stock,
        merged.max_stock,
        merged.reorder_point,
        merged.track_inventory,
        merged.specifications,
        merged.barcode,
        merged.updated_at,
        id,
        tenantId
      ]
    );

    return result.changes > 0;
  }

  async findBySku(sku: string): Promise<ProductEntity | null> {
    const tenantId = this.getTenantId();
    return this.db.queryOne<ProductEntity>(
      `SELECT * FROM products WHERE sku = ? AND tenant_id = ? AND deleted_at IS NULL`,
      [sku, tenantId]
    );
  }

  async listByType(type: ProductType): Promise<ProductEntity[]> {
    const tenantId = this.getTenantId();
    return this.db.query<ProductEntity>(
      `SELECT * FROM products WHERE type = ? AND tenant_id = ? AND deleted_at IS NULL`,
      [type, tenantId]
    );
  }
}

export class StockMovementsRepository {
  private db = BaseRepository.prototype['db'] || (DatabaseService as any);

  constructor() {
    // Uses DatabaseService instance
  }

  /**
   * Records an immutable stock event (ADR-005: Event-Sourced movement)
   */
  async recordMovement(
    movement: Omit<StockMovementEntity, 'id' | 'tenant_id' | 'created_at'>,
    tenantId?: string
  ): Promise<StockMovementEntity> {
    const db = (await import('../databaseService')).DatabaseService.getInstance();
    const tid = tenantId || db.getTenantId();
    const id = (await import('./BaseRepository')).BaseRepository.prototype['generateUUID'].call(null) || crypto.randomUUID();
    const now = new Date().toISOString();

    const entity: StockMovementEntity = {
      id,
      tenant_id: tid,
      product_id: movement.product_id,
      warehouse_id: movement.warehouse_id,
      type: movement.type,
      direction: movement.direction,
      quantity: movement.quantity,
      unit_cost: movement.unit_cost,
      total_cost: movement.total_cost || movement.quantity * movement.unit_cost,
      reference_type: movement.reference_type || null,
      reference_id: movement.reference_id || null,
      notes: movement.notes || null,
      created_by: movement.created_by,
      sync_status: 'pending',
      sync_version: 1,
      created_at: now
    };

    await db.run(
      `INSERT INTO stock_movements (id, tenant_id, product_id, warehouse_id, type, direction, quantity, unit_cost, total_cost, reference_type, reference_id, notes, created_by, sync_status, sync_version, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entity.id,
        entity.tenant_id,
        entity.product_id,
        entity.warehouse_id,
        entity.type,
        entity.direction,
        entity.quantity,
        entity.unit_cost,
        entity.total_cost,
        entity.reference_type,
        entity.reference_id,
        entity.notes,
        entity.created_by,
        entity.sync_status,
        entity.sync_version,
        entity.created_at
      ]
    );

    return entity;
  }

  /**
   * Computes dynamic on-hand stock quantity derived from event history
   */
  async getProductStockBalance(productId: string, tenantId?: string): Promise<{ onHand: number; totalCost: number; wacUnitCost: number }> {
    const db = (await import('../databaseService')).DatabaseService.getInstance();
    const tid = tenantId || db.getTenantId();

    const movements = await db.query<StockMovementEntity>(
      `SELECT * FROM stock_movements WHERE product_id = ? AND tenant_id = ? ORDER BY created_at ASC`,
      [productId, tid]
    );

    let onHand = 0;
    let totalValuation = 0;

    for (const mov of movements) {
      if (mov.direction === 'in') {
        onHand += mov.quantity;
        totalValuation += mov.total_cost;
      } else {
        onHand -= mov.quantity;
        totalValuation -= mov.quantity * (onHand > 0 ? totalValuation / (onHand + mov.quantity) : mov.unit_cost);
      }
    }

    const clampedOnHand = Math.max(0, Math.round(onHand * 100) / 100);
    const clampedValuation = Math.max(0, Math.round(totalValuation * 100) / 100);
    const wacUnitCost = clampedOnHand > 0 ? Math.round((clampedValuation / clampedOnHand) * 100) / 100 : 0;

    return {
      onHand: clampedOnHand,
      totalCost: clampedValuation,
      wacUnitCost
    };
  }

  /**
   * Lists stock movement history for a product or reference
   */
  async listMovements(productId?: string, tenantId?: string): Promise<StockMovementEntity[]> {
    const db = (await import('../databaseService')).DatabaseService.getInstance();
    const tid = tenantId || db.getTenantId();

    if (productId) {
      return db.query<StockMovementEntity>(
        `SELECT * FROM stock_movements WHERE product_id = ? AND tenant_id = ? ORDER BY created_at DESC`,
        [productId, tid]
      );
    }

    return db.query<StockMovementEntity>(
      `SELECT * FROM stock_movements WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 200`,
      [tid]
    );
  }
}
