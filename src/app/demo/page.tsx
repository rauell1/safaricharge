'use client';
/* eslint-disable */

import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
import { BarChart3, PieChart, TrendingUp, Leaf, Car, Trees, LayoutDashboard, FlaskConical, SlidersHorizontal, DollarSign, Lightbulb, Bot } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { EnergyReportModal } from '@/components/energy/EnergyReportModal';
import type { SolarIrradianceData } from '@/lib/nasa-power-api';
import { useEnergySystemStore } from '@/stores/energySystemStore';
import { SIZING_SIMULATOR_STORAGE_KEY, parseSimulatorSizingPayload } from '@/lib/pv-sizing';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { MapPin, Sun, Info, Search, X, CheckCircle2 } from 'lucide-react';
import { AFRICA_CITIES, type AfricaCity } from '@/lib/africa-locations-data';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { resampleTo5MinBucketsProgressive, resampleTo5MinBuckets } from '@/lib/graphSampler';
import type { SimulationMinuteRecord } from '@/types/simulation-core';
import { SocialImpactCard } from '@/components/widgets/SocialImpactCard';
import kenyaIrradiancePresets from '../../../forecasting/kenya-irradiance-presets.json';

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

// Force dynamic rendering - no static generation
export const dynamic = 'force-dynamic';

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

// ─── Location picker data ─────────────────────────────────────────────────────
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

// Map Africa-wide city data (Meteonorm-approximate) to LocationOption
const AFRICA_LOCATIONS: LocationOption[] = AFRICA_CITIES.map((city: AfricaCity) => ({
  name: city.name,
  displayName: `${city.name}, ${city.country}`,
  county: city.country,
  latitude: city.lat,
  longitude: city.lon,
  annualAvgSunHours: city.avgDailyPsh,
  isKosapTarget: false,
  electrificationRatePct: null,
  countyNote: `${city.region} — elevation ${city.elevation} m, avg ${city.avgTempC}°C, annual GHI ${city.annualGHI} kWh/m².`,
}));

const DEFAULT_LOCATION: LocationOption = AFRICA_LOCATIONS.find(l => l.name === 'Nairobi') ?? AFRICA_LOCATIONS[0];

const KENYA_HOUSEHOLD_ANNUAL_KWH = 1200;
const KEROSENE_DISPLACEMENT_L_PER_KWH = 0.8;
const KENYA_DIESEL_BACKUP_CO2_KG_PER_KWH = 0.4;
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
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState<DashboardSection>(initialSection);
  const [financialInputs, setFinancialInputs] = useState<FinancialInputs>({
    chargingTariffKes: 25,
    discountRatePct: 10,
    stationCount: 3,
    targetUtilizationPct: 45,
    projectYears: 20,
  });

  const [activeLocation, setActiveLocation] = useState<LocationOption>(DEFAULT_LOCATION);
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const [locationSearch, setLocationSearch] = useState('');

  const handleSelectLocation = useCallback((loc: LocationOption) => {
    setActiveLocation(loc);
    setLocationPickerOpen(false);
    setLocationSearch('');
    toast({
      title: 'Location updated',
      description: `Solar data will now reflect conditions in ${loc.displayName} (avg ${loc.annualAvgSunHours} sun-hours/day).`,
    });
  }, [toast]);

  useEffect(() => {
    if (activeSection === 'scenarios') {
      router.push('/scenarios');
    }
  }, [activeSection, router]);

  useEffect(() => {
    const payload = parseSimulatorSizingPayload(localStorage.getItem(SIZING_SIMULATOR_STORAGE_KEY));
    if (!payload) return;

    localStorage.removeItem(SIZING_SIMULATOR_STORAGE_KEY);

    const store = useEnergySystemStore.getState();
    const nextBatteryCapacity = payload.systemType === 'off-grid'
      ? (payload.batteryCapacityKwh ?? store.fullSystemConfig.battery.capacityKwh)
      : store.fullSystemConfig.battery.capacityKwh;

    const nextFullSystemConfig = {
      ...store.fullSystemConfig,
      solar: {
        ...store.fullSystemConfig.solar,
        panelCount: payload.panelCount,
        panelWattage: payload.panelWattage,
        totalCapacityKw: payload.requiredPvCapacityKw,
      },
      inverter: {
        ...store.fullSystemConfig.inverter,
        capacityKw: Math.max(1, Number((payload.requiredPvCapacityKw * 0.9).toFixed(2))),
      },
      battery: {
        ...store.fullSystemConfig.battery,
        capacityKwh: nextBatteryCapacity,
      },
    };

    store.updateFullSystemConfig(nextFullSystemConfig);
    store.updateSystemConfig({
      solarCapacityKW: payload.requiredPvCapacityKw,
      inverterKW: nextFullSystemConfig.inverter.capacityKw,
      batteryCapacityKWh: nextBatteryCapacity,
    });
    store.updateNode('solar', { capacityKW: payload.requiredPvCapacityKw });
    store.updateNode('battery', { capacityKWh: nextBatteryCapacity });
    store.setSimulationState({ isAutoMode: true });

    toast({
      title: 'Sizing loaded',
      description: `${payload.county} sizing preset loaded and simulation started.`,
    });
  }, [toast]);

  return (
    <>
      <DashboardLayout activeSection={activeSection} onSectionChange={setActiveSection} contextualMetrics={[]}>
        <Toaster />
        <DemoSectionRenderer
          activeSection={activeSection}
          financialInputs={financialInputs}
          onFinancialInputsChange={setFinancialInputs}
          onNavigateSection={setActiveSection}
          activeLocation={activeLocation}
          onLocationPickerOpen={() => setLocationPickerOpen(true)}
        />
      </DashboardLayout>
      {locationPickerOpen && typeof document !== 'undefined' && createPortal(
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, boxSizing: 'border-box' }}
        >
          <div
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)' }}
            onClick={() => { setLocationPickerOpen(false); setLocationSearch(''); }}
          />
          <div
            style={{
              position: 'relative', zIndex: 1,
              width: '100%', maxWidth: 480,
              background: 'var(--bg-card, #fff)',
              border: '1px solid var(--border, rgba(0,0,0,0.1))',
              borderRadius: 14,
              overflow: 'hidden',
              boxShadow: '0 24px 80px rgba(0,0,0,0.22)',
              display: 'flex', flexDirection: 'column',
              maxHeight: 'calc(100vh - 80px)',
            }}
          >
            <div style={{ padding: '16px 16px 0', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <MapPin style={{ width: 16, height: 16, color: 'var(--solar, #f59e0b)', flexShrink: 0 }} />
                  <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary, #111)', letterSpacing: '-0.02em' }}>
                    Select Location
                  </span>
                </div>
                <button
                  onClick={() => { setLocationPickerOpen(false); setLocationSearch(''); }}
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 4, color: 'var(--text-tertiary, #999)', lineHeight: 1 }}
                  aria-label="Close"
                >
                  <X style={{ width: 16, height: 16 }} />
                </button>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-secondary, #666)', marginBottom: 10, marginTop: 2 }}>
                212 cities across Africa — Meteonorm irradiance data
              </p>
              <div style={{ position: 'relative', marginBottom: 10 }}>
                <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 13, height: 13, color: 'var(--text-tertiary, #999)', pointerEvents: 'none' }} />
                <input
                  autoFocus
                  type="text"
                  placeholder="Search city or country…"
                  value={locationSearch}
                  onChange={e => setLocationSearch(e.target.value)}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8,
                    fontSize: 13, borderRadius: 8,
                    border: '1px solid var(--border, rgba(0,0,0,0.12))',
                    background: 'var(--bg-card-muted, #f8f8f8)',
                    color: 'var(--text-primary, #111)',
                    outline: 'none',
                  }}
                />
              </div>
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {(() => {
                const q = locationSearch.trim().toLowerCase();
                const filtered = q
                  ? AFRICA_LOCATIONS.filter(l => l.name.toLowerCase().includes(q) || l.county.toLowerCase().includes(q))
                  : AFRICA_LOCATIONS;
                const byCountry: Record<string, LocationOption[]> = {};
                for (const loc of filtered) {
                  if (!byCountry[loc.county]) byCountry[loc.county] = [];
                  byCountry[loc.county].push(loc);
                }
                const countries = Object.keys(byCountry).sort();
                if (countries.length === 0) {
                  return <p style={{ padding: 20, textAlign: 'center', fontSize: 13, color: 'var(--text-tertiary, #999)' }}>No cities found for "{locationSearch}"</p>;
                }
                return countries.map(country => (
                  <div key={country}>
                    <div style={{
                      position: 'sticky', top: 0,
                      padding: '4px 16px',
                      fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                      color: 'var(--text-tertiary, #999)',
                      background: 'var(--bg-secondary, #f5f5f5)',
                      borderBottom: '1px solid var(--border, rgba(0,0,0,0.06))',
                    }}>
                      {country}
                    </div>
                    {byCountry[country].map(loc => {
                      const isActive = activeLocation.name === loc.name && activeLocation.county === loc.county;
                      return (
                        <button
                          key={loc.displayName}
                          onClick={() => { handleSelectLocation(loc); setLocationSearch(''); }}
                          style={{
                            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '8px 16px', border: 'none', cursor: 'pointer', textAlign: 'left',
                            background: isActive ? 'var(--solar-soft, rgba(245,158,11,0.1))' : 'transparent',
                            color: isActive ? 'var(--solar, #f59e0b)' : 'var(--text-primary, #111)',
                            fontSize: 13, transition: 'background 0.1s',
                          }}
                          onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-card-muted, #f0f0f0)'; }}
                          onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                        >
                          <span style={{ fontWeight: isActive ? 600 : 400 }}>{loc.name}</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                            <span style={{ fontSize: 11, color: isActive ? 'var(--solar, #f59e0b)' : 'var(--text-tertiary, #999)' }}>
                              {loc.annualAvgSunHours} PSH/day
                            </span>
                            {isActive && <CheckCircle2 style={{ width: 13, height: 13 }} />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

type DemoSectionRendererProps = {
  activeSection: DashboardSection;
  financialInputs: FinancialInputs;
  onFinancialInputsChange: React.Dispatch<React.SetStateAction<FinancialInputs>>;
  onNavigateSection: (section: DashboardSection) => void;
  activeLocation: LocationOption;
  onLocationPickerOpen: () => void;
};

function DemoSectionRenderer({
  activeSection,
  financialInputs,
  onFinancialInputsChange,
  onNavigateSection,
  activeLocation,
  onLocationPickerOpen,
}: DemoSectionRendererProps) {
  switch (activeSection) {
    case 'simulation':
      return <DemoSimulationView onNavigateSection={onNavigateSection} />;
    case 'configuration':
      return <DemoConfigurationView activeLocation={activeLocation} onLocationPickerOpen={onLocationPickerOpen} />;
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
      return <DemoDashboardView financialInputs={financialInputs} onFinancialInputsChange={onFinancialInputsChange} onNavigateSection={onNavigateSection} activeLocation={activeLocation} onLocationPickerOpen={onLocationPickerOpen} />;
  }
}

type DemoDashboardViewProps = {
  financialInputs: FinancialInputs;
  onFinancialInputsChange: React.Dispatch<React.SetStateAction<FinancialInputs>>;
  onNavigateSection: (section: DashboardSection) => void;
  activeLocation: LocationOption;
  onLocationPickerOpen: () => void;
};

function DemoDashboardView({
  financialInputs,
  onFinancialInputsChange,
  onNavigateSection,
  activeLocation,
  onLocationPickerOpen,
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
  const { toast } = useToast();

  const [isReportOpen, setIsReportOpen] = useState(false);

  const handleReset = useCallback(() => {
    const confirmed = window.confirm(
      'Reset the simulation?\n\nThis will clear all accumulated energy data and restart the system from its initial state.'
    );
    if (!confirmed) return;
    resetSystem();
    toast({
      title: 'Simulation reset',
      description: 'All energy data has been cleared. The simulation is restarting.',
    });
  }, [resetSystem, toast]);

  const handleSaveScenario = useCallback((name: string) => {
    const snap = buildFinancialSnapshot({
      minuteData: minuteData as Parameters<typeof buildFinancialSnapshot>[0]['minuteData'],
      solarData: NAIROBI_SOLAR_DATA,
      inputs: financialInputs,
      evCapacityKw: 22,
    });
    saveScenario(
      name,
      {
        capexTotal: snap.capex.total,
        npvKes: snap.npvKes,
        irrPct: snap.irrPct,
        lcoeKesPerKwh: snap.lcoeKesPerKwh,
        paybackYears: snap.paybackYears,
      },
      { name: activeLocation.name, latitude: activeLocation.latitude, longitude: activeLocation.longitude }
    );
    toast({ title: 'Scenario saved', description: `"${name}" has been saved. View it on the Scenarios page.` });
  }, [activeLocation.latitude, activeLocation.longitude, activeLocation.name, financialInputs, minuteData, saveScenario, toast]);

  const latestPoint = minuteData[minuteData.length - 1];
  const solarPower = latestPoint?.solarKW ?? solarNode.powerKW ?? 0;
  const batteryPower = latestPoint?.batteryPowerKW ?? batteryNode.powerKW ?? 0;
  const gridPower = latestPoint ? latestPoint.gridImportKW - latestPoint.gridExportKW : gridNode.powerKW ?? 0;
  const homePower = latestPoint ? latestPoint.homeLoadKW + latestPoint.ev1LoadKW + latestPoint.ev2LoadKW : homeNode.powerKW ?? 0;
  const batteryLevel = latestPoint?.batteryLevelPct ?? batteryNode.soc ?? 0;
  const ambientTemp = Number((26 + Math.max(0, solarPower * 0.22)).toFixed(1));
  const inverterTemp = Number((38 + Math.max(0, solarPower * 1.6)).toFixed(1));
  const batteryTemp = Number((batteryNode.temperature ?? (29 + Math.max(0, Math.abs(batteryPower) * 0.9))).toFixed(1));
  const deratingPct = Number(Math.max(0, (inverterTemp - 60) * 1.8).toFixed(1));

  const financialSnapshot = useMemo(() => buildFinancialSnapshot({
    minuteData: minuteData as Parameters<typeof buildFinancialSnapshot>[0]['minuteData'],
    solarData: NAIROBI_SOLAR_DATA,
    inputs: financialInputs,
    evCapacityKw: 22,
  }), [financialInputs, minuteData]);

  const engineeringKpis = useMemo(() => computeProfessionalEngineeringKpis({
    minuteData,
    systemCapacityKwp: Math.max(systemConfig.solarCapacityKW, 0),
    avgDailySunHours: activeLocation.annualAvgSunHours,
  }), [activeLocation.annualAvgSunHours, minuteData, systemConfig.solarCapacityKW]);

  const sidebarMetrics = useMemo(() => ([
    { label: 'Solar Power', value: `${solarPower.toFixed(1)} kW`, tone: 'solar' as const },
    { label: 'Battery', value: `${batteryLevel.toFixed(0)}%`, tone: 'battery' as const },
    { label: 'Grid', value: gridPower > 0 ? `+${gridPower.toFixed(1)} kW` : `${gridPower.toFixed(1)} kW`, tone: 'grid' as const },
    { label: 'Savings', value: `KES ${Math.round(stats.totalSavingsKES).toLocaleString()}`, tone: 'neutral' as const },
  ]), [batteryLevel, gridPower, solarPower, stats.totalSavingsKES]);

  const flowDirection = useMemo(() => ({
    solarToHome: flows.some((f) => f.from === 'solar' && f.to === 'home' && f.active),
    solarToBattery: flows.some((f) => f.from === 'solar' && f.to === 'battery' && f.active),
    solarToGrid: flows.some((f) => f.from === 'solar' && f.to === 'grid' && f.active),
    batteryToHome: flows.some((f) => f.from === 'battery' && f.to === 'home' && f.active),
    gridToHome: flows.some((f) => f.from === 'grid' && f.to === 'home' && f.active),
  }), [flows]);

  const graphData = useMemo(
    () => resampleTo5MinBucketsProgressive(minuteData),
    [minuteData]
  );

  const expectedOutputData = useMemo(() => graphData.map((point) => {
    const sunAngle = Math.max(0, Math.sin(((point.timeOfDay - SOLAR_MODEL_SUNRISE_HOUR) / SOLAR_MODEL_DAYLIGHT_HOURS) * Math.PI));
    const expected = (solarNode.capacityKW ?? 10) * SOLAR_MODEL_PERFORMANCE_RATIO * sunAngle;
    return { timeOfDay: point.timeOfDay, output: Number(expected.toFixed(2)) };
  }), [graphData, solarNode.capacityKW]);

  const energySplit = useMemo(() => {
    const totalEnergy = stats.totalSolarKWh + stats.totalConsumptionKWh + stats.totalGridExportKWh;
    if (!totalEnergy) return { solarPct: 0, consumptionPct: 0, exportPct: 0 };
    return {
      solarPct: stats.totalSolarKWh / totalEnergy,
      consumptionPct: stats.totalConsumptionKWh / totalEnergy,
      exportPct: stats.totalGridExportKWh / totalEnergy,
    };
  }, [stats]);

  const ringSegments = useMemo(() => {
    const circumference = 2 * Math.PI * 48;
    const clamp = (value: number) => Math.max(0, Math.min(1, value));
    return {
      circumference,
      solar: clamp(energySplit.solarPct) * circumference,
      consumption: clamp(energySplit.consumptionPct) * circumference,
      export: clamp(energySplit.exportPct) * circumference,
    };
  }, [energySplit]);

  const sparklineData = useMemo(() => {
    const last7Days = minuteData.slice(-7 * 420);
    const dailyData: { gen: number[]; power: number[]; cons: number[]; savings: number[] } = {
      gen: [],
      power: [],
      cons: [],
      savings: [],
    };

    for (let i = 0; i < 7; i++) {
      const dayData = last7Days.slice(i * 420, (i + 1) * 420);
      if (dayData.length > 0) {
        dailyData.gen.push(dayData.reduce((sum, d) => sum + d.solarEnergyKWh, 0));
        dailyData.cons.push(dayData.reduce((sum, d) => sum + (d.homeLoadKWh ?? 0) + (d.ev1LoadKWh ?? 0) + (d.ev2LoadKWh ?? 0), 0));
        dailyData.savings.push(dayData.reduce((sum, d) => sum + d.savingsKES, 0));
        dailyData.power.push(dayData.reduce((sum, d) => sum + d.solarKW, 0) / dayData.length);
      }
    }

    return dailyData;
  }, [minuteData]);

  const trendsData = useMemo(() => {
    const weekData = minuteData.slice(-7 * 420);
    const yesterdayData = minuteData.slice(-2 * 420, -420);
    const weeklyAvgGen = weekData.length > 0 ? weekData.reduce((sum, d) => sum + d.solarEnergyKWh, 0) / 7 : 0;
    const weeklyAvgCons = weekData.length > 0 ? weekData.reduce((sum, d) => sum + d.homeLoadKWh + d.ev1LoadKWh + d.ev2LoadKWh, 0) / 7 : 0;
    const yesterdaySavings = yesterdayData.length > 0 ? yesterdayData.reduce((sum, d) => sum + d.savingsKES, 0) : 0;
    const usefulEnergy = Math.min(homePower, solarPower) + (batteryPower > 0 ? Math.min(batteryPower, solarPower - homePower) : 0);
    const systemEfficiency = solarPower > 0 ? (usefulEnergy / solarPower) * 100 : 0;
    const savingsChange = yesterdaySavings > 0 ? ((stats.totalSavingsKES - yesterdaySavings) / yesterdaySavings) * 100 : 0;
    const now = new Date();
    const batteryOptimized = now.getHours() >= 18 && now.getHours() <= 22 ? batteryLevel > 70 : batteryLevel > 50;
    return {
      weeklyAvgGen,
      weeklyAvgCons,
      yesterdaySavings,
      systemEfficiency,
      savingsChange,
      batteryOptimized,
      forecastChange: 10,
    };
  }, [batteryLevel, batteryPower, homePower, minuteData, solarPower, stats.totalSavingsKES]);

  const socialImpact = useMemo(() => {
    const trackedDays = financialSnapshot.energy.trackedDays;
    if (trackedDays <= 0) {
      return {
        annualSolarGeneratedKwh: 0,
        householdsPowered: 0,
        keroseneDisplacedLiters: 0,
        co2AvoidedKg: 0,
      };
    }

    const annualSolarGeneratedKwh = financialSnapshot.energy.avgDailySolarKWh * 365;
    const totalGridExportKwh = minuteData.reduce((sum, d) => sum + (d.gridExportKWh ?? 0), 0);
    const avgDailyGridExportKwh = totalGridExportKwh / trackedDays;
    const gridImportDisplacedKwh = Math.max(0, annualSolarGeneratedKwh - (avgDailyGridExportKwh * 365));

    return {
      annualSolarGeneratedKwh,
      householdsPowered: annualSolarGeneratedKwh / KENYA_HOUSEHOLD_ANNUAL_KWH,
      keroseneDisplacedLiters: gridImportDisplacedKwh * KEROSENE_DISPLACEMENT_L_PER_KWH,
      co2AvoidedKg: annualSolarGeneratedKwh * KENYA_DIESEL_BACKUP_CO2_KG_PER_KWH,
    };
  }, [financialSnapshot.energy.avgDailySolarKWh, financialSnapshot.energy.trackedDays, minuteData]);

  const monthlyOverviewData = useMemo(() => {
    if (minuteData.length === 0) {
      return MONTH_LABELS.map((label, index) => ({ label, gen: FALLBACK_GEN[index], cons: FALLBACK_CONS[index], isFallback: true }));
    }

    const genByMonth = new Array(12).fill(0) as number[];
    const consByMonth = new Array(12).fill(0) as number[];
    for (const d of minuteData) {
      const idx = (d.month - 1 + 12) % 12;
      genByMonth[idx] += d.solarEnergyKWh ?? 0;
      consByMonth[idx] +=
        (d.homeLoadKWh ?? (d.homeLoadKW ?? 0) * (1 / 60)) +
        (d.ev1LoadKWh ?? (d.ev1LoadKW ?? 0) * (1 / 60)) +
        (d.ev2LoadKWh ?? (d.ev2LoadKW ?? 0) * (1 / 60));
    }

    const maxVal = Math.max(...genByMonth, ...consByMonth, 1);
    return MONTH_LABELS.map((label, index) => ({
      label,
      gen: (genByMonth[index] / maxVal) * 100,
      cons: (consByMonth[index] / maxVal) * 100,
      genKWh: genByMonth[index],
      consKWh: consByMonth[index],
      isFallback: false,
    }));
  }, [minuteData]);

  const handleExportCsv = useCallback(async () => {
    if (!minuteData || minuteData.length === 0) {
      alert('No data to export. Please wait for the simulation to generate data.');
      return;
    }

    const rows: string[] = [];
    rows.push('Section 1: System Configuration');
    rows.push('Metric,Value,Unit');
    rows.push(`Solar Capacity,${systemConfig.solarCapacityKW.toFixed(2)},kWp`);
    rows.push(`Battery Capacity,${systemConfig.batteryCapacityKWh.toFixed(2)},kWh`);
    rows.push(`Inverter Capacity,${systemConfig.inverterKW.toFixed(2)},kW`);
    rows.push(`Location,${activeLocation.displayName},-`);
    rows.push(`Mode,${isAutoMode ? 'Auto' : 'Manual'},-`);
    rows.push('');
    rows.push('Section 2: Engineering KPIs');
    rows.push('KPI,Value,Unit');
    rows.push(`Specific Yield,${engineeringKpis.specificYield.toFixed(2)},kWh/kWp/year`);
    rows.push(`Performance Ratio,${engineeringKpis.performanceRatio.toFixed(4)},ratio`);
    rows.push(`Capacity Factor,${engineeringKpis.capacityFactor.toFixed(4)},ratio`);
    rows.push(`Self-consumption Rate,${engineeringKpis.selfConsumptionRate.toFixed(4)},ratio`);
    rows.push(`Grid Independence,${engineeringKpis.gridIndependence.toFixed(4)},ratio`);
    rows.push(`Battery cycles/year,${engineeringKpis.batteryCyclesPerYear.toFixed(2)},cycles/year`);
    rows.push(`CO2 avoided,${engineeringKpis.co2AvoidedKgPerYear.toFixed(2)},kg/year`);
    rows.push('');
    rows.push('Section 3: Finance KPIs');
    rows.push('KPI,Value,Unit');
    rows.push(`LCOE,${financialSnapshot.lcoeKesPerKwh.toFixed(2)},KES/kWh`);
    rows.push(`NPV,${financialSnapshot.npvKes.toFixed(2)},KES`);
    rows.push(`IRR,${financialSnapshot.irrPct.toFixed(2)},%`);
    rows.push(`Simple Payback,${financialSnapshot.paybackYears.toFixed(2)},years`);
    rows.push('');
    rows.push('Section 4: Raw Simulation Time Series');
    rows.push('Timestamp,Date,Year,Month,Week,Day,Hour,Minute,Solar (kW),Home Load (kW),EV1 Load (kW),EV2 Load (kW),Battery Power (kW),Battery Level (%),Grid Import (kW),Grid Export (kW),EV1 SoC (%),EV2 SoC (%),Tariff Rate (KES/kWh),Peak Time,Savings (KES),Solar Energy (kWh),Grid Import (kWh),Grid Export (kWh)');
    for (const d of minuteData) {
      rows.push(`${d.timestamp},${d.date},${d.year},${d.month},${d.week},${d.day},${d.hour},${d.minute},${(d.solarKW || 0).toFixed(2)},${(d.homeLoadKW || 0).toFixed(2)},${(d.ev1LoadKW || 0).toFixed(2)},${(d.ev2LoadKW || 0).toFixed(2)},${(d.batteryPowerKW || 0).toFixed(2)},${(d.batteryLevelPct || 0).toFixed(1)},${(d.gridImportKW || 0).toFixed(2)},${(d.gridExportKW || 0).toFixed(2)},${(d.ev1SocPct || 0).toFixed(1)},${(d.ev2SocPct || 0).toFixed(1)},${(d.tariffRate || 0).toFixed(2)},${d.isPeakTime ? 'Yes' : 'No'},${(d.savingsKES || 0).toFixed(2)},${(d.solarEnergyKWh || 0).toFixed(4)},${(d.gridImportKWh || 0).toFixed(4)},${(d.gridExportKWh || 0).toFixed(4)}`);
    }

    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SafariCharge_Engineering_Report_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 300);
  }, [activeLocation.displayName, engineeringKpis, financialSnapshot, isAutoMode, minuteData, systemConfig]);

  const handleExportExcel = useCallback(async () => {
    alert('Excel export is available from the report modal in the dashboard view.');
  }, []);

  const handleFormalReport = useCallback(async () => {
    if (!minuteData || minuteData.length === 0) {
      alert('No data available. Please wait for the simulation to generate data.');
      return;
    }
    window.print();
  }, [minuteData]);

  const handleDownloadCharts = useCallback(async () => {
    alert('Chart export is available from the report modal in the dashboard view.');
  }, []);

  const headerNotifications = useMemo(() => {
    const items: Array<{
      id: string;
      title: string;
      description: string;
      actionLabel?: string;
      onAction?: () => void;
    }> = [];

    if (!isAutoMode) {
      items.push({
        id: 'manual-mode',
        title: 'Manual mode enabled',
        description: 'Automation is paused. Some optimizations are not being applied.',
        actionLabel: 'Open Simulation',
        onAction: () => onNavigateSection('simulation'),
      });
    }

    if (minuteData.length < 24) {
      items.push({
        id: 'warmup',
        title: 'Simulation warming up',
        description: 'Live results become more stable after more time-step data is collected.',
        actionLabel: 'View Live Results',
        onAction: () => onNavigateSection('financial'),
      });
    }

    if ((batteryNode.soc ?? 100) < 20) {
      items.push({
        id: 'battery-low',
        title: 'Battery charge is low',
        description: `Current SoC is ${(batteryNode.soc ?? 0).toFixed(0)}%. Consider adjusting charge strategy.`,
        actionLabel: 'Get Recommendation',
        onAction: () => onNavigateSection('recommendation'),
      });
    }

    if ((stats.totalGridImportKWh ?? 0) > (stats.totalSolarKWh ?? 0) * 0.8 && minuteData.length > 0) {
      items.push({
        id: 'grid-heavy',
        title: 'High grid dependency detected',
        description: 'Grid imports are high relative to solar production in this run.',
        actionLabel: 'Review Config',
        onAction: () => onNavigateSection('configuration'),
      });
    }

    if (items.length === 0) {
      items.push({
        id: 'all-good',
        title: 'System status normal',
        description: 'No immediate action required. Performance indicators are within expected range.',
      });
    }

    return items;
  }, [batteryNode.soc, isAutoMode, minuteData.length, onNavigateSection, stats.totalGridImportKWh, stats.totalSolarKWh]);

  return (
    <>
      <style jsx global>{`
        .print-only-summary { display: none; }
        @media print {
          .print-only-summary {
            display: block;
            padding: 24px;
            color: #0f172a;
            background: white;
          }
          .hide-in-print { display: none !important; }
        }
      `}</style>

      <div className="hide-in-print">
        <DashboardHeader
          currentDate={currentDate}
          onReset={handleReset}
          onDownload={() => setIsReportOpen(true)}
          onSaveScenario={handleSaveScenario}
          notifications={headerNotifications}
        />

        <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-8">
          <div className="max-w-7xl mx-auto space-y-6 lg:space-y-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[var(--battery-soft)] border border-[var(--battery)]/20 flex items-center justify-center shrink-0">
                  <LayoutDashboard size={20} className="text-[var(--battery)]" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-[var(--text-primary)]">Energy Dashboard</h2>
                  <p className="text-sm text-[var(--text-tertiary)]">Monitor your solar energy system in real time</p>
                </div>
              </div>
              <TimeRangeSwitcher selectedRange={timeRange} onRangeChange={setTimeRange} />
            </div>

            <InsightsBanner
              systemEfficiency={trendsData.systemEfficiency}
              todaySavings={stats.totalSavingsKES}
              savingsChange={trendsData.savingsChange}
              forecastChange={trendsData.forecastChange}
              batteryOptimized={trendsData.batteryOptimized}
              alertCount={3}
            />

            <StatCards
              totalGeneration={Number(stats.totalSolarKWh.toFixed(1))}
              currentPower={Number(solarPower.toFixed(1))}
              consumption={Number(stats.totalConsumptionKWh.toFixed(1))}
              savings={Math.round(stats.totalSavingsKES)}
              generationHistory={sparklineData.gen}
              powerHistory={sparklineData.power}
              consumptionHistory={sparklineData.cons}
              savingsHistory={sparklineData.savings}
              weeklyAvgGeneration={trendsData.weeklyAvgGen}
              weeklyAvgConsumption={trendsData.weeklyAvgCons}
              yesterdaySavings={trendsData.yesterdaySavings}
            />

            <PowerFlowVisualization
              solarPower={solarPower}
              batteryPower={batteryPower}
              gridPower={gridPower}
              homePower={homePower}
              batteryLevel={batteryLevel}
              flowDirection={flowDirection}
              detailBasePath="/demo"
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Card className="dashboard-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-[var(--text-primary)]">
                      <TrendingUp className="h-5 w-5 text-[var(--battery)]" />
                      Generation vs Consumption
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <DailyEnergyGraph
                      data={graphData}
                      dateLabel={currentDate?.toISOString().slice(0, 10)}
                      minuteData={minuteData}
                      solarCapacityKw={solarNode.capacityKW}
                      expectedOutputData={expectedOutputData}
                      showSoCBands
                    />
                  </CardContent>
                </Card>
              </div>
              <div>
                <Card className="dashboard-card h-full">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-[var(--text-primary)]">
                      <PieChart className="h-5 w-5 text-[var(--grid)]" />
                      Energy Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex flex-col items-center justify-center py-6 gap-5">
                      <div className="relative flex h-40 w-40 items-center justify-center">
                        <div className="absolute inset-0 rounded-full bg-[var(--bg-card-muted)]" />
                        <svg viewBox="0 0 120 120" className="absolute inset-0 w-full h-full -rotate-90">
                          <circle cx="60" cy="60" r="48" fill="none" stroke="var(--solar)" strokeWidth="14" strokeDasharray={`${ringSegments.solar} ${ringSegments.circumference}`} strokeLinecap="round" opacity="0.9" />
                          <circle cx="60" cy="60" r="48" fill="none" stroke="var(--consumption)" strokeWidth="14" strokeDasharray={`${ringSegments.consumption} ${ringSegments.circumference}`} strokeDashoffset={`${-ringSegments.solar}`} strokeLinecap="round" opacity="0.9" />
                          <circle cx="60" cy="60" r="48" fill="none" stroke="var(--grid)" strokeWidth="14" strokeDasharray={`${ringSegments.export} ${ringSegments.circumference}`} strokeDashoffset={`${-(ringSegments.solar + ringSegments.consumption)}`} strokeLinecap="round" opacity="0.9" />
                        </svg>
                        <div className="text-center z-10">
                          <div className="text-xl font-bold text-[var(--text-primary)]">{Math.round(energySplit.solarPct * 100)}%</div>
                          <div className="text-[10px] text-[var(--text-tertiary)]">Solar</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <PanelStatusTable />
              </div>
              <div className="flex flex-col gap-6">
                <WeatherCard locationName={activeLocation.displayName} temperature={ambientTemp} irradiance={Math.round((latestPoint?.solarKW ?? 0) * 80)} />
                <BatteryStatusCard batteryLevel={batteryLevel} batteryPower={batteryPower} isCharging={batteryPower >= 0} temperature={batteryTemp} showDeratingBadge deratingPct={deratingPct} showSoCBands />
              </div>
            </div>

            <SystemVisualization />

            <EngineeringKpisCard
              deratingPct={deratingPct}
              showDeratingBadge
              financeSummary={{
                lcoeKesPerKwh: financialSnapshot.lcoeKesPerKwh,
                npvKes: financialSnapshot.npvKes,
                irrPct: financialSnapshot.irrPct,
                paybackYears: financialSnapshot.paybackYears,
              }}
            />

            {financialSnapshot.energy.trackedDays > 0 && (
              <SocialImpactCard
                householdsPowered={socialImpact.householdsPowered}
                keroseneDisplacedLiters={socialImpact.keroseneDisplacedLiters}
                co2AvoidedKg={socialImpact.co2AvoidedKg}
                annualSolarGeneratedKwh={socialImpact.annualSolarGeneratedKwh}
                countyName={activeLocation.county}
                countyNote={activeLocation.countyNote}
                countyElectrificationRatePct={activeLocation.electrificationRatePct}
                isKosapTarget={activeLocation.isKosapTarget}
              />
            )}

            <AlertsList />
          </div>
        </main>
      </div>

      <EnergyReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        savings={stats.totalSavingsKES}
        solarConsumed={stats.totalSolarKWh}
        gridImport={stats.totalGridImportKWh ?? 0}
        minuteData={minuteData}
        systemStartDate={minuteData[0]?.date ?? new Date().toISOString().slice(0, 10)}
        onExportCsv={handleExportCsv}
        onExportExcel={handleExportExcel}
        onFormalReport={handleFormalReport}
        onDownloadCharts={handleDownloadCharts}
        carbonOffset={accumulators.carbonOffset}
      />
    </>
  );
}

function DemoSimulationView({ onNavigateSection }: { onNavigateSection: (section: DashboardSection) => void }) {
  useDemoEnergySystem(true);
  return (
    <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6 lg:space-y-8">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[var(--grid-soft)] border border-[var(--grid)]/20 flex items-center justify-center shrink-0">
            <FlaskConical size={20} className="text-[var(--grid)]" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">Simulation</h2>
            <p className="text-sm text-[var(--text-tertiary)]">Physics engine, scenario controls and system visualisation</p>
          </div>
        </div>
        <Accordion type="single" collapsible defaultValue="simulation-core" className="rounded-xl border border-[var(--border)] px-4">
          <AccordionItem value="simulation-core">
            <AccordionTrigger className="text-sm font-medium text-muted-foreground">Simulation Core</AccordionTrigger>
            <AccordionContent>
              <SimulationNodes />
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="validation-testing">
            <AccordionTrigger className="text-sm font-medium text-muted-foreground">Validation &amp; Testing Panel</AccordionTrigger>
            <AccordionContent>
              <ValidationPanel />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </main>
  );
}

function DemoConfigurationView({ activeLocation, onLocationPickerOpen }: { activeLocation: LocationOption; onLocationPickerOpen: () => void }) {
  return (
    <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6 lg:space-y-8">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[var(--solar-soft)] border border-[var(--solar)]/20 flex items-center justify-center shrink-0">
              <SlidersHorizontal size={20} className="text-[var(--solar)]" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-[var(--text-primary)]">System Configuration</h2>
              <p className="text-sm text-[var(--text-tertiary)]">Configure solar panels, battery, EV chargers and load profiles</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onLocationPickerOpen}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--border-strong)] bg-[var(--bg-card-hover)] px-3 py-1.5 text-sm font-medium text-[var(--text-secondary)] hover:border-[var(--battery)] hover:text-[var(--battery)] transition-colors"
          >
            <MapPin size={14} className="shrink-0" />
            <span className="max-w-[200px] truncate">{activeLocation.displayName}</span>
            <span className="text-[10px] text-[var(--text-tertiary)]">{activeLocation.county}</span>
          </button>
        </div>
        <PVSizingSection locationOverride={activeLocation} />
        <LoadConfigComponents />
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
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[var(--battery-soft)] border border-[var(--battery)]/20 flex items-center justify-center shrink-0">
            <DollarSign size={20} className="text-[var(--battery)]" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">Finance: Live Results</h2>
            <p className="text-sm text-[var(--text-tertiary)]">CAPEX, LCOE, NPV, IRR and payback from your current simulation</p>
          </div>
        </div>
        <FinancialDashboard
          snapshot={snapshot}
          inputs={financialInputs}
          onInputsChange={onFinancialInputsChange}
          hasSimulationData={minuteData.length > 0}
          expectedYieldKwh={(10) * 5.4}
          actualYieldKwh={snapshot.energy.avgDailySolarKWh}
          tariffRate={financialInputs.chargingTariffKes}
        />
      </div>
    </main>
  );
}

function DemoRecommendationView() {
  const minuteData = useMinuteData('today');
  return (
    <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6 lg:space-y-8">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[var(--ev-soft)] border border-[var(--ev)]/20 flex items-center justify-center shrink-0">
            <Lightbulb size={20} className="text-[var(--ev)]" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">Recommendations</h2>
            <p className="text-sm text-[var(--text-tertiary)]">AI-powered sizing and configuration recommendations</p>
          </div>
        </div>
        <RecommendationComponents solarData={NAIROBI_SOLAR_DATA} minuteData={minuteData as SimulationMinuteRecord[]} />
      </div>
    </main>
  );
}

function DemoAIAssistantView({ onNavigateSection }: { onNavigateSection: (section: DashboardSection) => void }) {
  const { currentDate } = useSimulationState();
  const minuteData = useMinuteData('today');
  return (
    <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6 lg:space-y-8">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[var(--ev-soft)] border border-[var(--ev)]/20 flex items-center justify-center shrink-0">
            <Bot size={20} className="text-[var(--ev)]" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">AI Assistant</h2>
            <p className="text-sm text-[var(--text-tertiary)]">Ask questions about your live energy system</p>
          </div>
        </div>
        <SafariChargeAIAssistant
          isOpen={true}
          onClose={() => onNavigateSection('dashboard')}
          data={null}
          timeOfDay={currentDate ? currentDate.getHours() + currentDate.getMinutes() / 60 : 12}
          weather="clear"
          currentDate={currentDate ?? new Date()}
          isAutoMode={true}
          minuteData={minuteData as SimulationMinuteRecord[]}
          systemConfig={{
            mode: 'auto',
            panelCount: 20,
            panelWatt: 500,
            inverterKw: 10,
            inverterUnits: 1,
            batteryKwh: 50,
            maxChargeKw: 5,
            maxDischargeKw: 5,
            evChargerKw: 7.4,
            loadScale: 1,
            loadProfile: 'residential',
            evCommuterScale: 1,
            evFleetScale: 1,
            homeLoadEnabled: true,
            homeLoadKw: 3,
            commercialLoadEnabled: false,
            commercialLoadKw: 0,
            industrialLoadEnabled: false,
            industrialLoadKw: 0,
            accessoryLoadKw: 0,
            accessoryScale: 1,
            performanceRatio: 0.8,
            shadingLossPct: 0,
            pvCapacityKw: 10,
          }}
        />
      </div>
    </main>
  );
}
