"""Level-1 PV generation block.

The PV block treats the forecasted AC output as a deterministic
parameter per time step. The optimiser decides how much of the
available PV to:
  - serve load directly
  - charge the BESS
  - export to grid (if allowed)

Curtailment (pv_curtail) absorbs any unfeasible surplus.
"""
from __future__ import annotations

from typing import TYPE_CHECKING

import pyomo.environ as pyo

if TYPE_CHECKING:
    from ..models import PVBlock as PVConfig


def build_pv_block(model: pyo.ConcreteModel, cfg: "PVConfig") -> None:
    """Attach PV parameters and variables to *model* in-place."""
    T = model.T

    # ------------------------------------------------------------------
    # Parameters  (indexed by time step)
    # ------------------------------------------------------------------
    pv_dict = {t: float(cfg.pv_forecast_kw[t]) for t in T}
    model.pv_available = pyo.Param(T, initialize=pv_dict, within=pyo.NonNegativeReals)
    model.pv_inverter_kw = pyo.Param(initialize=cfg.inverter_capacity_kw)

    # ------------------------------------------------------------------
    # Decision variables
    # ------------------------------------------------------------------
    model.pv_to_load = pyo.Var(T, domain=pyo.NonNegativeReals)  # kW PV → load
    model.pv_to_bess = pyo.Var(T, domain=pyo.NonNegativeReals)  # kW PV → battery
    model.pv_to_grid = pyo.Var(T, domain=pyo.NonNegativeReals)  # kW PV → export
    model.pv_curtail = pyo.Var(T, domain=pyo.NonNegativeReals)  # kW curtailed

    # ------------------------------------------------------------------
    # Constraints
    # ------------------------------------------------------------------
    def pv_balance(m, t):
        """All available PV must be accounted for."""
        return (
            m.pv_to_load[t] + m.pv_to_bess[t] + m.pv_to_grid[t] + m.pv_curtail[t]
            == m.pv_available[t]
        )
    model.pv_balance_con = pyo.Constraint(T, rule=pv_balance)

    def pv_inverter_limit(m, t):
        """Total AC output cannot exceed inverter nameplate."""
        return m.pv_to_load[t] + m.pv_to_bess[t] + m.pv_to_grid[t] <= m.pv_inverter_kw
    model.pv_inverter_con = pyo.Constraint(T, rule=pv_inverter_limit)
