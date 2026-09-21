"use client";

import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import { buildUpiPaymentUrl } from "@/lib/thermal-printer";

interface UpiQrCodeProps {
  upiId: string;
  payeeName: string;
  amount: number;
  invoiceNumber?: string;
  size?: number;
}

/**
 * Shows a live UPI payment QR (generated locally, no external service) that a customer scans with
 * any UPI app to pay the exact amount. Regenerates whenever the amount changes.
 */
export function UpiQrCode({ upiId, payeeName, amount, invoiceNumber = "Bill", size = 190 }: UpiQrCodeProps) {
  const [dataUrl, setDataUrl] = useState<string>("");
  const [error, setError] = useState(false);

  useEffect(() => {
    const url = buildUpiPaymentUrl(upiId, payeeName, amount, invoiceNumber);
    if (!url) {
      setDataUrl("");
      setError(true);
      return;
    }
    setError(false);
    let alive = true;
    QRCode.toDataURL(url, { margin: 1, width: size })
      .then((d) => {
        if (alive) setDataUrl(d);
      })
      .catch(() => {
        if (alive) setError(true);
      });
    return () => {
      alive = false;
    };
  }, [upiId, payeeName, amount, invoiceNumber, size]);

  if (!upiId || !upiId.includes("@")) {
    return (
      <div className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-center font-semibold">
        UPI ID set nahi hai — Settings → Printer/Bill me apni UPI ID daalein, phir QR yahan dikhega.
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1.5 p-3 bg-white rounded-2xl border-2 border-blue-200 shadow-sm">
      <div className="text-sm font-black text-blue-900">📲 Scan & Pay ₹{Math.max(0, amount).toFixed(2)}</div>
      {dataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={dataUrl} alt="UPI payment QR" width={size} height={size} className="rounded-lg" />
      ) : (
        <div
          style={{ width: size, height: size }}
          className="flex items-center justify-center text-gray-400 text-xs bg-gray-50 rounded-lg"
        >
          {error ? "QR ban nahi paya" : "QR ban raha hai…"}
        </div>
      )}
      <div className="text-[11px] font-mono font-bold text-gray-800">{upiId}</div>
      <div className="text-[10px] text-gray-500">Kisi bhi UPI app (GPay / PhonePe / Paytm) se scan karein</div>
    </div>
  );
}
