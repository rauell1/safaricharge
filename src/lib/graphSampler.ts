/**
 * graphSampler.ts
 * Resample raw simulation records into a fixed 288-slot 5-minute grid
 * covering a 24-hour window (slots 0, 5, 10, … 1435 minutes).
 *
 * Each slot accumulates all records whose simulated minute falls within
 * [slotStart, slotStart + 5) and averages them. Empty slots are
 * interpolated from their neighbours so lines are always continuous.
 */
import type { GraphDataPoint } from '@/components/DailyEnergyGraph';
import type { MinuteDataPoint } from '@/stores/energySystemStore';

const SLOT_COUNT = 288; // 24h × 12 slots/h
const SLOT_MINUTES = 5;

/** Convert a MinuteDataPoint to a fractional hour 0‥24. */
export function minutePointToTimeOfDay(p: MinuteDataPoint): number {
  // MinuteDataPoint carries { hour, minute } fields
  return p.hour + (p.minute ?? 0) / 60;
}

/**
 * Resample an array of MinuteDataPoint records into exactly 288
 * equally-spaced GraphDataPoint buckets (one per 5-minute interval).
 *
 * Rules:
 * - Each record is placed into bucket floor(timeOfDayMinutes / 5).
 * - Multiple records in the same bucket are AVERAGED (handles fast simulation).
 * - Unfilled buckets use the last known value (forward-fill), falling back
 *   to the next known value (back-fill) for leading gaps.
 * - Returns exactly SLOT_COUNT points, so the chart always has a full
 *   24-hour x-axis regardless of how far the simulation has progressed.
 */
export function resampleTo5MinBuckets(
  minuteData: MinuteDataPoint[]
): GraphDataPoint[] {
  // Accumulators: sum and count per bucket
  type Acc = { solarSum: number; loadSum: number; socSum: number; count: number };
  const buckets: (Acc | null)[] = new Array(SLOT_COUNT).fill(null);

  for (const p of minuteData) {
    const tod = minutePointToTimeOfDay(p);
    if (tod < 0 || tod >= 24) continue;
    const slotIdx = Math.min(SLOT_COUNT - 1, Math.floor((tod * 60) / SLOT_MINUTES));
    const acc = buckets[slotIdx];
    const solar = p.solarKW ?? 0;
    // Total load = home + EV1 + EV2
    const load = (p.homeLoadKW ?? 0) + (p.ev1LoadKW ?? 0) + (p.ev2LoadKW ?? 0);
    const soc = p.batteryLevelPct ?? 0;
    if (acc === null) {
      buckets[slotIdx] = { solarSum: solar, loadSum: load, socSum: soc, count: 1 };
    } else {
      acc.solarSum += solar;
      acc.loadSum += load;
      acc.socSum += soc;
      acc.count += 1;
    }
  }

  const result: GraphDataPoint[] = new Array(SLOT_COUNT);
  let firstKnownIdx = -1;
  let lastSolar = 0;
  let lastLoad = 0;
  let lastBatSoc = 0;

  // Build points and forward-fill trailing gaps after first known point.
  for (let i = 0; i < SLOT_COUNT; i++) {
    const timeOfDay = (i * SLOT_MINUTES) / 60;
    const acc = buckets[i];
    if (acc) {
      lastSolar = acc.solarSum / acc.count;
      lastLoad = acc.loadSum / acc.count;
      lastBatSoc = acc.socSum / acc.count;
      if (firstKnownIdx === -1) firstKnownIdx = i;
      result[i] = { timeOfDay, solar: lastSolar, load: lastLoad, batSoc: lastBatSoc };
    } else if (firstKnownIdx !== -1) {
      result[i] = { timeOfDay, solar: lastSolar, load: lastLoad, batSoc: lastBatSoc };
    }
  }

  // Back-fill leading gaps (simulation hasn't reached those slots yet).
  if (firstKnownIdx === -1) {
    for (let i = 0; i < SLOT_COUNT; i++) {
      result[i] = { timeOfDay: (i * SLOT_MINUTES) / 60, solar: 0, load: 0, batSoc: 50 };
    }
    return result;
  }

  const firstKnown = result[firstKnownIdx];
  for (let i = 0; i < firstKnownIdx; i++) {
    result[i] = {
      timeOfDay: (i * SLOT_MINUTES) / 60,
      solar: firstKnown.solar,
      load: firstKnown.load,
      batSoc: firstKnown.batSoc,
    };
  }

  return result;
}

/**
 * Returns only the filled portion of the grid — useful for progressive
 * rendering during active simulation (don't plot future zeros).
 *
 * Returns buckets 0…lastFilledSlot where lastFilledSlot is the highest
 * slot index that received at least one real data point.
 */
export function resampleTo5MinBucketsProgressive(
  minuteData: MinuteDataPoint[]
): GraphDataPoint[] {
  const all = resampleTo5MinBuckets(minuteData);
  // Find the last slot that was populated by real data (not just forward-fill)
  let lastReal = 0;
  for (let i = 0; i < minuteData.length; i++) {
    const tod = minutePointToTimeOfDay(minuteData[i]);
    const slotIdx = Math.min(SLOT_COUNT - 1, Math.floor((tod * 60) / SLOT_MINUTES));
    if (slotIdx > lastReal) lastReal = slotIdx;
  }
  // Return slots 0..lastReal + a few extra for smooth trailing edge
  const endIdx = Math.min(SLOT_COUNT - 1, lastReal + 3);
  return all.slice(0, endIdx + 1);
}
