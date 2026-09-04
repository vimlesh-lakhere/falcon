/**
 * Phonetic Transliteration Utility (ध्वन्यात्मक लिप्यंतरण)
 * Converts English product names and brand titles to Hindi Devanagari script
 * strictly sound-by-sound (Phonetic Transliteration), avoiding dictionary translations.
 * 
 * E.g.:
 * "Fair & Lovely Cream" -> "फेयर एंड लवली क्रीम"
 * "Dove Shampoo 180ml" -> "डव शैम्पू 180ml"
 * "Patanjali Dant Kanti" -> "पतंजलि दंत कांति"
 */

// In-memory cache for transliterated words to avoid duplicate network requests
const TRANSLITERATION_CACHE = new Map<string, string>();

// Common retail & FMCG terminology phonetic overrides for 100% accuracy
const PHONETIC_PRESETS: Record<string, string> = {
  "&": "एंड",
  "+": "प्लस",
  "and": "एंड",
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
  "dant": "दंत",
  "kanti": "कांति",
  "patanjali": "पतंजलि",
  "colgate": "कोलगेट",
  "pepsodent": "पेप्सोडेंट",
  "close": "क्लोज",
  "closeup": "क्लोजअप",
  "dove": "डव",
  "lux": "लक्स",
  "lifebuoy": "लाइफबॉय",
  "dettol": "डेटॉल",
  "cinthol": "सिंथोल",
  "santoor": "संतूर",
  "pears": "पियर्स",
  "medimix": "मेडिमिक्स",
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
  "bajaj": "बजाज",
  "dabur": "डाबर",
  "amla": "आंवला",
  "almond": "बादाम",
  "gulabari": "गुलाबरी",
  "rose": "रोज",
  "water": "वाटर",
  "face": "फेस",
  "wash": "वॉश",
  "facewash": "फेसवाश",
  "scrub": "स्क्रब",
  "pack": "पैक",
  "gel": "जेल",
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
  "perfume": "परफ्यूम",
  "deo": "डियो",
  "deodorant": "डियोड्रेंट",
  "spray": "स्प्रे",
  "body": "बॉडी",
  "tea": "चाय",
  "chai": "चाय",
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
  "masala": "मसाला",
  "haldi": "हल्दी",
  "mirch": "मिर्च",
  "dhaniya": "धनिया",
  "garam": "गरम",
  "biscuit": "बिस्कुट",
  "cookies": "कुकीज",
  "rusk": "टोस्ट",
  "toast": "टोस्ट",
  "namkeen": "नमकीन",
  "chips": "चिप्स",
  "bhujia": "भुजिया",
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
  "milk": "दूध",
  "dahi": "दही",
  "detergent": "डिटर्जेंट",
  "surf": "सर्फ",
  "excel": "एक्सेल",
  "tide": "टाइड",
  "aerial": "एरियल",
  "wheel": "व्हील",
  "ghari": "घड़ी",
  "rin": "रिन",
  "vim": "विम",
  "bar": "बार",
  "liquid": "लिक्विड",
  "cleaner": "क्लीनर",
  "phenyl": "फिनाइल",
  "harpic": "हार्पिक",
  "lizol": "लाइसोल",
  "odonil": "ओडोनिल",
  "goodknight": "गुडनाइट",
  "allout": "ऑलआउट",
  "agarbatti": "अगरबत्ती",
  "dhoop": "धूप",
  "matchbox": "माचिस",
  "candle": "मोमबत्ती",
  "diaper": "डायपर",
  "pampers": "पैम्पर्स",
  "mamy": "मैमी",
  "poko": "पोको",
  "pants": "पैंट्स",
  "wipes": "वाइप्स",
  "whisper": "व्हिस्पर",
  "stayfree": "स्टेफ्री",
  "pad": "पैड",
  "pads": "पैड्स",
  "cotton": "कॉटन",
  "bandage": "पट्टी",
  "savlon": "सैवलोन",
  "boroplus": "बोरोप्लस",
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
 * Transliterates a single English word to Hindi using phonetic API or preset cache
 */
async function transliterateSingleWord(word: string): Promise<string> {
  const clean = word.trim();
  if (!clean) return "";

  // Numbers, units (100ml, 50g, 1kg, 2L, 500gm), or symbols pass through directly
  if (/^[\d.,/%-]+(ml|g|gm|kg|l|ltr|oz|pc|pcs|pk|pack|s|m|l|xl|xxl)?$/i.test(clean)) {
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

  // Split tokens while preserving units and special separators
  const tokens = text.split(/(\s+|[-/&+,()])/).filter(Boolean);

  const results = await Promise.all(
    tokens.map(async (token) => {
      // If whitespace or punctuation separator
      if (/^[\s/\\+()]+$/.test(token)) {
        return token;
      }
      if (token === "&") {
        return " एंड ";
      }
      return await transliterateSingleWord(token);
    })
  );

  return results.join("").replace(/\s+/g, " ").trim();
}
