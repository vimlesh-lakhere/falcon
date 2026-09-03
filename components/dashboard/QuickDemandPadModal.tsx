"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  X,
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  Share2,
  PackagePlus,
  Search,
  Building2,
  ListOrdered,
  Layers,
  Sparkles,
  Phone,
  MessageSquare,
  AlertCircle,
  Clock,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  quickDemandNotesService,
  QuickDemandNote,
} from "@/lib/quick-demand-notes";
import { Supplier } from "@/types/database";

interface QuickDemandPadModalProps {
  isOpen: boolean;
  onClose: () => void;
  shopId: string;
  suppliers?: Supplier[];
  onAddAsProduct?: (itemName: string, supplierId?: string | null) => void;
}

export const QuickDemandPadModal: React.FC<QuickDemandPadModalProps> = ({
  isOpen,
  onClose,
  shopId,
  suppliers = [],
  onAddAsProduct,
}) => {
  const [notes, setNotes] = useState<QuickDemandNote[]>([]);
  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<string>("General");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"grouped" | "numbered">("grouped");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "done">("pending");
  const [customGroupName, setCustomGroupName] = useState("");
  const [isCustomGroup, setIsCustomGroup] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Load notes
  const reloadNotes = () => {
    setNotes(quickDemandNotesService.getAll(shopId));
  };

  useEffect(() => {
    if (isOpen) {
      reloadNotes();
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, shopId]);

  // Combine known suppliers with custom groups from existing notes
  const availableGroups = useMemo(() => {
    const set = new Set<string>();
    set.add("General");
    suppliers.forEach((s) => set.add(s.name));
    notes.forEach((n) => {
      if (n.groupName) set.add(n.groupName);
    });
    return Array.from(set);
  }, [suppliers, notes]);

  const handleAddNote = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!itemName.trim()) return;

    const finalGroup = isCustomGroup
      ? customGroupName.trim() || "General"
      : selectedGroup;

    // Find linked supplier if exists
    const matchedSupplier = suppliers.find(
      (s) => s.name.toLowerCase() === finalGroup.toLowerCase()
    );

    quickDemandNotesService.save(shopId, {
      itemName: itemName.trim(),
      quantity: quantity.trim() || undefined,
      groupName: finalGroup,
      supplierId: matchedSupplier?.id || null,
      supplierPhone: matchedSupplier?.phone || null,
    });

    setItemName("");
    setQuantity("");
    setIsCustomGroup(false);
    setCustomGroupName("");
    reloadNotes();
    inputRef.current?.focus();
  };

  const handleToggle = (id: string) => {
    quickDemandNotesService.toggleDone(shopId, id);
    reloadNotes();
  };

  const handleDelete = (id: string) => {
    quickDemandNotesService.delete(shopId, id);
    reloadNotes();
  };

  const handleClearDone = () => {
    if (confirm("Clear all completed/purchased items?")) {
      quickDemandNotesService.clearDone(shopId);
      reloadNotes();
    }
  };

  // Filtered notes
  const filteredNotes = notes.filter((n) => {
    if (filterStatus === "pending" && n.isDone) return false;
    if (filterStatus === "done" && !n.isDone) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        n.itemName.toLowerCase().includes(q) ||
        n.groupName.toLowerCase().includes(q) ||
        (n.quantity && n.quantity.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Grouped notes map
  const groupedData = useMemo(() => {
    const groups: Record<string, QuickDemandNote[]> = {};
    filteredNotes.forEach((n) => {
      const g = n.groupName || "General";
      if (!groups[g]) groups[g] = [];
      groups[g].push(n);
    });
    return groups;
  }, [filteredNotes]);

  // Send WhatsApp Order to Supplier
  const handleSendWhatsApp = (groupName: string, items: QuickDemandNote[]) => {
    const pendingItems = items.filter((i) => !i.isDone);
    if (pendingItems.length === 0) {
      alert("No pending items to send for this party.");
      return;
    }

    const matchedSupplier = suppliers.find(
      (s) => s.name.toLowerCase() === groupName.toLowerCase()
    );
    const phone = matchedSupplier?.phone?.replace(/[^0-9]/g, "") || "";

    const itemsText = pendingItems
      .map((it, idx) => `${idx + 1}. *${it.itemName}* ${it.quantity ? `(${it.quantity})` : ""}`)
      .join("\n");

    const message = `🛍️ *PURCHASE ORDER / KHARIDI DEMAND*
━━━━━━━━━━━━━━━━━━━━
🏢 *Party:* ${groupName}
📅 *Date:* ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
━━━━━━━━━━━━━━━━━━━━
🛒 *Items Required:*
${itemsText}
━━━━━━━━━━━━━━━━━━━━
⚡ Kripya yeh maal jaldi dispatch karwayen.`;

    const url = phone
      ? `https://wa.me/91${phone.slice(-10)}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;

    window.open(url, "_blank");
  };

  const stats = quickDemandNotesService.getStats(shopId);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* ===================================================================== */}
        {/* HEADER                                                                */}
        {/* ===================================================================== */}
        <div className="px-5 py-4 bg-gradient-to-r from-purple-700 via-indigo-800 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-md shrink-0">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                  Quick Demand Pad (खरीदी पर्ची)
                </h2>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-400 text-slate-950">
                  {stats.pending} Pending
                </span>
              </div>
              <p className="text-[11px] text-purple-200">
                Instant customer requests, party-wise shortage grouping & WhatsApp orders
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ===================================================================== */}
        {/* QUICK ADD BAR (Always at top)                                         */}
        {/* ===================================================================== */}
        <div className="p-3 sm:p-4 bg-purple-50/70 border-b border-purple-100 shrink-0">
          <form onSubmit={handleAddNote} className="space-y-2.5">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              {/* Product Name Input */}
              <div className="relative flex-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="⚡ Item name / demand (e.g. Dove 180ml, Maggi 70g)..."
                  className="w-full bg-white text-xs font-semibold text-gray-900 placeholder:text-gray-400 border border-purple-200 rounded-xl px-3.5 py-2.5 shadow-2xs focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                />
              </div>

              {/* Quantity */}
              <div className="w-full sm:w-28">
                <input
                  type="text"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="Qty (e.g. 6 pcs)"
                  className="w-full bg-white text-xs font-semibold text-gray-900 placeholder:text-gray-400 border border-purple-200 rounded-xl px-3 py-2.5 shadow-2xs focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>

              {/* Group / Party Selector */}
              <div className="w-full sm:w-44">
                {!isCustomGroup ? (
                  <select
                    value={selectedGroup}
                    onChange={(e) => {
                      if (e.target.value === "__NEW__") {
                        setIsCustomGroup(true);
                      } else {
                        setSelectedGroup(e.target.value);
                      }
                    }}
                    className="w-full bg-white text-xs font-bold text-gray-800 border border-purple-200 rounded-xl px-2.5 py-2.5 shadow-2xs focus:outline-none focus:ring-2 focus:ring-purple-600"
                  >
                    <optgroup label="Select Party / Supplier">
                      {availableGroups.map((g) => (
                        <option key={g} value={g}>
                          📦 {g}
                        </option>
                      ))}
                    </optgroup>
                    <option value="__NEW__">➕ Add New Party...</option>
                  </select>
                ) : (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      autoFocus
                      value={customGroupName}
                      onChange={(e) => setCustomGroupName(e.target.value)}
                      placeholder="New party name"
                      className="w-full bg-white text-xs font-bold text-purple-900 border border-purple-400 rounded-xl px-2.5 py-2.5 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setIsCustomGroup(false)}
                      className="p-2 text-xs text-gray-500 hover:text-gray-800"
                      title="Cancel custom party"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                size="sm"
                disabled={!itemName.trim()}
                className="bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs gap-1.5 px-4 py-2.5 rounded-xl shadow-md shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Note</span>
              </Button>
            </div>
          </form>
        </div>

        {/* ===================================================================== */}
        {/* TABS & SEARCH BAR                                                     */}
        {/* ===================================================================== */}
        <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2 shrink-0 text-xs">
          {/* View Modes */}
          <div className="flex items-center gap-1 bg-gray-200/80 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab("grouped")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
                activeTab === "grouped"
                  ? "bg-white text-purple-900 shadow-xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-purple-600" />
              <span>Group by Party</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("numbered")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
                activeTab === "numbered"
                  ? "bg-white text-purple-900 shadow-xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <ListOrdered className="w-3.5 h-3.5 text-indigo-600" />
              <span>Numbered List</span>
            </button>
          </div>

          {/* Status Filter Pills */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setFilterStatus("pending")}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors ${
                filterStatus === "pending"
                  ? "bg-amber-100 text-amber-900 border border-amber-300"
                  : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              Pending ({stats.pending})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus("all")}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors ${
                filterStatus === "all"
                  ? "bg-purple-100 text-purple-900 border border-purple-300"
                  : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              All ({stats.total})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus("done")}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors ${
                filterStatus === "done"
                  ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                  : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              Completed ({stats.completed})
            </button>
          </div>

          {/* Search box */}
          <div className="relative w-full sm:w-48">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search items..."
              className="w-full pl-8 pr-2.5 py-1 text-xs bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-600"
            />
          </div>
        </div>

        {/* ===================================================================== */}
        {/* LIST CONTAINER (Scrollable)                                           */}
        {/* ===================================================================== */}
        <div className="p-3 sm:p-5 overflow-y-auto flex-1 min-h-0 space-y-4 bg-gray-50/50">
          {filteredNotes.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 mx-auto flex items-center justify-center font-bold">
                📝
              </div>
              <h3 className="text-sm font-bold text-gray-700">No demand notes found</h3>
              <p className="text-xs text-gray-500 max-w-xs mx-auto">
                Customer items or supplier shortage notes you add above will appear here grouped by party.
              </p>
            </div>
          ) : activeTab === "grouped" ? (
            /* 📦 GROUP-WISE VIEW */
            <div className="space-y-4">
              {Object.entries(groupedData).map(([groupName, items]) => {
                const pendingInGroup = items.filter((i) => !i.isDone).length;
                return (
                  <div
                    key={groupName}
                    className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden"
                  >
                    {/* Group Header */}
                    <div className="px-4 py-2.5 bg-gradient-to-r from-purple-50 via-indigo-50/50 to-white border-b border-gray-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-purple-700" />
                        <span className="font-black text-xs text-purple-950 uppercase tracking-wide">
                          {groupName}
                        </span>
                        <span className="bg-purple-200/70 text-purple-900 text-[10px] font-bold px-2 py-0.2 rounded-full">
                          {pendingInGroup} to order
                        </span>
                      </div>

                      {/* WhatsApp Share Button */}
                      <button
                        type="button"
                        onClick={() => handleSendWhatsApp(groupName, items)}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                        title="Send Order on WhatsApp to Supplier"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                        <span>WhatsApp Order</span>
                      </button>
                    </div>

                    {/* Group Items */}
                    <div className="divide-y divide-gray-100">
                      {items.map((item, idx) => (
                        <div
                          key={item.id}
                          className={`p-3 flex items-center justify-between gap-3 hover:bg-gray-50/80 transition-colors ${
                            item.isDone ? "bg-gray-50/50 opacity-60" : ""
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            {/* Checkbox Toggle */}
                            <button
                              type="button"
                              onClick={() => handleToggle(item.id)}
                              className="text-gray-400 hover:text-purple-600 shrink-0 cursor-pointer"
                            >
                              {item.isDone ? (
                                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                              ) : (
                                <Circle className="w-5 h-5" />
                              )}
                            </button>

                            {/* Item Details */}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`text-xs font-bold ${
                                    item.isDone
                                      ? "line-through text-gray-500"
                                      : "text-gray-900"
                                  }`}
                                >
                                  {item.itemName}
                                </span>
                                {item.quantity && (
                                  <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.2 rounded-md shrink-0">
                                    {item.quantity}
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                                <Clock className="w-2.5 h-2.5" />
                                {new Date(item.createdAt).toLocaleDateString("en-IN", {
                                  day: "2-digit",
                                  month: "short",
                                })}
                              </span>
                            </div>
                          </div>

                          {/* Item Actions */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            {onAddAsProduct && (
                              <button
                                type="button"
                                onClick={() => {
                                  onAddAsProduct(item.itemName, item.supplierId);
                                  onClose();
                                }}
                                className="px-2 py-1 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-800 text-[10px] font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                                title="Add as product to inventory catalog"
                              >
                                <PackagePlus className="w-3 h-3" />
                                <span className="hidden sm:inline">Add Product</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleDelete(item.id)}
                              className="p-1 text-gray-400 hover:text-rose-600 rounded-md transition-colors cursor-pointer"
                              title="Delete note"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* 🔢 NUMBERED LIST VIEW */
            <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs divide-y divide-gray-100">
              {filteredNotes.map((item, idx) => (
                <div
                  key={item.id}
                  className={`p-3.5 flex items-center justify-between gap-3 hover:bg-gray-50 transition-colors ${
                    item.isDone ? "bg-gray-50/50 opacity-60" : ""
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="w-6 text-xs font-mono font-bold text-gray-400 shrink-0">
                      #{idx + 1}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleToggle(item.id)}
                      className="text-gray-400 hover:text-purple-600 shrink-0 cursor-pointer"
                    >
                      {item.isDone ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <Circle className="w-5 h-5" />
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-xs font-bold ${
                            item.isDone ? "line-through text-gray-500" : "text-gray-900"
                          }`}
                        >
                          {item.itemName}
                        </span>
                        {item.quantity && (
                          <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.2 rounded-md">
                            {item.quantity}
                          </span>
                        )}
                        <span className="bg-gray-100 text-gray-700 text-[10px] font-semibold px-2 py-0.2 rounded-md border border-gray-200">
                          📦 {item.groupName}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {onAddAsProduct && (
                      <button
                        type="button"
                        onClick={() => {
                          onAddAsProduct(item.itemName, item.supplierId);
                          onClose();
                        }}
                        className="px-2 py-1 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-800 text-[10px] font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <PackagePlus className="w-3 h-3" />
                        <span className="hidden sm:inline">Add Product</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      className="p-1 text-gray-400 hover:text-rose-600 rounded-md transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ===================================================================== */}
        {/* FOOTER ACTIONS                                                        */}
        {/* ===================================================================== */}
        <div className="p-3 sm:p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between shrink-0 text-xs">
          <div className="text-gray-500 text-[11px]">
            <span>Tip: Press </span>
            <kbd className="px-1.5 py-0.5 bg-gray-200 text-gray-800 rounded font-mono font-bold text-[10px]">
              Enter
            </kbd>
            <span> to add rapidly. Long-press app icon on phone for quick launch.</span>
          </div>

          <div className="flex items-center gap-2">
            {stats.completed > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClearDone}
                className="text-xs text-gray-600 hover:text-rose-600 hover:bg-rose-50 border-gray-300"
              >
                Clear Completed ({stats.completed})
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              onClick={onClose}
              className="bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold px-4"
            >
              Done (Esc)
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
