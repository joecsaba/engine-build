import { createContext, useContext, useState, useCallback } from "react";

const STORAGE_KEY = "enginevault_build_v1";

export type CamRecommendation = {
  durationRange: string;
  lsaRange: string;
  liftRange: string;
  summary: string;
  savedAt: number;
};

type StoredBuildState = {
  camRecommendation: CamRecommendation | null;
};

function readStorage(): StoredBuildState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as StoredBuildState;
  } catch {}
  return { camRecommendation: null };
}

function writeStorage(state: StoredBuildState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

type BuildContextValue = {
  camRecommendation: CamRecommendation | null;
  saveCamRecommendation: (rec: CamRecommendation) => void;
  clearCamRecommendation: () => void;
};

const BuildContext = createContext<BuildContextValue>({
  camRecommendation: null,
  saveCamRecommendation: () => {},
  clearCamRecommendation: () => {},
});

export function BuildContextProvider({ children }: { children: React.ReactNode }) {
  const [camRecommendation, setCamRecommendation] = useState<CamRecommendation | null>(
    () => readStorage().camRecommendation
  );

  const saveCamRecommendation = useCallback((rec: CamRecommendation) => {
    setCamRecommendation(rec);
    const stored = readStorage();
    writeStorage({ ...stored, camRecommendation: rec });
  }, []);

  const clearCamRecommendation = useCallback(() => {
    setCamRecommendation(null);
    const stored = readStorage();
    writeStorage({ ...stored, camRecommendation: null });
  }, []);

  return (
    <BuildContext.Provider value={{ camRecommendation, saveCamRecommendation, clearCamRecommendation }}>
      {children}
    </BuildContext.Provider>
  );
}

export function useBuildContext() {
  return useContext(BuildContext);
}
