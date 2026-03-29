'use client';

import React, { useCallback } from 'react';
import { Download } from 'lucide-react';

const getCssVar = (name: string, fallback?: string) => {
  if (typeof window !== 'undefined') {
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    if (value) return value;
  }
  return fallback ?? `var(${name})`;
};

const buildSmoothPath = (points: { x: number; y: number }[]) => {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x},${points[0].y}`;
  const d = [`M ${points[0].x},${points[0].y}`];
  for (let i = 0; i < points.length - 1; i++) {
    const current = points[i];
    const next = points[i + 1];
    const midX = (current.x + next.x) / 2;
    const midY = (current.y + next.y) / 2;
    d.push(`Q ${current.x},${current.y} ${midX},${midY}`);
  }
  const last = points[points.length - 1];
  d.push(`T ${last.x},${last.y}`);
  return d.join(' ');
};

export interface GraphDataPoint {
  timeOfDay: number;
  solar: number;
  load: number;
  batSoc: number;
}

// Exported so page.tsx can call it for past-day downloads too
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
  const maxKw = 60;

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
    const kw = Math.round(maxKw - r * maxKw);
    const soc = Math.round(100 - r * 100);
    return `<line x1="${pad.left}" y1="${y.toFixed(1)}" x2="${w - pad.right}" y2="${y.toFixed(1)}" stroke="${palette.border}" stroke-dasharray="4 6"/>
      <text x="${pad.left - 8}" y="${(y + 3).toFixed(1)}" text-anchor="end" fill="${palette.text}" font-size="9" font-weight="bold">${kw} kW</text>
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
    canvas.width = width * 2;   // 2x for retina sharpness
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


const DailyEnergyGraph = React.memo(function DailyEnergyGraph({
  data,
  dateLabel,
}: {
  data: GraphDataPoint[];
  dateLabel?: string;
}) {
  const handleDownloadJPG = useCallback(() => {
    if (!data || data.length === 0) return;
    const svgStr = buildGraphSVG(data, dateLabel);
    triggerJPGDownload(svgStr, `SafariCharge_DailyGraph${dateLabel ? `_${dateLabel}` : ''}.jpg`);
  }, [data, dateLabel]);

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
  const maxKw = 60;

  const getX = (t: number) => padding.left + (t / 24) * innerWidth;
  const getY_Kw = (val: number) => padding.top + innerHeight - (val / maxKw) * innerHeight;
  const getY_Soc = (val: number) => padding.top + innerHeight - (val / 100) * innerHeight;

  const solarCoords = data.map(d => ({ x: getX(d.timeOfDay), y: getY_Kw(d.solar) }));
  const loadCoords = data.map(d => ({ x: getX(d.timeOfDay), y: getY_Kw(d.load) }));
  const socCoords = data.map(d => ({ x: getX(d.timeOfDay), y: getY_Soc(d.batSoc) }));

  const solarPath = buildSmoothPath(solarCoords);
  const loadPath = buildSmoothPath(loadCoords);
  const socPath = buildSmoothPath(socCoords);
  const solarArea = `${solarPath} L ${solarCoords[solarCoords.length - 1].x},${padding.top + innerHeight} L ${solarCoords[0].x},${padding.top + innerHeight} Z`;
  const last = data[data.length - 1];

  const palette = {
    solar: getCssVar('--solar'),
    load: getCssVar('--consumption'),
    soc: getCssVar('--grid'),
    border: getCssVar('--border'),
    text: getCssVar('--text-tertiary'),
  };

  return (
    <div className="w-full">
      <div className="group/chart w-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 overflow-x-auto">
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
            Today&apos;s Energy Profile{dateLabel ? ` (${dateLabel})` : ''}
          </h3>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-[var(--text-tertiary)] font-mono">{data.length} data points</span>
            <button
              onClick={handleDownloadJPG}
              className="flex items-center gap-1 text-[10px] font-semibold text-[var(--text-primary)] bg-[var(--bg-secondary)] border border-[var(--border)] px-2 py-1 rounded transition-colors hover:border-[var(--border-strong)]"
              title="Download chart as JPG"
            >
              <Download size={11} /> JPG
            </button>
          </div>
        </div>
        <div className="min-w-[700px]">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto font-mono text-[10px]">
            <defs>
              <linearGradient id="solarGradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={palette.solar} stopOpacity="0.18" />
                <stop offset="100%" stopColor={palette.solar} stopOpacity="0.05" />
              </linearGradient>
            </defs>

            {[0, 0.25, 0.5, 0.75, 1].map(ratio => {
              const y = padding.top + innerHeight * ratio;
              const kwVal = Math.round(maxKw - ratio * maxKw);
              const socVal = Math.round(100 - ratio * 100);
              return (
                <g key={ratio}>
                  <line
                    x1={padding.left} y1={y}
                    x2={width - padding.right} y2={y}
                    stroke={palette.border} strokeDasharray="4 6"
                  />
                  <text x={padding.left - 6} y={y + 3} textAnchor="end" fill={palette.text} fontSize="9" fontWeight="bold">
                    {kwVal} kW
                  </text>
                  <text x={width - padding.right + 6} y={y + 3} textAnchor="start" fill={palette.soc} fontSize="9" fontWeight="bold">
                    {socVal}%
                  </text>
                </g>
              );
            })}

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

            <path d={solarArea} fill="url(#solarGradient)" />
            <path d={solarPath} fill="none" stroke={palette.solar} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
            <path d={loadPath} fill="none" stroke={palette.load} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            <path d={socPath} fill="none" stroke={palette.soc} strokeWidth="2" strokeDasharray="10 6" strokeLinecap="round" strokeLinejoin="round" />

            {data.length > 1 && (
              <circle
                cx={getX(last.timeOfDay)}
                cy={getY_Kw(last.solar)}
                r="4.2"
                fill={palette.solar}
                stroke="var(--bg-card)"
                strokeWidth="1.4"
                className="opacity-0 group-hover/chart:opacity-100 transition-opacity"
              />
            )}
          </svg>

          <div className="flex justify-center gap-8 mt-3 text-xs font-bold bg-[var(--bg-secondary)] p-2 rounded-lg mx-6 border border-[var(--border)]">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: palette.solar }} />
              <span className="text-[var(--text-secondary)]">Solar Gen (kW)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-1 rounded-full" style={{ backgroundColor: palette.load }} />
              <span className="text-[var(--text-secondary)]">Total Load (kW)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 border-t-2 border-dashed" style={{ borderColor: palette.soc }} />
              <span className="text-[var(--text-secondary)]">Battery SOC (%)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

DailyEnergyGraph.displayName = 'DailyEnergyGraph';

export default DailyEnergyGraph;
