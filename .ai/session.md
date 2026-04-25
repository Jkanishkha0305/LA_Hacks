# Session State

Last Updated: Codex — 2026-04-23 — edge + agentic OSSInsight sweep

## Status
🟡 Planning phase — no project decided yet

## In Progress
- Deciding on challenge and project idea
- Comparing sponsor tracks by build effort, judging fit, and prize overlap

## Done
- Repo initialized
- CLAUDE.md, AGENTS.md, .ai/session.md scaffolded
- LA_Hacks_Challenges.md has full challenge/prize info
- Reviewed LA_Hacks_Challenges.md and mapped the 5 broad event tracks plus 17 sponsor challenges
- Explored OSSInsight trending and collection pages for inspiration repos
- Queried live OSSInsight MCP API for trending, collection rankings, and hot-repo details
- Saved consolidated research notes to chatgpt_research.md
- Completed a deeper OSSInsight website pass across Trending (24h/week/month plus All/Python/TypeScript/JavaScript/Rust/Go), working collection pages, repo analyze pages, and Data Explorer prompts
- Verified that some user-listed OSSInsight collection URLs currently 404 on 2026-04-23: coding-agents, ai-coding-assistants, rag-frameworks, llm-inference-engines
- Pulled structured repo-health data from OSSInsight analyze pages for likely starters: graphify, claude-mem, openai-agents-python, jan, n8n, livekit, VoxCPM, medplum, codecarbon, DeepTutor, temporal, activepieces, nats-server, MONAI
- Ran a focused OSSInsight edge + agentic sweep across live collections/API/blogs for Fetch.ai, Cognition, ZETIC, and ASUS fit
- Reviewed the ASUS Ascent GX10 official product page and pulled a current GitHub repo shortlist for local-AI builds on 2026-04-23
- Researched prior winners from NVIDIA and other hardware-heavy/on-device competitions to understand what actually wins GPU/edge-compute tracks
- Restored `hackathon_winner_resesarch.md` to its original prompt scaffold and moved the hardware-track winner memo into `research/hardware_hackathon_patterns.md`
- Pulled an updated ASUS-focused GitHub shortlist on 2026-04-24 spanning local inference, multimodal UX, document intelligence, and physical-AI repos

## Blocked / Decisions Pending
- Challenge selection
- Tech stack
- Team members / roles

## Context & Key Decisions
- Once challenge is picked: update CLAUDE.md and AGENTS.md with project details, stack, and how to run
- Check LA_Hacks_Challenges.md for judging criteria before building anything
- Broad event themes: climate, health, education/accessibility, productivity/flow, and agents
- Sponsor opportunities range from fully product-shaped asks (World, ZETIC, Cloudinary, HKKB) to tooling/integration asks (Fetch.ai, Cognition, MLH side prizes)
- Strong candidates should ideally stack a main sponsor challenge with one or more MLH side prizes when possible
- Exclude the Solana side prize from the shortlist; keep other tracks open for separate evaluation
- OSSInsight research suggests strongest inspiration areas are agent memory/context, repo knowledge graphs, multi-agent task orchestration, MCP-native tools, and keyboard-first terminal UX
- Repos worth revisiting during ideation: thedotmack/claude-mem, safishamsi/graphify, multica-ai/multica, block/goose, sst/opencode, openai/openai-agents-python, xtermjs/xterm.js, wezterm/wezterm
- Live OSSInsight hot repos on 2026-04-23 include block/goose, openai/openai-agents-python, langfuse/langfuse, VoltAgent/voltagent, menloresearch/jan, run-llama/llama_index, chroma-core/chroma, confident-ai/deepeval, TabbyML/tabby, facebookresearch/faiss, deepset-ai/haystack, and GH05TCREW/PentestAgent
- Best fit clusters from the live data: Cognition (goose, langfuse, deepeval, llama_index, chroma), Fetch.ai agent tracks (openai-agents-python, VoltAgent, goose), ASUS/ZETIC (jan, tabby, faiss, chroma), Education (llama_index, haystack, jan)
- OSSInsight repo-detail endpoint returned 404 for some repos like block/goose and menloresearch/jan, so use ranking data plus official GitHub repo pages as fallback descriptions
- Current OSSInsight website pass suggests the most actionable repo starters are:
  - Cognition/context: safishamsi/graphify, thedotmack/claude-mem, openai/openai-agents-python
  - Local-first/on-device: janhq/jan, pytorch/executorch
  - Networking/data routing: nats-io/nats-server, livekit/livekit
  - Productivity automation: n8n-io/n8n, activepieces/activepieces, temporalio/temporal
  - Health/climate/education side tracks: medplum/medplum, Project-MONAI/MONAI, mlco2/codecarbon, PyPSA/PyPSA, HKUDS/DeepTutor, OpenBMB/VoxCPM
- Repo health notes from OSSInsight:
  - Safer fork signals from PR-to-star activity: medplum, executorch, activepieces, temporal, n8n, nats-server
  - Hype or maintainer-heavy signals despite strong star growth: graphify, claude-mem, VoxCPM, DeepTutor
- Best current project direction is a Cognition-first build with Fetch.ai as a stretch, rather than trying to stack every sponsor track into one complex local plus mobile plus voice build
- Fresh OSSInsight edge + agentic findings on 2026-04-23:
  - Strongest live agent framework momentum: `openai/openai-agents-python` (+774 stars / 28d, +236.5%) and `VoltAgent/voltagent` (+257, +41.2%)
  - Strongest MCP/coding-agent execution signal: `block/goose` (+1,880 / 28d, +248.1%) with `sst/opencode` still huge but cooling
  - Strongest local inference signal: `ggml-org/llama.cpp` (+1,149 / 28d), `ollama/ollama` (+720), `open-webui/open-webui` (+784), `vllm-project/vllm` (+596)
  - Portable/offline edge surprise picks: `Mozilla-Ocho/llamafile` (+79 / 28d, +259.1%), `mlc-ai/web-llm` in inference engines, `google-ai-edge/gallery` surfacing in monthly trend results, and `menloresearch/jan` still ranking inside MCP clients
  - Useful supporting layers for a real product demo: `mem0ai/mem0`, `langfuse/langfuse`, `confident-ai/deepeval`, `livekit/livekit`
  - Most promising concept buckets from this pass:
    - local multi-agent concierge on ASUS / ZETIC
    - local code-intelligence or agent verification tool for Cognition
    - on-device tutor / accessibility assistant with optional Agentverse registration
- Fresh ASUS repo shortlist findings on 2026-04-23:
  - Most sponsor-aligned core inference stacks: `NVIDIA/TensorRT-LLM` and `ollama/ollama`
  - Best local UX shells for a judge demo: `open-webui/open-webui` and `janhq/jan`
  - Best multimodal building blocks: `ggml-org/whisper.cpp`, `rhasspy/piper`, `livekit/agents`
  - Best private-doc / local-RAG layer: `docling-project/docling` and `run-llama/llama_index`
  - Best ASUS-specific stretch repo: `NVIDIA/NemoClaw`, but it is still labeled alpha on GitHub and should be treated as a reference/bonus rather than the core dependency
  - Fastest shippable ASUS stack looks like `ollama + open-webui + whisper.cpp + piper + docling + llama_index`
  - Strongest "this belongs on GX10" stack looks like `TensorRT-LLM + LiveKit Agents + Docling + Open WebUI`, with `NemoClaw` only if time allows
- Fresh hackathon winner pattern findings on 2026-04-23:
  - NVIDIA and adjacent hardware-track winners repeatedly combine one clear real-world user problem with visibly hardware-enabled performance under constraint: realtime robotics, low-latency edge vision, privacy-preserving local AI, or throughput on very large datasets
  - Strong examples:
    - NVIDIA AI at the Edge Challenge winners centered on agriculture robotics, traffic congestion detection, assistive reading for the blind, and pose-guided coaching
    - NVIDIA NeMo Agent Toolkit winner focused on fleet optimization with multi-agent orchestration plus `cuOpt` and `Omniverse`
    - NVIDIA DOCA / BlueField winners focused on accelerated load balancing, malware scanning, IDS/IPS, and secure video delivery
    - NVIDIA RAPIDS winners optimized for both accuracy and speed on a 10 GB / 12 million-row dataset, not just leaderboard accuracy
    - Edge Impulse and Arm on-device winners emphasized offline usability, low latency, privacy, and excellent UX rather than raw model size alone
    - Qualcomm-backed LPCVC winners were judged explicitly on accuracy under strict latency/efficiency constraints on edge hardware
  - Common judging patterns:
    - hardware/computation must be essential, not decorative
    - demos are easy to understand in under 2 minutes
    - privacy/offline/realtime benefits are concrete and visible
    - many winners choose a narrow problem with strong UX over a broad platform pitch
    - performance under resource constraints is often scored directly or implicitly rewarded
  - Saved a cleaned synthesis to `research/hardware_hackathon_patterns.md` with official examples from NVIDIA, Arm, Edge Impulse, and LPCVC, plus practical rules for the ASUS challenge
- Fresh ASUS repo shortlist update on 2026-04-24:
  - Strongest practical local-AI build stack: `ollama/ollama`, `open-webui/open-webui`, `livekit/agents`, `ggml-org/whisper.cpp`, `rhasspy/piper`, `docling-project/docling`, `run-llama/llama_index`, `m87-labs/moondream`
  - Strongest high-performance inference backends: `NVIDIA/TensorRT-LLM` and `vllm-project/vllm`
  - Strongest on-device / mobile-leaning option: `pytorch/executorch`
  - Strongest physical-AI / simulation references: `NVIDIA/physicsnemo`, `nvidia-cosmos/cosmos-predict1`, `nvidia-cosmos/cosmos-transfer1`, `isaac-sim/IsaacLab`
  - `NVIDIA/NemoClaw` remains relevant as sponsor-aligned agent infrastructure, but is better as inspiration or stretch integration than as the core ASUS demo

## Last Updated
Codex — 2026-04-24 01:01
