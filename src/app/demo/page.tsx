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
import { BarChart3, PieChart, TrendingUp, Leaf, Car, Trees } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { EnergyReportModal } from '@/components/energy/EnergyReportModal';
import type { SolarIrradianceData } from '@/lib/nasa-power-api';
import { useEnergySystemStore } from '@/stores/energySystemStore';
import { SIZING_SIMULATOR_STORAGE_KEY, parseSimulatorSizingPayload } from '@/lib/pv-sizing';
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { MapPin, Sun, Info } from 'lucide-react';
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