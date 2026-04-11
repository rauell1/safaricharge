"""Solar generation forecaster using scikit-learn RandomForestRegressor.

Model features
--------------
hour_of_day, day_of_week, month, sin_hour, cos_hour, sin_month, cos_month,
cloud_cover_pct, temperature_c, solar_kw_lag1, solar_kw_lag24,
solar_capacity_kw

Confidence intervals
--------------------
10th and 90th percentile predictions are computed by aggregating individual
tree predictions across the forest.

Night clamping
--------------
Hours where pvlib clear-sky GHI is 0 are clamped to 0 kW.
"""

from __future__ import annotations

import warnings
from datetime import datetime, timedelta, timezone
from typing import Any

import numpy as np
import pandas as pd
import pvlib
from sklearn.ensemble import RandomForestRegressor

from .feature_engineering import add_lag_features, add_time_features
from .schemas import ForecastPoint, HistoricalPoint

SOLAR_FEATURES = [
    "hour_of_day",
    "day_of_week",
    "month",
    "sin_hour",
    "cos_hour",
    "sin_month",
    "cos_month",
    "cloud_cover_pct",
    "temperature_c",
    "solar_kw_lag1",
    "solar_kw_lag24",
    "solar_capacity_kw",
]


def _build_df(history: list[HistoricalPoint]) -> pd.DataFrame:
    records = [
        {
            "timestamp": pd.Timestamp(p.timestamp),
            "solar_kw": p.solar_kw,
            "load_kw": p.load_kw,
            "temperature_c": p.temperature_c,
            "cloud_cover_pct": p.cloud_cover_pct,
        }
        for p in history
    ]
    df = pd.DataFrame(records).set_index("timestamp")
    df.index = pd.DatetimeIndex(df.index)
    return df


def _is_night(
    timestamps: pd.DatetimeIndex,
    latitude: float,
    longitude: float,
) -> np.ndarray:
    """Return boolean array; True where clear-sky GHI == 0 (night)."""
    location = pvlib.location.Location(latitude=latitude, longitude=longitude)
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        cs = location.get_clearsky(timestamps, model="simplified_solis")
    return (cs["ghi"].values == 0).astype(bool)


def forecast_solar(
    history: list[HistoricalPoint],
    solar_capacity_kw: float,
    latitude: float,
    longitude: float,
    horizon_hours: int = 24,
) -> tuple[list[ForecastPoint], dict[str, Any]]:
    """Train a RandomForest on *history* and return *horizon_hours* solar forecasts.

    Returns
    -------
    forecast_points:
        List of ForecastPoint (solar fields populated; load fields are 0).
    model_info:
        Metadata dict.
    """
    df = _build_df(history)
    df = add_time_features(df)
    df = add_lag_features(df, "solar_kw", [1, 24])
    df["solar_capacity_kw"] = float(solar_capacity_kw)

    # Drop rows that lack all lag values (first 24 rows at most)
    required_lags = ["solar_kw_lag1", "solar_kw_lag24"]
    # With fewer than 26 history points lag24 can produce 0 valid training rows;
    # fall back to using only lag1 in that case.
    available_in_train = df.dropna(subset=required_lags)
    if len(available_in_train) == 0:
        required_lags = ["solar_kw_lag1"]
        # Fill the lag24 column with the series mean so the feature set stays fixed
        df["solar_kw_lag24"] = df["solar_kw"].mean()
        df_train = df.dropna(subset=required_lags)
    else:
        df_train = available_in_train

    X_train = df_train[SOLAR_FEATURES].values.astype(np.float32)
    y_train = df_train["solar_kw"].values.astype(np.float32)

    model = RandomForestRegressor(
        n_estimators=100,
        max_depth=12,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X_train, y_train)

    # --- Build future feature rows ---
    last_ts = df.index[-1]
    # Reconstruct a rolling series for lags
    solar_series = list(df["solar_kw"].values)
    future_rows: list[dict] = []
    future_timestamps: list[pd.Timestamp] = []

    for h in range(1, horizon_hours + 1):
        ts = last_ts + timedelta(hours=h)
        lag1 = solar_series[-1]
        lag24 = solar_series[-24] if len(solar_series) >= 24 else solar_series[0]

        # Carry forward the last known weather values
        last_row = df.iloc[-1]
        row = {
            "hour_of_day": float(ts.hour),
            "day_of_week": float(ts.dayofweek),
            "month": float(ts.month),
            "sin_hour": float(np.sin(2 * np.pi * ts.hour / 24)),
            "cos_hour": float(np.cos(2 * np.pi * ts.hour / 24)),
            "sin_month": float(np.sin(2 * np.pi * (ts.month - 1) / 12)),
            "cos_month": float(np.cos(2 * np.pi * (ts.month - 1) / 12)),
            "cloud_cover_pct": float(last_row.get("cloud_cover_pct", 0.0)),
            "temperature_c": float(last_row.get("temperature_c", 25.0)),
            "solar_kw_lag1": float(lag1),
            "solar_kw_lag24": float(lag24),
            "solar_capacity_kw": float(solar_capacity_kw),
        }
        future_rows.append(row)
        future_timestamps.append(ts)

        # Append a placeholder so next-step lags are available
        solar_series.append(0.0)  # will be replaced below after prediction

    X_future = np.array(
        [[row[f] for f in SOLAR_FEATURES] for row in future_rows],
        dtype=np.float32,
    )

    # Per-tree predictions for confidence intervals
    tree_preds = np.array(
        [tree.predict(X_future) for tree in model.estimators_]
    )  # shape: (n_trees, horizon)

    mid = np.clip(np.mean(tree_preds, axis=0), 0, None)
    low = np.clip(np.percentile(tree_preds, 10, axis=0), 0, None)
    high = np.clip(np.percentile(tree_preds, 90, axis=0), 0, None)

    # Replace solar_series placeholders with median predictions
    for i, val in enumerate(mid):
        solar_series[len(history) + i] = float(val)

    # Night clamping via pvlib
    future_dti = pd.DatetimeIndex(future_timestamps)
    night_mask = _is_night(future_dti, latitude, longitude)
    mid[night_mask] = 0.0
    low[night_mask] = 0.0
    high[night_mask] = 0.0
    # Clamp any floating-point noise to strict zero
    mid[mid < 1e-9] = 0.0
    low[low < 1e-9] = 0.0
    high[high < 1e-9] = 0.0

    points: list[ForecastPoint] = []
    for i, ts in enumerate(future_timestamps):
        points.append(
            ForecastPoint(
                timestamp=ts.isoformat(),
                solar_kw=float(mid[i]),
                load_kw=0.0,
                solar_confidence_low=float(low[i]),
                solar_confidence_high=float(high[i]),
                load_confidence_low=0.0,
                load_confidence_high=0.0,
            )
        )

    model_info: dict[str, Any] = {
        "solar_model": "RandomForestRegressor",
        "n_estimators": model.n_estimators,
        "training_samples": len(X_train),
        "features": SOLAR_FEATURES,
    }
    return points, model_info
