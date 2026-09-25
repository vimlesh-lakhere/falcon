import { DEFAULT_FALLBACK_SHOP_ID } from "@/lib/tenant";

/**
 * Public identity of a storefront: display name (English + Hindi), address, map link and the
 * search-engine text for it. The AGS shop (Aarti General Store, Chhatarpur) has a hand-written
 * profile; any other shop gets a plain one built from its `shops` row.
 */
export interface StoreProfile {
  brandName: string;
  brandNameHi: string | null;
  tagline: string;
  taglineHi: string | null;
  streetAddress: string;
  city: string;
  region: string;
  postalCode: string;
  fullAddress: string;
  phone: string;
  /** Opens Google Maps on the shop (search by name + address). */
  mapsUrl: string;
  /** Canonical public site, e.g. https://ags.falcon360.in (null = unknown). */
  siteUrl: string | null;
  seoTitle: string;
  seoDescription: string;
  keywords: string[];
  /** Other ways people spell / call the shop (used in structured data). */
  alternateNames: string[];
  /** Google Search Console HTML-tag verification code (public by design). */
  googleVerification?: string;
}

const mapsSearch = (q: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;

const AGS_PROFILE: StoreProfile = {
  brandName: "Aarti General Store",
  brandNameHi: "आरती जनरल स्टोर",
  tagline: "Wholesale & Retail General Store in Chhatarpur",
  taglineHi: "छतरपुर का होलसेल एवं रिटेल जनरल स्टोर",
  // Same wording as the Google Maps listing, so search engines see one consistent address.
  streetAddress: "Dudhnath Mandir, Gali Number 2, near Gayatri Mandir Road, Naya Mohalla",
  city: "Chhatarpur",
  region: "Madhya Pradesh",
  postalCode: "471001",
  fullAddress:
    "Dudhnath Mandir, Gali Number 2, near Gayatri Mandir Road, Naya Mohalla, Chhatarpur, Madhya Pradesh 471001",
  phone: "+91 9340362381",
  // The shop's own Google Maps listing (share link from the owner).
  mapsUrl: "https://maps.app.goo.gl/KcfMjDr9RCdKFoiQ6",
  siteUrl: "https://ags.falcon360.in",
  googleVerification: "2rFy-rGDBlAnWOpJPOJ6CM_fOVlEUEz9oF_deGjb_40",
  seoTitle: "Aarti General Store Chhatarpur | आरती जनरल स्टोर – Wholesale & Retail",
  seoDescription:
    "Aarti General Store (आरती जनरल स्टोर), Dudhnath Mandir, Gali No. 2, Naya Mohalla, Chhatarpur (M.P.) — wholesale & retail general store for cosmetics, beauty, hair care, daily needs and household items at wholesale rates. Order online for home delivery in Chhatarpur or call 9340362381.",
  keywords: [
    "Aarti General Store",
    "Aarti General Store Chhatarpur",
    "Arti General Store",
    "Aarti Genral Store",
    "Arti Genral Store",
    "आरती जनरल स्टोर",
    "आरती जनरल स्टोर छतरपुर",
    "general store in Chhatarpur",
    "best general store in Chhatarpur",
    "wholesale general store Chhatarpur",
    "cosmetics wholesale Chhatarpur",
    "kirana general store Chhatarpur",
    "AGS Store Chhatarpur",
  ],
  alternateNames: [
    "आरती जनरल स्टोर",
    "Arti General Store",
    "Aarti Genral Store",
    "Arti Genral Store",
    "AGS Store",
    "AGS Store Chhatarpur",
  ],
};

export function getStoreProfile(
  shopId: string | null | undefined,
  shop?: { name?: string | null; phone?: string | null; address?: string | null } | null
): StoreProfile {
  const agsId = process.env.DEFAULT_SHOP_ID || DEFAULT_FALLBACK_SHOP_ID;
  if (!shopId || shopId === agsId) {
    return shop?.phone ? { ...AGS_PROFILE, phone: shop.phone } : AGS_PROFILE;
  }
  const name = shop?.name || "Online Store";
  const address = shop?.address || "";
  return {
    brandName: name,
    brandNameHi: null,
    tagline: "Shop online with local delivery",
    taglineHi: null,
    streetAddress: address,
    city: "",
    region: "",
    postalCode: "",
    fullAddress: address,
    phone: shop?.phone || "",
    mapsUrl: mapsSearch(`${name} ${address}`.trim()),
    siteUrl: null,
    seoTitle: `${name} | Online Store`,
    seoDescription: `Shop ${name} online — quality products with local delivery and WhatsApp ordering.`,
    keywords: [name],
    alternateNames: [],
  };
}

/** schema.org LocalBusiness data so search engines can show the shop, its address and phone. */
export function storeJsonLd(p: StoreProfile) {
  return {
    "@context": "https://schema.org",
    "@type": ["Store", "LocalBusiness"],
    name: p.brandName,
    alternateName: p.alternateNames,
    description: p.seoDescription,
    ...(p.siteUrl ? { url: p.siteUrl, "@id": `${p.siteUrl}/#store` } : {}),
    telephone: p.phone,
    priceRange: "₹",
    currenciesAccepted: "INR",
    paymentAccepted: "Cash, UPI",
    address: {
      "@type": "PostalAddress",
      streetAddress: p.streetAddress,
      addressLocality: p.city,
      addressRegion: p.region,
      postalCode: p.postalCode,
      addressCountry: "IN",
    },
    hasMap: p.mapsUrl,
    areaServed: p.city || undefined,
  };
}
