from __future__ import annotations

from datetime import timedelta

from fastapi import FastAPI

from .models import (
    ForecastResponse,
    LoadForecastRequest,
    PVForecastRequest,
)

app = FastAPI(title="SafariCharge Forecasting Service")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/forecast/pv", response_model=ForecastResponse)
def forecast_pv(req: PVForecastRequest) -> ForecastResponse:
    """Return a simple PV power forecast stub.

    For now this uses a naive persistence + daily-shape approach so
    that the SafariCharge dashboard can be wired to real forecast
    endpoints while the proper RandomForest/XGBoost models are being
    developed.
    """

    history = sorted(req.history, key=lambda p: p.timestamp)
    last_point = history[-1]

    # Naive: keep the last value flat as a baseline forecast.
    # This is intentionally simple; future PRs will replace this with
    # a proper ML model that uses weather and seasonality.
    values: list[float] = [last_point.value for _ in range(req.horizon_steps)]

    start_ts = last_point.timestamp + timedelta(minutes=req.step_minutes)

    return ForecastResponse(
        model_name="naive-persistence-pv",
        horizon_steps=req.horizon_steps,
        step_minutes=req.step_minutes,
        start_timestamp=start_ts,
        values=values,
        notes="Stub persistence model – replace with RandomForest/XGBoost in a follow-up.",
        backend_version="0.1.0",
    )


@app.post("/forecast/load", response_model=ForecastResponse)
def forecast_load(req: LoadForecastRequest) -> ForecastResponse:
    """Return a simple load forecast stub.

    Uses naive persistence (last observed value) so the TypeScript
    client and dashboard overlays can be implemented independently of
    the final ML modelling choice.
    """

    history = sorted(req.history, key=lambda p: p.timestamp)
    last_point = history[-1]

    values: list[float] = [last_point.value for _ in range(req.horizon_steps)]

    from datetime import timedelta as _td

    start_ts = last_point.timestamp + _td(minutes=req.step_minutes)

    return ForecastResponse(
        model_name="naive-persistence-load",
        horizon_steps=req.horizon_steps,
        step_minutes=req.step_minutes,
        start_timestamp=start_ts,
        values=values,
        notes="Stub persistence model – replace with RandomForest/XGBoost in a follow-up.",
        backend_version="0.1.0",
    )
