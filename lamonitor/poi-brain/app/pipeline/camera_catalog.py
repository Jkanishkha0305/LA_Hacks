"""LA traffic camera catalog loader (Caltrans District 7).

Primary source: the public Caltrans CCTV API at
https://cwwp2.dot.ca.gov/data/d7/cctv/cctvStatusD07.json — returns ~524
cameras across LA freeways with live-updating JPEG snapshot URLs.

We fetch at startup, filter to in-service cameras, tag each with an H3
res-9 cell, and return them. The result feeds both the mission-control
dashboard's camera-pin overlay and the camera poller that pipes frames
into the VLM.

Fallback chain:
1. Live HTTP fetch from Caltrans D7 CCTV API (primary)
2. Hardcoded 12-camera LA seed list (last-resort for offline dev)
"""
from __future__ import annotations

import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List

import h3
import httpx

from ..config import settings
from ..schemas import Camera

log = logging.getLogger("poi.camera_catalog")

CALTRANS_CCTV_API = "https://cwwp2.dot.ca.gov/data/d7/cctv/cctvStatusD07.json"

# 12-camera last-resort fallback for offline dev — verified LA locations.
FALLBACK_LA_SEEDS: List[dict] = [
    {
        "id": "la-i110-ave26",
        "name": "I-110 : Avenue 26 Off Ramp",
        "area": "Cypress Park",
        "latLng": (34.0837, -118.2215),
        "address": "I-110 at Avenue 26, Cypress Park, CA",
        "snapshotUrl": "https://cwwp2.dot.ca.gov/data/d7/cctv/image/i110196avenue26offramp/i110196avenue26offramp.jpg",
    },
    {
        "id": "la-us101-alvarado",
        "name": "US-101 : Alvarado St",
        "area": "Echo Park",
        "latLng": (34.0668, -118.2615),
        "address": "US-101 at Alvarado St, Echo Park, CA",
        "snapshotUrl": "https://cwwp2.dot.ca.gov/data/d7/cctv/image/us101alvaradost/us101alvaradost.jpg",
    },
    {
        "id": "la-i10-lacienegabl",
        "name": "I-10 : La Cienega Blvd",
        "area": "Mid-City",
        "latLng": (34.0313, -118.3725),
        "address": "I-10 at La Cienega Blvd, LA, CA",
        "snapshotUrl": "https://cwwp2.dot.ca.gov/data/d7/cctv/image/i10lacienegabl/i10lacienegabl.jpg",
    },
    {
        "id": "la-i405-wilshire",
        "name": "I-405 : Wilshire Blvd",
        "area": "Westwood",
        "latLng": (34.0566, -118.4697),
        "address": "I-405 at Wilshire Blvd, Westwood, CA",
        "snapshotUrl": "https://cwwp2.dot.ca.gov/data/d7/cctv/image/i405wilshirebl/i405wilshirebl.jpg",
    },
    {
        "id": "la-i10-downtown",
        "name": "I-10 : Alameda St",
        "area": "Downtown LA",
        "latLng": (34.0380, -118.2360),
        "address": "I-10 at Alameda St, Downtown LA, CA",
        "snapshotUrl": "https://cwwp2.dot.ca.gov/data/d7/cctv/image/i10alamedast/i10alamedast.jpg",
    },
    {
        "id": "la-i5-stadium",
        "name": "I-5 : Stadium Way",
        "area": "Elysian Park",
        "latLng": (34.0761, -118.2413),
        "address": "I-5 at Stadium Way, Elysian Park, CA",
        "snapshotUrl": "https://cwwp2.dot.ca.gov/data/d7/cctv/image/i5stadiumway/i5stadiumway.jpg",
    },
    {
        "id": "la-sr2-glendale",
        "name": "SR-2 : Glendale Blvd",
        "area": "Glendale",
        "latLng": (34.1129, -118.2589),
        "address": "SR-2 at Glendale Blvd, Glendale, CA",
        "snapshotUrl": "https://cwwp2.dot.ca.gov/data/d7/cctv/image/sr2glendalebl/sr2glendalebl.jpg",
    },
    {
        "id": "la-i710-pchhwy",
        "name": "I-710 : Pacific Coast Highway",
        "area": "Long Beach",
        "latLng": (33.7922, -118.1950),
        "address": "I-710 at PCH, Long Beach, CA",
        "snapshotUrl": "https://cwwp2.dot.ca.gov/data/d7/cctv/image/i710pacificcoasthighway/i710pacificcoasthighway.jpg",
    },
    {
        "id": "la-i105-crenshaw",
        "name": "I-105 : Crenshaw Blvd",
        "area": "Hawthorne",
        "latLng": (33.9305, -118.3310),
        "address": "I-105 at Crenshaw Blvd, Hawthorne, CA",
        "snapshotUrl": "https://cwwp2.dot.ca.gov/data/d7/cctv/image/i105crenshawbl/i105crenshawbl.jpg",
    },
    {
        "id": "la-sr60-paramount",
        "name": "SR-60 : Paramount Blvd",
        "area": "South Gate",
        "latLng": (33.9898, -118.1556),
        "address": "SR-60 at Paramount Blvd, South Gate, CA",
        "snapshotUrl": "https://cwwp2.dot.ca.gov/data/d7/cctv/image/sr60paramountbl/sr60paramountbl.jpg",
    },
    {
        "id": "la-us101-hollywood",
        "name": "US-101 : Hollywood Blvd",
        "area": "Hollywood",
        "latLng": (34.1017, -118.3340),
        "address": "US-101 at Hollywood Blvd, Hollywood, CA",
        "snapshotUrl": "https://cwwp2.dot.ca.gov/data/d7/cctv/image/us101hollywoodbl/us101hollywoodbl.jpg",
    },
    {
        "id": "la-i10-robertson",
        "name": "I-10 : Robertson Blvd",
        "area": "Culver City",
        "latLng": (34.0277, -118.3859),
        "address": "I-10 at Robertson Blvd, Culver City, CA",
        "snapshotUrl": "https://cwwp2.dot.ca.gov/data/d7/cctv/image/i10robertsonbl/i10robertsonbl.jpg",
    },
]


def _h3_for(lat: float, lon: float) -> str | None:
    try:
        return h3.latlng_to_cell(float(lat), float(lon), settings.h3_resolution)
    except Exception:
        return None


def _fetch_live_caltrans() -> List[Camera]:
    """Primary source: pull the full camera catalog from Caltrans D7 API."""
    try:
        resp = httpx.get(settings.caltrans_cctv_url, timeout=15.0)
        resp.raise_for_status()
    except Exception as err:
        log.warning("[catalog] Caltrans live fetch failed: %s", err)
        return []

    payload = resp.json()
    raw_list = payload if isinstance(payload, list) else payload.get("data", [])
    if not isinstance(raw_list, list):
        log.warning("[catalog] Caltrans payload has unexpected shape")
        return []

    cameras: List[Camera] = []
    for item in raw_list:
        raw = item.get("cctv", item) if isinstance(item, dict) else item
        if not isinstance(raw, dict):
            continue
        loc = raw.get("location", {})
        if not isinstance(loc, dict):
            continue
        in_service = str(raw.get("inService", "true")).lower()
        if in_service != "true":
            continue
        try:
            lat = float(loc.get("latitude"))
            lon = float(loc.get("longitude"))
        except (TypeError, ValueError):
            continue
        name = str(loc.get("locationName") or "Caltrans Camera")
        area = str(loc.get("nearbyPlace") or loc.get("county") or "LA")
        route = str(loc.get("route") or "")
        image_data = raw.get("imageData", {})
        static = image_data.get("static", {}) if isinstance(image_data, dict) else {}
        image_url = static.get("currentImageURL", "") if isinstance(static, dict) else ""
        if not image_url:
            continue
        idx = raw.get("index", "0")
        cam_id = f"la-{route.lower().replace(' ', '')}-{idx}"
        cameras.append(
            Camera(
                id=cam_id,
                name=name[:80],
                location=area,
                address=f"{name}, {area}, CA",
                thumbnail="",
                snapshotUrl=image_url,
                latLng=(lat, lon),
                neighborhood=area,
                h3Cell=_h3_for(lat, lon),
                modelCoverage="full",
                online=True,
            )
        )
    log.info("[catalog] live Caltrans D7 fetch: %d cameras", len(cameras))
    return cameras


def _load_fallback_seeds() -> List[Camera]:
    log.info("[catalog] using hardcoded %d-camera fallback", len(FALLBACK_LA_SEEDS))
    return [
        Camera(
            id=c["id"],
            name=c["name"],
            location=c["area"],
            address=c["address"],
            thumbnail="",
            snapshotUrl=c["snapshotUrl"],
            latLng=c["latLng"],
            neighborhood=c["area"],
            modelCoverage="full",
            h3Cell=_h3_for(c["latLng"][0], c["latLng"][1]),
        )
        for c in FALLBACK_LA_SEEDS
    ]


def _apply_filters(cameras: List[Camera]) -> List[Camera]:
    """Respect settings: area filter, manual subset override, size cap."""
    area_filter = getattr(settings, "camera_areas", None)
    if area_filter:
        wanted = {a.lower() for a in area_filter}
        cameras = [c for c in cameras if (c.neighborhood or "").lower() in wanted]

    if settings.camera_manual_subset:
        manual = set(settings.camera_manual_subset)
        cameras = [c for c in cameras if c.id in manual]

    cap = settings.camera_subset_size
    if cap and cap > 0 and len(cameras) > cap:
        cameras = cameras[:cap]

    return cameras


def _is_caltrans_placeholder(data: bytes) -> bool:
    """Detect the Caltrans 'Temporarily Unavailable' placeholder JPEG."""
    if len(data) < 1100 or not (16_400 <= len(data) <= 16_600):
        return False
    return data[1000:1020] == b"\x00" * 20


def _probe_camera(cam: Camera) -> bool:
    """Return True if camera is serving a real image (not placeholder)."""
    try:
        r = httpx.get(cam.snapshotUrl, timeout=6.0)
        if r.status_code != 200:
            return False
        return not _is_caltrans_placeholder(r.content)
    except Exception:
        return False


def _filter_unavailable(cameras: List[Camera], max_workers: int = 30) -> List[Camera]:
    """Probe cameras in parallel and drop those serving the placeholder."""
    if not cameras:
        return cameras
    alive: List[Camera] = []
    with ThreadPoolExecutor(max_workers=max_workers) as pool:
        futures = {pool.submit(_probe_camera, cam): cam for cam in cameras}
        for fut in as_completed(futures):
            cam = futures[fut]
            try:
                if fut.result():
                    alive.append(cam)
            except Exception:
                pass
    log.info(
        "[catalog] probe complete: %d/%d cameras serving live images",
        len(alive), len(cameras),
    )
    return alive


def load_camera_catalog() -> List[Camera]:
    """Live Caltrans → hardcoded-seed fallback chain."""
    cameras = _fetch_live_caltrans()
    if not cameras:
        cameras = _load_fallback_seeds()

    filtered = _apply_filters(cameras)
    filtered = _filter_unavailable(filtered)
    log.info(
        "[catalog] loaded %d cameras (filtered from %d)", len(filtered), len(cameras)
    )
    return filtered
