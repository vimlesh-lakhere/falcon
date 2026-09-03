export interface QuickDemandNote {
  id: string;
  shopId: string;
  itemName: string;
  quantity?: string;
  groupName: string; // Supplier / Party or Category name e.g. "HUL", "Marico", "Patanjali", "General"
  supplierId?: string | null;
  supplierPhone?: string | null;
  notes?: string;
  isDone: boolean;
  createdAt: string;
}

const STORAGE_PREFIX = "falcon_demand_notes_";

export const quickDemandNotesService = {
  getStorageKey(shopId: string): string {
    return `${STORAGE_PREFIX}${shopId}`;
  },

  getAll(shopId: string): QuickDemandNote[] {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(this.getStorageKey(shopId));
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.warn("Failed to load demand notes from storage", e);
      return [];
    }
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
    }
  ): QuickDemandNote[] {
    if (typeof window === "undefined") return [];
    const notes = this.getAll(shopId);
    const newNote: QuickDemandNote = {
      id: `dmd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      shopId,
      itemName: data.itemName.trim(),
      quantity: data.quantity?.trim() || undefined,
      groupName: data.groupName?.trim() || "General",
      supplierId: data.supplierId || null,
      supplierPhone: data.supplierPhone || null,
      notes: data.notes?.trim() || undefined,
      isDone: false,
      createdAt: new Date().toISOString(),
    };

    const updated = [newNote, ...notes];
    try {
      localStorage.setItem(this.getStorageKey(shopId), JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent("falcon_demand_notes_updated", { detail: { shopId } }));
    } catch (e) {
      console.error("Failed to save demand note", e);
    }
    return updated;
  },

  toggleDone(shopId: string, id: string): QuickDemandNote[] {
    if (typeof window === "undefined") return [];
    const notes = this.getAll(shopId);
    const updated = notes.map((n) => (n.id === id ? { ...n, isDone: !n.isDone } : n));
    try {
      localStorage.setItem(this.getStorageKey(shopId), JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent("falcon_demand_notes_updated", { detail: { shopId } }));
    } catch (e) {
      console.error("Failed to update demand note", e);
    }
    return updated;
  },

  delete(shopId: string, id: string): QuickDemandNote[] {
    if (typeof window === "undefined") return [];
    const notes = this.getAll(shopId);
    const updated = notes.filter((n) => n.id !== id);
    try {
      localStorage.setItem(this.getStorageKey(shopId), JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent("falcon_demand_notes_updated", { detail: { shopId } }));
    } catch (e) {
      console.error("Failed to delete demand note", e);
    }
    return updated;
  },

  clearDone(shopId: string): QuickDemandNote[] {
    if (typeof window === "undefined") return [];
    const notes = this.getAll(shopId);
    const updated = notes.filter((n) => !n.isDone);
    try {
      localStorage.setItem(this.getStorageKey(shopId), JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent("falcon_demand_notes_updated", { detail: { shopId } }));
    } catch (e) {
      console.error("Failed to clear completed notes", e);
    }
    return updated;
  },

  getStats(shopId: string): {
    total: number;
    pending: number;
    completed: number;
    byGroup: Record<string, number>;
  } {
    const notes = this.getAll(shopId);
    const pendingNotes = notes.filter((n) => !n.isDone);
    const byGroup: Record<string, number> = {};

    pendingNotes.forEach((n) => {
      const g = n.groupName || "General";
      byGroup[g] = (byGroup[g] || 0) + 1;
    });

    return {
      total: notes.length,
      pending: pendingNotes.length,
      completed: notes.length - pendingNotes.length,
      byGroup,
    };
  },
};
