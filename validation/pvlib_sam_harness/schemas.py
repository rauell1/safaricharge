"""Pydantic request / response schemas for the pvlib/SAM validation harness."""

from __future__ import annotations

from typing import Optional
from pydantic import BaseModel, Field


# ── Request ───────────────────────────────────────────────────────────────────


class SystemConfig(BaseModel):
    """System configuration matching SafariCharge's physics-engine inputs."""

    latitude: float = Field(-1.2921, description="Site latitude (decimal degrees, S = negative)")
    longitude: float = Field(36.8219, description="Site longitude (decimal degrees, E = positive)")
    altitude_m: float = Field(1795.0, description="Site altitude above sea level (m)")
    dc_capacity_kwp: float = Field(10.0, ge=0.5, le=5000.0, description="Installed DC PV capacity (kWp)")
    battery_capacity_kwh: float = Field(50.0, ge=0.0, description="Battery nominal capacity (kWh)")
    battery_max_charge_kw: float = Field(5.0, ge=0.0, description="Max battery charge power (kW)")
    battery_max_discharge_kw: float = Field(5.0, ge=0.0, description="Max battery discharge power (kW)")
    inverter_efficiency: float = Field(0.96, ge=0.5, le=1.0, description="Inverter efficiency (0–1)")
    panel_efficiency: float = Field(0.20, ge=0.05, le=0.35, description="Panel STC efficiency (0–1)")
    tilt_deg: float = Field(10.0, ge=0.0, le=90.0, description="Panel tilt from horizontal (degrees)")
    azimuth_deg: float = Field(
        180.0, ge=0.0, lt=360.0,
        description="Panel azimuth (degrees, 180 = south-facing)"
    )
    year: int = Field(2023, ge=1990, le=2030, description="Simulation year (used for TMY selection)")


class SafariChargeResults(BaseModel):
    """Results submitted from SafariCharge for comparison."""

    annual_solar_kwh: float = Field(..., description="Total annual PV generation (kWh)")
    specific_yield_kwh_per_kwp: float = Field(..., description="kWh generated per kWp installed")
    performance_ratio_pct: float = Field(..., description="Performance Ratio (%)")
    capacity_factor_pct: float = Field(..., description="Capacity Factor (%)")
    battery_cycles: float = Field(..., description="Equivalent full battery cycles")


class CompareRequest(SystemConfig):
    """Validation request that includes SafariCharge results for comparison."""

    safaricharge_results: SafariChargeResults


# ── Response ──────────────────────────────────────────────────────────────────


class KpiResult(BaseModel):
    """KPI values from one simulation engine."""

    annual_solar_kwh: float
    specific_yield_kwh_per_kwp: float
    performance_ratio_pct: float
    capacity_factor_pct: float
    battery_cycles: float


class MetricDelta(BaseModel):
    """Absolute and relative difference for one KPI."""

    safaricharge: float
    reference: float
    abs_diff: float
    rel_diff_pct: float
    rmse: float
    bias: float
    pass_threshold: bool


class ValidationResponse(BaseModel):
    """Response from /validate."""

    pvlib: KpiResult
    sam_equivalent: KpiResult
    status: str = "ok"


class CompareResponse(BaseModel):
    """Response from /compare — includes RMSE / bias vs both reference engines."""

    safaricharge: KpiResult
    pvlib: KpiResult
    sam_equivalent: KpiResult
    vs_pvlib: dict[str, MetricDelta]
    vs_sam: dict[str, MetricDelta]
    overall_pass: bool
    summary: str
    status: str = "ok"
