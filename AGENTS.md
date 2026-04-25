# LA Hacks 2026 — Agent Instructions

This file mirrors CLAUDE.md for non-Claude agents (Gemini CLI, OpenCode, Codex, etc.).

## Context
- Hackathon project for LA Hacks 2026
- Full challenge list with prizes and requirements: [LA_Hacks_Challenges.md](./LA_Hacks_Challenges.md)
- Session state: [.ai/session.md](./.ai/session.md)

## Project (TBD)
- **Chosen Challenge(s):** _not decided yet_
- **Project Name:** _TBD_
- **One-liner:** _TBD_

## Tech Stack (TBD)
- **Frontend:** _TBD_
- **Backend:** _TBD_
- **AI/ML:** _TBD_

## Priorities
1. Working demo over clean code
2. Hit the specific judging criteria for the chosen challenge
3. User-facing errors must be clear — judges see the UI
4. Speed — this is a hackathon

## Session Continuity
Always read `.ai/session.md` first. Update it after completing any significant step.


<claude-mem-context>
# Memory Context

# [LA_Hacks] recent context, 2026-04-24 12:53am EDT

Legend: 🎯session 🔴bugfix 🟣feature 🔄refactor ✅change 🔵discovery ⚖️decision
Format: ID TIME TYPE TITLE
Fetch details: get_observations([IDs]) | Search: mem-search skill

Stats: 41 obs (17,462t read) | 517,381t work | 97% savings

### Apr 23, 2026
117 7:19p 🔵 OSSInsight MCP API returns 404 for trending/ranking endpoints
118 7:23p 🔵 OSSInsight MCP API — ranking endpoints work, repo endpoint partially broken
119 7:24p 🔵 OSSInsight repo detail API — correct format confirmed, some repos not indexed
121 " 🔵 OSSInsight hot repo list for LA Hacks — 13 repos across 8 AI/ML collections
122 7:25p 🔵 OSSInsight top-5 per collection — full LA Hacks tech landscape mapped
124 7:26p 🔵 LA Hacks session state — planning phase, challenge not yet selected
125 " ✅ session.md updated with live OSSInsight findings and challenge-fit clusters
127 7:35p 🟣 LA Hacks 2026 — OSSInsight deep-dive research task dispatched to Codex
131 7:36p 🔵 LA Hacks 2026 — complete challenge directory confirmed with full prize details
132 " 🔵 LA Hacks session.md — OSSInsight research output and repo shortlist confirmed
133 7:38p ✅ LA Hacks research saved as chatgpt_research.md
134 " 🔵 OSSInsight trending page — top repos extracted from SSR HTML payload (past_week, all languages)
135 " 🔵 OSSInsight Data Explorer confirmed client-side only — curl scraping returns empty shell
136 7:40p ✅ LA Hacks 2026 Codex research saved to chatgpt_research.md
142 7:56p ⚖️ LA Hacks 2026 — Codex deep-research task dispatched for OSSInsight full-site crawl + challenge mapping
145 7:57p 🔵 OSSInsight Data Explorer batch query results — 5 of 6 LA Hacks categories returned live data
146 7:59p 🔵 OSSInsight deep-dive: openai/openai-agents-python repo analytics confirmed
148 " 🔵 OSSInsight PR merge time and issue response time metrics not extractable via Playwright innerText
149 8:00p 🔵 OSSInsight /analyze page API endpoints confirmed — all chart data queryable directly via /api/q/
150 " 🔵 OSSInsight head-to-head comparison URL format returns 404 — feature removed or never existed
152 8:01p 🔵 OSSInsight "Compare" is a JS button on /analyze page — not a navigable URL
154 8:02p 🔵 OSSInsight Compare button opens search panel with pre-suggested repos — interaction confirmed working
155 8:04p 🔵 OSSInsight Compare click on suggestion didn't load comparison — single-repo view unchanged after selecting crewAIInc/crewAI
156 " 🔵 OSSInsight Python trending repos — past week top 26 captured with stars and forks
159 8:07p 🔵 openai/openai-agents-python live health metrics — PR merge p50 under 3h, issue response p50 under 2.3h, 773 stars last 28 days
160 " 🔵 OSSInsight 18-collection ranking scraped — full top-5 per collection with 28d stars and growth %
164 " 🔵 OSSInsight trending repos captured across 3 periods × 6 languages — jamiepine/voicebox notable at #4 TypeScript this week
169 8:08p 🔵 Cross-dataset repo frequency analysis — top signals across OSSInsight collections, trending, and Data Explorer
172 8:10p 🔵 OSSInsight batch metrics collected for 12 LA Hacks candidate repos — all succeeded in 78.9s
176 8:13p ⚖️ LA Hacks 2026 — Comprehensive OSSInsight Codex research task dispatched
177 8:16p 🔵 Repo code audit — 4 LA Hacks fork candidates sized and licensed
178 " 🔵 OSSInsight metrics — 3 secondary candidates show low community activity
179 " 🔵 OSSInsight cached metrics dump — top signal repos for LA Hacks shortlist
180 " 🔵 OSSInsight extra metrics batch — 6 additional repos fetched to /tmp/oss_extra_metrics.json
181 8:17p 🔵 OSSInsight extra metrics expanded — activepieces and DeepTutor are strongest fork candidates
182 " 🔵 PyPSA/PyPSA climate-track candidate confirmed weak — near-zero recent activity
183 " 🔵 OSSInsight analyze page repoInfo regex fails — meta tag content pattern works for stars/forks
### Apr 24, 2026
187 12:33a 🔵 LA Hacks 2026 — Nvidia physics models research query for compute-heavy direction
189 12:50a 🔵 LA Hacks 2026 — 6-subagent research orchestrator prompt finalized
191 12:51a 🔵 paperclipai/paperclip — 58K-star open-source AI company orchestration platform confirmed
193 " 🔵 paperclipai/paperclip open issues — top failure modes in multi-agent orchestration confirmed

Access 517k tokens of past work via get_observations([IDs]) or mem-search skill.
</claude-mem-context>