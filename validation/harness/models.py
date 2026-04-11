"""Pydantic v2 request/response models for the SafariCharge validation harness."""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class SystemConfig(BaseModel):
    """
    SafariCharge system configuration passed to the validation endpoints.

    Mirrors the shape expected by the SafariCharge physics engine and pvlib
    simulation runner.
    """

    latitude: float = Field(
        default=-1.2921,
        description="Site latitude in decimal degrees (negative = south).",
        ge=-90.0,
        le=90.0,
    )
    longitude: float = Field(
        default=36.8219,
        description="Site longitude in decimal degrees.",
        ge=-180.0,
        le=180.0,
    )
    solar_capacity_kw: float = Field(
        default=50.0,
        description="Installed PV capacity in kilowatts (DC nameplate).",
        gt=0.0,
    )
    battery_capacity_kwh: float = Field(
        default=60.0,
        description="Usable battery storage capacity in kilowatt-hours.",
        ge=0.0,
    )
    tilt_deg: float = Field(
        default=15.0,
        description="Panel tilt angle in degrees from horizontal.",
        ge=0.0,
        le=90.0,
    )
    azimuth_deg: float = Field(
        default=180.0,
        description="Panel azimuth in degrees (180 = south-facing).",
        ge=0.0,
        le=360.0,
    )
    simulation_year: int = Field(
        default=2023,
        description="Calendar year for the annual simulation.",
        ge=2000,
        le=2100,
    )
    engine_output_url: Optional[str] = Field(
        default=None,
        description=(
            "URL of the SafariCharge Next.js engine-output API endpoint "
            "(e.g. http://localhost:3000/api/engine-output). "
            "If omitted the comparison against the TS engine is skipped and "
            "only pvlib results are returned."
        ),
    )


class ValidationResult(BaseModel):
    """
    Metrics comparing the SafariCharge engine output against a reference
    simulation (pvlib or SAM).
    """

    rmse_kwh: float = Field(
        description="Root-mean-square error between predicted and reference hourly output (kWh)."
    )
    bias_kwh: float = Field(
        description=(
            "Mean difference (predicted − reference) per hour in kWh. "
            "Positive = engine overestimates."
        )
    )
    mape_pct: float = Field(
        description="Mean absolute percentage error (%)."
    )
    annual_engine_kwh: Optional[float] = Field(
        default=None,
        description="Annual AC energy from the SafariCharge engine (kWh).",
    )
    annual_reference_kwh: float = Field(
        description="Annual AC energy from the reference simulation (pvlib / SAM) (kWh)."
    )
    reference_tool: str = Field(
        description="Name of the reference tool used ('pvlib' or 'sam')."
    )


class PvlibRunResult(BaseModel):
    """Raw output from a pvlib simulation run."""

    annual_kwh: float = Field(description="Total annual AC energy output (kWh).")
    hourly_ac: list[float] = Field(
        description="Hourly AC power output array (8 760 values, kWh per hour)."
    )
