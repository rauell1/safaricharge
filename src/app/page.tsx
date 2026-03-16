'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback, useLayoutEffect } from 'react';
import { 
  Sun, Cloud, Factory, Home, Building2, Battery, UtilityPole, Wifi, 
  Clock, Smartphone, Zap, ArrowDown, ArrowUp, MessageSquare, X, Send, 
  Sparkles, Loader2, Sliders, Play, Pause, FastForward, ChevronDown, 
  ChevronUp, MapPin, Table, FileText, PieChart, Settings, Calendar, 
  CloudRain, Moon, Download, RotateCcw, AlertTriangle, DollarSign,
  Cpu, Car, ZapOff, FileSpreadsheet, ExternalLink
} from 'lucide-react';
import DailyEnergyGraph, { type GraphDataPoint, buildGraphSVG, triggerJPGDownload, buildJPGBlob } from '@/components/DailyEnergyGraph';
import PortfolioProjects from '@/components/PortfolioProjects';

// --- CONFIGURATION - Kenya Power Commercial Tariff (E-Mobility) ---
// Based on actual KPLC bill for ROAM ELECTRIC LIMITED - February 2026
// Peak Hours: 6:00-10:00 (morning) and 18:00-22:00 (evening)
// Off-Peak Hours: All other times including weekends

const KPLC_TARIFF = {
  // Base energy rates (KES/kWh)
  HIGH_RATE_BASE: 16.00,      // Peak consumption rate
  LOW_RATE_BASE: 8.00,        // Off-peak consumption rate
  
  // Additional charges per kWh (from KPLC bill)
  FUEL_ENERGY_COST: 3.10,     // Fuel cost adjustment
  FERFA: 1.2061,              // Forex Exchange Adjustment
  INFA: 0.46,                 // Inflation Adjustment
  ERC_LEVY: 0.08,             // Energy Regulatory Commission Levy
  WRA_LEVY: 0.0121,           // Water Resources Authority Levy
  VAT_RATE: 0.16,             // Value Added Tax (16%)
  
  // Peak hours definition (24-hour format)
  PEAK_MORNING_START: 6,
  PEAK_MORNING_END: 10,
  PEAK_EVENING_START: 18,
  PEAK_EVENING_END: 22,
  
  // Calculate total rate including all charges
  getHighRateWithVAT: function() {
    const base = this.HIGH_RATE_BASE + this.FUEL_ENERGY_COST + this.FERFA + 
                 this.INFA + this.ERC_LEVY + this.WRA_LEVY;
    return base * (1 + this.VAT_RATE);
  },
  
  getLowRateWithVAT: function() {
    const base = this.LOW_RATE_BASE + this.FUEL_ENERGY_COST + this.FERFA + 
                 this.INFA + this.ERC_LEVY + this.WRA_LEVY;
    return base * (1 + this.VAT_RATE);
  },
  
  // Check if current time is peak hours
  isPeakTime: function(hour: number): boolean {
    return (hour >= this.PEAK_MORNING_START && hour < this.PEAK_MORNING_END) ||
           (hour >= this.PEAK_EVENING_START && hour < this.PEAK_EVENING_END);
  },
  
  // Get applicable rate based on time
  getRateForTime: function(hour: number): number {
    return this.isPeakTime(hour) ? this.getHighRateWithVAT() : this.getLowRateWithVAT();
  },

  // Weekends are entirely off-peak per KPLC commercial E-Mobility tariff
  isWeekend: function(dayOfWeek: number): boolean {
    return dayOfWeek === 0 || dayOfWeek === 6;
  },

  // Get applicable rate accounting for both time-of-use and day-of-week
  getRateForTimeAndDay: function(hour: number, dayOfWeek: number): number {
    if (this.isWeekend(dayOfWeek)) return this.getLowRateWithVAT();
    return this.getRateForTime(hour);
  }
};

// System specifications
const PV_CAPACITY = 50.0; 
const INVERTER_CAPACITY = 48.0; 
const BATTERY_CAPACITY = 60.0; 
const BATTERY_EFFICIENCY = 0.96;
const EV_CHARGER_RATE = 22.0; 
const MAX_BAT_CHARGE_RATE = 30.0; 
const MAX_BAT_DISCHARGE_RATE = 40.0; 

// --- PHYSICS HELPERS ---
// Average Kenya grid emission factor (mix of hydro + thermal generation)
const GRID_EMISSION_FACTOR = 0.47; // kgCO2/kWh
const PANEL_TEMP_COEFFICIENT = -0.005; // -0.5%/°C above 25°C STC
const TREE_CO2_KG_PER_YEAR = 21.77; // kg CO₂ absorbed per tree per year (UNFAO estimate)
const AVG_CAR_EMISSION_KG_PER_KM = 0.21; // kg CO₂ per km for average petrol car
const SOILING_LOSS_PER_DAY = 0.005; // 0.5% dust loss per day (≈3.5% per week)
const SOILING_MIN_FACTOR = 0.70; // Maximum soiling derating (30% loss before rain cleans)

/**
 * Seasonal solar peak hour for Nairobi (1.29°S latitude).
 * Sun is slightly north of zenith in June ("winter") → earlier peak ~11:00.
 * Sun is slightly south of zenith in December ("summer") → later peak ~13:00.
 */
const getSeasonalPeakHour = (month: number): number => {
  const phaseRad = ((month - 6) / 12) * 2 * Math.PI;
  return 12.0 + Math.cos(phaseRad) * 1.0;
};

/**
 * Panel temperature derating using NOCT model.
 * Estimates panel temperature from ambient (seasonal for Nairobi) + solar heating,
 * then applies the standard temperature coefficient.
 */
const getPanelTempEffect = (irradFraction: number, month: number): number => {
  // Nairobi ambient: ~22°C avg, peaks ~30°C in hot months (Oct-Mar)
  const ambientTemp = 22 + 8 * Math.sin(((month - 3) / 12) * 2 * Math.PI);
  const panelTemp = ambientTemp + irradFraction * 28; // simplified NOCT model
  const excess = Math.max(0, panelTemp - 25);
  return Math.max(0.70, 1.0 + excess * PANEL_TEMP_COEFFICIENT);
};

/**
 * Inverter efficiency curve: peaks ~97% at 50-80% of rated load,
 * falls off at very low loads and near full capacity.
 */
const getInverterEfficiency = (loadFraction: number): number => {
  if (loadFraction <= 0.05) return 0.82;
  if (loadFraction <= 0.20) return 0.93;
  if (loadFraction <= 0.60) return 0.97;
  if (loadFraction <= 0.90) return 0.96;
  return 0.94;
};

/**
 * Battery round-trip efficiency varies with charge/discharge rate:
 * ~95% at low rates (0.1C), ~85% at maximum rates (0.5C+).
 */
const getBatteryEfficiency = (rateFraction: number): number => {
  return Math.max(0.85, 0.95 - 0.10 * Math.min(1.0, rateFraction));
};

/**
 * Tapered EV charging above 80% SOC: realistic Li-ion CC/CV behavior.
 * Full rate below 80%, linearly reduced to 0 at 100%.
 */
const getEVTaperedRate = (soc: number, maxRate: number): number => {
  if (soc >= 100) return 0;
  if (soc >= 80) return maxRate * (100 - soc) / 20;
  return maxRate;
};

// Gaussian random (Box-Muller transform)
const gaussianRandom = (mean: number, std: number): number => {
  const u1 = Math.max(1e-10, Math.random());
  return mean + std * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * Math.random());
};

// Feed-in tariff: Kenya net metering pilot (KES/kWh earned for solar exported to grid)
const FEED_IN_TARIFF_RATE = 5.0;

// KPLC maximum demand charge (KES per kW of monthly peak grid import)
const KPLC_DEMAND_CHARGE_KES_PER_KW = 750.0;

// Weather Markov chain: realistic day-to-day persistence
const WEATHER_TRANSITION: Record<string, { Sunny: number; Cloudy: number; Rainy: number }> = {
  Sunny:  { Sunny: 0.70, Cloudy: 0.25, Rainy: 0.05 },
  Cloudy: { Sunny: 0.30, Cloudy: 0.50, Rainy: 0.20 },
  Rainy:  { Sunny: 0.10, Cloudy: 0.30, Rainy: 0.60 },
};

const nextWeatherMarkov = (current: string): string => {
  const row = WEATHER_TRANSITION[current] ?? WEATHER_TRANSITION.Sunny;
  const r = Math.random();
  if (r < row.Sunny) return 'Sunny';
  if (r < row.Sunny + row.Cloudy) return 'Cloudy';
  return 'Rainy';
};

// --- 1. PHYSICS ENGINE (Shared Logic) ---
const PhysicsEngine = {
  generateDayScenario: (weather: string, date: Date = new Date('2026-01-01'), soilingFactor: number = 1.0) => {
    const month = date.getMonth() + 1;
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const peakSolarHour = getSeasonalPeakHour(month);
    // Weather-dependent HVAC base load (sunny/hot days drive more cooling demand)
    const hvacBase = weather === 'Sunny' ? 3.5 : weather === 'Cloudy' ? 2.0 : 0.5;

    return {
      initialBatSoc: 30.0,
      month,
      dayOfWeek,
      isWeekend,
      peakSolarHour,
      soilingFactor,
      ev1: {
        startSoc: 40 + Math.random() * 30,
        depart: 7.5 + gaussianRandom(0, 0.2),
        return: 18.0 + gaussianRandom(0, 0.4),
        emergency: Math.random() < 0.2 ? { start: 20.0 + Math.random()*0.5, end: 21.0 + Math.random()*0.5 } : null,
        drainRate: 0.5,
        cap: 80,
        onboard: 7
      },
      ev2: {
        startSoc: 15 + Math.random() * 25,
        depart: 5.5 + gaussianRandom(0, 0.2),
        lunchStart: 12.5 + Math.random() * 0.5,    
        lunchEnd: 14.0 + Math.random() * 0.5,      
        return: 22.0 + gaussianRandom(0, 0.4),
        drainRate: 0.8,
        cap: 118,
        onboard: 22
      },
      weatherFactor: weather === 'Sunny' ? 1.0 : weather === 'Cloudy' ? 0.6 : 0.2,
      cloudNoiseSeed: Math.random(),
      houseLoadProfile: Array(24).fill(0).map((_, h) => {
        if (isWeekend) {
          // Weekend: later start, more midday leisure load, long evening peak
          if (h >= 8 && h < 11) return 4.0 + Math.random() * 2;
          if (h >= 11 && h < 16) return 3.0 + Math.random() * 1.5 + (weather === 'Sunny' ? hvacBase * Math.random() * 0.6 : 0);
          if (h >= 16 && h < 23) return 6.5 + Math.random() * 2.5;
          return 1.2;
        } else {
          // Weekday: morning rush, office-quiet midday with HVAC, evening peak
          if (h >= 6 && h < 9) return 5.0 + Math.random() * 2;
          if (h >= 9 && h < 18) return 2.0 + Math.random() + (weather === 'Sunny' && h >= 11 && h < 17 ? hvacBase * Math.random() * 0.5 : 0);
          if (h >= 18 && h < 22) return 6.0 + Math.random() * 3;
          return 0.8;
        }
      })
    };
  },

  calculateInstant: (t: number, prevBatKwh: number, prevEv1Soc: number, prevEv2Soc: number, scenario: any, evSpecs: any, cloudNoise = 0, batteryHealth = 1.0, actualTimeStep = 5/60) => {
    const timeStep = actualTimeStep;
    const month: number = scenario.month || 1;
    const peakHour: number = scenario.peakSolarHour || 12.75;
    const soiling: number = scenario.soilingFactor ?? 1.0;

    // A. Solar: seasonal peak hour, temperature coefficient, soiling/dust
    let solar = 0;
    if (t > 6.2 && t < 18.8) { 
        // Seasonal Gaussian width: wider in dry months (Jan-Feb, Jul-Aug), narrower in rainy months
        const width = 6 + 2 * Math.cos(((month - 7) / 12) * 2 * Math.PI);
        // Brownian cloud noise (passed in from external walk, bounded [-1,1])
        const noise = cloudNoise * 0.15;
        const irradFraction = Math.max(0, Math.exp(-Math.pow(t - peakHour, 2) / width));
        const tempEffect = getPanelTempEffect(irradFraction * scenario.weatherFactor, month);
        solar = PV_CAPACITY * irradFraction * (scenario.weatherFactor + noise) * soiling * tempEffect;
        solar = Math.max(0, solar);
    }

    // B. House Load with ±8% stochastic noise (appliance switching)
    const hIdx = Math.floor(t);
    const houseLoad = scenario.houseLoadProfile[hIdx % 24] * Math.max(0.5, 1 + gaussianRandom(0, 0.08));
    // Effective battery capacity and reserve accounting for degradation
    const effectiveCapacity = BATTERY_CAPACITY * batteryHealth;
    const effectiveReserve = 12.0 * batteryHealth;

    // C. EV Logic with tapered charging above 80% SOC
    let ev1Load = 0;
    let ev2Load = 0;
    let ev1IsHome = true;
    let ev2IsHome = true;

    // EV1 Status
    if ((t > scenario.ev1.depart && t < scenario.ev1.return) || 
        (scenario.ev1.emergency && t > scenario.ev1.emergency.start && t < scenario.ev1.emergency.end)) {
        ev1IsHome = false;
        prevEv1Soc = Math.max(5, prevEv1Soc - (evSpecs.ev1.drainRate * timeStep / evSpecs.ev1.cap * 100));
    } else {
        if (prevEv1Soc < 100) {
            const taperedRate = getEVTaperedRate(prevEv1Soc, Math.min(EV_CHARGER_RATE, evSpecs.ev1.onboard));
            const needed = (100 - prevEv1Soc) / 100 * evSpecs.ev1.cap;
            ev1Load = Math.min(taperedRate, needed / timeStep);
        }
    }

    // EV2 Status
    if ((t > scenario.ev2.depart && t < scenario.ev2.lunchStart) || 
        (t > scenario.ev2.lunchEnd && t < scenario.ev2.return)) {
        ev2IsHome = false;
        prevEv2Soc = Math.max(5, prevEv2Soc - (evSpecs.ev2.drainRate * timeStep / evSpecs.ev2.cap * 100));
    } else {
        if (prevEv2Soc < 100) {
            const taperedRate = getEVTaperedRate(prevEv2Soc, Math.min(EV_CHARGER_RATE, evSpecs.ev2.onboard));
            const needed = (100 - prevEv2Soc) / 100 * evSpecs.ev2.cap;
            ev2Load = Math.min(taperedRate, needed / timeStep);
        }
    }

    // Load Management
    let totalLoad = houseLoad + ev1Load + ev2Load;
    if (totalLoad > INVERTER_CAPACITY) {
        const available = Math.max(0, INVERTER_CAPACITY - houseLoad);
        if (ev1Load + ev2Load > 0) {
            const factor = available / (ev1Load + ev2Load);
            ev1Load *= factor;
            ev2Load *= factor;
            totalLoad = INVERTER_CAPACITY;
        }
    }

    // Apply inverter efficiency: DC solar → AC bus
    const inverterEff = getInverterEfficiency(totalLoad / INVERTER_CAPACITY);
    const effectiveSolar = solar * inverterEff;

    // Apply Charge to SOC
    if (ev1Load > 0) prevEv1Soc = Math.min(100, prevEv1Soc + (ev1Load * timeStep / evSpecs.ev1.cap * 100));
    if (ev2Load > 0) prevEv2Soc = Math.min(100, prevEv2Soc + (ev2Load * timeStep / evSpecs.ev2.cap * 100));

    // D. Energy Balance with variable battery efficiency
    let batCharge = 0;
    let batDischarge = 0;
    let gridImport = 0;
    let gridExport = 0;
    let newBatKwh = prevBatKwh;

    // V2G: during peak hours, EVs discharge to cover deficit if battery is low
    const isPeakNow = KPLC_TARIFF.isPeakTime(Math.floor(t));
    let v2gKw = 0;
    let ev1V2g = false;
    let ev2V2g = false;
    if (isPeakNow) {
        const batSocPct = (newBatKwh / effectiveCapacity) * 100;
        if (ev1IsHome && prevEv1Soc > 50 && batSocPct < 30) {
            const rate = Math.min(5, evSpecs.ev1.onboard);
            v2gKw += rate;
            ev1V2g = true;
            prevEv1Soc = Math.max(20, prevEv1Soc - (rate * timeStep / evSpecs.ev1.cap * 100));
        }
        if (ev2IsHome && prevEv2Soc > 50 && batSocPct < 30) {
            const rate = Math.min(5, evSpecs.ev2.onboard);
            v2gKw += rate;
            ev2V2g = true;
            prevEv2Soc = Math.max(20, prevEv2Soc - (rate * timeStep / evSpecs.ev2.cap * 100));
        }
    }
    const augmentedSolar = effectiveSolar + v2gKw;

    if (augmentedSolar >= totalLoad) {
        let excess = augmentedSolar - totalLoad;
        if (newBatKwh < effectiveCapacity) {
            const capRem = effectiveCapacity - newBatKwh;
            const chargeFraction = Math.min(excess, MAX_BAT_CHARGE_RATE) / MAX_BAT_CHARGE_RATE;
            const batEff = getBatteryEfficiency(chargeFraction);
            batCharge = Math.min(excess, MAX_BAT_CHARGE_RATE, (capRem / batEff) / timeStep);
            newBatKwh += batCharge * timeStep * batEff;
            excess -= batCharge;
        }
        gridExport = excess;
    } else {
        let deficit = totalLoad - augmentedSolar;
        if (newBatKwh > effectiveReserve) {
            const enAvail = newBatKwh - effectiveReserve;
            const dischargeFraction = Math.min(deficit, MAX_BAT_DISCHARGE_RATE) / MAX_BAT_DISCHARGE_RATE;
            const batEff = getBatteryEfficiency(dischargeFraction);
            batDischarge = Math.min(deficit, MAX_BAT_DISCHARGE_RATE, (enAvail * batEff) / timeStep);
            newBatKwh -= (batDischarge * timeStep) / batEff;
            deficit -= batDischarge;
        }
        gridImport = deficit;
    }

    return {
        solar, load: totalLoad, houseLoad, evLoad: ev1Load + ev2Load,
        gridImport, gridExport, 
        batPower: batCharge > 0 ? batCharge : -batDischarge,
        batKwh: Math.max(0, Math.min(effectiveCapacity, newBatKwh)),
        ev1Soc: prevEv1Soc, ev2Soc: prevEv2Soc,
        ev1IsHome, ev2IsHome,
        ev1Kw: ev1Load, ev2Kw: ev2Load,
        ev1V2g, ev2V2g, v2gKw,
        batDischargeKw: batDischarge,
    };
  }
};

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
         <div className={`bg-white rounded-full p-0.5 shadow-sm ${flowDirection === 'down' ? '' : 'rotate-180'}`}>
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
    <div className="text-center mt-2 bg-white/80 px-3 py-1 rounded-full shadow-sm border border-slate-200 backdrop-blur-sm">
      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">PV Array ({capacity}kW)</div>
      <div className="text-lg font-black text-slate-800 leading-none">{power.toFixed(1)} <span className="text-xs font-normal">kW</span></div>
    </div>
  </div>
));

const BatteryProduct = React.memo(({ level, status, power, health = 1.0, cycles = 0 }: {
  level: number; status: string; power: number; health?: number; cycles?: number;
}) => (
  <div className="flex flex-col items-center z-20">
    <div className="relative w-28 h-40 bg-slate-100 rounded-xl border border-slate-300 shadow-lg flex flex-col items-center justify-center overflow-hidden group transition-all duration-500 hover:-translate-y-1">
      <div className="absolute top-3 text-[7px] font-black text-slate-300 tracking-widest">SAFARICHARGE</div>
      <div className="w-3 h-24 bg-slate-200 rounded-full overflow-hidden relative border border-slate-300 shadow-inner">
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
    <div className="text-center mt-2 bg-white/80 px-2 py-1 rounded border border-slate-200 min-w-[90px] backdrop-blur-sm">
      <div className="text-[9px] font-bold text-slate-500 uppercase">Storage ({(60 * health).toFixed(0)}kWh)</div>
      <div className="text-sm font-black text-slate-800">{level.toFixed(1)}%</div>
      <div className={`text-[9px] font-bold ${health < 0.85 ? 'text-orange-500' : 'text-slate-400'}`}>
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
           <span className="text-slate-500 text-[8px] z-20">IDLE</span>
         )}
      </div>
      <div className="w-12 h-8 border-4 border-slate-700 rounded-b-full border-t-0"></div>
      <div className={`absolute top-2 right-2 w-1.5 h-1.5 rounded-full ${status === 'Charging' ? 'bg-sky-500 shadow-[0_0_8px_#0ea5e9]' : status === 'Away' ? 'bg-red-500' : 'bg-slate-600'}`}></div>
    </div>
    <div className="text-center mt-2 bg-white/80 px-2 py-1 rounded border border-slate-200 backdrop-blur-sm min-w-[90px]">
      <div className="text-[8px] font-bold text-slate-500 uppercase">{carName}</div>
      <div className="text-[7px] text-slate-400">{capacity}kWh • {maxRate}kW</div>
      <div className="flex justify-between items-end px-1 mt-1 border-t border-slate-100 pt-0.5">
         <span className="text-[8px] text-slate-400">SoC</span>
         <span className={`text-[10px] font-bold ${soc < 20 ? 'text-red-500' : 'text-sky-600'}`}>{(soc || 0).toFixed(0)}%</span>
      </div>
    </div>
  </div>
));

const InverterProduct = React.memo(({ id, power }: { id: number; power: number }) => (
  <div className="flex flex-col items-center bg-white rounded-lg shadow-md border border-slate-200 w-24 p-2 z-20 transition-transform hover:scale-105">
    <div className="w-full flex justify-between items-center mb-1 border-b border-slate-100 pb-1">
       <span className="text-[8px] font-bold text-slate-400">16kW Unit #{id}</span>
       <div className={`w-1.5 h-1.5 rounded-full ${power > 0 ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`}></div>
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
        <UtilityPole size={64} className={gridStatus === 'Online' ? "text-slate-700" : "text-red-300"} strokeWidth={1} />
        {gridStatus === 'Offline' && (
           <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded animate-pulse">GRID DOWN</div>
           </div>
        )}
        {gridStatus === 'Online' && (isImporting || isExporting) && (
           <div className={`absolute top-0 right-0 p-1 rounded bg-white border border-slate-200 shadow-sm flex items-center gap-1 ${isImporting ? 'text-sky-600' : 'text-green-500'}`}>
              {isImporting ? <ArrowDown size={10} /> : <ArrowUp size={10} />}
              <span className="text-[9px] font-bold">{Math.abs(power).toFixed(1)} kW</span>
           </div>
        )}
     </div>
     <div className="text-center mt-2 bg-white/80 px-2 py-1 rounded border border-slate-200 backdrop-blur-sm">
        <div className="text-[9px] font-bold text-slate-500 uppercase">Utility Grid</div>
        <div className="text-[9px] font-bold text-slate-800">
           {gridStatus === 'Offline' ? 'OFFLINE' : isImporting ? 'IMPORTING' : isExporting ? 'EXPORTING' : 'IDLE'}
        </div>
     </div>
  </div>
));

const HomeProduct = React.memo(({ power }: { power: number }) => (
  <div className="flex flex-col items-center z-20">
    <div className="w-24 h-32 flex items-center justify-center bg-slate-100 rounded-2xl border border-slate-200 shadow-sm">
       <Home size={40} className="text-slate-700" strokeWidth={1.5} />
    </div>
    <div className="text-center mt-2 bg-white/80 px-2 py-1 rounded border border-slate-200 backdrop-blur-sm">
      <div className="text-[9px] font-bold text-slate-500 uppercase">Home Load</div>
      <div className="text-sm font-black text-slate-800">{power.toFixed(1)} kW</div>
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
    <div className="absolute right-0 top-16 bottom-0 w-full md:w-96 bg-white shadow-2xl border-l border-slate-200 z-50 flex flex-col">
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
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
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
                : 'bg-white border border-slate-200 text-slate-700 rounded-bl-sm'
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
            <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1">
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        {/* Suggestion chips: shown only at start */}
        {showChips && !isTyping && (
          <div className="pt-2">
            <p className="text-[10px] text-slate-400 font-mono mb-2 ml-8">Suggested questions:</p>
            <div className="flex flex-wrap gap-2 ml-8">
              {SUGGESTION_CHIPS.map(chip => (
                <button
                  key={chip}
                  onClick={() => handleChip(chip)}
                  className="text-[11px] bg-white border border-sky-200 text-sky-700 px-3 py-1.5 rounded-full hover:bg-sky-50 hover:border-sky-400 transition-colors shadow-sm font-medium"
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
      <div className="p-3 bg-white border-t border-slate-200 flex gap-2 flex-shrink-0">
        <input 
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder="Ask about your solar system..."
          disabled={isTyping}
          className="flex-1 bg-slate-100 rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500 disabled:opacity-60"
        />
        <button
          onClick={handleSend}
          disabled={!inputText.trim() || isTyping}
          className="p-2.5 bg-sky-500 text-white rounded-full disabled:opacity-50 hover:bg-sky-600 transition-colors"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
};

const EnergyReportModal = ({ isOpen, onClose, savings, solarConsumed, gridImport, minuteData, systemStartDate, onExport, onFormalReport, carbonOffset }: {
  isOpen: boolean; onClose: () => void; savings: number; solarConsumed: number; gridImport: number;
  carbonOffset: number;
  minuteData: Array<{
    timestamp: string;
    date: string;
    year: number;
    month: number;
    week: number;
    day: number;
    hour: number;
    minute: number;
    solarKW: number;
    homeLoadKW: number;
    ev1LoadKW: number;
    ev2LoadKW: number;
    batteryPowerKW: number;
    batteryLevelPct: number;
    gridImportKW: number;
    gridExportKW: number;
    ev1SocPct: number;
    ev2SocPct: number;
    tariffRate: number;
    isPeakTime: boolean;
    savingsKES: number;
    solarEnergyKWh: number;
    gridImportKWh: number;
    gridExportKWh: number;
  }>;
  systemStartDate: string;
  onExport: () => void;
  onFormalReport: () => Promise<void>;
}) => {
  const [activeTab, setActiveTab] = useState('daily');
  const [isExporting, setIsExporting] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Calculate summary stats from minute data in a single pass (memoised to
  // avoid re-computing the potentially large dataset on every render).
  const reportStats = useMemo(() => {
    let solar = 0, gridImport = 0, gridExport = 0, savings = 0;
    const days = new Set<string>();
    const weeks = new Set<string>();
    const months = new Set<string>();
    const years = new Set<number>();
    for (const d of minuteData) {
      solar += d.solarEnergyKWh;
      gridImport += d.gridImportKWh;
      gridExport += d.gridExportKWh;
      savings += d.savingsKES;
      days.add(d.date);
      weeks.add(`${d.year}-W${d.week}`);
      months.add(`${d.year}-${d.month}`);
      years.add(d.year);
    }
    return {
      totalSolarGenerated: solar,
      totalGridImportKWh: gridImport,
      totalGridExportKWh: gridExport,
      totalSavings: savings,
      uniqueDays: days.size,
      uniqueWeeks: weeks.size,
      uniqueMonths: months.size,
      uniqueYears: years.size,
    };
  // minuteData.length is included because the array is mutated in place (push),
  // so the reference never changes; length is what actually triggers recomputation.
  }, [minuteData, minuteData.length]);

  if (!isOpen) return null;
  
  // Calculate tariff breakdown for display
  const highRateTotal = KPLC_TARIFF.getHighRateWithVAT();
  const lowRateTotal = KPLC_TARIFF.getLowRateWithVAT();

  const totalDataPoints = minuteData.length;
  const { totalSolarGenerated, totalGridImportKWh, totalGridExportKWh, totalSavings,
          uniqueDays, uniqueWeeks, uniqueMonths, uniqueYears } = reportStats;

  // Get date range
  const dateRange = totalDataPoints > 0 
    ? `${minuteData[0]?.date || 'N/A'} to ${minuteData[totalDataPoints - 1]?.date || 'N/A'}`
    : 'No data yet';

  return (
    <div className="absolute inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-slide-in-right">
        <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
          <div className="flex items-center gap-2">
            <FileSpreadsheet size={20} className="text-sky-400" />
            <h2 className="font-bold text-lg">Energy Report & Export</h2>
          </div>
          <button onClick={onClose} className="text-white hover:text-slate-300"><X size={20}/></button>
        </div>
        
        <div className="flex bg-slate-100 p-1 border-b border-slate-200">
          <button onClick={() => setActiveTab('daily')} className={`flex-1 py-2 text-xs font-bold uppercase ${activeTab === 'daily' ? 'bg-white shadow text-sky-600' : 'text-slate-500'}`}>Summary</button>
          <button onClick={() => setActiveTab('tariff')} className={`flex-1 py-2 text-xs font-bold uppercase ${activeTab === 'tariff' ? 'bg-white shadow text-sky-600' : 'text-slate-500'}`}>Tariff Rates</button>
          <button onClick={() => setActiveTab('sustainability')} className={`flex-1 py-2 text-xs font-bold uppercase ${activeTab === 'sustainability' ? 'bg-white shadow text-green-600' : 'text-slate-500'}`}>Sustainability</button>
          <button onClick={() => setActiveTab('export')} className={`flex-1 py-2 text-xs font-bold uppercase ${activeTab === 'export' ? 'bg-white shadow text-sky-600' : 'text-slate-500'}`}>Export Data</button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {activeTab === 'daily' && (
          <div className="space-y-4">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex items-center justify-between">
              <div className="text-xs text-slate-500">
                <span className="font-bold">System Start:</span> {systemStartDate} | 
                <span className="font-bold ml-2">Date Range:</span> {dateRange}
              </div>
              <div className="text-xs bg-sky-100 text-sky-700 px-2 py-1 rounded font-bold">
                {totalDataPoints.toLocaleString()} data points
              </div>
            </div>
            
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-green-50 p-4 rounded-xl border border-green-100 flex flex-col items-center">
                  <span className="text-xs font-bold text-green-600 uppercase">Total Savings</span>
                  <span className="text-2xl font-black text-green-900">KES {totalSavings.toFixed(0)}</span>
              </div>
              <div className="bg-sky-50 p-4 rounded-xl border border-sky-100 flex flex-col items-center">
                  <span className="text-xs font-bold text-sky-600 uppercase">Solar Generated</span>
                  <span className="text-2xl font-black text-sky-900">{totalSolarGenerated.toFixed(1)} kWh</span>
              </div>
              <div className="bg-red-50 p-4 rounded-xl border border-red-100 flex flex-col items-center">
                  <span className="text-xs font-bold text-red-600 uppercase">Grid Import</span>
                  <span className="text-2xl font-black text-red-900">{totalGridImportKWh.toFixed(1)} kWh</span>
              </div>
              <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 flex flex-col items-center">
                  <span className="text-xs font-bold text-purple-600 uppercase">Grid Export</span>
                  <span className="text-2xl font-black text-purple-900">{totalGridExportKWh.toFixed(1)} kWh</span>
              </div>
            </div>
            
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-white p-3 rounded-lg border border-slate-200 text-center">
                <div className="text-2xl font-black text-slate-800">{uniqueYears}</div>
                <div className="text-xs text-slate-500 font-bold uppercase">Years</div>
              </div>
              <div className="bg-white p-3 rounded-lg border border-slate-200 text-center">
                <div className="text-2xl font-black text-slate-800">{uniqueMonths}</div>
                <div className="text-xs text-slate-500 font-bold uppercase">Months</div>
              </div>
              <div className="bg-white p-3 rounded-lg border border-slate-200 text-center">
                <div className="text-2xl font-black text-slate-800">{uniqueWeeks}</div>
                <div className="text-xs text-slate-500 font-bold uppercase">Weeks</div>
              </div>
              <div className="bg-white p-3 rounded-lg border border-slate-200 text-center">
                <div className="text-2xl font-black text-slate-800">{uniqueDays}</div>
                <div className="text-xs text-slate-500 font-bold uppercase">Days</div>
              </div>
            </div>
          </div>
          )}
          
          {activeTab === 'tariff' && (
          <div className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                <DollarSign size={16} className="text-green-600" />
                Kenya Power Commercial Tariff (E-Mobility)
              </h3>
              <p className="text-xs text-slate-500 mb-4">Based on KPLC bill - February 2026 for ROAM ELECTRIC LIMITED</p>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-orange-600">PEAK HOURS</span>
                    <span className="text-[10px] bg-orange-200 text-orange-800 px-2 py-0.5 rounded">06:00-10:00 & 18:00-22:00</span>
                  </div>
                  <div className="text-2xl font-black text-orange-900">KES {highRateTotal.toFixed(2)}/kWh</div>
                  <div className="text-[10px] text-orange-600 mt-1">Base: KES {KPLC_TARIFF.HIGH_RATE_BASE.toFixed(2)} + charges</div>
                </div>
                
                <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-green-600">OFF-PEAK HOURS</span>
                    <span className="text-[10px] bg-green-200 text-green-800 px-2 py-0.5 rounded">All other times</span>
                  </div>
                  <div className="text-2xl font-black text-green-900">KES {lowRateTotal.toFixed(2)}/kWh</div>
                  <div className="text-[10px] text-green-600 mt-1">Base: KES {KPLC_TARIFF.LOW_RATE_BASE.toFixed(2)} + charges</div>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-slate-200">
                <h4 className="text-xs font-bold text-slate-600 mb-2">Additional Charges (per kWh)</h4>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="flex justify-between bg-slate-100 px-2 py-1 rounded">
                    <span className="text-slate-500">Fuel Cost</span>
                    <span className="font-bold text-slate-700">KES {KPLC_TARIFF.FUEL_ENERGY_COST.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between bg-slate-100 px-2 py-1 rounded">
                    <span className="text-slate-500">FERFA</span>
                    <span className="font-bold text-slate-700">KES {KPLC_TARIFF.FERFA.toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between bg-slate-100 px-2 py-1 rounded">
                    <span className="text-slate-500">INFA</span>
                    <span className="font-bold text-slate-700">KES {KPLC_TARIFF.INFA.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between bg-slate-100 px-2 py-1 rounded">
                    <span className="text-slate-500">ERC Levy</span>
                    <span className="font-bold text-slate-700">KES {KPLC_TARIFF.ERC_LEVY.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between bg-slate-100 px-2 py-1 rounded">
                    <span className="text-slate-500">WRA Levy</span>
                    <span className="font-bold text-slate-700">KES {KPLC_TARIFF.WRA_LEVY.toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between bg-slate-100 px-2 py-1 rounded">
                    <span className="text-slate-500">VAT</span>
                    <span className="font-bold text-slate-700">{(KPLC_TARIFF.VAT_RATE * 100).toFixed(0)}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          )}
          
          {activeTab === 'sustainability' && (
          <div className="space-y-4">
            <div className="bg-green-50 p-4 rounded-xl border border-green-200">
              <h3 className="font-bold text-green-800 mb-1 flex items-center gap-2">
                🌿 Carbon Impact
              </h3>
              <p className="text-xs text-green-600 mb-4">
                Estimated CO₂ avoided by using solar instead of the Kenya national grid
                (avg. emission factor: {GRID_EMISSION_FACTOR} kgCO₂/kWh, hydro+thermal mix).
              </p>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white p-4 rounded-xl border border-green-100 flex flex-col items-center">
                  <span className="text-2xl font-black text-green-700">{carbonOffset.toFixed(1)}</span>
                  <span className="text-xs font-bold text-green-600 uppercase mt-1">kg CO₂ Avoided</span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-green-100 flex flex-col items-center">
                  <span className="text-2xl font-black text-green-700">{(carbonOffset / TREE_CO2_KG_PER_YEAR).toFixed(2)}</span>
                  <span className="text-xs font-bold text-green-600 uppercase mt-1">Trees Equivalent</span>
                  <span className="text-[9px] text-slate-400 mt-0.5">({TREE_CO2_KG_PER_YEAR} kg CO₂/tree/yr)</span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-green-100 flex flex-col items-center">
                  <span className="text-2xl font-black text-green-700">{(carbonOffset / AVG_CAR_EMISSION_KG_PER_KM).toFixed(0)}</span>
                  <span className="text-xs font-bold text-green-600 uppercase mt-1">km Not Driven</span>
                  <span className="text-[9px] text-slate-400 mt-0.5">(avg {AVG_CAR_EMISSION_KG_PER_KM} kgCO₂/km)</span>
                </div>
              </div>
            </div>

            <div className="bg-sky-50 p-4 rounded-xl border border-sky-200">
              <h3 className="font-bold text-sky-800 mb-3">Self-Sufficiency Breakdown</h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-white p-3 rounded-lg border border-sky-100">
                  <div className="text-slate-500 mb-1">Total Solar Generated</div>
                  <div className="text-xl font-black text-sky-700">{totalSolarGenerated.toFixed(1)} kWh</div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-sky-100">
                  <div className="text-slate-500 mb-1">Grid Import</div>
                  <div className="text-xl font-black text-red-500">{totalGridImportKWh.toFixed(1)} kWh</div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-sky-100">
                  <div className="text-slate-500 mb-1">Grid Export (Surplus)</div>
                  <div className="text-xl font-black text-green-600">{totalGridExportKWh.toFixed(1)} kWh</div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-sky-100">
                  <div className="text-slate-500 mb-1">Solar Self-Consumption</div>
                  <div className="text-xl font-black text-sky-700">
                    {totalSolarGenerated > 0 ? (((totalSolarGenerated - totalGridExportKWh) / totalSolarGenerated) * 100).toFixed(1) : '0.0'}%
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs text-slate-500">
              <strong>Simulation Physics:</strong> Solar model uses Nairobi latitude (1.29°S) seasonal peak hour,
              panel temperature coefficient (−0.5%/°C above 25°C), soiling/dust accumulation (reset by rain),
              inverter efficiency curve (82-97%), and variable battery round-trip efficiency (85-95%).
            </div>
          </div>
          )}


          {activeTab === 'evs' && (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-sky-50 p-4 rounded-xl border border-sky-100">
              <h4 className="text-sm font-bold text-sky-800 mb-2">EV #1 (Commuter)</h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-slate-500">Battery</span><span className="font-bold">80 kWh</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Charger Rate</span><span className="font-bold">7 kW</span></div>
              </div>
            </div>
            <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
              <h4 className="text-sm font-bold text-purple-800 mb-2">EV #2 (Uber)</h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-slate-500">Battery</span><span className="font-bold">118 kWh</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Charger Rate</span><span className="font-bold">22 kW</span></div>
              </div>
            </div>
          </div>
          )}
          
          {activeTab === 'export' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-sky-50 to-green-50 p-6 rounded-xl border border-sky-200">
              <div className="flex items-center gap-3 mb-4">
                <Download size={24} className="text-sky-600" />
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">Export Full Report</h3>
                  <p className="text-xs text-slate-500">Download comprehensive energy data in Excel-compatible CSV format</p>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg border border-slate-200 mb-4">
                <h4 className="text-xs font-bold text-slate-600 mb-2 uppercase">Report Contents</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-2 text-slate-600">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    Minute-by-minute data ({totalDataPoints.toLocaleString()} records)
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <span className="w-2 h-2 bg-sky-500 rounded-full"></span>
                    Hourly summaries ({uniqueDays * 24}+ hours)
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                    Daily summaries ({uniqueDays} days)
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                    Weekly summaries ({uniqueWeeks} weeks)
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                    Monthly summaries ({uniqueMonths} months)
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
                    Yearly summaries ({uniqueYears} years)
                  </div>
                </div>
              </div>
              
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 mb-4 text-xs text-slate-600">
                <div className="font-bold mb-1">Data Includes:</div>
                <div className="grid grid-cols-3 gap-1">
                  <span>• Solar generation</span>
                  <span>• Home load</span>
                  <span>• EV charging</span>
                  <span>• Battery status</span>
                  <span>• Grid import/export</span>
                  <span>• Tariff rates</span>
                  <span>• Savings (KES)</span>
                  <span>• Peak/Off-peak</span>
                  <span>• Energy totals</span>
                </div>
              </div>
              
              <button
                onClick={async () => {
                  setIsExporting(true);
                  try {
                    await onExport();
                  } finally {
                    setIsExporting(false);
                  }
                }}
                disabled={isExporting || totalDataPoints === 0}
                className="w-full py-3 bg-gradient-to-r from-sky-600 to-green-600 text-white font-bold rounded-lg hover:from-sky-700 hover:to-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isExporting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Generating Report...
                  </>
                ) : (
                  <>
                    <Download size={18} />
                    Download Excel Report ({(totalDataPoints * 0.5 / 1024).toFixed(1)} KB)
                  </>
                )}
              </button>
              
              {totalDataPoints === 0 && (
                <p className="text-xs text-amber-600 mt-2 text-center">
                  Start the simulation to collect data for export
                </p>
              )}
            </div>
            
            {/* Formal PDF Report */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-xl border border-slate-700">
              <div className="flex items-center gap-3 mb-4">
                <FileText size={24} className="text-sky-400" />
                <div>
                  <h3 className="font-bold text-white text-lg">Generate PDF Report</h3>
                  <p className="text-xs text-slate-400">Professional investor-ready report with charts &amp; analysis</p>
                </div>
              </div>
              
              <div className="bg-slate-700/50 p-3 rounded-lg border border-slate-600 mb-4">
                <h4 className="text-xs font-bold text-slate-300 mb-2 uppercase">Report Includes</h4>
                <div className="grid grid-cols-2 gap-1.5 text-xs text-slate-400">
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-sky-400 rounded-full inline-block"></span> Executive Summary</span>
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-green-400 rounded-full inline-block"></span> KPI Dashboard</span>
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-yellow-400 rounded-full inline-block"></span> Solar Analytics &amp; Charts</span>
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-purple-400 rounded-full inline-block"></span> Battery Storage Analysis</span>
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-orange-400 rounded-full inline-block"></span> Financial ROI &amp; Payback</span>
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-teal-400 rounded-full inline-block"></span> EV Charging &amp; V2G Data</span>
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-red-400 rounded-full inline-block"></span> Grid Interaction Analysis</span>
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-emerald-400 rounded-full inline-block"></span> Carbon Offset &amp; Impact</span>
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-amber-400 rounded-full inline-block"></span> Recommendations</span>
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-indigo-400 rounded-full inline-block"></span> Full Appendix</span>
                </div>
              </div>
              
              <button
                onClick={async () => {
                  setIsGeneratingPDF(true);
                  try {
                    await onFormalReport();
                  } finally {
                    setIsGeneratingPDF(false);
                  }
                }}
                disabled={isGeneratingPDF || totalDataPoints === 0}
                className="w-full py-3 bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-bold rounded-lg hover:from-sky-600 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-sky-500/25"
              >
                {isGeneratingPDF ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Generating Report...
                  </>
                ) : (
                  <>
                    <FileText size={18} />
                    Open PDF Report (New Tab)
                  </>
                )}
              </button>
              {totalDataPoints === 0 ? (
                <p className="text-xs text-amber-400 mt-2 text-center">
                  Start the simulation to generate a report
                </p>
              ) : (
                <p className="text-xs text-slate-500 mt-2 text-center">
                  Opens in new tab: use browser Print (Ctrl+P) to save as PDF
                </p>
              )}
            </div>
            
            <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
              <h4 className="text-xs font-bold text-amber-800 mb-1">Data Retention</h4>
              <p className="text-xs text-amber-700">
                All data from system start (January 1, 2026) is retained. The system can track up to 20+ years 
                of simulation data. Use high speed simulation (x1000) to quickly generate multi-year datasets.
              </p>
            </div>
          </div>
          )}
        </div>
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

const Header = ({ onToggleAssistant, currentDate, onReset }: {
  onToggleAssistant: () => void; currentDate: Date; onReset: () => void;
}) => (
  <div className="w-full bg-white relative z-50 shadow-sm">
    <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
      <div className="flex items-center gap-3">
         <div className="flex items-center gap-2">
            <svg viewBox="0 0 100 100" className="w-8 h-8 fill-sky-500">
              <path d="M50 0 L90 40 L75 40 L50 15 L25 40 L10 40 Z" />
              <path d="M10 50 L35 75 L50 90 L65 75 L90 50 L75 50 L50 75 L25 50 Z" />
            </svg>
            <div className="flex flex-col">
               <h1 className="text-xl font-black tracking-wide text-sky-500 uppercase leading-none">SAFARI<span className="text-slate-800">CHARGE</span></h1>
               <span className="text-[10px] font-bold tracking-[0.2em] text-slate-400">LIMITED</span>
            </div>
         </div>
      </div>
      <div className="flex items-center gap-6">
         <button onClick={onReset} className="text-slate-400 hover:text-red-500 transition-colors" title="Reset Simulation"><RotateCcw size={16} /></button>
         <a
           href="https://v0-personal-projects-lac.vercel.app"
           target="_blank"
           rel="noopener noreferrer"
           className="hidden md:flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-sky-600 bg-slate-100 hover:bg-sky-50 border border-transparent hover:border-sky-200 px-3 py-1.5 rounded-full transition-colors"
         >
           <ExternalLink size={12} /> Portfolio
         </a>
         <div className="hidden md:flex items-center gap-2 text-slate-500 text-xs font-medium bg-slate-100 px-3 py-1 rounded-full">
            <Calendar size={14} className="text-slate-400" /> {formatDate(currentDate)}
         </div>
         <div className="hidden md:flex items-center gap-2 text-slate-500 text-xs font-medium bg-slate-100 px-3 py-1 rounded-full">
            <MapPin size={14} className="text-sky-500" /> Nairobi, KE
         </div>
         <button onClick={onToggleAssistant} className="bg-slate-900 text-white px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 hover:bg-slate-800 transition-colors shadow-lg border border-slate-700">
           <Sparkles size={14} className="text-green-400" /> SafariCharge AI
         </button>
      </div>
    </div>
    <div className="h-0.5 w-full bg-gradient-to-r from-sky-500 to-green-500 shadow-[0_0_15px_rgba(14,165,233,0.5)]"></div>
  </div>
);

const CentralDisplay = ({ data, timeOfDay, onTimeChange, isAutoMode, onToggleAuto, simSpeed, onSpeedChange, onOpenReport, priorityMode, onTogglePriority, weather, isNight, gridStatus, onToggleGrid, displayPriority, ev1Status, ev2Status }: {
  data: any; timeOfDay: number; onTimeChange: (t: number) => void; isAutoMode: boolean; onToggleAuto: () => void; simSpeed: number; onSpeedChange: (s: number) => void; onOpenReport: () => void; priorityMode: string; onTogglePriority: () => void; weather: string; isNight: boolean; gridStatus: string; onToggleGrid: () => void; displayPriority: string; ev1Status: string; ev2Status: string;
}) => {
  return (
    <div className="relative flex flex-col items-center justify-center w-full h-full p-6">
      <div className="text-center mb-6 w-full">
        <h2 className="text-2xl font-black text-slate-800 leading-tight">SIMULATION <span className="text-sky-500">CONTROLS</span></h2>
        
        <div className="mt-4 bg-white p-4 rounded-xl shadow-md border border-slate-200 w-full max-w-sm mx-auto relative overflow-hidden">
          <div className="absolute top-2 right-2 text-xs text-slate-400 font-bold flex items-center gap-1 bg-slate-50 px-2 py-1 rounded transition-colors duration-500">
             {isNight ? (<><Moon size={14} className="text-indigo-400" /> Night</>) : (<>{weather === 'Sunny' && <Sun size={14} className="text-orange-500" />}{weather}</>)}
          </div>

          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2">
               <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1"><Clock size={12}/> Time</span>
               {isAutoMode && <span className="text-[9px] bg-green-500 text-white px-1.5 rounded animate-pulse">LIVE</span>}
            </div>
            <span className="text-sm font-mono font-bold text-slate-800">{formatTime(timeOfDay)}</span>
          </div>
          
          <div className="flex items-center gap-3">
             <button onClick={onToggleAuto} className={`p-2 rounded-full transition-colors ${isAutoMode ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                {isAutoMode ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
             </button>
             <input type="range" min="0" max="24" step="0.08" value={timeOfDay} onChange={(e) => { onTimeChange(parseFloat(e.target.value)); if(isAutoMode) onToggleAuto(); }} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-500" />
          </div>

          <div className="flex justify-center gap-2 mt-3 pt-2 border-t border-slate-100 flex-wrap">
             {[1, 5, 20, 100, 1000].map(speed => (
               <button key={speed} onClick={() => onSpeedChange(speed)} className={`text-[9px] px-2 py-1 rounded font-bold transition-all ${simSpeed === speed ? 'bg-slate-800 text-white scale-110' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>x{speed}</button>
             ))}
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 w-full max-w-sm mx-auto">
           <div className="flex justify-center gap-2">
             <div className={`px-3 py-2 rounded-lg border text-[10px] font-bold flex items-center gap-1 w-32 justify-center transition-all ${ev1Status === 'Charging' ? 'bg-sky-50 border-sky-200 text-sky-700 ring-2 ring-sky-500' : ev1Status === 'Away' ? 'bg-slate-50 border-slate-200 text-red-400' : 'bg-green-50 border-green-200 text-green-700'}`}>
               EV #1: {ev1Status}
             </div>
             <div className={`px-3 py-2 rounded-lg border text-[10px] font-bold flex items-center gap-1 w-32 justify-center transition-all ${ev2Status === 'Charging' ? 'bg-sky-50 border-sky-200 text-sky-700 ring-2 ring-sky-500' : ev2Status === 'Away' ? 'bg-slate-50 border-slate-200 text-red-400' : 'bg-green-50 border-green-200 text-green-700'}`}>
               EV #2: {ev2Status}
             </div>
           </div>
           
           <div className="grid grid-cols-2 gap-2">
             <button onClick={onTogglePriority} className="bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg p-2 flex items-center justify-center text-xs gap-2 transition-colors">
               <span className={`font-bold ${displayPriority === 'load' ? 'text-sky-600' : 'text-green-600'}`}>{displayPriority === 'load' ? 'Load First' : 'Charge First'}</span>
               {priorityMode === 'auto' && <span className="text-[8px] bg-purple-100 text-purple-600 px-1 rounded font-bold">AUTO</span>}
             </button>
             <button onClick={onToggleGrid} className={`border rounded-lg p-2 flex items-center justify-center text-xs gap-2 ${gridStatus === 'Online' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700 animate-pulse'}`}>
               <Zap size={12} fill="currentColor" /> {gridStatus === 'Online' ? 'Grid OK' : 'Outage'}
             </button>
           </div>
        </div>
      </div>
      
      {/* Financial/Flow Widget */}
      <div className="bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-700 relative">
         <div className="p-6 relative z-10">
            {/* Current Tariff Rate Display */}
            <div className="mb-4 pb-3 border-b border-slate-700">
               <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                     <DollarSign size={14} className="text-yellow-400" />
                     <span className="text-[10px] uppercase tracking-wider text-slate-400">Current Tariff</span>
                  </div>
                  <div className="flex items-center gap-2">
                     <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${data.isPeakTime ? 'bg-orange-500/20 text-orange-400' : 'bg-green-500/20 text-green-400'}`}>
                       {data.isPeakTime ? 'PEAK' : 'OFF-PEAK'}
                     </span>
                     <span className="text-white font-bold text-sm">KES {data.currentTariffRate.toFixed(2)}/kWh</span>
                  </div>
               </div>
            </div>
            
            <div className="flex justify-between items-center mb-4">
               <div>
                  <div className="text-slate-400 text-[10px] uppercase tracking-wider">Today&apos;s Savings</div>
                  <div className="text-2xl font-light text-white flex items-center gap-1">
                    <span className="text-green-400 font-bold">KES {data.displaySavings.toFixed(0)}</span>
                  </div>
                  {data.carbonOffset > 0 && (
                    <div className="text-[9px] text-green-300 mt-0.5 flex items-center gap-1">
                      🌿 {data.carbonOffset.toFixed(2)} kg CO₂ avoided
                    </div>
                  )}
               </div>
               <button onClick={onOpenReport} className="text-[10px] bg-slate-700 hover:bg-slate-600 text-white px-2 py-1 rounded flex items-center gap-1 transition-colors">
                   <Table size={10} /> View Report
               </button>
            </div>
            
            <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700 space-y-2">
               <div className="flex justify-between items-center text-xs">
                 <span className="text-slate-300">1. {displayPriority === 'load' ? 'Loads' : 'Battery'}</span>
                 <span className="text-white font-bold">{displayPriority === 'load' ? `${Math.min(data.solarR, data.homeLoad + data.ev1Load + data.ev2Load).toFixed(1)} kW` : (data.batteryStatus === 'Charging' ? `${Math.abs(data.batteryPower).toFixed(1)} kW` : '0.0 kW')}</span>
               </div>
               <div className="flex justify-between items-center text-xs">
                 <span className="text-slate-300">2. {displayPriority === 'load' ? 'Battery' : 'Loads'}</span>
                 <span className="text-white font-bold">{displayPriority === 'load' ? (data.batteryStatus === 'Charging' ? `${Math.abs(data.batteryPower).toFixed(1)} kW` : '0.0 kW') : `${Math.min(data.solarR, data.homeLoad + data.ev1Load + data.ev2Load).toFixed(1)} kW`}</span>
               </div>
               <div className="flex justify-between items-center text-xs border-t border-slate-700 pt-1 mt-1">
                 <span className="text-slate-300">3. Grid Backup</span>
                 <span className={`${data.netGridPower < 0 ? 'text-red-400' : 'text-green-400'} font-bold`}>{data.netGridPower < 0 ? `${Math.abs(data.netGridPower).toFixed(1)} kW (In)` : `${Math.abs(data.netGridPower).toFixed(1)} kW (Out)`}</span>
               </div>
               {data.estimatedDemandChargeKES > 0 && (
               <div className="flex justify-between items-center text-xs border-t border-slate-600 pt-1 mt-1">
                 <span className="text-amber-400">⚡ Peak Demand</span>
                 <span className="text-amber-300 font-bold">{data.monthlyPeakDemandKW?.toFixed(1)} kW → KES {data.estimatedDemandChargeKES?.toFixed(0)}/mo</span>
               </div>
               )}
               {data.feedInEarnings > 0 && (
               <div className="flex justify-between items-center text-xs">
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
    <div className="flex flex-col items-center w-full h-full p-2 md:p-6 bg-slate-50/50 rounded-3xl border border-slate-200 shadow-inner overflow-x-auto">
      <div className="min-w-[620px] flex flex-col items-center w-full">
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
        <div className="flex gap-4 justify-between w-full max-w-[600px] mt-0">
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
  const [weather, setWeather] = useState('Sunny');
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
  const dayScenarioRef = useRef(PhysicsEngine.generateDayScenario('Sunny', new Date('2026-01-01'), 1.0));
  
  // Comprehensive data tracking for export - stores all minute-by-minute data
  const minuteDataRef = useRef<Array<{
    timestamp: string;
    date: string;
    year: number;
    month: number;
    week: number;
    day: number;
    hour: number;
    minute: number;
    solarKW: number;
    homeLoadKW: number;
    ev1LoadKW: number;
    ev2LoadKW: number;
    batteryPowerKW: number;
    batteryLevelPct: number;
    gridImportKW: number;
    gridExportKW: number;
    ev1SocPct: number;
    ev2SocPct: number;
    tariffRate: number;
    isPeakTime: boolean;
    savingsKES: number;
    solarEnergyKWh: number;
    homeLoadKWh: number;
    ev1LoadKWh: number;
    ev2LoadKWh: number;
    gridImportKWh: number;
    gridExportKWh: number;
  }>>([]);
  
  const systemStartDate = useRef('2026-01-01'); // System start date for tracking
  const lastProcessedTimeRef = useRef<number | null>(null);

  // Physics state refs: keep the authoritative simulation state outside React
  // so the interval can sub-step at fixed (24/420)-hour steps regardless of speed.
  // Starting at t=0 (midnight) ensures every simulated day is a full 24-hour
  // cycle → exactly 420 data points per day for all simulation speeds.
  const timeOfDayRef = useRef(0);
  const batKwhRef = useRef(BATTERY_CAPACITY * 0.5);
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
    dayScenarioRef.current = PhysicsEngine.generateDayScenario('Sunny', new Date('2026-01-01'), 1.0);
    timeOfDayRef.current = 0;
    batKwhRef.current = BATTERY_CAPACITY * 0.5;
    ev1SocRef.current = dayScenarioRef.current.ev1.startSoc;
    ev2SocRef.current = dayScenarioRef.current.ev2.startSoc;
  };

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
    setDailyGraphData([]);

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

    dayScenarioRef.current = PhysicsEngine.generateDayScenario(newWeather, nextDate, soilingFactorRef.current);
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
    let interval: NodeJS.Timeout;
    if (isAutoMode) {
      // Sub-step through a fixed physics step for all simulation speeds so
      // that the graph always accumulates exactly 420 data points per simulated
      // day regardless of speed:
      //   x1   →   1 step  of (24/420) h per tick
      //   x5   →   5 steps of (24/420) h per tick
      //   x20  →  20 steps of (24/420) h per tick
      //   x100 → 100 steps of (24/420) h per tick
      //   x1000→ 420 steps of (24/420) h per tick (full day)
      // This keeps graph resolution consistent (420 data points/day) for all
      // simulation types and is capped at 24 h to ensure at most one
      // day-boundary crossing per tick.
      const GRAPH_STEP_H = 24 / 420;
      interval = setInterval(() => {
        const { simSpeed: spd, priorityMode: curPriority, evSpecs: curEvSpecs } = computeParamsRef.current;
        const totalAdvance = Math.min(24.0, GRAPH_STEP_H * spd);
        const numSteps = Math.max(1, Math.ceil(totalAdvance / GRAPH_STEP_H));
        const actualStep = totalAdvance / numSteps;

        let lastState: ReturnType<typeof PhysicsEngine.calculateInstant> | null = null;
        let lastApplicableRate = KPLC_TARIFF.getLowRateWithVAT();
        const newGraphPoints: GraphDataPoint[] = [];

        for (let i = 0; i < numSteps; i++) {
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

          const state = PhysicsEngine.calculateInstant(
            timeOfDayRef.current,
            batKwhRef.current,
            ev1SocRef.current,
            ev2SocRef.current,
            dayScenarioRef.current,
            curEvSpecs,
            cloudNoiseRef.current,
            batteryHealthRef.current,
            actualStep
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

          if (state.batDischargeKw > 0) {
            const dischargedKwh = state.batDischargeKw * actualStep;
            accumulators.current.batDischargeKwh += dischargedKwh;
            cumulativeDischargeRef.current += dischargedKwh;
            batteryCyclesRef.current = cumulativeDischargeRef.current / Math.max(1, BATTERY_CAPACITY * batteryHealthRef.current);
            batteryHealthRef.current = Math.max(0.70, 1.0 - (batteryCyclesRef.current / 4000) * 0.30);
          }

          // Minute-data log: one entry per sub-step (covers actualStep simulated hours).
          const nowTs = new Date(computeParamsRef.current.currentDate);
          nowTs.setHours(currentHour, Math.floor((timeOfDayRef.current % 1) * 60), 0);
          const weekNum = getWeekNumber(nowTs);
          minuteDataRef.current.push({
            timestamp: nowTs.toISOString(),
            date: nowTs.toISOString().split('T')[0],
            year: nowTs.getFullYear(),
            month: nowTs.getMonth() + 1,
            week: weekNum,
            day: nowTs.getDate(),
            hour: currentHour,
            minute: Math.floor((timeOfDayRef.current % 1) * 60),
            solarKW: state.solar,
            homeLoadKW: state.houseLoad,
            ev1LoadKW: state.ev1Kw,
            ev2LoadKW: state.ev2Kw,
            batteryPowerKW: state.batPower,
            batteryLevelPct: (state.batKwh / BATTERY_CAPACITY) * 100,
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

          // Collect one graph data point per sub-step.
          newGraphPoints.push({
            timeOfDay: timeOfDayRef.current,
            solar: state.solar,
            load: state.load,
            batSoc: (state.batKwh / (BATTERY_CAPACITY * batteryHealthRef.current)) * 100,
          });

          lastState = state;
          lastApplicableRate = applicableRate;
        }

        if (lastState) {
          // Append graph points and refresh the graph once per interval tick.
          todayGraphDataRef.current.push(...newGraphPoints);
          setDailyGraphData([...todayGraphDataRef.current]);

          // Single React state update per tick for all display values.
          setTimeOfDay(timeOfDayRef.current);
          const finalState = lastState;
          const effectiveCapacity = BATTERY_CAPACITY * batteryHealthRef.current;
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
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isAutoMode, simSpeed]);

  // Use a ref to store computation parameters to avoid dependency issues
  const computeParamsRef = useRef({ simSpeed, priorityMode, isAutoMode, evSpecs, currentDate });
  useEffect(() => {
    computeParamsRef.current = { simSpeed, priorityMode, isAutoMode, evSpecs, currentDate };
  }, [simSpeed, priorityMode, isAutoMode, evSpecs, currentDate]);

  // Compute physics state whenever timeOfDay changes (manual mode only).
  // Auto mode is handled entirely by the interval above, which sub-steps at
  // a fixed 0.05-hour (3-minute) resolution for all simulation speeds.
  useEffect(() => {
    if (lastProcessedTimeRef.current === timeOfDay) return;
    lastProcessedTimeRef.current = timeOfDay;

    const { priorityMode: currentPriorityMode, isAutoMode: currentIsAutoMode, evSpecs: currentEvSpecs, currentDate: currentDateValue } = computeParamsRef.current;

    // Skip in auto mode: the interval loop handles all physics + graph data.
    if (currentIsAutoMode) return;

    // Advance Brownian cloud walk outside of setData (safe side-effect location)
    cloudNoiseRef.current += gaussianRandom(0, 0.05);
    cloudNoiseRef.current = Math.max(-1, Math.min(1, cloudNoiseRef.current * 0.97));

    // Use a fixed 15-minute step for manual time-slider exploration.
    const physicsTimeStep = 0.25;

    // Compute physics using ref-based state for continuity across manual scrubs.
    const state = PhysicsEngine.calculateInstant(
      timeOfDay,
      batKwhRef.current,
      ev1SocRef.current,
      ev2SocRef.current,
      dayScenarioRef.current,
      currentEvSpecs,
      cloudNoiseRef.current,
      batteryHealthRef.current,
      physicsTimeStep
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
         if (state.batKwh / BATTERY_CAPACITY * 100 < 40) effectivePriority = 'battery'; 
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
         batteryLevel: (state.batKwh / (BATTERY_CAPACITY * batteryHealthRef.current)) * 100,
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data._graphPoint]);

  const isNight = timeOfDay < 6 || timeOfDay > 19;
  
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
    try {
      const minuteData = minuteDataRef.current;
      if (!minuteData || minuteData.length === 0) {
        alert('No data available. Please run the simulation first by clicking the Play button.');
        return;
      }

      // Open the window synchronously (before any await) so popup blockers don't block it.
      const reportWindow = window.open('', '_blank');
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
      const peakSolar = minuteData.filter(d => d.isPeakTime).reduce((s, d) => s + (d.solarEnergyKWh ?? 0), 0);
      let peakGridImport = 0, peakInstantSolar = 0, peakEVLoad = 0;
      for (const d of minuteData) {
        const gi = d.gridImportKW ?? 0;
        if (gi > peakGridImport) peakGridImport = gi;
        const sk = d.solarKW ?? 0;
        if (sk > peakInstantSolar) peakInstantSolar = sk;
        const ev = (d.ev1LoadKW ?? 0) + (d.ev2LoadKW ?? 0);
        if (ev > peakEVLoad) peakEVLoad = ev;
      }
      const avgBattery = minuteData.reduce((s, d) => s + (d.batteryLevelPct ?? 0), 0) / minuteData.length;

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
      const dailyAgg = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));

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
          dailyAgg,
        }),
      });

      if (!response.ok) {
        reportWindow.close();
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const html = await response.text();
      // Write the HTML directly into the already-opened window to avoid blob: URL
      // navigation, which can be blocked by popup blockers and CSP policies.
      reportWindow.document.open();
      reportWindow.document.write(html);
      reportWindow.document.close();
    } catch (error) {
      console.error('Formal report error:', error);
      alert(`Failed to generate report: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-200 font-sans text-slate-900 flex flex-col relative">
      <Header onToggleAssistant={() => setIsAssistantOpen(!isAssistantOpen)} currentDate={currentDate} onReset={handleReset} />
      <SafariChargeAIAssistant isOpen={isAssistantOpen} onClose={() => setIsAssistantOpen(false)} data={data} timeOfDay={timeOfDay} weather={weather} currentDate={currentDate} isAutoMode={isAutoMode} />
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

      <main className="flex-1 flex flex-col items-center justify-start p-2 md:p-4 gap-4 overflow-y-auto">
        <div className="w-full max-w-7xl bg-slate-100 rounded-[30px] shadow-2xl border border-white relative flex flex-col lg:flex-row overflow-hidden">
          <div className="absolute inset-0 opacity-40 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>
          
          <div className="flex-1 p-4 flex items-center justify-center z-10 border-b lg:border-b-0 lg:border-r border-slate-200/60 bg-slate-50/50">
             <div className="absolute bg-sky-500/5 blur-3xl w-3/4 h-3/4 rounded-full -z-10"></div>
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
          </div>

          <div className="flex-[2] p-4 bg-gradient-to-br from-slate-50 to-slate-100 relative">
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
          </div>
        </div>

        {/* Daily Energy Graph: full width below main panel */}
        <div className="w-full max-w-7xl px-2 pb-2">
          <DailyEnergyGraph data={dailyGraphData} dateLabel={currentDate.toISOString().slice(0, 10)} />
        </div>

        {/* Past Days Graph Archive: horizontally scrollable legend */}
        {pastGraphs.length > 0 && (
          <div className="w-full max-w-7xl px-2 pb-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              {/* Header row */}
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-2">
                  <span>📅 Past Days: Energy Profiles</span>
                  <span className="text-[9px] font-normal text-slate-400 normal-case">
                    ({pastGraphs.length} day{pastGraphs.length !== 1 ? 's' : ''} archived; scroll to view)
                  </span>
                </h3>
                <PastDaysZipButton pastGraphs={pastGraphs} />
              </div>

              {/* Scrollable single-row legend */}
              <div
                className="flex gap-2 overflow-x-auto pb-2"
                style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 transparent' }}
              >
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
                      className="flex-shrink-0 flex flex-col gap-1 bg-slate-50 hover:bg-sky-50 border border-slate-200 hover:border-sky-300 rounded-lg px-3 py-2 transition-colors group w-36 text-left"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-700">{date}</span>
                        <Download size={11} className="text-slate-300 group-hover:text-sky-500 flex-shrink-0" />
                      </div>
                      <div className="text-[9px] text-slate-400 font-mono leading-tight">
                        ☀️ {peakSolar} kW
                      </div>
                      <div className="text-[9px] text-slate-400 font-mono leading-tight">
                        ⚡ {peakLoad} kW load
                      </div>
                      <div className="text-[9px] text-slate-400 font-mono leading-tight">
                        🔋 {avgBat}% avg
                      </div>
                      {/* Mini solar sparkline */}
                      <MiniSparkline data={pastData} />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
        {/* Portfolio Projects: linked from the personal portfolio */}
        <PortfolioProjects />
      </main>
      
      <div className="fixed bottom-2 right-4 text-[9px] text-slate-400 font-mono">
        SafariCharge Ltd • Simulation Mode: {isAutoMode ? `Auto (x${simSpeed})` : 'Manual'}
      </div>
    </div>
  );
}
