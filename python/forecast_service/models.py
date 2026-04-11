from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class HorizonUnit(str, Enum):
    HOURS = "hours"
    MINUTES = "minutes"


class TimeSeriesPoint(BaseModel):
    timestamp: datetime
    value: float


class ForecastRequestBase(BaseModel):
    """Common fields for PV and load forecast requests.

    The client supplies recent history and a desired horizon, the
    service returns a matching sequence of forecasts.
    """

    horizon_steps: int = Field(..., gt=0, le=7 * 24, description="Number of future steps to predict")
    step_minutes: int = Field(..., gt=0, le=24 * 60, description="Minutes per step (e.g. 60 for hourly)")
    history: List[TimeSeriesPoint] = Field(..., min_items=1, description="Recent measured values ordered by time")


class PVForecastRequest(ForecastRequestBase):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    dc_capacity_kwp: float = Field(..., gt=0)


class LoadForecastRequest(ForecastRequestBase):
    include_ev_load: bool = Field(True, description="If true, history/forecast represent total load including EVs")


class ForecastResponse(BaseModel):
    """Simple generic forecast response."""

    model_name: str
    horizon_steps: int
    step_minutes: int
    start_timestamp: datetime
    values: List[float]
    # Optional debug fields
    notes: Optional[str] = None
    backend_version: Optional[str] = None
