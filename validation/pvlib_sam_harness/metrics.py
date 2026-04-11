"""RMSE and bias helpers for the validation harness.

For a scalar comparison (single-year KPI vs single-year KPI) RMSE reduces
to the absolute error. The helpers accept arrays so they remain usable for
monthly or hourly comparisons in future extensions.
"""

from __future__ import annotations

import math
from typing import Sequence


# ── KPI pass thresholds ───────────────────────────────────────────────────────
# These match the interpretation guide in README.md.

_THRESHOLDS: dict[str, dict[str, float]] = {
    "specific_yield_kwh_per_kwp": {"rmse_rel_pct": 5.0, "bias_abs": float("inf")},
    "performance_ratio_pct": {"rmse_rel_pct": float("inf"), "bias_abs": 3.0},
    "capacity_factor_pct": {"rmse_rel_pct": 2.0, "bias_abs": float("inf")},
    "battery_cycles": {"rmse_rel_pct": float("inf"), "bias_abs_rel_pct": 10.0},
    "annual_solar_kwh": {"rmse_rel_pct": 5.0, "bias_abs": float("inf")},
}


def rmse(predicted: Sequence[float], reference: Sequence[float]) -> float:
    """Root-mean-square error between predicted and reference sequences."""
    if len(predicted) != len(reference):
        raise ValueError("predicted and reference must have equal length")
    n = len(predicted)
    if n == 0:
        return 0.0
    return math.sqrt(sum((p - r) ** 2 for p, r in zip(predicted, reference)) / n)


def bias(predicted: Sequence[float], reference: Sequence[float]) -> float:
    """Mean signed error (predicted − reference)."""
    if len(predicted) != len(reference):
        raise ValueError("predicted and reference must have equal length")
    n = len(predicted)
    if n == 0:
        return 0.0
    return sum(p - r for p, r in zip(predicted, reference)) / n


def compare_scalar(
    predicted: float,
    reference: float,
    kpi_name: str,
) -> dict[str, float | bool]:
    """Compare a single scalar KPI value and return full metric dict."""
    abs_diff = predicted - reference
    rel_diff_pct = (abs_diff / reference * 100) if reference != 0 else float("inf")
    rmse_val = abs(abs_diff)  # scalar: RMSE == |error|
    bias_val = abs_diff

    threshold = _THRESHOLDS.get(kpi_name, {})
    pass_rmse = abs(rel_diff_pct) <= threshold.get("rmse_rel_pct", float("inf"))
    pass_bias = abs(bias_val) <= threshold.get("bias_abs", float("inf"))
    pass_bias_rel = (
        abs(rel_diff_pct) <= threshold.get("bias_abs_rel_pct", float("inf"))
    )

    return {
        "safaricharge": predicted,
        "reference": reference,
        "abs_diff": round(abs_diff, 4),
        "rel_diff_pct": round(rel_diff_pct, 2),
        "rmse": round(rmse_val, 4),
        "bias": round(bias_val, 4),
        "pass_threshold": bool(pass_rmse and pass_bias and pass_bias_rel),
    }
