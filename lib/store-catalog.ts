"use client";

import { createClient } from "@/lib/supabase/client";
import { STORE_PRODUCT_SELECT, isProductOnline } from "@/lib/product-online";
import type { Product, Category } from "@/types/database";

export interface StoreCatalog {
  products: Product[]; // online + active only, newest first
  categories: Category[];
}

// How long a cached catalog is considered fresh. Prices/stock are re-verified server-side at
// checkout, so a couple of minutes of browsing-time staleness is safe and saves repeat egress.
const TTL_MS = 120_000;

type Entry = { at: number; data: StoreCatalog };
const memCache = new Map<string, Entry>();
const inflight = new Map<string, Promise<StoreCatalog>>();

// v2: rows now embed the unit (pack size) so store pricing matches the checkout API.
const keyFor = (shopId: string) => `falcon_store_catalog_v2_${shopId}`;

function readSession(key: string): Entry | null {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Entry) : null;
  } catch {
    return null;
  }
}

function writeSession(key: string, entry: Entry) {
  try {
    sessionStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // sessionStorage may be unavailable (private mode / quota) — cache stays in memory only.
  }
}

async function fetchFresh(shopId: string): Promise<StoreCatalog> {
  const supabase = createClient();
  const [{ data: prodList }, { data: catList }] = await Promise.all([
    supabase
      .from("products")
      .select(STORE_PRODUCT_SELECT)
      .eq("shop_id", shopId)
      .eq("is_active", true)
      .order("created_at", { ascending: false }),
    supabase
      .from("categories")
      .select("*")
      .eq("shop_id", shopId)
      .eq("is_active", true)
      .order("name", { ascending: true }),
  ]);
  const products = ((prodList || []) as unknown as Product[]).filter(isProductOnline);
  const categories = (catList || []) as unknown as Category[];
  return { products, categories };
}

function refreshInBackground(shopId: string, onRefresh?: (c: StoreCatalog) => void) {
  const key = keyFor(shopId);
  if (inflight.has(key)) return;
  const p = fetchFresh(shopId)
    .then((data) => {
      const entry: Entry = { at: Date.now(), data };
      memCache.set(key, entry);
      writeSession(key, entry);
      inflight.delete(key);
      onRefresh?.(data);
      return data;
    })
    .catch((e) => {
      inflight.delete(key);
      throw e;
    });
  inflight.set(key, p);
}

/**
 * Returns the shop's online catalog + categories, cached per browsing session (in-memory +
 * sessionStorage). Fresh cache is returned immediately; stale cache is returned immediately and
 * refreshed in the background (calling `onRefresh` with the new data). This collapses the many
 * catalog reads a customer makes across store pages into roughly one Supabase read per session.
 */
export async function getStoreCatalog(
  shopId: string,
  onRefresh?: (c: StoreCatalog) => void
): Promise<StoreCatalog> {
  const key = keyFor(shopId);
  const now = Date.now();

  const cached = memCache.get(key) || readSession(key);
  if (cached) {
    memCache.set(key, cached); // warm memory from sessionStorage
    if (now - cached.at >= TTL_MS) refreshInBackground(shopId, onRefresh);
    return cached.data;
  }

  if (inflight.has(key)) return inflight.get(key)!;
  const p = fetchFresh(shopId)
    .then((data) => {
      const entry: Entry = { at: Date.now(), data };
      memCache.set(key, entry);
      writeSession(key, entry);
      inflight.delete(key);
      return data;
    })
    .catch((e) => {
      inflight.delete(key);
      throw e;
    });
  inflight.set(key, p);
  return p;
}

/** Drop the cached catalog (e.g. after the owner edits products in the same tab). */
export function invalidateStoreCatalog(shopId: string) {
  const key = keyFor(shopId);
  memCache.delete(key);
  try {
    sessionStorage.removeItem(key);
  } catch {
    // ignore
  }
}
