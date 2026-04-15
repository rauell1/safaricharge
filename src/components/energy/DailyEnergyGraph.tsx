'use client';

import React, { useCallback } from 'react';
import { Download, TrendingUp, TrendingDown } from 'lucide-react';
import { useForecastStore, type ForecastPoint } from '@/stores/forecastStore';
import type { MinuteDataPoint } from '@/stores/energySystemStore';

const getCssVar = (name: string, fallback?: string) => {
  if (typeof window !== 'undefined') {
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    if (value) return value;
  }
  return fallback ?? `var(${name})`;
};

const buildSmoothPath = (points: { x: number; y: number }[], tension = 0.4): string => {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x.toFixed(2)},${points[0].y.toFixed(2)}`;
  if (points.length === 2) {
    return `M ${points[0].x.toFixed(2)},${points[0].y.toFixed(2)} L ${points[1].x.toFixed(2)},${points[1].y.toFixed(2)}`;
  }
  const d: string[] = [`M ${points[0].x.toFixed(2)},${points[0].y.toFixed(2)}`];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const cp1x = p1.x + (p2.x - p0.x) * tension / 3;
    const cp1y = p1.y + (p2.y - p0.y) * tension / 3;
    const cp2x = p2.x - (p3.x - p1.x) * tension / 3;
    const cp2y = p2.y - (p3.y - p1.y) * tension / 3;
    d.push(`C ${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`);
  }
  return d.join(' ');
};

export interface GraphDataPoint {
  timeOfDay: number;
  solar: number;
  load: number;
  batSoc: number;
  expectedOutput?: number;
}

const MIN_MAX_KW = 10;

const computeMaxKw = (data: GraphDataPoint[]): number => {
  if (!data || data.length === 0) return 60;
  const maxVal = data.reduce((max, point) => Math.max(max, point.load, point.solar, point.expectedOutput ?? 0), 0);
  const padded = Math.max(MIN_MAX_KW, maxVal * 1.1);
  const exponent = Math.pow(10, Math.floor(Math.log10(padded)));
  const normalized = padded / exponent;
  let nice = 10;
  if (normalized <= 1.5) nice = 1.5;
  else if (normalized <= 2) nice = 2;
  else if (normalized <= 3) nice = 3;
  else if (normalized <= 5) nice = 5;
  else if (normalized <= 7.5) nice = 7.5;
  return nice * exponent;
};

const formatKwLabel = (value: number) => {
  if (!Number.isFinite(value)) return '0 kW';
  if (value >= 1000) {
    const mw = value / 1000;
    return `${mw.toFixed(mw >= 10 ? 0 : 1)} MW`;
  }
  return `${value.toFixed(0)} kW`;
};

// Exported so page.tsx can call it for past-day downloads too
// Expects data pre-sampled to 5-min buckets via resampleTo5MinBucketsProgressive()
// for clean uniform line spacing.
export function buildGraphSVG(data: GraphDataPoint[], dateLabel?: string): string {
  const palette = {
    solar: getCssVar('--solar'),
    load: getCssVar('--consumption'),
    soc: getCssVar('--grid'),
    border: getCssVar('--border'),
    text: getCssVar('--text-tertiary'),
    textPrimary: getCssVar('--text-primary'),
    card: getCssVar('--bg-card'),
  };

  const w = 820, h = 340;
  const pad = { top: 40, right: 60, bottom: 40, left: 60 };
  const iw = w - pad.left - pad.right;
  const ih = h - pad.top - pad.bottom;
  const maxKw = computeMaxKw(data);

  const gx = (t: number) => pad.left + (t / 24) * iw;
  const gy = (v: number) => pad.top + ih - (v / maxKw) * ih;
  const gs = (v: number) => pad.top + ih - (v / 100) * ih;

  const solarCoords = data.map(d => ({ x: gx(d.timeOfDay), y: gy(d.solar) }));
  const loadCoords = data.map(d => ({ x: gx(d.timeOfDay), y: gy(d.load) }));
  const socCoords = data.map(d => ({ x: gx(d.timeOfDay), y: gs(d.batSoc) }));

  const solarPath = buildSmoothPath(solarCoords);
  const loadPath = buildSmoothPath(loadCoords);
  const socPath = buildSmoothPath(socCoords);

  const solarArea = `${solarPath} L ${solarCoords[solarCoords.length - 1].x},${pad.top + ih} L ${solarCoords[0].x},${pad.top + ih} Z`;

  const gridLines = [0, 0.25, 0.5, 0.75, 1].map(r => {
    const y = pad.top + ih * r;
    const kw = maxKw - r * maxKw;
    const soc = Math.round(100 - r * 100);
    return `<line x1="${pad.left}" y1="${y.toFixed(1)}" x2="${w - pad.right}" y2="${y.toFixed(1)}" stroke="${palette.border}" stroke-dasharray="4 6"/>
      <text x="${pad.left - 8}" y="${(y + 3).toFixed(1)}" text-anchor="end" fill="${palette.text}" font-size="9" font-weight="bold">${formatKwLabel(kw)}</text>
      <text x="${w - pad.right + 8}" y="${(y + 3).toFixed(1)}" text-anchor="start" fill="${palette.soc}" font-size="9" font-weight="bold">${soc}%</text>`;
  }).join('\n');

  const timeLines = [0, 3, 6, 9, 12, 15, 18, 21, 24].map(hr => {
    const x = gx(hr);
    return `<line x1="${x.toFixed(1)}" y1="${pad.top}" x2="${x.toFixed(1)}" y2="${pad.top + ih + 5}" stroke="${palette.border}" />
      <text x="${x.toFixed(1)}" y="${pad.top + ih + 18}" text-anchor="middle" fill="${palette.text}" font-size="9">${hr.toString().padStart(2,'0')}:00</text>`;
  }).join('\n');

  const label = dateLabel ? ` (${dateLabel})` : '';
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="${palette.card}"/>
  <text x="${w/2}" y="22" text-anchor="middle" fill="${palette.textPrimary}" font-size="13" font-weight="bold" font-family="monospace">SafariCharge Daily Energy Profile${label}</text>
  ${gridLines}
  ${timeLines}
  <path d="${solarArea}" fill="${palette.solar}" fill-opacity="0.18"/>
  <path d="${solarPath}" fill="none" stroke="${palette.solar}" stroke-width="2.5" stroke-linejoin="round"/>
  <path d="${loadPath}" fill="none" stroke="${palette.load}" stroke-width="2.5" stroke-linejoin="round"/>
  <path d="${socPath}" fill="none" stroke="${palette.soc}" stroke-width="2" stroke-dasharray="10 6" stroke-linejoin="round"/>
  <rect x="${pad.left}" y="${h - 22}" width="12" height="12" fill="${palette.solar}" opacity="0.8"/>
  <text x="${pad.left + 16}" y="${h - 12}" fill="${palette.solar}" font-size="9" font-weight="bold">Solar Gen (kW)</text>
  <line x1="${pad.left + 110}" y1="${h - 16}" x2="${pad.left + 126}" y2="${h - 16}" stroke="${palette.load}" stroke-width="2.5"/>
  <text x="${pad.left + 130}" y="${h - 12}" fill="${palette.load}" font-size="9" font-weight="bold">Total Load (kW)</text>
  <line x1="${pad.left + 230}" y1="${h - 16}" x2="${pad.left + 246}" y2="${h - 16}" stroke="${palette.soc}" stroke-width="2" stroke-dasharray="10 6"/>
  <text x="${pad.left + 250}" y="${h - 12}" fill="${palette.soc}" font-size="9" font-weight="bold">Battery SOC (%)</text>
</svg>`;
}

export function triggerSVGDownload(svgStr: string, filename: string) {
  const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 300);
}

export function triggerJPGDownload(svgStr: string, filename: string, width = 820, height = 340) {
  const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = width * 2;
    canvas.height = height * 2;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = getCssVar('--bg-card', 'white');
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.scale(2, 2);
    ctx.drawImage(img, 0, 0, width, height);
    URL.revokeObjectURL(url);
    const jpgUrl = canvas.toDataURL('image/jpeg', 0.95);
    const a = document.createElement('a');
    a.href = jpgUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };
  img.src = url;
}

// Renders SVG to a JPG Blob; used by the ZIP download
export function buildJPGBlob(svgStr: string, width = 820, height = 340): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width * 2;
      canvas.height = height * 2;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = getCssVar('--bg-card', 'white');
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.scale(2, 2);
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      canvas.toBlob(blob => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas toBlob failed'));
      }, 'image/jpeg', 0.95);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load failed')); };
    img.src = url;
  });
}


/** Convert a forecast timestamp ISO string → fractional hour-of-day (0-24). */
function forecastTsToTimeOfDay(ts: string): number {
  const d = new Date(ts);
  return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
}

/**
 * Build a closed SVG polygon path for a confidence band.
 *
 * The band runs from (timeOfDay, lowKw) to (timeOfDay, highKw) — a filled
 * area between two lines sharing the same X coordinates.
 */
function buildConfidenceBandPath(
  points: ForecastPoint[],
  getX: (t: number) => number,
  getY: (v: number) => number,
  lowKey: 'solar_confidence_low' | 'load_confidence_low',
  highKey: 'solar_confidence_high' | 'load_confidence_high',
): string {
  if (points.length === 0) return '';
  const coords = points.map(p => ({ x: getX(forecastTsToTimeOfDay(p.timestamp)), low: getY(p[lowKey]), high: getY(p[highKey]) }));
  // Top edge (high) left→right
  const topPts = coords.map(c => ({ x: c.x, y: c.high }));
  // Bottom edge (low) right→left
  const botPts = [...coords].reverse().map(c => ({ x: c.x, y: c.low }));
  return `${buildSmoothPath(topPts)} L ${botPts[0].x},${botPts[0].y} ${buildSmoothPath(botPts).replace(/^M [^ ]+ /, '')} Z`;
}

const DailyEnergyGraph = React.memo(function DailyEnergyGraph({
  data,
  dateLabel,
  minuteData,
  solarCapacityKw,
  expectedOutputData = [],
  showSoCBands = false,
}: {
  data: GraphDataPoint[];
  dateLabel?: string;
  minuteData?: MinuteDataPoint[];
  solarCapacityKw?: number;
  expectedOutputData?: { timeOfDay: number; output: number }[];
  showSoCBands?: boolean;
}) {
  const { forecastData, isLoading, showOverlay, toggleOverlay, fetchForecast } =
    useForecastStore();

  const handleDownloadJPG = useCallback(() => {
    if (!data || data.length === 0) return;
    const svgStr = buildGraphSVG(data, dateLabel);
    triggerJPGDownload(svgStr, `SafariCharge_DailyGraph${dateLabel ? `_${dateLabel}` : ''}.jpg`);
  }, [data, dateLabel]);

  const handleToggleForecast = useCallback(() => {
    toggleOverlay();
    // Fetch if not yet loaded and we have the data we need
    if (!forecastData && minuteData && minuteData.length >= 24 && solarCapacityKw) {
      // Use last 7 days of minuteData (7 * 24 * 60 = 10080 minutes)
      const last7Days = minuteData.slice(-10080);
      void fetchForecast(last7Days, solarCapacityKw);
    }
  }, [toggleOverlay, forecastData, minuteData, solarCapacityKw, fetchForecast]);

  if (!data || data.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500 font-mono text-sm">
        Waiting for simulation data...
      </div>
    );
  }

  const width = 800;
  const height = 300;
  const padding = { top: 20, right: 50, bottom: 30, left: 50 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const maxKw = computeMaxKw(data);

  const getX = (t: number) => padding.left + (t / 24) * innerWidth;
  const getY_Kw = (val: number) => padding.top + innerHeight - (val / maxKw) * innerHeight;
  const getY_Soc = (val: number) => padding.top + innerHeight - (val / 100) * innerHeight;

  const solarCoords = data.map(d => ({ x: getX(d.timeOfDay), y: getY_Kw(d.solar) }));
  const loadCoords = data.map(d => ({ x: getX(d.timeOfDay), y: getY_Kw(d.load) }));
  const socCoords = data.map(d => ({ x: getX(d.timeOfDay), y: getY_Soc(d.batSoc) }));
  const expectedSeries = expectedOutputData.length > 0
    ? expectedOutputData
    : data
        .filter((d) => typeof d.expectedOutput === 'number')
        .map((d) => ({ timeOfDay: d.timeOfDay, output: d.expectedOutput as number }));
  const expectedCoords = expectedSeries.map((d) => ({ x: getX(d.timeOfDay), y: getY_Kw(d.output) }));

  const solarPath = buildSmoothPath(solarCoords);
  const loadPath = buildSmoothPath(loadCoords);
  const socPath = buildSmoothPath(socCoords);
  const expectedPath = buildSmoothPath(expectedCoords);
  const solarArea = `${solarPath} L ${solarCoords[solarCoords.length - 1].x},${padding.top + innerHeight} L ${solarCoords[0].x},${padding.top + innerHeight} Z`;
  const last = data[data.length - 1];

  const latestHours = Math.floor(last.timeOfDay);
  const latestMins = Math.round((last.timeOfDay % 1) * 60);
  const latestTimeStr = `${String(latestHours).padStart(2, '0')}:${String(latestMins).padStart(2, '0')}`;

  const palette = {
    solar: getCssVar('--solar'),
    load: getCssVar('--consumption'),
    soc: getCssVar('--grid'),
    border: getCssVar('--border'),
    text: getCssVar('--text-tertiary'),
  };

  // Build forecast overlay paths
  const hasForecast = showOverlay && forecastData && forecastData.length > 0;
  let fSolarPath = '';
  let fLoadPath = '';
  let fSolarBandPath = '';
  let fLoadBandPath = '';

  if (hasForecast) {
    const pts = forecastData!;
    const fSolarCoords = pts.map(p => ({ x: getX(forecastTsToTimeOfDay(p.timestamp)), y: getY_Kw(p.solar_kw) }));
    const fLoadCoords = pts.map(p => ({ x: getX(forecastTsToTimeOfDay(p.timestamp)), y: getY_Kw(p.load_kw) }));
    fSolarPath = buildSmoothPath(fSolarCoords);
    fLoadPath = buildSmoothPath(fLoadCoords);
    fSolarBandPath = buildConfidenceBandPath(pts, getX, getY_Kw, 'solar_confidence_low', 'solar_confidence_high');
    fLoadBandPath = buildConfidenceBandPath(pts, getX, getY_Kw, 'load_confidence_low', 'load_confidence_high');
  }

  const canShowForecastButton = !!(minuteData && minuteData.length >= 24 && solarCapacityKw);

  return (
    <div className="w-full">
      <div className="group/chart w-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 overflow-x-auto">
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
            Today&apos;s Energy Profile{dateLabel ? ` (${dateLabel})` : ''}
          </h3>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-[var(--text-tertiary)] font-mono">Simulated to {latestTimeStr} &bull; {data.length} points</span>
            {canShowForecastButton && (
              <button
                onClick={handleToggleForecast}
                disabled={isLoading}
                className={`flex items-center gap-1 text-[10px] font-semibold border px-2 py-1 rounded transition-colors ${
                  showOverlay
                    ? 'text-amber-700 bg-amber-50 border-amber-300 hover:border-amber-500 dark:text-amber-300 dark:bg-amber-900/30 dark:border-amber-700'
                    : 'text-[var(--text-primary)] bg-[var(--bg-secondary)] border-[var(--border)] hover:border-[var(--border-strong)]'
                } disabled:opacity-50`}
                title={showOverlay ? 'Hide 24h forecast overlay' : 'Show 24h forecast overlay'}
              >
                {isLoading ? (
                  <span className="animate-spin inline-block w-2.5 h-2.5 border border-current border-t-transparent rounded-full" />
                ) : showOverlay ? (
                  <TrendingDown size={11} />
                ) : (
                  <TrendingUp size={11} />
                )}
                {showOverlay ? 'Hide Forecast' : 'Show Forecast'}
              </button>
            )}
            <button
              onClick={handleDownloadJPG}
              className="flex items-center gap-1 text-[10px] font-semibold text-[var(--text-primary)] bg-[var(--bg-secondary)] border border-[var(--border)] px-2 py-1 rounded transition-colors hover:border-[var(--border-strong)]"
              title="Download chart as JPG"
            >
              <Download size={11} /> JPG
            </button>
          </div>
        </div>
        <div className="min-w-[560px] sm:min-w-[700px]">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto font-mono text-[10px]">
            <defs>
              <linearGradient id="solarGradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={palette.solar} stopOpacity="0.18" />
                <stop offset="100%" stopColor={palette.solar} stopOpacity="0.05" />
              </linearGradient>
            </defs>

            {/* Night zone shading: 00:00–06:00 and 18:00–24:00 */}
            <rect x={getX(0)} y={padding.top} width={getX(6) - getX(0)} height={innerHeight} fill={palette.border} fillOpacity="0.18" />
            <rect x={getX(18)} y={padding.top} width={getX(24) - getX(18)} height={innerHeight} fill={palette.border} fillOpacity="0.18" />

            {[0, 0.25, 0.5, 0.75, 1].map(ratio => {
              const y = padding.top + innerHeight * ratio;
              const kwVal = maxKw - ratio * maxKw;
              const socVal = Math.round(100 - ratio * 100);
              return (
                <g key={ratio}>
                  <line
                    x1={padding.left} y1={y}
                    x2={width - padding.right} y2={y}
                    stroke={palette.border} strokeDasharray="4 6"
                  />
                  <text x={padding.left - 6} y={y + 3} textAnchor="end" fill={palette.text} fontSize="9" fontWeight="bold">
                    {formatKwLabel(kwVal)}
                  </text>
                  <text x={width - padding.right + 6} y={y + 3} textAnchor="start" fill={palette.soc} fontSize="9" fontWeight="bold">
                    {socVal}%
                  </text>
                </g>
              );
            })}
            {showSoCBands && (
              <>
                <line x1={padding.left} y1={getY_Soc(20)} x2={width - padding.right} y2={getY_Soc(20)} stroke={palette.soc} strokeDasharray="3 4" opacity="0.35" />
                <line x1={padding.left} y1={getY_Soc(90)} x2={width - padding.right} y2={getY_Soc(90)} stroke={palette.soc} strokeDasharray="3 4" opacity="0.35" />
                <text x={width - padding.right - 2} y={getY_Soc(20) - 3} textAnchor="end" fill={palette.soc} fontSize="8">SoC Min 20%</text>
                <text x={width - padding.right - 2} y={getY_Soc(90) - 3} textAnchor="end" fill={palette.soc} fontSize="8">SoC Max 90%</text>
              </>
            )}

            {[0, 3, 6, 9, 12, 15, 18, 21, 24].map(hr => {
              const x = padding.left + (hr / 24) * innerWidth;
              return (
                <g key={hr}>
                  <line x1={x} y1={padding.top} x2={x} y2={padding.top + innerHeight + 5} stroke={palette.border} />
                  <text x={x} y={padding.top + innerHeight + 18} textAnchor="middle" fill={palette.text} fontSize="9" fontWeight="bold">
                    {hr.toString().padStart(2, '0')}:00
                  </text>
                </g>
              );
            })}

            {/* Minor 1-hour tick marks between major 3-hour gridlines */}
            {Array.from({ length: 25 }, (_, hr) => hr)
              .filter(hr => hr % 3 !== 0)
              .map(hr => {
                const x = getX(hr);
                return (
                  <line key={`minor-${hr}`} x1={x} y1={padding.top + innerHeight} x2={x} y2={padding.top + innerHeight + 4}
                    stroke={palette.border} strokeWidth="0.8" />
                );
              })}

            <path d={solarArea} fill="url(#solarGradient)" />
            <path d={solarPath} fill="none" stroke={palette.solar} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
            {expectedCoords.length > 1 && (
              <path d={expectedPath} fill="none" stroke={palette.solar} strokeWidth="1.8" strokeDasharray="6 4" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
            )}
            <path d={loadPath} fill="none" stroke={palette.load} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            <path d={socPath} fill="none" stroke={palette.soc} strokeWidth="2" strokeDasharray="10 6" strokeLinecap="round" strokeLinejoin="round" />

            {/* Simulation progress vertical line */}
            {data.length > 1 && (() => {
              const progressX = getX(last.timeOfDay);
              return (
                <g>
                  <line x1={progressX} y1={padding.top} x2={progressX} y2={padding.top + innerHeight}
                    stroke={palette.solar} strokeWidth="1" strokeDasharray="3 4" opacity="0.5" />
                  <text x={progressX} y={padding.top - 5} textAnchor="middle" fill={palette.solar} fontSize="8" fontWeight="bold">
                    {latestTimeStr}
                  </text>
                </g>
              );
            })()}

            {/* Forecast overlay — only rendered when showOverlay=true and data available */}
            {hasForecast && (
              <g opacity="0.85">
                {/* Confidence bands */}
                <path d={fSolarBandPath} fill={palette.solar} fillOpacity="0.1" stroke="none" />
                <path d={fLoadBandPath} fill={palette.load} fillOpacity="0.1" stroke="none" />
                {/* Forecast lines (dashed) */}
                <path d={fSolarPath} fill="none" stroke={palette.solar} strokeWidth="1.8" strokeDasharray="6 4" strokeLinecap="round" strokeLinejoin="round" />
                <path d={fLoadPath} fill="none" stroke={palette.load} strokeWidth="1.8" strokeDasharray="6 4" strokeLinecap="round" strokeLinejoin="round" />
              </g>
            )}

            {/* Hover dots for all three series */}
            {data.length > 1 && [
              { cx: getX(last.timeOfDay), cy: getY_Kw(last.solar), fill: palette.solar },
              { cx: getX(last.timeOfDay), cy: getY_Kw(last.load), fill: palette.load },
              { cx: getX(last.timeOfDay), cy: getY_Soc(last.batSoc), fill: palette.soc },
            ].map((dot, i) => (
              <circle key={i} cx={dot.cx} cy={dot.cy} r="3.5"
                fill={dot.fill} stroke="var(--bg-card)" strokeWidth="1.5"
                className="opacity-0 group-hover/chart:opacity-100 transition-opacity" />
            ))}
          </svg>

          <div className="flex flex-wrap justify-center gap-3 sm:gap-8 mt-3 text-xs font-bold bg-[var(--bg-secondary)] p-2 rounded-lg mx-2 sm:mx-6 border border-[var(--border)]">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: palette.solar }} />
              <span className="text-[var(--text-secondary)]">Solar Gen (kW)</span>
            </div>
            {expectedCoords.length > 1 && (
              <div className="flex items-center gap-2">
                <div className="w-5 border-t-2 border-dashed opacity-80" style={{ borderColor: palette.solar }} />
                <span className="text-[var(--text-secondary)]">Expected Output</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <div className="w-5 h-1 rounded-full" style={{ backgroundColor: palette.load }} />
              <span className="text-[var(--text-secondary)]">Total Load (kW)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 border-t-2 border-dashed" style={{ borderColor: palette.soc }} />
              <span className="text-[var(--text-secondary)]">Battery SOC (%)</span>
            </div>
            {hasForecast && (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-5 border-t-2 border-dashed opacity-70" style={{ borderColor: palette.solar }} />
                  <span className="text-[var(--text-secondary)]">Solar Forecast</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 border-t-2 border-dashed opacity-70" style={{ borderColor: palette.load }} />
                  <span className="text-[var(--text-secondary)]">Load Forecast</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

DailyEnergyGraph.displayName = 'DailyEnergyGraph';

export default DailyEnergyGraph;
