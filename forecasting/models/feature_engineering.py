"""Shared feature engineering utilities for solar and load forecasting models."""

from __future__ import annotations

import numpy as np
import pandas as pd


def add_time_features(df: pd.DataFrame) -> pd.DataFrame:
    """Add calendar and cyclic time features derived from the DataFrame index.

    The DataFrame *must* have a DatetimeTZAware or DatetimeTZNaive index.

    Added columns
    -------------
    hour_of_day   : 0-23
    day_of_week   : 0 (Mon) – 6 (Sun)
    month         : 1-12
    is_weekend    : 1 if Sat/Sun else 0
    is_peak_hour  : 1 if hour in [17, 18, 19, 20, 21] else 0
    sin_hour      : sin(2π * hour / 24)
    cos_hour      : cos(2π * hour / 24)
    sin_month     : sin(2π * (month-1) / 12)
    cos_month     : cos(2π * (month-1) / 12)
    """
    df = df.copy()
    idx = pd.DatetimeIndex(df.index)

    df["hour_of_day"] = idx.hour.astype(np.float32)
    df["day_of_week"] = idx.dayofweek.astype(np.float32)
    df["month"] = idx.month.astype(np.float32)
    df["is_weekend"] = (idx.dayofweek >= 5).astype(np.float32)
    df["is_peak_hour"] = idx.hour.isin(range(17, 22)).astype(np.float32)

    # Cyclic encodings
    df["sin_hour"] = np.sin(2 * np.pi * idx.hour / 24).astype(np.float32)
    df["cos_hour"] = np.cos(2 * np.pi * idx.hour / 24).astype(np.float32)
    df["sin_month"] = np.sin(2 * np.pi * (idx.month - 1) / 12).astype(np.float32)
    df["cos_month"] = np.cos(2 * np.pi * (idx.month - 1) / 12).astype(np.float32)

    return df


def add_lag_features(
    df: pd.DataFrame, col: str, lags: list[int]
) -> pd.DataFrame:
    """Add lag columns for *col* at the specified *lags* (in rows).

    Rows that cannot have a valid lag (the first ``max(lags)`` rows) will
    contain NaN – callers are responsible for dropping or imputing them.

    Parameters
    ----------
    df:
        Source DataFrame (not mutated; a copy is returned).
    col:
        Column name to lag.
    lags:
        List of integer row offsets, e.g. ``[1, 24, 168]``.
    """
    df = df.copy()
    for lag in lags:
        df[f"{col}_lag{lag}"] = df[col].shift(lag)
    return df
