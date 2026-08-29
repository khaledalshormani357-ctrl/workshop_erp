// ============================================================================
// Workshop ERP - Accounting Reports Service (Financial Reporting & Ledger Analysis)
// ============================================================================

import { DatabaseService } from '../db/databaseService';
import { TrialBalanceRow, LedgerRow, ProfitAndLossReport, BalanceSheetReport } from '../db/types';

export class AccountingReportsService {
  private db = DatabaseService.getInstance();

  /**
   * Generates Trial Balance across all active accounts
   */
  async trialBalance(): Promise<TrialBalanceRow[]> {
    const tenantId = this.db.getTenantId();
    const sql = `
      SELECT
        coa.code as account_code,
        coa.name as account_name,
        coa.type as account_type,
        COALESCE(SUM(jel.debit), 0) as total_debit,
        COALESCE(SUM(jel.credit), 0) as total_credit,
        CASE
          WHEN coa.type IN ('asset','expense') THEN COALESCE(SUM(jel.debit), 0) - COALESCE(SUM(jel.credit), 0)
          ELSE COALESCE(SUM(jel.credit), 0) - COALESCE(SUM(jel.debit), 0)
        END as balance
      FROM chart_of_accounts coa
      LEFT JOIN journal_entry_lines jel ON jel.account_id = coa.id
      LEFT JOIN journal_entries je ON je.id = jel.journal_entry_id AND je.status = 'posted'
      WHERE coa.tenant_id = ? AND coa.is_active = 1
      GROUP BY coa.id
      ORDER BY coa.code ASC
    `;
    const rows = await this.db.query<any>(sql, [tenantId]);
    return rows.map((r) => {
      const balance = Number(r.balance) || 0;
      const isDebitNormal = r.account_type === 'asset' || r.account_type === 'expense';
      return {
        account_code: r.account_code,
        account_name: r.account_name,
        account_type: r.account_type,
        code: r.account_code,
        name: r.account_name,
        name_ar: r.account_name,
        type: r.account_type,
        total_debit: Number(r.total_debit) || 0,
        total_credit: Number(r.total_credit) || 0,
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
    const sql = `
      SELECT 
        je.date, 
        je.entry_number, 
        COALESCE(jel.description, je.narration) as description, 
        jel.debit, 
        jel.credit
      FROM journal_entry_lines jel
      JOIN journal_entries je ON je.id = jel.journal_entry_id
      WHERE (jel.account_id = ? OR jel.account_id IN (SELECT id FROM chart_of_accounts WHERE code = ? AND tenant_id = ?))
        AND je.tenant_id = ? 
        AND je.status = 'posted'
      ORDER BY je.date ASC, je.created_at ASC
    `;
    const rows = await this.db.query<any>(sql, [accountId, accountId, tenantId, tenantId]);
    
    const account = await this.db.queryOne<{ type: string }>(
      `SELECT type FROM chart_of_accounts WHERE (id = ? OR code = ?) AND tenant_id = ?`,
      [accountId, accountId, tenantId]
    );

    const isDebitNormal = !account || account.type === 'asset' || account.type === 'expense';
    let running = 0;

    return rows.map((r) => {
      const debit = Number(r.debit) || 0;
      const credit = Number(r.credit) || 0;
      if (isDebitNormal) {
        running += debit - credit;
      } else {
        running += credit - debit;
      }
      return {
        date: r.date,
        entry_number: r.entry_number,
        description: r.description || '',
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
    
    // Revenue Details
    const sqlRevenue = `
      SELECT 
        coa.code as account_code,
        coa.name as account_name,
        COALESCE(SUM(jel.credit - jel.debit), 0) as amount
      FROM chart_of_accounts coa
      LEFT JOIN journal_entry_lines jel ON jel.account_id = coa.id
      LEFT JOIN journal_entries je ON je.id = jel.journal_entry_id AND je.status = 'posted'
      WHERE coa.tenant_id = ? AND coa.type = 'revenue' AND coa.is_active = 1
      GROUP BY coa.id
    `;

    // Expense Details
    const sqlExpenses = `
      SELECT 
        coa.code as account_code,
        coa.name as account_name,
        COALESCE(SUM(jel.debit - jel.credit), 0) as amount
      FROM chart_of_accounts coa
      LEFT JOIN journal_entry_lines jel ON jel.account_id = coa.id
      LEFT JOIN journal_entries je ON je.id = jel.journal_entry_id AND je.status = 'posted'
      WHERE coa.tenant_id = ? AND coa.type = 'expense' AND coa.is_active = 1
      GROUP BY coa.id
    `;

    const revRows = await this.db.query<any>(sqlRevenue, [tenantId]);
    const expRows = await this.db.query<any>(sqlExpenses, [tenantId]);

    const revenue = revRows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const expenses = expRows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const net_profit = revenue - expenses;

    return {
      revenue,
      expenses,
      net_profit,
      revenueDetails: revRows.map((r) => ({ account_code: r.account_code, account_name: r.account_name, amount: Number(r.amount) || 0 })),
      expenseDetails: expRows.map((r) => ({ account_code: r.account_code, account_name: r.account_name, amount: Number(r.amount) || 0 }))
    };
  }

  /**
   * Generates Balance Sheet (Statement of Financial Position)
   */
  async balanceSheet(): Promise<BalanceSheetReport> {
    const tenantId = this.db.getTenantId();

    const sqlAssets = `
      SELECT 
        coa.code as account_code,
        coa.name as account_name,
        COALESCE(SUM(jel.debit - jel.credit), 0) as amount
      FROM chart_of_accounts coa
      LEFT JOIN journal_entry_lines jel ON jel.account_id = coa.id
      LEFT JOIN journal_entries je ON je.id = jel.journal_entry_id AND je.status = 'posted'
      WHERE coa.tenant_id = ? AND coa.type = 'asset' AND coa.is_active = 1
      GROUP BY coa.id
    `;

    const sqlLiabilities = `
      SELECT 
        coa.code as account_code,
        coa.name as account_name,
        COALESCE(SUM(jel.credit - jel.debit), 0) as amount
      FROM chart_of_accounts coa
      LEFT JOIN journal_entry_lines jel ON jel.account_id = coa.id
      LEFT JOIN journal_entries je ON je.id = jel.journal_entry_id AND je.status = 'posted'
      WHERE coa.tenant_id = ? AND coa.type = 'liability' AND coa.is_active = 1
      GROUP BY coa.id
    `;

    const sqlEquity = `
      SELECT 
        coa.code as account_code,
        coa.name as account_name,
        COALESCE(SUM(jel.credit - jel.debit), 0) as amount
      FROM chart_of_accounts coa
      LEFT JOIN journal_entry_lines jel ON jel.account_id = coa.id
      LEFT JOIN journal_entries je ON je.id = jel.journal_entry_id AND je.status = 'posted'
      WHERE coa.tenant_id = ? AND coa.type = 'equity' AND coa.is_active = 1
      GROUP BY coa.id
    `;

    const assetRows = await this.db.query<any>(sqlAssets, [tenantId]);
    const liabRows = await this.db.query<any>(sqlLiabilities, [tenantId]);
    const eqRows = await this.db.query<any>(sqlEquity, [tenantId]);

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
      assetDetails: assetRows.map((r) => ({ account_code: r.account_code, account_name: r.account_name, amount: Number(r.amount) || 0 })),
      liabilityDetails: liabRows.map((r) => ({ account_code: r.account_code, account_name: r.account_name, amount: Number(r.amount) || 0 })),
      equityDetails: [
        ...eqRows.map((r) => ({ account_code: r.account_code, account_name: r.account_name, amount: Number(r.amount) || 0 })),
        { account_code: 'RE-NET', account_name: 'Current Period Net Profit / (Loss)', amount: pnl.net_profit }
      ]
    };
  }
}
