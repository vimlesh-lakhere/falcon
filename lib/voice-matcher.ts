import { Product } from "@/types/database";

/**
 * Normalizes text for comparison: lowercases, removes special characters, and trims extra spaces.
 */
export function normalizeText(text: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .replace(/[^\w\s\u0900-\u097F]/gi, " ") // keep alphanumeric and Devanagari characters
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Calculates Levenshtein edit distance between two strings.
 */
function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Calculates normalized similarity score between 0 and 1 using Levenshtein distance.
 */
function stringSimilarity(s1: string, s2: string): number {
  const norm1 = normalizeText(s1);
  const norm2 = normalizeText(s2);

  if (norm1 === norm2) return 1.0;
  if (!norm1 || !norm2) return 0.0;

  const maxLen = Math.max(norm1.length, norm2.length);
  if (maxLen === 0) return 1.0;

  const distance = levenshteinDistance(norm1, norm2);
  return Math.max(0, 1 - distance / maxLen);
}

/**
 * Calculates token-based overlap similarity (e.g. "clinic plus shampoo" vs "clinic plus").
 */
function tokenSimilarity(spoken: string, target: string): number {
  const spokenTokens = normalizeText(spoken).split(" ").filter(Boolean);
  const targetTokens = normalizeText(target).split(" ").filter(Boolean);

  if (spokenTokens.length === 0 || targetTokens.length === 0) return 0;

  let matchedScore = 0;

  for (const sToken of spokenTokens) {
    let bestTokenMatch = 0;
    for (const tToken of targetTokens) {
      if (sToken === tToken) {
        bestTokenMatch = 1;
        break;
      }
      // Substring match
      if (tToken.includes(sToken) || sToken.includes(tToken)) {
        bestTokenMatch = Math.max(bestTokenMatch, 0.85);
      } else {
        const sim = stringSimilarity(sToken, tToken);
        if (sim > bestTokenMatch) {
          bestTokenMatch = sim;
        }
      }
    }
    matchedScore += bestTokenMatch;
  }

  return matchedScore / spokenTokens.length;
}

export interface VoiceMatchResult {
  bestMatch: Product | null;
  confidence: number;
  correctedQuery: string;
  originalSpoken: string;
  matchedAlternativeIndex?: number;
}

/**
 * Dynamically compares speech-to-text transcript alternatives against the entire live products list.
 * Works for all current and future products automatically.
 */
export function findBestVoiceProductMatch(
  spokenAlternatives: string[],
  products: Product[]
): VoiceMatchResult {
  if (!spokenAlternatives || spokenAlternatives.length === 0 || !products || products.length === 0) {
    return {
      bestMatch: null,
      confidence: 0,
      correctedQuery: spokenAlternatives?.[0] || "",
      originalSpoken: spokenAlternatives?.[0] || "",
    };
  }

  const primarySpoken = spokenAlternatives[0].trim();
  let highestScore = 0;
  let matchedProduct: Product | null = null;
  let bestSpokenAltIndex = 0;

  for (let altIdx = 0; altIdx < spokenAlternatives.length; altIdx++) {
    const spoken = spokenAlternatives[altIdx].trim();
    if (!spoken) continue;

    const normSpoken = normalizeText(spoken);

    for (const product of products) {
      if (!product.is_active && (product as any).is_active === false) continue;

      // 1. Direct barcode / SKU match
      if (
        (product.barcode && product.barcode.toLowerCase() === normSpoken) ||
        (product.sku && product.sku.toLowerCase() === normSpoken)
      ) {
        return {
          bestMatch: product,
          confidence: 1.0,
          correctedQuery: product.name,
          originalSpoken: spoken,
          matchedAlternativeIndex: altIdx,
        };
      }

      // 2. Exact name or Hindi name match
      if (
        product.name.toLowerCase() === normSpoken ||
        (product.name_hindi && product.name_hindi.toLowerCase() === normSpoken)
      ) {
        return {
          bestMatch: product,
          confidence: 1.0,
          correctedQuery: product.name,
          originalSpoken: spoken,
          matchedAlternativeIndex: altIdx,
        };
      }

      // 3. Compute fuzzy string similarity and token similarity
      const nameSim = stringSimilarity(normSpoken, product.name);
      const nameTokenSim = tokenSimilarity(normSpoken, product.name);

      let hindiSim = 0;
      let hindiTokenSim = 0;
      if (product.name_hindi) {
        hindiSim = stringSimilarity(normSpoken, product.name_hindi);
        hindiTokenSim = tokenSimilarity(normSpoken, product.name_hindi);
      }

      let brandSim = 0;
      if (product.brand) {
        brandSim = tokenSimilarity(normSpoken, product.brand) * 0.7;
      }

      // Weighted score
      const combinedScore = Math.max(
        nameSim * 0.4 + nameTokenSim * 0.6,
        hindiSim * 0.4 + hindiTokenSim * 0.6,
        brandSim
      );

      // Boost score if product name contains spoken query as whole phrase
      let boost = 0;
      const normProdName = normalizeText(product.name);
      if (normProdName.includes(normSpoken)) {
        boost = 0.25;
      }

      const totalScore = Math.min(1.0, combinedScore + boost);

      if (totalScore > highestScore) {
        highestScore = totalScore;
        matchedProduct = product;
        bestSpokenAltIndex = altIdx;
      }
    }
  }

  return {
    bestMatch: matchedProduct,
    confidence: Number(highestScore.toFixed(2)),
    correctedQuery: matchedProduct ? matchedProduct.name : primarySpoken,
    originalSpoken: spokenAlternatives[bestSpokenAltIndex] || primarySpoken,
    matchedAlternativeIndex: bestSpokenAltIndex,
  };
}
