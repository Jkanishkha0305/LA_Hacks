"""Environmental hazard detection endpoint — Sustain the Spark track.

Reuses the VLM (Ollama / NIM) with an environment-focused prompt to detect:
  - Illegal dumping, debris, litter accumulation
  - Smoke, fire, wildfire indicators
  - Flooding, water pooling, blocked storm drains
  - Fallen trees, road obstructions
  - Graffiti, vandalism to infrastructure

POST /environment/analyze  — analyze a single frame for environmental hazards
GET  /environment/scan     — scan a random set of live cameras for env issues
"""
from __future__ import annotations

import asyncio
import base64
import json
import logging
import random
import re
from typing import List, Optional

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..config import settings
from ..schemas import FrameEvent
from ..state import STATE
from ..vlm import get_vlm_client

router = APIRouter(prefix="/environment", tags=["environment"])
log = logging.getLogger("poi.environment")


ENV_DETECTION_PROMPT = """Analyze this street/highway camera frame for ENVIRONMENTAL hazards only. Focus on:

1. Illegal Dumping & Waste:
   - Piles of trash, mattresses, furniture on sidewalks or roadsides
   - Construction debris in public areas
   - Overflowing dumpsters or bins

2. Air Quality & Fire:
   - Visible smoke or haze
   - Active fire or smoldering
   - Unusual dust clouds

3. Water & Flooding:
   - Standing water on roads
   - Flooding or water pooling
   - Blocked storm drains with debris

4. Vegetation & Infrastructure:
   - Fallen trees or large branches on roads
   - Overgrown vegetation blocking signs or signals
   - Damaged infrastructure (broken guardrails, downed signs)

5. Road Hazards:
   - Debris in travel lanes (tires, construction materials)
   - Oil spills or wet patches
   - Potholes visible from camera angle

Ignore normal traffic, pedestrians, and non-environmental observations."""

ENV_OUTPUT_INSTRUCTIONS = """For each environmental issue in this frame, emit one event with:
- "timestamp": "00:00"
- "description": brief description of the environmental issue
- "isDangerous": true if it poses immediate hazard to public (flooding, fire, road debris), false for cosmetic issues (graffiti, litter)
- "category": one of "dumping", "air_quality", "flooding", "vegetation", "road_hazard", "infrastructure"
- "severity": one of "low", "medium", "high", "critical"
- "suggested_311_type": the LA 311 request type this should be reported as

If NO environmental issues are visible, emit one event with isDangerous=false, description="No environmental hazards detected", category="none"."""


class EnvEvent(BaseModel):
    timestamp: str = "00:00"
    description: str
    isDangerous: bool
    category: str = "none"
    severity: str = "low"
    suggested_311_type: str = ""


class EnvAnalyzeRequest(BaseModel):
    frameJpegB64: str
    cameraId: Optional[str] = None


class EnvAnalyzeResponse(BaseModel):
    events: List[EnvEvent]
    cameraId: Optional[str] = None
    rawResponse: str = ""
    environmental_score: float = 0.0


class EnvScanResponse(BaseModel):
    cameras_scanned: int
    issues_found: int
    results: List[EnvAnalyzeResponse]


def _extract_json(text: str) -> str:
    m = re.search(r"```(?:json)?\s*({[\s\S]*?})\s*```", text)
    if m:
        return m.group(1)
    m = re.search(r"\{[\s\S]*\}", text)
    if m:
        return m.group(0)
    return text


def _env_score(events: List[EnvEvent]) -> float:
    """0-1 environmental severity score."""
    if not events or (len(events) == 1 and events[0].category == "none"):
        return 0.0
    severity_map = {"low": 0.2, "medium": 0.5, "high": 0.8, "critical": 1.0}
    scores = [severity_map.get(e.severity, 0.2) for e in events if e.category != "none"]
    return min(1.0, sum(scores) / max(len(scores), 1))


@router.post("/analyze", response_model=EnvAnalyzeResponse)
async def analyze_env(req: EnvAnalyzeRequest):
    """Analyze a single frame for environmental hazards."""
    if not req.frameJpegB64:
        raise HTTPException(status_code=400, detail="frameJpegB64 required")

    vlm = get_vlm_client()
    prompt = f"{ENV_DETECTION_PROMPT}\n{ENV_OUTPUT_INSTRUCTIONS}"

    if req.frameJpegB64.startswith("data:"):
        image_url = req.frameJpegB64
    else:
        image_url = f"data:image/jpeg;base64,{req.frameJpegB64}"

    try:
        completion = await asyncio.to_thread(
            vlm._client.chat.completions.create,
            model=vlm.model,
            temperature=0.1,
            max_tokens=800,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {"url": image_url}},
                    ],
                }
            ],
        )
    except Exception as err:
        log.error("[env] VLM failed: %s", err)
        raise HTTPException(status_code=502, detail=f"vlm failure: {err}")

    text = completion.choices[0].message.content or ""
    if not text:
        return EnvAnalyzeResponse(events=[], cameraId=req.cameraId, rawResponse="")

    try:
        parsed = json.loads(_extract_json(text))
        raw_events = parsed.get("events", [])
        events = []
        for e in raw_events:
            events.append(EnvEvent(
                timestamp=e.get("timestamp", "00:00"),
                description=e.get("description", ""),
                isDangerous=e.get("isDangerous", False),
                category=e.get("category", "none"),
                severity=e.get("severity", "low"),
                suggested_311_type=e.get("suggested_311_type", ""),
            ))
    except Exception as err:
        log.warning("[env] JSON parse failed: %s", err)
        events = []

    return EnvAnalyzeResponse(
        events=events,
        cameraId=req.cameraId,
        rawResponse=text,
        environmental_score=_env_score(events),
    )


@router.get("/scan", response_model=EnvScanResponse)
async def scan_cameras(count: int = 5):
    """Scan a random sample of live cameras for environmental issues."""
    all_cameras = list(STATE.cameras.values())
    if not all_cameras:
        return EnvScanResponse(cameras_scanned=0, issues_found=0, results=[])

    sample = random.sample(all_cameras, min(count, len(all_cameras)))
    results: List[EnvAnalyzeResponse] = []
    issues_found = 0

    async with httpx.AsyncClient(follow_redirects=True) as client:
        for cam in sample:
            if not cam.snapshotUrl:
                continue
            try:
                resp = await client.get(cam.snapshotUrl, timeout=6.0)
                if resp.status_code != 200:
                    continue
                jpeg_b64 = base64.b64encode(resp.content).decode()
                result = await analyze_env(
                    EnvAnalyzeRequest(frameJpegB64=jpeg_b64, cameraId=cam.id)
                )
                if result.environmental_score > 0:
                    issues_found += len([e for e in result.events if e.category != "none"])
                results.append(result)
            except Exception as err:
                log.debug("[env] scan skip %s: %s", cam.id, err)

    return EnvScanResponse(
        cameras_scanned=len(results),
        issues_found=issues_found,
        results=results,
    )
