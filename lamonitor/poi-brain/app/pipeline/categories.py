"""Hazard category definitions used to slice the risk model by type.

Mappings are grounded in real LAPD `crm_cd_desc` values from the crime feed
and real MyLA311 `requesttype` values. The "all" category is the default
aggregate — it's what the trained model scores.

Per-category scores are computed analytically from raw counts (percentile
tiered against the current batch) rather than requiring a separate model per
category. This lets the dashboard swap layers instantly without retraining.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List


@dataclass(frozen=True)
class HazardCategory:
    id: str
    label: str
    description: str
    lapd_keywords: tuple[str, ...] = ()
    svc311_types: tuple[str, ...] = ()
    uses_collisions: bool = False


CATEGORIES: List[HazardCategory] = [
    HazardCategory(
        id="all",
        label="All hazards",
        description="Aggregate model score — every signal combined",
    ),
    HazardCategory(
        id="violent",
        label="Violent crime",
        description="Murder, assault, robbery, sex crimes, weapons",
        lapd_keywords=(
            "CRIMINAL HOMICIDE",
            "MANSLAUGHTER",
            "ASSAULT",
            "BATTERY",
            "INTIMATE PARTNER",
            "ROBBERY",
            "KIDNAPPING",
            "RAPE",
            "SEXUAL PENETRATION",
            "CHILD ABUSE",
            "BRANDISH WEAPON",
            "SHOTS FIRED",
            "BOMB SCARE",
            "ARSON",
        ),
    ),
    HazardCategory(
        id="property",
        label="Property crime",
        description="Theft, burglary, larceny, motor vehicle",
        lapd_keywords=(
            "THEFT",
            "STOLEN",
            "BURGLARY",
            "SHOPLIFTING",
            "PURSE SNATCHING",
            "PICKPOCKET",
            "VEHICLE - STOLEN",
            "BIKE - STOLEN",
            "EMBEZZLEMENT",
            "BUNCO",
            "DEFRAUDING",
            "TILL TAP",
            "VANDALISM",
        ),
    ),
    HazardCategory(
        id="public_order",
        label="Public order",
        description="Trespass, disorderly, drugs, disturbing the peace",
        lapd_keywords=(
            "TRESPASSING",
            "DISTURBING THE PEACE",
            "DRUGS",
            "NARCOTICS",
            "DRUNK",
            "DISRUPT SCHOOL",
            "PROWLER",
            "PEEPING TOM",
            "INDECENT EXPOSURE",
            "LEWD",
            "VIOLATION OF RESTRAINING ORDER",
            "CONTEMPT OF COURT",
        ),
    ),
    HazardCategory(
        id="traffic_hazard",
        label="Traffic hazard",
        description="Collisions + traffic-law violations",
        lapd_keywords=(
            "TRAFFIC COLLISION",
            "RECKLESS DRIVING",
            "HIT AND RUN",
            "DRIVING WITHOUT OWNER CONSENT",
        ),
        svc311_types=(
            "Street Sweeping",
        ),
        uses_collisions=True,
    ),
    HazardCategory(
        id="environmental",
        label="Environmental",
        description="311 streetlights, graffiti, illegal dumping",
        svc311_types=(
            "Street Light Condition",
            "Graffiti Removal",
            "Illegal Dumping Pickup",
            "Bulky Items",
            "Homeless Encampment",
        ),
    ),
]


ALL_CATEGORY_IDS: List[str] = [c.id for c in CATEGORIES]
NON_ALL_IDS: List[str] = [c.id for c in CATEGORIES if c.id != "all"]


def categorize_lapd(crm_cd_desc: str | None) -> str | None:
    """Return the first matching hazard category id for an LAPD crm_cd_desc."""
    if not crm_cd_desc:
        return None
    up = str(crm_cd_desc).upper()
    for cat in CATEGORIES:
        if cat.id == "all":
            continue
        for kw in cat.lapd_keywords:
            if kw in up:
                return cat.id
    return None


def svc311_category(requesttype: str | None) -> str | None:
    if not requesttype:
        return None
    for cat in CATEGORIES:
        if cat.id == "all":
            continue
        if requesttype in cat.svc311_types:
            return cat.id
    return None


def category_by_id(category_id: str) -> HazardCategory | None:
    for cat in CATEGORIES:
        if cat.id == category_id:
            return cat
    return None


# Column name convention: `<category>_count` in the fused hex frame.
def count_column(category_id: str) -> str:
    return f"{category_id}_count"


COUNT_COLUMNS: Dict[str, str] = {c.id: count_column(c.id) for c in CATEGORIES}
