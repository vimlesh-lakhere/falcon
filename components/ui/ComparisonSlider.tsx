"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";

interface ComparisonSliderProps {
  beforeSrc: string;
  afterSrc: string;
  beforeLabel?: string;
  afterLabel?: string;
  width?: number | string;
  height?: number | string;
  initialPosition?: number; // 0-100, default 50
  className?: string;
}

/**
 * Before/After image comparison slider with touch-friendly drag handle.
 * Uses CSS clip-path for smooth, GPU-accelerated reveal transitions.
 */
export const ComparisonSlider: React.FC<ComparisonSliderProps> = ({
  beforeSrc,
  afterSrc,
  beforeLabel = "Original",
  afterLabel = "Enhanced",
  width = "100%",
  height = 280,
  initialPosition = 50,
  className = "",
}) => {
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const getPositionFromEvent = useCallback(
    (clientX: number) => {
      const container = containerRef.current;
      if (!container) return position;
      const rect = container.getBoundingClientRect();
      const x = clientX - rect.left;
      const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
      return pct;
    },
    [position]
  );

  const handleStart = useCallback(
    (clientX: number) => {
      setIsDragging(true);
      setPosition(getPositionFromEvent(clientX));
    },
    [getPositionFromEvent]
  );

  const handleMove = useCallback(
    (clientX: number) => {
      if (!isDragging) return;
      setPosition(getPositionFromEvent(clientX));
    },
    [isDragging, getPositionFromEvent]
  );

  const handleEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Mouse events
  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleStart(e.clientX);
  };

  // Touch events
  const onTouchStart = (e: React.TouchEvent) => {
    handleStart(e.touches[0].clientX);
  };

  // Global move/end listeners for smooth dragging outside the container
  useEffect(() => {
    if (!isDragging) return;

    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX);
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) handleMove(e.touches[0].clientX);
    };
    const onEnd = () => handleEnd();

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onEnd);
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onEnd);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onEnd);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onEnd);
    };
  }, [isDragging, handleMove, handleEnd]);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden rounded-xl select-none ${className}`}
      style={{
        width,
        height,
        cursor: isDragging ? "ew-resize" : "default",
        touchAction: "pan-y",
      }}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
    >
      {/* After image (full width, bottom layer) */}
      <img
        src={afterSrc}
        alt={afterLabel}
        className="absolute inset-0 w-full h-full object-contain"
        style={{ background: "#f8f9fa" }}
        draggable={false}
      />

      {/* Before image (clipped by slider position) */}
      <div
        className="absolute inset-0"
        style={{
          clipPath: `inset(0 ${100 - position}% 0 0)`,
        }}
      >
        <img
          src={beforeSrc}
          alt={beforeLabel}
          className="absolute inset-0 w-full h-full object-contain"
          style={{ background: "#f8f9fa" }}
          draggable={false}
        />
      </div>

      {/* Slider divider line */}
      <div
        className="absolute top-0 bottom-0 z-10"
        style={{
          left: `${position}%`,
          transform: "translateX(-50%)",
          width: "3px",
          background: "white",
          boxShadow: "0 0 8px rgba(0,0,0,0.4)",
        }}
      />

      {/* Drag handle circle */}
      <div
        className="absolute z-20 flex items-center justify-center"
        style={{
          left: `${position}%`,
          top: "50%",
          transform: "translate(-50%, -50%)",
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: "white",
          boxShadow: "0 2px 12px rgba(0,0,0,0.3)",
          cursor: "ew-resize",
        }}
      >
        {/* Left/right arrows */}
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M6 4L2 9L6 14" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M12 4L16 9L12 14" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {/* Labels */}
      <div
        className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-md text-xs font-semibold"
        style={{
          background: "rgba(0,0,0,0.55)",
          color: "white",
          backdropFilter: "blur(4px)",
        }}
      >
        {beforeLabel}
      </div>
      <div
        className="absolute top-2 right-2 z-10 px-2 py-0.5 rounded-md text-xs font-semibold"
        style={{
          background: "rgba(124,58,237,0.75)",
          color: "white",
          backdropFilter: "blur(4px)",
        }}
      >
        {afterLabel}
      </div>
    </div>
  );
};
