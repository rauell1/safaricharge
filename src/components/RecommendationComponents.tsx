/**
 * Location Selector and Recommendation Engine UI Components
 * for SafariCharge Dashboard
 */
'use client';

import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Target,
  TrendingUp,
  DollarSign,
  Battery,
  Sun,
  Zap,
  Leaf,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ChevronDown,
  ChevronUp,
  Info
} from 'lucide-react';
import {
  KENYA_LOCATIONS,
  type LocationCoordinates,
  type SolarIrradianceData,
  fetchSolarData,
  getSolarDataForLocation
} from '@/lib/nasa-power-api';
import { fetchSolarDataWithFallback } from '@/lib/meteonorm-api';
import {
  generateRecommendation,
  createLoadProfileFromSimulation,
  type HardwareRecommendation,
  type LoadProfile
} from '@/lib/recommendation-engine';

interface LocationSelectorProps {
  onLocationSelected: (location: LocationCoordinates, solarData: SolarIrradianceData) => void;
  currentLocation: LocationCoordinates;
}

export const LocationSelector: React.FC<LocationSelectorProps> = ({
  onLocationSelected,
  currentLocation
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [customCoords, setCustomCoords] = useState({ lat: '', lon: '' });
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<string>('');

  const handleLocationSelect = async (location: LocationCoordinates) => {
    setIsLoading(true);
    setError(null);
    setDataSource('');
    try {
      // Use new multi-API approach with automatic fallback
      const result = await fetchSolarDataWithFallback(location.latitude, location.longitude, location.name);
      setDataSource(`Data from: ${result.source === 'nasa' ? 'NASA POWER' : result.source === 'meteonorm' ? 'Open-Meteo' : 'Fallback'}`);
      onLocationSelected(location, result.data);
      setIsOpen(false);
    } catch (err) {
      setError('Failed to fetch solar data from all sources. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCustomLocation = async () => {
    const lat = parseFloat(customCoords.lat);
    const lon = parseFloat(customCoords.lon);

    if (isNaN(lat) || isNaN(lon) || lat < -5 || lat > 5 || lon < 33 || lon > 42) {
      setError('Please enter valid Kenya coordinates (Lat: -5 to 5, Lon: 33 to 42)');
      return;
    }

    const location: LocationCoordinates = {
      latitude: lat,
      longitude: lon,
      name: `Custom (${lat.toFixed(2)}°, ${lon.toFixed(2)}°)`
    };

    await handleLocationSelect(location);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-slate-500 text-xs font-medium bg-slate-100 px-3 py-1 rounded-full hover:bg-slate-200 transition-colors"
        title={dataSource || 'Click to select location'}
      >
        <MapPin size={14} className="text-sky-500" />
        {currentLocation.name}
        {isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>
      {dataSource && (
        <div className="absolute top-full right-0 mt-1 text-[10px] text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200 whitespace-nowrap">
          {dataSource}
        </div>
      )}

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-slate-200 z-50 overflow-hidden">
          <div className="p-3 bg-slate-900 text-white text-sm font-bold">
            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-sky-400" />
              Select Location
            </div>
            <p className="text-xs text-slate-400 mt-1 font-normal">
              Location affects solar irradiance calculations
            </p>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {/* Predefined locations */}
            <div className="p-2">
              <p className="text-xs font-bold text-slate-500 uppercase px-2 py-1">Kenya Cities</p>
              {KENYA_LOCATIONS.map((location) => (
                <button
                  key={location.name}
                  onClick={() => handleLocationSelect(location)}
                  disabled={isLoading}
                  className={`w-full text-left px-3 py-2 text-sm rounded hover:bg-slate-100 transition-colors ${
                    currentLocation.name === location.name ? 'bg-sky-50 text-sky-600 font-medium' : 'text-slate-700'
                  } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <span>{location.name}</span>
                    {currentLocation.name === location.name && (
                      <CheckCircle2 size={14} className="text-sky-600" />
                    )}
                  </div>
                  <span className="text-xs text-slate-400">
                    {location.latitude.toFixed(2)}°, {location.longitude.toFixed(2)}°
                  </span>
                </button>
              ))}
            </div>

            {/* Custom coordinates */}
            <div className="p-3 border-t border-slate-200 bg-slate-50">
              <p className="text-xs font-bold text-slate-500 uppercase mb-2">Custom Coordinates</p>
              <div className="flex gap-2 mb-2">
                <input
                  type="number"
                  placeholder="Latitude"
                  value={customCoords.lat}
                  onChange={(e) => setCustomCoords({ ...customCoords, lat: e.target.value })}
                  className="flex-1 px-2 py-1 text-sm border border-slate-300 rounded"
                  step="0.01"
                />
                <input
                  type="number"
                  placeholder="Longitude"
                  value={customCoords.lon}
                  onChange={(e) => setCustomCoords({ ...customCoords, lon: e.target.value })}
                  className="flex-1 px-2 py-1 text-sm border border-slate-300 rounded"
                  step="0.01"
                />
              </div>
              <button
                onClick={handleCustomLocation}
                disabled={isLoading}
                className="w-full bg-sky-600 text-white text-xs font-bold py-2 rounded hover:bg-sky-700 transition-colors disabled:opacity-50"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 size={12} className="animate-spin" />
                    Loading...
                  </span>
                ) : (
                  'Apply Custom Location'
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-2 bg-red-50 border-t border-red-200">
              <p className="text-xs text-red-600 flex items-center gap-1">
                <AlertCircle size={12} />
                {error}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface RecommendationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  simulationData: Array<{
    homeLoadKWh: number;
    ev1LoadKWh: number;
    ev2LoadKWh: number;
    isPeakTime: boolean;
    hour: number;
  }>;
  solarData: SolarIrradianceData;
  currentLocation: LocationCoordinates;
}

export const RecommendationPanel: React.FC<RecommendationPanelProps> = ({
  isOpen,
  onClose,
  simulationData,
  solarData,
  currentLocation
}) => {
  const [recommendation, setRecommendation] = useState<HardwareRecommendation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<{[key: string]: boolean}>({
    solar: true,
    battery: true,
    inverter: true,
    financial: true
  });

  useEffect(() => {
    if (isOpen) {
      setRecommendation(null);
      setError(null);
    }
  }, [isOpen, solarData, simulationData]);

  const generateRecommendations = () => {
    if (simulationData.length === 0) {
      setError('Run the simulation first to generate recommendations.');
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      const loadProfile = createLoadProfileFromSimulation(simulationData);
      const rec = generateRecommendation(loadProfile, solarData, {
        batteryPreference: 'auto',
        gridBackupRequired: true,
        autonomyDays: 1.5
      });
      setRecommendation(rec);
    } catch (error) {
      console.error('Failed to generate recommendations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const toggleSection = (section: string) => {
    setExpanded(prev => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-sky-600 to-sky-700 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Target size={24} className="text-sky-200" />
            <div>
              <h2 className="font-bold text-lg">Hardware Recommendation</h2>
              <p className="text-xs text-sky-200 mt-0.5">
                Optimized for {currentLocation.name} • {solarData.annualAverage.toFixed(1)} kWh/m²/day avg
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={generateRecommendations}
              disabled={isLoading}
              className="px-3 py-1.5 bg-white/10 border border-white/30 rounded-full text-xs font-bold hover:bg-white/15 transition-colors disabled:opacity-70 flex items-center gap-2"
            >
              {isLoading && <Loader2 size={14} className="animate-spin" />}
              {isLoading ? 'Computing…' : 'Generate'}
            </button>
            <button onClick={onClose} className="text-white hover:text-sky-200 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Loader2 size={48} className="animate-spin text-sky-600 mx-auto mb-4" />
                <p className="text-slate-600">Analyzing your energy profile...</p>
              </div>
            </div>
          ) : recommendation ? (
            <div className="space-y-4">
              {/* Summary Card */}
              <div className={`p-4 rounded-lg border-2 ${
                recommendation.confidence === 'high' ? 'bg-green-50 border-green-200' :
                recommendation.confidence === 'medium' ? 'bg-yellow-50 border-yellow-200' :
                'bg-orange-50 border-orange-200'
              }`}>
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-full ${
                    recommendation.confidence === 'high' ? 'bg-green-100' :
                    recommendation.confidence === 'medium' ? 'bg-yellow-100' :
                    'bg-orange-100'
                  }`}>
                    {recommendation.confidence === 'high' ? (
                      <CheckCircle2 size={20} className="text-green-600" />
                    ) : (
                      <Info size={20} className={recommendation.confidence === 'medium' ? 'text-yellow-600' : 'text-orange-600'} />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-slate-900 mb-1">Recommended System</h3>
                    <p className="text-sm text-slate-700 leading-relaxed">{recommendation.summary}</p>
                    <div className="mt-2 flex items-center gap-2 text-xs">
                      <span className={`px-2 py-0.5 rounded-full font-bold ${
                        recommendation.confidence === 'high' ? 'bg-green-200 text-green-800' :
                        recommendation.confidence === 'medium' ? 'bg-yellow-200 text-yellow-800' :
                        'bg-orange-200 text-orange-800'
                      }`}>
                        {recommendation.confidence.toUpperCase()} CONFIDENCE
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Solar Panels Section */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleSection('solar')}
                  className="w-full p-4 bg-gradient-to-r from-yellow-50 to-orange-50 flex items-center justify-between hover:from-yellow-100 hover:to-orange-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Sun size={24} className="text-orange-500" />
                    <div className="text-left">
                      <h3 className="font-bold text-slate-900">Solar Panel System</h3>
                      <p className="text-sm text-slate-600">
                        {recommendation.solarPanels.totalCapacityKw} kW • {recommendation.solarPanels.numberOfPanels} panels
                      </p>
                    </div>
                  </div>
                  {expanded.solar ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
                {expanded.solar && (
                  <div className="p-4 bg-white space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Total Capacity</p>
                        <p className="text-lg font-bold text-slate-900">{recommendation.solarPanels.totalCapacityKw} kW</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Number of Panels</p>
                        <p className="text-lg font-bold text-slate-900">{recommendation.solarPanels.numberOfPanels} × {recommendation.solarPanels.panelWattage}W</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Estimated Cost</p>
                        <p className="text-lg font-bold text-slate-900">KES {recommendation.solarPanels.estimatedCostKES.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Monthly Savings</p>
                        <p className="text-lg font-bold text-green-600">KES {recommendation.solarPanels.monthlySavingsKES.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Battery Section */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleSection('battery')}
                  className="w-full p-4 bg-gradient-to-r from-purple-50 to-pink-50 flex items-center justify-between hover:from-purple-100 hover:to-pink-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Battery size={24} className="text-purple-500" />
                    <div className="text-left">
                      <h3 className="font-bold text-slate-900">Battery Storage</h3>
                      <p className="text-sm text-slate-600">
                        {recommendation.battery.capacityKwh} kWh • {recommendation.battery.typeRecommended}
                      </p>
                    </div>
                  </div>
                  {expanded.battery ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
                {expanded.battery && (
                  <div className="p-4 bg-white space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Capacity</p>
                        <p className="text-lg font-bold text-slate-900">{recommendation.battery.capacityKwh} kWh</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Battery Type</p>
                        <p className="text-sm font-bold text-slate-900">{recommendation.battery.typeRecommended}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Configuration</p>
                        <p className="text-sm font-bold text-slate-900">
                          {recommendation.battery.numberOfBatteries} × {recommendation.battery.batteryCapacityAhPer}Ah @ {recommendation.battery.voltageSystem}V
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Estimated Cost</p>
                        <p className="text-lg font-bold text-slate-900">KES {recommendation.battery.estimatedCostKES.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Inverter Section */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleSection('inverter')}
                  className="w-full p-4 bg-gradient-to-r from-sky-50 to-blue-50 flex items-center justify-between hover:from-sky-100 hover:to-blue-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Zap size={24} className="text-sky-500" />
                    <div className="text-left">
                      <h3 className="font-bold text-slate-900">Inverter</h3>
                      <p className="text-sm text-slate-600">
                        {recommendation.inverter.ratedCapacityKw} kW • {recommendation.inverter.typeRecommended}
                      </p>
                    </div>
                  </div>
                  {expanded.inverter ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
                {expanded.inverter && (
                  <div className="p-4 bg-white space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Rated Capacity</p>
                        <p className="text-lg font-bold text-slate-900">{recommendation.inverter.ratedCapacityKw} kW</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Type</p>
                        <p className="text-sm font-bold text-slate-900">{recommendation.inverter.typeRecommended}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs text-slate-500 mb-1">Estimated Cost</p>
                        <p className="text-lg font-bold text-slate-900">KES {recommendation.inverter.estimatedCostKES.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Financial Analysis */}
              <div className="border-2 border-green-200 rounded-lg overflow-hidden bg-gradient-to-br from-green-50 to-emerald-50">
                <button
                  onClick={() => toggleSection('financial')}
                  className="w-full p-4 flex items-center justify-between hover:bg-green-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <TrendingUp size={24} className="text-green-600" />
                    <div className="text-left">
                      <h3 className="font-bold text-slate-900">Financial Analysis</h3>
                      <p className="text-sm text-slate-600">
                        {recommendation.financial.paybackPeriodYears} year payback • {recommendation.financial.roi25YearsPct}% ROI
                      </p>
                    </div>
                  </div>
                  {expanded.financial ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
                {expanded.financial && (
                  <div className="p-4 bg-white space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2 p-3 bg-slate-50 rounded-lg">
                        <p className="text-xs text-slate-500 mb-1">Total Investment</p>
                        <p className="text-2xl font-bold text-slate-900">
                          KES {recommendation.financial.totalInvestmentKES.toLocaleString()}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          Equipment: KES {recommendation.financial.totalSystemCostKES.toLocaleString()} +
                          Installation: KES {recommendation.financial.installationCostKES.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Monthly Savings</p>
                        <p className="text-lg font-bold text-green-600">
                          KES {recommendation.financial.monthlyGridSavingsKES.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Annual Savings</p>
                        <p className="text-lg font-bold text-green-600">
                          KES {recommendation.financial.annualGridSavingsKES.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Payback Period</p>
                        <p className="text-lg font-bold text-sky-600">
                          {recommendation.financial.paybackPeriodYears} years
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">25-Year ROI</p>
                        <p className="text-lg font-bold text-sky-600">
                          {recommendation.financial.roi25YearsPct}%
                        </p>
                      </div>
                      <div className="col-span-2 p-3 bg-green-50 rounded-lg">
                        <p className="text-xs text-slate-500 mb-1">Net Savings (25 Years)</p>
                        <p className="text-2xl font-bold text-green-600">
                          KES {recommendation.financial.netSavings25YearsKES.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Environmental Impact */}
              <div className="border border-slate-200 rounded-lg p-4 bg-gradient-to-br from-green-50 to-teal-50">
                <div className="flex items-center gap-3 mb-3">
                  <Leaf size={24} className="text-green-600" />
                  <h3 className="font-bold text-slate-900">Environmental Impact</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Grid Dependency Reduction</p>
                    <p className="text-lg font-bold text-slate-900">
                      {recommendation.performance.gridDependencyReductionPct}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Daily Solar Generation</p>
                    <p className="text-lg font-bold text-slate-900">
                      {recommendation.performance.dailySolarGenerationKwh} kWh
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Annual CO₂ Savings</p>
                    <p className="text-lg font-bold text-green-600">
                      {recommendation.performance.annualCO2SavingsKg.toLocaleString()} kg
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Equivalent Trees Planted</p>
                    <p className="text-lg font-bold text-green-600">
                      {recommendation.performance.equivalentTreesPlanted} trees
                    </p>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {recommendation.notes.length > 0 && (
                <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                  <h3 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                    <Info size={16} className="text-blue-600" />
                    Recommendations & Notes
                  </h3>
                  <ul className="space-y-2">
                    {recommendation.notes.map((note, idx) => (
                      <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                        <span className="text-blue-600 mt-0.5">•</span>
                        <span>{note}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500 space-y-3">
              <AlertCircle size={48} className="mx-auto mb-4 text-slate-400" />
              <p className="text-sm text-slate-700">
                Click “Generate” to create a recommendation using the latest solar data for {currentLocation.name}.
              </p>
              {error && <p className="text-xs text-red-600">{error}</p>}
              <div className="flex justify-center">
                <button
                  onClick={generateRecommendations}
                  className="px-4 py-2 bg-sky-600 text-white text-xs font-bold rounded-full hover:bg-sky-700 transition-colors"
                >
                  Generate Recommendations
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
