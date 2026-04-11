"""SafariCharge pvlib/SAM validation harness — FastAPI application.

Endpoints:
  GET  /health          Liveness check
  POST /validate        Run pvlib + SAM-equivalent; return KPIs
  POST /compare         Submit SafariCharge results; return RMSE / bias vs both
"""

from __future__ import annotations

import logging
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from pvlib_engine import run_pvlib
from sam_engine import run_sam_equivalent
from metrics import compare_scalar
from schemas import (
    SystemConfig,
    CompareRequest,
    ValidationResponse,
    CompareResponse,
    KpiResult,
)

# ── App ────────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="SafariCharge Validation Harness",
    description=(
        "Benchmarks SafariCharge's physics engine against pvlib and "
        "a SAM-equivalent pipeline. Computes RMSE and bias on annual "
        "energy and KPIs (Specific Yield, PR, CF, Battery Cycles)."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger = logging.getLogger("harness")

# ── KPI field names to compare ────────────────────────────────────────────────

_KPI_FIELDS = [
    "annual_solar_kwh",
    "specific_yield_kwh_per_kwp",
    "performance_ratio_pct",
    "capacity_factor_pct",
    "battery_cycles",
]


def _kpi_to_dict(kpi: KpiResult) -> dict[str, float]:
    return {
        "annual_solar_kwh": kpi.annual_solar_kwh,
        "specific_yield_kwh_per_kwp": kpi.specific_yield_kwh_per_kwp,
        "performance_ratio_pct": kpi.performance_ratio_pct,
        "capacity_factor_pct": kpi.capacity_factor_pct,
        "battery_cycles": kpi.battery_cycles,
    }


def _build_deltas(
    sc: dict[str, float],
    ref: dict[str, float],
) -> dict[str, Any]:
    """Build per-KPI MetricDelta dicts comparing SafariCharge to a reference engine."""
    return {
        field: compare_scalar(sc[field], ref[field], field)
        for field in _KPI_FIELDS
    }


def _overall_pass(deltas: dict[str, Any]) -> bool:
    return all(d["pass_threshold"] for d in deltas.values())


def _summary(vs_pvlib: dict[str, Any], vs_sam: dict[str, Any], passed: bool) -> str:
    if passed:
        return "All KPIs are within acceptable thresholds vs both pvlib and SAM-equivalent."
    failing = [
        f"{k} (pvlib rel_diff={vs_pvlib[k]['rel_diff_pct']:.1f} %)"
        for k in _KPI_FIELDS
        if not vs_pvlib[k]["pass_threshold"]
    ]
    failing += [
        f"{k} (SAM rel_diff={vs_sam[k]['rel_diff_pct']:.1f} %)"
        for k in _KPI_FIELDS
        if not vs_sam[k]["pass_threshold"] and k not in [f.split(" ")[0] for f in failing]
    ]
    return f"Validation FAILED for: {', '.join(failing)}."


# ── Routes ────────────────────────────────────────────────────────────────────


@app.get("/health", summary="Liveness check")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "safaricharge-validation-harness"}


@app.post(
    "/validate",
    response_model=ValidationResponse,
    summary="Run pvlib + SAM-equivalent simulation and return KPIs",
)
def validate(config: SystemConfig) -> ValidationResponse:
    """Run both reference engines for the given system configuration."""
    try:
        pvlib_result = run_pvlib(config)
        sam_result = run_sam_equivalent(config)
    except Exception as exc:
        logger.exception("Simulation error in /validate")
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return ValidationResponse(
        pvlib=pvlib_result,
        sam_equivalent=sam_result,
    )


@app.post(
    "/compare",
    response_model=CompareResponse,
    summary="Compare SafariCharge results against pvlib and SAM-equivalent",
)
def compare(request: CompareRequest) -> CompareResponse:
    """Submit SafariCharge results and receive RMSE/bias vs both reference engines."""
    try:
        pvlib_result = run_pvlib(request)
        sam_result = run_sam_equivalent(request)
    except Exception as exc:
        logger.exception("Simulation error in /compare")
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    sc_kpi = KpiResult(
        annual_solar_kwh=request.safaricharge_results.annual_solar_kwh,
        specific_yield_kwh_per_kwp=request.safaricharge_results.specific_yield_kwh_per_kwp,
        performance_ratio_pct=request.safaricharge_results.performance_ratio_pct,
        capacity_factor_pct=request.safaricharge_results.capacity_factor_pct,
        battery_cycles=request.safaricharge_results.battery_cycles,
    )

    sc_dict = _kpi_to_dict(sc_kpi)
    pvlib_dict = _kpi_to_dict(pvlib_result)
    sam_dict = _kpi_to_dict(sam_result)

    vs_pvlib = _build_deltas(sc_dict, pvlib_dict)
    vs_sam = _build_deltas(sc_dict, sam_dict)

    passed = _overall_pass(vs_pvlib) and _overall_pass(vs_sam)

    return CompareResponse(
        safaricharge=sc_kpi,
        pvlib=pvlib_result,
        sam_equivalent=sam_result,
        vs_pvlib=vs_pvlib,
        vs_sam=vs_sam,
        overall_pass=passed,
        summary=_summary(vs_pvlib, vs_sam, passed),
    )
