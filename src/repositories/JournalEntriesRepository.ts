// ============================================================================
// Workshop ERP - Journal Entries Repository (Double-Entry General Ledger Engine)
// ============================================================================

import { DatabaseService } from '../db/databaseService';
import { JournalEntry, JournalEntryLine, CreateJournalEntryInput, JournalReversal, PartnerType, SyncOutboxEntry } from '../db/types';
import { SyncOutboxRepository } from './SyncOutboxRepository';

export class JournalEntriesRepository {
  private db = DatabaseService.getInstance();
  private outboxRepo = new SyncOutboxRepository();

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

  private async generateEntryNumber(): Promise<string> {
    const tenantId = this.db.getTenantId();
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const prefix = `JE-${year}${month}-`;
    const rows = await this.db.query<{ count: number }>(
      `SELECT COUNT(*) as count FROM journal_entries WHERE tenant_id = ? AND entry_number LIKE ?`,
      [tenantId, `${prefix}%`]
    );
    const seq = (rows[0]?.count ?? 0) + 1;
    return `${prefix}${String(seq).padStart(5, '0')}`;
  }

  async createDraft(input: CreateJournalEntryInput): Promise<JournalEntry> {
    return await this.db.transaction(async () => {
      const id = this.generateUUID();
      const tenantId = this.db.getTenantId();
      const entry_number = input.entry_number || (await this.generateEntryNumber());

      const total_debit = input.lines.reduce((sum, l) => sum + (Number(l.debit) || 0), 0);
      const total_credit = input.lines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0);

      // Strict Double-Entry Balance Check
      if (Math.abs(total_debit - total_credit) > 0.001) {
        throw new Error(`UNBALANCED_JOURNAL: Total Debit (${total_debit}) must equal Total Credit (${total_credit})`);
      }

      const now = new Date().toISOString();
      const narration = input.narration || input.description || `Journal Entry ${entry_number}`;
      const narration_ar = input.narration_ar || input.narration || narration;
      const createdBy = input.created_by || 'usr-accountant-01';

      const sqlHeader = `
        INSERT INTO journal_entries (
          id, tenant_id, entry_number, date, reference_type, reference_id,
          source_document, narration, narration_ar, status, total_debit, total_credit,
          created_by, sync_status, sync_version, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, 'pending', 1, ?, ?)
      `;
      await this.db.run(sqlHeader, [
        id,
        tenantId,
        entry_number,
        input.date,
        input.reference_type ?? input.reference_entity ?? null,
        input.reference_id ?? null,
        input.source_document ?? null,
        narration,
        narration_ar,
        total_debit,
        total_credit,
        createdBy,
        now,
        now
      ]);

      const linesData: any[] = [];
      let lineOrder = 1;
      for (const line of input.lines) {
        const lineId = this.generateUUID();
        const sqlLine = `
          INSERT INTO journal_entry_lines (
            id, tenant_id, journal_entry_id, account_id, debit, credit,
            description, line_order, partner_type, partner_id, cost_center_id, created_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const lOrder = line.line_order ?? lineOrder;
        const pType = line.partner_type ?? 'none';
        const pId = line.partner_id ?? null;
        const ccId = line.cost_center_id ?? null;
        const lDesc = line.description ?? narration;
        const debitVal = Number(line.debit) || 0;
        const creditVal = Number(line.credit) || 0;

        await this.db.run(sqlLine, [
          lineId,
          tenantId,
          id,
          line.account_id,
          debitVal,
          creditVal,
          lDesc,
          lOrder,
          pType,
          pId,
          ccId,
          now
        ]);

        linesData.push({
          id: lineId,
          journal_entry_id: id,
          account_id: line.account_id,
          debit: debitVal,
          credit: creditVal,
          description: lDesc,
          line_order: lOrder,
          partner_type: pType,
          partner_id: pId,
          cost_center_id: ccId,
        });

        lineOrder++;
      }

      // إنشاء الحدث التلقائي في sync_outbox
      const payload = {
        header: {
          id,
          tenant_id: tenantId,
          entry_number,
          date: input.date,
          reference_type: input.reference_type ?? input.reference_entity ?? null,
          reference_id: input.reference_id ?? null,
          source_document: input.source_document ?? null,
          narration,
          narration_ar,
          status: 'draft',
          total_debit,
          total_credit,
          created_by: createdBy,
        },
        lines: linesData,
      };
      await this.outboxRepo.queueSync('journal_entries', id, 'INSERT', payload);

      const created = await this.findById(id);
      if (!created) {
        throw new Error(`Failed to create journal entry ${id}`);
      }
      return created;
    });
  }

  async findById(id: string): Promise<JournalEntry | null> {
    const tenantId = this.db.getTenantId();
    const row = await this.db.queryOne<any>(
      `SELECT id, tenant_id, entry_number, date, reference_type, reference_type as reference_entity,
              reference_id, source_document, narration, narration_ar, narration as description,
              status, total_debit, total_credit, created_by, reversed_entry_id, reversal_reason,
              posted_at, posted_by, created_at, updated_at, sync_status, sync_version
       FROM journal_entries 
       WHERE id = ? AND tenant_id = ?`,
      [id, tenantId]
    );
    if (!row) return null;
    return {
      id: row.id,
      tenant_id: row.tenant_id,
      entry_number: row.entry_number,
      date: row.date,
      reference_type: row.reference_type,
      reference_entity: row.reference_entity,
      reference_id: row.reference_id,
      source_document: row.source_document,
      narration: row.narration,
      narration_ar: row.narration_ar,
      description: row.description,
      status: row.status,
      total_debit: Number(row.total_debit) || 0,
      total_credit: Number(row.total_credit) || 0,
      created_by: row.created_by,
      reversed_entry_id: row.reversed_entry_id,
      reversal_reason: row.reversal_reason,
      posted_at: row.posted_at,
      posted_by: row.posted_by,
      created_at: row.created_at,
      updated_at: row.updated_at || row.created_at,
      sync_status: row.sync_status || 'pending',
      sync_version: Number(row.sync_version) || 1
    };
  }

  async getLines(entryId: string): Promise<JournalEntryLine[]> {
    const tenantId = this.db.getTenantId();
    const rows = await this.db.query<any>(
      `SELECT id, tenant_id, journal_entry_id, account_id, debit, credit, description,
              line_order, partner_type, partner_id, cost_center_id, created_at
       FROM journal_entry_lines 
       WHERE journal_entry_id = ? AND tenant_id = ? 
       ORDER BY line_order ASC, created_at ASC`,
      [entryId, tenantId]
    );
    return rows.map((r) => ({
      id: r.id,
      tenant_id: r.tenant_id,
      journal_entry_id: r.journal_entry_id,
      account_id: r.account_id,
      description: r.description,
      debit: Number(r.debit) || 0,
      credit: Number(r.credit) || 0,
      line_order: Number(r.line_order) || 1,
      partner_type: r.partner_type,
      partner_id: r.partner_id,
      cost_center_id: r.cost_center_id,
      created_at: r.created_at
    }));
  }

  async postEntry(entryId: string, postedBy: string): Promise<boolean> {
    return await this.db.transaction(async () => {
      const tenantId = this.db.getTenantId();
      const entry = await this.findById(entryId);
      if (!entry || entry.tenant_id !== tenantId) throw new Error('ENTRY_NOT_FOUND');
      if (entry.status !== 'draft') throw new Error('INVALID_STATE_TRANSITION');

      // Double-check line balance
      const lines = await this.getLines(entryId);
      const totalDebit = lines.reduce((sum, l) => sum + l.debit, 0);
      const totalCredit = lines.reduce((sum, l) => sum + l.credit, 0);
      if (Math.abs(totalDebit - totalCredit) > 0.001) {
        throw new Error('UNBALANCED_JOURNAL');
      }

      const now = new Date().toISOString();
      await this.db.run(
        `UPDATE journal_entries SET status = 'posted', posted_at = ?, posted_by = ?, updated_at = ? WHERE id = ? AND tenant_id = ?`,
        [now, postedBy, now, entryId, tenantId]
      );

      // حدث تحديث للمزامنة
      await this.outboxRepo.queueSync('journal_entries', entryId, 'UPDATE', {
        id: entryId,
        status: 'posted',
        posted_at: now,
        posted_by: postedBy
      });

      return true;
    });
  }

  async post(entryId: string, postedBy: string = 'system'): Promise<JournalEntry> {
    await this.postEntry(entryId, postedBy);
    const entry = await this.findById(entryId);
    if (!entry) {
      throw new Error(`ENTRY_NOT_FOUND_AFTER_POST: ${entryId}`);
    }
    return entry;
  }

  async createAndPost(input: CreateJournalEntryInput, postedBy: string = 'system'): Promise<JournalEntry> {
    const draft = await this.createDraft(input);
    return await this.post(draft.id, postedBy);
  }

  async reverseEntry(entryId: string, reason: string, reversedBy: string): Promise<JournalEntry> {
    return await this.db.transaction(async () => {
      const tenantId = this.db.getTenantId();
      const original = await this.findById(entryId);
      if (!original || original.tenant_id !== tenantId) throw new Error('ENTRY_NOT_FOUND');
      if (original.status !== 'posted') throw new Error('INVALID_STATE_TRANSITION');

      const lines = await this.getLines(entryId);
      if (lines.length === 0) throw new Error('NO_LINES');

      // إنشاء القيد العكسي بتبديل المدين والدائن
      const reversalInput: CreateJournalEntryInput = {
        entry_number: `REV-${original.entry_number}`,
        date: new Date().toISOString().slice(0, 10),
        reference_type: 'journal_reversal',
        reference_id: original.id,
        source_document: 'Journal Reversal',
        narration: `Reversal of ${original.entry_number}: ${reason}`,
        narration_ar: `عكس قيد ${original.entry_number}: ${reason}`,
        created_by: reversedBy,
        lines: lines.map((line) => ({
          account_id: line.account_id,
          description: line.description || `Reversal line for ${original.entry_number}`,
          debit: line.credit,
          credit: line.debit,
          line_order: line.line_order,
          partner_type: line.partner_type,
          partner_id: line.partner_id,
          cost_center_id: line.cost_center_id
        }))
      };

      // إنشاء القيد العكسي كمسودة ثم ترحيله
      const reversal = await this.createDraft(reversalInput);
      await this.postEntry(reversal.id, reversedBy);

      // تحديث القيد الأصلي إلى reversed
      const now = new Date().toISOString();
      await this.db.run(
        `UPDATE journal_entries SET status = 'reversed', reversed_entry_id = ?, reversal_reason = ?, updated_at = ? WHERE id = ? AND tenant_id = ?`,
        [reversal.id, reason ?? null, now, entryId, tenantId]
      );

      // حدث تحديث للقيد الأصلي
      await this.outboxRepo.queueSync('journal_entries', entryId, 'UPDATE', {
        id: entryId,
        status: 'reversed',
        reversed_entry_id: reversal.id,
        reversal_reason: reason ?? null
      });

      // إدراج علاقة العكس في جدول journal_reversals
      const reversalId = this.generateUUID();
      await this.db.run(
        `INSERT INTO journal_reversals (id, tenant_id, original_entry_id, reversal_entry_id, reason, created_at, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [reversalId, tenantId, entryId, reversal.id, reason ?? null, now, reversedBy]
      );

      const postedReversal = await this.findById(reversal.id);
      return postedReversal || reversal;
    });
  }

  async listDrafts(): Promise<JournalEntry[]> {
    const tenantId = this.db.getTenantId();
    const rows = await this.db.query<any>(
      `SELECT id, tenant_id, entry_number, date, reference_type, reference_type as reference_entity,
              reference_id, source_document, narration, narration_ar, narration as description,
              status, total_debit, total_credit, created_by, created_at, updated_at, sync_status, sync_version
       FROM journal_entries 
       WHERE tenant_id = ? AND status = 'draft' 
       ORDER BY created_at DESC`,
      [tenantId]
    );
    return rows.map((row) => ({
      id: row.id,
      tenant_id: row.tenant_id,
      entry_number: row.entry_number,
      date: row.date,
      reference_type: row.reference_type,
      reference_entity: row.reference_entity,
      reference_id: row.reference_id,
      source_document: row.source_document,
      narration: row.narration,
      narration_ar: row.narration_ar,
      description: row.description,
      status: row.status,
      total_debit: Number(row.total_debit) || 0,
      total_credit: Number(row.total_credit) || 0,
      created_by: row.created_by,
      created_at: row.created_at,
      updated_at: row.updated_at || row.created_at,
      sync_status: row.sync_status || 'pending',
      sync_version: Number(row.sync_version) || 1
    }));
  }

  async listPosted(): Promise<JournalEntry[]> {
    const tenantId = this.db.getTenantId();
    const rows = await this.db.query<any>(
      `SELECT id, tenant_id, entry_number, date, reference_type, reference_type as reference_entity,
              reference_id, source_document, narration, narration_ar, narration as description,
              status, total_debit, total_credit, created_by, created_at, updated_at, sync_status, sync_version
       FROM journal_entries 
       WHERE tenant_id = ? AND status = 'posted' 
       ORDER BY date DESC, created_at DESC`,
      [tenantId]
    );
    return rows.map((row) => ({
      id: row.id,
      tenant_id: row.tenant_id,
      entry_number: row.entry_number,
      date: row.date,
      reference_type: row.reference_type,
      reference_entity: row.reference_entity,
      reference_id: row.reference_id,
      source_document: row.source_document,
      narration: row.narration,
      narration_ar: row.narration_ar,
      description: row.description,
      status: row.status,
      total_debit: Number(row.total_debit) || 0,
      total_credit: Number(row.total_credit) || 0,
      created_by: row.created_by,
      created_at: row.created_at,
      updated_at: row.updated_at || row.created_at,
      sync_status: row.sync_status || 'pending',
      sync_version: Number(row.sync_version) || 1
    }));
  }

  async listAll(): Promise<JournalEntry[]> {
    const tenantId = this.db.getTenantId();
    const rows = await this.db.query<any>(
      `SELECT id, tenant_id, entry_number, date, reference_type, reference_type as reference_entity,
              reference_id, source_document, narration, narration_ar, narration as description,
              status, total_debit, total_credit, created_by, created_at, updated_at, sync_status, sync_version
       FROM journal_entries 
       WHERE tenant_id = ? 
       ORDER BY created_at DESC`,
      [tenantId]
    );
    return rows.map((row) => ({
      id: row.id,
      tenant_id: row.tenant_id,
      entry_number: row.entry_number,
      date: row.date,
      reference_type: row.reference_type,
      reference_entity: row.reference_entity,
      reference_id: row.reference_id,
      source_document: row.source_document,
      narration: row.narration,
      narration_ar: row.narration_ar,
      description: row.description,
      status: row.status,
      total_debit: Number(row.total_debit) || 0,
      total_credit: Number(row.total_credit) || 0,
      created_by: row.created_by,
      created_at: row.created_at,
      updated_at: row.updated_at || row.created_at,
      sync_status: row.sync_status || 'pending',
      sync_version: Number(row.sync_version) || 1
    }));
  }
}

