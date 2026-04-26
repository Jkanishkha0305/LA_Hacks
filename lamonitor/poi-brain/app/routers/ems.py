"""EMS (Emergency Medical Services) intelligence endpoint — Catalyst for Care track.

Provides ambulance pre-positioning data by combining:
  - Real-time risk heatmap predictions
  - Camera-detected incidents (accidents, medical emergencies)
  - Historical incident patterns by time-of-week

GET /ems/staging          — recommended ambulance staging locations
GET /ems/active-incidents — currently detected dangerous events across all cameras
GET /ems/risk-windows     — upcoming high-risk time windows with predicted incident counts
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from fastapi import APIRouter
from pydantic import BaseModel

from ..state import STATE

router = APIRouter(prefix="/ems", tags=["ems"])
log = logging.getLogger("poi.ems")


class StagingRecommendation(BaseModel):
    """A recommended ambulance staging location."""
    h3Cell: str
    lat: float
    lng: float
    riskScore: float
    riskTier: str
    nearestCameraId: Optional[str] = None
    reasoning: str
    priority: int  # 1 = highest


class ActiveIncident(BaseModel):
    """A currently active dangerous event detected by cameras."""
    cameraId: str
    cameraName: str
    lat: Optional[float] = None
    lng: Optional[float] = None
    description: str
    detectedAt: str
    riskScore: Optional[float] = None


class RiskWindow(BaseModel):
    """An upcoming time window with predicted incident counts."""
    windowStart: str
    windowEnd: str
    hourOfWeek: int
    predictedRiskLevel: str
    highRiskCellCount: int
    criticalCellCount: int


class StagingResponse(BaseModel):
    recommendations: List[StagingRecommendation]
    totalHighRiskCells: int
    generatedAt: str


class ActiveIncidentsResponse(BaseModel):
    incidents: List[ActiveIncident]
    totalCamerasMonitored: int
    camerasWithDangerousEvents: int
    generatedAt: str


class RiskWindowsResponse(BaseModel):
    windows: List[RiskWindow]
    currentHourOfWeek: int
    generatedAt: str


def _hour_of_week() -> int:
    now = datetime.now(tz=timezone.utc)
    return now.weekday() * 24 + now.hour


@router.get("/staging", response_model=StagingResponse)
async def get_staging_recommendations(top: int = 10):
    """Get recommended ambulance staging locations based on current risk."""
    recommendations: List[StagingRecommendation] = []

    # Get risk scores sorted by criticality
    risk_items = sorted(
        STATE.risk_by_camera.items(),
        key=lambda x: x[1].score,
        reverse=True,
    )

    seen_cells = set()
    priority = 1

    for camera_id, risk in risk_items:
        if priority > top:
            break
        cam = STATE.cameras.get(camera_id)
        if not cam or not cam.latLng or not cam.h3Cell:
            continue
        if cam.h3Cell in seen_cells:
            continue
        seen_cells.add(cam.h3Cell)

        reasons = "; ".join(risk.reasons[:3]) if risk.reasons else "elevated risk pattern"

        recommendations.append(StagingRecommendation(
            h3Cell=cam.h3Cell,
            lat=cam.latLng[0],
            lng=cam.latLng[1],
            riskScore=risk.score,
            riskTier=risk.tier,
            nearestCameraId=camera_id,
            reasoning=f"Risk {risk.tier.upper()} ({risk.score:.2f}): {reasons}",
            priority=priority,
        ))
        priority += 1

    high_risk_count = sum(
        1 for r in STATE.risk_by_camera.values() if r.tier in ("high", "critical")
    )

    return StagingResponse(
        recommendations=recommendations,
        totalHighRiskCells=high_risk_count,
        generatedAt=datetime.now(tz=timezone.utc).isoformat(),
    )


@router.get("/active-incidents", response_model=ActiveIncidentsResponse)
async def get_active_incidents():
    """Get currently active dangerous events from camera feeds."""
    incidents: List[ActiveIncident] = []

    for cam_id, memory in STATE.frame_memory.items():
        if not memory.latest_events:
            continue

        dangerous = []
        for e in memory.latest_events:
            # Events may be FrameEvent pydantic objects or dicts
            is_danger = False
            desc = "Unknown hazard"
            if hasattr(e, "isDangerous"):
                is_danger = e.isDangerous
                desc = e.description
            elif isinstance(e, dict):
                is_danger = e.get("isDangerous", False)
                desc = e.get("description", "Unknown hazard")
            if is_danger:
                dangerous.append(desc)

        if not dangerous:
            continue

        cam = STATE.cameras.get(cam_id)
        cam_name = cam.name if cam else cam_id
        lat = cam.latLng[0] if cam and cam.latLng else None
        lng = cam.latLng[1] if cam and cam.latLng else None
        risk = STATE.risk_by_camera.get(cam_id)

        for desc in dangerous:
            incidents.append(ActiveIncident(
                cameraId=cam_id,
                cameraName=cam_name,
                lat=lat,
                lng=lng,
                description=desc,
                detectedAt=datetime.fromtimestamp(
                    memory.last_updated, tz=timezone.utc
                ).isoformat() if memory.last_updated else "",
                riskScore=risk.score if risk else None,
            ))

    cameras_with_events = len(set(i.cameraId for i in incidents))

    return ActiveIncidentsResponse(
        incidents=sorted(incidents, key=lambda i: i.riskScore or 0, reverse=True),
        totalCamerasMonitored=len(STATE.cameras),
        camerasWithDangerousEvents=cameras_with_events,
        generatedAt=datetime.now(tz=timezone.utc).isoformat(),
    )


@router.get("/risk-windows", response_model=RiskWindowsResponse)
async def get_risk_windows(hours_ahead: int = 12):
    """Get upcoming time windows with predicted risk levels."""
    current_how = _hour_of_week()
    windows: List[RiskWindow] = []
    now = datetime.now(tz=timezone.utc)

    # Current risk distribution as baseline
    current_high = sum(1 for r in STATE.risk_by_camera.values() if r.tier == "high")
    current_critical = sum(1 for r in STATE.risk_by_camera.values() if r.tier == "critical")

    for offset in range(hours_ahead):
        how = (current_how + offset) % 168
        window_start = now + timedelta(hours=offset)
        window_end = window_start + timedelta(hours=1)

        # Simple time-of-week risk heuristic
        hour_of_day = how % 24
        is_weekend = how >= 120

        # Late night / early morning = higher risk
        if 0 <= hour_of_day <= 5:
            risk_multiplier = 1.4
        elif 17 <= hour_of_day <= 22:
            risk_multiplier = 1.2
        elif is_weekend and 22 <= hour_of_day <= 23:
            risk_multiplier = 1.5
        else:
            risk_multiplier = 1.0

        high_count = int(current_high * risk_multiplier)
        critical_count = int(current_critical * risk_multiplier)

        if critical_count > 5:
            level = "critical"
        elif high_count > 10:
            level = "high"
        elif high_count > 3:
            level = "elevated"
        else:
            level = "normal"

        windows.append(RiskWindow(
            windowStart=window_start.isoformat(),
            windowEnd=window_end.isoformat(),
            hourOfWeek=how,
            predictedRiskLevel=level,
            highRiskCellCount=high_count,
            criticalCellCount=critical_count,
        ))

    return RiskWindowsResponse(
        windows=windows,
        currentHourOfWeek=current_how,
        generatedAt=now.isoformat(),
    )
