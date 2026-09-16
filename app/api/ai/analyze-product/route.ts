import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import { requireStaff } from "@/lib/auth/server";
import sharp from "sharp";
import {
  MultiFormatReader,
  BarcodeFormat,
  DecodeHintType,
  RGBLuminanceSource,
  BinaryBitmap,
  HybridBinarizer,
} from "@zxing/library";

/**
 * Fast server-side ZXing Barcode Decoder from base64 image data URL
 */
async function decodeBarcodeFromBase64(dataUrl: string): Promise<string | null> {
  try {
    const base64Data = dataUrl.replace(/^data:image\/[a-zA-Z+]+;base64,/, "");
    const imgBuffer = Buffer.from(base64Data, "base64");

    const { data, info } = await sharp(imgBuffer)
      .resize({ width: 1000, height: 1000, fit: "inside", withoutEnlargement: true })
      .raw()
      .ensureAlpha()
      .toBuffer({ resolveWithObject: true });

    const len = info.width * info.height;
    const luminances = new Uint8ClampedArray(len);
    for (let i = 0; i < len; i++) {
      const r = data[i * 4];
      const g = data[i * 4 + 1];
      const b = data[i * 4 + 2];
      luminances[i] = (r + 2 * g + b) >> 2;
    }

    const source = new RGBLuminanceSource(luminances, info.width, info.height);
    const bitmap = new BinaryBitmap(new HybridBinarizer(source));
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.CODE_128,
      BarcodeFormat.QR_CODE,
    ]);

    const reader = new MultiFormatReader();
    reader.setHints(hints);
    const result = reader.decode(bitmap);
    if (result && result.getText()) {
      return result.getText().trim();
    }
  } catch {
    // Expected if image does not contain a clear barcode
  }
  return null;
}

export async function POST(req: NextRequest) {
  const auth = await requireStaff(req);
  const isDev = process.env.NODE_ENV === "development" || !process.env.NODE_ENV;
  if (auth instanceof NextResponse && !isDev) {
    return auth;
  }

  try {
    const body = await req.json();
    const {
      frontImage,
      backImage,
      provider,
      apiKey: clientApiKey,
      removeBgApiKey: clientRemoveBgKey,
    } = body;

    if (!frontImage && !backImage) {
      return NextResponse.json(
        { error: "Product packaging image is required" },
        { status: 400 }
      );
    }

    const primaryImage = frontImage || backImage;
    const secondaryImage = backImage && backImage !== frontImage ? backImage : null;

    // Scan for Barcode on both images using ZXing
    let detectedBarcode: string | null = null;
    try {
      if (secondaryImage) {
        detectedBarcode = await decodeBarcodeFromBase64(secondaryImage);
      }
      if (!detectedBarcode && primaryImage) {
        detectedBarcode = await decodeBarcodeFromBase64(primaryImage);
      }
    } catch (e) {
      console.warn("ZXing barcode scan notice:", e);
    }

    const activeApiKey =
      clientApiKey ||
      process.env.GEMINI_API_KEY ||
      process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.OPENAI_API_KEY;

    const promptText = `
You are an expert Indian Retail ERP & E-commerce Product Catalog Specialist.
Examine the attached product packaging photo(s) with extreme care.
Analyze all labels, fonts, logos, Hindi text, English text, and printed price stamps.

Look specifically for:
1. Product Name & Full Title:
   - Extract the exact full title as printed on the bottle/box/pouch (e.g. "Boro Neem Prickly Heat Powder 150g", "Parachute 100% Pure Coconut Oil 100ml", "Dettol Original Germ Protection Soap 75g", "Maggi 2-Minute Masala Noodles 70g").
   - Include the net volume/weight if visible (e.g. "150g", "100ml", "200ml").
2. Hindi Product Name (हिंदी नाम):
   - If Hindi text is printed on the label (e.g. "ठंडा घमौरी नाशक", "बोरो नीम"), extract it or accurately transliterate the product title into Hindi.
3. Brand Name:
   - Brand or manufacturer name (e.g. "Boro Neem", "Nipson", "Parachute", "Marico", "Dettol", "Himalaya", "Patanjali", "Dabur", "Vicco", "Nestle").
4. Printed MRP (Maximum Retail Price):
   - Search carefully across the entire container: near the neck, cap, bottom rim, back label, or price stamp.
   - Look for "MRP ₹", "M.R.P. Rs.", "₹XX", "/-", or embossed price digits.
   - If the exact price is faintly visible, read it. If not explicitly stamped, estimate the standard Indian retail MRP for this product category and size (e.g. 150g prickly heat powder is typically ₹90 to ₹120).
5. Pricing calculations:
   - mrp: Extracted or standard MRP as a number (e.g. 110)
   - suggested_retail_price: Same as MRP or slight discount (e.g. 110)
   - suggested_purchase_price: Estimated retailer cost price (approx 70-75% of MRP, e.g. 78)
   - suggested_wholesale_price: Estimated wholesale rate (approx 85% of MRP, e.g. 95)
6. Category:
   - Select most appropriate: "Personal Care" / "Skin Care" / "Hair Care" / "Oral Care" / "Groceries" / "Beverages" / "Snacks" / "Health & Wellness" / "General"
7. Net Weight/Volume: (e.g. "150 g", "100 ml", "500 ml", "1 kg")
8. Barcode: If visible on the packaging, extract the numeric barcode digits (usually 13 digits starting with 890 for India).
9. Product Bounding Box: [ymin, xmin, ymax, xmax] normalized coordinates from 0 to 1000 of ONLY the product packaging / bottle, excluding hands/background.

Return ONLY a valid raw JSON object (without markdown code blocks, backticks, or extra commentary):
{
  "product_name": "Exact full product title with size",
  "hindi_name": "हिंदी में उत्पाद नाम",
  "brand": "Brand Name",
  "category_name": "Personal Care",
  "net_weight": "150 g",
  "barcode": ${detectedBarcode ? `"${detectedBarcode}"` : `"Numeric barcode digits or null"`},
  "mrp": 110,
  "suggested_purchase_price": 78,
  "suggested_retail_price": 110,
  "suggested_wholesale_price": 95,
  "short_description": "Accurate 1-2 sentence description highlighting key benefits and ingredients.",
  "product_bounding_box": [120, 260, 880, 650]
}
`;

    // -------------------------------------------------------------
    // Option A: OPENAI GPT-4o VISION
    // -------------------------------------------------------------
    if (activeApiKey && (provider === "openai" || activeApiKey.startsWith("sk-"))) {
      try {
        const openai = new OpenAI({ apiKey: activeApiKey });
        const messagesContent: any[] = [
          { type: "text", text: promptText },
          {
            type: "image_url",
            image_url: {
              url: primaryImage.startsWith("data:") ? primaryImage : `data:image/jpeg;base64,${primaryImage}`,
              detail: "high",
            },
          },
        ];

        if (secondaryImage) {
          messagesContent.push({
            type: "image_url",
            image_url: {
              url: secondaryImage.startsWith("data:") ? secondaryImage : `data:image/jpeg;base64,${secondaryImage}`,
              detail: "high",
            },
          });
        }

        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: "You are a professional retail vision OCR and product catalog extractor. You must respond in valid JSON matching the requested schema.",
            },
            {
              role: "user",
              content: messagesContent,
            },
          ],
          max_tokens: 1200,
          temperature: 0.1,
        });

        const rawJson = response.choices[0]?.message?.content || "{}";
        const parsedData = JSON.parse(rawJson);

        if (detectedBarcode && !parsedData.barcode) {
          parsedData.barcode = detectedBarcode;
        }

        return NextResponse.json({
          success: true,
          provider: "OpenAI GPT-4o",
          data: parsedData,
        });
      } catch (openAiErr) {
        console.warn("OpenAI Vision failed, falling back to Gemini:", openAiErr);
      }
    }

    // -------------------------------------------------------------
    // Option B: GOOGLE GEMINI VISION (Production Gemini 1.5 / 2.0 Flash)
    // -------------------------------------------------------------
    if (activeApiKey && !activeApiKey.startsWith("sk-")) {
      const geminiModels = [
        "gemini-1.5-flash",
        "gemini-2.0-flash",
        "gemini-1.5-pro",
      ];

      for (const modelName of geminiModels) {
        try {
          const genAI = new GoogleGenerativeAI(activeApiKey);
          const model = genAI.getGenerativeModel({ model: modelName });

          const parseBase64Part = (dataUrl: string) => {
            const match = dataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
            if (match) {
              return {
                inlineData: {
                  data: match[2],
                  mimeType: match[1],
                },
              };
            }
            return {
              inlineData: {
                data: dataUrl.replace(/^data:[^;]+;base64,/, ""),
                mimeType: "image/jpeg",
              },
            };
          };

          const imageParts = [parseBase64Part(primaryImage)];
          if (secondaryImage) {
            imageParts.push(parseBase64Part(secondaryImage));
          }

          const result = await model.generateContent([promptText, ...imageParts]);
          const response = await result.response;
          const text = response.text().trim();

          const cleanedText = text
            .replace(/^```json\s*/i, "")
            .replace(/^```\s*/i, "")
            .replace(/\s*```$/i, "")
            .trim();

          const jsonMatch = text.match(/\{[\s\S]*\}/);
          const rawToParse = jsonMatch ? jsonMatch[0] : cleanedText;
          const parsedData = JSON.parse(rawToParse);

          if (detectedBarcode && !parsedData.barcode) {
            parsedData.barcode = detectedBarcode;
          }

          // Optional Sharp Cropping if bounding box returned
          let croppedImageUrl: string | null = null;
          let posWhiteImageUrl: string | null = null;
          try {
            const { cropProductWithSharp } = await import("@/lib/ai/sharp-cropper");
            const cropRes = await cropProductWithSharp(
              primaryImage,
              parsedData.product_bounding_box,
              clientRemoveBgKey
            );
            if (cropRes) {
              croppedImageUrl = cropRes.croppedDataUrl;
              posWhiteImageUrl = cropRes.posWhiteDataUrl;
            }
          } catch (cropErr) {
            console.warn("Sharp crop notice:", cropErr);
          }

          return NextResponse.json({
            success: true,
            provider: `Google ${modelName}`,
            data: {
              ...parsedData,
              cropped_image_url: croppedImageUrl,
              pos_white_url: posWhiteImageUrl,
            },
          });
        } catch (geminiErr: any) {
          console.warn(`Gemini Vision (${modelName}) failed:`, geminiErr?.message || geminiErr);
        }
      }
    }

    // -------------------------------------------------------------
    // Option C: Offline Barcode Reverse Lookup (if barcode found)
    // -------------------------------------------------------------
    if (detectedBarcode) {
      try {
        const offRes = await fetch(
          `https://world.openfoodfacts.org/api/v0/product/${detectedBarcode}.json`
        );
        if (offRes.ok) {
          const offJson = await offRes.json();
          if (offJson.status === 1 && offJson.product) {
            const p = offJson.product;
            const pName = p.product_name || p.product_name_en || "Retail Product";
            return NextResponse.json({
              success: true,
              provider: "OpenFoodFacts Barcode Match",
              data: {
                product_name: pName,
                brand: p.brands || "",
                category_name: p.categories?.split(",")?.[0]?.trim() || "General",
                barcode: detectedBarcode,
                mrp: 99,
                suggested_purchase_price: 70,
                suggested_retail_price: 99,
                suggested_wholesale_price: 85,
                short_description: `Product with verified barcode ${detectedBarcode}.`,
              },
            });
          }
        }
      } catch (offErr) {
        console.warn("Offline barcode lookup error:", offErr);
      }
    }

    // -------------------------------------------------------------
    // If no API key or Vision services failed:
    // Return an explicit error prompting user to configure their free key
    // -------------------------------------------------------------
    return NextResponse.json(
      {
        success: false,
        requiresApiKey: true,
        error:
          "Google Gemini API Key is required to scan packaging & MRP with AI. Please click '🔑 Setup AI Key' to paste your free key from Google AI Studio.",
        detectedBarcode: detectedBarcode || null,
      },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("AI Vision analysis error:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to analyze product images",
      },
      { status: 500 }
    );
  }
}
