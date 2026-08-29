// ============================================================================
// Workshop ERP - Chart of Accounts Repository (COA Tree Management)
// ============================================================================

import { DatabaseService } from '../db/databaseService';
import { ChartOfAccount, AccountType, AccountNature } from '../db/types';

export class ChartOfAccountsRepository {
  private db = DatabaseService.getInstance();

  async create(account: Omit<ChartOfAccount, 'id' | 'created_at' | 'updated_at' | 'tenant_id'>): Promise<ChartOfAccount> {
    const id = this.generateUUID();
    const tenantId = this.db.getTenantId();
    const now = new Date().toISOString();
    const sql = `
      INSERT INTO chart_of_accounts (id, tenant_id, code, name, name_ar, type, nature, parent_id, is_postable, is_active, opening_balance, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const accCode = account.code || account.account_code || '';
    const accName = account.name || account.account_name || '';
    const accNameAr = account.name_ar || account.account_name_ar || accName;
    const accType = account.type || account.account_type || 'asset';
    const nature = account.nature || ((accType === 'asset' || accType === 'expense') ? 'debit' : 'credit');

    await this.db.run(sql, [
      id,
      tenantId,
      accCode,
      accName,
      accNameAr,
      accType,
      nature,
      account.parent_id ?? null,
      account.is_postable ? 1 : 0,
      account.is_active ? 1 : 0,
      account.opening_balance ?? 0,
      now,
      now
    ]);
    const found = await this.findById(id);
    if (!found) {
      throw new Error(`Failed to retrieve newly created account with ID: ${id}`);
    }
    return found;
  }

  async findById(id: string): Promise<ChartOfAccount | null> {
    const tenantId = this.db.getTenantId();
    const row = await this.db.queryOne<any>(
      `SELECT id, tenant_id, code, name, name_ar, type, nature, parent_id,
              is_postable, is_active, opening_balance, created_at, updated_at
       FROM chart_of_accounts 
       WHERE id = ? AND tenant_id = ? AND is_active = 1`,
      [id, tenantId]
    );
    if (!row) return null;
    return {
      id: row.id,
      tenant_id: row.tenant_id,
      code: row.code,
      name: row.name,
      name_ar: row.name_ar,
      type: row.type as AccountType,
      nature: row.nature as AccountNature,
      account_code: row.code,
      account_name: row.name,
      account_name_ar: row.name_ar,
      account_type: row.type as AccountType,
      parent_id: row.parent_id,
      is_postable: row.is_postable === 1,
      is_active: row.is_active === 1,
      opening_balance: row.opening_balance || 0,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }

  async findByCode(code: string): Promise<ChartOfAccount | null> {
    const tenantId = this.db.getTenantId();
    const row = await this.db.queryOne<any>(
      `SELECT id, tenant_id, code, name, name_ar, type, nature, parent_id,
              is_postable, is_active, opening_balance, created_at, updated_at
       FROM chart_of_accounts 
       WHERE code = ? AND tenant_id = ? AND is_active = 1`,
      [code, tenantId]
    );
    if (!row) return null;
    return {
      id: row.id,
      tenant_id: row.tenant_id,
      code: row.code,
      name: row.name,
      name_ar: row.name_ar,
      type: row.type as AccountType,
      nature: row.nature as AccountNature,
      account_code: row.code,
      account_name: row.name,
      account_name_ar: row.name_ar,
      account_type: row.type as AccountType,
      parent_id: row.parent_id,
      is_postable: row.is_postable === 1,
      is_active: row.is_active === 1,
      opening_balance: row.opening_balance || 0,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }

  async listByType(type?: AccountType): Promise<ChartOfAccount[]> {
    const tenantId = this.db.getTenantId();
    let sql = `SELECT id, tenant_id, code, name, name_ar, type, nature, parent_id,
                      is_postable, is_active, opening_balance, created_at, updated_at
               FROM chart_of_accounts 
               WHERE tenant_id = ? AND is_active = 1`;
    const params: any[] = [tenantId];
    if (type) {
      sql += ` AND type = ?`;
      params.push(type);
    }
    sql += ` ORDER BY code ASC`;
    const rows = await this.db.query<any>(sql, params);
    return rows.map((r) => ({
      id: r.id,
      tenant_id: r.tenant_id,
      code: r.code,
      name: r.name,
      name_ar: r.name_ar,
      type: r.type as AccountType,
      nature: r.nature as AccountNature,
      account_code: r.code,
      account_name: r.name,
      account_name_ar: r.name_ar,
      account_type: r.type as AccountType,
      parent_id: r.parent_id,
      is_postable: r.is_postable === 1,
      is_active: r.is_active === 1,
      opening_balance: r.opening_balance || 0,
      created_at: r.created_at,
      updated_at: r.updated_at
    }));
  }

  async listAll(): Promise<ChartOfAccount[]> {
    return this.listByType();
  }

  async update(id: string, data: Partial<ChartOfAccount>): Promise<boolean> {
    const tenantId = this.db.getTenantId();
    const updates: string[] = [];
    const params: any[] = [];
    if (data.account_name) { updates.push('name = ?'); params.push(data.account_name); }
    if (data.account_type) { updates.push('type = ?'); params.push(data.account_type); }
    if (data.parent_id !== undefined) { updates.push('parent_id = ?'); params.push(data.parent_id ?? null); }
    if (data.is_postable !== undefined) { updates.push('is_postable = ?'); params.push(data.is_postable ? 1 : 0); }
    if (data.is_active !== undefined) { updates.push('is_active = ?'); params.push(data.is_active ? 1 : 0); }
    if (data.opening_balance !== undefined) { updates.push('opening_balance = ?'); params.push(data.opening_balance); }
    updates.push('updated_at = ?'); params.push(new Date().toISOString());
    params.push(id, tenantId);
    const sql = `UPDATE chart_of_accounts SET ${updates.join(', ')} WHERE id = ? AND tenant_id = ?`;
    const result = await this.db.run(sql, params);
    return result.changes > 0;
  }

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
}
