from pydantic import BaseModel, Field
from typing import Dict, Optional


class LocationConfig(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    altitude_m: Optional[float] = None
    timezone: str = "Africa/Nairobi"


class PVSystemConfig(BaseModel):
    dc_capacity_kwp: float = Field(..., gt=0, description="PV array nameplate DC power (kWp)")
    tilt_deg: float = Field(..., ge=0, le=90)
    azimuth_deg: float = Field(..., ge=0, le=360)
    inverter_ac_kw: float = Field(..., gt=0)
    loss_fraction: float = Field(
        0.14,
        ge=0,
        le=0.5,
        description="Total system losses (wiring, mismatch, etc.)",
    )


class BatteryConfig(BaseModel):
    capacity_kwh: float = Field(..., gt=0)
    min_soc_pct: float = Field(10, ge=0, le=100)
    max_soc_pct: float = Field(100, ge=0, le=100)
    roundtrip_efficiency: float = Field(0.9, ge=0.5, le=1.0)


class ValidationJobConfig(BaseModel):
    """Job definition as described in ENGINEERING_ISSUES_V2_2026-04-10.md §B."""

    job_id: str
    year: int = Field(..., ge=2000, le=2100)
    location: LocationConfig
    pv_system: PVSystemConfig
    battery: Optional[BatteryConfig] = None
    notes: Optional[str] = None


class EnergySeries(BaseModel):
    """Simple container for energy-by-period."""

    # e.g. {"2026-01": 1234.5, "2026-02": 1189.2}
    monthly_kwh: Dict[str, float]
    annual_kwh: float


class ComparisonMetrics(BaseModel):
    annual_bias_kwh: float
    annual_bias_pct: float
    annual_rmse_kwh: float
    monthly_bias_kwh: Dict[str, float]
    monthly_rmse_kwh: Dict[str, float]


class ValidationResult(BaseModel):
    job: ValidationJobConfig
    reference: EnergySeries  # pvlib / SAM
    safaricharge: EnergySeries  # SafariCharge engine
    comparison: ComparisonMetrics
    # Optional engineering KPIs to wire in later
    specific_yield_kwh_per_kwp: Optional[float] = None
    performance_ratio: Optional[float] = None
