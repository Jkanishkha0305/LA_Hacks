# DueIntelligence — Complete API Documentation

**Project**: LA Real Estate Due Diligence Agent  
**Repository**: `https://github.com/ashkanrdn/DueIntelligence`  
**Tech Stack**: Next.js 16 (App Router), Vercel AI SDK, Google Gemini, Deck.gl (maps)  
**Architecture**: Monorepo (pnpm workspaces) with Next.js web app + UI package

---

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React)                         │
│ - Address Search Component (client-side)                    │
│ - Map View (Deck.gl) + Overlays (zoning, TOC)              │
│ - Parcel Report & Comparison UI                            │
└─────────────────────────────────────────────────────────────┘
                              ↓
            ┌──────────────────────────────────┐
            │   Next.js API Routes (7 Routes)   │
            │   (handles auth, validation)      │
            └──────────────────────────────────┘
                              ↓
    ┌─────────────────────────────────────────────┐
    │         External APIs & Data Sources        │
    ├─────────────────────────────────────────────┤
    │ • Google Gemini (AI analysis)               │
    │ • LA Socrata (parcels, zoning, layers)      │
    │ • GeoSearch NYC (still referenced, migrate) │
    │ • Google Maps (Street View, Geocoding)      │
    │ • LA ArcGIS Feature Services (optional)     │
    └─────────────────────────────────────────────┘
```

---

## API Routes Reference

All routes are in `/apps/web/app/api/`

### 1. **POST /api/chat** — AI Property Analysis
**Purpose**: Streaming multi-turn conversation with property analyst agent  
**Authentication**: Optional Gemini API key (user-provided or fallback to server key)  
**Timeout**: 60s

#### Request
```json
{
  "messages": [
    { "role": "user", "content": "What is the development potential of this parcel?" }
  ],
  "parcelContext": {
    "bbl": "LA-1",
    "address": "350 S Grand Ave, Los Angeles, CA 90071",
    "lat": 34.0522,
    "lng": -118.2437,
    "zoningDistrict": "C2-1",
    "maxFAR": 3.0,
    "lotArea": 5000,
    "yearBuilt": 1985
  }
}
```

#### Response
**Streaming JSON** (Server-Sent Events, JSON-Render format)
```json
{
  "type": "agent-message",
  "reasoning": "Analyzing zoning and lot characteristics...",
  "output": "This C2-1 zoned property offers moderate commercial density potential..."
}
```

#### Key Features
- **Context-aware mode**: Routes to `createContextAwareAnalyst()` if `parcelContext` provided
- **Independent mode**: Routes to `createPropertyAnalyst()` if no context
- **Streaming UI**: Uses `pipeJsonRender()` to enable progressive rendering
- **Tools available to agent**: geocode, pluto (parcel data), permits, violations, complaints, sales comps, census, crime, rent

---

### 2. **GET /api/geocode** — Address Geocoding (NYC → LA Migration)
**Purpose**: Convert address string to coordinates + parcel ID (BBL)  
**Status**: ⚠️ **NYC Legacy API** — Needs LA replacement
**Timeout**: 10s

#### Request
```
GET /api/geocode?address=350%20S%20Grand%20Ave,%20Los%20Angeles,%20CA%2090071
```

#### Response
```json
{
  "bbl": "LA-1",
  "bin": "0000000",
  "lat": 34.0522,
  "lng": -118.2437,
  "borough": "Los Angeles",
  "block": "0000",
  "lot": "00000",
  "zipCode": "90071",
  "label": "350 S Grand Ave, Los Angeles, CA 90071",
  "neighbourhood": "Downtown LA"
}
```

#### Current Issue
- **Sources**: NYC GeoSearch Planning Labs → needs LA equivalent
- **Data mapping**: NYC BBL format → LA APN (Assessor Parcel Number)
- **Solution**: Use Google Maps Geocoding API + LA Socrata parcel lookup

---

### 3. **POST /api/parcel** — Parcel Analysis & Zoning
**Purpose**: Compute development potential for a single parcel  
**Dependencies**: Requires parcel BBL, coordinates, address  
**Timeout**: 30s

#### Request
```json
{
  "bbl": "LA-1",
  "lat": 34.0522,
  "lng": -118.2437,
  "address": "350 S Grand Ave, Los Angeles, CA 90071"
}
```

#### Response
```json
{
  "zoningDistrict": "C2-1",
  "commercialOverlay": null,
  "specialDistrict": null,
  "tocTier": "TOC Tier 3",
  "tocBonusFAR": 0.75,
  "lotArea": 5000,
  "lotFrontage": 50,
  "lotDepth": 100,
  "builtFAR": 1.2,
  "residFAR": 3.0,
  "commFAR": 1.5,
  "facilFAR": 6.0,
  "buildingClass": "C2",
  "yearBuilt": 1985,
  "numFloors": 3,
  "unitsRes": 0,
  "unitsTotal": 0,
  "buildingArea": 6000,
  "ownerName": "Downtown Development LLC",
  "landmark": null,
  "histDist": null,
  "eDesigNum": null,
  "fireHazardZone": "Moderate Fire Hazard",
  "isFireHazard": false,
  "faultZone": null,
  "isFaultHazard": false,
  "floodZone": null,
  "isFloodHazard": false,
  "maxFAR": 1.5,
  "farUpside": 0.3,
  "maxBuildableSF": 7500,
  "score": "high",
  "interpretation": "C2-1 zoning allows mixed-use development with 1.5x FAR. Current building is underutilized (1.2 FAR). TOC Tier 3 provides bonus FAR of 0.75 for affordable housing compliance. Development potential: ground-up replacement with 75-85 units (assuming 65% residential + MIH compliance)."
}
```

#### Data Pipeline
1. **Input validation** (Zod schema)
2. **LA Socrata lookup**: Query zoning, TOC tier, parcel boundary
3. **Constraint detection**: Fire hazard zones, fault zones, flood zones, landmarks
4. **FAR computation** (lib/zoning.ts): Zoning district → max density rules
5. **Gemini synthesis**: Generate `interpretation` field

---

### 4. **POST /api/vision** — Parcel Visual Assessment
**Purpose**: Analyze parcel via aerial + street-view imagery using Gemini  
**Dependencies**: Google Street View + Aerial imagery API  
**Timeout**: 60s  
**Output**: Structured visual analysis (shadow score, coverage %, condition, etc.)

#### Request
```json
{
  "bbl": "LA-1",
  "lat": 34.0522,
  "lng": -118.2437,
  "address": "350 S Grand Ave, Los Angeles, CA 90071"
}
```

#### Response
```json
{
  "visionAssessment": {
    "estimatedStories": 7,
    "currentUse": "Commercial - Office/Retail",
    "condition": "Good - Well-maintained",
    "buildingType": "Mid-rise mixed-use",
    "lotFeatures": ["Corner lot", "Alley access", "Parking structure"],
    "constructionActivity": true,
    "adjacentContext": "Surrounded by mixed-use development, close to transit",
    "developmentNotes": "Excellent visibility. Narrow lot constrains floor-plate efficiency."
  },
  "shadowAnalysis": {
    "shadowScore": 6,
    "estimatedHeightFt": 85,
    "shadowDirection": "North-east in afternoon",
    "adjacentImpact": "Moderate shadow cast on adjacent office tower"
  },
  "coverageAnalysis": {
    "builtPct": 85,
    "pavedPct": 10,
    "greenPct": 5,
    "segmentationNotes": "Parcel is mostly building footprint with minimal setback"
  },
  "neighborhoodScoring": {
    "walkability": 9,
    "commercialDensity": 8,
    "infrastructure": 7,
    "transitAccess": 8,
    "highlights": ["Downtown location", "Transit-rich", "Mixed-use neighborhood"],
    "concerns": ["Limited parking expansion potential", "Congestion at peak hours"]
  }
}
```

#### How It Works
1. Generates Google Street View + Aerial imagery URLs
2. Encodes images as base64 in Gemini `imageContent` blocks
3. Gemini Vision model analyzes physical characteristics
4. Returns structured JSON via `generateObject()`

---

### 5. **POST /api/vision/compare** — Comparative Parcel Analysis
**Purpose**: Rank & compare 2–5 parcels side-by-side  
**Timeout**: 60s

#### Request
```json
{
  "parcels": [
    {
      "bbl": "LA-1",
      "address": "350 S Grand Ave",
      "streetViewImage": "base64_encoded_image",
      "aerialImage": "base64_encoded_image",
      "shadowScore": 6,
      "coverageBuiltPct": 85,
      "neighborhoodScore": 8,
      "envelopeUtilization": 72,
      "zoningDistrict": "C2-1",
      "lotArea": 5000,
      "maxFAR": 1.5,
      "farUpside": 0.3,
      "builtFAR": 1.2
    },
    {
      "bbl": "LA-2",
      "address": "633 W 5th St",
      "streetViewImage": "base64_encoded_image",
      "aerialImage": "base64_encoded_image",
      "shadowScore": 7,
      "coverageBuiltPct": 70,
      "neighborhoodScore": 7,
      "envelopeUtilization": 60,
      "zoningDistrict": "C4-2",
      "lotArea": 8000,
      "maxFAR": 3.0,
      "farUpside": 1.5,
      "builtFAR": 1.5
    }
  ]
}
```

#### Response
```json
{
  "rankings": [
    {
      "bbl": "LA-2",
      "rank": 1,
      "rationale": "Larger lot with higher upside FAR (1.5 vs 0.3) and better zoning (C4-2)"
    },
    {
      "bbl": "LA-1",
      "rank": 2,
      "rationale": "Better shadow score and neighborhood walkability, but constrained by smaller lot"
    }
  ],
  "comparativeNotes": "LA-2 offers superior development economics (upside for 150+ units vs 50-75 for LA-1)",
  "bestFor": {
    "groundUp": {
      "bbl": "LA-2",
      "reason": "Best FAR upside and lot size for full development"
    },
    "value": {
      "bbl": "LA-1",
      "reason": "Lower acquisition cost likely, walkable location"
    },
    "rehab": {
      "bbl": "LA-1",
      "reason": "Better existing infrastructure"
    }
  },
  "deltas": [
    {
      "metric": "Development Upside",
      "bblA": "LA-1",
      "valueA": "0.3 FAR (50-75 units)",
      "bblB": "LA-2",
      "valueB": "1.5 FAR (150+ units)",
      "insight": "LA-2 enables 3x more density"
    }
  ]
}
```

---

### 6. **GET /api/layers/zoning** — Zoning GeoJSON Tiles
**Purpose**: Fetch zoning polygons for map overlay (zoom-aware bounding box)  
**Timeout**: 45s  
**Caching**: 5 min (s-maxage) + 10 min stale-while-revalidate

#### Request
```
GET /api/layers/zoning?lat=34.0522&lng=-118.2437&zoom=14
```

#### Response
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "zone_cmplt": "C2-1",
        "area_sq_ft": 15000
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[-118.25, 34.05], [-118.24, 34.05], [-118.24, 34.06], [-118.25, 34.06], [-118.25, 34.05]]]
      }
    }
  ]
}
```

#### How It Works
1. **Zoom-aware viewport delta**: Tighter box at high zoom, wider at low zoom
2. **Socrata SODA within_box filter**: Returns GeoJSON from LA City Zoning dataset
3. **Caching**: Aggressive caching for map performance

---

### 7. **POST /api/report** — HTML Report Generation
**Purpose**: Generate downloadable sandboxed HTML report  
**Dependencies**: Requires generated artifact JSON + Gemini API  
**Timeout**: Default Node.js (no serverless limit)

#### Request
```json
{
  "artifact": {
    "parcel": {
      "bbl": "LA-1",
      "address": "350 S Grand Ave",
      "borough": "Los Angeles"
    },
    "fundamentals": {
      "zoning": "C2-1",
      "maxFAR": 1.5,
      "lotArea": 5000
    },
    "analysis": {
      "visionAssessment": { "estimatedStories": 7, "..." },
      "shadowAnalysis": { "shadowScore": 6, "..." }
    }
  },
  "filename": "350_S_Grand_Ave_Report"
}
```

#### Response
**HTML file** (Content-Type: text/html)
- Styled, printable HTML with branding
- Embedded data visualizations (charts, maps)
- Sandboxed (no external script execution)
- Downloadable via `Content-Disposition: attachment`

---

## Client-Side API Integration

### Address Search (Frontend)
**Location**: `/apps/web/components/address-search.tsx`

```typescript
// Uses searchAddress() from lib/api/geosearch.ts
const results = await searchAddress("350 S Grand Ave");
// Returns: GeoSearchResult[]
```

**Current Issue**: Uses hardcoded LA addresses array, not live geocoding

### Parcel Analysis Flow
1. User enters address → calls `searchAddress()` (client-side autocomplete)
2. Selects result → dispatches `PIN_PARCEL` action
3. Calls `/api/parcel` → GET parcel fundamentals
4. Calls `/api/vision` → GET visual assessment (images + analysis)
5. Calls `/api/chat` → Streams agent analysis
6. Optionally calls `/api/vision/compare` → Compare with other parcels
7. Calls `/api/report` → Generate HTML report

---

## Key Library Files

### Data Fetching (`/lib/api/`)
| File | Purpose |
|------|---------|
| `geosearch.ts` | Address → coordinates (NYC legacy, needs LA update) |
| `socrata.ts` | LA Socrata data source wrapper |
| `vision-client.ts` | Client-side vision analysis API calls |
| `vision-compare-client.ts` | Client-side comparative analysis |
| `agent-client.ts` | Client-side chat/agent calls |
| `layer-fetchers.ts` | Fetch map layers (zoning, etc.) |

### Agent Tools (`/lib/tools/`)
Tools available to the Gemini agent for autonomous research:
- `geocode.ts` — Address lookup
- `pluto.ts` — Parcel data (zoning, FAR, lot dimensions)
- `permits.ts` — Building permits
- `violations.ts` — DOB/HPD violations
- `complaints.ts` — 311 complaints
- `sales.ts` — Recent sales comps
- `census.ts` — Demographic data
- `crime.ts` — Crime stats
- `rent.ts` — Fair market rent (HUD)

### Core Logic
| File | Purpose |
|------|---------|
| `zoning.ts` | FAR computation (district rules → maxFAR) |
| `property-analyst.ts` | Gemini agent setup & system prompts |
| `parcel-to-artifact.ts` | Parcel data → report artifact |
| `report-generation.ts` | Artifact → HTML |

---

## Data Sources

### LA City / LA County
| Dataset | Source | Purpose |
|---------|--------|---------|
| Parcels (APN) | LA Socrata `qyra-qm2s` | Parcel boundaries + owner |
| Zoning | LA Socrata `rryw-49uv` | Zone districts |
| TOC Areas | LA ArcGIS | Transit-oriented community tiers |
| Fire Hazard | LA GIS | Fire zone severity |
| Flood Zones | FEMA | Flood mapping |
| Building Data | LADBS | Year built, floors, class |

### APIs
| API | Purpose | Key |
|-----|---------|-----|
| Google Gemini | AI analysis | `GOOGLE_GENERATIVE_AI_API_KEY` |
| Google Maps | Street View + Geocoding | `GOOGLE_MAPS_API_KEY` |
| LA Socrata SODA | Open data queries | Free (rate-limited) |

### Environment Variables (`.env.local`)
```bash
GOOGLE_GENERATIVE_AI_API_KEY=        # Gemini API
GOOGLE_MAPS_API_KEY=                 # Street View + Geocoding
CENSUS_API_KEY=                      # Census Bureau
HUD_API_TOKEN=                       # HUD FMR data
```

---

## Type Definitions

### Core Types (`/lib/types.ts`, `/lib/types/property.ts`)

#### `ParcelData`
The complete parcel analysis object:
```typescript
{
  // Zoning
  zoningDistrict: string
  tocTier: string | null
  tocBonusFAR: number | null
  
  // Lot & Building
  lotArea: number
  buildingArea: number
  yearBuilt: number
  
  // FAR
  builtFAR: number
  maxFAR: number
  farUpside: number
  
  // Constraints
  isFireHazard: boolean
  isFaultHazard: boolean
  isFloodHazard?: boolean
  
  // Computed
  score: 'high' | 'med' | 'low'
  interpretation: string
  scenarios?: DevelopmentScenario[]
}
```

#### `GeoSearchResult`
Address autocomplete result:
```typescript
{
  label: string                    // Full address
  name: string                     // Short name
  borough: string                  // "Los Angeles"
  bbl: string                      // Parcel ID (LA-1, etc.)
  coordinates: [number, number]    // [lng, lat]
}
```

#### `PinnedParcel`
Frontend parcel state:
```typescript
{
  bbl: string
  address: string
  lat: number
  lng: number
  status: 'loading' | 'ready' | 'error'
  data?: ParcelData
  agentProgress?: string
  error?: string
}
```

---

## Error Handling & Status Codes

| Route | 400 | 404 | 500 | 502 |
|-------|-----|-----|-----|-----|
| `/api/geocode` | Missing address param | No results found | — | — |
| `/api/parcel` | Invalid coords | — | Gemini error | Socrata timeout |
| `/api/vision` | Invalid coords | — | Image generation fail | API timeout |
| `/api/vision/compare` | <2 parcels | — | Gemini error | — |
| `/api/layers/zoning` | — | — | — | Socrata error |
| `/api/report` | Invalid artifact | — | Generation error | — |
| `/api/chat` | Invalid JSON | — | Agent error | — |

---

## Known Issues & Migration Tasks

### 🔴 Critical
1. **NYC GeoSearch still hardcoded** (`/api/geocode`)
   - Currently references `https://geosearch.planninglabs.nyc/v2/search`
   - Need to use **Google Maps Geocoding API** + **LA Socrata parcel lookup**
   - Fix: Update `lib/api/geosearch.ts` → Use Google API for LA

2. **Address search returns mock data**
   - `searchAddress()` in `lib/api/geosearch.ts` uses hardcoded LA addresses
   - Frontend shows "Query: '{query}' | Results: {count} | Open: {bool}" debug info
   - **When searching "350 S Grand Ave", it should find the result** ← This is the user's reported issue

### 🟡 Medium Priority
- [ ] Replace NYC-specific PLUTO queries with LA Socrata
- [ ] Add proper error boundaries in React components
- [ ] Implement request rate limiting (Socrata has 50k/day limit)
- [ ] Cache Gemini responses by parcel BBL

### 🟢 Nice-to-Have
- [ ] Add support for comparing >5 parcels
- [ ] Implement saved parcel favorites
- [ ] Export to CSV/PDF
- [ ] Historical FAR trend tracking

---

## Quick Start

### Running Locally
```bash
cd DueIntelligence
pnpm install
pnpm dev  # Starts Next.js on http://localhost:3000
```

### Testing an API Route
```bash
# Test geocode
curl "http://localhost:3000/api/geocode?address=350%20S%20Grand%20Ave"

# Test parcel analysis
curl -X POST http://localhost:3000/api/parcel \
  -H "Content-Type: application/json" \
  -d '{
    "bbl": "LA-1",
    "lat": 34.0522,
    "lng": -118.2437,
    "address": "350 S Grand Ave"
  }'
```

---

**Last Updated**: April 26, 2026  
**Maintainer**: DueIntelligence Team
