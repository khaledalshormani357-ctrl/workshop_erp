import { BillOfMaterials, Product } from '../types';

export interface BOMCalculationResult {
  componentsBreakdown: {
    productId: string;
    productName: string;
    productNameAr: string;
    quantity: number;
    unit: string;
    unitCost: number;
    subtotalCost: number;
  }[];
  totalMaterialCost: number;
  laborHours: number;
  laborCost: number;
  overheadCost: number;
  totalCostPerUnit: number;
  totalCostBatch: number;
  suggestedUnitPrice: number;
  totalSuggestedPrice: number;
  profitMarginPercent: number;
}

export interface WindowCostBreakdown {
  profileBarsNeeded: number;
  glassAreaM2: number;
  rubberMeters: number;
  hardwareSets: number;
  materialCost: number;
  laborCost: number;
  overheadCost: number;
  totalCost: number;
  suggestedPrice: number;
}

export class BOMEngine {
  /**
   * Evaluates parametric formulas for aluminium windows, steel doors, glass panels.
   */
  static calculateParametricCost(
    bom: BillOfMaterials,
    products: Product[],
    width: number, // in cm (e.g. 120)
    height: number, // in cm (e.g. 120)
    batchQuantity: number = 1,
    targetMarginPercent: number = 30
  ): BOMCalculationResult {
    const productMap = new Map<string, Product>();
    products.forEach((p) => productMap.set(p.id, p));

    let totalMaterialCostSingle = 0;
    const componentsBreakdown = bom.components.map((comp) => {
      const prod = productMap.get(comp.product_id);
      let calculatedQty = 0;

      if (comp.formula_type === 'parametric_dimension') {
        const totalCm = 2 * width + 4 * height + 10;
        calculatedQty = (totalCm / 600) * comp.waste_factor;
      } else if (comp.formula_type === 'area_based') {
        const sqm = (width * height) / 10000;
        calculatedQty = sqm * comp.waste_factor;
      } else {
        calculatedQty = comp.fixed_quantity;
      }

      calculatedQty = Math.round(calculatedQty * 100) / 100;
      const unitCost = prod ? prod.unit_cost : comp.unit_cost;
      const subtotalCost = calculatedQty * unitCost;
      totalMaterialCostSingle += subtotalCost;

      return {
        productId: comp.product_id,
        productName: prod ? prod.name : 'Component',
        productNameAr: prod ? prod.name_ar : 'مكون',
        quantity: calculatedQty,
        unit: comp.unit,
        unitCost,
        subtotalCost,
      };
    });

    const laborCost = bom.labor_hours_estimate * bom.labor_rate_hourly;
    const overheadCost = bom.overhead_allocation_rate;
    const totalCostPerUnit = totalMaterialCostSingle + laborCost + overheadCost;
    const totalCostBatch = totalCostPerUnit * batchQuantity;

    const marginFraction = targetMarginPercent / 100;
    const suggestedUnitPrice = marginFraction < 1 ? totalCostPerUnit / (1 - marginFraction) : totalCostPerUnit * 1.3;
    const totalSuggestedPrice = suggestedUnitPrice * batchQuantity;

    return {
      componentsBreakdown,
      totalMaterialCost: totalMaterialCostSingle * batchQuantity,
      laborHours: bom.labor_hours_estimate * batchQuantity,
      laborCost: laborCost * batchQuantity,
      overheadCost: overheadCost * batchQuantity,
      totalCostPerUnit,
      totalCostBatch,
      suggestedUnitPrice: Math.round(suggestedUnitPrice),
      totalSuggestedPrice: Math.round(totalSuggestedPrice),
      profitMarginPercent: targetMarginPercent,
    };
  }

  /**
   * Helper function for interactive window costing calculator.
   */
  static calculateWindowCost(
    widthCm: number,
    heightCm: number,
    quantity: number = 1,
    scrapPercent: number = 7,
    marginPercent: number = 30
  ): WindowCostBreakdown {
    const scrapMultiplier = 1 + scrapPercent / 100;

    // Profile linear meters: 2W + 4H + 20cm overlap
    const totalLinearCm = (2 * widthCm + 4 * heightCm + 20) * quantity;
    const profileBarsNeeded = Math.round(((totalLinearCm / 600) * scrapMultiplier) * 10) / 10;

    // Glass square meters: W * H / 10000
    const glassAreaM2 = Math.round(((widthCm * heightCm * quantity) / 10000) * 100) / 100;

    // Rubber gasket: (2W + 2H) / 100 * 2 sashes
    const rubberMeters = Math.round((((2 * widthCm + 2 * heightCm) * 2 * quantity) / 100) * 10) / 10;

    const hardwareSets = quantity;

    // Prices (in YER)
    const barCost = 14500;
    const glassSqmCost = 12000;
    const rubberMeterCost = 250;
    const hardwareSetCost = 4500;

    const materialCost =
      profileBarsNeeded * barCost +
      glassAreaM2 * glassSqmCost +
      rubberMeters * rubberMeterCost +
      hardwareSets * hardwareSetCost;

    const laborCost = quantity * 6000; // 6,000 YER per window fabrication & assembly
    const overheadCost = quantity * 2500; // 2,500 YER factory indirect overhead

    const totalCost = materialCost + laborCost + overheadCost;
    const marginFrac = marginPercent / 100;
    const suggestedPrice = marginFrac < 1 ? totalCost / (1 - marginFrac) : totalCost * 1.3;

    return {
      profileBarsNeeded,
      glassAreaM2,
      rubberMeters,
      hardwareSets,
      materialCost,
      laborCost,
      overheadCost,
      totalCost,
      suggestedPrice,
    };
  }

  /**
   * Generates detailed fabrication cut pieces for standard 2-sash sliding aluminium window
   */
  static generateWindowCutList(widthCm: number, heightCm: number, quantity: number = 1): CutPiece[] {
    return [
      {
        id: 'frame-w',
        label: 'Outer Frame Horizontal (Top & Sill)',
        labelAr: 'حلق أفقي (أعلى وسفلي)',
        lengthCm: widthCm,
        count: 2 * quantity,
      },
      {
        id: 'frame-h',
        label: 'Outer Frame Vertical (Sides)',
        labelAr: 'حلق رأسي (قوائم جانبية)',
        lengthCm: heightCm,
        count: 2 * quantity,
      },
      {
        id: 'sash-h',
        label: 'Sliding Sash Vertical Frame',
        labelAr: 'درفة منزلقة - قوائم رأسية',
        lengthCm: Math.max(10, heightCm - 5.5),
        count: 4 * quantity,
      },
      {
        id: 'sash-w',
        label: 'Sliding Sash Horizontal Frame',
        labelAr: 'درفة منزلقة - عوارض أفقية',
        lengthCm: Math.max(10, Math.round((widthCm / 2 + 1.5) * 10) / 10),
        count: 4 * quantity,
      },
      {
        id: 'interlock',
        label: 'Center Interlock Profile',
        labelAr: 'سكتين تقابل وسطي (إنترلوك)',
        lengthCm: Math.max(10, heightCm - 6.0),
        count: 2 * quantity,
      },
    ];
  }

  /**
   * 1D Linear Cutting Stock Optimizer using First Fit Decreasing with Kerf Blade compensation
   */
  static optimizeCuttingStock(
    cutPieces: CutPiece[],
    stockBarLengthCm: number = 600,
    kerfBladeCm: number = 0.4
  ): OptimizationResult {
    // Flatten individual cuts
    const flattenedCuts: { label: string; labelAr: string; lengthCm: number }[] = [];
    cutPieces.forEach((piece) => {
      for (let i = 0; i < piece.count; i++) {
        flattenedCuts.push({
          label: piece.label,
          labelAr: piece.labelAr,
          lengthCm: piece.lengthCm,
        });
      }
    });

    // Sort cuts in descending order (FFD algorithm)
    flattenedCuts.sort((a, b) => b.lengthCm - a.lengthCm);

    const barPlans: BarCutPlan[] = [];

    flattenedCuts.forEach((cut) => {
      let placed = false;

      // Try placing in existing bar
      for (const bar of barPlans) {
        const remainingSpace = stockBarLengthCm - bar.usedLengthCm;
        const requiredSpace = cut.lengthCm + (bar.cuts.length > 0 ? kerfBladeCm : 0);

        if (remainingSpace >= requiredSpace) {
          bar.cuts.push(cut);
          bar.usedLengthCm += requiredSpace;
          placed = true;
          break;
        }
      }

      // If cannot fit, start a new 6.00m bar
      if (!placed) {
        barPlans.push({
          barIndex: barPlans.length + 1,
          cuts: [cut],
          usedLengthCm: cut.lengthCm,
          leftoverCm: 0,
          isScrap: false,
          wastePercentage: 0,
        });
      }
    });

    // Compute leftovers, scrap classification (ADR Clarification 1: <50cm is scrap, >=50cm is reusable offcut)
    let totalLengthRequiredCm = 0;
    let reusableOffcutsCount = 0;
    let totalWasteCm = 0;

    barPlans.forEach((bar) => {
      bar.leftoverCm = Math.round((stockBarLengthCm - bar.usedLengthCm) * 10) / 10;
      bar.isScrap = bar.leftoverCm < 50;
      if (!bar.isScrap) {
        reusableOffcutsCount++;
      }
      totalWasteCm += bar.leftoverCm;
      bar.wastePercentage = Math.round((bar.leftoverCm / stockBarLengthCm) * 1000) / 10;
    });

    flattenedCuts.forEach((c) => (totalLengthRequiredCm += c.lengthCm));
    const totalBarStockLengthCm = barPlans.length * stockBarLengthCm;
    const scrapWastePercentage =
      totalBarStockLengthCm > 0
        ? Math.round((totalWasteCm / totalBarStockLengthCm) * 1000) / 10
        : 0;

    return {
      totalBarsNeeded: barPlans.length,
      totalLengthRequiredCm: Math.round(totalLengthRequiredCm * 10) / 10,
      totalBarStockLengthCm,
      totalWasteCm: Math.round(totalWasteCm * 10) / 10,
      reusableOffcutsCount,
      scrapWastePercentage,
      barPlans,
    };
  }
}

export interface CutPiece {
  id: string;
  label: string;
  labelAr: string;
  lengthCm: number;
  count: number;
}

export interface BarCutPlan {
  barIndex: number;
  cuts: { label: string; labelAr: string; lengthCm: number }[];
  usedLengthCm: number;
  leftoverCm: number;
  isScrap: boolean; // if leftover < 50cm it is scrap; if >= 50cm it is reusable offcut (ADR/Clarification 1)
  wastePercentage: number;
}

export interface OptimizationResult {
  totalBarsNeeded: number;
  totalLengthRequiredCm: number;
  totalBarStockLengthCm: number;
  totalWasteCm: number;
  reusableOffcutsCount: number;
  scrapWastePercentage: number;
  barPlans: BarCutPlan[];
}
