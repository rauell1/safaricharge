"""Level-2 Energy Balance block.

This is the hierarchical 'interaction layer' that wires together the
Level-1 asset blocks (PV, BESS, Load, Grid) by enforcing the nodal
power balance at every time step.

Physics constraint enforced:
    pv_to_load + bess_to_load + grid_to_load == load_demand

This ensures no energy appears from nowhere and every demand unit is
explicitly sourced. Any violation is infeasible by MILP construction.
"""
from __future__ import annotations

import pyomo.environ as pyo


def build_energy_balance_block(model: pyo.ConcreteModel) -> None:
    """Add Level-2 nodal energy balance constraints to *model*.

    Requires all Level-1 blocks to have been added first.
    """
    T = model.T

    # The BESS charge must equal the sum of pv_to_bess + grid_to_bess.
    # We introduce grid_to_bess as a variable here (grid can charge battery).
    model.grid_to_bess = pyo.Var(T, domain=pyo.NonNegativeReals)

    # bess_discharge feeds load only (grid-export from BESS not modelled).
    model.bess_to_load = pyo.Var(T, domain=pyo.NonNegativeReals)

    # ------------------------------------------------------------------
    # Load balance: every kW of demand must be served
    # ------------------------------------------------------------------
    def load_balance(m, t):
        return (
            m.pv_to_load[t] + m.bess_to_load[t] + m.grid_import[t]
            == m.load_demand[t] + m.grid_to_bess[t]
        )
    model.load_balance_con = pyo.Constraint(T, rule=load_balance)

    # ------------------------------------------------------------------
    # BESS charge balance: total energy entering battery
    # ------------------------------------------------------------------
    def bess_charge_balance(m, t):
        return m.bess_charge[t] == m.pv_to_bess[t] + m.grid_to_bess[t]
    model.bess_charge_balance_con = pyo.Constraint(T, rule=bess_charge_balance)

    # ------------------------------------------------------------------
    # BESS discharge balance: all discharge goes to load
    # ------------------------------------------------------------------
    def bess_discharge_balance(m, t):
        return m.bess_discharge[t] == m.bess_to_load[t]
    model.bess_discharge_balance_con = pyo.Constraint(T, rule=bess_discharge_balance)

    # ------------------------------------------------------------------
    # PV export balance: pv_to_grid == grid_export (if export allowed)
    # ------------------------------------------------------------------
    def pv_export_balance(m, t):
        return m.pv_to_grid[t] == m.grid_export[t]
    model.pv_export_balance_con = pyo.Constraint(T, rule=pv_export_balance)
