import { NextRequest, NextResponse } from 'next/server';
import {
  getTelemetryHistory,
  reconcileTelemetryBatch,
  telemetryIngestPayloadSchema,
} from '@/lib/telemetry-ingest';

export async function GET(req: NextRequest) {
  const siteId = req.nextUrl.searchParams.get('siteId') || 'default-site';
  return NextResponse.json({ ok: true, siteId, reports: getTelemetryHistory(siteId) });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = telemetryIngestPayloadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid telemetry batch', details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const report = reconcileTelemetryBatch(parsed.data);
    return NextResponse.json({ ok: true, report }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }
}
