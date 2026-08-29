// ============================================================================
// Workshop ERP - Warehouses Repository
// ============================================================================

import { DatabaseService } from '../db/databaseService';
import { Warehouse } from '../db/types';

export class WarehousesRepository {
  private db = DatabaseService.getInstance();

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

  async create(input: Omit<Warehouse, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>): Promise<Warehouse> {
    return await this.db.transaction(async () => {
      const id = this.generateUUID();
      const tenantId = this.db.getTenantId();
      const now = new Date().toISOString();

      const warehouse: Warehouse = {
        id,
        tenant_id: tenantId,
        name: input.name,
        name_ar: input.name_ar,
        code: input.code,
        location: input.location,
        is_default: input.is_default || false,
        is_active: input.is_active !== undefined ? input.is_active : true,
        created_at: now,
        updated_at: now,
        deleted_at: null
      };

      const sql = `
        INSERT INTO warehouses (
          id, tenant_id, name, name_ar, code, location, is_default,
          is_primary, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await this.db.run(sql, [
        warehouse.id,
        warehouse.tenant_id,
        warehouse.name,
        warehouse.name_ar || null,
        warehouse.code || null,
        warehouse.location || null,
        warehouse.is_default ? 1 : 0,
        warehouse.is_default ? 1 : 0,
        warehouse.is_active ? 1 : 0,
        warehouse.created_at,
        warehouse.updated_at
      ]);

      return warehouse;
    });
  }

  async findById(id: string): Promise<Warehouse | null> {
    const tenantId = this.db.getTenantId();
    const row = await this.db.queryOne<any>(
      `SELECT * FROM warehouses WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL`,
      [id, tenantId]
    );
    if (!row) return null;
    return {
      ...row,
      is_default: Boolean(row.is_default || row.is_primary),
      is_active: Boolean(row.is_active)
    };
  }

  async list(): Promise<Warehouse[]> {
    const tenantId = this.db.getTenantId();
    const rows = await this.db.query<any>(
      `SELECT * FROM warehouses WHERE tenant_id = ? AND deleted_at IS NULL ORDER BY name ASC`,
      [tenantId]
    );
    return rows.map(r => ({
      ...r,
      is_default: Boolean(r.is_default || r.is_primary),
      is_active: Boolean(r.is_active)
    }));
  }
}
