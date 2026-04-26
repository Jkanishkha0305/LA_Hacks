'use client'

import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from 'react'

// ── Layer IDs ──

export type LayerId = 'parcel-boundaries' | 'zoning-districts' | 'mih-areas'

// ── Layer metadata (static config) ──

export interface LayerConfig {
  id: LayerId
  name: string
  group: string
  color: [number, number, number] // swatch color for the panel
}

export interface LayerGroup {
  name: string
  layers: LayerConfig[]
}

export const LAYER_CONFIGS: LayerConfig[] = [
  { id: 'parcel-boundaries', name: 'Boundaries', group: 'Parcel', color: [255, 255, 255] },
  { id: 'zoning-districts', name: 'Zoning Districts', group: 'Zoning & Land Use', color: [245, 158, 11] },
  { id: 'mih-areas', name: 'MIH Areas', group: 'Zoning & Land Use', color: [20, 184, 166] },
]

export const LAYER_GROUPS: LayerGroup[] = [
  { name: 'Parcel', layers: LAYER_CONFIGS.filter(l => l.group === 'Parcel') },
  { name: 'Zoning & Land Use', layers: LAYER_CONFIGS.filter(l => l.group === 'Zoning & Land Use') },
]

// ── Per-layer state ──

export interface LayerState {
  visible: boolean
  loading: boolean
  error: string | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: GeoJSON.FeatureCollection | null
}

export interface LayersState {
  layers: Record<LayerId, LayerState>
}

// ── Actions ──

export type LayerAction =
  | { type: 'TOGGLE_LAYER'; id: LayerId }
  | { type: 'LAYER_LOADING'; id: LayerId }
  | { type: 'LAYER_LOADED'; id: LayerId; data: GeoJSON.FeatureCollection }
  | { type: 'LAYER_ERROR'; id: LayerId; error: string }

// ── Initial state ──

function defaultLayerState(visible: boolean): LayerState {
  return { visible, loading: false, error: null, data: null }
}

const initialState: LayersState = {
  layers: {
    'parcel-boundaries': defaultLayerState(true),
    'zoning-districts': defaultLayerState(false),
    'mih-areas': defaultLayerState(false),
  },
}

// ── Reducer ──

function layerReducer(state: LayersState, action: LayerAction): LayersState {
  switch (action.type) {
    case 'TOGGLE_LAYER':
      return {
        ...state,
        layers: {
          ...state.layers,
          [action.id]: {
            ...state.layers[action.id],
            visible: !state.layers[action.id].visible,
          },
        },
      }

    case 'LAYER_LOADING':
      return {
        ...state,
        layers: {
          ...state.layers,
          [action.id]: {
            ...state.layers[action.id],
            loading: true,
            error: null,
          },
        },
      }

    case 'LAYER_LOADED':
      return {
        ...state,
        layers: {
          ...state.layers,
          [action.id]: {
            ...state.layers[action.id],
            loading: false,
            data: action.data,
          },
        },
      }

    case 'LAYER_ERROR':
      return {
        ...state,
        layers: {
          ...state.layers,
          [action.id]: {
            ...state.layers[action.id],
            loading: false,
            error: action.error,
          },
        },
      }

    default:
      return state
  }
}

// ── Context ──

const LayerContext = createContext<LayersState>(initialState)
const LayerDispatchContext = createContext<Dispatch<LayerAction>>(() => {})

export function LayerProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(layerReducer, initialState)
  return (
    <LayerContext.Provider value={state}>
      <LayerDispatchContext.Provider value={dispatch}>
        {children}
      </LayerDispatchContext.Provider>
    </LayerContext.Provider>
  )
}

export function useLayerState() {
  return useContext(LayerContext)
}

export function useLayerDispatch() {
  return useContext(LayerDispatchContext)
}
