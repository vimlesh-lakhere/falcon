import { Sale, Customer } from "@/types/database";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export type PaperWidth = "80mm" | "58mm";
export type ConnectionType = "system" | "bluetooth";

export interface PrinterConfig {
  paperWidth: PaperWidth;
  connectionType: ConnectionType;
  autoPrint: boolean;
  shopName: string;
  shopPhone: string;
  shopAddress: string;
  shopGst: string;
  customFooter: string;
  showGstin: boolean;
  showCustomerInfo: boolean;
  showQrCode: boolean;
  bluetoothDeviceName?: string;
}

export const DEFAULT_PRINTER_CONFIG: PrinterConfig = {
  paperWidth: "80mm", // ATPOS 80mm thermal printer standard
  connectionType: "system",
  autoPrint: false,
  shopName: "AGS STORE & COSMETICS",
  shopPhone: "+91 9340362381",
  shopAddress: "Main Market Road, Town Area",
  shopGst: "23AAAAA0000A1Z5",
  customFooter: "Thank you for shopping! Goods once sold will not be returned without bill.",
  showGstin: true,
  showCustomerInfo: true,
  showQrCode: true,
};

/**
 * Retrieves persisted printer configuration for the shop.
 */
export function getPrinterConfig(shopId: string): PrinterConfig {
  if (typeof window === "undefined") return DEFAULT_PRINTER_CONFIG;
  try {
    const saved = localStorage.getItem(`falcon_printer_config_${shopId}`);
    if (saved) {
      return { ...DEFAULT_PRINTER_CONFIG, ...JSON.parse(saved) };
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
// Web Bluetooth ESC/POS Direct Driver for ATPOS & Thermal Printers
// ---------------------------------------------------------------------------

let cachedBluetoothDevice: any = null;
let cachedCharacteristic: any = null;

// Standard Bluetooth Print UUIDs (including ATPOS, MPT-III, PT-210, RPP)
const BT_PRINTER_SERVICES = [
  "000018f0-0000-1000-8000-00805f9b34fb",
  "49535343-fe7d-4ae5-8fa9-9fafd205e455",
  "e7810a71-73ae-499d-8c15-faa9aef0c3f2",
  0x18f0,
  0xff00,
];

/**
 * Connects / pairs with a Bluetooth Thermal Printer (ATPOS / Generic ESC/POS).
 */
export async function pairBluetoothPrinter(): Promise<string> {
  if (typeof navigator === "undefined" || !(navigator as any).bluetooth) {
    throw new Error(
      "Web Bluetooth is not supported on this browser or platform. Please use Chrome on Android / Desktop or HTTPS."
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
  const server = await device.gatt.connect();

  // Discover write characteristic
  const services = await server.getPrimaryServices();
  let writeChar: any = null;

  for (const service of services) {
    const chars = await service.getCharacteristics();
    for (const c of chars) {
      if (c.properties.write || c.properties.writeWithoutResponse) {
        writeChar = c;
        break;
      }
    }
    if (writeChar) break;
  }

  if (!writeChar) {
    throw new Error("Could not locate print write channel on the selected Bluetooth printer.");
  }

  cachedCharacteristic = writeChar;
  return device.name || "Bluetooth Thermal Printer";
}

/**
 * Sends raw ESC/POS byte buffer to Bluetooth printer in chunks.
 */
export async function sendBluetoothEscPos(data: Uint8Array): Promise<void> {
  if (!cachedCharacteristic || !cachedBluetoothDevice?.gatt?.connected) {
    await pairBluetoothPrinter();
  }

  const CHUNK_SIZE = 100;
  for (let i = 0; i < data.length; i += CHUNK_SIZE) {
    const chunk = data.slice(i, i + CHUNK_SIZE);
    if (cachedCharacteristic.writeValueWithoutResponse) {
      await cachedCharacteristic.writeValueWithoutResponse(chunk);
    } else {
      await cachedCharacteristic.writeValue(chunk);
    }
  }
}

/**
 * Builds ESC/POS binary payload for a bill receipt.
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

  // ESC/POS Commands
  const ESC = 0x1b;
  const GS = 0x1d;

  // Initialize printer
  writeBytes(ESC, 0x40);

  // Center align
  writeBytes(ESC, 0x61, 0x01);

  // Shop Header (Double size + Bold)
  writeBytes(ESC, 0x21, 0x30); // Double height & width
  write(`${config.shopName || "FALCON STORE"}\n`);

  writeBytes(ESC, 0x21, 0x00); // Normal
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
  writeBytes(ESC, 0x45, 0x01); // Bold on
  if (config.paperWidth === "80mm") {
    write("ITEM                     QTY    PRICE   TOTAL\n");
  } else {
    write("ITEM              QTY   PRICE   TOTAL\n");
  }
  writeBytes(ESC, 0x45, 0x00); // Bold off
  write(separator);

  // Items rows
  const items = sale.items || [];
  items.forEach((it: any) => {
    const pName = (it.product?.name || it.product_name || it.name || "Item").slice(0, config.paperWidth === "80mm" ? 22 : 14);
    const unitStr = it.unit_name ? ` (${it.unit_name})` : "";
    const qtyStr = `${it.quantity}${unitStr}`;
    const priceStr = `${Number(it.unit_price)}`;
    const totalStr = `${Number(it.unit_price) * it.quantity}`;

    if (config.paperWidth === "80mm") {
      write(`${pName.padEnd(23)} ${qtyStr.padEnd(6)} ${priceStr.padStart(6)} ${totalStr.padStart(7)}\n`);
    } else {
      write(`${pName.padEnd(15)} ${qtyStr.padEnd(5)} ${priceStr.padStart(5)} ${totalStr.padStart(6)}\n`);
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
  writeBytes(ESC, 0x45, 0x01); // Bold
  writeBytes(ESC, 0x21, 0x10); // Double height
  write(`TOTAL: INR ${sale.total_amount}\n`);
  writeBytes(ESC, 0x21, 0x00); // Normal
  writeBytes(ESC, 0x45, 0x00); // Bold off

  const payments = sale.payments || [];
  const payMethod = payments.map((p) => p.method.toUpperCase()).join(", ") || "CASH";
  write(`Payment: ${payMethod}\n`);

  // Footer (Center Align)
  writeBytes(ESC, 0x61, 0x01);
  write(separator);
  if (config.customFooter) {
    write(`${config.customFooter}\n`);
  } else {
    write("Thank you! Visit again.\n");
  }

  // Feed and paper cut
  write("\n\n\n\n");
  writeBytes(GS, 0x56, 0x41, 0x00); // Partial cut

  return new Uint8Array(buffer);
}

/**
 * Generates an instant sample Test Print payload.
 */
export function buildTestPrintEscPos(config: PrinterConfig): Uint8Array {
  const sampleSale: any = {
    invoice_number: "TEST-001",
    created_at: new Date().toISOString(),
    subtotal: 450,
    discount_amount: 50,
    tax_amount: 0,
    total_amount: 400,
    items: [
      { product_name: "Dabur Badam Tail 100ml", unit_name: "Pc", quantity: 2, unit_price: 75 },
      { product_name: "Maybelline Lipstick Red", unit_name: "Pc", quantity: 1, unit_price: 300 },
    ],
    payments: [{ method: "cash", amount: 400 }],
  };

  const sampleCustomer: any = {
    name: "Sample Customer",
    phone: "9876543210",
  };

  return buildEscPosReceipt(sampleSale, sampleCustomer, config);
}
