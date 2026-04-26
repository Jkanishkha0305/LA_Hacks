import { ScatterplotLayer, GeoJsonLayer, type Layer } from 'deck.gl'
import type { PinnedParcel, ViewMode } from '@/lib/types'
import type { LayerState } from '@/lib/layer-context'

const SCORE_COLORS = {
  loading: [107, 159, 255] as [number, number, number],
  high: [34, 197, 94] as [number, number, number],
  med: [245, 158, 11] as [number, number, number],
  low: [239, 68, 68] as [number, number, number],
  error: [120, 120, 120] as [number, number, number],
}

const SELECTED_STROKE = [99, 102, 241] as [number, number, number] // indigo
const COMPARE_STROKE = [168, 85, 247] as [number, number, number] // purple

function getParcelColor(parcel: PinnedParcel): [number, number, number] {
  if (parcel.status === 'loading') return SCORE_COLORS.loading
  if (parcel.status === 'error') return SCORE_COLORS.error
  if (!parcel.data) return SCORE_COLORS.loading
  return SCORE_COLORS[parcel.data.score]
}

export function createParcelLayer(
  parcels: PinnedParcel[],
  hoveredBBL: string | null,
  onHover: (info: { object?: PinnedParcel; x: number; y: number }) => void,
  onClick: (info: { object?: PinnedParcel }) => void,
  selectedBBL?: string | null,
  compareBBLs?: string[],
  viewMode?: ViewMode,
) {
  return new ScatterplotLayer<PinnedParcel>({
    id: 'parcels',
    data: parcels,
    getPosition: (d) => [d.lng, d.lat],
    getFillColor: (d) => {
      // Dim non-selected parcels in report/compare modes
      const color = getParcelColor(d)
      if (viewMode === 'report' && selectedBBL && d.bbl !== selectedBBL) {
        return [color[0], color[1], color[2], 80] as [number, number, number, number]
      }
      if (viewMode === 'compare' && compareBBLs && compareBBLs.length > 0 && !compareBBLs.includes(d.bbl)) {
        return [color[0], color[1], color[2], 80] as [number, number, number, number]
      }
      return color
    },
    getLineColor: (d) => {
      if (selectedBBL && d.bbl === selectedBBL) return SELECTED_STROKE
      if (compareBBLs?.includes(d.bbl)) return COMPARE_STROKE
      return [255, 255, 255]
    },
    getRadius: (d) => {
      if (selectedBBL && d.bbl === selectedBBL) return 14
      if (compareBBLs?.includes(d.bbl)) return 12
      if (d.bbl === hoveredBBL) return 10
      return 6
    },
    getLineWidth: (d) => {
      if (selectedBBL && d.bbl === selectedBBL) return 3
      if (compareBBLs?.includes(d.bbl)) return 2
      if (d.bbl === hoveredBBL) return 2
      return 0
    },
    radiusUnits: 'pixels',
    lineWidthUnits: 'pixels',
    stroked: true,
    filled: true,
    pickable: true,
    onHover,
    onClick,
    updateTriggers: {
      getRadius: [hoveredBBL, selectedBBL, compareBBLs],
      getLineWidth: [hoveredBBL, selectedBBL, compareBBLs],
      getLineColor: [selectedBBL, compareBBLs],
      getFillColor: [
        parcels.map((p) => `${p.bbl}-${p.status}-${p.data?.score}`),
        selectedBBL,
        compareBBLs,
        viewMode,
      ],
    },
    transitions: {
      getRadius: 150,
      getLineWidth: 150,
    },
  })
}

// ── Parcel Boundary Layer ──

export function createParcelBoundaryLayer(parcels: PinnedParcel[]): Layer {
  // Build GeoJSON features from parcels that have geometry
  const features = parcels
    .filter((p) => p.data?.geometry)
    .map((p) => ({
      type: 'Feature' as const,
      geometry: p.data!.geometry!,
      properties: {
        bbl: p.bbl,
        score: p.data?.score ?? 'loading',
      },
    }))

  const fc: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features,
  }

  return new GeoJsonLayer({
    id: 'parcel-boundaries',
    data: fc,
    getFillColor: (f: GeoJSON.Feature) => {
      const score = (f.properties?.score as keyof typeof SCORE_COLORS) ?? 'loading'
      const c = SCORE_COLORS[score] ?? SCORE_COLORS.loading
      return [c[0], c[1], c[2], 50] // 20% opacity
    },
    getLineColor: [255, 255, 255, 200],
    getLineWidth: 2,
    lineWidthUnits: 'pixels' as const,
    stroked: true,
    filled: true,
    pickable: false,
    updateTriggers: {
      getFillColor: [features.map((f) => f.properties.score).join(',')],
    },
  })
}

// ── Zoning Districts Layer ──

const ZONING_COLORS: Record<string, [number, number, number]> = {
  R: [245, 158, 11],   // amber — residential
  C: [239, 68, 68],    // red — commercial
  M: [168, 85, 247],   // purple — manufacturing
  P: [34, 197, 94],    // green — park
  B: [59, 130, 246],   // blue — battery park
}

function getZoningColor(zonedist: string): [number, number, number, number] {
  const prefix = (zonedist || '').charAt(0).toUpperCase()
  const base = ZONING_COLORS[prefix] ?? [180, 180, 180]
  return [base[0], base[1], base[2], 40] // 15% opacity
}

export function createZoningLayer(layerState: LayerState): Layer | null {
  if (!layerState.data) return null

  return new GeoJsonLayer({
    id: 'zoning-districts',
    data: layerState.data,
    getFillColor: (f: GeoJSON.Feature) =>
      getZoningColor(f.properties?.ZONEDIST ?? ''),
    getLineColor: (f: GeoJSON.Feature) => {
      const prefix = (f.properties?.ZONEDIST || '').charAt(0).toUpperCase()
      const base = ZONING_COLORS[prefix] ?? [180, 180, 180]
      return [base[0], base[1], base[2], 180]
    },
    getLineWidth: 1,
    lineWidthUnits: 'pixels' as const,
    stroked: true,
    filled: true,
    pickable: false,
  })
}

// ── MIH Areas Layer ──

export function createMIHLayer(layerState: LayerState): Layer | null {
  if (!layerState.data) return null

  return new GeoJsonLayer({
    id: 'mih-areas',
    data: layerState.data,
    getFillColor: [20, 184, 166, 50], // teal, 20% opacity
    getLineColor: [20, 184, 166, 180],
    getLineWidth: 1.5,
    lineWidthUnits: 'pixels' as const,
    stroked: true,
    filled: true,
    pickable: false,
  })
}
