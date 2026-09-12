import type { Metadata, Viewport } from "next";
import "@/styles/globals.css";
import { PwaRegister } from "@/components/pwa/PwaRegister";
import { GlobalInputEnhancer } from "@/components/ui/GlobalInputEnhancer";

export const metadata: Metadata = {
  title: "Falcon 360 - Cloud ERP & High-Speed POS System",
  description: "Next-generation Retail and Wholesale ERP with High-Speed POS Billing and Custom E-Commerce Storefronts",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Falcon POS",
  },
  icons: {
    icon: [
      { url: "/falcon-icon.png", sizes: "512x512", type: "image/png" },
      { url: "/favicon.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon.ico" },
    ],
    shortcut: "/falcon-icon.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#4f46e5",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

import Script from "next/script";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      </head>
      <body className="bg-surface-canvas min-h-screen text-gray-900 antialiased selection:bg-purple-500 selection:text-white">
        {children}
        <PwaRegister />
        <GlobalInputEnhancer />
      </body>
    </html>
  );
}
