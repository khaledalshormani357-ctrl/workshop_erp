// ============================================================================
// Workshop ERP - Payments Repository (Phase 3 Cash Accounts & Payments)
// ============================================================================

import { DatabaseService } from '../db/databaseService';
import { Payment, CashAccount, PaymentType, PaymentMethod } from '../db/types';
import { SyncOutboxRepository } from './SyncOutboxRepository';

export interface CreatePaymentInput {
  payment_type: PaymentType;
  reference_entity?: string;
  reference_id?: string;
  amount: number;
  payment_method?: PaymentMethod;
  cash_account_id?: string;
  date: string;
  notes?: string;
  journal_entry_id?: string;
}

export class PaymentsRepository {
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

  async recordPayment(input: CreatePaymentInput): Promise<Payment> {
    return await this.db.transaction(async () => {
      const id = this.generateUUID();
      const tenantId = this.db.getTenantId();
      const now = new Date().toISOString();

      const payment: Payment = {
        id,
        tenant_id: tenantId,
        payment_type: input.payment_type,
        reference_entity: input.reference_entity,
        reference_id: input.reference_id,
        amount: Number(input.amount),
        payment_method: input.payment_method || 'cash',
        cash_account_id: input.cash_account_id,
        date: input.date,
        notes: input.notes,
        journal_entry_id: input.journal_entry_id,
        sync_status: 'pending',
        sync_version: 1,
        created_at: now
      };

      const sql = `
        INSERT INTO payments (
          id, tenant_id, payment_type, reference_entity, reference_id,
          amount, payment_method, cash_account_id, date, notes,
          journal_entry_id, sync_status, sync_version, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await this.db.run(sql, [
        payment.id,
        payment.tenant_id,
        payment.payment_type,
        payment.reference_entity || null,
        payment.reference_id || null,
        payment.amount,
        payment.payment_method,
        payment.cash_account_id || null,
        payment.date,
        payment.notes || null,
        payment.journal_entry_id || null,
        payment.sync_status,
        payment.sync_version,
        payment.created_at
      ]);

      // Update cash account balance if linked
      if (payment.cash_account_id) {
        const isIncome = payment.payment_type === 'customer_payment' || payment.payment_type === 'owner_contribution';
        const adjustment = isIncome ? payment.amount : -payment.amount;

        await this.db.run(
          `UPDATE cash_accounts SET balance = balance + ?, updated_at = ? WHERE id = ? AND tenant_id = ?`,
          [adjustment, now, payment.cash_account_id, tenantId]
        );
      }

      await this.outboxRepo.queueSync('payments', payment.id, 'INSERT', payment);
      return payment;
    });
  }

  async findById(id: string): Promise<Payment | null> {
    const tenantId = this.db.getTenantId();
    return this.db.queryOne<Payment>(
      `SELECT * FROM payments WHERE id = ? AND tenant_id = ?`,
      [id, tenantId]
    );
  }

  async list(filter?: { referenceEntity?: string; referenceId?: string; paymentType?: PaymentType }): Promise<Payment[]> {
    const tenantId = this.db.getTenantId();
    let sql = `SELECT * FROM payments WHERE tenant_id = ?`;
    const params: any[] = [tenantId];

    if (filter?.referenceEntity) {
      sql += ` AND reference_entity = ?`;
      params.push(filter.referenceEntity);
    }
    if (filter?.referenceId) {
      sql += ` AND reference_id = ?`;
      params.push(filter.referenceId);
    }
    if (filter?.paymentType) {
      sql += ` AND payment_type = ?`;
      params.push(filter.paymentType);
    }

    sql += ` ORDER BY date DESC, created_at DESC`;
    return this.db.query<Payment>(sql, params);
  }

  // ==========================================
  // CASH ACCOUNTS
  // ==========================================

  async createCashAccount(input: Omit<CashAccount, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>): Promise<CashAccount> {
    return await this.db.transaction(async () => {
      const id = this.generateUUID();
      const tenantId = this.db.getTenantId();
      const now = new Date().toISOString();

      const account: CashAccount = {
        id,
        tenant_id: tenantId,
        name: input.name,
        name_ar: input.name_ar,
        account_type: input.account_type,
        account_id: input.account_id,
        balance: input.balance || 0,
        is_active: input.is_active !== undefined ? input.is_active : true,
        created_at: now,
        updated_at: now,
        deleted_at: null
      };

      const sql = `
        INSERT INTO cash_accounts (
          id, tenant_id, name, name_ar, account_type, account_id,
          balance, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await this.db.run(sql, [
        account.id,
        account.tenant_id,
        account.name,
        account.name_ar || null,
        account.account_type,
        account.account_id || null,
        account.balance,
        account.is_active ? 1 : 0,
        account.created_at,
        account.updated_at
      ]);

      return account;
    });
  }

  async listCashAccounts(): Promise<CashAccount[]> {
    const tenantId = this.db.getTenantId();
    const rows = await this.db.query<any>(
      `SELECT * FROM cash_accounts WHERE tenant_id = ? AND deleted_at IS NULL ORDER BY name ASC`,
      [tenantId]
    );
    return rows.map(r => ({
      ...r,
      is_active: Boolean(r.is_active)
    }));
  }
}
