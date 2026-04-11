"""Tests for load_forecaster."""

from __future__ import annotations

import math
from datetime import datetime, timedelta, timezone

import pytest

from forecasting.models.schemas import HistoricalPoint
from forecasting.models.load_forecaster import forecast_load


def _make_history(n: int = 168) -> list[HistoricalPoint]:
    """Return *n* synthetic hourly data points."""
    base = datetime(2026, 1, 5, 0, 0, 0, tzinfo=timezone.utc)
    points = []
    for i in range(n):
        ts = base + timedelta(hours=i)
        hour = ts.hour
        load = 3.0 + 2.0 * math.sin(math.pi * (hour - 8) / 12)
        load = max(1.0, load)
        points.append(
            HistoricalPoint(
                timestamp=ts.isoformat(),
                solar_kw=0.0,
                load_kw=load,
                temperature_c=22.0,
                cloud_cover_pct=0.0,
            )
        )
    return points


# ---------------------------------------------------------------------------


def test_forecast_returns_24_points():
    history = _make_history(168)
    points, _ = forecast_load(history)
    assert len(points) == 24


def test_forecast_returns_correct_horizon():
    history = _make_history(48)
    points, _ = forecast_load(history, horizon_hours=12)
    assert len(points) == 12


def test_quantile_ordering():
    """low <= mid <= high for every forecast point."""
    history = _make_history(168)
    points, _ = forecast_load(history)
    for p in points:
        assert p.load_confidence_low <= p.load_kw + 1e-6, (
            f"low={p.load_confidence_low} > mid={p.load_kw}"
        )
        assert p.load_kw <= p.load_confidence_high + 1e-6, (
            f"mid={p.load_kw} > high={p.load_confidence_high}"
        )


def test_forecast_values_non_negative():
    history = _make_history(48)
    points, _ = forecast_load(history)
    for p in points:
        assert p.load_kw >= 0.0
        assert p.load_confidence_low >= 0.0
        assert p.load_confidence_high >= 0.0


def test_model_info_keys():
    history = _make_history(48)
    _, info = forecast_load(history)
    assert "load_model" in info
    assert "quantiles" in info
    assert "training_samples" in info


def test_short_history_no_lag168():
    """With < 168 points, a dummy lag168 is used; model should still return results."""
    history = _make_history(48)
    points, _ = forecast_load(history)
    assert len(points) == 24


def test_minimum_history_24_points():
    history = _make_history(24)
    points, _ = forecast_load(history)
    assert len(points) == 24
