// ============================================================================
// Workshop ERP - Customers & Suppliers Repositories
// ============================================================================

import { BaseRepository } from './BaseRepository';
import { CustomerEntity, SupplierEntity, SupplierCategory } from '../types';

export class CustomersRepository extends BaseRepository<CustomerEntity> {
  constructor() {
    super('customers');
  }

  async create(customer: {
    code?: string;
    name: string;
    name_ar?: string;
    phone?: string;
    email?: string | null;
    address?: string | null;
    tax_id?: string | null;
    tax_number?: string | null;
    type?: string;
    credit_limit?: number;
    current_balance?: number;
    notes?: string | null;
    is_active?: number;
  }): Promise<CustomerEntity> {
    const id = this.generateUUID();
    const tenantId = this.getTenantId();
    const now = new Date().toISOString();
    const code = customer.code || `CUST-${Date.now().toString().slice(-4)}`;

    const entity: CustomerEntity = {
      id,
      tenant_id: tenantId,
      code,
      name: customer.name,
      name_ar: customer.name_ar || customer.name,
      phone: customer.phone || '0000000000',
      email: customer.email || null,
      address: customer.address || null,
      tax_id: customer.tax_id || customer.tax_number || null,
      credit_limit: customer.credit_limit || 0,
      current_balance: customer.current_balance || 0,
      notes: customer.notes || null,
      is_active: customer.is_active !== undefined ? customer.is_active : 1,
      sync_status: 'pending',
      sync_version: 1,
      last_sync_at: null,
      created_at: now,
      updated_at: now,
      deleted_at: null
    };

    await this.db.run(
      `INSERT INTO customers (id, tenant_id, code, name, name_ar, phone, email, address, tax_id, credit_limit, current_balance, notes, is_active, sync_status, sync_version, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entity.id,
        entity.tenant_id,
        entity.code,
        entity.name,
        entity.name_ar,
        entity.phone,
        entity.email,
        entity.address,
        entity.tax_id,
        entity.credit_limit,
        entity.current_balance,
        entity.notes,
        entity.is_active,
        entity.sync_status,
        entity.sync_version,
        entity.created_at,
        entity.updated_at
      ]
    );

    return entity;
  }

  async update(id: string, updates: Partial<CustomerEntity>): Promise<boolean> {
    const tenantId = this.getTenantId();
    const existing = await this.findById(id, tenantId);
    if (!existing) return false;

    const merged = { ...existing, ...updates, updated_at: new Date().toISOString() };

    const result = await this.db.run(
      `UPDATE customers SET name = ?, name_ar = ?, phone = ?, email = ?, address = ?, tax_id = ?, credit_limit = ?, current_balance = ?, notes = ?, is_active = ?, updated_at = ?
       WHERE id = ? AND tenant_id = ?`,
      [
        merged.name,
        merged.name_ar,
        merged.phone,
        merged.email,
        merged.address,
        merged.tax_id,
        merged.credit_limit,
        merged.current_balance,
        merged.notes,
        merged.is_active,
        merged.updated_at,
        id,
        tenantId
      ]
    );

    return result.changes > 0;
  }

  async findByCode(code: string): Promise<CustomerEntity | null> {
    const tenantId = this.getTenantId();
    return this.db.queryOne<CustomerEntity>(
      `SELECT * FROM customers WHERE code = ? AND tenant_id = ? AND deleted_at IS NULL`,
      [code, tenantId]
    );
  }

  async searchByNameOrPhone(term: string): Promise<CustomerEntity[]> {
    const tenantId = this.getTenantId();
    return this.db.query<CustomerEntity>(
      `SELECT * FROM customers WHERE tenant_id = ? AND deleted_at IS NULL AND (name LIKE ? OR name_ar LIKE ? OR phone LIKE ?)`,
      [tenantId, `%${term}%`, `%${term}%`, `%${term}%`]
    );
  }
}

export class SuppliersRepository extends BaseRepository<SupplierEntity> {
  constructor() {
    super('suppliers');
  }

  async create(supplier: {
    code?: string;
    name: string;
    name_ar?: string;
    company_name?: string | null;
    phone?: string;
    email?: string | null;
    address?: string | null;
    tax_id?: string | null;
    tax_number?: string | null;
    category?: SupplierCategory;
    current_balance?: number;
    notes?: string | null;
    is_active?: number;
  }): Promise<SupplierEntity> {
    const id = this.generateUUID();
    const tenantId = this.getTenantId();
    const now = new Date().toISOString();
    const code = supplier.code || `SUPP-${Date.now().toString().slice(-4)}`;

    const entity: SupplierEntity = {
      id,
      tenant_id: tenantId,
      code,
      name: supplier.name,
      name_ar: supplier.name_ar || supplier.name,
      company_name: supplier.company_name || null,
      phone: supplier.phone || '0000000000',
      email: supplier.email || null,
      address: supplier.address || null,
      tax_id: supplier.tax_id || supplier.tax_number || null,
      current_balance: supplier.current_balance || 0,
      category: supplier.category || 'aluminium',
      notes: supplier.notes || null,
      is_active: supplier.is_active !== undefined ? supplier.is_active : 1,
      sync_status: 'pending',
      sync_version: 1,
      last_sync_at: null,
      created_at: now,
      updated_at: now,
      deleted_at: null
    };

    await this.db.run(
      `INSERT INTO suppliers (id, tenant_id, code, name, name_ar, company_name, phone, email, address, tax_id, current_balance, category, notes, is_active, sync_status, sync_version, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entity.id,
        entity.tenant_id,
        entity.code,
        entity.name,
        entity.name_ar,
        entity.company_name,
        entity.phone,
        entity.email,
        entity.address,
        entity.tax_id,
        entity.current_balance,
        entity.category,
        entity.notes,
        entity.is_active,
        entity.sync_status,
        entity.sync_version,
        entity.created_at,
        entity.updated_at
      ]
    );

    return entity;
  }

  async update(id: string, updates: Partial<SupplierEntity>): Promise<boolean> {
    const tenantId = this.getTenantId();
    const existing = await this.findById(id, tenantId);
    if (!existing) return false;

    const merged = { ...existing, ...updates, updated_at: new Date().toISOString() };

    const result = await this.db.run(
      `UPDATE suppliers SET name = ?, name_ar = ?, company_name = ?, phone = ?, email = ?, address = ?, current_balance = ?, category = ?, notes = ?, is_active = ?, updated_at = ?
       WHERE id = ? AND tenant_id = ?`,
      [
        merged.name,
        merged.name_ar,
        merged.company_name,
        merged.phone,
        merged.email,
        merged.address,
        merged.current_balance,
        merged.category,
        merged.notes,
        merged.is_active,
        merged.updated_at,
        id,
        tenantId
      ]
    );

    return result.changes > 0;
  }

  async listByCategory(category: SupplierCategory): Promise<SupplierEntity[]> {
    const tenantId = this.getTenantId();
    return this.db.query<SupplierEntity>(
      `SELECT * FROM suppliers WHERE category = ? AND tenant_id = ? AND deleted_at IS NULL`,
      [category, tenantId]
    );
  }
}
