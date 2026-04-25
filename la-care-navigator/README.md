# LA Care Navigator

An AI-powered caseworker + kiosk system for Los Angeles County social services. Built for **LA Hacks 2026**.

> This project is based on nyc_hack (MIT licensed, © 2026). See [ATTRIBUTION.md](./ATTRIBUTION.md) for the full breakdown.

---

## What It Does

LA Care Navigator helps LA residents access social services through:
- **AI caseworker** — natural language needs assessment (shelter, food, healthcare, benefits)
- **Resource discovery** — finds services sorted by distance from user's location
- **Form automation** — fills CalFresh CF 285 + Medi-Cal MC 210 from ID photos
- **Voice interface** — English + Spanish, ElevenLabs TTS/STT
- **Agentverse agents** — three Fetch.ai uAgents for discovery, eligibility, form-fill
- **GX10-native** — runs fully on ASUS GX10 Grace Blackwell, zero cloud calls

---

## Quickstart

### Prerequisites

```bash
docker --version  # need v24+
docker compose version  # need v2+
```

### Run It

```bash
cd la-care-navigator
./start.sh
```

**Open in browser:**
| Portal | URL | First thing to try |
|---|---|---|
| **User** | [http://localhost:9000](http://localhost:9000) | Set location to *"Pershing Square"* → *"I need shelter tonight"* |
| **Admin** | [http://localhost:9001](http://localhost:9001) | Click any case → fill forms from ID |

---

## Tech Stack

| Layer | Technology |
|-------|-------------|
| LLM | llama3 (Ollama, local) |
| Vision | llama3.2-vision:11b |
| Guardrails | NeMo Guardrails |
| Map | deck.gl |
| Voice | ElevenLabs TTS/STT |
| Agent Protocol | Fetch.ai Agentverse |
| Hardware | ASUS GX10 Grace Blackwell |

---

## LA-Specific Features

- **30+ LA resources** — shelters, food banks, clinics (seeded + scraped from LAHSA, 211 LA)
- **CalFresh CF 285** — pre-filled from ID photo
- **Medi-Cal MC 210** — pre-filled from ID photo
- **LA Metro routing** — GTFS-based transit directions
- **10 LA neighborhoods** — Skid Row, MacArthur Park, Hollywood, Boyle Heights, South LA, Koreatown, Pershing Square, Echo Park, Westlake, Downtown
- **Spanish UI** — full EN/ES toggle
- **LA crisis hotlines** — 988, LA County DMH ACCESS (800-854-7771), DV (800-978-3600)

---

## Demo Script

Watch the 90-second demo:

1. Set location → Pershing Square
2. Query → "need shelter tonight"
3. See 3 nearest shelters (walk directions)
4. Toggle Spanish → "¿Necesita algo más?"
5. Check eligibility → CalFresh $768/month
6. Upload ID → CF 285 auto-filled
7. GX10 badge → "🟢 GX10 · 0 cloud calls"

See [DEMO.md](./DEMO.md) for full script.

---

## Project Structure

```
la-care-navigator/
├── api.py                    # Flask server
├── admin_server.py           # Admin portal
├── app.py                    # User portal
├── data/
│   └── resource_mart.parquet  # LA resources
├── pipeline/
│   ├── agent.py             # ReAct agent
│   ├── eligibility.py      # Eligibility rules
│   ├── form_filler.py       # PDF coordinate maps
│   ├── geocode.py          # LA fallback
│   ├── routing.py          # LA Metro GTFS
│   └── ...
├── frontend/
│   ├── index.html          # User portal UI
│   ├── admin.html         # Admin portal
│   └── voice.js           # ElevenLabs wrapper
├── agentverse/
│   ├── find_la_resources.py
│   ├── fill_calfresh_form.py
│   ├── check_eligibility.py
│   └── register.sh
├── samples/
│   ├── forms/
│   │   ├── cf285_blank.pdf
│   │   └── mc210_blank.pdf
│   └── sample_id.jpg
├── guardrails/
│   └── config.yml          # Crisis hotlines
├── agent/
│   └── config.yml          # System prompt
└── scripts/
    ├── build_la_mart.py   # LA scraper
    └── seed_la_resources.py
```

---

## Hardware

Runs on **ASUS GX10 Grace Blackwell** (128GB unified memory):
- Ollama with llama3 + vision fully local
- Status badge shows "🟢 GX10 · 0 cloud calls"
- No cloud dependency — works offline

---

## Tracks Targeted

- **Catalyst for Care** — AI for social services
- **ASUS** — GX10 deployment story
- **Fetch.ai Agentverse** — 3 uAgents
- **ElevenLabs** — Voice EN/ES

---

## License

MIT License — see [ATTRIBUTION.md](./ATTRIBUTION.md).

---

## Links

- [ATTRIBUTION.md](./ATTRIBUTION.md) — nyc_hack vs new
- [PLAN.md](./PLAN.md) — 28-hour timeline
- [DESIGN.md](./DESIGN.md) — architecture + decisions
- [API.md](./API.md) — endpoint documentation
- [DEMO.md](./DEMO.md) — 90-second script