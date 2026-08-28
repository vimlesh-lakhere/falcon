"use client";

import React, { useState, useEffect } from "react";
import {
  MessageSquare,
  Share2,
  Phone,
  Copy,
  Check,
  Send,
  User,
  ExternalLink,
  BookUser,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Sale, Customer } from "@/types/database";
import {
  buildWhatsAppInvoiceText,
  sanitizeIndianPhone,
  getWhatsAppShareUrl,
  shareInvoiceViaWhatsAppOrNative,
} from "@/lib/whatsapp-invoice";
import { getPrinterConfig } from "@/lib/thermal-printer";
import { isContactPickerSupported, pickContactFromDevice } from "@/lib/contact-picker";

interface WhatsAppInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale;
  customer?: Customer | null;
  shopId: string;
}

export const WhatsAppInvoiceModal: React.FC<WhatsAppInvoiceModalProps> = ({
  isOpen,
  onClose,
  sale,
  customer,
  shopId,
}) => {
  const [phone, setPhone] = useState<string>("");
  const [customRecipientName, setCustomRecipientName] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);

  const printerConfig = getPrinterConfig(shopId);

  useEffect(() => {
    if (isOpen && sale) {
      const initialPhone = customer?.phone || (sale as any).customer?.phone || "";
      setPhone(sanitizeIndianPhone(initialPhone));
      setCustomRecipientName(customer?.name || (sale as any).customer?.name || "");
      setCopied(false);
      setSendSuccess(false);
    }
  }, [isOpen, sale, customer]);

  if (!isOpen || !sale) return null;

  const invoiceMessage = buildWhatsAppInvoiceText(sale, customer, {
    shopName: printerConfig.shopName,
    shopPhone: printerConfig.shopPhone,
    shopAddress: printerConfig.shopAddress,
    shopGst: printerConfig.shopGst,
    showGstin: printerConfig.showGstin,
    upiId: printerConfig.upiId,
    upiPayeeName: printerConfig.upiPayeeName,
    customFooter: printerConfig.customFooter,
  });

  const cleanPhone = sanitizeIndianPhone(phone);
  const isPhoneValid = cleanPhone.length === 10;
  const whatsappUrl = getWhatsAppShareUrl(cleanPhone, invoiceMessage);

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(invoiceMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  const handleNativeShare = async () => {
    try {
      setIsSharing(true);
      await shareInvoiceViaWhatsAppOrNative(cleanPhone, invoiceMessage, sale.invoice_number);
      setSendSuccess(true);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSharing(false);
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

  const hasNativeShare = typeof navigator !== "undefined" && !!navigator.share;
  const hasContactPicker = isContactPickerSupported();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="💬 Send WhatsApp Cash Bill / Invoice"
      description={`Instant bill sharing for Invoice #${sale.invoice_number}`}
      maxWidth="md"
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

        {/* Live Message Preview */}
        <div>
          <div className="flex items-center justify-between pb-1.5">
            <span className="text-xs font-bold text-gray-700">Invoice Message Preview:</span>
            <button
              type="button"
              onClick={handleCopyText}
              className="text-[11px] font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1 bg-purple-50 hover:bg-purple-100 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copied to Clipboard!" : "Copy Text"}</span>
            </button>
          </div>

          <pre className="p-3 bg-gray-900 text-gray-100 text-[11px] font-mono rounded-2xl overflow-y-auto max-h-56 whitespace-pre-wrap leading-relaxed border border-gray-800 shadow-inner">
            {invoiceMessage}
          </pre>
        </div>

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

          {hasNativeShare && (
            <button
              type="button"
              onClick={handleNativeShare}
              disabled={isSharing}
              className="w-full sm:flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              <span>📱 Share via Mobile Sheet</span>
            </button>
          )}

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              setSendSuccess(true);
            }}
            className={`w-full sm:flex-1 py-2.5 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer ${
              isPhoneValid
                ? "bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white"
                : "bg-emerald-600 hover:bg-emerald-700 text-white"
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>{isPhoneValid ? "💬 Open in WhatsApp" : "💬 Share WhatsApp Bill"}</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-70" />
          </a>
        </div>
      </div>
    </Modal>
  );
};
