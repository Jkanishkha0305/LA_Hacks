import { GEOSEARCH_BASE_URL } from "@/lib/config/data-sources"
import type { GeocodedAddress } from "@/lib/types/property"
import type { GeoSearchResponse } from "@/lib/types/api-responses"
import type { GeoSearchResult } from '../types'

// ── Server-side: full geocode (used by scaffold tools & routes) ──

export interface GeoSearchError {
  error: string
  source: "geosearch"
}

export async function geocodeAddress(
  address: string,
): Promise<GeocodedAddress | GeoSearchError> {
  const url = new URL(GEOSEARCH_BASE_URL)
  url.searchParams.set("text", address)
  url.searchParams.set("size", "1")

  console.log(`[API:GeoSearch] Request: ${url.toString()}`)

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10_000)

    const res = await fetch(url.toString(), { signal: controller.signal })
    clearTimeout(timeout)

    console.log(`[API:GeoSearch] Response status: ${res.status} ${res.statusText}`)

    if (!res.ok) {
      const err = `GeoSearch ${res.status}: ${res.statusText}`
      console.error(`[API:GeoSearch] ERROR: ${err}`)
      return { error: err, source: "geosearch" }
    }

    const data = (await res.json()) as GeoSearchResponse
    const feature = data.features?.[0]

    if (!feature) {
      console.warn(`[API:GeoSearch] No results for "${address}" (${data.features?.length ?? 0} features)`)
      return { error: `No results for "${address}"`, source: "geosearch" }
    }

    const { properties, geometry } = feature
    const [lng, lat] = geometry.coordinates

    const result = {
      bbl: properties.addendum.pad.bbl,
      bin: properties.addendum.pad.bin,
      lat,
      lng,
      borough: properties.borough,
      block: properties.addendum.pad.bbl.slice(1, 6),
      lot: properties.addendum.pad.bbl.slice(6),
      zipCode: properties.postalcode,
      label: properties.label,
      neighbourhood: properties.neighbourhood ?? null,
    }
    console.log(`[API:GeoSearch] Success:`, JSON.stringify(result, null, 2))
    return result
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error"
    console.error(`[API:GeoSearch] FETCH ERROR: ${message}`)
    return { error: `GeoSearch failed: ${message}`, source: "geosearch" }
  }
}

export function isGeoSearchError(
  result: unknown,
): result is GeoSearchError {
  return (
    typeof result === "object" &&
    result !== null &&
    "error" in result &&
    "source" in result
  )
}

// ── Client-side: autocomplete (used by AddressSearch component) ──

const GEOSEARCH_BASE = 'https://geosearch.planninglabs.nyc/v2'

/**
 * Search NYC addresses via GeoSearch autocomplete.
 * Client-side — no auth required.
 * Debounce calls to 300ms on the consumer side.
 */
export async function searchAddress(text: string): Promise<GeoSearchResult[]> {
  if (text.trim().length < 3) return []

  const url = `${GEOSEARCH_BASE}/autocomplete?text=${encodeURIComponent(text)}`
  const res = await fetch(url)

  if (!res.ok) {
    console.error('GeoSearch error:', res.status)
    return []
  }

  const data = await res.json()

  const withBBL: GeoSearchResult[] = data.features
    .map((f: any) => ({
      label: f.properties.label,
      name: f.properties.name,
      borough: f.properties.borough,
      bbl: f.properties.addendum?.pad?.bbl ?? null,
      coordinates: f.geometry.coordinates as [number, number],
    }))
    .filter((r: GeoSearchResult) => r.bbl != null)

  // Deduplicate by BBL — keep first (most relevant) match, collect alternates
  const seen = new Map<string, GeoSearchResult>()
  for (const r of withBBL) {
    const existing = seen.get(r.bbl)
    if (existing) {
      existing.altAddresses = existing.altAddresses ?? []
      existing.altAddresses.push(r.label)
    } else {
      seen.set(r.bbl, r)
    }
  }
  return Array.from(seen.values())
}
