# LA Care Navigator — API Documentation

## Overview
All endpoints run on port 8000 (configurable via `PORT` env var).

---

## User Portal (port 9000 → proxied to 8000)

### GET /api/config
Get client-facing configuration.

**Response:**
```json
{
  "app_name": "LA Care Navigator",
  "version": "1.0.0",
  "llm_model": "llama3",
  "language_toggle": true,
  "available_languages": ["en", "es"],
  "map_bbox": {
    "south": 34.0,
    "west": -118.7,
    "north": 34.4,
    "east": -118.1
  },
  "neighborhoods": [
    "Skid Row",
    "MacArthur Park",
    "Downtown",
    "South LA",
    "Boyle Heights",
    "Koreatown",
    "Hollywood",
    "Echo Park",
    "Westlake",
    "Pershing Square"
  ]
}
```

---

### POST /api/query
Submit a natural language query to the agent.

**Request:**
```json
{
  "query": "I need a place to stay tonight",
  "location": "Pershing Square",
  "lat": 34.0522,
  "lon": -118.2551,
  "language": "en",
  "case_id": null
}
```

**Response:**
```json
{
  "response": "I found 3 shelters within 2 miles of Pershing Square...",
  "case_id": "LA-2026-0001",
  "suggested_resources": [
    {
      "name": "Downtown Women's Center",
      "address": "442 S San Pedro St, Los Angeles, CA 90013",
      "type": "shelter",
      "lat": 34.0462,
      "lon": -118.2476,
      "distance_miles": 0.4,
      "phone": "213-680-0148",
      "eligibility": "women only, 18+",
      "bed_availability": "call ahead"
    }
  ],
  "directions": {
    "mode": "walk",
    "steps": [
      "Head west on 6th St toward Main St (0.1 mi)",
      "Turn left onto S Main St (0.2 mi)",
      "Arrive at 442 S San Pedro St"
    ],
    "total_walk_miles": 0.4
  },
  "safety_check": null,
  "language": "en"
}
```

---

### GET /api/status
Poll for GX10 status (for status badge).

**Response:**
```json
{
  "gx10": true,
  "model": "llama3",
  "cloud_calls": 0,
  "uptime_seconds": 3600
}
```

---

### POST /api/voice/synthesize
Synthesize text to speech via ElevenLabs.

**Request:**
```json
{
  "text": "I found 3 shelters near you",
  "language": "en",
  "voice_id": "rachel"
}
```

**Response:**
```audio/wav (binary)
```

---

### POST /api/voice/transcribe
Transcribe speech to text.

**Request:** multipart/form-data with audio file

**Response:**
```json
{
  "text": "where can i get food",
  "language": "en",
  "confidence": 0.92
}
```

---

### GET /api/resources
Search resources by query.

**Query Params:**
- `q` — search query
- `lat` — latitude
- `lon` — longitude
- `radius_miles` — default 5
- `type` — resource type (shelter, food_bank, clinic, etc.)

**Response:**
```json
{
  "resources": [
    {
      "id": "org-001",
      "name": "LA Food Bank",
      "address": "1734 E 37th St, Los Angeles, CA 90011",
      "type": "food_bank",
      "lat": 34.0321,
      "lon": -118.2420,
      "distance_miles": 2.1,
      "phone": "323-234-2220",
      "hours": "Mon-Fri 9am-5pm",
      "eligibility": "anyone",
      "languages": ["en", "es"]
    }
  ]
}
```

---

### GET /api/eligibility
Calculate benefit eligibility.

**Query Params:**
- `household_size`
- `annual_income`
- `has_children`
- `is_pregnant`
- `has_disability`
- `citizen_status`

**Response:**
```json
{
  "programs": [
    {
      "program": "CalFresh",
      "monthly_benefit": 425,
      "status": "likely_eligible",
      "requirements_met": true,
      "next_steps": ["submit CF 285", "attend interview"]
    },
    {
      "program": "Medi-Cal",
      "monthly_benefit": 0,
      "status": "eligible",
      "requirements_met": true,
      "next_steps": ["submit MC 210"]
    }
  ]
}
```

---

### POST /api/forms/fill
Fill a PDF form from ID.

**Request:**
```json
{
  "form_type": "cf285",
  "id_image": "<base64>",
  "manual_fields": {
    "household_size": 4,
    "income": 28000
  }
}
```

**Response:**
```json
{
  "filled_pdf": "<base64>",
  "filled_fields": {
    "name": "MARIA GARCIA",
    "dob": "01/15/1988",
    "ssn": "***-**-1234",
    "address": "1234 E 103rd St, Los Angeles, CA 90002",
    "city": "Los Angeles",
    "zip": "90002",
    "household_size": 4
  }
}
```

---

## Admin Portal (port 9001)

### GET /api/admin/cases
List all cases.

**Response:**
```json
{
  "cases": [
    {
      "case_id": "LA-2026-0001",
      "created_at": "2026-04-25T19:00:00Z",
      "status": "open",
      "user_query": "need shelter tonight",
      "neighborhood": "Pershing Square",
      "resources_recommended": 3,
      "resources_chosen": 1,
      "checked_in": false
    }
  ]
}
```

---

### GET /api/admin/cases/:case_id
Get full case details.

**Response:**
```json
{
  "case_id": "LA-2026-0001",
  "created_at": "2026-04-25T19:00:00Z",
  "status": "open",
  "user_query": "need shelter tonight",
  "location": {
    "address": "Pershing Square, Los Angeles, CA",
    "lat": 34.0522,
    "lon": -118.2551
  },
  "conversation": [
    {"role": "user", "content": "I need a place to stay tonight", "timestamp": "..."},
    {"role": "assistant", "content": "I found 3 shelters...", "timestamp": "..."}
  ],
  "resources_recommended": [...],
  "resource_chosen": {...},
  "forms_filled": [...],
  "progress": {
    "needs_assessment": "complete",
    "resource_search": "complete",
    "directions": "complete",
    "form_fill": "pending"
  }
}
```

---

### POST /api/admin/cases/:case_id/forms/fill
Fill forms for a case using uploaded ID.

**Request:** multipart/form-data with ID image + form types

**Response:**
```json
{
  "filled_forms": [
    {"form": "cf285", "filled_pdf": "base64...", "status": "success"},
    {"form": "mc210", "filled_pdf": "base64...", "status": "success"}
  ]
}
```

---

### GET /api/admin/resources
Admin view of all resources.

---

## Agentverse Agents

### POST /api/agent/find_la_resources
Find resources — wraps core `find_resources`.

---

### POST /api/agent/fill_calfresh_form
Fill CalFresh — wraps `form_filler.py`.

---

### POST /api/agent/check_eligibility
Check eligibility — wraps `eligibility.py`.

---

## LA-Specific Addresses for Testing

| Scenario | Address | Lat/Lon |
|----------|---------|---------|
| Demo | Pershing Square, LA | 34.0522, -118.2551 |
| Skid Row | 5th & San Pedro, LA | 34.0419, -118.2461 |
| South LA | 103rd & Wilmington, LA | 33.9428, -118.2458 |
| Boyle Heights | 1st & Boyle, LA | 34.0393, -118.2103 |
| MacArthur Park | 6th & Park, LA | 34.0621, -118.2580 |