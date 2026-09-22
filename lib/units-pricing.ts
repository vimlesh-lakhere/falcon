import { Product, Unit } from "@/types/database";
import { getProductEffectiveOnlinePrice } from "@/lib/product-online";

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

  // No pack unit (loose product): still offer generic quick-quantity shortcuts so every product
  // bills fast, not just pack products. These are plain multiples of the piece price; including the
  // wholesale threshold makes unlocking the wholesale rate a single tap.
  if (conversionFactor <= 1) {
    const wholesaleQty = Number(product.wholesale_min_qty) || 0;
    const qtys = Array.from(new Set<number>([1, 6, 12, ...(wholesaleQty > 1 ? [wholesaleQty] : [])]))
      .sort((a, b) => a - b)
      .slice(0, 4);
    return qtys.map((n) =>
      n === 1
        ? {
            key: "piece",
            label: "Pc (1)",
            shortName: "Pc",
            multiplier: 1,
            description: "Single loose piece",
            isDefault: true,
          }
        : {
            key: `qty_${n}`,
            label: `${n} Pcs`,
            shortName: `${n} Pcs`,
            multiplier: n,
            description: `${n} pieces`,
            isDefault: false,
          }
    );
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

/** Round to 2 decimals (paise). */
const round2 = (n: number): number => Math.round((Number(n) || 0) * 100) / 100;

export interface PerPiecePrices {
  conversionFactor: number;
  /** Effective selling price per single piece (online_price overrides selling_price when set). */
  sellingPerPiece: number;
  /** selling_price per piece, ignoring any online discount — used for the struck-through "was" price. */
  listSellingPerPiece: number;
  /** MRP per piece, 0 if none. */
  mrpPerPiece: number;
  /** Purchase/cost per piece, 0 if none. */
  purchasePerPiece: number;
  /** Wholesale rate per piece, 0 if none. */
  wholesalePerPiece: number;
}

/**
 * The single source of truth for pricing. Every stored money field
 * (selling_price / online_price / mrp / purchase_price / wholesale_price) is entered either
 * PER PIECE or PER PACK, as recorded in `product.price_basis` ('piece' by default). This resolves
 * them all to a per-single-piece value, so the rest of the app is just `perPiece × multiplier`.
 * No guessing from price ratios — the website and the APK apply the exact same rule.
 */
export function resolvePerPiecePrices(product: Product, unitCatalog?: Unit[]): PerPiecePrices {
  const { conversionFactor } = resolveProductUnitDetails(product, unitCatalog);
  const factor = conversionFactor > 0 ? conversionFactor : 1;
  // Only meaningful to divide when the product actually comes in packs (factor > 1).
  const isPack = (product as any).price_basis === "pack" && factor > 1;
  const toPerPiece = (v: number) => (isPack ? v / factor : v);

  const onlineRaw =
    (product as any).online_price !== undefined &&
    (product as any).online_price !== null &&
    Number((product as any).online_price) > 0
      ? Number((product as any).online_price)
      : null;

  const rawListSelling = Number(product.selling_price) || 0;
  const rawSelling = onlineRaw !== null ? onlineRaw : rawListSelling;
  const rawMrp = Number(product.mrp) || 0;
  const rawPurchase = Number(product.purchase_price) || 0;
  const rawWholesale = Number(product.wholesale_price) || 0;

  // Selling price is the source of truth and follows the flag exactly — it drives the bill.
  const sellingPerPiece = toPerPiece(rawSelling);
  const listSellingPerPiece = toPerPiece(rawListSelling);

  // MRP, wholesale and cost are sometimes entered in the *other* basis than selling (legacy mixed
  // data). Rather than trust the flag blindly for these, we normalise them by the natural
  // invariants — MRP ≥ price, wholesale ≤ price, cost ≤ price — choosing the per-piece vs per-pack
  // reading that satisfies the invariant. `pick()` returns the reading closest to the selling price
  // among the valid ones, so a clean same-basis value is unchanged.
  const pickPerPiece = (raw: number, kind: "ceiling" | "floor"): number => {
    if (!(raw > 0)) return 0;
    const asIs = toPerPiece(raw); // what the flag says
    if (factor <= 1 || !(sellingPerPiece > 0)) return asIs;
    const alt = isPack ? raw : raw / factor; // the opposite basis
    const ok = (v: number) => (kind === "ceiling" ? v >= sellingPerPiece : v <= sellingPerPiece);
    const asIsOk = ok(asIs);
    const altOk = ok(alt);
    if (asIsOk && altOk) return kind === "ceiling" ? Math.min(asIs, alt) : Math.max(asIs, alt);
    if (altOk && !asIsOk) return alt;
    return asIs;
  };

  const mrpPerPiece = pickPerPiece(rawMrp, "ceiling");
  const purchasePerPiece = pickPerPiece(rawPurchase, "floor");
  const wholesalePerPiece = pickPerPiece(rawWholesale, "floor");

  // Kept at FULL precision (not rounded to paise). Callers round only their final price, so a pack
  // price is exact — e.g. (100/12) × 12 rounds to ₹100, not ₹99.96 from a pre-rounded ₹8.33/pc.
  return {
    conversionFactor: factor,
    sellingPerPiece,
    listSellingPerPiece,
    mrpPerPiece,
    purchasePerPiece,
    wholesalePerPiece,
  };
}

/**
 * Resolves piece price and full-pack price for a product, plus the price for a chosen multiplier.
 * Deterministic: piece = per-piece selling, pack = per-piece × conversionFactor.
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
  const { conversionFactor, sellingPerPiece } = resolvePerPiecePrices(product, unitCatalog);
  const mult = Number(unitMultiplier) > 0 ? Number(unitMultiplier) : 1;
  return {
    piecePrice: round2(sellingPerPiece),
    packPrice: round2(sellingPerPiece * conversionFactor),
    conversionFactor,
    unitPrice: round2(sellingPerPiece * mult),
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

  // Generic quick-quantity shortcut for loose products, e.g. "qty_12" = 12 pieces.
  if (typeof unitKey === "string" && unitKey.startsWith("qty_")) {
    const n = parseInt(unitKey.slice(4), 10);
    if (Number.isFinite(n) && n > 0) return n;
  }

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
  const { conversionFactor, sellingPerPiece, mrpPerPiece, wholesalePerPiece } =
    resolvePerPiecePrices(product, unitCatalog);
  const wholesaleMinQty = Number(product.wholesale_min_qty) || conversionFactor || 12;

  return {
    piecePrice: round2(sellingPerPiece),
    packPrice: round2(sellingPerPiece * conversionFactor),
    conversionFactor,
    mrp: mrpPerPiece > 0 ? round2(mrpPerPiece) : round2(sellingPerPiece),
    packMrp: mrpPerPiece > 0 ? round2(mrpPerPiece * conversionFactor) : round2(sellingPerPiece * conversionFactor),
    wholesalePerPiece: wholesalePerPiece > 0 ? round2(wholesalePerPiece) : round2(sellingPerPiece),
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
  const { conversionFactor, sellingPerPiece, listSellingPerPiece, mrpPerPiece, wholesalePerPiece } =
    resolvePerPiecePrices(product, unitCatalog);

  const regularUnitPrice = round2(sellingPerPiece * multiplier);
  // The struck-through "was" price: the higher of MRP, undiscounted selling, and the live price.
  const originalPerPiece = Math.max(mrpPerPiece, listSellingPerPiece, sellingPerPiece);
  const originalPrice = round2(originalPerPiece * multiplier);

  const wholesaleMinQty = Number(product.wholesale_min_qty) || conversionFactor || 12;

  // Wholesale kicks in once the total base pieces reach the threshold.
  if (wholesalePerPiece > 0 && totalPieces >= wholesaleMinQty) {
    const wholesaleUnitPrice = round2(wholesalePerPiece * multiplier);
    const savings = Math.max(0, regularUnitPrice - wholesaleUnitPrice);
    return {
      unitPrice: wholesaleUnitPrice,
      originalPrice: Math.max(originalPrice, regularUnitPrice),
      isWholesaleTriggered: true,
      totalPieces,
      savingsPerUnit: round2(savings),
    };
  }

  return {
    unitPrice: regularUnitPrice,
    originalPrice,
    isWholesaleTriggered: false,
    totalPieces,
    savingsPerUnit: round2(Math.max(0, originalPrice - regularUnitPrice)),
  };
}

/**
 * Pieces contained in ONE storefront / online-order unit for this product.
 *
 * The public store (and the online checkout) sells a product in the SAME unit its card shows:
 *  - price_basis 'pack'  → the customer buys whole packs, so 1 unit = conversion_factor pieces.
 *  - price_basis 'piece' → the customer buys loose pieces, so 1 unit = 1 piece, even if the product
 *    also has a pack unit defined (that pack unit only exists for POS pack-breaking at the counter).
 * Inventory is deducted as quantity × this value.
 */
export function getStorefrontUnitPieces(product: Product, unitCatalog?: Unit[]): number {
  const { conversionFactor } = resolveProductUnitDetails(product, unitCatalog);
  const isPack = (product as any).price_basis === "pack" && conversionFactor > 1;
  return isPack ? conversionFactor : 1;
}

/**
 * Price of ONE storefront unit (a pack for pack-basis products, a piece otherwise) — exactly the
 * price the product card shows, so the drawer, the cart page, the totals and the recorded order all
 * agree with what the customer saw. Wholesale kicks in once the order reaches the piece threshold.
 *
 * This is the storefront counterpart of getEffectiveItemPrice (which resolves to loose pieces for
 * the in-store POS). Using the POS "piece" price on the storefront billed pack products at
 * 1/conversion_factor of their price — e.g. an ₹84 box was charged as ₹7.
 */
export function getStorefrontItemPrice(
  product: Product,
  quantity: number = 1,
  unitCatalog?: Unit[]
): {
  unitPrice: number;
  originalPrice: number;
  isWholesaleTriggered: boolean;
  totalPieces: number;
  unitPieces: number;
  savingsPerUnit: number;
} {
  const unitPieces = getStorefrontUnitPieces(product, unitCatalog);
  const qty = Number(quantity) > 0 ? Number(quantity) : 1;
  const totalPieces = qty * unitPieces;

  // The card price: online_price when set, otherwise selling_price — already in the product's basis.
  const displayPrice = getProductEffectiveOnlinePrice(product);
  const listSelling = Number(product.selling_price) || displayPrice;
  const rawMrp = Number(product.mrp) || 0;
  const rawWholesale = Number(product.wholesale_price) || 0;
  const minQty = Number(product.wholesale_min_qty) || 0;

  let unitPrice = displayPrice;
  let isWholesaleTriggered = false;
  if (rawWholesale > 0 && minQty > 0 && totalPieces >= minQty && rawWholesale < displayPrice) {
    unitPrice = rawWholesale;
    isWholesaleTriggered = true;
  }

  // Strikethrough "was" price: the highest of MRP, undiscounted selling and the live price, read
  // from the raw values so a stray per-piece MRP on a pack product can never drop below the price.
  const originalPrice = Math.max(rawMrp, listSelling, unitPrice);

  return {
    unitPrice: round2(unitPrice),
    originalPrice: round2(originalPrice),
    isWholesaleTriggered,
    totalPieces,
    unitPieces,
    savingsPerUnit: round2(Math.max(0, originalPrice - unitPrice)),
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
  if (unitKey.startsWith("qty_")) {
    const n = parseInt(unitKey.slice(4), 10);
    if (Number.isFinite(n) && n > 0) return `${quantity} × ${n} Pcs`;
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
