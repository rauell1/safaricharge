"""Pydantic request/response models for the optimizer service."""
from __future__ import annotations

from typing import List, Literal, Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Block-structured input types
# Each block describes one system component independently, mirroring the
# LEAP/PoliMi hierarchical EMS approach: L1 blocks (assets) + L2 balances.
# ---------------------------------------------------------------------------

class PVBlock(BaseModel):
    """Level-1 PV generation block."""
    dc_capacity_kwp: float = Field(..., gt=0, description="Installed DC capacity (kWp)")
    inverter_capacity_kw: float = Field(..., gt=0, description="Inverter AC limit (kW)")
    # Forecasted AC output per time-step (kW), length == horizon_steps
    pv_forecast_kw: List[float] = Field(..., min_items=1)


class LoadBlock(BaseModel):
    """Level-1 demand block (aggregated building + EV + other loads)."""
    # Forecasted total load per time-step (kW), length == horizon_steps
    load_forecast_kw: List[float] = Field(..., min_items=1)


class BESSBlock(BaseModel):
    """Level-1 battery energy storage block."""
    capacity_kwh: float = Field(..., gt=0, description="Usable BESS capacity (kWh)")
    max_charge_kw: float = Field(..., gt=0, description="Max charge power (kW)")
    max_discharge_kw: float = Field(..., gt=0, description="Max discharge power (kW)")
    roundtrip_efficiency: float = Field(0.92, ge=0.5, le=1.0, description="Round-trip efficiency η")
    soc_min_pct: float = Field(0.10, ge=0.0, le=1.0, description="Minimum SoC (fraction)")
    soc_max_pct: float = Field(0.95, ge=0.0, le=1.0, description="Maximum SoC (fraction)")
    soc_initial_pct: float = Field(0.50, ge=0.0, le=1.0, description="Initial SoC (fraction)")


class GridBlock(BaseModel):
    """Level-1 grid connection block with KPLC TOU tariff."""
    max_import_kw: float = Field(..., gt=0, description="Grid import capacity limit (kW)")
    # Per-step import price in KES/kWh, length == horizon_steps
    import_price_kes_kwh: List[float] = Field(..., min_items=1)
    # Per-step export price (feed-in/net-metering), 0 if not applicable
    export_price_kes_kwh: List[float] = Field(..., min_items=1)
    allow_export: bool = Field(False, description="True if grid export (net-metering) is enabled")


class OptimizeRequest(BaseModel):
    """Full system optimization request."""
    horizon_steps: int = Field(..., gt=0, le=96, description="Number of time steps (max 96 = 4 days @ 1h)")
    step_hours: float = Field(1.0, gt=0, description="Hours per time step (e.g. 0.25 for 15-min, 1.0 for hourly)")
    pv: PVBlock
    load: LoadBlock
    bess: BESSBlock
    grid: GridBlock
    solver: Literal["cbc", "glpk"] = Field("cbc", description="MILP solver to use")


# ---------------------------------------------------------------------------
# Response
# ---------------------------------------------------------------------------

class BESSDispatchResult(BaseModel):
    """Optimal BESS dispatch schedule."""
    charge_kw: List[float]        # positive = charging
    discharge_kw: List[float]     # positive = discharging
    soc_kwh: List[float]          # SoC at end of each step
    soc_pct: List[float]          # SoC as fraction of capacity


class GridDispatchResult(BaseModel):
    """Optimal grid import/export schedule."""
    import_kw: List[float]
    export_kw: List[float]
    import_cost_kes: List[float]  # cost per step
    export_revenue_kes: List[float]


class EnergyBalanceResult(BaseModel):
    """Level-2 energy balance validation per time step."""
    pv_used_kw: List[float]       # PV directly serving load
    pv_to_bess_kw: List[float]    # PV charging battery
    pv_to_grid_kw: List[float]    # PV exported to grid
    grid_to_load_kw: List[float]  # Grid serving load directly
    bess_to_load_kw: List[float]  # Battery discharging to load
    balance_error_kw: List[float] # Should be ~0; non-zero = physics violation


class OptimizeSummary(BaseModel):
    """Scalar KPIs for the optimal solution."""
    total_import_cost_kes: float
    total_export_revenue_kes: float
    net_energy_cost_kes: float
    self_sufficiency_pct: float   # fraction of load served without grid
    self_consumption_pct: float   # fraction of PV consumed locally
    peak_import_kw: float
    solver_status: str
    solver_termination: str
    solve_time_s: Optional[float] = None


class OptimizeResponse(BaseModel):
    """Full optimization response with dispatch schedule + KPIs."""
    horizon_steps: int
    step_hours: float
    bess: BESSDispatchResult
    grid: GridDispatchResult
    energy_balance: EnergyBalanceResult
    summary: OptimizeSummary
    backend_version: str = "1.0.0"
    notes: Optional[str] = None
