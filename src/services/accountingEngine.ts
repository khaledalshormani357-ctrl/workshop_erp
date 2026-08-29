import { Account, JournalEntry, JournalEntryLine } from '../types';

export interface TrialBalanceRow {
  code: string;
  name: string;
  name_ar: string;
  type: string;
  debit: number;
  credit: number;
}

export interface ProfitAndLossReport {
  operatingRevenue: number;
  cogs: number;
  grossProfit: number;
  grossMarginPercent: number;
  operatingExpenses: number;
  netProfit: number;
}

export interface BalanceSheetReport {
  currentAssets: number;
  fixedAssets: number;
  totalAssets: number;
  currentLiabilities: number;
  totalLiabilities: number;
  ownerEquity: number;
  retainedEarnings: number;
  netIncomePeriod: number;
  totalEquityAndLiabilities: number;
  isBalanced: boolean;
}

export class AccountingEngine {
  /**
   * Validates if a journal entry lines sum is balanced
   */
  static validateJournalBalance(lines: JournalEntryLine[]): { isValid: boolean; difference: number } {
    const totalDebit = lines.reduce((sum, l) => sum + (Number(l.debit) || 0), 0);
    const totalCredit = lines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0);
    const difference = Math.abs(totalDebit - totalCredit);
    return {
      isValid: difference < 0.001 && lines.length >= 2,
      difference,
    };
  }

  /**
   * Calculates current balances for all accounts from posted journal entries
   */
  static computeAccountBalances(accounts: Account[], entries: JournalEntry[]): Account[] {
    const postedEntries = entries.filter((e) => e.status === 'posted');
    
    return accounts.map((acc) => {
      let netMovement = 0;
      for (const entry of postedEntries) {
        for (const line of entry.lines) {
          if (line.account_id === acc.id || line.account_code === acc.code) {
            const deb = Number(line.debit) || 0;
            const cred = Number(line.credit) || 0;
            
            // For Assets and Expenses, Debit increases balance, Credit decreases
            if (acc.type === 'asset' || acc.type === 'expense') {
              netMovement += deb - cred;
            } else {
              // For Liabilities, Equity, Revenue, Credit increases, Debit decreases
              netMovement += cred - deb;
            }
          }
        }
      }
      return {
        ...acc,
        balance: Math.max(0, netMovement), // or raw net
      };
    });
  }

  /**
   * Generates a Trial Balance
   */
  static generateTrialBalance(accounts: Account[], entries: JournalEntry[]): {
    rows: TrialBalanceRow[];
    totalDebit: number;
    totalCredit: number;
    isBalanced: boolean;
  } {
    const postedEntries = entries.filter((e) => e.status === 'posted');
    const accountMap = new Map<string, { debit: number; credit: number }>();

    // Accumulate debits and credits
    for (const entry of postedEntries) {
      for (const line of entry.lines) {
        const existing = accountMap.get(line.account_id) || { debit: 0, credit: 0 };
        existing.debit += Number(line.debit) || 0;
        existing.credit += Number(line.credit) || 0;
        accountMap.set(line.account_id, existing);
      }
    }

    let totalDebit = 0;
    let totalCredit = 0;

    const rows: TrialBalanceRow[] = accounts.map((acc) => {
      const recorded = accountMap.get(acc.id) || { debit: 0, credit: 0 };
      const net = recorded.debit - recorded.credit;
      
      let debit = 0;
      let credit = 0;

      if (acc.type === 'asset' || acc.type === 'expense') {
        if (net >= 0) {
          debit = net;
        } else {
          credit = Math.abs(net);
        }
      } else {
        if (net <= 0) {
          credit = Math.abs(net);
        } else {
          debit = net;
        }
      }

      totalDebit += debit;
      totalCredit += credit;

      return {
        code: acc.code,
        name: acc.name,
        name_ar: acc.name_ar,
        type: acc.type,
        debit,
        credit,
      };
    });

    const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

    return {
      rows,
      totalDebit,
      totalCredit,
      isBalanced,
    };
  }

  /**
   * Generates Profit & Loss Statement
   */
  static generateProfitAndLoss(accounts: Account[], entries: JournalEntry[]): ProfitAndLossReport {
    const trial = this.generateTrialBalance(accounts, entries);
    
    let operatingRevenue = 0;
    let cogs = 0;
    let operatingExpenses = 0;

    for (const r of trial.rows) {
      if (r.type === 'revenue') {
        operatingRevenue += r.credit;
      } else if (r.type === 'expense') {
        if (r.code === '5110' || r.code === '5120' || r.code === '5130') {
          cogs += r.debit;
        } else {
          operatingExpenses += r.debit;
        }
      }
    }

    const grossProfit = operatingRevenue - cogs;
    const grossMarginPercent = operatingRevenue > 0 ? (grossProfit / operatingRevenue) * 100 : 0;
    const netProfit = grossProfit - operatingExpenses;

    return {
      operatingRevenue,
      cogs,
      grossProfit,
      grossMarginPercent,
      operatingExpenses,
      netProfit,
    };
  }

  /**
   * Generates Balance Sheet
   */
  static generateBalanceSheet(accounts: Account[], entries: JournalEntry[]): BalanceSheetReport {
    const trial = this.generateTrialBalance(accounts, entries);
    const pnl = this.generateProfitAndLoss(accounts, entries);

    let currentAssets = 0;
    let fixedAssets = 0;
    let currentLiabilities = 0;
    let ownerEquity = 0;
    let retainedEarnings = 0;

    for (const r of trial.rows) {
      if (r.type === 'asset') {
        if (r.code.startsWith('11')) {
          currentAssets += r.debit - r.credit;
        } else {
          fixedAssets += r.debit - r.credit;
        }
      } else if (r.type === 'liability') {
        currentLiabilities += r.credit - r.debit;
      } else if (r.type === 'equity') {
        if (r.code === '3110') {
          ownerEquity += r.credit - r.debit;
        } else {
          retainedEarnings += r.credit - r.debit;
        }
      }
    }

    const totalAssets = currentAssets + fixedAssets;
    const totalLiabilities = currentLiabilities;
    const totalEquityAndLiabilities = totalLiabilities + ownerEquity + retainedEarnings + pnl.netProfit;
    const isBalanced = Math.abs(totalAssets - totalEquityAndLiabilities) < 1.0;

    return {
      currentAssets,
      fixedAssets,
      totalAssets,
      currentLiabilities,
      totalLiabilities,
      ownerEquity,
      retainedEarnings,
      netIncomePeriod: pnl.netProfit,
      totalEquityAndLiabilities,
      isBalanced,
    };
  }
}
