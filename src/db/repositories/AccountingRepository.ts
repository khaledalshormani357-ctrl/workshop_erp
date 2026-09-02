// ============================================================================
// Workshop ERP - Accounting Repositories (ADR-004 Double-Entry Ledger)
// ============================================================================

import { BaseRepository } from './BaseRepository';
import {
  AccountEntity,
  JournalEntryEntity,
  JournalEntryLineEntity,
  AccountType,
  AccountNature,
  CreateJournalEntryInput
} from '../types';

export class ChartOfAccountsRepository extends BaseRepository<AccountEntity> {
  constructor() {
    super('chart_of_accounts');
  }

  async create(account: Omit<AccountEntity, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>): Promise<AccountEntity> {
    const id = this.generateUUID();
    const tenantId = this.getTenantId();
    const now = new Date().toISOString();

    const entity: AccountEntity = {
      id,
      tenant_id: tenantId,
      code: account.code,
      name: account.name,
      name_ar: account.name_ar,
      type: account.type,
      nature: account.nature,
      parent_id: account.parent_id || null,
      level: account.level || 1,
      is_reconciliation: account.is_reconciliation || 0,
      is_active: account.is_active !== undefined ? account.is_active : 1,
      created_at: now,
      updated_at: now,
      deleted_at: null
    };

    await this.db.run(
      `INSERT INTO chart_of_accounts (id, tenant_id, code, name, name_ar, type, nature, parent_id, level, is_reconciliation, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entity.id,
        entity.tenant_id,
        entity.code,
        entity.name,
        entity.name_ar,
        entity.type,
        entity.nature,
        entity.parent_id,
        entity.level,
        entity.is_reconciliation,
        entity.is_active,
        entity.created_at,
        entity.updated_at
      ]
    );

    return entity;
  }

  async findByCode(code: string): Promise<AccountEntity | null> {
    const tenantId = this.getTenantId();
    return this.db.queryOne<AccountEntity>(
      `SELECT * FROM chart_of_accounts WHERE code = ? AND tenant_id = ? AND deleted_at IS NULL`,
      [code, tenantId]
    );
  }

  async listByType(type: AccountType): Promise<AccountEntity[]> {
    const tenantId = this.getTenantId();
    return this.db.query<AccountEntity>(
      `SELECT * FROM chart_of_accounts WHERE type = ? AND tenant_id = ? AND deleted_at IS NULL ORDER BY code ASC`,
      [type, tenantId]
    );
  }
}

export class JournalEntriesRepository {
  /**
   * Posts an immutable balanced double-entry journal voucher
   * Validates: Sum(Debits) === Sum(Credits)
   */
  async postEntry(input: CreateJournalEntryInput, tenantId?: string): Promise<{ header: JournalEntryEntity; lines: JournalEntryLineEntity[] }> {
    const db = (await import('../databaseService')).DatabaseService.getInstance();
    const tid = tenantId || db.getTenantId();
    const now = new Date().toISOString();

    // 1. Calculate totals and validate balance
    let totalDebit = 0;
    let totalCredit = 0;

    input.lines.forEach((l) => {
      totalDebit += l.debit || 0;
      totalCredit += l.credit || 0;
    });

    totalDebit = Math.round(totalDebit * 100) / 100;
    totalCredit = Math.round(totalCredit * 100) / 100;

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new Error(`Double-Entry Unbalanced: Total Debit (${totalDebit}) does not equal Total Credit (${totalCredit})`);
    }

    if (input.lines.length < 2) {
      throw new Error('Double-Entry requires at least 2 lines (Debit and Credit)');
    }

    // 2. Generate entry number if not provided
    const count = (await db.query<{ count: number }>(`SELECT COUNT(*) as count FROM journal_entries WHERE tenant_id = ?`, [tid]))[0]?.count || 0;
    const entryNumber = input.entry_number || `JV-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
    const headerId = crypto.randomUUID();

    const header: JournalEntryEntity = {
      id: headerId,
      tenant_id: tid,
      entry_number: entryNumber,
      date: input.date,
      reference_type: input.reference_type || null,
      reference_id: input.reference_id || null,
      source_document: input.source_document || null,
      narration: input.narration || input.description || 'Journal Entry',
      narration_ar: input.narration_ar || input.narration || input.description || 'قيد يومية',
      total_debit: totalDebit,
      total_credit: totalCredit,
      status: 'posted',
      reversed_entry_id: null,
      reversal_reason: null,
      created_by: input.created_by || 'system',
      sync_status: 'pending',
      sync_version: 1,
      created_at: now
    };

    const lines: JournalEntryLineEntity[] = input.lines.map((l, idx) => ({
      id: crypto.randomUUID(),
      tenant_id: tid,
      journal_entry_id: headerId,
      account_id: l.account_id,
      debit: l.debit || 0,
      credit: l.credit || 0,
      description: l.description || null,
      partner_type: l.partner_type || null,
      partner_id: l.partner_id || null,
      cost_center_id: l.cost_center_id || null,
      line_order: idx + 1,
      created_at: now
    }));

    // 3. Atomically persist header and lines
    await db.transaction(async (trx) => {
      await trx.run(
        `INSERT INTO journal_entries (id, tenant_id, entry_number, date, reference_type, reference_id, source_document, narration, narration_ar, total_debit, total_credit, status, created_by, sync_status, sync_version, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          header.id,
          header.tenant_id,
          header.entry_number,
          header.date,
          header.reference_type,
          header.reference_id,
          header.source_document,
          header.narration,
          header.narration_ar,
          header.total_debit,
          header.total_credit,
          header.status,
          header.created_by,
          header.sync_status,
          header.sync_version,
          header.created_at
        ]
      );

      for (const line of lines) {
        await trx.run(
          `INSERT INTO journal_entry_lines (id, tenant_id, journal_entry_id, account_id, debit, credit, description, partner_type, partner_id, cost_center_id, line_order, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            line.id,
            line.tenant_id,
            line.journal_entry_id,
            line.account_id,
            line.debit,
            line.credit,
            line.description,
            line.partner_type,
            line.partner_id,
            line.cost_center_id,
            line.line_order,
            line.created_at
          ]
        );
      }
    });

    return { header, lines };
  }

  /**
   * Reverses a posted journal entry with a formal counter-entry (ADR-004)
   */
  async reverseEntry(
    entryId: string,
    reason: string,
    reversedBy: string,
    tenantId?: string
  ): Promise<JournalEntryEntity> {
    const db = (await import('../databaseService')).DatabaseService.getInstance();
    const tid = tenantId || db.getTenantId();

    const original = await db.queryOne<JournalEntryEntity>(
      `SELECT * FROM journal_entries WHERE id = ? AND tenant_id = ?`,
      [entryId, tid]
    );

    if (!original) throw new Error(`Journal entry ${entryId} not found`);
    if (original.status === 'reversed') throw new Error(`Journal entry ${original.entry_number} is already reversed`);

    const originalLines = await db.query<JournalEntryLineEntity>(
      `SELECT * FROM journal_entry_lines WHERE journal_entry_id = ? AND tenant_id = ?`,
      [entryId, tid]
    );

    // Invert lines (Debits become Credits, Credits become Debits)
    const reversedLines = originalLines.map((l) => ({
      account_id: l.account_id,
      debit: l.credit,
      credit: l.debit,
      description: `Reversal of ${original.entry_number}: ${l.description || ''}`,
      partner_type: l.partner_type,
      partner_id: l.partner_id,
      cost_center_id: l.cost_center_id
    }));

    const reversalResult = await this.postEntry(
      {
        date: new Date().toISOString().split('T')[0],
        narration: `Reversal of ${original.entry_number} - ${reason}`,
        narration_ar: `قيد عكسي للقيد رقم ${original.entry_number} - ${reason}`,
        source_document: original.entry_number,
        created_by: reversedBy,
        lines: reversedLines
      },
      tid
    );

    // Mark original entry as reversed
    await db.run(
      `UPDATE journal_entries SET status = 'reversed', reversed_entry_id = ?, reversal_reason = ? WHERE id = ? AND tenant_id = ?`,
      [reversalResult.header.id, reason, entryId, tid]
    );

    return reversalResult.header;
  }

  /**
   * Generates dynamic Account Ledger Statement
   */
  async getAccountLedger(accountId: string, tenantId?: string): Promise<{ lines: JournalEntryLineEntity[]; totalDebit: number; totalCredit: number; balance: number }> {
    const db = (await import('../databaseService')).DatabaseService.getInstance();
    const tid = tenantId || db.getTenantId();

    const lines = await db.query<JournalEntryLineEntity>(
      `SELECT * FROM journal_entry_lines WHERE account_id = ? AND tenant_id = ? ORDER BY created_at ASC`,
      [accountId, tid]
    );

    let totalDebit = 0;
    let totalCredit = 0;

    lines.forEach((l) => {
      totalDebit += l.debit;
      totalCredit += l.credit;
    });

    return {
      lines,
      totalDebit: Math.round(totalDebit * 100) / 100,
      totalCredit: Math.round(totalCredit * 100) / 100,
      balance: Math.round((totalDebit - totalCredit) * 100) / 100
    };
  }
}
