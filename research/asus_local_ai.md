# ASUS Track — Local AI On-Device Developer Use Cases
*Research date: April 2026 | Sources: SitePoint, Ollama library, GitHub benchmarks, ASUS spec sheet*

---

## ASUS Ascent GX10 — What It Can Actually Run
| Capability | Spec |
|---|---|
| AI Performance | 1 petaFLOP (FP4) |
| Memory | 128 GB LPDDR5x unified (CPU + GPU share) |
| Max model size (solo) | 70B+ comfortably; 200B parameter fine-tuning supported |
| Storage | 4TB NVMe PCIe 5.0 |
| Pre-installed | NVIDIA DGX OS, CUDA, PyTorch, Ollama, NVIDIA NIMs |
| vLLM on Llama 3.3 70B | 82 tok/s generation, 5847 tok/s prompt processing |
| Ollama on Llama 3.3 70B | 47 tok/s generation, 1268 tok/s prompt processing |
| Concurrent requests (vLLM) | 24 parallel, 312ms p99 TTFT |
| Concurrent requests (Ollama) | Sequential queue, 34.8s p99 at 24 concurrent |
| Form factor | 150x150x51mm — desktop sized |

**Key: 128GB unified memory means 70B models load entirely into memory with no offloading.**

---

## Best Local Models for Code Tasks (2026)

| Model | Size | Tokens/sec (GX10 est.) | Best for |
|---|---|---|---|
| Qwen2.5-Coder-32B | 32B | ~120 tok/s | Code completion, multi-lang (90+ langs) |
| Llama 3.3 70B | 70B | 82 tok/s (vLLM) | General reasoning + code |
| DeepSeek-Coder-V2 | 236B (21B active, MoE) | ~150 tok/s | Code + math specialist |
| Gemma 4 | 26B | ~140 tok/s | GPT-4 level, 14GB footprint |
| CodeLlama 34B | 34B | ~100 tok/s | Code generation & infilling |

**Recommendation for hackathon:** Qwen2.5-Coder-32B via vLLM — best open-source code model per size, Apache 2.0, multi-language.

---

## What Local Inference Solves That Cloud Can't

### 1. The Quota Problem — Solved
Cloud: Claude Code Pro Max burns out in 1.5 hours ($100/month plan)
Local on GX10: **unlimited inference, zero quota, zero API cost**

### 2. The Privacy Problem — Solved
Cloud: enterprise/startup code is sent to external servers
Local: **code never leaves the machine** — perfect for proprietary codebases

### 3. The Latency Problem — Largely Solved
- 82 tok/s with Llama 3.3 70B on GX10 is interactive-speed
- vLLM's 24-way concurrency enables team-shared local inference

### 4. Fine-tuning on Your Codebase — Newly Possible
- GX10 can LoRA fine-tune 8B models in ~5 hours
- This means: train a model that knows YOUR codebase patterns
- Nobody has done this for coding agent verification yet

---

## Current Pain Points With Local LLMs for Developers

### Pain 1: Local models still weaker than frontier cloud models
- Qwen2.5-Coder-32B is excellent but not Claude Opus level
- For complex reasoning tasks, cloud still wins
- **Opportunity:** use local model for verification/analysis tasks that don't need frontier intelligence

### Pain 2: Setup complexity
- Getting vLLM + models + APIs running correctly is still non-trivial
- ASUS GX10 ships with Ollama pre-installed but vLLM gives 4.6x better performance
- **Opportunity:** pre-configured developer environment for specific use cases

### Pain 3: No local alternative for agentic workflows
- Tools like Cursor, Claude Code, Devin all assume cloud models
- ollama-code (Qwen Code fork) exists but is rough
- **Opportunity:** purpose-built local agentic tool for specific developer tasks

### Pain 4: Team sharing of local models
- Most local inference is single-user (Ollama sequential queue)
- vLLM enables team inference but requires more setup
- **Opportunity:** team-shared local inference endpoint as an MCP server

---

## What's New in 2026 That Makes Local AI Viable Now

1. **Gemma 4** (26B) — GPT-4 level quality at 14GB, 85 tok/s on consumer hardware
2. **Qwen2.5-Coder-32B** — Beats larger models on code tasks, Apache 2.0 license
3. **ASUS GX10 128GB memory** — 70B models fit entirely without offloading
4. **vLLM PagedAttention** — 24-way concurrent serving on a single GX10
5. **Open source parity** — "In 2026, open-source models are on par with proprietary in many areas" (SitePoint)
6. **FP4 + Blackwell tensor cores** — 1 petaFLOP for quantized inference

---

## The Unique ASUS Angle That's Undersold

The GX10 isn't just "local Ollama." It's a **supercomputer** that can:
- Run inference for an entire dev team simultaneously (vLLM, 24 concurrent)
- Fine-tune models on your specific codebase (LoRA, 5 hours for 8B)
- Run 70B models with full context (128GB unified memory)
- Connect to cloud for burst capacity (NVIDIA DGX Cloud compatible)

**This is the angle:** Build something that's ONLY possible with the GX10's memory and throughput. Not "local model chat." Build something that uses the 128GB to run analyses that cloud tools can't afford.
