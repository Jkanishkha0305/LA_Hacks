"""Runtime configuration loaded from env."""
from __future__ import annotations

from pathlib import Path
from typing import List, Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Service
    host: str = "0.0.0.0"
    port: int = 8080
    log_level: str = "info"
    cors_allow_origins: List[str] = ["*"]

    # NIM (primary VLM)
    nim_base_url: str = "http://localhost:11434/v1"
    nim_model: str = "llama3.2-vision:11b"
    nim_api_key: str = "ollama"
    nim_warmup_on_startup: bool = False

    # Local OpenAI-compatible fallback (dev only)
    lmstudio_base_url: str = "http://localhost:1234/v1"
    lmstudio_model: str = "google/gemma-4-26b-a4b"
    vlm_backend: str = "nim"

    # LA Open Data (SODA)
    soda_app_token: Optional[str] = None
    soda_timeout_s: float = 60.0
    soda_domain: str = "data.lacity.org"

    # Dataset resource IDs — LA City Open Data.
    lapd_crime_resource: str = "2nrs-mtv8"
    traffic_collisions_resource: str = "d5tf-ez2w"
    service_req_311_resource: str = "rq3b-xjk8"

    # Per-dataset row caps. Dev-scale defaults — enough to produce a real
    # training frame with meaningful spread. Override for DGX full-fat runs:
    #   LAPD_CRIME_LIMIT=250000 COLLISIONS_LIMIT=150000 SERVICE_311_LIMIT=200000 ...
    lapd_crime_limit: int = 250_000
    collisions_limit: int = 150_000
    service_311_limit: int = 200_000

    # Storage
    data_root: Path = Path("/data/poi")
    parquet_root: Path = Path("/data/poi/parquet")
    models_root: Path = Path("/data/poi/models")
    cache_root: Path = Path("/data/poi/cache")

    # Camera ingestion (Caltrans District 7 — LA)
    caltrans_cctv_url: str = "https://cwwp2.dot.ca.gov/data/d7/cctv/cctvStatusD07.json"
    camera_poll_interval_s: float = 5.0
    camera_subset_size: int = 400
    camera_manual_subset: List[str] = []
    camera_areas: List[str] = []

    # Risk model
    h3_resolution: int = 9
    prediction_window_minutes: int = 15
    la_bbox: List[float] = [-118.67, 33.70, -118.15, 34.34]
    model_version: str = "cuml-xgb-v0"

    # RAPIDS
    enable_rapids: bool = True
    enable_cuspatial: bool = True
    enable_cugraph: bool = False
    enable_cuopt: bool = False

    # ML backend: "auto" | "cuml-xgb" | "torch" | "sklearn"
    # auto = pick cuml-xgb on NVIDIA (DGX), torch on Mac/MPS, sklearn otherwise
    ml_backend: str = "auto"
    torch_device: str = "auto"  # "auto" | "cuda" | "mps" | "cpu"

    # Retrieval
    retrieval_backend: str = "faiss"
    retrieval_top_k: int = 5
    retrieval_radius_m: float = 500.0
    retrieval_max_days_ago: int = 30


settings = Settings()

# Best-effort data directory creation. On Mac dev machines /data is read-only,
# so if the default path fails we fall back to ~/.poi so imports don't crash
# at module load time. Users can override via DATA_ROOT in .env.
def _ensure_writable_paths() -> None:
    import os

    for attr in ("data_root", "parquet_root", "models_root", "cache_root"):
        p = getattr(settings, attr)
        try:
            p.mkdir(parents=True, exist_ok=True)
            continue
        except (PermissionError, OSError):
            pass
        home_fallback = Path.home() / ".poi" / p.name
        home_fallback.mkdir(parents=True, exist_ok=True)
        setattr(settings, attr, home_fallback)
        os.environ.setdefault(attr.upper(), str(home_fallback))


_ensure_writable_paths()
