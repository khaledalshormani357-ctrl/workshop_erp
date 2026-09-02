import { Product, StockMovement } from '../types';

export interface ProductStockSummary {
  product: Product;
  physicalQty: number;
  reservedQty: number;
  availableQty: number;
  totalValue: number;
  averageCost?: number;
  isLowStock: boolean;
}

export class InventoryEngine {
  /**
   * Derives stock balances and accurate inventory valuation exclusively from immutable stock movements.
   * Uses Weighted Average Cost (WAC) tracking chronologically by movement, or product standard cost if specified.
   */
  static computeStockSummary(
    products: Product[],
    movements: StockMovement[],
    reservedMap: Record<string, number> = {}
  ): ProductStockSummary[] {
    // Sort movements chronologically to calculate accurate running WAC
    const sortedMovements = [...movements].sort((a, b) => {
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return timeA - timeB;
    });

    const balanceMap: Record<string, { qty: number; avgCost: number; totalCost: number }> = {};

    for (const mov of sortedMovements) {
      if (!balanceMap[mov.product_id]) {
        balanceMap[mov.product_id] = { qty: 0, avgCost: 0, totalCost: 0 };
      }
      const item = balanceMap[mov.product_id];
      const movementQty = Number(mov.quantity) || 0;
      const movementCost = Number(mov.unit_cost) || 0;

      if (mov.direction === 'in') {
        const prevTotalCost = item.qty > 0 ? item.totalCost : 0;
        const incomingCost = movementQty * movementCost;
        const newQty = item.qty + movementQty;
        item.qty = newQty;
        item.avgCost = newQty > 0 ? (prevTotalCost + incomingCost) / newQty : movementCost;
        item.totalCost = item.qty * item.avgCost;
      } else {
        // Out movement reduces quantity at the current weighted average cost
        const newQty = Math.max(0, item.qty - movementQty);
        item.qty = newQty;
        item.totalCost = item.qty * item.avgCost;
      }
    }

    return products.map((prod) => {
      const summary = balanceMap[prod.id];
      const physicalQty = summary ? Math.max(0, summary.qty) : 0;
      const reservedQty = reservedMap[prod.id] || 0;
      const availableQty = Math.max(0, physicalQty - reservedQty);

      const costMethod = (prod as any).cost_method || (prod as any).costing_method || 'weighted_average';
      const avgCost = summary && summary.qty > 0 ? summary.avgCost : (prod.unit_cost || 0);

      let totalValue = 0;
      if (costMethod === 'standard') {
        totalValue = physicalQty * (prod.unit_cost || 0);
      } else {
        // Weighted average cost method
        totalValue = summary && summary.qty > 0 ? summary.totalCost : physicalQty * avgCost;
      }

      const isLowStock = physicalQty <= (prod.min_stock ?? (prod as any).min_stock_level ?? 0);

      return {
        product: prod,
        physicalQty,
        reservedQty,
        availableQty,
        totalValue,
        averageCost: avgCost,
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
