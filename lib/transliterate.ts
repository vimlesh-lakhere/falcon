/**
 * Phonetic Transliteration Utility (ध्वन्यात्मक लिप्यंतरण)
 * Converts English product names and brand titles to Hindi Devanagari script
 * strictly sound-by-sound (Phonetic Transliteration), avoiding dictionary translations.
 * 
 * E.g.:
 * "Fair & Lovely Cream" -> "फेयर एंड लवली क्रीम"
 * "Dove Shampoo 180ml" -> "डव शैम्पू 180ml"
 * "Patanjali Dant Kanti" -> "पतंजलि दंत कांति"
 * "Parachute Coconut Oil 100ml" -> "पैराशूट कोकोनट ऑयल 100ml"
 */

// In-memory cache for transliterated words to avoid duplicate network requests
export const TRANSLITERATION_CACHE = new Map<string, string>();

// Common retail & FMCG terminology phonetic overrides for 100% accuracy & 0ms instant typing
export const PHONETIC_PRESETS: Record<string, string> = {
  // Punctuation & Connectors
  "&": "एंड",
  "+": "प्लस",
  "and": "एंड",
  "or": "या",
  "with": "विद",
  "for": "फॉर",
  "in": "इन",
  "of": "ऑफ",
  "the": "",

  // Descriptors, Sizes & Offers
  "free": "फ्री",
  "deal": "डील",
  "offer": "ऑफर",
  "pack": "पैक",
  "combo": "कॉम्बो",
  "saver": "सेवर",
  "refill": "रीफिल",
  "pouch": "पाउच",
  "bottle": "बोतल",
  "jar": "जार",
  "can": "कैन",
  "box": "बॉक्स",
  "mini": "मिनी",
  "super": "सुपर",
  "extra": "एक्स्ट्रा",
  "long": "लॉन्ग",
  "xl": "XL",
  "xxl": "XXL",
  "large": "लार्ज",
  "medium": "मीडियम",
  "small": "स्मॉल",
  "big": "बड़ा",
  "standard": "स्टैंडर्ड",

  // Personal Care, Cosmetics & Grooming
  "fair": "फेयर",
  "lovely": "लवली",
  "glow": "ग्लो",
  "cream": "क्रीम",
  "shampoo": "शैम्पू",
  "soap": "सोप",
  "sabun": "साबुन",
  "oil": "ऑयल",
  "tel": "तेल",
  "hair": "हेयर",
  "lotion": "लोशन",
  "powder": "पाउडर",
  "paste": "पेस्ट",
  "toothpaste": "टूथपेस्ट",
  "brush": "ब्रश",
  "toothbrush": "टूथब्रश",
  "dant": "दंत",
  "kanti": "कांति",
  "patanjali": "पतंजलि",
  "colgate": "कोलगेट",
  "pepsodent": "पेप्सोडेंट",
  "close": "क्लोज",
  "closeup": "क्लोजअप",
  "sensodyne": "सेंसोडाइन",
  "vicco": "विक्को",
  "meswak": "मेस्वाक",
  "babool": "बबूल",
  "dove": "डव",
  "lux": "लक्स",
  "lifebuoy": "लाइफबॉय",
  "dettol": "डेटॉल",
  "cinthol": "सिंथोल",
  "santoor": "संतूर",
  "pears": "पियर्स",
  "medimix": "मेडिमिक्स",
  "vivel": "विवेल",
  "fiama": "फियामा",
  "himalaya": "हिमालय",
  "ponds": "पॉन्ड्स",
  "nivea": "निविया",
  "garnier": "गार्नियर",
  "vaseline": "वेसलीन",
  "parachute": "पैराशूट",
  "pure": "प्योर",
  "coconut": "कोकोनट",
  "multi": "मल्टी",
  "vitamin": "विटामिन",
  "smooth": "स्मूथ",
  "silky": "सिल्की",
  "come": "कम",
  "go": "गो",
  "cool": "कूल",
  "mint": "मिंट",
  "lemon": "लेमन",
  "neem": "नीम",
  "tulsi": "तुलसी",
  "kesar": "केसर",
  "chandan": "चंदन",
  "boro": "बोरो",
  "boroline": "बोरोलीन",
  "boroplus": "बोरोप्लस",
  "boroneem": "बोरोनीम",
  "prickly": "प्रिकली",
  "heat": "हीट",
  "face": "फेस",
  "wash": "वॉश",
  "facewash": "फेसवाश",
  "body": "बॉडी",
  "scrub": "स्क्रब",
  "gel": "जेल",
  "talc": "टैल्क",
  "talcum": "टैल्कम",
  "sunscreen": "सनस्क्रीन",
  "deodorant": "डिओडोरेंट",
  "deo": "डिओ",
  "spray": "स्प्रे",
  "perfume": "परफ्यूम",
  "bajaj": "बजाज",
  "dabur": "डाबर",
  "amla": "आंवला",
  "almond": "बादाम",
  "gulabari": "गुलाबरी",
  "rose": "रोज",
  "water": "वाटर",
  "serum": "सीरम",
  "conditioner": "कंडीशनर",
  "lipstick": "लिपस्टिक",
  "lip": "लिप",
  "balm": "बाम",
  "kajal": "काजल",
  "eyeliner": "आईलाइनर",
  "mascara": "मस्कारा",
  "foundation": "फाउंडेशन",
  "compact": "कॉम्पैक्ट",
  "nail": "नेल",
  "polish": "पॉलिश",
  "remover": "रिमूवर",
  "mehndi": "मेहंदी",
  "henna": "हिना",
  "color": "कलर",
  "natural": "नेचुरल",
  "black": "ब्लैक",
  "brown": "ब्राउन",
  "gold": "गोल्ड",
  "diamond": "डायमंड",
  "silver": "सिल्वर",
  "skin": "स्किन",
  "clear": "क्लियर",
  "joy": "जॉय",
  "charmis": "चारमिस",
  "lotus": "लोटस",
  "biotique": "बायोटिक",
  "vlcc": "वीएलसीसी",
  "lakme": "लक्मे",
  "maybelline": "मेबेलिन",
  "colorbar": "कलरबार",
  "elle18": "एले 18",
  "fogg": "फॉग्ग",
  "axe": "एक्स",
  "engage": "एंगेज",
  "wild": "वाइल्ड",
  "stone": "स्टोन",
  "denim": "डेनिम",
  "park": "पार्क",
  "avenue": "एवेन्यू",
  "yardley": "यार्डले",
  "set": "सेट",
  "wet": "वेट",
  "comb": "कंघा",
  "kangha": "कंघा",
  "towel": "तौलिया",
  "purse": "पर्स",
  "band": "बैंड",
  "suedhaga": "सुई धागा",
  "sue": "सुई",
  "sui": "सुई",
  "dhaga": "धागा",
  "tabeej": "ताबीज",
  "taar": "तार",

  // Feminine Hygiene & Baby Care
  "pad": "पैड",
  "pads": "पैड्स",
  "sanitary": "सैनिटरी",
  "napkin": "नैपकिन",
  "napkins": "नैपकिन्स",
  "whisper": "व्हिस्पर",
  "stayfree": "स्टेफ्री",
  "sofy": "सोफी",
  "carefree": "केयरफ्री",
  "cotton": "कॉटन",
  "bandage": "पट्टी",
  "diaper": "डायपर",
  "pampers": "पैम्पर्स",
  "mamy": "मैमी",
  "poko": "पोको",
  "pants": "पैंट्स",
  "wipes": "वाइप्स",
  "huggies": "हगीज",

  // Grocery, Food & Staples
  "tea": "चाय",
  "chai": "चाय",
  "patti": "पत्ती",
  "coffee": "कॉफ़ी",
  "sugar": "चीनी",
  "salt": "नमक",
  "atta": "आटा",
  "chawal": "चावल",
  "rice": "चावल",
  "dal": "दाल",
  "besan": "बेसन",
  "maida": "मैदा",
  "suji": "सूजी",
  "sooji": "सूजी",
  "rava": "रवा",
  "masala": "मसाला",
  "haldi": "हल्दी",
  "mirch": "मिर्च",
  "dhaniya": "धनिया",
  "jeera": "जीरा",
  "garam": "गरम",
  "hing": "हींग",
  "rai": "राई",
  "methi": "मेथी",
  "saunf": "सौंफ",
  "ajwain": "अजवाइन",
  "elaichi": "इलायची",
  "laung": "लौंग",
  "biscuit": "बिस्कुट",
  "cookies": "कुकीज",
  "rusk": "टोस्ट",
  "toast": "टोस्ट",
  "bread": "ब्रेड",
  "namkeen": "नमकीन",
  "chips": "चिप्स",
  "bhujia": "भुजिया",
  "sev": "सेव",
  "mixture": "मिक्सचर",
  "maggi": "मैगी",
  "noodles": "नूडल्स",
  "pasta": "पास्ता",
  "sauce": "सॉस",
  "ketchup": "केचप",
  "jam": "जैम",
  "honey": "शहद",
  "ghee": "घी",
  "butter": "मक्खन",
  "paneer": "पनीर",
  "cheese": "चीज",
  "milk": "दूध",
  "doodh": "दूध",
  "dahi": "दही",
  "curd": "दही",
  "lassi": "लस्सी",

  // Detergents & Home Cleaning
  "detergent": "डिटर्जेंट",
  "surf": "सर्फ",
  "excel": "एक्सेल",
  "tide": "टाइड",
  "aerial": "एरियल",
  "ariel": "एरियल",
  "wheel": "व्हील",
  "ghari": "घड़ी",
  "rin": "रिन",
  "nirma": "निरमा",
  "vim": "विम",
  "bar": "बार",
  "cake": "केक",
  "liquid": "लिक्विड",
  "cleaner": "क्लीनर",
  "phenyl": "फिनाइल",
  "harpic": "हार्पिक",
  "lizol": "लाइसोल",
  "colin": "कोलिन",
  "domex": "डोमेक्स",
  "odonil": "ओडोनिल",
  "goodknight": "गुडनाइट",
  "allout": "ऑलआउट",
  "hit": "हिट",
  "mortein": "मोर्टिन",
  "agarbatti": "अगरबत्ती",
  "dhoop": "धूप",
  "batti": "बत्ती",
  "matchbox": "माचिस",
  "candle": "मोमबत्ती",
  "camphor": "कपूर",
  "kapoor": "कपूर",

  // Over The Counter & Health
  "savlon": "सैवलोन",
  "moov": "मूव",
  "iodex": "आयोडिक्स",
  "volini": "वोलिनी",
  "vicks": "विकस",
  "vaporub": "वेपोरब",
  "inhaler": "इन्हेलर",
  "disprin": "डिस्प्रिन",
  "combiflam": "कॉम्बीफ्लेम",
  "paracetamol": "पैरासिटामोल",
  "crocin": "क्रोसिन",
  "eno": "ईनो",
  "pudinhara": "पुदीनहरा",
  "gelusil": "जेलुसिल",
  "hajmola": "हाजमोला",
  "churan": "चूरन",
  "glucose": "ग्लूकोज",
  "glucon": "ग्लूकॉन",
  "tang": "टैंग",
  "rasna": "रसना",
  "roohafza": "रूहअफ़ज़ा",
  "frooti": "फ्रूटी",
  "maaza": "माज़ा",
  "slice": "स्लाइस",
  "thums": "थम्स",
  "up": "अप",
  "coke": "कोक",
  "pepsi": "पेप्सी",
  "sprite": "स्प्राइट",
  "fanta": "फैंटा",
  "limca": "लिम्का",
  "mirinda": "मिरिंडा",
  "sting": "स्टिंग",
  "redbull": "रेडबुल",
  "amul": "अमुल",
  "britannia": "ब्रिटानिया",
  "parle": "पारले",
  "sunfeast": "सनफीस्ट",
  "cadbury": "कैडबरी",
  "dairy": "डेयरी",
  "nestle": "नेस्ले",
  "kitkat": "किटकेट",
  "munch": "मंच",
  "perk": "पर्क",
  "snickers": "स्निकर्स",
  "5star": "5स्टार",
  "kurkure": "कुरकुरे",
  "lays": "लेज",
  "bingo": "बिंगो",
  "haldiram": "हल्दीराम",
  "bikaji": "बीकाजी",
  "balaji": "बालाजी",
  "everest": "एवरेस्ट",
  "mdh": "एमडीएच",
  "catch": "कैच",
  "goldiee": "गोल्डी",
  "fortune": "फॉर्च्यून",
  "saffola": "सफोला",
  "dhara": "धारा",
  "gemini": "जेमिनी",
  "tata": "टाटा",
  "aashirvaad": "आशीर्वाद",
  "pillsbury": "पिल्सबरी",
  "nature": "नेचर",
  "fresh": "फ्रेश",
  "taj": "ताज",
  "mahal": "महल",
  "red": "रेड",
  "label": "लेबल",
  "wagh": "वाघ",
  "bakri": "बकरी",
  "society": "सोसायटी",
  "lipton": "लिप्टन",
  "green": "ग्रीन",
  "horlicks": "हॉर्लिक्स",
  "bournvita": "बॉर्नविटा",
  "complan": "कॉम्प्लान",
  "boost": "बूस्ट",
  "pediasure": "पीडियाश्योर",
  "ensure": "एंश्योर",
};

/**
 * Synchronously transliterates tokens using local presets and memory cache.
 * Gives 0ms instant feedback while typing without network round-trips!
 */
export function transliterateSync(text: string): string {
  if (!text || !text.trim()) return "";
  const clean = text.trim();
  const lower = clean.toLowerCase();

  // If already full match in cache
  if (TRANSLITERATION_CACHE.has(lower)) {
    return TRANSLITERATION_CACHE.get(lower)!;
  }

  // Split tokens while preserving units and special separators
  const tokens = clean.split(/(\s+|[-/&+,()])/).filter(Boolean);
  const results = tokens.map((token) => {
    // If whitespace or punctuation
    if (/^[\s/\\+()\-.,]+$/.test(token)) {
      return token;
    }
    if (token === "&") {
      return " एंड ";
    }
    // Numbers, units (100ml, 50g, 1kg, 2L, 500gm, ₹50, 100%), or symbols pass through directly
    if (/^[₹$€]?[\d.,/%-]+(ml|g|gm|kg|l|ltr|oz|pc|pcs|pk|pack|s|m|l|xl|xxl)?$/i.test(token)) {
      return token;
    }

    const tLower = token.toLowerCase();
    if (PHONETIC_PRESETS[tLower]) {
      return PHONETIC_PRESETS[tLower];
    }
    if (TRANSLITERATION_CACHE.has(tLower)) {
      return TRANSLITERATION_CACHE.get(tLower)!;
    }

    // Return original word if not in presets or cache
    return token;
  });

  return results.join("").replace(/\s+/g, " ").trim();
}

/**
 * Transliterates a single English word to Hindi using phonetic API or preset cache
 */
async function transliterateSingleWord(word: string): Promise<string> {
  const clean = word.trim();
  if (!clean) return "";

  // Numbers, units (100ml, 50g, 1kg, 2L, 500gm), or symbols pass through directly
  if (/^[₹$€]?[\d.,/%-]+(ml|g|gm|kg|l|ltr|oz|pc|pcs|pk|pack|s|m|l|xl|xxl)?$/i.test(clean)) {
    return clean;
  }

  const lower = clean.toLowerCase();

  // 1. Check presets
  if (PHONETIC_PRESETS[lower]) {
    return PHONETIC_PRESETS[lower];
  }

  // 2. Check memory cache
  if (TRANSLITERATION_CACHE.has(lower)) {
    return TRANSLITERATION_CACHE.get(lower)!;
  }

  // 3. Query Google Phonetic Input Tools API
  try {
    const url = `https://inputtools.google.com/request?text=${encodeURIComponent(clean)}&itc=hi-t-i0-und&num=1&cp=0&cs=1&ie=utf-8&oe=utf-8`;
    const res = await fetch(url, { method: "GET" });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data[0] === "SUCCESS" && Array.isArray(data[1])) {
        const matches = data[1][0]?.[1];
        if (Array.isArray(matches) && matches.length > 0) {
          const hindiWord = matches[0];
          TRANSLITERATION_CACHE.set(lower, hindiWord);
          return hindiWord;
        }
      }
    }
  } catch (err) {
    // Network or offline fallback
    console.warn(`Transliteration request failed for "${clean}"`, err);
  }

  return clean;
}

/**
 * Phonetically transliterates a full product name / sentence to Hindi.
 * Example: "Fair & Lovely Multi Vitamin Cream 50g" -> "फेयर एंड लवली मल्टी विटामिन क्रीम 50g"
 */
export async function transliterateToHindi(text: string): Promise<string> {
  if (!text || !text.trim()) return "";
  const clean = text.trim();
  const lower = clean.toLowerCase();

  // 1. Check in-memory cache
  if (TRANSLITERATION_CACHE.has(lower)) {
    return TRANSLITERATION_CACHE.get(lower)!;
  }

  // 2. Query internal Next.js API route (no CORS, server-side Google Input Tools & presets)
  if (typeof window !== "undefined") {
    try {
      const res = await fetch("/api/transliterate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: clean }),
      });
      if (res.ok) {
        const json = await res.json().catch(() => ({}));
        if (json.success && json.hindi) {
          TRANSLITERATION_CACHE.set(lower, json.hindi);
          return json.hindi;
        }
      }
    } catch (apiErr) {
      console.warn("Transliterate API notice, falling back to local presets:", apiErr);
    }
  }

  // 3. Fallback: Split tokens while preserving units and special separators
  const tokens = clean.split(/(\s+|[-/&+,()])/).filter(Boolean);
  const results = await Promise.all(
    tokens.map(async (token) => {
      // If whitespace or punctuation separator
      if (/^[\s/\\+()\-.,]+$/.test(token)) {
        return token;
      }
      if (token === "&") {
        return " एंड ";
      }
      return await transliterateSingleWord(token);
    })
  );

  const fallbackResult = results.join("").replace(/\s+/g, " ").trim();
  if (fallbackResult) {
    TRANSLITERATION_CACHE.set(lower, fallbackResult);
  }
  return fallbackResult;
}
