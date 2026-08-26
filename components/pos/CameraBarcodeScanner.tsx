"use client";

import React, { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { Camera, X, AlertCircle, RefreshCw, Zap, Flashlight } from "lucide-react";
import { Modal } from "@/components/ui/Modal";

interface CameraBarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
}

export function CameraBarcodeScanner({ isOpen, onClose, onScan }: CameraBarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const isScanningRef = useRef<boolean>(false);

  // Play audio beep feedback on scan
  const playBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(950, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch {
      // Audio not permitted or supported
    }
  };

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

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
  }, [isOpen, facingMode]);

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
    isScanningRef.current = false;
    playBeep();
    stopCamera();
    onScan(barcode);
    onClose();
  };

  const initScannerLoop = () => {
    // 1. Try native high-performance BarcodeDetector if available in browser
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
                  return;
                }
              }
            } catch {
              // Non-blocking frame detection error
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
    <Modal isOpen={isOpen} onClose={onClose} title="📸 Live Barcode & QR Scanner" maxWidth="md">
      <div className="space-y-4">
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
          <div className="relative rounded-2xl overflow-hidden bg-black aspect-4/3 sm:aspect-video flex items-center justify-center border-2 border-brand-500 shadow-2xl">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              muted
              playsInline
              autoPlay
            />

            {/* Targeting overlay frame */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
              <div className="w-full max-w-[280px] sm:max-w-[320px] aspect-16/10 border-2 border-emerald-400/80 rounded-2xl relative shadow-[0_0_25px_rgba(52,211,153,0.5)]">
                {/* Corner markers */}
                <div className="absolute top-0 left-0 w-5 h-5 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg -mt-1 -ml-1" />
                <div className="absolute top-0 right-0 w-5 h-5 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg -mt-1 -mr-1" />
                <div className="absolute bottom-0 left-0 w-5 h-5 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg -mb-1 -ml-1" />
                <div className="absolute bottom-0 right-0 w-5 h-5 border-b-4 border-r-4 border-emerald-400 rounded-br-lg -mb-1 -mr-1" />

                {/* Laser scan line animation */}
                <div className="absolute inset-x-2 top-1/2 h-0.5 bg-gradient-to-r from-red-500 via-amber-400 to-red-500 animate-pulse shadow-[0_0_10px_red]" />
              </div>
            </div>

            {/* Top Toolbar overlay */}
            <div className="absolute top-3 inset-x-3 flex items-center justify-between pointer-events-auto">
              <div className="bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-white text-[10px] font-bold flex items-center gap-1.5 border border-white/20">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>Ready to Scan</span>
              </div>

              <div className="flex items-center gap-2">
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

            {/* Scanning Guide banner */}
            <div className="absolute bottom-3 bg-black/70 backdrop-blur-md px-3.5 py-1.5 rounded-full text-white text-xs font-medium border border-white/20 text-center">
              Position barcode or QR inside frame
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <p className="text-[11px] text-gray-500">
            Works with standard 1D barcodes (EAN, UPC, Code128) & 2D QR codes.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
