"""CommanderAgent — ReAct-style digital twin operator powered by NIM Llama-3.2-Vision.

observe → reason → tool_call → observation → ... → answer

Streams events as dicts: {"type": "thought"|"tool_call"|"observation"|"answer"|"error", ...}
Max 6 iterations, 30s per LLM call.

Fallback: if the model does not support OpenAI-style function calling, the agent
uses a ReAct text prompt and parses tool calls from markdown JSON blocks.
"""
from __future__ import annotations

import asyncio
import json
import logging
import re
from datetime import datetime, timezone
from typing import AsyncGenerator

from openai import AsyncOpenAI

from ..config import settings
from ..state import STATE

log = logging.getLogger("poi.commander")

# ── System prompts ──────────────────────────────────────────────────────────

SYSTEM_PROMPT_FC = """You are Commander, an AI operator of the LA Monitor — a real-time urban safety intelligence platform for Los Angeles.

You have access to tools that query live risk data, camera feeds, and scenario simulations.
Be concise and tactical. Use operator language. Reference neighborhoods, hex cells, risk tiers."""

TOOL_NAMES_STR = "query_risk, get_anomalies, perturb_world, get_patrol_routes, analyze_camera, simulate_forward, recall_similar"

SYSTEM_PROMPT_REACT = f"""You are Commander, an AI operator of the LA Monitor — a real-time urban safety intelligence platform for Los Angeles.

You have access to these tools: {TOOL_NAMES_STR}.

Use this exact format for every step:

Thought: <your reasoning>
Action: <tool_name>
Action Input: ```json
{{"key": "value"}}
```

After seeing an Observation, continue reasoning. When done:

Final Answer: <your response>

Be concise and tactical. Use operator language. Reference neighborhoods, hex cells, risk tiers."""

TOOLS_MANIFEST = [
    {
        "type": "function",
        "function": {
            "name": "query_risk",
            "description": "Get current risk score and tier for a hex cell or neighborhood",
            "parameters": {
                "type": "object",
                "properties": {
                    "neighborhood": {"type": "string", "description": "Neighborhood name (e.g. 'Hollywood', 'Compton')"},
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_anomalies",
            "description": "Get top high/critical risk hex cells right now",
            "parameters": {
                "type": "object",
                "properties": {
                    "top_n": {"type": "integer", "default": 5},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "perturb_world",
            "description": "Simulate a what-if scenario and return delta risk summary",
            "parameters": {
                "type": "object",
                "properties": {
                    "kind": {
                        "type": "string",
                        "enum": ["road_close", "weather", "unit_add", "signal_outage"],
                    },
                    "params": {"type": "object"},
                },
                "required": ["kind"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_patrol_routes",
            "description": "Get current cuOpt-optimized patrol routes",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "analyze_camera",
            "description": "Analyze the latest frame from a camera using the VLM",
            "parameters": {
                "type": "object",
                "properties": {
                    "camera_id": {"type": "string", "description": "Camera ID to analyze"},
                },
                "required": ["camera_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "simulate_forward",
            "description": "Run the perturbation engine with current state and return risk projection",
            "parameters": {
                "type": "object",
                "properties": {
                    "horizon_minutes": {"type": "integer", "default": 30},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "recall_similar",
            "description": "Retrieve historically similar incidents from the LAPD database",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Natural language description of the incident"},
                    "k": {"type": "integer", "default": 5},
                },
                "required": ["query"],
            },
        },
    },
]


def _tool_query_risk(neighborhood: str | None = None) -> dict:
    cells = STATE.hex_cells
    if not cells:
        return {"error": "no risk data available"}
    high = [c for c in cells if c.tier in ("high", "critical")]
    top = sorted(high, key=lambda c: c.score, reverse=True)[:3]
    return {
        "total_cells": len(cells),
        "high_critical_count": len(high),
        "top_cells": [{"h3": c.h3Index, "score": round(c.score, 3), "tier": c.tier} for c in top],
    }


def _tool_get_anomalies(top_n: int = 5) -> dict:
    cells = STATE.hex_cells
    if not cells:
        return {"anomalies": []}
    critical = sorted(
        [c for c in cells if c.tier in ("high", "critical")],
        key=lambda c: c.score,
        reverse=True,
    )[:top_n]
    return {
        "anomalies": [
            {"h3": c.h3Index, "score": round(c.score, 3), "tier": c.tier}
            for c in critical
        ]
    }


def _tool_get_patrol_routes() -> dict:
    routes = STATE.patrol_routes if hasattr(STATE, "patrol_routes") else []
    return {"route_count": len(routes), "routes": [r.unitId for r in routes[:5]]}


async def _tool_analyze_camera(camera_id: str) -> dict:
    from ..vlm import get_vlm_client
    cam = next((c for c in STATE.cameras if c.id == camera_id), None)
    if not cam:
        return {"error": f"camera {camera_id} not found"}
    mem = STATE.frame_memory.get(camera_id)
    if not mem or not mem.thumbnail_b64:
        return {"error": f"no frame available for camera {camera_id}"}
    try:
        vlm = get_vlm_client()
        result = await vlm.analyze_frame(mem.thumbnail_b64, cam)
        return {
            "camera": cam.name,
            "events": [e.dict() if hasattr(e, 'dict') else e for e in (result.events or [])],
            "raw": result.rawResponse[:500] if result.rawResponse else "",
        }
    except Exception as e:
        return {"error": str(e)}


async def _tool_simulate_forward(horizon_minutes: int = 30) -> dict:
    from ..pipeline.risk_engine import score_with_perturbations
    result = await asyncio.to_thread(score_with_perturbations, [], None)
    return {
        "horizon_minutes": horizon_minutes,
        "total_cells": len(result.baseline),
        "high_risk_cells": sum(1 for c in result.baseline if c.tier in ("high", "critical")),
        "mean_score": round(sum(c.score for c in result.baseline) / max(len(result.baseline), 1), 4),
    }


def _tool_recall_similar(query: str, k: int = 5) -> dict:
    # Stub — full Qdrant integration is future work.
    # Returns empty list for now; the agent will gracefully note no history found.
    return {"query": query, "k": k, "results": [], "note": "retrieval index not yet connected"}


async def _tool_perturb_world(kind: str, params: dict | None = None) -> dict:
    from ..pipeline.risk_engine import score_with_perturbations
    from ..schemas import Perturbation

    p = Perturbation(kind=kind, params=params or {})  # type: ignore[arg-type]
    result = await asyncio.to_thread(score_with_perturbations, [p], None)
    return {
        "cells_worsened": result.summary["cells_worsened"],
        "cells_improved": result.summary["cells_improved"],
        "total_delta": round(result.summary["total_delta"], 3),
    }


async def _dispatch_tool(name: str, args: dict) -> str:
    try:
        if name == "query_risk":
            out = _tool_query_risk(**args)
        elif name == "get_anomalies":
            out = _tool_get_anomalies(**args)
        elif name == "perturb_world":
            out = await _tool_perturb_world(**args)
        elif name == "get_patrol_routes":
            out = _tool_get_patrol_routes()
        elif name == "analyze_camera":
            out = await _tool_analyze_camera(**args)
        elif name == "simulate_forward":
            out = await _tool_simulate_forward(**args)
        elif name == "recall_similar":
            out = _tool_recall_similar(**args)
        else:
            out = {"error": f"unknown tool: {name}"}
        return json.dumps(out)
    except Exception as e:
        return json.dumps({"error": str(e)})


# ── ReAct text-based fallback parser ────────────────────────────────────────

_ACTION_RE = re.compile(
    r"Action:\s*(\w+)\s*\n"
    r"Action Input:\s*(?:```json\s*)?(.+?)(?:```)?\s*$",
    re.DOTALL | re.MULTILINE,
)


def _parse_react_text(text: str) -> tuple[str | None, str | None, dict]:
    """Parse ReAct-format text into (thought, tool_name, tool_args).
    Returns (thought, None, {}) if this is a final answer."""
    thought = None
    if "Thought:" in text:
        thought = text.split("Thought:", 1)[1].split("\n")[0].strip()

    if "Final Answer:" in text:
        return thought, None, {}

    m = _ACTION_RE.search(text)
    if m:
        tool_name = m.group(1).strip()
        raw_args = m.group(2).strip()
        try:
            tool_args = json.loads(raw_args)
        except json.JSONDecodeError:
            tool_args = {}
        return thought, tool_name, tool_args

    return thought, None, {}


# ── Main streaming loop ────────────────────────────────────────────────────

async def run_streaming(question: str) -> AsyncGenerator[dict, None]:
    client = AsyncOpenAI(
        base_url=settings.nim_base_url,
        api_key=settings.nim_api_key,
        timeout=30.0,
    )

    # Try function-calling first. If the model rejects tools, fall back to ReAct text.
    use_fc = True

    messages_fc = [
        {"role": "system", "content": SYSTEM_PROMPT_FC},
        {"role": "user", "content": question},
    ]
    messages_react = [
        {"role": "system", "content": SYSTEM_PROMPT_REACT},
        {"role": "user", "content": question},
    ]

    for iteration in range(6):
        try:
            if use_fc:
                resp = await client.chat.completions.create(
                    model=settings.nim_model,
                    messages=messages_fc,
                    tools=TOOLS_MANIFEST,
                    tool_choice="auto",
                    max_tokens=512,
                    temperature=0.2,
                )
            else:
                resp = await client.chat.completions.create(
                    model=settings.nim_model,
                    messages=messages_react,
                    max_tokens=512,
                    temperature=0.2,
                )
        except Exception as e:
            err_str = str(e)
            # Detect "tools not supported" and fall back to ReAct text
            if use_fc and ("tool" in err_str.lower() or "function" in err_str.lower() or "400" in err_str):
                log.warning("[commander] function calling rejected, falling back to ReAct text: %s", err_str)
                use_fc = False
                yield {"type": "thought", "content": "Switching to text-based reasoning mode.", "iteration": iteration}
                continue
            yield {"type": "error", "content": err_str}
            return

        choice = resp.choices[0]
        msg = choice.message

        if use_fc:
            # ── Function-calling path ──
            if msg.content:
                thought = msg.content.strip()
                if thought:
                    yield {"type": "thought", "content": thought, "iteration": iteration}

            if not msg.tool_calls:
                answer = msg.content or "No answer generated."
                if "Final Answer:" in answer:
                    answer = answer.split("Final Answer:")[-1].strip()
                yield {"type": "answer", "content": answer}
                return

            messages_fc.append({"role": "assistant", "content": msg.content, "tool_calls": [
                {"id": tc.id, "type": "function", "function": {"name": tc.function.name, "arguments": tc.function.arguments}}
                for tc in msg.tool_calls
            ]})

            for tc in msg.tool_calls:
                tool_name = tc.function.name
                try:
                    tool_args = json.loads(tc.function.arguments or "{}")
                except json.JSONDecodeError:
                    tool_args = {}

                yield {"type": "tool_call", "tool": tool_name, "args": tool_args}

                observation = await _dispatch_tool(tool_name, tool_args)
                yield {"type": "observation", "tool": tool_name, "content": observation}

                messages_fc.append({
                    "role": "tool",
                    "tool_call_id": tc.id,
                    "content": observation,
                })
        else:
            # ── ReAct text fallback path ──
            text = msg.content or ""
            thought, tool_name, tool_args = _parse_react_text(text)

            if thought:
                yield {"type": "thought", "content": thought, "iteration": iteration}

            if tool_name is None:
                # Final answer or no parseable action
                answer = text
                if "Final Answer:" in answer:
                    answer = answer.split("Final Answer:")[-1].strip()
                yield {"type": "answer", "content": answer}
                return

            yield {"type": "tool_call", "tool": tool_name, "args": tool_args}

            observation = await _dispatch_tool(tool_name, tool_args)
            yield {"type": "observation", "tool": tool_name, "content": observation}

            messages_react.append({"role": "assistant", "content": text})
            messages_react.append({"role": "user", "content": f"Observation: {observation}\n\nContinue reasoning."})

    yield {"type": "answer", "content": "Max iterations reached. Based on gathered data, see observations above."}
