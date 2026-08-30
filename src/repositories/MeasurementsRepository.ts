import { DatabaseService } from '../db/databaseService';
import { Measurement, MeasurementVersion, MeasurementImage } from '../db/types';
import { SyncOutboxRepository } from './SyncOutboxRepository';

export class MeasurementsRepository {
  private db = DatabaseService.getInstance();
  private outboxRepo = new SyncOutboxRepository();

  private generateUUID(): string {
    if (typeof crypto !== 'undefined' && (crypto as any).randomUUID) {
      return (crypto as any).randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  async createMeasurement(params: {
    customer_id?: string;
    project_id?: string;
    production_order_id?: string;
    location?: string;
    width?: number;
    height?: number;
    quantity?: number;
    thickness?: number;
    profile_type?: string;
    color?: string;
    glass_type?: string;
    accessories?: string;
    opening_direction?: string;
    notes?: string;
    measured_by?: string;
    measured_at?: string;
  }): Promise<Measurement> {
    return await this.db.transaction(async () => {
      const id = this.generateUUID();
      const tenantId = this.db.getTenantId();
      const now = new Date().toISOString();
      const version = 1;

      const sql = `
        INSERT INTO measurements (id, tenant_id, customer_id, project_id, production_order_id, location, width, height, quantity, thickness, profile_type, color, glass_type, accessories, opening_direction, notes, version, measured_by, measured_at, sync_status, sync_version, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 1, ?, ?)
      `;
      await this.db.run(sql, [
        id, tenantId, params.customer_id ?? null, params.project_id ?? null,
        params.production_order_id ?? null, params.location ?? null, params.width ?? null,
        params.height ?? null, params.quantity ?? 1, params.thickness ?? null,
        params.profile_type ?? null, params.color ?? null, params.glass_type ?? null,
        params.accessories ?? null, params.opening_direction ?? null, params.notes ?? null,
        version, params.measured_by ?? null, params.measured_at ?? null, now, now
      ]);

      // حفظ الإصدار الأول في سجل الإصدارات
      await this.saveVersion(id, version, params);

      const created = await this.findById(id);
      if (created) {
        await this.outboxRepo.queueSync('measurements', id, 'INSERT', created);
      }
      return created!;
    });
  }

  async updateMeasurement(id: string, params: Partial<{
    width?: number;
    height?: number;
    quantity?: number;
    thickness?: number;
    profile_type?: string;
    color?: string;
    glass_type?: string;
    accessories?: string;
    opening_direction?: string;
    notes?: string;
    measured_by?: string;
    measured_at?: string;
  }>): Promise<Measurement> {
    return await this.db.transaction(async () => {
      const tenantId = this.db.getTenantId();
      const existing = await this.findById(id);
      if (!existing) throw new Error('MEASUREMENT_NOT_FOUND');

      const newVersion = existing.version + 1;
      const now = new Date().toISOString();

      const updates: string[] = [];
      const updateParams: any[] = [];
      if (params.width !== undefined) { updates.push('width = ?'); updateParams.push(params.width); }
      if (params.height !== undefined) { updates.push('height = ?'); updateParams.push(params.height); }
      if (params.quantity !== undefined) { updates.push('quantity = ?'); updateParams.push(params.quantity); }
      if (params.thickness !== undefined) { updates.push('thickness = ?'); updateParams.push(params.thickness); }
      if (params.profile_type !== undefined) { updates.push('profile_type = ?'); updateParams.push(params.profile_type); }
      if (params.color !== undefined) { updates.push('color = ?'); updateParams.push(params.color); }
      if (params.glass_type !== undefined) { updates.push('glass_type = ?'); updateParams.push(params.glass_type); }
      if (params.accessories !== undefined) { updates.push('accessories = ?'); updateParams.push(params.accessories); }
      if (params.opening_direction !== undefined) { updates.push('opening_direction = ?'); updateParams.push(params.opening_direction); }
      if (params.notes !== undefined) { updates.push('notes = ?'); updateParams.push(params.notes); }
      if (params.measured_by !== undefined) { updates.push('measured_by = ?'); updateParams.push(params.measured_by); }
      if (params.measured_at !== undefined) { updates.push('measured_at = ?'); updateParams.push(params.measured_at); }

      if (updates.length === 0) return existing;

      updates.push('version = ?'); updateParams.push(newVersion);
      updates.push('updated_at = ?'); updateParams.push(now);
      updates.push(`sync_status = 'pending'`);
      updates.push('sync_version = sync_version + 1');
      updateParams.push(id, tenantId);

      const sql = `UPDATE measurements SET ${updates.join(', ')} WHERE id = ? AND tenant_id = ?`;
      await this.db.run(sql, updateParams);

      // حفظ الإصدار الجديد
      await this.saveVersion(id, newVersion, { ...existing, ...params, version: newVersion });

      const updated = await this.findById(id);
      if (updated) {
        await this.outboxRepo.queueSync('measurements', id, 'UPDATE', updated);
      }
      return updated!;
    });
  }

  async findById(id: string): Promise<Measurement | null> {
    const tenantId = this.db.getTenantId();
    return this.db.queryOne<Measurement>(
      `SELECT * FROM measurements WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL`,
      [id, tenantId]
    );
  }

  async listVersions(measurementId: string): Promise<MeasurementVersion[]> {
    const tenantId = this.db.getTenantId();
    return this.db.query<MeasurementVersion>(
      `SELECT * FROM measurement_versions WHERE measurement_id = ? AND tenant_id = ? ORDER BY version DESC`,
      [measurementId, tenantId]
    );
  }

  async addImage(measurementId: string, filePath: string, fileName?: string, mimeType?: string, isPrimary = 0, uploadedBy?: string): Promise<MeasurementImage> {
    const tenantId = this.db.getTenantId();
    const id = this.generateUUID();
    const now = new Date().toISOString();
    await this.db.run(
      `INSERT INTO measurement_images (id, tenant_id, measurement_id, file_path, file_name, mime_type, is_primary, uploaded_by, created_at, sync_status, sync_version) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 1)`,
      [id, tenantId, measurementId, filePath, fileName ?? null, mimeType ?? null, isPrimary, uploadedBy ?? null, now]
    );
    const img = await this.db.queryOne<MeasurementImage>(`SELECT * FROM measurement_images WHERE id = ? AND tenant_id = ?`, [id, tenantId]);
    if (img) await this.outboxRepo.queueSync('measurement_images', id, 'INSERT', img);
    return img!;
  }

  async listImages(measurementId: string): Promise<MeasurementImage[]> {
    const tenantId = this.db.getTenantId();
    return this.db.query<MeasurementImage>(`SELECT * FROM measurement_images WHERE measurement_id = ? AND tenant_id = ? ORDER BY created_at`, [measurementId, tenantId]);
  }

  async removeImage(imageId: string): Promise<boolean> {
    const tenantId = this.db.getTenantId();
    const result = await this.db.run(`DELETE FROM measurement_images WHERE id = ? AND tenant_id = ?`, [imageId, tenantId]);
    if (result.changes > 0) {
      await this.outboxRepo.queueSync('measurement_images', imageId, 'DELETE', { id: imageId });
    }
    return result.changes > 0;
  }

  private async saveVersion(measurementId: string, version: number, data: any): Promise<void> {
    const tenantId = this.db.getTenantId();
    const id = this.generateUUID();
    const now = new Date().toISOString();
    const sql = `
      INSERT INTO measurement_versions (id, tenant_id, measurement_id, version, width, height, quantity, thickness, profile_type, color, glass_type, accessories, opening_direction, notes, measured_by, measured_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await this.db.run(sql, [
      id, tenantId, measurementId, version, data.width ?? null, data.height ?? null,
      data.quantity ?? 1, data.thickness ?? null, data.profile_type ?? null, data.color ?? null,
      data.glass_type ?? null, data.accessories ?? null, data.opening_direction ?? null,
      data.notes ?? null, data.measured_by ?? null, data.measured_at ?? null, now
    ]);
  }
}
