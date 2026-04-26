"use client";

import { createContext, useContext, useState, useCallback } from "react";
import type { ReactNode } from "react";

export type MapMode = "baseline" | "perturbed" | "delta";

export interface CellScore {
  h3Index: string;
  score: number;
  tier: string;
}

export interface WhatIfSummary {
  total_delta: number;
  cells_worsened: number;
  cells_improved: number;
}

export interface WhatIfResult {
  hour_of_week: number;
  baseline: CellScore[];
  perturbed: CellScore[];
  delta: CellScore[];
  summary: WhatIfSummary;
}

interface WhatIfState {
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  mode: MapMode;
  setMode: (mode: MapMode) => void;
  result: WhatIfResult | null;
  setResult: (result: WhatIfResult | null) => void;
  /** Timestamp the slider branched from (for BRANCH button) */
  branchT: number | undefined;
  setBranchT: (t: number | undefined) => void;
  clear: () => void;
}

const WhatIfContext = createContext<WhatIfState | null>(null);

export function WhatIfProvider({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mode, setMode] = useState<MapMode>("baseline");
  const [result, setResult] = useState<WhatIfResult | null>(null);
  const [branchT, setBranchT] = useState<number | undefined>(undefined);

  const clear = useCallback(() => {
    setResult(null);
    setMode("baseline");
    setBranchT(undefined);
  }, []);

  return (
    <WhatIfContext.Provider
      value={{
        drawerOpen,
        setDrawerOpen,
        mode,
        setMode,
        result,
        setResult,
        branchT,
        setBranchT,
        clear,
      }}
    >
      {children}
    </WhatIfContext.Provider>
  );
}

export function useWhatIf(): WhatIfState {
  const ctx = useContext(WhatIfContext);
  if (!ctx) throw new Error("useWhatIf must be used within WhatIfProvider");
  return ctx;
}
