# LA Care Navigator — Demo Script

**Duration:** 90 seconds
**Perspective:** Judge walks up to kiosk

---

## Pre-Launch Checks
- [ ] Kiosk browser open to http://localhost:9000
- [ ] Voice input enabled (click microphone icon)
- [ ] ElevenLabs demo key loaded (or bypass ready)
- [ ] GX10 status badge visible (top-right)

---

## T+0s — SETUP (5s)

**On screen:** "LA Care Navigator — Los Angeles"
**Voice (EN):** "Hola! Bienvenido a LA Care Navigator. How can I help you today?"

**Action:** Show map centered on Pershing Square (34.0522, -118.2551)

---

## T+5s — LOCATION (10s)

**Voice (EN):** "I'm at Pershing Square and I need somewhere to stay tonight."

**On screen:**
1. Parse location → Pershing Square
2. Query → "shelter tonight"
3. Call `find_resources(query="shelter", lat=34.0522, lon=-118.2551)`

**Display:** 3 shelters within 1 mile:
- Downtown Women's Center (0.4 mi)
- Midnight Mission (0.6 mi)
- Union Rescue Mission (0.9 mi)

---

## T+15s — ASSESSMENT (15s)

**Voice (EN):** "Tell me about the first one."

**On screen:** Resource card expands — photo, phone, bed availability, eligibility

**Info shown:**
- Downtown Women's Center
- 442 S San Pedro St, LA 90013
- (213) 680-0148
- Women 18+, no ID needed
- Beds: call ahead

**Voice (EN):** "Great! How do I get there?"

---

## T+30s — ROUTING (12s)

**On screen:**
- Origin: Pershing Square (34.0522, -118.2551)
- Destination: 442 S San Pedro St (34.0462, -118.2476)
- Mode: Walk (free)

**Display:** Step-by-step:
1. ➡️ Head west on 6th St → Main St (300 ft)
2. ⬅️ Turn left onto S Main St (0.2 mi)
3. 🎯 Arrive at 442 S San Pedro St

**Voice (EN):** "That takes about 6 minutes. Here's the route."

---

## T+42s — SPANISH TOGGLE (10s)

**Action:** Click "ES" toggle button (top-right)

**Voice (ES):** "Excelente. ¿Necesita algo más? ¿Quiere aplicar para CalFresh?"

**On screen:** UI switches to Spanish labels

---

## T+52s — ELIGIBILITY CHECK (12s)

**Voice (ES):** "Sí, tengo cuatro hijos y sin ingresos."

**On screen:**
- Household: 4
- Income: $0/month
- Kids: 4
- → Call `calculate_eligibility(household_size=4, income=0, has_children=True)`

**Result:**
- CalFresh: $768/mes (likely eligible)
- Medi-Cal: eligible
- WIC: eligible

**Voice (ES):** "Con cuatro hijos y sin ingresos, califica para CalFresh: $768 al mes."

---

## T+64s — FORM FILL (13s)

**Voice (ES):** "Quiero aplicar."

**On screen:** Click "📄 Aplicar Ahora"

**Action:** Click "Tomar foto de ID" → Upload `samples/sample_id.jpg` (or drag-drop)

**On screen:** Processing spinner

**PDF output:** Auto-filled CF 285
- Name: MARIA GARCIA
- DOB: 01/15/1988
- Address: 1234 E 103rd St, LA 90002
- Household: 4
- Income: $0
- Signature: [drawn]

**Voice (ES):** "Listo. Su forma está lista. Descargue o envíe por email."

**Download button:** "Descargar CF 285"

---

## T+77s — GX10 BADGE (5s)

**Action:** Highlight top-right badge

**Display:** `🟢 GX10 · 0 cloud calls`

**Voice (EN):** "This runs entirely on your GX10 Grace Blackwell. No cloud needed."

---

## T+82s — CASEFILE (5s)

**On screen:** "Caso creado: LA-2026-0001"

**Voice (EN):** "Your case is saved. Come back or call 2-1-1."

---

## T+87s — CLOSE (3s)

**On screen:** Reset to welcome screen

**Final frame:**
- Map centered on LA
- "LA Care Navigator"
- Tagline: "Your LA caseworker"

---

## Timing Summary

| Section | Duration |
|---------|----------|
| Setup | 5s |
| Location | 10s |
| Assessment | 15s |
| Routing | 12s |
| Spanish toggle | 10s |
| Eligibility | 12s |
| Form fill | 13s |
| GX10 badge | 5s |
| Casefile | 5s |
| Close | 3s |
| **TOTAL** | **90s** |

---

## Fallback Scenarios

| If... | Then... |
|-------|--------|
| Voice fails | Show keyboard input |
| ElevenLabs fails | Use browser TTS |
| Ollama slow | Show "Thinking..." spinner |
| GPS denied | Use neighborhood dropdown |
| No ID | Skip form fill, show "You can apply in person" |

---

## Hardware Callouts

- **GX10 visible:** Show badge throughout, emphasize at T+77s
- **No cloud:** Emphasize "0 cloud calls"
- **Offline-first:** If wifi dies, kiosk still works