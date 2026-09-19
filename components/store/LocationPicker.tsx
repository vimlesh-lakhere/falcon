"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  MapPin,
  Navigation,
  Crosshair,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Compass,
  Search,
  X,
  Info,
} from "lucide-react";

interface LocationPickerProps {
  latitude?: number;
  longitude?: number;
  value?: { latitude?: number; longitude?: number; mapAddress?: string };
  onChange: (coords: { latitude: number; longitude: number; mapAddress?: string }) => void;
}

interface PlaceResult {
  placeId: number;
  name: string;
  displayName: string;
  lat: number;
  lng: number;
  type?: string;
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
  const [areaName, setAreaName] = useState<string>(value?.mapAddress || "");

  const [isLocating, setIsLocating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [locationSuccess, setLocationSuccess] = useState(false);

  // Search Place State
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<PlaceResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const effectiveLat = latitude ?? value?.latitude;
    const effectiveLng = longitude ?? value?.longitude;
    if (effectiveLat && effectiveLng) {
      setLat(effectiveLat);
      setLng(effectiveLng);
    }
  }, [latitude, longitude, value?.latitude, value?.longitude]);

  // Reverse geocode when lat & lng are set or changed
  useEffect(() => {
    if (!lat || !lng) return;

    let isMounted = true;
    const fetchAreaName = async () => {
      try {
        const res = await fetch(`/api/location/search?lat=${lat}&lng=${lng}`);
        const data = await res.json();
        if (isMounted && data.success && data.displayName) {
          // Shorten display name for cleaner UI
          const parts = data.displayName.split(",");
          const shortName = parts.slice(0, 3).join(", ");
          setAreaName(shortName);
        }
      } catch {
        // Non-blocking
      }
    };

    fetchAreaName();
    return () => {
      isMounted = false;
    };
  }, [lat, lng]);

  // Search input handler with debounce
  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (text.trim().length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/location/search?q=${encodeURIComponent(text.trim())}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.results)) {
          setSearchResults(data.results);
          setShowDropdown(data.results.length > 0);
        } else {
          setSearchResults([]);
        }
      } catch (err) {
        console.warn("Search location failed:", err);
      } finally {
        setIsSearching(false);
      }
    }, 400);
  };

  // Select place from search suggestions
  const handleSelectPlace = (place: PlaceResult) => {
    const selectedLat = Number(place.lat.toFixed(6));
    const selectedLng = Number(place.lng.toFixed(6));
    const cleanName = place.displayName.split(",").slice(0, 3).join(", ");

    setLat(selectedLat);
    setLng(selectedLng);
    setAreaName(cleanName);
    setSearchQuery("");
    setShowDropdown(false);
    setLocationSuccess(true);
    setErrorMsg(null);

    onChange({
      latitude: selectedLat,
      longitude: selectedLng,
      mapAddress: cleanName,
    });
  };

  // Quick select helper
  const handleQuickSelect = (cityName: string) => {
    setSearchQuery(cityName);
    handleSearchChange(cityName);
  };

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
          msg = "GPS signal unavailable. Please try again or search your area manually.";
        } else if (error.code === error.TIMEOUT) {
          msg = "Location request timed out. Please try again or search your area.";
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

  const isBhopalDetected = areaName?.toLowerCase().includes("bhopal");

  return (
    <div className="space-y-3 p-3.5 sm:p-4 bg-purple-50/60 border border-purple-200/80 rounded-2xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
              <span>Live Google Map Location</span>
              <span className="text-[10px] text-purple-700 bg-purple-100 px-1.5 py-0.2 rounded font-semibold">
                Delivery Boy Navigation
              </span>
            </h4>
            <p className="text-[11px] text-gray-500">
              Apna gaon / shahar search karein ya direct mobile GPS se pin set karein
            </p>
          </div>
        </div>
      </div>

      {/* 🔍 Search Input for Village / Colony / City */}
      <div className="relative">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search Area / City (उदा. Chhatarpur, Civil Lines, Naugaon...)"
            className="w-full pl-10 pr-9 py-2.5 bg-white border border-purple-200 focus:border-purple-500 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-400/20"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setShowDropdown(false);
              }}
              className="absolute right-3 text-gray-400 hover:text-gray-600 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          {isSearching && (
            <Loader2 className="w-3.5 h-3.5 text-purple-600 animate-spin absolute right-9" />
          )}
        </div>

        {/* Autocomplete Suggestions Dropdown */}
        {showDropdown && searchResults.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-purple-200 rounded-2xl shadow-xl z-30 max-h-60 overflow-y-auto divide-y divide-gray-100">
            {searchResults.map((place) => (
              <button
                key={place.placeId}
                type="button"
                onClick={() => handleSelectPlace(place)}
                className="w-full text-left p-3 hover:bg-purple-50 transition-colors flex items-start gap-2.5 cursor-pointer"
              >
                <MapPin className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-gray-900 truncate">
                    {place.name}
                  </div>
                  <div className="text-[11px] text-gray-500 line-clamp-1">
                    {place.displayName}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quick Location Chips */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] text-gray-500 font-semibold">Quick Search:</span>
        {["Chhatarpur", "Civil Lines Chhatarpur", "Naugaon", "Khajuraho"].map((city) => (
          <button
            key={city}
            type="button"
            onClick={() => handleQuickSelect(city)}
            className="text-[11px] px-2 py-0.5 bg-white hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg font-medium transition-colors cursor-pointer"
          >
            {city}
          </button>
        ))}
      </div>

      {/* GPS Button + Test Map Button */}
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
              <span>📍 Detect Current GPS (Mobile Phone)</span>
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

      {/* ⚠️ PC / Wi-Fi IP Location Notice if Bhopal is detected */}
      {isBhopalDetected && (
        <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 text-xs text-amber-800">
          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Notice:</span> Aapka internet provider (ISP) Bhopal dikha raha hai kyunki aap PC/Wi-Fi par hain.
            <div className="mt-0.5 font-medium">
              Chhatarpur set karne ke liye upar <strong>"Chhatarpur"</strong> search karein ya mobile phone se GPS dabaayein.
            </div>
          </div>
        </div>
      )}

      {/* Status Notifications */}
      {errorMsg && (
        <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-700">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {locationSuccess && lat && lng && (
        <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs text-emerald-800">
          <div className="flex items-center gap-2 min-w-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold truncate">
              {areaName ? `📍 ${areaName}` : "Location Pin Set!"}
            </span>
          </div>
          <span className="font-mono text-[11px] bg-white border border-emerald-200 px-2 py-0.5 rounded-lg text-emerald-700 shrink-0">
            {lat}, {lng}
          </span>
        </div>
      )}

      {/* Embedded Google Map Preview */}
      {lat && lng ? (
        <div className="relative rounded-xl overflow-hidden border border-purple-200 shadow-inner bg-gray-100 h-48">
          <iframe
            title="Google Map Delivery Pin"
            width="100%"
            height="100%"
            style={{ border: 0 }}
            loading="lazy"
            allowFullScreen
            src={`https://maps.google.com/maps?q=${lat},${lng}&z=16&output=embed`}
          />
          <div className="absolute bottom-2 left-2 bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-gray-200 text-[10px] font-bold text-gray-800 flex items-center gap-1 shadow-xs max-w-[90%] truncate">
            <MapPin className="w-3 h-3 text-red-600 shrink-0" />
            <span className="truncate">{areaName || `Delivery Pin: ${lat}, ${lng}`}</span>
          </div>
        </div>
      ) : (
        <div className="py-4 text-center border border-dashed border-gray-300 rounded-xl bg-white/50 text-xs text-gray-500">
          <MapPin className="w-5 h-5 text-gray-400 mx-auto mb-1 opacity-60" />
          <span>Search <strong>Chhatarpur</strong> or tap <strong>Detect Current GPS</strong> to pin your location</span>
        </div>
      )}
    </div>
  );
};
