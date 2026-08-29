// ============================================================================
// Workshop ERP - Base Repository (Multi-Tenant & Soft-Delete Enforced)
// ============================================================================

import { DatabaseService } from '../databaseService';
import { BaseEntity, PaginationOptions } from '../types';

export abstract class BaseRepository<T extends BaseEntity> {
  protected db: DatabaseService;
  protected tableName: string;

  constructor(tableName: string) {
    this.tableName = tableName;
    this.db = DatabaseService.getInstance();
  }

  /**
   * Helper to get active tenant ID
   */
  protected getTenantId(): string {
    return this.db.getTenantId();
  }

  /**
   * Generates a standard UUID string
   */
  protected generateUUID(): string {
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
   * Finds record by ID within current tenant (excluding soft-deleted)
   */
  async findById(id: string, tenantId?: string): Promise<T | null> {
    const tid = tenantId || this.getTenantId();
    const sql = `SELECT * FROM ${this.tableName} WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL`;
    return this.db.queryOne<T>(sql, [id, tid]);
  }

  /**
   * Lists all active records for tenant with pagination & ordering
   */
  async listByTenant(options?: PaginationOptions, tenantId?: string): Promise<T[]> {
    const tid = tenantId || this.getTenantId();
    const limit = options?.limit || 100;
    const offset = options?.offset || 0;
    const orderBy = options?.orderBy || 'created_at';
    const orderDirection = options?.orderDirection || 'DESC';

    const sql = `SELECT * FROM ${this.tableName} WHERE tenant_id = ? AND deleted_at IS NULL ORDER BY ${orderBy} ${orderDirection} LIMIT ${limit} OFFSET ${offset}`;
    return this.db.query<T>(sql, [tid]);
  }

  /**
   * Immutable ledger tables that MUST NOT be soft-deleted or modified in-place
   */
   private static readonly IMMUTABLE_TABLES = [
     'stock_movements',
     'journal_entries',
     'journal_entry_lines',
     'audit_logs'
   ];

  /**
   * Soft delete record by setting deleted_at timestamp
   * Throws error if attempted on immutable append-only ledger tables
   */
  async softDelete(id: string, tenantId?: string): Promise<boolean> {
    if (BaseRepository.IMMUTABLE_TABLES.includes(this.tableName)) {
      throw new Error(
        `[Architecture Violation]: Table "${this.tableName}" is an immutable append-only ledger. Soft-deletion is prohibited. Use official reversal / void workflows.`
      );
    }
    const tid = tenantId || this.getTenantId();
    const now = new Date().toISOString();
    const sql = `UPDATE ${this.tableName} SET deleted_at = ? WHERE id = ? AND tenant_id = ?`;
    const result = await this.db.run(sql, [now, id, tid]);
    return result.changes > 0;
  }

  /**
   * Counts active records for tenant
   */
  async countByTenant(tenantId?: string): Promise<number> {
    const tid = tenantId || this.getTenantId();
    const sql = `SELECT COUNT(*) as count FROM ${this.tableName} WHERE tenant_id = ? AND deleted_at IS NULL`;
    const rows = await this.db.query<{ count: number }>(sql, [tid]);
    return rows[0]?.count || 0;
  }
}
