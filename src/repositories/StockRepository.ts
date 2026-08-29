// ============================================================================
// Workshop ERP - Stock Repository (Phase 3 Event-Sourced Inventory & Balances)
// ============================================================================

import { DatabaseService } from '../db/databaseService';
import { StockMovement, StockBalance, StockMovementType, StockDirection } from '../db/types';
import { SyncOutboxRepository } from './SyncOutboxRepository';

export class StockRepository {
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

  /**
   * Records an immutable stock movement and updates the live stock balance atomically.
   */
  async recordMovement(input: {
    id?: string;
    product_id: string;
    warehouse_id: string;
    movement_type?: StockMovementType;
    type?: StockMovementType;
    direction: StockDirection;
    quantity: number;
    unit_cost?: number;
    total_cost?: number;
    reference_entity?: string | null;
    reference_type?: string | null;
    reference_id?: string | null;
    notes?: string | null;
    created_by?: string;
  }): Promise<StockMovement> {
    return await this.db.transaction(async () => {
      const id = input.id || this.generateUUID();
      const tenantId = this.db.getTenantId();
      const now = new Date().toISOString();

      const unitCost = input.unit_cost || 0;
      const totalCost = input.total_cost !== undefined ? input.total_cost : input.quantity * unitCost;
      const mType = (input.movement_type || input.type || 'purchase_receipt') as StockMovementType;

      const movement: StockMovement = {
        id,
        tenant_id: tenantId,
        product_id: input.product_id,
        warehouse_id: input.warehouse_id,
        movement_type: mType,
        direction: input.direction,
        quantity: input.quantity,
        unit_cost: unitCost,
        total_cost: totalCost,
        reference_entity: input.reference_entity || input.reference_type || null,
        reference_id: input.reference_id || null,
        notes: input.notes || null,
        created_by: input.created_by || 'system',
        sync_status: 'pending',
        sync_version: 1,
        created_at: now
      };


      // 1. Insert Movement
      const insertSql = `
        INSERT INTO stock_movements (
          id, tenant_id, product_id, warehouse_id, movement_type, type,
          direction, quantity, unit_cost, total_cost, reference_entity,
          reference_type, reference_id, notes, created_by, sync_status,
          sync_version, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await this.db.run(insertSql, [
        movement.id,
        movement.tenant_id,
        movement.product_id,
        movement.warehouse_id,
        movement.movement_type,
        movement.movement_type, // for backwards-compatible 'type' column
        movement.direction,
        movement.quantity,
        movement.unit_cost,
        movement.total_cost,
        movement.reference_entity || null,
        movement.reference_entity || null,
        movement.reference_id || null,
        movement.notes || null,
        movement.created_by,
        movement.sync_status,
        movement.sync_version,
        movement.created_at
      ]);

      // 2. Update / Upsert Stock Balance
      await this.updateStockBalance(movement.product_id, movement.warehouse_id, movement);

      // 3. Queue Outbox Event
      await this.outboxRepo.queueSync('stock_movements', movement.id, 'INSERT', movement);

      return movement;
    });
  }

  /**
   * Internal helper to recalculate and persist stock balance for a product/warehouse.
   */
  private async updateStockBalance(productId: string, warehouseId: string, movement: StockMovement): Promise<void> {
    const tenantId = this.db.getTenantId();
    const now = new Date().toISOString();

    const existingBalance = await this.db.queryOne<StockBalance>(
      `SELECT * FROM stock_balances WHERE tenant_id = ? AND product_id = ? AND warehouse_id = ?`,
      [tenantId, productId, warehouseId]
    );

    let newQty = existingBalance ? Number(existingBalance.quantity) : 0;
    let newAvgCost = existingBalance ? Number(existingBalance.average_cost) : 0;
    const reservedQty = existingBalance ? Number(existingBalance.reserved_quantity) : 0;

    if (movement.direction === 'in') {
      const incomingQty = Number(movement.quantity);
      const incomingCost = Number(movement.unit_cost);

      if (newQty + incomingQty > 0) {
        // Weighted Average Cost Formula
        const currentTotalCost = newQty > 0 ? (newQty * newAvgCost) : 0;
        const incomingTotalCost = incomingQty * incomingCost;
        newAvgCost = (currentTotalCost + incomingTotalCost) / (newQty + incomingQty);
      }
      newQty += incomingQty;
    } else {
      // Out movement reduces quantity, keeps average cost
      newQty -= Number(movement.quantity);
    }

    if (existingBalance) {
      await this.db.run(
        `UPDATE stock_balances SET quantity = ?, average_cost = ?, updated_at = ? WHERE id = ? AND tenant_id = ?`,
        [newQty, newAvgCost, now, existingBalance.id, tenantId]
      );
    } else {
      const balanceId = this.generateUUID();
      await this.db.run(
        `INSERT INTO stock_balances (id, tenant_id, product_id, warehouse_id, quantity, reserved_quantity, average_cost, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [balanceId, tenantId, productId, warehouseId, newQty, reservedQty, newAvgCost, now]
      );
    }
  }

  async getBalance(productId: string, warehouseId?: string): Promise<StockBalance | null> {
    const tenantId = this.db.getTenantId();
    if (warehouseId) {
      return this.db.queryOne<StockBalance>(
        `SELECT * FROM stock_balances WHERE tenant_id = ? AND product_id = ? AND warehouse_id = ?`,
        [tenantId, productId, warehouseId]
      );
    }

    // Aggregate across all warehouses for the product
    const rows = await this.db.query<StockBalance>(
      `SELECT * FROM stock_balances WHERE tenant_id = ? AND product_id = ?`,
      [tenantId, productId]
    );

    if (rows.length === 0) return null;

    const totalQty = rows.reduce((sum, r) => sum + Number(r.quantity), 0);
    const totalReserved = rows.reduce((sum, r) => sum + Number(r.reserved_quantity), 0);
    const totalValue = rows.reduce((sum, r) => sum + (Number(r.quantity) * Number(r.average_cost)), 0);
    const avgCost = totalQty > 0 ? totalValue / totalQty : 0;

    return {
      id: rows[0].id,
      tenant_id: tenantId,
      product_id: productId,
      warehouse_id: 'ALL',
      quantity: totalQty,
      reserved_quantity: totalReserved,
      average_cost: avgCost,
      updated_at: rows[0].updated_at
    };
  }

  async getProductStockBalance(productId: string): Promise<{ onHand: number; reserved: number; available: number; wacUnitCost: number; totalValue: number }> {
    const balance = await this.getTotalProductBalance(productId);
    if (!balance) {
      return { onHand: 0, reserved: 0, available: 0, wacUnitCost: 0, totalValue: 0 };
    }
    const onHand = Number(balance.quantity) || 0;
    const reserved = Number(balance.reserved_quantity) || 0;
    const wacUnitCost = Number(balance.average_cost) || 0;
    return {
      onHand,
      reserved,
      available: onHand - reserved,
      wacUnitCost,
      totalValue: onHand * wacUnitCost
    };
  }

  async getBalances(productId?: string): Promise<StockBalance[]> {

    const tenantId = this.db.getTenantId();
    if (productId) {
      return this.db.query<StockBalance>(
        `SELECT * FROM stock_balances WHERE tenant_id = ? AND product_id = ?`,
        [tenantId, productId]
      );
    }
    return this.db.query<StockBalance>(
      `SELECT * FROM stock_balances WHERE tenant_id = ?`,
      [tenantId]
    );
  }

  async getMovements(filter?: { productId?: string; warehouseId?: string; movementType?: StockMovementType }): Promise<StockMovement[]> {
    const tenantId = this.db.getTenantId();
    let sql = `SELECT * FROM stock_movements WHERE tenant_id = ?`;
    const params: any[] = [tenantId];

    if (filter?.productId) {
      sql += ` AND product_id = ?`;
      params.push(filter.productId);
    }
    if (filter?.warehouseId) {
      sql += ` AND warehouse_id = ?`;
      params.push(filter.warehouseId);
    }
    if (filter?.movementType) {
      sql += ` AND (movement_type = ? OR type = ?)`;
      params.push(filter.movementType, filter.movementType);
    }

    sql += ` ORDER BY created_at DESC`;
    return this.db.query<StockMovement>(sql, params);
  }
}

// For backwards compatibility export alias
export { StockRepository as StockMovementsRepository };
