import { demandNotesRepository } from "@/repositories/demand-notes.repo";
import { DemandNote } from "@/types/database";

export interface QuickDemandNote {
  id: string;
  shopId: string;
  itemName: string;
  quantity?: string;
  groupName: string; // Supplier / Party or Category name e.g. "HUL", "Marico", "Patanjali", "General"
  supplierId?: string | null;
  supplierPhone?: string | null;
  notes?: string;
  status?: "pending" | "ordered" | "fulfilled";
  isDone: boolean;
  priority?: "normal" | "urgent";
  createdAt: string;
}

// Convert DemandNote (database format) to QuickDemandNote (UI format)
export function toQuickDemandNote(d: DemandNote): QuickDemandNote {
  return {
    id: d.id,
    shopId: d.shop_id,
    itemName: d.item_name,
    quantity: d.quantity || undefined,
    groupName: d.group_name || "General",
    supplierId: d.supplier_id || null,
    supplierPhone: d.supplier_phone || null,
    notes: d.notes || undefined,
    status: d.status,
    isDone: d.is_done || d.status === "fulfilled",
    priority: d.priority || "normal",
    createdAt: d.created_at,
  };
}

export const quickDemandNotesService = {
  /**
   * Synchronous load from local cache with immediate background cloud sync
   */
  getAll(shopId: string): QuickDemandNote[] {
    const cached = demandNotesRepository.getLocalCache(shopId);

    // Trigger background cloud fetch and reconciliation
    if (typeof window !== "undefined" && shopId) {
      demandNotesRepository.getAll(shopId).catch((err) => {
        console.warn("Background demand notes sync:", err);
      });
    }

    return cached.map(toQuickDemandNote);
  },

  /**
   * Async fetch from cloud
   */
  async getAllAsync(shopId: string): Promise<QuickDemandNote[]> {
    const data = await demandNotesRepository.getAll(shopId);
    return data.map(toQuickDemandNote);
  },

  save(
    shopId: string,
    data: {
      itemName: string;
      quantity?: string;
      groupName?: string;
      supplierId?: string | null;
      supplierPhone?: string | null;
      notes?: string;
      priority?: "normal" | "urgent";
    }
  ): QuickDemandNote[] {
    demandNotesRepository.create(shopId, {
      item_name: data.itemName,
      quantity: data.quantity,
      group_name: data.groupName,
      supplier_id: data.supplierId,
      supplier_phone: data.supplierPhone,
      notes: data.notes,
      priority: data.priority,
    });

    return this.getAll(shopId);
  },

  async bulkSave(
    shopId: string,
    items: Array<{
      itemName: string;
      quantity?: string;
      groupName?: string;
      supplierId?: string | null;
      priority?: "normal" | "urgent";
    }>
  ): Promise<QuickDemandNote[]> {
    const payloads = items.map((it) => ({
      item_name: it.itemName,
      quantity: it.quantity,
      group_name: it.groupName,
      supplier_id: it.supplierId,
      priority: it.priority,
    }));

    const inserted = await demandNotesRepository.bulkCreate(shopId, payloads);
    return inserted.map(toQuickDemandNote);
  },

  toggleDone(shopId: string, id: string): QuickDemandNote[] {
    demandNotesRepository.toggleDone(shopId, id);
    return this.getAll(shopId);
  },

  cycleStatus(shopId: string, id: string, currentStatus: string = "pending"): QuickDemandNote[] {
    demandNotesRepository.cycleStatus(shopId, id, currentStatus);
    return this.getAll(shopId);
  },

  delete(shopId: string, id: string): QuickDemandNote[] {
    demandNotesRepository.delete(shopId, id);
    return this.getAll(shopId);
  },

  clearDone(shopId: string): QuickDemandNote[] {
    demandNotesRepository.clearFulfilled(shopId);
    return this.getAll(shopId);
  },

  getStats(shopId: string): {
    total: number;
    pending: number;
    completed: number;
    ordered?: number;
    urgent?: number;
    byGroup: Record<string, number>;
  } {
    const stats = demandNotesRepository.getStats(shopId);
    const byGroupCounts: Record<string, number> = {};
    Object.entries(stats.byGroup).forEach(([k, v]) => {
      byGroupCounts[k] = v.pending;
    });

    return {
      total: stats.total,
      pending: stats.pending,
      completed: stats.fulfilled,
      ordered: stats.ordered,
      urgent: stats.urgent,
      byGroup: byGroupCounts,
    };
  },
};
