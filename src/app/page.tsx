'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback, useLayoutEffect } from 'react';
import {
  Sun, Cloud, Factory, Home, Building2, Battery, UtilityPole, Wifi,
  Clock, Smartphone, Zap, ArrowDown, ArrowUp, MessageSquare, X, Send,
  Sparkles, Loader2, Sliders, Play, Pause, FastForward, ChevronDown,
  ChevronUp, MapPin, Table, FileText, PieChart, Settings, Calendar,
  CloudRain, Moon, Download, RotateCcw, AlertTriangle, DollarSign,
  Cpu, Car, ZapOff, FileSpreadsheet, Target
} from 'lucide-react';
import DailyEnergyGraph, { type GraphDataPoint, buildGraphSVG, triggerJPGDownload, buildJPGBlob } from '@/components/DailyEnergyGraph';
import { LocationSelector, RecommendationPanel } from '@/components/RecommendationComponents';
import type { LocationCoordinates, SolarIrradianceData } from '@/lib/nasa-power-api';
import FinancialDashboard from '@/components/FinancialDashboard';
import { buildFinancialSnapshot, type FinancialInputs } from '@/lib/financial-dashboard';
import { KENYA_LOCATIONS } from '@/lib/nasa-power-api';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { StatCards } from '@/components/dashboard/StatCards';
import { PowerFlowVisualization } from '@/components/dashboard/PowerFlowVisualization';
import { WeatherCard } from '@/components/dashboard/WeatherCard';
import { BatteryStatusCard } from '@/components/dashboard/BatteryStatusCard';
import { PanelStatusTable } from '@/components/dashboard/PanelStatusTable';
import { AlertsList } from '@/components/dashboard/AlertsList';
import { TimeRangeSwitcher } from '@/components/dashboard/TimeRangeSwitcher';
import { generateDayScenario, nextWeatherMarkov } from '@/simulation/timeEngine';
import { runSolarSimulation } from '@/simulation/runSimulation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, TrendingUp, Leaf, Trees, Car as CarIcon } from 'lucide-react';
import type { SystemConfig, DerivedSystemConfig, SimulationMinuteRecord } from '@/types/simulation-core';
import { EnergyReportModal } from '@/components/EnergyReportModal';
import { KPLC_TARIFF, GRID_EMISSION_FACTOR, TREE_CO2_KG_PER_YEAR, AVG_CAR_EMISSION_KG_PER_KM } from '@/lib/tariff';

const DEFAULT_SYSTEM_CONFIG: SystemConfig = {
  mode: 'auto',
  panelCount: 120,
  panelWatt: 420,
  inverterKw: 48,
  batteryKwh: 60,
  maxChargeKw: 30,
  maxDischargeKw: 40,
  evChargerKw: 22,
  loadScale: 1,
  evCommuterScale: 1,
  evFleetScale: 1,
};

const derivePvCapacity = (config: SystemConfig): number => {
  const kw = (config.panelCount * config.panelWatt) / 1000;
  return Math.max(0, Math.round(kw * 100) / 100);
};

const SYSTEM_PRESETS: Record<'conservative' | 'expected' | 'aggressive', Partial<SystemConfig>> = {
  conservative: {
    panelCount: 96,
    panelWatt: 420,
    inverterKw: 40,
    batteryKwh: 48,
    maxChargeKw: 24,
    maxDischargeKw: 32,
    loadScale: 0.9,
    evCommuterScale: 0.9,
    evFleetScale: 0.9,
  },
  expected: {
    panelCount: 120,
    panelWatt: 420,
    inverterKw: 48,
    batteryKwh: 60,
    maxChargeKw: 30,
    maxDischargeKw: 40,
    loadScale: 1,
    evCommuterScale: 1,
    evFleetScale: 1,
  },
  aggressive: {
    panelCount: 140,
    panelWatt: 430,
    inverterKw: 55,
    batteryKwh: 72,
    maxChargeKw: 36,
    maxDischargeKw: 48,
    loadScale: 1.1,
    evCommuterScale: 1.1,
    evFleetScale: 1.1,
  },
};

// --- PHYSICS HELPERS ---
const PANEL_TEMP_COEFFICIENT = -0.005; // -0.5%/°C above 25°C STC
const SOILING_LOSS_PER_DAY = 0.005; // 0.5% dust loss per day (≈3.5% per week)
const SOILING_MIN_FACTOR = 0.70; // Maximum soiling derating (30% loss before rain cleans)

/**
 * Seasonal solar peak hour - Uses dynamic location data
 * Sun position varies by latitude and season
 */
// Gaussian random (Box-Muller transform)
const gaussianRandom = (mean: number, std: number): number => {
  const u1 = Math.max(1e-10, Math.random());
  return mean + std * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * Math.random());
};

// Feed-in tariff: Kenya net metering pilot (KES/kWh earned for solar exported to grid)
const FEED_IN_TARIFF_RATE = 5.0;

// KPLC maximum demand charge (KES per kW of monthly peak grid import)
const KPLC_DEMAND_CHARGE_KES_PER_KW = 750.0;


// --- UTILITIES ---
const formatDate = (date: Date | null): string => {
  if (!date) return '';
  return date.toLocaleDateString('en-GB', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
};

const formatTime = (decimalTime: number): string => {
  const hours = Math.floor(decimalTime);
  const minutes = Math.floor((decimalTime - hours) * 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

const getWeekNumber = (date: Date): number => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

// --- 2. VISUAL COMPONENTS ---

const RigidCable = React.memo(({ height = 40, width = 2, active = false, color = 'bg-slate-300', flowDirection = 'down', speed = 1, arrowColor = 'text-white' }: {
  height?: number; width?: number; active?: boolean; color?: string; flowDirection?: string; speed?: number; arrowColor?: string;
}) => (
  <div className={`relative ${color} transition-colors duration-500`} style={{ width: width, height: height }}>
     {active && (
       <div 
         className={`absolute left-1/2 -translate-x-1/2 z-10 ${flowDirection === 'down' ? 'animate-flow-down' : 'animate-flow-up'}`}
         style={{ animationDuration: `${Math.max(0.1, 0.8 / Math.max(0.2, Math.min(speed, 10)))}s` }}
       >
         <div className={`bg-[var(--bg-card-muted)] rounded-full p-0.5 shadow-sm ${flowDirection === 'down' ? '' : 'rotate-180'}`}>
            <ChevronDown size={8} className={arrowColor} strokeWidth={4} />
         </div>
       </div>
     )}
  </div>
));

const HorizontalCable = React.memo(({ width = '100%', height = 2, color = 'bg-slate-300' }: {
  width?: string | number; height?: number; color?: string;
}) => (
  <div className={`relative ${color} transition-colors duration-500`} style={{ width: width, height: height }}></div>
));

const SolarPanelProduct = React.memo(({ power, capacity, weather, isNight }: {
  power: number; capacity: number; weather: string; isNight: boolean;
}) => (
  <div className="flex flex-col items-center z-20">
    <div className={`w-48 h-28 rounded-lg border-2 border-slate-300 shadow-xl relative overflow-hidden transform transition-all duration-500 hover:scale-105 ${isNight ? 'bg-slate-900' : 'bg-gradient-to-br from-sky-900 to-slate-900'}`}>
      <div className="absolute inset-0 grid grid-cols-6 grid-rows-2 gap-0.5 opacity-30 pointer-events-none">
        {[...Array(12)].map((_, i) => <div key={i} className="bg-slate-300"></div>)}
      </div>
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none"></div>
      {!isNight && (
        <div 
          className={`absolute top-0 rounded-full w-24 h-24 transition-all duration-1000 blur-xl
            ${weather === 'Sunny' ? 'bg-white/30 opacity-70' : weather === 'Rainy' ? 'bg-slate-400/20 opacity-20' : 'bg-white/10 opacity-40'}
          `}
          style={{ left: `${(power / capacity) * 80}%` }}
        ></div>
      )}
      {isNight && <div className="absolute top-2 right-4 w-1 h-1 bg-white rounded-full shadow-[0_0_4px_white] animate-pulse"></div>}
    </div>
    <div className="text-center mt-2 bg-[var(--bg-card)]/90 px-3 py-1 rounded-full border border-[var(--border)] backdrop-blur-sm">
      <div className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">PV Array ({capacity}kW)</div>
      <div className="text-lg font-black text-[var(--text-primary)] leading-none">{power.toFixed(1)} <span className="text-xs font-normal">kW</span></div>
    </div>
  </div>
));

const BatteryProduct = React.memo(({ level, status, power, health = 1.0, cycles = 0 }: {
  level: number; status: string; power: number; health?: number; cycles?: number;
}) => (
  <div className="flex flex-col items-center z-20">
    <div className="relative w-28 h-40 bg-[var(--bg-card)] rounded-xl border border-[var(--border)] shadow-lg flex flex-col items-center justify-center overflow-hidden group transition-all duration-500 hover:-translate-y-1">
      <div className="absolute top-3 text-[7px] font-black text-[var(--border)] tracking-widest">SAFARICHARGE</div>
      <div className="w-3 h-24 bg-[var(--bg-card-muted)] rounded-full overflow-hidden relative border border-[var(--border)] shadow-inner">
         <div 
           className={`absolute bottom-0 left-0 w-full transition-all duration-500 
             ${status === 'Charging' ? 'bg-green-500 animate-pulse' : status === 'Discharging' ? 'bg-orange-500' : 'bg-green-600'}
           `} 
           style={{ height: `${level}%` }}
         ></div>
         <div className="absolute bottom-[20%] w-full h-0.5 bg-red-400 z-10"></div>
      </div>
      <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent pointer-events-none"></div>
    </div>
    <div className="text-center mt-2 bg-[var(--bg-card)]/90 px-2 py-1 rounded border border-[var(--border)] min-w-[90px] backdrop-blur-sm">
      <div className="text-[9px] font-bold text-[var(--text-tertiary)] uppercase">Storage ({(60 * health).toFixed(0)}kWh)</div>
      <div className="text-sm font-black text-[var(--text-primary)]">{level.toFixed(1)}%</div>
      <div className={`text-[9px] font-bold ${health < 0.85 ? 'text-orange-500' : 'text-[var(--text-tertiary)]'}`}>
        Health: {(health * 100).toFixed(1)}% · {cycles.toFixed(1)} cyc
      </div>
    </div>
  </div>
));

const EVChargerProduct = React.memo(({ id, status, power, soc, carName, capacity, maxRate, onToggle, v2g = false }: {
  id: number; status: string; power: number; soc: number; carName: string; capacity: number; maxRate: number; onToggle: () => void; v2g?: boolean;
}) => (
  <div className="flex flex-col items-center z-20" onClick={onToggle}>
    <div className={`relative w-20 h-28 bg-slate-800 rounded-xl shadow-lg border-l-4 border-slate-600 flex flex-col items-center pt-3 group transition-all duration-500 hover:-translate-y-1 ring-2 ${status === 'Charging' ? 'ring-sky-400' : 'ring-transparent'}`}>
      <div className="w-12 h-6 bg-black rounded border border-slate-600 flex items-center justify-center mb-2 overflow-hidden relative">
         <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20 opacity-50 z-10 pointer-events-none"></div>
         {v2g ? (
           <span className="text-purple-400 text-[8px] font-mono animate-pulse z-20">V2G↑</span>
         ) : status === 'Charging' ? (
           <span className="text-green-500 text-[9px] font-mono animate-pulse z-20">{power.toFixed(1)}kW</span>
         ) : status === 'Away' ? (
           <span className="text-red-500 text-[8px] z-20">AWAY</span>
         ) : (
           <span className="text-[var(--text-tertiary)] text-[8px] z-20">IDLE</span>
         )}
      </div>
      <div className="w-12 h-8 border-4 border-slate-700 rounded-b-full border-t-0"></div>
      <div className={`absolute top-2 right-2 w-1.5 h-1.5 rounded-full ${status === 'Charging' ? 'bg-sky-500 shadow-[0_0_8px_#0ea5e9]' : status === 'Away' ? 'bg-red-500' : 'bg-slate-600'}`}></div>
    </div>
    <div className="text-center mt-2 bg-[var(--bg-card)]/90 px-2 py-1 rounded border border-[var(--border)] backdrop-blur-sm min-w-[90px]">
      <div className="text-[8px] font-bold text-[var(--text-tertiary)] uppercase">{carName}</div>
      <div className="text-[7px] text-[var(--text-tertiary)]">{capacity}kWh • {maxRate}kW</div>
      <div className="flex justify-between items-end px-1 mt-1 border-t border-[var(--border)] pt-0.5">
         <span className="text-[8px] text-[var(--text-tertiary)]">SoC</span>
         <span className={`text-[10px] font-bold ${soc < 20 ? 'text-[var(--alert)]' : 'text-[var(--battery)]'}`}>{(soc || 0).toFixed(0)}%</span>
      </div>
    </div>
  </div>
));

const InverterProduct = React.memo(({ id, power }: { id: number; power: number }) => (
  <div className="flex flex-col items-center bg-[var(--bg-card)] rounded-lg border border-[var(--border)] w-24 p-2 z-20 transition-transform hover:scale-105">
    <div className="w-full flex justify-between items-center mb-1 border-b border-[var(--border)] pb-1">
       <span className="text-[8px] font-bold text-[var(--text-tertiary)]">16kW Unit #{id}</span>
       <div className={`w-1.5 h-1.5 rounded-full ${power > 0 ? 'bg-green-500 animate-pulse' : 'bg-[var(--border)]'}`}></div>
    </div>
    <div className="bg-slate-800 rounded w-full h-8 flex items-center justify-center font-mono text-orange-400 text-[10px] shadow-inner">
      {power.toFixed(1)} kW
    </div>
  </div>
));

const GridProduct = React.memo(({ power, isImporting, isExporting, gridStatus }: {
  power: number; isImporting: boolean; isExporting: boolean; gridStatus: string;
}) => (
  <div className="flex flex-col items-center z-20">
     <div className="w-24 h-32 flex items-center justify-center relative">
        <UtilityPole size={64} className={gridStatus === 'Online' ? "text-[var(--text-secondary)]" : "text-red-300"} strokeWidth={1} />
        {gridStatus === 'Offline' && (
           <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded animate-pulse">GRID DOWN</div>
           </div>
        )}
        {gridStatus === 'Online' && (isImporting || isExporting) && (
           <div className={`absolute top-0 right-0 p-1 rounded bg-[var(--bg-card)] border border-[var(--border)] flex items-center gap-1 ${isImporting ? 'text-[var(--consumption)]' : 'text-[var(--battery)]'}`}>
              {isImporting ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
              <span className="text-[9px] font-bold">{Math.abs(power).toFixed(1)} kW</span>
           </div>
        )}
     </div>
     <div className="text-center mt-2 bg-[var(--bg-card)]/90 px-2 py-1 rounded border border-[var(--border)] backdrop-blur-sm">
        <div className="text-[9px] font-bold text-[var(--text-tertiary)] uppercase">Utility Grid</div>
        <div className="text-[9px] font-bold text-[var(--text-primary)]">
           {gridStatus === 'Offline' ? 'OFFLINE' : isImporting ? 'IMPORTING' : isExporting ? 'EXPORTING' : 'IDLE'}
        </div>
     </div>
  </div>
));

const HomeProduct = React.memo(({ power }: { power: number }) => (
  <div className="flex flex-col items-center z-20">
    <div className="w-24 h-32 flex items-center justify-center bg-[var(--bg-card-muted)] rounded-2xl border border-[var(--border)]">
       <Home size={40} className="text-[var(--text-secondary)]" strokeWidth={1.5} />
    </div>
    <div className="text-center mt-2 bg-[var(--bg-card)]/90 px-2 py-1 rounded border border-[var(--border)] backdrop-blur-sm">
      <div className="text-[9px] font-bold text-[var(--text-tertiary)] uppercase">Home Load</div>
      <div className="text-sm font-black text-[var(--text-primary)]">{power.toFixed(1)} kW</div>
    </div>
  </div>
));

// --- 4. ADVANCED COMPONENTS ---

const SUGGESTION_CHIPS = [
  "How is my system performing right now?",
  "Should I charge the EVs now or wait?",
  "How can I reduce my KPLC bill?",
  "What's the battery health impact of V2G?",
  "Explain today's solar generation",
  "When is the best time to charge?",
  "How much CO₂ have I saved?",
  "Tips for Nairobi rainy season?",
];

// Renders AI message text: converts **bold**, newlines, and bullet points
const AIMessageText = ({ text }: { text: string }) => {
  const lines = text.split('\n');
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-1" />;
        // bold: **text**
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        return (
          <p key={i} className="leading-relaxed">
            {parts.map((part, j) =>
              part.startsWith('**') && part.endsWith('**')
                ? <strong key={j}>{part.slice(2, -2)}</strong>
                : part
            )}
          </p>
        );
      })}
    </div>
  );
};

const SafariChargeAIAssistant = ({ isOpen, onClose, data, timeOfDay, weather, currentDate, isAutoMode }: {
  isOpen: boolean; onClose: () => void; data: any; timeOfDay: number; weather: string; currentDate: Date; isAutoMode: boolean;
}) => {
  const [messages, setMessages] = useState<Array<{ role: string; text: string }>>([
    { role: 'assistant', text: "Hello! I'm **SafariCharge AI**, your intelligent solar energy advisor.\n\nI have live access to your system data and deep knowledge of solar, batteries, KPLC tariffs, and EV charging in Kenya. Ask me anything! ☀️🔋" }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), [messages, isTyping]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isTyping) return;
    const userMsg = { role: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);
    setError(null);

    // Build rich live context for the API
    const hh = Math.floor(timeOfDay).toString().padStart(2, '0');
    const mm = Math.floor((timeOfDay % 1) * 60).toString().padStart(2, '0');
    const systemContext = {
      time: `${hh}:${mm}`,
      date: currentDate.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      weather,
      solar: `${data.solarR.toFixed(1)} kW`,
      solarTotal: data.totalSolar?.toFixed(1) ?? '0',
      battery: `${data.batteryLevel.toFixed(1)}% SoC, ${data.batteryPower > 0 ? '+' : ''}${data.batteryPower.toFixed(1)} kW (${data.batteryStatus})`,
      batteryHealth: `${((data.batteryHealth ?? 1) * 100).toFixed(1)}%`,
      batteryCycles: data.batteryCycles ?? 0,
      grid: `${data.netGridPower > 0 ? 'Importing' : data.netGridPower < 0 ? 'Exporting' : 'Balanced'} ${Math.abs(data.netGridPower).toFixed(1)} kW`,
      savings: data.displaySavings?.toFixed(0) ?? '0',
      feedInEarnings: data.feedInEarnings?.toFixed(0) ?? '0',
      carbonOffset: data.carbonOffset?.toFixed(1) ?? '0',
      peakTime: data.isPeakTime,
      tariffRate: data.currentTariffRate?.toFixed(2) ?? '0',
      ev1: `SoC ${data.ev1Soc?.toFixed(0)}%, ${data.ev1Load?.toFixed(1)} kW (${data.ev1Status})${data.ev1V2g ? ' [V2G active]' : ''}`,
      ev2: `SoC ${data.ev2Soc?.toFixed(0)}%, ${data.ev2Load?.toFixed(1)} kW (${data.ev2Status})${data.ev2V2g ? ' [V2G active]' : ''}`,
      v2gActive: data.ev1V2g || data.ev2V2g,
      monthlyPeakDemand: `${data.monthlyPeakDemandKW?.toFixed(1) ?? '0'} kW (est. KES ${data.estimatedDemandChargeKES?.toFixed(0) ?? '0'})`,
      priorityMode: data.effectivePriority,
      simRunning: isAutoMode,
    };

    // Conversation history for the API (exclude welcome message, convert to API format)
    const conversationHistory = messages
      .slice(1) // skip the greeting
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.text }));

    try {
      const res = await fetch('/api/safaricharge-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userPrompt: text, conversationHistory, systemContext }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'API error');
      setMessages(prev => [...prev, { role: 'assistant', text: json.response }]);
    } catch (err: any) {
      setError(err.message || 'Failed to reach SafariCharge AI. Check your connection.');
      setMessages(prev => [...prev, { role: 'assistant', text: "⚠️ I couldn't connect to the AI service right now. Please try again in a moment." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSend = () => sendMessage(inputText);
  const handleChip = (chip: string) => sendMessage(chip);

  if (!isOpen) return null;

  const showChips = messages.length <= 2;

  return (
    <div className="fixed right-0 top-16 bottom-0 w-full md:w-96 bg-[var(--bg-secondary)] shadow-2xl border-l border-[var(--border)] z-[200] flex flex-col">
      {/* Header */}
      <div className="p-4 bg-slate-900 text-white flex justify-between items-center shadow-md flex-shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-green-400" />
          <div>
            <h3 className="font-bold text-sm leading-none">SafariCharge AI</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Powered by live simulation data</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[10px] text-green-400">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            {isAutoMode ? 'Live' : 'Paused'}
          </div>
          <button onClick={onClose} className="text-white hover:text-slate-300"><X size={20} /></button>
        </div>
      </div>

      {/* Live status bar */}
      <div className="bg-slate-800 px-4 py-2 flex gap-4 text-[10px] font-mono text-slate-400 flex-shrink-0">
        <span className="text-green-400">☀️ {data.solarR.toFixed(1)}kW</span>
        <span className="text-purple-400">🔋 {data.batteryLevel.toFixed(0)}%</span>
        <span className={data.netGridPower > 0.1 ? 'text-red-400' : 'text-sky-400'}>
          ⚡ {data.netGridPower > 0.1 ? `Import ${data.netGridPower.toFixed(1)}kW` : data.netGridPower < -0.1 ? `Export ${Math.abs(data.netGridPower).toFixed(1)}kW` : 'Grid balanced'}
        </span>
        {(data.ev1V2g || data.ev2V2g) && <span className="text-orange-400">V2G↑</span>}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[var(--bg-primary)]">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-6 h-6 rounded-full bg-slate-900 flex items-center justify-center mr-2 flex-shrink-0 mt-0.5">
                <Sparkles size={12} className="text-green-400" />
              </div>
            )}
            <div className={`max-w-[85%] p-3 rounded-2xl text-sm shadow-sm ${
              msg.role === 'user'
                ? 'bg-sky-500 text-white rounded-br-sm'
                : 'bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] rounded-bl-sm'
            }`}>
              {msg.role === 'assistant' ? <AIMessageText text={msg.text} /> : msg.text}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex justify-start items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-slate-900 flex items-center justify-center flex-shrink-0">
              <Sparkles size={12} className="text-green-400" />
            </div>
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1">
              <span className="w-1.5 h-1.5 bg-[var(--text-tertiary)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-[var(--text-tertiary)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-[var(--text-tertiary)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        {/* Suggestion chips: shown only at start */}
        {showChips && !isTyping && (
          <div className="pt-2">
            <p className="text-[10px] text-[var(--text-tertiary)] font-mono mb-2 ml-8">Suggested questions:</p>
            <div className="flex flex-wrap gap-2 ml-8">
              {SUGGESTION_CHIPS.map(chip => (
                <button
                  key={chip}
                  onClick={() => handleChip(chip)}
                  className="text-[11px] bg-[var(--bg-card)] border border-[var(--consumption)] text-[var(--consumption)] px-3 py-1.5 rounded-full hover:opacity-80 transition-colors font-medium"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="text-xs text-red-600 text-center bg-red-50 rounded-lg p-3 border border-red-200 break-words">
            {error}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 bg-[var(--bg-secondary)] border-t border-[var(--border)] flex gap-2 flex-shrink-0">
        <input 
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder="Ask about your solar system..."
          disabled={isTyping}
          className="flex-1 bg-[var(--bg-card-muted)] text-[var(--text-primary)] rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--battery)] disabled:opacity-60 placeholder:text-[var(--text-tertiary)]"
        />
        <button
          onClick={handleSend}
          disabled={!inputText.trim() || isTyping}
          className="p-2.5 bg-[var(--battery)] text-white rounded-full disabled:opacity-50 hover:opacity-90 transition-colors"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
};


// --- 5. PANEL LAYOUTS ---

/** Tiny inline solar sparkline shown on each past-day card */
const MiniSparkline = React.memo(({ data }: { data: Array<{ timeOfDay: number; solar: number }> }) => {
  const W = 112, H = 20;
  if (data.length < 2) return null;
  const maxS = data.reduce((maxValue, dataPoint) => dataPoint.solar > maxValue ? dataPoint.solar : maxValue, 0.1);
  const pts = data
    .map((d, i) => {
      const x = (d.timeOfDay / 24) * W;
      const y = H - (d.solar / maxS) * H;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="block mt-0.5">
      <polyline points={pts} fill="none" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
    </svg>
  );
});
MiniSparkline.displayName = 'MiniSparkline';

/** Download-ZIP button with parallel processing and progress feedback */
const PastDaysZipButton = ({ pastGraphs }: { pastGraphs: Array<{ date: string; data: import('@/components/DailyEnergyGraph').GraphDataPoint[] }> }) => {
  const [generating, setGenerating] = React.useState(false);
  const [done, setDone] = React.useState(0);
  const total = pastGraphs.length;

  const handleClick = async () => {
    if (generating || total === 0) return;
    setGenerating(true);
    setDone(0);
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      const BATCH_SIZE = 5;
      for (let i = 0; i < total; i += BATCH_SIZE) {
        const batch = pastGraphs.slice(i, i + BATCH_SIZE);
        const results = await Promise.all(
          batch.map(async ({ date, data: pastData }) => {
            const svg = buildGraphSVG(pastData, date);
            const blob = await buildJPGBlob(svg);
            return { date, blob };
          })
        );
        results.forEach(({ date, blob }) => zip.file(`SafariCharge_DailyGraph_${date}.jpg`, blob));
        setDone(i + batch.length);
      }
      const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SafariCharge_DailyGraphs_${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 300);
    } finally {
      setGenerating(false);
      setDone(0);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={generating}
      className="flex items-center gap-1.5 text-[10px] font-bold text-sky-600 hover:text-sky-800 bg-sky-50 hover:bg-sky-100 border border-sky-200 px-2 py-1 rounded transition-colors disabled:opacity-70 disabled:cursor-not-allowed min-w-[110px] justify-center"
    >
      {generating ? (
        <>
          <Loader2 size={11} className="animate-spin flex-shrink-0" />
          <span>{done}/{total} graphs…</span>
        </>
      ) : (
        <>
          <Download size={11} />
          <span>Download ZIP ({total})</span>
        </>
      )}
    </button>
  );
};

const Header = ({ onToggleAssistant, currentDate, onReset, currentLocation, onLocationSelected, onOpenRecommendation }: {
  onToggleAssistant: () => void; currentDate: Date; onReset: () => void; currentLocation: LocationCoordinates; onLocationSelected: (location: LocationCoordinates, solarData: SolarIrradianceData) => void; onOpenRecommendation: () => void;
}) => (
  <div className="w-full bg-white relative z-50 shadow-sm">
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row justify-between items-center gap-3">
      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
         <div className="flex items-center gap-2">
            <svg viewBox="0 0 100 100" className="w-7 h-7 sm:w-8 sm:h-8 fill-sky-500">
              <path d="M50 0 L90 40 L75 40 L50 15 L25 40 L10 40 Z" />
              <path d="M10 50 L35 75 L50 90 L65 75 L90 50 L75 50 L50 75 L25 50 Z" />
            </svg>
            <div className="flex flex-col">
               <h1 className="text-lg sm:text-xl font-black tracking-wide text-sky-500 uppercase leading-none">SAFARI<span className="text-slate-800">CHARGE</span></h1>
               <span className="text-[9px] sm:text-[10px] font-bold tracking-[0.2em] text-slate-400">LIMITED</span>
            </div>
         </div>
         <button onClick={onReset} className="text-slate-400 hover:text-red-500 transition-colors sm:hidden" title="Reset Simulation"><RotateCcw size={18} /></button>
      </div>
      <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto flex-wrap justify-center sm:justify-end">
         <button onClick={onReset} className="hidden sm:block text-slate-400 hover:text-red-500 transition-colors" title="Reset Simulation"><RotateCcw size={16} /></button>
         <div className="flex items-center gap-2 text-[var(--text-tertiary)] text-[10px] sm:text-xs font-medium bg-[var(--bg-card-muted)] px-2 sm:px-3 py-1 rounded-full">
            <Calendar size={12} className="text-[var(--text-tertiary)]" /> <span className="hidden xs:inline">{formatDate(currentDate)}</span><span className="xs:hidden">{currentDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
         </div>
         <div className="block">
            <LocationSelector currentLocation={currentLocation} onLocationSelected={onLocationSelected} />
         </div>
         <button onClick={onOpenRecommendation} className="flex items-center gap-1.5 sm:gap-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-[10px] sm:text-xs font-bold hover:from-green-700 hover:to-emerald-700 transition-colors shadow-lg whitespace-nowrap">
           <Target size={12} /> <span className="hidden sm:inline">Get Recommendation</span><span className="sm:hidden">Recommend</span>
         </button>
         <button onClick={onToggleAssistant} className="bg-slate-900 text-white px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-[10px] sm:text-xs font-bold flex items-center gap-1.5 sm:gap-2 hover:bg-slate-800 transition-colors shadow-lg border border-slate-700 whitespace-nowrap">
           <Sparkles size={12} className="text-green-400" /> <span className="hidden sm:inline">SafariCharge AI</span><span className="sm:hidden">AI</span>
         </button>
      </div>
    </div>
    <div className="h-0.5 w-full bg-gradient-to-r from-sky-500 to-green-500 shadow-[0_0_15px_rgba(14,165,233,0.5)]"></div>
  </div>
);

const StatPill = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
  <div className="flex flex-col bg-[var(--bg-card-muted)] border border-[var(--border)] rounded-xl px-3 py-2">
    <span className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">{label}</span>
    <span className="text-sm font-black text-[var(--text-primary)]">{value}</span>
    {sub && <span className="text-[10px] text-[var(--text-tertiary)]">{sub}</span>}
  </div>
);

const SystemConfigPanel = ({
  config,
  onChange,
  onModeChange,
  onPreset,
}: {
  config: DerivedSystemConfig;
  onChange: (next: SystemConfig) => void;
  onModeChange: (mode: SystemConfig['mode']) => void;
  onPreset: (preset: keyof typeof SYSTEM_PRESETS) => void;
}) => {
  const isAdvanced = config.mode === 'advanced';
  const { pvCapacityKw, ...baseConfig } = config;

  const updateField = (key: keyof SystemConfig, value: number) => {
    const safeNumber = Number.isFinite(value) ? Math.max(0, value) : 0;
    onChange({ ...baseConfig, [key]: safeNumber, mode: 'advanced' });
  };

  return (
    <div className="w-full max-w-7xl">
      <div className="flex flex-col sm:flex-row justify-between gap-3 sm:items-center">
        <div>
          <div className="flex items-center gap-2 text-[var(--text-primary)] font-black text-sm sm:text-base uppercase tracking-wide">
            <Settings size={16} className="text-[var(--text-tertiary)]" />
            System Configuration
          </div>
          <p className="text-[11px] sm:text-xs text-[var(--text-secondary)] mt-1">
            Switch to advanced mode to tweak panel count, inverter, battery, and load splits. Values feed directly into the live simulation.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-[var(--bg-card-muted)] rounded-full p-1 flex gap-1 text-[11px]">
            <button
              onClick={() => onModeChange('auto')}
              className={`px-3 py-1 rounded-full font-bold transition-colors ${config.mode === 'auto' ? 'bg-[var(--text-primary)] text-[var(--bg-primary)] shadow-sm' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card)]'}`}
            >
              Auto
            </button>
            <button
              onClick={() => onModeChange('advanced')}
              className={`px-3 py-1 rounded-full font-bold transition-colors ${isAdvanced ? 'bg-[var(--consumption)] text-white shadow-sm' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card)]'}`}
            >
              Advanced
            </button>
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase">Panel Count</label>
          <input
            type="number"
            min={0}
            value={config.panelCount}
            onChange={(e) => updateField('panelCount', parseFloat(e.target.value))}
            className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card-muted)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--battery)] disabled:opacity-50"
            disabled={!isAdvanced}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase">Panel Wattage (W)</label>
          <input
            type="number"
            min={0}
            value={config.panelWatt}
            onChange={(e) => updateField('panelWatt', parseFloat(e.target.value))}
            className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card-muted)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--battery)] disabled:opacity-50"
            disabled={!isAdvanced}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase">Inverter Size (kW)</label>
          <input
            type="number"
            min={0}
            value={config.inverterKw}
            onChange={(e) => updateField('inverterKw', parseFloat(e.target.value))}
            className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card-muted)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--battery)] disabled:opacity-50"
            disabled={!isAdvanced}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase">Battery Size (kWh)</label>
          <input
            type="number"
            min={0}
            value={config.batteryKwh}
            onChange={(e) => updateField('batteryKwh', parseFloat(e.target.value))}
            className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card-muted)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--battery)] disabled:opacity-50"
            disabled={!isAdvanced}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase">Max Charge (kW)</label>
          <input
            type="number"
            min={0}
            value={config.maxChargeKw}
            onChange={(e) => updateField('maxChargeKw', parseFloat(e.target.value))}
            className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card-muted)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--battery)] disabled:opacity-50"
            disabled={!isAdvanced}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase">Max Discharge (kW)</label>
          <input
            type="number"
            min={0}
            value={config.maxDischargeKw}
            onChange={(e) => updateField('maxDischargeKw', parseFloat(e.target.value))}
            className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card-muted)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--battery)] disabled:opacity-50"
            disabled={!isAdvanced}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase">EV Charger Rate (kW)</label>
          <input
            type="number"
            min={0}
            value={config.evChargerKw}
            onChange={(e) => updateField('evChargerKw', parseFloat(e.target.value))}
            className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card-muted)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--battery)] disabled:opacity-50"
            disabled={!isAdvanced}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase">Base Load Scale</label>
          <input
            type="number"
            min={0}
            step="0.05"
            value={config.loadScale}
            onChange={(e) => updateField('loadScale', parseFloat(e.target.value))}
            className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card-muted)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--battery)] disabled:opacity-50"
            disabled={!isAdvanced}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase">EV #1 (Commuter) Scale</label>
          <input
            type="number"
            min={0}
            step="0.05"
            value={config.evCommuterScale}
            onChange={(e) => updateField('evCommuterScale', parseFloat(e.target.value))}
            className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card-muted)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--battery)] disabled:opacity-50"
            disabled={!isAdvanced}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase">EV #2 (Fleet) Scale</label>
          <input
            type="number"
            min={0}
            step="0.05"
            value={config.evFleetScale}
            onChange={(e) => updateField('evFleetScale', parseFloat(e.target.value))}
            className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card-muted)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--battery)] disabled:opacity-50"
            disabled={!isAdvanced}
          />
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mt-3">
        <div className="flex flex-wrap gap-2">
          <StatPill label="PV Array" value={`${pvCapacityKw.toFixed(1)} kW`} sub={`${config.panelCount}x ${config.panelWatt}W`} />
          <StatPill label="Inverter" value={`${config.inverterKw.toFixed(1)} kW`} />
          <StatPill label="Battery" value={`${config.batteryKwh.toFixed(1)} kWh`} sub={`${config.maxChargeKw.toFixed(0)} kW charge / ${config.maxDischargeKw.toFixed(0)} kW discharge`} />
          <StatPill label="Loads" value={`${(config.loadScale * 100).toFixed(0)}%`} sub="Home + HVAC base" />
        </div>
        {isAdvanced && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase">Presets</span>
            {(['conservative', 'expected', 'aggressive'] as const).map((preset) => (
              <button
                key={preset}
                onClick={() => onPreset(preset)}
                className="px-3 py-1.5 rounded-full text-[11px] font-bold border border-[var(--border)] bg-[var(--bg-card-muted)] text-[var(--text-secondary)] hover:border-[var(--battery)] hover:text-[var(--battery)] transition-colors"
              >
                {preset === 'expected' ? 'Expected' : preset === 'aggressive' ? 'Aggressive' : 'Conservative'}
              </button>
            ))}
            <button
              onClick={() => onChange({ ...DEFAULT_SYSTEM_CONFIG, mode: 'auto' })}
              className="px-3 py-1.5 rounded-full text-[11px] font-bold border border-[var(--alert)] text-[var(--alert)] bg-[rgba(239,68,68,0.1)] hover:opacity-80 transition-colors"
            >
              Reset to Auto
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const CentralDisplay = ({ data, timeOfDay, onTimeChange, isAutoMode, onToggleAuto, simSpeed, onSpeedChange, onOpenReport, priorityMode, onTogglePriority, weather, isNight, gridStatus, onToggleGrid, displayPriority, ev1Status, ev2Status }: {
  data: any; timeOfDay: number; onTimeChange: (t: number) => void; isAutoMode: boolean; onToggleAuto: () => void; simSpeed: number; onSpeedChange: (s: number) => void; onOpenReport: () => void; priorityMode: string; onTogglePriority: () => void; weather: string; isNight: boolean; gridStatus: string; onToggleGrid: () => void; displayPriority: string; ev1Status: string; ev2Status: string;
}) => {
  return (
    <div className="relative flex flex-col items-center justify-center w-full h-full p-3 sm:p-6">
      <div className="text-center mb-4 sm:mb-6 w-full">
        <h2 className="text-lg sm:text-2xl font-black text-[var(--text-primary)] leading-tight">SIMULATION <span className="text-[var(--consumption)]">CONTROLS</span></h2>

        <div className="mt-3 sm:mt-4 bg-[var(--bg-card-muted)] p-3 sm:p-4 rounded-xl border border-[var(--border)] w-full max-w-sm mx-auto relative overflow-hidden">
          <div className="flex justify-end mb-2">
            <div className="text-[10px] sm:text-xs text-[var(--text-tertiary)] font-bold flex items-center gap-1.5 bg-[var(--bg-card)] px-2 py-1 rounded transition-colors duration-500 whitespace-nowrap">
              {isNight ? (
                <>
                  <Moon size={12} className="text-indigo-400" /> <span className="hidden xs:inline">Night</span>
                </>
              ) : (
                <>
                  {weather === 'Sunny' && <Sun size={12} className="text-orange-500" />}
                  <span className="hidden xs:inline">{weather}</span>
                </>
              )}
              <span className="font-mono text-[9px] sm:text-[10px] text-slate-600">{formatTime(timeOfDay)}</span>
            </div>
          </div>

          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-1.5 sm:gap-2">
               <span className="text-[10px] sm:text-xs font-bold text-[var(--text-tertiary)] uppercase flex items-center gap-1"><Clock size={10} className="sm:hidden"/><Clock size={12} className="hidden sm:block"/> <span className="hidden xs:inline">Time</span></span>
               {isAutoMode && <span className="text-[8px] sm:text-[9px] bg-green-500 text-white px-1 sm:px-1.5 rounded animate-pulse">LIVE</span>}
            </div>
            <span className="text-xs sm:text-sm font-mono font-bold text-[var(--text-primary)]">{formatTime(timeOfDay)}</span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
             <button onClick={onToggleAuto} className={`p-1.5 sm:p-2 rounded-full transition-colors ${isAutoMode ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                {isAutoMode ? <Pause size={14} className="sm:hidden" fill="currentColor" /> : <Play size={14} className="sm:hidden" fill="currentColor" />}
                {isAutoMode ? <Pause size={16} className="hidden sm:block" fill="currentColor" /> : <Play size={16} className="hidden sm:block" fill="currentColor" />}
             </button>
             <input type="range" min="0" max="24" step="0.08" value={timeOfDay} onChange={(e) => { onTimeChange(parseFloat(e.target.value)); if(isAutoMode) onToggleAuto(); }} disabled={isAutoMode} className="w-full h-2 bg-[var(--bg-card)] rounded-lg appearance-none cursor-pointer accent-[var(--battery)] disabled:opacity-50 disabled:cursor-not-allowed" />
          </div>

          <div className="flex justify-center gap-1.5 sm:gap-2 mt-2 sm:mt-3 pt-2 border-t border-[var(--border)] flex-wrap">
             {[1, 5, 20, 100, 1000].map(speed => (
               <button key={speed} onClick={() => onSpeedChange(speed)} className={`text-[8px] sm:text-[9px] px-1.5 sm:px-2 py-1 rounded font-bold transition-all ${simSpeed === speed ? 'bg-[var(--text-primary)] text-[var(--bg-primary)] scale-110' : 'bg-[var(--bg-card)] text-[var(--text-tertiary)] hover:opacity-80'}`}>x{speed}</button>
             ))}
          </div>
        </div>

        <div className="mt-3 sm:mt-4 flex flex-col gap-2 w-full max-w-sm mx-auto">
           <div className="flex justify-center gap-2">
             <div className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border text-[9px] sm:text-[10px] font-bold flex items-center gap-1 flex-1 sm:w-32 justify-center transition-all ${ev1Status === 'Charging' ? 'bg-[var(--consumption-soft,rgba(16,185,129,0.1))] border-[var(--battery)] text-[var(--battery)]' : ev1Status === 'Away' ? 'bg-[var(--bg-card-muted)] border-[var(--border)] text-[var(--alert)]' : 'bg-[var(--bg-card-muted)] border-[var(--border)] text-[var(--battery)]'}`}>
               <span className="hidden xs:inline">EV #1: </span><span className="xs:hidden">EV1: </span>{ev1Status}
             </div>
             <div className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border text-[9px] sm:text-[10px] font-bold flex items-center gap-1 flex-1 sm:w-32 justify-center transition-all ${ev2Status === 'Charging' ? 'bg-[var(--consumption-soft,rgba(16,185,129,0.1))] border-[var(--battery)] text-[var(--battery)]' : ev2Status === 'Away' ? 'bg-[var(--bg-card-muted)] border-[var(--border)] text-[var(--alert)]' : 'bg-[var(--bg-card-muted)] border-[var(--border)] text-[var(--battery)]'}`}>
               <span className="hidden xs:inline">EV #2: </span><span className="xs:hidden">EV2: </span>{ev2Status}
             </div>
           </div>

           <div className="grid grid-cols-2 gap-2">
             <button onClick={onTogglePriority} className="bg-[var(--bg-card-muted)] hover:opacity-80 border border-[var(--border)] rounded-lg p-1.5 sm:p-2 flex items-center justify-center text-[10px] sm:text-xs gap-1 sm:gap-2 transition-colors">
               <span className={`font-bold ${displayPriority === 'battery' ? 'text-green-600' : 'text-sky-600'}`}><span className="hidden sm:inline">{displayPriority === 'battery' ? 'Charge First' : 'Load First'}</span><span className="sm:hidden">{displayPriority === 'battery' ? 'Charge' : 'Load'}</span></span>
               {priorityMode === 'auto' && <span className="text-[7px] sm:text-[8px] bg-purple-100 text-purple-600 px-1 rounded font-bold">AUTO</span>}
             </button>
             <button onClick={onToggleGrid} className={`border rounded-lg p-1.5 sm:p-2 flex items-center justify-center text-[10px] sm:text-xs gap-1 sm:gap-2 ${gridStatus === 'Online' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700 animate-pulse'}`}>
               <Zap size={10} className="sm:hidden" fill="currentColor" /><Zap size={12} className="hidden sm:block" fill="currentColor" /> {gridStatus === 'Online' ? 'Grid OK' : 'Outage'}
             </button>
           </div>
        </div>
      </div>
      
      {/* Financial/Flow Widget */}
      <div className="bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-700 relative">
         <div className="p-3 sm:p-6 relative z-10">
            {/* Current Tariff Rate Display */}
            <div className="mb-3 sm:mb-4 pb-2 sm:pb-3 border-b border-slate-700">
               <div className="flex justify-between items-center flex-wrap gap-2">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                     <DollarSign size={12} className="text-yellow-400 sm:hidden" />
                     <DollarSign size={14} className="text-yellow-400 hidden sm:block" />
                     <span className="text-[9px] sm:text-[10px] uppercase tracking-wider text-slate-400">Current Tariff</span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                     <span className={`px-1.5 sm:px-2 py-0.5 rounded text-[8px] sm:text-[9px] font-bold ${data.isPeakTime ? 'bg-orange-500/20 text-orange-400' : 'bg-green-500/20 text-green-400'}`}>
                       {data.isPeakTime ? 'PEAK' : 'OFF-PEAK'}
                     </span>
                     <span className="text-white font-bold text-xs sm:text-sm">KES {data.currentTariffRate.toFixed(2)}/kWh</span>
                  </div>
               </div>
            </div>

            <div className="flex justify-between items-center mb-3 sm:mb-4 gap-2">
               <div className="flex-1 min-w-0">
                  <div className="text-slate-400 text-[9px] sm:text-[10px] uppercase tracking-wider">Today&apos;s Savings</div>
                  <div className="text-xl sm:text-2xl font-light text-white flex items-center gap-1">
                    <span className="text-green-400 font-bold truncate">KES {data.displaySavings.toFixed(0)}</span>
                  </div>
                  {data.carbonOffset > 0 && (
                    <div className="text-[8px] sm:text-[9px] text-green-300 mt-0.5 flex items-center gap-1">
                      🌿 {data.carbonOffset.toFixed(2)} kg CO₂ avoided
                    </div>
                  )}
               </div>
               <button onClick={onOpenReport} className="text-[9px] sm:text-[10px] bg-slate-700 hover:bg-slate-600 text-white px-2 py-1 rounded flex items-center gap-1 transition-colors whitespace-nowrap flex-shrink-0">
                   <Table size={9} className="sm:hidden" /><Table size={10} className="hidden sm:block" /> <span className="hidden xs:inline">View</span> Report
               </button>
            </div>

            <div className="bg-slate-800/50 rounded-lg p-2 sm:p-3 border border-slate-700 space-y-1.5 sm:space-y-2">
               <div className="flex justify-between items-center text-[10px] sm:text-xs">
                 <span className="text-slate-300">1. {displayPriority === 'battery' ? 'Battery' : 'Loads'}</span>
                 <span className="text-white font-bold">{displayPriority === 'battery' ? (data.batteryStatus === 'Charging' ? `${Math.abs(data.batteryPower).toFixed(1)} kW` : '0.0 kW') : `${Math.min(data.solarR, data.homeLoad + data.ev1Load + data.ev2Load).toFixed(1)} kW`}</span>
               </div>
               <div className="flex justify-between items-center text-[10px] sm:text-xs">
                 <span className="text-slate-300">2. {displayPriority === 'battery' ? 'Loads' : 'Battery'}</span>
                 <span className="text-white font-bold">{displayPriority === 'battery' ? `${Math.min(data.solarR, data.homeLoad + data.ev1Load + data.ev2Load).toFixed(1)} kW` : (data.batteryStatus === 'Charging' ? `${Math.abs(data.batteryPower).toFixed(1)} kW` : '0.0 kW')}</span>
               </div>
               <div className="flex justify-between items-center text-[10px] sm:text-xs border-t border-slate-700 pt-1 mt-1">
                 <span className="text-slate-300">3. Grid Backup</span>
                 <span className={`${data.netGridPower < 0 ? 'text-red-400' : 'text-green-400'} font-bold`}>{data.netGridPower < 0 ? `${Math.abs(data.netGridPower).toFixed(1)} kW (In)` : `${Math.abs(data.netGridPower).toFixed(1)} kW (Out)`}</span>
               </div>
               {data.estimatedDemandChargeKES > 0 && (
               <div className="flex justify-between items-center text-[10px] sm:text-xs border-t border-slate-600 pt-1 mt-1">
                 <span className="text-amber-400">⚡ Peak Demand</span>
                 <span className="text-amber-300 font-bold">{data.monthlyPeakDemandKW?.toFixed(1)} kW → KES {data.estimatedDemandChargeKES?.toFixed(0)}/mo</span>
               </div>
               )}
               {data.feedInEarnings > 0 && (
               <div className="flex justify-between items-center text-[10px] sm:text-xs">
                 <span className="text-green-400">↑ Feed-in Earned</span>
                 <span className="text-green-300 font-bold">KES {data.feedInEarnings?.toFixed(1)}</span>
               </div>
               )}
            </div>
         </div>
      </div>
    </div>
  );
};

const ResidentialPanel = React.memo(({ data, simSpeed, weather, isNight, gridStatus, ev1Status, ev2Status, evSpecs }: {
  data: any; simSpeed: number; weather: string; isNight: boolean; gridStatus: string; ev1Status: string; ev2Status: string; evSpecs: any;
}) => {
  const isSolarActive = data.solarR > 0.1;
  const gridFlowDir = data.netGridPower < 0 ? 'up' : 'down';

  return (
    <div className="flex flex-col items-center w-full h-full p-2 sm:p-3 md:p-6 bg-[var(--bg-card-muted)] rounded-2xl sm:rounded-3xl border border-[var(--border)] overflow-x-auto">
      <div className="min-w-[360px] sm:min-w-[540px] lg:min-w-[620px] flex flex-col items-center w-full px-1 sm:px-2">
       <div className="mb-0"><SolarPanelProduct power={data.solarR} capacity={50.0} weather={weather} isNight={isNight} /></div>
       <div className="flex flex-col items-center">
          <RigidCable height={30} active={isSolarActive} color={isSolarActive ? "bg-green-500" : "bg-slate-300"} speed={simSpeed} arrowColor="text-green-100" />
          <HorizontalCable width={240} color={isSolarActive ? "bg-green-500" : "bg-slate-300"} />
          <div className="flex justify-between w-[240px]">
             <RigidCable height={20} active={isSolarActive} color={isSolarActive ? "bg-green-500" : "bg-slate-300"} speed={simSpeed} arrowColor="text-green-100" />
             <RigidCable height={20} active={isSolarActive} color={isSolarActive ? "bg-green-500" : "bg-slate-300"} speed={simSpeed} arrowColor="text-green-100" />
             <RigidCable height={20} active={isSolarActive} color={isSolarActive ? "bg-green-500" : "bg-slate-300"} speed={simSpeed} arrowColor="text-green-100" />
          </div>
       </div>
       <div className="flex gap-8 justify-center items-start mb-0">
          <InverterProduct id={1} power={data.solarR / 3} />
          <InverterProduct id={2} power={data.solarR / 3} />
          <InverterProduct id={3} power={data.solarR / 3} />
       </div>
       <div className="flex flex-col items-center">
          <div className="flex justify-between w-[240px]">
             <RigidCable height={30} active={isSolarActive} color={isSolarActive ? "bg-green-500" : "bg-slate-300"} speed={simSpeed} arrowColor="text-green-100" />
             <RigidCable height={30} active={isSolarActive} color={isSolarActive ? "bg-green-500" : "bg-slate-300"} speed={simSpeed} arrowColor="text-green-100" />
             <RigidCable height={30} active={isSolarActive} color={isSolarActive ? "bg-green-500" : "bg-slate-300"} speed={simSpeed} arrowColor="text-green-100" />
          </div>
          <div className="w-[550px] h-4 bg-slate-800 rounded-full shadow-md z-10 relative flex items-center justify-center">
             <div className="text-[8px] text-white font-mono tracking-widest">AC DISTRIBUTION BUS</div>
          </div>
          <div className="flex justify-between w-[500px]">
             <RigidCable 
               height={40} 
               active={data.netGridPower !== 0 && gridStatus === 'Online'} 
               flowDirection={gridFlowDir} 
               color={gridStatus === 'Offline' ? 'bg-red-200' : data.netGridPower < 0 ? "bg-sky-500" : data.netGridPower > 0 ? "bg-green-500" : "bg-slate-300"} 
               speed={simSpeed}
               arrowColor={data.netGridPower < 0 ? "text-sky-100" : "text-green-100"}
             />
             <RigidCable height={40} active={data.homeLoad > 0} color="bg-slate-800" speed={simSpeed} arrowColor="text-slate-200" />
             <RigidCable height={40} active={ev1Status === 'Charging'} color={ev1Status === 'Charging' ? "bg-slate-800" : "bg-slate-200"} speed={simSpeed} arrowColor="text-slate-200" />
             <RigidCable height={40} active={ev2Status === 'Charging'} color={ev2Status === 'Charging' ? "bg-slate-800" : "bg-slate-200"} speed={simSpeed} arrowColor="text-slate-200" />
             <RigidCable 
               height={40} 
               active={data.batteryStatus !== 'Idle'} 
               flowDirection={data.batteryStatus === 'Charging' ? 'down' : 'up'} 
               color={data.batteryStatus === 'Charging' ? "bg-green-500" : data.batteryStatus === 'Discharging' ? "bg-orange-500" : "bg-slate-300"} 
               speed={simSpeed}
               arrowColor={data.batteryStatus === 'Charging' ? "text-green-100" : "text-orange-100"}
             />
          </div>
       </div>
        <div className="flex gap-3 sm:gap-4 justify-between w-full max-w-[600px] mt-0">
          <div className="flex-1 flex justify-center scale-90"><GridProduct power={data.netGridPower} isImporting={data.netGridPower < 0} isExporting={data.netGridPower > 0} gridStatus={gridStatus} /></div>
          <div className="flex-1 flex justify-center scale-90"><HomeProduct power={data.homeLoad} /></div>
          <div className="flex-1 flex justify-center scale-90"><EVChargerProduct id={1} status={ev1Status} soc={data.ev1Soc} power={data.ev1Load} carName="EV 1 (Commuter)" capacity={evSpecs.ev1.capacity} maxRate={evSpecs.ev1.rate} onToggle={() => {}} v2g={data.ev1V2g} /></div>
          <div className="flex-1 flex justify-center scale-90"><EVChargerProduct id={2} status={ev2Status} soc={data.ev2Soc} power={data.ev2Load} carName="EV 2 (Uber)" capacity={evSpecs.ev2.capacity} maxRate={evSpecs.ev2.rate} onToggle={() => {}} v2g={data.ev2V2g} /></div>
          <div className="flex-1 flex justify-center scale-90"><BatteryProduct level={data.batteryLevel} status={data.batteryStatus} power={data.batteryPower} health={data.batteryHealth} cycles={data.batteryCycles} /></div>
        </div>
      </div>
    </div>
  );
});

// --- 6. APP COMPONENT ---

export default function App() {
  // Location and solar data state
  const [currentLocation, setCurrentLocation] = useState<LocationCoordinates>(KENYA_LOCATIONS[0]); // Default to Nairobi
  const [solarData, setSolarData] = useState<SolarIrradianceData>({
    latitude: -1.2921,
    longitude: 36.8219,
    location: 'Nairobi',
    monthlyAverage: [5.5, 5.8, 5.6, 5.4, 5.2, 5.1, 5.0, 5.3, 5.7, 5.8, 5.4, 5.3],
    annualAverage: 5.4,
    monthlyTemperature: [22, 23, 24, 23, 22, 21, 20, 21, 22, 23, 22, 22],
    peakSunHours: [5.5, 5.8, 5.6, 5.4, 5.2, 5.1, 5.0, 5.3, 5.7, 5.8, 5.4, 5.3],
  });
  const [isRecommendationOpen, setIsRecommendationOpen] = useState(false);
  const [systemConfig, setSystemConfig] = useState<SystemConfig>(DEFAULT_SYSTEM_CONFIG);
  const derivedSystemConfig = useMemo<DerivedSystemConfig>(
    () => ({ ...systemConfig, pvCapacityKw: derivePvCapacity(systemConfig) }),
    [systemConfig]
  );
  const systemConfigRef = useRef<DerivedSystemConfig>({ ...DEFAULT_SYSTEM_CONFIG, pvCapacityKw: derivePvCapacity(DEFAULT_SYSTEM_CONFIG) });
  useEffect(() => {
    systemConfigRef.current = derivedSystemConfig;
  }, [derivedSystemConfig]);

  // Start at midnight so the very first simulated day runs midnight→midnight
  // and accumulates the full 420 data points like every subsequent day.
  const [timeOfDay, setTimeOfDay] = useState(0);
  const [currentDate, setCurrentDate] = useState(new Date('2026-01-01T00:00:00'));
  const [isAutoMode, setIsAutoMode] = useState(false);
  const [simSpeed, setSimSpeed] = useState(1);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [priorityMode, setPriorityMode] = useState('auto');
  const [gridStatus, setGridStatus] = useState('Online');
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'year'>('today');
  const [weather, setWeather] = useState('Sunny');
  const [financialInputs, setFinancialInputs] = useState<FinancialInputs>({
    chargingTariffKes: 45,
    discountRatePct: 12,
    stationCount: 3,
    targetUtilizationPct: 55,
    projectYears: 20,
  });
  // weatherRef mirrors weather state for use inside callbacks without stale closures
  const weatherRef = useRef('Sunny');
  weatherRef.current = weather;

  const evSpecs = useMemo(() => ({
     ev1: { capacity: 80, rate: 7, drainRate: 0.5, cap: 80, onboard: 7 },
     ev2: { capacity: 118, rate: 22, drainRate: 0.8, cap: 118, onboard: 22 }
  }), []);

  const [data, setData] = useState({
    solarR: 0, homeLoad: 5, ev1Load: 0, ev2Load: 0, 
    ev1Status: 'Idle', ev2Status: 'Idle',
    ev1Soc: 60, ev2Soc: 50,
    batteryPower: 0, batteryLevel: 50, batteryStatus: 'Idle',
    netGridPower: 0, displaySavings: 0,
    effectivePriority: 'load',
    totalSolar: 0,
    totalGridImport: 0,
    currentTariffRate: KPLC_TARIFF.getLowRateWithVAT(),
    isPeakTime: false,
    carbonOffset: 0,
    batteryHealth: 1.0,
    batteryCycles: 0,
    monthlyPeakDemandKW: 0,
    estimatedDemandChargeKES: 0,
    feedInEarnings: 0,
    ev1V2g: false,
    ev2V2g: false,
    _graphPoint: null as GraphDataPoint | null,
  });

  const accumulators = useRef({ solar: 0, savings: 0, gridImport: 0, carbonOffset: 0, batDischargeKwh: 0, feedInEarnings: 0 });
  const soilingFactorRef = useRef(1.0);
  const batteryHealthRef = useRef(1.0);
  const batteryCyclesRef = useRef(0);        // lifetime fractional cycles
  const cumulativeDischargeRef = useRef(0);  // lifetime kWh discharged (persists across days)
  const cloudNoiseRef = useRef(0);
  const monthlyPeakDemandRef = useRef(0);
  const todayGraphDataRef = useRef<GraphDataPoint[]>([]);
  const [dailyGraphData, setDailyGraphData] = useState<GraphDataPoint[]>([]);
  const [pastGraphs, setPastGraphs] = useState<Array<{ date: string; data: GraphDataPoint[] }>>([]);
  const dayScenarioRef = useRef(
    generateDayScenario('Sunny', new Date('2026-01-01'), 1.0, solarData, systemConfigRef.current)
  );
  
  // Comprehensive data tracking for export - stores all minute-by-minute data
  const minuteDataRef = useRef<SimulationMinuteRecord[]>([]);
  
  const systemStartDate = useRef('2026-01-01'); // System start date for tracking
  const lastProcessedTimeRef = useRef<number | null>(null);
  const financialSnapshot = useMemo(
    () => buildFinancialSnapshot({
      minuteData: minuteDataRef.current,
      solarData,
      inputs: financialInputs,
      evCapacityKw: evSpecs.ev1.rate + evSpecs.ev2.rate,
    }),
    [financialInputs, solarData, evSpecs, minuteDataRef.current.length]
  );

  // Physics state refs: keep the authoritative simulation state outside React
  // so the interval can sub-step at fixed (24/420)-hour steps regardless of speed.
  // Starting at t=0 (midnight) ensures every simulated day is a full 24-hour
  // cycle → exactly 420 data points per day for all simulation speeds.
  const timeOfDayRef = useRef(0);
  const batKwhRef = useRef(systemConfigRef.current.batteryKwh * 0.5);
  const ev1SocRef = useRef(60);
  const ev2SocRef = useRef(50);

  const handleReset = () => {
    setTimeOfDay(0);
    setCurrentDate(new Date('2026-01-01T00:00:00'));
    accumulators.current = { solar: 0, savings: 0, gridImport: 0, carbonOffset: 0, batDischargeKwh: 0, feedInEarnings: 0 };
    soilingFactorRef.current = 1.0;
    batteryHealthRef.current = 1.0;
    batteryCyclesRef.current = 0;
    cumulativeDischargeRef.current = 0;
    cloudNoiseRef.current = 0;
    monthlyPeakDemandRef.current = 0;
    todayGraphDataRef.current = [];
    setDailyGraphData([]);
    setPastGraphs([]);
    minuteDataRef.current = [];
    setData(prev => ({ ...prev, batteryLevel: 50, ev1Soc: 60, ev2Soc: 50, displaySavings: 0, carbonOffset: 0, batteryHealth: 1.0, batteryCycles: 0, monthlyPeakDemandKW: 0, estimatedDemandChargeKES: 0, feedInEarnings: 0, ev1V2g: false, ev2V2g: false }));
    setIsAutoMode(false);
    dayScenarioRef.current = generateDayScenario('Sunny', new Date('2026-01-01'), 1.0, solarData, systemConfigRef.current);
    timeOfDayRef.current = 0;
    batKwhRef.current = systemConfigRef.current.batteryKwh * 0.5;
    ev1SocRef.current = dayScenarioRef.current.ev1.startSoc;
    ev2SocRef.current = dayScenarioRef.current.ev2.startSoc;
  };

  const handleFinancialInputsChange = useCallback((next: FinancialInputs) => {
    setFinancialInputs(next);
  }, []);

  useEffect(() => {
    const updatedScenario = generateDayScenario(
      weatherRef.current,
      currentDate,
      soilingFactorRef.current,
      solarData,
      systemConfigRef.current
    );
    dayScenarioRef.current = updatedScenario;
    const cappedEnergy = Math.min(
      batKwhRef.current,
      systemConfigRef.current.batteryKwh * batteryHealthRef.current
    );
    batKwhRef.current = cappedEnergy;
    setData(prev => ({
      ...prev,
      batteryLevel: (batKwhRef.current / (systemConfigRef.current.batteryKwh * batteryHealthRef.current)) * 100,
    }));
  }, [derivedSystemConfig, solarData, currentDate]);

  const handleNewDay = useCallback(() => {
    const nextDate = new Date(currentDate);
    nextDate.setDate(nextDate.getDate() + 1);
    setCurrentDate(nextDate);
    accumulators.current = { solar: 0, savings: 0, gridImport: 0, carbonOffset: 0, batDischargeKwh: 0, feedInEarnings: 0 };

    // Archive completed day's graph before clearing.
    // Use setTimeout to defer the setPastGraphs call so that any pending React
    // state updates and physics useEffect callbacks (which populate
    // todayGraphDataRef.current) have a chance to flush before the snapshot is
    // committed to pastGraphs.  Without this deferral, at high simulation speeds
    // the batched state updates haven't settled yet and the snapshot is empty.
    const dateStr = currentDate.toISOString().slice(0, 10);
    const snapshot = [...todayGraphDataRef.current];
    setTimeout(() => {
      if (snapshot.length > 0) {
        setPastGraphs(prev => [...prev, { date: dateStr, data: snapshot }]);
      }
    }, 0);

    todayGraphDataRef.current = [];
    // At high simulation speeds (x100, x1000) only ~1 point is added to the
    // new day before the interval tick ends, making the graph appear empty.
    // Keep the completed day's snapshot visible until enough new-day data
    // accumulates (interval below checks length before overwriting this).
    if (snapshot.length > 0) {
      setDailyGraphData(snapshot);
    } else {
      setDailyGraphData([]);
    }

    // Markov chain weather transition (day-to-day persistence)
    const newWeather = nextWeatherMarkov(weatherRef.current);
    setWeather(newWeather);
    
    if (Math.random() > 0.95) setGridStatus('Offline'); else setGridStatus('Online');

    // Reset monthly peak demand at month start
    if (nextDate.getDate() === 1) {
      monthlyPeakDemandRef.current = 0;
    }
    
    // Update soiling: rain resets dust, dry days accumulate per SOILING_LOSS_PER_DAY
    if (newWeather === 'Rainy') {
      soilingFactorRef.current = 1.0;
    } else {
      soilingFactorRef.current = Math.max(SOILING_MIN_FACTOR, soilingFactorRef.current - SOILING_LOSS_PER_DAY);
    }

    dayScenarioRef.current = generateDayScenario(newWeather, nextDate, soilingFactorRef.current, solarData, systemConfigRef.current);
    ev1SocRef.current = dayScenarioRef.current.ev1.startSoc;
    ev2SocRef.current = dayScenarioRef.current.ev2.startSoc;
    setData(prev => ({ ...prev, ev1Soc: dayScenarioRef.current.ev1.startSoc, ev2Soc: dayScenarioRef.current.ev2.startSoc }));
  }, [currentDate]);

  const handleNewDayRef = useRef(handleNewDay);
  
  // Update ref in useLayoutEffect to avoid render-time ref assignment warning
  useLayoutEffect(() => {
    handleNewDayRef.current = handleNewDay;
  });

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    let rafId: number | null = null;
    let cancelled = false;
    let isProcessing = false;

    const processTick = () => {
      const { simSpeed: spd, priorityMode: curPriority, evSpecs: curEvSpecs, systemConfig: curSystemConfig } = computeParamsRef.current;
      const GRAPH_STEP_H = 24 / 420;
      const totalAdvance = Math.min(24.0, GRAPH_STEP_H * spd);
      const numSteps = Math.max(1, Math.ceil(totalAdvance / GRAPH_STEP_H));
      const actualStep = totalAdvance / numSteps;
      // Maintain fixed-resolution sub-steps (420 points/day) while chunking
      // work across animation frames so x1000 simulations don't block the UI.

      let lastState: ReturnType<typeof runSolarSimulation> | null = null;
      let lastApplicableRate = KPLC_TARIFF.getLowRateWithVAT();
      const newGraphPoints: GraphDataPoint[] = [];
      let processed = 0;

      const processChunk = () => {
        const budgetMs = spd >= 1000 ? 12 : spd >= 100 ? 10 : 8;
        const chunkStart = typeof performance !== 'undefined' ? performance.now() : Date.now();

        while (processed < numSteps && !cancelled) {
          const nextT = timeOfDayRef.current + actualStep;

          if (nextT >= 24) {
            // Flush sub-step points accumulated so far into today's ref so that
            // handleNewDay's snapshot includes them, then advance the day.
            todayGraphDataRef.current.push(...newGraphPoints);
            newGraphPoints.length = 0;
            handleNewDayRef.current();
            // Sync EV SOC refs with the new day scenario (updated synchronously
            // inside handleNewDay before any React state setter is called).
            ev1SocRef.current = dayScenarioRef.current.ev1.startSoc;
            ev2SocRef.current = dayScenarioRef.current.ev2.startSoc;
            timeOfDayRef.current = nextT - 24;
          } else {
            timeOfDayRef.current = nextT;
          }

          // Advance Brownian cloud walk proportionally to sub-step size.
          cloudNoiseRef.current += gaussianRandom(0, 0.05 * Math.sqrt(actualStep / 0.05));
          cloudNoiseRef.current = Math.max(-1, Math.min(1, cloudNoiseRef.current * 0.97));

          const state = runSolarSimulation(
            timeOfDayRef.current,
            batKwhRef.current,
            ev1SocRef.current,
            ev2SocRef.current,
            dayScenarioRef.current,
            curEvSpecs,
            curSystemConfig,
            cloudNoiseRef.current,
            batteryHealthRef.current,
            actualStep,
            curPriority,
            KPLC_TARIFF.isPeakTime(Math.floor(timeOfDayRef.current))
          );

          // Update authoritative physics refs.
          batKwhRef.current = state.batKwh;
          ev1SocRef.current = state.ev1Soc;
          ev2SocRef.current = state.ev2Soc;

          // Accumulators.
          const currentHour = Math.floor(timeOfDayRef.current);
          const dayOfWeek = computeParamsRef.current.currentDate.getDay();
          const applicableRate = KPLC_TARIFF.getRateForTimeAndDay(currentHour, dayOfWeek);
          const solarConsumed = state.solar - (state.gridExport > 0 ? state.gridExport : 0);
          const moneySaved = solarConsumed * applicableRate * actualStep;
          const feedInEarned = state.gridExport * FEED_IN_TARIFF_RATE * actualStep;

          accumulators.current.solar += state.solar * actualStep;
          accumulators.current.savings += moneySaved + feedInEarned;
          accumulators.current.feedInEarnings += feedInEarned;
          if (state.gridImport > 0) accumulators.current.gridImport += state.gridImport * actualStep;
          accumulators.current.carbonOffset += solarConsumed * GRID_EMISSION_FACTOR * actualStep;

          if (state.gridImport > monthlyPeakDemandRef.current) {
            monthlyPeakDemandRef.current = state.gridImport;
          }

          const effectiveCapacity = curSystemConfig.batteryKwh * batteryHealthRef.current;

          if (state.batDischargeKw > 0) {
            const dischargedKwh = state.batDischargeKw * actualStep;
            accumulators.current.batDischargeKwh += dischargedKwh;
            cumulativeDischargeRef.current += dischargedKwh;
            batteryCyclesRef.current = cumulativeDischargeRef.current / Math.max(1, curSystemConfig.batteryKwh * batteryHealthRef.current);
            batteryHealthRef.current = Math.max(0.70, 1.0 - (batteryCyclesRef.current / 4000) * 0.30);
          }

          // Minute-data log: one entry per sub-step (covers actualStep simulated hours).
          // Pre-compute date fields once per sub-step to avoid repeated Date allocations.
          const simDate = computeParamsRef.current.currentDate;
          const minuteFrac = Math.floor((timeOfDayRef.current % 1) * 60);
          const weekNum = getWeekNumber(simDate);
          const dateStr = simDate.toISOString().split('T')[0];
          const tsHours = simDate.getTime() + currentHour * 3600000 + minuteFrac * 60000;
          const timestamp = new Date(tsHours).toISOString();
          minuteDataRef.current.push({
            timestamp,
            date: dateStr,
            year: simDate.getFullYear(),
            month: simDate.getMonth() + 1,
            week: weekNum,
            day: simDate.getDate(),
            hour: currentHour,
            minute: minuteFrac,
            solarKW: state.solar,
            homeLoadKW: state.houseLoad,
            ev1LoadKW: state.ev1Kw,
            ev2LoadKW: state.ev2Kw,
            batteryPowerKW: state.batPower,
            batteryLevelPct: (state.batKwh / curSystemConfig.batteryKwh) * 100,
            gridImportKW: state.gridImport,
            gridExportKW: state.gridExport,
            ev1SocPct: state.ev1Soc,
            ev2SocPct: state.ev2Soc,
            tariffRate: applicableRate,
            isPeakTime: KPLC_TARIFF.isPeakTime(currentHour),
            savingsKES: moneySaved,
            homeLoadKWh: state.houseLoad * actualStep,
            ev1LoadKWh: state.ev1Kw * actualStep,
            ev2LoadKWh: state.ev2Kw * actualStep,
            solarEnergyKWh: state.solar * actualStep,
            gridImportKWh: state.gridImport * actualStep,
            gridExportKWh: state.gridExport * actualStep,
          });
          // Cap minuteDataRef to ~2 years of data (~305,760 records) to prevent
          // unbounded memory growth during long x1000 sessions.  Excess records
          // are trimmed from the front (oldest data) so totals are preserved
          // through the running accumulators instead of this array.
          const MAX_MINUTE_RECORDS = 420 * 365 * 2;
          if (minuteDataRef.current.length > MAX_MINUTE_RECORDS) {
            minuteDataRef.current.splice(0, minuteDataRef.current.length - MAX_MINUTE_RECORDS);
          }

          // Collect one graph data point per sub-step.
          newGraphPoints.push({
            timeOfDay: timeOfDayRef.current,
            solar: state.solar,
            load: state.load,
            batSoc: (state.batKwh / (curSystemConfig.batteryKwh * batteryHealthRef.current)) * 100,
          });

          lastState = state;
          lastApplicableRate = applicableRate;
          processed++;

          const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
          if (now - chunkStart > budgetMs) break;
        }

        if (cancelled) {
          isProcessing = false;
          return;
        }

        if (processed < numSteps) {
          rafId = requestAnimationFrame(processChunk);
          return;
        }

        if (lastState) {
          // Append graph points and refresh the graph once per interval tick.
          // Only overwrite the displayed graph when the new day has accumulated
          // enough points; otherwise the completed-day snapshot set by
          // handleNewDay stays visible (prevents empty graph at x1000).
          todayGraphDataRef.current.push(...newGraphPoints);
          if (todayGraphDataRef.current.length > 5) {
            setDailyGraphData([...todayGraphDataRef.current]);
          }

          // Single React state update per tick for all display values.
          setTimeOfDay(timeOfDayRef.current);
          const finalState = lastState;
          const effectiveCapacity = curSystemConfig.batteryKwh * batteryHealthRef.current;
          setData(prev => {
            let effectivePriority = curPriority;
            if (curPriority === 'auto') {
              effectivePriority = 'load';
              if (batKwhRef.current / effectiveCapacity * 100 < 40) effectivePriority = 'battery';
            }
            return {
              ...prev,
              solarR: finalState.solar,
              homeLoad: finalState.houseLoad,
              ev1Load: finalState.ev1Kw,
              ev1Status: finalState.ev1Kw > 0 ? 'Charging' : (finalState.ev1IsHome ? 'Idle' : 'Away'),
              ev1Soc: finalState.ev1Soc,
              ev2Load: finalState.ev2Kw,
              ev2Status: finalState.ev2Kw > 0 ? 'Charging' : (finalState.ev2IsHome ? 'Idle' : 'Away'),
              ev2Soc: finalState.ev2Soc,
              ev1V2g: finalState.ev1V2g ?? false,
              ev2V2g: finalState.ev2V2g ?? false,
              batteryPower: finalState.batPower,
              batteryStatus: finalState.batPower > 0.1 ? 'Charging' : (finalState.batPower < -0.1 ? 'Discharging' : 'Idle'),
              batteryLevel: (batKwhRef.current / effectiveCapacity) * 100,
              batteryHealth: batteryHealthRef.current,
              batteryCycles: Math.round(batteryCyclesRef.current * 10) / 10,
              netGridPower: finalState.gridExport > 0 ? finalState.gridExport : -finalState.gridImport,
              effectivePriority,
              displaySavings: accumulators.current.savings,
              totalSolar: accumulators.current.solar,
              totalGridImport: accumulators.current.gridImport,
              monthlyPeakDemandKW: monthlyPeakDemandRef.current,
              estimatedDemandChargeKES: monthlyPeakDemandRef.current * KPLC_DEMAND_CHARGE_KES_PER_KW,
              feedInEarnings: accumulators.current.feedInEarnings,
              currentTariffRate: lastApplicableRate,
              isPeakTime: KPLC_TARIFF.isPeakTime(Math.floor(timeOfDayRef.current)),
              carbonOffset: accumulators.current.carbonOffset,
              // Auto mode drives graph via todayGraphDataRef; no _graphPoint needed.
              _graphPoint: null,
            };
          });
        }
        isProcessing = false;
      };

      processChunk();
    };

    if (isAutoMode) {
      interval = setInterval(() => {
        if (isProcessing) return;
        isProcessing = true;
        processTick();
      }, 100);
    }
    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
      if (rafId !== null) cancelAnimationFrame(rafId);
      isProcessing = false;
    };
  }, [isAutoMode, simSpeed]);

  // Use a ref to store computation parameters to avoid dependency issues
  const computeParamsRef = useRef({ simSpeed, priorityMode, isAutoMode, evSpecs, currentDate, systemConfig: systemConfigRef.current });
  useEffect(() => {
    computeParamsRef.current = { simSpeed, priorityMode, isAutoMode, evSpecs, currentDate, systemConfig: systemConfigRef.current };
  }, [simSpeed, priorityMode, isAutoMode, evSpecs, currentDate, derivedSystemConfig]);

  // Compute physics state whenever timeOfDay changes (manual mode only).
  // Auto mode is handled entirely by the interval above, which sub-steps at
  // a fixed 0.05-hour (3-minute) resolution for all simulation speeds.
  useEffect(() => {
    if (lastProcessedTimeRef.current === timeOfDay) return;
    lastProcessedTimeRef.current = timeOfDay;

    const {
      priorityMode: currentPriorityMode,
      isAutoMode: currentIsAutoMode,
      evSpecs: currentEvSpecs,
      currentDate: currentDateValue,
      systemConfig: currentSystemConfig
    } = computeParamsRef.current;

    // Skip in auto mode: the interval loop handles all physics + graph data.
    if (currentIsAutoMode) return;

    // Advance Brownian cloud walk outside of setData (safe side-effect location)
    cloudNoiseRef.current += gaussianRandom(0, 0.05);
    cloudNoiseRef.current = Math.max(-1, Math.min(1, cloudNoiseRef.current * 0.97));

    // Use a fixed 15-minute step for manual time-slider exploration.
    const physicsTimeStep = 0.25;

    // Compute physics using ref-based state for continuity across manual scrubs.
    const state = runSolarSimulation(
      timeOfDay,
      batKwhRef.current,
      ev1SocRef.current,
      ev2SocRef.current,
      dayScenarioRef.current,
      currentEvSpecs,
      currentSystemConfig,
      cloudNoiseRef.current,
      batteryHealthRef.current,
      physicsTimeStep,
      currentPriorityMode,
      KPLC_TARIFF.isPeakTime(Math.floor(timeOfDay))
    );

    // Keep refs in sync with the freshly-computed state.
    batKwhRef.current = state.batKwh;
    ev1SocRef.current = state.ev1Soc;
    ev2SocRef.current = state.ev2Soc;

    setData(prev => {
      const timeStep = physicsTimeStep;
      const solarConsumed = state.solar - (state.gridExport > 0 ? state.gridExport : 0);
      
      const currentHour = Math.floor(timeOfDay);
      const currentDayOfWeek = currentDateValue.getDay();
      const applicableRate = KPLC_TARIFF.getRateForTimeAndDay(currentHour, currentDayOfWeek);
      const moneySaved = solarConsumed * applicableRate * timeStep;
      const feedInEarned = state.gridExport * FEED_IN_TARIFF_RATE * timeStep;

      if (state.gridImport > monthlyPeakDemandRef.current) {
        monthlyPeakDemandRef.current = state.gridImport;
      }

      let effectivePriority = currentPriorityMode;
      if (currentPriorityMode === 'auto') {
         effectivePriority = 'load'; 
         if (state.batKwh / currentSystemConfig.batteryKwh * 100 < 40) effectivePriority = 'battery'; 
      }

      return {
         ...prev,
         solarR: state.solar,
         homeLoad: state.houseLoad,
         ev1Load: state.ev1Kw, ev1Status: state.ev1Kw > 0 ? 'Charging' : (state.ev1IsHome ? 'Idle' : 'Away'), ev1Soc: state.ev1Soc,
         ev2Load: state.ev2Kw, ev2Status: state.ev2Kw > 0 ? 'Charging' : (state.ev2IsHome ? 'Idle' : 'Away'), ev2Soc: state.ev2Soc,
         ev1V2g: state.ev1V2g ?? false,
         ev2V2g: state.ev2V2g ?? false,
         batteryPower: state.batPower,
         batteryStatus: state.batPower > 0.1 ? 'Charging' : (state.batPower < -0.1 ? 'Discharging' : 'Idle'),
         batteryLevel: (state.batKwh / (currentSystemConfig.batteryKwh * batteryHealthRef.current)) * 100,
         batteryHealth: batteryHealthRef.current,
         batteryCycles: Math.round(batteryCyclesRef.current * 10) / 10,
         netGridPower: state.gridExport > 0 ? state.gridExport : -state.gridImport,
         effectivePriority: effectivePriority,
         displaySavings: accumulators.current.savings,
         totalSolar: accumulators.current.solar,
         totalGridImport: accumulators.current.gridImport,
         monthlyPeakDemandKW: monthlyPeakDemandRef.current,
         estimatedDemandChargeKES: monthlyPeakDemandRef.current * KPLC_DEMAND_CHARGE_KES_PER_KW,
         feedInEarnings: accumulators.current.feedInEarnings,
         currentTariffRate: applicableRate,
         isPeakTime: KPLC_TARIFF.isPeakTime(currentHour),
         carbonOffset: accumulators.current.carbonOffset,
         _graphPoint: null,
      };
    });
  }, [timeOfDay]);

  // Graph sync: no-op in auto mode (interval handles it directly).
  // Kept to handle any edge cases where _graphPoint is non-null.
  useEffect(() => {
    if (data._graphPoint) {
      todayGraphDataRef.current.push(data._graphPoint as GraphDataPoint);
      setDailyGraphData([...todayGraphDataRef.current]);
    }
  }, [data._graphPoint]);

  const isNight = timeOfDay < 6 || timeOfDay > 19;

  // Handle location change
  const handleLocationChange = useCallback((location: LocationCoordinates, newSolarData: SolarIrradianceData) => {
    setCurrentLocation(location);
    setSolarData(newSolarData);
    console.log(`Location changed to ${location.name}. Solar data:`, newSolarData);
  }, []);

  // Handle opening recommendation panel
  const handleOpenRecommendation = useCallback(() => {
    setIsRecommendationOpen(true);
  }, []);

  // Export function for downloading report
  const handleExportReport = async () => {
    try {
      // Check if there's data to export
      const minuteData = minuteDataRef.current;
      if (!minuteData || minuteData.length === 0) {
        alert('No data to export. Please run the simulation first by clicking the Play button.');
        return;
      }

      console.log(`Exporting ${minuteData.length} data points...`);

      // --- Client-side CSV generation (avoids server body-size limits) ---
      type AggRow = {
        period: string; totalSolarKWh: number; totalHomeLoadKWh: number;
        totalEV1LoadKWh: number; totalEV2LoadKWh: number; totalGridImportKWh: number;
        totalGridExportKWh: number; avgBatteryLevelPct: number; avgEV1SocPct: number;
        avgEV2SocPct: number; totalSavingsKES: number; peakHoursCount: number;
        offPeakHoursCount: number;
      };
      const aggregate = (keyFn: (d: typeof minuteData[0]) => string): AggRow[] => {
        const groups = new Map<string, typeof minuteData>();
        for (const d of minuteData) {
          const k = keyFn(d);
          if (!groups.has(k)) groups.set(k, []);
          groups.get(k)!.push(d);
        }
        return Array.from(groups.entries()).map(([period, items]) => {
          const c = items.length;
          return {
            period,
            totalSolarKWh: items.reduce((s, d) => s + (d.solarEnergyKWh || 0), 0),
            totalHomeLoadKWh: items.reduce((s, d) => s + (d.homeLoadKWh ?? (d.homeLoadKW || 0) * (24 / 420)), 0),
            totalEV1LoadKWh: items.reduce((s, d) => s + (d.ev1LoadKWh ?? (d.ev1LoadKW || 0) * (24 / 420)), 0),
            totalEV2LoadKWh: items.reduce((s, d) => s + (d.ev2LoadKWh ?? (d.ev2LoadKW || 0) * (24 / 420)), 0),
            totalGridImportKWh: items.reduce((s, d) => s + (d.gridImportKWh || 0), 0),
            totalGridExportKWh: items.reduce((s, d) => s + (d.gridExportKWh || 0), 0),
            avgBatteryLevelPct: c > 0 ? items.reduce((s, d) => s + (d.batteryLevelPct || 0), 0) / c : 0,
            avgEV1SocPct: c > 0 ? items.reduce((s, d) => s + (d.ev1SocPct || 0), 0) / c : 0,
            avgEV2SocPct: c > 0 ? items.reduce((s, d) => s + (d.ev2SocPct || 0), 0) / c : 0,
            totalSavingsKES: items.reduce((s, d) => s + (d.savingsKES || 0), 0),
            peakHoursCount: items.filter(d => d.isPeakTime).length,
            offPeakHoursCount: items.filter(d => !d.isPeakTime).length,
          };
        }).sort((a, b) => a.period.localeCompare(b.period));
      };

      const hourlyData = aggregate(d => `${d.date} ${String(d.hour).padStart(2, '0')}:00`);
      const dailyData = aggregate(d => d.date);
      const weeklyData = aggregate(d => `${d.year}-W${String(d.week).padStart(2, '0')}`);
      const monthlyData = aggregate(d => `${d.year}-${String(d.month).padStart(2, '0')}`);
      const yearlyData = aggregate(d => String(d.year));

      const totalSolar = minuteData.reduce((s, d) => s + (d.solarEnergyKWh || 0), 0);
      const totalGridImport = minuteData.reduce((s, d) => s + (d.gridImportKWh || 0), 0);
      const totalGridExport = minuteData.reduce((s, d) => s + (d.gridExportKWh || 0), 0);
      const totalSavings = minuteData.reduce((s, d) => s + (d.savingsKES || 0), 0);
      const totalHomeLoad = minuteData.reduce((s, d) => s + (d.homeLoadKWh ?? (d.homeLoadKW || 0) * (24 / 420)), 0);
      const totalEV1Load = minuteData.reduce((s, d) => s + (d.ev1LoadKWh ?? (d.ev1LoadKW || 0) * (24 / 420)), 0);
      const totalEV2Load = minuteData.reduce((s, d) => s + (d.ev2LoadKWh ?? (d.ev2LoadKW || 0) * (24 / 420)), 0);
      const totalLoad = totalHomeLoad + totalEV1Load + totalEV2Load;

      const uniqueDays = new Set(minuteData.map(d => d.date)).size;
      const uniqueWeeks = new Set(minuteData.map(d => `${d.year}-W${d.week}`)).size;
      const uniqueMonths = new Set(minuteData.map(d => `${d.year}-${d.month}`)).size;
      const uniqueYears = new Set(minuteData.map(d => d.year)).size;
      const peakCount = minuteData.filter(d => d.isPeakTime).length;
      const offPeakCount = minuteData.filter(d => !d.isPeakTime).length;

      // Build CSV string
      const parts: string[] = [];
      parts.push('SAFARICHARGE ENERGY REPORT');
      parts.push(`Generated,${new Date().toISOString()}`);
      parts.push(`System Start Date,${systemStartDate.current || 'Unknown'}`);
      parts.push(`Total Data Points,${minuteData.length}`);
      parts.push(`Date Range,${minuteData[0]?.date || 'N/A'},to,${minuteData[minuteData.length - 1]?.date || 'N/A'}`);
      parts.push('');
      parts.push('OVERALL SUMMARY');
      parts.push('Metric,Value,Unit');
      parts.push(`Total Solar Generated,${totalSolar.toFixed(2)},kWh`);
      parts.push(`Total Home Load,${totalHomeLoad.toFixed(2)},kWh`);
      parts.push(`Total EV1 Load,${totalEV1Load.toFixed(2)},kWh`);
      parts.push(`Total EV2 Load,${totalEV2Load.toFixed(2)},kWh`);
      parts.push(`Total Grid Import,${totalGridImport.toFixed(2)},kWh`);
      parts.push(`Total Grid Export,${totalGridExport.toFixed(2)},kWh`);
      parts.push(`Total Savings,${totalSavings.toFixed(2)},KES`);
      parts.push(`Net Energy,${(totalSolar - totalGridImport + totalGridExport).toFixed(2)},kWh`);
      parts.push(`Self-Sufficiency Rate,${totalLoad > 0 ? ((totalSolar / totalLoad) * 100).toFixed(1) : 0},%`);
      parts.push(`Unique Days Tracked,${uniqueDays},days`);
      parts.push(`Unique Weeks Tracked,${uniqueWeeks},weeks`);
      parts.push(`Unique Months Tracked,${uniqueMonths},months`);
      parts.push(`Unique Years Tracked,${uniqueYears},years`);
      parts.push(`Peak Time Records,${peakCount},records`);
      parts.push(`Off-Peak Time Records,${offPeakCount},records`);
      parts.push('');

      // Minute-by-Minute Data
      parts.push('MINUTE-BY-MINUTE DATA');
      parts.push('Timestamp,Date,Year,Month,Week,Day,Hour,Minute,Solar (kW),Home Load (kW),EV1 Load (kW),EV2 Load (kW),Battery Power (kW),Battery Level (%),Grid Import (kW),Grid Export (kW),EV1 SoC (%),EV2 SoC (%),Tariff Rate (KES/kWh),Peak Time,Savings (KES),Solar Energy (kWh),Grid Import (kWh),Grid Export (kWh)');
      for (const d of minuteData) {
        parts.push(`${d.timestamp},${d.date},${d.year},${d.month},${d.week},${d.day},${d.hour},${d.minute},${(d.solarKW || 0).toFixed(2)},${(d.homeLoadKW || 0).toFixed(2)},${(d.ev1LoadKW || 0).toFixed(2)},${(d.ev2LoadKW || 0).toFixed(2)},${(d.batteryPowerKW || 0).toFixed(2)},${(d.batteryLevelPct || 0).toFixed(1)},${(d.gridImportKW || 0).toFixed(2)},${(d.gridExportKW || 0).toFixed(2)},${(d.ev1SocPct || 0).toFixed(1)},${(d.ev2SocPct || 0).toFixed(1)},${(d.tariffRate || 0).toFixed(2)},${d.isPeakTime ? 'Yes' : 'No'},${(d.savingsKES || 0).toFixed(2)},${(d.solarEnergyKWh || 0).toFixed(4)},${(d.gridImportKWh || 0).toFixed(4)},${(d.gridExportKWh || 0).toFixed(4)}`);
      }
      parts.push('');

      // Aggregated section helper
      const writeSection = (title: string, data: AggRow[], periodLabel: string) => {
        parts.push(title);
        parts.push(`${periodLabel},Total Solar (kWh),Total Home Load (kWh),Total EV1 Load (kWh),Total EV2 Load (kWh),Grid Import (kWh),Grid Export (kWh),Avg Battery (%),Avg EV1 SoC (%),Avg EV2 SoC (%),Savings (KES),Peak Count,Off-Peak Count`);
        for (const d of data) {
          parts.push(`${d.period},${d.totalSolarKWh.toFixed(2)},${d.totalHomeLoadKWh.toFixed(2)},${d.totalEV1LoadKWh.toFixed(2)},${d.totalEV2LoadKWh.toFixed(2)},${d.totalGridImportKWh.toFixed(2)},${d.totalGridExportKWh.toFixed(2)},${d.avgBatteryLevelPct.toFixed(1)},${d.avgEV1SocPct.toFixed(1)},${d.avgEV2SocPct.toFixed(1)},${d.totalSavingsKES.toFixed(2)},${d.peakHoursCount},${d.offPeakHoursCount}`);
        }
        parts.push('');
      };
      writeSection('HOURLY SUMMARY', hourlyData, 'Period');
      writeSection('DAILY SUMMARY', dailyData, 'Date');
      writeSection('WEEKLY SUMMARY', weeklyData, 'Week');
      writeSection('MONTHLY SUMMARY', monthlyData, 'Month');
      writeSection('YEARLY SUMMARY', yearlyData, 'Year');

      // Daily Energy Profile Snapshot (from live graph data)
      if (dailyGraphData && dailyGraphData.length > 0) {
        const hhmm = (t: number) => {
          const h = Math.floor(t);
          const m = Math.round((t - h) * 60);
          return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        };
        parts.push('DAILY ENERGY PROFILE SNAPSHOT');
        parts.push('Time,Solar Gen (kW),Total Load (kW),Battery SOC (%)');
        for (const p of dailyGraphData) {
          parts.push(`${hhmm(p.timeOfDay)},${p.solar.toFixed(2)},${p.load.toFixed(2)},${p.batSoc.toFixed(1)}`);
        }
        parts.push('');
      }

      const csv = parts.join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SafariCharge_Report_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      const BLOB_REVOKE_DELAY_MS = 300;
      setTimeout(() => URL.revokeObjectURL(url), BLOB_REVOKE_DELAY_MS);
      
      console.log('Export completed successfully!');
    } catch (error) {
      console.error('Export error:', error);
      alert(`Failed to export report: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
    }
  };

  // Formal PDF report
  const handleFormalReport = async () => {
    let reportWindow: Window | null = null;
    try {
      const minuteData = minuteDataRef.current;
      if (!minuteData || minuteData.length === 0) {
        alert('No data available. Please run the simulation first by clicking the Play button.');
        return;
      }

      // Open the window synchronously (before any await) so popup blockers don't block it.
      reportWindow = window.open('', '_blank');
      if (!reportWindow) {
        alert('Unable to open the report. Please allow pop-ups for this site and try again.');
        return;
      }
      // Show a loading indicator while we fetch the report
      reportWindow.document.write('<html><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#0f172a;color:#94a3b8;"><p>Generating report\u2026</p></body></html>');
      reportWindow.document.close();

      // Pre-aggregate data client-side to avoid sending the full minuteData
      // array to the server (which can exceed Vercel's 4.5 MB body limit).
      const totalSolar = minuteData.reduce((s, d) => s + (d.solarEnergyKWh ?? 0), 0);
      const totalGridImport = minuteData.reduce((s, d) => s + (d.gridImportKWh ?? 0), 0);
      const totalGridExport = minuteData.reduce((s, d) => s + (d.gridExportKWh ?? 0), 0);
      const totalSavings = minuteData.reduce((s, d) => s + (d.savingsKES ?? 0), 0);
      const totalHomeLoad = minuteData.reduce((s, d) => s + (d.homeLoadKWh ?? (d.homeLoadKW ?? 0) * (24 / 420)), 0);
      const totalEV1 = minuteData.reduce((s, d) => s + (d.ev1LoadKWh ?? (d.ev1LoadKW ?? 0) * (24 / 420)), 0);
      const totalEV2 = minuteData.reduce((s, d) => s + (d.ev2LoadKWh ?? (d.ev2LoadKW ?? 0) * (24 / 420)), 0);
      let peakGridImport = 0, peakInstantSolar = 0, peakEVLoad = 0;
      let batterySum = 0;
      const peakBreakdown = { records: 0, solar: 0, gridImport: 0, gridExport: 0, savings: 0, homeLoad: 0, evLoad: 0 };
      const offPeakBreakdown = { records: 0, solar: 0, gridImport: 0, gridExport: 0, savings: 0, homeLoad: 0, evLoad: 0 };
      for (const d of minuteData) {
        const isPeak = Boolean(d.isPeakTime);
        const gi = d.gridImportKW ?? 0;
        if (gi > peakGridImport) peakGridImport = gi;
        const sk = d.solarKW ?? 0;
        if (sk > peakInstantSolar) peakInstantSolar = sk;
        const ev = (d.ev1LoadKW ?? 0) + (d.ev2LoadKW ?? 0);
        if (ev > peakEVLoad) peakEVLoad = ev;
        const solarEnergy = d.solarEnergyKWh ?? 0;
        const gridImportEnergy = d.gridImportKWh ?? 0;
        const gridExportEnergy = d.gridExportKWh ?? 0;
        const homeEnergy = d.homeLoadKWh ?? (d.homeLoadKW ?? 0) * (24 / 420);
        const evEnergy = (d.ev1LoadKWh ?? (d.ev1LoadKW ?? 0) * (24 / 420)) + (d.ev2LoadKWh ?? (d.ev2LoadKW ?? 0) * (24 / 420));
        const target = isPeak ? peakBreakdown : offPeakBreakdown;
        target.records += 1;
        target.solar += solarEnergy;
        target.gridImport += gridImportEnergy;
        target.gridExport += gridExportEnergy;
        target.savings += d.savingsKES ?? 0;
        target.homeLoad += homeEnergy;
        target.evLoad += evEnergy;
        batterySum += d.batteryLevelPct ?? 0;
      }
      const avgBattery = minuteData.length > 0 ? batterySum / minuteData.length : 0;
      const peakSolar = peakBreakdown.solar;

      // Build daily aggregation
      const dailyMap = new Map<string, {date: string; solar: number; gridImport: number; gridExport: number; savings: number; homeLoad: number; evLoad: number; ev1Load: number; ev2Load: number; avgBattery: number; batteryCount: number}>();
      for (const d of minuteData) {
        if (!dailyMap.has(d.date)) {
          dailyMap.set(d.date, { date: d.date, solar: 0, gridImport: 0, gridExport: 0, savings: 0, homeLoad: 0, evLoad: 0, ev1Load: 0, ev2Load: 0, avgBattery: 0, batteryCount: 0 });
        }
        const a = dailyMap.get(d.date)!;
        a.solar += d.solarEnergyKWh ?? 0;
        a.gridImport += d.gridImportKWh ?? 0;
        a.gridExport += d.gridExportKWh ?? 0;
        a.savings += d.savingsKES ?? 0;
        a.homeLoad += d.homeLoadKWh ?? (d.homeLoadKW ?? 0) * (24 / 420);
        a.ev1Load += d.ev1LoadKWh ?? (d.ev1LoadKW ?? 0) * (24 / 420);
        a.ev2Load += d.ev2LoadKWh ?? (d.ev2LoadKW ?? 0) * (24 / 420);
        a.evLoad += (d.ev1LoadKWh ?? (d.ev1LoadKW ?? 0) * (24 / 420)) + (d.ev2LoadKWh ?? (d.ev2LoadKW ?? 0) * (24 / 420));
        a.avgBattery += d.batteryLevelPct ?? 0;
        a.batteryCount += 1;
      }
      const dailyAgg = Array.from(dailyMap.values())
        // Compute the true average battery SoC for each day (was being sent as a
        // raw sum which caused the battery chart in the PDF report to render at
        // wildly incorrect Y coordinates).
        .map(r => ({ ...r, avgBattery: r.batteryCount > 0 ? r.avgBattery / r.batteryCount : 0 }))
        .sort((a, b) => a.date.localeCompare(b.date));
      const uniqueDays = dailyAgg.length;
      // Charts only display the last ~30 days; sending the full daily history can
      // push the JSON payload over server/body-size limits and trigger 5xx errors.
      const dailyAggCharts = dailyAgg.slice(-30);

      // Generate hardware recommendations for inclusion in the PDF report
      const { createLoadProfileFromSimulation, generateRecommendation } = await import('@/lib/recommendation-engine');
      const loadProfile = createLoadProfileFromSimulation(minuteData);
      const recommendation = generateRecommendation(loadProfile, solarData, {
        batteryPreference: 'auto',
        gridBackupRequired: true,
        autonomyDays: 1.5,
      });

      const response = await fetch('/api/formal-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preAggregated: true,
          startDate: systemStartDate.current,
          reportDate: new Date().toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' }),
          dateFrom: minuteData[0]?.date ?? systemStartDate.current,
          dateTo: minuteData[minuteData.length - 1]?.date ?? systemStartDate.current,
          totalDataPoints: minuteData.length,
          totalSolar, totalGridImport, totalGridExport, totalSavings,
          totalHomeLoad, totalEV1, totalEV2,
          peakSolar, peakGridImport, avgBattery,
          peakInstantSolar, peakEVLoad,
          peakBreakdown, offPeakBreakdown,
          uniqueDays,
          dailyAgg: dailyAggCharts,
          recommendation, // Include hardware recommendations in PDF
        }),
      });

      if (!response.ok) {
        const fallback = `HTTP ${response.status}`;
        const rawError = await response.text().catch(() => '');
        let parsedMessage = fallback;
        if (rawError) {
          try {
            const errorData = JSON.parse(rawError) as { error?: string; message?: string; details?: string };
            parsedMessage = errorData.error || errorData.message || fallback;
            if (errorData.details && errorData.details !== parsedMessage) {
              parsedMessage = `${parsedMessage}: ${errorData.details}`;
            }
          } catch {
            const textOnly = rawError
              .replace(/<[^>]*>/g, ' ')
              .replace(/\s+/g, ' ')
              .trim();
            if (textOnly) parsedMessage = textOnly.slice(0, 180);
          }
        }
        reportWindow.close();
        throw new Error(parsedMessage);
      }

      const html = await response.text();
      // Navigate the popup to a blob URL containing the full HTML report.
      // blob: is permitted by the CSP (default-src includes blob:) and this
      // approach is more reliable than document.open/write across browsers.
      const blob = new Blob([html], { type: 'text/html; charset=utf-8' });
      const blobUrl = URL.createObjectURL(blob);
      reportWindow.location.href = blobUrl;
      // Revoke the object URL after the window has had time to load it.
      setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
    } catch (error) {
      if (reportWindow && !reportWindow.closed) {
        reportWindow.close();
      }
      console.error('Formal report error:', error);
      alert(`Failed to generate report: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
    }
  };

  const handleSystemModeChange = useCallback((mode: SystemConfig['mode']) => {
    if (mode === 'auto') {
      setSystemConfig({ ...DEFAULT_SYSTEM_CONFIG, mode: 'auto' });
    } else {
      setSystemConfig(prev => ({ ...prev, mode: 'advanced' }));
    }
  }, []);

  const handleSystemConfigChange = useCallback((next: SystemConfig) => {
    setSystemConfig(next);
  }, []);

  const handlePresetSelect = useCallback((preset: keyof typeof SYSTEM_PRESETS) => {
    setSystemConfig(prev => ({ ...prev, ...SYSTEM_PRESETS[preset], mode: 'advanced' }));
  }, []);

  // Calculate flow directions for PowerFlowVisualization
  const flowDirection = {
    solarToHome: data.solarR > 0 && data.homeLoad > 0,
    solarToBattery: data.batteryPower > 0,
    solarToGrid: data.netGridPower < 0,
    batteryToHome: data.batteryPower < 0,
    gridToHome: data.netGridPower > 0,
  };

  // Environmental impact calculations
  const treesEquivalent = Math.round((data.carbonOffset / TREE_CO2_KG_PER_YEAR) * 10) / 10;
  const carKmOffset = Math.round(data.carbonOffset / AVG_CAR_EMISSION_KG_PER_KM);

  return (
    <DashboardLayout>
      {/* Keep all modals */}
      <SafariChargeAIAssistant isOpen={isAssistantOpen} onClose={() => setIsAssistantOpen(false)} data={data} timeOfDay={timeOfDay} weather={weather} currentDate={currentDate} isAutoMode={isAutoMode} />
      <RecommendationPanel
        isOpen={isRecommendationOpen}
        onClose={() => setIsRecommendationOpen(false)}
        simulationData={minuteDataRef.current}
        solarData={solarData}
        currentLocation={currentLocation}
      />
      <EnergyReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        savings={data.displaySavings}
        solarConsumed={data.totalSolar}
        gridImport={data.totalGridImport}
        minuteData={minuteDataRef.current}
        systemStartDate={systemStartDate.current}
        onExport={handleExportReport}
        onFormalReport={handleFormalReport}
        carbonOffset={data.carbonOffset}
      />

      {/* Dashboard Header */}
      <DashboardHeader
        currentDate={currentDate}
        onReset={handleReset}
        onLocationClick={() => setIsRecommendationOpen(true)}
        onDownload={handleExportReport}
        locationName={currentLocation.name}
        notificationCount={0}
      />

      {/* Main Dashboard Content */}
      <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-6 lg:space-y-8">
          {/* Page title + controls */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-[var(--text-primary)]">Solar Energy Dashboard</h2>
              <p className="text-sm text-[var(--text-tertiary)]">
                Monitor your solar energy system • {isAutoMode ? `Auto Mode (×${simSpeed})` : 'Manual Mode'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <TimeRangeSwitcher selectedRange={timeRange} onRangeChange={setTimeRange} />
              <button
                onClick={() => setIsAssistantOpen(true)}
                className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                style={{ backgroundColor: 'var(--consumption-soft)', color: 'var(--consumption)' }}
              >
                <MessageSquare className="h-4 w-4" />
                AI Assistant
              </button>
            </div>
          </div>

          {/* ROW 1 — 4 Stat Cards */}
          <StatCards
            totalGeneration={data.totalSolar}
            currentPower={data.solarR}
            consumption={data.homeLoad + data.ev1Load + data.ev2Load}
            savings={data.displaySavings}
          />

          {/* ROW 2 — Energy Flow (2/3) + Weather & Battery (1/3) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <PowerFlowVisualization
                solarPower={data.solarR}
                batteryPower={data.batteryPower}
                gridPower={data.netGridPower}
                homePower={data.homeLoad + data.ev1Load + data.ev2Load}
                batteryLevel={data.batteryLevel}
                flowDirection={flowDirection}
              />
            </div>
            <div className="flex flex-col gap-6">
              <WeatherCard
                condition={weather}
                locationName={currentLocation.name}
                irradiance={Math.round(data.solarR * 100 / (derivedSystemConfig.pvCapacityKw || 1))}
              />
              <BatteryStatusCard
                batteryLevel={data.batteryLevel}
                batteryPower={Math.abs(data.batteryPower)}
                capacity={derivedSystemConfig.batteryKwh}
                isCharging={data.batteryPower > 0}
              />
            </div>
          </div>

          {/* ROW 3 — Generation vs Consumption (2/3) + Energy Distribution (1/3) */}
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
                  <DailyEnergyGraph data={dailyGraphData} dateLabel={currentDate.toISOString().slice(0, 10)} />
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
                        {(() => {
                          const total = data.totalSolar + data.totalGridImport + 0.1;
                          const solarPct = data.totalSolar / total;
                          const gridPct = data.totalGridImport / total;
                          return (
                            <>
                              <circle cx="60" cy="60" r="48" fill="none" stroke="var(--solar)" strokeWidth="14"
                                strokeDasharray={`${solarPct * 2 * Math.PI * 48} ${2 * Math.PI * 48}`} strokeLinecap="round" opacity="0.9" />
                              <circle cx="60" cy="60" r="48" fill="none" stroke="var(--consumption)" strokeWidth="14"
                                strokeDasharray={`${gridPct * 2 * Math.PI * 48} ${2 * Math.PI * 48}`}
                                strokeDashoffset={`${-(solarPct * 2 * Math.PI * 48)}`} strokeLinecap="round" opacity="0.9" />
                            </>
                          );
                        })()}
                      </svg>
                      <div className="text-center z-10">
                        <div className="text-xl font-bold text-[var(--text-primary)]">{Math.round((data.totalSolar / (data.totalSolar + data.totalGridImport + 0.1)) * 100)}%</div>
                        <div className="text-[10px] text-[var(--text-tertiary)]">Solar</div>
                      </div>
                    </div>
                    <div className="w-full space-y-2">
                      {[
                        { label: 'Solar Generation', value: `${data.totalSolar.toFixed(1)} kWh`, color: 'var(--solar)' },
                        { label: 'Grid Import', value: `${data.totalGridImport.toFixed(1)} kWh`, color: 'var(--consumption)' },
                        { label: 'Battery Stored', value: `${(data.batteryLevel * derivedSystemConfig.batteryKwh / 100).toFixed(1)} kWh`, color: 'var(--battery)' },
                      ].map(item => (
                        <div key={item.label} className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                            <span className="text-xs text-[var(--text-secondary)]">{item.label}</span>
                          </div>
                          <span className="text-xs font-semibold text-[var(--text-primary)]">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* ROW 4 — Simulation Controls (2/3) + System Status (1/3) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card className="dashboard-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-[var(--text-primary)]">
                    <Settings className="h-5 w-5 text-[var(--battery)]" />
                    Simulation Controls
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <CentralDisplay
                    data={data}
                    timeOfDay={timeOfDay}
                    onTimeChange={setTimeOfDay}
                    isAutoMode={isAutoMode}
                    onToggleAuto={() => setIsAutoMode(!isAutoMode)}
                    simSpeed={simSpeed}
                    onSpeedChange={setSimSpeed}
                    onOpenReport={() => setIsReportOpen(true)}
                    priorityMode={priorityMode}
                    onTogglePriority={() => setPriorityMode(prev => prev === 'battery' ? 'load' : prev === 'load' ? 'auto' : 'battery')}
                    weather={weather}
                    isNight={isNight}
                    gridStatus={gridStatus}
                    onToggleGrid={() => setGridStatus(prev => prev === 'Online' ? 'Offline' : 'Online')}
                    displayPriority={data.effectivePriority}
                    ev1Status={data.ev1Status}
                    ev2Status={data.ev2Status}
                  />
                </CardContent>
              </Card>
            </div>
            <div>
              <Card className="dashboard-card h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-[var(--text-primary)]">
                    <AlertTriangle className="h-5 w-5 text-[var(--alert)]" />
                    System Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[var(--text-secondary)]">Grid Status</span>
                      <span className={`text-sm font-semibold ${gridStatus === 'Online' ? 'text-[var(--battery)]' : 'text-[var(--alert)]'}`}>
                        {gridStatus}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[var(--text-secondary)]">Weather</span>
                      <span className="text-sm font-semibold text-[var(--text-primary)]">{weather}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[var(--text-secondary)]">Priority Mode</span>
                      <span className="text-sm font-semibold text-[var(--consumption)]">{data.effectivePriority}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[var(--text-secondary)]">Battery Health</span>
                      <span className="text-sm font-semibold text-[var(--battery)]">{(data.batteryHealth * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[var(--text-secondary)]">Peak Time</span>
                      <span className={`text-sm font-semibold ${data.isPeakTime ? 'text-[var(--alert)]' : 'text-[var(--battery)]'}`}>
                        {data.isPeakTime ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* ROW 5 — System Visualization (2/3) + Environmental Impact (1/3) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card className="dashboard-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-[var(--text-primary)]">
                    <Building2 className="h-5 w-5 text-[var(--solar)]" />
                    Energy System Visualization
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <ResidentialPanel
                    data={data}
                    simSpeed={simSpeed}
                    weather={weather}
                    isNight={isNight}
                    gridStatus={gridStatus}
                    ev1Status={data.ev1Status}
                    ev2Status={data.ev2Status}
                    evSpecs={evSpecs}
                  />
                </CardContent>
              </Card>
            </div>
            <div>
              <Card className="dashboard-card h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-[var(--text-primary)]">
                    <Leaf className="h-5 w-5 text-[var(--battery)]" />
                    Environmental Impact
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-4">
                    {[
                      { icon: Leaf, value: `${(data.carbonOffset / 1000).toFixed(2)} tons`, label: 'CO₂ Offset', color: 'var(--battery)', tint: 'var(--battery-soft)' },
                      { icon: Trees, value: `${treesEquivalent}`, label: 'Trees Equivalent', color: 'var(--solar)', tint: 'var(--solar-soft)' },
                      { icon: CarIcon, value: `${carKmOffset.toLocaleString()} km`, label: 'Car Miles Offset', color: 'var(--consumption)', tint: 'var(--consumption-soft)' },
                    ].map(({ icon: Icon, value, label, color, tint }) => (
                      <div
                        key={label}
                        className="flex items-center gap-4 rounded-xl border p-4 transition-all duration-200 hover:-translate-y-0.5"
                        style={{ backgroundColor: tint, borderColor: 'var(--border)' }}
                      >
                        <div
                          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border"
                          style={{ backgroundColor: tint, borderColor: 'var(--border-strong)' }}
                        >
                          <Icon className="h-5 w-5" style={{ color }} />
                        </div>
                        <div>
                          <div className="text-xl font-bold" style={{ color }}>{value}</div>
                          <div className="text-xs text-[var(--text-secondary)]">{label}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* ROW 6 — System Configuration */}
          <Card className="dashboard-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[var(--text-primary)]">
                <Sliders className="h-5 w-5 text-[var(--consumption)]" />
                System Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <SystemConfigPanel
                config={derivedSystemConfig}
                onChange={handleSystemConfigChange}
                onModeChange={handleSystemModeChange}
                onPreset={handlePresetSelect}
              />
            </CardContent>
          </Card>

          {/* ROW 7 — Financial Dashboard */}
          <Card className="dashboard-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[var(--text-primary)]">
                <DollarSign className="h-5 w-5 text-[var(--battery)]" />
                Financial Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <FinancialDashboard
                snapshot={financialSnapshot}
                inputs={financialInputs}
                onInputsChange={handleFinancialInputsChange}
                hasSimulationData={minuteDataRef.current.length > 0}
                onRunSimulation={() => setIsAutoMode(true)}
              />
            </CardContent>
          </Card>

          {/* Past Days Graph Archive */}
          {pastGraphs.length > 0 && (
            <Card className="dashboard-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-[var(--text-primary)]">
                    <Calendar className="h-5 w-5 text-[var(--solar)]" />
                    Past Days Archive
                    <span className="text-sm font-normal text-[var(--text-tertiary)]">
                      ({pastGraphs.length} day{pastGraphs.length !== 1 ? 's' : ''})
                    </span>
                  </CardTitle>
                  <PastDaysZipButton pastGraphs={pastGraphs} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {pastGraphs.map(({ date, data: pastData }) => {
                    const peakSolar = pastData.reduce((maxValue, point) => point.solar > maxValue ? point.solar : maxValue, 0).toFixed(1);
                    const peakLoad  = pastData.reduce((maxValue, point) => point.load > maxValue ? point.load : maxValue, 0).toFixed(1);
                    const avgBat    = (pastData.reduce((s, p) => s + p.batSoc, 0) / Math.max(pastData.length, 1)).toFixed(0);
                    return (
                      <button
                        key={date}
                        onClick={() => {
                          const svg = buildGraphSVG(pastData, date);
                          triggerJPGDownload(svg, `SafariCharge_DailyGraph_${date}.jpg`);
                        }}
                        className="flex-shrink-0 flex flex-col gap-1 rounded-lg border p-3 transition-all duration-300 hover:-translate-y-0.5 w-36 text-left"
                        style={{ backgroundColor: 'var(--bg-card-muted)', borderColor: 'var(--border)' }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-[var(--text-primary)]">{date}</span>
                          <Download size={11} className="text-[var(--text-tertiary)]" />
                        </div>
                        <div className="text-[9px] text-[var(--text-secondary)] font-mono leading-tight">
                          ☀️ {peakSolar} kW
                        </div>
                        <div className="text-[9px] text-[var(--text-secondary)] font-mono leading-tight">
                          ⚡ {peakLoad} kW load
                        </div>
                        <div className="text-[9px] text-[var(--text-secondary)] font-mono leading-tight">
                          🔋 {avgBat}% avg
                        </div>
                        <MiniSparkline data={pastData} />
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </DashboardLayout>
  );
}
