/**
 * Location Selector and Recommendation Engine UI Components
 * for SafariCharge Dashboard
 */
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  MapPin, Target, TrendingUp, DollarSign, Battery, Sun, Zap, Leaf,
  AlertCircle, CheckCircle2, Loader2, ChevronDown, ChevronUp, Info, Search, X
} from 'lucide-react';
import {
  KENYA_LOCATIONS,
  type LocationCoordinates,
  type SolarIrradianceData,
  fetchSolarData,
  getSolarDataForLocation
} from '@/lib/nasa-power-api';
import { AFRICA_CITIES, type AfricaCity } from '@/lib/africa-locations-data';
import type { HardwareRecommendation, LoadProfile } from '@/lib/recommendation-engine';
import { generateRecommendation, createLoadProfileFromSimulation } from '@/lib/recommendation-engine';
import type { SimulationMinuteRecord } from '@/types/simulation-core';

interface LocationSelectorProps {
  onLocationSelected: (location: LocationCoordinates, solarData: SolarIrradianceData, fetchedAt: number, fromCache: boolean) => void;
  currentLocation: LocationCoordinates;
  onLoadingChange?: (loading: boolean) => void;
  cacheRef?: React.MutableRefObject<Record<string, { data: SolarIrradianceData; fetchedAt: number }>>;
  onInvalidateCache?: () => void;
  label?: string;
  embedded?: boolean;
}

export const LocationSelector: React.FC<LocationSelectorProps> = ({
  onLocationSelected, currentLocation, onLoadingChange, cacheRef, onInvalidateCache, label, embedded = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [customCoords, setCustomCoords] = useState({ lat: '', lon: '' });
  const [error, setError] = useState<string | null>(null);
  const [dataSourceLabel, setDataSourceLabel] = useState<string>('');
  const [search, setSearch] = useState('');
  const [popupStyle, setPopupStyle] = useState<React.CSSProperties>({});
  const fallbackCacheRef = useRef<Record<string, { data: SolarIrradianceData; fetchedAt: number }>>({});
  const localCacheRef = cacheRef ?? fallbackCacheRef;
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Group Africa cities by country, filtered by search query
  const filteredCities = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    const cities = q
      ? AFRICA_CITIES.filter(c => c.name.toLowerCase().includes(q) || c.country.toLowerCase().includes(q))
      : AFRICA_CITIES;
    // Group by country
    const byCountry: Record<string, AfricaCity[]> = {};
    for (const city of cities) {
      if (!byCountry[city.country]) byCountry[city.country] = [];
      byCountry[city.country].push(city);
    }
    return byCountry;
  }, [search]);

  const openPopup = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const popupWidth = Math.min(360, window.innerWidth - 24);
      let left = rect.right - popupWidth;
      if (left < 12) left = 12;
      setPopupStyle({ position: 'fixed', top: rect.bottom + 8, left, width: popupWidth, zIndex: 9999 });
    }
    setIsOpen(v => !v);
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (buttonRef.current && !buttonRef.current.contains(target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  const handleLocationSelect = async (location: LocationCoordinates) => {
    setIsLoading(true); setError(null); setDataSourceLabel(''); onLoadingChange?.(true);
    try {
      const cacheKey = location.name;
      const cached = localCacheRef.current[cacheKey];
      if (cached) {
        setDataSourceLabel('Data from cache: NASA POWER');
        onLocationSelected(location, cached.data, cached.fetchedAt, true);
        setIsOpen(false);
        return;
      }
      const { fetchSolarData } = await import('@/lib/nasa-power-api');
      const data = await fetchSolarData(location.latitude, location.longitude, location.name);
      const fetchedAt = Date.now();
      localCacheRef.current[cacheKey] = { data, fetchedAt };
      setDataSourceLabel('Data from: NASA POWER');
      onLocationSelected(location, data, fetchedAt, false);
      setIsOpen(false);
    } catch (err) {
      setError('Failed to fetch solar data. Please try again.');
    } finally {
      setIsLoading(false); onLoadingChange?.(false);
    }
  };

  const handleAfricaSelect = (city: AfricaCity) => {
    const loc: LocationCoordinates = { latitude: city.lat, longitude: city.lon, name: `${city.name}, ${city.country}` };
    handleLocationSelect(loc);
  };

  const handleCustomLocation = async () => {
    const lat = parseFloat(customCoords.lat);
    const lon = parseFloat(customCoords.lon);
    if (isNaN(lat) || isNaN(lon) || lat < -38 || lat > 40 || lon < -20 || lon > 55) {
      setError('Please enter valid Africa coordinates (Lat: -38 to 40, Lon: -20 to 55)');
      return;
    }
    const location: LocationCoordinates = { latitude: lat, longitude: lon, name: `Custom (${lat.toFixed(2)}°, ${lon.toFixed(2)}°)` };
    await handleLocationSelect(location);
  };

  if (embedded) {
    return (
      <div>
        <div className="max-h-96 overflow-y-auto">
          <div className="p-2">
            <p className="text-xs font-bold text-slate-500 uppercase px-2 py-1">Kenya Cities</p>
            {KENYA_LOCATIONS.map((location) => (
              <button key={location.name} onClick={() => handleLocationSelect(location)} disabled={isLoading}
                className={`w-full text-left px-3 py-2 text-sm rounded hover:bg-slate-100 transition-colors ${currentLocation.name === location.name ? 'bg-sky-50 text-sky-600 font-medium' : 'text-slate-700'} ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <div className="flex items-center justify-between">
                  <span>{location.name}</span>
                  {currentLocation.name === location.name && <CheckCircle2 size={14} className="text-sky-600" />}
                </div>
                <span className="text-xs text-slate-400">{location.latitude.toFixed(2)}°, {location.longitude.toFixed(2)}°</span>
              </button>
            ))}
          </div>
        </div>
        {error && <div className="p-2 mt-2 bg-red-50 border border-red-200 rounded"><p className="text-xs text-red-600 flex items-center gap-1"><AlertCircle size={12} />{error}</p></div>}
      </div>
    );
  }

  const popup = isOpen ? (
    <div
      style={popupStyle}
      className="bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden"
    >
      {/* Header */}
      <div className="p-3 bg-slate-900 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold">
            <MapPin size={15} className="text-sky-400" />
            Select Location
          </div>
          <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white transition-colors">
            <X size={14} />
          </button>
        </div>
        <p className="text-xs text-slate-400 mt-1">Affects solar irradiance calculations</p>
        {/* Search box */}
        <div className="relative mt-2">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            autoFocus
            type="text"
            placeholder="Search city or country…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 outline-none focus:border-sky-500"
          />
        </div>
      </div>

      {/* City list grouped by country */}
      <div className="overflow-y-auto" style={{ maxHeight: 320 }}>
        {Object.keys(filteredCities).length === 0 ? (
          <p className="p-4 text-xs text-slate-400 text-center">No cities found for "{search}"</p>
        ) : (
          Object.entries(filteredCities).map(([country, cities]) => (
            <div key={country}>
              <p className="sticky top-0 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50 border-b border-slate-100">
                {country}
              </p>
              {cities.map(city => {
                const locName = `${city.name}, ${city.country}`;
                const isActive = currentLocation.name === locName;
                return (
                  <button
                    key={city.name}
                    onClick={() => handleAfricaSelect(city)}
                    disabled={isLoading}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center justify-between gap-2 ${isActive ? 'bg-sky-50 text-sky-700' : 'text-slate-700 hover:bg-slate-50'} ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <span>
                      <span className="font-medium">{city.name}</span>
                      <span className="ml-2 text-xs text-slate-400">{city.avgDailyPsh} PSH · {city.avgTempC}°C</span>
                    </span>
                    {isActive && <CheckCircle2 size={13} className="text-sky-600 shrink-0" />}
                  </button>
                );
              })}
            </div>
          ))
        )}

        {/* Custom coords */}
        <div className="p-3 border-t border-slate-200 bg-slate-50">
          <p className="text-xs font-bold text-slate-500 uppercase mb-2">Custom Coordinates (Africa)</p>
          <div className="flex gap-2 mb-2">
            <input type="number" placeholder="Latitude" value={customCoords.lat} onChange={(e) => setCustomCoords({ ...customCoords, lat: e.target.value })} className="flex-1 px-2 py-1 text-xs border border-slate-300 rounded" step="0.01" />
            <input type="number" placeholder="Longitude" value={customCoords.lon} onChange={(e) => setCustomCoords({ ...customCoords, lon: e.target.value })} className="flex-1 px-2 py-1 text-xs border border-slate-300 rounded" step="0.01" />
          </div>
          <button onClick={handleCustomLocation} disabled={isLoading} className="w-full bg-sky-600 text-white text-xs font-bold py-2 rounded hover:bg-sky-700 transition-colors disabled:opacity-50">
            {isLoading ? <span className="flex items-center justify-center gap-2"><Loader2 size={12} className="animate-spin" />Loading…</span> : 'Apply Custom Location'}
          </button>
        </div>

        <div className="p-3 border-t border-slate-200 bg-white">
          <button onClick={() => { if (onInvalidateCache) onInvalidateCache(); if (!cacheRef) localCacheRef.current = {}; setDataSourceLabel(''); }} className="w-full text-xs font-bold text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 rounded-lg py-2 transition-colors">
            Invalidate Cache
          </button>
        </div>
      </div>

      {error && <div className="p-2 bg-red-50 border-t border-red-200"><p className="text-xs text-red-600 flex items-center gap-1"><AlertCircle size={12} />{error}</p></div>}
    </div>
  ) : null;

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={openPopup}
        className="flex items-center gap-2 text-slate-500 text-xs font-medium bg-slate-100 px-3 py-1 rounded-full hover:bg-slate-200 transition-colors"
        title={dataSourceLabel || 'Click to select location'}
      >
        <MapPin size={14} className="text-sky-500" />
        {label ? `${label}: ${currentLocation.name}` : currentLocation.name}
        {isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>
      {typeof document !== 'undefined' && popup ? createPortal(popup, document.body) : null}
    </div>
  );
};

interface RecommendationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  simulationData: Array<{ homeLoadKWh: number; ev1LoadKWh: number; ev2LoadKWh: number; isPeakTime: boolean; hour: number; }>;
  solarData: SolarIrradianceData;
  currentLocation: LocationCoordinates;
  recommendation: HardwareRecommendation | null;
  onGenerate: () => void;
  isGenerating: boolean;
  isSolarLoading: boolean;
  lastUpdated: number | null;
  fromCache: boolean;
}

export const RecommendationPanel: React.FC<RecommendationPanelProps> = ({
  isOpen, onClose, simulationData, solarData, currentLocation, recommendation,
  onGenerate, isGenerating, isSolarLoading, lastUpdated, fromCache
}) => {
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<{[key: string]: boolean}>({ solar: true, battery: true, inverter: true, financial: true });

  useEffect(() => {
    if (!isOpen) return;
    const t = setTimeout(() => setError(null), 0);
    return () => clearTimeout(t);
  }, [isOpen, solarData, simulationData]);

  if (!isOpen) return null;

  const toggleSection = (section: string) => setExpanded(prev => ({ ...prev, [section]: !prev[section] }));
  const activeSourceLabel = 'NASA POWER';
  const canGenerate = !isGenerating && !isSolarLoading && !!solarData && simulationData.length > 0;
  const updatedLabel = lastUpdated ? new Date(lastUpdated).toLocaleString() : 'Not yet loaded';
  const cacheBadge = fromCache ? 'Cached' : 'Fresh';

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="p-4 bg-gradient-to-r from-sky-600 to-sky-700 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Target size={24} className="text-sky-200" />
            <div>
              <h2 className="font-bold text-lg">Hardware Recommendation</h2>
              <p className="text-xs text-sky-200 mt-0.5">Optimized for {currentLocation.name} • {solarData.annualAverage.toFixed(1)} kWh/m²/day avg</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 rounded-full text-[10px] font-semibold bg-sky-100 text-sky-700">Source: {activeSourceLabel}</span>
            <span className={`px-2 py-1 rounded-full text-[10px] font-semibold ${fromCache ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>{cacheBadge}</span>
            <button onClick={() => { if (simulationData.length === 0) { setError('Run the simulation first.'); return; } setError(null); onGenerate(); }}
              disabled={!canGenerate} className="px-3 py-1.5 bg-white/10 border border-white/30 rounded-full text-xs font-bold hover:bg-white/15 transition-colors disabled:opacity-70 flex items-center gap-2">
              {(isGenerating || isSolarLoading) && <Loader2 size={14} className="animate-spin" />}
              {isGenerating ? 'Computing…' : isSolarLoading ? 'Loading data…' : 'Generate'}
            </button>
            <button onClick={onClose} className="text-white hover:text-sky-200 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {isGenerating ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center"><Loader2 size={48} className="animate-spin text-sky-600 mx-auto mb-4" /><p className="text-slate-600">Analyzing your energy profile...</p></div>
            </div>
          ) : recommendation ? (
            <div className="space-y-4">
              <div className={`p-4 rounded-lg border-2 ${recommendation.confidence === 'high' ? 'bg-green-50 border-green-200' : recommendation.confidence === 'medium' ? 'bg-yellow-50 border-yellow-200' : 'bg-orange-50 border-orange-200'}`}>
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-full ${recommendation.confidence === 'high' ? 'bg-green-100' : recommendation.confidence === 'medium' ? 'bg-yellow-100' : 'bg-orange-100'}`}>
                    {recommendation.confidence === 'high' ? <CheckCircle2 size={20} className="text-green-600" /> : <Info size={20} className={recommendation.confidence === 'medium' ? 'text-yellow-600' : 'text-orange-600'} />}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-slate-900 mb-1">Recommended System</h3>
                    <p className="text-sm text-slate-700 leading-relaxed text-justify [text-align-last:left]">{recommendation.summary}</p>
                    <div className="mt-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${recommendation.confidence === 'high' ? 'bg-green-200 text-green-800' : recommendation.confidence === 'medium' ? 'bg-yellow-200 text-yellow-800' : 'bg-orange-200 text-orange-800'}`}>
                        {recommendation.confidence.toUpperCase()} CONFIDENCE
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <button onClick={() => toggleSection('solar')} className="w-full p-4 bg-gradient-to-r from-yellow-50 to-orange-50 flex items-center justify-between hover:from-yellow-100 hover:to-orange-100 transition-colors">
                  <div className="flex items-center gap-3"><Sun size={24} className="text-orange-500" />
                    <div className="text-left"><h3 className="font-bold text-slate-900">Solar Panel System</h3><p className="text-sm text-slate-600">{recommendation.solarPanels.totalCapacityKw} kW • {recommendation.solarPanels.numberOfPanels} panels</p></div>
                  </div>
                  {expanded.solar ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
                {expanded.solar && (
                  <div className="p-4 bg-white">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div><p className="text-xs text-slate-500 mb-1">Total Capacity</p><p className="text-lg font-bold text-slate-900">{recommendation.solarPanels.totalCapacityKw} kW</p></div>
                      <div><p className="text-xs text-slate-500 mb-1">Panels</p><p className="text-lg font-bold text-slate-900">{recommendation.solarPanels.numberOfPanels} × {recommendation.solarPanels.panelWattage}W</p></div>
                      <div><p className="text-xs text-slate-500 mb-1">Estimated Cost</p><p className="text-lg font-bold text-slate-900">KES {recommendation.solarPanels.estimatedCostKES.toLocaleString()}</p></div>
                      <div><p className="text-xs text-slate-500 mb-1">Monthly Savings</p><p className="text-lg font-bold text-green-600">KES {recommendation.solarPanels.monthlySavingsKES.toLocaleString()}</p></div>
                    </div>
                  </div>
                )}
              </div>

              {recommendation.notes.length > 0 && (
                <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                  <h3 className="font-bold text-slate-900 mb-2 flex items-center gap-2"><Info size={16} className="text-blue-600" />Recommendations & Notes</h3>
                  <ul className="space-y-2">
                    {recommendation.notes.map((note, idx) => (
                      <li key={idx} className="text-sm text-slate-700 flex items-start gap-2"><span className="text-blue-600 mt-0.5">•</span><span className="text-justify [text-align-last:left]">{note}</span></li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500 space-y-3">
              <AlertCircle size={48} className="mx-auto mb-4 text-slate-400" />
              <p className="text-sm text-slate-700">Select a location and click "Generate" to create a recommendation using {activeSourceLabel} data for {currentLocation.name}.</p>
              {error && <p className="text-xs text-red-600">{error}</p>}
              <div className="flex justify-center">
                <button onClick={() => { setError(null); onGenerate(); }} disabled={!canGenerate} className="px-4 py-2 bg-sky-600 text-white text-xs font-bold rounded-full hover:bg-sky-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
                  {fromCache ? 'Generate (cached data)' : 'Generate Recommendations'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const DEFAULT_LOAD_PROFILE: LoadProfile = {
  dailyConsumption: 80,
  peakPower: 15,
  avgDayPower: 5,
  avgNightPower: 2,
  peakHoursLoadPct: 60,
};

export function RecommendationComponents({
  solarData,
  minuteData = [],
}: {
  solarData: SolarIrradianceData;
  minuteData?: SimulationMinuteRecord[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<LocationCoordinates>(KENYA_LOCATIONS[0]);
  const [currentSolarData, setCurrentSolarData] = useState<SolarIrradianceData>(solarData);
  const [recommendation, setRecommendation] = useState<HardwareRecommendation | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSolarLoading, setIsSolarLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [fromCache, setFromCache] = useState(false);

  const handleGenerate = () => {
    setIsGenerating(true);
    try {
      const loadProfile = minuteData.length > 0 ? createLoadProfileFromSimulation(minuteData) : DEFAULT_LOAD_PROFILE;
      const rec = generateRecommendation(loadProfile, currentSolarData, { batteryPreference: 'auto', gridBackupRequired: true, autonomyDays: 1.5 });
      setRecommendation(rec);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      {minuteData.length === 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-200">
          <Info size={16} className="mt-0.5 flex-shrink-0" />
          <span><strong>Tip:</strong> Run the simulation first for more accurate, data-driven recommendations.</span>
        </div>
      )}
      <button onClick={() => setIsOpen(true)} className="flex items-center gap-2 px-6 py-3 bg-sky-600 text-white font-semibold rounded-xl shadow hover:bg-sky-700 transition-colors">
        <Target size={20} />Open Recommendation Engine
      </button>
      <RecommendationPanel isOpen={isOpen} onClose={() => setIsOpen(false)} simulationData={minuteData}
        solarData={currentSolarData} currentLocation={currentLocation} recommendation={recommendation}
        onGenerate={handleGenerate} isGenerating={isGenerating} isSolarLoading={isSolarLoading}
        lastUpdated={lastUpdated} fromCache={fromCache} />
    </>
  );
}
