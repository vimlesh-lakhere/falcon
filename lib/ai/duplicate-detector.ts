import { Product } from "@/types/database";
import { DuplicateCheckResult } from "./types";

export const aiDuplicateDetector = {
  checkDuplicate(
    candidate: {
      name: string;
      barcode?: string;
      sku?: string;
    },
    existingProducts: Product[]
  ): DuplicateCheckResult {
    if (!existingProducts || existingProducts.length === 0) {
      return { isDuplicate: false, confidence: 0 };
    }

    // 1. Check Barcode Collision (Exact Match)
    if (candidate.barcode && candidate.barcode.trim()) {
      const match = existingProducts.find(
        (p) => p.barcode && p.barcode.trim().toLowerCase() === candidate.barcode?.trim().toLowerCase()
      );
      if (match) {
        return {
          isDuplicate: true,
          matchType: "barcode",
          matchedProduct: match,
          confidence: 1.0,
          message: `Product with barcode "${candidate.barcode}" already exists in your inventory: "${match.name}".`,
        };
      }
    }

    // 2. Check SKU Collision
    if (candidate.sku && candidate.sku.trim()) {
      const match = existingProducts.find(
        (p) => p.sku && p.sku.trim().toLowerCase() === candidate.sku?.trim().toLowerCase()
      );
      if (match) {
        return {
          isDuplicate: true,
          matchType: "sku",
          matchedProduct: match,
          confidence: 0.95,
          message: `SKU "${candidate.sku}" already matches existing product: "${match.name}".`,
        };
      }
    }

    // 3. Check Name Similarity
    const cleanCandName = candidate.name.trim().toLowerCase();
    if (cleanCandName) {
      const exactNameMatch = existingProducts.find(
        (p) => p.name.trim().toLowerCase() === cleanCandName
      );
      if (exactNameMatch) {
        return {
          isDuplicate: true,
          matchType: "name",
          matchedProduct: exactNameMatch,
          confidence: 0.9,
          message: `A product with the exact name "${exactNameMatch.name}" already exists.`,
        };
      }
    }

    return { isDuplicate: false, confidence: 0 };
  },
};
