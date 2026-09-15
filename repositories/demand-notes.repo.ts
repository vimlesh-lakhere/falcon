import { supabase } from "@/lib/supabase/client";
import { DemandNote } from "@/types/database";

const LOCAL_STORAGE_PREFIX = "falcon_demand_notes_v2_";
const LEGACY_STORAGE_PREFIX = "falcon_demand_notes_";

export const demandNotesRepository = {
  getStorageKey(shopId: string): string {
    return `${LOCAL_STORAGE_PREFIX}${shopId || "default"}`;
  },

  getLocalCache(shopId: string): DemandNote[] {
    if (typeof window === "undefined") return [];
    try {
      // 1. Try v2 cache
      const raw = localStorage.getItem(this.getStorageKey(shopId));
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }

      // 2. Migration from v1 legacy storage if available
      const legacyKey = `${LEGACY_STORAGE_PREFIX}${shopId}`;
      const legacyRaw = localStorage.getItem(legacyKey);
      if (legacyRaw) {
        const legacyParsed = JSON.parse(legacyRaw);
        if (Array.isArray(legacyParsed) && legacyParsed.length > 0) {
          const converted: DemandNote[] = legacyParsed.map((item: any) => ({
            id: item.id || `dmd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            shop_id: shopId,
            item_name: item.itemName || item.item_name || "Note",
            quantity: item.quantity || null,
            group_name: item.groupName || item.group_name || "General",
            supplier_id: item.supplierId || item.supplier_id || null,
            supplier_phone: item.supplierPhone || item.supplier_phone || null,
            notes: item.notes || null,
            status: item.isDone ? "fulfilled" : "pending",
            is_done: Boolean(item.isDone),
            priority: "normal",
            created_at: item.createdAt || item.created_at || new Date().toISOString(),
          }));
          this.setLocalCache(shopId, converted);
          return converted;
        }
      }
      return [];
    } catch (err) {
      console.warn("Failed to read local demand notes cache:", err);
      return [];
    }
  },

  setLocalCache(shopId: string, notes: DemandNote[]): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(this.getStorageKey(shopId), JSON.stringify(notes));
    } catch (err) {
      console.error("Failed to write local demand notes cache:", err);
    }
  },

  notifyUpdate(shopId: string): void {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("falcon_demand_notes_updated", { detail: { shopId } })
      );
    }
  },

  /**
   * Fetch all demand notes for a shop with dual-layer cloud + cache persistence
   */
  async getAll(shopId: string): Promise<DemandNote[]> {
    const local = this.getLocalCache(shopId);

    if (!shopId) return local;

    try {
      const { data, error } = await supabase
        .from("demand_notes")
        .select("*, supplier:suppliers(*)")
        .eq("shop_id", shopId)
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("Supabase demand_notes query fallback to cache:", error.message);
        return local;
      }

      if (data) {
        // Only sync local items that have temp IDs (never uploaded to cloud)
        const unsynced = local.filter((n) => n.id.startsWith("dmd-"));
        if (unsynced.length > 0 && data.length === 0) {
          try {
            await this.syncLocalToCloud(shopId, unsynced);
            // Re-fetch after sync so we get real UUIDs from cloud
            const { data: refreshed } = await supabase
              .from("demand_notes")
              .select("*, supplier:suppliers(*)")
              .eq("shop_id", shopId)
              .order("created_at", { ascending: false });
            if (refreshed) {
              this.setLocalCache(shopId, refreshed);
              this.notifyUpdate(shopId);
              return refreshed;
            }
          } catch {}
        }

        this.setLocalCache(shopId, data);
        return data;
      }
      return local;
    } catch (err) {
      console.warn("Error fetching cloud demand notes:", err);
      return local;
    }
  },

  /**
   * Create a new demand note
   */
  async create(
    shopId: string,
    data: {
      item_name: string;
      quantity?: string | null;
      group_name?: string;
      supplier_id?: string | null;
      supplier_phone?: string | null;
      notes?: string | null;
      priority?: "normal" | "urgent";
    }
  ): Promise<DemandNote> {
    // Optimistic local note with temp ID (will be replaced by real UUID from cloud)
    const tempId = `dmd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const optimisticNote: DemandNote = {
      id: tempId,
      shop_id: shopId,
      item_name: data.item_name.trim(),
      quantity: data.quantity?.trim() || null,
      group_name: data.group_name?.trim() || "General",
      supplier_id: data.supplier_id || null,
      supplier_phone: data.supplier_phone || null,
      notes: data.notes?.trim() || null,
      status: "pending",
      is_done: false,
      priority: data.priority || "normal",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // 1. Optimistically update local cache for instant UI feedback
    const current = this.getLocalCache(shopId);
    this.setLocalCache(shopId, [optimisticNote, ...current]);
    this.notifyUpdate(shopId);

    // 2. Persist to Supabase cloud (primary source of truth for cross-device sync)
    try {
      const { data: inserted, error } = await supabase
        .from("demand_notes")
        .insert([{
          shop_id: shopId,
          item_name: optimisticNote.item_name,
          quantity: optimisticNote.quantity,
          group_name: optimisticNote.group_name,
          supplier_id: optimisticNote.supplier_id,
          supplier_phone: optimisticNote.supplier_phone,
          notes: optimisticNote.notes,
          status: optimisticNote.status,
          is_done: optimisticNote.is_done,
          priority: optimisticNote.priority,
        }])
        .select("*, supplier:suppliers(*)")
        .single();

      if (!error && inserted) {
        // Replace temp ID with real cloud UUID in local cache
        const latest = this.getLocalCache(shopId);
        const synced = latest.map((n) => (n.id === tempId ? inserted : n));
        this.setLocalCache(shopId, synced);
        this.notifyUpdate(shopId);
        return inserted;
      } else if (error) {
        console.warn("Cloud save failed, item retained in offline cache:", error.message);
      }
    } catch (err) {
      console.warn("Cloud save exception, retained in offline cache:", err);
    }

    return optimisticNote;
  },

  /**
   * Bulk create multiple notes in 1 operation (e.g. from pasted multi-line list)
   */
  async bulkCreate(
    shopId: string,
    items: Array<{
      item_name: string;
      quantity?: string | null;
      group_name?: string;
      supplier_id?: string | null;
      priority?: "normal" | "urgent";
    }>
  ): Promise<DemandNote[]> {
    if (items.length === 0) return [];

    const now = new Date().toISOString();
    const newNotes: DemandNote[] = items.map((it, idx) => ({
      id: `dmd-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
      shop_id: shopId,
      item_name: it.item_name.trim(),
      quantity: it.quantity?.trim() || null,
      group_name: it.group_name?.trim() || "General",
      supplier_id: it.supplier_id || null,
      supplier_phone: null,
      notes: null,
      status: "pending",
      is_done: false,
      priority: it.priority || "normal",
      created_at: now,
      updated_at: now,
    }));

    // Update local cache
    const current = this.getLocalCache(shopId);
    const updated = [...newNotes, ...current];
    this.setLocalCache(shopId, updated);
    this.notifyUpdate(shopId);

    // Persist to Supabase
    try {
      const payloads = newNotes.map((n) => ({
        shop_id: shopId,
        item_name: n.item_name,
        quantity: n.quantity,
        group_name: n.group_name,
        supplier_id: n.supplier_id,
        status: n.status,
        is_done: n.is_done,
        priority: n.priority,
      }));

      const { data: inserted, error } = await supabase
        .from("demand_notes")
        .insert(payloads)
        .select("*, supplier:suppliers(*)");

      if (!error && inserted && inserted.length > 0) {
        // Sync local cache with inserted cloud objects
        const remaining = current.filter((c) => !newNotes.some((n) => n.id === c.id));
        this.setLocalCache(shopId, [...inserted, ...remaining]);
        this.notifyUpdate(shopId);
        return inserted;
      }
    } catch (err) {
      console.warn("Cloud bulk create failed, retained in local cache:", err);
    }

    return newNotes;
  },

  /**
   * Update status or details of a demand note
   */
  async update(
    shopId: string,
    id: string,
    updates: Partial<DemandNote>
  ): Promise<DemandNote | null> {
    const current = this.getLocalCache(shopId);
    let targetNote: DemandNote | null = null;

    const updated = current.map((n) => {
      if (n.id === id) {
        targetNote = {
          ...n,
          ...updates,
          updated_at: new Date().toISOString(),
        };
        return targetNote;
      }
      return n;
    });

    this.setLocalCache(shopId, updated);
    this.notifyUpdate(shopId);

    // Persist to Supabase — works for both UUID (cloud) and temp IDs (local-only)
    // For temp IDs starting with "dmd-", skip cloud update (not yet saved to cloud)
    if (id && !id.startsWith("dmd-")) {
      try {
        const { error } = await supabase
          .from("demand_notes")
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq("id", id);
        if (error) console.warn("Cloud update failed:", error.message);
      } catch (err) {
        console.warn("Cloud update exception:", err);
      }
    }

    return targetNote;
  },

  /**
   * Cycle status: pending -> ordered -> fulfilled -> pending
   */
  async cycleStatus(
    shopId: string,
    id: string,
    currentStatus: string
  ): Promise<DemandNote | null> {
    let nextStatus: "pending" | "ordered" | "fulfilled" = "ordered";
    let isDone = false;

    if (currentStatus === "pending") {
      nextStatus = "ordered";
      isDone = false;
    } else if (currentStatus === "ordered") {
      nextStatus = "fulfilled";
      isDone = true;
    } else {
      nextStatus = "pending";
      isDone = false;
    }

    return this.update(shopId, id, {
      status: nextStatus,
      is_done: isDone,
    });
  },

  /**
   * Toggle done flag
   */
  async toggleDone(shopId: string, id: string): Promise<DemandNote | null> {
    const current = this.getLocalCache(shopId);
    const item = current.find((n) => n.id === id);
    const newIsDone = !item?.is_done;

    return this.update(shopId, id, {
      is_done: newIsDone,
      status: newIsDone ? "fulfilled" : "pending",
    });
  },

  /**
   * Delete a note permanently
   */
  async delete(shopId: string, id: string): Promise<boolean> {
    const current = this.getLocalCache(shopId);
    const filtered = current.filter((n) => n.id !== id);
    this.setLocalCache(shopId, filtered);
    this.notifyUpdate(shopId);

    if (id && !id.startsWith("dmd-")) {
      try {
        await supabase.from("demand_notes").delete().eq("id", id);
      } catch (err) {
        console.warn("Cloud delete note error:", err);
      }
    }
    return true;
  },

  /**
   * Clear all completed/fulfilled notes
   */
  async clearFulfilled(shopId: string): Promise<boolean> {
    const current = this.getLocalCache(shopId);
    const pendingOnly = current.filter((n) => !n.is_done && n.status !== "fulfilled");
    this.setLocalCache(shopId, pendingOnly);
    this.notifyUpdate(shopId);

    try {
      await supabase
        .from("demand_notes")
        .delete()
        .eq("shop_id", shopId)
        .or("is_done.eq.true,status.eq.fulfilled");
    } catch (err) {
      console.warn("Cloud clear completed notes error:", err);
    }
    return true;
  },

  /**
   * Internal helper: Sync local cache items to Supabase
   */
  async syncLocalToCloud(shopId: string, localNotes: DemandNote[]): Promise<void> {
    if (!shopId || localNotes.length === 0) return;
    const payloads = localNotes.map((n) => ({
      shop_id: shopId,
      item_name: n.item_name,
      quantity: n.quantity,
      group_name: n.group_name || "General",
      supplier_id: n.supplier_id,
      notes: n.notes,
      status: n.status || "pending",
      is_done: Boolean(n.is_done),
      priority: n.priority || "normal",
    }));

    await supabase.from("demand_notes").insert(payloads);
  },

  /**
   * Compute live stats
   */
  getStats(shopId: string): {
    total: number;
    pending: number;
    ordered: number;
    fulfilled: number;
    urgent: number;
    byGroup: Record<string, { total: number; pending: number }>;
  } {
    const notes = this.getLocalCache(shopId);
    let pending = 0;
    let ordered = 0;
    let fulfilled = 0;
    let urgent = 0;
    const byGroup: Record<string, { total: number; pending: number }> = {};

    notes.forEach((n) => {
      const g = n.group_name || "General";
      if (!byGroup[g]) {
        byGroup[g] = { total: 0, pending: 0 };
      }
      byGroup[g].total += 1;

      if (n.status === "ordered") {
        ordered += 1;
      } else if (n.is_done || n.status === "fulfilled") {
        fulfilled += 1;
      } else {
        pending += 1;
        byGroup[g].pending += 1;
      }

      if (n.priority === "urgent" && !n.is_done) {
        urgent += 1;
      }
    });

    return {
      total: notes.length,
      pending,
      ordered,
      fulfilled,
      urgent,
      byGroup,
    };
  },
};
