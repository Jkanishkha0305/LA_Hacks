# OSSInsight Deep-Dive → LA Hacks 2026 Mapping

**Date:** Apr 23, 2026
**Source:** ossinsight.io (trending pages, 15+ collection rankings, MCP API)
**Methodology:** Collections filtered by `last-28-days` stars growth; trending data pulled for 24h / week / month windows.

---

## PART 1 — Per-Challenge Mapping Tables

Columns:
- **Stars/Month** — new stars in last 28 days
- **Growth %** — popularity delta vs prior period (from OSSInsight)
- **PR Velocity** — qualitative: `🔥 high` = daily PRs, `✅ healthy` = multiple per week, `⚠️ slow`
- **Fork-able in 36h?** — can a 2–3 person team bootstrap on this in a weekend

---

### 1. Cognition "Augment the Agent" — $3,000 cash
Focus: AI coding-agent improvements — context retrieval, MCP plugins, verification, handoff.

| Repo | Stars/Month | Growth % | PR Velocity | Why it fits | Fork-able in 36h? |
|---|---|---|---|---|---|
| `sst/opencode` | 2,939 | −28% | 🔥 high | Terminal-native AI coding agent. Already has MCP support; easy to plug a new skill. | ✅ yes (TS, modular) |
| `block/goose` | 1,884 | **+228%** | 🔥 high | MCP-first agent exploding in popularity. Rust core + extension model = ideal substrate. | ✅ yes |
| `cline/cline` | 230 (28d) | −17% | 🔥 high | 48K⭐ VSCode agent. Write a custom "verification" or "handoff" extension. | ✅ yes (TS) |
| `Aider-AI/aider` | 210 (28d) | −29% | ✅ healthy | Mature Python coding agent. Good for "smarter context retrieval" angle. | ✅ yes (Python) |
| `continuedev/continue` | 116 (28d) | −2% | ✅ healthy | Open-source Copilot alt. Extensible via config.json + MCP. | ✅ yes |
| `zilliztech/claude-context` | trending | new | 🔥 high | MCP server for semantic code search. Already does context retrieval — fork + extend. | ✅ **yes, ideal** |
| `ChromeDevTools/chrome-devtools-mcp` | trending | new | 🔥 high | Gives agents a browser-debugging hand. Perfect "handoff" angle. | ✅ yes |
| `google-gemini/gemini-cli` | 600 (28d) | −29% | 🔥 high | Official Gemini CLI agent. MCP-capable. | ✅ yes |
| `anthropics/skills` | trending | new | ✅ healthy | Official Anthropic skills repo — directly build a skill here. | ✅ **yes, ideal** |

**Sweet spot:** `claude-context` or `chrome-devtools-mcp` as an MCP server you extend — Cognition's judges care about *eliminating dev toil*, and both directly attack that.

---

### 2. Fetch.ai Agentverse — $2,500 cash
Focus: multi-agent systems, Chat Protocol, Agentverse registration.

| Repo | Stars/Month | Growth % | PR Velocity | Why it fits | Fork-able in 36h? |
|---|---|---|---|---|---|
| `openai/openai-agents-python` | 774 | **+231%** | 🔥 high | #1 in AI Agent Frameworks last 28d. Simple SDK → wrap in uAgents for Agentverse registration. | ✅ **yes** |
| `crewAIInc/crewAI` | 409 | −22% | 🔥 high | Role-based multi-agent. Easy to map crews onto Agentverse agents. | ✅ yes |
| `VoltAgent/voltagent` | 262 | **+42%** | 🔥 high | Jumped 4 rank slots. TS-native agent framework w/ observability built in. | ✅ **yes** |
| `pydantic/pydantic-ai` | — | stable | ✅ healthy | Type-safe agents in Python. Great for reliable Chat Protocol I/O. | ✅ yes |
| `mastra-ai/mastra` | — | stable | 🔥 high | TS agent framework w/ workflows + memory. Cleanest for Agentverse wrappers. | ✅ yes |
| `agno-agi/agno` | — | stable | ✅ healthy | Multi-modal agents, fast to set up. | ✅ yes |
| `huggingface/smolagents` | 113 (28d) | stable | ✅ healthy | Minimal code-agent framework — perfect for a "skill" agent. | ✅ **yes** |
| `microsoft/autogen` | — | stable | 🔥 high | Mature multi-agent orchestration. Heavier but well-documented. | ⚠️ medium |
| `langchain-ai/langgraph` | — | stable | 🔥 high | Explicit graph-based multi-agent. Ideal if judges want to see topology. | ✅ yes |

**Sweet spot:** `openai-agents-python` (simplicity, momentum) OR `VoltAgent` (TS, rising) wrapped in Fetch.ai's `uagents` SDK and registered on Agentverse.

---

### 3. Fetch.ai OmegaClaw Skill Forge — $1,500 cash
Focus: a specialist skill/agent plugged into OmegaClaw via Agentverse.

| Repo | Stars/Month | Growth % | PR Velocity | Why it fits | Fork-able in 36h? |
|---|---|---|---|---|---|
| `anthropics/skills` | trending | new | ✅ healthy | Skill format is directly reusable. | ✅ **yes** |
| `huggingface/smolagents` | 113 (28d) | stable | ✅ healthy | Build a single-purpose code skill. | ✅ yes |
| `zilliztech/claude-context` | trending | new | 🔥 high | Already a skill-shaped MCP server. Repackage for OmegaClaw. | ✅ yes |
| `HKUDS/DeepTutor` | trending | new | 🔥 high | "Agent-Native Personalized Learning Assistant" — wrap as a tutor skill. | ✅ yes |

**Sweet spot:** any single-purpose skill (e.g. "regulatory compliance checker," "medication interaction lookup") built on `smolagents` or the `anthropics/skills` format, plugged into OmegaClaw — small surface area, big judging clarity.

---

### 4. ASUS Ascent GX10 — $4,000+ hardware (local AI, no cloud)

| Repo | Stars/Month | Growth % | PR Velocity | Why it fits | Fork-able in 36h? |
|---|---|---|---|---|---|
| `ggml-org/llama.cpp` | trending | stable | 🔥 high | Gold standard for local inference. Already ARM-optimized (GX10 is ARM Grace). | ✅ **yes** |
| `menloresearch/jan` | 185 (28d) | stable | 🔥 high | 35K⭐ local-first ChatGPT alternative. Ships with llama.cpp backend. | ✅ **yes** |
| `ollama/ollama` | — | stable | 🔥 high | Easiest local-model runtime. | ✅ yes |
| `google-ai-edge/gallery` | trending | new | 🔥 high | On-device ML showcase. Great demo vector. | ✅ yes |
| `mlc-ai/mlc-llm` | — | stable | ✅ healthy | ML compilation for edge. Good for GX10's Blackwell GPU. | ⚠️ medium |
| `huggingface/transformers.js` | — | stable | 🔥 high | If demoing in-browser alongside GX10 server. | ✅ yes |

**Sweet spot:** Fork `jan` or build atop `llama.cpp` with a **Google Gemma** model loaded → instant stack on ASUS + Gemma + Vultr-free deployment = multi-prize combo.

---

### 5. Arista Networks — Claude Pro 12mo + Bose headphones
Focus: connecting people to resources or routing useful data.

| Repo | Stars/Month | Growth % | PR Velocity | Why it fits | Fork-able in 36h? |
|---|---|---|---|---|---|
| `BerriAI/litellm` | 555 | −28% | 🔥 high | #1 AI gateway. Routes 100+ LLMs behind one API — this *is* a data router. | ✅ **yes** |
| `diegosouzapw/OmniRoute` | 359 | **+65%** | 🔥 high | Smaller, faster-growing LLM router. Less crowded. | ✅ yes |
| `livekit/livekit` | 91 (28d) | −13% | 🔥 high | WebRTC infra — real-time data/voice routing. | ✅ yes |
| `songquanpeng/one-api` | 250 | −9% | ✅ healthy | Multi-LLM gateway w/ billing. | ✅ yes |
| `apache/apisix` | — | stable | 🔥 high | API gateway — classic "route data to resources." | ⚠️ medium (heavy) |
| `jitsi/jitsi-meet` | 37 (28d) | −3% | ✅ healthy | Self-hosted video routing. | ⚠️ medium |

**Sweet spot:** Build on `litellm` or `OmniRoute` → "route a user's question to the best specialist agent + resource" (e.g., a resource-finder for homeless services, routed by proximity/availability). That's *literally* Arista's brief.

---

### 6. ZETIC On-Device AI — $1,000 cash (stackable)
Any mobile AI using ZETIC Melange SDK. No OSS substrate needed — ZETIC is the integration point. Best paired with any winner from §4 (local models).

---

### 7. ElevenLabs — earbuds (stackable)
From trending (past week): voice is having a moment.

| Repo | Stars (week) | Why it helps |
|---|---|---|
| `microsoft/VibeVoice` | 2,589 | Alternative OSS voice model — but **you want ElevenLabs for the prize**, not this. |
| `OpenBMB/VoxCPM` | 1,786 | Same note. |
| `jamiepine/voicebox` | 1,310 | Frontend scaffolding you can adapt — **then swap in ElevenLabs API**. |

**Sweet spot:** Fork `voicebox`, replace TTS layer with ElevenLabs. 2 hours of work, collect the earbuds.

---

### 8. MongoDB Atlas — M5Stack IoT kit (stackable)
Just use Atlas as the DB. Trivial bolt-on.

---

### 9. Cloudinary — $500/member gift card (stackable)
Use their React AI Starter Kit for any media handling. Trivial bolt-on.

---

### 10. Google Gemma (MLH) — swag (stackable)
Drop Gemma as the local model in §4. One-line change.

---

### 11. Vultr — portable screens (stackable)
Deploy anything on Vultr. Trivial.

---

### 12. Sustain the Spark — climate / clean energy

| Repo | Stars/Month | Growth % | PR Velocity | Why it fits | Fork-able in 36h? |
|---|---|---|---|---|---|
| `google-research/timesfm` | trending | new | ✅ healthy | Time-series foundation model — perfect for **energy demand forecasting / solar output prediction**. | ✅ **yes** |
| `openai/openai-agents-python` | 774 | +231% | 🔥 high | Orchestrate a "climate analyst" multi-agent system. | ✅ yes |
| `HKUDS/RAG-Anything` | trending | new | 🔥 high | Multi-modal RAG — feed it IPCC PDFs + satellite imagery. | ✅ yes |

**Data Explorer query result:** No single dominant climate OSS repo this cycle. Custom work needed; best play is **timesfm for forecasting + a multi-agent policy advisor**.

---

### 13. Catalyst for Care — health / wellness

| Repo | Stars/Month | Growth % | PR Velocity | Why it fits | Fork-able in 36h? |
|---|---|---|---|---|---|
| `HKUDS/RAG-Anything` | trending | new | 🔥 high | Medical PDFs + charts + imagery = ideal for clinical RAG. | ✅ **yes** |
| `topoteretes/cognee` | 325 (28d) | −28% | 🔥 high | GraphRAG for patient timelines — graph edges are causal signals. | ✅ yes |
| `langchain-ai/langchain` | 614 (28d) | −24% | 🔥 high | Obvious — but too generic for judges unless tightly scoped. | ✅ yes |

**Data Explorer query result:** No trending healthcare-specific repo. The winning shape here is *domain-specific application on top of RAG + an agent*.

---

### 14. Light the Way (Aramco) — education / accessibility

| Repo | Stars/Month | Growth % | PR Velocity | Why it fits | Fork-able in 36h? |
|---|---|---|---|---|---|
| `HKUDS/DeepTutor` | trending | new | 🔥 high | "Agent-Native Personalized Learning Assistant" — name says it all. | ✅ **yes, ideal** |
| `topoteretes/cognee` | 325 (28d) | −28% | 🔥 high | Build a personal knowledge graph per learner. | ✅ yes |
| `mastra-ai/mastra` | — | stable | 🔥 high | Memory-first agent framework — remembers what a student struggles with. | ✅ yes |

**Sweet spot:** Fork `DeepTutor`; adapt curriculum for accessibility (dyslexia-friendly, screen-reader-first).

---

### 15. Flicker to Flow (Figma) — productivity / work-life balance

| Repo | Stars/Month | Growth % | PR Velocity | Why it fits | Fork-able in 36h? |
|---|---|---|---|---|---|
| `langgenius/dify` | 812 | −10% | 🔥 high | #1 LLM Tool; build workflow automations on top. | ✅ yes |
| `FlowiseAI/Flowise` | — | stable | 🔥 high | Visual LLM workflow — Figma judges love visual builders. | ✅ **yes** |
| `n8n-io/n8n` (Zapier alt.) | — | stable | 🔥 high | Self-hosted automation. Add an "LLM node." | ✅ yes |
| `BasedHardware/omi` | — | stable | 🔥 high | Ambient AI wearable — passively captures tasks from your day. | ⚠️ medium (hardware) |
| `onyx-dot-app/onyx` | — | stable | 🔥 high | Enterprise AI search across tools — great "context for your work day" angle. | ✅ yes |
| `mem0ai/mem0` | 488 (28d) | −22% | 🔥 high | Memory layer for agents — remembers your preferences across apps. | ✅ yes |

**Sweet spot:** Fork `Flowise` or `n8n`, add an **ElevenLabs voice trigger + mem0 memory layer** → "speak a task, it routes to the right workflow, remembers how you like it done." Hits Flicker + ElevenLabs + MongoDB.

---

### 16. Figma Make — FREE CHECKBOX
Just use Figma Make during prototyping. Document a screenshot.

### 17. GoDaddy domain — FREE CHECKBOX
Register a .dev / .io domain. 2 minutes.

---

## PART 2 — Top 5 Repo Deep-Dives

Chosen by: PR velocity + contributor growth + architectural clarity + fork-friendliness.

### 1. `sst/opencode`
- **Stars:** 53K+; **28d growth:** +2,939 stars (huge)
- **Contributor count:** ~200+, global
- **PR velocity:** 🔥 daily merges
- **Issue response:** <24h typical
- **Star curve:** steep but organic (backed by SST team, not one spike)
- **Fit:** **Cognition** — already an MCP-capable terminal agent. Write a new skill/tool, open a PR, or fork and ship.
- **License:** MIT ✅

### 2. `block/goose`
- **Stars:** 22K; **28d growth:** +1,884 (+228%!)
- **Contributor count:** growing fast (Block/Square-backed)
- **PR velocity:** 🔥 multiple/day
- **Star curve:** explosive but sustained over 3 months
- **Fit:** **Cognition** — Rust core + extension model. Rare chance to ride a repo in its breakout moment.
- **License:** Apache 2.0 ✅

### 3. `openai/openai-agents-python`
- **Stars:** 14.5K; **28d growth:** +774 (+231% popularity rank)
- **Contributor count:** OpenAI + ~50 external
- **PR velocity:** 🔥 near-daily
- **Star curve:** linear, organic post-launch
- **Fit:** **Fetch.ai Agentverse** — cleanest Python multi-agent SDK to wrap in uAgents. Minimal ceremony, maximum judge clarity.
- **License:** MIT ✅

### 4. `HKUDS/DeepTutor`
- **Stars:** trending, newer (~5K range)
- **Contributor count:** academic team (HKUDS is a research lab pumping out strong repos — same org owns RAG-Anything)
- **PR velocity:** 🔥 high during launch phase
- **Fit:** **Light the Way** — "Agent-Native Personalized Learning Assistant" is the headline Aramco would print.
- **License:** MIT ✅

### 5. `menloresearch/jan`
- **Stars:** 34.8K; **28d:** +185
- **Contributor count:** ~300+, global
- **PR velocity:** 🔥 daily
- **Star curve:** steady linear = organic user base
- **Fit:** **ASUS GX10** — already ARM-friendly, ships llama.cpp. Swap in Gemma, wrap in a health/education/productivity UI, triple-dip on prizes.
- **License:** AGPL (⚠️ check licensing compat for commercial judging — may need fresh fork with clear notice)

---

## PART 3 — Head-to-Head Comparisons

### `openai-agents-python` vs `crewAIInc/crewAI` (Fetch.ai slot)
- **openai-agents-python**: +231% growth, OpenAI-backed, simpler API, smaller SDK
- **crewAI**: −22% growth, more mature, heavier, role-based paradigm
- **Winner:** `openai-agents-python` — momentum + simplicity win in 36h.

### `cline/cline` vs `sst/opencode` (Cognition slot)
- **cline**: 48K⭐, VSCode-bound, TypeScript, slower growth now
- **opencode**: 53K⭐, terminal-first, language-agnostic tools, +2,939 stars/28d
- **Winner:** `opencode` — active breakout + terminal demo looks more hackerish on stage.

### `litellm` vs `OmniRoute` (Arista slot)
- **litellm**: 29K⭐, mature, 100+ providers, heavy
- **OmniRoute**: ~600⭐, +65% growth, smaller = easier to fork & extend
- **Winner:** `OmniRoute` if you want to *extend* routing logic; `litellm` if you just want to use it.

### `jan` vs `ollama` (ASUS slot)
- **jan**: has UI, desktop app, better demo
- **ollama**: headless runtime, less flashy
- **Winner:** `jan` for demo, `ollama` for backend — use **both**: ollama serves, jan demos.

### `Flowise` vs `n8n` (Flicker to Flow slot)
- **Flowise**: LLM-first visual builder, younger, prettier
- **n8n**: older, more integrations, less LLM-native
- **Winner:** `Flowise` — visual-LLM-workflow is exactly what Figma's "Flicker to Flow" judges will photograph.

---

## PART 4 — Strategic Answers

### Q1 — Which single project concept stacks the most cash prizes?

**🏆 WINNER: "Catalyst Concierge" — a local-first, multi-agent care navigator that routes patients to resources via voice.**

**The stack:**
- **ASUS GX10** runs `jan` + **Gemma 3** locally (no cloud, no PHI leaks) → **$4,000+ hardware**
- Core intelligence: `openai-agents-python` multi-agent system wrapped in Fetch.ai **uAgents** + registered on **Agentverse** with Chat Protocol → **$2,500 cash**
- One specialist agent (e.g. "InsuranceVerifier") built as an **OmegaClaw Skill** → **$1,500 cash**
- The agents are also **MCP tools** for Claude/Cursor (built on `claude-context` pattern) — submitted as a Cognition "Augment the Agent" entry (context retrieval for healthcare devs) → **$3,000 cash**
- **Arista angle:** the system *routes a user's need to the right resource agent* — literally their brief → **Claude Pro 12mo + Bose**
- **ElevenLabs** for the voice interface → **earbuds**
- **MongoDB Atlas** for patient/resource records → **M5Stack IoT kit**
- **Cloudinary** for any uploaded medical images → **$500/member**
- **Vultr** for the public demo endpoint → **portable screens**
- **Figma Make** for the UI mockups → ✓ checkbox
- **GoDaddy** .dev domain → ✓ checkbox
- **Catalyst for Care** general track → major prize potential
- (Optional) **ZETIC SDK** for a mobile companion → **$1,000 cash**

**Cash-equivalent stack: $3,000 + $2,500 + $1,500 + $1,000 (ZETIC) = $8,000 cash + $4,000 hardware + Bose + earbuds + IoT kit + $1,500+ gift cards = ~$15,000+ total prize pool**

This single project plausibly qualifies for **11 of 17 challenges**. The key unlock is that *every prize is additive, not exclusive* — you just need to hit each checkbox in one coherent demo.

---

### Q2 — Top 3 Repos to Fork as a Starting Point

Filters applied: active PRs, <10k LOC core, clear architecture, good README, MIT/Apache, fork-friendly.

**1. `openai/openai-agents-python`** — MIT, ~3k LOC core, crystal-clear tools/agents/handoffs structure. +231% growth. README is exemplary. You'll have a multi-agent prototype running in 45 minutes.

**2. `zilliztech/claude-context`** — MIT, ~2k LOC, single-responsibility MCP server for semantic code search. Already implements the "smarter context retrieval" that Cognition explicitly asks for. Trivial to extend with new retrievers (e.g. medical records, class notes, Figma specs) and re-pitch per challenge.

**3. `menloresearch/jan`** — Desktop + server, Electron + llama.cpp. Heavier LOC but the *useful fork surface* is the model-loading + chat-UI layer. Gives you a polished demo artifact on the ASUS in under an hour. (AGPL caveat: either use as-is or fork cleanly with proper attribution; don't silently rebrand.)

**Backup picks if any of the above gives you trouble:**
- `block/goose` — Rust, still approachable; breakout momentum
- `huggingface/smolagents` — <1k LOC code-agent library, MIT, perfect skill scaffold
- `HKUDS/DeepTutor` — if you pivot to Light the Way

---

### Q3 — Most Feasible 36-Hour Project + 6-Hour Phase Plan

**Project:** **Catalyst Concierge** (the Q1 stack, scoped for realism).

**Scope for a 2–3 person team in 36h (actual coding time ~28h after eating/sleeping):**
- Voice-activated health-resource navigator
- 3 agents: `Intake` (symptom/need triage), `ResourceFinder` (maps user to clinics/services), `InsuranceVerifier` (simulated — no real payer API in 36h)
- Local Gemma on ASUS GX10 (borrow from challenge hardware pool day-of)
- Fetch.ai Agentverse registration with Chat Protocol
- ElevenLabs voice in/out
- MongoDB Atlas for resource directory + session memory
- Next.js frontend deployed on Vultr at a GoDaddy .dev domain
- Figma Make used for the landing page prototype

**Cut if behind schedule:**
- ZETIC mobile companion (nice-to-have, adds $1k but costs ~6h)
- GraphRAG patient timeline (cool but RAG-Anything is enough)
- Cloudinary image analysis (skip unless time permits)

---

#### 6-Hour Phase Plan (repeat 6×)

**Hour 0–6 — Phase 1: Skeleton + Agents (Day 1 evening)**
- **Person A:** Clone `openai-agents-python` examples; stand up 3 agents with stub tools; get handoffs working locally.
- **Person B:** Set up repo + Next.js frontend + GoDaddy domain + Vultr deploy. Push hello-world live.
- **Person C:** Create Fetch.ai Agentverse account; read uAgents docs; get a minimal `uagents` agent responding on Chat Protocol.
- **Exit criteria:** `python main.py "I need a free clinic"` returns a stubbed response through all 3 agents; a dummy page is live.

**Hour 6–12 — Phase 2: Local AI + Voice (Day 1 late / Day 2 early)**
- **Person A:** Get `jan` (or `ollama`) running locally with **Gemma 3**. Wire it in as the agents' LLM (OpenAI-compatible endpoint).
- **Person B:** Wire **ElevenLabs** for TTS + browser mic → STT (ElevenLabs or Web Speech API). Test full round-trip.
- **Person C:** Wrap the 3 agents as uAgents; register on Agentverse; verify Chat Protocol messages work.
- **Exit criteria:** Speak into browser → Gemma on laptop responds → ElevenLabs voice reply. Agentverse shows live agent.

**Hour 12–18 — Phase 3: Data + MongoDB (Day 2 morning)**
- **Person A:** Seed MongoDB Atlas with a real LA-area resources dataset (free clinics, food banks — scrape or use 211 open data). Wire `ResourceFinder` to query it.
- **Person B:** Build UI: chat pane + voice button + results cards with map (Mapbox free tier).
- **Person C:** Build the "InsuranceVerifier" as an **OmegaClaw-compatible skill** — clean input/output schema, small surface. Submit to Skill Forge.
- **Exit criteria:** End-to-end demo: "I'm uninsured and need mental health help near Westwood" → voice reply + list of 3 clinics + map.

**Hour 18–24 — Phase 4: MCP + Cognition Angle (Day 2 afternoon)**
- **Person A:** Wrap the agent system's retrieval layer as an **MCP server** (pattern from `claude-context`). Now Cursor/Claude can use "CatalystConcierge" as a tool.
- **Person B:** Polish UI, add Figma Make mockups to an About page, verify responsive.
- **Person C:** Record a 2-minute demo video (backup in case live demo fails).
- **Exit criteria:** MCP server registered and working from Cursor; UI is presentable; video recorded.

**Hour 24–30 — Phase 5: Polish + Stacking (Day 2 evening / Day 3 early)**
- **Person A:** Add **mem0** for per-user memory ("last time you asked about X"). Verify on ASUS GX10 if hardware is available.
- **Person B:** Integrate **Cloudinary** for any image uploads (e.g. photo of insurance card → OCR stub). Even minimal integration counts.
- **Person C:** Write the Devpost: problem → solution → architecture diagram → prize checklist (explicitly list all 11 challenges hit).
- **Exit criteria:** All checkboxes provably hit. Devpost draft complete.

**Hour 30–36 — Phase 6: Demo Prep (Day 3 morning)**
- **Everyone:** Dry-run the demo 3× — aim for 90 seconds. Practice the prize-stacking narrative.
- Record final backup video.
- Stage the ASUS GX10 (if secured) with the whole system running offline.
- Submit to Devpost; claim each prize checkbox; register Figma Make artifact; confirm domain resolves.
- **Exit criteria:** 2–3 people can demo it from memory. Backup video uploaded. All 11 prize forms submitted.

---

### Why this project wins

1. **Prize coverage is extreme** — 11 challenges from one codebase means the total EV dominates anything narrower.
2. **Judge narrative is simple** — "AI that runs 100% locally on ASUS hardware, speaks to you, routes you to care, and plugs into every agent ecosystem." Any one judge can grasp it in 30 seconds.
3. **Technical feasibility is proven** — every piece (agents, local LLM, voice, MongoDB, MCP) has trending, fork-ready OSS; nothing requires research.
4. **Fallback-safe** — if local hardware flakes at demo time, swap to a Vultr endpoint; if ElevenLabs rate-limits, fall back to Web Speech API; if one agent fails, the other two still demo.
5. **Domain clarity** — "Catalyst for Care" + a concrete LA-area resource dataset beats generic agent demos judges have seen 40 times already.

---

## Appendix — Full collection coverage

Collections successfully pulled (last-28-days / stars):
- AI Agent Frameworks (10098), LLM Tools (10076), LLM DevTools (10087)
- Model Context Protocol Client (10099), AI Gateways (10104)
- GraphRAG (10095), Vector Database & Vector Store (10094)
- WebRTC (10088), Robotics (10067)
- Data Integration (10056), WYSIWYG Editor (10036)
- Plus full trending (24h / week / month), all languages

Collections referenced but timed out / partial (cite caveat if asked):
- Headless CMS (10012) — timeout
- Specific collections `coding-agents`, `rag-frameworks`, `llm-inference-engines` — not exposed in MCP collections endpoint; coverage substituted via `llm-devtools` + trending.

Trending-only discoveries (not in any ranking I pulled, but surfaced strongly):
`ChromeDevTools/chrome-devtools-mcp`, `zilliztech/claude-context`, `anthropics/skills`, `HKUDS/DeepTutor`, `HKUDS/RAG-Anything`, `google-research/timesfm`, `google-ai-edge/gallery`, `microsoft/VibeVoice`, `OpenBMB/VoxCPM`, `jamiepine/voicebox`, `BasedHardware/omi`.
