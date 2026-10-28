import type {
  EstimateDoorConfig,
  EstimateOpenerConfig,
  EstimateOptions,
  EstimateLine,
} from "@/types";

export const TAX_RATE_DEFAULT = 0.0625;
export const COST_ESCALATION = 1.1;
export const MATERIAL_MARKUP = 2.2;
export const MAX_DISCOUNT = 0.2;
export const MIN_LABOR = 550;
export const MAX_LABOR = 1000;
export const DISPOSAL_FIRST_DOOR = 150;
export const DISPOSAL_ADDITIONAL_DOOR = 100;
export const DISPOSAL_OLD_OPENER = 50;

export interface PricingBreakdown {
  doorsTotal: number;
  openersTotal: number;
  laborTotal: number;
  doorDisposalTotal: number;
  openerDisposalTotal: number;
  accessoriesTotal: number;
  subtotal: number;
  tax: number;
  total: number;
  discountAmount: number;
  grossCost: number;
  grossProfit: number;
  marginPercent: number;
}

export function clampLabor(labor: number): number {
  return Math.min(MAX_LABOR, Math.max(MIN_LABOR, labor));
}

export function clampDiscount(discount: number): number {
  return Math.min(MAX_DISCOUNT, Math.max(0, discount));
}

export function calculateDoorSellingPrice(
  supplierCost: number,
  discountPercent: number
): number {
  if (supplierCost <= 0) return 0;
  const adjustedCost = supplierCost * COST_ESCALATION;
  const standardPrice = adjustedCost * MATERIAL_MARKUP;
  return Math.round(standardPrice * (1 - clampDiscount(discountPercent / 100)) * 100) / 100;
}

export function calculateOpenerSellingPrice(
  supplierCost: number,
  discountPercent: number
): number {
  if (supplierCost <= 0) return 0;
  const adjustedCost = supplierCost * COST_ESCALATION;
  const standardPrice = adjustedCost * MATERIAL_MARKUP;
  return Math.round(standardPrice * (1 - clampDiscount(discountPercent / 100)) * 100) / 100;
}

export function calculateDoorDisposal(doorCount: number): number {
  if (doorCount <= 0) return 0;
  return DISPOSAL_FIRST_DOOR + DISPOSAL_ADDITIONAL_DOOR * (doorCount - 1);
}

export function calculateOpenerDisposal(oldOpenerCount: number): number {
  return DISPOSAL_OLD_OPENER * Math.max(0, Math.floor(oldOpenerCount));
}

export function calculatePricing(options: EstimateOptions): PricingBreakdown {
  const doors = options.doors ?? [];
  const openers = options.openers ?? [];

  const doorsTotal = doors.reduce((sum, d) => sum + d.selling_price * d.quantity, 0);
  const openersTotal = openers.reduce((sum, o) => sum + o.selling_price * o.quantity, 0);

  const totalDoorQty = doors.reduce((sum, d) => sum + d.quantity, 0);
  const laborTotal = clampLabor(options.labor_per_door) * totalDoorQty;

  const doorDisposalTotal = options.disposal_enabled
    ? calculateDoorDisposal(options.door_count_for_disposal || totalDoorQty)
    : 0;
  const openerDisposalTotal = calculateOpenerDisposal(options.old_opener_disposal_count);

  const accessoriesTotal = 0;

  const discountAmount = doors.reduce((sum, d) => {
    if (d.supplier_cost == null || d.supplier_cost <= 0) return sum;
    const standard = d.supplier_cost * COST_ESCALATION * MATERIAL_MARKUP;
    return sum + (standard - d.selling_price) * d.quantity;
  }, 0) + openers.reduce((sum, o) => {
    if (o.supplier_cost == null || o.supplier_cost <= 0) return sum;
    const standard = o.supplier_cost * COST_ESCALATION * MATERIAL_MARKUP;
    return sum + (standard - o.selling_price) * o.quantity;
  }, 0);

  const subtotal = doorsTotal + openersTotal + laborTotal + doorDisposalTotal + openerDisposalTotal + accessoriesTotal;

  const taxableAmount = options.tax_enabled ? doorsTotal + openersTotal + accessoriesTotal : 0;
  const tax = Math.round(taxableAmount * options.tax_rate * 100) / 100;

  const total = subtotal + tax;

  const grossCost = doors.reduce((s, d) => s + (d.supplier_cost ?? 0) * d.quantity, 0) +
    openers.reduce((s, o) => s + (o.supplier_cost ?? 0) * o.quantity, 0) +
    laborTotal + doorDisposalTotal + openerDisposalTotal;

  const grossProfit = total - grossCost;
  const marginPercent = total > 0 ? (grossProfit / total) * 100 : 0;

  return {
    doorsTotal,
    openersTotal,
    laborTotal,
    doorDisposalTotal,
    openerDisposalTotal,
    accessoriesTotal,
    subtotal,
    tax,
    total,
    discountAmount,
    grossCost,
    grossProfit,
    marginPercent,
  };
}

export function buildEstimateLines(
  options: EstimateOptions,
  breakdown: PricingBreakdown
): EstimateLine[] {
  const lines: EstimateLine[] = [];
  let lineNum = 0;
  const mkId = () => `temp-${++lineNum}`;

  for (const door of options.doors ?? []) {
    if (door.selling_price > 0) {
      lines.push({
        id: mkId(),
        estimate_id: "",
        line_type: "door",
        description: `${door.manufacturer} ${door.model} ${door.width_ft}x${door.height_ft} ${door.color}`.trim(),
        quantity: door.quantity,
        unit_price: door.selling_price,
        line_total: door.selling_price * door.quantity,
        taxable: true,
      });
    }
  }

  for (const opener of options.openers ?? []) {
    if (opener.selling_price > 0) {
      lines.push({
        id: mkId(),
        estimate_id: "",
        line_type: "opener",
        description: `${opener.brand} ${opener.model}`.trim(),
        quantity: opener.quantity,
        unit_price: opener.selling_price,
        line_total: opener.selling_price * opener.quantity,
        taxable: true,
      });
    }
  }

  const totalDoorQty = (options.doors ?? []).reduce((s, d) => s + d.quantity, 0);
  if (totalDoorQty > 0) {
    lines.push({
      id: mkId(),
      estimate_id: "",
      line_type: "labor",
      description: "Installation labor",
      quantity: totalDoorQty,
      unit_price: clampLabor(options.labor_per_door),
      line_total: breakdown.laborTotal,
      taxable: false,
    });
  }

  if (breakdown.doorDisposalTotal > 0) {
    lines.push({
      id: mkId(),
      estimate_id: "",
      line_type: "disposal",
      description: "Door disposal",
      quantity: 1,
      unit_price: breakdown.doorDisposalTotal,
      line_total: breakdown.doorDisposalTotal,
      taxable: false,
    });
  }

  if (breakdown.openerDisposalTotal > 0) {
    lines.push({
      id: mkId(),
      estimate_id: "",
      line_type: "disposal",
      description: "Old opener disposal",
      quantity: options.old_opener_disposal_count,
      unit_price: DISPOSAL_OLD_OPENER,
      line_total: breakdown.openerDisposalTotal,
      taxable: false,
    });
  }

  if (breakdown.tax > 0) {
    lines.push({
      id: mkId(),
      estimate_id: "",
      line_type: "tax",
      description: `Sales tax (${(options.tax_rate * 100).toFixed(2)}%)`,
      quantity: 1,
      unit_price: breakdown.tax,
      line_total: breakdown.tax,
      taxable: false,
    });
  }

  return lines;
}

export function formatCurrency(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function recalcDoorSelling(
  door: Pick<EstimateDoorConfig, "supplier_cost" | "discount_percent">
): number {
  if (door.supplier_cost == null || door.supplier_cost <= 0) return 0;
  return calculateDoorSellingPrice(door.supplier_cost, door.discount_percent);
}

export function recalcOpenerSelling(
  opener: Pick<EstimateOpenerConfig, "supplier_cost" | "discount_percent">
): number {
  if (opener.supplier_cost == null || opener.supplier_cost <= 0) return 0;
  return calculateOpenerSellingPrice(opener.supplier_cost, opener.discount_percent);
}
