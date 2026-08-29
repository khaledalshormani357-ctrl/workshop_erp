// ============================================================================
// Workshop ERP - Sync Outbox Repository (ADR-003 Offline-First Sync Engine)
// ============================================================================

import { DatabaseService } from '../db/databaseService';
import { SyncOutboxEntry } from '../db/types';

export class SyncOutboxRepository {
  private db = DatabaseService.getInstance();

  private generateUUID(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  async queueSync(
    localEntity: string,
    localId: string,
    operation: 'INSERT' | 'UPDATE' | 'DELETE',
    payload: object
  ): Promise<void> {
    const id = this.generateUUID();
    const tenantId = this.db.getTenantId();
    const now = new Date().toISOString();
    const sql = `
      INSERT INTO sync_outbox (id, tenant_id, local_entity, local_id, operation, payload, status, retry_count, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'pending', 0, ?)
    `;
    await this.db.run(sql, [id, tenantId, localEntity, localId, operation, JSON.stringify(payload), now]);
  }

  async getPending(): Promise<SyncOutboxEntry[]> {
    const tenantId = this.db.getTenantId();
    return this.db.query<SyncOutboxEntry>(
      `SELECT * FROM sync_outbox WHERE tenant_id = ? AND status = 'pending' ORDER BY created_at ASC`,
      [tenantId]
    );
  }

  async markSynced(id: string): Promise<void> {
    const now = new Date().toISOString();
    await this.db.run(
      `UPDATE sync_outbox SET status = 'synced', last_attempt = ? WHERE id = ?`,
      [now, id]
    );
  }

  async markFailed(id: string, errorMessage: string): Promise<void> {
    const now = new Date().toISOString();
    await this.db.run(
      `UPDATE sync_outbox SET status = 'failed', error_message = ?, retry_count = retry_count + 1, last_attempt = ? WHERE id = ?`,
      [errorMessage, now, id]
    );
  }
}
