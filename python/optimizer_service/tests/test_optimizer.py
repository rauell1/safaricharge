"""Unit tests for the Pyomo MILP optimizer.

Tests a 4-step toy problem with known structure to verify:
  - The optimizer finds a feasible, optimal solution
  - BESS SoC dynamics are physically consistent
  - Energy balance errors are within solver tolerance
  - Scalar KPIs are non-negative and sensible
"""
import pytest

from ..models import (
    BESSBlock,
    GridBlock,
    LoadBlock,
    OptimizeRequest,
    PVBlock,
)
from ..optimizer import solve


N_STEPS = 4
STEP_H = 1.0

# Off-peak periods: PV > load, BESS should charge; then PV=0, BESS discharges
PV_FORECAST = [5.0, 8.0, 3.0, 0.0]   # kW
LOAD_FORECAST = [2.0, 2.0, 4.0, 6.0] # kW
IMPORT_PRICE = [8.0, 8.0, 16.0, 16.0]  # off-peak / peak
EXPORT_PRICE = [0.0, 0.0, 0.0, 0.0]


def make_request(**overrides) -> OptimizeRequest:
    base = dict(
        horizon_steps=N_STEPS,
        step_hours=STEP_H,
        pv=PVBlock(
            dc_capacity_kwp=10.0,
            inverter_capacity_kw=8.0,
            pv_forecast_kw=PV_FORECAST,
        ),
        load=LoadBlock(load_forecast_kw=LOAD_FORECAST),
        bess=BESSBlock(
            capacity_kwh=10.0,
            max_charge_kw=5.0,
            max_discharge_kw=5.0,
            roundtrip_efficiency=0.92,
            soc_min_pct=0.10,
            soc_max_pct=0.95,
            soc_initial_pct=0.50,
        ),
        grid=GridBlock(
            max_import_kw=10.0,
            import_price_kes_kwh=IMPORT_PRICE,
            export_price_kes_kwh=EXPORT_PRICE,
            allow_export=False,
        ),
        solver="glpk",  # GLPK is more widely available in CI than CBC
    )
    base.update(overrides)
    return OptimizeRequest(**base)


def test_feasible_solution():
    req = make_request()
    resp = solve(req)
    assert resp.summary.solver_status == "ok"
    assert resp.summary.solver_termination == "optimal"


def test_output_lengths():
    resp = solve(make_request())
    assert len(resp.bess.charge_kw) == N_STEPS
    assert len(resp.grid.import_kw) == N_STEPS
    assert len(resp.energy_balance.balance_error_kw) == N_STEPS


def test_soc_within_bounds():
    req = make_request()
    resp = solve(req)
    cap = req.bess.capacity_kwh
    for soc in resp.bess.soc_kwh:
        assert soc >= req.bess.soc_min_pct * cap - 1e-4
        assert soc <= req.bess.soc_max_pct * cap + 1e-4


def test_energy_balance_errors_small():
    resp = solve(make_request())
    for err in resp.energy_balance.balance_error_kw:
        assert abs(err) < 0.05, f"Balance error too large: {err}"


def test_kpis_non_negative():
    resp = solve(make_request())
    assert resp.summary.total_import_cost_kes >= 0
    assert resp.summary.self_sufficiency_pct >= 0
    assert resp.summary.self_consumption_pct >= 0
    assert resp.summary.peak_import_kw >= 0


def test_peak_shaving():
    """Optimal solution should use BESS to shave the expensive peak steps."""
    resp = solve(make_request())
    # Steps 2 and 3 are peak (price=16). BESS should be discharging, not charging.
    assert resp.bess.charge_kw[2] < 0.5  # minimal charge during peak
    assert resp.bess.charge_kw[3] < 0.5
