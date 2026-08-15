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
        .select("*, store:stores(*), branch:branches(*)")
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

        // 1. Create a fresh dedicated store for this user
        const { data: newStore } = await supabase
          .from("stores")
          .insert([
            {
              name: storeName,
              business_type: "Cosmetics & Retail",
              currency: "INR",
              timezone: "Asia/Kolkata",
            },
          ])
          .select()
          .single();

        if (newStore) {
          // 2. Create main branch
          const { data: newBranch } = await supabase
            .from("branches")
            .insert([
              {
                store_id: newStore.id,
                name: `${storeName} (Main Branch)`,
                is_main_branch: true,
                is_active: true,
              },
            ])
            .select()
            .single();

          // 3. Upsert profile with new store
          const { data: upsertedProfile } = await supabase
            .from("profiles")
            .upsert({
              id: session.user.id,
              email: session.user.email || "",
              full_name: userName,
              avatar_url: session.user.user_metadata?.avatar_url || null,
              role: "Owner",
              store_id: newStore.id,
              branch_id: newBranch?.id || null,
              is_active: true,
            })
            .select("*, store:stores(*), branch:branches(*)")
            .single();

          profile = upsertedProfile;
        }
      }

      // Fetch stores belonging to this user
      let userStores: Store[] = [];
      if (profile?.store_id) {
        const { data: storesData } = await supabase
          .from("stores")
          .select("*")
          .eq("id", profile.store_id);
        userStores = (storesData as Store[]) || [];
      }

      const activeStore = (profile?.store as Store) || userStores[0] || null;
      const activeBranch = (profile?.branch as Branch) || null;

      set({
        profile: profile as Profile,
        availableStores: userStores.length > 0 ? userStores : activeStore ? [activeStore] : [],
        currentStore: activeStore,
        currentBranch: activeBranch,
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
