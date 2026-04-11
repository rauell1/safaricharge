"""Seasonal sinusoidal fallback forecaster.

Used when < 48 h of history is available and GBR training is not reliable.
Produces a smooth solar half-sine profile scaled to solar_capacity_kw and a
flat load estimate derived from available history.
"""

from __future__ import annotations

import math
from datetime import timezone

import pandas as pd

from features import history_to_df
from schemas import HistoricalPoint, ForecastPoint

# Nairobi monthly average daily PSH (kWh/kWp ≈ h of peak sun)
_MONTHLY_PSH = [5.5, 5.8, 5.6, 5.4, 5.2, 5.1, 5.0, 5.3, 5.7, 5.8, 5.4, 5.3]


def run_fallback_forecast(
    history: list[HistoricalPoint],
    solar_capacity_kw: float,
    horizon_hours: int,
) -> list[ForecastPoint]:
    """Return a seasonal heuristic forecast (no ML training)."""
    df = history_to_df(history)
    avg_load = float(df["load_kw"].mean()) if len(df) > 0 else 1.5

    # Seed from the last available timestamp
    if len(df) > 0:
        last_dt: pd.Timestamp = df.iloc[-1]["dt"]
    else:
        last_dt = pd.Timestamp.utcnow()

    points: list[ForecastPoint] = []
    for i in range(1, horizon_hours + 1):
        fut_dt = last_dt + pd.Timedelta(hours=i)
        hour = fut_dt.hour
        month = fut_dt.month  # 1-indexed

        # Clearsky solar estimate
        psh = _MONTHLY_PSH[month - 1]
        if 6 <= hour < 18:
            solar_mean = solar_capacity_kw * psh / 12 * math.sin(math.pi * (hour - 6) / 12)
        else:
            solar_mean = 0.0
        solar_mean = max(0.0, solar_mean)
        band = solar_mean * 0.15  # ±15 % confidence band

        # Load: flat average with ±10 % band
        load_band = avg_load * 0.10

        ts = fut_dt.isoformat().replace("+00:00", "Z")
        if not ts.endswith("Z"):
            ts += "Z"

        points.append(ForecastPoint(
            timestamp=ts,
            solar_kw=round(solar_mean, 3),
            load_kw=round(avg_load, 3),
            solar_confidence_low=round(max(0.0, solar_mean - band), 3),
            solar_confidence_high=round(solar_mean + band, 3),
            load_confidence_low=round(max(0.0, avg_load - load_band), 3),
            load_confidence_high=round(avg_load + load_band, 3),
        ))
    return points
