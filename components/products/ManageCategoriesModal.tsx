"use client";

import React, { useState } from "react";
import {
  Layers,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Search,
  Tag,
  Package,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { productsRepository } from "@/repositories/products.repo";
import { Category, Product } from "@/types/database";

interface ManageCategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  shopId: string;
  categories: Category[];
  products: Product[];
  onCategoriesUpdated: () => void;
}

export const ManageCategoriesModal: React.FC<ManageCategoriesModalProps> = ({
  isOpen,
  onClose,
  shopId,
  categories,
  products,
  onCategoriesUpdated,
}) => {
  const [search, setSearch] = useState("");
  const [newCatName, setNewCatName] = useState("");
  const [newCatDesc, setNewCatDesc] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const [deletingCatId, setDeletingCatId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen) return null;

  // Calculate product count per category
  const productCountMap = new Map<string, number>();
  products.forEach((p) => {
    if (p.category_id) {
      productCountMap.set(p.category_id, (productCountMap.get(p.category_id) || 0) + 1);
    }
  });

  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    try {
      setIsCreating(true);
      await productsRepository.createCategory({
        shop_id: shopId,
        name: newCatName.trim(),
        is_active: true,
      });
      setNewCatName("");
      onCategoriesUpdated();
    } catch (err: any) {
      alert("Failed to create category: " + err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleStartEdit = (cat: Category) => {
    setEditingCatId(cat.id);
    setEditName(cat.name);
  };

  const handleSaveEdit = async (id: string) => {
    if (!editName.trim()) return;
    try {
      setIsUpdating(true);
      await productsRepository.updateCategory(id, {
        name: editName.trim(),
      });
      setEditingCatId(null);
      onCategoriesUpdated();
    } catch (err: any) {
      alert("Failed to update category: " + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      setIsDeleting(true);
      await productsRepository.deleteCategory(id);
      setDeletingCatId(null);
      onCategoriesUpdated();
    } catch (err: any) {
      alert("Failed to delete category: " + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600/30 border border-purple-400/30 flex items-center justify-center text-purple-300">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-2">
                Manage Categories
                <span className="text-xs bg-purple-500/20 text-purple-200 px-2 py-0.5 rounded-full border border-purple-400/20 font-bold">
                  {categories.length} Total
                </span>
              </h2>
              <p className="text-xs text-purple-200/70">
                Organize products into categories for easy inventory and storefront browsing
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5 bg-gray-50/50">
          {/* Add Category Card */}
          <form
            onSubmit={handleCreateCategory}
            className="bg-white p-4 rounded-2xl border border-purple-200/80 shadow-xs space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-purple-950 flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-purple-600" />
                Add New Category
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <Input
                placeholder="Enter Category Name (e.g. Hair Oil, Personal Care, Snacks)..."
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="text-xs h-9 flex-1"
                required
              />
              <Button
                type="submit"
                size="sm"
                disabled={isCreating || !newCatName.trim()}
                className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md shadow-purple-600/20 gap-1.5 px-4 h-9 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isCreating ? "Adding..." : "Add Category"}</span>
              </Button>
            </div>
          </form>

          {/* Search & Categories List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search categories..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>
              <span className="text-xs text-gray-500 font-bold">
                {filteredCategories.length} Categories
              </span>
            </div>

            {/* Category Cards List */}
            <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
              {filteredCategories.length === 0 ? (
                <div className="text-center py-8 bg-white rounded-2xl border border-gray-200 text-gray-400 text-xs">
                  No categories found. Create your first category above!
                </div>
              ) : (
                filteredCategories.map((cat) => {
                  const pCount = productCountMap.get(cat.id) || 0;
                  const isEditing = editingCatId === cat.id;
                  const isConfirmingDelete = deletingCatId === cat.id;

                  return (
                    <div
                      key={cat.id}
                      className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-2xs hover:border-purple-200 transition-all space-y-2"
                    >
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="text-xs h-8 flex-1"
                            placeholder="Category name"
                            autoFocus
                          />
                          <div className="flex items-center gap-1.5">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingCatId(null)}
                              className="h-8 text-xs px-2.5"
                            >
                              Cancel
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              disabled={isUpdating || !editName.trim()}
                              onClick={() => handleSaveEdit(cat.id)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs px-3 font-bold gap-1"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>{isUpdating ? "Saving..." : "Save"}</span>
                            </Button>
                          </div>
                        </div>
                      ) : isConfirmingDelete ? (
                        <div className="bg-red-50 p-3 rounded-xl border border-red-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-2 text-red-900">
                            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                            <span>
                              Delete <strong>{cat.name}</strong>? {pCount} product(s) in this category will become Uncategorized.
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setDeletingCatId(null)}
                              className="h-7 text-xs px-2.5"
                            >
                              Cancel
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              disabled={isDeleting}
                              onClick={() => handleDeleteCategory(cat.id)}
                              className="bg-red-600 hover:bg-red-700 text-white h-7 text-xs px-3 font-bold"
                            >
                              {isDeleting ? "Deleting..." : "Confirm Delete"}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-black text-xs border border-purple-100">
                              {cat.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-xs font-black text-gray-900">{cat.name}</h4>
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                                  <Package className="w-3 h-3 text-gray-400" />
                                  {pCount} {pCount === 1 ? "Product" : "Products"}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleStartEdit(cat)}
                              title="Edit Category"
                              className="p-1.5 rounded-lg text-gray-500 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeletingCatId(cat.id)}
                              title="Delete Category"
                              className="p-1.5 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-gray-50 border-t border-gray-200 flex justify-end shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs font-bold"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};
