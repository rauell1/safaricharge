// Forecasting service client for SafariCharge dashboard
//
// Thin wrapper around the Python FastAPI forecasting backend defined in
// python/forecast_service. This client intentionally mirrors the
// Pydantic models so that wiring overlays is straightforward.

export interface TimeSeriesPoint {
  timestamp: string; // ISO 8601
  value: number;
}

export interface ForecastRequestBase {
  horizon_steps: number;
  step_minutes: number;
  history: TimeSeriesPoint[];
}

export interface PVForecastRequest extends ForecastRequestBase {
  latitude: number;
  longitude: number;
  dc_capacity_kwp: number;
}

export interface LoadForecastRequest extends ForecastRequestBase {
  include_ev_load: boolean;
}

export interface ForecastResponse {
  model_name: string;
  horizon_steps: number;
  step_minutes: number;
  start_timestamp: string; // ISO 8601
  values: number[];
  notes?: string;
  backend_version?: string;
}

const DEFAULT_BASE_URL = process.env.NEXT_PUBLIC_FORECAST_API_BASE ?? 'http://localhost:8000';

async function postJson<TReq, TRes>(path: string, body: TReq, baseUrl = DEFAULT_BASE_URL): Promise<TRes> {
  const url = `${baseUrl.replace(/\/$/, '')}${path}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Forecast API error ${res.status}`);
  }

  return (await res.json()) as TRes;
}

export async function fetchPvForecast(
  req: PVForecastRequest,
  baseUrl?: string,
): Promise<ForecastResponse> {
  return postJson<PVForecastRequest, ForecastResponse>('/forecast/pv', req, baseUrl);
}

export async function fetchLoadForecast(
  req: LoadForecastRequest,
  baseUrl?: string,
): Promise<ForecastResponse> {
  return postJson<LoadForecastRequest, ForecastResponse>('/forecast/load', req, baseUrl);
}
