# LA Hacks 2026: Broad Research Synthesis & Idea Recommendations

This report synthesizes professional toil, AI agent limitations, local AI advantages, and market gaps to provide actionable project recommendations for LA Hacks 2026, specifically targeting the **Cognition** and **ASUS** tracks.

---

## Top Pain Points (Ranked by Evidence Strength)

### 1. The "Babysitting Tax" (Verification Fatigue)
*   **Pain:** Professionals (doctors, lawyers, engineers) spend more time "correcting" or "verifying" AI output than they would have spent doing the task manually.
*   **Domain:** Legal (citation checking), Healthcare (clinical notes), Software (PR reviews).
*   **Evidence:** Cited in `toil_signals.md` ("Corporate Word Salad") and `agent_limits.md` ("The Verification Gap").
*   **Frequency:** Extremely High (96% of devs distrust AI code but only 48% verify it).
*   **Solution direction:** An agent whose primary job is not *creation*, but *adversarial verification*—finding flaws in another agent's output.
*   **Local AI advantage:** Essential for legal/medical domains where sensitive data cannot be uploaded to a cloud verification service.
*   **Buildable in 32h:** **Yes**. A "Critic Agent" that uses a different model (e.g., DeepSeek-R1 local) to audit a cloud agent's proposal.
*   **Fits Cognition track:** **Yes** (directly "Augments the Agent" by making it reliable).
*   **Fits ASUS local AI track:** **Yes** (Privacy-first verification).
*   **Wow demo moment:** Score: 9/10. Show a cloud agent making a subtle, dangerous error (e.g., a hallucinated case law), and the local "Critic" instantly flagging it with a red "Risk Detected" badge.

### 2. The "Context Rot" (Architectural Drift)
*   **Pain:** Agents make local changes that break global systems because they lose architectural context after ~32k tokens.
*   **Domain:** Software Engineering, Large-Scale Legal Discovery, Financial Audit.
*   **Evidence:** `agent_limits.md` ("Context Rot") and `github_gaps.md` ("The Missing Observability Layer").
*   **Frequency:** High for any project with >50 files or 10+ turns of conversation.
*   **Solution direction:** A "Global State" memory layer (automated Knowledge Graph) that explicitly injects architectural constraints into every prompt.
*   **Local AI advantage:** Large context windows and local vector indexing for speed and privacy.
*   **Buildable in 32h:** **Partial**. A full graph is hard; an automated "Architecture Spec" manager (like a smart `CLAUDE.md`) is buildable.
*   **Fits Cognition track:** **Yes** (improves agent capability).
*   **Fits ASUS local AI track:** **Yes** (Local RAG).
*   **Wow demo moment:** Score: 8/10. Asking an agent to refactor a complex system, and it succeeding because it "knows" the hidden rules it usually misses.

### 3. "Privacy Paralysis" (The Redaction Burden)
*   **Pain:** Professionals cannot use AI because they spend hours manually redacting PII/PHI before uploading.
*   **Domain:** HR (resumes), Legal (discovery), Healthcare (patient data).
*   **Evidence:** `toil_signals.md` ("The Redaction Burden") and `local_ai_wins.md` (Legal/Medical).
*   **Frequency:** Extremely High in regulated industries.
*   **Solution direction:** A "Secure Proxy Agent" that runs locally, redacts data, sends an anonymized version to the cloud for reasoning, and reconstructs the data locally.
*   **Local AI advantage:** Absolute requirement. Data cannot leave the device unredacted.
*   **Buildable in 32h:** **Yes**. A local MCP server or proxy tool.
*   **Fits Cognition track:** **Yes** (enables agents in new domains).
*   **Fits ASUS local AI track:** **Yes** (perfect "Local AI" use case).
*   **Wow demo moment:** Score: 10/10. Dragging a highly sensitive medical record into the tool; seeing it "pixelated" in the cloud view but "fully analyzed" in the local view.

---

## Top 3 Idea Candidates

### 1. "Agent-Critic" (The Verification Mirror)
*   **Name:** MirrorMind
*   **Target domain:** Legal & Software Engineering.
*   **Core Capability:** Adversarial verification. It runs a local "thinking" model (DeepSeek-R1) to find hallucinations in cloud-based agent proposals.
*   **Why Local AI:** Privacy and "model diversity" (using local reasoning to check cloud generation).
*   **Tech Stack:** Ollama (DeepSeek-R1), Node.js, Vercel AI SDK.
*   **Demo Moment:** A cloud agent proposes a "bug fix" that actually breaks security; MirrorMind highlights the specific lines in red and explains *why* it's a risk.
*   **Tracks:** Cognition + ASUS.

### 2. "ProxyPriv" (The Privacy-First Agent Gateway)
*   **Name:** Anonymizer.ai
*   **Target domain:** HR & Clinical Research.
*   **Core Capability:** Local-first PII/PHI redaction and reconstruction.
*   **Why Local AI:** Data sovereignty (HIPAA/GDPR compliance).
*   **Tech Stack:** Python (NER/SpaCy), Ollama (for smart redaction), MCP Server.
*   **Demo Moment:** Processing 100 resumes in 10 seconds—the cloud agent "sees" only anonymized data, but the final report is fully populated with names on the local machine.
*   **Tracks:** ASUS (Primary) + Cognition.

### 3. "Spec-Ops" (The Global Memory Agent)
*   **Name:** SpecOps
*   **Target domain:** Full-stack Software Development.
*   **Core Capability:** Automated maintenance of a "Project DNA" file that prevents architectural drift.
*   **Why Local AI:** Fast local indexing of large codebases.
*   **Tech Stack:** Neo4j (local), LangGraph, MCP, Claude 3.5 Sonnet.
*   **Demo Moment:** A "live visualization" of the project's architecture; as you chat, the agent "checks" its plan against the graph and says "Wait, that breaks the auth flow" before writing a line of code.
*   **Tracks:** Cognition (Primary) + ASUS.

---

## What NOT to build (already saturated or overdone)
*   **Basic Resume Screeners:** Overdone in HR. Unless it's 100% local/private, judges won't care.
*   **Simple RAG Chatbots:** "Chat with your PDF" is a solved problem.
*   **Generic Coding Copilots:** Cursor and Copilot are too good. Build *on top* of them or for *verifying* them.

---

## Recommended Winner: MirrorMind (Agent-Critic)
**Why:** It hits both tracks perfectly. It addresses the #1 industry pain point (Verification/Trust). It uses the hottest new tech (Local Reasoning Models like DeepSeek-R1). It provides a "Wow" demo moment that is instantly understandable to judges.
**Build First:** A local MCP server that intercepts Cursor/Copilot proposals and runs a "hallucination check."
