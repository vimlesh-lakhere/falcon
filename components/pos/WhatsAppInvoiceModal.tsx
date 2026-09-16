"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  MessageSquare,
  Share2,
  Phone,
  Copy,
  Check,
  Send,
  Download,
  Image as ImageIcon,
  FileText,
  ExternalLink,
  BookUser,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import QRCode from "qrcode";
import { toPng, toBlob } from "html-to-image";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Sale, Customer } from "@/types/database";
import {
  buildWhatsAppInvoiceText,
  sanitizeIndianPhone,
  getWhatsAppShareUrl,
} from "@/lib/whatsapp-invoice";
import { getPrinterConfig, buildUpiPaymentUrl } from "@/lib/thermal-printer";
import { isContactPickerSupported, pickContactFromDevice } from "@/lib/contact-picker";
import { AartiBillOfSupplyImage } from "@/components/pos/AartiBillOfSupplyImage";
import { supabase } from "@/lib/supabase/client";

interface WhatsAppInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale;
  customer?: Customer | null;
  shopId: string;
  shopName?: string;
  shopPhone?: string;
  shopAddress?: string;
  shopGst?: string;
}

export const WhatsAppInvoiceModal: React.FC<WhatsAppInvoiceModalProps> = ({
  isOpen,
  onClose,
  sale,
  customer,
  shopId,
  shopName,
  shopPhone,
  shopAddress,
  shopGst,
}) => {
  const [activeTab, setActiveTab] = useState<"image" | "text">("image");
  const [phone, setPhone] = useState<string>("");
  const [customRecipientName, setCustomRecipientName] = useState<string>("");
  const [copiedText, setCopiedText] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [fetchedShop, setFetchedShop] = useState<{ name?: string; phone?: string; address?: string; gst_number?: string } | null>(null);

  const invoiceCardRef = useRef<HTMLDivElement>(null);
  const printerConfig = getPrinterConfig(shopId);

  useEffect(() => {
    if (!shopName && shopId) {
      const loadShop = async () => {
        try {
          const { data } = await supabase
            .from("shops")
            .select("name, phone, address, gst_number")
            .eq("id", shopId)
            .maybeSingle();
          if (data) setFetchedShop(data);
        } catch (e) {
          console.warn("Failed to fetch shop details for WhatsApp invoice:", e);
        }
      };
      loadShop();
    }
  }, [shopName, shopId]);

  const effectiveShopName = shopName || fetchedShop?.name || printerConfig.shopName || "Falcon Store";
  const effectiveShopPhone = shopPhone || fetchedShop?.phone || printerConfig.shopPhone || "+91 9340362381";
  const effectiveShopAddress = shopAddress || fetchedShop?.address || printerConfig.shopAddress || "Main Market Road, Town Area";
  const effectiveShopGst = shopGst || fetchedShop?.gst_number || printerConfig.shopGst || "";

  const effectivePrinterConfig = {
    ...printerConfig,
    shopName: effectiveShopName,
    shopPhone: effectiveShopPhone,
    shopAddress: effectiveShopAddress,
    shopGst: effectiveShopGst,
    showGstin: printerConfig.showGstin || Boolean(effectiveShopGst),
  };

  useEffect(() => {
    if (isOpen && sale) {
      const initialPhone = customer?.phone || (sale as any).customer?.phone || "";
      setPhone(sanitizeIndianPhone(initialPhone));
      setCustomRecipientName(customer?.name || (sale as any).customer?.name || "");
      setCopiedText(false);
      setCopiedImage(false);
      setStatusMessage("");

      // Generate Dynamic UPI QR Code
      const upiId = printerConfig.upiId || "9340362381@ybl";
      const payee = printerConfig.upiPayeeName || effectiveShopName;
      const total = Number(sale.total_amount) || 0;
      const upiUrl = buildUpiPaymentUrl(upiId, payee, total, sale.invoice_number);

      QRCode.toDataURL(upiUrl, { margin: 1, width: 240 })
        .then((url) => setQrCodeDataUrl(url))
        .catch((err) => console.warn("Failed generating QR code for invoice image", err));
    }
  }, [isOpen, sale, customer, shopId, effectiveShopName]);

  if (!isOpen || !sale) return null;

  const invoiceMessage = buildWhatsAppInvoiceText(sale, customer, {
    shopName: effectiveShopName,
    shopPhone: effectiveShopPhone,
    shopAddress: effectiveShopAddress,
    shopGst: effectiveShopGst,
    showGstin: effectivePrinterConfig.showGstin,
    upiId: printerConfig.upiId,
    upiPayeeName: printerConfig.upiPayeeName || effectiveShopName,
    customFooter: printerConfig.customFooter,
    billLanguage: printerConfig.billLanguage || "hindi",
  });

  const cleanPhone = sanitizeIndianPhone(phone);
  const isPhoneValid = cleanPhone.length === 10;
  const whatsappUrl = getWhatsAppShareUrl(cleanPhone, invoiceMessage);

  // 1. Generate PNG Blob of the Invoice Card
  const generateInvoiceBlob = async (): Promise<Blob | null> => {
    if (!invoiceCardRef.current) return null;
    try {
      setIsGeneratingImage(true);
      const blob = await toBlob(invoiceCardRef.current, {
        quality: 0.98,
        pixelRatio: 2, // High resolution crisp image
        backgroundColor: "#ffffff",
      });
      return blob;
    } catch (err) {
      console.error("Error generating invoice image:", err);
      return null;
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // 2. Share Image via Native Mobile Share (Direct WhatsApp Image Attachment)
  const handleShareImageViaWhatsApp = async () => {
    try {
      setIsGeneratingImage(true);
      setStatusMessage("🖼️ Generating HD Bill Image...");

      const blob = await generateInvoiceBlob();
      if (!blob) {
        throw new Error("Could not generate invoice image.");
      }

      const fileName = `Bill_${sale.invoice_number || "Invoice"}.png`;
      const file = new File([blob], fileName, { type: "image/png" });

      if (typeof navigator !== "undefined" && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Bill #${sale.invoice_number}`,
          text: `🧾 Cash Bill from ${effectiveShopName} (#${sale.invoice_number})`,
        });
        setStatusMessage("✓ Bill image shared successfully!");
      } else {
        // Fallback: download image and open WhatsApp
        handleDownloadImage();
        window.open(whatsappUrl, "_blank", "noopener,noreferrer");
        setStatusMessage("✓ Image downloaded! Opening WhatsApp to paste/attach.");
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.warn("Share failed:", err);
        window.open(whatsappUrl, "_blank", "noopener,noreferrer");
      }
    } finally {
      setIsGeneratingImage(false);
      setTimeout(() => setStatusMessage(""), 5000);
    }
  };

  // 3. Download High-Res PNG Image
  const handleDownloadImage = async () => {
    if (!invoiceCardRef.current) return;
    try {
      setIsGeneratingImage(true);
      const dataUrl = await toPng(invoiceCardRef.current, {
        quality: 0.98,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
      });
      const link = document.createElement("a");
      link.download = `Bill_Invoice_${sale.invoice_number || "Receipt"}.png`;
      link.href = dataUrl;
      link.click();
      setStatusMessage("✓ Image downloaded to your device gallery!");
      setTimeout(() => setStatusMessage(""), 4000);
    } catch (err) {
      console.error("Failed to download image", err);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // 4. Copy PNG Bitmap to Clipboard (for WhatsApp Web Ctrl+V)
  const handleCopyImageToClipboard = async () => {
    try {
      setIsGeneratingImage(true);
      const blob = await generateInvoiceBlob();
      if (blob && typeof ClipboardItem !== "undefined") {
        await navigator.clipboard.write([
          new ClipboardItem({
            "image/png": blob,
          }),
        ]);
        setCopiedImage(true);
        setStatusMessage("✓ Image copied to clipboard! Paste (Ctrl+V) directly into WhatsApp Web.");
        setTimeout(() => {
          setCopiedImage(false);
          setStatusMessage("");
        }, 4000);
      }
    } catch (err) {
      console.error("Clipboard image copy failed:", err);
      handleDownloadImage();
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(invoiceMessage);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  const handlePickContact = async () => {
    try {
      const picked = await pickContactFromDevice();
      if (picked) {
        if (picked.phone) setPhone(picked.phone);
        if (picked.name) setCustomRecipientName(picked.name);
      }
    } catch (err: any) {
      alert("Could not access contacts: " + err.message);
    }
  };

  const hasContactPicker = isContactPickerSupported();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="💬 Send WhatsApp Cash Bill / Invoice"
      description={`Instant Image & Text Bill Sharing for Invoice #${sale.invoice_number}`}
      maxWidth="2xl"
    >
      <div className="space-y-4">
        {/* Recipient Phone & Contact Selector */}
        <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-emerald-700" />
              <span>Customer WhatsApp Mobile Number</span>
            </label>

            {hasContactPicker && (
              <button
                type="button"
                onClick={handlePickContact}
                className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 bg-white px-2 py-0.5 rounded-lg border border-emerald-300 shadow-2xs cursor-pointer active:scale-95 transition-all"
                title="Pick number from Phone Contacts"
              >
                <BookUser className="w-3.5 h-3.5" />
                <span>📱 Pick Contact</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-2.5 text-xs font-bold text-gray-500 font-mono">
                +91
              </span>
              <input
                type="tel"
                maxLength={10}
                placeholder="10-digit mobile number"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, "").slice(0, 10))}
                className="w-full pl-12 pr-3 py-2 text-sm font-mono font-bold bg-white border border-emerald-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none text-gray-900 shadow-2xs"
                autoFocus
              />
            </div>

            {customRecipientName && (
              <span className="text-xs font-bold text-emerald-800 bg-white/80 px-2.5 py-2 rounded-xl border border-emerald-200 truncate max-w-[140px]">
                👤 {customRecipientName}
              </span>
            )}
          </div>

          {!isPhoneValid && phone.length > 0 && (
            <p className="text-[11px] text-amber-700 font-medium">
              ⚠️ Please enter full 10-digit Indian mobile number.
            </p>
          )}
        </div>

        {/* Tab Selection: Image vs Text Preview */}
        <div className="flex items-center justify-between border-b border-gray-200 pb-2">
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab("image")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === "image"
                  ? "bg-white text-emerald-800 shadow-xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
              <span>🖼️ Image Bill (फोटो बिल)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("text")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === "text"
                  ? "bg-white text-purple-800 shadow-xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-purple-600" />
              <span>📝 Text Format</span>
            </button>
          </div>

          {activeTab === "image" && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleCopyImageToClipboard}
                disabled={isGeneratingImage}
                className="px-2.5 py-1 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-1 transition-all cursor-pointer"
                title="Copy Image to Clipboard (Ctrl+V in WhatsApp Web)"
              >
                {copiedImage ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copiedImage ? "Copied!" : "Copy Image"}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadImage}
                disabled={isGeneratingImage}
                className="px-2.5 py-1 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-1 transition-all cursor-pointer"
                title="Download PNG Bill Image"
              >
                <Download className="w-3 h-3" />
                <span>Save PNG</span>
              </button>
            </div>
          )}

          {activeTab === "text" && (
            <button
              type="button"
              onClick={handleCopyText}
              className="text-[11px] font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1 bg-purple-50 hover:bg-purple-100 px-2 py-1 rounded-lg transition-colors cursor-pointer"
            >
              {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedText ? "Copied!" : "Copy Text"}</span>
            </button>
          )}
        </div>

        {/* Live Feedback Toast */}
        {statusMessage && (
          <div className="p-2 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-bold text-emerald-900 flex items-center gap-2 animate-in fade-in">
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Preview Container */}
        {activeTab === "image" ? (
          <div className="bg-gray-100 p-3 rounded-2xl overflow-y-auto max-h-[380px] border border-gray-200 flex justify-center scrollbar-thin">
            {/* Scale wrapper so the full 794px card fits nicely on screen while rendering at 100% resolution */}
            <div className="origin-top scale-[0.62] sm:scale-[0.72] md:scale-[0.8] mb-[-120px] transition-transform">
              <AartiBillOfSupplyImage
                ref={invoiceCardRef}
                sale={sale}
                customer={customer}
                printerConfig={effectivePrinterConfig}
                qrCodeDataUrl={qrCodeDataUrl}
              />
            </div>
          </div>
        ) : (
          <pre className="p-3 bg-gray-900 text-gray-100 text-[11px] font-mono rounded-2xl overflow-y-auto max-h-[380px] whitespace-pre-wrap leading-relaxed border border-gray-800 shadow-inner">
            {invoiceMessage}
          </pre>
        )}

        {/* Primary Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-2 pt-2 border-t border-gray-100">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="w-full sm:w-auto text-xs"
          >
            Close
          </Button>

          {/* Primary Action: Send Image Bill to WhatsApp */}
          <button
            type="button"
            onClick={handleShareImageViaWhatsApp}
            disabled={isGeneratingImage}
            className="w-full sm:flex-1 py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all cursor-pointer"
          >
            {isGeneratingImage ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <MessageSquare className="w-4 h-4 text-emerald-200" />
            )}
            <span>
              {isGeneratingImage
                ? "Rendering Image..."
                : "📸 Send Image Bill via WhatsApp (फोटो बिल भेजें)"}
            </span>
          </button>

          {/* Fallback Direct Chat */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto py-2.5 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer border border-gray-200"
            title="Open WhatsApp chat directly"
          >
            <span>Direct Chat</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-60" />
          </a>
        </div>
      </div>
    </Modal>
  );
};
