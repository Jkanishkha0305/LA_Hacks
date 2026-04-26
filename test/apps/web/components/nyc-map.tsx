'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import DeckGL from '@deck.gl/react'
import { WebMercatorViewport } from '@deck.gl/core'
import type { MapViewState } from '@deck.gl/core'
import { luma } from '@luma.gl/core'
import { WebGLDevice } from '@luma.gl/webgl'
import { Map } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'

// Manually register WebGL adapter before component initialization
if (typeof window !== 'undefined') {
  try {
    luma.preregisteredAdapters.set('webgl', WebGLDevice);
  } catch (e) {
    console.error('Failed to register luma adapter', e);
  }
}
import { useParcelState, useParcelDispatch } from '@/lib/parcel-context'
import { useLayerState, useLayerDispatch } from '@/lib/layer-context'
import {
  createParcelLayer,
  createParcelBoundaryLayer,
  createZoningLayer,
  createMIHLayer,
} from '@/components/parcel-map-layers'
import { MapTooltip } from '@/components/map-tooltip'
import { MapLegend } from '@/components/map-legend'
import { fetchZoningDistricts, fetchMIHAreas } from '@/lib/api/layer-fetchers'
import type { PinnedParcel } from '@/lib/types'

const INITIAL_VIEW_STATE: MapViewState = {
  latitude: 40.7128,
  longitude: -74.006,
  zoom: 11,
  pitch: 0,
  bearing: 0,
}

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'

export function NYCMap() {
  const [viewState, setViewState] = useState<MapViewState>(INITIAL_VIEW_STATE)
  const [device, setDevice] = useState<any>(null)
  const [tooltip, setTooltip] = useState<{
    parcel: PinnedParcel | null
    x: number
    y: number
  }>({ parcel: null, x: 0, y: 0 })

  // Initialize WebGL device
  useEffect(() => {
    async function initDevice() {
      if (typeof window !== 'undefined') {
        try {
          // In luma v9, we should just use the best available or explicitly request webgl
          // The adapters array expects the Device class/adapter object
          const webglDevice = await luma.createDevice({
            type: 'webgl',
            adapters: [WebGLDevice]
          })
          setDevice(webglDevice)
        } catch (err) {
          console.error('Failed to create WebGL device:', err)
          // Fallback: try creating without explicit adapter (if registered globally)
          try {
            const fallbackDevice = await luma.createDevice({ type: 'webgl' })
            setDevice(fallbackDevice)
          } catch (err2) {
            console.error('Final fallback failed:', err2)
          }
        }
      }
    }
    initDevice()
  }, [])

  const { parcels, hoveredBBL, selectedBBL, compareBBLs, viewMode } = useParcelState()
  const dispatch = useParcelDispatch()
  const { layers } = useLayerState()
  const layerDispatch = useLayerDispatch()

  // Track container dimensions for accurate viewport calculations
  const containerRef = useRef<HTMLDivElement>(null)
  const containerSizeRef = useRef({ width: 800, height: 600 })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) {
        containerSizeRef.current = {
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        }
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Save map extent before drilling in, restore on back
  const savedExtentRef = useRef<MapViewState | null>(null)

  // Auto-fit map to show all pins on add or remove
  const prevCountRef = useRef(parcels.length)
  useEffect(() => {
    const count = parcels.length

    if (count === 0) {
      prevCountRef.current = 0
      setViewState((prev) => ({ ...prev, ...INITIAL_VIEW_STATE, transitionDuration: 1000 }))
      return
    }

    if (count === 1) {
      prevCountRef.current = count
      const p = parcels[0]!
      setViewState((prev) => ({
        ...prev,
        latitude: p.lat,
        longitude: p.lng,
        zoom: 15,
        transitionDuration: 1000,
      }))
      return
    }

    // 2+ parcels — fit bounds
    prevCountRef.current = count
    const lngs = parcels.map((p) => p.lng)
    const lats = parcels.map((p) => p.lat)
    const bounds: [[number, number], [number, number]] = [
      [Math.min(...lngs), Math.min(...lats)],
      [Math.max(...lngs), Math.max(...lats)],
    ]
    const { width, height } = containerSizeRef.current
    const vp = new WebMercatorViewport({ width, height })
    const fitted = vp.fitBounds(bounds, { padding: 60, maxZoom: 16 })
    setViewState((prev) => ({
      ...prev,
      latitude: fitted.latitude,
      longitude: fitted.longitude,
      zoom: fitted.zoom,
      transitionDuration: 1000,
    }))
  }, [parcels.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fly to selected parcel in report view
  useEffect(() => {
    if (selectedBBL && viewMode === 'report') {
      const p = parcels.find(p => p.bbl === selectedBBL)
      if (p) {
        // Save current extent before flying
        savedExtentRef.current = { ...viewState, transitionDuration: 0 }
        setViewState((prev) => ({
          ...prev,
          latitude: p.lat,
          longitude: p.lng,
          zoom: 16,
          transitionDuration: 800,
        }))
      }
    }
  }, [selectedBBL]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fit bounds to compared parcels in compare mode
  useEffect(() => {
    if (viewMode === 'compare' && compareBBLs.length >= 2) {
      const compareParcels = parcels.filter(p => compareBBLs.includes(p.bbl))
      if (compareParcels.length < 2) return

      savedExtentRef.current = { ...viewState, transitionDuration: 0 }
      const lngs = compareParcels.map(p => p.lng)
      const lats = compareParcels.map(p => p.lat)
      const bounds: [[number, number], [number, number]] = [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ]
      const { width, height } = containerSizeRef.current
      const vp = new WebMercatorViewport({ width, height })
      const fitted = vp.fitBounds(bounds, { padding: 60, maxZoom: 16 })
      setViewState((prev) => ({
        ...prev,
        latitude: fitted.latitude,
        longitude: fitted.longitude,
        zoom: fitted.zoom,
        transitionDuration: 800,
      }))
    }
  }, [viewMode, compareBBLs]) // eslint-disable-line react-hooks/exhaustive-deps

  // Restore saved extent when going back to table
  useEffect(() => {
    if (viewMode === 'table' && savedExtentRef.current) {
      setViewState((prev) => ({
        ...prev,
        ...savedExtentRef.current!,
        transitionDuration: 800,
      }))
      savedExtentRef.current = null
    }
  }, [viewMode])

  // Lazy-fetch city-wide layers on toggle (fetches all of NYC, cached after first load)
  useEffect(() => {
    const zoningLayer = layers['zoning-districts']
    if (zoningLayer.visible && !zoningLayer.data && !zoningLayer.loading) {
      layerDispatch({ type: 'LAYER_LOADING', id: 'zoning-districts' })
      fetchZoningDistricts()
        .then((data) => layerDispatch({ type: 'LAYER_LOADED', id: 'zoning-districts', data }))
        .catch((err) => layerDispatch({ type: 'LAYER_ERROR', id: 'zoning-districts', error: String(err) }))
    }
  }, [layers['zoning-districts'].visible]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const mihLayer = layers['mih-areas']
    if (mihLayer.visible && !mihLayer.data && !mihLayer.loading) {
      layerDispatch({ type: 'LAYER_LOADING', id: 'mih-areas' })
      fetchMIHAreas()
        .then((data) => layerDispatch({ type: 'LAYER_LOADED', id: 'mih-areas', data }))
        .catch((err) => layerDispatch({ type: 'LAYER_ERROR', id: 'mih-areas', error: String(err) }))
    }
  }, [layers['mih-areas'].visible]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleHover = useCallback(
    (info: { object?: PinnedParcel; x: number; y: number }) => {
      setTooltip({
        parcel: info.object ?? null,
        x: info.x,
        y: info.y,
      })
      dispatch({ type: 'SET_HOVERED', bbl: info.object?.bbl ?? null })
    },
    [dispatch],
  )

  const handleClick = useCallback(
    (info: { object?: PinnedParcel }) => {
      if (info.object?.status === 'ready' && info.object.data) {
        dispatch({ type: 'SELECT_PARCEL', bbl: info.object.bbl })
      }
    },
    [dispatch],
  )

  const deckLayers = useMemo(() => {
    const result = []

    // City-wide layers render below parcels
    if (layers['zoning-districts'].visible) {
      const zl = createZoningLayer(layers['zoning-districts'])
      if (zl) result.push(zl)
    }
    if (layers['mih-areas'].visible) {
      const ml = createMIHLayer(layers['mih-areas'])
      if (ml) result.push(ml)
    }

    // Parcel boundaries render above city-wide layers
    if (layers['parcel-boundaries'].visible && parcels.length > 0) {
      result.push(createParcelBoundaryLayer(parcels))
    }

    // Pin layer always on top
    result.push(createParcelLayer(parcels, hoveredBBL, handleHover, handleClick, selectedBBL, compareBBLs, viewMode))

    return result
  }, [parcels, hoveredBBL, handleHover, handleClick, selectedBBL, compareBBLs, viewMode, layers])

  if (!device) {
    return <div ref={containerRef} className="h-full w-full bg-background" />
  }

  return (
    <div ref={containerRef} className="relative h-full w-full">
      <DeckGL
        viewState={viewState}
        onViewStateChange={({ viewState: vs }) => setViewState(vs as MapViewState)}
        controller
        layers={deckLayers}
        style={{ width: '100%', height: '100%' }}
        device={device}
      >
        <Map mapStyle={MAP_STYLE} />
      </DeckGL>
      <MapLegend />
      <MapTooltip parcel={tooltip.parcel} x={tooltip.x} y={tooltip.y} />
    </div>
  )
}
