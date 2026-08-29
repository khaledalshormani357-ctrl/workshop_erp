// ============================================================================
// Workshop ERP - DatabaseService (Phase 1 SQLite Data Access Manager)
// ============================================================================

import { ISQLiteDriver, SQLiteDriverFactory } from './sqliteDriver';

export class DatabaseService {
  private static instance: DatabaseService | null = null;
  private driver: ISQLiteDriver;
  private isInitialized = false;
  private currentTenantId = 'tenant-andalus-01';

  private constructor() {
    this.driver = SQLiteDriverFactory.getDriver();
  }

  static getInstance(): DatabaseService {
    if (!this.instance) {
      this.instance = new DatabaseService();
    }
    return this.instance;
  }

  async initialize(databaseName = 'workshop_erp.db'): Promise<void> {
    if (this.isInitialized && this.driver.isOpened()) {
      return;
    }

    await this.driver.open(databaseName);
    await this.runMigrations();
    await this.seedInitialData();
    this.isInitialized = true;
  }

  setTenantId(tenantId: string): void {
    this.currentTenantId = tenantId;
  }

  getTenantId(): string {
    return this.currentTenantId;
  }

  /**
   * Runs the complete Phase 1 SQLite DDL schema
   */
  private async runMigrations(): Promise<void> {
    await this.driver.execute('PRAGMA foreign_keys = ON;');

    // DDL Statements for All 18 Tables & Indexes
    const ddlStatements = [
      `CREATE TABLE IF NOT EXISTS tenants (
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
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT
      );`,

      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY NOT NULL,
        tenant_id TEXT NOT NULL,
        username TEXT NOT NULL,
        email TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL,
        full_name_ar TEXT NOT NULL,
        role TEXT NOT NULL,
        phone TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        sync_status TEXT NOT NULL DEFAULT 'synced',
        sync_version INTEGER NOT NULL DEFAULT 1,
        last_sync_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT
      );`,

      `CREATE TABLE IF NOT EXISTS customers (
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
        sync_status TEXT NOT NULL DEFAULT 'synced',
        sync_version INTEGER NOT NULL DEFAULT 1,
        last_sync_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT
      );`,

      `CREATE TABLE IF NOT EXISTS suppliers (
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
        category TEXT NOT NULL DEFAULT 'aluminium',
        notes TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        sync_status TEXT NOT NULL DEFAULT 'synced',
        sync_version INTEGER NOT NULL DEFAULT 1,
        last_sync_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT
      );`,

      `CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY NOT NULL,
        tenant_id TEXT NOT NULL,
        name TEXT NOT NULL,
        name_ar TEXT,
        parent_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT
      );`,

      `CREATE TABLE IF NOT EXISTS units (
        id TEXT PRIMARY KEY NOT NULL,
        tenant_id TEXT NOT NULL,
        name TEXT NOT NULL,
        name_ar TEXT,
        symbol TEXT,
        base_unit_id TEXT,
        conversion_factor REAL NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );`,

      `CREATE TABLE IF NOT EXISTS warehouses (
        id TEXT PRIMARY KEY NOT NULL,
        tenant_id TEXT NOT NULL,
        code TEXT,
        name TEXT NOT NULL,
        name_ar TEXT NOT NULL,
        location TEXT,
        is_default INTEGER NOT NULL DEFAULT 0,
        is_primary INTEGER NOT NULL DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT
      );`,

      `CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY NOT NULL,
        tenant_id TEXT NOT NULL,
        sku TEXT,
        name TEXT NOT NULL,
        name_ar TEXT NOT NULL,
        type TEXT NOT NULL,
        category TEXT,
        category_id TEXT,
        unit TEXT,
        unit_id TEXT,
        cost_method TEXT NOT NULL DEFAULT 'weighted_average',
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
        specifications TEXT,
        barcode TEXT,
        sync_status TEXT NOT NULL DEFAULT 'synced',
        sync_version INTEGER NOT NULL DEFAULT 1,
        last_sync_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT
      );`,

      `CREATE TABLE IF NOT EXISTS stock_movements (
        id TEXT PRIMARY KEY NOT NULL,
        tenant_id TEXT NOT NULL,
        product_id TEXT NOT NULL,
        warehouse_id TEXT NOT NULL,
        movement_type TEXT,
        type TEXT NOT NULL,
        direction TEXT NOT NULL,
        quantity REAL NOT NULL,
        unit_cost REAL NOT NULL DEFAULT 0,
        total_cost REAL NOT NULL DEFAULT 0,
        reference_entity TEXT,
        reference_type TEXT,
        reference_id TEXT,
        notes TEXT,
        created_by TEXT NOT NULL,
        sync_status TEXT NOT NULL DEFAULT 'synced',
        sync_version INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL
      );`,

      `CREATE TABLE IF NOT EXISTS stock_balances (
        id TEXT PRIMARY KEY NOT NULL,
        tenant_id TEXT NOT NULL,
        product_id TEXT NOT NULL,
        warehouse_id TEXT NOT NULL,
        quantity REAL NOT NULL DEFAULT 0,
        reserved_quantity REAL NOT NULL DEFAULT 0,
        average_cost REAL NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL,
        UNIQUE(tenant_id, product_id, warehouse_id)
      );`,

      `CREATE TABLE IF NOT EXISTS chart_of_accounts (
        id TEXT PRIMARY KEY NOT NULL,
        tenant_id TEXT NOT NULL,
        code TEXT NOT NULL,
        name TEXT NOT NULL,
        name_ar TEXT NOT NULL,
        type TEXT NOT NULL,
        nature TEXT NOT NULL,
        parent_id TEXT,
        level INTEGER NOT NULL DEFAULT 1,
        is_reconciliation INTEGER NOT NULL DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT
      );`,

      `CREATE TABLE IF NOT EXISTS journal_entries (
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
        status TEXT NOT NULL DEFAULT 'posted',
        reversed_entry_id TEXT,
        reversal_reason TEXT,
        created_by TEXT NOT NULL,
        sync_status TEXT NOT NULL DEFAULT 'synced',
        sync_version INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL
      );`,

      `CREATE TABLE IF NOT EXISTS journal_entry_lines (
        id TEXT PRIMARY KEY NOT NULL,
        tenant_id TEXT NOT NULL,
        journal_entry_id TEXT NOT NULL,
        account_id TEXT NOT NULL,
        debit REAL NOT NULL DEFAULT 0,
        credit REAL NOT NULL DEFAULT 0,
        description TEXT,
        partner_type TEXT,
        partner_id TEXT,
        cost_center_id TEXT,
        line_order INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL
      );`,

      `CREATE TABLE IF NOT EXISTS quotations (
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
        status TEXT NOT NULL DEFAULT 'draft',
        converted_invoice_id TEXT,
        converted_production_order_id TEXT,
        notes TEXT,
        created_by TEXT NOT NULL,
        sync_status TEXT NOT NULL DEFAULT 'synced',
        sync_version INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT
      );`,

      `CREATE TABLE IF NOT EXISTS quotation_lines (
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
        created_at TEXT NOT NULL
      );`,

      `CREATE TABLE IF NOT EXISTS sales_invoices (
        id TEXT PRIMARY KEY NOT NULL,
        tenant_id TEXT NOT NULL,
        customer_id TEXT NOT NULL,
        invoice_number TEXT,
        date TEXT,
        issue_date TEXT,
        due_date TEXT,
        status TEXT NOT NULL DEFAULT 'draft',
        payment_term TEXT NOT NULL DEFAULT 'cash',
        payment_status TEXT NOT NULL DEFAULT 'unpaid',
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
        sync_status TEXT NOT NULL DEFAULT 'synced',
        sync_version INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT
      );`,

      `CREATE TABLE IF NOT EXISTS sales_invoice_lines (
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
        created_at TEXT NOT NULL
      );`,

      `CREATE TABLE IF NOT EXISTS sale_invoice_lines (
        id TEXT PRIMARY KEY NOT NULL,
        tenant_id TEXT NOT NULL,
        invoice_id TEXT NOT NULL,
        product_id TEXT,
        description TEXT,
        quantity REAL NOT NULL,
        unit_price REAL NOT NULL,
        discount REAL DEFAULT 0,
        tax_rate REAL DEFAULT 0,
        total REAL NOT NULL,
        line_order INTEGER NOT NULL DEFAULT 1
      );`,

      `CREATE TABLE IF NOT EXISTS purchase_orders (
        id TEXT PRIMARY KEY NOT NULL,
        tenant_id TEXT NOT NULL,
        supplier_id TEXT NOT NULL,
        po_number TEXT,
        order_number TEXT,
        date TEXT,
        order_date TEXT,
        expected_date TEXT,
        expected_delivery_date TEXT,
        status TEXT NOT NULL DEFAULT 'draft',
        payment_status TEXT NOT NULL DEFAULT 'unpaid',
        subtotal REAL NOT NULL DEFAULT 0,
        tax_total REAL DEFAULT 0,
        tax_amount REAL NOT NULL DEFAULT 0,
        grand_total REAL NOT NULL DEFAULT 0,
        total_amount REAL NOT NULL DEFAULT 0,
        paid_amount REAL NOT NULL DEFAULT 0,
        journal_entry_id TEXT,
        notes TEXT,
        created_by TEXT,
        sync_status TEXT NOT NULL DEFAULT 'synced',
        sync_version INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT
      );`,

      `CREATE TABLE IF NOT EXISTS purchase_order_lines (
        id TEXT PRIMARY KEY NOT NULL,
        tenant_id TEXT NOT NULL,
        purchase_order_id TEXT NOT NULL,
        product_id TEXT,
        description TEXT,
        quantity REAL,
        quantity_ordered REAL,
        quantity_received REAL DEFAULT 0,
        unit_cost REAL,
        unit_price REAL,
        tax_rate REAL DEFAULT 0.05,
        tax_amount REAL DEFAULT 0,
        subtotal REAL,
        total REAL NOT NULL,
        line_order INTEGER DEFAULT 1,
        created_at TEXT
      );`,

      `CREATE TABLE IF NOT EXISTS supplier_invoices (
        id TEXT PRIMARY KEY NOT NULL,
        tenant_id TEXT NOT NULL,
        supplier_id TEXT NOT NULL,
        purchase_order_id TEXT,
        invoice_number TEXT,
        date TEXT NOT NULL,
        due_date TEXT,
        status TEXT NOT NULL DEFAULT 'draft',
        payment_status TEXT NOT NULL DEFAULT 'unpaid',
        subtotal REAL DEFAULT 0,
        tax_total REAL DEFAULT 0,
        grand_total REAL DEFAULT 0,
        paid_amount REAL DEFAULT 0,
        balance REAL DEFAULT 0,
        notes TEXT,
        journal_entry_id TEXT,
        sync_status TEXT NOT NULL DEFAULT 'pending',
        sync_version INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT
      );`,

      `CREATE TABLE IF NOT EXISTS cash_accounts (
        id TEXT PRIMARY KEY NOT NULL,
        tenant_id TEXT NOT NULL,
        name TEXT NOT NULL,
        name_ar TEXT,
        account_type TEXT NOT NULL DEFAULT 'cash',
        account_id TEXT,
        balance REAL NOT NULL DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT
      );`,

      `CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY NOT NULL,
        tenant_id TEXT NOT NULL,
        payment_type TEXT NOT NULL,
        reference_entity TEXT,
        reference_id TEXT,
        amount REAL NOT NULL,
        payment_method TEXT NOT NULL DEFAULT 'cash',
        cash_account_id TEXT,
        date TEXT NOT NULL,
        notes TEXT,
        journal_entry_id TEXT,
        sync_status TEXT NOT NULL DEFAULT 'pending',
        sync_version INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL
      );`,

      `CREATE TABLE IF NOT EXISTS bills_of_materials (
        id TEXT PRIMARY KEY NOT NULL,
        tenant_id TEXT NOT NULL,
        code TEXT NOT NULL,
        name TEXT NOT NULL,
        name_ar TEXT NOT NULL,
        product_id TEXT NOT NULL,
        version INTEGER NOT NULL DEFAULT 1,
        type TEXT NOT NULL,
        labor_hours_estimate REAL NOT NULL DEFAULT 4.0,
        labor_rate_hourly REAL NOT NULL DEFAULT 1500,
        overhead_allocation_rate REAL NOT NULL DEFAULT 2500,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT
      );`,

      `CREATE TABLE IF NOT EXISTS bom_components (
        id TEXT PRIMARY KEY NOT NULL,
        tenant_id TEXT NOT NULL,
        bom_id TEXT NOT NULL,
        product_id TEXT NOT NULL,
        formula_type TEXT NOT NULL,
        formula_expression TEXT,
        fixed_quantity REAL NOT NULL DEFAULT 0,
        unit TEXT NOT NULL,
        waste_factor REAL NOT NULL DEFAULT 1.05,
        unit_cost REAL NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      );`,

      `CREATE TABLE IF NOT EXISTS production_orders (
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
        current_stage TEXT NOT NULL DEFAULT 'draft',
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
        sync_status TEXT NOT NULL DEFAULT 'synced',
        sync_version INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT
      );`,

      `CREATE TABLE IF NOT EXISTS employees (
        id TEXT PRIMARY KEY NOT NULL,
        tenant_id TEXT NOT NULL,
        code TEXT NOT NULL,
        name TEXT NOT NULL,
        name_ar TEXT NOT NULL,
        role TEXT NOT NULL,
        phone TEXT NOT NULL,
        salary_type TEXT NOT NULL,
        base_rate REAL NOT NULL DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT
      );`,

      `CREATE TABLE IF NOT EXISTS sync_outbox (
        id TEXT PRIMARY KEY NOT NULL,
        tenant_id TEXT NOT NULL,
        local_entity TEXT NOT NULL,
        local_id TEXT NOT NULL,
        operation TEXT NOT NULL,
        payload TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        retry_count INTEGER NOT NULL DEFAULT 0,
        error_message TEXT,
        created_at TEXT NOT NULL,
        last_attempt TEXT
      );`,

      `CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY NOT NULL,
        tenant_id TEXT NOT NULL,
        user_id TEXT,
        user_name TEXT NOT NULL,
        device_id TEXT NOT NULL DEFAULT 'local-sqlite-device',
        entity TEXT NOT NULL,
        action TEXT NOT NULL,
        record_id TEXT NOT NULL,
        details TEXT NOT NULL,
        details_ar TEXT,
        created_at TEXT NOT NULL
      );`
    ];

    for (const sql of ddlStatements) {
      await this.driver.execute(sql);
    }
  }

  /**
   * Seeds foundational multi-tenant data if database is empty
   */
  private async seedInitialData(): Promise<void> {
    const existingTenants = await this.query('SELECT * FROM tenants WHERE id = ?', [this.currentTenantId]);
    if (existingTenants.length > 0) return;

    const now = new Date().toISOString();

    // 1. Primary Tenant
    await this.run(
      `INSERT INTO tenants (id, code, name, name_ar, phone, email, address, base_currency, currency_symbol, tax_rate, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        this.currentTenantId,
        'TEN-ANDALUS',
        'Al-Andalus Aluminium & Glass Fabrications',
        'مصنع الأندلس للألمنيوم والزجاج والحدادة',
        '+967 777 123 456',
        'info@andalus-erp.com',
        'صنعاء - شارع الستين الجنوبي - المنطقة الصناعية',
        'YER',
        '﷼',
        0.05,
        1,
        now,
        now
      ]
    );

    // 2. Admin & Staff Users (with securely hashed passwords)
    await this.run(
      `INSERT INTO users (id, tenant_id, username, email, password_hash, full_name, full_name_ar, role, phone, is_active, sync_status, sync_version, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'usr-admin-01',
        this.currentTenantId,
        'admin',
        'admin@andalus-erp.com',
        'argon2id$v=19$m=65536,t=3,p=4$dGVzdF9zYWx0XzEyMw$v8g8h7F7Qn8...', // Hashed password representation
        'Khaled Al-Shormani',
        'م. خالد الشرماني',
        'admin',
        '+967 777 123 456',
        1,
        'synced',
        1,
        now,
        now
      ]
    );

    // 3. Primary Warehouse
    await this.run(
      `INSERT INTO warehouses (id, tenant_id, code, name, name_ar, location, is_primary, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'wh-main-01',
        this.currentTenantId,
        'WH-MAIN',
        'Central Raw Materials & Fabrication Yard',
        'المستودع المركزي وساحة التشغيل والقص',
        'الصالة الصناعية الرئيسية - الستين',
        1,
        1,
        now,
        now
      ]
    );

    // 4. Foundational Standard Chart of Accounts (COA - 5-Digit Tree)
    const accounts = [
      { id: 'acc-10100', code: '10100', name: 'Cash in Vault', name_ar: 'النقدية بالصندوق الرئيسي', type: 'asset', nature: 'debit' },
      { id: 'acc-10200', code: '10200', name: 'Al-Kuraimi Bank Account', name_ar: 'حساب بنك الكريمي', type: 'asset', nature: 'debit' },
      { id: 'acc-10300', code: '10300', name: 'Accounts Receivable (Trade Debtors)', name_ar: 'العملاء والمدينون التجاريون', type: 'asset', nature: 'debit' },
      { id: 'acc-10510', code: '10510', name: 'Inventory - Raw Aluminium Profiles', name_ar: 'مخزون مقاطع وعيدان الألمنيوم', type: 'asset', nature: 'debit' },
      { id: 'acc-10520', code: '10520', name: 'Inventory - Raw Glass Sheets', name_ar: 'مخزون ألواح الزجاج الخام', type: 'asset', nature: 'debit' },
      { id: 'acc-10530', code: '10530', name: 'Inventory - Hardware & Gaskets', name_ar: 'مخزون الإكسسوارات والكواشيك', type: 'asset', nature: 'debit' },
      { id: 'acc-10540', code: '10540', name: 'Work in Progress (WIP) Fabrications', name_ar: 'بضاعة تحت التشغيل والتصنيع (WIP)', type: 'asset', nature: 'debit' },
      { id: 'acc-20100', code: '20100', name: 'Accounts Payable (Trade Creditors)', name_ar: 'الموردون والدائنون التجاريون', type: 'liability', nature: 'credit' },
      { id: 'acc-20200', code: '20200', name: 'Output Sales Tax Payable', name_ar: 'أمانات ضريبة المبيعات المستحقة', type: 'liability', nature: 'credit' },
      { id: 'acc-30100', code: '30100', name: 'Owner Capital', name_ar: 'رأس مال صاحب الورشة', type: 'equity', nature: 'credit' },
      { id: 'acc-40100', code: '40100', name: 'Aluminium Windows & Doors Sales Revenue', name_ar: 'إيرادات مبيعات النوافذ والأبواب الألمنيوم', type: 'revenue', nature: 'credit' },
      { id: 'acc-50100', code: '50100', name: 'Cost of Goods Sold - Raw Materials', name_ar: 'تكلفة البضاعة المباعة - مواد خام مستهلكة', type: 'expense', nature: 'debit' },
      { id: 'acc-50200', code: '50200', name: 'Direct Workshop Labor Wages', name_ar: 'أجور الفنيين والقص المباشرة', type: 'expense', nature: 'debit' },
      { id: 'acc-50300', code: '50300', name: 'Factory Electricity & Machinery Overheads', name_ar: 'مصاريف تشغيل الورشة والكهرباء', type: 'expense', nature: 'debit' }
    ];

    for (const acc of accounts) {
      await this.run(
        `INSERT INTO chart_of_accounts (id, tenant_id, code, name, name_ar, type, nature, level, is_reconciliation, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [acc.id, this.currentTenantId, acc.code, acc.name, acc.name_ar, acc.type, acc.nature, 1, 0, 1, now, now]
      );
    }
  }

  // Core Data Access Helpers
  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    return this.driver.query<T>(sql, params);
  }

  async queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    const rows = await this.driver.query<T>(sql, params);
    return rows.length > 0 ? rows[0] : null;
  }

  async run(sql: string, params: any[] = []): Promise<{ changes: number; lastId?: any }> {
    return this.driver.run(sql, params);
  }

  async execute(sql: string): Promise<void> {
    return this.driver.execute(sql);
  }

  /**
   * Executes a callback within an atomic ACID transaction.
   * Auto-commits on completion or rolls back if an exception occurs.
   */
  async transaction<T>(callback: (db: DatabaseService) => Promise<T>): Promise<T> {
    await this.driver.beginTransaction();
    try {
      const result = await callback(this);
      await this.driver.commitTransaction();
      return result;
    } catch (error) {
      await this.driver.rollbackTransaction();
      throw error;
    }
  }
}
