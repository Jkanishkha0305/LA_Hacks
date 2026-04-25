# LA Care Navigator — 28-Hour Hackathon Plan

## Overview
- **Total time:** 28 hours (4 hours sleep budget = 24h effective)
- **Submission:** Hour 28:00 → Hour 28:45
- **Checkpoints:** Hour 8, Hour 16, Hour 24

---

## Hour 0–1: Foundation (COMPLETED)
| Task | Status |
|------|--------|
| Create `la-care-navigator/` directory | ✅ |
| Copy reference base (MIT attributed) | ✅ |
| Initialize git, first commit | ✅ |

---

## Hour 1–3: Data Layer
| Task | Hours |
|------|-------|
| 1.1 Write `scripts/build_la_mart.py` scraper for LAHSA, 211 LA, data.lacity.org | 1.0 |
| 1.2 Test scraper → catch failures | 0.5 |
| 1.3 Seed fallback: `scripts/seed_la_resources.py` (30 real LA orgs) | 1.0 |
| 1.4 Generate `data/resource_mart.parquet` | 0.5 |

**Checkpoint:** Hour 3 — Resource mart with 30+ LA orgs, verified lat/lon

---

## Hour 3–5: Forms Layer
| Task | Hours |
|------|-------|
| 2.1 Download blank CF 285 (CalFresh) and MC 210 (Medi-Cal) PDFs | 0.5 |
| 2.2 Write `pipeline/form_filler.py` coordinate mappings | 1.5 |
| 2.3 Test PDF fill with sample ID → verify anchors work | 1.0 |
| 2.4 Copy to `samples/forms/` | 0.5 |

**Checkpoint:** Hour 5 — CF 289 fillable, MC 210 fillable

---

## Hour 5–7: Location Services
| Task | Hours |
|------|-------|
| 3.1 Update geocode.py landmarks for LA neighborhoods | 1.0 |
| 3.2 Validate fallback: Skid Row, MacArthur Park, Hollywood, Boyle Heights, South LA, Koreatown, Pershing Square, Echo Park, Westlake, Downtown | 0.5 |
| 3.3 Update routing.py to use LA Metro GTFS | 1.0 |
| 3.4 Test routing from Pershing Square → nearest shelter | 0.5 |

**Checkpoint:** Hour 7 — Geocoding + routing work for LA

---

## Hour 7–8: FIRST CHECKPOINT — "Hello LA"
| Task | Hours |
|------|-------|
| 4.1 End-to-end test: user at Pershing Square queries "shelter" | 0.5 |
| 4.2 Verify UI shows LA neighborhood selector | 0.5 |
| **Review:** All core LA functionality working | — |

---

## Hour 8–11: Agent + Strings
| Task | Hours |
|------|-------|
| 5.1 Grep and replace all old-city strings with LA equivalents | 1.5 |
| 5.2 Update `agent/config.yml` system prompt → LA context | 1.0 |
| 5.3 Update crisis numbers: add LA County DMH ACCESS (800-854-7771) + DV (800-978-3600) | 0.5 |
| 5.4 Test agent responds "LA" not "NYC" | 1.0 |

**Checkpoint:** Hour 11 — Agent localized to LA, crisis hotlines updated

---

## Hour 11–14: Frontend Rebranding
| Task | Hours |
|------|-------|
| 6.1 Rename index.html → "LA Care Navigator" | 0.5 |
| 6.2 Update deck.gl bbox → LA County (34.0,-118.7 to 34.4,-118.1) | 1.0 |
| 6.3 Update neighborhood selector for LA | 1.0 |
| 6.4 Add GX10 status badge (top-right) | 0.5 |
| 6.5 Test frontend loads, displays map | 1.0 |

**Checkpoint:** Hour 14 — Frontend re-themed to LA

---

## Hour 14–16: SECOND CHECKPOINT — "LA Flow Works"
| Task | Hours |
|------|-------|
| 7.1 End-to-end: Pershing Square → "need shelter" → route to LA shelter | 1.0 |
| 7.2 Fill CalFresh form with sample ID | 0.5 |
| **Review:** Complete user flow functional | — |

---

## Hour 16–19: New Features (Step 3)
| Task | Hours |
|------|-------|
| 8.1 Write `frontend/voice.js` — ElevenLabs TTS/STT + EN/ES toggle | 1.5 |
| 8.2 Add `.env` template with ELEVENLABS_API_KEY placeholder | 0.25 |
| 8.3 Write `agentverse/find_la_resources.py` uAgent | 1.0 |
| 8.4 Write `agentverse/fill_calfresh_form.py` uAgent | 1.0 |
| 8.5 Write `agentverse/check_eligibility.py` uAgent | 1.0 |
| 8.6 Write `agentverse/register.sh` | 0.25 |

**Checkpoint:** Hour 19 — Voice + 3 Agentverse agents working

---

## Hour 19–22: Demo + Seed Cases
| Task | Hours |
|------|-------|
| 9.1 Write `seed_demo_cases.py` — 4 LA scenarios | 1.0 |
| 9.2 Pershing Square scenario (homeless family of 4) | 0.5 |
| 9.3 Boyle Heights scenario (undocumented, food insecurity) | 0.5 |
| 9.4 Hollywood scenario (senior, no insurance) | 0.5 |
| 9.5 South LA scenario (DV survivor) | 0.5 |
| 9.6 Record demo run → verify 90-second script | 1.0 |

**Checkpoint:** Hour 22 — Demo cases seeded

---

## Hour 22–24: Documentation
| Task | Hours |
|------|-------|
| 10.1 Finalize README.md (demo video link, tech stack) | 0.5 |
| 10.2 Verify ATTRIBUTION.md complete | 0.5 |
| 10.3 Verify all docs render correctly | 0.5 |
| 10.4 Polish error messages → LA-specific | 0.5 |

**Checkpoint:** Hour 24 — All docs complete

---

## Hour 24–26: CODE FREEZE
| Task | Hours |
|------|-------|
| 11.1 Run full test suite | 0.5 |
| 11.2 Fix any critical bugs | 1.0 |
| 11.3 Verify Docker Compose works | 0.5 |

---

## Hour 26–28: FINAL POLISH
| Task | Hours |
|------|-------|
| 12.1 Final demo run with timer | 0.5 |
| 12.2 Verify submission artifact builds | 0.5 |
| 12.3 Upload / push to submission repo | 0.5 |

---

## Hour 28–28:45: SUBMIT

---

## Key Decisions
- **Hour 8 checkpoint is HARD** — if not ready, drop non-critical features to catch up
- **Voice + Agentverse** are "nice to have" — core flow has priority
- **GX10 badge** is trivial, do last
- **Demo video** recorded incrementally, not all at once

---

## Sleep/Split
| Hour | Activity |
|------|-----------|
| 4–6 | Dinner break |
| 12–13 | Lunch |
| 23–24 | Nap (30 min) |
| 26–27 | Rest before submit |