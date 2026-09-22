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

      if (!session?.user) {
        set({
          user: null,
          profile: null,
          currentStore: null,
          availableStores: [],
          isAuthenticated: false,
          isLoading: false,
        });
        return;
      }

      set({ user: session.user, isAuthenticated: true });

      // Fetch profile details
      let { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .maybeSingle();

      const isMasterOwner =
        session.user.email === "vimlesh.lakhere@gmail.com" ||
        session.user.email === "vlakhere@gmail.com" ||
        session.user.email === "owner_1786762700828@agsstore.com";

      // Auto-store-creation is DISABLED. A login no longer spins up a fresh 14-day trial store
      // without the owner's approval — that behaviour spawned junk trial stores from stray Google
      // sign-ins. A user only gets an active store when their profile already points to their own
      // approved shop. A non-master profile pointing at the shared AGS store is NOT given access to
      // it (security); it just ends up with no active store until the owner assigns one.
      const hasValidOwnStore =
        !!profile?.store_id &&
        (isMasterOwner || profile.store_id !== "a0000000-0000-0000-0000-000000000001");

      let userStores: Store[] = [];
      if (hasValidOwnStore && profile?.store_id) {
        const { data: storesData } = await supabase
          .from("shops")
          .select("*")
          .eq("id", profile.store_id);
        userStores = (storesData as Store[]) || [];
      }

      const activeStore = userStores[0] || null;

      if (typeof window !== "undefined" && activeStore?.id) {
        localStorage.setItem("falcon_active_store_id", activeStore.id);
        document.cookie = `falcon_active_store_id=${activeStore.id}; path=/; max-age=2592000; SameSite=Lax`;
      }

      set({
        profile: profile as Profile,
        availableStores: userStores,
        currentStore: activeStore,
        currentBranch: null,
      });
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
      document.cookie = `falcon_active_store_id=${storeId}; path=/; max-age=2592000; SameSite=Lax`;
    }

    set({
      currentStore: targetStore,
      currentBranch: null,
    });

    // Sync profile's store_id and shop_id in database
    if (user?.id) {
      await supabase
        .from("profiles")
        .update({
          store_id: storeId,
          shop_id: storeId,
        })
        .eq("id", user.id);
    }
  },

  logout: async () => {
    try {
      await supabase.auth.signOut();
      if (typeof window !== "undefined") {
        localStorage.removeItem("falcon_active_store_id");
        document.cookie = "falcon_active_store_id=; path=/; max-age=0; SameSite=Lax";
        document.cookie = "falcon_store_shop_id=; path=/; max-age=0; SameSite=Lax";
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
