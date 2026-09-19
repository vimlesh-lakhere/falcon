import { Product, Unit } from "@/types/database";

export type UnitKey = "piece" | "half_dozen" | "dozen" | "bundle_10_doz" | "half_unit" | "unit" | "bulk_5" | "bulk_10" | "custom" | string;

export interface UnitDefinition {
  key: UnitKey;
  label: string;
  shortName: string;
  multiplier: number; // in base pieces
  description: string;
  isDefault?: boolean;
}

export interface DynamicProductUnit {
  key: string;
  label: string;
  shortName: string;
  multiplier: number;
  description: string;
  isDefault?: boolean;
}

export const STANDARD_UNITS: Record<string, UnitDefinition> = {
  piece: {
    key: "piece",
    label: "Piece (1 Pc)",
    shortName: "Pc",
    multiplier: 1,
    description: "Single piece standard retail unit",
    isDefault: true,
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
 * Extracts a clean unit label from unit name.
 * e.g. "Lad (16 pcs)" -> "Ladi", "Box (24 pcs)" -> "Box", "Pack (8 pcs)" -> "Pack"
 */
export function getCleanUnitBaseName(unitName?: string | null): string {
  if (!unitName) return "Pack";
  const lower = unitName.toLowerCase();
  if (lower.includes("lad")) return "Ladi";
  if (lower.includes("box")) return "Box";
  if (lower.includes("pack") || lower.includes("pkt")) return "Pack";
  if (lower.includes("strip") || lower.includes("patta")) return "Strip";
  if (lower.includes("pouch")) return "Pouch";
  if (lower.includes("carton") || lower.includes("peti")) return "Carton";
  if (lower.includes("doz")) return "Doz";
  if (lower.includes("bunch") || lower.includes("bundle")) return "Bundle";
  if (lower.includes("bottle") || lower.includes("botal")) return "Bottle";
  if (lower.includes("can")) return "Can";
  if (lower.includes("tin")) return "Tin";
  if (lower.includes("jar")) return "Jar";
  if (lower.includes("roll")) return "Roll";
  if (lower.includes("set")) return "Set";
  if (lower.includes("pair")) return "Pair";
  if (lower.includes("bag") || lower.includes("bori")) return "Bag";
  if (lower.includes("pc") || lower.includes("piece")) return "Pc";

  const cleaned = unitName.replace(/\(.*?\)/g, "").replace(/[0-9]/g, "").trim();
  return cleaned || "Pack";
}

/**
 * Resolves the unit and conversion factor for a product.
 */
export function resolveProductUnitDetails(
  product: Product,
  unitCatalog?: Unit[]
): {
  unitId: string | null;
  unitName: string;
  conversionFactor: number;
  cleanBaseName: string;
} {
  let matchedUnit: Unit | undefined = product.unit;

  if (!matchedUnit && product.unit_id && unitCatalog && unitCatalog.length > 0) {
    matchedUnit = unitCatalog.find((u) => u.id === product.unit_id);
  }

  if (matchedUnit) {
    const factor = Number(matchedUnit.conversion_factor) || 1;
    return {
      unitId: matchedUnit.id,
      unitName: matchedUnit.name,
      conversionFactor: factor > 0 ? factor : 1,
      cleanBaseName: getCleanUnitBaseName(matchedUnit.name),
    };
  }

  // Fallback: parse from product name or description
  const combinedText = `${product.name} ${product.description || ""}`;
  const packMatch =
    combinedText.match(/(?:pack|box|lad|ladi|strip|bundle)\s*(?:of|\()?[\s]*(\d+)\s*(?:pcs|pc|units)?/i) ||
    combinedText.match(/(\d+)\s*(?:pcs|pc)\s*(?:lad|ladi|box|pack|strip)/i);

  if (packMatch && packMatch[1]) {
    const parsedFactor = parseInt(packMatch[1], 10);
    if (parsedFactor > 1) {
      return {
        unitId: null,
        unitName: `Pack (${parsedFactor} pcs)`,
        conversionFactor: parsedFactor,
        cleanBaseName: getCleanUnitBaseName(packMatch[0]),
      };
    }
  }

  return {
    unitId: null,
    unitName: "Piece",
    conversionFactor: 1,
    cleanBaseName: "Pc",
  };
}

/**
 * Dynamically generates POS quick-select pills for ANY product.
 * Supports standard pieces, 10, 12, 16, 24 pcs ladi/box, and future custom units (e.g. 8, 9 pcs).
 */
export function getAvailableUnitsForProduct(
  product: Product,
  unitCatalog?: Unit[]
): DynamicProductUnit[] {
  const { conversionFactor, cleanBaseName, unitName } = resolveProductUnitDetails(product, unitCatalog);

  // If conversion factor is 1, return single piece
  if (conversionFactor <= 1) {
    return [
      {
        key: "piece",
        label: "Pc (1)",
        shortName: "Pc",
        multiplier: 1,
        description: "Single piece standard retail unit",
        isDefault: true,
      },
    ];
  }

  const units: DynamicProductUnit[] = [];

  // 1. Single loose piece (Auto-Break)
  units.push({
    key: "piece",
    label: "Pc (1)",
    shortName: "Pc",
    multiplier: 1,
    description: `Loose single piece (auto-broken from ${unitName})`,
    isDefault: false,
  });

  // 2. Half pack (if conversionFactor >= 4)
  if (conversionFactor >= 4) {
    const halfQty = Math.floor(conversionFactor / 2);
    units.push({
      key: "half_unit",
      label: `1/2 ${cleanBaseName} (${halfQty})`,
      shortName: `1/2 ${cleanBaseName}`,
      multiplier: halfQty,
      description: `Half ${cleanBaseName} containing ${halfQty} pieces`,
    });
  }

  // 3. Full pack / box / ladi
  units.push({
    key: "unit",
    label: `1 ${cleanBaseName} (${conversionFactor})`,
    shortName: cleanBaseName,
    multiplier: conversionFactor,
    description: `Full ${cleanBaseName} containing ${conversionFactor} pieces`,
    isDefault: true,
  });

  // 4. Bulk Pack (5x or 10x)
  if (conversionFactor <= 20) {
    const bulk10Qty = conversionFactor * 10;
    units.push({
      key: "bulk_10",
      label: `10 ${cleanBaseName} (${bulk10Qty})`,
      shortName: `10 ${cleanBaseName}`,
      multiplier: bulk10Qty,
      description: `Bulk pack of 10 ${cleanBaseName}s (${bulk10Qty} pieces)`,
    });
  } else {
    const bulk5Qty = conversionFactor * 5;
    units.push({
      key: "bulk_5",
      label: `5 ${cleanBaseName} (${bulk5Qty})`,
      shortName: `5 ${cleanBaseName}`,
      multiplier: bulk5Qty,
      description: `Bulk pack of 5 ${cleanBaseName}s (${bulk5Qty} pieces)`,
    });
  }

  return units;
}

/**
 * Resolves piece price and full-pack price for a product.
 * Handles loose-piece retail price vs wholesale pack price seamlessly.
 */
export function getProductUnitPricing(
  product: Product,
  unitMultiplier: number = 1,
  unitCatalog?: Unit[]
): {
  piecePrice: number;
  packPrice: number;
  conversionFactor: number;
  unitPrice: number;
} {
  const { conversionFactor } = resolveProductUnitDetails(product, unitCatalog);
  const onlinePrice =
    (product as any).online_price !== undefined &&
    (product as any).online_price !== null &&
    Number((product as any).online_price) > 0
      ? Number((product as any).online_price)
      : null;
  const rawSelling = onlinePrice !== null ? onlinePrice : (Number(product.selling_price) || 0);
  const rawWholesale = Number(product.wholesale_price) || 0;
  const rawMrp = Number(product.mrp) || 0;

  let piecePrice = rawSelling;
  let packPrice = rawSelling;

  if (conversionFactor <= 1) {
    piecePrice = rawSelling;
    packPrice = rawSelling;
    return {
      piecePrice,
      packPrice,
      conversionFactor: 1,
      unitPrice: Math.round(piecePrice * unitMultiplier),
    };
  }

  // Multi-pack product pricing logic
  if (rawWholesale > 0) {
    if (rawWholesale > rawSelling) {
      // rawSelling is piece price (e.g. ₹10), rawWholesale is pack price (e.g. ₹200 for box of 24)
      piecePrice = rawSelling;
      packPrice = rawWholesale;
    } else if (rawSelling >= conversionFactor * 2 && rawWholesale >= conversionFactor * 1.5) {
      // Both are pack prices (e.g. Selling ₹240/pack, Wholesale ₹200/pack)
      packPrice = rawWholesale;
      piecePrice = Math.round((rawSelling / conversionFactor) * 100) / 100;
    } else {
      // rawWholesale is wholesale per-piece rate (e.g. ₹8/pc vs ₹10/pc retail)
      piecePrice = rawSelling;
      packPrice = Math.round(rawWholesale * conversionFactor);
    }
  } else if (rawMrp > 0 && rawMrp < rawSelling * 0.5) {
    // rawSelling is pack price, rawMrp is single piece rate
    piecePrice = rawMrp;
    packPrice = rawSelling;
  } else {
    // Standard: rawSelling is piece price, packPrice is rawSelling * conversionFactor
    piecePrice = rawSelling;
    packPrice = Math.round(rawSelling * conversionFactor);
  }

  let unitPrice = packPrice;
  if (unitMultiplier === 1) {
    unitPrice = piecePrice;
  } else if (unitMultiplier === conversionFactor) {
    unitPrice = packPrice;
  } else if (unitMultiplier < conversionFactor) {
    // Half pack or partial pack
    unitPrice = Math.round((packPrice / conversionFactor) * unitMultiplier);
  } else {
    // Bulk pack (extra 5% bulk discount for 10 packs)
    const discount = unitMultiplier >= conversionFactor * 10 ? 0.95 : 1.0;
    unitPrice = Math.round((packPrice / conversionFactor) * unitMultiplier * discount);
  }

  return {
    piecePrice,
    packPrice,
    conversionFactor,
    unitPrice,
  };
}

/**
 * Calculates default unit price for a product based on unitKey and multiplier.
 */
export function calculateDefaultUnitPrice(
  product: Product,
  unitKey: UnitKey,
  customMultiplier: number = 1,
  unitCatalog?: Unit[]
): number {
  const multiplier = getBaseMultiplier(unitKey, customMultiplier, product, unitCatalog);
  const pricing = getProductUnitPricing(product, multiplier, unitCatalog);
  return pricing.unitPrice;
}

/**
 * Resolves the multiplier in base pieces for a given unit key.
 */
export function getBaseMultiplier(
  unitKey: UnitKey,
  customMultiplier: number = 1,
  product?: Product,
  unitCatalog?: Unit[]
): number {
  if (unitKey === "custom") return customMultiplier > 0 ? customMultiplier : 1;

  if (unitKey === "piece") return 1;

  if (product) {
    const { conversionFactor } = resolveProductUnitDetails(product, unitCatalog);
    if (unitKey === "half_unit" || unitKey === "half_dozen") {
      return Math.max(1, Math.floor(conversionFactor / 2));
    }
    if (unitKey === "unit" || unitKey === "dozen") {
      return conversionFactor;
    }
    if (unitKey === "bulk_10" || unitKey === "bundle_10_doz") {
      return conversionFactor * 10;
    }
    if (unitKey === "bulk_5") {
      return conversionFactor * 5;
    }
  }

  // Fallback to STANDARD_UNITS
  const std = STANDARD_UNITS[unitKey];
  if (std) return std.multiplier;

  return customMultiplier > 0 ? customMultiplier : 1;
}

/**
 * Returns formatted summary of pricing for display in catalog cards.
 */
export function getProductPricingSummary(product: Product, unitCatalog?: Unit[]) {
  const pricing = getProductUnitPricing(product, 1, unitCatalog);
  const wholesaleRaw = Number(product.wholesale_price) || 0;
  const wholesaleMinQty = Number(product.wholesale_min_qty) || pricing.conversionFactor || 12;
  const rawMrp = Number(product.mrp) || 0;
  const pieceMrp = pricing.conversionFactor > 1 && rawMrp > pricing.piecePrice * 2
    ? Math.round((rawMrp / pricing.conversionFactor) * 100) / 100
    : (rawMrp || pricing.piecePrice);

  return {
    piecePrice: pricing.piecePrice,
    packPrice: pricing.packPrice,
    conversionFactor: pricing.conversionFactor,
    mrp: pieceMrp,
    packMrp: rawMrp || Math.round(pieceMrp * pricing.conversionFactor),
    wholesalePerPiece: wholesaleRaw > 0 && wholesaleRaw < pricing.piecePrice * 2 ? wholesaleRaw : Math.round(pricing.packPrice / pricing.conversionFactor),
    wholesaleMinQty,
  };
}

/**
 * Computes effective item price with wholesale threshold detection.
 */
export function getEffectiveItemPrice(
  product: Product,
  quantity: number = 1,
  unitKey: UnitKey = "piece",
  customMultiplier: number = 1,
  unitCatalog?: Unit[]
): {
  unitPrice: number;
  originalPrice: number;
  isWholesaleTriggered: boolean;
  totalPieces: number;
  savingsPerUnit: number;
} {
  const multiplier = getBaseMultiplier(unitKey, customMultiplier, product, unitCatalog);
  const totalPieces = quantity * multiplier;
  const regularUnitPrice = calculateDefaultUnitPrice(product, unitKey, multiplier, unitCatalog);
  const wholesaleRaw = Number(product.wholesale_price) || 0;
  const wholesaleMinQty = Number(product.wholesale_min_qty) || (product.unit?.conversion_factor ? Number(product.unit.conversion_factor) : 12);

  // If wholesale price is configured and total base pieces reach wholesale trigger
  if (wholesaleRaw > 0 && totalPieces >= wholesaleMinQty) {
    const { conversionFactor, piecePrice, packPrice } = getProductUnitPricing(product, multiplier, unitCatalog);
    let wholesalePerPiece = 0;

    if (wholesaleRaw > piecePrice) {
      // wholesaleRaw is pack price
      wholesalePerPiece = wholesaleRaw / conversionFactor;
    } else {
      // wholesaleRaw is per-piece price
      wholesalePerPiece = wholesaleRaw;
    }

    let wholesaleUnitPrice = regularUnitPrice;
    if (multiplier === 1) {
      wholesaleUnitPrice = wholesalePerPiece;
    } else if (multiplier === conversionFactor) {
      wholesaleUnitPrice = wholesaleRaw > piecePrice * 2 ? wholesaleRaw : wholesalePerPiece * conversionFactor;
    } else {
      const discount = multiplier >= conversionFactor * 10 ? 0.95 : 1.0;
      wholesaleUnitPrice = wholesalePerPiece * multiplier * discount;
    }

    const finalWholesalePrice = Number(wholesaleUnitPrice.toFixed(2));
    const savings = Math.max(0, regularUnitPrice - finalWholesalePrice);

    return {
      unitPrice: finalWholesalePrice,
      originalPrice: regularUnitPrice,
      isWholesaleTriggered: true,
      totalPieces,
      savingsPerUnit: Number(savings.toFixed(2)),
    };
  }

  const baseSellingPrice = Number(product.selling_price) || regularUnitPrice;
  const baseOriginalPrice = baseSellingPrice > regularUnitPrice ? baseSellingPrice : regularUnitPrice;
  const onlineSavings = Math.max(0, baseOriginalPrice - regularUnitPrice);

  return {
    unitPrice: regularUnitPrice,
    originalPrice: baseOriginalPrice,
    isWholesaleTriggered: false,
    totalPieces,
    savingsPerUnit: Number(onlineSavings.toFixed(2)),
  };
}

/**
 * Formats the quantity and unit name for thermal receipts, invoices, and WhatsApp bills.
 * e.g. "2 Ladi (16 pcs)", "1 Box (24 pcs)", "3 Pcs", "1/2 Box (12 pcs)"
 */
export function formatItemQuantityAndUnit(
  quantity: number,
  unitKey: UnitKey = "piece",
  customUnitName?: string
): string {
  if (customUnitName) {
    return `${quantity} ${customUnitName}`;
  }

  if (unitKey === "piece") {
    return `${quantity} ${quantity > 1 ? "Pcs" : "Pc"}`;
  }
  if (unitKey === "half_dozen") {
    return `${quantity} (1/2 Doz)`;
  }
  if (unitKey === "dozen") {
    return `${quantity} ${quantity > 1 ? "Dozens" : "Dozen"}`;
  }
  if (unitKey === "bundle_10_doz") {
    return `${quantity} Master-Pack (10 Doz)`;
  }

  const unit = STANDARD_UNITS[unitKey];
  if (unit) {
    return `${quantity} ${unit.shortName}`;
  }

  return `${quantity} Unit`;
}

/**
 * Converts quantity in selected unit to base pieces for inventory stock deduction.
 */
export function getBaseQuantity(
  quantity: number,
  unitKey: UnitKey = "piece",
  customMultiplier: number = 1,
  product?: Product,
  unitCatalog?: Unit[]
): number {
  const multiplier = getBaseMultiplier(unitKey, customMultiplier, product, unitCatalog);
  return quantity * multiplier;
}
