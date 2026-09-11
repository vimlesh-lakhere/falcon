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

      const needsNewStore =
        !profile ||
        !profile.store_id ||
        (!isMasterOwner && profile.store_id === "a0000000-0000-0000-0000-000000000001");

      // If user is brand new or non-master user mistakenly assigned master store
      if (needsNewStore) {
        const userName =
          session.user.user_metadata?.full_name ||
          session.user.user_metadata?.name ||
          session.user.email?.split("@")[0] ||
          "My Store";
        const storeName = `${userName}'s Store`;
        const newStoreId = crypto.randomUUID();

        const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
        const retentionUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

        // 1. Create dedicated record in both shops and stores
        await supabase.from("shops").insert([
          {
            id: newStoreId,
            name: storeName,
            currency: "INR",
            plan: "trial",
            trial_ends_at: trialEndsAt,
            data_retention_until: retentionUntil,
            is_active: true,
            status: "trial_active",
            owner_name: userName,
            owner_email: session.user.email || null,
          },
        ]);

        await supabase.from("stores").insert([
          {
            id: newStoreId,
            name: storeName,
            currency: "INR",
          },
        ]);

        // 2. Upsert profile with new shop
        const { data: upsertedProfile } = await supabase
          .from("profiles")
          .upsert({
            id: session.user.id,
            email: session.user.email || "",
            full_name: userName,
            avatar_url: session.user.user_metadata?.avatar_url || null,
            role: "Owner",
            store_id: newStoreId,
            is_active: true,
          })
          .select("*")
          .single();

        profile = upsertedProfile;
      }

      // Fetch ONLY the shop belonging to this user (Strict multi-tenancy)
      let userStores: Store[] = [];
      if (profile?.store_id) {
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
