'use client';
/* eslint-disable */

import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { BrandLogo } from '@/components/brand-logo';
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
import { BarChart3, PieChart, TrendingUp, Leaf, Car, Trees, LayoutDashboard, FlaskConical, SlidersHorizontal, DollarSign, Lightbulb, Bot, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { EnergyReportModal } from '@/components/energy/EnergyReportModal';
import type { SolarIrradianceData } from '@/lib/nasa-power-api';
import { useEnergySystemStore } from '@/stores/energySystemStore';
import { SIZING_SIMULATOR_STORAGE_KEY, parseSimulatorSizingPayload } from '@/lib/pv-sizing';
import { getUserPreference, setUserPreference } from '@/lib/supabase-db';
import { useToast } from '@/hooks/use-toast';
import { useUserPreference } from '@/hooks/useUserPreference';
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
import { SizingDispatchPanel, buildInputs as buildSizingInputs } from '@/components/simulation/SizingDispatchPanel';
import { SimpleDashboard } from '@/components/simulation/SimpleDashboard';
import { SafariChargeAIAssistant } from '@/components/ai/AIAssistant';
import { ScenariosTabView } from '@/components/scenarios/ScenariosTabView';
import { EnergyIntelligenceView } from '@/components/energy-intelligence/EnergyIntelligenceView';

// Onboarding Overlay Tour Guide
function OnboardingTour({
  activeSection,
  onNavigateSection,
  onClose,
}: {
  activeSection: DashboardSection;
  onNavigateSection: (section: DashboardSection) => void;
  onClose: () => void;
}) {
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: 'Welcome to SafariCharge!',
      description: 'Your location is initialized! Let’s walk through optimizing your clean energy microgrid in 4 quick steps.',
      targetSection: 'dashboard' as DashboardSection,
      actionLabel: 'Get Started',
    },
    {
      title: 'Step 1: Simulate your system',
      description: 'Go to "Simulate" to pick a preset (Home, Office, Factory...), choose your hardware, and watch the live energy chart run in real time.',
      targetSection: 'configuration' as DashboardSection,
      actionLabel: 'Go to Design',
    },
    {
      title: 'Step 2: Design with load data',
      description: 'In "Design", answer a few questions about your appliances and the load-based sizing calculator builds a full BOM and 25-year financial model.',
      targetSection: 'dashboard' as DashboardSection,
      actionLabel: 'Go to Operations',
    },
    {
      title: 'Step 3: Financial Modeling',
      description: 'Explore CapEx/OpEx forecasts, live savings, dynamic LCOE, NPV, and IRR planning in the Financials tab.',
      targetSection: 'financial' as DashboardSection,
      actionLabel: 'Go to Financials',
    },
    {
      title: 'Step 4: AI Insights',
      description: 'Switch to "AI Insights" to analyze county-wide NASA irradiance curves or chat with the AI Copilot for recommendations.',
      targetSection: 'energy-intelligence' as DashboardSection,
      actionLabel: 'Finish Tour',
    },
  ];

  const currentStep = steps[step];

  const handleNext = () => {
    if (step < steps.length - 1) {
      const nextStep = steps[step + 1];
      onNavigateSection(nextStep.targetSection);
      setStep(step + 1);
    } else {
      localStorage.setItem('sc_tour_completed', 'true');
      onClose();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[999] max-w-sm bg-[var(--bg-card)] border-2 border-[var(--battery)]/40 rounded-2xl p-5 shadow-2xl backdrop-blur-xl bg-opacity-95 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="absolute top-0 right-0 w-[100px] h-[100px] bg-[var(--battery)]/5 rounded-full blur-[30px] pointer-events-none" />
      <div className="space-y-3 relative z-10">
        <div className="flex justify-between items-center">
          <Badge className="bg-[var(--battery-soft)] text-[var(--battery)] border-[var(--battery)]/20 px-2 py-0.5 text-[10px]">
            Step {step} of {steps.length - 1}
          </Badge>
          <button
            onClick={() => {
              localStorage.setItem('sc_tour_completed', 'true');
              onClose();
            }}
            className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
          >
            Skip
          </button>
        </div>
        
        <h4 className="text-sm font-extrabold text-[var(--text-primary)] flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--battery)] animate-ping" />
          {currentStep.title}
        </h4>
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          {currentStep.description}
        </p>

        <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
          <div className="flex gap-1">
            {steps.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? 'w-3.5 bg-[var(--battery)]' : 'w-1.5 bg-[var(--border-strong)]'
                }`}
              />
            ))}
          </div>
          <button
            onClick={handleNext}
            className="bg-[var(--battery)] text-white hover:bg-[var(--battery-bright)] font-bold text-xs px-3.5 py-1.5 rounded-xl shadow-md transition-all flex items-center gap-1"
          >
            {currentStep.actionLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
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
  countyNote: `${city.region} -  elevation ${city.elevation} m, avg ${city.avgTempC}°C, annual GHI ${city.annualGHI} kWh/m².`,
}));

const DEFAULT_LOCATION: LocationOption = AFRICA_LOCATIONS.find(l => l.name === 'Nairobi') ?? AFRICA_LOCATIONS[0];

const KENYA_HOUSEHOLD_ANNUAL_KWH = 1200;
const KEROSENE_DISPLACEMENT_L_PER_KWH = 0.8;
const KENYA_DIESEL_BACKUP_CO2_KG_PER_KWH = 0.4;
// ─────────────────────────────────────────────────────────────────────────────



export default function ModularDashboardDemo({
  initialSection = 'dashboard',
}: { initialSection?: DashboardSection } = {}) {
  const demoBreadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://solar.rauell.systems/landing',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Demo',
      },
    ],
  }

  const softwareAppJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'SafariCharge Solar Energy Simulator',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    description: 'Simulate a solar + BESS microgrid, run MILP dispatch optimization, and see KPLC cost savings in Kenya.',
    url: 'https://solar.rauell.systems/demo',
    image: 'https://solar.rauell.systems/og-image.png',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      description: 'Free demo',
    },
    author: {
      '@type': 'Organization',
      name: 'SafariCharge',
      url: 'https://solar.rauell.systems',
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(demoBreadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppJsonLd) }}
      />
      <DemoIntegratedShell initialSection={initialSection} />
    </>
  )
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

  const hasSetupLocation = useEnergySystemStore((s) => s.hasSetupLocation);
  const setHasSetupLocation = useEnergySystemStore((s) => s.setHasSetupLocation);
  const [isChecking, setIsChecking] = useState(!hasSetupLocation);
  
  // Continuous simulation background loop running across all dashboard sections
  useDemoEnergySystem(hasSetupLocation);

  const activeLocation = useEnergySystemStore((s) => s.activeLocation);
  const setActiveLocation = useEnergySystemStore((s) => s.setActiveLocation);
  
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
  }, [setActiveLocation, toast]);

  // Debounced autosave to Supabase whenever fullSystemConfig or activeLocation changes
  useEffect(() => {
    if (!hasSetupLocation) return;

    const saveTimeout = setTimeout(async () => {
      try {
        const store = useEnergySystemStore.getState();
        const currentPref = await getUserPreference<any>('sc_site_config') || {};

        const nextPref = {
          siteName: currentPref.siteName || "SafariCharge Solar Microgrid",
          siteType: currentPref.siteType || "Commercial",
          gridConnection: currentPref.gridConnection || (store.systemConfig.systemMode === 'off-grid' ? 'Off-Grid' : 'Hybrid'),
          location: {
            city: store.activeLocation.name,
            lat: store.activeLocation.latitude,
            lon: store.activeLocation.longitude,
          },
          pvCapacity: store.fullSystemConfig.solar.totalCapacityKw,
          batteryStorage: store.fullSystemConfig.battery.capacityKwh,
          peakLoad: store.fullSystemConfig.inverter.capacityKw,
          dailyEnergy: Math.round(store.fullSystemConfig.inverter.capacityKw * 4.5),
          evChargers: store.fullSystemConfig.loads.filter(l => l.type === 'ev' && l.enabled).length,
        };

        await setUserPreference('sc_site_config', nextPref);
      } catch (err) {
        console.error('[DemoIntegratedShell] Autosave failed:', err);
      }
    }, 1500); // 1.5s debounce to avoid thrashing the DB

    return () => clearTimeout(saveTimeout);
  }, [
    hasSetupLocation,
    useEnergySystemStore((s) => s.fullSystemConfig.solar.totalCapacityKw),
    useEnergySystemStore((s) => s.fullSystemConfig.battery.capacityKwh),
    useEnergySystemStore((s) => s.fullSystemConfig.inverter.capacityKw),
    useEnergySystemStore((s) => s.activeLocation.name),
    useEnergySystemStore((s) => s.fullSystemConfig.loads),
  ]);

  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    if (hasSetupLocation) {
      const tourCompleted = localStorage.getItem('sc_tour_completed');
      if (!tourCompleted) {
        setShowTour(true);
      }
    }
  }, [hasSetupLocation]);

  // Fallback timeout to prevent getting stuck in loading state
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsChecking(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  // Hydrate site config preference if saved
  useEffect(() => {
    if (hasSetupLocation) {
      setIsChecking(false);
      return;
    }
    (async () => {
      try {
        const { getUserPreference } = await import('@/lib/supabase-db');
        const saved = await getUserPreference<{
          siteName: string;
          siteType: string;
          gridConnection: string;
          location: { city: string; lat: number; lon: number } | null;
          pvCapacity: number;
          batteryStorage: number;
          peakLoad: number;
          dailyEnergy: number;
          evChargers: number;
        }>('sc_site_config');

        if (saved) {
          // If we found a site config, update location
          if (saved.location) {
            const matchedLocation = AFRICA_LOCATIONS.find(
              (l) => l.name.toLowerCase() === saved.location?.city.toLowerCase()
            );
            if (matchedLocation) {
              setActiveLocation(matchedLocation);
            } else {
              setActiveLocation({
                name: saved.location.city,
                displayName: `${saved.location.city}, Kenya`,
                county: 'Kenya',
                latitude: saved.location.lat,
                longitude: saved.location.lon,
                annualAvgSunHours: 5.4,
                isKosapTarget: false,
                electrificationRatePct: null,
                countyNote: 'Custom registered site location.',
              });
            }
          }

          const calculatedInverterCapacity = Math.max(
            saved.peakLoad || 10,
            Math.round(((saved.pvCapacity || 10) / 1.2) * 10) / 10
          );

          // Update store configuration
          const store = useEnergySystemStore.getState();
          const nextFullSystemConfig = {
            ...store.fullSystemConfig,
            solar: {
              ...store.fullSystemConfig.solar,
              totalCapacityKw: saved.pvCapacity || 10,
            },
            battery: {
              ...store.fullSystemConfig.battery,
              capacityKwh: saved.batteryStorage || 15,
            },
            inverter: {
              ...store.fullSystemConfig.inverter,
              capacityKw: calculatedInverterCapacity,
            },
          };
          store.updateFullSystemConfig(nextFullSystemConfig);
          store.updateSystemConfig({
            solarCapacityKW: saved.pvCapacity || 10,
            inverterKW: calculatedInverterCapacity,
            batteryCapacityKWh: saved.batteryStorage || 15,
          });
          store.updateNode('solar', { capacityKW: saved.pvCapacity || 10 });
          store.updateNode('battery', { capacityKWh: saved.batteryStorage || 15 });
          
          toast({
            title: 'Site details loaded',
            description: `Configuration loaded for "${saved.siteName}" (${saved.pvCapacity} kWp PV / ${saved.batteryStorage} kWh Storage).`,
          });
          setHasSetupLocation(true);
        } else {
          // No saved configuration. Initialize defaults automatically and bypass the setup wizard.
          const defaultLoc = AFRICA_LOCATIONS.find((l) => l.name === 'Nairobi') ?? AFRICA_LOCATIONS[0];
          
          const defaultSiteConfig = {
            siteName: 'SafariCharge Solar Microgrid',
            siteType: 'Commercial',
            gridConnection: 'Hybrid',
            location: {
              city: defaultLoc.name,
              lat: defaultLoc.latitude,
              lon: defaultLoc.longitude,
            },
            pvCapacity: 15,
            batteryStorage: 24,
            peakLoad: 10,
            dailyEnergy: 45,
            evChargers: 0,
          };

          try {
            const { setUserPreference } = await import('@/lib/supabase-db');
            await setUserPreference('sc_site_config', defaultSiteConfig);
          } catch (e) {
            console.error('Failed to save default site config preference:', e);
          }

          setActiveLocation(defaultLoc);

          // Update store configuration with defaults
          const store = useEnergySystemStore.getState();
          const nextFullSystemConfig = {
            ...store.fullSystemConfig,
            solar: {
              ...store.fullSystemConfig.solar,
              totalCapacityKw: 15,
            },
            battery: {
              ...store.fullSystemConfig.battery,
              capacityKwh: 24,
            },
            inverter: {
              ...store.fullSystemConfig.inverter,
              capacityKw: 10,
            },
          };
          store.updateFullSystemConfig(nextFullSystemConfig);
          store.updateSystemConfig({
            solarCapacityKW: 15,
            inverterKW: 10,
            batteryCapacityKWh: 24,
          });
          store.updateNode('solar', { capacityKW: 15 });
          store.updateNode('battery', { capacityKWh: 24 });

          setHasSetupLocation(true);
        }
      } catch (err) {
        console.error('[DemoPage] Failed to load site configuration preference:', err);
        setHasSetupLocation(false);
      } finally {
        setIsChecking(false);
      }
    })();
  }, [hasSetupLocation, setActiveLocation, setHasSetupLocation, toast]);

  useEffect(() => {
    (async () => {
      const localRaw = localStorage.getItem(SIZING_SIMULATOR_STORAGE_KEY);
      const remoteRaw = localRaw ? null : await getUserPreference<unknown>(SIZING_SIMULATOR_STORAGE_KEY);
      const payload = parseSimulatorSizingPayload(
        localRaw ?? (remoteRaw ? JSON.stringify(remoteRaw) : null)
      );
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
        capacityKw: Math.max(
          1,
          Math.max(
            store.fullSystemConfig.inverter.capacityKw,
            Math.round((payload.requiredPvCapacityKw / 1.2) * 10) / 10
          )
        ),
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
    })();
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
      {showTour && (
        <OnboardingTour
          activeSection={activeSection}
          onNavigateSection={setActiveSection}
          onClose={() => setShowTour(false)}
        />
      )}
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
                212 cities across Africa -  Meteonorm irradiance data
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
      return <DemoSimulationView onNavigateSection={onNavigateSection} financialInputs={financialInputs} />;
    case 'configuration':
      return <DemoConfigurationView activeLocation={activeLocation} onLocationPickerOpen={onLocationPickerOpen} onNavigateSection={onNavigateSection} />;
    case 'financial':
      return <DemoFinancialView financialInputs={financialInputs} onFinancialInputsChange={onFinancialInputsChange} />;
    case 'recommendation':
      return <DemoRecommendationView />;
    case 'ai-assistant':
      return <DemoAIAssistantView onNavigateSection={onNavigateSection} />;
    case 'scenarios':
      return <ScenariosTabView onNavigateSection={onNavigateSection} />;
    case 'energy-intelligence':
      return <DemoEnergyIntelligenceView onNavigateSection={onNavigateSection} />;
    case 'dashboard':
    default:
      return <DemoDashboardView financialInputs={financialInputs} onFinancialInputsChange={onFinancialInputsChange} onNavigateSection={onNavigateSection} activeLocation={activeLocation} onLocationPickerOpen={onLocationPickerOpen} />;
  }
}

function DemoEnergyIntelligenceView({ onNavigateSection }: { onNavigateSection: (section: DashboardSection) => void }) {
  const [subTab, setSubTab] = useState<'telemetry' | 'copilot'>('telemetry');
  return (
    <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="pb-4 flex justify-between items-center gap-4 flex-wrap border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[var(--ev-soft)] border border-[var(--ev)]/20 flex items-center justify-center shrink-0">
              <Zap size={20} className="text-[var(--ev)]" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-[var(--text-primary)]">Intelligence &amp; AI</h2>
              <p className="text-sm text-[var(--text-tertiary)]">Explore physics storage simulations or chat with your AI copilot</p>
            </div>
          </div>
          <div className="flex bg-[var(--bg-card-muted)] border border-[var(--border)] rounded-xl p-1 gap-1">
            <button
              type="button"
              onClick={() => setSubTab('telemetry')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                subTab === 'telemetry'
                  ? 'bg-[var(--battery)] text-white shadow-md'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Storage Simulation
            </button>
            <button
              type="button"
              onClick={() => setSubTab('copilot')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                subTab === 'copilot'
                  ? 'bg-[var(--battery)] text-white shadow-md'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              AI Copilot
            </button>
          </div>
        </div>
        {subTab === 'telemetry' ? (
          <EnergyIntelligenceView />
        ) : (
          <DemoAIAssistantView onNavigateSection={onNavigateSection} />
        )}
      </div>
    </main>
  );
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

  const storeSolarData = useEnergySystemStore((s) => s.solarData);

  const currentSolarData = useMemo(() => ({
    latitude: storeSolarData.latitude,
    longitude: storeSolarData.longitude,
    location: activeLocation.name,
    monthlyAverage: storeSolarData.monthlyAvgKwhPerKwp,
    annualAverage: storeSolarData.annualAvgKwhPerKwp,
    monthlyTemperature: storeSolarData.monthlyAvgTemp,
    peakSunHours: storeSolarData.monthlyAvgKwhPerKwp,
  }), [storeSolarData, activeLocation]);

  const handleSaveScenario = useCallback((name: string) => {
    const snap = buildFinancialSnapshot({
      minuteData: minuteData as Parameters<typeof buildFinancialSnapshot>[0]['minuteData'],
      solarData: currentSolarData,
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
  }, [activeLocation.latitude, activeLocation.longitude, activeLocation.name, currentSolarData, financialInputs, minuteData, saveScenario, toast]);

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
    solarData: currentSolarData,
    inputs: financialInputs,
    evCapacityKw: 22,
  }), [currentSolarData, financialInputs, minuteData]);

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
                <BatteryStatusCard
                  batteryLevel={batteryLevel}
                  batteryPower={batteryPower}
                  isCharging={batteryPower >= 0}
                  temperature={batteryTemp}
                  showDeratingBadge
                  deratingPct={deratingPct}
                  showSoCBands
                  healthPct={latestPoint?.batteryHealthPct ?? 100}
                  cycleCount={latestPoint?.batteryCycles ?? 0}
                  marginalLcos={latestPoint?.marginalLcos ?? 9.2}
                />
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

function DemoSimulationView({
  onNavigateSection,
  financialInputs,
}: {
  onNavigateSection: (section: DashboardSection) => void;
  financialInputs: FinancialInputs;
}) {
  useDemoEnergySystem(true);

  const [savingRun, setSavingRun] = useState(false);
  const { toast } = useToast();
  
  const store = useEnergySystemStore();
  const minuteData = store.minuteData;
  const systemConfig = store.systemConfig;

  const handleSaveRun = async () => {
    if (minuteData.length === 0) {
      toast({ title: 'No Data', description: 'Run the simulation first before saving.', variant: 'destructive' });
      return;
    }
    setSavingRun(true);
    try {
      const { saveSimulationRun } = await import('@/lib/supabase-db');
      const { computeProfessionalEngineeringKpis } = await import('@/lib/engineeringKpis');
      
      const storeSolarData = store.solarData;
      const activeLocation = store.activeLocation;
      
      const currentSolarData = {
        latitude: storeSolarData.latitude,
        longitude: storeSolarData.longitude,
        location: activeLocation.name,
        monthlyAverage: storeSolarData.monthlyAvgKwhPerKwp,
        annualAverage: storeSolarData.annualAvgKwhPerKwp,
        monthlyTemperature: storeSolarData.monthlyAvgTemp,
        peakSunHours: storeSolarData.monthlyAvgKwhPerKwp,
      };

      const financialSnapshot = buildFinancialSnapshot({
        minuteData: minuteData as Parameters<typeof buildFinancialSnapshot>[0]['minuteData'],
        solarData: currentSolarData,
        inputs: financialInputs,
        evCapacityKw: 22,
      });

      const engineeringKpis = computeProfessionalEngineeringKpis({
        minuteData,
        systemCapacityKwp: Math.max(systemConfig.solarCapacityKW, 0),
        avgDailySunHours: activeLocation.annualAvgSunHours,
      });

      // Calculate summary metrics
      const totalSolarKwh = minuteData.reduce((sum, d) => sum + (d.solarKW || 0) / 60, 0);
      const totalLoadKwh = minuteData.reduce((sum, d) => sum + (d.homeLoadKW || 0) / 60, 0);
      const totalSavingsKes = minuteData.reduce((sum, d) => sum + (d.savingsKES || 0), 0);
      const totalGridImportKwh = minuteData.reduce((sum, d) => sum + (d.gridImportKW || 0) / 60, 0);
      const totalGridExportKwh = minuteData.reduce((sum, d) => sum + (d.gridExportKW || 0) / 60, 0);
      const totalEvKwh = minuteData.reduce((sum, d) => sum + ((d.ev1LoadKW || 0) + (d.ev2LoadKW || 0)) / 60, 0);
      const totalConsumptionKwh = totalLoadKwh + totalEvKwh;

      const selfSufficiencyPct = totalConsumptionKwh > 0
        ? Math.min(100, ((totalConsumptionKwh - totalGridImportKwh) / totalConsumptionKwh) * 100)
        : 0;
      
      // Compute sizing snapshot for hardware BOM + financial storage
      let sizingSnapshot: Record<string, unknown> | undefined;
      try {
        const { runSimulation } = await import('@/lib/sizing/solarCalculator');
        const sizingCatalog = await fetch('/api/sizing-catalog').then((r) => r.json());
        const sizingInputs = buildSizingInputs(systemConfig, activeLocation.name, sizingCatalog);
        const sizingResults = runSimulation(sizingInputs, sizingCatalog);
        sizingSnapshot = {
          solarCapacityKWp: sizingResults.solarCapacityKWp,
          batteryCapacityKWh: sizingResults.batteryCapacityKWh,
          inverterCapacityKW: sizingResults.inverterCapacityKW,
          totalCapExKSh: sizingResults.totalCapExKSh,
          totalCapExUSD: sizingResults.totalCapExUSD,
          annualSavingsUSD: sizingResults.annualSavingsUSD,
          annualPVGeneratedKWh: sizingResults.annualPVGeneratedKWh,
          systemAutonomyPercent: sizingResults.systemAutonomyPercent,
          simplePaybackYears: sizingResults.simplePaybackYears,
          irrPercent: sizingResults.irrPercent,
          npvUSD: sizingResults.npvUSD,
          lcoeUSDPerKWh: sizingResults.lcoeUSDPerKWh,
          panel: sizingResults.bomLineItems.find(b => b.section === '1. Solar PV Modules')?.description ?? '',
          battery: sizingResults.bomLineItems.find(b => b.section === '2. Energy Storage' && b.itemNumber === '2')?.description ?? '',
          inverter: sizingResults.bomLineItems.find(b => b.section === '3. Inverter & Monitoring' && b.itemNumber === '6')?.description ?? '',
        };
      } catch {
        // sizing snapshot is best-effort; don't block the save if it fails
      }

      const runName = `Sim - ${new Date().toLocaleString()}`;

      await saveSimulationRun({
        name: runName,
        solarCapacityKw: systemConfig.solarCapacityKW,
        batteryCapacityKwh: systemConfig.batteryCapacityKWh,
        inverterKw: systemConfig.inverterKW,
        systemMode: systemConfig.systemMode,
        locationName: activeLocation.displayName,
        latitude: activeLocation.latitude,
        longitude: activeLocation.longitude,
        sizingSnapshot,
        summaryJson: {
          totalSolarKwh,
          totalLoadKwh,
          totalSavingsKes,
          durationMinutes: minuteData.length,
          lcoeKesPerKwh: financialSnapshot.lcoeKesPerKwh,
          npvKes: financialSnapshot.npvKes,
          irrPct: financialSnapshot.irrPct,
          paybackYears: financialSnapshot.paybackYears,
          capexTotal: financialSnapshot.capex.total,
          selfSufficiencyPct,
          totalGridImportKwh,
          totalGridExportKwh,
          specificYieldKWhPerKWp: engineeringKpis.specificYield,
          performanceRatioPct: engineeringKpis.performanceRatio,
          capacityFactorPct: engineeringKpis.capacityFactor,
          batteryCycles: engineeringKpis.batteryCyclesPerYear,
          co2AvoidedKg: engineeringKpis.co2AvoidedKgPerYear,
          selfConsumptionRate: engineeringKpis.selfConsumptionRate,
          gridIndependence: engineeringKpis.gridIndependence,
        },
        minuteData: minuteData.map(pt => ({
          ts: pt.timestamp,
          solarKw: pt.solarKW,
          homeLoadKw: pt.homeLoadKW,
          ev1LoadKw: pt.ev1LoadKW ?? 0,
          ev2LoadKw: pt.ev2LoadKW ?? 0,
          batteryLevelPct: pt.batteryLevelPct,
          gridImportKw: pt.gridImportKW,
          gridExportKw: pt.gridExportKW,
          savingsKes: pt.savingsKES,
          tariffRate: pt.tariffRate ?? 22,
          isPeakTime: pt.isPeakTime ?? false,
        })),
      });

      toast({
        title: 'Simulation saved',
        description: `Your simulation run "${runName}" has been successfully logged for future reference.`,
      });
    } catch (err: any) {
      toast({
        title: 'Failed to save',
        description: err.message || 'Error occurred while saving simulation run.',
        variant: 'destructive',
      });
    } finally {
      setSavingRun(false);
    }
  };

  return (
    <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6 lg:space-y-8">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[var(--grid-soft)] border border-[var(--grid)]/20 flex items-center justify-center shrink-0">
            <FlaskConical size={20} className="text-[var(--grid)]" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">Simulate</h2>
            <p className="text-sm text-[var(--text-tertiary)]">Live energy dashboard - configure hardware, watch the physics engine run, inspect the system diagram below</p>
          </div>
        </div>

        {/* Primary: hardware config + live chart + KPIs + financials */}
        <SimpleDashboard onSaveRun={handleSaveRun} isSaving={savingRun} />

        {/* Physics details - collapsed by default, expand to dig deeper */}
        <Accordion type="multiple" className="rounded-xl border border-[var(--border)] px-4">
          <AccordionItem value="simulation-core">
            <AccordionTrigger className="text-sm font-semibold text-[var(--text-secondary)]">System Diagram</AccordionTrigger>
            <AccordionContent>
              <SimulationNodes />
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="validation-testing">
            <AccordionTrigger className="text-sm font-semibold text-[var(--text-secondary)]">Validation Panel</AccordionTrigger>
            <AccordionContent>
              <ValidationPanel />
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="parametric-analysis">
            <AccordionTrigger className="text-sm font-semibold text-[var(--text-secondary)]">Parametric Analysis</AccordionTrigger>
            <AccordionContent>
              <SizingDispatchPanel />
            </AccordionContent>
          </AccordionItem>
        </Accordion>

      </div>
    </main>
  );
}

function DemoConfigurationView({ activeLocation, onLocationPickerOpen, onNavigateSection }: { activeLocation: LocationOption; onLocationPickerOpen: () => void; onNavigateSection: (s: DashboardSection) => void }) {
  return (
    <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6 lg:space-y-8">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[var(--solar-soft)] border border-[var(--solar)]/20 flex items-center justify-center shrink-0">
              <SlidersHorizontal size={20} className="text-[var(--solar)]" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-[var(--text-primary)]">System Design</h2>
              <p className="text-sm text-[var(--text-tertiary)]">Load-based sizing calculator - answer a few questions to get a full BOM and financial model</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onLocationPickerOpen}
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-card-hover)] px-3 py-1.5 text-sm font-medium text-[var(--text-secondary)] hover:border-[var(--battery)] hover:text-[var(--battery)] transition-colors"
          >
            <MapPin size={14} className="shrink-0" />
            <span className="max-w-[120px] truncate">{activeLocation.displayName}</span>
            <span className="text-[10px] text-[var(--text-tertiary)]">{activeLocation.county}</span>
          </button>
        </div>

        <div className="flex items-center justify-between gap-4 rounded-xl border border-[var(--battery)]/30 bg-[var(--battery-soft)] px-4 py-3">
          <div className="flex items-center gap-3">
            <FlaskConical size={18} className="text-[var(--battery)] shrink-0" />
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">Hardware already configured in Simulate</p>
              <p className="text-xs text-[var(--text-secondary)]">Inverter model, battery bank, panels, and location are set in the Simulate tab and sync here automatically.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigateSection('simulation')}
            className="shrink-0 rounded-lg bg-[var(--battery)] px-3 py-1.5 text-xs font-bold text-white hover:opacity-90 transition-opacity"
          >
            Go to Simulate
          </button>
        </div>

        <PVSizingSection locationOverride={activeLocation} />
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
        
        {minuteData.length > 0 && (
          <Card className="dashboard-card mt-6">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-[var(--battery)]" />
                Advanced Capital Planning
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-[var(--text-secondary)] font-medium">
                      <span>Project Lifetime</span>
                      <span className="font-bold text-[var(--text-primary)]">{financialInputs.projectYears} years</span>
                    </div>
                    <input
                      type="range"
                      min={5}
                      max={30}
                      step={1}
                      value={financialInputs.projectYears}
                      onChange={(e) => onFinancialInputsChange(prev => ({ ...prev, projectYears: Number(e.target.value) }))}
                      className="w-full h-1.5 accent-[var(--battery)] cursor-pointer"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-[var(--text-secondary)] font-medium">
                      <span>Discount Rate</span>
                      <span className="font-bold text-[var(--text-primary)]">{financialInputs.discountRatePct}%</span>
                    </div>
                    <input
                      type="range"
                      min={5}
                      max={30}
                      step={1}
                      value={financialInputs.discountRatePct}
                      onChange={(e) => onFinancialInputsChange(prev => ({ ...prev, discountRatePct: Number(e.target.value) }))}
                      className="w-full h-1.5 accent-[var(--battery)] cursor-pointer"
                    />
                  </div>
                </div>
                <div className="bg-[var(--bg-card-muted)] border border-[var(--border)] rounded-2xl p-4 flex flex-col justify-center gap-2">
                  <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Project Valuation Summary</h4>
                  <div className="grid grid-cols-2 gap-4 mt-1">
                    <div>
                      <span className="text-[10px] text-[var(--text-tertiary)] uppercase block">Net Present Value</span>
                      <span className="text-lg font-bold text-[var(--text-primary)]">KES {Math.round(snapshot.npvKes).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[var(--text-tertiary)] uppercase block">Internal Rate of Return</span>
                      <span className="text-lg font-bold text-[var(--text-primary)]">{snapshot.irrPct.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
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
          data={null as unknown as import('@/types/dashboard').AiSystemData}
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
