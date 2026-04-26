"""Unit tests for the what-if / perturbation engine.

Each test constructs a minimal mocked feature DataFrame and verifies that
score_with_perturbations produces sensible baseline, perturbed, and delta
outputs without requiring a GPU or trained model.
"""
from __future__ import annotations

from unittest.mock import patch, MagicMock

import numpy as np
import pandas as pd
import pytest


# ── Helpers ──────────────────────────────────────────────────────────────

def _make_fake_pdf(n_cells: int = 10) -> pd.DataFrame:
    """Minimal feature frame matching what risk_engine expects."""
    rng = np.random.default_rng(42)
    return pd.DataFrame(
        {
            "h3": [f"89283082{i}ffffff" for i in range(n_cells)],
            "crime_90d": rng.uniform(5, 50, n_cells),
            "collision_365d": rng.uniform(2, 30, n_cells),
            "streetlight_30d": rng.uniform(0, 10, n_cells),
            "hour_of_week": [72] * n_cells,
            "is_weekend": [0] * n_cells,
        }
    )


def _mock_score_features(pdf):
    """Deterministic scoring stub: weighted sum of columns, clamped 0-1."""
    w = {"crime_90d": 0.01, "collision_365d": 0.02, "streetlight_30d": 0.03}
    scores = np.zeros(len(pdf))
    for col, weight in w.items():
        if col in pdf.columns:
            scores += np.asarray(pdf[col], dtype="float64") * weight
    return np.clip(scores, 0, 1).tolist()


# ── Fixtures ─────────────────────────────────────────────────────────────

@pytest.fixture(autouse=True)
def _mock_risk_engine(monkeypatch):
    """Patch the fused cache loader and model scorer so tests run without data/GPU."""
    fake_pdf = _make_fake_pdf()
    monkeypatch.setattr(
        "app.pipeline.risk_engine._load_or_refresh_fused_cache",
        lambda: fake_pdf,
    )
    monkeypatch.setattr(
        "app.pipeline.risk_engine.score_features",
        _mock_score_features,
    )


# ── Tests ────────────────────────────────────────────────────────────────

def test_baseline_only():
    from app.pipeline.risk_engine import score_with_perturbations

    result = score_with_perturbations([], hour_of_week=72)
    assert result.hour_of_week == 72
    assert len(result.baseline) == 10
    assert len(result.perturbed) == 10
    assert len(result.delta) == 10
    # No perturbation => delta should be ~0
    for d in result.delta:
        assert abs(d.score) < 1e-6, f"expected zero delta, got {d.score}"


def test_road_close():
    from app.schemas import Perturbation
    from app.pipeline.risk_engine import score_with_perturbations

    p = Perturbation(kind="road_close", params={})
    result = score_with_perturbations([p], hour_of_week=72)
    # Road close increases collision and crime features => positive delta
    assert result.summary["cells_worsened"] >= 0
    assert result.summary["total_delta"] > 0


def test_weather():
    from app.schemas import Perturbation
    from app.pipeline.risk_engine import score_with_perturbations

    p = Perturbation(kind="weather", params={"intensity": 2.0})
    result = score_with_perturbations([p], hour_of_week=72)
    assert result.summary["total_delta"] > 0


def test_unit_add():
    from app.schemas import Perturbation
    from app.pipeline.risk_engine import score_with_perturbations

    p = Perturbation(kind="unit_add", params={"count": 5})
    result = score_with_perturbations([p], hour_of_week=72)
    # Adding units should reduce crime features => negative delta
    assert result.summary["total_delta"] < 0


def test_signal_outage():
    from app.schemas import Perturbation
    from app.pipeline.risk_engine import score_with_perturbations

    p = Perturbation(kind="signal_outage", params={})
    result = score_with_perturbations([p], hour_of_week=72)
    assert result.summary["total_delta"] > 0
    assert result.summary["cells_worsened"] > 0
