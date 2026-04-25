# Cognition Track — AI Coding Agent Pain Points
*Research date: April 2026 | Sources: Reddit/r/cursor, Cursor forums, HN, GitHub issues, SWE-CI benchmark, Medium, ProductHunt*

---

## Pain 1: Silent Regression Crisis (THE #1 FINDING)
**Signal strength: 🔴 CRITICAL — brand new benchmark paper, everyone talking about it**

> "75% of AI coding agents break previously working code during maintenance iterations."
> — SWE-CI Benchmark, Alibaba/Sun Yat-sen University, March 4 2026

- Benchmark tested 18 models across 100 real repos spanning avg 233 days of history
- Most models: <0.25 zero-regression rate (break things in 75%+ of maintenance cycles)
- Even best model (Claude Opus 4.6): 0.76 zero-regression rate — still breaks 1 in 4 commits
- Root cause: agents are **local optimizers** — fix current failing tests, don't model cross-file impact
- AI-generated code produces **1.7x more issues** than human-written code (CodeRabbit, 470 PRs)
- Logic/correctness errors up 75% — not syntax errors, **semantic misunderstandings**

Real example found:
> "Agent refactored a shared utility — changed return type from `string | null` to `string | undefined`. Six modules depended on it. Three had null checks that now silently passed undefined. Data corruption propagated downstream for two weeks."

**Why no existing tool solves it:** Current CI only tests new code. Nobody tests regression across files the agent DID NOT touch.

---

## Pain 2: Context Loss Between Sessions
**Signal strength: 🔴 HIGH — most upvoted complaints across Reddit, Cursor forums**

> "Context management is the real bottleneck for AI agents — not model capability."
> — r/cursor, highly upvoted post

> "Cursor has become completely unusable. It can't keep any of its rules or context from prompt to prompt. I spend hours trying to get it to focus."
> — Cursor forum, May 2025

> "The agent stopped reading context before editing. It got lazier — fewer files read, more assumptions made."
> — Medium, developer deploying AI agents at scale

Key specifics:
- Every session starts from zero — agents re-learn the codebase each time
- Teams spend 30-40% of AI session time re-explaining context
- No persistent memory of architectural decisions, past failures, codebase-specific patterns
- **Current workaround:** CLAUDE.md files — but these are "soft" and get ignored as context grows

---

## Pain 3: Silent Model Update Behavioral Drift
**Signal strength: 🟠 HIGH — confirmed by GitHub issues, Medium article, Register news**

> "I woke up to a message: 'Did something change? The agent is rewriting entire files again.' Same prompts. Same codebase. But the model silently updated."
> — Medium, April 2026

Real measured impact after silent model update:
- Code reading dropped 3x (agent stopped reading context before editing)
- Full file rewrites increased 2x (surgical edits became scorched-earth replacements)
- CI failure rate doubled in 3 days
- 5 production outages traced to agent-generated code

> "Anthropic admits Claude Code users hitting usage limits 'way faster than expected'"
> — The Register, March 31, 2026

Anthropic confirmed bugs in Claude Code 2.1.84-86 causing:
- Cache not working → costs 10-20x higher than expected
- CLAUDE.md rules stripped from subagents
- Instruction-following regressions

**Key insight:** Developers have no tool to detect when AI behavior drifts after model updates.

---

## Pain 4: No Visibility Into What the Agent Is Doing
**Signal strength: 🟠 HIGH**

> "Claude repeatedly claims it analyzed code and found the issue — but it's very clear it either ignored the attached file, truncated it, or reverted to a cached version. Cursor provides no visibility into how it's making decisions."
> — Cursor forum

> "CLAUDE.md rules are 'soft' — the model can and does ignore them, especially after context compaction. Hooks are 'hard' — they execute at the OS level."
> — GitHub issue #40808, Claude Code

Problems:
- No visibility into what files the agent actually read
- No visibility into what context is cached vs fresh
- No visibility into why the agent made a specific decision
- Hard to audit AI-generated PRs for architectural impact

---

## Pain 5: Token Quota Exhaustion
**Signal strength: 🟡 MODERATE (pain point, but not buildable as core product)**

- Claude Code Pro Max 5x: quota exhausted in 1.5 hours
- Cache bug inflating costs 10-20x on recent versions
- Copilot "unlimited" plan secretly has hidden quotas with zero visibility
- Developers running automated workflows drain budget in minutes silently

---

## What's Already Built (Do NOT Repeat)
| Project | What it does | Gap |
|---|---|---|
| Neocortex (Devpost) | Semantic code retrieval MCP, 85% token reduction | Cloud only, JS/TS only, no regression testing |
| CleanMCP (Devpost) | MCP interceptor + Neo4j, captures context | Context capture only, no verification |
| FastCTX (Devpost) | Code knowledge graph via Neo4j | Static, no local inference |
| Claude Code Review (PH #3, 562 upvotes) | Multi-agent PR bug detection | Cloud only, not behavioral regression |
| Optibot (PH #3, 497 upvotes) | Agentic code review in GitHub | Cloud, not local |
| Unblocked (PH, 150 upvotes) | Context-aware code review | Cloud, PR review not maintenance |

**THE GAP: Nobody is doing behavioral regression testing for AI agents, locally.**
