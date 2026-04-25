"""Stretch: cuGraph co-occurrence PageRank on incident graph.

Builds a graph where nodes are H3 cells and edges connect cells whose LAPD
incidents co-occur within a short time window. PageRank then surfaces
"structural hotspots" — cells that are central to incident clusters, even if
their raw count isn't the highest. This is a legitimate cuGraph use and
produces a second insight signal for the risk model.
"""
from __future__ import annotations

import logging
from typing import Dict

import h3
import pandas as pd

from ..config import settings
from .rapids_runtime import HAS_RAPIDS, get_cugraph

log = logging.getLogger("poi.graph")


def _load_lapd() -> pd.DataFrame:
    path = settings.parquet_root / "lapd_crime.parquet"
    if not path.exists():
        return pd.DataFrame()
    return pd.read_parquet(path)


def build_cooccurrence_pagerank(window_hours: int = 6) -> Dict[str, float]:
    """Return {h3_cell: pagerank_score} from a simple co-occurrence graph."""
    df = _load_lapd()
    if df.empty:
        return {}

    needed = {"lat", "lon", "date_occ"}
    if not needed.issubset(df.columns):
        return {}

    df = df.dropna(subset=["lat", "lon", "date_occ"])
    df["dt"] = pd.to_datetime(df["date_occ"], errors="coerce")
    df = df.dropna(subset=["dt"])

    df["h3"] = [
        h3.latlng_to_cell(float(r.lat), float(r.lon), settings.h3_resolution)
        for r in df.itertuples(index=False)
    ]

    df = df.sort_values("dt")
    edges = []
    window = pd.Timedelta(hours=window_hours)

    events = df[["dt", "h3"]].to_records(index=False)
    for i in range(len(events) - 1):
        base_dt, base_h3 = events[i]
        for j in range(i + 1, min(i + 50, len(events))):
            nxt_dt, nxt_h3 = events[j]
            if nxt_dt - base_dt > window:
                break
            if nxt_h3 != base_h3:
                edges.append((base_h3, nxt_h3))

    if not edges:
        return {}

    edge_df = pd.DataFrame(edges, columns=["src", "dst"])
    edge_df = edge_df.value_counts().reset_index(name="weight")

    cugraph = get_cugraph()
    if HAS_RAPIDS and cugraph is not None:
        try:
            import cudf  # type: ignore

            gdf = cudf.DataFrame.from_pandas(edge_df)
            g = cugraph.Graph()
            g.from_cudf_edgelist(gdf, source="src", destination="dst", edge_attr="weight")
            pr = cugraph.pagerank(g).to_pandas()
            pr = pr.rename(columns={"vertex": "h3", "pagerank": "score"})
            return dict(zip(pr["h3"], pr["score"]))
        except Exception as err:
            log.warning("[graph] cuGraph path failed: %s", err)

    try:
        import networkx as nx  # type: ignore

        g = nx.DiGraph()
        for _, row in edge_df.iterrows():
            g.add_edge(row["src"], row["dst"], weight=float(row["weight"]))
        pr = nx.pagerank(g, weight="weight")
        return dict(pr)
    except Exception as err:
        log.warning("[graph] networkx fallback failed: %s", err)
        return {}
