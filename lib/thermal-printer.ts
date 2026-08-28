import QRCode from "qrcode";
import { Sale, Customer } from "@/types/database";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export type PaperWidth = "80mm" | "58mm";
export type ConnectionType = "system" | "bluetooth";
export type PrintEngine = "graphics" | "text";
export type FontSizePreference = "compact" | "normal" | "large";
export type ItemLayoutPreference = "wrap-2line" | "single-line";

export interface PrinterConfig {
  paperWidth: PaperWidth;
  connectionType: ConnectionType;
  printEngine: PrintEngine;
  fontSize: FontSizePreference;
  itemLayout: ItemLayoutPreference;
  autoPrint: boolean;
  shopName: string;
  shopPhone: string;
  shopAddress: string;
  shopGst: string;
  customFooter: string;
  showGstin: boolean;
  showCustomerInfo: boolean;
  showQrCode: boolean;
  showDynamicUpiQr: boolean;
  upiId: string;
  upiPayeeName: string;
  bankName: string;
  bankAccountNumber: string;
  bankIfsc: string;
  bluetoothDeviceName?: string;
}

export const DEFAULT_PRINTER_CONFIG: PrinterConfig = {
  paperWidth: "80mm", // ATPOS 80mm thermal printer standard
  connectionType: "bluetooth",
  printEngine: "graphics", // Graphics mode provides 100% Hindi/Devanagari Unicode & QR support
  fontSize: "normal",
  itemLayout: "wrap-2line", // Prevents cutting off long Hindi/English product names
  autoPrint: false,
  shopName: "AGS STORE & COSMETICS",
  shopPhone: "+91 9340362381",
  shopAddress: "Main Market Road, Town Area",
  shopGst: "23AAAAA0000A1Z5",
  customFooter: "Thank you for shopping! Goods once sold can be exchanged within 7 days.",
  showGstin: true,
  showCustomerInfo: true,
  showQrCode: true,
  showDynamicUpiQr: true,
  upiId: "9340362381@ybl",
  upiPayeeName: "AGS Store",
  bankName: "State Bank of India",
  bankAccountNumber: "",
  bankIfsc: "",
};

/**
 * Retrieves persisted printer configuration for the shop.
 */
export function getPrinterConfig(shopId: string): PrinterConfig {
  if (typeof window === "undefined") return DEFAULT_PRINTER_CONFIG;
  try {
    const saved = localStorage.getItem(`falcon_printer_config_${shopId}`);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Migrate legacy invalid default UPI ID if unchanged
      if (parsed.upiId === "9340362381@paytm") {
        parsed.upiId = "9340362381@ybl";
      }
      return { ...DEFAULT_PRINTER_CONFIG, ...parsed };
    }
  } catch (e) {
    console.warn("Could not read printer config from localStorage", e);
  }
  return DEFAULT_PRINTER_CONFIG;
}

/**
 * Saves printer configuration to localStorage.
 */
export function savePrinterConfig(shopId: string, config: PrinterConfig): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`falcon_printer_config_${shopId}`, JSON.stringify(config));
  } catch (e) {
    console.warn("Could not save printer config to localStorage", e);
  }
}

// ---------------------------------------------------------------------------
// Dynamic Bank UPI QR Code Builder
// ---------------------------------------------------------------------------

/**
 * Builds a standardized NPCI UPI Intent URI for dynamic payment.
 * Sanitizes parameters to strictly conform to NPCI specifications:
 * - 'pa': clean VPA (no spaces or encoding)
 * - 'pn': clean alphanumeric business name without '&' or '#'
 * - 'am': decimal amount
 * - 'cu': 'INR'
 * - 'tn': transaction note without '#' (which terminates URL query string)
 */
export function buildUpiPaymentUrl(
  upiId: string,
  payeeName: string,
  amount: number,
  invoiceNumber: string
): string {
  if (!upiId || !upiId.includes("@")) {
    return "";
  }
  const cleanUpi = upiId.trim().replace(/\s+/g, "");

  // NPCI spec: Payee name must not contain '&', '#', or special URL control chars
  const cleanName = (payeeName || "AGS Store")
    .replace(/&/g, "and")
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .trim()
    .slice(0, 40);

  const cleanAmt = Math.max(0, amount).toFixed(2);

  // Note must NOT contain '#' as '#' is the URI fragment delimiter which breaks parameter parsers
  const cleanInvoice = invoiceNumber ? invoiceNumber.replace(/[^a-zA-Z0-9-_]/g, "") : "Bill";
  const cleanNote = `Bill-${cleanInvoice}`;

  return `upi://pay?pa=${cleanUpi}&pn=${encodeURIComponent(cleanName)}&am=${cleanAmt}&cu=INR&tn=${encodeURIComponent(cleanNote)}`;
}

// ---------------------------------------------------------------------------
// Web Bluetooth ESC/POS Direct Driver with Auto-Reconnect
// ---------------------------------------------------------------------------

let cachedBluetoothDevice: any = null;
let cachedCharacteristic: any = null;
let isConnectingGatt = false;

// Standard Bluetooth Print UUIDs (including ATPOS, MPT-III, PT-210, RPP, POS-58/80)
const BT_PRINTER_SERVICES = [
  "000018f0-0000-1000-8000-00805f9b34fb",
  "49535343-fe7d-4ae5-8fa9-9fafd205e455",
  "e7810a71-73ae-499d-8c15-faa9aef0c3f2",
  "0000ae00-0000-1000-8000-00805f9b34fb",
  "0000af00-0000-1000-8000-00805f9b34fb",
  0x18f0,
  0xff00,
];

/**
 * Helper to discover write characteristic on a GATT server.
 */
async function discoverWriteCharacteristic(server: any): Promise<any> {
  const services = await server.getPrimaryServices();
  for (const service of services) {
    const chars = await service.getCharacteristics();
    for (const c of chars) {
      if (c.properties.write || c.properties.writeWithoutResponse) {
        return c;
      }
    }
  }
  return null;
}

/**
 * Re-establishes connection to an already known Bluetooth device
 * without popping the browser device chooser dialog.
 */
async function connectToDevice(device: any, maxRetries = 3): Promise<any> {
  let lastError: any = null;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (device.gatt?.connected && cachedCharacteristic) {
        return cachedCharacteristic;
      }
      isConnectingGatt = true;
      const server = await device.gatt.connect();
      const writeChar = await discoverWriteCharacteristic(server);
      if (!writeChar) {
        throw new Error("Could not find writable print channel on the connected printer.");
      }
      cachedCharacteristic = writeChar;
      return writeChar;
    } catch (err: any) {
      lastError = err;
      console.warn(`[Bluetooth] Connection attempt ${attempt}/${maxRetries} failed:`, err);
      if (attempt < maxRetries) {
        await new Promise((res) => setTimeout(res, 400 * attempt));
      }
    } finally {
      isConnectingGatt = false;
    }
  }
  throw lastError || new Error("Failed to connect to Bluetooth printer.");
}

/**
 * Attaches a disconnect listener to handle automatic recovery.
 */
function attachDeviceListeners(device: any) {
  if (!device) return;
  device.removeEventListener?.("gattserverdisconnected", onGattDisconnected);
  device.addEventListener?.("gattserverdisconnected", onGattDisconnected);
}

function onGattDisconnected(event: any) {
  console.log("[Bluetooth] Thermal Printer disconnected. Ready for auto-reconnect on next print.", event);
  cachedCharacteristic = null;
}

/**
 * Explicitly pairs a new Bluetooth Thermal Printer.
 */
export async function pairBluetoothPrinter(): Promise<string> {
  if (typeof navigator === "undefined" || !(navigator as any).bluetooth) {
    throw new Error(
      "Web Bluetooth is not supported on this browser. Please use Chrome on Android/Desktop over HTTPS or localhost."
    );
  }

  const device = await (navigator as any).bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: BT_PRINTER_SERVICES,
  });

  if (!device) {
    throw new Error("No printer selected");
  }

  cachedBluetoothDevice = device;
  attachDeviceListeners(device);

  await connectToDevice(device);
  return device.name || "Bluetooth Thermal Printer";
}

/**
 * Returns current Bluetooth printer connection state.
 */
export function getBluetoothPrinterState(): "connected" | "paired" | "disconnected" | "unsupported" {
  if (typeof navigator === "undefined" || !(navigator as any).bluetooth) {
    return "unsupported";
  }
  if (cachedBluetoothDevice?.gatt?.connected && cachedCharacteristic) {
    return "connected";
  }
  if (cachedBluetoothDevice) {
    return "paired";
  }
  return "disconnected";
}

/**
 * Gets or reconnects to the active Bluetooth printer.
 * If already paired, reconnects transparently without prompting.
 */
export async function ensureBluetoothPrinter(): Promise<any> {
  if (cachedBluetoothDevice?.gatt?.connected && cachedCharacteristic) {
    return cachedCharacteristic;
  }

  if (cachedBluetoothDevice) {
    try {
      return await connectToDevice(cachedBluetoothDevice);
    } catch (e) {
      console.warn("[Bluetooth] Transparent auto-reconnect failed, requesting device selection...", e);
    }
  }

  // Fallback to pairing prompt if device is not cached or reconnect failed
  await pairBluetoothPrinter();
  return cachedCharacteristic;
}

/**
 * Sends ESC/POS byte buffer to Bluetooth printer with chunking and flow control.
 */
export async function sendBluetoothEscPos(data: Uint8Array): Promise<void> {
  const writeChar = await ensureBluetoothPrinter();
  if (!writeChar) {
    throw new Error("Printer channel not ready. Please re-pair your Bluetooth printer.");
  }

  // ATPOS and standard thermal printers handle 100-byte packets reliably
  const CHUNK_SIZE = 100;
  for (let i = 0; i < data.length; i += CHUNK_SIZE) {
    const chunk = data.slice(i, i + CHUNK_SIZE);
    try {
      if (writeChar.writeValueWithoutResponse) {
        await writeChar.writeValueWithoutResponse(chunk);
      } else {
        await writeChar.writeValue(chunk);
      }
    } catch (err) {
      // One retry attempt if connection briefly dropped mid-print
      console.warn("[Bluetooth] Transmission glitch, retrying chunk...", err);
      const reconnectedChar = await ensureBluetoothPrinter();
      if (reconnectedChar.writeValueWithoutResponse) {
        await reconnectedChar.writeValueWithoutResponse(chunk);
      } else {
        await reconnectedChar.writeValue(chunk);
      }
    }
    // Small inter-packet delay prevents printer buffer overflow
    if (i + CHUNK_SIZE < data.length) {
      await new Promise((r) => setTimeout(r, 12));
    }
  }
}

// ---------------------------------------------------------------------------
// 100% Hindi / Unicode ESC/POS Canvas Raster Bitmap Generator
// ---------------------------------------------------------------------------

/**
 * Renders the bill into a high-contrast HTML5 Canvas with full Devanagari / Hindi
 * font support, crisp QR codes, and formatted tables, then converts it to 1-bit
 * ESC/POS raster image command (`GS v 0`).
 */
export async function buildRasterGraphicsReceipt(
  sale: Sale,
  customer: Customer | null | undefined,
  config: PrinterConfig
): Promise<Uint8Array> {
  if (typeof document === "undefined") {
    return buildEscPosReceipt(sale, customer, config);
  }

  // 80mm = 576 dots printable width; 58mm = 384 dots printable width (at 203 DPI standard)
  const is80mm = config.paperWidth === "80mm";
  const canvasWidth = is80mm ? 576 : 384;
  const paddingX = is80mm ? 16 : 8;
  const contentWidth = canvasWidth - paddingX * 2;

  // Font scale multipliers
  const scale = config.fontSize === "large" ? 1.2 : config.fontSize === "compact" ? 0.88 : 1.0;
  const baseFontSize = Math.round((is80mm ? 22 : 18) * scale);
  const titleFontSize = Math.round((is80mm ? 32 : 24) * scale);
  const smallFontSize = Math.round((is80mm ? 18 : 15) * scale);

  // Generate Dynamic QR Code image if enabled
  let qrImage: HTMLImageElement | null = null;
  if (config.showQrCode && config.showDynamicUpiQr && config.upiId) {
    const upiUrl = buildUpiPaymentUrl(
      config.upiId,
      config.upiPayeeName || config.shopName,
      Number(sale.total_amount) || 0,
      sale.invoice_number
    );
    if (upiUrl) {
      try {
        const qrDataUrl = await QRCode.toDataURL(upiUrl, {
          width: is80mm ? 200 : 160,
          margin: 1,
          errorCorrectionLevel: "M",
          color: { dark: "#000000", light: "#ffffff" },
        });
        qrImage = await new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = qrDataUrl;
        });
      } catch (e) {
        console.warn("Could not generate QR code data URL", e);
      }
    }
  }

  // Measure and precalculate height using a scratch canvas
  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth;
  canvas.height = 3000; // temporary max height
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return buildEscPosReceipt(sale, customer, config);
  }

  // Setup high-contrast pure black and white styling
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#000000";
  ctx.textBaseline = "top";

  const fontDevanagari =
    "'Noto Sans Devanagari', 'Mangal', 'Nirmala UI', 'Segoe UI', 'Roboto', 'Arial', sans-serif";

  let y = 16;

  // Helper to draw centered text with wrapping
  const drawCenteredText = (text: string, fontSize: number, isBold = false) => {
    ctx.font = `${isBold ? "bold " : ""}${fontSize}px ${fontDevanagari}`;
    ctx.textAlign = "center";
    ctx.fillText(text, canvasWidth / 2, y);
    y += fontSize + 6;
  };

  // Helper to draw dashed separator line
  const drawDashedLine = () => {
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(paddingX, y + 4);
    ctx.lineTo(canvasWidth - paddingX, y + 4);
    ctx.stroke();
    ctx.setLineDash([]);
    y += 12;
  };

  // Helper to draw key-value pair
  const drawRow = (left: string, right: string, fontSize: number, isBold = false) => {
    ctx.font = `${isBold ? "bold " : ""}${fontSize}px ${fontDevanagari}`;
    ctx.textAlign = "left";
    ctx.fillText(left, paddingX, y);
    ctx.textAlign = "right";
    ctx.fillText(right, canvasWidth - paddingX, y);
    y += fontSize + 6;
  };

  // 1. Header (Store Title)
  drawCenteredText(config.shopName || "FALCON STORE", titleFontSize, true);
  if (config.shopAddress) drawCenteredText(config.shopAddress, smallFontSize);
  if (config.shopPhone) drawCenteredText(`Tel: ${config.shopPhone}`, smallFontSize);
  if (config.showGstin && config.shopGst) drawCenteredText(`GSTIN: ${config.shopGst}`, smallFontSize, true);

  drawDashedLine();

  // 2. Invoice & Customer Meta
  drawRow(`Invoice: #${sale.invoice_number}`, formatDateTime(sale.created_at || new Date().toISOString()), smallFontSize);

  const custName = customer?.name || (sale as any).customer?.name;
  const custPhone = customer?.phone || (sale as any).customer?.phone;
  if (config.showCustomerInfo && custName) {
    drawRow(`Customer: ${custName}`, custPhone ? `+91 ${custPhone}` : "", smallFontSize);
  }

  drawDashedLine();

  // 3. Items Table Header
  ctx.font = `bold ${smallFontSize}px ${fontDevanagari}`;
  ctx.textAlign = "left";
  ctx.fillText("ITEM DESCRIPTION", paddingX, y);
  ctx.textAlign = "right";
  ctx.fillText("AMOUNT (₹)", canvasWidth - paddingX, y);
  y += smallFontSize + 6;
  drawDashedLine();

  // 4. Items List (with clean 2-line wrapping for long Hindi / English names)
  const items = sale.items || [];
  items.forEach((it: any, idx: number) => {
    const rawName = it.product?.name || it.product_name || it.name || it.title || `Item ${idx + 1}`;
    const unitLabel = it.unit_name ? ` (${it.unit_name})` : "";
    const qty = it.quantity || 1;
    const unitPrice = Number(it.unit_price) || 0;
    const lineTotal = (qty * unitPrice).toFixed(2);

    if (config.itemLayout === "wrap-2line") {
      // Line 1: Full Product Name (Wrapped if very long)
      ctx.font = `bold ${baseFontSize}px ${fontDevanagari}`;
      ctx.textAlign = "left";

      // Simple word wrapping for product name
      const maxTextWidth = contentWidth - 4;
      const words = rawName.split(" ");
      let currentLine = "";

      for (let n = 0; n < words.length; n++) {
        const testLine = currentLine ? `${currentLine} ${words[n]}` : words[n];
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxTextWidth && n > 0) {
          ctx.fillText(currentLine, paddingX, y);
          y += baseFontSize + 4;
          currentLine = words[n];
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) {
        ctx.fillText(currentLine, paddingX, y);
        y += baseFontSize + 4;
      }

      // Line 2: Qty x Rate = Line Total
      ctx.font = `${smallFontSize}px ${fontDevanagari}`;
      ctx.textAlign = "left";
      ctx.fillText(`  ${qty}${unitLabel} × ₹${unitPrice.toFixed(2)}`, paddingX, y);
      ctx.textAlign = "right";
      ctx.font = `bold ${baseFontSize}px ${fontDevanagari}`;
      ctx.fillText(`₹${lineTotal}`, canvasWidth - paddingX, y);
      y += baseFontSize + 8;
    } else {
      // Single line compact mode
      const truncatedName = rawName.length > 20 ? rawName.slice(0, 19) + "…" : rawName;
      drawRow(`${truncatedName} (${qty})`, `₹${lineTotal}`, baseFontSize, true);
    }
  });

  drawDashedLine();

  // 5. Bill Summary & Grand Total
  drawRow("Subtotal:", `₹${Number(sale.subtotal || 0).toFixed(2)}`, baseFontSize);
  if (Number(sale.discount_amount) > 0) {
    drawRow("Discount:", `-₹${Number(sale.discount_amount).toFixed(2)}`, baseFontSize);
  }
  if (Number(sale.tax_amount) > 0) {
    drawRow("GST / Tax:", `+₹${Number(sale.tax_amount).toFixed(2)}`, baseFontSize);
  }

  // Grand Total Highlight
  y += 4;
  ctx.fillStyle = "#000000";
  ctx.fillRect(paddingX, y, contentWidth, baseFontSize + 16);
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold ${baseFontSize + 4}px ${fontDevanagari}`;
  ctx.textAlign = "left";
  ctx.fillText("GRAND TOTAL", paddingX + 8, y + 6);
  ctx.textAlign = "right";
  ctx.fillText(`₹${Number(sale.total_amount).toFixed(2)}`, canvasWidth - paddingX - 8, y + 6);
  ctx.fillStyle = "#000000";
  y += baseFontSize + 26;

  // Payments
  const payments = sale.payments || [];
  const payMethod = payments.map((p) => p.method.toUpperCase()).join(", ") || "CASH";
  drawRow("Payment Mode:", payMethod, smallFontSize, true);

  // 6. Dynamic Bank UPI QR Code Section
  if (qrImage) {
    drawDashedLine();
    drawCenteredText("📱 SCAN & PAY WITH ANY UPI APP", smallFontSize, true);
    drawCenteredText(`Exact Amount: ₹${Number(sale.total_amount).toFixed(2)}`, baseFontSize, true);

    const qrSize = qrImage.width;
    const qrX = (canvasWidth - qrSize) / 2;
    ctx.drawImage(qrImage, qrX, y);
    y += qrSize + 6;

    drawCenteredText(`UPI ID: ${config.upiId}`, smallFontSize);
    if (config.bankAccountNumber) {
      drawCenteredText(`A/c: ${config.bankAccountNumber} • IFSC: ${config.bankIfsc || "N/A"}`, smallFontSize - 2);
    }
  }

  // 7. Footer Note
  drawDashedLine();
  drawCenteredText("*** THANK YOU FOR SHOPPING! ***", smallFontSize, true);
  if (config.customFooter) {
    drawCenteredText(config.customFooter, smallFontSize - 2);
  }
  drawCenteredText("Powered by Falcon Store ERP", smallFontSize - 3);

  y += 24; // Bottom margin

  // Crop canvas to actual rendered content height
  const finalCanvas = document.createElement("canvas");
  finalCanvas.width = canvasWidth;
  finalCanvas.height = y;
  const finalCtx = finalCanvas.getContext("2d");
  if (!finalCtx) return buildEscPosReceipt(sale, customer, config);

  finalCtx.fillStyle = "#ffffff";
  finalCtx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
  finalCtx.drawImage(canvas, 0, 0);

  // Convert Canvas pixels to ESC/POS 1-bit raster bit image (`GS v 0`)
  return convertCanvasToEscPosRaster(finalCanvas);
}

/**
 * Converts an HTML5 Canvas into a 1-bit monochrome ESC/POS raster byte buffer (`GS v 0`).
 */
export function convertCanvasToEscPosRaster(canvas: HTMLCanvasElement): Uint8Array {
  const ctx = canvas.getContext("2d");
  if (!ctx) return new Uint8Array();

  const width = canvas.width;
  const height = canvas.height;
  const imgData = ctx.getImageData(0, 0, width, height);
  const pixels = imgData.data;

  const widthBytes = Math.ceil(width / 8);
  const rasterData: number[] = [];

  // ESC/POS Commands
  const ESC = 0x1b;
  const GS = 0x1d;

  // 1. Initialize printer
  rasterData.push(ESC, 0x40);

  // 2. Line spacing 0
  rasterData.push(ESC, 0x33, 0x00);

  // 3. Center alignment
  rasterData.push(ESC, 0x61, 0x01);

  // 4. GS v 0 Command Header
  // GS v 0 m xL xH yL yH
  const xL = widthBytes & 0xff;
  const xH = (widthBytes >> 8) & 0xff;
  const yL = height & 0xff;
  const yH = (height >> 8) & 0xff;

  rasterData.push(GS, 0x76, 0x30, 0x00, xL, xH, yL, yH);

  // 5. Pixel thresholding (1 = Black, 0 = White)
  for (let row = 0; row < height; row++) {
    for (let colByte = 0; colByte < widthBytes; colByte++) {
      let byteVal = 0;
      for (let bit = 0; bit < 8; bit++) {
        const col = colByte * 8 + bit;
        if (col < width) {
          const pixelIndex = (row * width + col) * 4;
          const r = pixels[pixelIndex];
          const g = pixels[pixelIndex + 1];
          const b = pixels[pixelIndex + 2];
          const a = pixels[pixelIndex + 3];

          // High-contrast luminance calculation
          const isDark = a > 128 && (0.299 * r + 0.587 * g + 0.114 * b) < 180;
          if (isDark) {
            byteVal |= 1 << (7 - bit);
          }
        }
      }
      rasterData.push(byteVal);
    }
  }

  // 6. Reset line spacing & feed paper + cut
  rasterData.push(ESC, 0x32); // Default line spacing
  rasterData.push(ESC, 0x64, 0x04); // Feed 4 lines
  rasterData.push(GS, 0x56, 0x41, 0x00); // Partial cut

  return new Uint8Array(rasterData);
}

/**
 * Builds ESC/POS ASCII binary payload for a bill receipt (fallback mode).
 */
export function buildEscPosReceipt(
  sale: Sale,
  customer: Customer | null | undefined,
  config: PrinterConfig
): Uint8Array {
  const encoder = new TextEncoder();
  const buffer: number[] = [];

  const write = (str: string) => {
    const bytes = encoder.encode(str);
    for (let i = 0; i < bytes.length; i++) buffer.push(bytes[i]);
  };

  const writeBytes = (...bytes: number[]) => {
    buffer.push(...bytes);
  };

  const ESC = 0x1b;
  const GS = 0x1d;

  // Initialize printer
  writeBytes(ESC, 0x40);

  // Center align
  writeBytes(ESC, 0x61, 0x01);

  // Shop Header (Double size + Bold)
  writeBytes(ESC, 0x21, 0x30);
  write(`${config.shopName || "FALCON STORE"}\n`);

  writeBytes(ESC, 0x21, 0x00);
  if (config.shopAddress) write(`${config.shopAddress}\n`);
  if (config.shopPhone) write(`Tel: ${config.shopPhone}\n`);
  if (config.showGstin && config.shopGst) write(`GSTIN: ${config.shopGst}\n`);

  const lineWidth = config.paperWidth === "80mm" ? 44 : 32;
  const separator = "-".repeat(lineWidth) + "\n";
  write(separator);

  // Left align
  writeBytes(ESC, 0x61, 0x00);

  // Invoice & Date
  write(`Invoice : #${sale.invoice_number}\n`);
  write(`Date    : ${formatDateTime(sale.created_at || new Date().toISOString())}\n`);
  if (config.showCustomerInfo && (customer?.name || (sale as any).customer?.name)) {
    const cName = customer?.name || (sale as any).customer?.name;
    const cPhone = customer?.phone || (sale as any).customer?.phone;
    write(`Customer: ${cName}${cPhone ? ` (${cPhone})` : ""}\n`);
  }
  write(separator);

  // Items Header
  writeBytes(ESC, 0x45, 0x01);
  if (config.paperWidth === "80mm") {
    write("ITEM                     QTY    PRICE   TOTAL\n");
  } else {
    write("ITEM              QTY   PRICE   TOTAL\n");
  }
  writeBytes(ESC, 0x45, 0x00);
  write(separator);

  // Items rows
  const items = sale.items || [];
  items.forEach((it: any) => {
    const pName = it.product?.name || it.product_name || it.name || "Item";
    const unitStr = it.unit_name ? ` (${it.unit_name})` : "";
    const qtyStr = `${it.quantity}${unitStr}`;
    const priceStr = `${Number(it.unit_price)}`;
    const totalStr = `${Number(it.unit_price) * it.quantity}`;

    if (config.itemLayout === "wrap-2line") {
      write(`${pName}\n`);
      const details = `  ${qtyStr} x Rs.${priceStr} = Rs.${totalStr}\n`;
      write(details);
    } else {
      const truncated = pName.slice(0, config.paperWidth === "80mm" ? 22 : 14);
      if (config.paperWidth === "80mm") {
        write(`${truncated.padEnd(23)} ${qtyStr.padEnd(6)} ${priceStr.padStart(6)} ${totalStr.padStart(7)}\n`);
      } else {
        write(`${truncated.padEnd(15)} ${qtyStr.padEnd(5)} ${priceStr.padStart(5)} ${totalStr.padStart(6)}\n`);
      }
    }
  });

  write(separator);

  // Totals (Right Align)
  writeBytes(ESC, 0x61, 0x02);
  write(`Subtotal: INR ${sale.subtotal}\n`);
  if (Number(sale.discount_amount) > 0) {
    write(`Discount: -INR ${sale.discount_amount}\n`);
  }
  if (Number(sale.tax_amount) > 0) {
    write(`GST/Tax: +INR ${sale.tax_amount}\n`);
  }

  // Final Total (Double size + Bold)
  writeBytes(ESC, 0x45, 0x01);
  writeBytes(ESC, 0x21, 0x10);
  write(`TOTAL: INR ${sale.total_amount}\n`);
  writeBytes(ESC, 0x21, 0x00);
  writeBytes(ESC, 0x45, 0x00);

  const payments = sale.payments || [];
  const payMethod = payments.map((p) => p.method.toUpperCase()).join(", ") || "CASH";
  write(`Payment: ${payMethod}\n`);

  if (config.showQrCode && config.upiId) {
    writeBytes(ESC, 0x61, 0x01);
    write(separator);
    write(`UPI Payment: ${config.upiId}\n`);
  }

  // Footer (Center Align)
  writeBytes(ESC, 0x61, 0x01);
  write(separator);
  if (config.customFooter) {
    write(`${config.customFooter}\n`);
  } else {
    write("Thank you! Visit again.\n");
  }

  write("\n\n\n\n");
  writeBytes(GS, 0x56, 0x41, 0x00);

  return new Uint8Array(buffer);
}

/**
 * Generates an instant sample Test Print payload.
 */
export async function buildTestPrintPayload(config: PrinterConfig): Promise<Uint8Array> {
  const sampleSale: any = {
    invoice_number: "TEST-001",
    created_at: new Date().toISOString(),
    subtotal: 550,
    discount_amount: 50,
    tax_amount: 0,
    total_amount: 500,
    items: [
      { product_name: "पतंजलि दंत कान्ति टूथपेस्ट 100g", unit_name: "Pc", quantity: 2, unit_price: 100 },
      { product_name: "Maybelline Matte Lipstick Red", unit_name: "Pc", quantity: 1, unit_price: 350 },
    ],
    payments: [{ method: "cash", amount: 500 }],
  };

  const sampleCustomer: any = {
    name: "रोहित शर्मा (Rohit Sharma)",
    phone: "9876543210",
  };

  if (config.printEngine === "graphics") {
    return await buildRasterGraphicsReceipt(sampleSale, sampleCustomer, config);
  }
  return buildEscPosReceipt(sampleSale, sampleCustomer, config);
}
