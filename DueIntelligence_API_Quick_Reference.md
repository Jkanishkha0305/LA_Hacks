# DueIntelligence — API Quick Reference

## Endpoint Summary

| # | Route | Method | Purpose | Timeout | Status |
|---|-------|--------|---------|---------|--------|
| 1 | `/api/geocode` | GET | Address → coordinates + parcel ID | 10s | 🔴 **NYC Legacy** |
| 2 | `/api/parcel` | POST | Parcel analysis (zoning, FAR, constraints) | 30s | ✅ Working |
| 3 | `/api/vision` | POST | Visual assessment (street + aerial imagery) | 60s | ✅ Working |
| 4 | `/api/vision/compare` | POST | Compare 2–5 parcels side-by-side | 60s | ✅ Working |
| 5 | `/api/chat` | POST | Multi-turn AI agent analysis (streaming) | 60s | ✅ Working |
| 6 | `/api/layers/zoning` | GET | Zoning polygons for map overlay | 45s | ✅ Working |
| 7 | `/api/report` | POST | Generate downloadable HTML report | ∞ | ✅ Working |

---

## Request/Response Patterns

### Pattern 1: Simple Query (Geocode, Zoning Layer)
```
GET /api/endpoint?param1=value1&param2=value2
Response: JSON object or GeoJSON
```

### Pattern 2: Analysis (Parcel, Vision)
```
POST /api/endpoint
Body: {
  "bbl": "LA-1",
  "lat": 34.0522,
  "lng": -118.2437,
  "address": "..."
}
Response: Structured analysis object
```

### Pattern 3: Agent Streaming (Chat)
```
POST /api/chat
Body: {
  "messages": [...],
  "parcelContext": {...}
}
Response: Server-Sent Events (streaming JSON)
```

### Pattern 4: Comparison
```
POST /api/vision/compare
Body: {
  "parcels": [{ ... }, { ... }, ...]
}
Response: Rankings + deltas + best-for
```

### Pattern 5: Report Generation
```
POST /api/report
Body: {
  "artifact": { ... },
  "filename": "..."
}
Response: HTML file (attachment)
```

---

## Dependency Graph

```
Frontend Component
    ↓
Address Search Component (client-side)
    ├─ searchAddress() ─→ /api/geocode (⚠️ NYC legacy)
    └─ Results array (currently mock data)

User Selects Address
    ↓
Parcel Context → Redux dispatch
    ↓
Three parallel API calls:
    ├─ /api/parcel (zoning, FAR, constraints)
    ├─ /api/vision (visual assessment)
    └─ /api/layers/zoning (map overlay)

User initiates analysis
    ├─ /api/chat (streaming multi-turn)
    └─ /api/vision/compare (if comparing multiple)

User downloads report
    ↓
/api/report (final HTML generation)
```

---

## Data Flow: Address Search Issue

### Current Issue (User Reported)
> "When I try to search a LA address nothing shows up"

### Root Cause
**File**: `/apps/web/lib/api/geosearch.ts` line ~90

```typescript
export async function searchAddress(text: string): Promise<GeoSearchResult[]> {
  // ...
  const laAddresses = [
    { label: "350 S Grand Ave, Los Angeles, CA 90071", coordinates: [-118.2519, 34.0522] },
    { label: "633 W 5th St, Los Angeles, CA 90071", coordinates: [-118.2470, 34.0518] },
    { label: "200 N Spring St, Los Angeles, CA 90012", coordinates: [-118.2437, 34.0544] },
    { label: "1111 S Figueroa St, Los Angeles, CA 90015", coordinates: [-118.2839, 34.0430] },
    { label: "700 World Way, Los Angeles, CA 90045", coordinates: [-118.4081, 33.9425] },
  ]

  const filtered = laAddresses.filter(addr => 
    addr.label.toLowerCase().includes(text.toLowerCase())
  )

  // ...return results
}
```

**Problem**: 
- ✅ Hardcoded addresses ARE being searched (substring match)
- ✅ "350 S Grand Ave" should match
- ❓ Frontend shows debug info: "Query: '{query}' | Results: {count} | Open: {bool}"
- ❓ **Likely issue**: Results are being found but NOT displaying in dropdown

### Debug Checklist
1. **Open browser DevTools console** → check for errors
2. **Check network tab** → is `/api/geocode` being called? Or is it client-side only?
3. **Frontend code** (`address-search.tsx` line ~42): `searchAddress()` is client-side, NOT calling `/api/geocode`
4. **Result rendering**: Line ~160 checks `isOpen && results.length > 0` — verify dropdown CSS is not hidden

---

## Mapping: NYC → LA Migration Checklist

### Geocoding
- ❌ NYC: `geosearch.planninglabs.nyc` (Planning Labs specific)
- ✅ LA: Use `Google Maps Geocoding API` + `LA Socrata parcel lookup`

### Parcel Data (PLUTO → LA Assessor)
- ❌ NYC: Socrata dataset `64uk-42ks` (PLUTO)
- ✅ LA: Socrata dataset `qyra-qm2s` (LA Parcels)

### Zoning
- ❌ NYC: ZIMAS overlays
- ✅ LA: Socrata dataset `rryw-49uv` + ArcGIS layers

### IDs
- ❌ NYC: BBL format (1+5+4 digits)
- ✅ LA: APN (Assessor Parcel Number)

### Constraints
- ❌ NYC: Landmarks, historic districts, flood zones
- ✅ LA: Fire hazard zones, Alquist-Priolo fault zones, wetlands

### Density Bonuses
- ❌ NYC: MIH (Mandatory Inclusionary Housing)
- ✅ LA: TOC (Transit-Oriented Communities), Adaptive Reuse Ordinance

---

## Environment Configuration

### Required Keys
```bash
# .env.local (must be set)
GOOGLE_GENERATIVE_AI_API_KEY=AIzaSyA7NSNKWfz57oc8bAqhI7Aq9n2swbt5VhM

# Optional but recommended
GOOGLE_MAPS_API_KEY=<your-key>
```

### What Each Key Does
| Variable | Used By | Routes |
|----------|---------|--------|
| `GOOGLE_GENERATIVE_AI_API_KEY` | Gemini AI | `/api/parcel`, `/api/vision`, `/api/vision/compare`, `/api/chat`, `/api/report` |
| `GOOGLE_MAPS_API_KEY` | Street View + Geocoding | `/api/vision` (imagery), potential future `/api/geocode` upgrade |
| `CENSUS_API_KEY` | Census tool | `/api/chat` (agent research) |
| `HUD_API_TOKEN` | HUD FMR tool | `/api/chat` (agent research) |

---

## Common Workflows

### Workflow 1: Single Parcel Analysis
```
1. User types address in search box
2. searchAddress() filters mock LA addresses
3. User clicks result or "Add" button
4. PIN_PARCEL dispatched → loading state
5. Three parallel requests:
   - POST /api/parcel → ParcelData
   - POST /api/vision → VisionAssessment
   - GET /api/layers/zoning → GeoJSON
6. User sees populated report + map
7. User can click "Analyze" to stream /api/chat results
```

### Workflow 2: Comparative Analysis
```
1. User pins 2-5 parcels (repeat Workflow 1)
2. User clicks "Compare"
3. Collects image assets + scores for all parcels
4. POST /api/vision/compare
5. Shows rankings + deltas + "best for" recommendations
```

### Workflow 3: Report Export
```
1. After analysis complete
2. User clicks "Download Report"
3. POST /api/report with artifact
4. Browser downloads HTML file
5. User opens locally or emails to colleagues
```

---

## File Structure

```
apps/web/
├── app/
│   ├── api/
│   │   ├── geocode/route.ts          🔴 NYC legacy
│   │   ├── parcel/route.ts           ✅ Zoning + FAR
│   │   ├── vision/route.ts           ✅ Visual analysis
│   │   ├── vision/compare/route.ts   ✅ Comparative
│   │   ├── chat/route.ts             ✅ AI streaming
│   │   ├── layers/zoning/route.ts    ✅ Map tiles
│   │   └── report/route.ts           ✅ HTML export
│   ├── page.tsx                      ← Main entry (NextPage)
│   └── layout.tsx
│
├── lib/
│   ├── api/
│   │   ├── geosearch.ts              🔴 NYC hardcoded
│   │   ├── socrata.ts                ✅ LA open data
│   │   ├── vision-client.ts
│   │   ├── vision-compare-client.ts
│   │   ├── agent-client.ts
│   │   └── layer-fetchers.ts
│   │
│   ├── agents/
│   │   └── property-analyst.ts       ← Gemini agent setup
│   │
│   ├── tools/                        ← Agent tools
│   │   ├── geocode.ts
│   │   ├── pluto.ts                  🔴 NYC (needs LA equivalent)
│   │   ├── permits.ts
│   │   ├── violations.ts
│   │   ├── complaints.ts
│   │   ├── sales.ts
│   │   ├── census.ts
│   │   ├── crime.ts
│   │   └── rent.ts
│   │
│   ├── types/
│   │   ├── index.ts                  ← GeoSearchResult, ParcelData, etc.
│   │   ├── property.ts
│   │   ├── api-responses.ts
│   │   └── report.ts
│   │
│   ├── config/
│   │   ├── data-sources.ts           ← Socrata dataset IDs
│   │   ├── models.ts                 ← Gemini model config
│   │   └── env.ts
│   │
│   ├── zoning.ts                     ← FAR computation logic
│   ├── google-provider.ts            ← API key management
│   ├── parcel-to-artifact.ts         ← ParcelData → Report
│   └── report-generation.ts          ← Artifact → HTML
│
├── components/
│   ├── address-search.tsx            🟡 Reported issue here
│   ├── dashboard.tsx
│   ├── sidebar.tsx
│   ├── la-map.tsx
│   ├── parcel-report.tsx
│   ├── parcel-comparison.tsx
│   └── ...
│
└── hooks/
    └── [context hooks for state management]
```

---

## Debugging Tips

### Issue: Search returns no results
1. Check `address-search.tsx` line ~160: 
   ```typescript
   {isOpen && searchError && ( /* error message */ )}
   {isOpen && results.length > 0 && ( /* dropdown */ )}
   ```
   Is the dropdown visible but empty, or not visible at all?

2. Open DevTools → Console, type:
   ```javascript
   // Manually test search function
   import { searchAddress } from '@/lib/api/geosearch'
   await searchAddress('350 S Grand')
   // Should return array of 1 match
   ```

3. Verify `address-search.tsx` line ~50:
   ```typescript
   handleChange(value: string) {
     // ...
     searchAddress(value).then(r => {
       console.log('Search results:', r)  // ← Check console
       setResults(r.slice(0, 5))
       setIsOpen(r.length > 0)
     })
   }
   ```

### Issue: Parcel analysis fails
1. Check `/.env.local` → `GOOGLE_GENERATIVE_AI_API_KEY` is set
2. Check browser DevTools → Network tab → `/api/parcel` response
3. Check terminal logs → Any Gemini errors?

### Issue: Vision analysis returns blank
1. Verify `GOOGLE_MAPS_API_KEY` is set (needed for Street View URLs)
2. Check `/api/vision` response → does it include image URLs?
3. Verify Gemini can access base64-encoded images

---

## Performance Notes

- **Map tiles** (`/api/layers/zoning`): Aggressively cached (5m + 10m stale)
- **Parcel analysis** (`/api/parcel`): Not cached (always fresh)
- **Vision analysis** (`/api/vision`): Not cached (images change)
- **Agent chat** (`/api/chat`): Streamed (not cached)
- **Report generation** (`/api/report`): Generated on-demand

**Rate Limiting**: LA Socrata has 50k requests/day limit (shared across all city services). Monitor in `.env.local` if seeing 429 errors.

---

**Generated**: April 26, 2026  
**Next Steps**: Fix address search issue, then migrate NYC endpoints to LA
