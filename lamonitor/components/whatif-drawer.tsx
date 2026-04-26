"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useWhatIf, type MapMode, type WhatIfResult } from "@/lib/contexts/whatif-context";

export type PerturbationKind = "road_close" | "weather" | "unit_add" | "signal_outage";

interface Perturbation {
  kind: PerturbationKind;
  params: Record<string, number>;
}

export type { WhatIfResult };

const PRESETS: { label: string; perturbations: Perturbation[] }[] = [
  { label: "CLOSE I-405 AT WILSHIRE", perturbations: [{ kind: "road_close", params: {} }] },
  { label: "RAIN +1H", perturbations: [{ kind: "weather", params: { intensity: 1.0 } }] },
  { label: "ADD 3 CENTRAL UNITS", perturbations: [{ kind: "unit_add", params: { count: 3 } }] },
  { label: "SIGNAL OUTAGE DTLA", perturbations: [{ kind: "signal_outage", params: {} }] },
];

export function WhatIfDrawer() {
  const whatIf = useWhatIf();
  const [active, setActive] = useState<Perturbation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const togglePreset = (preset: typeof PRESETS[0]) => {
    const already = active.some((p) => p.kind === preset.perturbations[0].kind);
    if (already) {
      setActive((prev) => prev.filter((p) => p.kind !== preset.perturbations[0].kind));
    } else {
      setActive((prev) => [...prev, ...preset.perturbations]);
    }
  };

  const runSimulation = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/whatif", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ perturbations: active }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const data: WhatIfResult = await res.json();
      whatIf.setResult(data);
      whatIf.setMode("perturbed");
    } catch (e: any) {
      setError(e.message ?? "simulation failed");
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (m: MapMode) => {
    whatIf.setMode(m);
  };

  const topDelta = whatIf.result
    ? [...whatIf.result.delta]
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
    : [];

  return (
    <div className="fixed right-0 top-0 h-full w-[420px] bg-deck-bg border-l border-deck-line z-50 flex flex-col font-mono">
      {/* header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-deck-line">
        <div className="flex items-center gap-2">
          <span className="text-deck-signal text-[10px] tracking-widest">⌘</span>
          <span className="text-[11px] tracking-[0.2em] text-deck-fg font-bold">WHAT-IF SIMULATOR</span>
          {whatIf.branchT !== undefined && (
            <span className="text-[8px] tracking-wider text-deck-signal/70 border border-deck-signal/30 px-1.5 py-0.5">
              BRANCHED FROM h{whatIf.branchT}
            </span>
          )}
        </div>
        <button onClick={() => { whatIf.setDrawerOpen(false); whatIf.clear(); }} className="text-deck-dim hover:text-deck-fg transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* presets */}
        <div>
          <div className="text-[9px] tracking-[0.2em] text-deck-dim mb-2">SCENARIO PRESETS</div>
          <div className="grid grid-cols-2 gap-2">
            {PRESETS.map((preset) => {
              const isOn = active.some((p) => p.kind === preset.perturbations[0].kind);
              return (
                <button
                  key={preset.label}
                  onClick={() => togglePreset(preset)}
                  className={`px-2 py-2 text-[10px] tracking-widest border transition-all text-left ${
                    isOn
                      ? "border-deck-signal text-deck-signal bg-deck-signal/10"
                      : "border-deck-line text-deck-dim hover:border-deck-signal/50 hover:text-deck-fg"
                  }`}
                >
                  {isOn ? "■ " : "□ "}
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* simulate button */}
        <button
          onClick={runSimulation}
          disabled={loading || active.length === 0}
          className="w-full py-2 text-[11px] tracking-widest font-bold border border-deck-signal text-deck-signal hover:bg-deck-signal/10 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          {loading ? "▸ SIMULATING…" : "▸ RUN SIMULATION"}
        </button>

        {error && (
          <div className="text-[10px] text-red-400 border border-red-400/30 px-3 py-2">
            ERROR: {error}
          </div>
        )}

        {/* map mode toggle */}
        {whatIf.result && (
          <>
            <div>
              <div className="text-[9px] tracking-[0.2em] text-deck-dim mb-2">MAP MODE</div>
              <div className="flex gap-1">
                {(["baseline", "perturbed", "delta"] as MapMode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => switchMode(m)}
                    className={`flex-1 py-1 text-[9px] tracking-widest border transition-colors duration-120 ${
                      whatIf.mode === m
                        ? "border-deck-signal text-deck-signal bg-deck-signal/10"
                        : "border-deck-line text-deck-dim hover:border-deck-signal/50"
                    }`}
                  >
                    {m.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* summary */}
            <div className="border border-deck-line p-3 space-y-2">
              <div className="text-[9px] tracking-[0.2em] text-deck-dim">SIMULATION RESULT</div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-deck-signal text-[16px] font-bold tabular-nums">
                    {whatIf.result.summary.cells_worsened}
                  </div>
                  <div className="text-[9px] text-deck-dim tracking-wider">WORSENED</div>
                </div>
                <div>
                  <div className="text-deck-fg text-[16px] font-bold tabular-nums">
                    {whatIf.result.summary.cells_improved}
                  </div>
                  <div className="text-[9px] text-deck-dim tracking-wider">IMPROVED</div>
                </div>
                <div>
                  <div
                    className={`text-[16px] font-bold tabular-nums ${
                      whatIf.result.summary.total_delta > 0 ? "text-deck-signal" : "text-deck-ok"
                    }`}
                  >
                    {whatIf.result.summary.total_delta > 0 ? "+" : ""}
                    {whatIf.result.summary.total_delta.toFixed(1)}
                  </div>
                  <div className="text-[9px] text-deck-dim tracking-wider">TOTAL Δ</div>
                </div>
              </div>
            </div>

            {/* top 5 delta cells */}
            {topDelta.length > 0 && (
              <div>
                <div className="text-[9px] tracking-[0.2em] text-deck-dim mb-2">TOP RISK CHANGE CELLS</div>
                <div className="space-y-1">
                  {topDelta.map((cell) => (
                    <div key={cell.h3Index} className="flex items-center gap-2 text-[10px]">
                      <span className="text-deck-dim font-mono truncate flex-1">{cell.h3Index}</span>
                      {/* mini bar */}
                      <div className="w-20 h-2 bg-deck-elev relative overflow-hidden">
                        <div
                          className="absolute inset-y-0 left-0 bg-deck-signal"
                          style={{ width: `${Math.min(100, Math.abs(cell.score) * 200)}%` }}
                        />
                      </div>
                      <span
                        className={`w-12 text-right tabular-nums ${
                          cell.score > 0 ? "text-deck-signal" : "text-deck-ok"
                        }`}
                      >
                        {cell.score > 0 ? "+" : ""}
                        {cell.score.toFixed(3)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* footer */}
      <div className="px-4 py-2 border-t border-deck-line text-[9px] text-deck-dim tracking-wider">
        ⌐■-■ NVIDIA RAPIDS · cuML XGBoost · LOCAL INFERENCE
      </div>
    </div>
  );
}
