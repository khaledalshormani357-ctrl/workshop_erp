// ============================================================================
// Workshop ERP - Accounting Reports Service (Financial Reporting & Ledger Analysis)
// ============================================================================

import { DatabaseService } from '../db/databaseService';
import { TrialBalanceRow, LedgerRow, ProfitAndLossReport, BalanceSheetReport } from '../db/types';

export class AccountingReportsService {
  private db = DatabaseService.getInstance();

  private async getPostedEntryLines(tenantId: string) {
    const entries = await this.db.query<{ id: string; status: string; date: string; entry_number: string; narration: string; created_at: string }>(
      `SELECT * FROM journal_entries WHERE tenant_id = ? AND status = 'posted'`,
      [tenantId]
    );
    const entryMap = new Map<string, (typeof entries)[0]>();
    entries.forEach(e => entryMap.set(e.id, e));

    const lines = await this.db.query<{
      id: string;
      journal_entry_id: string;
      account_id: string;
      debit: number;
      credit: number;
      description: string | null;
      line_order: number;
    }>(
      `SELECT * FROM journal_entry_lines WHERE tenant_id = ?`,
      [tenantId]
    );

    const postedLines: Array<(typeof lines)[0] & { entry: (typeof entries)[0] }> = [];
    lines.forEach(l => {
      const entry = entryMap.get(l.journal_entry_id);
      if (entry) {
        postedLines.push({ ...l, entry });
      }
    });

    return { entries, postedLines };
  }

  /**
   * Generates Trial Balance across all active accounts
   */
  async trialBalance(): Promise<TrialBalanceRow[]> {
    const tenantId = this.db.getTenantId();
    const accounts = await this.db.query<{
      id: string;
      code: string;
      name: string;
      name_ar: string;
      type: string;
      is_active: number;
    }>(
      `SELECT * FROM chart_of_accounts WHERE tenant_id = ? AND is_active = 1 ORDER BY code ASC`,
      [tenantId]
    );

    const { postedLines } = await this.getPostedEntryLines(tenantId);

    const debitsByAccount = new Map<string, number>();
    const creditsByAccount = new Map<string, number>();

    postedLines.forEach(l => {
      const curDebit = debitsByAccount.get(l.account_id) || 0;
      debitsByAccount.set(l.account_id, curDebit + (Number(l.debit) || 0));

      const curCredit = creditsByAccount.get(l.account_id) || 0;
      creditsByAccount.set(l.account_id, curCredit + (Number(l.credit) || 0));
    });

    return accounts.map(coa => {
      const total_debit = debitsByAccount.get(coa.id) || 0;
      const total_credit = creditsByAccount.get(coa.id) || 0;
      const isDebitNormal = coa.type === 'asset' || coa.type === 'expense';
      const balance = isDebitNormal ? (total_debit - total_credit) : (total_credit - total_debit);

      return {
        account_code: coa.code,
        account_name: coa.name,
        account_type: coa.type,
        code: coa.code,
        name: coa.name,
        name_ar: coa.name_ar || coa.name,
        type: coa.type,
        total_debit,
        total_credit,
        balance_debit: isDebitNormal ? (balance > 0 ? balance : 0) : 0,
        balance_credit: !isDebitNormal ? (balance > 0 ? balance : 0) : (balance < 0 ? -balance : 0)
      };
    });
  }

  /**
   * Generates General Ledger for a specific account with running balance
   */
  async generalLedger(accountId: string): Promise<LedgerRow[]> {
    const tenantId = this.db.getTenantId();
    const account = await this.db.queryOne<{ id: string; code: string; type: string }>(
      `SELECT * FROM chart_of_accounts WHERE (id = ? OR code = ?) AND tenant_id = ?`,
      [accountId, accountId, tenantId]
    );

    if (!account) return [];

    const { postedLines } = await this.getPostedEntryLines(tenantId);
    const accountLines = postedLines
      .filter(l => l.account_id === account.id)
      .sort((a, b) => {
        const dA = `${a.entry.date}_${a.entry.created_at || ''}`;
        const dB = `${b.entry.date}_${b.entry.created_at || ''}`;
        return dA.localeCompare(dB);
      });

    const isDebitNormal = account.type === 'asset' || account.type === 'expense';
    let running = 0;

    return accountLines.map((l) => {
      const debit = Number(l.debit) || 0;
      const credit = Number(l.credit) || 0;
      if (isDebitNormal) {
        running += debit - credit;
      } else {
        running += credit - debit;
      }
      return {
        date: l.entry.date,
        entry_number: l.entry.entry_number,
        description: l.description || l.entry.narration || '',
        debit,
        credit,
        running_balance: running
      };
    });
  }

  /**
   * Generates Profit and Loss (P&L / Income Statement)
   */
  async profitAndLoss(): Promise<ProfitAndLossReport> {
    const tenantId = this.db.getTenantId();
    const tb = await this.trialBalance();

    const revRows = tb
      .filter(r => r.type === 'revenue')
      .map(r => ({
        account_code: r.account_code || r.code || '',
        account_name: r.account_name || r.name || '',
        amount: r.total_credit - r.total_debit
      }));

    const expRows = tb
      .filter(r => r.type === 'expense')
      .map(r => ({
        account_code: r.account_code || r.code || '',
        account_name: r.account_name || r.name || '',
        amount: r.total_debit - r.total_credit
      }));

    const revenue = revRows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const expenses = expRows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const net_profit = revenue - expenses;

    return {
      revenue,
      expenses,
      net_profit,
      revenueDetails: revRows,
      expenseDetails: expRows
    };
  }

  /**
   * Generates Balance Sheet (Statement of Financial Position)
   */
  async balanceSheet(): Promise<BalanceSheetReport> {
    const tb = await this.trialBalance();

    const assetRows = tb
      .filter(r => r.type === 'asset')
      .map(r => ({
        account_code: r.account_code || r.code || '',
        account_name: r.account_name || r.name || '',
        amount: r.total_debit - r.total_credit
      }));

    const liabRows = tb
      .filter(r => r.type === 'liability')
      .map(r => ({
        account_code: r.account_code || r.code || '',
        account_name: r.account_name || r.name || '',
        amount: r.total_credit - r.total_debit
      }));

    const eqRows = tb
      .filter(r => r.type === 'equity')
      .map(r => ({
        account_code: r.account_code || r.code || '',
        account_name: r.account_name || r.name || '',
        amount: r.total_credit - r.total_debit
      }));

    const pnl = await this.profitAndLoss();

    const assets = assetRows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const liabilities = liabRows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const baseEquity = eqRows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const totalEquity = baseEquity + pnl.net_profit; // Retained earnings addition

    const isBalanced = Math.abs(assets - (liabilities + totalEquity)) < 1;

    return {
      assets,
      liabilities,
      equity: totalEquity,
      isBalanced,
      assetDetails: assetRows,
      liabilityDetails: liabRows,
      equityDetails: [
        ...eqRows,
        { account_code: 'RE-NET', account_name: 'Current Period Net Profit / (Loss)', amount: pnl.net_profit }
      ]
    };
  }
}
