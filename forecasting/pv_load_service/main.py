"""SafariCharge PV & Load Forecasting Service — FastAPI application.

This is the Python micro-service that the Next.js proxy at
`src/app/api/forecast/route.ts` forwards to when the dashboard
client requests a 24-hour-ahead forecast overlay.

Endpoints:
  GET  /health    Liveness check
  POST /forecast  24 h PV + load forecast with 80 % confidence bands
"""

from __future__ import annotations

import logging

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from model import MIN_HISTORY_POINTS, run_gbr_forecast
from fallback import run_fallback_forecast
from schemas import ForecastRequest, ForecastResponse

# ── App ────────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="SafariCharge Forecasting Service",
    description=(
        "24-hour-ahead PV generation and load forecasting using "
        "Gradient Boosted Regression with quantile confidence bands. "
        "Provides forecast overlays for the SafariCharge dashboard."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:8001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger = logging.getLogger("forecast")


# ── Routes ────────────────────────────────────────────────────────────────────


@app.get("/health", summary="Liveness check")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "safaricharge-forecast"}


@app.post(
    "/forecast",
    response_model=ForecastResponse,
    summary="Generate 24 h PV + load forecast with confidence bands",
)
def forecast(req: ForecastRequest) -> ForecastResponse:
    """Train GBR models on history and return hourly forecast points.

    Falls back to a seasonal sinusoidal heuristic when insufficient
    historical data is available (< 48 hourly points).
    """
    n = len(req.history)
    logger.info(
        "Forecast request: %d history points, capacity=%.1f kWp, horizon=%d h",
        n, req.solar_capacity_kw, req.horizon_hours,
    )

    try:
        if n >= MIN_HISTORY_POINTS:
            points = run_gbr_forecast(
                history=req.history,
                solar_capacity_kw=req.solar_capacity_kw,
                horizon_hours=req.horizon_hours,
            )
            model_used = "gbr"
        else:
            logger.warning(
                "Insufficient history (%d < %d points) — using seasonal fallback",
                n, MIN_HISTORY_POINTS,
            )
            points = run_fallback_forecast(
                history=req.history,
                solar_capacity_kw=req.solar_capacity_kw,
                horizon_hours=req.horizon_hours,
            )
            model_used = "fallback"
    except Exception as exc:
        logger.exception("Forecasting error")
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return ForecastResponse(
        forecast=points,
        model_used=model_used,
        trained_on_n_points=n,
    )
