"use client";

import React, { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { Camera, X, RefreshCw, AlertCircle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";

interface CameraBarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
}

export function CameraBarcodeScanner({ isOpen, onClose, onScan }: CameraBarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [videoInputDevices, setVideoInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isScanning, setIsScanning] = useState(false);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);

  useEffect(() => {
    if (!isOpen) {
      if (readerRef.current) {
        readerRef.current = null;
      }
      setIsScanning(false);
      return;
    }

    const codeReader = new BrowserMultiFormatReader();
    readerRef.current = codeReader;

    // List cameras
    BrowserMultiFormatReader.listVideoInputDevices()
      .then((videoDevices) => {
        setVideoInputDevices(videoDevices);
        if (videoDevices.length > 0) {
          // Prefer back camera ("environment") on phones
          const backCam = videoDevices.find((device) =>
            device.label.toLowerCase().includes("back") || device.label.toLowerCase().includes("rear") || device.label.toLowerCase().includes("environment")
          );
          setSelectedDeviceId(backCam ? backCam.deviceId : videoDevices[0].deviceId);
        }
      })
      .catch((err) => {
        console.error("Camera access error:", err);
        setErrorMessage("Please grant camera permissions to scan barcodes.");
      });

    return () => {
      readerRef.current = null;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !selectedDeviceId || !videoRef.current || !readerRef.current) {
      return;
    }

    setErrorMessage("");
    setIsScanning(true);

    const controlsPromise = readerRef.current.decodeFromVideoDevice(
      selectedDeviceId,
      videoRef.current,
      (result, error) => {
        if (result) {
          const barcodeText = result.getText().trim();
          if (barcodeText) {
            // Beep audio feedback
            try {
              const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
              const osc = ctx.createOscillator();
              osc.type = "sine";
              osc.frequency.setValueAtTime(880, ctx.currentTime); // 880Hz beep
              osc.connect(ctx.destination);
              osc.start();
              osc.stop(ctx.currentTime + 0.1);
            } catch {}

            onScan(barcodeText);
            onClose();
          }
        }
      }
    );

    return () => {
      controlsPromise.then((controls) => controls.stop()).catch(() => {});
    };
  }, [isOpen, selectedDeviceId, onScan, onClose]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="📸 Live Camera Barcode Scanner" maxWidth="md">
      <div className="space-y-4">
        {errorMessage ? (
          <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        ) : (
          <div className="relative rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center border-2 border-purple-500 shadow-inner">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              muted
              playsInline
              autoPlay
            />

            {/* Targeting overlay frame */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-64 h-36 border-2 border-emerald-400 rounded-xl relative shadow-[0_0_15px_rgba(52,211,153,0.6)]">
                <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-emerald-400 -mt-1 -ml-1" />
                <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-emerald-400 -mt-1 -mr-1" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-emerald-400 -mb-1 -ml-1" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-emerald-400 -mb-1 -mr-1" />
                <div className="absolute inset-x-0 top-1/2 h-0.5 bg-red-500 animate-pulse opacity-80" />
              </div>
            </div>

            {/* Scanning indicator */}
            <div className="absolute bottom-3 bg-black/70 backdrop-blur-md px-3 py-1 rounded-full text-white text-[10px] font-bold flex items-center gap-1.5 border border-white/20">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Align Barcode inside frame</span>
            </div>
          </div>
        )}

        {/* Camera Switcher */}
        {videoInputDevices.length > 1 && (
          <div className="flex items-center justify-between gap-2 pt-2">
            <span className="text-xs font-semibold text-gray-500">Camera Source:</span>
            <select
              value={selectedDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
              className="text-xs bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5 font-medium focus:outline-none focus:border-purple-500"
            >
              {videoInputDevices.map((device, idx) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Camera ${idx + 1}`}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
}
