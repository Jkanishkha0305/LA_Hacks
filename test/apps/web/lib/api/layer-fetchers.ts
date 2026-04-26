/**
 * Lazy fetchers for city-wide map layers.
 * Each returns a GeoJSON FeatureCollection for rendering with DeckGL GeoJsonLayer.
 * Called on-demand when the user toggles a layer on.
 * Zoning layer paginates through all NYC features (>2000).
 */

/** Validate that a response is a proper GeoJSON FeatureCollection */
function assertGeoJSON(data: unknown): GeoJSON.FeatureCollection {
  const d = data as Record<string, unknown>
  if (d && d.type === 'FeatureCollection' && Array.isArray(d.features)) {
    return d as unknown as GeoJSON.FeatureCollection
  }
  throw new Error('Response is not valid GeoJSON FeatureCollection')
}

const PAGE_SIZE = 2000

/**
 * Paginate through an ArcGIS FeatureServer/MapServer query that supports
 * `resultOffset` + `resultRecordCount`, returning all pages merged into
 * a single GeoJSON FeatureCollection.
 */
async function fetchAllPages(
  baseUrl: string,
  params: Record<string, string>,
): Promise<GeoJSON.FeatureCollection> {
  const allFeatures: GeoJSON.Feature[] = []
  let offset = 0

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const url = new URL(baseUrl)
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
    url.searchParams.set('resultOffset', String(offset))
    url.searchParams.set('resultRecordCount', String(PAGE_SIZE))
    url.searchParams.set('f', 'geojson')

    const res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(30000),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${baseUrl}`)

    const page = assertGeoJSON(await res.json())
    allFeatures.push(...page.features)

    // If we got fewer than PAGE_SIZE, we've reached the end
    if (page.features.length < PAGE_SIZE) break
    offset += PAGE_SIZE
  }

  return { type: 'FeatureCollection', features: allFeatures }
}

// ── Zoning Districts (DCP GIS) — ~5,400 features ──

export async function fetchZoningDistricts(): Promise<GeoJSON.FeatureCollection> {
  return fetchAllPages(
    'https://services5.arcgis.com/GfwWNkhOj9bNBqoJ/arcgis/rest/services/nyzd/FeatureServer/0/query',
    {
      where: '1=1',
      outFields: 'ZONEDIST',
      returnGeometry: 'true',
      outSR: '4326',
    },
  )
}

// ── MIH Areas (DCP GIS) — ~272 features, single page ──

export async function fetchMIHAreas(): Promise<GeoJSON.FeatureCollection> {
  const url = new URL(
    'https://services5.arcgis.com/GfwWNkhOj9bNBqoJ/arcgis/rest/services/nycmih/FeatureServer/0/query',
  )
  url.searchParams.set('where', '1=1')
  url.searchParams.set('outFields', 'PROJECTNAM,MIH_Option')
  url.searchParams.set('returnGeometry', 'true')
  url.searchParams.set('outSR', '4326')
  url.searchParams.set('f', 'geojson')

  const res = await fetch(url.toString(), {
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) throw new Error(`MIH GIS HTTP ${res.status}`)
  const data = await res.json()
  return assertGeoJSON(data)
}
