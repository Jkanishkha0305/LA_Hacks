# DueIntelligence API & Authentication Report

**Generated**: April 26, 2026  
**Repository**: `/home/asus/LA_Hacks/test`  
**Status**: Analysis Complete

---

## Executive Summary

The DueIntelligence application is a multi-API real estate development analysis platform that integrates **5 external APIs**, **7 internal routes**, and **9 data tools** to provide comprehensive parcel analysis for property developers in LA.

- **Required API Keys**: 3
- **Optional API Keys**: 2
- **Total External API Integrations**: 5
- **Internal API Routes**: 7
- **Data Sources**: NYC & Federal APIs

---

## Section 1: API Tokens & Authentication

### 1.1 Required API Keys (Must Configure)

| # | Token Name | Service | Purpose | Status | How to Get |
|---|------------|---------|---------|--------|-----------|
| 1 | `GOOGLE_MAPS_API_KEY` | Google Cloud | Street View & satellite imagery | **REQUIRED** | https://console.cloud.google.com/apis/credentials |
| 2 | `CENSUS_API_KEY` | US Census Bureau | Income & demographic data | **REQUIRED** | https://api.census.gov/data/key_signup.html |
| 3 | `HUD_API_TOKEN` | HUD User API | Fair Market Rent data | **REQUIRED** | https://www.huduser.gov/hudapi/public/register |

**Status**: ⚠️ Currently **empty in `.env.example`** — app will not run without these three keys configured.

### 1.2 Optional API Keys

| # | Token Name | Service | Purpose | Status | Default Behavior |
|---|------------|---------|---------|--------|------------------|
| 4 | `GOOGLE_GENERATIVE_AI_API_KEY` | Google Gemini AI | Server-side fallback for parcel/vision analysis | Optional | Users provide via UI if not set |
| 5 | `SOCRATA_APP_TOKEN` | NYC Open Data | Rate limiting for PLUTO queries | Optional | Works without, but slower rate limits |

**Status**: ⚠️ Optional but recommended for production use.

---

## Section 2: Internal API Endpoints

### 2.1 Endpoint Summary Table

| # | Route | Method | Purpose | Timeout | Dependencies | Status |
|---|-------|--------|---------|---------|---|--------|
| 1 | `/api/geocode` | GET | Address → coordinates + BBL | 10s | Geosearch API | NYC Legacy |
| 2 | `/api/parcel` | POST | Parcel analysis (zoning, FAR, constraints) | 30s | PLUTO, Gemini, Zoning GIS | ✅ Working |
| 3 | `/api/vision` | POST | Visual assessment (street + aerial imagery) | 60s | Google Street View, Gemini | ✅ Working |
| 4 | `/api/vision/compare` | POST | Compare 2–5 parcels side-by-side | 60s | Google Street View, Gemini | ✅ Working |
| 5 | `/api/chat` | POST | Multi-turn AI agent analysis (streaming) | 60s | Gemini, Census, HUD, Socrata | ✅ Working |
| 6 | `/api/layers/zoning` | GET | Zoning polygons for map overlay | 45s | ArcGIS Feature Server, Socrata | ✅ Working |
| 7 | `/api/report` | POST | Generate downloadable HTML report | ∞ | Artifact data | ✅ Working |

---

## Section 3: External API Integrations

### 3.1 NYC PLUTO Data (Socrata/SODA)

**Endpoint**: `https://data.cityofnewyork.us/api/views/{dataset_id}/rows.json`

**Used By**: `/api/parcel`, `/api/chat`

**Sample Request**:
```bash
curl "https://data.cityofnewyork.us/api/views/64uk-42ks/rows.json?$where=bbl='1234567890'"
```

**Sample Response**:
```json
{
  "bbl": "1234567890",
  "address": "350 5th Ave, New York, NY 10118",
  "bldgclass": "R1",
  "lotarea": 10000,
  "bldgarea": 50000,
  "zonedist1": "C6-4M",
  "builtfar": 12.5,
  "residfar": 10.0,
  "commfar": 12.5,
  "yearbuilt": 1950,
  "numfloors": 8,
  "ownername": "ROCKEFELLER CENTER INC"
}
```

**Rate Limit**: 50,000 requests/day (public), higher with SOCRATA_APP_TOKEN

**Timeout**: 10 seconds

---

### 3.2 Google Generative AI (Gemini)

**Endpoint**: `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent`

**Used By**: `/api/parcel`, `/api/vision`, `/api/vision/compare`, `/api/chat`

**Authentication**: Header `x-goog-api-key` or Bearer token

**Sample Request**:
```json
{
  "contents": [{
    "parts": [{
      "text": "Analyze this street view image for development potential"
    }],
    "role": "user"
  }]
}
```

**Sample Response**:
```json
{
  "candidates": [{
    "content": {
      "parts": [{
        "text": "This 8-story R1 building appears to be in good condition..."
      }],
      "role": "model"
    }
  }]
}
```

**Rate Limit**: Depends on plan (free tier: 60 requests/min)

**Timeout**: 60 seconds

---

### 3.3 US Census Bureau API

**Endpoint**: `https://api.census.gov/data/{year}/acs/acs5`

**Used By**: `/api/chat` (census agent tool)

**Sample Request**:
```bash
curl "https://api.census.gov/data/2022/acs/acs5?get=NAME,B19013_001E&for=tract:*&in=state:36&key=YOUR_KEY"
```

**Sample Response**:
```json
[
  ["NAME", "B19013_001E", "state", "tract"],
  ["Census Tract 123.45, New York County, New York", "75000", "36", "123.45"]
]
```

**Data Available**: Median household income, employment, education, housing, health

**Rate Limit**: Unlimited (free tier)

**Timeout**: 10 seconds

---

### 3.4 HUD User API

**Endpoint**: `https://www.huduser.gov/hudapi/public/fmr/data/{year}`

**Used By**: `/api/chat` (rent comparison agent tool)

**Sample Request**:
```bash
curl "https://www.huduser.gov/hudapi/public/fmr/data/2024?type=countyFmr&fips=36061&key=YOUR_TOKEN"
```

**Sample Response**:
```json
{
  "data": {
    "fmr": {
      "36061": {
        "fmr_0": 1200,  # Studio
        "fmr_1": 1400,  # 1 Bed
        "fmr_2": 1700,  # 2 Bed
        "fmr_3": 2100,  # 3 Bed
        "fmr_4": 2500   # 4 Bed
      }
    }
  }
}
```

**Rate Limit**: 600 requests/hour

**Timeout**: 10 seconds

---

### 3.5 Google Maps API

**Endpoint**: `https://maps.googleapis.com/maps/api/streetview`

**Used By**: `/api/vision`, `/api/chat`

**Sample Request**:
```bash
curl "https://maps.googleapis.com/maps/api/streetview?location=40.7549,-73.9840&key=YOUR_KEY"
```

**Returns**: Street View image (PNG) at specified lat/lng

**Rate Limit**: 25,000 requests/day (standard plan)

**Timeout**: 10 seconds

---

### 3.6 NYC Socrata Datasets (Agent Tools)

Additional datasets available for agent queries:

| Dataset | Resource ID | Used For | Sample Data |
|---------|------------|----------|------------|
| PLUTO | 64uk-42ks | Property analysis | Building class, FAR, zoning |
| Violations | 3q76-2yzs | Building violations | Violation count, severity |
| Permits | 6x4e-h5sv | Construction permits | Permit type, status |
| 311 Complaints | a2nx-4u46 | Complaint analysis | Complaint type, frequency |
| Sales | 5v6h-gdp7 | Market data | Sale price, date, type |
| Crime | kkmc-chb2 | Safety analysis | Crime type, count |

---

## Section 4: Request/Response Flow Diagrams

### 4.1 Address Search Flow

```
User enters address "350 5th Ave"
         ↓
POST /api/geocode?address=350%20Fifth%20Ave
         ↓
   Geosearch API (NYC)
         ↓
Response: {
  "bbl": "1001234567",
  "lat": 40.7549,
  "lng": -73.9840
}
         ↓
Frontend stores coordinates + BBL
```

### 4.2 Parcel Analysis Flow (Full Pipeline)

```
User clicks on parcel
         ↓
POST /api/parcel
   Input: {
     "bbl": "1001234567",
     "lat": 40.7549,
     "lng": -73.9840,
     "address": "350 5th Ave"
   }
         ↓
   [Parallel API Calls]
   ├─ Socrata PLUTO API → Building class, FAR, zoning
   ├─ Zoning GIS API → Zoning overlays
   ├─ Flood Zone API → Hazard info
   ├─ MIH Database → Affordability requirements
   └─ Gemini API (analyze + score)
         ↓
Response: {
  "parcelData": {
    "bbl": "1001234567",
    "address": "350 5th Ave",
    "zoning": "C6-4M",
    "maxFAR": 12.5,
    "analysis": "This C6-4M lot permits..."
  },
  "scenarios": [
    { "buildingHeight": 150, "units": 200, ... },
    ...
  ]
}
         ↓
Frontend displays analysis + scenarios
```

### 4.3 Visual Assessment Flow

```
User requests vision analysis
         ↓
POST /api/vision
   Input: {
     "bbl", "lat", "lng", "address"
   }
         ↓
   [Parallel]
   ├─ Google Street View API (4 angles: N, E, S, W)
   ├─ Google Satellite API
   └─ Gemini Vision API (analyze)
         ↓
Response: {
  "streetAssessment": {
    "estimatedStories": 8,
    "currentUse": "commercial",
    "condition": "good",
    "buildingType": "steel frame",
    "lotFeatures": ["corner lot", "ground floor retail"]
  },
  "shadowAnalysis": {
    "shadowScore": 8,
    "estimatedHeightFt": 85,
    "shadowDirection": "north"
  },
  "coverage": {
    "builtPct": 95,
    "pavedPct": 5,
    "greenPct": 0
  }
}
         ↓
Frontend displays visual insights
```

### 4.4 AI Chat Flow (Streaming)

```
User asks: "What's the rental market like here?"
         ↓
POST /api/chat
   Input: {
     "messages": [
       { "role": "user", "content": "What's the rental market like?" }
     ],
     "parcelContext": {
       "address": "350 5th Ave",
       "bbl": "1001234567",
       ...
     }
   }
         ↓
   Gemini Agent spawns tool calls:
   ├─ plutoTool() → Socrata PLUTO
   ├─ hudTool() → HUD FMR data
   ├─ censusIncomeTool() → Census API
   └─ crimeTool() → Socrata crime data
         ↓
   [Streaming Response]
   Server-Sent Events (SSE):
   
   event: step
   data: {"type":"tool_call","tool":"hudTool"}
   
   event: step
   data: {"type":"tool_result","content":"Fair Market Rent: $2,100/mo"}
   
   event: step
   data: {"type":"text","content":"Based on HUD data, rental..."}
         ↓
Frontend renders streaming text + tool results
```

---

## Section 5: Environment Configuration

### 5.1 Required `.env` Variables

```bash
# ─── REQUIRED (App will not start without these) ───

# Google Maps API Key
# APIs needed: Maps Static API, Street View Static API, Geolocation API
GOOGLE_MAPS_API_KEY=AIzaSyD...your_key_here...

# US Census Bureau API Key
# Free tier: unlimited requests/day
CENSUS_API_KEY=your_census_key_here

# HUD User API Token
# Register at: https://www.huduser.gov/hudapi/public/register
HUD_API_TOKEN=your_hud_token_here

# ─── OPTIONAL (Recommended for production) ───

# Google Generative AI API Key (Gemini)
# If not set, users must provide their own via UI
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_key_here

# Socrata App Token (NYC Open Data)
# Increases rate limit from 50k to 200k requests/day
SOCRATA_APP_TOKEN=your_socrata_token_here

# NYC PLUTO Dataset Resource ID
# Default: 64uk-42ks (24v4 - 2024 version)
# Update when new PLUTO version is released
PLUTO_RESOURCE_ID=64uk-42ks
```

### 5.2 Validation & Error Handling

All required keys are validated at **build time** using Zod schema:

```typescript
const envSchema = z.object({
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().optional().default(""),
  GOOGLE_MAPS_API_KEY: z.string().min(1, "GOOGLE_MAPS_API_KEY is required"),
  SOCRATA_APP_TOKEN: z.string().optional().default(""),
  CENSUS_API_KEY: z.string().min(1, "CENSUS_API_KEY is required"),
  HUD_API_TOKEN: z.string().min(1, "HUD_API_TOKEN is required"),
})
```

**Error Message if Missing**:
```
Missing required environment variables:
  GOOGLE_MAPS_API_KEY: GOOGLE_MAPS_API_KEY is required
  CENSUS_API_KEY: CENSUS_API_KEY is required
  HUD_API_TOKEN: HUD_API_TOKEN is required
```

---

## Section 6: Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (Next.js)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Address      │  │ Parcel Info  │  │ Chat Panel   │      │
│  │ Search       │  │ & Analysis   │  │ (Streaming)  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└────────────┬─────────────────────────────────────────────────┘
             │
    ┌────────┴────────────────────────────────┐
    │                                         │
    ▼                                         ▼
┌────────────────┐                ┌──────────────────┐
│ /api/geocode   │                │ /api/parcel      │
│ /api/vision    │                │ /api/vision      │
│ /api/chat      │                │ /api/chat        │
└────────────────┘                └──────────────────┘
    │                                │         │         │
    │                                ▼         ▼         ▼
    │                         ┌────────────────────────────┐
    │                         │   External APIs            │
    │                         ├────────────────────────────┤
    │                         │ • Socrata PLUTO (NYC)      │
    │                         │ • Zoning GIS (ArcGIS)      │
    │                         │ • Census API               │
    │                         │ • HUD API                  │
    │                         │ • Google Maps              │
    │                         │ • Gemini Vision AI         │
    │                         └────────────────────────────┘
    │
    └─────────────────────────────────────────────────────►
                            Cache/Redis (optional)
```

---

## Section 7: API Rate Limits & Timeouts

| API | Rate Limit | Timeout | Cost |
|-----|-----------|---------|------|
| Socrata PLUTO | 50k/day (public), 200k/day (with token) | 10s | Free |
| Google Maps | 25k/day (standard) | 10s | $0.005/request after free tier |
| Google Gemini | 60/min (free), 100/min (paid) | 60s | $0.0005/request (free tier available) |
| Census Bureau | Unlimited | 10s | Free |
| HUD API | 600/hour | 10s | Free |

---

## Section 8: Setup Checklist

- [ ] Generate Google Maps API Key
  - [ ] Enable Maps Static API
  - [ ] Enable Street View Static API
- [ ] Generate Census API Key
- [ ] Register for HUD API Token
- [ ] (Optional) Generate Gemini API Key
- [ ] (Optional) Generate Socrata App Token
- [ ] Create `.env` file with all keys
- [ ] Run `pnpm install`
- [ ] Run `pnpm build`
- [ ] Verify with `pnpm test` or manual API calls

---

## Section 9: Troubleshooting

### "PLUTO data not found for this BBL"
- **Cause**: Invalid BBL or parcel outside NYC
- **Fix**: Verify 10-digit BBL format (e.g., "1001234567")

### "Timeout waiting for vision analysis"
- **Cause**: Slow Google Street View or Gemini API
- **Fix**: Check network, retry, or increase timeout (default: 60s)

### "Missing required environment variables"
- **Cause**: One or more API keys not configured
- **Fix**: Check `.env` file has all required keys

### "Rate limit exceeded"
- **Cause**: Too many API calls in short time window
- **Fix**: Add SOCRATA_APP_TOKEN for better limits, implement request queuing

---

## Section 10: Summary

**Total API Integration Count**: 5 external + 7 internal = 12 endpoints  
**Required Configuration**: 3 API keys  
**Recommended Configuration**: 5 API keys  
**Data Sources**: NYC (Socrata), US Federal (Census, HUD), Google Cloud  
**Status**: ✅ Fully functional when configured  

**Next Steps**:
1. Configure all 3 required API keys
2. Test `/api/geocode` with sample address
3. Test `/api/parcel` with sample BBL
4. Test `/api/vision` with sample coordinates
5. Test `/api/chat` with sample conversation

---

**Report Generated**: April 26, 2026  
**Repository**: https://github.com/ashkanrdn/DueIntelligence  
**Local Clone**: /home/asus/LA_Hacks/test
