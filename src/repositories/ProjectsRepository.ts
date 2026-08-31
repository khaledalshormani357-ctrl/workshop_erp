import { BaseRepository } from './BaseRepository';
import { SyncOutboxRepository } from './SyncOutboxRepository';
import { Project, ProjectStatus } from '../db/types';

export class ProjectsRepository extends BaseRepository<Project> {
  private outboxRepo = new SyncOutboxRepository();

  constructor() {
    super('projects');
  }

  async create(project: Omit<Project, 'id' | 'tenant_id' | 'created_at' | 'updated_at' | 'deleted_at' | 'sync_status' | 'sync_version'>): Promise<Project> {
    return await this.db.transaction(async () => {
      const id = this.generateUUID();
      const tenantId = this.db.getTenantId();
      const now = new Date().toISOString();
      const sql = `
        INSERT INTO projects (id, tenant_id, customer_id, name, name_ar, description, start_date, end_date, status, sync_status, sync_version, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 1, ?, ?)
      `;
      await this.db.run(sql, [
        id, tenantId, project.customer_id, project.name, project.name_ar ?? null,
        project.description ?? null, project.start_date ?? null, project.end_date ?? null,
        project.status ?? 'open', now, now
      ]);

      const created = await this.findById(id);
      if (created) {
        await this.outboxRepo.queueSync('projects', id, 'INSERT', created);
      }
      return created!;
    });
  }

  async updateStatus(id: string, status: ProjectStatus): Promise<boolean> {
    const tenantId = this.db.getTenantId();
    const now = new Date().toISOString();
    const result = await this.db.run(
      `UPDATE projects SET status = ?, updated_at = ?, sync_status = 'pending', sync_version = sync_version + 1 WHERE id = ? AND tenant_id = ?`,
      [status, now, id, tenantId]
    );
    if (result.changes > 0) {
      await this.outboxRepo.queueSync('projects', id, 'UPDATE', { id, status });
    }
    return result.changes > 0;
  }

  async listByCustomer(customerId: string): Promise<Project[]> {
    const tenantId = this.db.getTenantId();
    return this.db.query<Project>(
      `SELECT * FROM projects WHERE customer_id = ? AND tenant_id = ? AND deleted_at IS NULL ORDER BY created_at DESC`,
      [customerId, tenantId]
    );
  }
}
