/**
 * PVSizingSection
 *
 * Self-contained PV Sizing Calculator rendered inside the System Configuration page.
 * All sizing logic lives in @/lib/pv-sizing — this component is purely presentational.
 *
 * The "Load into simulator" flow writes to localStorage (SIZING_SIMULATOR_STORAGE_KEY)
 * and navigates to /simulation — identical behaviour to the previous standalone /sizing page.
 *
 * Label change: "System Type" → "Installation Type"
 *   Rationale: the field only gates battery sizing (off-grid requires battery capacity +
 *   autonomy days; on-grid/hybrid skips it). It is NOT the same as the simulation's
 *   "System Mode" toggle (which controls grid export, net-metering and anti-islanding).
 *   Using distinct labels removes the visual ambiguity spotted in the UI.
 *   The value is still written to SimulatorSizingPayload.systemType and consumed by
 *   the simulation to pre-set System Mode on load.
 */
'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import presetsData from '../../../forecasting/kenya-irradiance-presets.json';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BATTERY_DOD,
  SIZING_SIMULATOR_STORAGE_KEY,
  computeSizingResult,
  type BatteryChemistry,
  type KenyaIrradiancePreset,
  type SimulatorSizingPayload,
  type SystemType,
} from '@/lib/pv-sizing';

type KenyaIrradiancePresetsFile = {
  source: {
    name: string;
    url: string;
    accessed: string;
    notes: string;
  };
  presets: KenyaIrradiancePreset[];
};

const typedPresets = presetsData as KenyaIrradiancePresetsFile;

interface LocationOverride {
  name: string;
  displayName: string;
  county: string;
  latitude: number;
  longitude: number;
  annualAvgSunHours: number;
}

export function PVSizingSection({ locationOverride }: { locationOverride?: LocationOverride }) {
  const router = useRouter();
  const [dailyLoadKwh, setDailyLoadKwh] = useState(10);
  const [county, setCounty] = useState(typedPresets.presets[0]?.county ?? 'Nairobi');
  const [systemType, setSystemType] = useState<SystemType>('on-grid');
  const [performanceRatio, setPerformanceRatio] = useState(0.8);
  const [batteryChemistry, setBatteryChemistry] = useState<BatteryChemistry>('lifepo4');
  const [autonomyDays, setAutonomyDays] = useState(2);
  const [panelWattage, setPanelWattage] = useState(625);

  const selectedPreset = useMemo(
    () => typedPresets.presets.find((p) => p.county === county) ?? typedPresets.presets[0],
    [county]
  );

  const effectiveSunHours = locationOverride?.annualAvgSunHours ?? selectedPreset.avgDailySunHours;
  const derivedAnnualYield = Math.round(effectiveSunHours * 365 * performanceRatio);

  const result = useMemo(
    () =>
      computeSizingResult({
        dailyLoadKwh,
        avgDailySunHours: effectiveSunHours,
        performanceRatio,
        systemType,
        batteryChemistry,
        autonomyDays,
        panelWattage,
      }),
    [dailyLoadKwh, effectiveSunHours, performanceRatio, systemType, batteryChemistry, autonomyDays, panelWattage]
  );

  const handleLoadIntoSimulator = () => {
    const payload: SimulatorSizingPayload = {
      county: locationOverride ? locationOverride.name : selectedPreset.county,
      // systemType is passed through so the simulation can pre-set its System Mode
      systemType,
      panelWattage,
      requiredPvCapacityKw: result.requiredPvCapacityKw,
      panelCount: result.suggestedPanelCount,
      batteryCapacityKwh: result.requiredBatteryCapacityKwh,
      performanceRatio,
      dailyLoadKwh,
    };
    localStorage.setItem(SIZING_SIMULATOR_STORAGE_KEY, JSON.stringify(payload));
    router.push('/simulation');
  };

  const field = 'space-y-1.5';
  const labelCls = 'text-xs font-medium text-[var(--text-secondary)]';
  const hintCls = 'text-[10px] text-[var(--text-tertiary)] mt-0.5';

  return (
    <div className="space-y-6">
      {/* ── Inputs ─────────────────────────────────────────────────────── */}
      <div
        className="grid gap-4 sm:grid-cols-2"
        style={{
          background: 'var(--bg-card-muted)',
          border: '1px solid var(--border)',
          borderRadius: '10px',
          padding: '16px',
        }}
      >
        <div className={field}>
          <Label className={labelCls}>Daily Energy Consumption (kWh/day)</Label>
          <Input
            type="number"
            min={0}
            step={0.1}
            value={dailyLoadKwh}
            onChange={(e) => setDailyLoadKwh(Number(e.target.value || 0))}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
            }}
          />
        </div>

        <div className={field}>
          <Label className={labelCls}>Location</Label>
          {locationOverride ? (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 12px', color: 'var(--text-primary)', fontSize: 13 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 600 }}>{locationOverride.displayName}</span>
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{locationOverride.annualAvgSunHours} PSH/day</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
                {locationOverride.county} · {locationOverride.latitude.toFixed(4)}°, {locationOverride.longitude.toFixed(4)}°
              </div>
            </div>
          ) : (
            <Select value={county} onValueChange={setCounty}>
              <SelectTrigger style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                <SelectValue placeholder="Select county" />
              </SelectTrigger>
              <SelectContent>
                {typedPresets.presets.map((preset) => (
                  <SelectItem key={preset.county} value={preset.county}>
                    {preset.county} ({preset.avgDailySunHours.toFixed(1)} sun-hrs/day)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/*
          ── Installation Type ──────────────────────────────────────────
          Renamed from "System Type" to avoid confusion with the simulation's
          "System Mode" toggle (On-Grid / Off-Grid / Hybrid) which appears
          further down the page and controls grid export & anti-islanding.

          This field's only effect on sizing:
            • off-grid  → battery capacity + autonomy days are required
            • on-grid   → no battery sizing; payback uses grid savings
            • hybrid    → no battery sizing in this calculator (battery
                          is sized separately in the simulation config)

          When "Load into simulator" is clicked, this value pre-sets the
          simulation's System Mode so both controls stay in sync.
        */}
        <div className={field}>
          <Label className={labelCls}>Installation Type</Label>
          <Select value={systemType} onValueChange={(v) => setSystemType(v as SystemType)}>
            <SelectTrigger style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="on-grid">On-Grid</SelectItem>
              <SelectItem value="off-grid">Off-Grid</SelectItem>
              <SelectItem value="hybrid">Hybrid</SelectItem>
            </SelectContent>
          </Select>
          <p className={hintCls}>
            Determines whether battery storage is required for sizing.
            Sets the simulation's System Mode when loaded.
          </p>
        </div>

        <div className={field}>
          <Label className={labelCls}>Performance Ratio</Label>
          <Input
            type="number"
            min={0.1}
            max={1}
            step={0.01}
            value={performanceRatio}
            onChange={(e) => setPerformanceRatio(Number(e.target.value || 0.8))}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
            }}
          />
        </div>

        <div className={field}>
          <Label className={labelCls}>Panel Wattage</Label>
          <Select value={String(panelWattage)} onValueChange={(v) => setPanelWattage(Number(v))}>
            <SelectTrigger style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="400">400 W — Generic mono-Si</SelectItem>
              <SelectItem value="500">500 W — Generic mono-Si</SelectItem>
              <SelectItem value="575">575 W — Jinko Tiger Neo 72HL4-BDV</SelectItem>
              <SelectItem value="590">590 W — Jinko Tiger Neo 72HL4-BDV</SelectItem>
              <SelectItem value="600">600 W — Jinko Tiger Neo 72HL4-BDV</SelectItem>
              <SelectItem value="605">605 W — Jinko Tiger Neo 66HL4M-BDV</SelectItem>
              <SelectItem value="615">615 W — Jinko Tiger Neo 66HL4M-BDV</SelectItem>
              <SelectItem value="620">620 W — Jinko Tiger Neo 66HL4M-BDV</SelectItem>
              <SelectItem value="625">625 W — Jinko Tiger Neo 66HL4M-BDV</SelectItem>
              <SelectItem value="630">630 W — Jinko Tiger Neo 66HL4M-BDV</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className={field}>
          <Label className={labelCls}>Battery Chemistry</Label>
          <Select
            value={batteryChemistry}
            onValueChange={(v) => setBatteryChemistry(v as BatteryChemistry)}
            disabled={systemType !== 'off-grid'}
          >
            <SelectTrigger style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="lead-acid">Lead-Acid (50% DoD)</SelectItem>
              <SelectItem value="lifepo4">LiFePO₄ (80% DoD)</SelectItem>
              <SelectItem value="agm">AGM (60% DoD)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="sm:col-span-2">
          <Label className={labelCls}>Days of Autonomy</Label>
          <Input
            type="number"
            min={1}
            max={5}
            step={1}
            value={autonomyDays}
            disabled={systemType !== 'off-grid'}
            onChange={(e) =>
              setAutonomyDays(Math.min(5, Math.max(1, Number(e.target.value || 1))))
            }
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
              marginTop: '6px',
            }}
          />
        </div>
      </div>

      {/* ── Results ────────────────────────────────────────────────────── */}
      <div
        className="space-y-2 text-sm"
        style={{
          background: 'var(--bg-card-muted)',
          border: '1px solid var(--border)',
          borderRadius: '10px',
          padding: '16px',
          color: 'var(--text-secondary)',
        }}
      >
        <p>
          <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Required PV capacity:</span>{' '}
          {result.requiredPvCapacityKw.toFixed(2)} kW
        </p>
        <p>
          <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Suggested panels:</span>{' '}
          {result.suggestedPanelCount} × {panelWattage} W
          {panelWattage >= 575 && (
            <span style={{ fontSize: '0.75rem', color: 'var(--battery)', marginLeft: 6 }}>
              N-type TOPCon · bifacial · −0.29 %/°C · 0.40 %/yr
            </span>
          )}
        </p>
        <p>
          <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Required battery capacity:</span>{' '}
          {result.requiredBatteryCapacityKwh === null
            ? 'N/A (on-grid / hybrid)'
            : `${result.requiredBatteryCapacityKwh.toFixed(2)} kWh`}
        </p>
        <p>
          <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Est. monthly generation:</span>{' '}
          {result.estimatedMonthlyGenerationKwh.toFixed(1)} kWh
        </p>
        <p>
          <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Simple payback:</span>{' '}
          {Number.isFinite(result.simplePaybackYears)
            ? `${result.simplePaybackYears.toFixed(1)} years`
            : 'Not applicable'}
        </p>
        <p>
          <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Solar profile:</span>{' '}
          {locationOverride
            ? `${locationOverride.displayName} • ~${derivedAnnualYield} kWh/kWp/yr`
            : `${selectedPreset.county} • ${selectedPreset.annualYieldKwhPerKwp} kWh/kWp/yr • Peak: ${selectedPreset.peakMonth} • Low: ${selectedPreset.lowMonth}`}
        </p>
        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          Battery DoD reference: {Math.round(BATTERY_DOD[batteryChemistry] * 100)}%
        </p>

        <div className="flex flex-wrap gap-2 pt-3">
          <Button
            onClick={handleLoadIntoSimulator}
            style={{
              background: 'var(--battery)',
              color: '#fff',
              border: 'none',
            }}
          >
            Load into simulator
          </Button>
          <Button
            variant="outline"
            onClick={() => window.print()}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
            }}
          >
            Print / Save as PDF
          </Button>
        </div>

        {locationOverride ? (
          <p className="text-xs" style={{ color: 'var(--text-tertiary)', paddingTop: '4px' }}>
            Solar data: Africa Cities database · {locationOverride.county} · {locationOverride.annualAvgSunHours} peak sun-hours/day
          </p>
        ) : (
          <p className="text-xs" style={{ color: 'var(--text-tertiary)', paddingTop: '4px' }}>
            Source: {typedPresets.source.name} ({typedPresets.source.url}), accessed{' '}
            {typedPresets.source.accessed}
          </p>
        )}
      </div>
    </div>
  );
}
