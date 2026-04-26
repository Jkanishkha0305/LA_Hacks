"""What-if / perturbation simulation endpoint."""
from __future__ import annotations

import asyncio

from fastapi import APIRouter

from ..pipeline.risk_engine import score_with_perturbations
from ..schemas import WhatIfRequest, WhatIfResponse

router = APIRouter(prefix="/whatif", tags=["whatif"])


@router.post("/simulate", response_model=WhatIfResponse)
async def simulate(req: WhatIfRequest) -> WhatIfResponse:
    return await asyncio.to_thread(score_with_perturbations, req.perturbations, req.hour_of_week)


@router.get("/health")
async def health():
    return {"status": "ok"}
