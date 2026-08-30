"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Camera,
  X,
  RefreshCw,
  Zap,
  Check,
  RotateCcw,
  Sparkles,
  AlertCircle,
  FlipHorizontal,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

interface ProductPhotoCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (dataUrl: string) => void;
  targetAngle?: "front" | "back";
}

export function ProductPhotoCameraModal({
  isOpen,
  onClose,
  onCapture,
  targetAngle = "front",
}: ProductPhotoCameraModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [errorMessage, setErrorMessage] = useState("");
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isShutterFlashing, setIsShutterFlashing] = useState(false);

  // Play synthetic camera shutter sound
  const playShutterSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.09);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.09);
    } catch {}
  };

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setCapturedPhoto(null);
      return;
    }

    setCapturedPhoto(null);
    let isMounted = true;

    async function startCamera() {
      setErrorMessage("");
      stopCamera();

      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("Camera is not supported on this device/browser.");
        }

        const constraints: MediaStreamConstraints = {
          audio: false,
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (!isMounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;

        // Check torch support
        const track = stream.getVideoTracks()[0];
        if (track) {
          const capabilities = (track.getCapabilities ? track.getCapabilities() : {}) as any;
          if (capabilities.torch) {
            setHasTorch(true);
          }
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      } catch (err: any) {
        console.error("Camera startup error:", err);
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          setErrorMessage("Camera permission denied. Please allow camera access in browser settings.");
        } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
          setErrorMessage("No camera device found on this system.");
        } else {
          setErrorMessage(err.message || "Failed to access camera.");
        }
      }
    }

    startCamera();

    return () => {
      isMounted = false;
      stopCamera();
    };
  }, [isOpen, facingMode]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsTorchOn(false);
  };

  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track) {
      try {
        const nextState = !isTorchOn;
        await (track as any).applyConstraints({
          advanced: [{ torch: nextState }],
        });
        setIsTorchOn(nextState);
      } catch (e) {
        console.warn("Could not toggle flashlight:", e);
      }
    }
  };

  const flipCamera = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  const handleTakeSnapshot = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement("canvas");
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, width, height);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    playShutterSound();

    // Trigger visual flash
    setIsShutterFlashing(true);
    setTimeout(() => setIsShutterFlashing(false), 200);

    setCapturedPhoto(dataUrl);
  };

  const handleConfirmPhoto = () => {
    if (capturedPhoto) {
      onCapture(capturedPhoto);
      onClose();
    }
  };

  const handleRetake = () => {
    setCapturedPhoto(null);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        targetAngle === "front"
          ? "📷 Take Front Product Packshot Photo"
          : "🔍 Take Rear / MRP Label Photo"
      }
      description="Click live photo of the product bottle or packaging box using device camera"
      maxWidth="md"
    >
      <div className="space-y-3.5">
        {errorMessage ? (
          <div className="p-4 bg-rose-50 text-rose-800 rounded-2xl border border-rose-200 text-xs font-semibold flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-sm text-rose-900">Camera Access Issue</p>
              <p>{errorMessage}</p>
              <p className="text-[11px] text-gray-500 pt-1">
                You can also use the native <strong>&quot;Upload from Gallery / Files&quot;</strong> button.
              </p>
            </div>
          </div>
        ) : capturedPhoto ? (
          /* Preview captured snapshot */
          <div className="space-y-3">
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-4/3 flex items-center justify-center border-2 border-purple-600 shadow-xl">
              <img
                src={capturedPhoto}
                alt="Captured Snapshot"
                className="w-full h-full object-contain"
              />
              <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-xs text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-300" />
                <span>Photo Captured!</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={handleRetake}
                className="flex-1 rounded-xl text-xs font-bold gap-1.5 border-gray-300 hover:bg-gray-100"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Retake Photo</span>
              </Button>
              <Button
                type="button"
                onClick={handleConfirmPhoto}
                className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold gap-1.5 shadow-md active:scale-95"
              >
                <Check className="w-4 h-4" />
                <span>Use This Photo</span>
              </Button>
            </div>
          </div>
        ) : (
          /* Live Camera Viewfinder */
          <div className="space-y-3">
            <div
              className={`relative rounded-2xl overflow-hidden bg-black aspect-4/3 sm:aspect-video flex items-center justify-center border-2 border-purple-600 shadow-2xl transition-all ${
                isShutterFlashing ? "brightness-200" : ""
              }`}
            >
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                muted
                playsInline
                autoPlay
              />

              {/* Product framing alignment overlay */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
                <div className="w-full max-w-[260px] aspect-3/4 border-2 border-dashed border-white/60 rounded-2xl relative shadow-[0_0_20px_rgba(0,0,0,0.5)]">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-xs text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
                    {targetAngle === "front" ? "Position Product Here" : "Position Barcode / MRP"}
                  </div>
                  {/* Crosshair guide */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-4 h-4 border border-white/40 rounded-full" />
                  </div>
                </div>
              </div>

              {/* Top Controls Overlay */}
              <div className="absolute top-3 inset-x-3 flex items-center justify-between pointer-events-auto">
                <div className="bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-full text-white text-[10px] font-black flex items-center gap-1.5 border border-white/20">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span>LIVE CAMERA</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {hasTorch && (
                    <button
                      type="button"
                      onClick={toggleTorch}
                      className={`p-2 rounded-full backdrop-blur-md border transition-all cursor-pointer ${
                        isTorchOn
                          ? "bg-amber-400 text-black border-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.8)]"
                          : "bg-black/60 text-white border-white/20 hover:bg-black/80"
                      }`}
                      title="Toggle Flashlight"
                    >
                      <Zap className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={flipCamera}
                    className="p-2 bg-black/60 hover:bg-black/80 text-white rounded-full backdrop-blur-md border border-white/20 transition-all cursor-pointer"
                    title="Flip Camera (Front/Rear)"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Shutter Click Button Bar */}
            <div className="flex items-center justify-center pt-2">
              <button
                type="button"
                onClick={handleTakeSnapshot}
                className="w-16 h-16 rounded-full bg-white border-4 border-purple-600 shadow-xl flex items-center justify-center text-purple-700 hover:scale-105 active:scale-95 transition-all cursor-pointer ring-4 ring-purple-200"
                title="Take Photo"
              >
                <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-inner">
                  <Camera className="w-6 h-6" />
                </div>
              </button>
            </div>
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </div>
    </Modal>
  );
}
