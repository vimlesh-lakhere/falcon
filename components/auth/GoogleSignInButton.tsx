"use client";

import React, { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";

// Public Google OAuth Web Client ID for Falcon 360
export const GOOGLE_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
  "1096747129657-nkk08cnn9f9424rakb76o0hcga10honj.apps.googleusercontent.com";

interface GoogleSignInButtonProps {
  onSuccess: (session: any) => void;
  onError?: (error: string) => void;
  onLoadingChange?: (loading: boolean) => void;
  textType?: "signin_with" | "signup_with" | "continue_with";
  theme?: "outline" | "filled_blue" | "filled_black";
  size?: "large" | "medium" | "small";
  width?: number | string;
  fallbackText?: string;
  className?: string;
}

declare global {
  interface Window {
    google?: any;
    __googleGsiLoaded?: boolean;
  }
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  onSuccess,
  onError,
  onLoadingChange,
  textType = "continue_with",
  theme = "outline",
  size = "large",
  width,
  fallbackText = "Continue with Google",
  className = "",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isGsiRendered, setIsGsiRendered] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const handleCredentialResponse = async (response: { credential: string }) => {
      if (!response.credential) return;

      try {
        setIsProcessing(true);
        onLoadingChange?.(true);

        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: "google",
          token: response.credential,
        });

        if (error) {
          throw error;
        }

        if (isMounted) {
          onSuccess(data);
        }
      } catch (err: any) {
        console.error("Google ID Token sign-in error:", err);
        onError?.(err.message || "Failed to sign in with Google account.");
      } finally {
        if (isMounted) {
          setIsProcessing(false);
          onLoadingChange?.(false);
        }
      }
    };

    const initGoogleGsi = () => {
      if (typeof window === "undefined" || !window.google?.accounts?.id) return false;

      try {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        if (containerRef.current) {
          containerRef.current.innerHTML = "";
          window.google.accounts.id.renderButton(containerRef.current, {
            type: "standard",
            theme,
            size,
            text: textType,
            shape: "rectangular",
            logo_alignment: "left",
            width: width || (containerRef.current.clientWidth > 0 ? containerRef.current.clientWidth : 380),
          });
          setIsGsiRendered(true);
        }
        return true;
      } catch (e) {
        console.warn("Google GSI render notice:", e);
        return false;
      }
    };

    // 1. If script already loaded, initialize immediately
    if (window.google?.accounts?.id) {
      initGoogleGsi();
      return;
    }

    // 2. Otherwise load Google Identity Services client script
    const existingScript = document.getElementById("google-gsi-client");
    if (!existingScript) {
      const script = document.createElement("script");
      script.id = "google-gsi-client";
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = () => {
        window.__googleGsiLoaded = true;
        initGoogleGsi();
      };
      script.onerror = () => {
        console.warn("Could not load Google Identity Services SDK. Fallback button enabled.");
      };
      document.body.appendChild(script);
    } else {
      const interval = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(interval);
          initGoogleGsi();
        }
      }, 100);
      return () => clearInterval(interval);
    }

    return () => {
      isMounted = false;
    };
  }, [theme, size, textType, width]);

  // Fallback OAuth sign in if GIS script is blocked
  const handleFallbackOAuth = async () => {
    try {
      setIsProcessing(true);
      onLoadingChange?.(true);

      const targetOrigin =
        typeof window !== "undefined" && window.location.origin.includes("localhost")
          ? window.location.origin
          : "https://www.falcon360.in";

      const callbackUrl = `${targetOrigin}/auth/callback`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callbackUrl,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) throw error;
    } catch (err: any) {
      onError?.(err.message || "Google sign-in error.");
    } finally {
      setIsProcessing(false);
      onLoadingChange?.(false);
    }
  };

  return (
    <div className={`w-full relative flex justify-center ${className}`}>
      {/* Official Direct Google GIS Button Container (Shows "Sign in to falcon360.in with Google") */}
      <div
        ref={containerRef}
        className={`w-full flex justify-center items-center overflow-hidden min-h-[40px] ${
          isGsiRendered ? "block" : "hidden"
        }`}
      />

      {/* Fallback Custom Button if GIS script is loading or blocked by adblockers */}
      {!isGsiRendered && (
        <button
          type="button"
          onClick={handleFallbackOAuth}
          disabled={isProcessing}
          className="w-full h-10 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-lg flex items-center justify-center gap-2.5 transition-all shadow-2xs cursor-pointer active:scale-[0.99]"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>{isProcessing ? "Connecting to Google..." : fallbackText}</span>
        </button>
      )}
    </div>
  );
};
