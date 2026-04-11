'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback, useLayoutEffect } from 'react';
import {
  Sun, Moon, Battery, Zap, TrendingUp, Settings, ChevronDown, ChevronRight,
  MapPin, AlertTriangle, CheckCircle, Info, BarChart3, Home, Car, Grid,
  UtilityPole, ArrowDown, ArrowUp, Wind, Thermometer, Eye, Droplets,
  Activity, Cpu, Shield, Bell, Download, RefreshCw, Play, Pause, SkipForward
} from 'lucide-react';
import DailyEnergyGraph, { type GraphDataPoint, buildGraphSVG, triggerJPGDownload, buildJPGBlob } from '@/components/DailyEnergyGraph';
import { LocationSelector, RecommendationPanel } from '@/components/RecommendationComponents';
import type { LocationCoordinates, SolarIrradianceData } from '@/lib/nasa-power-api';
import FinancialDashboard from '@/components/FinancialDashboard';
import { buildFinancialSnapshot, type FinancialInputs } from '@/lib/financial-dashboard';
import { KENYA_LOCATIONS } from '@/lib/nasa-power-api';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import type { DashboardSection, SidebarContextMetric } from '@/components/dashboard/DashboardSidebar';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { PowerFlowVisualization } from '@/components/dashboard/PowerFlowVisualization';
import { WeatherCard } from '@/components/dashboard/WeatherCard';
import { BatteryStatusCard } from '@/components/dashboard/BatteryStatusCard';
import { BatteryHealthCard, type BatteryInsight } from '@/components/dashboard/BatteryHealthCard';
import { AlertsPanel } from '@/components/dashboard/AlertsPanel';
import { SizingWizard } from '@/components/SizingWizard';
import { AutoSizingWizard } from '@/components/AutoSizingWizard';
import { IntelligencePanel } from '@/components/IntelligencePanel';
import { LoadConfigurationPanel } from '@/components/LoadConfigurationPanel';
import { generateDayScenario, nextWeatherMarkov } from '@/simulation/timeEngine';
import { runSolarSimulation } from '@/simulation/runSimulation';
import { gaussianRandom } from '@/simulation/mathUtils';
import { RigidCable, HorizontalCable, SolarPanelProduct, BatteryProduct, EVChargerProduct, InverterProduct, GridProduct, HomeProduct } from '@/components/simulation/SimulationNodes';