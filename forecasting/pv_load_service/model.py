"""Gradient-boosted regressor models for PV and load forecasting.

Trains three GBR models per target (solar/load):
  1. Mean prediction (loss='squared_error')
  2. Lower quantile (alpha=0.1)
  3. Upper quantile (alpha=0.9)

This gives an 80 % prediction interval for each forecast point.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Sequence

import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor

from features import FEATURE_COLS, build_training_features, build_forecast_features, history_to_df
from schemas import HistoricalPoint, ForecastPoint

MIN_HISTORY_POINTS = 48  # require at least 48 h of hourly data to train


@dataclass
class _TargetModels:
    mean: GradientBoostingRegressor
    low: GradientBoostingRegressor
    high: GradientBoostingRegressor


def _make_gbr(alpha: float | None = None) -> GradientBoostingRegressor:
    """Return a GBR configured for mean or quantile regression."""
    if alpha is None:
        return GradientBoostingRegressor(
            n_estimators=120,
            max_depth=4,
            learning_rate=0.08,
            subsample=0.85,
            min_samples_leaf=3,
            random_state=42,
        )
    return GradientBoostingRegressor(
        n_estimators=120,
        max_depth=4,
        learning_rate=0.08,
        subsample=0.85,
        min_samples_leaf=3,
        loss="quantile",
        alpha=alpha,
        random_state=42,
    )


def _train(X: np.ndarray, y: np.ndarray) -> _TargetModels:
    m_mean = _make_gbr()
    m_low = _make_gbr(alpha=0.1)
    m_high = _make_gbr(alpha=0.9)
    m_mean.fit(X, y)
    m_low.fit(X, y)
    m_high.fit(X, y)
    return _TargetModels(mean=m_mean, low=m_low, high=m_high)


def run_gbr_forecast(
    history: Sequence[HistoricalPoint],
    solar_capacity_kw: float,
    horizon_hours: int,
) -> list[ForecastPoint]:
    """Train GBR models on history and return `horizon_hours` forecast points."""
    df_raw = history_to_df(history)
    df = build_training_features(df_raw, solar_capacity_kw)
    df = df.dropna(subset=FEATURE_COLS)

    X = df[FEATURE_COLS].values.astype(float)
    y_solar = df["solar_kw"].values.astype(float)
    y_load = df["load_kw"].values.astype(float)

    solar_models = _train(X, y_solar)
    load_models = _train(X, y_load)

    # Build future feature rows
    last_row = df.iloc[-1]
    avg_temp = float(df["temperature_c"].mean())
    last_solar = float(last_row["solar_kw"])
    last_load = float(last_row["load_kw"])

    fut_df = build_forecast_features(
        last_known=last_row,
        horizon_hours=horizon_hours,
        solar_capacity_kw=solar_capacity_kw,
        last_solar=last_solar,
        last_load=last_load,
        avg_temp=avg_temp,
    )
    X_fut = fut_df[FEATURE_COLS].values.astype(float)

    # Predict — clamp negatives
    s_mean = np.clip(solar_models.mean.predict(X_fut), 0, solar_capacity_kw)
    s_low = np.clip(solar_models.low.predict(X_fut), 0, solar_capacity_kw)
    s_high = np.clip(solar_models.high.predict(X_fut), 0, solar_capacity_kw)
    l_mean = np.clip(load_models.mean.predict(X_fut), 0, None)
    l_low = np.clip(load_models.low.predict(X_fut), 0, None)
    l_high = np.clip(load_models.high.predict(X_fut), 0, None)

    # Ensure low <= mean <= high
    s_low = np.minimum(s_low, s_mean)
    s_high = np.maximum(s_high, s_mean)
    l_low = np.minimum(l_low, l_mean)
    l_high = np.maximum(l_high, l_mean)

    points: list[ForecastPoint] = []
    for i in range(horizon_hours):
        ts = fut_df.iloc[i]["dt"].isoformat().replace("+00:00", "Z")
        if not ts.endswith("Z"):
            ts += "Z"
        points.append(ForecastPoint(
            timestamp=ts,
            solar_kw=round(float(s_mean[i]), 3),
            load_kw=round(float(l_mean[i]), 3),
            solar_confidence_low=round(float(s_low[i]), 3),
            solar_confidence_high=round(float(s_high[i]), 3),
            load_confidence_low=round(float(l_low[i]), 3),
            load_confidence_high=round(float(l_high[i]), 3),
        ))
    return points
