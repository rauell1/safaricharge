"""Tests for solar_forecaster."""

from __future__ import annotations

import math
from datetime import datetime, timezone

import pytest

from forecasting.models.schemas import HistoricalPoint
from forecasting.models.solar_forecaster import forecast_solar


def _make_history(n: int = 168) -> list[HistoricalPoint]:
    """Return *n* synthetic hourly data points starting 2026-01-05T00:00 UTC."""
    points = []
    base = datetime(2026, 1, 5, 0, 0, 0, tzinfo=timezone.utc)
    from datetime import timedelta

    for i in range(n):
        ts = base + timedelta(hours=i)
        hour = ts.hour
        # Simple synthetic solar profile: 0 at night, peak at noon
        solar = max(0.0, 8.0 * math.sin(math.pi * (hour - 6) / 12)) if 6 <= hour <= 18 else 0.0
        load = 3.0 + 2.0 * math.sin(math.pi * (hour - 8) / 12)
        load = max(1.0, load)
        points.append(
            HistoricalPoint(
                timestamp=ts.isoformat(),
                solar_kw=solar,
                load_kw=load,
                temperature_c=22.0 + 5.0 * math.sin(math.pi * hour / 24),
                cloud_cover_pct=10.0,
            )
        )
    return points


# ---------------------------------------------------------------------------


def test_forecast_returns_24_points():
    history = _make_history(168)
    points, info = forecast_solar(history, solar_capacity_kw=10.0, latitude=-1.2921, longitude=36.8219)
    assert len(points) == 24


def test_forecast_returns_correct_horizon():
    history = _make_history(48)
    points, _ = forecast_solar(
        history, solar_capacity_kw=10.0, latitude=-1.2921, longitude=36.8219, horizon_hours=12
    )
    assert len(points) == 12


def test_confidence_ordering():
    """solar_confidence_low <= solar_kw <= solar_confidence_high for all daytime points."""
    history = _make_history(168)
    points, _ = forecast_solar(history, solar_capacity_kw=10.0, latitude=-1.2921, longitude=36.8219)
    for p in points:
        assert p.solar_confidence_low <= p.solar_kw + 1e-6, (
            f"low={p.solar_confidence_low} > mid={p.solar_kw}"
        )
        assert p.solar_kw <= p.solar_confidence_high + 1e-6, (
            f"mid={p.solar_kw} > high={p.solar_confidence_high}"
        )


def test_night_hours_clamped_to_zero():
    """Forecast for hours 0-4 and 19-23 should be near-zero (night in Nairobi)."""
    history = _make_history(168)
    points, _ = forecast_solar(history, solar_capacity_kw=10.0, latitude=-1.2921, longitude=36.8219)
    from datetime import datetime

    for p in points:
        ts = datetime.fromisoformat(p.timestamp)
        hour = ts.hour
        if hour < 5 or hour >= 19:
            assert p.solar_kw < 1e-6, f"Expected ~0 at hour {hour}, got {p.solar_kw}"
            assert p.solar_confidence_low < 1e-6
            assert p.solar_confidence_high < 1e-6


def test_forecast_values_non_negative():
    history = _make_history(48)
    points, _ = forecast_solar(history, solar_capacity_kw=5.0, latitude=-1.2921, longitude=36.8219)
    for p in points:
        assert p.solar_kw >= 0.0
        assert p.solar_confidence_low >= 0.0
        assert p.solar_confidence_high >= 0.0


def test_model_info_keys():
    history = _make_history(48)
    _, info = forecast_solar(history, solar_capacity_kw=10.0, latitude=-1.2921, longitude=36.8219)
    assert "solar_model" in info
    assert "training_samples" in info
    assert "features" in info


def test_minimum_history_24_points():
    """forecast_solar should work with exactly 24 history points."""
    history = _make_history(24)
    points, _ = forecast_solar(history, solar_capacity_kw=10.0, latitude=-1.2921, longitude=36.8219)
    assert len(points) == 24
