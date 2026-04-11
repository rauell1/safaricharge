/**
 * POST /api/forecast
 *
 * Next.js proxy that:
 * 1. Transforms MinuteDataPoint[] from the client into the HistoricalPoint[]
 *    shape expected by the Python forecasting service.
 * 2. Forwards the request to FORECAST_SERVICE_URL (default http://localhost:8001).
 * 3. Returns the ForecastResponse or a 503 if the service is unavailable.
 */

import { NextRequest, NextResponse } from 'next/server';

const FORECAST_SERVICE_URL =
  process.env.FORECAST_SERVICE_URL ?? 'http://localhost:8001';

interface ClientMinutePoint {
  timestamp: string;
  solarKW: number;
  homeLoadKW: number;
  ev1LoadKW: number;
  ev2LoadKW: number;
  temperature_c?: number;
  cloud_cover_pct?: number;
}

interface HistoricalPoint {
  timestamp: string;
  solar_kw: number;
  load_kw: number;
  temperature_c: number;
  cloud_cover_pct: number;
}

interface ForecastRequestBody {
  minuteData: ClientMinutePoint[];
  solarCapacityKw: number;
  latitude?: number;
  longitude?: number;
  horizonHours?: number;
}

export async function POST(req: NextRequest) {
  let body: ForecastRequestBody;
  try {
    body = (await req.json()) as ForecastRequestBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.minuteData || !Array.isArray(body.minuteData)) {
    return NextResponse.json({ error: 'minuteData array is required' }, { status: 400 });
  }

  if (typeof body.solarCapacityKw !== 'number' || body.solarCapacityKw <= 0) {
    return NextResponse.json({ error: 'solarCapacityKw must be a positive number' }, { status: 400 });
  }

  // Downsample to hourly by picking one point per hour (the last in each hour bucket)
  const hourlyMap = new Map<string, ClientMinutePoint>();
  for (const pt of body.minuteData) {
    const ts = new Date(pt.timestamp);
    if (isNaN(ts.getTime())) continue;
    const key = `${ts.getUTCFullYear()}-${ts.getUTCMonth()}-${ts.getUTCDate()}-${ts.getUTCHours()}`;
    hourlyMap.set(key, pt);
  }

  const history: HistoricalPoint[] = Array.from(hourlyMap.values()).map((pt) => ({
    timestamp: pt.timestamp,
    solar_kw: pt.solarKW ?? 0,
    load_kw: (pt.homeLoadKW ?? 0) + (pt.ev1LoadKW ?? 0) + (pt.ev2LoadKW ?? 0),
    temperature_c: pt.temperature_c ?? 25,
    cloud_cover_pct: pt.cloud_cover_pct ?? 0,
  }));

  const servicePayload = {
    latitude: body.latitude ?? -1.2921,
    longitude: body.longitude ?? 36.8219,
    solar_capacity_kw: body.solarCapacityKw,
    history,
    horizon_hours: body.horizonHours ?? 24,
  };

  try {
    const upstream = await fetch(`${FORECAST_SERVICE_URL.replace(/\/$/, '')}/forecast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(servicePayload),
      signal: AbortSignal.timeout(30_000),
    });

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => '');
      return NextResponse.json(
        { error: `Forecast service error: ${upstream.status}`, detail: text },
        { status: upstream.status },
      );
    }

    const data = await upstream.json();
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    // Network / connection errors → 503 so the client can degrade gracefully
    return NextResponse.json(
      { error: 'Forecast service unavailable', detail: message },
      { status: 503 },
    );
  }
}
