import { NextRequest, NextResponse } from "next/server";
import { attachVariantsToDescription } from "@/lib/product-variants";
import { requireStaff } from "@/lib/auth/server";
import { capitalizeFirstLetter } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const auth = await requireStaff(req, ["Owner", "Admin", "Manager", "Inventory Staff"]);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const { items } = body;
    const { supabase, shopId: targetShopId } = auth;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: "No products provided in request." }, { status: 400 });
    }

    // 1. Fetch and upsert categories only for the authenticated user's shop.
    const { data: existingCategories } = await supabase
      .from("categories")
      .select("id, name")
      .eq("shop_id", targetShopId);

    const categoryMap = new Map<string, string>();
    (existingCategories || []).forEach((c) => categoryMap.set(c.name.toLowerCase().trim(), c.id));

    const uniqueCategoryNames = new Set<string>();
    items.forEach((it: any) => {
      const cName = String(it.categoryName || "").trim();
      if (cName && !categoryMap.has(cName.toLowerCase())) {
        uniqueCategoryNames.add(cName);
      }
    });

    let newCategoriesCreated = 0;
    for (const catName of Array.from(uniqueCategoryNames)) {
      const { data: newCat, error: catErr } = await supabase
        .from("categories")
        .insert({
          shop_id: targetShopId,
          name: catName,
          is_active: true,
        })
        .select("id, name")
        .single();

      if (!catErr && newCat) {
        categoryMap.set(newCat.name.toLowerCase().trim(), newCat.id);
        newCategoriesCreated++;
      }
    }

    // 2. Prepare clean product records (matching exact Supabase column schema)
    const defaultImg =
      "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=500&auto=format&fit=crop&q=60";

    const productPayloads = items.map((it: any, idx: number) => {
      const catId = categoryMap.get(String(it.categoryName || "").toLowerCase().trim()) || null;
      const salesPrice = Math.max(0, Number(it.salesPrice) || 0);
      const costPrice = Math.max(0, Number(it.costPrice) || 0);
      const mrp = Number(it.mrp) > 0 ? Number(it.mrp) : salesPrice > 0 ? salesPrice : 50;
      const stock = Math.max(0, Math.floor(Number(it.stock) || 0));
      const minStock = Math.max(0, Math.floor(Number(it.minStock) || 5));

      const cleanSku = it.itemCode?.trim() || `SKU-${Date.now().toString().slice(-4)}-${idx + 1}`;
      const cleanBarcode = it.itemCode?.trim() || null;

      // Embed MRP & variants in description for site rendering
      const initialDesc = it.description?.trim() || `Authentic ${it.name} available at best store price.`;
      const finalDescription = attachVariantsToDescription(initialDesc, [
        {
          id: `var-${cleanSku}`,
          size: "Standard Pack",
          price: salesPrice,
          mrp: mrp,
          purchasePrice: costPrice,
          stock: stock,
        },
      ]);

      return {
        shop_id: targetShopId,
        category_id: catId,
        supplier_id: null,
        unit_id: null,
        name: capitalizeFirstLetter(String(it.name || `Item ${idx + 1}`).trim()),
        sku: cleanSku,
        barcode: cleanBarcode,
        brand: capitalizeFirstLetter(extractBrand(it.name)),
        purchase_price: costPrice,
        selling_price: salesPrice,
        wholesale_price: salesPrice > 0 ? Math.round(salesPrice * 0.9) : 0,
        minimum_selling_price: costPrice,
        current_stock: stock,
        minimum_stock: minStock,
        description: finalDescription,
        image_url: defaultImg,
        is_active: true,
      };
    });

    // 3. Batch insert in chunks of 40
    let insertedCount = 0;
    const errors: string[] = [];
    const chunkSize = 40;

    for (let i = 0; i < productPayloads.length; i += chunkSize) {
      const chunk = productPayloads.slice(i, i + chunkSize);
      const { data, error } = await supabase.from("products").insert(chunk).select("id");

      if (error) {
        console.error(`Batch insert chunk error [${i} - ${i + chunkSize}]:`, error);
        // Fallback: try inserting row-by-row in this chunk to rescue valid rows
        for (const singleProduct of chunk) {
          const { error: singleErr } = await supabase.from("products").insert([singleProduct]);
          if (!singleErr) {
            insertedCount++;
          } else {
            errors.push(`${singleProduct.name}: ${singleErr.message}`);
          }
        }
      } else {
        insertedCount += data?.length || chunk.length;
      }
    }

    return NextResponse.json({
      success: true,
      insertedCount,
      totalRequested: items.length,
      categoriesCreated: newCategoriesCreated,
      errors: errors.slice(0, 10),
    });
  } catch (err: any) {
    console.error("Bulk import route error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

function extractBrand(name: string): string {
  const brands = [
    "Parachute", "Vicco", "Dettol", "Patanjali", "Dabur", "Himalaya", "Colgate",
    "Maggi", "Dove", "Nivea", "Lifebuoy", "Lux", "Clinic Plus", "Godrej", "Vivel",
    "Pond's", "Fair & Lovely", "Glow & Lovely", "Sunsilk", "Head & Shoulders",
    "Garnier", "L'Oreal", "Amul", "Britannia", "Tata", "Fortune", "Aashirvaad",
    "Boro Plus", "Clean & Clear", "AD Meena", "Baal Choti", "Baba", "Bitnovate",
    "Billiya", "Chandi", "Chilli", "Bindi", "Braslate"
  ];
  const nameLower = (name || "").toLowerCase();
  for (const b of brands) {
    if (nameLower.includes(b.toLowerCase())) return b;
  }
  return "Authentic Brand";
}
