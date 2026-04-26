"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { cellToBoundary } from "h3-js";
import type { Camera, Heatmap, PatrolRoute, RiskScore } from "@/types";
import { TIER_COLOR } from "@/lib/risk/tier";
import type { MapMode, WhatIfResult } from "@/lib/contexts/whatif-context";

interface RiskHeatmapMapProps {
  cameras: Camera[];
  heatmap: Heatmap | null;
  risksByCamera: Record<string, RiskScore>;
  patrolRoutes?: PatrolRoute[];
  selectedCameraId?: string | null;
  onCameraClick?: (cameraId: string) => void;
  children?: ReactNode;
  whatIfMode?: MapMode;
  whatIfResult?: WhatIfResult | null;
}

const LA_CENTER: [number, number] = [-118.2437, 34.0522];
const LA_ZOOM = 10.5;
const MAP_STYLE =
  "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

/** Map color for what-if delta: red for positive delta, mint for negative, dim for ~0 */
function deltaColor(score: number): string {
  if (score > 0.05) return "#ef4444"; // danger red
  if (score < -0.05) return "#34d399"; // mint / ok
  return "#78787e"; // neutral dim
}

function deltaTier(score: number): string {
  const abs = Math.abs(score);
  if (abs > 0.15) return "critical";
  if (abs > 0.08) return "high";
  if (abs > 0.03) return "med";
  return "low";
}

export function RiskHeatmapMap({
  cameras,
  heatmap,
  risksByCamera,
  patrolRoutes,
  selectedCameraId,
  onCameraClick,
  children,
  whatIfMode = "baseline",
  whatIfResult,
}: RiskHeatmapMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let cancelled = false;

    (async () => {
      try {
        const maplibregl = (await import("maplibre-gl")).default;

        if (cancelled || !containerRef.current) return;

        const map = new maplibregl.Map({
          container: containerRef.current,
          style: MAP_STYLE,
          center: LA_CENTER,
          zoom: LA_ZOOM,
          attributionControl: false,
        });

        mapRef.current = map;

        map.on("load", () => {
          map.addSource("hex-risk", {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
          });
          map.addLayer({
            id: "hex-risk-fill",
            type: "fill",
            source: "hex-risk",
            paint: {
              "fill-color": ["get", "color"],
              // Tier-driven opacity so low cells sit as a faint background
              // wash while hotspots pop. Keeps the map readable even when
              // every cell in LA is rendered.
              "fill-opacity": [
                "match",
                ["get", "tier"],
                "critical",
                0.78,
                "high",
                0.55,
                "med",
                0.28,
                "low",
                0.05,
                0.05,
              ],
            },
          });
          map.addLayer({
            id: "hex-risk-stroke",
            type: "line",
            source: "hex-risk",
            paint: {
              "line-color": ["get", "color"],
              "line-width": [
                "match",
                ["get", "tier"],
                "critical",
                1.1,
                "high",
                0.8,
                "med",
                0.5,
                "low",
                0.0,
                0.0,
              ],
              "line-opacity": [
                "match",
                ["get", "tier"],
                "critical",
                0.85,
                "high",
                0.65,
                "med",
                0.4,
                "low",
                0.0,
                0.0,
              ],
            },
          });

          map.addSource("patrol-routes", {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
          });
          map.addLayer({
            id: "patrol-routes-line",
            type: "line",
            source: "patrol-routes",
            paint: {
              "line-color": "#67e8f9",
              "line-width": 2.5,
              "line-opacity": 0.9,
              "line-dasharray": [1.5, 1.5],
            },
          });

          setMapReady(true);
        });

        map.on("error", (e: any) => {
          console.error("[map] error", e?.error ?? e);
        });
      } catch (err) {
        console.error("[map] failed to initialize", err);
        setMapError((err as Error).message ?? "map failed");
      }
    })();

    return () => {
      cancelled = true;
      try {
        mapRef.current?.remove?.();
      } catch {}
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;

    // Decide which cell set to render based on what-if mode
    let cells: { h3Index: string; score: number; tier: string }[] = [];
    let useDeltaColors = false;

    if (whatIfMode !== "baseline" && whatIfResult) {
      if (whatIfMode === "perturbed") {
        cells = whatIfResult.perturbed;
      } else {
        cells = whatIfResult.delta;
        useDeltaColors = true;
      }
    } else if (heatmap) {
      cells = heatmap.cells;
    }

    if (cells.length === 0 && !heatmap) return;

    try {
      const features = cells
        .map((cell) => {
          // cellToBoundary returns [lat, lng] pairs by default; passing true
          // flips to [lng, lat] (GeoJSON order).
          const boundary = cellToBoundary(cell.h3Index, true);
          if (!boundary || boundary.length === 0) return null;
          const coords = boundary.map(([lng, lat]) => [lng, lat]);
          if (coords[0] !== coords[coords.length - 1]) {
            coords.push(coords[0]);
          }
          const color = useDeltaColors
            ? deltaColor(cell.score)
            : (TIER_COLOR as Record<string, string>)[cell.tier] ?? "#78787e";
          const tier = useDeltaColors ? deltaTier(cell.score) : cell.tier;
          return {
            type: "Feature" as const,
            geometry: {
              type: "Polygon" as const,
              coordinates: [coords],
            },
            properties: {
              h3Index: cell.h3Index,
              score: cell.score,
              tier,
              color,
            },
          };
        })
        .filter(Boolean);

      const src = mapRef.current.getSource("hex-risk");
      if (src) {
        src.setData({ type: "FeatureCollection", features });
      }
    } catch (err) {
      console.error("[map] heatmap update failed", err);
    }
  }, [mapReady, heatmap, whatIfMode, whatIfResult]);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const features = (patrolRoutes ?? []).map((r) => ({
      type: "Feature" as const,
      geometry: {
        type: "LineString" as const,
        coordinates: r.waypoints.map((w) => [w.latLng[1], w.latLng[0]]),
      },
      properties: {
        unitId: r.unitId,
        totalRiskCovered: r.totalRiskCovered,
      },
    }));
    const src = mapRef.current.getSource("patrol-routes");
    if (src) src.setData({ type: "FeatureCollection", features });
  }, [mapReady, patrolRoutes]);

  useEffect(() => {
    if (!mapReady || !mapRef.current || !selectedCameraId) return;
    const cam = cameras.find((c) => c.id === selectedCameraId);
    if (cam?.latLng) {
      mapRef.current.flyTo({
        center: [cam.latLng[1], cam.latLng[0]],
        zoom: 15,
        duration: 900,
      });
    }
  }, [selectedCameraId, cameras, mapReady]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="absolute inset-0 h-full w-full bg-deck-bg" />
      {!mapReady && !mapError && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-[10px] uppercase tracking-[0.2em] text-deck-dim">
          loading map…
        </div>
      )}
      {mapError && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-[10px] uppercase tracking-[0.2em] text-red-400">
          map failed: {mapError}
        </div>
      )}
      {mapReady && (
        <CameraPins
          mapRef={mapRef}
          cameras={cameras}
          risksByCamera={risksByCamera}
          selectedCameraId={selectedCameraId}
          onCameraClick={onCameraClick}
        />
      )}
      {children}
    </div>
  );
}

interface CameraPinsProps {
  mapRef: React.MutableRefObject<any>;
  cameras: Camera[];
  risksByCamera: Record<string, RiskScore>;
  selectedCameraId?: string | null;
  onCameraClick?: (id: string) => void;
}

function CameraPins({
  mapRef,
  cameras,
  risksByCamera,
  selectedCameraId,
  onCameraClick,
}: CameraPinsProps) {
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>(
    {}
  );

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    function recompute() {
      const next: Record<string, { x: number; y: number }> = {};
      for (const cam of cameras) {
        if (!cam.latLng) continue;
        const p = map.project([cam.latLng[1], cam.latLng[0]]);
        next[cam.id] = { x: p.x, y: p.y };
      }
      setPositions(next);
    }

    recompute();
    map.on("move", recompute);
    map.on("zoom", recompute);
    map.on("resize", recompute);
    return () => {
      try {
        map.off("move", recompute);
        map.off("zoom", recompute);
        map.off("resize", recompute);
      } catch {}
    };
  }, [cameras, mapRef]);

  return (
    <div className="pointer-events-none absolute inset-0">
      {cameras.map((cam) => {
        const pos = positions[cam.id];
        if (!pos) return null;
        const risk = risksByCamera[cam.id];
        const tier = risk?.tier ?? "low";
        const color = TIER_COLOR[tier];
        const isSelected = selectedCameraId === cam.id;
        return (
          <button
            key={cam.id}
            type="button"
            className="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: pos.x, top: pos.y }}
            onClick={() => onCameraClick?.(cam.id)}
            aria-label={`Camera ${cam.name}`}
          >
            <span
              className="relative block h-3 w-3 rounded-full"
              style={{
                backgroundColor: color,
                boxShadow: `0 0 0 2px ${color}, 0 0 16px ${color}`,
                transform: isSelected ? "scale(1.6)" : "scale(1)",
                transition: "transform 120ms ease",
              }}
            >
              <span
                className="absolute inset-[-6px] rounded-full opacity-40"
                style={{ boxShadow: `0 0 0 2px ${color}` }}
              />
            </span>
          </button>
        );
      })}
    </div>
  );
}
