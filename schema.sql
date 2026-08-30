-- ============================================================
-- PROJECTS
-- ============================================================

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY NOT NULL,
  tenant_id TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  name TEXT NOT NULL,
  name_ar TEXT,
  description TEXT,
  start_date TEXT,
  end_date TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','in_progress','completed','closed')),
  sync_status TEXT NOT NULL DEFAULT 'pending',
  sync_version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  deleted_at TEXT,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_projects_tenant_customer ON projects(tenant_id, customer_id);

-- ============================================================
-- MEASUREMENTS (مع الإصدارات)
-- ============================================================

CREATE TABLE IF NOT EXISTS measurements (
  id TEXT PRIMARY KEY NOT NULL,
  tenant_id TEXT NOT NULL,
  customer_id TEXT REFERENCES customers(id),
  project_id TEXT REFERENCES projects(id),
  production_order_id TEXT REFERENCES production_orders(id),
  location TEXT,
  width REAL,
  height REAL,
  quantity REAL DEFAULT 1,
  thickness REAL,
  profile_type TEXT,
  color TEXT,
  glass_type TEXT,
  accessories TEXT,
  opening_direction TEXT,
  notes TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  measured_by TEXT,
  measured_at TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  sync_version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  deleted_at TEXT,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_measurements_tenant_customer ON measurements(tenant_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_measurements_project ON measurements(tenant_id, project_id);

-- جدول تاريخ القياسات (لحفظ الإصدارات السابقة)
CREATE TABLE IF NOT EXISTS measurement_versions (
  id TEXT PRIMARY KEY NOT NULL,
  tenant_id TEXT NOT NULL,
  measurement_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  width REAL,
  height REAL,
  quantity REAL,
  thickness REAL,
  profile_type TEXT,
  color TEXT,
  glass_type TEXT,
  accessories TEXT,
  opening_direction TEXT,
  notes TEXT,
  measured_by TEXT,
  measured_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT,
  FOREIGN KEY (measurement_id) REFERENCES measurements(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_measurement_versions_measurement ON measurement_versions(measurement_id);

-- جدول صور القياسات
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

-- ============================================================
-- QUOTATIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS quotations (
  id TEXT PRIMARY KEY NOT NULL,
  tenant_id TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  project_id TEXT REFERENCES projects(id),
  quotation_number TEXT,
  revision INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','sent','approved','rejected','converted')),
  date TEXT NOT NULL,
  valid_until TEXT,
  subtotal REAL NOT NULL DEFAULT 0,
  discount_total REAL DEFAULT 0,
  tax_total REAL DEFAULT 0,
  grand_total REAL NOT NULL DEFAULT 0,
  notes TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  sync_version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  deleted_at TEXT,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
  UNIQUE(tenant_id, quotation_number)
);

CREATE INDEX IF NOT EXISTS idx_quotations_tenant_customer ON quotations(tenant_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_quotations_tenant_status ON quotations(tenant_id, status);

CREATE TABLE IF NOT EXISTS quotation_items (
  id TEXT PRIMARY KEY NOT NULL,
  tenant_id TEXT NOT NULL,
  quotation_id TEXT NOT NULL,
  product_id TEXT REFERENCES products(id),
  description TEXT,
  quantity REAL NOT NULL,
  unit_price REAL NOT NULL,
  discount REAL DEFAULT 0,
  tax_rate REAL DEFAULT 0,
  total REAL NOT NULL,
  line_order INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT,
  FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_quotation_items_quotation ON quotation_items(quotation_id);

-- جدول مراجعات عروض الأسعار (لحفظ الإصدارات)
CREATE TABLE IF NOT EXISTS quotation_revisions (
  id TEXT PRIMARY KEY NOT NULL,
  tenant_id TEXT NOT NULL,
  quotation_id TEXT NOT NULL,
  revision INTEGER NOT NULL,
  status TEXT NOT NULL,
  subtotal REAL NOT NULL,
  discount_total REAL NOT NULL,
  tax_total REAL NOT NULL,
  grand_total REAL NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT,
  FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_quotation_revisions_quotation ON quotation_revisions(quotation_id);
