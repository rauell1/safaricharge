"""
comparator.py
~~~~~~~~~~~~~
Computes validation metrics (RMSE, bias, MAPE) between a predicted time-series
(SafariCharge engine output) and a reference time-series (pvlib / SAM).

All arrays are expected to contain hourly energy values in kWh.
"""

from __future__ import annotations

import math
from typing import Optional, Sequence

from .models import ValidationResult


def _to_list(arr: Sequence[float]) -> list[float]:
    """Convert any sequence to a plain Python list of floats."""
    return [float(v) for v in arr]


def compute_metrics(
    predicted: Sequence[float],
    reference: Sequence[float],
    reference_tool: str = "pvlib",
) -> ValidationResult:
    """
    Compute RMSE, bias, and MAPE between *predicted* and *reference* arrays.

    Parameters
    ----------
    predicted:
        Hourly energy values from the SafariCharge engine (kWh).
        May be *None* or an empty sequence – in that case ``rmse_kwh``,
        ``bias_kwh``, and ``mape_pct`` are set to ``float('nan')`` and
        ``annual_engine_kwh`` is ``None``.
    reference:
        Hourly energy values from the reference tool (pvlib / SAM) (kWh).
    reference_tool:
        Human-readable label for the reference tool (e.g. ``"pvlib"``).

    Returns
    -------
    ValidationResult
        Pydantic model with all computed metrics.

    Raises
    ------
    ValueError
        If *reference* is empty.
    """
    ref = _to_list(reference)
    if not ref:
        raise ValueError("reference array must not be empty")

    annual_reference_kwh = sum(ref)

    if not predicted:
        return ValidationResult(
            rmse_kwh=float("nan"),
            bias_kwh=float("nan"),
            mape_pct=float("nan"),
            annual_engine_kwh=None,
            annual_reference_kwh=annual_reference_kwh,
            reference_tool=reference_tool,
        )

    pred = _to_list(predicted)

    if len(pred) != len(ref):
        raise ValueError(
            f"predicted ({len(pred)}) and reference ({len(ref)}) arrays must have the same length"
        )

    n = len(pred)
    annual_engine_kwh = sum(pred)

    # RMSE
    sse = sum((p - r) ** 2 for p, r in zip(pred, ref))
    rmse = math.sqrt(sse / n)

    # Bias  (positive → overestimate)
    bias = sum(p - r for p, r in zip(pred, ref)) / n

    # MAPE  – denominator is max(actual, 1) to avoid division by zero on
    # night-time zeros (matches the spec in the problem statement)
    mape = (
        sum(abs(p - r) / max(r, 1.0) for p, r in zip(pred, ref)) / n * 100.0
    )

    return ValidationResult(
        rmse_kwh=rmse,
        bias_kwh=bias,
        mape_pct=mape,
        annual_engine_kwh=annual_engine_kwh,
        annual_reference_kwh=annual_reference_kwh,
        reference_tool=reference_tool,
    )
