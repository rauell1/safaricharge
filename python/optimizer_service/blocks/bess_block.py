"""Level-1 BESS block.

Models a single battery storage unit with:
- Charge / discharge power variables (split for MILP linearisation)
- SoC dynamics (rolling horizon, time-coupled)
- Round-trip efficiency applied to charge
- Binary mutex: cannot charge and discharge simultaneously
"""
from __future__ import annotations

from typing import TYPE_CHECKING

import pyomo.environ as pyo

if TYPE_CHECKING:
    from ..models import BESSBlock as BESSConfig


def build_bess_block(model: pyo.ConcreteModel, cfg: "BESSConfig") -> None:
    """Attach BESS variables and constraints to *model* in-place.

    Convention: all power variables are in kW, energy in kWh.
    The model must already have a set ``model.T`` (time steps).
    """
    T = model.T

    capacity = cfg.capacity_kwh
    eta = cfg.roundtrip_efficiency
    sqrt_eta = eta ** 0.5  # charge/discharge symmetric split

    # ------------------------------------------------------------------
    # Parameters
    # ------------------------------------------------------------------
    model.bess_capacity_kwh = pyo.Param(initialize=capacity)
    model.bess_max_charge_kw = pyo.Param(initialize=cfg.max_charge_kw)
    model.bess_max_discharge_kw = pyo.Param(initialize=cfg.max_discharge_kw)
    model.bess_soc_min = pyo.Param(initialize=cfg.soc_min_pct * capacity)
    model.bess_soc_max = pyo.Param(initialize=cfg.soc_max_pct * capacity)
    model.bess_soc_initial = pyo.Param(initialize=cfg.soc_initial_pct * capacity)
    model.bess_eta_charge = pyo.Param(initialize=sqrt_eta)
    model.bess_eta_discharge = pyo.Param(initialize=sqrt_eta)

    # ------------------------------------------------------------------
    # Decision variables
    # ------------------------------------------------------------------
    model.bess_charge = pyo.Var(T, domain=pyo.NonNegativeReals)    # kW into battery
    model.bess_discharge = pyo.Var(T, domain=pyo.NonNegativeReals) # kW out of battery
    model.bess_soc = pyo.Var(T, domain=pyo.NonNegativeReals)       # kWh at end of step
    # Binary: 1 = charging allowed this step, 0 = discharging allowed
    model.bess_mode = pyo.Var(T, domain=pyo.Binary)

    # ------------------------------------------------------------------
    # Constraints
    # ------------------------------------------------------------------
    dt = model.step_hours

    def soc_dynamics(m, t):
        """SoC at end of step t = SoC at end of t-1 + net energy."""
        soc_prev = m.bess_soc_initial if t == 0 else m.bess_soc[t - 1]
        return m.bess_soc[t] == (
            soc_prev
            + m.bess_charge[t] * m.bess_eta_charge * dt
            - m.bess_discharge[t] / m.bess_eta_discharge * dt
        )
    model.bess_soc_dynamics = pyo.Constraint(T, rule=soc_dynamics)

    def soc_min_con(m, t):
        return m.bess_soc[t] >= m.bess_soc_min
    model.bess_soc_min_con = pyo.Constraint(T, rule=soc_min_con)

    def soc_max_con(m, t):
        return m.bess_soc[t] <= m.bess_soc_max
    model.bess_soc_max_con = pyo.Constraint(T, rule=soc_max_con)

    def charge_limit(m, t):
        return m.bess_charge[t] <= m.bess_max_charge_kw * m.bess_mode[t]
    model.bess_charge_limit = pyo.Constraint(T, rule=charge_limit)

    def discharge_limit(m, t):
        return m.bess_discharge[t] <= m.bess_max_discharge_kw * (1 - m.bess_mode[t])
    model.bess_discharge_limit = pyo.Constraint(T, rule=discharge_limit)
