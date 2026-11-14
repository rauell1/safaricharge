import { NextResponse } from 'next/server';
import { getCachedKplcSnapshot, syncLiveKplcTariffs } from '@/lib/kplc-sync';
import { KPLC_OCT_2026_SURCHARGES } from '@/lib/tariff-config';

export async function GET() {
  const snapshot = getCachedKplcSnapshot();
  return NextResponse.json({
    ok: true,
    source: snapshot.monthlyUpdated ? 'live-cache' : 'oct-2026-fallback',
    fallbackDefaults: KPLC_OCT_2026_SURCHARGES,
    snapshot,
  });
}

export async function POST() {
  const result = await syncLiveKplcTariffs();
  return NextResponse.json({
    ok: true,
    source: result.source,
    errorCode: result.errorCode ?? null,
    snapshot: result.snapshot,
  });
}
