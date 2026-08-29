// ============================================================================
// Workshop ERP - Local SQLite Database TypeScript Interfaces & Entities
// ============================================================================

export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'conflict' | 'failed';
export type UserRole = 'admin' | 'accountant' | 'storekeeper' | 'production_manager' | 'sales_officer' | 'technician';
export type SupplierCategory = 'aluminium' | 'glass' | 'accessories' | 'iron' | 'consumables' | 'other';
export type ProductType =
  | 'raw_material'
  | 'finished_good'
  | 'semi_finished'
  | 'service'
  | 'accessory'
  | 'glass'
  | 'profile'
  | 'consumable'
  | 'raw_profile'
  | 'raw_glass'
  | 'paint_powder'
  | 'finished_assembly'
  | 'reusable_offcut';
export type ProductUnit = 'bar_6m' | 'sqm' | 'piece' | 'kg' | 'meter' | 'set' | 'liter' | 'box';
export type StockMovementType =
  | 'purchase_receipt'
  | 'purchase_return'
  | 'sale_delivery'
  | 'sale_return'
  | 'transfer_in'
  | 'transfer_out'
  | 'adjustment_in'
  | 'adjustment_out'
  | 'wastage'
  | 'production_consumption'
  | 'production_output'
  | 'reusable_offcut_return';
export type StockDirection = 'in' | 'out';
export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
export type AccountNature = 'debit' | 'credit';
export type JournalEntryStatus = 'draft' | 'posted' | 'reversed';
export type QuotationStatus = 'draft' | 'sent' | 'approved' | 'converted' | 'rejected' | 'expired';
export type PaymentTerm = 'cash' | 'credit_30' | 'credit_60' | 'installments';
export type PaymentStatus = 'unpaid' | 'partially_paid' | 'paid';
export type PurchaseOrderStatus =
  | 'draft'
  | 'approved'
  | 'partially_received'
  | 'received'
  | 'invoiced'
  | 'closed'
  | 'cancelled'
  | 'sent'
  | 'billed';
export type BOMType = 'sliding_window' | 'hinged_window' | 'sliding_door' | 'hinged_door' | 'handrail' | 'custom';
export type BOMFormulaType = 'parametric_dimension' | 'area_based' | 'fixed_count';
export type ProductionStage =
  | 'draft'
  | 'dimension_taking'
  | 'cutting_profiles'
  | 'machining_milling'
  | 'corner_crimping'
  | 'rubber_gaskets'
  | 'hardware_assembly'
  | 'glass_cutting_install'
  | 'quality_control'
  | 'packaging'
  | 'site_installation'
  | 'closed';
export type EmployeeRole = 'master_technician' | 'cutter' | 'assembler' | 'glazier' | 'installer' | 'driver' | 'admin';
export type SalaryType = 'monthly' | 'daily' | 'per_piece';
export type SyncOperation = 'INSERT' | 'UPDATE' | 'DELETE';
export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'POST' | 'REVERSE' | 'SYNC';

// Base Entity with multi-tenancy & timestamps
export interface BaseEntity {
  id: string; // UUID
  tenant_id: string; // Tenant isolation key
  created_at?: string; // ISO 8601 Timestamp
  updated_at?: string; // ISO 8601 Timestamp
  deleted_at?: string | null; // Soft-delete column
}

export interface SyncableEntity extends BaseEntity {
  sync_status?: SyncStatus;
  sync_version?: number;
  last_sync_at?: string | null;
}

// 1. Tenant Entity
export interface TenantEntity {
  id: string;
  code: string;
  name: string;
  name_ar: string;
  legal_name?: string | null;
  tax_number?: string | null;
  commercial_reg_number?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  base_currency: string;
  currency_symbol: string;
  tax_rate: number;
  is_active: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

// 2. User Entity
export interface UserEntity extends SyncableEntity {
  username: string;
  email: string;
  password_hash: string;
  full_name: string;
  full_name_ar: string;
  role: UserRole;
  phone?: string | null;
  is_active: number;
}

// 3. Customer Entity
export interface CustomerEntity extends SyncableEntity {
  code: string;
  name: string;
  name_ar: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  tax_id?: string | null;
  credit_limit: number;
  current_balance: number;
  notes?: string | null;
  is_active: number;
}

// 4. Supplier Entity
export interface SupplierEntity extends SyncableEntity {
  code: string;
  name: string;
  name_ar: string;
  company_name?: string | null;
  phone: string;
  email?: string | null;
  address?: string | null;
  tax_id?: string | null;
  current_balance: number;
  category: SupplierCategory;
  notes?: string | null;
  is_active: number;
}

// 5. Warehouse Entity
export interface WarehouseEntity extends BaseEntity {
  code: string;
  name: string;
  name_ar: string;
  location?: string | null;
  is_primary: number;
  is_active: number;
}

// 6. Product Entity
export interface ProductEntity extends SyncableEntity {
  sku: string;
  name: string;
  name_ar: string;
  type: ProductType;
  category: string;
  unit: ProductUnit;
  unit_cost: number;
  unit_price: number;
  min_stock: number;
  max_stock: number;
  reorder_point: number;
  track_inventory: number;
  specifications?: string | null; // JSON string
  barcode?: string | null;
}

// 7. Stock Movement Entity
export interface StockMovementEntity {
  id: string;
  tenant_id: string;
  product_id: string;
  warehouse_id: string;
  type: StockMovementType;
  direction: StockDirection;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  reference_type?: string | null;
  reference_id?: string | null;
  notes?: string | null;
  created_by: string;
  sync_status?: SyncStatus;
  sync_version?: number;
  created_at: string;
}

// 8. Chart of Accounts Entity
export interface AccountEntity extends BaseEntity {
  code: string;
  name: string;
  name_ar: string;
  type: AccountType;
  nature: AccountNature;
  parent_id?: string | null;
  level: number;
  is_reconciliation: number;
  is_active: number;
}

// 9. Journal Entry Entity
export interface JournalEntryEntity {
  id: string;
  tenant_id: string;
  entry_number: string;
  date: string;
  reference_type?: string | null;
  reference_id?: string | null;
  source_document?: string | null;
  narration: string;
  narration_ar: string;
  total_debit: number;
  total_credit: number;
  status: JournalEntryStatus;
  reversed_entry_id?: string | null;
  reversal_reason?: string | null;
  created_by: string;
  sync_status?: SyncStatus;
  sync_version?: number;
  created_at: string;
}

// 10. Journal Entry Line Entity
export interface JournalEntryLineEntity {
  id: string;
  tenant_id: string;
  journal_entry_id: string;
  account_id: string;
  debit: number;
  credit: number;
  description?: string | null;
  partner_type?: 'customer' | 'supplier' | 'employee' | 'none' | null;
  partner_id?: string | null;
  cost_center_id?: string | null;
  line_order: number;
  created_at: string;
}

// 10.1 Journal Reversal Record
export interface JournalReversalEntity {
  id: string;
  tenant_id: string;
  original_entry_id: string;
  reversal_entry_id: string;
  reason?: string | null;
  created_at: string;
  created_by?: string | null;
}

export type PartnerType = 'customer' | 'supplier' | 'employee' | 'none';
export type SyncOutboxEntry = SyncOutboxEntity;

// ========== Phase 2 Accounting Input & Report Types ==========

export type JournalStatus = 'draft' | 'posted' | 'reversed';

export interface ChartOfAccount {
  id: string;
  tenant_id: string;
  code?: string;
  name?: string;
  name_ar?: string;
  type?: AccountType;
  nature?: AccountNature;
  // Aliases for backward compatibility
  account_code?: string;
  account_name?: string;
  account_name_ar?: string;
  account_type?: AccountType;
  parent_id?: string | null;
  is_postable: boolean;
  is_active: boolean;
  opening_balance: number;
  created_at: string;
  updated_at: string;
}

export interface JournalEntry {
  id: string;
  tenant_id: string;
  entry_number: string;
  date: string;
  reference_entity?: string;
  reference_type?: string;
  reference_id?: string;
  source_document?: string;
  narration?: string;
  narration_ar?: string;
  description?: string;
  status: JournalStatus;
  total_debit: number;
  total_credit: number;
  reversed_entry_id?: string | null;
  reversal_reason?: string | null;
  posted_at?: string;
  posted_by?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  sync_status: string;
  sync_version: number;
}

export interface JournalEntryLine {
  id: string;
  tenant_id: string;
  journal_entry_id: string;
  account_id: string;
  description?: string;
  debit: number;
  credit: number;
  line_order?: number;
  partner_type?: PartnerType | null;
  partner_id?: string | null;
  cost_center_id?: string | null;
  created_at: string;
}

export interface JournalReversal {
  id: string;
  tenant_id: string;
  original_entry_id: string;
  reversal_entry_id: string;
  reason?: string;
  created_at: string;
  created_by?: string;
}

export interface CreateJournalEntryInput {
  entry_number?: string;
  date: string;
  reference_type?: string;
  reference_id?: string;
  reference_entity?: string;
  source_document?: string;
  narration?: string;
  narration_ar?: string;
  description?: string;
  created_by?: string;
  lines: {
    account_id: string;
    debit?: number;
    credit?: number;
    description?: string;
    line_order?: number;
    partner_type?: 'customer' | 'supplier' | 'employee' | 'none' | null;
    partner_id?: string | null;
    cost_center_id?: string | null;
  }[];
}

export interface PostJournalEntryInput {
  entry_id: string;
  posted_by: string;
}

export interface ReverseJournalEntryInput {
  entry_id: string;
  reason?: string;
  reversed_by: string;
}

export interface TrialBalanceRow {
  account_code: string;
  account_name: string;
  account_type: string;
  code?: string;
  name?: string;
  name_ar?: string;
  type?: string;
  total_debit: number;
  total_credit: number;
  balance_debit: number;
  balance_credit: number;
}

export interface LedgerRow {
  date: string;
  entry_number: string;
  description: string;
  debit: number;
  credit: number;
  running_balance: number;
}

export interface ProfitAndLossReport {
  revenue: number;
  expenses: number;
  net_profit: number;
  revenueDetails?: { account_code: string; account_name: string; amount: number }[];
  expenseDetails?: { account_code: string; account_name: string; amount: number }[];
}

export interface BalanceSheetReport {
  assets: number;
  liabilities: number;
  equity: number;
  isBalanced: boolean;
  assetDetails?: { account_code: string; account_name: string; amount: number }[];
  liabilityDetails?: { account_code: string; account_name: string; amount: number }[];
  equityDetails?: { account_code: string; account_name: string; amount: number }[];
}

// 11. Quotation & Line Entities
export interface QuotationEntity extends SyncableEntity {
  quotation_number: string;
  customer_id: string;
  issue_date: string;
  valid_until: string;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  status: QuotationStatus;
  converted_invoice_id?: string | null;
  converted_production_order_id?: string | null;
  notes?: string | null;
  created_by: string;
}

export interface QuotationLineEntity {
  id: string;
  tenant_id: string;
  quotation_id: string;
  product_id: string;
  description?: string | null;
  width?: number | null;
  height?: number | null;
  color?: string | null;
  glass_type?: string | null;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  tax_amount: number;
  subtotal: number;
  total: number;
  created_at: string;
}

// 12. Sales Invoice & Line Entities
export interface SalesInvoiceEntity extends SyncableEntity {
  invoice_number: string;
  quotation_id?: string | null;
  customer_id: string;
  issue_date: string;
  due_date: string;
  payment_term: PaymentTerm;
  payment_status: PaymentStatus;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  paid_amount: number;
  journal_entry_id?: string | null;
  notes?: string | null;
  created_by: string;
}

export interface SalesInvoiceLineEntity {
  id: string;
  tenant_id: string;
  invoice_id: string;
  product_id: string;
  description?: string | null;
  width?: number | null;
  height?: number | null;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  tax_amount: number;
  subtotal: number;
  total: number;
  created_at: string;
}

// 13. Purchase Order & Line Entities
export interface PurchaseOrderEntity extends SyncableEntity {
  po_number: string;
  supplier_id: string;
  order_date: string;
  expected_delivery_date?: string | null;
  status: PurchaseOrderStatus;
  payment_status: PaymentStatus;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  paid_amount: number;
  journal_entry_id?: string | null;
  notes?: string | null;
  created_by: string;
}

export interface PurchaseOrderLineEntity {
  id: string;
  tenant_id: string;
  purchase_order_id: string;
  product_id: string;
  description?: string | null;
  quantity_ordered: number;
  quantity_received: number;
  unit_cost: number;
  tax_rate: number;
  tax_amount: number;
  subtotal: number;
  total: number;
  created_at: string;
}

// 14. BOM & Component Entities
export interface BOMEntity extends BaseEntity {
  code: string;
  name: string;
  name_ar: string;
  product_id: string;
  version: number;
  type: BOMType;
  labor_hours_estimate: number;
  labor_rate_hourly: number;
  overhead_allocation_rate: number;
  is_active: number;
}

export interface BOMComponentEntity {
  id: string;
  tenant_id: string;
  bom_id: string;
  product_id: string;
  formula_type: BOMFormulaType;
  formula_expression?: string | null;
  fixed_quantity: number;
  unit: string;
  waste_factor: number;
  unit_cost: number;
  created_at: string;
}

// 15. Production Order Entity
export interface ProductionOrderEntity extends SyncableEntity {
  order_number: string;
  quotation_id?: string | null;
  sales_invoice_id?: string | null;
  customer_id?: string | null;
  product_id: string;
  bom_id?: string | null;
  quantity: number;
  width: number;
  height: number;
  color?: string | null;
  glass_spec?: string | null;
  current_stage: ProductionStage;
  stage_progress: number;
  estimated_material_cost: number;
  actual_material_cost: number;
  estimated_labor_cost: number;
  actual_labor_cost: number;
  assigned_technician_id?: string | null;
  start_date?: string | null;
  target_completion_date?: string | null;
  actual_completion_date?: string | null;
  notes?: string | null;
  created_by: string;
}

// 16. Employee Entity
export interface EmployeeEntity extends BaseEntity {
  code: string;
  name: string;
  name_ar: string;
  role: EmployeeRole;
  phone: string;
  salary_type: SalaryType;
  base_rate: number;
  is_active: number;
}

// 17. Sync Outbox Entity
export interface SyncOutboxEntity {
  id: string;
  tenant_id: string;
  local_entity: string;
  local_id: string;
  operation: SyncOperation;
  payload: string; // JSON
  status: SyncStatus;
  retry_count: number;
  error_message?: string | null;
  created_at: string;
  last_attempt?: string | null;
}

// 18. Audit Log Entity
export interface AuditLogEntity {
  id: string;
  tenant_id: string;
  user_id?: string | null;
  user_name: string;
  device_id: string;
  entity: string;
  action: AuditAction;
  record_id: string;
  details: string;
  details_ar?: string | null;
  created_at: string;
}

// Query Execution Results & Options
export interface QueryResult<T = any> {
  values?: T[];
  changes?: {
    changes: number;
    lastId?: number | string;
  };
}

export interface PaginationOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
}

// ============================================================================
// Phase 3 Inventory, Sales & Purchase Types
// ============================================================================

export interface Category {
  id: string;
  tenant_id: string;
  name: string;
  name_ar?: string;
  parent_id?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface Unit {
  id: string;
  tenant_id: string;
  name: string;
  name_ar?: string;
  symbol?: string;
  base_unit_id?: string | null;
  conversion_factor: number;
  created_at: string;
  updated_at: string;
}

export interface Warehouse {
  id: string;
  tenant_id: string;
  name: string;
  name_ar?: string;
  location?: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface Product {
  id: string;
  tenant_id: string;
  type: ProductType;
  sku?: string;
  name: string;
  name_ar?: string;
  description?: string;
  category_id?: string | null;
  unit_id?: string | null;
  cost_method: 'weighted_average' | 'fifo';
  is_stockable: boolean;
  is_sellable: boolean;
  is_purchasable: boolean;
  barcode?: string;
  min_stock_level: number;
  max_stock_level: number;
  reorder_point: number;
  opening_stock: number;
  opening_stock_date?: string;
  sync_status: string;
  sync_version: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface StockMovement {
  id: string;
  tenant_id: string;
  product_id: string;
  warehouse_id: string;
  movement_type: StockMovementType;
  direction: 'in' | 'out';
  quantity: number;
  unit_cost: number;
  total_cost: number;
  reference_entity?: string;
  reference_id?: string;
  notes?: string;
  created_by: string;
  sync_status: string;
  sync_version: number;
  created_at: string;
}

export interface StockBalance {
  id: string;
  tenant_id: string;
  product_id: string;
  warehouse_id: string;
  quantity: number;
  reserved_quantity: number;
  average_cost: number;
  updated_at: string;
}

// ========== Sales Types ==========

export type InvoiceStatus = 'draft' | 'posted' | 'void' | 'partially_paid' | 'paid';

export interface SalesInvoice {
  id: string;
  tenant_id: string;
  customer_id: string;
  invoice_number?: string;
  date: string;
  due_date?: string;
  status: InvoiceStatus;
  payment_status: PaymentStatus;
  subtotal: number;
  discount_total: number;
  tax_total: number;
  grand_total: number;
  paid_amount: number;
  balance: number;
  notes?: string;
  journal_entry_id?: string;
  sync_status: string;
  sync_version: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface SaleInvoiceLine {
  id: string;
  tenant_id: string;
  invoice_id: string;
  product_id?: string;
  description?: string;
  quantity: number;
  unit_price: number;
  discount: number;
  tax_rate: number;
  total: number;
  line_order: number;
}

// ========== Purchase Types ==========

export interface PurchaseOrder {
  id: string;
  tenant_id: string;
  supplier_id: string;
  order_number?: string;
  date: string;
  expected_date?: string;
  status: PurchaseOrderStatus;
  subtotal: number;
  tax_total: number;
  grand_total: number;
  notes?: string;
  sync_status: string;
  sync_version: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface PurchaseOrderLine {
  id: string;
  tenant_id: string;
  purchase_order_id: string;
  product_id?: string;
  description?: string;
  quantity: number;
  unit_price: number;
  total: number;
  line_order: number;
}

export interface SupplierInvoice {
  id: string;
  tenant_id: string;
  supplier_id: string;
  purchase_order_id?: string;
  invoice_number?: string;
  date: string;
  due_date?: string;
  status: InvoiceStatus;
  payment_status: PaymentStatus;
  subtotal: number;
  tax_total: number;
  grand_total: number;
  paid_amount: number;
  balance: number;
  notes?: string;
  journal_entry_id?: string;
  sync_status: string;
  sync_version: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface CashAccount {
  id: string;
  tenant_id: string;
  name: string;
  name_ar?: string;
  account_type: 'cash' | 'bank' | 'petty_cash';
  account_id?: string;
  balance: number;
  is_active: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface Payment {
  id: string;
  tenant_id: string;
  payment_type:
    | 'customer_payment'
    | 'supplier_payment'
    | 'expense_payment'
    | 'owner_withdrawal'
    | 'owner_contribution';
  reference_entity?: string;
  reference_id?: string;
  amount: number;
  payment_method: 'cash' | 'bank_transfer' | 'cheque';
  cash_account_id?: string;
  date: string;
  notes?: string;
  journal_entry_id?: string;
  sync_status: string;
  sync_version: number;
  created_at: string;
}
