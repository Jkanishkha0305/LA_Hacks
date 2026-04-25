"""Fuse LA Open Data sources into a single hex × time × weekday training frame.

Runs on cuDF + cuSpatial when available on the DGX, falls back to pandas + h3-py
on the laptop. The H3-binned fused frame is the training input for cuML.

The story: for each H3 cell (res 9) and each 15-minute bucket, assemble a feature
vector:
- recent_crime_count       (LAPD crime, last 90d at this cell)
- recent_collision_count   (LA traffic collisions, last 365d)
- active_311_streetlight   (open 311 streetlight complaints in last 30d within cell)
- active_311_graffiti
- active_311_dumping
- hour_of_week             (0..167)
- is_weekend               (bool)

Target: binary `incident_next_window` — did a crime or collision happen
in the next 15 min at this cell? Derived from LAPD + collisions timestamps.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict

import h3
import pandas as pd

from ..config import settings
from .categories import (
    ALL_CATEGORY_IDS,
    NON_ALL_IDS,
    categorize_lapd,
    count_column,
    svc311_category,
)
from .rapids_runtime import HAS_RAPIDS, get_df_lib

log = logging.getLogger("poi.fuse")


def _load_parquet(name: str) -> pd.DataFrame:
    path = settings.parquet_root / f"{name}.parquet"
    if not path.exists():
        log.warning("[fuse] missing %s — returning empty frame", path)
        return pd.DataFrame()
    return pd.read_parquet(path)


def _to_latlon(df: pd.DataFrame, lat_col: str, lon_col: str) -> pd.DataFrame:
    if lat_col not in df.columns or lon_col not in df.columns:
        return pd.DataFrame()
    df = df.dropna(subset=[lat_col, lon_col]).copy()
    df["lat"] = pd.to_numeric(df[lat_col], errors="coerce")
    df["lon"] = pd.to_numeric(df[lon_col], errors="coerce")
    df = df.dropna(subset=["lat", "lon"])
    lat_lo, lon_lo, lat_hi, lon_hi = (33.70, -118.67, 34.34, -118.15)
    df = df[
        (df["lat"] >= lat_lo)
        & (df["lat"] <= lat_hi)
        & (df["lon"] >= lon_lo)
        & (df["lon"] <= lon_hi)
    ]
    return df


def _attach_h3(df: pd.DataFrame, resolution: int) -> pd.DataFrame:
    if df.empty:
        return df
    df = df.copy()
    lats = df["lat"].to_numpy(dtype="float64")
    lons = df["lon"].to_numpy(dtype="float64")
    df["h3"] = [
        h3.latlng_to_cell(float(lat), float(lon), resolution)
        for lat, lon in zip(lats, lons)
    ]
    return df


def _parse_datetime(series: pd.Series) -> pd.Series:
    return pd.to_datetime(series, errors="coerce", utc=False)


def fuse_to_training_frame(resolution: int | None = None) -> pd.DataFrame:
    """Build the fused training frame. Returns pandas (or cuDF) depending on runtime."""
    res = resolution or settings.h3_resolution
    log.info("[fuse] building training frame at H3 res=%d (rapids=%s)", res, HAS_RAPIDS)

    lapd = _load_parquet("lapd_crime")
    collisions = _load_parquet("collisions")
    svc311 = _load_parquet("service_311")

    lapd = _to_latlon(lapd, "lat", "lon")
    if not lapd.empty:
        lapd["dt"] = _parse_datetime(lapd.get("date_occ"))
        lapd = lapd.dropna(subset=["dt"])
        lapd = _attach_h3(lapd, res)

    # LA collisions use location_1 point field; extract lat/lon
    if not collisions.empty and "location_1" in collisions.columns:
        collisions["_lat"] = collisions["location_1"].apply(
            lambda x: float(x.get("latitude", 0)) if isinstance(x, dict) else None
        )
        collisions["_lon"] = collisions["location_1"].apply(
            lambda x: float(x.get("longitude", 0)) if isinstance(x, dict) else None
        )
        collisions = _to_latlon(collisions, "_lat", "_lon")
    else:
        collisions = _to_latlon(collisions, "latitude", "longitude")
    if not collisions.empty:
        collisions["dt"] = _parse_datetime(collisions.get("date_occ"))
        collisions = collisions.dropna(subset=["dt"])
        collisions = _attach_h3(collisions, res)

    svc311 = _to_latlon(svc311, "latitude", "longitude")
    if not svc311.empty:
        svc311["dt"] = _parse_datetime(svc311.get("createddate"))
        svc311 = svc311.dropna(subset=["dt"])
        svc311 = _attach_h3(svc311, res)

    # Data-relative cutoffs: anchor the rolling window to each dataset's own
    # max timestamp, not wall-clock "now". LA Open Data often lags real time
    # by months, so a wall-clock cutoff of "last 90 days" returns zero rows
    # against historic data. Using the dataset's latest date makes the window
    # meaningful regardless of when the parquet was last refreshed.
    def _recent_window(df: pd.DataFrame, days: int) -> pd.DataFrame:
        if df.empty or "dt" not in df.columns:
            return df
        latest = df["dt"].max()
        if pd.isna(latest):
            return df
        anchor = latest if latest < datetime.utcnow() else datetime.utcnow()
        cutoff = anchor - timedelta(days=days)
        return df[df["dt"] >= cutoff]

    now = datetime.utcnow()

    lapd_recent = _recent_window(lapd, 90) if not lapd.empty else lapd
    collisions_recent = (
        _recent_window(collisions, 365) if not collisions.empty else collisions
    )
    svc311_recent = _recent_window(svc311, 30) if not svc311.empty else svc311

    crime_counts = (
        lapd_recent.groupby("h3").size() if not lapd_recent.empty else pd.Series(dtype="int64")
    )
    collision_counts = (
        collisions_recent.groupby("h3").size()
        if not collisions_recent.empty
        else pd.Series(dtype="int64")
    )

    def _svc_subset(rtype: str) -> pd.Series:
        if svc311_recent.empty:
            return pd.Series(dtype="int64")
        keep = svc311_recent[svc311_recent.get("requesttype") == rtype]
        return keep.groupby("h3").size()

    light_counts = _svc_subset("Street Light Condition")
    graffiti_counts = _svc_subset("Graffiti Removal")
    dumping_counts = _svc_subset("Illegal Dumping Pickup")

    # Per-category counts — the new part. Each category aggregates rows from
    # the right source dataset, bucketed by h3.
    category_counts: Dict[str, pd.Series] = {}

    if not lapd_recent.empty and "crm_cd_desc" in lapd_recent.columns:
        tagged = lapd_recent.copy()
        tagged["_cat"] = tagged["crm_cd_desc"].map(categorize_lapd)
        for cat_id in NON_ALL_IDS:
            subset = tagged[tagged["_cat"] == cat_id]
            if subset.empty:
                continue
            category_counts[cat_id] = (
                category_counts.get(cat_id, pd.Series(dtype="int64"))
                .add(subset.groupby("h3").size(), fill_value=0)
            )

    if not collisions_recent.empty:
        col_counts = collisions_recent.groupby("h3").size()
        category_counts["traffic_hazard"] = (
            category_counts.get("traffic_hazard", pd.Series(dtype="int64"))
            .add(col_counts, fill_value=0)
        )

    if not svc311_recent.empty and "requesttype" in svc311_recent.columns:
        tagged311 = svc311_recent.copy()
        tagged311["_cat"] = tagged311["requesttype"].map(svc311_category)
        for cat_id in NON_ALL_IDS:
            subset = tagged311[tagged311["_cat"] == cat_id]
            if subset.empty:
                continue
            category_counts[cat_id] = (
                category_counts.get(cat_id, pd.Series(dtype="int64"))
                .add(subset.groupby("h3").size(), fill_value=0)
            )

    all_cells = set()
    for s in (crime_counts, collision_counts, light_counts, graffiti_counts, dumping_counts):
        all_cells.update(s.index.tolist())
    for s in category_counts.values():
        all_cells.update(s.index.tolist())

    hour_of_week = now.weekday() * 24 + now.hour

    rows = []
    for cell in all_cells:
        row = {
            "h3": cell,
            "crime_90d": int(crime_counts.get(cell, 0)),
            "collision_365d": int(collision_counts.get(cell, 0)),
            "streetlight_30d": int(light_counts.get(cell, 0)),
            "graffiti_30d": int(graffiti_counts.get(cell, 0)),
            "dumping_30d": int(dumping_counts.get(cell, 0)),
            "hour_of_week": hour_of_week,
            "is_weekend": int(now.weekday() >= 5),
        }
        total = 0
        for cat_id in NON_ALL_IDS:
            count = int(category_counts.get(cat_id, pd.Series(dtype="int64")).get(cell, 0))
            row[count_column(cat_id)] = count
            total += count
        row[count_column("all")] = total
        rows.append(row)
    fused = pd.DataFrame(rows)
    if fused.empty:
        log.warning("[fuse] empty fused frame — did ingest run?")
        return fused

    # Dataset-size-adaptive label. For each hex cell we build a combined
    # danger score from recent crime + collision density, then mark the top
    # 25% (by score) as positive. This gives a balanced training signal
    # regardless of whether we pulled 5K rows (dev) or 500K (DGX).
    score_raw = (
        fused["crime_90d"].astype("float32") * 1.0
        + fused["collision_365d"].astype("float32") * 0.4
        + fused["streetlight_30d"].astype("float32") * 0.6
    )
    if score_raw.max() <= 0:
        fused["label"] = 0
    else:
        threshold = score_raw.quantile(0.75)
        fused["label"] = (score_raw > threshold).astype(int)
    log.info(
        "[fuse] fused shape=%s label_rate=%.3f (top-quartile threshold=%.2f)",
        fused.shape,
        fused["label"].mean(),
        float(score_raw.quantile(0.75)) if len(score_raw) else 0.0,
    )

    if HAS_RAPIDS:
        try:
            df_lib = get_df_lib()
            return df_lib.DataFrame.from_pandas(fused)
        except Exception as err:
            log.warning("[fuse] cudf conversion failed: %s", err)
    return fused


def save_fused(df) -> Path:
    path = settings.parquet_root / "fused.parquet"
    try:
        pdf = df.to_pandas() if hasattr(df, "to_pandas") else df
    except Exception:
        pdf = df
    pdf.to_parquet(path, index=False)
    log.info("[fuse] wrote %s", path)
    return path


def load_fused():
    path = settings.parquet_root / "fused.parquet"
    if not path.exists():
        return None
    return pd.read_parquet(path)
