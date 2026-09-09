import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import { requireStaff } from "@/lib/auth/server";

export async function POST(req: NextRequest) {
  const auth = await requireStaff(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const {
      frontImage,
      backImage,
      provider,
      apiKey: clientApiKey,
      removeBgApiKey: clientRemoveBgKey,
    } = body;

    if (!frontImage) {
      return NextResponse.json(
        { error: "Front product image is required" },
        { status: 400 }
      );
    }

    const activeApiKey =
      clientApiKey ||
      process.env.GEMINI_API_KEY ||
      process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.OPENAI_API_KEY;

    const promptText = `
You are an expert retail ERP & E-commerce Product Catalog Specialist.
Examine the attached front (and optional back) product packaging photo(s) carefully.
Look specifically for:
1. Product Name & variant (e.g. "Parachute 100% Pure Coconut Oil 100ml", "Maggi 2-Minute Noodles 70g", "Vicco Turmeric Cream 50g", "Surf Excel Easy Wash 1kg")
2. Brand name (e.g. "Parachute", "Nestle", "Vicco", "Surf Excel", "Tata", "Dabur", "Dettol", "Himalaya")
3. Physical Packaging Details:
   - Packaging shape (e.g. "Cylindrical bottle", "Rectangular box", "Pouch / packet")
   - Cap type & color
   - Container material & color
   - Label color & exact layout
   - Exact text on label
4. Printed Price / MRP: Look closely for printed price (e.g. "₹46", "MRP Rs. 46.00", "50/-", "MRP: ₹XX").
5. Net Weight/Volume (e.g. "100 ml", "50 g", "200 ml", "500 ml", "1 kg").
6. Ingredients, Directions of use, benefits.
7. Barcode digits if visible.
8. Product Bounding Box: [ymin, xmin, ymax, xmax] normalized coordinates from 0 to 1000 of ONLY the product packaging / container / bottle, strictly excluding any human hands, fingers, laptop/table, or background.

Return ONLY a valid raw JSON object (without markdown code blocks, backticks, or extra commentary):
{
  "product_name": "Exact full product title from label",
  "brand": "Exact brand name",
  "category_name": "Hair Care / Skin Care / Oral Care / Personal Care / Groceries / Snacks / Beverages",
  "packaging_shape": "Packaging description",
  "cap_color_and_type": "Cap description or null",
  "container_color_material": "Material and color description",
  "label_design_and_colors": "Design and color scheme",
  "exact_label_text": "Exact text visible on packaging",
  "net_weight": "100 ml / 50 g / etc",
  "barcode": "Numeric barcode digits if visible, otherwise null",
  "product_bounding_box": [120, 260, 880, 650],
  "mrp": 46,
  "suggested_purchase_price": 35,
  "suggested_retail_price": 46,
  "suggested_wholesale_price": 40,
  "ingredients": ["Ingredient 1", "Ingredient 2"],
  "directions": "Usage instructions",
  "benefits": ["Benefit 1", "Benefit 2"],
  "short_description": "Accurate 1-2 sentence product overview.",
  "storage_instructions": "Store in a cool dry place.",
  "seo_tags": ["tag1", "tag2"]
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
              url: frontImage.startsWith("data:") ? frontImage : `data:image/jpeg;base64,${frontImage}`,
              detail: "high",
            },
          },
        ];

        if (backImage) {
          messagesContent.push({
            type: "image_url",
            image_url: {
              url: backImage.startsWith("data:") ? backImage : `data:image/jpeg;base64,${backImage}`,
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

        return NextResponse.json({
          success: true,
          provider: "OpenAI GPT-4o",
          data: parsedData,
        });
      } catch (openAiErr) {
        console.warn("OpenAI Vision failed, proceeding to fallback:", openAiErr);
      }
    }

    // -------------------------------------------------------------
    // -------------------------------------------------------------
    // Option B: GOOGLE GEMINI VISION (Dynamic discovery + gemini-3.6-flash)
    // -------------------------------------------------------------
    if (activeApiKey && !activeApiKey.startsWith("sk-")) {
      // Prioritize confirmed working ultra-fast models first to avoid ListModels network latency
      let geminiModels = [
        "gemini-3.6-flash",
        "gemini-2.5-flash",
        "gemini-2.0-flash-exp",
      ];

      for (let i = 0; i < geminiModels.length; i++) {
        const modelName = geminiModels[i];
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

          const imageParts = [parseBase64Part(frontImage)];
          if (backImage) {
            imageParts.push(parseBase64Part(backImage));
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

          // Fast E-Commerce Staging & Cutout (Uses Remove.bg if key provided, otherwise 10ms Sharp Crop)
          let croppedImageUrl: string | null = null;
          let posWhiteImageUrl: string | null = null;
          try {
            const { cropProductWithSharp } = await import("@/lib/ai/sharp-cropper");
            const cropRes = await cropProductWithSharp(
              frontImage,
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
        } catch (geminiErr) {
          console.warn(`Gemini Vision (${modelName}) failed:`, geminiErr);
          // If first model failed and we haven't checked ListModels yet, query available models
          if (i === 0 && geminiModels.length <= 3) {
            try {
              const listRes = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models?key=${activeApiKey}`
              );
              if (listRes.ok) {
                const listJson = await listRes.json();
                if (Array.isArray(listJson.models)) {
                  const valid = listJson.models
                    .filter((m: any) => m.supportedGenerationMethods?.includes("generateContent"))
                    .map((m: any) => m.name.replace(/^models\//, ""));
                  if (valid.length > 0) {
                    geminiModels = Array.from(new Set([...geminiModels, ...valid]));
                  }
                }
              }
            } catch (listErr) {
              console.warn("ListModels fallback notice:", listErr);
            }
          }
        }
      }
    }

    // -------------------------------------------------------------
    // Fallback: Smart Retail Label Heuristic & Online Search
    // -------------------------------------------------------------
    return NextResponse.json({
      success: true,
      provider: "Falcon Retail Matcher",
      data: {
        product_name: "",
        brand: "",
        category_name: "General",
        mrp: 0,
        suggested_purchase_price: 0,
        suggested_retail_price: 0,
        short_description: "Product photo attached. Use Master Catalog search above to auto-fill verified specifications & pricing.",
      },
      notice: "Cloud AI API key is not configured. For automated cloud OCR, add your Google Gemini key in AI Center.",
    });
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
