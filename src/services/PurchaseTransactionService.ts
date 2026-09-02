// ============================================================================
// Workshop ERP - Purchase Transaction Service
// Orchestrates Purchase Orders and Goods Receipts with Inventory & Double-Entry Accounting
// ============================================================================

import { DatabaseService } from '../db/databaseService';
import { PurchasesRepository } from '../repositories/PurchasesRepository';
import { StockRepository } from '../repositories/StockRepository';
import { JournalEntriesRepository } from '../repositories/JournalEntriesRepository';
import { ChartOfAccountsRepository } from '../repositories/ChartOfAccountsRepository';
import { SyncOutboxRepository } from '../repositories/SyncOutboxRepository';

export class PurchaseTransactionService {
  private db = DatabaseService.getInstance();
  private purchasesRepo = new PurchasesRepository();
  private stockRepo = new StockRepository();
  private journalRepo = new JournalEntriesRepository();
  private accountsRepo = new ChartOfAccountsRepository();
  private outboxRepo = new SyncOutboxRepository();

  /**
   * Goods Receipt from Purchase Order:
   * - Add stock movements (movement_type: 'purchase_receipt')
   * - Update Weighted Average Cost (WAC)
   * - Create & Post double-entry journal entry (Inventory debit / AP credit)
   * - Update purchase order status to 'received'
   */
  async receivePurchaseOrder(params: {
    purchase_order_id: string;
    warehouse_id: string;
    date: string;
    created_by?: string;
  }): Promise<{ journal_entry_id: string }> {
    return await this.db.transaction(async () => {
      const tenantId = this.db.getTenantId();

      // 1. Fetch Purchase Order and lines
      const order = await this.purchasesRepo.findOrderById(params.purchase_order_id);
      if (!order) throw new Error('ORDER_NOT_FOUND');
      const orderLines = await this.purchasesRepo.getOrderLines(params.purchase_order_id);
      if (orderLines.length === 0) throw new Error('NO_LINES');

      // 2. Add Stock for each line
      for (const line of orderLines) {
        if (!line.product_id) continue;
        await this.stockRepo.recordMovement({
          product_id: line.product_id,
          warehouse_id: params.warehouse_id,
          movement_type: 'purchase_receipt',
          direction: 'in',
          quantity: line.quantity,
          unit_cost: line.unit_price,
          reference_entity: 'purchase_order',
          reference_id: params.purchase_order_id,
          notes: `Receive PO ${order.order_number}`,
          created_by: params.created_by,
        });
      }

      // 3. Create & Post Journal Entry
      const inventoryAccount = await this.accountsRepo.findByCode('10400');
      const accountsPayable = await this.accountsRepo.findByCode('20100');
      if (!inventoryAccount || !accountsPayable) {
        throw new Error('ACCOUNT_NOT_FOUND');
      }

      const journalEntry = await this.journalRepo.createDraft({
        date: params.date,
        reference_type: 'purchase_order',
        reference_id: params.purchase_order_id,
        source_document: 'Purchase Receipt',
        narration: `Receive PO ${order.order_number}`,
        narration_ar: `استلام أمر شراء ${order.order_number}`,
        created_by: params.created_by || 'system',
        lines: [
          {
            account_id: inventoryAccount.id,
            debit: order.grand_total,
            credit: 0,
            description: 'Inventory receipt',
          },
          {
            account_id: accountsPayable.id,
            debit: 0,
            credit: order.grand_total,
            description: `Payable for PO ${order.order_number}`,
            partner_type: 'supplier',
            partner_id: order.supplier_id,
          },
        ],
      });

      await this.journalRepo.post(journalEntry.id, params.created_by || 'system');

      // 4. Update purchase order status
      await this.purchasesRepo.updateOrderStatus(params.purchase_order_id, 'received');

      await this.outboxRepo.queueSync('purchase_orders', params.purchase_order_id, 'UPDATE', {
        id: params.purchase_order_id,
        status: 'received',
      });

      return { journal_entry_id: journalEntry.id };
    });
  }
}
