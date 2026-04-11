"""Feature engineering for the PV & load forecasting models.

All features are purely derived from the timestamp and the historical
observations — no external API calls required.
"""

from __future__ import annotations

import math
from datetime import datetime, timezone
from typing import Sequence

import numpy as np
import pandas as pd

from schemas import HistoricalPoint


# ── Helpers ─────────────────────────────────────────────────────────────────────

FEATURE_COLS = [
    "hour_sin", "hour_cos",
    "dow_sin", "dow_cos",
    "month_sin", "month_cos",
    "solar_lag1", "solar_lag3_mean",
    "load_lag1", "load_lag3_mean",
    "solar_capacity_kw",
    "clearsky_proxy",
    "temperature_c",
    "cloud_cover_pct",
]


def _cyclic(value: float, period: float) -> tuple[float, float]:
    """Encode a cyclic variable as (sin, cos) pair."""
    angle = 2 * math.pi * value / period
    return math.sin(angle), math.cos(angle)


def _clearsky_proxy(hour: int) -> float:
    """Simple clearsky irradiance proxy: half-sine between 06:00–18:00."""
    if 6 <= hour < 18:
        return math.sin(math.pi * (hour - 6) / 12)
    return 0.0


# ── History → DataFrame ──────────────────────────────────────────────────────────


def history_to_df(history: Sequence[HistoricalPoint]) -> pd.DataFrame:
    """Convert raw history list into a sorted hourly DataFrame."""
    rows = [
        {
            "timestamp": h.timestamp,
            "solar_kw": max(0.0, h.solar_kw),
            "load_kw": max(0.0, h.load_kw),
            "temperature_c": h.temperature_c,
            "cloud_cover_pct": h.cloud_cover_pct,
        }
        for h in history
    ]
    df = pd.DataFrame(rows)
    df["dt"] = pd.to_datetime(df["timestamp"], utc=True, errors="coerce")
    df = df.dropna(subset=["dt"]).sort_values("dt").reset_index(drop=True)
    df["hour"] = df["dt"].dt.hour
    df["dow"] = df["dt"].dt.dayofweek
    df["month"] = df["dt"].dt.month
    return df


def build_training_features(df: pd.DataFrame, solar_capacity_kw: float) -> pd.DataFrame:
    """Add all feature columns to a history DataFrame (in-place copy)."""
    out = df.copy()

    # Cyclic time features
    out[["hour_sin", "hour_cos"]] = out["hour"].apply(
        lambda h: pd.Series(_cyclic(h, 24))
    )
    out[["dow_sin", "dow_cos"]] = out["dow"].apply(
        lambda d: pd.Series(_cyclic(d, 7))
    )
    out[["month_sin", "month_cos"]] = out["month"].apply(
        lambda m: pd.Series(_cyclic(m - 1, 12))
    )

    # Autoregressive lags (fill NaN with 0 for first rows)
    out["solar_lag1"] = out["solar_kw"].shift(1).fillna(0)
    out["solar_lag3_mean"] = out["solar_kw"].shift(1).rolling(3, min_periods=1).mean().fillna(0)
    out["load_lag1"] = out["load_kw"].shift(1).fillna(0)
    out["load_lag3_mean"] = out["load_kw"].shift(1).rolling(3, min_periods=1).mean().fillna(0)

    out["solar_capacity_kw"] = solar_capacity_kw
    out["clearsky_proxy"] = out["hour"].apply(_clearsky_proxy)

    return out


def build_forecast_features(
    last_known: pd.Series,
    horizon_hours: int,
    solar_capacity_kw: float,
    last_solar: float,
    last_load: float,
    avg_temp: float,
) -> pd.DataFrame:
    """Build feature rows for future timesteps.

    Uses a simple recursive/assumed feature fill:
    - Time features come from the actual future timestamp
    - Lags are seeded from the last known observation and then from
      clearsky/average-load proxies (first-order Markov)
    """
    base_dt: pd.Timestamp = last_known["dt"]
    rows = []
    solar_history: list[float] = [last_solar]
    load_history: list[float] = [last_load]

    for i in range(1, horizon_hours + 1):
        fut_dt = base_dt + pd.Timedelta(hours=i)
        hour = fut_dt.hour
        dow = fut_dt.dayofweek
        month = fut_dt.month

        h_sin, h_cos = _cyclic(hour, 24)
        d_sin, d_cos = _cyclic(dow, 7)
        m_sin, m_cos = _cyclic(month - 1, 12)
        clearsky = _clearsky_proxy(hour)

        lag1_s = solar_history[-1]
        lag3_s = float(np.mean(solar_history[-3:]))
        lag1_l = load_history[-1]
        lag3_l = float(np.mean(load_history[-3:]))

        rows.append({
            "dt": fut_dt,
            "hour_sin": h_sin, "hour_cos": h_cos,
            "dow_sin": d_sin, "dow_cos": d_cos,
            "month_sin": m_sin, "month_cos": m_cos,
            "solar_lag1": lag1_s, "solar_lag3_mean": lag3_s,
            "load_lag1": lag1_l, "load_lag3_mean": lag3_l,
            "solar_capacity_kw": solar_capacity_kw,
            "clearsky_proxy": clearsky,
            "temperature_c": avg_temp,
            "cloud_cover_pct": 0.0,
        })
        # Seed next step's lags with clearsky-scaled solar + flat load
        solar_history.append(clearsky * solar_capacity_kw * 0.8)
        load_history.append(last_load)

    return pd.DataFrame(rows)
