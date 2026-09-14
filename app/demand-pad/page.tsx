"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Building2,
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  Search,
  Printer,
  Sparkles,
  MessageSquare,
  ClipboardPaste,
  Layers,
  ListOrdered,
  Flame,
  Cloud,
  ArrowRight,
  Filter,
  Check,
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/store/useAuthStore";
import { suppliersRepository } from "@/repositories/suppliers.repo";
import { Supplier } from "@/types/database";
import {
  quickDemandNotesService,
  QuickDemandNote,
} from "@/lib/quick-demand-notes";
import {
  parseSingleDemandNote,
  parseBulkDemandText,
} from "@/lib/demand-notes-parser";

export default function DemandPadPage() {
  const { currentStore, profile } = useAuthStore();
  const shopId = currentStore?.id || profile?.store_id || "";

  const [notes, setNotes] = useState<QuickDemandNote[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [inputNoteText, setInputNoteText] = useState("");
  const [selectedParty, setSelectedParty] = useState<string>("General");
  const [customPartyName, setCustomPartyName] = useState("");
  const [isCustomParty, setIsCustomParty] = useState(false);
  const [noteMode, setNoteMode] = useState<"quick" | "bulk">("quick");
  const [bulkText, setBulkText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeView, setActiveView] = useState<"grouped" | "list">("grouped");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "ordered" | "fulfilled">("pending");
  const [selectedPartyFilter, setSelectedPartyFilter] = useState<string>("all");
  const [isUrgentManual, setIsUrgentManual] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Load suppliers
  useEffect(() => {
    async function loadSuppliers() {
      if (!shopId) return;
      try {
        const sups = await suppliersRepository.getAll(shopId);
        setSuppliers(sups);
      } catch (err) {
        console.warn("Failed to load suppliers:", err);
      }
    }
    loadSuppliers();
  }, [shopId]);

  // Load notes
  const reloadNotes = async () => {
    if (!shopId) return;
    const local = quickDemandNotesService.getAll(shopId);
    setNotes(local);

    try {
      const cloud = await quickDemandNotesService.getAllAsync(shopId);
      if (cloud && cloud.length > 0) setNotes(cloud);
    } catch {}
  };

  useEffect(() => {
    reloadNotes();
  }, [shopId]);

  useEffect(() => {
    const handleUpdated = () => {
      if (shopId) {
        setNotes(quickDemandNotesService.getAll(shopId));
      }
    };
    window.addEventListener("falcon_demand_notes_updated", handleUpdated);
    return () => window.removeEventListener("falcon_demand_notes_updated", handleUpdated);
  }, [shopId]);

  const supplierNames = useMemo(() => suppliers.map((s) => s.name), [suppliers]);

  const partyList = useMemo(() => {
    const set = new Set<string>();
    set.add("General");
    suppliers.forEach((s) => set.add(s.name));
    notes.forEach((n) => {
      if (n.groupName) set.add(n.groupName);
    });
    return Array.from(set);
  }, [suppliers, notes]);

  const liveParsed = useMemo(() => {
    if (!inputNoteText.trim()) return null;
    return parseSingleDemandNote(inputNoteText, supplierNames);
  }, [inputNoteText, supplierNames]);

  // Add Single Note
  const handleAddNote = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputNoteText.trim()) return;

    const parsed = parseSingleDemandNote(inputNoteText, supplierNames);
    if (!parsed.itemName) return;

    let targetGroup = isCustomParty
      ? customPartyName.trim() || "General"
      : selectedParty;

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
      alert("No valid items found.");
      return;
    }

    const withSuppliers = parsedItems.map((it) => {
      const match = suppliers.find(
        (s) => s.name.toLowerCase() === it.groupName.toLowerCase()
      );
      return { ...it, supplierId: match?.id || null };
    });

    await quickDemandNotesService.bulkSave(shopId, withSuppliers);
    setBulkText("");
    setNoteMode("quick");
    reloadNotes();
  };

  // Status cycling
  const handleCycleStatus = (id: string, currentStatus: string = "pending") => {
    quickDemandNotesService.cycleStatus(shopId, id, currentStatus);
    reloadNotes();
  };

  const handleToggleDone = (id: string) => {
    quickDemandNotesService.toggleDone(shopId, id);
    reloadNotes();
  };

  const handleDelete = (id: string) => {
    quickDemandNotesService.delete(shopId, id);
    reloadNotes();
  };

  // WhatsApp PO Sender
  const handleSendWhatsAppPO = (groupName: string, items: QuickDemandNote[]) => {
    const unfulfilled = items.filter((i) => !i.isDone && i.status !== "fulfilled");
    if (unfulfilled.length === 0) {
      alert("No pending items for this party.");
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
      // Party filter
      if (selectedPartyFilter !== "all" && n.groupName.toLowerCase() !== selectedPartyFilter.toLowerCase()) {
        return false;
      }

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
  }, [notes, selectedPartyFilter, statusFilter, searchQuery]);

  // Grouped by party
  const groupedData = useMemo(() => {
    const groups: Record<string, QuickDemandNote[]> = {};
    filteredNotes.forEach((n) => {
      const g = n.groupName || "General";
      if (!groups[g]) groups[g] = [];
      groups[g].push(n);
    });
    return groups;
  }, [filteredNotes]);

  const stats = useMemo(() => quickDemandNotesService.getStats(shopId), [notes, shopId]);

  return (
    <MainLayout
      title="Demand Pad (खरीदी पर्ची)"
      subtitle="Permanent shortage tracking, party-wise distributor orders & 1-click WhatsApp purchase slips"
    >
      <div className="space-y-6 pb-12">
        {/* =================================================================== */}
        {/* STATS OVERVIEW CARDS                                                */}
        {/* =================================================================== */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <Card className="border-amber-200 bg-amber-50/50">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">To Order (Pending)</div>
                <div className="text-2xl font-black text-amber-950">{stats.pending} items</div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-200/80 text-amber-800 flex items-center justify-center font-bold text-lg">
                ⚡
              </div>
            </CardContent>
          </Card>

          <Card className="border-indigo-200 bg-indigo-50/50">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold text-indigo-800 uppercase tracking-wider">Ordered to Party</div>
                <div className="text-2xl font-black text-indigo-950">{stats.ordered || 0} items</div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-indigo-200/80 text-indigo-800 flex items-center justify-center font-bold text-lg">
                ⏳
              </div>
            </CardContent>
          </Card>

          <Card className="border-emerald-200 bg-emerald-50/50">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Received / Done</div>
                <div className="text-2xl font-black text-emerald-950">{stats.completed} items</div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-200/80 text-emerald-800 flex items-center justify-center font-bold text-lg">
                ✅
              </div>
            </CardContent>
          </Card>

          <Card className="border-purple-200 bg-purple-50/50">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold text-purple-800 uppercase tracking-wider">Total Recorded</div>
                <div className="text-2xl font-black text-purple-950">{stats.total} items</div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-200/80 text-purple-800 flex items-center justify-center font-bold">
                <Cloud className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* =================================================================== */}
        {/* FAST NOTE CREATOR CARD                                              */}
        {/* =================================================================== */}
        <Card className="border-purple-200/90 shadow-sm overflow-hidden">
          <div className="p-4 bg-gradient-to-r from-purple-50/80 via-indigo-50/40 to-white border-b border-purple-100 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              {/* Party Selection Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 max-w-full scrollbar-none">
                <span className="text-xs font-black text-purple-950 shrink-0 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-purple-600" />
                  Select Party:
                </span>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedParty("General");
                    setIsCustomParty(false);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    selectedParty === "General" && !isCustomParty
                      ? "bg-purple-700 text-white shadow-xs"
                      : "bg-white text-gray-700 hover:bg-purple-100 border border-purple-200"
                  }`}
                >
                  🌐 General (सामान्य पर्ची)
                </button>

                {suppliers.slice(0, 6).map((sup) => (
                  <button
                    key={sup.id}
                    type="button"
                    onClick={() => {
                      setSelectedParty(sup.name);
                      setIsCustomParty(false);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                      selectedParty === sup.name && !isCustomParty
                        ? "bg-purple-700 text-white shadow-xs"
                        : "bg-white text-gray-700 hover:bg-purple-100 border border-purple-200"
                    }`}
                  >
                    🏢 {sup.name}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => setIsCustomParty(true)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    isCustomParty
                      ? "bg-purple-700 text-white"
                      : "bg-white text-purple-700 hover:bg-purple-100 border border-purple-300 border-dashed"
                  }`}
                >
                  ➕ New Party
                </button>
              </div>

              {/* Mode switch */}
              <div className="flex items-center gap-1 bg-white p-0.5 rounded-xl border border-purple-200">
                <button
                  type="button"
                  onClick={() => setNoteMode("quick")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                    noteMode === "quick" ? "bg-purple-100 text-purple-900" : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  ⚡ Quick Note
                </button>
                <button
                  type="button"
                  onClick={() => setNoteMode("bulk")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 ${
                    noteMode === "bulk" ? "bg-purple-100 text-purple-900" : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  <ClipboardPaste className="w-3.5 h-3.5" />
                  Bulk Multi-line
                </button>
              </div>
            </div>

            {isCustomParty && (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  autoFocus
                  value={customPartyName}
                  onChange={(e) => setCustomPartyName(e.target.value)}
                  placeholder="Enter distributor or supplier name..."
                  className="w-full text-xs font-bold text-purple-900 bg-white border border-purple-400 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
                <Button size="sm" variant="outline" onClick={() => setIsCustomParty(false)}>
                  Cancel
                </Button>
              </div>
            )}

            {noteMode === "quick" ? (
              <form onSubmit={handleAddNote} className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputNoteText}
                      onChange={(e) => setInputNoteText(e.target.value)}
                      placeholder="⚡ Type demand note (e.g. Dove shampoo 180ml 12 pcs urgent)..."
                      className="w-full bg-white text-sm font-semibold text-gray-900 placeholder:text-gray-400 border border-purple-300 rounded-xl pl-4 pr-24 py-3 shadow-2xs focus:outline-none focus:ring-2 focus:ring-purple-600"
                    />
                    <button
                      type="button"
                      onClick={() => setIsUrgentManual(!isUrgentManual)}
                      className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black px-2 py-1 rounded-lg transition-colors ${
                        isUrgentManual || liveParsed?.priority === "urgent"
                          ? "bg-red-500 text-white"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      }`}
                    >
                      🔥 Urgent
                    </button>
                  </div>

                  <Button
                    type="submit"
                    disabled={!inputNoteText.trim()}
                    className="bg-purple-700 hover:bg-purple-800 text-white font-bold text-sm px-6 py-3 rounded-xl shadow-md cursor-pointer"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Note
                  </Button>
                </div>

                {liveParsed && liveParsed.itemName && (
                  <div className="flex items-center gap-2 text-xs text-purple-900 bg-purple-100/70 px-3.5 py-1.5 rounded-xl">
                    <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
                    <span>
                      Item: <strong>{liveParsed.itemName}</strong>
                    </span>
                    {liveParsed.quantity && (
                      <span className="bg-purple-200 text-purple-950 font-bold px-2 py-0.5 rounded">
                        Qty: {liveParsed.quantity}
                      </span>
                    )}
                    {liveParsed.partyHint && (
                      <span className="bg-indigo-100 text-indigo-900 font-bold px-2 py-0.5 rounded">
                        Party: {liveParsed.partyHint}
                      </span>
                    )}
                    {liveParsed.priority === "urgent" && (
                      <span className="bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded flex items-center gap-1">
                        <Flame className="w-3.5 h-3.5 text-red-600" /> Urgent
                      </span>
                    )}
                  </div>
                )}
              </form>
            ) : (
              <div className="space-y-2">
                <textarea
                  rows={4}
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder="Paste WhatsApp list or shortage notes (one item per line)...&#10;1. Surf Excel 1kg 5 pkt&#10;2. Dettol soap 125g 10 pcs (urgent)&#10;3. Colgate maxfresh 150g 6"
                  className="w-full bg-white text-xs font-mono text-gray-900 border border-purple-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    Auto-splits items, quantities, and urgent priority tags automatically.
                  </span>
                  <Button
                    type="button"
                    onClick={handleBulkAdd}
                    disabled={!bulkText.trim()}
                    className="bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs"
                  >
                    <Sparkles className="w-4 h-4 mr-1" />
                    ⚡ Auto-Split & Add All Notes
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* =================================================================== */}
        {/* ACTION & FILTER TOOLBAR                                             */}
        {/* =================================================================== */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-gray-200/90 shadow-2xs text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            {/* View Switch */}
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveView("grouped")}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-bold transition-all ${
                  activeView === "grouped" ? "bg-white text-purple-900 shadow-xs" : "text-gray-600"
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-purple-600" />
                Party Sections
              </button>
              <button
                type="button"
                onClick={() => setActiveView("list")}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-bold transition-all ${
                  activeView === "list" ? "bg-white text-purple-900 shadow-xs" : "text-gray-600"
                }`}
              >
                <ListOrdered className="w-3.5 h-3.5 text-indigo-600" />
                Checklist
              </button>
            </div>

            {/* Status Pills */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setStatusFilter("pending")}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
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
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
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
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
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
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                  statusFilter === "all"
                    ? "bg-purple-100 text-purple-900 border border-purple-300"
                    : "text-gray-500 hover:bg-gray-100"
                }`}
              >
                All ({stats.total})
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Search Input */}
            <div className="relative w-full sm:w-56">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search note or party..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-purple-600 focus:bg-white"
              />
            </div>

            {/* Print Slip */}
            <button
              type="button"
              onClick={() => window.print()}
              className="p-2 border border-gray-200 hover:bg-gray-50 rounded-xl text-gray-600"
              title="Print Demand Slip"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* =================================================================== */}
        {/* NOTES CONTENT DISPLAY                                               */}
        {/* =================================================================== */}
        {filteredNotes.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-gray-200 p-8 space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-purple-100 text-purple-700 mx-auto flex items-center justify-center font-bold text-2xl">
              📝
            </div>
            <h3 className="text-base font-bold text-gray-900">No demand notes in this view</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              Add shortage notes or customer requests above. They will be organized party-wise and saved permanently in the cloud.
            </p>
          </div>
        ) : activeView === "grouped" ? (
          /* PARTY-WISE SECTIONS */
          <div className="space-y-4">
            {Object.entries(groupedData).map(([groupName, items]) => {
              const pendingCount = items.filter((i) => !i.isDone && i.status !== "fulfilled").length;
              const isGeneral = groupName.toLowerCase() === "general";

              return (
                <div
                  key={groupName}
                  className="bg-white rounded-2xl border border-gray-200/90 shadow-2xs overflow-hidden"
                >
                  <div className="px-5 py-3.5 bg-gradient-to-r from-purple-50/90 via-indigo-50/40 to-white border-b border-gray-100 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <Building2 className={`w-4 h-4 ${isGeneral ? "text-purple-600" : "text-indigo-600"}`} />
                      <h3 className="font-black text-sm text-gray-900 uppercase tracking-wide">
                        {isGeneral ? "🌐 General Demand (सामान्य पर्ची)" : groupName}
                      </h3>
                      <span className="bg-purple-100 text-purple-900 text-xs font-black px-2.5 py-0.5 rounded-full">
                        {pendingCount} to order
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSendWhatsAppPO(groupName, items)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3.5 py-1.5 rounded-xl transition-colors cursor-pointer shadow-2xs"
                    >
                      <MessageSquare className="w-4 h-4 text-emerald-600" />
                      <span>Send WhatsApp Purchase Order</span>
                    </button>
                  </div>

                  <div className="divide-y divide-gray-100">
                    {items.map((item) => {
                      const isFulfilled = item.isDone || item.status === "fulfilled";
                      const isOrdered = item.status === "ordered";

                      return (
                        <div
                          key={item.id}
                          className={`p-3.5 sm:px-5 flex items-center justify-between gap-3 transition-colors ${
                            isFulfilled
                              ? "bg-gray-50/60 opacity-60"
                              : isOrdered
                              ? "bg-indigo-50/30"
                              : "hover:bg-purple-50/30"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <button
                              type="button"
                              onClick={() => handleToggleDone(item.id)}
                              className="text-gray-400 hover:text-emerald-600 transition-colors shrink-0"
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
                                  className={`text-sm font-black text-gray-900 ${
                                    isFulfilled ? "line-through text-gray-500 font-medium" : ""
                                  }`}
                                >
                                  {item.itemName}
                                </span>

                                {item.quantity && (
                                  <span className="text-xs font-black bg-purple-100 text-purple-900 px-2 py-0.5 rounded-md border border-purple-200">
                                    {item.quantity}
                                  </span>
                                )}

                                {item.priority === "urgent" && !isFulfilled && (
                                  <span className="text-[10px] font-black bg-red-100 text-red-700 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                                    <Flame className="w-3 h-3 text-red-600" /> Urgent
                                  </span>
                                )}
                              </div>

                              <div className="text-[11px] text-gray-400 flex items-center gap-2">
                                <span>Recorded on {new Date(item.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleCycleStatus(item.id, item.status)}
                              className={`text-xs font-black px-3 py-1.5 rounded-xl transition-all ${
                                isFulfilled
                                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                  : isOrdered
                                  ? "bg-indigo-100 text-indigo-800 border border-indigo-300"
                                  : "bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200"
                              }`}
                            >
                              {isFulfilled ? "✅ Received" : isOrdered ? "⏳ Ordered" : "⚡ To Order"}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDelete(item.id)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                              title="Delete note"
                            >
                              <Trash2 className="w-4 h-4" />
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
          /* NUMBERED LIST */
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs divide-y divide-gray-100 overflow-hidden">
            {filteredNotes.map((item, index) => {
              const isFulfilled = item.isDone || item.status === "fulfilled";
              const isOrdered = item.status === "ordered";

              return (
                <div
                  key={item.id}
                  className={`p-4 flex items-center justify-between gap-3 ${
                    isFulfilled ? "bg-gray-50/60 opacity-60" : "hover:bg-purple-50/30"
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <span className="w-6 text-center text-xs font-black text-gray-400 shrink-0">
                      #{index + 1}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleToggleDone(item.id)}
                      className="text-gray-400 hover:text-emerald-600 shrink-0"
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
                          className={`text-sm font-black text-gray-900 ${
                            isFulfilled ? "line-through text-gray-500 font-medium" : ""
                          }`}
                        >
                          {item.itemName}
                        </span>

                        {item.quantity && (
                          <span className="text-xs font-black bg-purple-100 text-purple-900 px-2 py-0.5 rounded-md">
                            {item.quantity}
                          </span>
                        )}

                        <span className="text-xs font-bold bg-gray-100 text-gray-700 px-2.5 py-0.5 rounded-md border border-gray-200">
                          🏢 {item.groupName}
                        </span>

                        {item.priority === "urgent" && !isFulfilled && (
                          <span className="text-[10px] font-black bg-red-100 text-red-700 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
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
                      className={`text-xs font-black px-3 py-1.5 rounded-xl ${
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
                      className="p-2 text-gray-400 hover:text-red-600 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
