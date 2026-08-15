"use client";

import React, { useState, useRef, useEffect } from "react";
import { Sparkles, Plus, ChevronDown, Wand2, FileEdit } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface AddProductSplitButtonProps {
  onOpenAiCreation: () => void;
  onOpenManualCreation: () => void;
}

export const AddProductSplitButton: React.FC<AddProductSplitButtonProps> = ({
  onOpenAiCreation,
  onOpenManualCreation,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative inline-flex items-center rounded-lg shadow-sm" ref={dropdownRef}>
      {/* Primary Action Button (Falcon AI Creation) */}
      <button
        type="button"
        onClick={onOpenAiCreation}
        className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-white bg-gradient-to-r from-brand-600 via-indigo-600 to-purple-600 hover:from-brand-700 hover:to-purple-700 rounded-l-lg transition-all active:scale-95 shadow-xs"
      >
        <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
        <span>Add with Falcon AI</span>
        <span className="hidden md:inline-block px-1.5 py-0.5 text-[9px] font-black uppercase bg-white/20 text-white rounded-full">
          &lt;1 Min
        </span>
      </button>

      {/* Dropdown Toggle for Manual Flow */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center px-2 py-2 text-xs font-semibold text-white bg-purple-700 hover:bg-purple-800 border-l border-white/20 rounded-r-lg transition-colors"
        title="More creation options"
      >
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Options Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 w-64 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100">
            Product Creation Method
          </div>

          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              onOpenAiCreation();
            }}
            className="w-full px-3 py-2.5 text-left text-xs font-semibold text-gray-800 hover:bg-purple-50 flex items-start gap-2.5 group transition-colors"
          >
            <div className="p-1.5 rounded-lg bg-purple-100 text-purple-700 group-hover:bg-purple-200 mt-0.5">
              <Wand2 className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-gray-900 flex items-center gap-1.5">
                Falcon AI Product
                <span className="px-1.5 py-0.2 text-[9px] bg-purple-100 text-purple-700 rounded-full font-bold">
                  Recommended
                </span>
              </div>
              <p className="text-[11px] text-gray-500 font-normal leading-tight mt-0.5">
                Photo to product in 30s. AI extracts barcode, descriptions, MRP & enhances images.
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              onOpenManualCreation();
            }}
            className="w-full px-3 py-2.5 text-left text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-start gap-2.5 group transition-colors border-t border-gray-50"
          >
            <div className="p-1.5 rounded-lg bg-gray-100 text-gray-600 group-hover:bg-gray-200 mt-0.5">
              <FileEdit className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-gray-800">Manual Product Entry</div>
              <p className="text-[11px] text-gray-500 font-normal leading-tight mt-0.5">
                Fill all product specifications, barcode, and cost manually.
              </p>
            </div>
          </button>
        </div>
      )}
    </div>
  );
};
