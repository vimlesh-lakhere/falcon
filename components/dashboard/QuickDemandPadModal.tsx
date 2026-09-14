"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  X,
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  PackagePlus,
  Search,
  Building2,
  ListOrdered,
  Layers,
  Sparkles,
  MessageSquare,
  Clock,
  Flame,
  Check,
  ClipboardPaste,
  Send,
  Cloud,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  quickDemandNotesService,
  QuickDemandNote,
} from "@/lib/quick-demand-notes";
import { demandNotesRepository } from "@/repositories/demand-notes.repo";
import {
  parseSingleDemandNote,
  parseBulkDemandText,
} from "@/lib/demand-notes-parser";
import { Supplier, DemandNote } from "@/types/database";

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
  const [inputNoteText, setInputNoteText] = useState("");
  const [selectedParty, setSelectedParty] = useState<string>("General");
  const [customPartyName, setCustomPartyName] = useState("");
  const [isCustomParty, setIsCustomParty] = useState(false);
  const [noteMode, setNoteMode] = useState<"quick" | "bulk">("quick");
  const [bulkText, setBulkText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeView, setActiveView] = useState<"grouped" | "list">("grouped");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "ordered" | "fulfilled">("pending");
  const [isUrgentManual, setIsUrgentManual] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Supplier Names list
  const supplierNames = useMemo(() => {
    return suppliers.map((s) => s.name);
  }, [suppliers]);

  // Combined Party list (General + Suppliers + existing custom groups)
  const partyList = useMemo(() => {
    const set = new Set<string>();
    set.add("General");
    suppliers.forEach((s) => set.add(s.name));
    notes.forEach((n) => {
      if (n.groupName) set.add(n.groupName);
    });
    return Array.from(set);
  }, [suppliers, notes]);

  // Live NLP parsing of user input text
  const liveParsed = useMemo(() => {
    if (!inputNoteText.trim()) return null;
    return parseSingleDemandNote(inputNoteText, supplierNames);
  }, [inputNoteText, supplierNames]);

  // Load notes from dual-layer repository
  const reloadNotes = async () => {
    if (!shopId) return;
    const localList = quickDemandNotesService.getAll(shopId);
    setNotes(localList);

    // Also fetch latest from cloud
    try {
      const cloudList = await quickDemandNotesService.getAllAsync(shopId);
      if (cloudList && cloudList.length > 0) {
        setNotes(cloudList);
      }
    } catch (err) {
      console.warn("Could not sync cloud notes:", err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      reloadNotes();
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, shopId]);

  // Listen for background updates
  useEffect(() => {
    const handleUpdated = () => {
      if (shopId) {
        setNotes(quickDemandNotesService.getAll(shopId));
      }
    };
    window.addEventListener("falcon_demand_notes_updated", handleUpdated);
    return () => window.removeEventListener("falcon_demand_notes_updated", handleUpdated);
  }, [shopId]);

  // 1-Click Add Single Note
  const handleAddNote = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputNoteText.trim()) return;

    const parsed = parseSingleDemandNote(inputNoteText, supplierNames);
    if (!parsed.itemName) return;

    let targetGroup = isCustomParty
      ? customPartyName.trim() || "General"
      : selectedParty;

    // If NLP detected a party in the text (e.g. "HUL: Dove shampoo"), prefer that
    if (parsed.partyHint) {
      targetGroup = parsed.partyHint;
    }

    const matchedSupplier = suppliers.find(
      (s) => s.name.toLowerCase() === targetGroup.toLowerCase()
    );

    quickDemandNotesService.save(shopId, {
      itemName: parsed.itemName,
      quantity: parsed.quantity,
      groupName: targetGroup,
      supplierId: matchedSupplier?.id || null,
      supplierPhone: matchedSupplier?.phone || null,
      priority: parsed.priority === "urgent" || isUrgentManual ? "urgent" : "normal",
    });

    setInputNoteText("");
    setIsUrgentManual(false);
    setIsCustomParty(false);
    setCustomPartyName("");
    reloadNotes();
    inputRef.current?.focus();
  };

  // Bulk Multi-line Add
  const handleBulkAdd = async () => {
    if (!bulkText.trim()) return;

    const parsedItems = parseBulkDemandText(
      bulkText,
      selectedParty,
      supplierNames
    );

    if (parsedItems.length === 0) {
      alert("No valid items found in the text. Please write one item per line.");
      return;
    }

    const withSuppliers = parsedItems.map((it) => {
      const match = suppliers.find(
        (s) => s.name.toLowerCase() === it.groupName.toLowerCase()
      );
      return {
        ...it,
        supplierId: match?.id || null,
      };
    });

    await quickDemandNotesService.bulkSave(shopId, withSuppliers);
    setBulkText("");
    setNoteMode("quick");
    reloadNotes();
  };

  // Cycle item status (Pending -> Ordered -> Fulfilled)
  const handleCycleStatus = (id: string, currentStatus: string = "pending") => {
    quickDemandNotesService.cycleStatus(shopId, id, currentStatus);
    reloadNotes();
  };

  // Toggle Done
  const handleToggleDone = (id: string) => {
    quickDemandNotesService.toggleDone(shopId, id);
    reloadNotes();
  };

  // Delete note
  const handleDelete = (id: string) => {
    quickDemandNotesService.delete(shopId, id);
    reloadNotes();
  };

  // Clear completed
  const handleClearCompleted = () => {
    if (confirm("Clear all completed/fulfilled items from list?")) {
      quickDemandNotesService.clearDone(shopId);
      reloadNotes();
    }
  };

  // Send WhatsApp Purchase Order to Party
  const handleSendWhatsAppPO = (groupName: string, items: QuickDemandNote[]) => {
    const unfulfilled = items.filter((i) => !i.isDone && i.status !== "fulfilled");
    if (unfulfilled.length === 0) {
      alert("No pending items to order for this party.");
      return;
    }

    const matchedSupplier = suppliers.find(
      (s) => s.name.toLowerCase() === groupName.toLowerCase()
    );
    const phone = matchedSupplier?.phone?.replace(/[^0-9]/g, "") || "";

    const itemsFormatted = unfulfilled
      .map((it, idx) => {
        const qty = it.quantity ? ` [${it.quantity}]` : "";
        const urgent = it.priority === "urgent" ? " 🔥 (URGENT)" : "";
        return `${idx + 1}. *${it.itemName}*${qty}${urgent}`;
      })
      .join("\n");

    const message = `🛍️ *PURCHASE ORDER / KHARIDI DEMAND*
━━━━━━━━━━━━━━━━━━━━
🏢 *Party:* ${groupName}
📅 *Date:* ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
━━━━━━━━━━━━━━━━━━━━
🛒 *Items Required:*
${itemsFormatted}
━━━━━━━━━━━━━━━━━━━━
⚡ Kripya yeh maal jaldi dispatch karwayen.`;

    const url = phone
      ? `https://wa.me/91${phone.slice(-10)}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;

    window.open(url, "_blank");
  };

  // Filter notes
  const filteredNotes = useMemo(() => {
    return notes.filter((n) => {
      // Status filter
      if (statusFilter === "pending" && (n.isDone || n.status === "fulfilled" || n.status === "ordered")) return false;
      if (statusFilter === "ordered" && n.status !== "ordered") return false;
      if (statusFilter === "fulfilled" && !n.isDone && n.status !== "fulfilled") return false;

      // Search filter
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
  }, [notes, statusFilter, searchQuery]);

  // Grouped notes by Party
  const groupedData = useMemo(() => {
    const groups: Record<string, QuickDemandNote[]> = {};
    filteredNotes.forEach((n) => {
      const g = n.groupName || "General";
      if (!groups[g]) groups[g] = [];
      groups[g].push(n);
    });
    return groups;
  }, [filteredNotes]);

  // Overall Stats
  const stats = useMemo(() => {
    return quickDemandNotesService.getStats(shopId);
  }, [notes, shopId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-4xl overflow-hidden flex flex-col max-h-[94vh]">
        {/* ===================================================================== */}
        {/* TOP BANNER & HEADER                                                   */}
        {/* ===================================================================== */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-purple-800 via-indigo-900 to-slate-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-md shrink-0 text-base">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                  Demand Pad (खरीदी पर्ची)
                </h2>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-400 text-slate-950">
                  {stats.pending} To Order
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                  <Cloud className="w-3 h-3" />
                  Cloud Permanent (Never Deleted)
                </span>
              </div>
              <p className="text-[11px] text-purple-200/90">
                Customer requests, party-wise shortage grouping & 1-click WhatsApp purchase orders
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
        {/* SMART NOTE CREATOR BAR                                                */}
        {/* ===================================================================== */}
        <div className="p-3 sm:p-4 bg-purple-50/70 border-b border-purple-100/90 shrink-0 space-y-2.5">
          {/* Top mode switch & Party Pills */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* Party Selector Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 max-w-full scrollbar-none">
              <span className="text-[11px] font-black text-purple-950 shrink-0 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-purple-600" />
                For Party:
              </span>

              {/* General Option */}
              <button
                type="button"
                onClick={() => {
                  setSelectedParty("General");
                  setIsCustomParty(false);
                }}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  selectedParty === "General" && !isCustomParty
                    ? "bg-purple-700 text-white shadow-xs"
                    : "bg-white text-gray-700 hover:bg-purple-100 border border-purple-200"
                }`}
              >
                🌐 General (सामान्य)
              </button>

              {/* Top Registered Suppliers */}
              {suppliers.slice(0, 5).map((sup) => (
                <button
                  key={sup.id}
                  type="button"
                  onClick={() => {
                    setSelectedParty(sup.name);
                    setIsCustomParty(false);
                  }}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    selectedParty === sup.name && !isCustomParty
                      ? "bg-purple-700 text-white shadow-xs"
                      : "bg-white text-gray-700 hover:bg-purple-100 border border-purple-200"
                  }`}
                >
                  🏢 {sup.name}
                </button>
              ))}

              {/* Other party dropdown if more exist */}
              {partyList.length > 6 && (
                <select
                  value={isCustomParty ? "__CUSTOM__" : selectedParty}
                  onChange={(e) => {
                    if (e.target.value === "__NEW__") {
                      setIsCustomParty(true);
                    } else {
                      setIsCustomParty(false);
                      setSelectedParty(e.target.value);
                    }
                  }}
                  className="bg-white text-xs font-semibold text-gray-800 border border-purple-200 rounded-xl px-2 py-1"
                >
                  <option value="" disabled>More Parties...</option>
                  {partyList.filter((p) => p !== "General" && !suppliers.slice(0, 5).some((s) => s.name === p)).map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                  <option value="__NEW__">➕ Add Other Party...</option>
                </select>
              )}

              {/* Custom Party Button */}
              <button
                type="button"
                onClick={() => setIsCustomParty(true)}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  isCustomParty
                    ? "bg-purple-700 text-white"
                    : "bg-white text-purple-700 hover:bg-purple-100 border border-purple-300 border-dashed"
                }`}
              >
                ➕ New Party
              </button>
            </div>

            {/* Note Mode Switch (Single vs Bulk Paste) */}
            <div className="flex items-center gap-1 bg-white p-0.5 rounded-xl border border-purple-200 shrink-0">
              <button
                type="button"
                onClick={() => setNoteMode("quick")}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition-all ${
                  noteMode === "quick" ? "bg-purple-100 text-purple-900" : "text-gray-500 hover:text-gray-900"
                }`}
              >
                ⚡ Quick
              </button>
              <button
                type="button"
                onClick={() => setNoteMode("bulk")}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                  noteMode === "bulk" ? "bg-purple-100 text-purple-900" : "text-gray-500 hover:text-gray-900"
                }`}
              >
                <ClipboardPaste className="w-3 h-3" />
                Bulk Paste
              </button>
            </div>
          </div>

          {/* Custom Party Name Input (when active) */}
          {isCustomParty && (
            <div className="flex items-center gap-2 animate-in fade-in duration-150">
              <input
                type="text"
                autoFocus
                value={customPartyName}
                onChange={(e) => setCustomPartyName(e.target.value)}
                placeholder="Enter distributor or party name (e.g. Agarwal Agencies)..."
                className="w-full text-xs font-bold text-purple-900 bg-white border border-purple-400 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-600"
              />
              <button
                type="button"
                onClick={() => setIsCustomParty(false)}
                className="text-xs text-gray-500 hover:text-gray-800 px-2 py-1"
              >
                Cancel
              </button>
            </div>
          )}

          {/* SINGLE QUICK NOTE INPUT */}
          {noteMode === "quick" ? (
            <form onSubmit={handleAddNote} className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputNoteText}
                    onChange={(e) => setInputNoteText(e.target.value)}
                    placeholder="⚡ Type demand note (e.g. Dove shampoo 180ml 12 pcs urgent)..."
                    className="w-full bg-white text-xs sm:text-sm font-semibold text-gray-900 placeholder:text-gray-400 border border-purple-300 rounded-xl pl-3.5 pr-10 py-2.5 shadow-2xs focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                  />
                  {/* Urgent toggle chip inside input */}
                  <button
                    type="button"
                    onClick={() => setIsUrgentManual(!isUrgentManual)}
                    className={`absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-black px-1.5 py-0.5 rounded-md transition-colors ${
                      isUrgentManual || liveParsed?.priority === "urgent"
                        ? "bg-red-500 text-white"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}
                    title="Mark as Urgent Demand"
                  >
                    🔥 Urgent
                  </button>
                </div>

                <Button
                  type="submit"
                  disabled={!inputNoteText.trim()}
                  className="bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white font-bold text-xs gap-1.5 px-4 py-2.5 rounded-xl shadow-md shrink-0 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Note</span>
                </Button>
              </div>

              {/* Live Smart Parsing Preview */}
              {liveParsed && liveParsed.itemName && (
                <div className="flex items-center gap-2 text-[11px] text-purple-900 bg-purple-100/70 px-3 py-1 rounded-lg">
                  <Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                  <span>
                    Item: <strong>{liveParsed.itemName}</strong>
                  </span>
                  {liveParsed.quantity && (
                    <span className="bg-purple-200 text-purple-950 font-bold px-1.5 py-0.2 rounded">
                      Qty: {liveParsed.quantity}
                    </span>
                  )}
                  {liveParsed.partyHint && (
                    <span className="bg-indigo-100 text-indigo-900 font-bold px-1.5 py-0.2 rounded">
                      Party: {liveParsed.partyHint}
                    </span>
                  )}
                  {liveParsed.priority === "urgent" && (
                    <span className="bg-red-100 text-red-700 font-bold px-1.5 py-0.2 rounded flex items-center gap-0.5">
                      <Flame className="w-3 h-3 text-red-600" /> Urgent
                    </span>
                  )}
                </div>
              )}
            </form>
          ) : (
            /* BULK PASTE MODE */
            <div className="space-y-2">
              <textarea
                rows={4}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder="Paste customer list or WhatsApp message (one item per line)...&#10;e.g.&#10;1. Surf Excel 1kg 5 pkt&#10;2. Dettol soap 125g 10 pcs (urgent)&#10;3. Colgate maxfresh 150g 6"
                className="w-full bg-white text-xs font-mono text-gray-900 placeholder:text-gray-400 border border-purple-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-purple-600"
              />
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-gray-500">
                  Tip: Auto-detects quantities, units, and urgent tags automatically.
                </span>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleBulkAdd}
                  disabled={!bulkText.trim()}
                  className="bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs gap-1.5 rounded-xl shadow-md"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>⚡ Auto-Split & Add All</span>
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* ===================================================================== */}
        {/* TABS, FILTERS & SEARCH                                                */}
        {/* ===================================================================== */}
        <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2 shrink-0 text-xs">
          {/* View Modes */}
          <div className="flex items-center gap-1 bg-gray-200/80 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveView("grouped")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                activeView === "grouped"
                  ? "bg-white text-purple-900 shadow-xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-purple-600" />
              <span>Party Sections</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveView("list")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                activeView === "list"
                  ? "bg-white text-purple-900 shadow-xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <ListOrdered className="w-3.5 h-3.5 text-indigo-600" />
              <span>Checklist</span>
            </button>
          </div>

          {/* Status Filter Pills */}
          <div className="flex items-center gap-1 flex-wrap">
            <button
              type="button"
              onClick={() => setStatusFilter("pending")}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors cursor-pointer ${
                statusFilter === "pending"
                  ? "bg-amber-100 text-amber-900 border border-amber-300"
                  : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              ⚡ To Order ({stats.pending})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("ordered")}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors cursor-pointer ${
                statusFilter === "ordered"
                  ? "bg-indigo-100 text-indigo-900 border border-indigo-300"
                  : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              ⏳ Ordered ({stats.ordered || 0})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("fulfilled")}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors cursor-pointer ${
                statusFilter === "fulfilled"
                  ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                  : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              ✅ Received ({stats.completed})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors cursor-pointer ${
                statusFilter === "all"
                  ? "bg-purple-100 text-purple-900 border border-purple-300"
                  : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              All ({stats.total})
            </button>
          </div>

          {/* Search box & Clear Done */}
          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-44">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search note or party..."
                className="w-full pl-8 pr-2.5 py-1 text-xs bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-600"
              />
            </div>

            {stats.completed > 0 && (
              <button
                type="button"
                onClick={handleClearCompleted}
                className="text-[11px] font-bold text-gray-500 hover:text-red-600 transition-colors whitespace-nowrap"
                title="Clear completed notes"
              >
                Clear Done
              </button>
            )}
          </div>
        </div>

        {/* ===================================================================== */}
        {/* LIST CONTAINER (Scrollable)                                           */}
        {/* ===================================================================== */}
        <div className="p-3 sm:p-5 overflow-y-auto flex-1 min-h-0 space-y-4 bg-gray-50/50">
          {filteredNotes.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 mx-auto flex items-center justify-center font-bold text-xl">
                📝
              </div>
              <h3 className="text-sm font-bold text-gray-800">No demand notes found</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Type an item name above like <em>&quot;Dove shampoo 180ml 12 pcs&quot;</em> or paste a customer demand list. Your notes are stored permanently in the cloud!
              </p>
            </div>
          ) : activeView === "grouped" ? (
            /* =============================================================== */
            /* 📦 PARTY-WISE DISTINCT SECTIONS                                 */
            /* =============================================================== */
            <div className="space-y-4">
              {Object.entries(groupedData).map(([groupName, items]) => {
                const pendingCount = items.filter((i) => !i.isDone && i.status !== "fulfilled").length;
                const isGeneral = groupName.toLowerCase() === "general";

                return (
                  <div
                    key={groupName}
                    className="bg-white rounded-2xl border border-gray-200/90 shadow-2xs overflow-hidden"
                  >
                    {/* Section Header */}
                    <div className="px-4 py-3 bg-gradient-to-r from-purple-50/90 via-indigo-50/40 to-white border-b border-gray-100 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Building2 className={`w-4 h-4 shrink-0 ${isGeneral ? "text-purple-600" : "text-indigo-600"}`} />
                        <span className="font-black text-xs sm:text-sm text-gray-900 uppercase tracking-wide truncate">
                          {isGeneral ? "🌐 General Demand (सामान्य पर्ची)" : groupName}
                        </span>
                        <span className="bg-purple-100 text-purple-900 text-[10px] font-black px-2 py-0.5 rounded-full shrink-0">
                          {pendingCount} to order
                        </span>
                      </div>

                      {/* WhatsApp Purchase Order Button */}
                      <button
                        type="button"
                        onClick={() => handleSendWhatsAppPO(groupName, items)}
                        className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-xl transition-colors cursor-pointer shrink-0 shadow-2xs"
                        title="Create WhatsApp Purchase Order slip"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="hidden sm:inline">WhatsApp</span> PO
                      </button>
                    </div>

                    {/* Section Items */}
                    <div className="divide-y divide-gray-100">
                      {items.map((item, idx) => {
                        const isFulfilled = item.isDone || item.status === "fulfilled";
                        const isOrdered = item.status === "ordered";

                        return (
                          <div
                            key={item.id}
                            className={`p-3 sm:px-4 flex items-center justify-between gap-3 transition-colors ${
                              isFulfilled
                                ? "bg-gray-50/60 opacity-65"
                                : isOrdered
                                ? "bg-indigo-50/30"
                                : "hover:bg-purple-50/30"
                            }`}
                          >
                            {/* Left: Checkbox & Item info */}
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <button
                                type="button"
                                onClick={() => handleToggleDone(item.id)}
                                className="text-gray-400 hover:text-emerald-600 transition-colors shrink-0 cursor-pointer"
                                title="Toggle Done / Received"
                              >
                                {isFulfilled ? (
                                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                ) : (
                                  <Circle className="w-5 h-5 text-gray-300 hover:text-gray-500" />
                                )}
                              </button>

                              <div className="min-w-0 space-y-0.5">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span
                                    className={`text-xs sm:text-sm font-black text-gray-900 ${
                                      isFulfilled ? "line-through text-gray-500 font-medium" : ""
                                    }`}
                                  >
                                    {item.itemName}
                                  </span>

                                  {item.quantity && (
                                    <span className="text-[11px] font-black bg-purple-100 text-purple-900 px-2 py-0.2 rounded-md border border-purple-200">
                                      {item.quantity}
                                    </span>
                                  )}

                                  {item.priority === "urgent" && !isFulfilled && (
                                    <span className="text-[10px] font-black bg-red-100 text-red-700 px-1.5 py-0.2 rounded-md border border-red-200 flex items-center gap-0.5">
                                      <Flame className="w-3 h-3 text-red-600" /> Urgent
                                    </span>
                                  )}
                                </div>

                                <div className="text-[10px] text-gray-400 flex items-center gap-2">
                                  <span>Added {new Date(item.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</span>
                                  {item.notes && <span>• {item.notes}</span>}
                                </div>
                              </div>
                            </div>

                            {/* Right: Status Pill & Actions */}
                            <div className="flex items-center gap-2 shrink-0">
                              {/* 3-State Status Toggle */}
                              <button
                                type="button"
                                onClick={() => handleCycleStatus(item.id, item.status)}
                                className={`text-[10px] font-black px-2.5 py-1 rounded-xl transition-all cursor-pointer ${
                                  isFulfilled
                                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                    : isOrdered
                                    ? "bg-indigo-100 text-indigo-800 border border-indigo-300"
                                    : "bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200"
                                }`}
                                title="Click to cycle status: Pending -> Ordered -> Received"
                              >
                                {isFulfilled ? "✅ Received" : isOrdered ? "⏳ Ordered" : "⚡ To Order"}
                              </button>

                              {/* Add to Inventory Product Shortcut */}
                              {onAddAsProduct && (
                                <button
                                  type="button"
                                  onClick={() => onAddAsProduct(item.itemName, item.supplierId)}
                                  className="p-1.5 text-gray-400 hover:text-purple-700 hover:bg-purple-100 rounded-lg transition-colors cursor-pointer"
                                  title="Add as permanent product in Falcon inventory"
                                >
                                  <PackagePlus className="w-4 h-4" />
                                </button>
                              )}

                              {/* Delete */}
                              <button
                                type="button"
                                onClick={() => handleDelete(item.id)}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                title="Delete note"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* =============================================================== */
            /* 📋 NUMBERED CHECKLIST VIEW                                      */
            /* =============================================================== */
            <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs divide-y divide-gray-100 overflow-hidden">
              {filteredNotes.map((item, index) => {
                const isFulfilled = item.isDone || item.status === "fulfilled";
                const isOrdered = item.status === "ordered";

                return (
                  <div
                    key={item.id}
                    className={`p-3 flex items-center justify-between gap-3 ${
                      isFulfilled ? "bg-gray-50/60 opacity-65" : "hover:bg-purple-50/30"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="w-6 text-center text-xs font-black text-gray-400 shrink-0">
                        #{index + 1}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleToggleDone(item.id)}
                        className="text-gray-400 hover:text-emerald-600 shrink-0 cursor-pointer"
                      >
                        {isFulfilled ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        ) : (
                          <Circle className="w-5 h-5 text-gray-300 hover:text-gray-500" />
                        )}
                      </button>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-xs sm:text-sm font-black text-gray-900 ${
                              isFulfilled ? "line-through text-gray-500 font-medium" : ""
                            }`}
                          >
                            {item.itemName}
                          </span>

                          {item.quantity && (
                            <span className="text-[11px] font-black bg-purple-100 text-purple-900 px-2 py-0.2 rounded-md">
                              {item.quantity}
                            </span>
                          )}

                          <span className="text-[10px] font-bold bg-gray-100 text-gray-700 px-2 py-0.2 rounded-md border border-gray-200">
                            🏢 {item.groupName}
                          </span>

                          {item.priority === "urgent" && !isFulfilled && (
                            <span className="text-[10px] font-black bg-red-100 text-red-700 px-1.5 py-0.2 rounded-md flex items-center gap-0.5">
                              <Flame className="w-3 h-3 text-red-600" /> Urgent
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleCycleStatus(item.id, item.status)}
                        className={`text-[10px] font-black px-2 py-1 rounded-lg cursor-pointer ${
                          isFulfilled
                            ? "bg-emerald-100 text-emerald-800"
                            : isOrdered
                            ? "bg-indigo-100 text-indigo-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {isFulfilled ? "✅ Received" : isOrdered ? "⏳ Ordered" : "⚡ To Order"}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ===================================================================== */}
        {/* FOOTER BAR                                                            */}
        {/* ===================================================================== */}
        <div className="px-5 py-3 bg-white border-t border-gray-200 flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs">
          <div className="flex items-center gap-4 text-gray-600">
            <span>
              Total: <strong>{stats.total} items</strong>
            </span>
            <span>
              Pending: <strong className="text-amber-700">{stats.pending}</strong>
            </span>
            <span>
              Parties: <strong>{Object.keys(stats.byGroup || {}).length}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs font-bold"
            >
              Close Pad
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
