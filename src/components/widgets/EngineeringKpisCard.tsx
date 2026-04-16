'use client';

import React from 'react';
import { Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useEngineeringKPIs, type BenchmarkTone } from '@/hooks/useEngineeringKPIs';

interface EngineeringKpisCardProps {
  deratingPct?: number;
  showDeratingBadge?: boolean;
  financeSummary?: {
    lcoeKesPerKwh: number;
    npvKes: number;
    irrPct: number;
    paybackYears: number;
  };
}

const toneClass: Record<BenchmarkTone, string> = {
  green: 'bg-green-100 text-green-700',
  amber: 'bg-amber-100 text-amber-700',
  red: 'bg-red-100 text-red-700',
};

function StatusBadge({ tone }: { tone: BenchmarkTone }) {
  return (
    <span className={`inline-flex rounded px-2 py-0.5 text-xs font-semibold capitalize ${toneClass[tone]}`}>
      {tone}
    </span>
  );
}

export function EngineeringKpisCard({ deratingPct = 0, showDeratingBadge = false, financeSummary }: EngineeringKpisCardProps = {}) {
  const kpis = useEngineeringKPIs();
  const deratingClass =
    deratingPct > 15 ? 'text-red-600 bg-red-50' : deratingPct >= 5 ? 'text-yellow-600 bg-yellow-50' : 'text-green-600 bg-green-50';

  return (
    <Card className="bg-[var(--bg-card)] border-[var(--border)] shadow-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-2">
          <Activity className="h-4 w-4 text-[var(--solar)]" />
          Engineering KPIs
          {showDeratingBadge && (
            <span className={`ml-auto rounded-full px-2 py-1 text-xs font-semibold normal-case tracking-normal ${deratingClass}`}>
              Derating {Math.max(0, deratingPct).toFixed(1)}%
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-[var(--text-tertiary)] border-b border-[var(--border)]">
                <th className="py-2">KPI</th>
                <th className="py-2">Value</th>
                <th className="py-2">Benchmark</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody className="text-[var(--text-primary)]">
              <tr className="border-b border-[var(--border)]">
                <td className="py-2">Specific Yield</td>
                <td className="py-2">{kpis.specificYield.toFixed(1)} kWh/kWp/yr</td>
                <td className="py-2">1400–2000</td>
                <td className="py-2"><StatusBadge tone={kpis.benchmarks.specificYield} /></td>
              </tr>
              <tr className="border-b border-[var(--border)]">
                <td className="py-2">Performance Ratio</td>
                <td className="py-2">{(kpis.performanceRatio * 100).toFixed(1)}%</td>
                <td className="py-2">75–90%</td>
                <td className="py-2"><StatusBadge tone={kpis.benchmarks.performanceRatio} /></td>
              </tr>
              <tr className="border-b border-[var(--border)]">
                <td className="py-2">Capacity Factor</td>
                <td className="py-2">{(kpis.capacityFactor * 100).toFixed(1)}%</td>
                <td className="py-2">18–22%</td>
                <td className="py-2"><StatusBadge tone={kpis.benchmarks.capacityFactor} /></td>
              </tr>
              <tr className="border-b border-[var(--border)]">
                <td className="py-2">Self-consumption</td>
                <td className="py-2">{(kpis.selfConsumptionRate * 100).toFixed(1)}%</td>
                <td className="py-2">&gt;70%</td>
                <td className="py-2"><StatusBadge tone={kpis.benchmarks.selfConsumptionRate} /></td>
              </tr>
              <tr className="border-b border-[var(--border)]">
                <td className="py-2">Grid Independence</td>
                <td className="py-2">{(kpis.gridIndependence * 100).toFixed(1)}%</td>
                <td className="py-2">Higher is better</td>
                <td className="py-2">—</td>
              </tr>
              <tr className="border-b border-[var(--border)]">
                <td className="py-2">Battery Cycles / Year</td>
                <td className="py-2">{kpis.batteryCyclesPerYear.toFixed(1)}</td>
                <td className="py-2">Simulation-derived</td>
                <td className="py-2">—</td>
              </tr>
              <tr className="border-b border-[var(--border)]">
                <td className="py-2">CO₂ Avoided</td>
                <td className="py-2">{kpis.co2AvoidedKgPerYear.toFixed(1)} kg/yr</td>
                <td className="py-2">Grid factor 0.4 kg/kWh</td>
                <td className="py-2">—</td>
              </tr>
              <tr className="border-b border-[var(--border)]">
                <td className="py-2">LCOE</td>
                <td className="py-2">{financeSummary ? `KES ${financeSummary.lcoeKesPerKwh.toFixed(2)}/kWh` : '—'}</td>
                <td className="py-2">Finance model</td>
                <td className="py-2">—</td>
              </tr>
              <tr className="border-b border-[var(--border)]">
                <td className="py-2">NPV / IRR</td>
                <td className="py-2">{financeSummary ? `KES ${financeSummary.npvKes.toFixed(0)} / ${financeSummary.irrPct.toFixed(1)}%` : '—'}</td>
                <td className="py-2">Finance model</td>
                <td className="py-2">—</td>
              </tr>
              <tr>
                <td className="py-2">Simple Payback</td>
                <td className="py-2">{financeSummary ? `${financeSummary.paybackYears.toFixed(2)} years` : '—'}</td>
                <td className="py-2">Finance model</td>
                <td className="py-2">—</td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
