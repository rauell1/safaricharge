/**
 * PVSizingSection
 *
 * Self-contained PV Sizing Calculator rendered inside the System Configuration page.
 * All sizing logic lives in @/lib/pv-sizing — this component is purely presentational.
 *
 * The "Load into simulator" flow writes to localStorage (SIZING_SIMULATOR_STORAGE_KEY)
 * and navigates to /simulation — identical behaviour to the previous standalone /sizing page.
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

export function PVSizingSection() {
  const router = useRouter();
  const [dailyLoadKwh, setDailyLoadKwh] = useState(10);
  const [county, setCounty] = useState(typedPresets.presets[0]?.county ?? 'Nairobi');
  const [systemType, setSystemType] = useState<SystemType>('on-grid');
  const [performanceRatio, setPerformanceRatio] = useState(0.8);
  const [batteryChemistry, setBatteryChemistry] = useState<BatteryChemistry>('lifepo4');
  const [autonomyDays, setAutonomyDays] = useState(2);
  const [panelWattage, setPanelWattage] = useState(400);

  const selectedPreset = useMemo(
    () => typedPresets.presets.find((p) => p.county === county) ?? typedPresets.presets[0],
    [county]
  );

  const result = useMemo(
    () =>
      computeSizingResult({
        dailyLoadKwh,
        avgDailySunHours: selectedPreset.avgDailySunHours,
        performanceRatio,
        systemType,
        batteryChemistry,
        autonomyDays,
        panelWattage,
      }),
    [dailyLoadKwh, selectedPreset.avgDailySunHours, performanceRatio, systemType, batteryChemistry, autonomyDays, panelWattage]
  );

  const handleLoadIntoSimulator = () => {
    const payload: SimulatorSizingPayload = {
      county: selectedPreset.county,
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
          <Label className={labelCls}>County / Location</Label>
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
        </div>

        <div className={field}>
          <Label className={labelCls}>System Type</Label>
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
              <SelectItem value="300">300 W</SelectItem>
              <SelectItem value="400">400 W</SelectItem>
              <SelectItem value="500">500 W</SelectItem>
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
          {selectedPreset.county} • {selectedPreset.annualYieldKwhPerKwp} kWh/kWp/yr •
          Peak: {selectedPreset.peakMonth} • Low: {selectedPreset.lowMonth}
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

        <p className="text-xs" style={{ color: 'var(--text-tertiary)', paddingTop: '4px' }}>
          Source: {typedPresets.source.name} ({typedPresets.source.url}), accessed{' '}
          {typedPresets.source.accessed}
        </p>
      </div>
    </div>
  );
}
