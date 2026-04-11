"""
main.py
~~~~~~~
FastAPI microservice entry point for the SafariCharge validation harness.

Endpoints
---------
GET  /health
    Liveness probe – returns ``{"status": "ok"}``.

POST /validate/pvlib
    Runs a pvlib TMY simulation for the supplied system config, optionally
    fetches the SafariCharge engine output from the Next.js API, computes
    RMSE / bias / MAPE, and returns a ValidationResult.

Usage
-----
    uvicorn main:app --reload --port 8000

See validation/README.md for full documentation.
"""

from __future__ import annotations

import logging
import os
from typing import Any
from urllib.parse import urlparse

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse

from harness.comparator import compute_metrics
from harness.models import SystemConfig, ValidationResult
from harness.pvlib_runner import run_pvlib

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s – %(message)s",
)
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# SSRF guard
# ---------------------------------------------------------------------------


def _validate_engine_url(url: str) -> "str | None":
    """
    Validate *url* against an allowlist before it is used in an outbound
    HTTP request.

    Returns the original *url* string if it passes validation, or ``None``
    if it should be rejected (invalid scheme, disallowed host, etc.).

    The allowed host list is configured via the ``ENGINE_ALLOWED_HOSTS``
    environment variable (comma-separated ``hostname`` or ``hostname:port``
    values).  Defaults to ``localhost,127.0.0.1``.
    """
    if not url:
        return None

    _allowed_raw = os.environ.get("ENGINE_ALLOWED_HOSTS", "localhost,127.0.0.1")
    _allowed_hosts = {h.strip() for h in _allowed_raw.split(",") if h.strip()}

    try:
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https"):
            raise ValueError(f"Unsupported scheme: {parsed.scheme!r}")
        netloc_host = parsed.hostname or ""
        netloc_port = f":{parsed.port}" if parsed.port else ""
        netloc = f"{netloc_host}{netloc_port}"
        if netloc_host not in _allowed_hosts and netloc not in _allowed_hosts:
            raise ValueError(
                f"Engine output URL host {netloc_host!r} is not in the "
                f"allowed list. Set ENGINE_ALLOWED_HOSTS to permit it."
            )
    except ValueError as exc:
        logger.warning("Rejected engine_output_url – %s", exc)
        return None

    # Return a freshly constructed URL built only from the validated components
    # so that the value passed to httpx is not considered tainted user input.
    safe = f"{parsed.scheme}://{parsed.netloc}{parsed.path}"
    if parsed.query:
        safe = f"{safe}?{parsed.query}"
    return safe


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = FastAPI(
    title="SafariCharge Validation Harness",
    description=(
        "Benchmarks the SafariCharge TypeScript physics engine against "
        "pvlib (and optionally SAM) to report RMSE, bias, and MAPE."
    ),
    version="1.0.0",
)

# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@app.get("/health")
async def health() -> dict[str, str]:
    """Liveness probe."""
    return {"status": "ok"}


@app.post("/validate/pvlib", response_model=ValidationResult)
async def validate_pvlib(config: SystemConfig) -> ValidationResult:
    """
    Run a pvlib TMY simulation for *config* and compare against the
    SafariCharge engine output (if ``engine_output_url`` is set).

    Steps
    -----
    1. Run pvlib PVSystem + ModelChain for the given lat/lon / capacity.
    2. If ``config.engine_output_url`` is provided, POST the config to the
       SafariCharge Next.js ``/api/engine-output`` endpoint and retrieve the
       8 760-element hourly AC array.
    3. Compute RMSE, bias, and MAPE between the two arrays.
    4. Return a ValidationResult.

    When ``engine_output_url`` is **not** set the endpoint still runs the
    pvlib simulation and returns annual_reference_kwh, but the engine metrics
    (rmse_kwh, bias_kwh, mape_pct) will be ``NaN`` and annual_engine_kwh
    will be ``null``.
    """
    # ------------------------------------------------------------------
    # 1. pvlib simulation
    # ------------------------------------------------------------------
    try:
        pvlib_result = run_pvlib(config)
    except Exception as exc:
        logger.exception("pvlib simulation failed")
        raise HTTPException(status_code=502, detail=f"pvlib simulation failed: {exc}") from exc

    # ------------------------------------------------------------------
    # 2. SafariCharge engine output (optional)
    # ------------------------------------------------------------------
    engine_hourly: list[float] = []

    _raw_url = config.engine_output_url or os.environ.get("ENGINE_OUTPUT_URL", "")
    safe_engine_url: str | None = _validate_engine_url(_raw_url)

    if safe_engine_url is not None:
        try:
            payload: dict[str, Any] = {
                "latitude": config.latitude,
                "longitude": config.longitude,
                "solarCapacityKw": config.solar_capacity_kw,
                "batteryCapacityKwh": config.battery_capacity_kwh,
                "tiltDeg": config.tilt_deg,
                "azimuthDeg": config.azimuth_deg,
                "simulationYear": config.simulation_year,
            }
            async with httpx.AsyncClient(timeout=120.0) as client:
                resp = await client.post(safe_engine_url, json=payload)
                resp.raise_for_status()
            data = resp.json()
            engine_hourly = [float(v) for v in data]
        except Exception as exc:
            logger.warning("Could not fetch engine output: %s", exc)
            # Proceed without engine output rather than failing the whole request.

    # ------------------------------------------------------------------
    # 3. Metrics
    # ------------------------------------------------------------------
    result = compute_metrics(
        predicted=engine_hourly,
        reference=pvlib_result.hourly_ac,
        reference_tool="pvlib",
    )
    return result
