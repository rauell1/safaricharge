"""Load demand forecaster using XGBoost quantile regression.

Three models are trained simultaneously:
- q=0.10  → lower confidence bound
- q=0.50  → median forecast
- q=0.90  → upper confidence bound

Model features
--------------
hour_of_day, day_of_week, month, is_weekend, is_peak_hour,
sin_hour, cos_hour, sin_month, cos_month,
load_kw_lag1, load_kw_lag24, load_kw_lag168
"""

from __future__ import annotations

from datetime import timedelta
from typing import Any

import numpy as np
import pandas as pd
import xgboost as xgb

from .feature_engineering import add_lag_features, add_time_features
from .schemas import ForecastPoint, HistoricalPoint

LOAD_FEATURES = [
    "hour_of_day",
    "day_of_week",
    "month",
    "is_weekend",
    "is_peak_hour",
    "sin_hour",
    "cos_hour",
    "sin_month",
    "cos_month",
    "load_kw_lag1",
    "load_kw_lag24",
    "load_kw_lag168",
]


def _build_df(history: list[HistoricalPoint]) -> pd.DataFrame:
    records = [
        {
            "timestamp": pd.Timestamp(p.timestamp),
            "load_kw": p.load_kw,
        }
        for p in history
    ]
    df = pd.DataFrame(records).set_index("timestamp")
    df.index = pd.DatetimeIndex(df.index)
    return df


def _train_quantile_model(
    X: np.ndarray, y: np.ndarray, quantile: float
) -> xgb.XGBRegressor:
    model = xgb.XGBRegressor(
        n_estimators=200,
        max_depth=6,
        learning_rate=0.05,
        objective="reg:quantileerror",
        quantile_alpha=quantile,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42,
        n_jobs=-1,
        verbosity=0,
    )
    model.fit(X, y)
    return model


def forecast_load(
    history: list[HistoricalPoint],
    horizon_hours: int = 24,
) -> tuple[list[ForecastPoint], dict[str, Any]]:
    """Train XGBoost quantile models on *history* and return load forecasts.

    Returns
    -------
    forecast_points:
        ForecastPoint list (load fields populated; solar fields are 0).
    model_info:
        Metadata dict.
    """
    df = _build_df(history)
    df = add_time_features(df)

    # lag168 (7 days) requires at least 168 rows; fall back to lag1 if too short
    available_lags = [1, 24]
    if len(df) >= 168:
        available_lags.append(168)

    df = add_lag_features(df, "load_kw", available_lags)

    required_lags = ["load_kw_lag1", "load_kw_lag24"]
    if 168 in available_lags:
        required_lags.append("load_kw_lag168")
    else:
        # Provide a dummy column filled with the mean so feature count stays fixed
        df["load_kw_lag168"] = df["load_kw"].mean()

    # With fewer than 26 history points lag24 can produce 0 valid training rows;
    # fall back to using only lag1 in that case.
    available_in_train = df.dropna(subset=required_lags)
    if len(available_in_train) == 0:
        required_lags = ["load_kw_lag1"]
        df["load_kw_lag24"] = df["load_kw"].mean()
        df_train = df.dropna(subset=required_lags)
    else:
        df_train = available_in_train

    X_train = df_train[LOAD_FEATURES].values.astype(np.float32)
    y_train = df_train["load_kw"].values.astype(np.float32)

    model_low = _train_quantile_model(X_train, y_train, 0.10)
    model_mid = _train_quantile_model(X_train, y_train, 0.50)
    model_high = _train_quantile_model(X_train, y_train, 0.90)

    # --- Build future feature rows ---
    last_ts = df.index[-1]
    load_series = list(df["load_kw"].values)
    future_rows: list[dict] = []
    future_timestamps: list[pd.Timestamp] = []

    for h in range(1, horizon_hours + 1):
        ts = last_ts + timedelta(hours=h)
        lag1 = load_series[-1]
        lag24 = load_series[-24] if len(load_series) >= 24 else load_series[0]
        lag168 = load_series[-168] if len(load_series) >= 168 else load_series[0]

        row = {
            "hour_of_day": float(ts.hour),
            "day_of_week": float(ts.dayofweek),
            "month": float(ts.month),
            "is_weekend": float(int(ts.dayofweek >= 5)),
            "is_peak_hour": float(int(ts.hour in range(17, 22))),
            "sin_hour": float(np.sin(2 * np.pi * ts.hour / 24)),
            "cos_hour": float(np.cos(2 * np.pi * ts.hour / 24)),
            "sin_month": float(np.sin(2 * np.pi * (ts.month - 1) / 12)),
            "cos_month": float(np.cos(2 * np.pi * (ts.month - 1) / 12)),
            "load_kw_lag1": float(lag1),
            "load_kw_lag24": float(lag24),
            "load_kw_lag168": float(lag168),
        }
        future_rows.append(row)
        future_timestamps.append(ts)
        load_series.append(0.0)  # placeholder; overwritten below

    X_future = np.array(
        [[row[f] for f in LOAD_FEATURES] for row in future_rows],
        dtype=np.float32,
    )

    pred_low = np.clip(model_low.predict(X_future), 0, None)
    pred_mid = np.clip(model_mid.predict(X_future), 0, None)
    pred_high = np.clip(model_high.predict(X_future), 0, None)

    # Enforce monotone ordering — independent quantile models can occasionally cross
    pred_low = np.minimum(pred_low, pred_mid)
    pred_high = np.maximum(pred_high, pred_mid)

    # Replace placeholders with median predictions for next-step lags
    for i, val in enumerate(pred_mid):
        load_series[len(history) + i] = float(val)

    points: list[ForecastPoint] = []
    for i, ts in enumerate(future_timestamps):
        points.append(
            ForecastPoint(
                timestamp=ts.isoformat(),
                solar_kw=0.0,
                load_kw=float(pred_mid[i]),
                solar_confidence_low=0.0,
                solar_confidence_high=0.0,
                load_confidence_low=float(pred_low[i]),
                load_confidence_high=float(pred_high[i]),
            )
        )

    model_info: dict[str, Any] = {
        "load_model": "XGBRegressor (quantile)",
        "quantiles": [0.10, 0.50, 0.90],
        "n_estimators": 200,
        "training_samples": len(X_train),
        "features": LOAD_FEATURES,
    }
    return points, model_info
