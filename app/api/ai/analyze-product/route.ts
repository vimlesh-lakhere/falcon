import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { frontImage, backImage, apiKey, provider } = body;

    if (!frontImage) {
      return NextResponse.json(
        { error: "Front product image is required" },
        { status: 400 }
      );
    }

    const activeApiKey =
      apiKey ||
      process.env.OPENAI_API_KEY ||
      process.env.GEMINI_API_KEY ||
      process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    if (!activeApiKey) {
      return NextResponse.json(
        {
          error: "AI API Key is missing. Please provide an OpenAI API key (sk-...) or Google Gemini API Key.",
          requiresApiKey: true,
        },
        { status: 400 }
      );
    }

    // Determine provider based on key format or explicit choice
    const isExplicitOpenAi = provider === "openai" || activeApiKey.startsWith("sk-");

    const promptText = `
You are an expert retail ERP & E-commerce Product Catalog Specialist.
Examine the attached front (and optional back) product packaging photo(s) carefully.
Look specifically for:
1. Product Name & variant (e.g. "Isha Herbal Tooth Powder", "Isha Life Tooth Powder", etc.)
2. Brand name (e.g. "Isha Life", "Isha", "Patanjali", "Dabur", etc.)
3. Printed Price / MRP: Look closely for printed price (e.g. "₹50", "MRP Rs. 50", "Rs. 50.00", "50/-", "MRP: ₹XX"). It might be printed near the bottom, side, back label, or near Net Wt.
4. Net Weight/Volume (e.g. "50 g", "100 g", "50g", "100ml").
5. Ingredients, Directions of use, benefits.
6. Barcode digits if visible.

Return ONLY a valid raw JSON object (without markdown code blocks, backticks, or extra commentary):
{
  "product_name": "Exact full product title from label",
  "brand": "Exact brand name",
  "category_name": "Oral Care / Personal Care / Skincare / Ayurvedic / Groceries",
  "net_weight": "e.g. 50 g",
  "barcode": "Numeric barcode digits if visible, otherwise null",
  "mrp": 50,
  "suggested_purchase_price": 35,
  "suggested_retail_price": 50,
  "suggested_wholesale_price": 42,
  "ingredients": ["Herb 1", "Herb 2"],
  "directions": "How to use",
  "benefits": ["Benefit 1", "Benefit 2"],
  "short_description": "Clean engaging e-commerce description",
  "storage_instructions": "Store in a cool dry place",
  "seo_tags": ["herbal tooth powder", "oral care", "isha life"]
}
`;

    // -------------------------------------------------------------
    // Option A: OPENAI GPT-4o VISION
    // -------------------------------------------------------------
    if (isExplicitOpenAi) {
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
        model: "gpt-4o", // Most powerful vision model
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
    }

    // -------------------------------------------------------------
    // Option B: GOOGLE GEMINI 1.5 FLASH VISION
    // -------------------------------------------------------------
    const genAI = new GoogleGenerativeAI(activeApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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
          data: dataUrl,
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

    const parsedData = JSON.parse(cleanedText);

    return NextResponse.json({
      success: true,
      provider: "Google Gemini 1.5 Flash",
      data: parsedData,
    });
  } catch (error: any) {
    console.error("AI Vision analysis error:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to analyze product images with Vision AI",
      },
      { status: 500 }
    );
  }
}
