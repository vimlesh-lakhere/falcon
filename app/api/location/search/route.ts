import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q");
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  try {
    // 1. Reverse Geocode: lat + lng -> Human-readable address
    if (lat && lng) {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&zoom=16&addressdetails=1`,
        {
          headers: {
            "User-Agent": "FalconStore-LocationService/1.0",
            "Accept-Language": "hi,en",
          },
          next: { revalidate: 3600 },
        }
      );
      if (!res.ok) {
        return NextResponse.json({ success: false, error: "Reverse geocoding failed" }, { status: 500 });
      }
      const data = await res.json();
      return NextResponse.json({
        success: true,
        displayName: data.display_name,
        address: data.address,
      });
    }

    // 2. Place Search: query -> list of places with lat/lng
    if (query && query.trim().length >= 2) {
      const sanitizedQuery = `${query.trim()}, India`;
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(sanitizedQuery)}&format=json&addressdetails=1&limit=5&countrycodes=in`,
        {
          headers: {
            "User-Agent": "FalconStore-LocationService/1.0",
            "Accept-Language": "hi,en",
          },
          next: { revalidate: 3600 },
        }
      );
      if (!res.ok) {
        return NextResponse.json({ success: false, error: "Place search failed" }, { status: 500 });
      }
      const data = await res.json();
      const results = (data || []).map((item: any) => ({
        placeId: item.place_id,
        name: item.name || item.display_name?.split(",")[0],
        displayName: item.display_name,
        lat: Number(item.lat),
        lng: Number(item.lon),
        type: item.type,
      }));

      return NextResponse.json({ success: true, results });
    }

    return NextResponse.json({ success: false, error: "Missing query or coordinates" }, { status: 400 });
  } catch (err: any) {
    console.error("Location search API error:", err);
    return NextResponse.json({ success: false, error: err.message || "Failed to fetch location" }, { status: 500 });
  }
}
