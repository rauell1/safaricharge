'use client';

import React, { useMemo, useState } from 'react';
import { Droplets, Fuel, AlertTriangle } from 'lucide-react';
import { sizeSolarWaterPumping } from '@/lib/sizing/waterPumpingSizing';
import { latestDieselPriceKesPerLitre } from '@/lib/fuel-prices';

export default function WaterPumpingCalculator({ peakSunHours = 5.27 }: { peakSunHours?: number }) {
  const [dailyDemandM3, setDailyDemandM3] = useState(40);
  const [staticWaterLevelM, setStaticWaterLevelM] = useState(65);
  const [drawdownM, setDrawdownM] = useState(10);
  const [dischargeElevationM, setDischargeElevationM] = useState(12);
  const [pipeDiameterMm, setPipeDiameterMm] = useState(63);
  const [seasonalDropM, setSeasonalDropM] = useState(15);
  const [capexKSh, setCapexKSh] = useState(1_450_000);

  const dieselPrice = latestDieselPriceKesPerLitre();
  const result = useMemo(
    () =>
      sizeSolarWaterPumping({
        dailyDemandM3,
        staticWaterLevelM,
        drawdownM,
        dischargeElevationM,
        pipeDiameterMm,
        peakSunHours,
        seasonalWaterTableDropM: seasonalDropM,
        capexKSh,
        dieselPriceKShPerLiter: dieselPrice,
      }),
    [dailyDemandM3, staticWaterLevelM, drawdownM, dischargeElevationM, pipeDiameterMm, peakSunHours, seasonalDropM, capexKSh, dieselPrice]
  );

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Droplets className="w-5 h-5 text-sky-500" />
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)]">
              Solar Water Pumping & Borehole Sizing (Hazen-Williams)
            </h3>
            <p className="text-[11px] text-[var(--text-tertiary)]">
              Hydraulic head, dry-season drawdown, EPRA diesel displacement (KES {dieselPrice}/L), and LCOW
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <label className="space-y-1">
          <span className="text-[10px] text-[var(--text-muted)] block">Daily Demand (m3/day)</span>
          <input
            type="number"
            min={1}
            value={dailyDemandM3}
            onChange={(e) => setDailyDemandM3(Number(e.target.value) || 1)}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card-muted)] px-2.5 py-1.5 font-mono"
          />
        </label>
        <label className="space-y-1">
          <span className="text-[10px] text-[var(--text-muted)] block">Static Water Level (m)</span>
          <input
            type="number"
            min={0}
            value={staticWaterLevelM}
            onChange={(e) => setStaticWaterLevelM(Number(e.target.value) || 0)}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card-muted)] px-2.5 py-1.5 font-mono"
          />
        </label>
        <label className="space-y-1">
          <span className="text-[10px] text-[var(--text-muted)] block">Seasonal Drop (m)</span>
          <input
            type="number"
            min={0}
            value={seasonalDropM}
            onChange={(e) => setSeasonalDropM(Number(e.target.value) || 0)}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card-muted)] px-2.5 py-1.5 font-mono"
          />
        </label>
        <label className="space-y-1">
          <span className="text-[10px] text-[var(--text-muted)] block">Pipe Diameter (mm)</span>
          <input
            type="number"
            min={20}
            value={pipeDiameterMm}
            onChange={(e) => setPipeDiameterMm(Number(e.target.value) || 50)}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card-muted)] px-2.5 py-1.5 font-mono"
          />
        </label>
        <label className="space-y-1">
          <span className="text-[10px] text-[var(--text-muted)] block">Drawdown (m)</span>
          <input
            type="number"
            min={0}
            value={drawdownM}
            onChange={(e) => setDrawdownM(Number(e.target.value) || 0)}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card-muted)] px-2.5 py-1.5 font-mono"
          />
        </label>
        <label className="space-y-1">
          <span className="text-[10px] text-[var(--text-muted)] block">Discharge Elevation (m)</span>
          <input
            type="number"
            min={0}
            value={dischargeElevationM}
            onChange={(e) => setDischargeElevationM(Number(e.target.value) || 0)}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card-muted)] px-2.5 py-1.5 font-mono"
          />
        </label>
        <label className="space-y-1 col-span-2">
          <span className="text-[10px] text-[var(--text-muted)] block">Turnkey System CapEx (KES, for LCOW)</span>
          <input
            type="number"
            min={0}
            step={50000}
            value={capexKSh}
            onChange={(e) => setCapexKSh(Number(e.target.value) || 0)}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card-muted)] px-2.5 py-1.5 font-mono"
          />
        </label>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
        <div className="rounded-lg bg-[var(--bg-card-muted)] p-3 border border-[var(--border)]">
          <span className="text-[10px] text-[var(--text-muted)] uppercase block">Total Dynamic Head</span>
          <span className="text-base font-bold font-mono text-[var(--text-primary)]">{result.totalDynamicHeadM} m</span>
          <span className="text-[10px] text-[var(--text-tertiary)] block">Flow {result.designFlowM3H} m3/h</span>
        </div>
        <div className="rounded-lg bg-[var(--bg-card-muted)] p-3 border border-[var(--border)]">
          <span className="text-[10px] text-[var(--text-muted)] uppercase block">Recommended PV / VFD</span>
          <span className="text-base font-bold font-mono text-[var(--battery)]">{result.recommendedPvKwp} kWp / {result.recommendedInverterKw} kW</span>
          <span className="text-[10px] text-[var(--text-tertiary)] block">Storage {result.recommendedTankVolumeM3} m3 ({result.tankAutonomyHours}h)</span>
        </div>
        <div className="rounded-lg bg-[var(--bg-card-muted)] p-3 border border-[var(--border)]">
          <span className="text-[10px] text-[var(--text-muted)] uppercase block flex items-center gap-1"><Fuel className="w-3 h-3" /> Diesel Displaced</span>
          <span className="text-base font-bold font-mono text-amber-600">{result.dieselDisplacedLitersYear.toLocaleString()} L/yr</span>
          <span className="text-[10px] text-[var(--text-tertiary)] block">KES {result.dieselCostSavedKShYear.toLocaleString()}/yr saved</span>
        </div>
        <div className="rounded-lg bg-[var(--bg-card-muted)] p-3 border border-[var(--border)]">
          <span className="text-[10px] text-[var(--text-muted)] uppercase block">Levelized Water Cost</span>
          <span className="text-base font-bold font-mono text-sky-600">{result.lcowKShPerM3 !== null ? `KES ${result.lcowKShPerM3}/m3` : '—'}</span>
          <span className="text-[10px] text-[var(--text-tertiary)] block">{result.co2AvoidedKgYear.toLocaleString()} kg CO2/yr avoided</span>
        </div>
      </div>

      {result.seasonalVariance && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{result.seasonalVariance.advisory}</span>
        </div>
      )}
    </div>
  );
}
