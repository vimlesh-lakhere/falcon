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

      // Fetch all available shops
      const { data: storesData } = await supabase.from("shops").select("*").order("created_at", { ascending: true });
      const allStores = (storesData as Store[]) || [];
      set({ availableStores: allStores });

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

      // If user is brand new (e.g. Google OAuth) and has no profile or store assigned yet
      if (!profile || !profile.store_id) {
        const userName =
          session.user.user_metadata?.full_name ||
          session.user.user_metadata?.name ||
          session.user.email?.split("@")[0] ||
          "My Store";
        const storeName = `${userName}'s Store`;
        const slugPrefix = storeName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        const uniqueSlug = `${slugPrefix}-${Math.random().toString(36).substring(2, 6)}`;

        // 1. Create a fresh dedicated shop for this user
        const { data: newStore } = await supabase
          .from("shops")
          .insert([
            {
              name: storeName,
              slug: uniqueSlug,
              business_type: "general",
              currency: "INR",
              plan: "trial",
            },
          ])
          .select()
          .single();

        if (newStore) {
          // 2. Upsert profile with new shop
          const { data: upsertedProfile } = await supabase
            .from("profiles")
            .upsert({
              id: session.user.id,
              email: session.user.email || "",
              full_name: userName,
              avatar_url: session.user.user_metadata?.avatar_url || null,
              role: "Owner",
              store_id: newStore.id,
              shop_id: newStore.id,
              is_active: true,
            })
            .select("*")
            .single();

          profile = upsertedProfile;
        }
      }

      // Fetch shops belonging to this user or matching profile.store_id
      let userStores: Store[] = [];
      if (profile?.store_id) {
        const { data: storesData } = await supabase
          .from("shops")
          .select("*")
          .eq("id", profile.store_id);
        userStores = (storesData as Store[]) || [];
      }

      const activeStore = userStores[0] || allStores.find((s) => s.id === profile?.store_id) || allStores[0] || null;

      set({
        profile: profile as Profile,
        availableStores: userStores.length > 0 ? userStores : allStores,
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
