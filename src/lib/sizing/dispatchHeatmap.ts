/**
 * Transforms SimulationResults monthly/hourly seasonal dispatch arrays into a
 * 12x24 interactive Dispatch Heatmap matrix (Month × Hour of Day).
 */
import type { SimulationResults } from './types';

export type DispatchHeatmapMetric = 'solarAcKw' | 'gridImportKw' | 'socPct' | 'curtailedKw';

export interface DispatchHeatmapGrid {
  metric: DispatchHeatmapMetric;
  label: string;
  unit: string;
  min: number;
  max: number;
  rows: Array<{
    monthIndex: number;
    monthName: string;
    cells: Array<{
      hour: number;
      value: number;
    }>;
  }>;
}

const METRIC_META: Record<DispatchHeatmapMetric, { label: string; unit: string }> = {
  solarAcKw: { label: 'Solar AC Generation', unit: 'kW' },
  gridImportKw: { label: 'Grid Import', unit: 'kW' },
  socPct: { label: 'Battery State of Charge', unit: '%' },
  curtailedKw: { label: 'Curtailed Solar', unit: 'kW' },
};

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function buildDispatchHeatmap(
  results: SimulationResults,
  metric: DispatchHeatmapMetric
): DispatchHeatmapGrid {
  const monthly = results.monthlyDispatchSummary;
  const fallbackHours = results.hourlyProfile;

  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;

  const rows = MONTH_ABBR.map((monthName, monthIndex) => {
    const monthEntry = monthly?.[monthIndex];
    const cells = Array.from({ length: 24 }, (_, hour) => {
      let value = 0;
      if (monthEntry) {
        const h = monthEntry.hourly[hour];
        if (metric === 'solarAcKw') value = h?.solarAcKw ?? 0;
        else if (metric === 'gridImportKw') value = h?.gridImportKw ?? 0;
        else if (metric === 'socPct') value = (h?.socFrac ?? 0) * 100;
        else value = h?.curtailedKw ?? 0;
      } else {
        const h = fallbackHours[hour];
        if (metric === 'solarAcKw') value = h?.solarKW ?? 0;
        else if (metric === 'gridImportKw') value = h?.gridImportKW ?? 0;
        else if (metric === 'socPct') value = h?.batterySoCAfter ?? 0;
        else value = Math.max(0, h?.gridExportKW ?? 0);
      }
      const rounded = Math.round(value * 100) / 100;
      min = Math.min(min, rounded);
      max = Math.max(max, rounded);
      return { hour, value: rounded };
    });

    return { monthIndex, monthName, cells };
  });

  return {
    metric,
    ...METRIC_META[metric],
    min: Number.isFinite(min) ? min : 0,
    max: Number.isFinite(max) ? max : 0,
    rows,
  };
}
