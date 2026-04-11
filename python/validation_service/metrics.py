import math

from .models import EnergySeries, ComparisonMetrics


def compute_comparison_metrics(
    reference: EnergySeries,
    safaricharge: EnergySeries,
) -> ComparisonMetrics:
    """Compute bias and RMSE metrics between reference and SafariCharge.

    - Annual bias (kWh and %)
    - Annual RMSE (kWh)
    - Per-month absolute bias and absolute error (RMSE proxy)
    """

    all_months = sorted(set(reference.monthly_kwh) | set(safaricharge.monthly_kwh))
    monthly_bias: dict[str, float] = {}
    monthly_rmse: dict[str, float] = {}

    squared_errors: list[float] = []

    for month in all_months:
        ref_val = reference.monthly_kwh.get(month, 0.0)
        sc_val = safaricharge.monthly_kwh.get(month, 0.0)
        diff = sc_val - ref_val
        monthly_bias[month] = diff
        monthly_rmse[month] = abs(diff)
        squared_errors.append(diff**2)

    annual_bias = safaricharge.annual_kwh - reference.annual_kwh
    if reference.annual_kwh > 0:
        annual_bias_pct = (annual_bias / reference.annual_kwh) * 100.0
    else:
        annual_bias_pct = 0.0

    annual_rmse = math.sqrt(sum(squared_errors) / len(squared_errors)) if squared_errors else 0.0

    return ComparisonMetrics(
        annual_bias_kwh=annual_bias,
        annual_bias_pct=annual_bias_pct,
        annual_rmse_kwh=annual_rmse,
        monthly_bias_kwh=monthly_bias,
        monthly_rmse_kwh=monthly_rmse,
    )
