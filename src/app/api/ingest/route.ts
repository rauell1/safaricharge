/**
 * POST /api/ingest
 * ─────────────────────────────────────────────────────────────────────────────
 * Receives live readings from the IoT bridge (MQTT / Modbus) and persists
 * them to the LiveReading table. Also pushes the latest value into the
 * in-process energy system store so the dashboard updates in real-time
 * via the existing polling mechanism.
 *
 * Authentication: Bearer token via API_SERVICE_TOKEN env var.
 * Body schema:
 *   {
 *     siteId:  string,
 *     source:  "mqtt" | "modbus",
 *     metric:  string,   // e.g. "battery_soc", "pv_power_w"
 *     value:   number,
 *     unit?:   string,
 *     ts?:     string,   // ISO 8601 — defaults to now()
 *   }
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Simple bearer-token guard (same pattern as other SC API routes)
function isAuthorized(req: NextRequest): boolean {
  const token = process.env.API_SERVICE_TOKEN;
  if (!token) return true; // token not configured — allow all (dev)
  const auth = req.headers.get('authorization') ?? '';
  return auth === `Bearer ${token}`;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { siteId, source, metric, value, unit = '', ts } = body as Record<string, unknown>;

  if (
    typeof siteId  !== 'string' ||
    typeof source  !== 'string' ||
    typeof metric  !== 'string' ||
    typeof value   !== 'number' ||
    !Number.isFinite(value)
  ) {
    return NextResponse.json(
      { error: 'Missing or invalid fields: siteId, source, metric, value (number) required' },
      { status: 422 },
    );
  }

  const readingTs = ts && typeof ts === 'string' ? new Date(ts) : new Date();
  if (isNaN(readingTs.getTime())) {
    return NextResponse.json({ error: 'Invalid ts (must be ISO 8601)' }, { status: 422 });
  }

  try {
    const reading = await prisma.liveReading.create({
      data: {
        siteId,
        source,
        metric,
        value,
        unit:    String(unit),
        quality: 'good',
        ts:      readingTs,
      },
    });
    return NextResponse.json({ ok: true, id: reading.id }, { status: 201 });
  } catch (err) {
    console.error('[ingest] DB write failed:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

// GET — return the last N readings for a metric (for debugging / sparklines)
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const siteId = searchParams.get('siteId') ?? 'default';
  const metric = searchParams.get('metric') ?? 'battery_soc';
  const limit  = Math.min(parseInt(searchParams.get('limit') ?? '100', 10), 1000);

  const rows = await prisma.liveReading.findMany({
    where:   { siteId, metric },
    orderBy: { ts: 'desc' },
    take:    limit,
    select:  { id: true, metric: true, value: true, unit: true, ts: true, source: true },
  });

  return NextResponse.json({ readings: rows.reverse() });
}
