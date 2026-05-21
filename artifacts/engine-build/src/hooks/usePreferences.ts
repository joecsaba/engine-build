import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";
import { authFetch } from "@/lib/authFetch";
import { useAuth } from "@/context/AuthContext";

export interface RecentEntry {
  slug: string;
  ts: string;
}

export interface UserPreferences {
  userId: string;
  displayName: string | null;
  defaultUnits: "imperial" | "metric";
  defaultPlatform: string | null;
  favorites: string[];
  recents: RecentEntry[];
  sidebarTools: string[];
  settings: Record<string, unknown>;
}

const DEFAULT_PREFS: UserPreferences = {
  userId: "guest",
  displayName: null,
  defaultUnits: "imperial",
  defaultPlatform: null,
  favorites: [],
  recents: [],
  sidebarTools: [],
  settings: {},
};

const LOCAL_KEY = "engine_build_prefs_v1";
const RECENTS_MAX = 20;

function readLocal(): Partial<UserPreferences> | null {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeLocal(prefs: UserPreferences): void {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(prefs));
  } catch {
    // Storage quota or private mode — silently skip.
  }
}

type Patch = Partial<Omit<UserPreferences, "userId">>;

/**
 * Hook for reading and updating per-user preferences.
 *
 * For signed-in users, the server (user_preferences table) is the source of
 * truth and changes are persisted via PUT /api/me/preferences. localStorage
 * is used as a warm-start cache so the UI doesn't flash defaults on load.
 *
 * For guests, preferences live entirely in localStorage. On first sign-in we
 * migrate the local cache to the server.
 */
export function usePreferences() {
  const { isSignedIn, isLoaded: authLoaded } = useAuth();
  const queryClient = useQueryClient();
  const migratedRef = useRef(false);

  const query = useQuery<UserPreferences>({
    queryKey: ["preferences"],
    queryFn: async () => {
      if (!isSignedIn) {
        const local = readLocal();
        return { ...DEFAULT_PREFS, ...local, userId: "guest" };
      }
      const res = await authFetch("/api/me/preferences");
      if (!res.ok) throw new Error(`Failed to load preferences: ${res.status}`);
      const server = (await res.json()) as UserPreferences;
      const normalized: UserPreferences = { ...DEFAULT_PREFS, ...server };
      writeLocal(normalized);
      return normalized;
    },
    enabled: authLoaded,
    staleTime: 5 * 60 * 1000,
  });

  const mutation = useMutation({
    mutationFn: async (patch: Patch): Promise<UserPreferences> => {
      const current = queryClient.getQueryData<UserPreferences>(["preferences"]) ?? DEFAULT_PREFS;
      const next: UserPreferences = { ...current, ...patch };

      if (!isSignedIn) {
        writeLocal(next);
        return next;
      }
      const res = await authFetch("/api/me/preferences", {
        method: "PUT",
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error(`Failed to save preferences: ${res.status}`);
      const server = (await res.json()) as UserPreferences;
      const normalized: UserPreferences = { ...DEFAULT_PREFS, ...server };
      writeLocal(normalized);
      return normalized;
    },
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: ["preferences"] });
      const previous = queryClient.getQueryData<UserPreferences>(["preferences"]);
      if (previous) {
        queryClient.setQueryData<UserPreferences>(["preferences"], { ...previous, ...patch });
      }
      return { previous };
    },
    onError: (_err, _patch, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["preferences"], context.previous);
      }
    },
    onSuccess: (server) => {
      queryClient.setQueryData(["preferences"], server);
    },
  });

  // One-shot migration: when a guest signs in and has local prefs, push them
  // up to the server so they don't lose their favorites/recents.
  useEffect(() => {
    if (!authLoaded || !isSignedIn || migratedRef.current) return;
    const local = readLocal();
    const guestyId = !local || local.userId === "guest";
    if (!local || !guestyId) {
      migratedRef.current = true;
      return;
    }
    const hasContent =
      (local.favorites?.length ?? 0) > 0 ||
      (local.recents?.length ?? 0) > 0 ||
      (local.sidebarTools?.length ?? 0) > 0 ||
      !!local.defaultPlatform ||
      local.defaultUnits === "metric";
    if (hasContent) {
      mutation.mutate({
        favorites: local.favorites,
        recents: local.recents,
        sidebarTools: local.sidebarTools,
        defaultPlatform: local.defaultPlatform ?? null,
        defaultUnits: (local.defaultUnits as "imperial" | "metric") ?? "imperial",
      });
    }
    migratedRef.current = true;
  }, [authLoaded, isSignedIn, mutation]);

  const prefs = query.data ?? DEFAULT_PREFS;

  const toggleFavorite = useCallback((slug: string) => {
    const has = prefs.favorites.includes(slug);
    const favorites = has
      ? prefs.favorites.filter((s) => s !== slug)
      : [...prefs.favorites, slug];
    mutation.mutate({ favorites });
  }, [prefs.favorites, mutation]);

  const addRecent = useCallback((slug: string) => {
    const now = new Date().toISOString();
    const filtered = prefs.recents.filter((r) => r.slug !== slug);
    const recents: RecentEntry[] = [{ slug, ts: now }, ...filtered].slice(0, RECENTS_MAX);
    mutation.mutate({ recents });
  }, [prefs.recents, mutation]);

  const togglePinned = useCallback((slug: string) => {
    const has = prefs.sidebarTools.includes(slug);
    const sidebarTools = has
      ? prefs.sidebarTools.filter((s) => s !== slug)
      : [...prefs.sidebarTools, slug];
    mutation.mutate({ sidebarTools });
  }, [prefs.sidebarTools, mutation]);

  const setDefaults = useCallback((patch: {
    defaultUnits?: "imperial" | "metric";
    defaultPlatform?: string | null;
    displayName?: string | null;
  }) => {
    mutation.mutate(patch);
  }, [mutation]);

  return {
    prefs,
    isLoading: query.isLoading,
    isError: query.isError,
    isFavorite: (slug: string) => prefs.favorites.includes(slug),
    isPinned: (slug: string) => prefs.sidebarTools.includes(slug),
    toggleFavorite,
    addRecent,
    togglePinned,
    setDefaults,
    setPrefs: (patch: Patch) => mutation.mutate(patch),
  };
}
