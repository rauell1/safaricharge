"""Pydantic v2 request/response models for the SafariCharge Forecasting Service."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class HistoricalPoint(BaseModel):
    """A single historical data point supplied by the caller."""

    timestamp: str = Field(..., description="ISO-8601 timestamp string")
    solar_kw: float = Field(..., ge=0, description="Measured solar generation (kW)")
    load_kw: float = Field(..., ge=0, description="Measured total load (kW)")
    temperature_c: float = Field(25.0, description="Ambient temperature (°C)")
    cloud_cover_pct: float = Field(
        0.0, ge=0, le=100, description="Cloud cover percentage 0-100"
    )


class ForecastRequest(BaseModel):
    """Full solar + load forecast request."""

    latitude: float = Field(-1.2921, ge=-90, le=90)
    longitude: float = Field(36.8219, ge=-180, le=180)
    solar_capacity_kw: float = Field(..., gt=0, description="Installed PV capacity (kW)")
    history: list[HistoricalPoint] = Field(
        ..., min_length=24, description="At least 24 hourly historical data points"
    )
    horizon_hours: int = Field(24, ge=1, le=72, description="Forecast horizon in hours")


class SolarForecastRequest(BaseModel):
    """Solar-only forecast request."""

    latitude: float = Field(-1.2921, ge=-90, le=90)
    longitude: float = Field(36.8219, ge=-180, le=180)
    solar_capacity_kw: float = Field(..., gt=0)
    history: list[HistoricalPoint] = Field(..., min_length=24)
    horizon_hours: int = Field(24, ge=1, le=72)


class LoadForecastRequest(BaseModel):
    """Load-only forecast request."""

    history: list[HistoricalPoint] = Field(..., min_length=24)
    horizon_hours: int = Field(24, ge=1, le=72)


class ForecastPoint(BaseModel):
    """A single point in the forecast horizon."""

    timestamp: str
    solar_kw: float
    load_kw: float
    solar_confidence_low: float
    solar_confidence_high: float
    load_confidence_low: float
    load_confidence_high: float


class ForecastResponse(BaseModel):
    """Full forecast response returned by /forecast."""

    forecast: list[ForecastPoint]
    model_info: dict[str, Any]
