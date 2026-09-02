// Domain Types for Workshop ERP Architecture & Specification (Phase 0)

export type Language = 'ar' | 'en';

export type UserRole = 
  | 'owner' 
  | 'manager' 
  | 'accountant' 
  | 'storekeeper' 
  | 'production' 
  | 'sales';

export interface User {
  id: string;
  tenant_id: string;
  name: string;
  name_ar: string;
  email: string;
  role: UserRole;
  avatar?: string;
  active: boolean;
}

export interface Tenant {
  id: string;
  name: string;
  name_ar: string;
  code: string;
  address: string;
  phone: string;
  currency: string;
  currency_symbol: string;
  tax_rate: number;
  tax_number: string;
  decimal_places: number;
  costing_method: 'weighted_average' | 'fifo' | 'standard';
  created_at: string;
}

export interface Customer {
  id: string;
  tenant_id: string;
  type: 'individual' | 'company' | 'contractor' | 'project';
  name: string;
  name_ar: string;
  phone: string;
  email?: string;
  address: string;
  tax_number?: string;
  credit_limit: number;
  opening_balance: number;
  current_balance: number;
  status: 'active' | 'archived';
  created_at: string;
}

export interface Supplier {
  id: string;
  tenant_id: string;
  name: string;
  name_ar: string;
  phone: string;
  email?: string;
  address: string;
  category: string;
  opening_balance: number;
  current_balance: number;
  status: 'active' | 'archived';
  created_at: string;
}

export type ProductType = 
  | 'raw' 
  | 'finished' 
  | 'semi' 
  | 'service' 
  | 'accessory' 
  | 'glass' 
  | 'profile' 
  | 'consumable';

export interface Unit {
  id: string;
  name: string;
  name_ar: string;
  symbol: string;
  base_factor: number;
}

export interface Category {
  id: string;
  name: string;
  name_ar: string;
  code: string;
  parent_id?: string;
}

export interface Warehouse {
  id: string;
  tenant_id: string;
  name: string;
  name_ar: string;
  code: string;
  location: string;
  is_default: boolean;
}

export interface Product {
  id: string;
  tenant_id: string;
  sku: string;
  name: string;
  name_ar: string;
  description: string;
  type: ProductType;
  category_id: string;
  unit_id: string;
  unit_price: number;
  unit_cost: number;
  min_stock: number;
  max_stock: number;
  is_stockable: boolean;
  is_sellable: boolean;
  is_purchasable: boolean;
  barcode?: string;
}

export type StockMovementType = 
  | 'purchase_receipt'
  | 'purchase_return'
  | 'sale_delivery'
  | 'sale_return'
  | 'transfer_in'
  | 'transfer_out'
  | 'adjustment_pos'
  | 'adjustment_neg'
  | 'wastage'
  | 'production_consumption'
  | 'production_output';

export interface StockMovement {
  id: string;
  tenant_id: string;
  product_id: string;
  warehouse_id: string;
  type: StockMovementType;
  quantity: number;
  unit_cost: number;
  direction: 'in' | 'out';
  reference_type: 'invoice' | 'purchase_order' | 'production_order' | 'adjustment' | 'manual';
  reference_id: string;
  notes?: string;
  created_by: string;
  created_at: string;
}

export interface QuotationItem {
  id: string;
  product_id: string;
  description: string;
  quantity: number;
  width?: number; // in cm
  height?: number; // in cm
  unit_price: number;
  discount: number;
  tax_rate: number;
  total: number;
  estimated_cost: number;
}

export interface Quotation {
  id: string;
  tenant_id: string;
  quote_number: string;
  customer_id: string;
  project_id?: string;
  revision: number;
  status: 'draft' | 'sent' | 'approved' | 'rejected' | 'converted';
  date: string;
  valid_until: string;
  items: QuotationItem[];
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  estimated_profit_margin: number;
  notes?: string;
  created_at: string;
}

export interface SalesInvoiceLine {
  id: string;
  product_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  discount: number;
  tax_rate: number;
  subtotal: number;
  total: number;
}

export interface Payment {
  id: string;
  tenant_id: string;
  reference_type: 'sales_invoice' | 'purchase_order' | 'customer_advance' | 'supplier_advance';
  reference_id: string;
  account_id: string; // Cash or Bank account
  party_id: string; // Customer or Supplier ID
  amount: number;
  payment_method: 'cash' | 'bank_transfer' | 'check' | 'pos';
  date: string;
  notes?: string;
  created_at: string;
}

export interface SalesInvoice {
  id: string;
  tenant_id: string;
  invoice_number: string;
  customer_id: string;
  quotation_id?: string;
  date: string;
  due_date: string;
  status: 'draft' | 'posted' | 'void';
  payment_status: 'unpaid' | 'partial' | 'paid';
  lines: SalesInvoiceLine[];
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  paid_amount: number;
  warehouse_id: string;
  created_at: string;
}

export interface PurchaseOrderLine {
  id: string;
  product_id: string;
  description: string;
  quantity: number;
  unit_cost: number;
  total: number;
}

export interface PurchaseOrder {
  id: string;
  tenant_id: string;
  po_number: string;
  supplier_id: string;
  date: string;
  expected_date: string;
  status: 'draft' | 'approved' | 'received' | 'invoiced' | 'closed';
  lines: PurchaseOrderLine[];
  total_amount: number;
  paid_amount: number;
  warehouse_id: string;
  created_at: string;
}

export type ProductionStage = 
  | 'draft'
  | 'approved'
  | 'materials_reserved'
  | 'materials_issued'
  | 'cutting'
  | 'assembly'
  | 'glass'
  | 'finishing'
  | 'quality_control'
  | 'ready'
  | 'delivered'
  | 'closed';

export interface BOMComponent {
  id: string;
  product_id: string;
  quantity_formula: string; // e.g. "2 * width + 2 * height + 10" or "quantity"
  formula_type: 'fixed' | 'parametric_dimension' | 'area_based';
  fixed_quantity: number;
  waste_factor: number; // e.g. 1.05 for 5% waste
  unit: string;
  unit_cost: number;
}

export interface BillOfMaterials {
  id: string;
  tenant_id: string;
  product_id: string;
  name: string;
  name_ar: string;
  revision: number;
  description: string;
  effective_date: string;
  components: BOMComponent[];
  labor_hours_estimate: number;
  labor_rate_hourly: number;
  overhead_allocation_rate: number;
  created_at: string;
}

export interface ProductionOrderStageHistory {
  stage: ProductionStage;
  entered_at: string;
  completed_at?: string;
  responsible_employee?: string;
  notes?: string;
}

export interface ProductionOrder {
  id: string;
  tenant_id: string;
  order_number: string;
  order_type: 'make-to-order' | 'make-to-stock';
  product_id: string;
  bom_id?: string;
  customer_id?: string;
  quotation_id?: string;
  project_id?: string;
  quantity: number;
  dimensions?: {
    width: number;
    height: number;
    depth?: number;
    color?: string;
  };
  due_date: string;
  current_stage: ProductionStage;
  stages_history: ProductionOrderStageHistory[];
  estimated_material_cost: number;
  actual_material_cost: number;
  estimated_labor_cost: number;
  actual_labor_cost: number;
  estimated_overhead_cost: number;
  actual_overhead_cost: number;
  created_at: string;
}

export type AccountType = 
  | 'asset' 
  | 'liability' 
  | 'equity' 
  | 'revenue' 
  | 'expense';

export interface Account {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  name_ar: string;
  type: AccountType;
  category: string;
  category_ar: string;
  parent_id?: string;
  is_postable: boolean;
  balance: number;
}

export interface JournalEntryLine {
  id: string;
  account_id: string;
  account_code: string;
  account_name: string;
  description: string;
  debit: number;
  credit: number;
}

export interface JournalEntry {
  id: string;
  tenant_id: string;
  entry_number: string;
  date: string;
  reference: string;
  source_entity: 'sales_invoice' | 'purchase' | 'payment' | 'wip_material' | 'wip_labor' | 'finished_goods' | 'adjustment' | 'manual';
  source_id?: string;
  status: 'draft' | 'posted' | 'reversed';
  lines: JournalEntryLine[];
  total_debit: number;
  total_credit: number;
  created_by: string;
  created_at: string;
}

export interface CashBankAccount {
  id: string;
  tenant_id: string;
  account_id: string;
  name: string;
  name_ar: string;
  type: 'cash' | 'bank';
  account_number?: string;
  currency: string;
  opening_balance: number;
  current_balance: number;
}

export interface AuditLog {
  id: string;
  tenant_id: string;
  user_name: string;
  device_id: string;
  entity: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'POST' | 'VOID' | 'REVERSE' | 'SYNC';
  record_id: string;
  details: string;
  details_ar: string;
  created_at: string;
}

export interface SyncOutboxItem {
  id: string;
  tenant_id: string;
  local_entity: string;
  local_id: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  payload: any;
  status: 'pending' | 'syncing' | 'synced' | 'conflict' | 'failed';
  retry_count: number;
  created_at: string;
  last_attempt?: string;
  error_message?: string;
}

export interface ADRItem {
  id: string;
  title: string;
  title_ar: string;
  decision: string;
  decision_ar: string;
  reason: string;
  reason_ar: string;
  implications: string;
  implications_ar: string;
}

export interface ClarificationAnswer {
  id: number;
  question: string;
  question_ar: string;
  proposed_answer: string;
  proposed_answer_ar: string;
  status: 'recommended' | 'confirmed' | 'customized';
  category?: string;
}

export interface Project {
  id: string;
  tenant_id: string;
  project_code: string;
  name: string;
  name_ar: string;
  customer_id: string;
  location: string;
  status: 'planning' | 'active' | 'in_progress' | 'completed' | 'on_hold';
  start_date: string;
  end_date?: string;
  total_contract_value: number;
  notes?: string;
  created_at: string;
}

export interface MeasurementRecord {
  id: string;
  tenant_id: string;
  project_id?: string;
  customer_id?: string;
  tag_number: string;
  location_name: string;
  location_name_ar: string;
  product_type: 'sliding_window' | 'hinged_window' | 'sliding_door' | 'hinged_door' | 'handrail' | 'custom' | string;
  width: number; // in cm
  height: number; // in cm
  depth?: number; // in cm
  quantity: number;
  color: string;
  glass_spec: string;
  status: 'draft' | 'verified' | 'converted_to_bom';
  notes?: string;
  created_at: string;
}

