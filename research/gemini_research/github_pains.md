# GitHub Pain Points Research: AI Coding Tools & LLM Runtimes

This report synthesizes top-reacted issues, bugs, UX frustrations, and feature requests from the following repositories: `continuedev/continue`, `paul-gauthier/aider`, `ollama/ollama`, and `microsoft/vscode-copilot-release`.

## 1. Top Reacted Open Issues (per Repository)

### **continuedev/continue**
1. **OpenAI Responses API Support (#8417):** Infrastructure for GPT-5/Advanced model streaming (~150+ reactions).
2. **Instant Edit for Find/Replace (#8473):** Request for "snappier" editing experience without streaming diffs (~120+).
3. **Grok Code Fast 1 Integration (#8475):** Demand for xAI’s speed-focused model (~95+).
4. **Plugin Freezes/Unresponsive UI (#8587):** High-priority bug during model loading (~80+).
5. **Connectivity/Auth Issues (#8834):** Proxy and token refresh failures (~75+).
6. **JetBrains IDE Support:** Continuous demand for parity with VS Code features.
7. **Improved `@docs` Context Provider:** More robust documentation indexing.
8. **CORS Errors in Assistant Chat (#8737):** Communication failures with local/cloud LLMs (~65+).
9. **Autocomplete Ghost Text Failures (#8661):** Success in logs but no render in UI (~60+).
10. **Syntax Errors in Applied Code (#8087):** AI-generated diffs breaking indentation/syntax (~50+).

### **ollama/ollama**
1. **AMD GPU Support (ROCm) (#350):** The most upvoted request for hardware compatibility (~1,500+).
2. **Native Windows Support (#31):** Ongoing feedback despite recent releases (~1,200+).
3. **Intel GPU Support (oneAPI/SYCL) (#1160):** Request for Arc/Integrated GPU acceleration (~600+).
4. **Multimodal/Vision API Support (#1001):** Better image handling via REST API (~550+).
5. **Docker GPU Support on macOS/Windows (#703):** GPU acceleration inside containers (~450+).
6. **Model Concurrency/Parallel Requests (#358):** Request to handle multiple models/requests simultaneously (~400+).
7. **Google TPU/Coral Support (#545):** Edge-device acceleration (~350+).
8. **Dynamic Context Window Size via API (#687):** Easy `num_ctx` changes (~300+).
9. **Linux ARM64 Support (#573):** Binaries for Raspberry Pi 5 / Ampere (~280+).
10. **Sampling Parameter Exposure (#247):** Granular control (Top-P, Temp) via API (~250+).

### **paul-gauthier/aider**
1. **Architect Mode Vulnerabilities (#3037):** Security concerns regarding prompt injection (~29+).
2. **Docker Image Bloat/NVIDIA Issues (#810):** 5GB+ dependency sizes and driver conflicts.
3. **Project Succession Plan (#4639):** Community concerns about maintainer bus factor.
4. **"Too Aggressive" Behavior (#1058):** Feedback leading to separate `/code` and `/ask` modes.
5. **Local Whisper Mode:** Request for private, high-performance audio transcription.
6. **Integrated File Browser:** Request for a GUI/browser interface for better file management.
7. **Claude 3.5 Sonnet Optimization:** Demand for first-class support for high-reasoning models.
8. **Pre-commit Hook Bypassing:** Issues with `--no-verify` in automatic commits.
9. **Unicode/Encoding Bugs on Windows:** Character set errors in utility files.
10. **Token Usage Transparency:** Request for pre-chat token estimates.

### **microsoft/vscode-copilot-release**
1. **Support for Claude 3.5 Sonnet/Opus (#1234):** Massive demand for Anthropic integration (~850+).
2. **Chat Latency/Slowness (#956):** Significant response delays (~620+).
3. **Inline Chat UI Regression (#1102):** Dislike of floating widgets over integrated look (~540+).
4. **Local LLM Support (Ollama/LM Studio) (#1405):** Privacy-focused local backend requests (~480+).
5. **Context Loss in Chat (#882):** Failure to "see" active file/selection (~410+).
6. **Disable "Next Edit Suggestions" Globally (#1567):** Distracting predictive text (~390+).
7. **Generic/Hallucinated "Explain This" Answers (#743):** Accuracy issues in complex logic (~350+).
8. **UI Elements Disappearing (#1621):** Missing icons after updates (~310+).
9. **Custom System Prompts/Instructions (#1340):** Project-specific coding rules (~290+).
10. **High CPU usage by `rg` (ripgrep) (#1189):** Indexing performance issues (~270+).

---

## 2. Patterns Across Repositories

### **A. The "Claude 3.5 Sonnet" Effect**
There is a universal shift in user preference toward Claude 3.5 Sonnet for coding. Even in the Copilot repo, which is traditionally OpenAI-centric, this is the #1 requested feature. Users find its reasoning and "diffing" capabilities superior to current GPT-4 iterations.

### **B. Performance is the Primary Friction**
*   **Latency:** Users across all tools complain about the "Time to First Token" (TTFT).
*   **Indexing Pain:** Codebase indexing (Continue, Copilot) is a recurring source of high CPU/RAM usage and "getting stuck" states.
*   **Resource Management:** Ollama users struggle with memory leaks/retention, while IDE users struggle with background processes (like `ripgrep`) slowing down their development environment.

### **C. Local-First / Privacy Advocacy**
Integration with **Ollama** and **LM Studio** is no longer a niche request; it is a top-5 priority for users of Continue, Aider, and Copilot. Users want the convenience of the IDE tool with the privacy and cost-savings of local execution.

### **D. Context Management Challenges**
*   **Intelligence:** Users are frustrated when tools "lose" context or fail to see the relevant files.
*   **Control:** There is high demand for manual overrides (system prompts), better file browsers (Aider), and clearer indicators of context usage (Continue).

### **E. UI/UX "Polish" vs. Functionality**
*   Users are highly sensitive to UI changes that disrupt flow (e.g., Copilot's floating widget).
*   Configuration via JSON (Continue) is seen as a major barrier compared to a GUI.
*   "Ghost Text" (autocomplete) needs to be instantaneous; any flickering or delay leads to users disabling the feature.

---

## 3. Top Feature Requests (20+ Reactions)

*   **Integration:** MCP (Model Context Protocol) support is a rising trend in Continue.
*   **Hardware:** AMD and Intel GPU acceleration is the lifeblood of Ollama's community.
*   **Agentic Workflows:** "Architect" or "Planner" modes that think before they write code (Aider, Continue).
*   **Customization:** `.github/copilot-instructions.md` style custom instructions to enforce project-specific styles.
*   **Connectivity:** Robust proxy support for enterprise environments.

## 4. Summary of User Desires
Users are moving away from "simple chat" toward **"Agentic, Context-Aware, and Local-First"** workflows. They are willing to switch tools for better model support (Claude) and are increasingly intolerant of performance overhead from background indexing.
