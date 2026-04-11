"""Tests for feature_engineering utilities."""

from __future__ import annotations

import math

import numpy as np
import pandas as pd
import pytest

from forecasting.models.feature_engineering import add_lag_features, add_time_features


def _make_df(n: int = 48) -> pd.DataFrame:
    """Create a simple DataFrame with a DatetimeIndex."""
    idx = pd.date_range("2026-01-05 00:00", periods=n, freq="h")
    df = pd.DataFrame({"value": np.arange(n, dtype=float)}, index=idx)
    return df


# ---------------------------------------------------------------------------
# add_time_features
# ---------------------------------------------------------------------------


def test_time_features_columns():
    df = add_time_features(_make_df())
    expected_cols = {
        "hour_of_day",
        "day_of_week",
        "month",
        "is_weekend",
        "is_peak_hour",
        "sin_hour",
        "cos_hour",
        "sin_month",
        "cos_month",
    }
    assert expected_cols.issubset(df.columns)


def test_sin_cos_hour_range():
    df = add_time_features(_make_df(48))
    assert (df["sin_hour"].between(-1, 1)).all()
    assert (df["cos_hour"].between(-1, 1)).all()


def test_sin_cos_hour_unit_circle():
    """sin² + cos² should equal 1 for every row."""
    df = add_time_features(_make_df(24))
    circle = df["sin_hour"] ** 2 + df["cos_hour"] ** 2
    np.testing.assert_allclose(circle.values, 1.0, atol=1e-5)


def test_sin_cos_month_unit_circle():
    df = add_time_features(_make_df(24))
    circle = df["sin_month"] ** 2 + df["cos_month"] ** 2
    np.testing.assert_allclose(circle.values, 1.0, atol=1e-5)


def test_is_peak_hour_range():
    """is_peak_hour should be 1 for hours 17-21 and 0 otherwise."""
    df = add_time_features(_make_df(24))
    for _, row in df.iterrows():
        h = int(row["hour_of_day"])
        expected = 1.0 if 17 <= h <= 21 else 0.0
        assert row["is_peak_hour"] == expected, f"hour={h}"


def test_is_weekend_correct():
    # 2026-01-05 is a Monday (dayofweek=0)
    df = add_time_features(_make_df(7 * 24))
    mondays = df[df["day_of_week"] == 0]
    assert (mondays["is_weekend"] == 0).all()
    saturdays = df[df["day_of_week"] == 5]
    if not saturdays.empty:
        assert (saturdays["is_weekend"] == 1).all()


# ---------------------------------------------------------------------------
# add_lag_features
# ---------------------------------------------------------------------------


def test_lag_columns_created():
    df = _make_df(50)
    df_lagged = add_lag_features(df, "value", [1, 24])
    assert "value_lag1" in df_lagged.columns
    assert "value_lag24" in df_lagged.columns


def test_lag1_nan_at_first_row():
    df = _make_df(10)
    df_lagged = add_lag_features(df, "value", [1])
    assert math.isnan(df_lagged["value_lag1"].iloc[0])


def test_lag24_nan_for_first_24_rows():
    df = _make_df(50)
    df_lagged = add_lag_features(df, "value", [24])
    assert df_lagged["value_lag24"].iloc[:24].isna().all()
    # Row 24 should have a valid value (lag back to row 0)
    assert not math.isnan(df_lagged["value_lag24"].iloc[24])


def test_lag_values_correct():
    df = _make_df(10)
    df_lagged = add_lag_features(df, "value", [1])
    # At row 3 the lag-1 should equal row 2's value
    assert df_lagged["value_lag1"].iloc[3] == df["value"].iloc[2]


def test_original_df_not_mutated():
    df = _make_df(30)
    cols_before = set(df.columns)
    add_lag_features(df, "value", [1, 5])
    assert set(df.columns) == cols_before
