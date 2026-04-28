'use client';

import React, { useMemo } from 'react';
import {
  Sparkles, TrendingUp, AlertTriangle, CheckCircle,
  Battery, Sun, Zap, DollarSign, Activity, Info
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useEnergySystemStore } from '@/stores/energySystemStore';
import { computeEngineeringKpis } from '@/lib/engineeringKpis';

export type InsightSeverity = 'positive' | 'info' | 'warning' | 'critical';

export interface AiInsight {
  id: string;
  severity: InsightSeverity;
  category: 'efficiency' | 'financial' | 'battery' | 'solar' | 'grid' | 'general';
  title: string;
  detail: string;
  metric?: string;
}

function deriveInsights(
  minuteData: ReturnType<typeof useEnergySystemStore.getState>['minuteData'],
  accumulators: ReturnType<typeof useEnergySystemStore.getState>['accumulators'],
  systemConfig: ReturnType<typeof useEnergySystemStore.getState>['systemConfig'],
  nodes: ReturnType<typeof useEnergySystemStore.getState>['nodes'],
  currentDate: Date,
  solarData: ReturnType<typeof useEnergySystemStore.getState>['solarData']
): AiInsight[] {
  const insights: AiInsight[] = [];
  if (minuteData.length < 10) {
    insights.push({
      id: 'no-data',
      severity: 'info',
      category: 'general',
      title: 'Simulation not started',
      detail: 'Run the simulation to unlock live AI recommendations tailored to your SafariCharge system.',
    });
    return insights;
  }

  const durationHours = Math.max(minuteData.length / 60, 1);
  const currentMonth = new Date(currentDate).getMonth();
  const monthlyPSH = solarData.monthlyAvgKwhPerKwp[currentMonth];
  const irradianceKWhPerM2 = monthlyPSH * (durationHours / 24);
  const totalLoadKWh = minuteData.reduce(
    (s, d) => s + (d.homeLoadKWh ?? 0) + (d.ev1LoadKWh ?? 0) + (d.ev2LoadKWh ?? 0), 0
  );
  const gridImportKWh = minuteData.reduce((s, d) => s + (d.gridImportKWh ?? 0), 0);

  const kpis = computeEngineeringKpis({
    totalSolarKWh: accumulators.solar,
    dcCapacityKWp: systemConfig.solarCapacityKW,
    durationHours,
    totalBatDischargeKWh: accumulators.batDischargeKwh,
    batteryCapacityKWh: systemConfig.batteryCapacityKWh,
    totalLoadKWh,
    gridImportKWh,
    planeIrradianceKWhPerM2: irradianceKWhPerM2 > 0 ? irradianceKWhPerM2 : undefined,
  });

  if (kpis.performanceRatioPct < 70) {
    insights.push({
      id: 'pr-low',
      severity: 'warning',
      category: 'efficiency',
      title: 'Performance ratio below target',
      detail: `PR is ${kpis.performanceRatioPct.toFixed(1)}% (typical Nairobi rooftop is 75 to 85%). Likely causes: panel soiling, shading, or inverter clipping.`,
      metric: `${kpis.performanceRatioPct.toFixed(1)}% PR`,
    });
  } else if (kpis.performanceRatioPct >= 82) {
    insights.push({
      id: 'pr-good',
      severity: 'positive',
      category: 'efficiency',
      title: 'Excellent system performance',
      detail: `PR of ${kpis.performanceRatioPct.toFixed(1)}% is in the top tier for East African rooftop PV. Panels are clean and inverter is well-sized.`,
      metric: `${kpis.performanceRatioPct.toFixed(1)}% PR`,
    });
  }

  if (kpis.selfSufficiencyPct < 50) {
    insights.push({
      id: 'self-suff-low',
      severity: 'warning',
      category: 'grid',
      title: 'High grid dependency',
      detail: `Only ${kpis.selfSufficiencyPct.toFixed(0)}% of load is met by solar and battery. Consider increasing battery capacity or shifting high-load appliances to midday.`,
      metric: `${kpis.selfSufficiencyPct.toFixed(0)}% self-sufficient`,
    });
  } else if (kpis.selfSufficiencyPct >= 80) {
    insights.push({
      id: 'self-suff-high',
      severity: 'positive',
      category: 'solar',
      title: 'Strong energy independence',
      detail: `${kpis.selfSufficiencyPct.toFixed(0)}% of consumption covered by your own generation. Grid is only a backup at this rate.`,
      metric: `${kpis.selfSufficiencyPct.toFixed(0)}% self-sufficient`,
    });
  }

  const batSoc = nodes.battery.soc ?? 50;
  if (batSoc < 15) {
    insights.push({
      id: 'bat-critical',
      severity: 'critical',
      category: 'battery',
      title: 'Battery critically low',
      detail: `Battery SOC is ${batSoc.toFixed(0)}%. Continued discharge below 10% accelerates cell degradation. Grid import is now your primary supply.`,
      metric: `${batSoc.toFixed(0)}% SOC`,
    });
  } else if (batSoc > 95 && nodes.battery.status === 'charging') {
    insights.push({
      id: 'bat-full',
      severity: 'info',
      category: 'battery',
      title: 'Battery near full, excess solar available',
      detail: 'Battery is almost full and solar is still generating. If grid feed-in is enabled, excess energy can earn feed-in tariff revenue.',
      metric: `${batSoc.toFixed(0)}% SOC`,
    });
  }

  if (kpis.batteryCycles > 2) {
    insights.push({
      id: 'bat-cycles',
      severity: 'info',
      category: 'battery',
      title: 'High battery cycle count this session',
      detail: `${kpis.batteryCycles.toFixed(1)} equivalent cycles accumulated. Li-ion is rated 3,000 to 6,000 cycles at 80% DoD. Monitoring cycle accumulation preserves warranty.`,
      metric: `${kpis.batteryCycles.toFixed(2)} cycles`,
    });
  }

  const savingsKes = accumulators.savings;
  const peakRate = systemConfig.gridTariff.peakRate;
  const offPeakRate = systemConfig.gridTariff.offPeakRate;
  const tariffSpread = peakRate - offPeakRate;
  if (tariffSpread > 5 && savingsKes > 0) {
    insights.push({
      id: 'tariff-arbitrage',
      severity: 'info',
      category: 'financial',
      title: 'Tariff arbitrage opportunity',
      detail: `KES ${(peakRate - offPeakRate).toFixed(2)}/kWh spread between peak and off-peak. Charging battery at night and discharging at peak maximises savings.`,
      metric: `KES ${savingsKes.toFixed(0)} saved`,
    });
  }

  if (accumulators.feedInEarnings > 0) {
    insights.push({
      id: 'feed-in',
      severity: 'positive',
      category: 'financial',
      title: 'Grid feed-in revenue active',
      detail: `KES ${accumulators.feedInEarnings.toFixed(0)} earned from exporting surplus solar. KPLC net-metering makes this a real revenue stream at scale.`,
      metric: `KES ${accumulators.feedInEarnings.toFixed(0)} earned`,
    });
  }

  if (accumulators.carbonOffset > 5) {
    insights.push({
      id: 'carbon',
      severity: 'positive',
      category: 'general',
      title: 'Meaningful carbon displacement',
      detail: `${accumulators.carbonOffset.toFixed(1)} kg CO2 avoided this session. At this rate you offset ${(accumulators.carbonOffset * 365 / (durationHours / 24)).toFixed(0)} kg/year, equivalent to planting about ${((accumulators.carbonOffset * 365 / (durationHours / 24)) / 21).toFixed(0)} trees.`,
      metric: `${accumulators.carbonOffset.toFixed(1)} kg CO2`,
    });
  }

  return insights;
}

const SEVERITY_STYLES: Record<InsightSeverity, { bg: string; border: string; icon: string; badge: string }> = {
  positive: {
    bg: 'bg-[var(--battery-soft)]',
    border: 'border-[var(--battery)]/30',
    icon: 'text-[var(--battery)]',
    badge: 'bg-[var(--battery-soft)] text-[var(--battery)] border-[var(--battery)]/30',
  },
  info: {
    bg: 'bg-[var(--consumption-soft)]',
    border: 'border-[var(--consumption)]/30',
    icon: 'text-[var(--consumption)]',
    badge: 'bg-[var(--consumption-soft)] text-[var(--consumption)] border-[var(--consumption)]/30',
  },
  warning: {
    bg: 'bg-[var(--solar-soft)]',
    border: 'border-[var(--solar)]/30',
    icon: 'text-[var(--solar)]',
    badge: 'bg-[var(--solar-soft)] text-[var(--solar)] border-[var(--solar)]/30',
  },
  critical: {
    bg: 'bg-[var(--alert-soft)]',
    border: 'border-[var(--alert)]/30',
    icon: 'text-[var(--alert)]',
    badge: 'bg-[var(--alert-soft)] text-[var(--alert)] border-[var(--alert)]/30',
  },
};

const SEVERITY_ICONS: Record<InsightSeverity, React.ElementType> = {
  positive: CheckCircle,
  info: Info,
  warning: AlertTriangle,
  critical: AlertTriangle,
};

const CATEGORY_ICONS: Record<AiInsight['category'], React.ElementType> = {
  efficiency: Activity,
  financial: DollarSign,
  battery: Battery,
  solar: Sun,
  grid: Zap,
  general: Sparkles,
};

export function AiInsightsPanel() {
  const minuteData   = useEnergySystemStore((s) => s.minuteData);
  const accumulators = useEnergySystemStore((s) => s.accumulators);
  const systemConfig = useEnergySystemStore((s) => s.systemConfig);
  const nodes        = useEnergySystemStore((s) => s.nodes);
  const currentDate  = useEnergySystemStore((s) => s.currentDate);
  const solarData    = useEnergySystemStore((s) => s.solarData);

  const insights = useMemo(
    () => deriveInsights(minuteData, accumulators, systemConfig, nodes, currentDate, solarData),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [minuteData.length, accumulators, systemConfig, nodes, currentDate]
  );

  const criticalCount = insights.filter((i) => i.severity === 'critical').length;
  const warningCount  = insights.filter((i) => i.severity === 'warning').length;
  const positiveCount = insights.filter((i) => i.severity === 'positive').length;

  return (
    <Card className="dashboard-card">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-[var(--text-primary)] text-base">
            <Sparkles className="h-5 w-5 text-[var(--battery)]" />
            AI System Insights
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            {criticalCount > 0 && (
              <Badge variant="outline" className="text-xs border bg-[var(--alert-soft)] text-[var(--alert)] border-[var(--alert)]/30">
                {criticalCount} Critical
              </Badge>
            )}
            {warningCount > 0 && (
              <Badge variant="outline" className="text-xs border bg-[var(--solar-soft)] text-[var(--solar)] border-[var(--solar)]/30">
                {warningCount} Warning{warningCount > 1 ? 's' : ''}
              </Badge>
            )}
            {positiveCount > 0 && (
              <Badge variant="outline" className="text-xs border bg-[var(--battery-soft)] text-[var(--battery)] border-[var(--battery)]/30">
                {positiveCount} Good
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {insights.map((insight) => {
            const styles = SEVERITY_STYLES[insight.severity];
            const SeverityIcon = SEVERITY_ICONS[insight.severity];
            const CategoryIcon = CATEGORY_ICONS[insight.category];
            return (
              <div
                key={insight.id}
                className={`flex items-start gap-3 rounded-xl border p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-glow-md ${styles.bg} ${styles.border}`}
              >
                <div className={`mt-0.5 flex-shrink-0 ${styles.icon}`}>
                  <SeverityIcon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1 flex-wrap">
                    <h4 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                      <CategoryIcon className={`h-3.5 w-3.5 ${styles.icon}`} />
                      {insight.title}
                    </h4>
                    {insight.metric && (
                      <Badge variant="outline" className={`text-[10px] border shrink-0 ${styles.badge}`}>
                        {insight.metric}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{insight.detail}</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
