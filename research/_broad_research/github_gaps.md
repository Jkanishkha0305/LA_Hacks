# GitHub Research: Gaps in AI Agent & Coding Assistant Frameworks

## Top 10 Most Reacted Open Issues/Feature Requests
1.  **Ollama: AMD GPU (ROCm) Support & Parallelism** (100+ 👍)
    - Users demand better support for non-NVIDIA hardware and the ability to handle multiple requests simultaneously for server-side deployments.
2.  **Continue: Neovim Support (#917)** (40+ 👍)
    - A massive push to bring the full IDE experience (Chat, Edit, Autocomplete) to Neovim users.
3.  **Continue: Tab Autocomplete/Inline Completions** (High Reaction Volume)
    - Persistent demand for a "GitHub Copilot" equivalent that works seamlessly with local and custom models.
4.  **LangChain: Native MCP (Model Context Protocol) Support** (High Impact)
    - Significant interest in standardizing tool-calling and "lazy" result loading to reduce token costs and improve speed.
5.  **AutoGen: Governance & Safety Extension (#7613)** (Conceptual High Engagement)
    - Proposals for a "Governance" layer to enforce policies and manage agent identities in complex multi-agent systems.
6.  **Ollama: Strict Structured Output (JSON Schema)** (High Demand for Agents)
    - Essential for developers building agents that require guaranteed JSON formats for reliable downstream processing.
7.  **LangChain: Exposing "Reasoning" & "Thinking" Fields** (40+ 👍 across issues)
    - Users want access to the internal "thought process" of models like DeepSeek-R1 for debugging and UX.
8.  **Aider: Architect Mode Refinements** (High Community Discussion)
    - Requests for more granular control over which model handles "reasoning" (Architect) vs. "coding" (Editor).
9.  **Continue: Agent Mode support for LM Studio (#5182)** (20+ 👍)
    - Desire for "Agent Mode" (autonomously performing multi-step tasks) to work with local model providers.
10. **CrewAI: Visual Workflow Builder / No-Code Orchestration** (High Feature Request Density)
    - Demand for a visual way to map out agent interactions and dependencies rather than pure code-based setup.

## Requests with 20+ Thumbs Up (Selection)
- **Continue #2061:** Fixing conflicts between Continue's autocomplete and IntelliJ's native completions.
- **Continue #4791:** Standardizing MCP server paths (NPX availability) across different OS environments.
- **Aider:** Expanding vision support to providers like OpenRouter and local multimodal models.
- **AutoGen:** Internationalization (i18n) support for the AutoGen Studio UI.
- **CrewAI:** Granular output passing between agents (passing specific data instead of full context).

## Patterns Across Repositories
- **Observability vs. "Black Box":** Across all frameworks (LangChain, AutoGen, CrewAI), there is a strong pattern of users asking for better visibility into the "thinking" process. They want to see the reasoning before the result.
- **Local Model Parity:** Users of Aider, Continue, and Ollama are constantly pushing for features that bridge the gap between local models (DeepSeek, Llama) and top-tier proprietary ones (Claude 3.5 Sonnet).
- **Control & Intervention:** A recurring theme is the need to "stop and steer." Users want to pause an agent, correct its course, or swap a model mid-task without losing context.
- **Standardized Interoperability:** The rise of **MCP (Model Context Protocol)** is a dominant pattern. Users want one standard for tools that works everywhere (Continue, Aider, LangChain).

## The Missing Gap: "The Observability & Intervention Layer"
**The most frequently requested gap that doesn't fully exist is a standardized "Observability & Intervention Layer" for agentic workflows.**

Current tools are either:
1.  **Highly Abstract (Black Box):** They do the job but hide the "thinking," making it hard to debug when they hallucinate.
2.  **Highly Manual:** You have to build the entire orchestration yourself.

**The Gap:** A unified UI/UX pattern that displays "Thinking" tags natively, allows for **human-in-the-loop (HITL) intervention** mid-reasoning, and uses a standardized protocol (like MCP) to swap tools and models dynamically. Developers are tired of "black box" agents and want a "glass box" where they can see the gears turning and reach in to adjust them.
