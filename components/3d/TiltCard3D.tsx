"use client";

import React, { useRef, useState, useCallback } from "react";

interface TiltCard3DProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  maxTilt?: number;
  scale?: number;
  glare?: boolean;
  spotlight?: boolean;
  className?: string;
  depthLayer?: boolean;
}

export function TiltCard3D({
  children,
  maxTilt = 8,
  scale = 1.015,
  glare = true,
  spotlight = true,
  className = "",
  depthLayer = true,
  ...props
}: TiltCard3DProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [transformStyle, setTransformStyle] = useState("");
  const [glarePosition, setGlarePosition] = useState({ x: 50, y: 50, opacity: 0 });
  const [spotlightPos, setSpotlightPos] = useState({ x: 0, y: 0, opacity: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      // Inverted Y with dampened tilt for high-end luxury feel
      const rotateX = ((centerY - y) / centerY) * maxTilt;
      const rotateY = ((x - centerX) / centerX) * maxTilt;

      setTransformStyle(
        `perspective(1200px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(
          2
        )}deg) scale3d(${scale}, ${scale}, ${scale})`
      );

      if (glare) {
        const glareX = (x / rect.width) * 100;
        const glareY = (y / rect.height) * 100;
        setGlarePosition({ x: glareX, y: glareY, opacity: 1 });
      }

      if (spotlight) {
        setSpotlightPos({ x, y, opacity: 1 });
      }
    },
    [maxTilt, scale, glare, spotlight]
  );

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setTransformStyle("perspective(1200px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)");
    if (glare) {
      setGlarePosition((prev) => ({ ...prev, opacity: 0 }));
    }
    if (spotlight) {
      setSpotlightPos((prev) => ({ ...prev, opacity: 0 }));
    }
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative transition-all ease-out will-change-transform ${
        depthLayer ? "preserve-3d" : ""
      } ${className}`}
      style={{
        transform: transformStyle,
        transitionDuration: isHovered ? "120ms" : "600ms",
        transformStyle: "preserve-3d",
      }}
      {...props}
    >
      {/* Enterprise Spotlight Border Glow */}
      {spotlight && (
        <div
          className="pointer-events-none absolute -inset-[1px] rounded-[inherit] transition-opacity duration-300 z-10"
          style={{
            opacity: spotlightPos.opacity,
            background: `radial-gradient(280px circle at ${spotlightPos.x}px ${spotlightPos.y}px, rgba(99, 102, 241, 0.4), rgba(20, 184, 166, 0.25), transparent 70%)`,
          }}
          aria-hidden="true"
        />
      )}

      {/* Surface Glare / Specular Sheen */}
      {glare && (
        <div
          className="pointer-events-none absolute inset-0 z-30 rounded-[inherit] transition-opacity duration-300 overflow-hidden"
          style={{
            opacity: glarePosition.opacity,
            background: `radial-gradient(circle 320px at ${glarePosition.x}% ${glarePosition.y}%, rgba(255, 255, 255, 0.1), transparent 75%)`,
          }}
          aria-hidden="true"
        />
      )}

      {children}
    </div>
  );
}
