/**
 * Smart NLP Parser for Demand Pad Notes (खरीदी पर्ची)
 * Intelligently extracts:
 * - Clean Item Name
 * - Quantity & Units (pcs, pkt, carton, botal, kg, g, l, ml, etc.)
 * - Priority (urgent vs normal)
 * - Distributor/Party hints
 */

export interface ParsedDemandNote {
  itemName: string;
  quantity?: string;
  priority: "normal" | "urgent";
  partyHint?: string;
  rawText: string;
}

// Common Indian retail quantity and packaging units
const UNIT_PATTERNS = [
  "pcs",
  "pc",
  "piece",
  "pieces",
  "pkt",
  "packet",
  "packets",
  "box",
  "boxes",
  "carton",
  "cartons",
  "ctn",
  "case",
  "cases",
  "botal",
  "bottle",
  "bottles",
  "strip",
  "strips",
  "pouch",
  "pouches",
  "kg",
  "kilo",
  "kilogram",
  "gm",
  "g",
  "gram",
  "grams",
  "ltr",
  "l",
  "liter",
  "litre",
  "litres",
  "ml",
  "dozen",
  "dz",
  "bori",
  "bag",
  "bags",
  "पीस",
  "पैकेट",
  "बोरी",
  "पेटी",
  "कार्टन",
  "बोतल",
  "किलो",
];

const URGENT_KEYWORDS = [
  "urgent",
  "emergency",
  "fast",
  "jaldi",
  "jaruri",
  "important",
  "priority",
  "turant",
  "जरूरी",
  "अर्जेंट",
  "तुरंत",
];

/**
 * Parses a single line of demand text into structured components
 */
export function parseSingleDemandNote(
  rawInput: string,
  knownParties: string[] = []
): ParsedDemandNote {
  let text = rawInput.trim();
  if (!text) {
    return { itemName: "", priority: "normal", rawText: "" };
  }

  // 1. Remove leading list numbering or bullets (e.g. "1.", "1)", "-", "•", "*")
  text = text.replace(/^(\d+[\.\)]\s*|[\-\*\•\+]\s*)/, "").trim();

  // 2. Detect Priority (Urgent)
  let priority: "normal" | "urgent" = "normal";
  for (const uWord of URGENT_KEYWORDS) {
    const uRegex = new RegExp(`\\b${uWord}\\b|\\(${uWord}\\)`, "i");
    if (uRegex.test(text)) {
      priority = "urgent";
      text = text.replace(uRegex, "").trim();
      break;
    }
  }

  // 3. Detect Party / Distributor Hint
  let partyHint: string | undefined;

  // Check prefix format like "HUL: Dove 180ml" or "[Patanjali] Dant Kanti"
  const prefixMatch = text.match(/^\[?([a-zA-Z0-9\s&]+)\]?\s*:\s*(.+)$/);
  if (prefixMatch && prefixMatch[1] && prefixMatch[2]) {
    partyHint = prefixMatch[1].trim();
    text = prefixMatch[2].trim();
  } else if (knownParties.length > 0) {
    // Check if starts with a known supplier name
    for (const party of knownParties) {
      if (party.toLowerCase() === "general") continue;
      const partyRegex = new RegExp(`^${party}\\b\\s*[:\\-]?\\s*`, "i");
      if (partyRegex.test(text)) {
        partyHint = party;
        text = text.replace(partyRegex, "").trim();
        break;
      }
    }
  }

  // 4. Detect Quantity
  let quantity: string | undefined;

  // Pattern A: Trailing multiplier or count e.g. "Dove 180ml x 12" or "Dove 180ml * 12"
  const multiplierMatch = text.match(/\s*[xX\*]\s*(\d+(?:\.\d+)?)\s*$/);
  if (multiplierMatch && multiplierMatch[1]) {
    quantity = `${multiplierMatch[1]} pcs`;
    text = text.slice(0, multiplierMatch.index).trim();
  }

  // Pattern B: Trailing unit & number e.g. "Maggi 70g 24 pcs" or "Fortune oil 5 botal" or "Sugar 10 kg"
  if (!quantity) {
    const unitRegex = new RegExp(
      `\\b(\\d+(?:\\.\\d+)?)\\s*(${UNIT_PATTERNS.join("|")})\\.?\\s*$`,
      "i"
    );
    const unitMatch = text.match(unitRegex);
    if (unitMatch && unitMatch[1] && unitMatch[2]) {
      quantity = `${unitMatch[1]} ${unitMatch[2]}`.trim();
      text = text.slice(0, unitMatch.index).trim();
    }
  }

  // Pattern C: Trailing standalone number e.g. "Dove soap 12" or "Dairy Milk 20"
  if (!quantity) {
    const numMatch = text.match(/\s+(\d+)\s*$/);
    if (numMatch && numMatch[1]) {
      const numVal = parseInt(numMatch[1], 10);
      // Avoid treating product weight/size (e.g. 180, 200, 500) as count unless clearly a quantity
      // Only treat numbers <= 100 as quantity count if not preceded by size units
      const beforeNumber = text.slice(0, numMatch.index).toLowerCase();
      const isSize = /(ml|gm|g|kg|l|ltr|mg)$/.test(beforeNumber);
      if (!isSize && numVal <= 100) {
        quantity = `${numVal} pcs`;
        text = text.slice(0, numMatch.index).trim();
      }
    }
  }

  // 5. Pattern D: Leading quantity e.g. "12 pcs Dove shampoo" or "2 carton Maggi"
  if (!quantity) {
    const leadingRegex = new RegExp(
      `^(\\d+(?:\\.\\d+)?)\\s*(${UNIT_PATTERNS.join("|")})\\.?\\s+`,
      "i"
    );
    const leadingMatch = text.match(leadingRegex);
    if (leadingMatch && leadingMatch[1] && leadingMatch[2]) {
      quantity = `${leadingMatch[1]} ${leadingMatch[2]}`.trim();
      text = text.replace(leadingRegex, "").trim();
    }
  }

  // Clean remaining symbols
  text = text.replace(/[\-–—:\,\(\)]+$/, "").trim();

  return {
    itemName: text,
    quantity,
    priority,
    partyHint,
    rawText: rawInput.trim(),
  };
}

/**
 * Parses multi-line bulk pasted text into an array of structured demand notes
 */
export function parseBulkDemandText(
  bulkInput: string,
  defaultParty: string = "General",
  knownParties: string[] = []
): Array<{
  itemName: string;
  quantity?: string;
  groupName: string;
  priority: "normal" | "urgent";
}> {
  const lines = bulkInput
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const results: Array<{
    itemName: string;
    quantity?: string;
    groupName: string;
    priority: "normal" | "urgent";
  }> = [];

  let currentParty = defaultParty;

  for (const line of lines) {
    // Check if this line is a party/header indicator e.g. "--- HUL Items ---" or "[Nestle]" or "Sharma Agencies:"
    const headerMatch = line.match(/^[\-=\*#]*\s*\[?([a-zA-Z0-9\s&]{3,30})\]?\s*[\-=\*#:]*$/);
    if (headerMatch && headerMatch[1]) {
      const candidateParty = headerMatch[1].trim();
      const isKnown = knownParties.some(
        (kp) => kp.toLowerCase() === candidateParty.toLowerCase()
      );
      if (isKnown || candidateParty.length < 20) {
        currentParty = candidateParty;
        continue;
      }
    }

    const parsed = parseSingleDemandNote(line, knownParties);
    if (parsed.itemName) {
      results.push({
        itemName: parsed.itemName,
        quantity: parsed.quantity,
        groupName: parsed.partyHint || currentParty,
        priority: parsed.priority,
      });
    }
  }

  return results;
}
