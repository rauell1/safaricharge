'use client';

import React, { useCallback } from 'react';
import { FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEnergySystemStore } from '@/stores/energySystemStore';
import { buildFinancialSnapshot } from '@/lib/financial-dashboard';
import type { FinancialInputs } from '@/lib/financial-dashboard';
import type { SolarIrradianceData } from '@/lib/nasa-power-api';
import { generateReportHTML, openReportWindow } from '@/lib/report-generator';

const DEFAULT_FINANCIAL_INPUTS: FinancialInputs = {
  chargingTariffKes: 25,
  discountRatePct: 10,
  stationCount: 3,
  targetUtilizationPct: 45,
  projectYears: 20,
};

const DEFAULT_SOLAR_DATA: SolarIrradianceData = {
  latitude: -1.2921,
  longitude: 36.8219,
  location: 'Nairobi',
  monthlyAverage: [5.5, 5.8, 5.6, 5.4, 5.2, 5.1, 5.0, 5.3, 5.7, 5.8, 5.4, 5.3],
  annualAverage: 5.4,
  monthlyTemperature: [22, 23, 24, 23, 22, 21, 20, 21, 22, 23, 22, 22],
  peakSunHours: [5.5, 5.8, 5.6, 5.4, 5.2, 5.1, 5.0, 5.3, 5.7, 5.8, 5.4, 5.3],
};

interface GenerateReportButtonProps {
  locationName?: string;
  locationCountry?: string;
  locationLat?: number;
  locationLon?: number;
  avgDailySunHours?: number;
  financialInputs?: FinancialInputs;
  className?: string;
}

export function GenerateReportButton({
  locationName = 'Nairobi',
  locationCountry = 'Kenya',
  locationLat = -1.2921,
  locationLon = 36.8219,
  avgDailySunHours = 5.4,
  financialInputs = DEFAULT_FINANCIAL_INPUTS,
  className,
}: GenerateReportButtonProps) {
  const systemConfig  = useEnergySystemStore((s) => s.systemConfig);
  const minuteData    = useEnergySystemStore((s) => s.minuteData);

  const handleGenerate = useCallback(() => {
    // Read inverter and EV config from localStorage (written by System Configuration page)
    const readConfig = (key: string) => {
      try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : null; } catch { return null; }
    };
    const invConf = readConfig('sc_inverter_config');
    const evConf  = readConfig('sc_ev_charger_config');

    const solarData: SolarIrradianceData = {
      ...DEFAULT_SOLAR_DATA,
      latitude: locationLat,
      longitude: locationLon,
      location: locationName,
      annualAverage: avgDailySunHours,
      monthlyAverage: Array(12).fill(avgDailySunHours),
      peakSunHours: Array(12).fill(avgDailySunHours),
    };

    const snapshot = buildFinancialSnapshot({
      minuteData: minuteData as any,
      solarData,
      inputs: financialInputs,
      evCapacityKw: (evConf?.maxKw ?? 22) * (evConf?.count ?? 2),
    });

    const totalSolarKWh      = minuteData.reduce((s, d) => s + (d.solarEnergyKWh ?? 0), 0);
    const totalSavingsKES    = minuteData.reduce((s, d) => s + (d.savingsKES ?? 0), 0);
    const totalGridImportKWh = minuteData.reduce((s, d) => s + (d.gridImportKWh ?? 0), 0);
    const totalGridExportKWh = minuteData.reduce((s, d) => s + (d.gridExportKWh ?? 0), 0);
    const totalEvKWh         = minuteData.reduce((s, d) => s + (d.ev1LoadKWh ?? 0) + (d.ev2LoadKWh ?? 0), 0);

    const capexKes = snapshot.capex?.total ?? (snapshot as any).capexKes ?? 2500000;

    const html = generateReportHTML({
      generatedAt: new Date().toLocaleString('en-KE'),
      locationName,
      locationCountry,
      locationLat,
      locationLon,
      avgDailySunHours,
      systemConfig: {
        solarCapacityKW:     systemConfig.solarCapacityKW ?? 10,
        batteryCapacityKWh:  systemConfig.batteryCapacityKWh ?? 50,
        inverterKW:          (invConf?.kwPerUnit ?? systemConfig.inverterKW ?? 10) * (invConf?.units ?? 1),
        systemMode:          systemConfig.systemMode ?? 'on-grid',
        gridOutageEnabled:   systemConfig.gridOutageEnabled ?? false,
        inverterModel:       invConf?.presetId ?? 'hybrid-inverter',
        inverterUnits:       invConf?.units ?? 1,
        inverterKwPerUnit:   invConf?.kwPerUnit ?? systemConfig.inverterKW ?? 10,
        evChargerType:       evConf?.presetId ?? 'ac22',
        evChargerCount:      evConf?.count ?? 2,
        evChargerMaxKw:      evConf?.maxKw ?? 22,
      },
      financialData: {
        revenueMonthly:     snapshot.revenueMonthly,
        netMonthly:         snapshot.netMonthly,
        paybackYears:       snapshot.paybackYears,
        irrPct:             snapshot.irrPct,
        npvKes:             snapshot.npvKes,
        lcoeKesPerKwh:      snapshot.lcoeKesPerKwh,
        capexKes,
        chargingTariffKes:  financialInputs.chargingTariffKes,
      },
      simulationPoints: minuteData.map((d: any) => ({
        solarKW:         d.solarKW ?? 0,
        batteryLevelPct: d.batteryLevelPct ?? 0,
        homeLoadKW:      d.homeLoadKW ?? 0,
        gridImportKW:    d.gridImportKW ?? 0,
        gridExportKW:    d.gridExportKW ?? 0,
        ev1LoadKW:       d.ev1LoadKW ?? 0,
        ev2LoadKW:       d.ev2LoadKW ?? 0,
        savingsKES:      d.savingsKES ?? 0,
        solarEnergyKWh:  d.solarEnergyKWh ?? 0,
      })),
      totalSolarKWh,
      totalSavingsKES,
      totalGridImportKWh,
      totalGridExportKWh,
      totalEvKWh,
      systemMode: systemConfig.systemMode ?? 'on-grid',
    });

    openReportWindow(html);
  }, [systemConfig, minuteData, locationName, locationCountry, locationLat, locationLon, avgDailySunHours, financialInputs]);

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleGenerate}
      className={[
        'flex items-center gap-1.5 font-semibold border-[var(--battery)] text-[var(--battery)] hover:bg-[var(--battery-soft)]',
        className ?? '',
      ].join(' ')}
    >
      <FileText className="h-3.5 w-3.5" />
      Generate Report
    </Button>
  );
}
