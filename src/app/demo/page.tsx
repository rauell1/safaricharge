'use client';
/* eslint-disable */

import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import type { DashboardSection } from '@/components/layout/DashboardSidebar';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { StatCards } from '@/components/dashboard/StatCards';
import { PowerFlowVisualization } from '@/components/dashboard/PowerFlowVisualization';
import { PanelStatusTable } from '@/components/dashboard/PanelStatusTable';
import { AlertsList } from '@/components/dashboard/AlertsList';
import { TimeRangeSwitcher } from '@/components/dashboard/TimeRangeSwitcher';
import { WeatherCard } from '@/components/dashboard/WeatherCard';
import { BatteryStatusCard } from '@/components/dashboard/BatteryStatusCard';
import { InsightsBanner } from '@/components/dashboard/InsightsBanner';
import { EngineeringKpisCard } from '@/components/dashboard/EngineeringKpisCard';
import DailyEnergyGraph, { buildGraphSVG, buildJPGBlob } from '@/components/DailyEnergyGraph';
import { SystemVisualization } from '@/components/dashboard/SystemVisualization';
import { useDemoEnergySystem } from '@/hooks/useDemoEnergySystem';
import {
  useAccumulators,
  useEnergyFlows,
  useEnergyNode,
  useEnergyStats,
  useMinuteData,
  useSimulationState,
  useTimeRange,
} from '@/hooks/useEnergySystem';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, PieChart, TrendingUp, Leaf, Car, Trees, Calculator } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { EnergyReportModal } from '@/components/energy/EnergyReportModal';
import type { SolarIrradianceData } from '@/lib/nasa-power-api';
import { useEnergySystemStore } from '@/stores/energySystemStore';
import {
  BATTERY_DOD,
  SIZING_SIMULATOR_STORAGE_KEY,
  computeSizingResult,
  parseSimulatorSizingPayload,
  type BatteryChemistry,
  type KenyaIrradiancePreset,
  type SimulatorSizingPayload,
  type SystemType,
} from '@/lib/pv-sizing';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { MapPin, Sun, Info } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { resampleTo5MinBucketsProgressive, resampleTo5MinBuckets } from '@/lib/graphSampler';
import type { SimulationMinuteRecord } from '@/types/simulation-core';
import { SocialImpactCard } from '@/components/widgets/SocialImpactCard';
import kenyaIrradiancePresets from '../../../forecasting/kenya-irradiance-presets.json';
import presetsData from '../../../forecasting/kenya-irradiance-presets.json';

// ── Restored page components ──────────────────────────────────────────────────
import FinancialDashboard from '@/components/dashboard/FinancialDashboard';
import { buildFinancialSnapshot, type FinancialInputs } from '@/lib/financial-dashboard';
import { computeProfessionalEngineeringKpis } from '@/lib/engineeringKpis';
import { LoadConfigComponents } from '@/components/simulation/LoadConfigComponents';
import { PVSizingSection } from '@/components/configuration/PVSizingSection';
import { RecommendationComponents } from '@/components/energy/RecommendationComponents';
import { SimulationNodes } from '@/components/simulation/SimulationNodes';
import { ValidationPanel } from '@/components/simulation/ValidationPanel';
import { SafariChargeAIAssistant } from '@/components/ai/AIAssistant';
// ─────────────────────────────────────────────────────────────────────────────

// NOTE: 'export const dynamic' is intentionally omitted here.
// This is a 'use client' component — dynamic rendering directives must live
// in a server wrapper (e.g. src/app/demo/layout.tsx or a server page.tsx).

// Default Nairobi solar data for report generation
const NAIROBI_SOLAR_DATA: SolarIrradianceData = {
  latitude: -1.2921,
  longitude: 36.8219,
  location: 'Nairobi',
  monthlyAverage: [5.5, 5.8, 5.6, 5.4, 5.2, 5.1, 5.0, 5.3, 5.7, 5.8, 5.4, 5.3],
  annualAverage: 5.4,
  monthlyTemperature: [22, 23, 24, 23, 22, 21, 20, 21, 22, 23, 22, 22],
  peakSunHours: [5.5, 5.8, 5.6, 5.4, 5.2, 5.1, 5.0, 5.3, 5.7, 5.8, 5.4, 5.3],
};

// Month labels used across the Monthly Overview chart
const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'] as const;

// Static fallback displayed while the simulation is still warming up (no minuteData yet).
const FALLBACK_GEN  = [65, 70, 78, 85, 90, 95, 88, 92, 80, 75, 68, 62] as const;
const FALLBACK_CONS = [55, 58, 60, 62, 65, 68, 70, 69, 65, 60, 57, 54] as const;
const SOLAR_MODEL_SUNRISE_HOUR = 6;
const SOLAR_MODEL_DAYLIGHT_HOURS = 12;
const SOLAR_MODEL_PERFORMANCE_RATIO = 0.82;

// ─── Location picker data ────────────────────────────────────────────────────────────────────────────
interface LocationOption {
  name: string;
  displayName: string;
  county: string;
  latitude: number;
  longitude: number;
  annualAvgSunHours: number;
  isKosapTarget: boolean;
  electrificationRatePct: number | null;
  countyNote: string;
}

type KenyaCountyPreset = {
  county: string;
  locationName: string;
  displayName: string;
  latitude: number;
  longitude: number;
  annualAvgSunHours: number;
  electrificationRatePct: number | null;
  isKosapTarget: boolean;
  countyNote: string;
};

const KENYA_COUNTY_PRESETS: KenyaCountyPreset[] = (
  (kenyaIrradiancePresets as { counties?: KenyaCountyPreset[] }).counties ?? []
);

const KENYA_LOCATIONS: LocationOption[] = KENYA_COUNTY_PRESETS.map((preset) => ({
  name: preset.locationName,
  displayName: preset.displayName,
  county: preset.county,
  latitude: preset.latitude,
  longitude: preset.longitude,
  annualAvgSunHours: preset.annualAvgSunHours,
  isKosapTarget: preset.isKosapTarget,
  electrificationRatePct: preset.electrificationRatePct,
  countyNote: preset.countyNote,
}));

const DEFAULT_LOCATION: LocationOption = KENYA_LOCATIONS[0] ?? {
  name: 'Nairobi',
  displayName: 'Nairobi, Kenya',
  county: 'Nairobi',
  latitude: -1.2921,
  longitude: 36.8219,
  annualAvgSunHours: 5.4,
  isKosapTarget: false,
  electrificationRatePct: null,
  countyNote: 'Nairobi has strong year-round irradiance and supports high daytime demand.',
};

const KENYA_HOUSEHOLD_ANNUAL_KWH = 1200;
const KEROSENE_DISPLACEMENT_L_PER_KWH = 0.8;
const KENYA_DIESEL_BACKUP_CO2_KG_PER_KWH = 0.4;

// ─── Irradiance presets for PV sizing (same JSON, typed for sizing) ──────────
type KenyaIrradiancePresetsFile = {
  source: { name: string; url: string; accessed: string; notes: string };
  presets: KenyaIrradiancePreset[];
};
const typedPresetsForSizing = presetsData as KenyaIrradiancePresetsFile;
// ─────────────────────────────────────────────────────────────────────────────

export default function ModularDashboardDemo({
  initialSection = 'dashboard',
}: { initialSection?: DashboardSection } = {}) {
  return <DemoIntegratedShell initialSection={initialSection} />;
}

type DemoIntegratedShellProps = {
  initialSection: DashboardSection;
};

function DemoIntegratedShell({ initialSection }: DemoIntegratedShellProps) {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<DashboardSection>(initialSection);
  const [financialInputs, setFinancialInputs] = useState<FinancialInputs>({
    chargingTariffKes: 25,
    discountRatePct: 10,
    stationCount: 3,
    targetUtilizationPct: 45,
    projectYears: 20,
  });

  useEffect(() => {
    if (activeSection === 'scenarios') {
      router.push('/scenarios');
    }
  }, [activeSection, router]);

  return (
    <DashboardLayout activeSection={activeSection} onSectionChange={setActiveSection} contextualMetrics={[]}>
      <Toaster />
      <DemoSectionRenderer
        activeSection={activeSection}
        financialInputs={financialInputs}
        onFinancialInputsChange={setFinancialInputs}
        onNavigateSection={setActiveSection}
      />
    </DashboardLayout>
  );
}

type DemoSectionRendererProps = {
  activeSection: DashboardSection;
  financialInputs: FinancialInputs;
  onFinancialInputsChange: React.Dispatch<React.SetStateAction<FinancialInputs>>;
  onNavigateSection: (section: DashboardSection) => void;
};

function DemoSectionRenderer({
  activeSection,
  financialInputs,
  onFinancialInputsChange,
  onNavigateSection,
}: DemoSectionRendererProps) {
  switch (activeSection) {
    case 'simulation':
      return <DemoSimulationView onNavigateSection={onNavigateSection} />;
    case 'configuration':
      return <DemoConfigurationView />;
    case 'financial':
      return <DemoFinancialView financialInputs={financialInputs} onFinancialInputsChange={onFinancialInputsChange} />;
    case 'recommendation':
      return <DemoRecommendationView />;
    case 'ai-assistant':
      return <DemoAIAssistantView onNavigateSection={onNavigateSection} />;
    case 'scenarios':
      return (
        <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <p className="text-sm text-[var(--text-tertiary)]">Opening Scenarios...</p>
          </div>
        </main>
      );
    case 'dashboard':
    default:
      return <DemoDashboardView financialInputs={financialInputs} onFinancialInputsChange={onFinancialInputsChange} onNavigateSection={onNavigateSection} />;
  }
}

type DemoDashboardViewProps = {
  financialInputs: FinancialInputs;
  onFinancialInputsChange: React.Dispatch<React.SetStateAction<FinancialInputs>>;
  onNavigateSection: (section: DashboardSection) => void;
};

function DemoDashboardView({
  financialInputs,
  onFinancialInputsChange,
  onNavigateSection,
}: DemoDashboardViewProps) {
  useDemoEnergySystem(true);
  const { timeRange, setTimeRange } = useTimeRange();
  const { currentDate, isAutoMode } = useSimulationState();
  const solarNode = useEnergyNode('solar');
  const batteryNode = useEnergyNode('battery');
  const gridNode = useEnergyNode('grid');
  const homeNode = useEnergyNode('home');
  const flows = useEnergyFlows();
  const stats = useEnergyStats(timeRange);
  const minuteData = useMinuteData(timeRange);
  const accumulators = useAccumulators();
  const saveScenario = useEnergySystemStore((s) => s.saveScenario);
  const resetSystem = useEnergySystemStore((s) => s.resetSystem);
  const systemConfig = useEnergySystemStore((s) => s.systemConfig);
  const updateConfig = useEnergySystemStore((s) => s.updateSystemConfig);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [showSizingDialog, setShowSizingDialog] = useState(false);
  const [pendingSizing, setPendingSizing] = useState<null | { pvKw: number; batteryKwh: number }>(null);
  const { toast } = useToast();
  const [selectedLocation, setSelectedLocation] = useState<LocationOption>(DEFAULT_LOCATION);
  const [locationSearch, setLocationSearch] = useState('');
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  const filteredLocations = useMemo(() => {
    const q = locationSearch.toLowerCase().trim();
    if (!q) return KENYA_LOCATIONS;
    return KENYA_LOCATIONS.filter((loc) =>
      loc.displayName.toLowerCase().includes(q) ||
      loc.county.toLowerCase().includes(q)
    );
  }, [locationSearch]);

  // Listen for PV sizing proposals from the standalone /sizing page
  useEffect(() => {
    const handleSizingProposal = (e: StorageEvent) => {
      if (e.key !== SIZING_SIMULATOR_STORAGE_KEY || !e.newValue) return;
      const result = parseSimulatorSizingPayload(e.newValue);
      if (!result) return;
      setPendingSizing(result);
      setShowSizingDialog(true);
    };
    window.addEventListener('storage', handleSizingProposal);
    return () => window.removeEventListener('storage', handleSizingProposal);
  }, []);

  const handleApplySizing = useCallback(() => {
    if (!pendingSizing) return;
    updateConfig({ pvCapacityKw: pendingSizing.pvKw, batteryCapacityKwh: pendingSizing.batteryKwh });
    toast({ title: 'System updated', description: `PV: ${pendingSizing.pvKw} kW · Battery: ${pendingSizing.batteryKwh} kWh` });
    setShowSizingDialog(false);
    setPendingSizing(null);
  }, [pendingSizing, updateConfig, toast]);

  const handleDismissSizing = useCallback(() => {
    setShowSizingDialog(false);
    setPendingSizing(null);
  }, []);

  // Social impact metrics
  const totalSolarKwh = useMemo(() => {
    if (minuteData.length > 0) {
      return minuteData.reduce((sum, r) => sum + (r.solarOutputW / 1000) * (1 / 60), 0);
    }
    return stats.totalGenerated;
  }, [minuteData, stats.totalGenerated]);

  const householdsEquivalent = useMemo(() =>
    Math.round(totalSolarKwh / (KENYA_HOUSEHOLD_ANNUAL_KWH / 365)),
    [totalSolarKwh]
  );
  const keroseneDisplaced = useMemo(() =>
    +(totalSolarKwh * KEROSENE_DISPLACEMENT_L_PER_KWH).toFixed(1),
    [totalSolarKwh]
  );
  const co2Avoided = useMemo(() =>
    +(totalSolarKwh * KENYA_DIESEL_BACKUP_CO2_KG_PER_KWH).toFixed(1),
    [totalSolarKwh]
  );

  // Monthly overview data
  const monthlyGenerated = useMemo(() => {
    if (minuteData.length === 0) return [...FALLBACK_GEN] as unknown as number[];
    const byMonth: number[] = Array(12).fill(0);
    minuteData.forEach((r) => {
      const m = new Date(r.timestamp).getMonth();
      byMonth[m] += r.solarOutputW / 1000 / 60;
    });
    return byMonth.map((v) => Math.round(v));
  }, [minuteData]);

  const monthlyConsumed = useMemo(() => {
    if (minuteData.length === 0) return [...FALLBACK_CONS] as unknown as number[];
    const byMonth: number[] = Array(12).fill(0);
    minuteData.forEach((r) => {
      const m = new Date(r.timestamp).getMonth();
      byMonth[m] += (r.loadDemandW ?? 0) / 1000 / 60;
    });
    return byMonth.map((v) => Math.round(v));
  }, [minuteData]);

  const engineeringKpis = useMemo(() =>
    computeProfessionalEngineeringKpis(minuteData as SimulationMinuteRecord[], systemConfig),
    [minuteData, systemConfig]
  );

  const financialSnapshot = useMemo(() =>
    buildFinancialSnapshot({
      minuteData: minuteData as Parameters<typeof buildFinancialSnapshot>[0]['minuteData'],
      solarData: NAIROBI_SOLAR_DATA,
      inputs: financialInputs,
      evCapacityKw: 22,
    }),
    [financialInputs, minuteData]
  );

  // ─── SVG / JPG export helpers ───────────────────────────────────────────────────────────────────────────
  const graphRef = useRef<HTMLDivElement>(null);

  const handleDownloadSVG = useCallback(async () => {
    const samples = resampleTo5MinBuckets(minuteData as SimulationMinuteRecord[]);
    const svgContent = buildGraphSVG(samples, { width: 900, height: 340, label: 'Daily Energy Flow' });
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'safaricharge-daily-energy.svg';
    a.click();
    URL.revokeObjectURL(url);
  }, [minuteData]);

  const handleDownloadJPG = useCallback(async () => {
    const samples = resampleTo5MinBuckets(minuteData as SimulationMinuteRecord[]);
    const blob = await buildJPGBlob(samples, { width: 900, height: 340, label: 'Daily Energy Flow' });
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'safaricharge-daily-energy.jpg';
    a.click();
    URL.revokeObjectURL(url);
  }, [minuteData]);
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6 lg:space-y-8">
        {/* Location Picker */}
        <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">Dashboard</h2>
            <p className="text-sm text-[var(--text-tertiary)]">Real-time solar · battery · EV charging overview</p>
          </div>
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2 text-xs"
              onClick={() => setShowLocationPicker((p) => !p)}
              aria-label="Choose location"
            >
              <MapPin className="w-3.5 h-3.5" />
              {selectedLocation.displayName}
            </Button>
            {showLocationPicker && (
              <div
                className="absolute right-0 top-full mt-1 z-50 rounded-xl shadow-xl border overflow-hidden"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', width: '320px', maxHeight: '360px', display: 'flex', flexDirection: 'column' }}
              >
                <div className="p-3 border-b" style={{ borderColor: 'var(--border)' }}>
                  <input
                    type="text"
                    placeholder="Search county or location..."
                    className="w-full text-xs px-3 py-2 rounded-lg outline-none"
                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                    value={locationSearch}
                    onChange={(e) => setLocationSearch(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="overflow-y-auto flex-1">
                  {filteredLocations.map((loc) => (
                    <button
                      key={loc.name}
                      className="w-full text-left px-4 py-2.5 text-xs hover:bg-[var(--bg-hover)] transition-colors"
                      style={{ color: loc.name === selectedLocation.name ? 'var(--accent)' : 'var(--text-primary)' }}
                      onClick={() => { setSelectedLocation(loc); setShowLocationPicker(false); setLocationSearch(''); }}
                    >
                      <div className="font-medium">{loc.displayName}</div>
                      {loc.isKosapTarget && (
                        <span className="text-[10px] text-[var(--text-muted)]">• KOSAP target</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <InsightsBanner />

        {/* Location context info */}
        {selectedLocation.countyNote && (
          <div
            className="flex items-start gap-2 rounded-xl px-4 py-3 text-xs"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
          >
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: 'var(--accent)' }} />
            <span><strong style={{ color: 'var(--text-primary)' }}>{selectedLocation.displayName}</strong> · {selectedLocation.countyNote}</span>
          </div>
        )}

        <StatCards />

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 lg:gap-6">
          <div className="xl:col-span-2">
            <PowerFlowVisualization />
          </div>
          <div className="flex flex-col gap-4">
            <BatteryStatusCard />
            <WeatherCard
              peakSunHours={selectedLocation.annualAvgSunHours}
              latitude={selectedLocation.latitude}
              longitude={selectedLocation.longitude}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 lg:gap-6">
          <div className="xl:col-span-2" ref={graphRef}>
            <DailyEnergyGraph
              minuteData={resampleTo5MinBucketsProgressive(minuteData as SimulationMinuteRecord[])}
              label="Daily Energy Flow"
              onDownloadSVG={handleDownloadSVG}
              onDownloadJPG={handleDownloadJPG}
            />
          </div>
          <div>
            <EngineeringKpisCard kpis={engineeringKpis} />
          </div>
        </div>

        <TimeRangeSwitcher />

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6">
          <PanelStatusTable />
          <AlertsList />
        </div>

        <SocialImpactCard
          householdsEquivalent={householdsEquivalent}
          keroseneDisplacedL={keroseneDisplaced}
          co2AvoidedKg={co2Avoided}
          totalSolarKwh={parseFloat(totalSolarKwh.toFixed(1))}
        />

        {/* Monthly Overview (Financial Preview) */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Monthly Overview</CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">KES/kWh: {financialInputs.chargingTariffKes}</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-[var(--color-primary)]">KES {financialSnapshot.monthlyRevenueKes.toLocaleString()}</div>
                <div className="text-xs text-[var(--text-muted)] mt-1">Monthly Revenue</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-500">{financialSnapshot.selfConsumptionRate.toFixed(1)}%</div>
                <div className="text-xs text-[var(--text-muted)] mt-1">Self-Consumption</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-500">{financialSnapshot.gridRelianceRate.toFixed(1)}%</div>
                <div className="text-xs text-[var(--text-muted)] mt-1">Grid Reliance</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[var(--color-primary)]">{financialSnapshot.paybackYears.toFixed(1)} yrs</div>
                <div className="text-xs text-[var(--text-muted)] mt-1">Payback Period</div>
              </div>
            </div>

            {/* Monthly Generation vs Consumption Chart */}
            <div className="mt-6">
              <div className="flex items-center gap-4 mb-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ background: 'var(--color-primary)' }} />
                  <span className="text-xs text-[var(--text-muted)]">Solar Generation (kWh)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-orange-500" />
                  <span className="text-xs text-[var(--text-muted)]">Consumption (kWh)</span>
                </div>
              </div>
              <div className="flex items-end gap-1 h-24">
                {MONTH_LABELS.map((month, i) => {
                  const gen = monthlyGenerated[i] || 0;
                  const cons = monthlyConsumed[i] || 0;
                  const maxVal = Math.max(...monthlyGenerated, ...monthlyConsumed, 1);
                  return (
                    <div key={month} className="flex-1 flex flex-col items-center gap-0.5">
                      <div className="w-full flex gap-0.5" style={{ height: '72px', alignItems: 'flex-end' }}>
                        <div
                          className="flex-1 rounded-t-sm"
                          style={{ height: `${(gen / maxVal) * 100}%`, background: 'var(--color-primary)', opacity: 0.85 }}
                        />
                        <div
                          className="flex-1 rounded-t-sm bg-orange-500"
                          style={{ height: `${(cons / maxVal) * 100}%`, opacity: 0.75 }}
                        />
                      </div>
                      <span className="text-[9px] text-[var(--text-muted)]">{month}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        <SystemVisualization />

        {/* PV Sizing CTA */}
        <div
          className="rounded-xl px-5 py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-3">
            <Sun className="w-5 h-5 shrink-0" style={{ color: 'var(--accent)' }} />
            <div>
              <div className="text-sm font-semibold text-[var(--text-primary)]">Not sure what size system you need?</div>
              <div className="text-xs text-[var(--text-muted)]">Use our PV Sizing Calculator to get a recommendation based on your load profile.</div>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => onNavigateSection('configuration')} className="shrink-0 text-xs">
            Go to Configuration
          </Button>
        </div>

        {/* Sizing Proposal Dialog */}
        {pendingSizing && (
          <Dialog open={showSizingDialog} onOpenChange={setShowSizingDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Apply PV Sizing Recommendation?</DialogTitle>
                <DialogDescription>
                  The PV Sizing Calculator recommended a <strong>{pendingSizing.pvKw} kW</strong> solar array
                  and a <strong>{pendingSizing.batteryKwh} kWh</strong> battery.
                  Apply these values to your live simulation?
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="ghost" onClick={handleDismissSizing}>Dismiss</Button>
                <Button onClick={handleApplySizing}>Apply</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        <EnergyReportModal
          open={isReportOpen}
          onOpenChange={setIsReportOpen}
          minuteData={minuteData as SimulationMinuteRecord[]}
          financialSnapshot={financialSnapshot}
          solarData={NAIROBI_SOLAR_DATA}
          systemConfig={systemConfig}
        />
      </div>
    </main>
  );
}

function DemoSimulationView({ onNavigateSection }: { onNavigateSection: (s: DashboardSection) => void }) {
  return (
    <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6 lg:space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">Live Simulation</h2>
          <p className="text-sm text-[var(--text-tertiary)]">Real-time energy simulation with validated physics models</p>
        </div>
        <SimulationNodes onNavigateSection={onNavigateSection} />
        <ValidationPanel />
      </div>
    </main>
  );
}

// ── Inline PV Sizing Calculator (embedded in System Configuration) ────────────
function InlinePvSizingCalculator() {
  const router = useRouter();
  const { toast } = useToast();

  const [dailyLoadKwh, setDailyLoadKwh] = useState(10);
  const [county, setCounty] = useState(typedPresetsForSizing.presets[0]?.county ?? 'Nairobi');
  const [systemType, setSystemType] = useState<SystemType>('on-grid');
  const [performanceRatio, setPerformanceRatio] = useState(0.8);
  const [batteryChemistry, setBatteryChemistry] = useState<BatteryChemistry>('lifepo4');
  const [autonomyDays, setAutonomyDays] = useState(2);
  const [panelWattage, setPanelWattage] = useState(400);

  const selectedPreset = useMemo(
    () => typedPresetsForSizing.presets.find((p) => p.county === county) ?? typedPresetsForSizing.presets[0],
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
    toast({
      title: 'Sizing applied',
      description: `Redirecting to Simulation with ${selectedPreset.county} preset (${result.requiredPvCapacityKw.toFixed(2)} kW PV).`,
    });
    router.push('/simulation');
  };

  return (
    <Card className="dashboard-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[var(--text-primary)]">
          <Calculator className="h-5 w-5 text-[var(--solar)]" />
          PV Sizing Calculator
        </CardTitle>
        <p className="text-sm text-[var(--text-tertiary)] mt-1">
          Kenya county irradiance presets — estimate system capacity and load a scenario directly into the simulator.
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Daily load */}
          <div className="space-y-2">
            <Label>Daily Energy Consumption (kWh/day)</Label>
            <Input
              type="number" min={0} step={0.1} value={dailyLoadKwh}
              onChange={(e) => setDailyLoadKwh(Number(e.target.value || 0))}
            />
          </div>

          {/* County */}
          <div className="space-y-2">
            <Label>County / Location</Label>
            <Select value={county} onValueChange={setCounty}>
              <SelectTrigger><SelectValue placeholder="Select county" /></SelectTrigger>
              <SelectContent>
                {typedPresetsForSizing.presets.map((preset) => (
                  <SelectItem key={preset.county} value={preset.county}>
                    {preset.county} ({preset.avgDailySunHours.toFixed(1)} sun-hrs/day)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* System type */}
          <div className="space-y-2">
            <Label>System Type</Label>
            <Select value={systemType} onValueChange={(v) => setSystemType(v as SystemType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="on-grid">On-Grid</SelectItem>
                <SelectItem value="off-grid">Off-Grid</SelectItem>
                <SelectItem value="hybrid">Hybrid</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Performance ratio */}
          <div className="space-y-2">
            <Label>Performance Ratio</Label>
            <Input
              type="number" min={0.1} max={1} step={0.01} value={performanceRatio}
              onChange={(e) => setPerformanceRatio(Number(e.target.value || 0.8))}
            />
          </div>

          {/* Panel wattage */}
          <div className="space-y-2">
            <Label>Panel Wattage</Label>
            <Select value={String(panelWattage)} onValueChange={(v) => setPanelWattage(Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="300">300W</SelectItem>
                <SelectItem value="400">400W</SelectItem>
                <SelectItem value="500">500W</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Battery chemistry */}
          <div className="space-y-2">
            <Label>Battery Chemistry</Label>
            <Select
              value={batteryChemistry}
              onValueChange={(v) => setBatteryChemistry(v as BatteryChemistry)}
              disabled={systemType !== 'off-grid'}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="lead-acid">Lead-Acid (50% DoD)</SelectItem>
                <SelectItem value="lifepo4">LiFePO₂ (80% DoD)</SelectItem>
                <SelectItem value="agm">AGM (60% DoD)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Autonomy days */}
          <div className="space-y-2 md:col-span-2 lg:col-span-3">
            <Label>Days of Autonomy</Label>
            <Input
              type="number" min={1} max={5} step={1} value={autonomyDays}
              onChange={(e) => setAutonomyDays(Math.min(5, Math.max(1, Number(e.target.value || 1))))}
              disabled={systemType !== 'off-grid'}
            />
          </div>
        </div>

        {/* Results summary */}
        <div
          className="mt-6 rounded-xl p-4 space-y-2 text-sm"
          style={{ background: 'var(--bg-card-muted)', border: '1px solid var(--border)' }}
        >
          <p className="font-semibold text-[var(--text-primary)] mb-3">Sizing Summary</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1.5 text-[var(--text-secondary)]">
            <p><span className="font-medium text-[var(--text-primary)]">Required PV capacity:</span> {result.requiredPvCapacityKw.toFixed(2)} kW</p>
            <p><span className="font-medium text-[var(--text-primary)]">Suggested panels:</span> {result.suggestedPanelCount} × {panelWattage}W</p>
            <p>
              <span className="font-medium text-[var(--text-primary)]">Required battery:</span>{' '}
              {result.requiredBatteryCapacityKwh === null
                ? 'N/A (on-grid / hybrid)'
                : `${result.requiredBatteryCapacityKwh.toFixed(2)} kWh`}
            </p>
            <p><span className="font-medium text-[var(--text-primary)]">Est. monthly generation:</span> {result.estimatedMonthlyGenerationKwh.toFixed(1)} kWh</p>
            <p>
              <span className="font-medium text-[var(--text-primary)]">Simple payback:</span>{' '}
              {Number.isFinite(result.simplePaybackYears)
                ? `${result.simplePaybackYears.toFixed(1)} years`
                : 'Not applicable'}
            </p>
            <p className="text-xs text-[var(--text-tertiary)]">
              {selectedPreset.county} • {selectedPreset.annualYieldKwhPerKwp} kWh/kWp/yr
              • Peak: {selectedPreset.peakMonth} • Low: {selectedPreset.lowMonth}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 flex flex-wrap gap-3">
          <Button onClick={handleLoadIntoSimulator} style={{ background: 'var(--solar)', color: '#fff' }}>
            Load into Simulator
          </Button>
          <Button variant="outline" onClick={() => window.print()}>Print / Save as PDF</Button>
        </div>

        <p className="mt-3 text-xs text-[var(--text-tertiary)]">
          Source: {typedPresetsForSizing.source.name} ({typedPresetsForSizing.source.url}),
          accessed {typedPresetsForSizing.source.accessed}
        </p>
      </CardContent>
    </Card>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

function DemoConfigurationView() {
  return (
    <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6 lg:space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">System Configuration</h2>
          <p className="text-sm text-[var(--text-tertiary)]">Configure solar panels, battery, EV chargers, load profiles and size your PV system</p>
        </div>
        <LoadConfigComponents />

        {/* ── PV Sizing Calculator ────────────────────────────────────────── */}
        <details
          className="rounded-xl overflow-hidden"
          style={{ border: '1px solid var(--border)' }}
        >
          <summary
            className="flex items-center justify-between px-4 py-3 cursor-pointer text-sm font-semibold select-none"
            style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}
          >
            <span>⚡ PV Sizing Calculator</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
              Calculate required panel &amp; battery capacity
            </span>
          </summary>
          <div
            className="p-4"
            style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)' }}
          >
            <PVSizingSection />
          </div>
        </details>
      </div>
    </main>
  );
}

function DemoFinancialView({
  financialInputs,
  onFinancialInputsChange,
}: {
  financialInputs: FinancialInputs;
  onFinancialInputsChange: React.Dispatch<React.SetStateAction<FinancialInputs>>;
}) {
  const minuteData = useMinuteData('today');
  const snapshot = useMemo(() => buildFinancialSnapshot({
    minuteData: minuteData as Parameters<typeof buildFinancialSnapshot>[0]['minuteData'],
    solarData: NAIROBI_SOLAR_DATA,
    inputs: financialInputs,
    evCapacityKw: 22,
  }), [financialInputs, minuteData]);

  return (
    <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6 lg:space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">Financial Analysis</h2>
          <p className="text-sm text-[var(--text-tertiary)]">ROI projections, revenue modelling and investment metrics</p>
        </div>
        <FinancialDashboard
          snapshot={snapshot}
          inputs={financialInputs}
          onInputsChange={onFinancialInputsChange}
        />
      </div>
    </main>
  );
}

function DemoRecommendationView() {
  return (
    <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6 lg:space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">AI Recommendations</h2>
          <p className="text-sm text-[var(--text-tertiary)]">AI-powered system sizing and configuration recommendations</p>
        </div>
        <RecommendationComponents />
      </div>
    </main>
  );
}

function DemoAIAssistantView({ onNavigateSection }: { onNavigateSection: (s: DashboardSection) => void }) {
  const [aiOpen, setAiOpen] = useState(true);
  useDemoEnergySystem(false);
  const solarNode = useEnergyNode('solar');
  const batteryNode = useEnergyNode('battery');
  const gridNode = useEnergyNode('grid');
  const homeNode = useEnergyNode('home');
  const flows = useEnergyFlows();
  const stats = useEnergyStats('today');
  const minuteData = useMinuteData('today');
  const accumulators = useAccumulators();
  const systemConfig = useEnergySystemStore((s) => s.systemConfig);
  const engineeringKpis = useMemo(() =>
    computeProfessionalEngineeringKpis(minuteData as SimulationMinuteRecord[], systemConfig),
    [minuteData, systemConfig]
  );
  const financialSnapshot = useMemo(() => buildFinancialSnapshot({
    minuteData: minuteData as Parameters<typeof buildFinancialSnapshot>[0]['minuteData'],
    solarData: NAIROBI_SOLAR_DATA,
    inputs: { chargingTariffKes: 25, discountRatePct: 10, stationCount: 3, targetUtilizationPct: 45, projectYears: 20 },
    evCapacityKw: 22,
  }), [minuteData]);

  return (
    <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">AI Assistant</h2>
          <p className="text-sm text-[var(--text-tertiary)]">Ask anything about your solar system, energy data, or get configuration advice</p>
        </div>
        <SafariChargeAIAssistant
          isOpen={aiOpen}
          onClose={() => { setAiOpen(false); onNavigateSection('dashboard'); }}
          currentSection="ai-assistant"
          systemData={{
            solar: { output: solarNode.output, status: solarNode.status },
            battery: { soc: batteryNode.soc, status: batteryNode.status, power: batteryNode.power },
            grid: { status: gridNode.status, power: gridNode.power },
            home: { consumption: homeNode.consumption },
            flows,
            stats,
            minuteData: minuteData as SimulationMinuteRecord[],
            accumulators,
            systemConfig,
            engineeringKpis,
            financialSnapshot,
          }}
        />
      </div>
    </main>
  );
}
