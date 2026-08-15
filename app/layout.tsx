import type { Metadata } from "next";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "Falcon ERP - AGS Store Management System",
  description: "Next-generation Retail and Wholesale ERP for AGS Store",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-surface-canvas min-h-screen text-gray-900">{children}</body>
    </html>
  );
}
