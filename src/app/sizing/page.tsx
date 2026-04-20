'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import presetsData from '../../../forecasting/kenya-irradiance-presets.json';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { PageContainer, SectionHeader, ContentGrid } from '@/components/layout/PageContainer';

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

export default function SizingPage() {
  const router = useRouter();
  const [dailyLoadKwh, setDailyLoadKwh] = useState(10);
  const [county, setCounty] = useState(typedPresets.presets[0]?.county ?? 'Nairobi');
  const [systemType, setSystemType] = useState<SystemType>('on-grid');
  const [performanceRatio, setPerformanceRatio] = useState(0.8);
  const [batteryChemistry, setBatteryChemistry] = useState<BatteryChemistry>('lifepo4');
  const [autonomyDays, setAutonomyDays] = useState(2);
  const [panelWattage, setPanelWattage] = useState(400);

  const selectedPreset = useMemo(
    () => typedPresets.presets.find((preset) => preset.county === county) ?? typedPresets.presets[0],
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

  return (
    <PageContainer maxWidth="xl" padding="lg">
      <div className="space-y-8">
        <SectionHeader
          title="PV Sizing Calculator"
          description="Kenya county irradiance presets. Estimate system capacity and load a scenario into the simulator."
        />
        <ContentGrid columns={2} gap="lg">
          <Card className="dashboard-card">
          <CardHeader>
            <CardTitle>System Inputs</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Daily Energy Consumption (kWh/day)</Label>
              <Input type="number" min={0} step={0.1} value={dailyLoadKwh} onChange={(e) => setDailyLoadKwh(Number(e.target.value || 0))} />
            </div>

            <div className="space-y-2">
              <Label>County / Location</Label>
              <Select value={county} onValueChange={setCounty}>
                <SelectTrigger>
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

            <div className="space-y-2">
              <Label>System Type</Label>
              <Select value={systemType} onValueChange={(value) => setSystemType(value as SystemType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="on-grid">On-Grid</SelectItem>
                  <SelectItem value="off-grid">Off-Grid</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Performance Ratio</Label>
              <Input type="number" min={0.1} max={1} step={0.01} value={performanceRatio} onChange={(e) => setPerformanceRatio(Number(e.target.value || 0.8))} />
            </div>

            <div className="space-y-2">
              <Label>Panel Wattage</Label>
              <Select value={String(panelWattage)} onValueChange={(value) => setPanelWattage(Number(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="300">300W</SelectItem>
                  <SelectItem value="400">400W</SelectItem>
                  <SelectItem value="500">500W</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Battery Chemistry</Label>
              <Select value={batteryChemistry} onValueChange={(value) => setBatteryChemistry(value as BatteryChemistry)} disabled={systemType !== 'off-grid'}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lead-acid">Lead-Acid (50% DoD)</SelectItem>
                  <SelectItem value="lifepo4">LiFePO₄ (80% DoD)</SelectItem>
                  <SelectItem value="agm">AGM (60% DoD)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Days of Autonomy</Label>
              <Input type="number" min={1} max={5} step={1} value={autonomyDays} onChange={(e) => setAutonomyDays(Math.min(5, Math.max(1, Number(e.target.value || 1))))} disabled={systemType !== 'off-grid'} />
            </div>
          </CardContent>
        </Card>

        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle>Sizing Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-[var(--text-secondary)]">
            <p><span className="font-semibold text-[var(--text-primary)]">Required PV capacity:</span> {result.requiredPvCapacityKw.toFixed(2)} kW</p>
            <p><span className="font-semibold text-[var(--text-primary)]">Suggested panels:</span> {result.suggestedPanelCount} × {panelWattage}W</p>
            <p><span className="font-semibold text-[var(--text-primary)]">Required battery capacity:</span> {result.requiredBatteryCapacityKwh === null ? 'N/A (on-grid / hybrid)' : `${result.requiredBatteryCapacityKwh.toFixed(2)} kWh`}</p>
            <p><span className="font-semibold text-[var(--text-primary)]">Estimated monthly generation:</span> {result.estimatedMonthlyGenerationKwh.toFixed(1)} kWh</p>
            <p><span className="font-semibold text-[var(--text-primary)]">Simple payback estimate:</span> {Number.isFinite(result.simplePaybackYears) ? `${result.simplePaybackYears.toFixed(1)} years` : 'Not applicable'}</p>
            <p><span className="font-semibold text-[var(--text-primary)]">County solar profile:</span> {selectedPreset.county} • {selectedPreset.annualYieldKwhPerKwp} kWh/kWp/year • Peak: {selectedPreset.peakMonth} • Low: {selectedPreset.lowMonth}</p>
            <p className="text-xs">Battery DoD reference: {Math.round(BATTERY_DOD[batteryChemistry] * 100)}%</p>

            <div className="flex flex-wrap gap-2 pt-3">
              <Button onClick={handleLoadIntoSimulator}>Load into simulator</Button>
              <Button variant="outline" onClick={() => window.print()}>Print / Save as PDF</Button>
            </div>
            <p className="text-xs text-[var(--text-tertiary)]">
              Source: {typedPresets.source.name} ({typedPresets.source.url}), accessed {typedPresets.source.accessed}
            </p>
          </CardContent>
        </Card>
        </ContentGrid>
      </div>
    </PageContainer>
  );
}
