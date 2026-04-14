"""Core MILP optimizer: assembles blocks and solves.

This module follows the LEAP/PoliMi block-structured EMS pattern:
    1. Build a Pyomo ConcreteModel with a shared time-set.
    2. Attach Level-1 asset blocks (PV, BESS, Load, Grid).
    3. Attach Level-2 energy balance block.
    4. Define the objective (minimise net energy cost).
    5. Solve with CBC (or GLPK fallback) and extract results.
"""
from __future__ import annotations

import time
from typing import Optional

import pyomo.environ as pyo
from pyomo.opt import SolverFactory, SolverStatus, TerminationCondition

from .blocks.bess_block import build_bess_block
from .blocks.energy_balance_block import build_energy_balance_block
from .blocks.grid_block import build_grid_block
from .blocks.load_block import build_load_block
from .blocks.pv_block import build_pv_block
from .models import (
    BESSDispatchResult,
    EnergyBalanceResult,
    GridDispatchResult,
    OptimizeRequest,
    OptimizeResponse,
    OptimizeSummary,
)


def solve(req: OptimizeRequest) -> OptimizeResponse:
    """Build and solve the MILP model for the given request.

    Returns a fully populated OptimizeResponse including dispatch
    schedules, energy balance validation, and scalar KPIs.
    """
    n = req.horizon_steps
    T = range(n)  # time-step index set

    # ------------------------------------------------------------------
    # 1. Concrete model + shared sets/params
    # ------------------------------------------------------------------
    model = pyo.ConcreteModel(name="SafariCharge_EMS")
    model.T = pyo.Set(initialize=T)
    model.step_hours = pyo.Param(initialize=req.step_hours)

    # ------------------------------------------------------------------
    # 2. Level-1 blocks
    # ------------------------------------------------------------------
    build_pv_block(model, req.pv)
    build_load_block(model, req.load)
    build_bess_block(model, req.bess)
    build_grid_block(model, req.grid)

    # ------------------------------------------------------------------
    # 3. Level-2 energy balance block
    # ------------------------------------------------------------------
    build_energy_balance_block(model)

    # ------------------------------------------------------------------
    # 4. Objective: minimise total net energy cost (KES)
    # ------------------------------------------------------------------
    def objective_rule(m):
        import_cost = sum(
            m.grid_import[t] * m.grid_import_price[t] * m.step_hours for t in T
        )
        export_revenue = sum(
            m.grid_export[t] * m.grid_export_price[t] * m.step_hours for t in T
        )
        return import_cost - export_revenue

    model.obj = pyo.Objective(rule=objective_rule, sense=pyo.minimize)

    # ------------------------------------------------------------------
    # 5. Solve
    # ------------------------------------------------------------------
    solver = SolverFactory(req.solver)
    t0 = time.perf_counter()
    result = solver.solve(model, tee=False)
    solve_time = time.perf_counter() - t0

    status = str(result.solver.status)
    termination = str(result.solver.termination_condition)
    feasible = (
        result.solver.status == SolverStatus.ok
        and result.solver.termination_condition == TerminationCondition.optimal
    )

    if not feasible:
        raise RuntimeError(
            f"Solver did not find an optimal solution. "
            f"Status={status}, Termination={termination}"
        )

    # ------------------------------------------------------------------
    # 6. Extract results
    # ------------------------------------------------------------------
    def val(v) -> float:
        return float(pyo.value(v))

    bess_charge_kw = [val(model.bess_charge[t]) for t in T]
    bess_discharge_kw = [val(model.bess_discharge[t]) for t in T]
    bess_soc_kwh = [val(model.bess_soc[t]) for t in T]
    bess_soc_pct = [s / req.bess.capacity_kwh for s in bess_soc_kwh]

    grid_import_kw = [val(model.grid_import[t]) for t in T]
    grid_export_kw = [val(model.grid_export[t]) for t in T]
    import_cost_kes = [
        val(model.grid_import[t]) * val(model.grid_import_price[t]) * req.step_hours
        for t in T
    ]
    export_rev_kes = [
        val(model.grid_export[t]) * val(model.grid_export_price[t]) * req.step_hours
        for t in T
    ]

    pv_used = [val(model.pv_to_load[t]) for t in T]
    pv_to_bess = [val(model.pv_to_bess[t]) for t in T]
    pv_to_grid = [val(model.pv_to_grid[t]) for t in T]
    bess_to_load = [val(model.bess_to_load[t]) for t in T]
    grid_to_load = [
        val(model.grid_import[t]) - val(model.grid_to_bess[t]) for t in T
    ]

    # Energy balance error (should be ~0 for all steps)
    balance_error = [
        pv_used[t] + bess_to_load[t] + grid_to_load[t] - req.load.load_forecast_kw[t]
        for t in T
    ]

    total_load = sum(req.load.load_forecast_kw) * req.step_hours
    total_import_cost = sum(import_cost_kes)
    total_export_rev = sum(export_rev_kes)
    self_sufficiency = (
        sum((pv_used[t] + bess_to_load[t]) * req.step_hours for t in T) / total_load
        if total_load > 0 else 0.0
    )
    total_pv = sum(req.pv.pv_forecast_kw) * req.step_hours
    self_consumption = (
        sum((pv_used[t] + pv_to_bess[t]) * req.step_hours for t in T) / total_pv
        if total_pv > 0 else 0.0
    )

    return OptimizeResponse(
        horizon_steps=n,
        step_hours=req.step_hours,
        bess=BESSDispatchResult(
            charge_kw=bess_charge_kw,
            discharge_kw=bess_discharge_kw,
            soc_kwh=bess_soc_kwh,
            soc_pct=bess_soc_pct,
        ),
        grid=GridDispatchResult(
            import_kw=grid_import_kw,
            export_kw=grid_export_kw,
            import_cost_kes=import_cost_kes,
            export_revenue_kes=export_rev_kes,
        ),
        energy_balance=EnergyBalanceResult(
            pv_used_kw=pv_used,
            pv_to_bess_kw=pv_to_bess,
            pv_to_grid_kw=pv_to_grid,
            grid_to_load_kw=grid_to_load,
            bess_to_load_kw=bess_to_load,
            balance_error_kw=balance_error,
        ),
        summary=OptimizeSummary(
            total_import_cost_kes=total_import_cost,
            total_export_revenue_kes=total_export_rev,
            net_energy_cost_kes=total_import_cost - total_export_rev,
            self_sufficiency_pct=round(self_sufficiency * 100, 2),
            self_consumption_pct=round(self_consumption * 100, 2),
            peak_import_kw=max(grid_import_kw),
            solver_status=status,
            solver_termination=termination,
            solve_time_s=round(solve_time, 4),
        ),
        notes="MILP optimal dispatch. Balance errors > 0.01 kW indicate a solver tolerance issue.",
    )
