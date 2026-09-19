"use client";

import React, { useState } from "react";
import { X, Plus, Package, Trash2, Edit2, Check, AlertCircle, Sparkles } from "lucide-react";
import { Unit } from "@/types/database";
import { productsRepository } from "@/repositories/products.repo";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";

interface UnitManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  shopId: string;
  units: Unit[];
  onUnitsUpdated: (units: Unit[]) => void;
}

export const UnitManagementModal: React.FC<UnitManagementModalProps> = ({
  isOpen,
  onClose,
  shopId,
  units,
  onUnitsUpdated,
}) => {
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editFactor, setEditFactor] = useState<number>(1);

  // New Unit Form State
  const [newName, setNewName] = useState("");
  const [newFactor, setNewFactor] = useState<number | "">(10);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  if (!isOpen) return null;

  // Smart auto-detection of multiplier from unit name (e.g. "Pack of 8" -> 8, "16 pcs" -> 16)
  const handleNameChange = (val: string) => {
    setNewName(val);
    const match = val.match(/(?:of|\(?)\s*(\d+)\s*(?:pcs|pc|units)?/i);
    if (match && match[1]) {
      const parsed = parseInt(match[1], 10);
      if (parsed > 0) {
        setNewFactor(parsed);
      }
    }
  };

  const handleCreateUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      setErrorMsg("Please enter a unit name (e.g. 'Pack of 8', 'Box (24 pcs)')");
      return;
    }
    const factorNum = Number(newFactor) || 1;
    if (factorNum <= 0) {
      setErrorMsg("Pieces per unit must be at least 1");
      return;
    }

    try {
      setIsSaving(true);
      setErrorMsg("");
      const created = await productsRepository.createUnit({
        shop_id: shopId,
        name: newName.trim(),
        conversion_factor: factorNum,
      });

      const updated = [...units, created].sort((a, b) => a.name.localeCompare(b.name));
      onUnitsUpdated(updated);
      setNewName("");
      setNewFactor(10);
      setSuccessMsg(`Unit "${created.name}" created successfully!`);
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create unit");
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartEdit = (unit: Unit) => {
    setEditingUnitId(unit.id);
    setEditName(unit.name);
    setEditFactor(Number(unit.conversion_factor) || 1);
  };

  const handleSaveEdit = async (id: string) => {
    if (!editName.trim() || editFactor <= 0) return;
    try {
      setIsSaving(true);
      const updated = await productsRepository.updateUnit(id, {
        name: editName.trim(),
        conversion_factor: editFactor,
      });

      const updatedList = units.map((u) => (u.id === id ? updated : u));
      onUnitsUpdated(updatedList);
      setEditingUnitId(null);
      setSuccessMsg("Unit updated successfully!");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update unit");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteUnit = async (unit: Unit) => {
    if (unit.name.toLowerCase() === "piece" || unit.conversion_factor === 1) {
      alert("The standard 'Piece' unit cannot be deleted as it is the base unit of the store.");
      return;
    }

    if (!confirm(`Are you sure you want to delete "${unit.name}"? Products using this unit will revert to standard Piece.`)) {
      return;
    }

    try {
      setIsSaving(true);
      await productsRepository.deleteUnit(unit.id);
      const updatedList = units.filter((u) => u.id !== unit.id);
      onUnitsUpdated(updatedList);
      setSuccessMsg(`Unit "${unit.name}" deleted.`);
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to delete unit");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-purple-50/50 via-white to-indigo-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-100 text-purple-700 rounded-2xl shadow-xs">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-gray-900">Packaging Units Management</h2>
              <p className="text-xs text-gray-500">
                Configure dynamic multi-pack units (10, 12, 16, 24 pcs, or future custom packs)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alerts */}
        {errorMsg && (
          <div className="mx-5 mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mx-5 mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="p-5 space-y-5 overflow-y-auto flex-1">
          {/* Quick Add Form */}
          <form onSubmit={handleCreateUnit} className="p-4 bg-gray-50/80 border border-gray-200/80 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                Add New Packaging Unit
              </span>
              <span className="text-[10px] text-gray-400 font-medium">Auto-detects count from name</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
              <div className="sm:col-span-7">
                <label className="block text-[11px] font-bold text-gray-700 mb-1">Unit Name *</label>
                <Input
                  type="text"
                  placeholder="e.g. Pack of 8, Strip (10 pcs), Box of 50"
                  value={newName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="bg-white text-xs h-9"
                  required
                />
              </div>

              <div className="sm:col-span-5">
                <label className="block text-[11px] font-bold text-gray-700 mb-1">Pieces per Unit *</label>
                <div className="flex items-center gap-1.5">
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="10"
                    value={newFactor}
                    onChange={(e) => setNewFactor(e.target.value === "" ? "" : parseInt(e.target.value, 10))}
                    className="bg-white text-xs h-9"
                    required
                  />
                  <Button
                    type="submit"
                    size="sm"
                    isLoading={isSaving}
                    className="bg-purple-700 hover:bg-purple-800 text-white font-bold h-9 px-3 shrink-0 shadow-xs"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add</span>
                  </Button>
                </div>
              </div>
            </div>
          </form>

          {/* Existing Units List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-gray-500 px-1">
              <span>Configured Units ({units.length})</span>
              <span>Pieces per Pack</span>
            </div>

            <div className="divide-y divide-gray-100 border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-xs">
              {units.map((u) => {
                const isEditing = editingUnitId === u.id;
                const factor = Number(u.conversion_factor) || 1;
                const isBasePiece = factor === 1 || u.name.toLowerCase() === "piece";

                return (
                  <div key={u.id} className="p-3 flex items-center justify-between gap-3 hover:bg-gray-50/70 transition-colors">
                    {isEditing ? (
                      <div className="flex-1 flex items-center gap-2">
                        <Input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="text-xs h-8 bg-white"
                        />
                        <Input
                          type="number"
                          min="1"
                          value={editFactor}
                          onChange={(e) => setEditFactor(parseInt(e.target.value, 10) || 1)}
                          className="w-20 text-xs h-8 bg-white text-right"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(u.id)}
                          className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
                          title="Save changes"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingUnitId(null)}
                          className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                            isBasePiece
                              ? "bg-purple-100 text-purple-700"
                              : "bg-indigo-100 text-indigo-700"
                          }`}>
                            {factor}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-gray-900 truncate flex items-center gap-1.5">
                              <span>{u.name}</span>
                              {isBasePiece && (
                                <Badge variant="neutral" className="text-[9px] py-0 px-1 font-semibold">
                                  Base Retail
                                </Badge>
                              )}
                            </div>
                            <span className="text-[10px] text-gray-400 font-medium">
                              {factor === 1 ? "1 single piece" : `Pack contains ${factor} base pieces`}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-xs font-black text-indigo-950 tabular-nums px-2 py-0.5 bg-indigo-50/70 border border-indigo-100 rounded-lg">
                            {factor} {factor === 1 ? "pc" : "pcs"}
                          </span>

                          <button
                            type="button"
                            onClick={() => handleStartEdit(u)}
                            className="p-1.5 text-gray-400 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors"
                            title="Edit unit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {!isBasePiece && (
                            <button
                              type="button"
                              onClick={() => handleDeleteUnit(u)}
                              className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Delete unit"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
          <span className="text-[11px] text-gray-500 font-medium">
            💡 Any unit added here automatically unlocks dynamic pills and auto-break pricing in POS.
          </span>
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
};
