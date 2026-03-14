'use client';

import React, { useRef, useCallback } from 'react';
import { Download } from 'lucide-react';

export interface GraphDataPoint {
  timeOfDay: number;
  solar: number;
  load: number;
  batSoc: number;
}

const DailyEnergyGraph = React.memo(({ data, dateLabel }: { data: GraphDataPoint[]; dateLabel?: string }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  const handleDownloadSVG = useCallback(() => {
    if (!svgRef.current) return;
    const svgEl = svgRef.current;
    // Embed a white background so the SVG looks right outside the browser
    const clone = svgEl.cloneNode(true) as SVGSVGElement;
    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bg.setAttribute('width', '100%');
    bg.setAttribute('height', '100%');
    bg.setAttribute('fill', 'white');
    clone.insertBefore(bg, clone.firstChild);

    const title = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    title.setAttribute('x', '400');
    title.setAttribute('y', '14');
    title.setAttribute('text-anchor', 'middle');
    title.setAttribute('font-size', '11');
    title.setAttribute('font-weight', 'bold');
    title.setAttribute('fill', '#334155');
    title.textContent = `SafariCharge – Daily Energy Profile${dateLabel ? ` – ${dateLabel}` : ''}`;
    clone.insertBefore(title, clone.children[1]);

    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(clone);
    const blob = new Blob([svgStr], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SafariCharge_DailyGraph${dateLabel ? `_${dateLabel}` : ''}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Delay revoke so the browser has time to start the download
    setTimeout(() => URL.revokeObjectURL(url), 200);
  }, [dateLabel]);

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

  const maxKw = Math.max(60, ...data.map(d => Math.max(d.solar, d.load))) + 5;

  const getX = (t: number) => padding.left + (t / 24) * innerWidth;
  const getY_Kw = (val: number) => padding.top + innerHeight - (val / maxKw) * innerHeight;
  const getY_Soc = (val: number) => padding.top + innerHeight - (val / 100) * innerHeight;

  const solarPoints = data.map(d => `${getX(d.timeOfDay)},${getY_Kw(d.solar)}`).join(' L ');
  const solarArea = `M ${getX(data[0].timeOfDay)},${padding.top + innerHeight} L ${solarPoints} L ${getX(data[data.length - 1].timeOfDay)},${padding.top + innerHeight} Z`;
  const loadPoints = data.map(d => `${getX(d.timeOfDay)},${getY_Kw(d.load)}`).join(' L ');
  const socPoints = data.map(d => `${getX(d.timeOfDay)},${getY_Soc(d.batSoc)}`).join(' L ');

  const last = data[data.length - 1];

  return (
    <div className="w-full bg-white p-4 rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
      <div className="flex items-center justify-between mb-2 px-2">
        <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
          Today&apos;s Energy Profile{dateLabel ? ` – ${dateLabel}` : ''}
        </h3>
        <div className="flex items-center gap-3">
          <span className="text-[9px] text-slate-400 font-mono">{data.length} data points</span>
          <button
            onClick={handleDownloadSVG}
            className="flex items-center gap-1 text-[10px] font-bold text-sky-600 hover:text-sky-800 bg-sky-50 hover:bg-sky-100 border border-sky-200 px-2 py-1 rounded transition-colors"
            title="Download chart as SVG"
          >
            <Download size={11} /> SVG
          </button>
        </div>
      </div>
      <div className="min-w-[700px]">
        <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} className="w-full h-auto font-mono">
          {/* Horizontal grid lines & dual axis labels */}
          {[0, 0.25, 0.5, 0.75, 1].map(ratio => {
            const y = padding.top + innerHeight * ratio;
            const kwVal = Math.round(maxKw - ratio * maxKw);
            const socVal = Math.round(100 - ratio * 100);
            return (
              <g key={ratio}>
                <line
                  x1={padding.left} y1={y}
                  x2={width - padding.right} y2={y}
                  stroke="#f1f5f9" strokeDasharray="4 4"
                />
                <text x={padding.left - 6} y={y + 3} textAnchor="end" fill="#64748b" fontSize="9" fontWeight="bold">
                  {kwVal} kW
                </text>
                <text x={width - padding.right + 6} y={y + 3} textAnchor="start" fill="#8b5cf6" fontSize="9" fontWeight="bold">
                  {socVal}%
                </text>
              </g>
            );
          })}

          {/* Vertical time grid + labels */}
          {[0, 3, 6, 9, 12, 15, 18, 21, 24].map(hr => {
            const x = padding.left + (hr / 24) * innerWidth;
            return (
              <g key={hr}>
                <line x1={x} y1={padding.top} x2={x} y2={padding.top + innerHeight + 5} stroke="#f1f5f9" />
                <text x={x} y={padding.top + innerHeight + 18} textAnchor="middle" fill="#64748b" fontSize="9" fontWeight="bold">
                  {hr.toString().padStart(2, '0')}:00
                </text>
              </g>
            );
          })}

          {/* Solar area fill */}
          <path d={solarArea} fill="rgba(34,197,94,0.12)" />
          {/* Solar line */}
          <path d={`M ${solarPoints}`} fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinejoin="round" />
          {/* Load line */}
          <path d={`M ${loadPoints}`} fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinejoin="round" />
          {/* Battery SOC dashed line */}
          <path d={`M ${socPoints}`} fill="none" stroke="#8b5cf6" strokeWidth="2" strokeDasharray="6 4" strokeLinejoin="round" />

          {/* Live cursor dot at latest solar data point */}
          {data.length > 1 && (
            <circle
              cx={getX(last.timeOfDay)}
              cy={getY_Kw(last.solar)}
              r="4"
              fill="#22c55e"
              stroke="white"
              strokeWidth="1.5"
            />
          )}
        </svg>

        {/* Legend */}
        <div className="flex justify-center gap-8 mt-3 text-xs font-bold bg-slate-50 p-2 rounded-lg mx-12">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded-sm opacity-80" />
            <span className="text-green-700">Solar Gen (kW)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-1 bg-red-500 rounded-full" />
            <span className="text-red-700">Total Load (kW)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 border-t-2 border-dashed border-purple-500" />
            <span className="text-purple-700">Battery SOC (%)</span>
          </div>
        </div>
      </div>
    </div>
  );
});

DailyEnergyGraph.displayName = 'DailyEnergyGraph';

export default DailyEnergyGraph;
