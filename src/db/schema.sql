-- ============================================================================
-- Workshop ERP - Local SQLite Database Schema (Phase 1 DDL)
-- Architecture: Offline-First + Multi-Tenant + Double-Entry + Event-Sourced Stock
-- ============================================================================

PRAGMA foreign_keys = ON;

-- existing content ... (kept unchanged above)

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

-- جدول صور القياسات (Measurement Images)
CREATE TABLE IF NOT EXISTS measurement_images (
  id TEXT PRIMARY KEY NOT NULL,
  tenant_id TEXT NOT NULL,
  measurement_id TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_name TEXT,
  mime_type TEXT,
  is_primary INTEGER NOT NULL DEFAULT 0,
  uploaded_by TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  sync_status TEXT NOT NULL DEFAULT 'pending',
  sync_version INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT,
  FOREIGN KEY (measurement_id) REFERENCES measurements(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_measurement_images_measurement ON measurement_images(tenant_id, measurement_id);
