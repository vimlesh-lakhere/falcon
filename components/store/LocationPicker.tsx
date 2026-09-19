"use client";

import React, { useState, useEffect } from "react";
import {
  MapPin,
  Navigation,
  Crosshair,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Compass,
} from "lucide-react";

interface LocationPickerProps {
  latitude?: number;
  longitude?: number;
  value?: { latitude?: number; longitude?: number; mapAddress?: string };
  onChange: (coords: { latitude: number; longitude: number; mapAddress?: string }) => void;
}

export const LocationPicker: React.FC<LocationPickerProps> = ({
  latitude,
  longitude,
  value,
  onChange,
}) => {
  const initialLat = latitude ?? value?.latitude;
  const initialLng = longitude ?? value?.longitude;
  const [lat, setLat] = useState<number | undefined>(initialLat);
  const [lng, setLng] = useState<number | undefined>(initialLng);
  const [isLocating, setIsLocating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [locationSuccess, setLocationSuccess] = useState(false);

  useEffect(() => {
    const effectiveLat = latitude ?? value?.latitude;
    const effectiveLng = longitude ?? value?.longitude;
    if (effectiveLat && effectiveLng) {
      setLat(effectiveLat);
      setLng(effectiveLng);
    }
  }, [latitude, longitude, value?.latitude, value?.longitude]);

  // Handle GPS detection using device browser Geolocation
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setErrorMsg("GPS Geolocation is not supported by your browser.");
      return;
    }

    setIsLocating(true);
    setErrorMsg(null);
    setLocationSuccess(false);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const detectedLat = Number(position.coords.latitude.toFixed(6));
        const detectedLng = Number(position.coords.longitude.toFixed(6));

        setLat(detectedLat);
        setLng(detectedLng);
        setIsLocating(false);
        setLocationSuccess(true);

        onChange({
          latitude: detectedLat,
          longitude: detectedLng,
          mapAddress: `GPS Location (${detectedLat}, ${detectedLng})`,
        });
      },
      (error) => {
        setIsLocating(false);
        let msg = "Could not detect location. Please check location permissions.";
        if (error.code === error.PERMISSION_DENIED) {
          msg = "Location permission denied. Please allow location access in your browser settings.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = "GPS signal unavailable. Please try again or enter address manually.";
        } else if (error.code === error.TIMEOUT) {
          msg = "Location request timed out. Please try again.";
        }
        setErrorMsg(msg);
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      }
    );
  };

  const googleMapsUrl =
    lat && lng
      ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
      : null;

  return (
    <div className="space-y-3 p-3.5 bg-purple-50/60 border border-purple-200/80 rounded-2xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
              <span>Live Google Map Location</span>
              <span className="text-[10px] text-purple-700 bg-purple-100 px-1.5 py-0.2 rounded font-semibold">
                For Delivery Boy
              </span>
            </h4>
            <p className="text-[11px] text-gray-500">
              Pinpoint your exact delivery location so our rider reaches your doorstep
            </p>
          </div>
        </div>
      </div>

      {/* GPS Button */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <button
          type="button"
          onClick={handleDetectLocation}
          disabled={isLocating}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer"
        >
          {isLocating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Detecting GPS Location...</span>
            </>
          ) : (
            <>
              <Crosshair className="w-4 h-4" />
              <span>📍 Detect My Current Location</span>
            </>
          )}
        </button>

        {googleMapsUrl && (
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-xl text-xs font-semibold shadow-2xs transition-colors"
          >
            <span>Test Map</span>
            <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
          </a>
        )}
      </div>

      {/* Status Notifications */}
      {errorMsg && (
        <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-700">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {locationSuccess && lat && lng && (
        <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">
              Exact GPS Coordinates Captured!
            </span>
          </div>
          <span className="font-mono text-[11px] bg-white border border-emerald-200 px-2 py-0.5 rounded-lg text-emerald-700">
            {lat}, {lng}
          </span>
        </div>
      )}

      {/* Embedded Google Map Preview */}
      {lat && lng ? (
        <div className="relative rounded-xl overflow-hidden border border-purple-200 shadow-inner bg-gray-100 h-44">
          <iframe
            title="Google Map Delivery Pin"
            width="100%"
            height="100%"
            style={{ border: 0 }}
            loading="lazy"
            allowFullScreen
            src={`https://maps.google.com/maps?q=${lat},${lng}&z=16&output=embed`}
          />
          <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-xs px-2 py-1 rounded-lg border border-gray-200 text-[10px] font-bold text-gray-700 flex items-center gap-1 shadow-xs">
            <MapPin className="w-3 h-3 text-red-600" />
            <span>Delivery Pin: {lat}, {lng}</span>
          </div>
        </div>
      ) : (
        <div className="py-4 text-center border border-dashed border-gray-300 rounded-xl bg-white/50 text-xs text-gray-500">
          <MapPin className="w-5 h-5 text-gray-400 mx-auto mb-1 opacity-60" />
          <span>Tap <strong>Detect My Current Location</strong> to pin your exact house</span>
        </div>
      )}
    </div>
  );
};
