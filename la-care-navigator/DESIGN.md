# LA Care Navigator — Design Document

## System Architecture

### High-Level Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           LA CARE NAVIGATOR                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐             │
│  │ User Portal  │    │Admin Portal  │    │Agentverse    │             │
│  │  :9000       │    │  :9001       │    │  Agents      │             │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘             │
│         │                   │                   │                      │
│         └───────────────────┼───────────────────┘                      │
│                             │                                          │
│                    ┌────────▼────────┐                               │
│                    │   app.py (API)   │                               │
│                    │   :8000          │                               │
│                    └────────┬────────┘                               │
│                             │                                          │
│         ┌───────────────────┼───────────────────┐                    │
│         │                   │                   │                      │
│  ┌──────▼──────┐    ┌──────▼──────┐    ┌──────▼──────┐             │
│  │   Agent     │    │  Pipeline   │    │   Guardrails│             │
│  │  (ReAct)    │    │  (Core)     │    │  (Safety)   │             │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘             │
│         │                   │                   │                      │
│  ┌──────▼───────────────────▼───────────────────▼──────┐        │
│  │                    DATA LAYER                                │        │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐           │        │
│  │  │ Resource   │  │ Knowledge  │  │  Graph     │           │        │
│  │  │Mart (Parquet)│ │  Graph    │  │  Embeddings│           │        │
│  │  └────────────┘  └────────────┘  └────────────┘           │        │
│  └────────────────────────────────────────────────────────────┘        │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────┐        │
│  │               EXTERNAL SERVICES                              │        │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐     │        │
│  │  │ Ollama   │ │ Nominatim│ │ LA Metro │ │ElevenLabs│     │        │
│  │  │(LLM)    │ │(Geocode) │ │   GTFS   │ │ (Voice)  │     │        │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘     │        │
│  └────────────────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
User Query → app.py → agent (ReAct)
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
  find_resources    get_directions    calculate_eligibility
        │                 │                 │
        ▼                 ▼                 ▼
  resource_mart      LA Metro          eligibility_rules
   (Parquet)         OSRM              (US federal + CA)
        │                 │                 │
        └─────────────────┼─────────────────┘
                          │
                          ▼
                    Response to user
                    (voice + UI render)
```

---

## Decision Log: Why LA-Specific Choices

### D1: Data Source — CalFresh CF 285 over SAR-7

**Question:** Which benefit form to prioritize?

| Option | Form | Agency | Complexity |
|--------|------|--------|-------------|
| ✅ CF 285 | CalFresh Application | Los Angeles County DPSS | Single-page, entry-level |
| ❌ SAR-7 | Semi-Annual Reporting | CDSS | Recertification, complex |

**Decision:** CF 285 — simpler for first-time applicants, DPSS processes it fastest, fits kiosk use case.

---

### D2: Voice-First Kiosk Mode

**Question:** Why voice over tap-only?

**Rationale:**
- LA has 3.5M non-English-speaking residents (25% Spanish-dominant)
- Skid Row / MacArthur Park kiosks need hands-free operation
- Touchscreens in shelters are often broken — voice is more robust

---

### D3: Spanish Language Priority

**Question:** EN/ES toggle on launch vs. later?

**Decision:** Launch with EN/ES toggle — 47% of LA County speaks Spanish at home.

---

### D4: LA Metro over Google Maps API

**Question:** Which transit routing?

| Option | Cost | Coverage | Auth |
|--------|------|----------|------|
| ✅ LACMTA GTFS | Free (GitLab) | LA County | None |
| ❌ Google Transit | $10K/year | Global | API key |

**Decision:** LACMTA GTFS via GitLab — free, accurate, no vendor lock-in.

---

### D5: GX10 Utilization Story

**Question:** How to leverage the GB10 Grace Blackwell?

| Component | Offload | GPU-Accelerated |
|-----------|---------|------------------|
| Ollama | ❌ Local | llama3 + llama3.2-vision:11b |
| Guardrails | ❌ Local | NeMo Guardrails (if fits) |
| Form OCR | ✅ Cloud | Tesseract (CPU fallback works) |
| Graph Inference | ❌ Local | CPU acceptable |

**Decision:**
- Primary: Ollama runs LOCAL on GX10 (full GPU utilization)
- Badge shows "0 cloud calls" to prove edge inference
- Cloud fallback only if Ollama fails

---

### D6: Neighborhood Fallback — Which 10?

**Question:** Which LA neighborhoods to include?

| Tier 1 (Critical) | Reason |
|------------------|--------|
| Skid Row | Highest homeless concentration |
| MacArthur Park | Dense immigrant community |
| Downtown | Central transit hub |
| South LA | Food desert + healthcare gap |
| Boyle Heights | Latinx community center |

| Tier 2 (Important) | Reason |
|--------------------|--------|
| Koreatown | Dense, transit-accessible |
| Hollywood | Entertainment industry, housing crisis |
| Echo Park | Gentrification pressure |
| Westlake | Near MacArthur Park |
| Pershing Square | Demo case location |

---

### D7: Agentverse Registration

**Question:** Why uAgents over direct API?

**Decision:**
- Fetch.ai Agentverse provides discovery + protocol
- Three agents = three touchpoints for judges
- Chat Protocol = built-in fallbacks

---

## Dataset Sources

| Source | URL | Content | Update Strategy |
|--------|-----|---------|-----------------|
| LAHSA | lahsainla.org | Shelters, beds | Weekly scrape |
| 211 LA | 211la.org | All services | Daily scrape |
| data.lacity.org | data.lacity.org | City resources | Manual sync |
| LA Metro GTFS | gitlab.com/LACMTA/gtfs_bus | Transit routes | Daily pull |

---

## Form Field Anchors (CF 285)

| Field | PDF Anchor | Coordinate (PDF Box) |
|-------|-----------|---------------------|
| Full Name | "Your Full Name" | (50, 650, 400, 680) |
| Date of Birth | "Date of Birth" | (50, 610, 200, 640) |
| SSN | "Social Security" | (250, 610, 400, 640) |
| Address | "Street Address" | (50, 570, 400, 600) |
| City | "City" | (50, 530, 200, 560) |
| ZIP | "ZIP Code" | (250, 530, 350, 560) |
| Household Size | "Number in Household" | (50, 490, 150, 520) |
| Signature | "Signature" | (50, 50, 300, 100) |
| Date | "Date" | (320, 50, 400, 100) |

---

## Crisis Routing

| Crisis Type | Number | Notes |
|-------------|--------|-------|
| Suicide | 988 | National |
| LA County DMH ACCESS | 800-854-7771 | LA-specific mental health |
| LA DV Hotline | 800-978-3600 | Domestic violence |
| LA STD Clinic | 213-473-0700 | Sexual health |