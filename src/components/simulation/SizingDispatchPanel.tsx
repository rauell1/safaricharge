'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { ExternalLink, Zap, TrendingUp, Sun, Cable, AlertTriangle, Package, DollarSign } from 'lucide-react';
import { useEnergySystemStore } from '@/stores/energySystemStore';
import { useSizingCatalog } from '@/hooks/useSizingCatalog';
import { runSimulation } from '@/lib/sizing/solarCalculator';
import type { SimulationInputs } from '@/lib/sizing/solarCalculator';
import type { SizingCatalog } from '@/lib/sizing/catalogTypes';
import { SOLAR_LOCATIONS, LOAD_PROFILES, PROJECT_PRESETS, KSH_PER_USD } from '@/lib/sizing/mockData';

// ─── Bridge: store config → SimulationInputs ────────────────────────────────

export function buildInputs(
  systemConfig: {
    solarCapacityKW: number;
    batteryCapacityKWh: number;
    inverterKW: number;
    gridOutageEnabled: boolean;
    loadProfile?: 'residential' | 'commercial' | 'industrial' | 'fleet-depot';
  },
  locationName: string,
  catalog: SizingCatalog,
): SimulationInputs {
  const location =
    SOLAR_LOCATIONS.find(
      (l) => l.name.toLowerCase() === locationName.toLowerCase(),
    ) ?? SOLAR_LOCATIONS[0];

  const profileMap: Record<string, string> = {
    residential: 'profile-residential-med',
    commercial: 'profile-commercial-clinic',
    industrial: 'profile-industrial-light',
    'fleet-depot': 'profile-eco-lodge',
  };
  const loadProfile =
    LOAD_PROFILES.find(
      (l) => l.id === (profileMap[systemConfig.loadProfile ?? 'residential'] ?? 'profile-residential-med'),
    ) ?? LOAD_PROFILES[0];

  const panel = catalog.panels.find((p) => p.wattage === 580) ?? catalog.panels[0];
  const panelQty = Math.max(1, Math.round((systemConfig.solarCapacityKW * 1000) / (panel.wattage ?? 580)));

  const hybridInverters = catalog.inverters.filter((i) => i.category === 'hybrid');
  const inverter = hybridInverters.reduce((best, i) => {
    const di = Math.abs(i.ratedAcW / 1000 - systemConfig.inverterKW);
    const db = Math.abs(best.ratedAcW / 1000 - systemConfig.inverterKW);
    return di < db ? i : best;
  }, hybridInverters[0]);

  const battKWh = systemConfig.batteryCapacityKWh;
  const dynessProductLine: 'Stack100' | 'Stack280' | 'LV48' =
    battKWh <= 51.2 ? 'LV48' : battKWh <= 200 ? 'Stack100' : 'Stack280';
  const battery =
    dynessProductLine === 'LV48'
      ? (catalog.batteries.find((b) => b.category === 'lv48') ?? catalog.batteries[0])
      : dynessProductLine === 'Stack100'
      ? (catalog.batteries.find((b) => b.category === 'hv_stack100') ?? catalog.batteries[0])
      : (catalog.batteries.find((b) => b.category === 'hv_stack280') ?? catalog.batteries[0]);
  const batteryQty = Math.max(1, Math.round(battKWh / (battery.moduleKwh ?? 5.12)));

  return {
    location,
    loadProfile,
    loadMultiplier: 1.0,
    systemArchitecture: 'central_inverter',
    panelId: panel.id,
    panelQty,
    inverterId: inverter.id,
    inverterQty: 1,
    batteryId: battery.id,
    batteryQty,
    dcAcOversizeRatio: 1.3,
    targetBatteryKWh: battKWh,
    dynessProductLine,
    panelsPerString: 7,
    microPanelId: catalog.panels[0]?.id ?? '',
    microInverterId: catalog.inverters.find((i) => i.category === 'microinverter')?.id ?? '',
    microTargetSystemKW: 5,
    installationMethod: 'clipped_direct',
    ambientTempC: 30,
    minDesignAmbientTempC: 10,
    contingencyPercent: 5,
    epcMarginPercent: 18,
    specificYieldKWhPerKWpDay: 4.3,
    selfConsumptionRatioPercent: 85,
    gridTariffKShPerKWh: location.gridTariffKSh,
    tariffEscalationPercent: 6,
    panelDegradationPercent: 0.5,
    annualOMCostPercent: 1.5,
    omEscalationPercent: 5,
    batteryReplacementYear: 11,
    batteryReplacementCostPercent: 60,
    discountRate: 12,
    inflationRate: 5.5,
    projectLifeYears: 25,
    useTOUTariff: false,
    kplcCustomerSegment: 'Residential',
    tariffStructure: 'Standard',
    monthlyConsumptionKWh: 1000,
    debtFractionPercent: 0,
    loanInterestRatePercent: 15,
    loanTermYears: 5,
    includeGeneratorInterface: !!systemConfig.gridOutageEnabled,
    includeWeatherproofEnclosure: true,
    includeKPLCapplication: false,
    includeOandM: true,
  };
}

// ─── Compact 24-hour dispatch SVG ────────────────────────────────────────────

function DispatchChart({
  rows,
}: {
  rows: import('@/lib/sizing/types').HourlyIllustrativeRow[];
}) {
  const W = 560;
  const H = 140;
  const padL = 30;
  const padR = 8;
  const padT = 8;
  const padB = 22;
  const cW = W - padL - padR;
  const cH = H - padT - padB;

  const solar = rows.map((r) => r.solarKW);
  const load = rows.map((r) => r.loadKW);
  const gridImp = rows.map((r) => Math.max(0, r.gridImportKW));
  const soc = rows.map((r) => r.batterySoCAfter);

  const maxPow = Math.max(...solar, ...load, 1);

  const px = (i: number) => padL + (i / 23) * cW;
  const py = (v: number, max: number) => padT + cH - (v / max) * cH;
  const socPy = (v: number) => padT + cH - (v / 100) * cH;

  const toLine = (vals: number[], max: number) =>
    vals.map((v, i) => `${i === 0 ? 'M' : 'L'}${px(i).toFixed(1)},${py(v, max).toFixed(1)}`).join(' ');

  const toArea = (vals: number[], max: number) => {
    const top = toLine(vals, max);
    return `${top} L${px(23).toFixed(1)},${(padT + cH).toFixed(1)} L${px(0).toFixed(1)},${(padT + cH).toFixed(1)} Z`;
  };

  const hourLabels = [0, 6, 12, 18, 23];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[280px]" aria-label="24-hour dispatch chart">
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <line
          key={f}
          x1={padL}
          x2={W - padR}
          y1={padT + cH * (1 - f)}
          y2={padT + cH * (1 - f)}
          stroke="var(--border)"
          strokeWidth={0.5}
          strokeDasharray="3 3"
        />
      ))}
      <path d={toArea(gridImp, maxPow)} fill="rgba(59,130,246,0.12)" />
      <path d={toArea(solar, maxPow)} fill="rgba(251,191,36,0.12)" />
      <path d={toLine(gridImp, maxPow)} fill="none" stroke="#3b82f6" strokeWidth={1.5} />
      <path d={toLine(solar, maxPow)} fill="none" stroke="#fbbf24" strokeWidth={2} />
      <path d={toLine(load, maxPow)} fill="none" stroke="#f87171" strokeWidth={1.5} strokeDasharray="5 3" />
      <path d={soc.map((v, i) => `${i === 0 ? 'M' : 'L'}${px(i).toFixed(1)},${socPy(v).toFixed(1)}`).join(' ')} fill="none" stroke="#34d399" strokeWidth={1.5} strokeDasharray="2 2" />
      {hourLabels.map((h) => (
        <text key={h} x={px(h)} y={H - 4} textAnchor="middle" fontSize={9} fill="var(--text-tertiary)" fontFamily="monospace">
          {String(h).padStart(2, '0')}h
        </text>
      ))}
      <text x={padL - 4} y={padT + cH / 2} textAnchor="end" fontSize={9} fill="var(--text-tertiary)" fontFamily="monospace">
        {maxPow.toFixed(0)}kW
      </text>
    </svg>
  );
}

// ─── KPI chip ────────────────────────────────────────────────────────────────

function KpiChip({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2.5 space-y-1">
      <div className="flex items-center gap-1.5">
        <Icon className={`h-3.5 w-3.5 ${color}`} />
        <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">{label}</span>
      </div>
      <div className={`text-base font-black tabular-nums ${color}`}>{value}</div>
    </div>
  );
}

// ─── Hardware row ─────────────────────────────────────────────────────────────

function HardwareRow({
  label,
  description,
  qty,
  unit,
  totalKSh,
}: {
  label: string;
  description: string;
  qty: number;
  unit: string;
  totalKSh: number;
}) {
  return (
    <div className="grid grid-cols-[auto_1fr_auto_auto] gap-x-3 items-center rounded-lg bg-[var(--bg-card-muted)] px-3 py-2">
      <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-tertiary)] w-14 shrink-0">{label}</span>
      <span className="text-xs text-[var(--text-primary)] truncate">{description}</span>
      <span className="text-[11px] text-[var(--text-tertiary)] tabular-nums whitespace-nowrap">×{qty} {unit}</span>
      <span className="text-[11px] font-bold text-[var(--text-primary)] tabular-nums whitespace-nowrap text-right">
        KSh {totalKSh.toLocaleString()}
      </span>
    </div>
  );
}

// ─── Main panel ──────────────────────────────────────────────────────────────

export function SizingDispatchPanel() {
  const systemConfig = useEnergySystemStore((s) => s.systemConfig);
  const activeLocation = useEnergySystemStore((s) => s.activeLocation);
  const { catalog } = useSizingCatalog();

  const inputs = useMemo(
    () => (catalog ? buildInputs(systemConfig, activeLocation.name, catalog) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      systemConfig.solarCapacityKW,
      systemConfig.batteryCapacityKWh,
      systemConfig.inverterKW,
      systemConfig.gridOutageEnabled,
      systemConfig.loadProfile,
      activeLocation.name,
      catalog,
    ],
  );

  const results = useMemo(() => {
    if (!inputs || !catalog) return null;
    try {
      return runSimulation(inputs, catalog);
    } catch {
      return null;
    }
  }, [inputs, catalog]);

  if (!results) {
    return (
      <div className="py-6 text-center text-sm text-[var(--text-tertiary)]">
        Parametric analysis unavailable for current config.
      </div>
    );
  }

  const {
    hourlyProfile,
    solarCapacityKWp,
    batteryCapacityKWh: battKWh,
    annualPVGeneratedKWh,
    systemAutonomyPercent,
    simplePaybackYears,
    lcoeUSDPerKWh,
    cableSizingResults,
    totalCapExKSh,
    subtotalCapExKSh,
    contingencyKSh,
    epcMarginKSh,
    npvUSD,
    irrPercent,
    annualSavingsUSD,
    bomLineItems,
    pvOversizeWarning,
    batteryVoltageWarning,
  } = results;

  // All monetary display in KSh
  const npvKSh = Math.round(npvUSD * KSH_PER_USD);
  const annualSavingsKSh = Math.round(annualSavingsUSD * KSH_PER_USD);
  const lcoeKSh = (lcoeUSDPerKWh * KSH_PER_USD).toFixed(1);

  const payback = simplePaybackYears > 0 && simplePaybackYears < 99
    ? `${simplePaybackYears.toFixed(1)} yr`
    : ' - ';

  // Pull the three main hardware products from the BOM
  const pvRow    = bomLineItems.find(b => b.section === '1. Solar PV Modules');
  const battRow  = bomLineItems.find(b => b.section === '2. Energy Storage' && b.itemNumber === '2');
  const invRow   = bomLineItems.find(b => b.section === '3. Inverter & Monitoring' && b.itemNumber === '6');
  const bosKSh   = totalCapExKSh - (pvRow?.totalKSh ?? 0) - (battRow?.totalKSh ?? 0) - (invRow?.totalKSh ?? 0);

  return (
    <div className="space-y-4 py-2">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Parametric Dispatch Analysis
          </h3>
          <p className="text-xs text-[var(--text-tertiary)]">
            {solarCapacityKWp.toFixed(1)} kWp · {battKWh.toFixed(1)} kWh · {activeLocation.displayName} · 24-hour theoretical dispatch
          </p>
        </div>
        <Link
          href="/sizing"
          className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--battery)] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 transition-opacity"
        >
          Full Analysis
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>

      {/* Engineering validation warnings */}
      {(pvOversizeWarning || batteryVoltageWarning) && (
        <div className="space-y-2">
          {pvOversizeWarning && (
            <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>{pvOversizeWarning}</span>
            </div>
          )}
          {batteryVoltageWarning && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>{batteryVoltageWarning}</span>
            </div>
          )}
        </div>
      )}

      {/* KPI chips */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        <KpiChip icon={Sun} label="Solar / yr" value={`${(annualPVGeneratedKWh / 1000).toFixed(1)} MWh`} color="text-amber-400" />
        <KpiChip icon={Zap} label="Self-Suff." value={`${systemAutonomyPercent.toFixed(0)}%`} color="text-emerald-400" />
        <KpiChip icon={TrendingUp} label="Payback" value={payback} color="text-sky-400" />
        <KpiChip icon={TrendingUp} label="IRR" value={`${irrPercent.toFixed(1)}%`} color="text-violet-400" />
        <KpiChip icon={DollarSign} label="LCOE" value={`${lcoeKSh} KSh/kWh`} color="text-orange-400" />
        <KpiChip icon={TrendingUp} label="25yr NPV" value={`KSh ${(npvKSh / 1_000_000).toFixed(2)} M`} color={npvKSh >= 0 ? 'text-emerald-400' : 'text-red-400'} />
      </div>

      {/* 24h dispatch chart */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-3 overflow-x-auto">
        <div className="flex flex-wrap items-center gap-3 mb-2 text-[10px] text-[var(--text-tertiary)]">
          <span className="flex items-center gap-1"><span className="inline-block w-2 h-0.5 rounded bg-amber-400" /> Solar</span>
          <span className="flex items-center gap-1"><span className="inline-block w-3 border-t border-dashed border-red-400" /> Load</span>
          <span className="flex items-center gap-1"><span className="inline-block w-2 h-0.5 rounded bg-blue-400" /> Grid import</span>
          <span className="flex items-center gap-1"><span className="inline-block w-3 border-t border-dotted border-emerald-400" /> Batt SoC %</span>
        </div>
        <DispatchChart rows={hourlyProfile} />
      </div>

      {/* Hardware BOM -  main products */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-3">
        <div className="flex items-center gap-1.5 mb-2.5">
          <Package className="h-3.5 w-3.5 text-[var(--solar)]" />
          <span className="text-xs font-semibold text-[var(--text-secondary)]">Bill of Materials -  Main Equipment</span>
        </div>
        <div className="space-y-1.5">
          {pvRow && (
            <HardwareRow
              label="PV"
              description={pvRow.description}
              qty={pvRow.qty}
              unit="pcs"
              totalKSh={pvRow.totalKSh}
            />
          )}
          {battRow && (
            <HardwareRow
              label="Battery"
              description={battRow.description}
              qty={battRow.qty}
              unit="pcs"
              totalKSh={battRow.totalKSh}
            />
          )}
          {invRow && (
            <HardwareRow
              label="Inverter"
              description={invRow.description}
              qty={invRow.qty}
              unit="pcs"
              totalKSh={invRow.totalKSh}
            />
          )}
          {/* BOS + install + contingency + EPC */}
          <div className="grid grid-cols-[auto_1fr_auto_auto] gap-x-3 items-center rounded-lg bg-[var(--bg-card-muted)] px-3 py-2">
            <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-tertiary)] w-14 shrink-0">BOS & Inst</span>
            <span className="text-xs text-[var(--text-tertiary)]">Cables · Mounting · Protection · Labour</span>
            <span className="text-[11px] text-[var(--text-tertiary)]" />
            <span className="text-[11px] font-bold text-[var(--text-primary)] tabular-nums text-right">
              KSh {Math.max(0, bosKSh).toLocaleString()}
            </span>
          </div>
          {/* Subtotal / contingency / EPC / VAT strip */}
          <div className="mt-2 border-t border-[var(--border)] pt-2 space-y-1">
            <div className="flex justify-between text-[10px] text-[var(--text-tertiary)]">
              <span>Subtotal (before VAT)</span>
              <span className="tabular-nums">KSh {subtotalCapExKSh.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-[10px] text-[var(--text-tertiary)]">
              <span>Contingency (5%)</span>
              <span className="tabular-nums">KSh {contingencyKSh.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-[10px] text-[var(--text-tertiary)]">
              <span>EPC Margin (18%)</span>
              <span className="tabular-nums">KSh {epcMarginKSh.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-[10px] text-[var(--text-tertiary)]">
              <span>VAT (16%)</span>
              <span className="tabular-nums">KSh {results.vatKSh.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs font-bold text-[var(--text-primary)] border-t border-[var(--border)] pt-1 mt-1">
              <span>Grand Total (incl. VAT)</span>
              <span className="tabular-nums">KSh {totalCapExKSh.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Financial summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2.5">
          <div className="text-[var(--text-tertiary)] mb-0.5">Total CapEx</div>
          <div className="font-bold text-[var(--text-primary)] tabular-nums">KSh {(totalCapExKSh / 1_000_000).toFixed(2)} M</div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2.5">
          <div className="text-[var(--text-tertiary)] mb-0.5">Annual Savings</div>
          <div className="font-bold text-emerald-400 tabular-nums">KSh {annualSavingsKSh.toLocaleString()}</div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2.5">
          <div className="text-[var(--text-tertiary)] mb-0.5">25-yr NPV</div>
          <div className={`font-bold tabular-nums ${npvKSh >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            KSh {npvKSh >= 0 ? '+' : ''}{(npvKSh / 1_000_000).toFixed(2)} M
          </div>
        </div>
      </div>

      {/* Cable sizing */}
      {cableSizingResults.length > 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-3">
          <div className="flex items-center gap-1.5 mb-2.5">
            <Cable className="h-3.5 w-3.5 text-[var(--grid)]" />
            <span className="text-xs font-semibold text-[var(--text-secondary)]">IEC 60364-5-52 Cable Sizing</span>
          </div>
          <div className="space-y-1">
            {cableSizingResults.slice(0, 4).map((c) => (
              <div
                key={c.circuit}
                className="grid grid-cols-[1fr_auto_auto_auto] gap-2 text-[11px] rounded-lg bg-[var(--bg-card-muted)] px-3 py-1.5 items-center"
              >
                <span className="text-[var(--text-secondary)] truncate">{c.circuit}</span>
                <span className="font-bold text-[var(--text-primary)] tabular-nums">{c.recommendedSizeMM2} mm²</span>
                {c.parallelRuns > 1 && (
                  <span className="text-[var(--text-tertiary)]">×{c.parallelRuns}</span>
                )}
                <span className="text-[var(--text-tertiary)] tabular-nums">{c.designCurrentA.toFixed(0)} A</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Project presets */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)] mb-2">
          Open a sample project in the Sizing Engine
        </p>
        <div className="flex flex-wrap gap-2">
          {PROJECT_PRESETS.map((p) => (
            <Link
              key={p.name}
              href="/sizing"
              className="rounded-lg border border-[var(--border)] bg-[var(--bg-card-muted)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--text-secondary)] hover:border-[var(--battery)] hover:text-[var(--battery)] transition-colors"
            >
              {p.name.split(' ').slice(0, 3).join(' ')} →
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
