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
import { z } from 'zod';
import { buildCorsHeaders } from '@/lib/security';
import { checkRateLimit } from '@/lib/rate-limiter';

const FORECAST_SERVICE_URL =
  process.env.FORECAST_SERVICE_URL ?? 'http://localhost:8001';

const minutePointSchema = z.object({
  timestamp: z.string().min(1),
  solarKW: z.number().nonnegative(),
  homeLoadKW: z.number().nonnegative(),
  ev1LoadKW: z.number().nonnegative(),
  ev2LoadKW: z.number().nonnegative(),
  temperature_c: z.number().optional(),
  cloud_cover_pct: z.number().min(0).max(100).optional(),
});

const bodySchema = z.object({
  minuteData: z.array(minutePointSchema).min(1).max(10_080), // max 1 week of minute data
  solarCapacityKw: z.number().positive().max(10_000),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  horizonHours: z.number().int().min(1).max(168).optional(), // max 1 week forecast
});

interface HistoricalPoint {
  timestamp: string;
  solar_kw: number;
  load_kw: number;
  temperature_c: number;
  cloud_cover_pct: number;
}

export async function POST(req: NextRequest) {
  const { headers } = buildCorsHeaders(req);

  const rl = checkRateLimit(req, 'api', headers);
  if (rl) return rl;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400, headers });
  }

  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid payload', details: parsed.error.flatten() },
      { status: 400, headers },
    );
  }
  const body = parsed.data;

  // Downsample to hourly by picking one point per hour (the last in each hour bucket)
  const hourlyMap = new Map<string, (typeof body.minuteData)[number]>();
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
        { status: upstream.status, headers },
      );
    }

    const data = await upstream.json();
    return NextResponse.json(data, { headers });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: 'Forecast service unavailable', detail: message },
      { status: 503, headers },
    );
  }
}
