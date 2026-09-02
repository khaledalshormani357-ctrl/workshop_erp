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

export interface CutPiece {
  id: string;
  label: string;
  labelAr: string;
  lengthCm: number;
  count: number;
  color?: string;
}

export interface Measurement {
  id?: string;
  width: number;
  height: number;
  depth?: number;
  product_type?: WorkshopModelType | string;
  model_type?: WorkshopModelType | string;
  quantity?: number;
  color?: string;
  glass_spec?: string;
  notes?: string;
}

export interface BarCutPlan {
  barIndex: number;
  cuts: { label: string; labelAr: string; lengthCm: number; color?: string }[];
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

export type WorkshopModelType = 'sliding_window' | 'hinged_window' | 'sliding_door' | 'hinged_door' | 'handrail' | 'custom';

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
   * Helper function for interactive costing calculator across multiple workshop model types.
   */
  static calculateModelCost(
    modelType: WorkshopModelType,
    widthCm: number,
    heightCm: number,
    quantity: number = 1,
    scrapPercent: number = 7,
    marginPercent: number = 30
  ): WindowCostBreakdown {
    const scrapMultiplier = 1 + scrapPercent / 100;

    let profileBarsNeeded = 0;
    let glassAreaM2 = 0;
    let rubberMeters = 0;
    let hardwareSets = quantity;
    let barUnitCost = 14500;
    let glassSqmCost = 12000;
    let rubberMeterCost = 250;
    let hardwareSetCost = 4500;
    let laborUnitCost = 6000;
    let overheadUnitCost = 2500;

    switch (modelType) {
      case 'sliding_window': {
        const totalLinearCm = (2 * widthCm + 4 * heightCm + 20) * quantity;
        profileBarsNeeded = Math.round(((totalLinearCm / 600) * scrapMultiplier) * 10) / 10;
        glassAreaM2 = Math.round(((widthCm * heightCm * quantity) / 10000) * 100) / 100;
        rubberMeters = Math.round((((2 * widthCm + 2 * heightCm) * 2 * quantity) / 100) * 10) / 10;
        laborUnitCost = 6000;
        overheadUnitCost = 2500;
        break;
      }
      case 'hinged_window': {
        const totalLinearCm = (2 * widthCm + 2 * heightCm + 2 * (widthCm - 6) + 2 * (heightCm - 6)) * quantity;
        profileBarsNeeded = Math.round(((totalLinearCm / 600) * scrapMultiplier) * 10) / 10;
        glassAreaM2 = Math.round((((widthCm - 10) * (heightCm - 10) * quantity) / 10000) * 100) / 100;
        rubberMeters = Math.round((((widthCm + heightCm) * 4 * quantity) / 100) * 10) / 10;
        hardwareSetCost = 6500; // Hinges, handles, multipoint cremone lock
        laborUnitCost = 7000;
        overheadUnitCost = 2800;
        break;
      }
      case 'sliding_door': {
        const totalLinearCm = (2 * widthCm + 4 * heightCm + 40) * quantity;
        profileBarsNeeded = Math.round(((totalLinearCm / 600) * scrapMultiplier) * 10) / 10;
        glassAreaM2 = Math.round(((widthCm * heightCm * 0.95 * quantity) / 10000) * 100) / 100;
        rubberMeters = Math.round((((2 * widthCm + 4 * heightCm) * quantity) / 100) * 10) / 10;
        barUnitCost = 18000; // Heavy duty sliding door profile
        glassSqmCost = 14000; // 6mm tempered glass
        hardwareSetCost = 8500; // Heavy duty rollers & mortise lock
        laborUnitCost = 10000;
        overheadUnitCost = 4000;
        break;
      }
      case 'hinged_door': {
        const totalLinearCm = (2 * widthCm + 3 * heightCm + 2 * (widthCm - 8) + 2 * (heightCm - 8) + widthCm) * quantity;
        profileBarsNeeded = Math.round(((totalLinearCm / 600) * scrapMultiplier) * 10) / 10;
        glassAreaM2 = Math.round((((widthCm - 12) * (heightCm * 0.6) * quantity) / 10000) * 100) / 100;
        rubberMeters = Math.round((((widthCm + heightCm) * 3 * quantity) / 100) * 10) / 10;
        barUnitCost = 19500;
        glassSqmCost = 14000;
        hardwareSetCost = 12000; // High security cylinder lock & heavy 3D hinges
        laborUnitCost = 12000;
        overheadUnitCost = 4500;
        break;
      }
      case 'handrail': {
        // Balustrade linear calculation: Handrail top + bottom + posts every 100cm + balusters
        const postsCount = Math.max(2, Math.ceil(widthCm / 100) + 1) * quantity;
        const totalLinearCm = (widthCm * 2 + postsCount * heightCm) * quantity;
        profileBarsNeeded = Math.round(((totalLinearCm / 600) * scrapMultiplier) * 10) / 10;
        glassAreaM2 = Math.round(((widthCm * (heightCm - 15) * quantity) / 10000) * 100) / 100;
        rubberMeters = Math.round(((widthCm * 2 * quantity) / 100) * 10) / 10;
        barUnitCost = 16000;
        glassSqmCost = 16000; // 8mm or laminated glass
        hardwareSetCost = postsCount * 1800; // Post flanges & glass brackets
        laborUnitCost = 8000;
        overheadUnitCost = 3000;
        break;
      }
      default: {
        const totalLinearCm = (2 * widthCm + 4 * heightCm + 20) * quantity;
        profileBarsNeeded = Math.round(((totalLinearCm / 600) * scrapMultiplier) * 10) / 10;
        glassAreaM2 = Math.round(((widthCm * heightCm * quantity) / 10000) * 100) / 100;
        rubberMeters = Math.round((((2 * widthCm + 2 * heightCm) * 2 * quantity) / 100) * 10) / 10;
        laborUnitCost = 6000;
        overheadUnitCost = 2500;
      }
    }

    const materialCost =
      profileBarsNeeded * barUnitCost +
      glassAreaM2 * glassSqmCost +
      rubberMeters * rubberMeterCost +
      hardwareSets * hardwareSetCost;

    const laborCost = quantity * laborUnitCost;
    const overheadCost = quantity * overheadUnitCost;
    const totalCost = materialCost + laborCost + overheadCost;
    const marginFrac = marginPercent / 100;
    const suggestedPrice = marginFrac < 1 ? totalCost / (1 - marginFrac) : totalCost * 1.3;

    return {
      profileBarsNeeded,
      glassAreaM2,
      rubberMeters,
      hardwareSets,
      materialCost: Math.round(materialCost),
      laborCost: Math.round(laborCost),
      overheadCost: Math.round(overheadCost),
      totalCost: Math.round(totalCost),
      suggestedPrice: Math.round(suggestedPrice),
    };
  }

  /**
   * Backwards compatible helper for window costing calculator
   */
  static calculateWindowCost(
    widthCm: number,
    heightCm: number,
    quantity: number = 1,
    scrapPercent: number = 7,
    marginPercent: number = 30
  ): WindowCostBreakdown {
    return this.calculateModelCost('sliding_window', widthCm, heightCm, quantity, scrapPercent, marginPercent);
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
        color: '#3B82F6' // Blue
      },
      {
        id: 'frame-h',
        label: 'Outer Frame Vertical (Sides)',
        labelAr: 'حلق رأسي (قوائم جانبية)',
        lengthCm: heightCm,
        count: 2 * quantity,
        color: '#60A5FA' // Light blue
      },
      {
        id: 'sash-h',
        label: 'Sliding Sash Vertical Frame',
        labelAr: 'درفة منزلقة - قوائم رأسية',
        lengthCm: Math.max(10, heightCm - 5.5),
        count: 4 * quantity,
        color: '#F59E0B' // Amber
      },
      {
        id: 'sash-w',
        label: 'Sliding Sash Horizontal Frame',
        labelAr: 'درفة منزلقة - عوارض أفقية',
        lengthCm: Math.max(10, Math.round((widthCm / 2 + 1.5) * 10) / 10),
        count: 4 * quantity,
        color: '#FBBF24' // Light amber
      },
      {
        id: 'interlock',
        label: 'Center Interlock Profile',
        labelAr: 'سكتين تقابل وسطي (إنترلوك)',
        lengthCm: Math.max(10, heightCm - 6.0),
        count: 2 * quantity,
        color: '#10B981' // Emerald
      },
    ];
  }

  /**
   * Generates parametric cut list for any workshop model type
   */
  static generateModelCutList(
    modelType: WorkshopModelType,
    widthCm: number,
    heightCm: number,
    quantity: number = 1
  ): CutPiece[] {
    switch (modelType) {
      case 'sliding_window':
        return this.generateWindowCutList(widthCm, heightCm, quantity);
      
      case 'hinged_window':
        return [
          {
            id: 'hframe-w',
            label: 'Outer Casement Frame Horizontal',
            labelAr: 'حلق مفصلي أفقي (أعلى وأسفل)',
            lengthCm: widthCm,
            count: 2 * quantity,
            color: '#3B82F6'
          },
          {
            id: 'hframe-h',
            label: 'Outer Casement Frame Vertical',
            labelAr: 'حلق مفصلي رأسي (قوائم جانبية)',
            lengthCm: heightCm,
            count: 2 * quantity,
            color: '#60A5FA'
          },
          {
            id: 'hsash-w',
            label: 'Casement Sash Horizontal',
            labelAr: 'درفة مفصلية عوارض أفقية',
            lengthCm: Math.max(10, widthCm - 6.0),
            count: 2 * quantity,
            color: '#EC4899'
          },
          {
            id: 'hsash-h',
            label: 'Casement Sash Vertical',
            labelAr: 'درفة مفصلية قوائم رأسية',
            lengthCm: Math.max(10, heightCm - 6.0),
            count: 2 * quantity,
            color: '#F472B6'
          },
          {
            id: 'hbead-w',
            label: 'Glazing Bead Horizontal',
            labelAr: 'باكتة زجاج أفقية',
            lengthCm: Math.max(10, widthCm - 12.0),
            count: 2 * quantity,
            color: '#8B5CF6'
          },
          {
            id: 'hbead-h',
            label: 'Glazing Bead Vertical',
            labelAr: 'باكتة زجاج رأسية',
            lengthCm: Math.max(10, heightCm - 12.0),
            count: 2 * quantity,
            color: '#A78BFA'
          }
        ];

      case 'sliding_door':
        return [
          {
            id: 'dframe-top',
            label: 'Heavy Door Track Top & Bottom',
            labelAr: 'مجرى باب سحاب ثقيل (أعلى وأسفل)',
            lengthCm: widthCm,
            count: 2 * quantity,
            color: '#2563EB'
          },
          {
            id: 'dframe-side',
            label: 'Heavy Door Frame Jambs',
            labelAr: 'حلق باب سحاب جانبي',
            lengthCm: heightCm,
            count: 2 * quantity,
            color: '#3B82F6'
          },
          {
            id: 'dsash-vert',
            label: 'Heavy Door Sash Stiles',
            labelAr: 'قوائم درفة باب سحاب ثقيل',
            lengthCm: Math.max(10, heightCm - 7.0),
            count: 4 * quantity,
            color: '#D97706'
          },
          {
            id: 'dsash-horiz',
            label: 'Heavy Door Sash Rails',
            labelAr: 'عوارض درفة باب سحاب ثقيل',
            lengthCm: Math.max(10, Math.round((widthCm / 2 + 3.0) * 10) / 10),
            count: 4 * quantity,
            color: '#F59E0B'
          }
        ];

      case 'hinged_door':
        return [
          {
            id: 'door-jamb-w',
            label: 'Entrance Door Frame Header',
            labelAr: 'رأس حلق الباب المفصلي',
            lengthCm: widthCm,
            count: 1 * quantity,
            color: '#1E40AF'
          },
          {
            id: 'door-jamb-h',
            label: 'Entrance Door Frame Jambs',
            labelAr: 'قوائم حلق الباب المفصلي',
            lengthCm: heightCm,
            count: 2 * quantity,
            color: '#3B82F6'
          },
          {
            id: 'door-stile',
            label: 'Door Leaf Stiles',
            labelAr: 'قوائم درفة الباب',
            lengthCm: Math.max(10, heightCm - 5.0),
            count: 2 * quantity,
            color: '#EA580C'
          },
          {
            id: 'door-rail-top',
            label: 'Door Top Rail',
            labelAr: 'عارضة علوية لدرفة الباب',
            lengthCm: Math.max(10, widthCm - 10.0),
            count: 1 * quantity,
            color: '#F97316'
          },
          {
            id: 'door-mid-rail',
            label: 'Door Mid Rail / Transom',
            labelAr: 'قاطع أوسط للباب (سنتر)',
            lengthCm: Math.max(10, widthCm - 10.0),
            count: 1 * quantity,
            color: '#FB923C'
          },
          {
            id: 'door-bottom-kick',
            label: 'Door Heavy Bottom Kickplate Rail',
            labelAr: 'عارضة سفلية ثقيلة (باجة)',
            lengthCm: Math.max(10, widthCm - 10.0),
            count: 1 * quantity,
            color: '#C2410C'
          }
        ];

      case 'handrail': {
        const postsCount = Math.max(2, Math.ceil(widthCm / 100) + 1);
        return [
          {
            id: 'hr-top',
            label: 'Top Round/Square Handrail Profile',
            labelAr: 'ماسورة / بروفيل الهاندريل العلوي',
            lengthCm: widthCm,
            count: 1 * quantity,
            color: '#059669'
          },
          {
            id: 'hr-post',
            label: 'Support Posts 50x50',
            labelAr: 'أعمدة تثبيت وقوائم الهاندريل',
            lengthCm: heightCm,
            count: postsCount * quantity,
            color: '#10B981'
          },
          {
            id: 'hr-mid',
            label: 'Horizontal Safety Bar / Glass Channel',
            labelAr: 'قواطع حماية أفقية / مجرى زجاج',
            lengthCm: widthCm,
            count: 2 * quantity,
            color: '#34D399'
          }
        ];
      }

      default:
        return this.generateWindowCutList(widthCm, heightCm, quantity);
    }
  }

  /**
   * Generates parametric cut list directly from a Measurement record or object
   */
  static generateCutListFromMeasurement(measurement: Measurement): CutPiece[] {
    const rawModel = measurement.product_type || measurement.model_type || 'sliding_window';
    let modelType: WorkshopModelType = 'sliding_window';
    if (
      rawModel === 'sliding_window' ||
      rawModel === 'hinged_window' ||
      rawModel === 'sliding_door' ||
      rawModel === 'hinged_door' ||
      rawModel === 'handrail' ||
      rawModel === 'custom'
    ) {
      modelType = rawModel;
    }
    const qty = measurement.quantity && measurement.quantity > 0 ? measurement.quantity : 1;
    return this.generateModelCutList(modelType, measurement.width, measurement.height, qty);
  }

  /**
   * 1D Linear Cutting Stock Optimizer using First Fit Decreasing with Kerf Blade compensation
   */
  static optimizeCuttingStock(
    cutPieces: CutPiece[],
    stockBarLengthCm: number = 600,
    kerfBladeCm: number = 0.4
  ): OptimizationResult {
    // Validate that no cut piece exceeds the stock bar length
    for (const piece of cutPieces) {
      if (piece.lengthCm > stockBarLengthCm) {
        throw new Error(
          `CUT_LONGER_THAN_STOCK: Cut piece "${piece.label || piece.id}" length (${piece.lengthCm}cm) exceeds stock bar length (${stockBarLengthCm}cm)`
        );
      }
    }

    // Flatten individual cuts
    const flattenedCuts: { label: string; labelAr: string; lengthCm: number; color?: string }[] = [];
    cutPieces.forEach((piece) => {
      for (let i = 0; i < piece.count; i++) {
        if (piece.lengthCm > stockBarLengthCm) {
          throw new Error(
            `CUT_LONGER_THAN_STOCK: Cut piece "${piece.label || piece.id}" length (${piece.lengthCm}cm) exceeds stock bar length (${stockBarLengthCm}cm)`
          );
        }
        flattenedCuts.push({
          label: piece.label,
          labelAr: piece.labelAr,
          lengthCm: piece.lengthCm,
          color: piece.color || '#3B82F6'
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
