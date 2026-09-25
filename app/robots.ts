import type { MetadataRoute } from "next";
import { getStoreProfile } from "@/lib/store-profile";

/** Let search engines index the public store; keep the ERP / POS / API out of results. */
export default function robots(): MetadataRoute.Robots {
  const site = getStoreProfile(null).siteUrl || "https://ags.falcon360.in";
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/store"],
        disallow: [
          "/api/",
          "/pos",
          "/dashboard",
          "/products",
          "/inventory",
          "/customers",
          "/khata",
          "/sales",
          "/purchases",
          "/suppliers",
          "/reports",
          "/settings",
          "/admin",
          "/ai-center",
          "/demand-pad",
          "/requests",
          "/store/checkout",
          "/store/cart",
          "/store/profile",
          "/store/orders",
        ],
      },
    ],
    sitemap: `${site}/sitemap.xml`,
  };
}
