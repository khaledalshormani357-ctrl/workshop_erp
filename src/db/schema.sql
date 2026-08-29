-- ============================================================================
-- Workshop ERP - Local SQLite Database Schema (Phase 1 DDL)
-- Architecture: Offline-First + Multi-Tenant + Double-Entry + Event-Sourced Stock
-- ============================================================================

PRAGMA foreign_keys = ON;

-- ----------------------------------------------------------------------------
-- 1. Tenants (Multi-Tenant Organization Configuration)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY NOT NULL,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  legal_name TEXT,
  tax_number TEXT,
  commercial_reg_number TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  base_currency TEXT NOT NULL DEFAULT 'YER',
  currency_symbol TEXT NOT NULL DEFAULT '﷼',
  tax_rate REAL NOT NULL DEFAULT 0.05,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_tenants_code ON tenants(code);

-- ----------------------------------------------------------------------------
-- 2. Users & Authentication (RBAC with Password Hash)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY NOT NULL,
  tenant_id TEXT NOT NULL,
  username TEXT NOT NULL,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  full_name_ar TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin', 'accountant', 'storekeeper', 'production_manager', 'sales_officer', 'technician')),
  phone TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  sync_status TEXT NOT NULL DEFAULT 'synced' CHECK(sync_status IN ('pending', 'syncing', 'synced', 'conflict')),
  sync_version INTEGER NOT NULL DEFAULT 1,
  last_sync_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  deleted_at TEXT,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT,
  UNIQUE(tenant_id, username),
  UNIQUE(tenant_id, email)
);

CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(tenant_id, role);

-- ----------------------------------------------------------------------------
-- 3. Customers (CRM & Receivables)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY NOT NULL,
  tenant_id TEXT NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT,
  tax_id TEXT,
  credit_limit REAL NOT NULL DEFAULT 0,
  current_balance REAL NOT NULL DEFAULT 0,
  notes TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  sync_status TEXT NOT NULL DEFAULT 'synced' CHECK(sync_status IN ('pending', 'syncing', 'synced', 'conflict')),
  sync_version INTEGER NOT NULL DEFAULT 1,
  last_sync_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  deleted_at TEXT,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT,
  UNIQUE(tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_customers_tenant_code ON customers(tenant_id, code);
CREATE INDEX IF NOT EXISTS idx_customers_tenant_phone ON customers(tenant_id, phone);

-- ----------------------------------------------------------------------------
-- 4. Suppliers (Vendor Management & Payables)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY NOT NULL,
  tenant_id TEXT NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  company_name TEXT,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT,
  tax_id TEXT,
  current_balance REAL NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'aluminium' CHECK(category IN ('aluminium', 'glass', 'accessories', 'iron', 'consumables', 'other')),
  notes TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  sync_status TEXT NOT NULL DEFAULT 'synced' CHECK(sync_status IN ('pending', 'syncing', 'synced', 'conflict')),
  sync_version INTEGER NOT NULL DEFAULT 1,
  last_sync_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  deleted_at TEXT,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT,
  UNIQUE(tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_suppliers_tenant_code ON suppliers(tenant_id, code);
CREATE INDEX IF NOT EXISTS idx_suppliers_tenant_cat ON suppliers(tenant_id, category);

-- ----------------------------------------------------------------------------
-- 4.1 Categories
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY NOT NULL,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  name_ar TEXT,
  parent_id TEXT REFERENCES categories(id),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  deleted_at TEXT,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT
);

-- ----------------------------------------------------------------------------
-- 4.2 Units of Measurement
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS units (
  id TEXT PRIMARY KEY NOT NULL,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  name_ar TEXT,
  symbol TEXT,
  base_unit_id TEXT REFERENCES units(id),
  conversion_factor REAL NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT
);

-- ----------------------------------------------------------------------------
-- 5. Warehouses / Storage Locations
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS warehouses (
  id TEXT PRIMARY KEY NOT NULL,
  tenant_id TEXT NOT NULL,
  code TEXT,
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  location TEXT,
  is_default INTEGER NOT NULL DEFAULT 0,
  is_primary INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  deleted_at TEXT,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_warehouses_tenant ON warehouses(tenant_id);

-- ----------------------------------------------------------------------------
-- 6. Products / Items (Raw Materials, Assemblies, Offcuts)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY NOT NULL,
  tenant_id TEXT NOT NULL,
  sku TEXT,
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('raw_material','finished_good','semi_finished','service','accessory','glass','profile','consumable','raw_profile', 'raw_glass', 'paint_powder', 'finished_assembly', 'reusable_offcut')),
  category TEXT,
  category_id TEXT REFERENCES categories(id),
  unit TEXT,
  unit_id TEXT REFERENCES units(id),
  cost_method TEXT NOT NULL DEFAULT 'weighted_average' CHECK(cost_method IN ('weighted_average','fifo')),
  is_stockable INTEGER NOT NULL DEFAULT 1,
  is_sellable INTEGER NOT NULL DEFAULT 1,
  is_purchasable INTEGER NOT NULL DEFAULT 1,
  unit_cost REAL NOT NULL DEFAULT 0,
  unit_price REAL NOT NULL DEFAULT 0,
  min_stock REAL NOT NULL DEFAULT 5,
  max_stock REAL NOT NULL DEFAULT 100,
  reorder_point REAL NOT NULL DEFAULT 10,
  min_stock_level REAL DEFAULT 0,
  max_stock_level REAL DEFAULT 0,
  opening_stock REAL DEFAULT 0,
  opening_stock_date TEXT,
  track_inventory INTEGER NOT NULL DEFAULT 1,
  specifications TEXT, -- JSON attributes (alloy, thickness, color, dimensions)
  barcode TEXT,
  sync_status TEXT NOT NULL DEFAULT 'synced' CHECK(sync_status IN ('pending', 'syncing', 'synced', 'conflict')),
  sync_version INTEGER NOT NULL DEFAULT 1,
  last_sync_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  deleted_at TEXT,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_products_tenant_sku ON products(tenant_id, sku);
CREATE INDEX IF NOT EXISTS idx_products_tenant_type ON products(tenant_id, type);

-- ----------------------------------------------------------------------------
-- 7. Stock Movements (ADR-005: Immutable Event-Sourced Inventory Log)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stock_movements (
  id TEXT PRIMARY KEY NOT NULL,
  tenant_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  warehouse_id TEXT NOT NULL,
  movement_type TEXT,
  type TEXT NOT NULL,
  direction TEXT NOT NULL CHECK(direction IN ('in', 'out')),
  quantity REAL NOT NULL,
  unit_cost REAL NOT NULL DEFAULT 0,
  total_cost REAL NOT NULL DEFAULT 0,
  reference_entity TEXT,
  reference_type TEXT,
  reference_id TEXT,
  notes TEXT,
  created_by TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'pending' CHECK(sync_status IN ('pending', 'syncing', 'synced', 'conflict', 'failed')),
  sync_version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_stock_mov_tenant_prod ON stock_movements(tenant_id, product_id, created_at);
CREATE INDEX IF NOT EXISTS idx_stock_mov_ref ON stock_movements(tenant_id, reference_type, reference_id);

-- ----------------------------------------------------------------------------
-- 7.1 Stock Balances (Derived Current Stock per Warehouse)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stock_balances (
  id TEXT PRIMARY KEY NOT NULL,
  tenant_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  warehouse_id TEXT NOT NULL,
  quantity REAL NOT NULL DEFAULT 0,
  reserved_quantity REAL NOT NULL DEFAULT 0,
  average_cost REAL NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE RESTRICT,
  UNIQUE(tenant_id, product_id, warehouse_id)
);

-- ----------------------------------------------------------------------------
-- 8. Chart of Accounts (COA - Standard 5-Digit Tree)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chart_of_accounts (
  id TEXT PRIMARY KEY NOT NULL,
  tenant_id TEXT NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
  nature TEXT NOT NULL CHECK(nature IN ('debit', 'credit')),
  parent_id TEXT,
  level INTEGER NOT NULL DEFAULT 1,
  is_reconciliation INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  deleted_at TEXT,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT,
  FOREIGN KEY (parent_id) REFERENCES chart_of_accounts(id) ON DELETE RESTRICT,
  UNIQUE(tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_coa_tenant_code ON chart_of_accounts(tenant_id, code);
CREATE INDEX IF NOT EXISTS idx_coa_tenant_type ON chart_of_accounts(tenant_id, type);

-- ----------------------------------------------------------------------------
-- 9. Journal Entries (ADR-004: Immutable Double-Entry Accounting Header)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS journal_entries (
  id TEXT PRIMARY KEY NOT NULL,
  tenant_id TEXT NOT NULL,
  entry_number TEXT NOT NULL,
  date TEXT NOT NULL,
  reference_type TEXT,
  reference_id TEXT,
  source_document TEXT,
  narration TEXT NOT NULL,
  narration_ar TEXT NOT NULL,
  total_debit REAL NOT NULL,
  total_credit REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'posted' CHECK(status IN ('draft', 'posted', 'reversed')),
  reversed_entry_id TEXT,
  reversal_reason TEXT,
  created_by TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'synced' CHECK(sync_status IN ('pending', 'syncing', 'synced', 'conflict')),
  sync_version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (reversed_entry_id) REFERENCES journal_entries(id) ON DELETE RESTRICT,
  UNIQUE(tenant_id, entry_number)
);

CREATE INDEX IF NOT EXISTS idx_jv_tenant_num ON journal_entries(tenant_id, entry_number);
CREATE INDEX IF NOT EXISTS idx_jv_tenant_date ON journal_entries(tenant_id, date);

-- ----------------------------------------------------------------------------
-- 10. Journal Entry Lines (Debits and Credits)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS journal_entry_lines (
  id TEXT PRIMARY KEY NOT NULL,
  tenant_id TEXT NOT NULL,
  journal_entry_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  debit REAL NOT NULL DEFAULT 0,
  credit REAL NOT NULL DEFAULT 0,
  description TEXT,
  partner_type TEXT CHECK(partner_type IN ('customer', 'supplier', 'employee', 'none')),
  partner_id TEXT,
  cost_center_id TEXT,
  line_order INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT,
  FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id) ON DELETE CASCADE,
  FOREIGN KEY (account_id) REFERENCES chart_of_accounts(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_jv_lines_entry ON journal_entry_lines(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_jv_lines_account ON journal_entry_lines(tenant_id, account_id);

-- ----------------------------------------------------------------------------
-- 10.1 Journal Reversals Log (ADR-004: Counter-Reversal Audit Record)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS journal_reversals (
  id TEXT PRIMARY KEY NOT NULL,
  tenant_id TEXT NOT NULL,
  original_entry_id TEXT NOT NULL,
  reversal_entry_id TEXT NOT NULL,
  reason TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  created_by TEXT,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT,
  FOREIGN KEY (original_entry_id) REFERENCES journal_entries(id) ON DELETE RESTRICT,
  FOREIGN KEY (reversal_entry_id) REFERENCES journal_entries(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_reversals_tenant_orig ON journal_reversals(tenant_id, original_entry_id);

-- ----------------------------------------------------------------------------
-- 11. Quotations (Price Estimates with Dimension Parameters)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quotations (
  id TEXT PRIMARY KEY NOT NULL,
  tenant_id TEXT NOT NULL,
  quotation_number TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  issue_date TEXT NOT NULL,
  valid_until TEXT NOT NULL,
  subtotal REAL NOT NULL DEFAULT 0,
  discount_amount REAL NOT NULL DEFAULT 0,
  tax_amount REAL NOT NULL DEFAULT 0,
  total_amount REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'sent', 'approved', 'converted', 'rejected', 'expired')),
  converted_invoice_id TEXT,
  converted_production_order_id TEXT,
  notes TEXT,
  created_by TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'synced' CHECK(sync_status IN ('pending', 'syncing', 'synced', 'conflict')),
  sync_version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  deleted_at TEXT,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
  UNIQUE(tenant_id, quotation_number)
);

CREATE TABLE IF NOT EXISTS quotation_lines (
  id TEXT PRIMARY KEY NOT NULL,
  tenant_id TEXT NOT NULL,
  quotation_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  description TEXT,
  width REAL,
  height REAL,
  color TEXT,
  glass_type TEXT,
  quantity REAL NOT NULL DEFAULT 1,
  unit_price REAL NOT NULL,
  tax_rate REAL NOT NULL DEFAULT 0.05,
  tax_amount REAL NOT NULL DEFAULT 0,
  subtotal REAL NOT NULL,
  total REAL NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT,
  FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);

-- ----------------------------------------------------------------------------
-- 12. Sales Invoices (Commercial Invoices & Tax Invoices)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sales_invoices (
  id TEXT PRIMARY KEY NOT NULL,
  tenant_id TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  invoice_number TEXT,
  date TEXT,
  issue_date TEXT,
  due_date TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'posted', 'void', 'partially_paid', 'paid', 'sent')),
  payment_term TEXT NOT NULL DEFAULT 'cash' CHECK(payment_term IN ('cash', 'credit_30', 'credit_60', 'installments')),
  payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK(payment_status IN ('unpaid', 'partially_paid', 'paid')),
  subtotal REAL NOT NULL DEFAULT 0,
  discount_total REAL DEFAULT 0,
  discount_amount REAL NOT NULL DEFAULT 0,
  tax_total REAL DEFAULT 0,
  tax_amount REAL NOT NULL DEFAULT 0,
  grand_total REAL NOT NULL DEFAULT 0,
  total_amount REAL NOT NULL DEFAULT 0,
  paid_amount REAL NOT NULL DEFAULT 0,
  balance REAL DEFAULT 0,
  notes TEXT,
  journal_entry_id TEXT,
  created_by TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending' CHECK(sync_status IN ('pending', 'syncing', 'synced', 'conflict')),
  sync_version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  deleted_at TEXT,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
  FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_sales_invoices_tenant_date ON sales_invoices(tenant_id, date);
CREATE INDEX IF NOT EXISTS idx_sales_invoices_customer ON sales_invoices(tenant_id, customer_id);

CREATE TABLE IF NOT EXISTS sales_invoice_lines (
  id TEXT PRIMARY KEY NOT NULL,
  tenant_id TEXT NOT NULL,
  invoice_id TEXT NOT NULL,
  product_id TEXT,
  description TEXT,
  width REAL,
  height REAL,
  quantity REAL NOT NULL,
  unit_price REAL NOT NULL,
  discount REAL DEFAULT 0,
  tax_rate REAL NOT NULL DEFAULT 0.05,
  tax_amount REAL NOT NULL DEFAULT 0,
  subtotal REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL,
  line_order INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT,
  FOREIGN KEY (invoice_id) REFERENCES sales_invoices(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS sale_invoice_lines (
  id TEXT PRIMARY KEY NOT NULL,
  tenant_id TEXT NOT NULL,
  invoice_id TEXT NOT NULL,
  product_id TEXT REFERENCES products(id),
  description TEXT,
  quantity REAL NOT NULL,
  unit_price REAL NOT NULL,
  discount REAL DEFAULT 0,
  tax_rate REAL DEFAULT 0,
  total REAL NOT NULL,
  line_order INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT,
  FOREIGN KEY (invoice_id) REFERENCES sales_invoices(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_sale_invoice_lines_invoice ON sale_invoice_lines(invoice_id);

-- ----------------------------------------------------------------------------
-- 13. Purchase Orders & Vendor Bills
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS purchase_orders (
  id TEXT PRIMARY KEY NOT NULL,
  tenant_id TEXT NOT NULL,
  supplier_id TEXT NOT NULL,
  po_number TEXT,
  order_number TEXT,
  date TEXT,
  order_date TEXT,
  expected_date TEXT,
  expected_delivery_date TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'approved', 'partially_received', 'received', 'invoiced', 'closed', 'cancelled', 'sent', 'billed')),
  payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK(payment_status IN ('unpaid', 'partially_paid', 'paid')),
  subtotal REAL NOT NULL DEFAULT 0,
  tax_total REAL DEFAULT 0,
  tax_amount REAL NOT NULL DEFAULT 0,
  grand_total REAL NOT NULL DEFAULT 0,
  total_amount REAL NOT NULL DEFAULT 0,
  paid_amount REAL NOT NULL DEFAULT 0,
  notes TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending' CHECK(sync_status IN ('pending', 'syncing', 'synced', 'conflict')),
  sync_version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  deleted_at TEXT,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_tenant_date ON purchase_orders(tenant_id, date);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON purchase_orders(tenant_id, supplier_id);

CREATE TABLE IF NOT EXISTS purchase_order_lines (
  id TEXT PRIMARY KEY NOT NULL,
  tenant_id TEXT NOT NULL,
  purchase_order_id TEXT NOT NULL,
  product_id TEXT REFERENCES products(id),
  description TEXT,
  quantity REAL,
  quantity_ordered REAL,
  quantity_received REAL NOT NULL DEFAULT 0,
  unit_cost REAL,
  unit_price REAL,
  tax_rate REAL NOT NULL DEFAULT 0.05,
  tax_amount REAL NOT NULL DEFAULT 0,
  subtotal REAL,
  total REAL NOT NULL,
  line_order INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT,
  FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_purchase_order_lines_order ON purchase_order_lines(purchase_order_id);

-- ----------------------------------------------------------------------------
-- 13.1 Supplier Invoices (Vendor Bills)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS supplier_invoices (
  id TEXT PRIMARY KEY NOT NULL,
  tenant_id TEXT NOT NULL,
  supplier_id TEXT NOT NULL,
  purchase_order_id TEXT REFERENCES purchase_orders(id),
  invoice_number TEXT,
  date TEXT NOT NULL,
  due_date TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'posted', 'partially_paid', 'paid', 'void')),
  payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK(payment_status IN ('unpaid', 'partially_paid', 'paid')),
  subtotal REAL DEFAULT 0,
  tax_total REAL DEFAULT 0,
  grand_total REAL DEFAULT 0,
  paid_amount REAL DEFAULT 0,
  balance REAL DEFAULT 0,
  notes TEXT,
  journal_entry_id TEXT REFERENCES journal_entries(id),
  sync_status TEXT NOT NULL DEFAULT 'pending',
  sync_version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  deleted_at TEXT,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_supplier_invoices_tenant_date ON supplier_invoices(tenant_id, date);
CREATE INDEX IF NOT EXISTS idx_supplier_invoices_supplier ON supplier_invoices(tenant_id, supplier_id);

-- ----------------------------------------------------------------------------
-- 13.2 Cash Accounts & Payments
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cash_accounts (
  id TEXT PRIMARY KEY NOT NULL,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  name_ar TEXT,
  account_type TEXT NOT NULL DEFAULT 'cash' CHECK(account_type IN ('cash', 'bank', 'petty_cash')),
  account_id TEXT REFERENCES chart_of_accounts(id),
  balance REAL NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  deleted_at TEXT,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY NOT NULL,
  tenant_id TEXT NOT NULL,
  payment_type TEXT NOT NULL CHECK(payment_type IN ('customer_payment', 'supplier_payment', 'expense_payment', 'owner_withdrawal', 'owner_contribution')),
  reference_entity TEXT,
  reference_id TEXT,
  amount REAL NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'cash' CHECK(payment_method IN ('cash', 'bank_transfer', 'cheque')),
  cash_account_id TEXT REFERENCES cash_accounts(id),
  date TEXT NOT NULL,
  notes TEXT,
  journal_entry_id TEXT REFERENCES journal_entries(id),
  sync_status TEXT NOT NULL DEFAULT 'pending',
  sync_version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT,
  FOREIGN KEY (cash_account_id) REFERENCES cash_accounts(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_payments_tenant_date ON payments(tenant_id, date);

-- ----------------------------------------------------------------------------
-- 14. Bills of Materials (BOM & Formulas - ADR-006)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bills_of_materials (
  id TEXT PRIMARY KEY NOT NULL,
  tenant_id TEXT NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  product_id TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  type TEXT NOT NULL CHECK(type IN ('sliding_window', 'hinged_window', 'sliding_door', 'hinged_door', 'handrail', 'custom')),
  labor_hours_estimate REAL NOT NULL DEFAULT 4.0,
  labor_rate_hourly REAL NOT NULL DEFAULT 1500,
  overhead_allocation_rate REAL NOT NULL DEFAULT 2500,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  deleted_at TEXT,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
  UNIQUE(tenant_id, code)
);

CREATE TABLE IF NOT EXISTS bom_components (
  id TEXT PRIMARY KEY NOT NULL,
  tenant_id TEXT NOT NULL,
  bom_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  formula_type TEXT NOT NULL CHECK(formula_type IN ('parametric_dimension', 'area_based', 'fixed_count')),
  formula_expression TEXT,
  fixed_quantity REAL NOT NULL DEFAULT 0,
  unit TEXT NOT NULL,
  waste_factor REAL NOT NULL DEFAULT 1.05,
  unit_cost REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT,
  FOREIGN KEY (bom_id) REFERENCES bills_of_materials(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);

-- ----------------------------------------------------------------------------
-- 15. Production Orders (12-Stage Manufacturing Pipeline - ADR-006)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS production_orders (
  id TEXT PRIMARY KEY NOT NULL,
  tenant_id TEXT NOT NULL,
  order_number TEXT NOT NULL,
  quotation_id TEXT,
  sales_invoice_id TEXT,
  customer_id TEXT,
  product_id TEXT NOT NULL,
  bom_id TEXT,
  quantity REAL NOT NULL DEFAULT 1,
  width REAL NOT NULL,
  height REAL NOT NULL,
  color TEXT,
  glass_spec TEXT,
  current_stage TEXT NOT NULL DEFAULT 'draft' CHECK(current_stage IN (
    'draft',
    'dimension_taking',
    'cutting_profiles',
    'machining_milling',
    'corner_crimping',
    'rubber_gaskets',
    'hardware_assembly',
    'glass_cutting_install',
    'quality_control',
    'packaging',
    'site_installation',
    'closed'
  )),
  stage_progress INTEGER NOT NULL DEFAULT 0,
  estimated_material_cost REAL NOT NULL DEFAULT 0,
  actual_material_cost REAL NOT NULL DEFAULT 0,
  estimated_labor_cost REAL NOT NULL DEFAULT 0,
  actual_labor_cost REAL NOT NULL DEFAULT 0,
  assigned_technician_id TEXT,
  start_date TEXT,
  target_completion_date TEXT,
  actual_completion_date TEXT,
  notes TEXT,
  created_by TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'synced' CHECK(sync_status IN ('pending', 'syncing', 'synced', 'conflict')),
  sync_version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  deleted_at TEXT,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
  FOREIGN KEY (bom_id) REFERENCES bills_of_materials(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
  UNIQUE(tenant_id, order_number)
);

CREATE INDEX IF NOT EXISTS idx_prod_tenant_stage ON production_orders(tenant_id, current_stage);

-- ----------------------------------------------------------------------------
-- 16. Employees & Labor (HR & Technicians)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY NOT NULL,
  tenant_id TEXT NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('master_technician', 'cutter', 'assembler', 'glazier', 'installer', 'driver', 'admin')),
  phone TEXT NOT NULL,
  salary_type TEXT NOT NULL CHECK(salary_type IN ('monthly', 'daily', 'per_piece')),
  base_rate REAL NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  deleted_at TEXT,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT,
  UNIQUE(tenant_id, code)
);

-- ----------------------------------------------------------------------------
-- 17. Sync Outbox (ADR-002: Asynchronous Cloud Replication Queue)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sync_outbox (
  id TEXT PRIMARY KEY NOT NULL,
  tenant_id TEXT NOT NULL,
  local_entity TEXT NOT NULL,
  local_id TEXT NOT NULL,
  operation TEXT NOT NULL CHECK(operation IN ('INSERT', 'UPDATE', 'DELETE')),
  payload TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'syncing', 'synced', 'conflict', 'failed')),
  retry_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  last_attempt TEXT,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_outbox_pending ON sync_outbox(status, created_at);

-- ----------------------------------------------------------------------------
-- 18. Audit Logs (Tamper-Evident Audit Trail)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY NOT NULL,
  tenant_id TEXT NOT NULL,
  user_id TEXT,
  user_name TEXT NOT NULL,
  device_id TEXT NOT NULL DEFAULT 'local-sqlite-device',
  entity TEXT NOT NULL,
  action TEXT NOT NULL CHECK(action IN ('CREATE', 'UPDATE', 'DELETE', 'POST', 'REVERSE', 'SYNC')),
  record_id TEXT NOT NULL,
  details TEXT NOT NULL,
  details_ar TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_audit_tenant_entity ON audit_logs(tenant_id, entity, created_at);
