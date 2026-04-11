"""
test_comparator.py
~~~~~~~~~~~~~~~~~~
Unit tests for the RMSE / bias / MAPE metrics in harness/comparator.py.

Runs with pytest from the validation/ directory:

    cd validation
    pytest tests/
"""

from __future__ import annotations

import math

import pytest

from harness.comparator import compute_metrics


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _hours(value: float, n: int = 8760) -> list[float]:
    """Create a constant-valued list of length *n*."""
    return [value] * n


# ---------------------------------------------------------------------------
# RMSE tests
# ---------------------------------------------------------------------------


class TestRMSE:
    def test_identical_arrays_give_zero_rmse(self) -> None:
        ref = _hours(5.0)
        result = compute_metrics(ref, ref)
        assert result.rmse_kwh == pytest.approx(0.0)

    def test_constant_offset_gives_correct_rmse(self) -> None:
        """predicted = actual + 1.0  →  RMSE = 1.0"""
        ref = _hours(5.0)
        pred = [v + 1.0 for v in ref]
        result = compute_metrics(pred, ref)
        assert result.rmse_kwh == pytest.approx(1.0, rel=1e-9)

    def test_rmse_with_known_values(self) -> None:
        ref = [0.0, 3.0, 4.0]
        pred = [0.0, 0.0, 0.0]
        # sqrt((0 + 9 + 16) / 3) = sqrt(25/3) ≈ 2.887
        result = compute_metrics(pred, ref)
        assert result.rmse_kwh == pytest.approx(math.sqrt(25 / 3), rel=1e-9)


# ---------------------------------------------------------------------------
# Bias tests
# ---------------------------------------------------------------------------


class TestBias:
    def test_positive_bias_when_overestimating(self) -> None:
        """predicted = actual + 1.0  →  bias = +1.0"""
        ref = _hours(5.0)
        pred = [v + 1.0 for v in ref]
        result = compute_metrics(pred, ref)
        assert result.bias_kwh == pytest.approx(1.0, rel=1e-9)

    def test_negative_bias_when_underestimating(self) -> None:
        ref = _hours(5.0)
        pred = [v - 2.0 for v in ref]
        result = compute_metrics(pred, ref)
        assert result.bias_kwh == pytest.approx(-2.0, rel=1e-9)

    def test_zero_bias_for_identical_arrays(self) -> None:
        ref = _hours(3.0)
        result = compute_metrics(ref, ref)
        assert result.bias_kwh == pytest.approx(0.0, abs=1e-12)


# ---------------------------------------------------------------------------
# MAPE tests
# ---------------------------------------------------------------------------


class TestMAPE:
    def test_mape_with_no_zeros_in_reference(self) -> None:
        """predicted = 2 * actual  → MAPE = 100%."""
        ref = _hours(4.0)
        pred = [v * 2 for v in ref]
        result = compute_metrics(pred, ref)
        assert result.mape_pct == pytest.approx(100.0, rel=1e-6)

    def test_mape_does_not_divide_by_zero(self) -> None:
        """Reference contains zeros – denominator clamped to 1.0."""
        ref = [0.0, 0.0, 4.0]
        pred = [1.0, 1.0, 4.0]
        # hour 0: |1-0|/max(0,1)=1.0; hour 1: 1.0; hour 2: 0.0  → mean=2/3 → 66.67%
        result = compute_metrics(pred, ref)
        assert result.mape_pct == pytest.approx((1.0 + 1.0 + 0.0) / 3 * 100, rel=1e-9)

    def test_mape_identical_arrays(self) -> None:
        ref = _hours(5.0)
        result = compute_metrics(ref, ref)
        assert result.mape_pct == pytest.approx(0.0, abs=1e-12)


# ---------------------------------------------------------------------------
# Annual totals
# ---------------------------------------------------------------------------


class TestAnnualTotals:
    def test_annual_reference_kwh(self) -> None:
        ref = _hours(2.0, n=8760)
        result = compute_metrics(ref, ref)
        assert result.annual_reference_kwh == pytest.approx(2.0 * 8760)

    def test_annual_engine_kwh(self) -> None:
        ref = _hours(2.0, n=8760)
        pred = _hours(3.0, n=8760)
        result = compute_metrics(pred, ref)
        assert result.annual_engine_kwh == pytest.approx(3.0 * 8760)

    def test_annual_engine_kwh_none_when_no_predicted(self) -> None:
        ref = _hours(2.0)
        result = compute_metrics([], ref)
        assert result.annual_engine_kwh is None


# ---------------------------------------------------------------------------
# Edge cases
# ---------------------------------------------------------------------------


class TestEdgeCases:
    def test_empty_reference_raises(self) -> None:
        with pytest.raises(ValueError, match="reference array must not be empty"):
            compute_metrics([1.0], [])

    def test_mismatched_lengths_raise(self) -> None:
        with pytest.raises(ValueError, match="same length"):
            compute_metrics([1.0, 2.0], [1.0])

    def test_empty_predicted_returns_nan_metrics(self) -> None:
        ref = _hours(5.0)
        result = compute_metrics([], ref)
        assert math.isnan(result.rmse_kwh)
        assert math.isnan(result.bias_kwh)
        assert math.isnan(result.mape_pct)

    def test_reference_tool_label_preserved(self) -> None:
        ref = _hours(1.0)
        result = compute_metrics(ref, ref, reference_tool="sam")
        assert result.reference_tool == "sam"
