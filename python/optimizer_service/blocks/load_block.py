"""Level-1 Load block.

Treats demand as an inelastic must-serve parameter. The optimiser
must fully cover every time step's load from PV, BESS, or grid.
"""
from __future__ import annotations

from typing import TYPE_CHECKING

import pyomo.environ as pyo

if TYPE_CHECKING:
    from ..models import LoadBlock as LoadConfig


def build_load_block(model: pyo.ConcreteModel, cfg: "LoadConfig") -> None:
    """Attach load parameters to *model*."""
    T = model.T

    load_dict = {t: float(cfg.load_forecast_kw[t]) for t in T}
    model.load_demand = pyo.Param(T, initialize=load_dict, within=pyo.NonNegativeReals)
