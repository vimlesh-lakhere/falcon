"use client";

import React, { useState, useCallback } from "react";
import {
  Sparkles,
  RotateCcw,
  Check,
  Image as ImageIcon,
  AlertTriangle,
  Loader2,
  Palette,
} from "lucide-react";
import { ComparisonSlider } from "@/components/ui/ComparisonSlider";
import type { EnhanceBackgroundPreset, EnhanceForUploadResult } from "@/lib/ai/image-enhancer";

export type EnhanceStatus = "idle" | "enhancing" | "done" | "failed";

interface ImageEnhancePreviewProps {
  /** The original raw image data URL (before enhancement) */
  originalUrl: string;
  /** Enhancement result from aiImageEnhancer.enhanceForUpload() */
  enhanceResult: EnhanceForUploadResult | null;
  /** Current processing status */
  status: EnhanceStatus;
  /** Callback when user accepts the enhanced image */
  onAccept: (enhancedUrl: string) => void;
  /** Callback when user wants to keep the original */
  onKeepOriginal: () => void;
  /** Callback when user wants to re-run with a different background */
  onRerun: (preset: EnhanceBackgroundPreset) => void;
  /** Optional custom class */
  className?: string;
}

const BG_PRESETS: { value: EnhanceBackgroundPreset; label: string; color: string }[] = [
  { value: "transparent", label: "Transparent", color: "bg-gray-100 bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20width%3D%2216%22%20height%3D%2216%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Crect%20width%3D%228%22%20height%3D%228%22%20fill%3D%22%23ddd%22/%3E%3Crect%20x%3D%228%22%20y%3D%228%22%20width%3D%228%22%20height%3D%228%22%20fill%3D%22%23ddd%22/%3E%3C/svg%3E')]" },
  { value: "white", label: "Pure White", color: "bg-white border border-gray-300" },
  { value: "light_grey", label: "Light Grey", color: "bg-gray-200" },
  { value: "soft_gradient", label: "Gradient", color: "bg-gradient-to-b from-white to-gray-200" },
];

/**
 * AI Image Enhancement preview panel with before/after slider, background presets,
 * and accept/rerun/keep-original controls. Designed to sit inline within the
 * product upload form.
 */
export const ImageEnhancePreview: React.FC<ImageEnhancePreviewProps> = ({
  originalUrl,
  enhanceResult,
  status,
  onAccept,
  onKeepOriginal,
  onRerun,
  className = "",
}) => {
  const [selectedPreset, setSelectedPreset] = useState<EnhanceBackgroundPreset>(
    enhanceResult?.backgroundPreset || "white"
  );
  const [showPresets, setShowPresets] = useState(false);

  const handlePresetChange = useCallback(
    (preset: EnhanceBackgroundPreset) => {
      setSelectedPreset(preset);
      setShowPresets(false);
      onRerun(preset);
    },
    [onRerun]
  );

  // ── Enhancing state ────────────────────────────────────────────────────
  if (status === "enhancing") {
    return (
      <div className={`rounded-xl border border-purple-200 bg-purple-50/60 p-4 ${className}`}>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Loader2 className="w-6 h-6 text-purple-600 animate-spin" />
            <Sparkles className="w-3 h-3 text-purple-400 absolute -top-0.5 -right-0.5 animate-pulse" />
          </div>
          <div>
            <p className="text-sm font-semibold text-purple-800">Enhancing image...</p>
            <p className="text-xs text-purple-600 mt-0.5">
              Removing background, cleaning dust, correcting light &amp; centering
            </p>
          </div>
        </div>
        {/* Progress shimmer bar */}
        <div className="mt-3 h-1.5 rounded-full bg-purple-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-purple-400 via-purple-600 to-purple-400 animate-pulse"
            style={{
              width: "60%",
              animation: "shimmer 2s ease-in-out infinite",
            }}
          />
        </div>
        <style jsx>{`
          @keyframes shimmer {
            0%, 100% { width: 30%; margin-left: 0; }
            50% { width: 70%; margin-left: 15%; }
          }
        `}</style>
      </div>
    );
  }

  // ── Failed state ───────────────────────────────────────────────────────
  if (status === "failed") {
    const warnings = enhanceResult?.warnings || ["Enhancement failed"];
    return (
      <div className={`rounded-xl border border-amber-200 bg-amber-50/60 p-3 ${className}`}>
        <div className="flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-amber-800">
              Enhancement notice — using original image
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              {warnings[0]}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onRerun(selectedPreset)}
            className="flex-shrink-0 px-2.5 py-1 text-xs font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-md transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ── Done state: show before/after slider with controls ─────────────────
  if (status === "done" && enhanceResult?.success && enhanceResult.enhancedUrl) {
    const meta = enhanceResult.metadata;
    return (
      <div className={`rounded-xl border border-purple-200 bg-gradient-to-b from-purple-50/40 to-white overflow-hidden ${className}`}>
        {/* Before/After Slider */}
        <ComparisonSlider
          beforeSrc={originalUrl}
          afterSrc={enhanceResult.enhancedUrl}
          beforeLabel="Original"
          afterLabel="AI Enhanced"
          height={240}
        />

        {/* Metadata bar */}
        {meta && (
          <div className="px-3 py-1.5 bg-gray-50/80 border-t border-gray-100 flex items-center gap-3 text-[10px] text-gray-500 overflow-x-auto">
            <span>{meta.stepsCompleted.length}/6 steps</span>
            <span>•</span>
            <span>{(meta.processingTimeMs / 1000).toFixed(1)}s</span>
            <span>•</span>
            <span>WebP {(meta.webpSizeBytes / 1024).toFixed(0)}KB</span>
            {meta.bgRemovalProvider && (
              <>
                <span>•</span>
                <span className="truncate max-w-[120px]">{meta.bgRemovalProvider}</span>
              </>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="px-3 py-2.5 flex items-center gap-2 flex-wrap">
          {/* Accept */}
          <button
            type="button"
            onClick={() => onAccept(enhanceResult.enhancedUrl)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors shadow-sm"
          >
            <Check className="w-3.5 h-3.5" />
            Accept
          </button>

          {/* Re-run */}
          <button
            type="button"
            onClick={() => onRerun(selectedPreset)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-100 hover:bg-purple-200 rounded-lg transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Re-run
          </button>

          {/* Background Presets Toggle */}
          <button
            type="button"
            onClick={() => setShowPresets(!showPresets)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <Palette className="w-3.5 h-3.5" />
            Background
          </button>

          {/* Keep Original */}
          <button
            type="button"
            onClick={onKeepOriginal}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors ml-auto"
          >
            <ImageIcon className="w-3.5 h-3.5" />
            Keep Original
          </button>
        </div>

        {/* Background preset selector (expandable) */}
        {showPresets && (
          <div className="px-3 pb-3 flex items-center gap-2">
            {BG_PRESETS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                onClick={() => handlePresetChange(preset.value)}
                className={`flex flex-col items-center gap-1 p-1.5 rounded-lg border-2 transition-all ${
                  selectedPreset === preset.value
                    ? "border-purple-500 ring-1 ring-purple-300"
                    : "border-transparent hover:border-gray-300"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-md ${preset.color}`}
                  style={{ backgroundSize: "16px 16px" }}
                />
                <span className="text-[9px] text-gray-600 font-medium leading-tight">
                  {preset.label}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Warnings */}
        {enhanceResult.warnings.length > 0 && (
          <div className="px-3 pb-2">
            {enhanceResult.warnings.map((w, i) => (
              <p key={i} className="text-[10px] text-amber-600 flex items-start gap-1">
                <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                {w}
              </p>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Idle state: nothing to show ────────────────────────────────────────
  return null;
};
