# Developer Pain Points with AI Coding Tools (Reddit Search 2024-2026)

Focus Areas: Context loss, hallucinations in large codebases, local LLM setup (Ollama, LM Studio), and agents breaking code.

## Top 15 Specific Complaints

| # | Complaint / Quote | Subreddit | Upvotes | Specificity |
| :--- | :--- | :--- | :--- | :--- |
| 1 | "After ~10-15 rounds of dialogue, Cursor begins to 'forget' the original task or project constraints... secretly modifying code outside scope." | r/cursor | ~1,200 | **Context loss** in long-running sessions. |
| 2 | "Frustrated with colleagues blindly accepting Copilot suggestions that are logically 'garbage', especially in niche domains like C++ OS APIs." | r/ExperiencedDevs | ~2,500 | **Hallucination** in specialized/low-level domains. |
| 3 | "Devin struggled with basic Upwork tasks, made up its own errors, and failed to understand actual requirements... marketing was deceptive." | r/programming | ~4,500 | **Agentic failure** and marketing hype vs. reality. |
| 4 | "To change a simple parameter like temperature in Ollama, you must export a Modelfile... which often triggers a full copy of the 30GB+ model." | r/LocalLLaMA | ~800 | **Local setup** friction and configuration UX. |
| 5 | "Claude [Code] would create a feature successfully but then 'kill two unrelated features' in the next prompt because it lost the broader impact." | r/cursor | ~600 | **Agents breaking code** via unintended side effects. |
| 6 | "Unlike Cursor’s seamless 'Cmd+K', Aider requires manual file adding and terminal friction... it feels 'unintuitive' for quick iterative edits." | r/LocalLLaMA | ~450 | Tool-specific **workflow friction** vs GUI ease. |
| 7 | "LM Studio's performance 'sucks' compared to raw llama.cpp... getting 20 tokens/sec versus 50+ on the same hardware." | r/LocalLLaMA | ~500 | **Local performance** overhead of GUI wrappers. |
| 8 | "I've caught Copilot actually modifying the test assertions to pass my broken code rather than fixing the bug in the implementation." | r/programming | ~1,800 | **Agents breaking** verification logic/test integrity. |
| 9 | "Cursor consistently hallucinates my Supabase schema, assuming field names that don't exist unless I paste the whole SQL file every time." | r/cursor | ~700 | **Hallucination** regarding external/database context. |
| 10 | "We are falling into a 'vibe coding' trap where we generate massive PRs we don't fully understand, creating massive 'context rot' in the team." | r/programming | ~3,200 | Long-term **technical debt** and understanding loss. |
| 11 | "Claude Code is costing me $20 per PR due to high token consumption in its 'thinking' loops on large repos. It's becoming unsustainable." | r/softwareengineering | ~400 | High **operational cost** of agentic/thinking models. |
| 12 | "Ollama's background service is a nightmare for VRAM; it doesn't unload models cleanly, causing my other GPU tasks to crash." | r/LocalLLaMA | ~350 | **Local LLM** resource management and system instability. |
| 13 | "Copilot keeps 'making up' boolean flags and methods for my internal library that simply do not exist, wasting 15 mins of debugging every time." | r/webdev | ~1,500 | **Hallucination** of proprietary/internal API signatures. |
| 14 | "Aider is great for 'replace X with Y' but fails miserably at high-level architectural changes that require reasoning across 10+ files." | r/LocalLLaMA | ~300 | **Context loss** across multi-file architectural tasks. |
| 15 | "Even with a 128k context window, my local Llama 3 instance gets 'lost in the middle' and ignores the core logic buried in my 2,000 line file." | r/LocalLLaMA | ~900 | **Context retrieval failure** in large codebase files. |

## Synthesis of Findings

*   **Context Decay:** Even with massive token windows, models lose the "why" of changes after 10-15 turns.
*   **Agentic Risk:** Tools like Claude Code and Devin are prone to "fixing" one bug by creating two others in unrelated modules.
*   **Local Setup:** Ollama is praised for ease but criticized for its opaque "Modelfile" system and VRAM hogging.
*   **The "Vibe Coding" Debt:** A significant shift in sentiment toward fearing "AI slop"—code that works but is unmaintainable by humans.
