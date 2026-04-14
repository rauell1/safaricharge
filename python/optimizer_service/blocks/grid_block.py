"""Level-1 Grid connection block with KPLC TOU billing.

Models the economic interaction between the microgrid and the utility
grid. Import costs and export revenues are indexed per time step,
allowing full TOU tariff representation (peak/off-peak/shoulder) as
already defined in src/lib/tariff-config.ts.
"""
from __future__ import annotations

from typing import TYPE_CHECKING

import pyomo.environ as pyo

if TYPE_CHECKING:
    from ..models import GridBlock as GridConfig


def build_grid_block(model: pyo.ConcreteModel, cfg: "GridConfig") -> None:
    """Attach grid variables, parameters, and cost terms to *model*."""
    T = model.T

    # ------------------------------------------------------------------
    # Parameters
    # ------------------------------------------------------------------
    import_price = {t: float(cfg.import_price_kes_kwh[t]) for t in T}
    export_price = {t: float(cfg.export_price_kes_kwh[t]) for t in T}

    model.grid_import_price = pyo.Param(T, initialize=import_price)
    model.grid_export_price = pyo.Param(T, initialize=export_price)
    model.grid_max_import = pyo.Param(initialize=cfg.max_import_kw)
    model.grid_allow_export = pyo.Param(initialize=int(cfg.allow_export))

    # ------------------------------------------------------------------
    # Decision variables
    # ------------------------------------------------------------------
    model.grid_import = pyo.Var(T, domain=pyo.NonNegativeReals)  # kW imported
    model.grid_export = pyo.Var(T, domain=pyo.NonNegativeReals)  # kW exported

    # ------------------------------------------------------------------
    # Constraints
    # ------------------------------------------------------------------
    def import_limit(m, t):
        return m.grid_import[t] <= m.grid_max_import
    model.grid_import_limit = pyo.Constraint(T, rule=import_limit)

    def export_forbidden(m, t):
        """Disallow export when net-metering is not configured."""
        return m.grid_export[t] <= m.grid_allow_export * m.grid_max_import
    model.grid_export_limit = pyo.Constraint(T, rule=export_forbidden)
