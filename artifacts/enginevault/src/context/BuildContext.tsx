import { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";

const STORAGE_KEY = "enginevault_build_v1";
const SYNC_DEBOUNCE_MS = 800;

// ─── Types ───────────────────────────────────────────────────────────────────

export type CamRecommendation = {
  durationRange: string;
  lsaRange: string;
  liftRange: string;
  summary: string;
  savedAt: number;
};

export type ActiveBuild = {
  id: number;
  name: string;
  engineSlug: string;
  fields: Record<string, string>;
  completedSections: string[];
  lastSyncedAt: number;
  isDirty: boolean;
};

type StoredBuildState = {
  camRecommendation: CamRecommendation | null;
  activeBuild: ActiveBuild | null;
};

type BuildContextValue = {
  // Existing cam recommendation API
  camRecommendation: CamRecommendation | null;
  saveCamRecommendation: (rec: CamRecommendation) => void;
  clearCamRecommendation: () => void;

  // Active build
  activeBuild: ActiveBuild | null;
  loadBuild: (buildId: number) => Promise<void>;
  clearActiveBuild: () => void;

  // Field access — the key API for calculators and the wizard
  getField: (key: string) => string | undefined;
  setField: (key: string, value: string) => void;
  setFields: (entries: Record<string, string>) => void;

  // Sync
  isSyncing: boolean;
  syncNow: () => Promise<void>;
};

// ─── localStorage helpers ────────────────────────────────────────────────────

function readStorage(): StoredBuildState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as StoredBuildState;
  } catch {}
  return { camRecommendation: null, activeBuild: null };
}

function writeStorage(state: StoredBuildState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

// ─── Context ─────────────────────────────────────────────────────────────────

const BuildContext = createContext<BuildContextValue>({
  camRecommendation: null,
  saveCamRecommendation: () => {},
  clearCamRecommendation: () => {},
  activeBuild: null,
  loadBuild: async () => {},
  clearActiveBuild: () => {},
  getField: () => undefined,
  setField: () => {},
  setFields: () => {},
  isSyncing: false,
  syncNow: async () => {},
});

// ─── Provider ────────────────────────────────────────────────────────────────

export function BuildContextProvider({ children }: { children: React.ReactNode }) {
  const stored = readStorage();

  const [camRecommendation, setCamRecommendation] = useState<CamRecommendation | null>(
    () => stored.camRecommendation,
  );
  const [activeBuild, setActiveBuild] = useState<ActiveBuild | null>(
    () => stored.activeBuild,
  );
  const [isSyncing, setIsSyncing] = useState(false);

  // Track which fields have changed since last sync
  const dirtyFieldsRef = useRef<Record<string, string>>({});
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Persist to localStorage whenever state changes
  useEffect(() => {
    writeStorage({ camRecommendation, activeBuild });
  }, [camRecommendation, activeBuild]);

  // ── Sync dirty fields to API ───────────────────────────────────────────────

  const flushSync = useCallback(async (buildId?: number) => {
    const fields = { ...dirtyFieldsRef.current };
    const id = buildId ?? activeBuild?.id;
    if (!id || Object.keys(fields).length === 0) return;

    dirtyFieldsRef.current = {};
    setIsSyncing(true);

    try {
      await fetch(`/api/builds/${id}/fields/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields }),
      });
      setActiveBuild((prev) =>
        prev ? { ...prev, isDirty: false, lastSyncedAt: Date.now() } : prev,
      );
    } catch (err) {
      // Re-queue failed fields for next sync attempt
      dirtyFieldsRef.current = { ...fields, ...dirtyFieldsRef.current };
      console.error("Build sync failed:", err);
    } finally {
      setIsSyncing(false);
    }
  }, [activeBuild?.id]);

  const scheduleSyncDebounced = useCallback(() => {
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => flushSync(), SYNC_DEBOUNCE_MS);
  }, [flushSync]);

  // Flush on unmount
  useEffect(() => {
    return () => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
      flushSync();
    };
  }, [flushSync]);

  // ── Cam recommendation (existing API, unchanged) ──────────────────────────

  const saveCamRecommendation = useCallback((rec: CamRecommendation) => {
    setCamRecommendation(rec);
  }, []);

  const clearCamRecommendation = useCallback(() => {
    setCamRecommendation(null);
  }, []);

  // ── Active build management ────────────────────────────────────────────────

  const loadBuild = useCallback(async (buildId: number) => {
    try {
      const res = await fetch(`/api/builds/${buildId}`);
      if (!res.ok) throw new Error("Failed to load build");
      const data = await res.json();

      // Convert field entries array to a flat map
      const fields: Record<string, string> = {};
      if (data.fields && Array.isArray(data.fields)) {
        for (const entry of data.fields) {
          fields[entry.fieldKey] = entry.value;
        }
      }

      // Parse wizard metadata from stateJson
      let meta: { completedSections?: string[] } = {};
      try {
        meta = data.stateJson ? JSON.parse(data.stateJson) : {};
      } catch {}

      const build: ActiveBuild = {
        id: data.id,
        name: data.name,
        engineSlug: data.engineSlug,
        fields,
        completedSections: meta.completedSections ?? [],
        lastSyncedAt: Date.now(),
        isDirty: false,
      };

      dirtyFieldsRef.current = {};
      setActiveBuild(build);
    } catch (err) {
      console.error("Failed to load build:", err);
      throw err;
    }
  }, []);

  const clearActiveBuild = useCallback(() => {
    // Flush any pending changes first
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    flushSync();
    dirtyFieldsRef.current = {};
    setActiveBuild(null);
  }, [flushSync]);

  // ── Field access ───────────────────────────────────────────────────────────

  const getField = useCallback(
    (key: string): string | undefined => {
      return activeBuild?.fields[key];
    },
    [activeBuild?.fields],
  );

  const setField = useCallback(
    (key: string, value: string) => {
      if (!activeBuild) return;

      // Update local state immediately (optimistic)
      setActiveBuild((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          fields: { ...prev.fields, [key]: value },
          isDirty: true,
        };
      });

      // Queue for API sync
      dirtyFieldsRef.current[key] = value;
      scheduleSyncDebounced();
    },
    [activeBuild, scheduleSyncDebounced],
  );

  const setFields = useCallback(
    (entries: Record<string, string>) => {
      if (!activeBuild) return;

      setActiveBuild((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          fields: { ...prev.fields, ...entries },
          isDirty: true,
        };
      });

      Object.assign(dirtyFieldsRef.current, entries);
      scheduleSyncDebounced();
    },
    [activeBuild, scheduleSyncDebounced],
  );

  const syncNow = useCallback(async () => {
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    await flushSync();
  }, [flushSync]);

  return (
    <BuildContext.Provider
      value={{
        camRecommendation,
        saveCamRecommendation,
        clearCamRecommendation,
        activeBuild,
        loadBuild,
        clearActiveBuild,
        getField,
        setField,
        setFields,
        isSyncing,
        syncNow,
      }}
    >
      {children}
    </BuildContext.Provider>
  );
}

export function useBuildContext() {
  return useContext(BuildContext);
}
