# Market Signals — What's Hot, What's Overdone, What's Missing
*Research date: April 2026*

---

## ProductHunt Launches (Most Relevant, Feb-Apr 2026)

| Product | Upvotes | Launch Date | What it does | Signal |
|---|---|---|---|---|
| Claude Code Review | 562 ⬆️ | March 10, 2026 | Multi-agent PR review, bug detection, cloud | Very hot — same problem space |
| Enia Code | 365 ⬆️ | March 4, 2026 | Proactive AI that detects bugs as you write | Hot — continuous monitoring angle |
| Optibot | 497 ⬆️ | 2025 | Agentic code review that lives in GitHub | Hot — YC alums, Fortune 500 customers |
| Unblocked Code Review | 150 ⬆️ | Feb 4, 2026 | Context-aware code review (Slack, Jira, etc.) | Moderate |
| Codara | 6 ⬆️ | 2024 | AI code review GitHub app | Low traction |

**Signal: The "AI code review" category is CROWDED but all solutions are cloud-based and focus on PR review, not behavioral regression testing.**

---

## Devpost Past Hackathon Winners (AI Dev Tools)

| Project | What it built | What it won |
|---|---|---|
| Neocortex | Semantic code retrieval MCP — 85% token reduction, 246ms latency | MCP hackathon |
| CleanMCP | MCP interceptor + Neo4j graph, team context sharing | MCP hackathon finalist |
| FastCTX | Code knowledge graph via Neo4j + MCP | MCP hackathon finalist |
| MockMCP | Mock MCP server generator for testing agentic workflows | MCP hackathon finalist |

**What won:** Things with great demos, quantitative metrics (85% reduction, 246ms latency), and clear developer pain solved.

**What's overrepresented in hackathons:** Code retrieval MCPs, context management MCPs, code review tools

**What's missing:** Behavioral regression testing for AI agents, local inference-based tools, fine-tuning on codebase

---

## GitHub Issues That Signal Pain

Biggest pain signals from GitHub (Cursor, Claude Code repos):

1. **Issue #40808** — "Critical regression destroying user work" — developer lost entire weekend, built custom OS-level hooks to guard against unauthorized edits
2. **Issue #9228** — "Agents skip verification steps after model update" — quality auditor marking tasks complete without doing any work
3. **Issue #45756** — "Pro Max 5x quota exhausted in 1.5 hours" — 104 upvotes

The developer who lost a weekend built:
```bash
# File scope guard hook — physically blocks edits outside allowed dirs
# Pre-write backup hook — backs up files before agent edits them  
# Action signal gate — blocks writes unless explicit approval flag set
```
Key quote: "CLAUDE.md rules are 'soft' — the model can and does ignore them. Hooks are 'hard' — they execute at the OS level."

**Signal: Developers are building their own safety guards because no good tool exists.**

---

## SWE-CI Benchmark (THE Hottest Topic, March 2026)

Published: March 4, 2026 by Alibaba + Sun Yat-sen University
Coverage: The Register, HackerNews, Medium, Level Up Coding, Engineer's Codex, PulseMark

Key finding: **75% of AI coding agents break working code during long-term maintenance**

This is a watershed paper. Every developer publication covered it. Judges at LA Hacks WILL know about it.

Scores by model (zero-regression rate):
- Claude Opus 4.6: **0.76** (best)
- Kimi-K2.5: 0.37
- GPT-5.2: 0.23
- Most models: <0.25

What this means for judging: If you can demo "our tool increases zero-regression rate" with data, that's a winner.

---

## What NOT to Build (Overdone or Already Exists)

| Category | Why to skip |
|---|---|
| "AI code review" PR bot | Crowded — Claude, Optibot, Unblocked, CodeRabbit all do this |
| Semantic code retrieval MCP | Neocortex already won at the biggest MCP hackathon |
| Code knowledge graph | FastCTX, CleanMCP both built this |
| Chat with your codebase | Every AI IDE already does this |
| "Local Cursor clone" | Too broad, not differentiable |
| AI test generator | Many tools exist, low wow factor |
| GitHub Actions AI bot | Devin, GitHub Copilot Workspace, etc. |

---

## What to Build (Clear Gaps)

1. **Behavioral regression testing** for AI agents — nobody built this, SWE-CI says it's #1 problem
2. **Local-first verification** — all existing review tools are cloud-based
3. **Model drift detection** — silent model updates breaking workflows, no monitoring tool exists
4. **Codebase fine-tuning pipeline** — use GX10 to train model ON your specific repo
5. **Cross-session persistent memory** that works locally — team-shared, no cloud
