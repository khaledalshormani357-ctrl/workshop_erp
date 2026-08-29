import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { DatabaseService } from '../db/databaseService';
import { ChartOfAccountsRepository } from '../repositories/ChartOfAccountsRepository';
import { JournalEntriesRepository } from '../repositories/JournalEntriesRepository';
import { AccountingReportsService } from '../services/AccountingReportsService';
import { SyncOutboxRepository } from '../repositories/SyncOutboxRepository';
import { seedChartOfAccounts, standardChartOfAccounts } from '../db/seed';

describe('Accounting Engine Unit Tests', () => {
  const TENANT_ID = 'test-tenant-001';
  const db = DatabaseService.getInstance();

  beforeAll(async () => {
    await db.initialize('test_unit_accounting.db');
    db.setTenantId(TENANT_ID);
  });

  beforeEach(async () => {
    // تنظيف الجداول قبل كل اختبار
    await db.execute(`
      DELETE FROM journal_entry_lines;
      DELETE FROM journal_entries;
      DELETE FROM journal_reversals;
      DELETE FROM sync_outbox;
      DELETE FROM chart_of_accounts;
    `);
    db.setTenantId(TENANT_ID);
  });

  describe('Chart of Accounts Seeding', () => {
    it('should seed chart of accounts for a tenant', async () => {
      await seedChartOfAccounts(TENANT_ID);
      db.setTenantId(TENANT_ID);
      const repo = new ChartOfAccountsRepository();
      const accounts = await repo.listAll();
      // عدد الحسابات الإجمالي: 5 رؤوس + عدد الفروع
      const totalChildren = standardChartOfAccounts.reduce((sum, acc) => sum + (acc.children?.length || 0), 0);
      expect(accounts.length).toBe(standardChartOfAccounts.length + totalChildren);
    });

    it('should not duplicate seeding if already seeded', async () => {
      db.setTenantId(TENANT_ID);
      await seedChartOfAccounts(TENANT_ID);
      const repo = new ChartOfAccountsRepository();
      const beforeCount = (await repo.listAll()).length;
      await seedChartOfAccounts(TENANT_ID);
      const afterCount = (await repo.listAll()).length;
      expect(afterCount).toBe(beforeCount);
    });
  });

  describe('Journal Entry Creation', () => {
    it('should create a balanced draft journal entry', async () => {
      db.setTenantId(TENANT_ID);
      const repo = new JournalEntriesRepository();
      const accountsRepo = new ChartOfAccountsRepository();
      await seedChartOfAccounts(TENANT_ID);
      const cash = await accountsRepo.findByCode('10100');
      const sales = await accountsRepo.findByCode('40100');
      expect(cash).toBeTruthy();
      expect(sales).toBeTruthy();

      const entry = await repo.createDraft({
        date: '2026-08-29',
        narration: 'Sale transaction',
        created_by: 'test-user',
        lines: [
          { account_id: cash!.id, debit: 50000, credit: 0, line_order: 1 },
          { account_id: sales!.id, debit: 0, credit: 50000, line_order: 2 },
        ],
      });
      expect(entry.status).toBe('draft');
      expect(entry.total_debit).toBe(50000);
      expect(entry.total_credit).toBe(50000);
    });

    it('should throw UNBALANCED_JOURNAL if debits != credits', async () => {
      db.setTenantId(TENANT_ID);
      const repo = new JournalEntriesRepository();
      const accountsRepo = new ChartOfAccountsRepository();
      await seedChartOfAccounts(TENANT_ID);
      const cash = await accountsRepo.findByCode('10100');
      const sales = await accountsRepo.findByCode('40100');

      await expect(repo.createDraft({
        date: '2026-08-29',
        created_by: 'test-user',
        lines: [
          { account_id: cash!.id, debit: 1000, credit: 0 },
          { account_id: sales!.id, debit: 0, credit: 500 },
        ],
      })).rejects.toThrow(/UNBALANCED_JOURNAL|Debit .* does not equal Credit/i);
    });
  });

  describe('Journal Posting and Reversal', () => {
    it('should post a draft entry and prevent modification after posting', async () => {
      db.setTenantId(TENANT_ID);
      const repo = new JournalEntriesRepository();
      const accountsRepo = new ChartOfAccountsRepository();
      await seedChartOfAccounts(TENANT_ID);
      const cash = await accountsRepo.findByCode('10100');
      const sales = await accountsRepo.findByCode('40100');

      const entry = await repo.createDraft({
        date: '2026-08-29',
        created_by: 'test-user',
        lines: [
          { account_id: cash!.id, debit: 10000, credit: 0 },
          { account_id: sales!.id, debit: 0, credit: 10000 },
        ],
      });

      await repo.postEntry(entry.id, 'test-user');
      const posted = await repo.findById(entry.id);
      expect(posted!.status).toBe('posted');

      // محاولة التعديل أو إعادة الترحيل يجب أن تفشل
      await expect(repo.postEntry(entry.id, 'test-user')).rejects.toThrow('INVALID_STATE_TRANSITION');
    });

    it('should reverse a posted entry and create a reversal entry', async () => {
      db.setTenantId(TENANT_ID);
      const repo = new JournalEntriesRepository();
      const accountsRepo = new ChartOfAccountsRepository();
      await seedChartOfAccounts(TENANT_ID);
      const cash = await accountsRepo.findByCode('10100');
      const sales = await accountsRepo.findByCode('40100');

      const entry = await repo.createDraft({
        date: '2026-08-29',
        created_by: 'test-user',
        lines: [
          { account_id: cash!.id, debit: 7000, credit: 0 },
          { account_id: sales!.id, debit: 0, credit: 7000 },
        ],
      });

      await repo.postEntry(entry.id, 'test-user');
      const reversal = await repo.reverseEntry(entry.id, 'Test reversal', 'test-user');

      expect(reversal).toBeTruthy();
      expect(reversal.status).toBe('posted');
      const original = await repo.findById(entry.id);
      expect(original!.status).toBe('reversed');
      expect(original!.reversed_entry_id).toBe(reversal.id);

      // التحقق من أن القيد العكسي معكوس
      const reversalLines = await repo.getLines(reversal.id);
      const originalLines = await repo.getLines(entry.id);
      expect(reversalLines.length).toBe(originalLines.length);
      for (const revLine of reversalLines) {
        const origLine = originalLines.find(l => l.account_id === revLine.account_id);
        expect(origLine).toBeTruthy();
        expect(revLine.debit).toBe(origLine!.credit);
        expect(revLine.credit).toBe(origLine!.debit);
      }
    });
  });

  describe('Accounting Reports', () => {
    it('should generate trial balance correctly', async () => {
      db.setTenantId(TENANT_ID);
      const repo = new JournalEntriesRepository();
      const accountsRepo = new ChartOfAccountsRepository();
      const reports = new AccountingReportsService();
      await seedChartOfAccounts(TENANT_ID);
      const cash = await accountsRepo.findByCode('10100');
      const sales = await accountsRepo.findByCode('40100');

      const entry = await repo.createDraft({
        date: '2026-08-29',
        created_by: 'test-user',
        lines: [
          { account_id: cash!.id, debit: 15000, credit: 0 },
          { account_id: sales!.id, debit: 0, credit: 15000 },
        ],
      });
      await repo.postEntry(entry.id, 'test-user');

      const tb = await reports.trialBalance();
      const cashRow = tb.find(row => row.code === '10100');
      const salesRow = tb.find(row => row.code === '40100');
      expect(cashRow).toBeTruthy();
      expect(salesRow).toBeTruthy();
      expect(cashRow!.balance_debit).toBe(15000);
      expect(salesRow!.balance_credit).toBe(15000);
    });

    it('should calculate profit and loss', async () => {
      db.setTenantId(TENANT_ID);
      const repo = new JournalEntriesRepository();
      const accountsRepo = new ChartOfAccountsRepository();
      const reports = new AccountingReportsService();
      await seedChartOfAccounts(TENANT_ID);
      const cash = await accountsRepo.findByCode('10100');
      const sales = await accountsRepo.findByCode('40100');
      const expense = await accountsRepo.findByCode('50300'); // كهرباء ومرافق

      // إيراد
      const revEntry = await repo.createDraft({
        date: '2026-08-29',
        created_by: 'test-user',
        lines: [
          { account_id: cash!.id, debit: 20000, credit: 0 },
          { account_id: sales!.id, debit: 0, credit: 20000 },
        ],
      });
      await repo.postEntry(revEntry.id, 'test-user');

      // مصروف
      const expEntry = await repo.createDraft({
        date: '2026-08-29',
        created_by: 'test-user',
        lines: [
          { account_id: expense!.id, debit: 5000, credit: 0 },
          { account_id: cash!.id, debit: 0, credit: 5000 },
        ],
      });
      await repo.postEntry(expEntry.id, 'test-user');

      const pl = await reports.profitAndLoss();
      expect(pl.revenue).toBe(20000);
      expect(pl.expenses).toBe(5000);
      expect(pl.net_profit).toBe(15000);
    });
  });

  describe('Sync Outbox', () => {
    it('should queue sync events and manage status', async () => {
      db.setTenantId(TENANT_ID);
      const outboxRepo = new SyncOutboxRepository();
      await outboxRepo.queueSync('journal_entries', 'entry-id-1', 'INSERT', { id: 'entry-id-1' });
      const pending = await outboxRepo.getPending();
      expect(pending.length).toBe(1);
      expect(pending[0].local_entity).toBe('journal_entries');
      expect(pending[0].status).toBe('pending');

      await outboxRepo.markSynced(pending[0].id);
      const pendingAfter = await outboxRepo.getPending();
      expect(pendingAfter.length).toBe(0);
    });

    it('should automatically queue sync events when creating and posting a journal entry', async () => {
      db.setTenantId(TENANT_ID);
      const repo = new JournalEntriesRepository();
      const accountsRepo = new ChartOfAccountsRepository();
      const outboxRepo = new SyncOutboxRepository();
      await seedChartOfAccounts(TENANT_ID);
      const cash = await accountsRepo.findByCode('10100');
      const sales = await accountsRepo.findByCode('40100');

      const entry = await repo.createDraft({
        date: '2026-08-29',
        created_by: 'test-user',
        lines: [
          { account_id: cash!.id, debit: 10000, credit: 0 },
          { account_id: sales!.id, debit: 0, credit: 10000 },
        ],
      });

      // التحقق من وجود حدث INSERT في outbox
      const pendingInsert = await outboxRepo.getPending();
      expect(pendingInsert.length).toBe(1);
      expect(pendingInsert[0].local_entity).toBe('journal_entries');
      expect(pendingInsert[0].local_id).toBe(entry.id);
      expect(pendingInsert[0].operation).toBe('INSERT');

      // ترحيل القيد
      await repo.postEntry(entry.id, 'test-user');

      // التحقق من وجود حدث UPDATE إضافي
      const pendingAll = await outboxRepo.getPending();
      expect(pendingAll.length).toBe(2);
      const updateEvent = pendingAll.find(e => e.operation === 'UPDATE');
      expect(updateEvent).toBeTruthy();
      expect(updateEvent!.local_id).toBe(entry.id);
    });
  });
});
