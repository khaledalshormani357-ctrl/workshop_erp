// ============================================================================
// Workshop ERP - Manufacturing & Production Repositories (Phase 4 Engine)
// Covers: ProductionOrdersRepository, BOMsRepository, EmployeesRepository
// ============================================================================

import { BaseRepository } from '../db/repositories/BaseRepository';
import {
  ProductionOrderEntity,
  BOMEntity,
  BOMComponentEntity,
  EmployeeEntity,
  ProductionStage,
  BOMType,
  BOMFormulaType
} from '../db/types';
import { DatabaseService } from '../db/databaseService';

export interface CreateProductionOrderInput {
  order_number?: string;
  order_type?: string;
  quotation_id?: string;
  sales_invoice_id?: string;
  customer_id?: string;
  product_id: string;
  bom_id?: string;
  quantity?: number;
  width?: number;
  height?: number;
  dimensions?: { width?: number; height?: number; color?: string };
  color?: string;
  glass_spec?: string;
  current_stage?: ProductionStage;
  status?: string;
  stage_progress?: number;
  estimated_material_cost?: number;
  actual_material_cost?: number;
  estimated_labor_cost?: number;
  actual_labor_cost?: number;
  assigned_technician_id?: string;
  start_date?: string;
  target_completion_date?: string;
  actual_completion_date?: string;
  priority?: string;
  notes?: string;
  created_by?: string;
}

export interface CreateBOMInput {
  code?: string;
  bom_code?: string;
  name: string;
  name_ar: string;
  product_id: string;
  version?: number;
  type?: BOMType;
  status?: string;
  labor_hours_estimate?: number;
  labor_cost_estimate?: number;
  labor_rate_hourly?: number;
  overhead_cost_estimate?: number;
  overhead_allocation_rate?: number;
  items?: {
    product_id: string;
    formula_type?: BOMFormulaType;
    formula_expression?: string;
    fixed_quantity?: number;
    unit?: string;
    waste_factor?: number;
    unit_cost?: number;
  }[];
  components?: {
    product_id: string;
    formula_type: BOMFormulaType;
    formula_expression?: string;
    fixed_quantity?: number;
    unit: string;
    waste_factor?: number;
    unit_cost?: number;
  }[];
}

// ----------------------------------------------------------------------------
// 1. Production Orders Repository
// ----------------------------------------------------------------------------
export class ProductionOrdersRepository extends BaseRepository<ProductionOrderEntity> {
  constructor() {
    super('production_orders');
  }

  /**
   * Generates sequential production order number: WO-YYYYMM-XXXX
   */
  private async generateOrderNumber(): Promise<string> {
    const tenantId = this.getTenantId();
    const date = new Date();
    const prefix = `WO-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    const rows = await this.db.query<{ order_number: string }>(
      `SELECT order_number FROM production_orders WHERE tenant_id = ? AND order_number LIKE ? ORDER BY created_at DESC LIMIT 1`,
      [tenantId, `${prefix}%`]
    );

    if (rows.length === 0) {
      return `${prefix}-0001`;
    }

    const lastNumStr = rows[0].order_number.split('-').pop();
    const nextSeq = lastNumStr ? parseInt(lastNumStr, 10) + 1 : 1;
    return `${prefix}-${String(nextSeq).padStart(4, '0')}`;
  }

  async create(input: CreateProductionOrderInput): Promise<ProductionOrderEntity> {
    const id = this.generateUUID();
    const tenantId = this.getTenantId();
    const now = new Date().toISOString();
    const orderNumber = input.order_number || (await this.generateOrderNumber());

    const w = input.width !== undefined ? input.width : (input.dimensions?.width || 120);
    const h = input.height !== undefined ? input.height : (input.dimensions?.height || 120);
    const col = input.color || input.dimensions?.color || null;

    const entity: ProductionOrderEntity = {
      id,
      tenant_id: tenantId,
      order_number: orderNumber,
      quotation_id: input.quotation_id || null,
      sales_invoice_id: input.sales_invoice_id || null,
      customer_id: input.customer_id || null,
      product_id: input.product_id,
      bom_id: input.bom_id || null,
      quantity: input.quantity || 1,
      width: w,
      height: h,
      color: col,
      glass_spec: input.glass_spec || null,
      current_stage: input.current_stage || 'draft',
      stage_progress: input.stage_progress || 0,
      estimated_material_cost: input.estimated_material_cost || 0,
      actual_material_cost: input.actual_material_cost || 0,
      estimated_labor_cost: input.estimated_labor_cost || 0,
      actual_labor_cost: input.actual_labor_cost || 0,
      assigned_technician_id: input.assigned_technician_id || null,
      start_date: input.start_date || now.split('T')[0],
      target_completion_date: input.target_completion_date || null,
      actual_completion_date: input.actual_completion_date || null,
      notes: input.notes || null,
      created_by: input.created_by || 'system',
      sync_status: 'pending',
      sync_version: 1,
      last_sync_at: null,
      created_at: now,
      updated_at: now,
      deleted_at: null
    };

    await this.db.transaction(async () => {
      await this.db.run(
        `INSERT INTO production_orders (
          id, tenant_id, order_number, quotation_id, sales_invoice_id, customer_id, product_id,
          bom_id, quantity, width, height, color, glass_spec, current_stage, stage_progress,
          estimated_material_cost, actual_material_cost, estimated_labor_cost, actual_labor_cost,
          assigned_technician_id, start_date, target_completion_date, actual_completion_date,
          notes, created_by, sync_status, sync_version, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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

      // Log Outbox Event
      await this.db.run(
        `INSERT INTO sync_outbox (id, tenant_id, entity_type, entity_id, operation, payload, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          this.generateUUID(),
          tenantId,
          'production_order',
          entity.id,
          'INSERT',
          JSON.stringify(entity),
          now
        ]
      );
    });

    return entity;
  }

  async updateStage(
    orderId: string,
    nextStage: ProductionStage,
    progressPercentage: number,
    notes?: string
  ): Promise<boolean> {
    const tenantId = this.getTenantId();
    const now = new Date().toISOString();
    const isClosed = nextStage === 'closed';

    const res = await this.db.transaction(async () => {
      let updateSql = `UPDATE production_orders SET current_stage = ?, stage_progress = ?, updated_at = ?`;
      const updateParams: any[] = [nextStage, progressPercentage, now];

      if (isClosed) {
        updateSql += `, actual_completion_date = ?`;
        updateParams.push(now);
      }
      if (notes !== undefined && notes !== null) {
        updateSql += `, notes = ?`;
        updateParams.push(notes);
      }

      updateSql += ` WHERE id = ? AND tenant_id = ?`;
      updateParams.push(orderId, tenantId);

      const updateResult = await this.db.run(updateSql, updateParams);

      // Log stage transition in production_order_stages
      await this.db.run(
        `INSERT INTO production_order_stages (
          id, tenant_id, production_order_id, stage, status, entered_at, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          this.generateUUID(),
          tenantId,
          orderId,
          nextStage,
          nextStage === 'closed' ? 'completed' : 'in_progress',
          now,
          notes || null,
          now
        ]
      );

      if (updateResult.changes > 0) {
        await this.db.run(
          `INSERT INTO sync_outbox (id, tenant_id, entity_type, entity_id, operation, payload, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            this.generateUUID(),
            tenantId,
            'production_order',
            orderId,
            'UPDATE',
            JSON.stringify({ current_stage: nextStage, stage_progress: progressPercentage, updated_at: now }),
            now
          ]
        );
      }
      return updateResult.changes > 0;
    });

    return res;
  }

  async assignTechnician(orderId: string, technicianId: string): Promise<boolean> {
    const tenantId = this.getTenantId();
    const now = new Date().toISOString();

    const res = await this.db.run(
      `UPDATE production_orders 
       SET assigned_technician_id = ?, updated_at = ? 
       WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL`,
      [technicianId, now, orderId, tenantId]
    );

    return res.changes > 0;
  }

  async listByStage(stage?: ProductionStage): Promise<ProductionOrderEntity[]> {
    const tenantId = this.getTenantId();
    if (stage) {
      return await this.db.query<ProductionOrderEntity>(
        `SELECT * FROM production_orders WHERE tenant_id = ? AND current_stage = ? AND deleted_at IS NULL ORDER BY created_at DESC`,
        [tenantId, stage]
      );
    }
    return await this.db.query<ProductionOrderEntity>(
      `SELECT * FROM production_orders WHERE tenant_id = ? AND deleted_at IS NULL ORDER BY created_at DESC`,
      [tenantId]
    );
  }

  async getWithDetails(orderId: string): Promise<{
    order: ProductionOrderEntity;
    stages: { stage: string; status: string; entered_at: string; notes?: string }[];
    bom?: BOMEntity & { components: BOMComponentEntity[] };
  } | null> {
    const tenantId = this.getTenantId();
    const orderRows = await this.db.query<ProductionOrderEntity>(
      `SELECT * FROM production_orders WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL`,
      [orderId, tenantId]
    );

    if (orderRows.length === 0) return null;
    const order = orderRows[0];

    const stages = await this.db.query<{ stage: string; status: string; entered_at: string; notes?: string }>(
      `SELECT stage, status, entered_at, notes FROM production_order_stages WHERE production_order_id = ? AND tenant_id = ? ORDER BY entered_at ASC`,
      [orderId, tenantId]
    );

    if (!order.bom_id) {
      return { order, stages };
    }

    const bomRepo = new BOMsRepository();
    const bom = await bomRepo.getWithComponents(order.bom_id);
    return { order, stages, bom: bom || undefined };
  }
}

// ----------------------------------------------------------------------------
// 2. Bills of Materials (BOM) Repository
// ----------------------------------------------------------------------------
export class BOMsRepository extends BaseRepository<BOMEntity> {
  constructor() {
    super('bills_of_materials');
  }

  async createWithComponents(input: CreateBOMInput): Promise<{
    bom: BOMEntity;
    components: BOMComponentEntity[];
  }> {
    const bomId = this.generateUUID();
    const tenantId = this.getTenantId();
    const now = new Date().toISOString();

    const bomCode = input.bom_code || input.code || `BOM-${Date.now().toString().slice(-4)}`;
    const bomType: BOMType = input.type || 'sliding_window';

    const bomEntity: BOMEntity = {
      id: bomId,
      tenant_id: tenantId,
      code: bomCode,
      name: input.name,
      name_ar: input.name_ar,
      product_id: input.product_id,
      version: input.version || 1,
      type: bomType,
      labor_hours_estimate: input.labor_hours_estimate || 4.0,
      labor_rate_hourly: input.labor_rate_hourly || 1500,
      overhead_allocation_rate: input.overhead_allocation_rate || input.overhead_cost_estimate || 2500,
      is_active: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null
    };

    const rawComponents = input.components || input.items || [];
    const compEntities: BOMComponentEntity[] = rawComponents.map((c) => ({
      id: this.generateUUID(),
      tenant_id: tenantId,
      bom_id: bomId,
      product_id: c.product_id,
      formula_type: c.formula_type || 'fixed',
      formula_expression: c.formula_expression || null,
      fixed_quantity: c.fixed_quantity || 0,
      unit: c.unit || 'unit',
      waste_factor: c.waste_factor !== undefined ? c.waste_factor : 1.05,
      unit_cost: c.unit_cost || 0,
      created_at: now
    }));

    await this.db.transaction(async () => {
      await this.db.run(
        `INSERT INTO bills_of_materials (
          id, tenant_id, code, name, name_ar, product_id, version, type,
          labor_hours_estimate, labor_rate_hourly, overhead_allocation_rate, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        await this.db.run(
          `INSERT INTO bom_components (
            id, tenant_id, bom_id, product_id, formula_type, formula_expression,
            fixed_quantity, unit, waste_factor, unit_cost, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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

      // Outbox Event
      await this.db.run(
        `INSERT INTO sync_outbox (id, tenant_id, entity_type, entity_id, operation, payload, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          this.generateUUID(),
          tenantId,
          'bill_of_materials',
          bomEntity.id,
          'INSERT',
          JSON.stringify({ bom: bomEntity, components: compEntities }),
          now
        ]
      );
    });

    return { bom: bomEntity, components: compEntities };
  }

  async create(input: CreateBOMInput): Promise<BOMEntity> {
    const res = await this.createWithComponents(input);
    return res.bom;
  }

  async getWithItems(bomId: string): Promise<(BOMEntity & { items: BOMComponentEntity[] }) | null> {
    const res = await this.getWithComponents(bomId);
    if (!res) return null;
    return {
      ...res,
      items: res.components
    };
  }

  async getWithComponents(bomId: string): Promise<(BOMEntity & { components: BOMComponentEntity[] }) | null> {
    const tenantId = this.getTenantId();
    const bomRows = await this.db.query<BOMEntity>(
      `SELECT * FROM bills_of_materials WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL`,
      [bomId, tenantId]
    );

    if (bomRows.length === 0) return null;

    const compRows = await this.db.query<BOMComponentEntity>(
      `SELECT * FROM bom_components WHERE bom_id = ? AND tenant_id = ? ORDER BY created_at ASC`,
      [bomId, tenantId]
    );

    return {
      ...bomRows[0],
      components: compRows
    };
  }

  async findByProductId(productId: string): Promise<(BOMEntity & { components: BOMComponentEntity[] }) | null> {
    const tenantId = this.getTenantId();
    const bomRows = await this.db.query<BOMEntity>(
      `SELECT * FROM bills_of_materials WHERE product_id = ? AND tenant_id = ? AND is_active = 1 AND deleted_at IS NULL ORDER BY version DESC LIMIT 1`,
      [productId, tenantId]
    );

    if (bomRows.length === 0) return null;
    return await this.getWithComponents(bomRows[0].id);
  }

  async listActive(): Promise<(BOMEntity & { componentsCount: number })[]> {
    const tenantId = this.getTenantId();
    const rows = await this.db.query<BOMEntity & { componentsCount: number }>(
      `SELECT b.*, COUNT(c.id) as componentsCount 
       FROM bills_of_materials b 
       LEFT JOIN bom_components c ON b.id = c.bom_id
       WHERE b.tenant_id = ? AND b.is_active = 1 AND b.deleted_at IS NULL
       GROUP BY b.id
       ORDER BY b.created_at DESC`,
      [tenantId]
    );
    return rows;
  }
}

// ----------------------------------------------------------------------------
// 3. Employees & Technicians Repository
// ----------------------------------------------------------------------------
export class EmployeesRepository extends BaseRepository<EmployeeEntity> {
  constructor() {
    super('employees');
  }

  async create(input: {
    employee_code?: string;
    name: string;
    name_ar?: string;
    role?: string;
    specialty?: string;
    hourly_rate?: number;
    phone?: string;
    status?: string;
    is_active?: number;
  }): Promise<EmployeeEntity> {
    const id = this.generateUUID();
    const tenantId = this.getTenantId();
    const now = new Date().toISOString();

    const entity: EmployeeEntity = {
      id,
      tenant_id: tenantId,
      employee_code: input.employee_code || `EMP-${Date.now().toString().slice(-4)}`,
      name: input.name,
      name_ar: input.name_ar || input.name,
      role: input.role || 'technician',
      specialty: input.specialty || null,
      hourly_rate: input.hourly_rate || 1500,
      phone: input.phone || null,
      status: input.status || 'active',
      is_active: input.is_active !== undefined ? input.is_active : 1,
      created_at: now,
      updated_at: now,
      deleted_at: null
    };

    await this.db.run(
      `INSERT INTO employees (
        id, tenant_id, employee_code, name, name_ar, role, specialty,
        hourly_rate, phone, status, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entity.id,
        entity.tenant_id,
        entity.employee_code,
        entity.name,
        entity.name_ar,
        entity.role,
        entity.specialty,
        entity.hourly_rate,
        entity.phone,
        entity.status,
        entity.is_active,
        entity.created_at,
        entity.updated_at
      ]
    );

    return entity;
  }

  async listAll(): Promise<EmployeeEntity[]> {
    return this.listByTenant();
  }

  async listActiveTechnicians(): Promise<EmployeeEntity[]> {
    const tenantId = this.getTenantId();
    return await this.db.query<EmployeeEntity>(
      `SELECT * FROM employees WHERE tenant_id = ? AND is_active = 1 AND deleted_at IS NULL ORDER BY name ASC`,
      [tenantId]
    );
  }
}
