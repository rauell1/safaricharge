"""SafariCharge Forecasting Service — FastAPI application.

Endpoints
---------
GET  /health           Liveness probe.
POST /forecast         Full solar + load forecast.
POST /forecast/solar   Solar-only forecast.
POST /forecast/load    Load-only forecast.

All synchronous ML training is offloaded to a thread via asyncio.to_thread so
the event loop is not blocked.
"""

from __future__ import annotations

import asyncio
from typing import Any

from fastapi import FastAPI, HTTPException

from .models.load_forecaster import forecast_load
from .models.schemas import (
    ForecastPoint,
    ForecastRequest,
    ForecastResponse,
    LoadForecastRequest,
    SolarForecastRequest,
)
from .models.solar_forecaster import forecast_solar

app = FastAPI(
    title="SafariCharge Forecasting Service",
    description="PV and load demand forecasting using RandomForest / XGBoost.",
    version="1.0.0",
)

_MIN_HISTORY = 24


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "safaricharge-forecasting", "version": "1.0.0"}


# ---------------------------------------------------------------------------
# Full forecast  (solar + load)
# ---------------------------------------------------------------------------


@app.post("/forecast", response_model=ForecastResponse)
async def full_forecast(req: ForecastRequest) -> ForecastResponse:
    """Return a combined solar + load forecast for the next *horizon_hours* hours."""
    if len(req.history) < _MIN_HISTORY:
        raise HTTPException(
            status_code=422,
            detail=f"At least {_MIN_HISTORY} historical data points are required; "
            f"received {len(req.history)}.",
        )

    solar_points, solar_info = await asyncio.to_thread(
        forecast_solar,
        req.history,
        req.solar_capacity_kw,
        req.latitude,
        req.longitude,
        req.horizon_hours,
    )
    load_points, load_info = await asyncio.to_thread(
        forecast_load,
        req.history,
        req.horizon_hours,
    )

    # Merge: each index shares the same timestamp
    merged: list[ForecastPoint] = []
    for s, l in zip(solar_points, load_points):
        merged.append(
            ForecastPoint(
                timestamp=s.timestamp,
                solar_kw=s.solar_kw,
                load_kw=l.load_kw,
                solar_confidence_low=s.solar_confidence_low,
                solar_confidence_high=s.solar_confidence_high,
                load_confidence_low=l.load_confidence_low,
                load_confidence_high=l.load_confidence_high,
            )
        )

    model_info: dict[str, Any] = {**solar_info, **load_info}
    return ForecastResponse(forecast=merged, model_info=model_info)


# ---------------------------------------------------------------------------
# Solar-only forecast
# ---------------------------------------------------------------------------


@app.post("/forecast/solar", response_model=ForecastResponse)
async def solar_forecast(req: SolarForecastRequest) -> ForecastResponse:
    """Return a solar-only forecast."""
    if len(req.history) < _MIN_HISTORY:
        raise HTTPException(
            status_code=422,
            detail=f"At least {_MIN_HISTORY} historical data points are required; "
            f"received {len(req.history)}.",
        )

    points, model_info = await asyncio.to_thread(
        forecast_solar,
        req.history,
        req.solar_capacity_kw,
        req.latitude,
        req.longitude,
        req.horizon_hours,
    )
    return ForecastResponse(forecast=points, model_info=model_info)


# ---------------------------------------------------------------------------
# Load-only forecast
# ---------------------------------------------------------------------------


@app.post("/forecast/load", response_model=ForecastResponse)
async def load_forecast(req: LoadForecastRequest) -> ForecastResponse:
    """Return a load-only forecast."""
    if len(req.history) < _MIN_HISTORY:
        raise HTTPException(
            status_code=422,
            detail=f"At least {_MIN_HISTORY} historical data points are required; "
            f"received {len(req.history)}.",
        )

    points, model_info = await asyncio.to_thread(
        forecast_load,
        req.history,
        req.horizon_hours,
    )
    return ForecastResponse(forecast=points, model_info=model_info)
