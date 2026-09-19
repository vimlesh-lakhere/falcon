import { Product, Customer, Sale } from "@/types/database";
import { CheckoutPayload, posRepository } from "@/repositories/pos.repo";

const CACHE_PRODUCTS_KEY = "falcon_pos_cached_products";
const CACHE_CATEGORIES_KEY = "falcon_pos_cached_categories";
const CACHE_CUSTOMERS_KEY = "falcon_pos_cached_customers";
const CACHE_SALES_STATS_KEY = "falcon_pos_cached_sales_stats";
const OFFLINE_BILLS_KEY = "falcon_pos_offline_bills";

export interface OfflineQueuedBill {
  id: string;
  timestamp: number;
  payload: CheckoutPayload;
  status: "pending" | "syncing" | "failed";
  error?: string;
}

let isSyncInProgress = false;

export const offlinePosEngine = {
  isSyncing(): boolean {
    return isSyncInProgress;
  },

  // 1. Cache Product Catalog locally
  cacheCatalog(products: Product[]) {
    try {
      localStorage.setItem(CACHE_PRODUCTS_KEY, JSON.stringify(products));
    } catch (e) {
      console.warn("Offline catalog cache warning:", e);
    }
  },

  getCachedCatalog(): Product[] {
    try {
      const data = localStorage.getItem(CACHE_PRODUCTS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  // 2. Cache Categories locally
  cacheCategories(categories: any[]) {
    try {
      localStorage.setItem(CACHE_CATEGORIES_KEY, JSON.stringify(categories));
    } catch (e) {
      console.warn("Offline categories cache warning:", e);
    }
  },

  getCachedCategories(): any[] {
    try {
      const data = localStorage.getItem(CACHE_CATEGORIES_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  // 3. Cache Sales Velocity Stats locally
  cacheSalesStats(stats: Record<string, number>) {
    try {
      localStorage.setItem(CACHE_SALES_STATS_KEY, JSON.stringify(stats));
    } catch (e) {
      console.warn("Offline sales stats cache warning:", e);
    }
  },

  getCachedSalesStats(): Record<string, number> {
    try {
      const data = localStorage.getItem(CACHE_SALES_STATS_KEY);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  },

  // 4. Cache Customers locally
  cacheCustomers(customers: Customer[]) {
    try {
      localStorage.setItem(CACHE_CUSTOMERS_KEY, JSON.stringify(customers));
    } catch (e) {
      console.warn("Offline customers cache warning:", e);
    }
  },

  getCachedCustomers(): Customer[] {
    try {
      const data = localStorage.getItem(CACHE_CUSTOMERS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  // 5. Cache Units locally
  cacheUnits(units: any[]) {
    try {
      localStorage.setItem("falcon_pos_cached_units", JSON.stringify(units));
    } catch (e) {
      console.warn("Offline units cache warning:", e);
    }
  },

  getCachedUnits(): any[] {
    try {
      const data = localStorage.getItem("falcon_pos_cached_units");
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  // 3. Queue bill created while offline
  saveOfflineBill(payload: CheckoutPayload): Sale {
    const offlineId = `OFFLINE-${Date.now()}`;
    const invoiceNumber = `INV-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

    const queuedBill: OfflineQueuedBill = {
      id: offlineId,
      timestamp: Date.now(),
      payload,
      status: "pending",
    };

    const currentQueue = this.getQueuedBills();
    currentQueue.push(queuedBill);
    localStorage.setItem(OFFLINE_BILLS_KEY, JSON.stringify(currentQueue));

    const cachedProducts = this.getCachedCatalog();

    // Return a mock Sale structure so receipt can immediately be shown & printed
    const mockSale: Sale = {
      id: offlineId,
      shop_id: payload.shop_id,
      invoice_number: invoiceNumber,
      customer_id: payload.customer_id || null,
      cashier_id: payload.cashier_id || null,
      subtotal: payload.subtotal,
      discount_amount: payload.discount_amount,
      tax_amount: payload.tax_amount,
      total_amount: payload.total_amount,
      status: "completed",
      notes: payload.notes || "Created in Offline POS Mode",
      created_at: new Date().toISOString(),
      items: payload.items.map((it) => {
        const cachedProd = cachedProducts.find((p: Product) => p.id === it.product_id);
        return {
          id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          sale_id: offlineId,
          product_id: it.product_id,
          variant_id: it.variant_id || null,
          quantity: it.quantity,
          unit_price: it.unit_price,
          cost_price: it.cost_price,
          unit_name: it.unit_name,
          unit_multiplier: it.unit_multiplier,
          is_price_overridden: it.is_price_overridden || false,
          overridden_by: null,
          product: cachedProd,
        };
      }),
      payments: payload.payments.map((p) => ({
        id: `pay-${Date.now()}`,
        sale_id: offlineId,
        method: p.method,
        amount: p.amount,
        reference_no: p.reference_no || null,
        created_at: new Date().toISOString(),
      })),
    };

    return mockSale;
  },

  getQueuedBills(): OfflineQueuedBill[] {
    try {
      const data = localStorage.getItem(OFFLINE_BILLS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  getPendingCount(): number {
    return this.getQueuedBills().filter((b) => b.status === "pending" || b.status === "failed").length;
  },

  // 4. Sync pending bills to Supabase when reconnected
  async syncPendingBills(onProgress?: (synced: number, total: number) => void): Promise<{
    syncedCount: number;
    failedCount: number;
  }> {
    if (isSyncInProgress) {
      console.warn("Offline bills sync is already running in parallel. Ignoring concurrent call.");
      return { syncedCount: 0, failedCount: 0 };
    }

    const bills = this.getQueuedBills();
    const pendingBills = bills.filter((b) => b.status === "pending" || b.status === "failed");

    if (pendingBills.length === 0) {
      return { syncedCount: 0, failedCount: 0 };
    }

    isSyncInProgress = true;
    let syncedCount = 0;
    let failedCount = 0;
    const remainingQueue: OfflineQueuedBill[] = [];

    try {
      for (let i = 0; i < pendingBills.length; i++) {
        const item = pendingBills[i];
        try {
          await posRepository.checkout(item.payload);
          syncedCount++;
          if (onProgress) onProgress(syncedCount, pendingBills.length);
        } catch (err: any) {
          console.error("Failed to sync offline bill:", item.id, err);
          failedCount++;
          remainingQueue.push({
            ...item,
            status: "failed",
            error: err.message || "Failed to upload to server",
          });
        }
      }

      localStorage.setItem(OFFLINE_BILLS_KEY, JSON.stringify(remainingQueue));
      return { syncedCount, failedCount };
    } finally {
      isSyncInProgress = false;
    }
  },
};
