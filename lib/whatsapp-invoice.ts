import { formatCurrency, formatDateTime } from "@/lib/utils";
import { Sale, Customer, Product } from "@/types/database";
import { buildUpiPaymentUrl, parseFreightCharge } from "@/lib/thermal-printer";

export interface WhatsAppInvoiceOptions {
  shopName: string;
  shopPhone: string;
  shopAddress: string;
  shopGst?: string;
  showGstin?: boolean;
  upiId?: string;
  upiPayeeName?: string;
  customFooter?: string;
}

/**
 * Builds a clean, beautifully formatted WhatsApp invoice message with emojis and bank UPI link.
 */
export function buildWhatsAppInvoiceText(
  sale: Sale,
  customer?: Customer | null,
  options?: Partial<WhatsAppInvoiceOptions>
): string {
  const shopName = options?.shopName || "AGS STORE & COSMETICS";
  const shopPhone = options?.shopPhone || "+91 9340362381";
  const shopAddress = options?.shopAddress || "Main Market Road, Town Area";
  const rawGst = options?.shopGst?.trim();
  const showGst = options?.showGstin && rawGst && rawGst !== "23AAAAA0000A1Z5";

  const custName = customer?.name || (sale as any).customer?.name || "Customer";
  const custPhone = customer?.phone || (sale as any).customer?.phone || "";

  const items = sale.items || [];
  const itemsText = items
    .map((it: any, idx: number) => {
      const pName = it.product?.name || it.product_name || it.name || it.title || "Product";
      const unitLabel = it.unit_name ? ` (${it.unit_name})` : "";
      const lineTotal = (Number(it.unit_price) * Number(it.quantity)).toFixed(2);
      return `${idx + 1}. *${pName}*\n   ${it.quantity}${unitLabel} × ₹${Number(it.unit_price).toFixed(2)} = *₹${lineTotal}*`;
    })
    .join("\n");

  const payments = sale.payments || [];
  const payMethod = payments.map((p) => p.method.toUpperCase()).join(", ") || "CASH";

  const upiPayLink =
    options?.upiId && Number(sale.total_amount) > 0
      ? `\n📲 *Pay Online via UPI:* ${buildUpiPaymentUrl(
          options.upiId,
          options.upiPayeeName || shopName,
          Number(sale.total_amount) || 0,
          sale.invoice_number
        )}`
      : "";

  const freightAmount = parseFreightCharge(sale);

  return `🧾 *CASH BILL / INVOICE - ${shopName.toUpperCase()}*
━━━━━━━━━━━━━━━━━━━━
📍 *Address:* ${shopAddress}
📞 *Help/Contact:* ${shopPhone}
${showGst ? `🏛️ *GSTIN:* ${rawGst}\n` : ""}━━━━━━━━━━━━━━━━━━━━
📋 *Invoice #:* ${sale.invoice_number}
📅 *Date:* ${formatDateTime(sale.created_at || new Date().toISOString())}
👤 *Customer:* ${custName}${custPhone ? ` (+91 ${custPhone})` : ""}
━━━━━━━━━━━━━━━━━━━━
🛒 *ITEMS PURCHASED:*
${itemsText}
━━━━━━━━━━━━━━━━━━━━
💵 *Subtotal:* ₹${Number(sale.subtotal).toFixed(2)}
${Number(sale.discount_amount) > 0 ? `🎁 *Discount:* -₹${Number(sale.discount_amount).toFixed(2)}\n` : ""}${Number(sale.tax_amount) > 0 ? `🏛️ *GST/Tax:* +₹${Number(sale.tax_amount).toFixed(2)}\n` : ""}${freightAmount > 0 ? `🚚 *भाड़ा / Freight:* +₹${freightAmount.toFixed(2)}\n` : ""}💰 *FINAL TOTAL:* *₹${Number(sale.total_amount).toFixed(2)}*
💳 *Payment Mode:* ${payMethod}${upiPayLink}
━━━━━━━━━━━━━━━━━━━━
🙏 *${options?.customFooter || "Thank you for shopping with us!"}*
⚡ *Visit again soon.*`;
}

/**
 * Clean phone number to 10-digit Indian standard.
 */
export function sanitizeIndianPhone(raw: string): string {
  if (!raw) return "";
  const digits = raw.replace(/[^0-9]/g, "");
  if (digits.length > 10) {
    return digits.slice(-10);
  }
  return digits;
}

/**
 * Generates direct wa.me link for WhatsApp.
 */
export function getWhatsAppShareUrl(phone: string, text: string): string {
  const cleanPhone = sanitizeIndianPhone(phone);
  const encoded = encodeURIComponent(text);
  if (cleanPhone.length === 10) {
    return `https://wa.me/91${cleanPhone}?text=${encoded}`;
  }
  return `https://wa.me/?text=${encoded}`;
}

/**
 * Share invoice using native Web Share API (mobile app / PWA) or fallback to wa.me link.
 */
export async function shareInvoiceViaWhatsAppOrNative(
  phone: string,
  messageText: string,
  invoiceNumber: string
): Promise<{ success: boolean; method: "native" | "whatsapp" }> {
  // If Web Share API is available on mobile/PWA
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({
        title: `Bill Invoice #${invoiceNumber}`,
        text: messageText,
      });
      return { success: true, method: "native" };
    } catch (err: any) {
      // User cancelled or fallback needed
      if (err.name !== "AbortError") {
        console.warn("Native share failed, falling back to WhatsApp URL:", err);
      }
    }
  }

  // Fallback: Open WhatsApp direct link
  const url = getWhatsAppShareUrl(phone, messageText);
  if (typeof window !== "undefined") {
    window.open(url, "_blank", "noopener,noreferrer");
  }
  return { success: true, method: "whatsapp" };
}
