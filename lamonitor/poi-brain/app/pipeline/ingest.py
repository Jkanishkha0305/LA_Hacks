"""LA Open Data (SODA) ingestion → Parquet.

Datasets pulled:
- LAPD Crime Data 2020-Present      (2nrs-mtv8) — training labels
- Traffic Collision Data             (d5tf-ez2w) — collision hotspots
- MyLA311 Service Requests           (rq3b-xjk8) — env precursors

Each dataset is saved to parquet_root/<name>.parquet. Idempotent — re-runs
overwrite the same file. Pulls a bounded number of rows per dataset to keep
demo ingestion fast.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

import pandas as pd

from ..config import settings

log = logging.getLogger("poi.ingest")


def _soda_client():
    from sodapy import Socrata

    return Socrata(
        settings.soda_domain,
        settings.soda_app_token,
        timeout=settings.soda_timeout_s,
    )


def _fetch(resource_id: str, where: Optional[str] = None, limit: int = 200_000) -> pd.DataFrame:
    client = _soda_client()
    log.info("[ingest] %s (limit=%d)%s", resource_id, limit, f" where={where}" if where else "")
    records = client.get(resource_id, where=where, limit=limit)
    df = pd.DataFrame.from_records(records) if records else pd.DataFrame()
    log.info("[ingest] %s rows=%d", resource_id, len(df))
    return df


def _write(df: pd.DataFrame, name: str) -> Path:
    path = settings.parquet_root / f"{name}.parquet"
    path.parent.mkdir(parents=True, exist_ok=True)
    df.to_parquet(path, index=False)
    log.info("[ingest] wrote %s (%d rows)", path, len(df))
    return path


def ingest_lapd_crime(limit: int | None = None) -> Path:
    since = (datetime.utcnow() - timedelta(days=365 * 3)).strftime("%Y-%m-%dT00:00:00")
    df = _fetch(
        settings.lapd_crime_resource,
        where=f"date_occ >= '{since}'",
        limit=limit or settings.lapd_crime_limit,
    )
    return _write(df, "lapd_crime")


def ingest_collisions(limit: int | None = None) -> Path:
    since = (datetime.utcnow() - timedelta(days=365 * 2)).strftime("%Y-%m-%dT00:00:00")
    df = _fetch(
        settings.traffic_collisions_resource,
        where=f"date_occ >= '{since}'",
        limit=limit or settings.collisions_limit,
    )
    return _write(df, "collisions")


def ingest_311(limit: int | None = None) -> Path:
    since = (datetime.utcnow() - timedelta(days=365 * 2)).strftime("%Y-%m-%dT00:00:00")
    keep_types = (
        "'Street Light Condition'",
        "'Bulky Items'",
        "'Graffiti Removal'",
        "'Illegal Dumping Pickup'",
        "'Street Sweeping'",
        "'Homeless Encampment'",
    )
    where = (
        f"createddate >= '{since}' AND requesttype IN ({','.join(keep_types)})"
    )
    df = _fetch(
        settings.service_req_311_resource,
        where=where,
        limit=limit or settings.service_311_limit,
    )
    return _write(df, "service_311")


def ingest_all() -> dict:
    """Run all dataset pulls in sequence; tolerate individual failures."""
    results = {}
    for name, fn in [
        ("lapd_crime", ingest_lapd_crime),
        ("collisions", ingest_collisions),
        ("service_311", ingest_311),
    ]:
        try:
            results[name] = str(fn())
        except Exception as err:
            log.exception("[ingest] %s failed: %s", name, err)
            results[name] = f"error: {err}"
    return results
