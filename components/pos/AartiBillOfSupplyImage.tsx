"use client";

import React, { forwardRef } from "react";
import { Sale, Customer } from "@/types/database";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { numberToIndianWords } from "@/lib/number-to-words";
import { PrinterConfig, getProductDisplayName } from "@/lib/thermal-printer";

interface AartiBillOfSupplyImageProps {
  sale: Sale;
  customer?: Customer | null;
  printerConfig: PrinterConfig;
  qrCodeDataUrl?: string;
}

export const AartiBillOfSupplyImage = forwardRef<HTMLDivElement, AartiBillOfSupplyImageProps>(
  ({ sale, customer, printerConfig, qrCodeDataUrl }, ref) => {
    const shopName = printerConfig.shopName || "Aarti General Store";
    const shopPhone = printerConfig.shopPhone || "9340362381";
    const shopAddress = printerConfig.shopAddress || "dudhnath mandir gali no 2, Chhatarpur, Madhya Pradesh, 471001";
    const rawGst = printerConfig.shopGst?.trim();
    const showGst = printerConfig.showGstin && rawGst && rawGst !== "23AAAAA0000A1Z5";

    const custName = customer?.name || (sale as any).customer?.name || "Walk-in Customer";
    const custPhone = customer?.phone || (sale as any).customer?.phone || "";

    const items = sale.items || [];
    const totalQty = items.reduce((acc: number, it: any) => acc + (Number(it.quantity) || 0), 0);
    const subtotal = Number(sale.subtotal) || Number(sale.total_amount) || 0;
    const totalAmount = Number(sale.total_amount) || 0;
    const discountAmount = Number(sale.discount_amount) || 0;
    const taxAmount = Number(sale.tax_amount) || 0;

    // Calculate Paid / Balance, including the customer's earlier khata due.
    const payments = sale.payments || [];
    const receivedAmount = payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
    // Customer's total outstanding AFTER this bill (already includes this bill's unpaid part).
    const custBalanceAfter = Number(customer?.outstanding_balance ?? (sale as any).customer?.outstanding_balance ?? 0);
    const todayDue = Math.max(0, totalAmount - receivedAmount);
    // Previous (old) balance the customer already owed before this bill.
    const previousBalance = Math.max(0, custBalanceAfter - todayDue);
    // Grand total the customer owes = this bill + old balance.
    const grandTotalDue = Math.round((totalAmount + previousBalance) * 100) / 100;
    // What remains after today's payment.
    const currentBalance = Math.max(0, Math.round((grandTotalDue - receivedAmount) * 100) / 100);

    const invoiceDateStr = sale.created_at
      ? new Date(sale.created_at).toLocaleString("en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        })
      : new Date().toLocaleString("en-GB");

    // Calculate Due Date (7 days ahead as standard default)
    const dueDate = new Date(sale.created_at ? new Date(sale.created_at).getTime() + 7 * 24 * 60 * 60 * 1000 : Date.now() + 7 * 24 * 60 * 60 * 1000);
    const dueDateStr = dueDate.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    return (
      <div
        ref={ref}
        id="aarti-invoice-render-card"
        className="w-[794px] bg-white text-[#1e293b] p-8 font-sans select-none relative box-border mx-auto border-[3px] border-[#d4af37]"
        style={{
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
          fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        }}
      >
        {/* Golden Corner Ornamental Accents */}
        <div className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-[#d4af37]" />
        <div className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-[#d4af37]" />
        <div className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-[#d4af37]" />
        <div className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-[#d4af37]" />

        {/* Top Header Section */}
        <div className="flex justify-between items-start border-b border-gray-200 pb-4 mb-4">
          <div className="space-y-1 max-w-[480px]">
            <h1 className="text-3xl font-black tracking-tight text-[#0f172a] font-serif">
              {shopName}
            </h1>
            <div className="flex items-center gap-1.5 text-xs text-gray-700 font-medium">
              <span>📞</span>
              <span>{shopPhone}</span>
            </div>
            <div className="flex items-start gap-1.5 text-xs text-gray-600 leading-snug">
              <span>📍</span>
              <span>{shopAddress}</span>
            </div>
            {showGst && (
              <div className="text-xs font-bold text-gray-700 pt-0.5">
                🏛️ GSTIN: <span className="font-mono">{rawGst}</span>
              </div>
            )}
          </div>

          <div className="text-right flex flex-col items-end space-y-1.5">
            <h2 className="text-xl font-black tracking-wider text-[#1e293b] uppercase">
              BILL OF SUPPLY
            </h2>
            <span className="text-[10px] font-bold text-gray-600 border border-gray-300 rounded px-2 py-0.5 uppercase tracking-widest bg-gray-50">
              ORIGINAL FOR RECIPIENT
            </span>
          </div>
        </div>

        {/* Invoice Meta Grid */}
        <div className="grid grid-cols-3 gap-4 border-b border-gray-200 pb-3 mb-4 text-xs">
          <div>
            <span className="text-gray-500 block text-[11px] font-medium">Invoice No.</span>
            <span className="font-bold text-[#0f172a] text-sm">#{sale.invoice_number}</span>
          </div>
          <div>
            <span className="text-gray-500 block text-[11px] font-medium">Invoice Date</span>
            <span className="font-semibold text-gray-800">{invoiceDateStr}</span>
          </div>
          <div>
            <span className="text-gray-500 block text-[11px] font-medium">Due Date</span>
            <span className="font-semibold text-gray-800">{dueDateStr}</span>
          </div>
        </div>

        {/* Bill To Section */}
        <div className="border-b border-gray-200 pb-3 mb-4">
          <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">
            Bill To
          </div>
          <div className="font-bold text-sm text-[#0f172a]">{custName}</div>
          {custPhone && (
            <div className="text-xs text-gray-600 font-medium">
              Mobile: <span className="font-mono">{custPhone}</span>
            </div>
          )}
          {customer?.address && (
            <div className="text-xs text-gray-500 mt-0.5">{customer.address}</div>
          )}
        </div>

        {/* Items Table */}
        <div className="mb-4">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-[#e2e8f0] text-gray-800 font-bold border-t border-b border-gray-300">
                <th className="py-2.5 px-3 text-center w-12">No</th>
                <th className="py-2.5 px-3">Items</th>
                <th className="py-2.5 px-3 text-center w-28">Qty.</th>
                <th className="py-2.5 px-3 text-right w-24">Rate</th>
                <th className="py-2.5 px-3 text-right w-24">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((it: any, idx: number) => {
                const pName = getProductDisplayName(it, printerConfig.billLanguage || "hindi");
                const unitLabel = it.unit_name ? ` ${it.unit_name.toUpperCase()}` : " PCS";
                const unitPrice = Number(it.unit_price) || 0;
                const lineTotal = unitPrice * Number(it.quantity || 1);

                return (
                  <tr key={idx} className="hover:bg-gray-50/50">
                    <td className="py-2 px-3 text-center text-gray-500 font-medium">{idx + 1}</td>
                    <td className="py-2 px-3 font-semibold text-gray-900">{pName}</td>
                    <td className="py-2 px-3 text-center font-bold text-gray-700">
                      {it.quantity} {unitLabel}
                    </td>
                    <td className="py-2 px-3 text-right font-medium text-gray-700 tabular-nums">
                      {unitPrice.toFixed(2)}
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-gray-900 tabular-nums">
                      {lineTotal.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              {/* Subtotal Row */}
              <tr className="bg-[#f1f5f9] font-black text-xs text-gray-900 border-t-2 border-b border-gray-300">
                <td colSpan={2} className="py-2.5 px-3 uppercase tracking-wider">
                  SUBTOTAL
                </td>
                <td className="py-2.5 px-3 text-center font-black">{totalQty}</td>
                <td className="py-2.5 px-3 text-right text-gray-500">—</td>
                <td className="py-2.5 px-3 text-right font-black tabular-nums">
                  ₹ {subtotal.toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Bottom Split Section: Bank & QR on Left | Financial Summary on Right */}
        <div className="grid grid-cols-2 gap-8 border-t border-gray-200 pt-4 mt-auto">
          {/* Left Column: Bank Details & QR Code */}
          <div className="space-y-4 text-xs">
            {/* Bank Details */}
            <div className="space-y-1">
              <div className="font-bold text-gray-800 text-[11px] uppercase tracking-wider">
                Bank Details
              </div>
              <div className="grid grid-cols-3 gap-1 text-[11px] text-gray-600">
                <span className="text-gray-500">Name</span>
                <span className="col-span-2 font-semibold text-gray-900">
                  {printerConfig.upiPayeeName || "Sitaram lakhere"}
                </span>

                <span className="text-gray-500">IFSC</span>
                <span className="col-span-2 font-mono font-semibold text-gray-900">
                  SBIN0001628
                </span>

                <span className="text-gray-500">Account No</span>
                <span className="col-span-2 font-mono font-semibold text-gray-900">
                  32344135633
                </span>

                <span className="text-gray-500">Bank Name</span>
                <span className="col-span-2 font-semibold text-gray-900">
                  State Bank of India, ADB CHHATARPUR
                </span>
              </div>
            </div>

            {/* Payment QR Code */}
            {qrCodeDataUrl && (
              <div className="flex items-center gap-3 pt-2">
                <div className="p-1.5 border-2 border-gray-800 rounded-xl bg-white shadow-xs">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrCodeDataUrl}
                    alt="Payment QR Code"
                    className="w-28 h-28 object-contain"
                  />
                </div>
                <div className="space-y-1">
                  <div className="font-bold text-xs text-gray-900">Scan & Pay via UPI</div>
                  <div className="flex items-center gap-1.5 text-[9px] font-bold text-purple-700">
                    <span>PhonePe</span> • <span>GPay</span> • <span>Paytm</span> • <span>UPI</span>
                  </div>
                  <div className="text-[10px] font-mono font-bold text-gray-700">
                    UPI ID: {printerConfig.upiId || "9424970040@axl"}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Calculations & Signature Box */}
          <div className="space-y-3 text-xs">
            <div className="space-y-1.5 border-b border-gray-200 pb-2.5">
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Discount:</span>
                  <span>- ₹ {discountAmount.toFixed(2)}</span>
                </div>
              )}
              {taxAmount > 0 && (
                <div className="flex justify-between text-gray-700">
                  <span>GST / Tax:</span>
                  <span>+ ₹ {taxAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-sm font-black text-gray-900 pt-1">
                <span className="text-base">Total Amount (आज का बिल)</span>
                <span className="text-lg text-[#0f172a] tabular-nums">
                  ₹ {totalAmount.toFixed(2)}
                </span>
              </div>
              {previousBalance > 0 && (
                <div className="flex justify-between text-gray-600 pt-0.5 text-[11px]">
                  <span>Previous Balance (पिछला बकाया)</span>
                  <span className="font-semibold text-gray-800">+ ₹ {previousBalance.toFixed(2)}</span>
                </div>
              )}
              {previousBalance > 0 && (
                <div className="flex justify-between text-gray-900 text-[11px] font-black border-t border-gray-200 pt-0.5">
                  <span>Grand Total (कुल बकाया)</span>
                  <span className="tabular-nums">₹ {grandTotalDue.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-600 pt-0.5 text-[11px]">
                <span>Received / जमा</span>
                <span className="font-semibold text-gray-800">− ₹ {receivedAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[11px] font-bold border-t border-gray-200 pt-0.5">
                <span className="text-gray-800">
                  {previousBalance > 0 ? "Current Balance (कुल बाकी)" : "Current Balance (बाकी)"}
                </span>
                <span className={`${currentBalance > 0 ? "text-amber-700" : "text-emerald-700"}`}>
                  ₹ {currentBalance.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Total in Words */}
            <div className="text-[11px] text-gray-700">
              <span className="font-bold text-gray-800 block">Total Amount (in words)</span>
              <span className="italic font-medium text-gray-600">
                {numberToIndianWords(totalAmount)}
              </span>
            </div>

            {/* Signature Box */}
            <div className="pt-2">
              <div className="border border-gray-300 rounded-xl p-3 text-center h-20 flex flex-col justify-end bg-gray-50/50">
                <span className="text-[10px] text-gray-500 block font-medium">Signature</span>
                <span className="text-xs font-bold text-gray-800 font-serif">
                  {shopName}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

AartiBillOfSupplyImage.displayName = "AartiBillOfSupplyImage";
