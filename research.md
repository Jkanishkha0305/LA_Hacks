# LA Hacks 2026 — Research Orchestrator Prompt

Paste the master prompt below into Gemini (Google Search grounding active).
Add this line at the top before pasting:
> Use Google Search for all queries. Search multiple times with different keywords. Prioritize results from 2024-2026.

---

## Master Orchestrator Prompt

You are a hackathon research orchestrator for LA Hacks 2026.

GOAL: Find specific, current (2025-2026) pain points across ALL professional knowledge work domains where:
- AI agents could eliminate repetitive, high-toil workflows
- Running AI locally (on-device, private, fast) would provide a meaningful advantage over cloud

Target tracks:
- Cognition "Augment the Agent" ($3,000): Build a tool/product that makes AI agents measurably more capable OR eliminates professional toil that agents can't yet handle. Domain is OPEN — not just coding.
- ASUS Ascent GX10 "Local AI" ($4,000+): What becomes possible when AI runs locally instead of in the cloud? Privacy, speed, offline, no API costs. Any domain.

Team: 2 fullstack+ML devs, 32 hours to build.

DO NOT restrict to coding/dev tools only. Cast wide — then filter by:
1. Is this toil real and frequent? (evidence from real users)
2. Can an AI agent actually solve it today?
3. Can 2 devs build a working demo in 32 hours?
4. Would running it locally be a meaningful advantage?

Spawn ALL 6 subagents below IN PARALLEL. Each saves a markdown to /research/.
After all 6 finish, run the SYNTHESIS agent.

---

## SUBAGENT 1: Professional Toil Across Domains → /research/toil_signals.md

Search Reddit, forums, and communities (2024-2026) for high-frequency professional toil in these domains:
- Legal: contract review, clause extraction, due diligence, compliance checks
- Healthcare/clinical: prior authorizations, clinical note writing, discharge summaries, coding (ICD)
- Finance/accounting: invoice processing, reconciliation, audit prep, report generation
- Design/product: design-to-spec handoff, changelog writing, PRD generation
- HR/recruiting: resume screening, offer letter generation, onboarding docs
- Research/academia: literature review, citation extraction, summarization
- Customer support: ticket triage, response drafting, escalation routing
- Sales/BD: proposal writing, CRM data entry, follow-up drafting

For each domain:
- What specific task consumes the most time and is most repetitive?
- What do professionals complain about most?
- Are there existing tools that partially solve it? What gap remains?
- Would local/private AI be a strong advantage here (sensitive data)?

Quote real complaints where possible. Rate each pain: High / Medium / Low signal.
Save to /research/toil_signals.md

---

## SUBAGENT 2: AI Agent Limitations (Dev Tools + General Agents) → /research/agent_limits.md

Search HackerNews, Reddit (r/LocalLLaMA, r/cursor, r/ExperiencedDevs, r/programming), and Twitter/X for:
- Where AI coding agents fail today (Cursor, Copilot, Devin, Claude Code, Windsurf)
- Where general-purpose AI agents fail (AutoGPT, Devin, Agent frameworks)
- Context loss, hallucinations, multi-step failures, verification gaps
- What users say agents CANNOT do that they wish they could

Specific searches:
- "AI agent context loss" OR "agent breaks code"
- "Devin failed" OR "Claude Code frustrating"
- "AI can't handle" site:news.ycombinator.com
- "what AI agents still can't do" site:medium.com OR site:dev.to

Output top 15 specific failure modes ranked by evidence strength.
Save to /research/agent_limits.md

---

## SUBAGENT 3: Local AI Advantage Cases → /research/local_ai_wins.md

Search for use cases where running AI locally (Ollama, LM Studio, on-device) is a CLEAR WIN over cloud:
- Privacy-sensitive domains (legal docs, medical records, financial data, HR files)
- Latency-critical workflows (real-time transcription, live coding assist, edge devices)
- Cost-sensitive high-volume tasks (processing 1000s of docs without API fees)
- Offline/air-gapped environments (defense, regulated industries, field work)
- Compliance requirements (HIPAA, GDPR, SOC2 — data can't leave device)

Search queries:
- "why I switched to local LLM" site:reddit.com
- "on-premise AI" OR "local AI" privacy advantage 2025
- "HIPAA compliant AI" OR "offline AI" professional use
- "Ollama production" use case
- "can't use cloud AI because" compliance OR privacy

For each case: domain, specific advantage of local, what people are building.
Save to /research/local_ai_wins.md

---

## SUBAGENT 4: GitHub Issues + Open Source Gaps → /research/github_gaps.md

Search GitHub for open issues and feature requests in:

AI agent / coding assistant repos:
- continuedev/continue
- paul-gauthier/aider
- ollama/ollama
- microsoft/vscode-copilot-release
- All-Hands-AI/OpenHands

General agent framework repos:
- langchain-ai/langchain
- microsoft/autogen
- crewAIInc/crewAI

For each repo:
- Top 10 most reacted open issues
- Feature requests with 20+ thumbs up
- Issues labeled: UX, pain-point, enhancement, limitation
- What do users keep asking for that doesn't exist?

What patterns appear across repos? What gap is most frequently requested?
Save to /research/github_gaps.md

---

## SUBAGENT 5: Market Landscape (What's Already Built) → /research/market_landscape.md

Search ProductHunt, Devpost, and tech media to find what's ALREADY been built:

ProductHunt (2024-2026): search "AI agent" "professional workflow" "AI automation" "local AI"
- What problems are recently launched products solving?
- What's getting 500+ upvotes? (= validated pain)
- What comments say "finally someone built this"?

Devpost hackathon winners (2024-2026): search for projects in:
- AI developer tools, MCP servers, agent plugins
- Professional workflow automation
- Local/on-device AI tools
- Document processing, knowledge work automation

For each: what did it solve, what tech, did it win, what did it NOT solve (= the gap)?

Tech media (TechCrunch, The Verge, VentureBeat 2025-2026):
- "AI agents for [domain]" market analysis
- "problems AI agents still can't solve"
- "$X startup raises to automate [workflow]"

Output: What's saturated (don't build), what's validated but unsolved (build this).
Save to /research/market_landscape.md

---

## SUBAGENT 6: Winning Hackathon Strategy → /research/winning_patterns.md

Research what makes AI agent projects WIN at hackathons (MLH, Devpost, LA Hacks specifically):

Search:
- site:devpost.com "best use of AI" winner 2024 OR 2025
- "LA Hacks winner" AI project
- "hackathon winning AI agent" what made it stand out
- MLH 2024 2025 top AI projects

For each winning project:
- What was the demo moment? (what did judges SEE)
- What problem did it solve and in what domain?
- What was the tech stack?
- Why did it beat others?

Also research Cognition/Devin specifically:
- What has Cognition published about agent limitations?
- What does the Devin engineering team care about?
- What would impress Devin engineers as judges?

Output: Patterns in winning projects + what Cognition judges likely want to see.
Save to /research/winning_patterns.md

---

## SYNTHESIS AGENT (run AFTER all 6 complete)
saves /research/synthesis.md

Read ALL files in /research/ (toil_signals.md, agent_limits.md, local_ai_wins.md, github_gaps.md, market_landscape.md, winning_patterns.md) and synthesize.

Output format:

## Top Pain Points (ranked by evidence strength)
For each pain point:
- Pain: [specific, 1 sentence]
- Domain: [legal / medical / dev / finance / etc]
- Evidence: [which sources, quotes]
- Frequency: [how many people hit this]
- Solution direction: [what an AI agent would actually do]
- Local AI advantage: [why on-device beats cloud here]
- Buildable in 32h by 2 devs: [Yes / Partial / No + why]
- Fits Cognition track: [Yes / No + why]
- Fits ASUS local AI track: [Yes / No + why]
- Wow demo moment: [what judges would see, score 1-10]

## Top 3 Idea Candidates
For each:
- Name + one-line pitch
- Target domain + specific user
- Core AI agent capability required
- Why local AI is the right choice
- Tech stack (keep it 32h-feasible)
- Demo moment (what judges see in 2 minutes)
- Which tracks it hits + why it could win

## What NOT to build (already saturated or overdone)
List with reason.

## Recommended Winner
One idea. Why this one. What to build first.
