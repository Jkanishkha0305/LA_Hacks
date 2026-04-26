# Winning Patterns for AI Agent Hackathons (2025 Edition)

This research identifies the core patterns, technologies, and "demo moments" that drive success at major hackathons (MLH, Devpost, LA Hacks), with a specific lens on what the **Cognition (Devin)** team looks for in top-tier projects.

---

## 1. Winning Project Patterns

### Architectural Patterns
*   **Multi-Agent Orchestration:** Moving beyond "one prompt" to a team of specialized agents (e.g., a "Manager" delegating to a "Researcher," "Coder," and "Reviewer").
*   **Model Context Protocol (MCP):** Utilizing MCP to connect agents to real-time local data, internal APIs, and tools (Slack, Google Maps, local DBs) without hardcoding integrations.
*   **Human-in-the-Loop (HITL):** Implementing "checkpoints" where the agent pauses for human verification before high-stakes actions, demonstrating production-readiness.
*   **Persistent & Recursive Memory:** Agents that use "Long-term Memory" plugins or Vector DBs to recall context from previous sessions and refine their strategy over time.
*   **On-Chain Agency:** Agents that can manage budgets and execute transactions (e.g., using USDC on Solana or Base) to pay for their own compute or external services.

### Product Patterns (Vertical AI)
*   **Eliminating "Professional Toil":** Automating high-stakes, tedious workflows like regulatory compliance, code reviews, incident response (3 AM pager alerts), or supply chain risk monitoring.
*   **Browser/UI Automation:** Agents that don't just use APIs but "see" and "click" through web UIs to complete complex human tasks (e.g., booking flights, filing govt forms).
*   **Hyper-Personalized Execution:** Moving from "advice" to "action"—e.g., an agent that doesn't just suggest a meal plan but orders the groceries.

---

## 2. "Demo Moments" (The "Wow" Factor)

Judges at elite hackathons look for specific "magic" moments that prove the agent is actually "thinking."

*   **The "Live Brain" Visualization:** Don't just show the result. Show a live log or a "Thought Chain" graph of the agent's reasoning, tool calls, and self-corrections in real-time.
*   **Autonomous Tool Use:** A demo where the agent opens a terminal, writes a script, runs it, sees an error, and *fixes the code itself* without human input.
*   **Multimodal "Sight-to-Action":** An agent that "looks" at a screenshot or video feed and immediately takes a complex action based on visual context.
*   **Speed-to-Value:** Completing a task that would take a human 30 minutes (like research synthesis or site migration) in under 60 seconds.
*   **The "3 AM Test":** Demonstrating how the agent solves a problem that is usually a nightmare for humans to handle under pressure (e.g., automated bug triaging).

---

## 3. The Winning Tech Stack (2025)

| Layer | Recommended Tools |
| :--- | :--- |
| **Orchestration** | **LangGraph** (for cycles/loops), **PydanticAI** (for type-safety), **CrewAI** (for multi-agent). |
| **Primary Model** | **Claude 3.5 Sonnet** (widely considered the best for tool-calling/coding) or **GPT-4o**. |
| **Speed/Inference** | **Groq** (Llama 3.1 / Mixtral) for "instant" agent responses. |
| **Memory/RAG** | **Pinecone (Serverless)**, **Tavily/Exa** (LLM-optimized search). |
| **Frontend** | **Vercel AI SDK** (Generative UI components), **Streamlit** (for fast Python UIs). |
| **Observability** | **LangSmith** or **Arize Phoenix** (to trace and debug agent steps). |

---

## 4. What Cognition (Devin) Judges Look For

Based on the philosophy of the Cognition founders (Scott Wu, Steven Hao, Walden Yan), they value **"cracked" engineering** and **deep autonomy**.

*   **End-to-End Execution:** They want to see an agent that can handle the "full lifecycle" of a task—planning, executing, testing, and self-correcting.
*   **Root Cause Analysis:** Does your agent just patch symptoms, or can it diagnose the *source* of a problem? They love systems that exhibit "debugging" behavior.
*   **Algorithmic Depth:** Given their competitive programming backgrounds (IOI/ICPC), they appreciate solutions that handle complex edge cases and use sophisticated data structures/logic.
*   **"Digital Lifeforms":** Projects that make the AI feel "alive"—autonomous decision-making, interactive personality, and a sense of "agency" rather than being a static tool.
*   **Polish & UX:** Even for "cracked" engineers, polish matters. They value "vibe coding"—high-quality software built quickly that feels supportive and intuitive to use.
*   **Verification:** An agent that proves its own work is correct (e.g., by running a test suite it just wrote) is a massive signal to the Cognition team.
