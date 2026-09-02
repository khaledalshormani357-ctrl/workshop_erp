import { DatabaseService } from './databaseService';
import { ChartOfAccountsRepository } from '../repositories/ChartOfAccountsRepository';
import { AccountType, AccountNature } from './types';

export interface SeedAccount {
  code: string;
  name: string;
  name_ar: string;
  type: AccountType;
  nature: AccountNature;
  is_postable: boolean;
  children?: SeedAccount[];
}

// ========== دليل الحسابات القياسي لورش الألمنيوم والزجاج ==========
export const standardChartOfAccounts: SeedAccount[] = [
  {
    code: '10000',
    name: 'Assets',
    name_ar: 'الأصول',
    type: 'asset',
    nature: 'debit',
    is_postable: false,
    children: [
      { code: '10100', name: 'Cash', name_ar: 'الصندوق', type: 'asset', nature: 'debit', is_postable: true },
      { code: '10200', name: 'Bank Accounts', name_ar: 'البنوك', type: 'asset', nature: 'debit', is_postable: true },
      { code: '10300', name: 'Accounts Receivable', name_ar: 'العملاء (ذمم مدينة)', type: 'asset', nature: 'debit', is_postable: true },
      { code: '10310', name: 'Raw Materials Inventory', name_ar: 'مخزون المواد الخام', type: 'asset', nature: 'debit', is_postable: true },
      { code: '10320', name: 'Work in Progress Inventory', name_ar: 'بضاعة تحت التشغيل والتصنيع (WIP)', type: 'asset', nature: 'debit', is_postable: true },
      { code: '10330', name: 'Finished Goods Inventory', name_ar: 'مخزون البضاعة التامة المصنعة', type: 'asset', nature: 'debit', is_postable: true },
      { code: '10400', name: 'Raw Materials Inventory General', name_ar: 'مخزون المواد الخام العام', type: 'asset', nature: 'debit', is_postable: true },
      { code: '10500', name: 'Finished Goods Inventory General', name_ar: 'مخزون البضاعة التامة العام', type: 'asset', nature: 'debit', is_postable: true },
      { code: '10600', name: 'Fixed Assets', name_ar: 'الأصول الثابتة', type: 'asset', nature: 'debit', is_postable: false },
    ]
  },
  {
    code: '20000',
    name: 'Liabilities',
    name_ar: 'الخصوم',
    type: 'liability',
    nature: 'credit',
    is_postable: false,
    children: [
      { code: '20100', name: 'Accounts Payable', name_ar: 'الموردون (ذمم دائنة)', type: 'liability', nature: 'credit', is_postable: true },
      { code: '20200', name: 'Sales Tax Payable', name_ar: 'ضريبة المبيعات المستحقة', type: 'liability', nature: 'credit', is_postable: true },
      { code: '20300', name: 'Accrued Expenses', name_ar: 'مصاريف مستحقة', type: 'liability', nature: 'credit', is_postable: true },
    ]
  },
  {
    code: '30000',
    name: 'Equity',
    name_ar: 'حقوق الملكية',
    type: 'equity',
    nature: 'credit',
    is_postable: false,
    children: [
      { code: '30100', name: 'Owner Capital', name_ar: 'رأس المال', type: 'equity', nature: 'credit', is_postable: true },
      { code: '30200', name: 'Owner Drawings', name_ar: 'مسحوبات شخصية', type: 'equity', nature: 'debit', is_postable: true },
    ]
  },
  {
    code: '40000',
    name: 'Revenue',
    name_ar: 'الإيرادات',
    type: 'revenue',
    nature: 'credit',
    is_postable: false,
    children: [
      { code: '40100', name: 'Sales Revenue - Finished Goods', name_ar: 'مبيعات المنتجات التامة', type: 'revenue', nature: 'credit', is_postable: true },
      { code: '40200', name: 'Service Revenue - Installation', name_ar: 'إيرادات خدمات التركيب', type: 'revenue', nature: 'credit', is_postable: true },
      { code: '40300', name: 'Scrap Sales Revenue', name_ar: 'إيرادات بيع الخردة والفواضل', type: 'revenue', nature: 'credit', is_postable: true },
    ]
  },
  {
    code: '50000',
    name: 'Expenses',
    name_ar: 'المصروفات',
    type: 'expense',
    nature: 'debit',
    is_postable: false,
    children: [
      { code: '50100', name: 'Cost of Goods Sold', name_ar: 'تكلفة المبيعات', type: 'expense', nature: 'debit', is_postable: true },
      { code: '50200', name: 'Direct Labor', name_ar: 'أجور ومرتبات مباشرة', type: 'expense', nature: 'debit', is_postable: true },
      { code: '50300', name: 'Electricity & Utilities', name_ar: 'كهرباء ومرافق', type: 'expense', nature: 'debit', is_postable: true },
      { code: '50400', name: 'Rent Expense', name_ar: 'إيجار', type: 'expense', nature: 'debit', is_postable: true },
      { code: '50500', name: 'Equipment Maintenance', name_ar: 'صيانة معدات', type: 'expense', nature: 'debit', is_postable: true },
      { code: '50600', name: 'Transportation Expense', name_ar: 'مصاريف نقل', type: 'expense', nature: 'debit', is_postable: true },
      { code: '50700', name: 'General & Administrative', name_ar: 'مصاريف عمومية وإدارية', type: 'expense', nature: 'debit', is_postable: true },
    ]
  }
];

// ========== دالة البذر ==========
export async function seedChartOfAccounts(tenantId: string): Promise<void> {
  const db = DatabaseService.getInstance();
  // حفظ حالة المستأجر الحالية لاستعادتها بعد الانتهاء
  const currentTenantId = (() => {
    try {
      return db.getTenantId();
    } catch {
      return null;
    }
  })();

  db.setTenantId(tenantId);
  const repo = new ChartOfAccountsRepository();

  try {
    // التحقق من وجود حسابات مسبقة لتجنب التكرار
    const existing = await repo.listAll();
    if (existing.length > 0) {
      console.warn('Chart of accounts already seeded for tenant', tenantId);
      return;
    }

    // استخدام معاملة ذرية لضمان البذر الكامل
    await db.transaction(async () => {
      // إنشاء الحسابات الرئيسية أولاً ثم الفرعية
      for (const parent of standardChartOfAccounts) {
        await repo.create({
          code: parent.code,
          name: parent.name,
          name_ar: parent.name_ar,
          type: parent.type,
          nature: parent.nature,
          is_postable: parent.is_postable,
          is_active: true,
          opening_balance: 0,
          parent_id: null,
        });

        if (parent.children && parent.children.length > 0) {
          // جلب الحساب الرئيسي لاستخدام معرّفه كـ parent_id
          const parentAccount = await repo.findByCode(parent.code);
          if (!parentAccount) {
            throw new Error(`Parent account not found: ${parent.code}`);
          }
          for (const child of parent.children) {
            await repo.create({
              code: child.code,
              name: child.name,
              name_ar: child.name_ar,
              type: child.type,
              nature: child.nature,
              is_postable: child.is_postable,
              is_active: true,
              opening_balance: 0,
              parent_id: parentAccount.id,
            });
          }
        }
      }
    });

    console.log(`Chart of accounts seeded successfully for tenant ${tenantId}`);
  } catch (error) {
    console.error('Failed to seed chart of accounts:', error);
    throw error;
  } finally {
    // استعادة المستأجر السابق إن وجد
    if (currentTenantId !== null) {
      db.setTenantId(currentTenantId);
    }
  }
}
