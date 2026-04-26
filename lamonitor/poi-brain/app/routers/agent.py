"""Conversational agent endpoint — SSE stream of ReAct events."""
from __future__ import annotations

import json
from typing import AsyncIterator

from fastapi import APIRouter
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse

from ..agents.commander import run_streaming

router = APIRouter(prefix="/agent", tags=["agent"])


class AskRequest(BaseModel):
    question: str


async def _event_stream(question: str) -> AsyncIterator[dict]:
    async for event in run_streaming(question):
        yield {"event": "message", "data": json.dumps(event)}
    yield {"event": "done", "data": "{}"}


@router.post("/ask")
async def ask(req: AskRequest):
    return EventSourceResponse(_event_stream(req.question))


@router.get("/tools")
async def list_tools():
    from ..agents.commander import TOOLS_MANIFEST
    return TOOLS_MANIFEST
