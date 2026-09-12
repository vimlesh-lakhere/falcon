import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Falcon 360 - POS Billing Terminal & Cloud ERP",
    short_name: "Falcon POS",
    description: "Fast Retail & Wholesale POS Billing App with Offline Support, Barcode Scanner & WhatsApp Invoicing",
    start_url: "/pos",
    display: "standalone",
    background_color: "#0f172a",
    theme_color: "#4f46e5",
    orientation: "any",
    icons: [
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "⚡ Quick Note / Kharidi Parchi",
        short_name: "Quick Note",
        description: "Quickly jot down customer demands or shortage notes",
        url: "/?action=quick-note",
        icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192" }],
      },
      {
        name: "POS Billing Terminal",
        short_name: "POS",
        description: "Open Fast POS Billing Terminal",
        url: "/pos",
        icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192" }],
      },
      {
        name: "Online Storefront",
        short_name: "Store",
        description: "Open Customer Online Storefront",
        url: "/store",
        icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192" }],
      },
      {
        name: "Inventory Overview",
        short_name: "Inventory",
        description: "Check Stock Levels & Adjustments",
        url: "/inventory",
        icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192" }],
      },
    ],
  };
}
