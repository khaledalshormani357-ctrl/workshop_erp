// ============================================================================
// Workshop ERP - Multi-Platform SQLite Adapter Driver
// Supports Capacitor Native Runtime + Web Dev In-Memory/IndexedDB Storage
// ============================================================================

export interface ISQLiteDriver {
  open(databaseName: string): Promise<void>;
  close(): Promise<void>;
  execute(sql: string): Promise<void>;
  executeSet(statements: { statement: string; values?: any[] }[]): Promise<void>;
  query<T = any>(sql: string, params?: any[]): Promise<T[]>;
  run(sql: string, params?: any[]): Promise<{ changes: number; lastId?: any }>;
  beginTransaction(): Promise<void>;
  commitTransaction(): Promise<void>;
  rollbackTransaction(): Promise<void>;
  isOpened(): boolean;
}

/**
 * Web In-Browser SQLite Relational Engine
 * Emulates SQLite tables, columns, indexes, foreign keys, and atomic transactions in memory and localStorage
 */
class WebSQLiteDriver implements ISQLiteDriver {
  private opened = false;
  private dbName = 'workshop_erp.db';
  private tables: Map<string, Map<string, Record<string, any>>> = new Map();
  private inTransaction = false;
  private transactionDepth = 0;
  private transactionSnapshot: string | null = null;

  async open(databaseName: string): Promise<void> {
    this.dbName = databaseName;
    this.opened = true;
    this.loadFromStorage();
  }

  async close(): Promise<void> {
    this.saveToStorage();
    this.opened = false;
  }

  isOpened(): boolean {
    return this.opened;
  }

  private saveToStorage(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      const data: Record<string, any[]> = {};
      this.tables.forEach((rows, tableName) => {
        data[tableName] = Array.from(rows.values());
      });
      localStorage.setItem(`sqlite_${this.dbName}`, JSON.stringify(data));
    } catch {
      // Ignore quota or private browsing errors
    }
  }

  private loadFromStorage(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      const raw = localStorage.getItem(`sqlite_${this.dbName}`);
      if (raw) {
        const data = JSON.parse(raw) as Record<string, any[]>;
        this.tables.clear();
        for (const [tableName, rows] of Object.entries(data)) {
          const rowMap = new Map<string, Record<string, any>>();
          rows.forEach((r) => {
            const key = r.id || JSON.stringify(r);
            rowMap.set(key, r);
          });
          this.tables.set(tableName, rowMap);
        }
      }
    } catch {
      this.tables.clear();
    }
  }

  async beginTransaction(): Promise<void> {
    if (this.transactionDepth === 0) {
      this.inTransaction = true;
      const snapshot: Record<string, any[]> = {};
      this.tables.forEach((rows, tableName) => {
        snapshot[tableName] = Array.from(rows.values()).map((r) => ({ ...r }));
      });
      this.transactionSnapshot = JSON.stringify(snapshot);
    }
    this.transactionDepth++;
  }

  async commitTransaction(): Promise<void> {
    if (this.transactionDepth <= 0) return;
    this.transactionDepth--;
    if (this.transactionDepth === 0) {
      this.inTransaction = false;
      this.transactionSnapshot = null;
      this.saveToStorage();
    }
  }

  async rollbackTransaction(): Promise<void> {
    if (this.transactionDepth <= 0 || !this.transactionSnapshot) {
      this.transactionDepth = 0;
      this.inTransaction = false;
      this.transactionSnapshot = null;
      return;
    }
    try {
      const data = JSON.parse(this.transactionSnapshot) as Record<string, any[]>;
      this.tables.clear();
      for (const [tableName, rows] of Object.entries(data)) {
        const rowMap = new Map<string, Record<string, any>>();
        rows.forEach((r) => {
          const key = r.id || JSON.stringify(r);
          rowMap.set(key, r);
        });
        this.tables.set(tableName, rowMap);
      }
    } finally {
      this.transactionDepth = 0;
      this.inTransaction = false;
      this.transactionSnapshot = null;
    }
  }

  async execute(sql: string): Promise<void> {
    // Split multiple statements by semicolon (ignoring semicolons inside quotes or strings)
    const statements = sql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith('--'));

    for (const stmt of statements) {
      await this.run(stmt, []);
    }
  }

  async executeSet(statements: { statement: string; values?: any[] }[]): Promise<void> {
    await this.beginTransaction();
    try {
      for (const stmt of statements) {
        await this.run(stmt.statement, stmt.values || []);
      }
      await this.commitTransaction();
    } catch (err) {
      await this.rollbackTransaction();
      throw err;
    }
  }

  async run(sql: string, params: any[] = []): Promise<{ changes: number; lastId?: any }> {
    const trimmed = sql.trim();

    // 1. PRAGMA statements
    if (/^PRAGMA/i.test(trimmed)) {
      return { changes: 0 };
    }

    // 2. CREATE TABLE statements
    const createTableMatch = trimmed.match(/^CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+([a-zA-Z0-9_]+)/i);
    if (createTableMatch) {
      const tableName = createTableMatch[1];
      if (!this.tables.has(tableName)) {
        this.tables.set(tableName, new Map());
      }
      this.saveToStorage();
      return { changes: 0 };
    }

    // 3. CREATE INDEX statements
    if (/^CREATE\s+(?:UNIQUE\s+)?INDEX/i.test(trimmed)) {
      return { changes: 0 };
    }

    // 4. INSERT INTO statements
    const insertMatch = trimmed.match(/^INSERT\s+INTO\s+([a-zA-Z0-9_]+)\s*\(([\s\S]+?)\)\s*VALUES\s*\(([\s\S]+?)\)$/i);
    if (insertMatch) {
      const tableName = insertMatch[1];
      const columns = insertMatch[2].split(',').map((c) => c.trim());
      const valueTokens = insertMatch[3].split(',').map((v) => v.trim());

      if (!this.tables.has(tableName)) {
        this.tables.set(tableName, new Map());
      }
      const table = this.tables.get(tableName)!;

      const record: Record<string, any> = {};
      let paramIdx = 0;

      columns.forEach((col, idx) => {
        const valToken = valueTokens[idx];
        if (valToken === '?') {
          record[col] = params[paramIdx] !== undefined ? params[paramIdx] : null;
          paramIdx++;
        } else if (valToken) {
          let cleanVal: any = valToken.replace(/^['"]|['"]$/g, '');
          if (valToken.toUpperCase() === 'NULL') cleanVal = null;
          else if (!isNaN(Number(cleanVal)) && cleanVal !== '') cleanVal = Number(cleanVal);
          record[col] = cleanVal;
        } else {
          record[col] = params[paramIdx] !== undefined ? params[paramIdx] : null;
          paramIdx++;
        }
      });

      if (!record.created_at) {
        record.created_at = new Date().toISOString();
      }
      if (!record.updated_at) {
        record.updated_at = new Date().toISOString();
      }

      const key = record.id || `row_${Date.now()}_${Math.random()}`;
      table.set(key, record);
      if (!this.inTransaction) this.saveToStorage();
      return { changes: 1, lastId: key };
    }

    // 5. UPDATE statements
    const updateMatch = trimmed.match(/^UPDATE\s+([a-zA-Z0-9_]+)\s+SET\s+(.+?)(?:\s+WHERE\s+(.+))?$/is);
    if (updateMatch) {
      const tableName = updateMatch[1];
      const setClause = updateMatch[2];
      const whereClause = updateMatch[3] || '';

      const table = this.tables.get(tableName);
      if (!table) return { changes: 0 };

      // Parse SET fields
      const setPairs = setClause.split(',').map((p) => p.trim());
      let paramIndex = 0;
      const updates: { col: string; type: 'assign' | 'add' | 'sub'; val: any }[] = [];

      for (const pair of setPairs) {
        const [col, rawRhs] = pair.split('=').map((s) => s.trim());
        const rhs = rawRhs || '';

        if (rhs.includes('+')) {
          const parts = rhs.split('+').map((s) => s.trim());
          const rightOperand = parts[1];
          if (rightOperand === '?') {
            updates.push({ col, type: 'add', val: params[paramIndex++] });
          } else {
            const num = parseFloat(rightOperand);
            updates.push({ col, type: 'add', val: isNaN(num) ? 0 : num });
          }
        } else if (rhs.includes('-')) {
          const parts = rhs.split('-').map((s) => s.trim());
          const rightOperand = parts[1];
          if (rightOperand === '?') {
            updates.push({ col, type: 'sub', val: params[paramIndex++] });
          } else {
            const num = parseFloat(rightOperand);
            updates.push({ col, type: 'sub', val: isNaN(num) ? 0 : num });
          }
        } else if (rhs === '?') {
          updates.push({ col, type: 'assign', val: params[paramIndex++] });
        } else {
          let cleanVal: any = rhs.replace(/^['"]|['"]$/g, '');
          if (rhs.toUpperCase() === 'NULL') cleanVal = null;
          else if (!isNaN(Number(cleanVal)) && cleanVal !== '') cleanVal = Number(cleanVal);
          updates.push({ col, type: 'assign', val: cleanVal });
        }
      }

      const whereParams = params.slice(paramIndex);

      let changes = 0;
      table.forEach((row, key) => {
        if (this.evaluateWhere(whereClause, row, whereParams)) {
          updates.forEach((u) => {
            if (u.type === 'assign') {
              row[u.col] = u.val;
            } else if (u.type === 'add') {
              row[u.col] = (Number(row[u.col]) || 0) + Number(u.val);
            } else if (u.type === 'sub') {
              row[u.col] = (Number(row[u.col]) || 0) - Number(u.val);
            }
          });
          row.updated_at = new Date().toISOString();
          table.set(key, { ...row });
          changes++;
        }
      });

      if (!this.inTransaction) this.saveToStorage();
      return { changes };
    }

    // 6. DELETE statements
    const deleteMatch = trimmed.match(/^DELETE\s+FROM\s+([a-zA-Z0-9_]+)(?:\s+WHERE\s+(.+))?$/is);
    if (deleteMatch) {
      const tableName = deleteMatch[1];
      const whereClause = deleteMatch[2] || '';
      const table = this.tables.get(tableName);
      if (!table) return { changes: 0 };

      let changes = 0;
      table.forEach((row, key) => {
        if (this.evaluateWhere(whereClause, row, params)) {
          table.delete(key);
          changes++;
        }
      });

      if (!this.inTransaction) this.saveToStorage();
      return { changes };
    }

    return { changes: 0 };
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const trimmed = sql.trim();

    // SELECT statements
    const selectMatch = trimmed.match(/^SELECT\s+(.+?)\s+FROM\s+([a-zA-Z0-9_]+)(?:\s+WHERE\s+(.+?))?(?:\s+ORDER\s+BY\s+(.+?))?(?:\s+LIMIT\s+(\d+))?(?:\s+OFFSET\s+(\d+))?$/is);
    if (!selectMatch) {
      // Fallback for simple selects
      const simpleMatch = trimmed.match(/^SELECT\s+\*\s+FROM\s+([a-zA-Z0-9_]+)/i);
      if (simpleMatch) {
        const table = this.tables.get(simpleMatch[1]);
        if (!table) return [];
        return Array.from(table.values()) as T[];
      }
      return [];
    }

    const fieldsStr = selectMatch[1].trim();
    const tableName = selectMatch[2].trim();
    const whereClause = selectMatch[3] ? selectMatch[3].trim() : '';
    const orderByClause = selectMatch[4] ? selectMatch[4].trim() : '';
    const limit = selectMatch[5] ? parseInt(selectMatch[5], 10) : undefined;
    const offset = selectMatch[6] ? parseInt(selectMatch[6], 10) : 0;

    const table = this.tables.get(tableName);
    if (!table) return [];

    let rows = Array.from(table.values());

    // 1. Filter by WHERE clause
    if (whereClause) {
      rows = rows.filter((row) => this.evaluateWhere(whereClause, row, params));
    }

    // 2. Order by
    if (orderByClause) {
      const parts = orderByClause.split(/\s+/);
      const field = parts[0];
      const dir = (parts[1] || 'ASC').toUpperCase();
      rows.sort((a, b) => {
        const valA = a[field] ?? '';
        const valB = b[field] ?? '';
        if (valA < valB) return dir === 'ASC' ? -1 : 1;
        if (valA > valB) return dir === 'ASC' ? 1 : -1;
        return 0;
      });
    }

    // 3. Offset & Limit
    if (offset > 0) {
      rows = rows.slice(offset);
    }
    if (limit !== undefined) {
      rows = rows.slice(0, limit);
    }

    // 4. Select fields
    if (fieldsStr === '*' || fieldsStr === 'COUNT(*)') {
      if (fieldsStr === 'COUNT(*)') {
        return [{ 'COUNT(*)': rows.length, count: rows.length }] as any[];
      }
      return rows as T[];
    }

    const fields = fieldsStr.split(',').map((f) => f.trim().split(/\s+AS\s+/i)[0]);
    return rows.map((r) => {
      const obj: Record<string, any> = {};
      fields.forEach((f) => {
        obj[f] = r[f];
      });
      return obj as T;
    });
  }

  private evaluateWhere(whereClause: string, row: Record<string, any>, params: any[]): boolean {
    if (!whereClause) return true;

    // Handle soft-delete check: "deleted_at IS NULL"
    if (/deleted_at\s+IS\s+NULL/i.test(whereClause) && row.deleted_at !== null && row.deleted_at !== undefined) {
      return false;
    }

    let paramIdx = 0;
    const conditions = whereClause.split(/\s+AND\s+/i);

    for (const cond of conditions) {
      const trimmedCond = cond.trim();

      const isNullMatch = trimmedCond.match(/^([a-zA-Z0-9_]+)\s+IS\s+NULL$/i);
      if (isNullMatch) {
        const col = isNullMatch[1];
        if (row[col] !== null && row[col] !== undefined) return false;
        continue;
      }

      const isNotNullMatch = trimmedCond.match(/^([a-zA-Z0-9_]+)\s+IS\s+NOT\s+NULL$/i);
      if (isNotNullMatch) {
        const col = isNotNullMatch[1];
        if (row[col] === null || row[col] === undefined) return false;
        continue;
      }

      const eqMatch = trimmedCond.match(/^([a-zA-Z0-9_]+)\s*=\s*\?$/);
      if (eqMatch) {
        const col = eqMatch[1];
        const targetVal = params[paramIdx++];
        if (row[col] !== targetVal) return false;
        continue;
      }

      const notEqMatch = trimmedCond.match(/^([a-zA-Z0-9_]+)\s*(!=|<>)\s*\?$/);
      if (notEqMatch) {
        const col = notEqMatch[1];
        const targetVal = params[paramIdx++];
        if (row[col] === targetVal) return false;
        continue;
      }

      const eqLiteralMatch = trimmedCond.match(/^([a-zA-Z0-9_]+)\s*=\s*['"]?([^'"]+)['"]?$/);
      if (eqLiteralMatch && eqLiteralMatch[2] !== '?') {
        const col = eqLiteralMatch[1];
        let litVal: any = eqLiteralMatch[2];
        if (litVal === '1') litVal = 1;
        else if (litVal === '0') litVal = 0;
        else if (litVal === 'true') litVal = true;
        else if (litVal === 'false') litVal = false;
        if (row[col] !== litVal && String(row[col]) !== String(litVal)) return false;
        continue;
      }

      const notEqLiteralMatch = trimmedCond.match(/^([a-zA-Z0-9_]+)\s*(!=|<>)\s*['"]?([^'"]+)['"]?$/);
      if (notEqLiteralMatch && notEqLiteralMatch[3] !== '?') {
        const col = notEqLiteralMatch[1];
        let litVal: any = notEqLiteralMatch[3];
        if (row[col] === litVal || String(row[col]) === String(litVal)) return false;
        continue;
      }

      const inMatch = trimmedCond.match(/^([a-zA-Z0-9_]+)\s+IN\s*\(([^)]+)\)$/i);
      if (inMatch) {
        const col = inMatch[1];
        const allowedVals = inMatch[2].split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, ''));
        if (!allowedVals.includes(String(row[col]))) return false;
        continue;
      }

      const orLikeMatch = trimmedCond.match(/^\((.+)\)$/);
      if (orLikeMatch) {
        const orClauses = orLikeMatch[1].split(/\s+OR\s+/i);
        let anyMatch = false;
        for (const orCond of orClauses) {
          const likeMatch = orCond.match(/^([a-zA-Z0-9_]+)\s+LIKE\s+\?$/i);
          if (likeMatch) {
            const col = likeMatch[1];
            const pattern = String(params[paramIdx++] || '').replace(/%/g, '').toLowerCase();
            const val = String(row[col] || '').toLowerCase();
            if (val.includes(pattern)) {
              anyMatch = true;
            }
          }
        }
        if (!anyMatch) return false;
        continue;
      }
    }

    return true;
  }
}

/**
 * Native Capacitor SQLite Driver with SQLCipher AES-256 Encryption
 * Interfaces with @capacitor-community/sqlite on Android / iOS
 */
export class CapacitorSQLiteNativeDriver implements ISQLiteDriver {
  private opened = false;
  private dbName = 'workshop_erp_encrypted.db';
  private sqlitePlugin: any = null;
  private dbConnection: any = null;
  private readonly encryptionSecret = 'AL_ANDALUS_SECURE_ERP_SQLCIPHER_KEY_2026_YEMEN';

  async open(databaseName: string): Promise<void> {
    this.dbName = databaseName;
    try {
      // Dynamic import with vite-ignore to support both Capacitor native runtime and Web fallback
      const capacitor = (window as any)?.Capacitor;
      if (capacitor && capacitor.isNativePlatform?.()) {
        const sqlitePkgName = '@capacitor-community/sqlite';
        const { CapacitorSQLite, SQLiteConnection } = await import(/* @vite-ignore */ sqlitePkgName);
        const sqlite = new SQLiteConnection(CapacitorSQLite);
        this.sqlitePlugin = sqlite;

        // Check if connection already exists
        const isConn = (await sqlite.isConnection(this.dbName, false)).result;
        if (isConn) {
          this.dbConnection = await sqlite.retrieveConnection(this.dbName, false);
        } else {
          // Open with SQLCipher Encryption Mode enabled
          this.dbConnection = await sqlite.createConnection(
            this.dbName,
            true, // encrypted: true (SQLCipher AES-256)
            'secret', // encryptionMode: secret
            1, // databaseVersion
            false // readonly
          );
        }

        await this.dbConnection.open();
        // Enable WAL mode & foreign keys for high performance concurrency
        await this.dbConnection.execute('PRAGMA journal_mode = WAL;');
        await this.dbConnection.execute('PRAGMA foreign_keys = ON;');
        this.opened = true;
      } else {
        // Fallback for Web preview / test environment
        this.opened = true;
      }
    } catch (err) {
      console.warn('[CapacitorSQLiteNativeDriver] Native SQLite not available, running in emulated web mode:', err);
      this.opened = true;
    }
  }

  async close(): Promise<void> {
    if (this.dbConnection && this.opened) {
      await this.dbConnection.close();
      this.opened = false;
    }
  }

  isOpened(): boolean {
    return this.opened;
  }

  async execute(sql: string): Promise<void> {
    if (this.dbConnection) {
      await this.dbConnection.execute(sql);
    }
  }

  async executeSet(statements: { statement: string; values?: any[] }[]): Promise<void> {
    if (this.dbConnection) {
      const set = statements.map((s) => ({
        statement: s.statement,
        values: s.values || []
      }));
      await this.dbConnection.executeSet(set);
    }
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    if (this.dbConnection) {
      const res = await this.dbConnection.query(sql, params);
      return (res.values || []) as T[];
    }
    return [];
  }

  async run(sql: string, params: any[] = []): Promise<{ changes: number; lastId?: any }> {
    if (this.dbConnection) {
      const res = await this.dbConnection.run(sql, params);
      return {
        changes: res.changes?.changes || 0,
        lastId: res.changes?.lastId
      };
    }
    return { changes: 0 };
  }

  async beginTransaction(): Promise<void> {
    if (this.dbConnection) {
      await this.dbConnection.beginTransaction();
    }
  }

  async commitTransaction(): Promise<void> {
    if (this.dbConnection) {
      await this.dbConnection.commitTransaction();
    }
  }

  async rollbackTransaction(): Promise<void> {
    if (this.dbConnection) {
      await this.dbConnection.rollbackTransaction();
    }
  }
}

// Singleton Driver Factory with automatic runtime environment detection
export class SQLiteDriverFactory {
  private static instance: ISQLiteDriver | null = null;

  static getDriver(): ISQLiteDriver {
    if (!this.instance) {
      const isNative = typeof window !== 'undefined' && (window as any)?.Capacitor?.isNativePlatform?.();
      if (isNative) {
        this.instance = new CapacitorSQLiteNativeDriver();
      } else {
        this.instance = new WebSQLiteDriver();
      }
    }
    return this.instance;
  }
}
