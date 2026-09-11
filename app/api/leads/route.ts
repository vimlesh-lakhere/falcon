import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { sanitizeIndianPhone } from "@/lib/whatsapp-invoice";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, businessName, phone, email, service, message } = body;

    if (!name || !phone) {
      return NextResponse.json(
        { error: "Name and Mobile number are required." },
        { status: 400 }
      );
    }

    const cleanPhone = sanitizeIndianPhone(phone) || phone;

    // 1. Insert into leads table
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .insert([
        {
          name,
          business_name: businessName || null,
          phone: cleanPhone,
          email: email || null,
          service: service || "all",
          message: message || null,
          status: "new",
        },
      ])
      .select()
      .single();

    if (leadError) {
      console.error("Failed to insert lead:", leadError);
      return NextResponse.json({ error: leadError.message }, { status: 500 });
    }

    // 2. Map service code to readable name
    const serviceLabels: Record<string, string> = {
      all: "Complete Falcon 360 Ecosystem",
      erp: "Cloud ERP System",
      pos: "Smart POS Software & Hardware",
      "custom-web": "Custom Website Development",
    };
    const serviceName = serviceLabels[service] || service || "Falcon Service";

    // 3. Post immediate in-app notification to the Master Store Admin
    const MASTER_SHOP_ID = "a0000000-0000-0000-0000-000000000001";
    await supabase.from("notifications").insert([
      {
        shop_id: MASTER_SHOP_ID,
        type: "lead_inquiry",
        entity_table: "leads",
        entity_id: lead.id,
        message: `🔔 New Service Inquiry: ${name} (${businessName || "Store"}) requested "${serviceName}". Phone: +91 ${cleanPhone}. Follow up to close deal!`,
      },
    ]);

    return NextResponse.json({
      success: true,
      lead,
      message: "Your inquiry has been received. Our Falcon 360 team will contact you shortly!",
    });
  } catch (error: any) {
    console.error("Inquiry API error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
