import { Product, StockMovement } from '../types';

export interface ProductStockSummary {
  product: Product;
  physicalQty: number;
  reservedQty: number;
  availableQty: number;
  totalValue: number;
  isLowStock: boolean;
}

export class InventoryEngine {
  /**
   * Derives stock balances exclusively from immutable stock movements.
   * No direct editing of quantity is allowed.
   */
  static computeStockSummary(
    products: Product[],
    movements: StockMovement[],
    reservedMap: Record<string, number> = {}
  ): ProductStockSummary[] {
    const balanceMap: Record<string, { qty: number; totalCost: number }> = {};

    for (const mov of movements) {
      if (!balanceMap[mov.product_id]) {
        balanceMap[mov.product_id] = { qty: 0, totalCost: 0 };
      }
      const item = balanceMap[mov.product_id];
      const sign = mov.direction === 'in' ? 1 : -1;
      const qtyChange = mov.quantity * sign;

      item.qty += qtyChange;
      if (mov.direction === 'in') {
        item.totalCost += mov.quantity * mov.unit_cost;
      } else {
        // Reduced weighted average value
        item.totalCost = Math.max(0, item.totalCost - mov.quantity * mov.unit_cost);
      }
    }

    return products.map((prod) => {
      const summary = balanceMap[prod.id] || { qty: 0, totalCost: 0 };
      const physicalQty = Math.max(0, summary.qty);
      const reservedQty = reservedMap[prod.id] || 0;
      const availableQty = Math.max(0, physicalQty - reservedQty);
      const totalValue = physicalQty * prod.unit_cost;
      const isLowStock = physicalQty <= prod.min_stock;

      return {
        product: prod,
        physicalQty,
        reservedQty,
        availableQty,
        totalValue,
        isLowStock,
      };
    });
  }

  /**
   * Filter movements by product and warehouse
   */
  static getMovementsForProduct(movements: StockMovement[], productId: string): StockMovement[] {
    return movements
      .filter((m) => m.product_id === productId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }
}
