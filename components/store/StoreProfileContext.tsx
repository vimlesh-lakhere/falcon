"use client";

import React, { createContext, useContext } from "react";
import type { StoreProfile } from "@/lib/store-profile";

const StoreProfileContext = createContext<StoreProfile | null>(null);

/** Makes the shop's public profile (name, Hindi name, address, map link) available to store pages. */
export function StoreProfileProvider({ profile, children }: { profile: StoreProfile; children: React.ReactNode }) {
  return <StoreProfileContext.Provider value={profile}>{children}</StoreProfileContext.Provider>;
}

export function useStoreProfile(): StoreProfile | null {
  return useContext(StoreProfileContext);
}

/** "+91 93403 62381" -> "919340362381" (wa.me / tel: need digits only). */
export function phoneDigits(phone: string): string {
  const d = (phone || "").replace(/\D/g, "");
  return d.length === 10 ? `91${d}` : d;
}
