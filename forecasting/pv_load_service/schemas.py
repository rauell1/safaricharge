"""Pydantic request/response models for the PV & load forecasting service.

These mirror the shapes produced by /api/forecast/route.ts (the Next.js proxy)
and consumed by src/stores/forecastStore.ts on the frontend.
"""

from __future__ import annotations

from typing import Optional
from pydantic import BaseModel, Field


# ── Request ───────────────────────────────────────────────────────────────────


class HistoricalPoint(BaseModel):
    """One hourly observation from the simulation (after downsampling in the proxy)."""

    timestamp: str = Field(..., description="ISO-8601 UTC timestamp")
    solar_kw: float = Field(..., ge=0.0, description="PV generation (kW)")
    load_kw: float = Field(..., ge=0.0, description="Total load (kW)")
    temperature_c: float = Field(25.0, description="Ambient temperature (\u00b0C)")
    cloud_cover_pct: float = Field(0.0, ge=0.0, le=100.0, description="Cloud cover (0–100 %)")


class ForecastRequest(BaseModel):
    """Payload sent by the Next.js /api/forecast proxy."""

    latitude: float = Field(-1.2921, description="Site latitude")
    longitude: float = Field(36.8219, description="Site longitude")
    solar_capacity_kw: float = Field(10.0, ge=0.5, description="Installed DC PV capacity (kWp)")
    horizon_hours: int = Field(24, ge=1, le=168, description="Forecast horizon (hours)")
    history: list[HistoricalPoint] = Field(..., min_length=1)


# ── Response ──────────────────────────────────────────────────────────────────


class ForecastPoint(BaseModel):
    """One hourly forecast point — matches ForecastPoint in forecastStore.ts."""

    timestamp: str
    solar_kw: float
    load_kw: float
    solar_confidence_low: float
    solar_confidence_high: float
    load_confidence_low: float
    load_confidence_high: float


class ForecastResponse(BaseModel):
    """Response body returned to the Next.js proxy and then to the frontend."""

    forecast: list[ForecastPoint]
    model_used: str = Field("gbr", description="'gbr' or 'fallback'")
    trained_on_n_points: int
