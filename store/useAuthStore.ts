import { create } from "zustand";
import { Profile, Store, Branch, UserSession } from "@/types/auth";
import { supabase } from "@/lib/supabase/client";

interface AuthState {
  user: any | null;
  profile: Profile | null;
  currentStore: Store | null;
  currentBranch: Branch | null;
  availableStores: Store[];
  activeSessions: UserSession[];
  isLoading: boolean;
  isAuthenticated: boolean;

  setUser: (user: any) => void;
  setProfile: (profile: Profile | null) => void;
  setCurrentStore: (store: Store | null) => void;
  setCurrentBranch: (branch: Branch | null) => void;
  setAvailableStores: (stores: Store[]) => void;
  setActiveSessions: (sessions: UserSession[]) => void;
  fetchSession: () => Promise<void>;
  switchStore: (storeId: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  currentStore: null,
  currentBranch: null,
  availableStores: [],
  activeSessions: [],
  isLoading: true,
  isAuthenticated: false,

  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setProfile: (profile) => set({ profile }),
  setCurrentStore: (currentStore) => set({ currentStore }),
  setCurrentBranch: (currentBranch) => set({ currentBranch }),
  setAvailableStores: (availableStores) => set({ availableStores }),
  setActiveSessions: (activeSessions) => set({ activeSessions }),

  fetchSession: async () => {
    try {
      set({ isLoading: true });
      const {
        data: { session },
      } = await supabase.auth.getSession();

      // Fetch all available stores from DB
      const { data: storesData } = await supabase.from("stores").select("*").order("created_at", { ascending: true });
      const allStores = (storesData as Store[]) || [];
      set({ availableStores: allStores });

      if (!session?.user) {
        // Fallback default store
        const savedStoreId = typeof window !== "undefined" ? localStorage.getItem("falcon_active_store_id") : null;
        const active = allStores.find((s) => s.id === savedStoreId) || allStores[0] || null;

        set({
          user: null,
          profile: null,
          currentStore: active,
          isAuthenticated: false,
          isLoading: false,
        });
        return;
      }

      set({ user: session.user, isAuthenticated: true });

      // Fetch profile details
      const { data: profile } = await supabase
        .from("profiles")
        .select("*, store:stores(*), branch:branches(*)")
        .eq("id", session.user.id)
        .single();

      if (profile) {
        // Check if there's a stored active store preference
        const savedStoreId = typeof window !== "undefined" ? localStorage.getItem("falcon_active_store_id") : null;
        const activeStore = (savedStoreId && allStores.find((s) => s.id === savedStoreId)) || (profile.store as Store) || allStores[0] || null;

        set({
          profile: profile as Profile,
          currentStore: activeStore,
          currentBranch: profile.branch as Branch,
        });
      } else if (allStores.length > 0) {
        set({ currentStore: allStores[0] });
      }
    } catch (err) {
      console.error("Failed to fetch session", err);
    } finally {
      set({ isLoading: false });
    }
  },

  switchStore: async (storeId: string) => {
    const { availableStores, user } = get();
    const targetStore = availableStores.find((s) => s.id === storeId);
    if (!targetStore) return;

    if (typeof window !== "undefined") {
      localStorage.setItem("falcon_active_store_id", storeId);
    }

    // Fetch primary branch for target store
    const { data: branchData } = await supabase
      .from("branches")
      .select("*")
      .eq("store_id", storeId)
      .limit(1)
      .single();

    set({
      currentStore: targetStore,
      currentBranch: (branchData as Branch) || null,
    });

    // Optionally update user's profile store_id if logged in
    if (user?.id) {
      await supabase
        .from("profiles")
        .update({
          store_id: storeId,
          branch_id: branchData?.id || null,
        })
        .eq("id", user.id);
    }
  },

  logout: async () => {
    try {
      await supabase.auth.signOut();
      if (typeof window !== "undefined") {
        localStorage.removeItem("falcon_active_store_id");
      }
      set({
        user: null,
        profile: null,
        currentStore: null,
        currentBranch: null,
        activeSessions: [],
        isAuthenticated: false,
      });
      window.location.href = "/login";
    } catch (err) {
      console.error("Logout error", err);
    }
  },
}));
