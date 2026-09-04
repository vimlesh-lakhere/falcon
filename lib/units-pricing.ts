import { Product } from "@/types/database";

export type UnitKey = "piece" | "half_dozen" | "dozen" | "bundle_10_doz" | "custom";

export interface UnitDefinition {
  key: UnitKey;
  label: string;
  shortName: string;
  multiplier: number; // in base pieces
  description: string;
}

export const STANDARD_UNITS: Record<UnitKey, UnitDefinition> = {
  piece: {
    key: "piece",
    label: "Piece (1 Pc)",
    shortName: "Pc",
    multiplier: 1,
    description: "Single piece standard retail unit",
  },
  half_dozen: {
    key: "half_dozen",
    label: "1/2 Dozen (6 Pcs)",
    shortName: "1/2 Doz",
    multiplier: 6,
    description: "Half dozen pack containing 6 pieces",
  },
  dozen: {
    key: "dozen",
    label: "Dozen (12 Pcs)",
    shortName: "Doz",
    multiplier: 12,
    description: "Full dozen wholesale pack containing 12 pieces",
  },
  bundle_10_doz: {
    key: "bundle_10_doz",
    label: "Master Pack / 10 Doz (120 Pcs)",
    shortName: "10 Doz",
    multiplier: 120,
    description: "Carton / Master box of 10 dozens (120 pieces)",
  },
  custom: {
    key: "custom",
    label: "Custom Pack",
    shortName: "Pack",
    multiplier: 1,
    description: "Custom bulk pack or bundle",
  },
};

/**
 * Calculates the suggested default price for a given unit
 * based on the product's selling_price and wholesale_price.
 * Handles both per-piece wholesale rate (e.g. ₹32/pc vs ₹35/pc) and full-pack rate.
 */
export function calculateDefaultUnitPrice(
  product: Product,
  unitKey: UnitKey,
  customMultiplier: number = 1
): number {
  const piecePrice = Number(product.selling_price) || 0;
  const wholesaleRaw = Number(product.wholesale_price) || 0;

  // Determine wholesale per-piece rate and dozen rate
  let wholesalePerPiece = 0;
  let dozenRate = 0;

  if (wholesaleRaw > 0) {
    if (wholesaleRaw < piecePrice * 3) {
      // It's a per-piece wholesale rate (e.g. ₹32 wholesale vs ₹35 retail)
      wholesalePerPiece = wholesaleRaw;
      dozenRate = wholesaleRaw * 12;
    } else {
      // It's a full-dozen rate (e.g. ₹384 per dozen)
      dozenRate = wholesaleRaw;
      wholesalePerPiece = wholesaleRaw / 12;
    }
  } else {
    dozenRate = Math.round(piecePrice * 12 * 0.9); // 10% wholesale discount
    wholesalePerPiece = dozenRate / 12;
  }

  switch (unitKey) {
    case "piece":
      return piecePrice;

    case "half_dozen":
      return Math.round(wholesalePerPiece * 6);

    case "dozen":
      return Math.round(dozenRate);

    case "bundle_10_doz":
      return Math.round(dozenRate * 10 * 0.95); // extra 5% bulk discount

    case "custom":
      return Math.round(piecePrice * customMultiplier);

    default:
      return piecePrice;
  }
}

/**
 * Returns formatted summary of retail, wholesale per-piece, and full dozen prices.
 */
export function getProductPricingSummary(product: Product) {
  const piecePrice = Number(product.selling_price) || 0;
  const wholesaleRaw = Number(product.wholesale_price) || 0;

  let wholesalePerPiece = 0;
  let dozenPrice = 0;

  if (wholesaleRaw > 0) {
    if (wholesaleRaw < piecePrice * 3) {
      wholesalePerPiece = wholesaleRaw;
      dozenPrice = wholesaleRaw * 12;
    } else {
      dozenPrice = wholesaleRaw;
      wholesalePerPiece = Math.round(wholesaleRaw / 12);
    }
  } else {
    dozenPrice = Math.round(piecePrice * 12 * 0.9);
    wholesalePerPiece = Math.round(dozenPrice / 12);
  }

  return {
    piecePrice,
    mrp: Number(product.mrp) || piecePrice,
    wholesalePerPiece: wholesaleRaw > 0 ? wholesalePerPiece : 0,
    dozenPrice,
    halfDozenPrice: calculateDefaultUnitPrice(product, "half_dozen"),
    bundle10DozPrice: calculateDefaultUnitPrice(product, "bundle_10_doz"),
    wholesaleMinQty: Number(product.wholesale_min_qty) || 12,
  };
}

/**
 * Computes the active selling price for an item based on piece quantity and wholesale trigger rules.
 * If total pieces >= wholesale_min_qty (default 12 when wholesale_price is configured):
 * Automatically applies the wholesale rate per unit.
 */
export function getEffectiveItemPrice(
  product: Product,
  quantity: number = 1,
  unitKey: UnitKey = "piece",
  customMultiplier: number = 1
): {
  unitPrice: number;
  originalPrice: number;
  isWholesaleTriggered: boolean;
  totalPieces: number;
  savingsPerUnit: number;
} {
  const baseQty = getBaseQuantity(quantity, unitKey, customMultiplier);
  const regularUnitPrice = calculateDefaultUnitPrice(product, unitKey, customMultiplier);
  const wholesaleRaw = Number(product.wholesale_price) || 0;
  const wholesaleMinQty = Number(product.wholesale_min_qty) || 12;

  // If wholesale price is set and total pieces reach or exceed the wholesale trigger threshold
  if (wholesaleRaw > 0 && baseQty >= wholesaleMinQty) {
    const piecePrice = Number(product.selling_price) || 0;
    let wholesalePerPiece = 0;
    if (wholesaleRaw < piecePrice * 3) {
      wholesalePerPiece = wholesaleRaw; // e.g. ₹14.50/pc
    } else {
      wholesalePerPiece = wholesaleRaw / 12; // e.g. ₹175 / 12 = ₹14.5833
    }

    let wholesaleUnitPrice = regularUnitPrice;
    if (unitKey === "piece") {
      wholesaleUnitPrice = wholesalePerPiece;
    } else if (unitKey === "dozen") {
      wholesaleUnitPrice = wholesalePerPiece * 12;
    } else if (unitKey === "half_dozen") {
      wholesaleUnitPrice = wholesalePerPiece * 6;
    } else if (unitKey === "bundle_10_doz") {
      wholesaleUnitPrice = wholesalePerPiece * 120 * 0.95;
    } else {
      wholesaleUnitPrice = wholesalePerPiece * customMultiplier;
    }

    const savings = Math.max(0, regularUnitPrice - wholesaleUnitPrice);

    return {
      unitPrice: Number(wholesaleUnitPrice.toFixed(2)),
      originalPrice: regularUnitPrice,
      isWholesaleTriggered: true,
      totalPieces: baseQty,
      savingsPerUnit: Number(savings.toFixed(2)),
    };
  }

  return {
    unitPrice: regularUnitPrice,
    originalPrice: regularUnitPrice,
    isWholesaleTriggered: false,
    totalPieces: baseQty,
    savingsPerUnit: 0,
  };
}

/**
 * Formats the quantity and unit name for receipts and WhatsApp messages.
 * e.g. "2 Doz", "1 Pc", "3 (1/2 Doz)"
 */
export function formatItemQuantityAndUnit(
  quantity: number,
  unitKey: UnitKey = "piece",
  customUnitName?: string
): string {
  if (customUnitName) {
    return `${quantity} ${customUnitName}`;
  }

  const unit = STANDARD_UNITS[unitKey] || STANDARD_UNITS.piece;
  if (unitKey === "piece") {
    return `${quantity} ${quantity > 1 ? "Pcs" : "Pc"}`;
  }
  if (unitKey === "half_dozen") {
    return `${quantity} Half-Doz`;
  }
  if (unitKey === "dozen") {
    return `${quantity} ${quantity > 1 ? "Dozens" : "Dozen"}`;
  }
  if (unitKey === "bundle_10_doz") {
    return `${quantity} Master-Pack (10 Doz)`;
  }
  return `${quantity} ${unit.shortName}`;
}

/**
 * Converts quantity in selected unit to base pieces for inventory stock deduction.
 */
export function getBaseQuantity(
  quantity: number,
  unitKey: UnitKey = "piece",
  customMultiplier: number = 1
): number {
  const multiplier = unitKey === "custom" ? customMultiplier : (STANDARD_UNITS[unitKey]?.multiplier || 1);
  return quantity * multiplier;
}
