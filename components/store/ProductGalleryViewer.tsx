"use client";

import React, { useState } from "react";
import { Sparkles, Maximize2, ShieldCheck, Eye } from "lucide-react";

interface ProductGalleryViewerProps {
  heroUrl?: string | null;
  backImageUrl?: string | null;
  galleryUrls?: string[] | null;
  productName: string;
}

export const ProductGalleryViewer: React.FC<ProductGalleryViewerProps> = ({
  heroUrl,
  backImageUrl,
  galleryUrls = [],
  productName,
}) => {
  // Combine all available images into gallery (including composite ||| URLs)
  const fallback = "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&auto=format&fit=crop&q=80";
  
  const rawList: string[] = [];
  if (heroUrl) {
    heroUrl.split("|||").forEach((u) => {
      if (u.trim()) rawList.push(u.trim());
    });
  }
  if (backImageUrl && backImageUrl.trim()) {
    rawList.push(backImageUrl.trim());
  }
  if (galleryUrls) {
    galleryUrls.forEach((u) => {
      if (u) {
        u.split("|||").forEach((sub) => {
          if (sub.trim()) rawList.push(sub.trim());
        });
      }
    });
  }

  const allImages = Array.from(new Set(rawList.filter(Boolean)));
  const initialList = allImages.length > 0 ? allImages : [fallback];
  const [selectedImage, setSelectedImage] = useState<string>(initialList[0]);
  const [isZoomModalOpen, setIsZoomModalOpen] = useState(false);

  // Sync selected image if initialList changes
  React.useEffect(() => {
    if (initialList.length > 0 && !initialList.includes(selectedImage)) {
      setSelectedImage(initialList[0]);
    }
  }, [initialList, selectedImage]);

  const activeIndex = initialList.indexOf(selectedImage);

  return (
    <div className="space-y-3">
      {/* Main Image Showcase */}
      <div className="relative bg-white rounded-3xl border border-gray-200/80 p-4 sm:p-6 aspect-square flex items-center justify-center overflow-hidden group shadow-xs">
        {/* View Badge */}
        <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-900/90 backdrop-blur-md text-white text-[11px] font-bold shadow-md">
          <Sparkles className="w-3.5 h-3.5 text-pink-400" />
          <span>
            {activeIndex === 0
              ? "Front View (Amazon Packshot)"
              : activeIndex === 1
              ? "Back View (Label & MRP)"
              : `Studio Angle ${activeIndex + 1}`}
          </span>
        </div>

        {/* Zoom Button */}
        <button
          type="button"
          onClick={() => setIsZoomModalOpen(true)}
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-gray-700 shadow-md flex items-center justify-center transition-all hover:scale-110"
          title="Zoom Image"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={selectedImage}
          alt={productName}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
        />
      </div>

      {/* Gallery Thumbnails (Front, Back & Extra angles) */}
      {initialList.length > 1 && (
        <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-none">
          {initialList.map((img, idx) => {
            const isSelected = selectedImage === img;
            let label = `View ${idx + 1}`;
            if (idx === 0) label = "📷 Front View";
            else if (idx === 1) label = "🔍 Back & MRP";
            else if (idx === 2) label = "🌿 Lifestyle";
            else if (idx === 3) label = "🏷️ Promo";

            return (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedImage(img)}
                className={`relative shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-2 p-1 bg-white overflow-hidden transition-all flex flex-col items-center justify-between ${
                  isSelected
                    ? "border-purple-600 ring-2 ring-purple-500/20 scale-105"
                    : "border-gray-200 hover:border-gray-300 opacity-70 hover:opacity-100"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img} alt={`${productName} thumbnail ${idx}`} loading="lazy" decoding="async" className="w-full h-14 object-contain" />
                <span className="w-full bg-slate-900/80 text-white text-[9px] font-bold text-center py-0.5 rounded-b-xl truncate px-1">
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Fullscreen Zoom Modal */}
      {isZoomModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setIsZoomModalOpen(false)}
        >
          <div className="relative max-w-4xl w-full aspect-square bg-white rounded-3xl p-6 overflow-hidden flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={selectedImage} alt={productName} className="max-w-full max-h-full object-contain" />
            <button
              type="button"
              onClick={() => setIsZoomModalOpen(false)}
              className="absolute top-4 right-4 px-4 py-2 bg-gray-900 text-white rounded-full text-xs font-bold"
            >
              Close ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
