"use client";

import React, { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import {
  Camera,
  X,
  AlertCircle,
  RefreshCw,
  Zap,
  CheckCircle2,
  ShoppingCart,
  Plus,
  ArrowRight,
  Volume2,
  Sparkles,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { formatCurrency } from "@/lib/utils";

export interface ScanFeedback {
  type: "success" | "error" | "info";
  title: string;
  subtitle?: string;
  barcode: string;
  timestamp: number;
}

interface CameraBarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  isContinuous?: boolean;
  cartCount?: number;
  cartTotal?: number;
  lastScannedFeedback?: ScanFeedback | null;
  onQuickAddUnknown?: (barcode: string) => void;
}

export function CameraBarcodeScanner({
  isOpen,
  onClose,
  onScan,
  isContinuous = true,
  cartCount = 0,
  cartTotal = 0,
  lastScannedFeedback = null,
  onQuickAddUnknown,
}: CameraBarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [justScannedFlash, setJustScannedFlash] = useState(false);
  const [continuousMode, setContinuousMode] = useState(isContinuous);
  const [scanCountSession, setScanCountSession] = useState(0);

  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const isScanningRef = useRef<boolean>(false);
  const lastScannedCodeRef = useRef<string>("");
  const lastScannedTimeRef = useRef<number>(0);

  // Synthesized Web Audio API Beep (Zero network latency, 100% offline)
  const playSuccessBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(1350, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1800, ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.09);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.09);
    } catch {
      // Audio not permitted or supported
    }
  };

  const playErrorBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(280, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch {}
  };

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setScanCountSession(0);
      lastScannedCodeRef.current = "";
      return;
    }

    setContinuousMode(isContinuous);
    let isMounted = true;

    async function startCamera() {
      setErrorMessage("");
      stopCamera();

      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("Camera is not supported on this browser or connection is insecure (HTTPS required).");
        }

        const constraints: MediaStreamConstraints = {
          audio: false,
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (!isMounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;

        // Check torch capability
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

        // Start scanning loop
        isScanningRef.current = true;
        initScannerLoop();
      } catch (err: any) {
        console.error("Camera startup error:", err);
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          setErrorMessage("Camera permission denied. Please allow camera access in your browser settings.");
        } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
          setErrorMessage("No camera found on this device.");
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
  }, [isOpen, facingMode, isContinuous]);

  const stopCamera = () => {
    isScanningRef.current = false;
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
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

  const handleBarcodeFound = (barcode: string) => {
    if (!isScanningRef.current) return;

    const now = Date.now();
    // Continuous Hold-to-Increment Interval: 650ms for exact same barcode, 0ms for different barcode
    const isSameCode = lastScannedCodeRef.current === barcode;
    const timeSinceLastScan = now - lastScannedTimeRef.current;

    if (isSameCode && timeSinceLastScan < 650) {
      return;
    }

    lastScannedCodeRef.current = barcode;
    lastScannedTimeRef.current = now;

    // Visual HUD flash & audio beep feedback
    setJustScannedFlash(true);
    setTimeout(() => setJustScannedFlash(false), 350);

    playSuccessBeep();
    setScanCountSession((prev) => prev + 1);

    onScan(barcode);

    // If single scan mode (e.g. in add product modal), close scanner
    if (!continuousMode) {
      isScanningRef.current = false;
      stopCamera();
      onClose();
    }
  };

  const initScannerLoop = () => {
    // 1. High performance BarcodeDetector API if available in Chromium / Android
    if ("BarcodeDetector" in window) {
      try {
        const detector = new (window as any).BarcodeDetector({
          formats: [
            "ean_13",
            "ean_8",
            "upc_a",
            "upc_e",
            "code_128",
            "code_39",
            "code_93",
            "qr_code",
            "data_matrix",
            "itf",
          ],
        });

        const scanWithDetector = async () => {
          if (!isScanningRef.current || !videoRef.current) return;

          if (videoRef.current.readyState >= 2) {
            try {
              const barcodes = await detector.detect(videoRef.current);
              if (barcodes.length > 0 && barcodes[0].rawValue) {
                const code = barcodes[0].rawValue.trim();
                if (code) {
                  handleBarcodeFound(code);
                }
              }
            } catch {
              // Frame detection non-fatal catch
            }
          }

          if (isScanningRef.current) {
            animationFrameRef.current = requestAnimationFrame(scanWithDetector);
          }
        };

        animationFrameRef.current = requestAnimationFrame(scanWithDetector);
        return;
      } catch {
        // Fallback to ZXing
      }
    }

    // 2. ZXing Browser MultiFormat fallback
    if (!codeReaderRef.current) {
      codeReaderRef.current = new BrowserMultiFormatReader();
    }

    const reader = codeReaderRef.current;
    if (videoRef.current) {
      reader
        .decodeFromVideoElement(videoRef.current, (result) => {
          if (result && isScanningRef.current) {
            const text = result.getText().trim();
            if (text) {
              handleBarcodeFound(text);
            }
          }
        })
        .catch((err) => {
          console.warn("ZXing scanner loop notice:", err);
        });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="⚡ Continuous Rapid Barcode Scanner"
      description="Scan multiple barcodes non-stop • Auto-adds to bill with live sound"
      maxWidth="md"
    >
      <div className="space-y-3">
        {errorMessage ? (
          <div className="p-4 bg-red-50 text-red-700 rounded-2xl border border-red-200 text-xs font-semibold flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-sm">Camera Access Needed</p>
              <p className="text-red-600">{errorMessage}</p>
              <p className="text-[11px] text-gray-500 pt-1">
                Make sure you are on <strong>HTTPS</strong> and tap &quot;Allow&quot; on the browser prompt.
              </p>
            </div>
          </div>
        ) : (
          <div
            className={`relative rounded-2xl overflow-hidden bg-black aspect-4/3 sm:aspect-video flex items-center justify-center border-2 transition-all shadow-2xl ${
              justScannedFlash
                ? "border-emerald-400 ring-4 ring-emerald-400/50 shadow-[0_0_30px_rgba(52,211,153,0.8)]"
                : "border-purple-600 shadow-purple-950/40"
            }`}
          >
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              muted
              playsInline
              autoPlay
            />

            {/* Targeting overlay frame */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
              <div
                className={`w-full max-w-[280px] sm:max-w-[320px] aspect-16/10 border-2 rounded-2xl relative transition-all ${
                  justScannedFlash
                    ? "border-emerald-400 bg-emerald-500/10 shadow-[0_0_30px_rgba(52,211,153,0.9)] scale-105"
                    : "border-purple-400/80 shadow-[0_0_20px_rgba(168,85,247,0.4)]"
                }`}
              >
                {/* Corner markers */}
                <div className="absolute top-0 left-0 w-5 h-5 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg -mt-1 -ml-1" />
                <div className="absolute top-0 right-0 w-5 h-5 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg -mt-1 -mr-1" />
                <div className="absolute bottom-0 left-0 w-5 h-5 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg -mb-1 -ml-1" />
                <div className="absolute bottom-0 right-0 w-5 h-5 border-b-4 border-r-4 border-emerald-400 rounded-br-lg -mb-1 -mr-1" />

                {/* Laser scan line animation */}
                <div className="absolute inset-x-2 top-1/2 h-0.5 bg-gradient-to-r from-red-500 via-amber-400 to-red-500 animate-pulse shadow-[0_0_12px_red]" />
              </div>
            </div>

            {/* Top HUD Controls Overlay */}
            <div className="absolute top-3 inset-x-3 flex items-center justify-between pointer-events-auto">
              <div className="flex items-center gap-1.5">
                <div className="bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-full text-white text-[10px] font-black flex items-center gap-1.5 border border-white/20 shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>NON-STOP SCANNER</span>
                </div>
                {scanCountSession > 0 && (
                  <span className="bg-emerald-600/90 text-white text-[10px] font-black px-2 py-1 rounded-full border border-emerald-400/50 shadow-sm">
                    ✓ {scanCountSession} Scanned
                  </span>
                )}
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
                  title="Switch Camera (Front/Back)"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Dynamic Scanned Notification Toast (Inside Camera HUD) */}
            {lastScannedFeedback && (
              <div className="absolute top-14 inset-x-3 pointer-events-auto animate-in slide-in-from-top-3 duration-200">
                <div
                  className={`p-2.5 rounded-xl border backdrop-blur-md shadow-2xl flex items-center justify-between gap-2 ${
                    lastScannedFeedback.type === "success"
                      ? "bg-emerald-950/90 border-emerald-400/80 text-white"
                      : "bg-rose-950/90 border-rose-400/80 text-white"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {lastScannedFeedback.type === "success" ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="text-xs font-black truncate">
                        {lastScannedFeedback.title}
                      </div>
                      {lastScannedFeedback.subtitle && (
                        <div className="text-[10px] text-emerald-200 font-semibold truncate">
                          {lastScannedFeedback.subtitle}
                        </div>
                      )}
                    </div>
                  </div>

                  {lastScannedFeedback.type === "error" && onQuickAddUnknown && (
                    <button
                      type="button"
                      onClick={() => {
                        onQuickAddUnknown(lastScannedFeedback.barcode);
                      }}
                      className="px-2.5 py-1 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white rounded-lg text-[10px] font-black shrink-0 flex items-center gap-1 shadow-sm cursor-pointer"
                    >
                      <Plus className="w-3 h-3" /> Quick Add
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Bottom Live Cart Summary HUD Bar */}
            {cartCount > 0 && (
              <div className="absolute bottom-3 inset-x-3 pointer-events-auto flex items-center justify-between bg-black/80 backdrop-blur-md p-2 rounded-xl border border-white/20 shadow-xl">
                <div className="flex items-center gap-2 pl-1">
                  <div className="p-1.5 bg-purple-600 rounded-lg text-white">
                    <ShoppingCart className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-white">
                      {cartCount} Items in Bill
                    </div>
                    <div className="text-[11px] font-bold text-emerald-400">
                      Total: {formatCurrency(cartTotal)}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg text-xs font-black flex items-center gap-1 shadow-md cursor-pointer active:scale-95 transition-all"
                >
                  <span>Finish & Pay</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Footer controls & info */}
        <div className="flex items-center justify-between pt-1 border-t border-gray-100">
          <div className="text-[11px] text-gray-500 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            <span>Keep scanning products one after another without closing camera.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Done Scanning
          </button>
        </div>
      </div>
    </Modal>
  );
}
