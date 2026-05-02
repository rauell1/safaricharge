'use client';

import React from 'react';
import { Home, Zap, Leaf, Sun, Info, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface SocialImpactCardProps {
  householdsPowered: number;
  keroseneDisplacedLiters: number;
  co2AvoidedKg: number;
  annualSolarGeneratedKwh: number;
  countyName: string;
  countyNote: string;
  countyElectrificationRatePct?: number | null;
  isKosapTarget: boolean;
}

const formatValue = (value: number, digits = 0) =>
  Number.isFinite(value) ? value.toLocaleString('en-KE', { maximumFractionDigits: digits }) : '0';

export function SocialImpactCard({
  householdsPowered,
  keroseneDisplacedLiters,
  co2AvoidedKg,
  annualSolarGeneratedKwh,
  countyName,
  countyNote,
  countyElectrificationRatePct,
  isKosapTarget,
}: SocialImpactCardProps) {
  return (
    <TooltipProvider delayDuration={180}>
      <Card className="border-[var(--border)] bg-[var(--bg-card)] shadow-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex flex-wrap items-center gap-2 text-[var(--text-primary)]">
            <Sun className="h-5 w-5 text-[var(--solar)]" />
            Kenya Social Impact
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="inline-flex" aria-label="Learn more about Kenya solar context">
                  <Info className="h-4 w-4 text-[var(--text-tertiary)]" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-xs">
                Kenya receives around 4–6 kWh/m²/day in most regions, often higher than many temperate markets, improving solar economics.
                <a className="ml-1 underline" href="https://globalsolaratlas.info/" target="_blank" rel="noreferrer">Global Solar Atlas</a>
              </TooltipContent>
            </Tooltip>
            <Badge className="ml-auto border border-[var(--border)] bg-[var(--bg-card-muted)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-muted)]">
              Indicative impact estimates
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <MetricTile
              icon={<Home className="h-4 w-4 text-[var(--solar)]" />}
              label="Equivalent households powered"
              value={formatValue(householdsPowered, 1)}
              unit="households/year"
              sourceLabel="~100 kWh/month (1,200 kWh/year) baseline and 79% national electrification context (World Bank, 2024)."
              sourceHref="https://www.worldbank.org/en/country/kenya/overview"
            />
            <MetricTile
              icon={<Zap className="h-4 w-4 text-[var(--warning)]" />}
              label="Kerosene displaced"
              value={formatValue(keroseneDisplacedLiters)}
              unit="L/year avoided"
              sourceLabel="Indicative lighting displacement factor: 0.8 L per kWh equivalent, aligned with PAYGo solar displacement context (M-KOPA, 2024)."
              sourceHref="https://www.m-kopa.com/impact"
            />
            <MetricTile
              icon={<Leaf className="h-4 w-4 text-[var(--battery)]" />}
              label="CO₂ avoided"
              value={formatValue(co2AvoidedKg)}
              unit="kg/year"
              sourceLabel="Indicative factor: 0.4 kg CO₂/kWh for diesel backup displacement in Kenya context (EPRA, 2025)."
              sourceHref="https://www.epra.go.ke/"
            />
            <MetricTile
              icon={<TrendingUp className="h-4 w-4 text-[var(--success)]" />}
              label="Estimated income uplift reference"
              value="77%"
              unit="reported uplift"
              sourceLabel="M-KOPA reports 77% of Kenyan customers saw higher incomes after acquiring solar-enabled devices (M-KOPA, 2024)."
              sourceHref="https://www.m-kopa.com/impact"
            />
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card-muted)] p-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-[var(--text-primary)]">{countyName} context:</span>
              <span className="text-[var(--text-secondary)]">{countyNote}</span>
              {isKosapTarget && (
                <Badge variant="secondary" className="border border-[var(--border)] bg-[var(--warning-soft)] text-[var(--text-primary)]">
                  KOSAP target county
                </Badge>
              )}
              {countyElectrificationRatePct != null && (
                <span className="text-xs text-[var(--text-tertiary)]">
                  County electrification: {countyElectrificationRatePct.toFixed(0)}%
                </span>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card-muted)] p-3 text-xs text-[var(--text-secondary)]">
            <div className="flex items-start gap-2">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--warning)]" />
              <div className="space-y-1">
                <p>
                  Kenya&apos;s electrification rate reached 79% by 2023, up from ~25% a decade ago
                  {' '}(
                  <a className="underline" href="https://www.worldbank.org/en/country/kenya/overview" target="_blank" rel="noreferrer">World Bank, 2024</a>
                  ).
                </p>
                <p>
                  Renewables supply over 81% of Kenya&apos;s generation mix (
                  <a className="underline" href="https://www.epra.go.ke/" target="_blank" rel="noreferrer">EPRA, 2025</a>
                  ) while off-grid programs like KOSAP continue extending access.
                </p>
                <p className="font-medium text-[var(--text-primary)]">
                  Annual solar generation used in this estimate: {formatValue(annualSolarGeneratedKwh)} kWh/year.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}

function MetricTile({
  icon,
  label,
  value,
  unit,
  sourceLabel,
  sourceHref,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit: string;
  sourceLabel: string;
  sourceHref?: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-3">
      <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)]">
        {icon}
        <span>{label}</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" className="ml-auto inline-flex" aria-label={`Source for ${label}`}>
              <Info className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs text-xs">
            {sourceLabel}
            {sourceHref ? (
              <>
                {' '}
                <a className="underline" href={sourceHref} target="_blank" rel="noreferrer">Source</a>
              </>
            ) : null}
          </TooltipContent>
        </Tooltip>
      </div>
      <div className="text-xl font-bold text-[var(--text-primary)]">{value}</div>
      <div className="text-xs text-[var(--text-tertiary)]">{unit}</div>
    </div>
  );
}
