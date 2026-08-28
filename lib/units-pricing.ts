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
 */
export function calculateDefaultUnitPrice(
  product: Product,
  unitKey: UnitKey,
  customMultiplier: number = 1
): number {
  const piecePrice = Number(product.selling_price) || 0;
  const wholesalePrice = Number(product.wholesale_price) || 0;

  switch (unitKey) {
    case "piece":
      return piecePrice;

    case "half_dozen":
      // If wholesale price exists and is lower than piece*12, use wholesale/2, otherwise piece*6 with ~5% discount
      if (wholesalePrice > 0) {
        return Math.round(wholesalePrice / 2);
      }
      return Math.round(piecePrice * 6 * 0.95);

    case "dozen":
      // If wholesale price is set, use it directly (e.g. ₹480/dozen)
      if (wholesalePrice > 0) {
        return wholesalePrice;
      }
      // Otherwise calculate dozen as piece * 12 with ~10% bulk discount
      return Math.round(piecePrice * 12 * 0.9);

    case "bundle_10_doz":
      // 10 dozen master pack: use wholesalePrice * 10 (with extra 5% bulk discount) if available
      if (wholesalePrice > 0) {
        return Math.round(wholesalePrice * 10 * 0.95);
      }
      return Math.round(piecePrice * 120 * 0.85);

    case "custom":
      return Math.round(piecePrice * customMultiplier);

    default:
      return piecePrice;
  }
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
