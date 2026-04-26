# API Endpoints Analysis — /home/asus/LA_Hacks/test

**Date:** April 26, 2026  
**Project:** DueIntelligence (NYC Real Estate Intelligence Platform)  
**Scope:** Complete audit of all API/HTTP calls across TypeScript, JavaScript, and Python codebases

---

## Executive Summary

The codebase makes HTTP calls to **10 external APIs** and **5 internal Next.js API routes**. The architecture follows a hybrid pattern:

- **Client-side API calls**: Direct to external services (Census, HUD, Socrata, GeoSearch, FCC, ArcGIS)
- **Server-side API routes**: Handle Gemini AI integration, property analysis agents, report generation, and vision analysis
- **Backend**: Python `poi-brain` (not actively used in `/test` codebase analysis)

### API Call Patterns

| Category | Pattern | Example |
|----------|---------|---------|
| **External APIs** | Direct `fetch()` to 3rd-party domains | `https://api.census.gov/data/...` |
| **Internal Routes** | Client → `/api/*` POST/GET | `POST /api/parcel` |
| **Authentication** | Headers or Query Params | `Authorization: Bearer {HUD_API_TOKEN}` |
| **Headers** | Custom headers for Gemini key | `x-gemini-api-key` from localStorage |

---

## Environment Variables & Configuration

**Config File:** [/home/asus/LA_Hacks/test/apps/web/.env.example](apps/web/.env.example)

### Required Keys

```env
# Google Maps API — Street View & satellite imagery
# https://console.cloud.google.com/apis/credentials
GOOGLE_MAPS_API_KEY=

# Google Gemini API (optional — users can provide via UI)
# https://aistudio.google.com/apikey
GOOGLE_GENERATIVE_AI_API_KEY=

# US Census Bureau API — income / demographic data
# https://api.census.gov/data/key_signup.html
CENSUS_API_KEY=

# HUD User API — Fair Market Rent data
# https://www.huduser.gov/hudapi/public/register
HUD_API_TOKEN=

# NYC Open Data (optional, works without it)
# https://data.cityofnewyork.us/profile/edit/developer_settings
NYC_OPENDATA_TOKEN=

# NYC PLUTO dataset resource ID (changes annually, currently 24v4)
PLUTO_RESOURCE_ID=64uk-42ks  # (or 64uk-42ks for latest)
```

**Config Module:** [lib/config/data-sources.ts](apps/web/lib/config/data-sources.ts)

```typescript
export const GEOSEARCH_BASE_URL = "https://geosearch.planninglabs.nyc/v2/search"
export const SOCRATA_BASE_URL = "https://data.cityofnewyork.us/resource"
export const CENSUS_BASE_URL = "https://api.census.gov/data/2022/acs/acs5"
export const FCC_GEOCODER_URL = "https://geo.fcc.gov/api/census/block/find"
export const HUD_FMR_BASE_URL = "https://www.huduser.gov/hudapi/public/fmr/data"
```

---

## External APIs

### 1. **Google Maps API** (Street View + Satellite)

**File:** [lib/api/vision-client.ts](apps/web/lib/api/vision-client.ts) → [app/api/vision/route.ts](apps/web/app/api/vision/route.ts)

#### Endpoints

| Method | URL | Purpose | Auth |
|--------|-----|---------|------|
| `GET` | `https://maps.googleapis.com/maps/api/streetview` | Street View image at given coords | API Key |
| `GET` | `https://maps.googleapis.com/maps/api/staticmap` | Satellite/aerial image | API Key |

#### Usage Context

**Source:** [app/api/vision/route.ts:527-552](apps/web/app/api/vision/route.ts)

```typescript
const key = process.env.GOOGLE_MAPS_API_KEY

// Street View (single heading)
const url = `https://maps.googleapis.com/maps/api/streetview?size=640x480&location=${lat},${lng}&key=${key}`

// Street View (multi-heading for neighborhood scoring)
const url = `https://maps.googleapis.com/maps/api/streetview?size=640x480&location=${lat},${lng}&heading=${heading}&key=${key}`

// Satellite imagery
const url = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=18&size=640x640&maptype=satellite&key=${key}`
```

**Response Format:** Binary image (JPEG)

**Expected Output:**
- Street View images analyzed for property facade, street conditions, neighborhood walkability
- Satellite imagery analyzed for lot coverage, built area, green space percentage
- Multi-heading Street View used for neighborhood scoring (4 cardinal directions)

**Rate Limits:** Checked in code but not explicitly set (Google enforces)

---

### 2. **US Census Bureau API** (Income & Demographics)

**File:** [lib/api/census.ts](apps/web/lib/api/census.ts)

#### Endpoints

| Method | URL | Purpose | Auth |
|--------|-----|---------|------|
| `GET` | `https://api.census.gov/data/2022/acs/acs5` | ACS5 demographic data | API Key param |
| `GET` | `https://geo.fcc.gov/api/census/block/find` | Reverse geocode coords → FIPS | None |

#### Reverse Geocode (FCC) Flow

**Source:** [lib/api/census.ts:11-45](apps/web/lib/api/census.ts)

```typescript
// Step 1: Reverse-geocode lat/lng to FIPS codes
const url = new URL("https://geo.fcc.gov/api/census/block/find")
url.searchParams.set("latitude", lat.toString())
url.searchParams.set("longitude", lng.toString())
url.searchParams.set("format", "json")
url.searchParams.set("showall", "false")

const res = await fetch(url.toString())
const data = await res.json()
// Extract: state (2 chars), county (3 chars), tract (6 chars) from FIPS string
```

**Expected Output (FCC Response):**
```json
{
  "Block": {
    "FIPS": "360610123001001"  // state (2) + county (3) + tract (6) + block (4)
  }
}
```

#### Census Income Query

**Source:** [lib/api/census.ts:52-77](apps/web/lib/api/census.ts)

```typescript
// Step 2: Query Census ACS5 using FIPS codes
const url = new URL("https://api.census.gov/data/2022/acs/acs5")
url.searchParams.set("get", "B19013_001E")  // Median household income
url.searchParams.set("for", `tract:${tract}`)
url.searchParams.set("in", `state:${state}+county:${county}`)
url.searchParams.set("key", env.CENSUS_API_KEY)

const res = await fetch(url.toString())
const rows = await res.json()  // Array of arrays [[header...], [data...]]
```

**Expected Output:**
```json
[
  ["B19013_001E", "tract", "state", "county"],
  ["65000", "123456", "36", "061"]  // $65k median income
]
```

**Usage Context:** Embedded in parcel analysis tool to assess neighborhood income demographics.

---

### 3. **HUD User API** (Fair Market Rent)

**File:** [lib/api/hud.ts](apps/web/lib/api/hud.ts)

#### Endpoint

| Method | URL | Purpose | Auth |
|--------|-----|---------|------|
| `GET` | `https://www.huduser.gov/hudapi/public/fmr/data/{entityId}` | Fair Market Rent by borough | Bearer Token |

#### Request Details

**Source:** [lib/api/hud.ts:25-45](apps/web/lib/api/hud.ts)

```typescript
// Borough → HUD FIPS entity ID mapping
const BOROUGH_TO_FIPS = {
  Manhattan: "3606199999",
  Brooklyn: "3604799999",
  Bronx: "3600599999",
  Queens: "3608199999",
  "Staten Island": "3608599999",
}

const url = `https://www.huduser.gov/hudapi/public/fmr/data/${entityId}`
const res = await fetch(url, {
  headers: { Authorization: `Bearer ${env.HUD_API_TOKEN}` },
})
```

**Expected Output:**
```json
{
  "data": {
    "area_name": "New York-Newark-Jersey City, NY-NJ-PA",
    "basicdata": {
      "Efficiency": 1200,
      "One-Bedroom": 1450,
      "Two-Bedroom": 1750,
      "Three-Bedroom": 2100,
      "Four-Bedroom": 2400,
      "year": "2023"
    }
  }
}
```

**Usage Context:** Rent comparison tool for property valuation and affordability analysis.

**Timeout:** 10 seconds (AbortSignal timeout)

---

### 4. **NYC Open Data (Socrata SODA API)** — Multiple Datasets

**File:** [lib/api/socrata.ts](apps/web/lib/api/socrata.ts)

#### Base URL & Datasets

| Dataset | Resource ID | Purpose |
|---------|-------------|---------|
| PLUTO | `64uk-42ks` | Property lot data (zoning, FAR, building class) |
| DOB Violations | `ibzj-phrd` | NYC Department of Buildings violations |
| HPD Violations | `csn4-vhvf` | NYC Housing Preservation Dept violations |
| DOB Permits | `ipu4-2q9a` | NYC DOB building permits |
| HPD Complaints | `cewg-5fre` | HPD tenant complaint history |
| Rolling Sales | `usep-8jbt` | NYC real property rolling sales records |
| NYPD Complaints | `5uac-w243` | NYPD crime complaint records |

#### Generic Query Endpoint

**Source:** [lib/api/socrata.ts:18-63](apps/web/lib/api/socrata.ts)

```typescript
// Generic Socrata query function
async function socrataQuery<T>(
  datasetId: string,
  params: {
    $where?: string      // WHERE clause
    $select?: string     // SELECT columns
    $limit?: string      // LIMIT rows
    $offset?: string     // OFFSET (pagination)
    $order?: string      // ORDER BY
  } = {},
  source = datasetId,
): Promise<T[] | SocrataError> {
  // Rate limiting: 1 request per ~100ms
  await socrataLimiter.acquire()

  const url = new URL(`https://data.cityofnewyork.us/resource/${datasetId}.json`)
  if (env.SOCRATA_APP_TOKEN) {
    url.searchParams.set("$$app_token", env.SOCRATA_APP_TOKEN)  // Optional app token for higher limits
  }
  // Add query params...
  
  const res = await fetch(url.toString(), { signal: controller.signal })  // 10s timeout
}
```

#### Specific Tool Queries

**PLUTO Data Query** [lib/tools/pluto.ts:14-40](apps/web/lib/tools/pluto.ts)

```typescript
// Fetch PLUTO data for a BBL (borough-block-lot)
const rows = await socrataQuery("64uk-42ks", {
  $select: "bbl,address,bldgclass,numfloors,unitstotal,yearbuilt,zonedist1,lotarea,builtfar,residfar,commfar",
  $where: `bbl='${bbl}'`,
})
```

**Crime Data Query** [lib/tools/crime.ts:19-35](apps/web/lib/tools/crime.ts)

```typescript
// Query NYPD complaints near a location (lat/lng + radius)
const rows = await socrataQuery("5uac-w243", {
  $select: "law_category_cd,ofns_desc",
  $where: `within_circle(incident_address, ${lat}, ${lng}, ${radiusMeters})`,
}, "NYPD crimes")
```

**Permits Query** [lib/tools/permits.ts:14-30](apps/web/lib/tools/permits.ts)

```typescript
// Query DOB permits by BIN (Building Identification Number)
const rows = await socrataQuery("ipu4-2q9a", {
  $select: "job_status,job_type,job_filing_date,work_type",
  $where: `bin='${bin}'`,
}, "DOB permits")
```

**Response Format:** JSON array of objects

**Rate Limiting:** ~100ms throttle per request (via `socrataLimiter`)

**Timeout:** 10 seconds

---

### 5. **GeoSearch NYC** (Address Geocoding)

**File:** [lib/api/geosearch.ts](apps/web/lib/api/geosearch.ts)

#### Endpoints

| Method | URL | Purpose | Auth |
|--------|-----|---------|------|
| `GET` | `https://geosearch.planninglabs.nyc/v2/search` | Full geocode (server-side) | None |
| `GET` | `https://geosearch.planninglabs.nyc/v2/autocomplete` | Autocomplete (client-side) | None |

#### Geocode Query

**Source:** [lib/api/geosearch.ts:14-60](apps/web/lib/api/geosearch.ts)

```typescript
// Server-side: full geocode (used by scaffold tools & internal routes)
const url = new URL("https://geosearch.planninglabs.nyc/v2/search")
url.searchParams.set("text", address)
url.searchParams.set("size", "1")

const res = await fetch(url.toString())
const data = await res.json()
const feature = data.features?.[0]
const { properties, geometry } = feature
const [lng, lat] = geometry.coordinates

// Returns: { bbl, bin, lat, lng, borough, block, lot, zipCode, label, neighbourhood }
```

**Response Format:** GeoJSON FeatureCollection

**Expected Output:**
```json
{
  "features": [{
    "geometry": {
      "coordinates": [-74.0123, 40.7456]  // [lng, lat]
    },
    "properties": {
      "label": "123 Main St, Manhattan, NY",
      "borough": "Manhattan",
      "postalcode": "10001",
      "addendum": {
        "pad": {
          "bbl": "1001234567",
          "bin": "1012345"
        }
      }
    }
  }]
}
```

**Usage Context:** Primary geocoding service for converting addresses to property identifiers (BBL, BIN, lat/lng).

**Autocomplete Endpoint** (client-side)

```typescript
// Lightweight autocomplete for address search box
const url = `https://geosearch.planninglabs.nyc/v2/autocomplete?text=${encodeURIComponent(text)}`
const res = await fetch(url)
const data = await res.json()
// Returns simplified results for UX
```

---

### 6. **ArcGIS Feature Server** (NYC Planning GIS Data)

**File:** [lib/api/layer-fetchers.ts](apps/web/lib/api/layer-fetchers.ts)

#### Endpoints

| Endpoint | URL | Purpose | Data |
|----------|-----|---------|------|
| Zoning Districts | `https://services5.arcgis.com/GfwWNkhOj9bNBqoJ/arcgis/rest/services/nyzd/FeatureServer/0/query` | NYC zoning district boundaries | ~5,400 features |
| MIH Areas | `https://services5.arcgis.com/GfwWNkhOj9bNBqoJ/arcgis/rest/services/nycmih/FeatureServer/0/query` | Mandatory Inclusionary Housing zones | ~272 features |

#### Generic Pagination Pattern

**Source:** [lib/api/layer-fetchers.ts:24-50](apps/web/lib/api/layer-fetchers.ts)

```typescript
// Paginate through ArcGIS Feature Server (supports resultOffset + resultRecordCount)
async function fetchAllPages(
  baseUrl: string,
  params: Record<string, string>,
): Promise<GeoJSON.FeatureCollection> {
  const allFeatures: GeoJSON.Feature[] = []
  let offset = 0
  const PAGE_SIZE = 2000

  while (true) {
    const url = new URL(baseUrl)
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
    url.searchParams.set('resultOffset', String(offset))
    url.searchParams.set('resultRecordCount', String(PAGE_SIZE))
    url.searchParams.set('f', 'geojson')  // Return GeoJSON format

    const res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(30000),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${baseUrl}`)

    const page = await res.json() // GeoJSON FeatureCollection
    allFeatures.push(...page.features)

    if (page.features.length < PAGE_SIZE) break  // Reached end
    offset += PAGE_SIZE
  }

  return { type: 'FeatureCollection', features: allFeatures }
}
```

#### Zoning Districts Query

**Source:** [lib/api/layer-fetchers.ts:57-60](apps/web/lib/api/layer-fetchers.ts)

```typescript
export async function fetchZoningDistricts(): Promise<GeoJSON.FeatureCollection> {
  return fetchAllPages(
    'https://services5.arcgis.com/GfwWNkhOj9bNBqoJ/arcgis/rest/services/nyzd/FeatureServer/0/query',
    {
      where: '1=1',           // Select all
      outFields: 'ZONEDIST',  // Output field: zoning district code
      returnGeometry: 'true', // Include shapes
      outSR: '4326',          // Output spatial reference (WGS84)
    },
  )
}
```

**Response Format:** GeoJSON FeatureCollection with geometry polygons

**Timeout:** 30 seconds (AbortSignal timeout)

**Usage Context:** Map layer rendering (zoning & MIH overlay visualization).

---

## Internal API Routes

**Location:** [/home/asus/LA_Hacks/test/apps/web/app/api/](apps/web/app/api/)

### 1. **POST /api/parcel** — Property Analysis Agent

**File:** [app/api/parcel/route.ts](apps/web/app/api/parcel/route.ts)

#### Request

```typescript
{
  bbl: string,       // "1001234567" (10 digits)
  lat: number,       // 40.7456
  lng: number,       // -74.0123
  address: string    // "123 Main St, Manhattan"
}
```

#### Internal Operations

This route triggers a **multi-tool agentic workflow**:

1. **Fetch PLUTO data** (Socrata API) → building class, zoning, FAR, units, year built
2. **Compute zoning metrics** → Max FAR, buildable scenario generation
3. **Generate LLM analysis** → Gemini model synthesizes findings into property assessment

#### Response

```typescript
{
  interpretation: string,        // AI assessment of development potential
  scenarios: DevelopmentScenario[] // Zoning-compliant build scenarios
  maxFAR: number,
  // ... additional metrics
}
```

**Gemini Model Used:** Configurable via `GeminiModel.MODEL_NAME`

**Max Duration:** 30 seconds (serverless timeout)

**External Dependencies:**
- Socrata (PLUTO)
- Gemini AI
- Optional: Google API key from request headers

---

### 2. **POST /api/vision** — Vision Analysis (Street View + AI)

**File:** [app/api/vision/route.ts](apps/web/app/api/vision/route.ts)

#### Request

```typescript
{
  bbl: string,
  lat: number,
  lng: number,
  address: string,
}
```

#### Parallel Data Fetching (Phase A)

1. **Street View** → Google Maps API at {lat, lng}
2. **Satellite Aerial** → Google Static Map (satellite view)
3. **PLUTO Data** → Socrata PLUTO dataset
4. **Multi-Heading Street Views** → 4 cardinal directions (N, E, S, W)

#### Parallel AI Analysis (Phase B/C)

All run in parallel via `Promise.allSettled()`:

| Analysis | Input | Output |
|----------|-------|--------|
| Street View Assessment | Street View image + PLUTO | Property facade condition, street quality |
| Annotated Aerial | Satellite + PLUTO | Marked-up satellite with lot boundary, zoning labels |
| Shadow Analysis | Street View + PLUTO | Shadow score (0-100) |
| Shadow Diagram | Satellite + PLUTO | Visual shadow projection overlay |
| Coverage Analysis | Satellite | Built %, paved %, green % |
| Envelope Visualization | Satellite + PLUTO | 3D buildable envelope diagram (ZD1 style) |
| Neighborhood Scoring | 4x Street Views | Walkability, commercial density, infrastructure, transit |

#### Response

```typescript
{
  streetViewImage: string (base64),
  streetViewMulti: string[] (base64),  // 4 cardinal directions
  assessment: VisionAssessment,
  aerialImage: string (base64),
  annotatedAerial: string,             // Marked-up satellite
  shadowScore: number | null,
  shadowDiagram: string | null,
  coverageBreakdown: { builtPct, pavedPct, greenPct },
  neighborhoodScore: number | null,
  neighborhoodDetails: NeighborhoodDetails,
  envelopeUtilization: number | null,  // % of max FAR currently built
  envelopeImage: string | null,        // 3D envelope diagram
}
```

**Gemini Model Used:** `FLASH_IMAGE` (multimodal image generation & analysis)

**Max Duration:** 60 seconds

**External Dependencies:**
- Google Maps API (Street View, Static Map)
- Socrata (PLUTO)
- Gemini AI for all image analysis & generation

---

### 3. **POST /api/vision/compare** — Multi-Parcel Comparison

**File:** [app/api/vision/compare/route.ts](apps/web/app/api/vision/compare/route.ts)

#### Request

```typescript
{
  parcels: Array<{
    bbl: string,
    address: string,
    streetViewImage: string (base64),
    aerialImage: string (base64),
    shadowScore: number | null,
    coverageBuiltPct: number | null,
    neighborhoodScore: number | null,
    envelopeUtilization: number | null,
    zoningDistrict: string | null,
    lotArea: number | null,
    maxFAR: number | null,
    farUpside: number | null,
    builtFAR: number | null,
  }>  // Min 2, max 5 parcels
}
```

#### Analysis Output

Generates comparative report with:
- **Rankings** → Parcels ranked 1-N with rationale
- **Comparative Notes** → Cross-parcel insights
- **Best For** → Which parcel is best for: ground-up dev, value play, rehab
- **Deltas** → Metric-by-metric differences between parcels

#### Response

```typescript
{
  rankings: Array<{ bbl, rank, rationale }>,
  comparativeNotes: string,
  bestFor: {
    groundUp: { bbl, reason },
    value: { bbl, reason },
    rehab: { bbl, reason },
  },
  deltas: Array<{ metric, bblA, valueA, bblB, valueB, insight }>,
}
```

**Gemini Model Used:** `generateObject` for structured comparative analysis

**Max Duration:** 60 seconds

---

### 4. **POST /api/report** — HTML Report Generation

**File:** [app/api/report/route.ts](apps/web/app/api/report/route.ts)

#### Request

```typescript
{
  artifact: ReportArtifact,  // Report data structure
  filename: string,          // Output filename
}
```

#### Process

1. Accepts report artifact (property analysis data)
2. Generates sandboxed HTML document
3. Returns as downloadable attachment

#### Response Headers

```
Content-Type: text/html; charset=utf-8
Content-Disposition: attachment; filename="report_name.html"
Cache-Control: no-store
```

**Status:** 200 (OK) or 500 (generation failed)

**External Dependencies:**
- Gemini API (optional user-provided key)

---

### 5. **POST /api/chat** — Property Analyst Chat Agent

**File:** [app/api/chat/route.ts](apps/web/app/api/chat/route.ts)

#### Request

```typescript
{
  messages: Array<{ role, content }>,  // Chat history
  parcelContext?: {
    bbl: string,
    address: string,
    // ... parcel data
  } | null,
}
```

#### Two Modes

1. **Independent Mode** → General property analysis chat (no specific parcel)
2. **Context-Aware Mode** → Chat about a specific property with all its metrics

#### Response

Streaming response with:
- Text responses
- Tool calls (uses PLUTO, crime, violations, etc.)
- Structured analysis

**Agent Framework:** `ai` SDK with `createAgentUIStream()`

**Max Duration:** 60 seconds

**External Dependencies:**
- Gemini AI
- Socrata (PLUTO and violation data)
- All data APIs accessible via tools

---

### 6. **GET /api/geocode** — Address Geocoding Endpoint

**File:** [app/api/geocode/route.ts](apps/web/app/api/geocode/route.ts)

#### Request

```
GET /api/geocode?address=123%20Main%20St,%20Manhattan
```

#### Process

1. Calls `geocodeAddress()` (GeoSearch API)
2. Returns structured address data with BBL, BIN, lat/lng

#### Response

```typescript
{
  bbl: string,
  bin: string,
  lat: number,
  lng: number,
  borough: string,
  block: string,
  lot: string,
  zipCode: string,
  label: string,
  neighbourhood: string | null,
}
```

**Status:** 404 if no results, 200 if found

**External Dependencies:**
- GeoSearch API

---

## Request/Response Patterns

### Authentication Methods

| Service | Auth Type | Implementation |
|---------|-----------|-----------------|
| **Google Maps** | API Key (query param) | `?key={GOOGLE_MAPS_API_KEY}` |
| **Gemini AI** | API Key (header) | `x-gemini-api-key` from localStorage |
| **Census** | API Key (query param) | `?key={CENSUS_API_KEY}` |
| **HUD** | Bearer Token (header) | `Authorization: Bearer {HUD_API_TOKEN}` |
| **Socrata** | App Token (optional, query param) | `?$$app_token={NYC_OPENDATA_TOKEN}` |
| **GeoSearch** | None | Public API |
| **ArcGIS** | None | Public API |
| **FCC** | None | Public API |

### Rate Limiting & Throttling

| Service | Mechanism | Implementation |
|---------|-----------|-----------------|
| **Socrata** | Custom limiter | `socrataLimiter.acquire()` (~100ms per request) |
| **Google Maps** | Implicit quotas | Standard Google Cloud quotas |
| **Census** | Rate limit headers | Checked in response headers |
| **HUD** | Standard HTTP limits | 10s timeout per request |
| **ArcGIS** | Pagination pattern | 2000 records/page, recursive fetch |

### Timeouts

| Service | Timeout | Code |
|---------|---------|------|
| Most external APIs | 10 seconds | `AbortSignal.timeout(10_000)` |
| ArcGIS | 30 seconds | `AbortSignal.timeout(30000)` |
| Server routes | 30-60 seconds | `export const maxDuration = 60` |

### Error Handling Pattern

```typescript
// Typed error responses
export interface ApiError {
  error: string
  source: string  // Which API failed
}

export function isApiError(result: unknown): result is ApiError {
  return (
    typeof result === "object" &&
    result !== null &&
    "error" in result &&
    "source" in result
  )
}

// Usage
const result = await fetchData()
if (isApiError(result)) {
  // Handle error
} else {
  // Handle success
}
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser (React)                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────┐    ┌──────────────────┐              │
│  │  Address Search  │───→│  GeoSearch API   │              │
│  └──────────────────┘    └──────────────────┘              │
│          │                                                  │
│          ↓                                                  │
│  ┌──────────────────────────────────────────┐              │
│  │  Property Detail Page (lat, lng, BBL)    │              │
│  └──────────────────────────────────────────┘              │
│          │                      │                           │
│          ├─→ POST /api/parcel   │→ Gemini + PLUTO          │
│          └─→ POST /api/vision   │→ Google Maps + Gemini    │
│                                 │→ Socrata (PLUTO, etc)    │
│                                                             │
│          ↓                                                  │
│  ┌──────────────────────────────────────────┐              │
│  │  Comparison View (multiple properties)   │              │
│  └──────────────────────────────────────────┘              │
│          │                                                  │
│          ├─→ POST /api/vision/compare                      │
│          │   (takes outputs from /api/vision)              │
│          │                                                  │
│          ↓                                                  │
│  ┌──────────────────────────────────────────┐              │
│  │  Chat Interface (context-aware or free)  │              │
│  └──────────────────────────────────────────┘              │
│          │                                                  │
│          └─→ POST /api/chat                                │
│              (parcelContext optional)                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
         │          │          │           │
         ↓          ↓          ↓           ↓
    ┌────────┐ ┌───────┐ ┌─────────┐ ┌──────────┐
    │Census  │ │ Socrata│ │ Google  │ │   HUD    │
    │ API    │ │ (SODA) │ │ Maps    │ │   API    │
    └────────┘ └───────┘ │ Gemini  │ └──────────┘
                         └─────────┘
                             │
                        ┌────────────┐
                        │  ArcGIS    │
                        │ (Zoning)   │
                        └────────────┘
```

---

## Complete API Call Summary

### Total API Calls Mapped

**External APIs:** 10  
**Internal Routes:** 6  
**Total Endpoints:** 16

### By Service

```
Google Maps API .............. 2 endpoints (Street View, Static Map)
US Census Bureau ............. 2 endpoints (Census data, FCC geocoder)
HUD User API ................. 1 endpoint (Fair Market Rent)
NYC Socrata (7 datasets) ...... 7+ endpoints (generic query via single base)
GeoSearch .................... 2 endpoints (Geocode, Autocomplete)
ArcGIS Feature Server ......... 2 endpoints (Zoning, MIH areas)
Next.js Internal Routes ....... 6 endpoints (/api/parcel, /api/vision, etc.)
```

---

## Implementation Notes

### Response Parsing Examples

**Socrata Row-Based Results:**
```typescript
const rows = await socrataQuery("dataset_id", { $where: "..." })
// Returns: Array<Record<string, string | number>>
// Each object is a row with column names as keys
```

**GeoJSON Responses (ArcGIS, GeoSearch):**
```typescript
const geoData = await fetch(arcgisUrl)
const featureCollection = await geoData.json()  // GeoJSON FeatureCollection
featureCollection.features.forEach(feature => {
  const { geometry: { coordinates }, properties } = feature
})
```

**Google Maps Images:**
```typescript
// Returns binary image buffer (JPEG)
const imageBuffer = await fetch(googleMapsUrl).then(r => r.arrayBuffer())
const base64 = Buffer.from(imageBuffer).toString('base64')
```

---

## Configuration & Deployment Notes

1. **Environment Variables** are required in `.env.local` for production
2. **API Keys** are sensitive — ensure `.env.local` is in `.gitignore`
3. **Socrata App Token** is optional; public API works without it (lower rate limits)
4. **PLUTO Resource ID** changes annually — check `data.cityofnewyork.us` for latest
5. **Gemini API Key** can be user-provided via localStorage (`x-gemini-api-key` header)
6. **Timeouts** are generous (10-30s) to account for network latency and API response times

---

## Troubleshooting

### Common Issues

| Error | Cause | Solution |
|-------|-------|----------|
| `HTTP 401/403` | Missing or invalid API key | Check `.env.local`, verify key in console |
| `HTTP 429` | Rate limited | Wait or increase rate limit with app token |
| `No FIPS data` | Coordinates outside US | Validate lat/lng is in NYC bounds |
| `No results` | Address not found | Try alternative address format |
| `Timeout (10s/30s)` | Slow network or API server | Retry with exponential backoff |

---

**Generated:** April 26, 2026  
**Codebase:** `/home/asus/LA_Hacks/test`
