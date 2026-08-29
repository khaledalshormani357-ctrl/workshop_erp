// ============================================================================
// Workshop ERP - Operations & Manufacturing Repositories
// Covers: SalesInvoices, PurchaseOrders, ProductionOrders, BOMs, Employees, SyncOutbox, AuditLogs
// ============================================================================

import { BaseRepository } from './BaseRepository';
import {
  SalesInvoiceEntity,
  SalesInvoiceLineEntity,
  PurchaseOrderEntity,
  PurchaseOrderLineEntity,
  ProductionOrderEntity,
  BOMEntity,
  BOMComponentEntity,
  EmployeeEntity,
  SyncOutboxEntity,
  AuditLogEntity,
  ProductionStage
} from '../types';
import { DatabaseService } from '../databaseService';

// ----------------------------------------------------------------------------
// Sales Invoices Repository
// ----------------------------------------------------------------------------
export class SalesInvoicesRepository extends BaseRepository<SalesInvoiceEntity> {
  constructor() {
    super('sales_invoices');
  }

  async createWithLines(
    invoice: Omit<SalesInvoiceEntity, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>,
    lines: Omit<SalesInvoiceLineEntity, 'id' | 'tenant_id' | 'invoice_id' | 'created_at'>[]
  ): Promise<{ invoice: SalesInvoiceEntity; lines: SalesInvoiceLineEntity[] }> {
    const invoiceId = this.generateUUID();
    const tenantId = this.getTenantId();
    const now = new Date().toISOString();

    const invoiceEntity: SalesInvoiceEntity = {
      id: invoiceId,
      tenant_id: tenantId,
      invoice_number: invoice.invoice_number,
      quotation_id: invoice.quotation_id || null,
      customer_id: invoice.customer_id,
      issue_date: invoice.issue_date,
      due_date: invoice.due_date,
      payment_term: invoice.payment_term || 'cash',
      payment_status: invoice.payment_status || 'unpaid',
      subtotal: invoice.subtotal,
      tax_amount: invoice.tax_amount,
      discount_amount: invoice.discount_amount || 0,
      total_amount: invoice.total_amount,
      paid_amount: invoice.paid_amount || 0,
      journal_entry_id: invoice.journal_entry_id || null,
      notes: invoice.notes || null,
      created_by: invoice.created_by,
      sync_status: 'pending',
      sync_version: 1,
      last_sync_at: null,
      created_at: now,
      updated_at: now,
      deleted_at: null
    };

    const lineEntities: SalesInvoiceLineEntity[] = lines.map((l) => ({
      id: this.generateUUID(),
      tenant_id: tenantId,
      invoice_id: invoiceId,
      product_id: l.product_id,
      description: l.description || null,
      width: l.width || null,
      height: l.height || null,
      quantity: l.quantity,
      unit_price: l.unit_price,
      tax_rate: l.tax_rate !== undefined ? l.tax_rate : 0.05,
      tax_amount: l.tax_amount,
      subtotal: l.subtotal,
      total: l.total,
      created_at: now
    }));

    await this.db.transaction(async (trx) => {
      await trx.run(
        `INSERT INTO sales_invoices (id, tenant_id, invoice_number, quotation_id, customer_id, issue_date, due_date, payment_term, payment_status, subtotal, tax_amount, discount_amount, total_amount, paid_amount, journal_entry_id, notes, created_by, sync_status, sync_version, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          invoiceEntity.id,
          invoiceEntity.tenant_id,
          invoiceEntity.invoice_number,
          invoiceEntity.quotation_id,
          invoiceEntity.customer_id,
          invoiceEntity.issue_date,
          invoiceEntity.due_date,
          invoiceEntity.payment_term,
          invoiceEntity.payment_status,
          invoiceEntity.subtotal,
          invoiceEntity.tax_amount,
          invoiceEntity.discount_amount,
          invoiceEntity.total_amount,
          invoiceEntity.paid_amount,
          invoiceEntity.journal_entry_id,
          invoiceEntity.notes,
          invoiceEntity.created_by,
          invoiceEntity.sync_status,
          invoiceEntity.sync_version,
          invoiceEntity.created_at,
          invoiceEntity.updated_at
        ]
      );

      for (const line of lineEntities) {
        await trx.run(
          `INSERT INTO sales_invoice_lines (id, tenant_id, invoice_id, product_id, description, width, height, quantity, unit_price, tax_rate, tax_amount, subtotal, total, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            line.id,
            line.tenant_id,
            line.invoice_id,
            line.product_id,
            line.description,
            line.width,
            line.height,
            line.quantity,
            line.unit_price,
            line.tax_rate,
            line.tax_amount,
            line.subtotal,
            line.total,
            line.created_at
          ]
        );
      }
    });

    return { invoice: invoiceEntity, lines: lineEntities };
  }

  async getInvoiceLines(invoiceId: string): Promise<SalesInvoiceLineEntity[]> {
    const tenantId = this.getTenantId();
    return this.db.query<SalesInvoiceLineEntity>(
      `SELECT * FROM sales_invoice_lines WHERE invoice_id = ? AND tenant_id = ?`,
      [invoiceId, tenantId]
    );
  }
}

// ----------------------------------------------------------------------------
// Purchase Orders Repository
// ----------------------------------------------------------------------------
export class PurchaseOrdersRepository extends BaseRepository<PurchaseOrderEntity> {
  constructor() {
    super('purchase_orders');
  }

  async createWithLines(
    po: Omit<PurchaseOrderEntity, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>,
    lines: Omit<PurchaseOrderLineEntity, 'id' | 'tenant_id' | 'purchase_order_id' | 'created_at'>[]
  ): Promise<{ order: PurchaseOrderEntity; lines: PurchaseOrderLineEntity[] }> {
    const poId = this.generateUUID();
    const tenantId = this.getTenantId();
    const now = new Date().toISOString();

    const poEntity: PurchaseOrderEntity = {
      id: poId,
      tenant_id: tenantId,
      po_number: po.po_number,
      supplier_id: po.supplier_id,
      order_date: po.order_date,
      expected_delivery_date: po.expected_delivery_date || null,
      status: po.status || 'draft',
      payment_status: po.payment_status || 'unpaid',
      subtotal: po.subtotal,
      tax_amount: po.tax_amount,
      total_amount: po.total_amount,
      paid_amount: po.paid_amount || 0,
      journal_entry_id: po.journal_entry_id || null,
      notes: po.notes || null,
      created_by: po.created_by,
      sync_status: 'pending',
      sync_version: 1,
      last_sync_at: null,
      created_at: now,
      updated_at: now,
      deleted_at: null
    };

    const lineEntities: PurchaseOrderLineEntity[] = lines.map((l) => ({
      id: this.generateUUID(),
      tenant_id: tenantId,
      purchase_order_id: poId,
      product_id: l.product_id,
      description: l.description || null,
      quantity_ordered: l.quantity_ordered,
      quantity_received: l.quantity_received || 0,
      unit_cost: l.unit_cost,
      tax_rate: l.tax_rate !== undefined ? l.tax_rate : 0.05,
      tax_amount: l.tax_amount,
      subtotal: l.subtotal,
      total: l.total,
      created_at: now
    }));

    await this.db.transaction(async (trx) => {
      await trx.run(
        `INSERT INTO purchase_orders (id, tenant_id, po_number, supplier_id, order_date, expected_delivery_date, status, payment_status, subtotal, tax_amount, total_amount, paid_amount, journal_entry_id, notes, created_by, sync_status, sync_version, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          poEntity.id,
          poEntity.tenant_id,
          poEntity.po_number,
          poEntity.supplier_id,
          poEntity.order_date,
          poEntity.expected_delivery_date,
          poEntity.status,
          poEntity.payment_status,
          poEntity.subtotal,
          poEntity.tax_amount,
          poEntity.total_amount,
          poEntity.paid_amount,
          poEntity.journal_entry_id,
          poEntity.notes,
          poEntity.created_by,
          poEntity.sync_status,
          poEntity.sync_version,
          poEntity.created_at,
          poEntity.updated_at
        ]
      );

      for (const line of lineEntities) {
        await trx.run(
          `INSERT INTO purchase_order_lines (id, tenant_id, purchase_order_id, product_id, description, quantity_ordered, quantity_received, unit_cost, tax_rate, tax_amount, subtotal, total, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            line.id,
            line.tenant_id,
            line.purchase_order_id,
            line.product_id,
            line.description,
            line.quantity_ordered,
            line.quantity_received,
            line.unit_cost,
            line.tax_rate,
            line.tax_amount,
            line.subtotal,
            line.total,
            line.created_at
          ]
        );
      }
    });

    return { order: poEntity, lines: lineEntities };
  }
}

// ----------------------------------------------------------------------------
// Production Orders Repository (12-Stage Manufacturing Pipeline)
// ----------------------------------------------------------------------------
export class ProductionOrdersRepository extends BaseRepository<ProductionOrderEntity> {
  constructor() {
    super('production_orders');
  }

  async create(order: Omit<ProductionOrderEntity, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>): Promise<ProductionOrderEntity> {
    const id = this.generateUUID();
    const tenantId = this.getTenantId();
    const now = new Date().toISOString();

    const entity: ProductionOrderEntity = {
      id,
      tenant_id: tenantId,
      order_number: order.order_number,
      quotation_id: order.quotation_id || null,
      sales_invoice_id: order.sales_invoice_id || null,
      customer_id: order.customer_id || null,
      product_id: order.product_id,
      bom_id: order.bom_id || null,
      quantity: order.quantity || 1,
      width: order.width,
      height: order.height,
      color: order.color || null,
      glass_spec: order.glass_spec || null,
      current_stage: order.current_stage || 'draft',
      stage_progress: order.stage_progress || 0,
      estimated_material_cost: order.estimated_material_cost || 0,
      actual_material_cost: order.actual_material_cost || 0,
      estimated_labor_cost: order.estimated_labor_cost || 0,
      actual_labor_cost: order.actual_labor_cost || 0,
      assigned_technician_id: order.assigned_technician_id || null,
      start_date: order.start_date || null,
      target_completion_date: order.target_completion_date || null,
      actual_completion_date: order.actual_completion_date || null,
      notes: order.notes || null,
      created_by: order.created_by,
      sync_status: 'pending',
      sync_version: 1,
      last_sync_at: null,
      created_at: now,
      updated_at: now,
      deleted_at: null
    };

    await this.db.run(
      `INSERT INTO production_orders (id, tenant_id, order_number, quotation_id, sales_invoice_id, customer_id, product_id, bom_id, quantity, width, height, color, glass_spec, current_stage, stage_progress, estimated_material_cost, actual_material_cost, estimated_labor_cost, actual_labor_cost, assigned_technician_id, start_date, target_completion_date, actual_completion_date, notes, created_by, sync_status, sync_version, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entity.id,
        entity.tenant_id,
        entity.order_number,
        entity.quotation_id,
        entity.sales_invoice_id,
        entity.customer_id,
        entity.product_id,
        entity.bom_id,
        entity.quantity,
        entity.width,
        entity.height,
        entity.color,
        entity.glass_spec,
        entity.current_stage,
        entity.stage_progress,
        entity.estimated_material_cost,
        entity.actual_material_cost,
        entity.estimated_labor_cost,
        entity.actual_labor_cost,
        entity.assigned_technician_id,
        entity.start_date,
        entity.target_completion_date,
        entity.actual_completion_date,
        entity.notes,
        entity.created_by,
        entity.sync_status,
        entity.sync_version,
        entity.created_at,
        entity.updated_at
      ]
    );

    return entity;
  }

  async updateStage(orderId: string, nextStage: ProductionStage, progressPercentage: number): Promise<boolean> {
    const tenantId = this.getTenantId();
    const now = new Date().toISOString();
    const isClosed = nextStage === 'closed';

    const result = await this.db.run(
      `UPDATE production_orders SET current_stage = ?, stage_progress = ?, actual_completion_date = ?, updated_at = ?
       WHERE id = ? AND tenant_id = ?`,
      [nextStage, progressPercentage, isClosed ? now : null, now, orderId, tenantId]
    );

    return result.changes > 0;
  }
}

// ----------------------------------------------------------------------------
// Bills of Materials Repository (BOMs)
// ----------------------------------------------------------------------------
export class BOMsRepository extends BaseRepository<BOMEntity> {
  constructor() {
    super('bills_of_materials');
  }

  async createWithComponents(
    bom: Omit<BOMEntity, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>,
    components: Omit<BOMComponentEntity, 'id' | 'tenant_id' | 'bom_id' | 'created_at'>[]
  ): Promise<{ bom: BOMEntity; components: BOMComponentEntity[] }> {
    const bomId = this.generateUUID();
    const tenantId = this.getTenantId();
    const now = new Date().toISOString();

    const bomEntity: BOMEntity = {
      id: bomId,
      tenant_id: tenantId,
      code: bom.code,
      name: bom.name,
      name_ar: bom.name_ar,
      product_id: bom.product_id,
      version: bom.version || 1,
      type: bom.type,
      labor_hours_estimate: bom.labor_hours_estimate || 4.0,
      labor_rate_hourly: bom.labor_rate_hourly || 1500,
      overhead_allocation_rate: bom.overhead_allocation_rate || 2500,
      is_active: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null
    };

    const compEntities: BOMComponentEntity[] = components.map((c) => ({
      id: this.generateUUID(),
      tenant_id: tenantId,
      bom_id: bomId,
      product_id: c.product_id,
      formula_type: c.formula_type,
      formula_expression: c.formula_expression || null,
      fixed_quantity: c.fixed_quantity || 0,
      unit: c.unit,
      waste_factor: c.waste_factor || 1.05,
      unit_cost: c.unit_cost || 0,
      created_at: now
    }));

    await this.db.transaction(async (trx) => {
      await trx.run(
        `INSERT INTO bills_of_materials (id, tenant_id, code, name, name_ar, product_id, version, type, labor_hours_estimate, labor_rate_hourly, overhead_allocation_rate, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          bomEntity.id,
          bomEntity.tenant_id,
          bomEntity.code,
          bomEntity.name,
          bomEntity.name_ar,
          bomEntity.product_id,
          bomEntity.version,
          bomEntity.type,
          bomEntity.labor_hours_estimate,
          bomEntity.labor_rate_hourly,
          bomEntity.overhead_allocation_rate,
          bomEntity.is_active,
          bomEntity.created_at,
          bomEntity.updated_at
        ]
      );

      for (const comp of compEntities) {
        await trx.run(
          `INSERT INTO bom_components (id, tenant_id, bom_id, product_id, formula_type, formula_expression, fixed_quantity, unit, waste_factor, unit_cost, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            comp.id,
            comp.tenant_id,
            comp.bom_id,
            comp.product_id,
            comp.formula_type,
            comp.formula_expression,
            comp.fixed_quantity,
            comp.unit,
            comp.waste_factor,
            comp.unit_cost,
            comp.created_at
          ]
        );
      }
    });

    return { bom: bomEntity, components: compEntities };
  }
}

// ----------------------------------------------------------------------------
// Employees Repository
// ----------------------------------------------------------------------------
export class EmployeesRepository extends BaseRepository<EmployeeEntity> {
  constructor() {
    super('employees');
  }

  async create(employee: Omit<EmployeeEntity, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>): Promise<EmployeeEntity> {
    const id = this.generateUUID();
    const tenantId = this.getTenantId();
    const now = new Date().toISOString();

    const entity: EmployeeEntity = {
      id,
      tenant_id: tenantId,
      code: employee.code,
      name: employee.name,
      name_ar: employee.name_ar,
      role: employee.role,
      phone: employee.phone,
      salary_type: employee.salary_type,
      base_rate: employee.base_rate || 0,
      is_active: employee.is_active !== undefined ? employee.is_active : 1,
      created_at: now,
      updated_at: now,
      deleted_at: null
    };

    await this.db.run(
      `INSERT INTO employees (id, tenant_id, code, name, name_ar, role, phone, salary_type, base_rate, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entity.id,
        entity.tenant_id,
        entity.code,
        entity.name,
        entity.name_ar,
        entity.role,
        entity.phone,
        entity.salary_type,
        entity.base_rate,
        entity.is_active,
        entity.created_at,
        entity.updated_at
      ]
    );

    return entity;
  }
}

// ----------------------------------------------------------------------------
// Sync Outbox & Audit Logs Repositories
// ----------------------------------------------------------------------------
export class SyncOutboxRepository {
  async queueSync(
    localEntity: string,
    localId: string,
    operation: 'INSERT' | 'UPDATE' | 'DELETE',
    payload: any,
    tenantId?: string
  ): Promise<SyncOutboxEntity> {
    const db = DatabaseService.getInstance();
    const tid = tenantId || db.getTenantId();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const entity: SyncOutboxEntity = {
      id,
      tenant_id: tid,
      local_entity: localEntity,
      local_id: localId,
      operation,
      payload: typeof payload === 'string' ? payload : JSON.stringify(payload),
      status: 'pending',
      retry_count: 0,
      error_message: null,
      created_at: now,
      last_attempt: null
    };

    await db.run(
      `INSERT INTO sync_outbox (id, tenant_id, local_entity, local_id, operation, payload, status, retry_count, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entity.id,
        entity.tenant_id,
        entity.local_entity,
        entity.local_id,
        entity.operation,
        entity.payload,
        entity.status,
        entity.retry_count,
        entity.created_at
      ]
    );

    return entity;
  }

  async getPendingQueue(limit = 50, tenantId?: string): Promise<SyncOutboxEntity[]> {
    const db = DatabaseService.getInstance();
    const tid = tenantId || db.getTenantId();
    return db.query<SyncOutboxEntity>(
      `SELECT * FROM sync_outbox WHERE tenant_id = ? AND status = 'pending' ORDER BY created_at ASC LIMIT ${limit}`,
      [tid]
    );
  }
}

export class AuditLogsRepository {
  async log(
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'POST' | 'REVERSE' | 'SYNC',
    entity: string,
    recordId: string,
    details: string,
    detailsAr?: string,
    userName = 'System Admin',
    tenantId?: string
  ): Promise<AuditLogEntity> {
    const db = DatabaseService.getInstance();
    const tid = tenantId || db.getTenantId();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const entityRecord: AuditLogEntity = {
      id,
      tenant_id: tid,
      user_id: 'usr-admin-01',
      user_name: userName,
      device_id: 'local-sqlite-device',
      entity,
      action,
      record_id: recordId,
      details,
      details_ar: detailsAr || details,
      created_at: now
    };

    await db.run(
      `INSERT INTO audit_logs (id, tenant_id, user_id, user_name, device_id, entity, action, record_id, details, details_ar, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entityRecord.id,
        entityRecord.tenant_id,
        entityRecord.user_id,
        entityRecord.user_name,
        entityRecord.device_id,
        entityRecord.entity,
        entityRecord.action,
        entityRecord.record_id,
        entityRecord.details,
        entityRecord.details_ar,
        entityRecord.created_at
      ]
    );

    return entityRecord;
  }
}
