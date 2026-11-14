import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { PDFDocument } from 'pdf-lib';

import {
  KPLC_OCT_2026_SURCHARGES,
  TARIFF_PROFILES,
  allInRateBreakdown,
  computeAllInRate,
} from '@/lib/tariff-config';
import { parseStimaTracker, parseStimaTrackerMonthly } from '@/lib/kplc-sync';
import { latestDieselPriceKesPerLitre, fuelPricesOn } from '@/lib/fuel-prices';
import {
  ENGINE_VERSION,
  LEGACY_CUTOFF_VERSION,
  isOutdatedEngineVersion,
  solarProvenance,
  solarResourceForCountry,
} from '@/lib/solar-resource';
import {
  CONSERVATION_TOLERANCE_FRAC,
  runAnnualSeasonalDispatch,
  runChronologicalDayDispatch,
} from '@/lib/sizing/dispatchEngine';
import {
  buildEqualStringLayout,
  checkInverterBatteryMatch,
} from '@/lib/sizing/cableSizing';
import { CABLE_REFERENCE, LOAD_PROFILES, SOLAR_LOCATIONS } from '@/lib/sizing/mockData';
import { runSimulation } from '@/lib/sizing/solarCalculator';
import { sizeSolarWaterPumping } from '@/lib/sizing/waterPumpingSizing';
import { DEFAULT_REPORT_SECTIONS } from '@/lib/reports/report-types';
import {
  generateSanitizedCsvZipBuffer,
  generateWorkbookXlsxBuffer,
} from '@/lib/reports/spreadsheet-export';
import { generateWordProposalBuffer } from '@/lib/reports/word-document';
import { generatePdfProposalBytes } from '@/lib/reports/pdf-document';
import { buildDispatchHeatmap } from '@/lib/sizing/dispatchHeatmap';
import { buildDefaultCatalog, handleMcpJsonRpc } from '@/lib/mcp/server';
import { reconcileTelemetryBatch } from '@/lib/telemetry-ingest';
import { buildDeterministicAuditReply } from '@/lib/ai/deterministic-audit';

describe('Workstream 1: KPLC Oct 2026 Tariffs, StimaTracker Parser & Fuel Prices', () => {
  it('applies 16% VAT strictly to Base + FCC + FERFA (never INFA/ERC/WARMA/REP)', () => {
    const base = 16.3;
    const s = KPLC_OCT_2026_SURCHARGES;
    expect(s.fuelEnergyCost).toBe(3.22);
    expect(s.ferfa).toBe(0.87);
    expect(s.infa).toBe(0.48);
    expect(s.ercLevy).toBe(0.08);
    expect(s.wraLevy).toBe(0.01);
    expect(s.repRate).toBe(0.05);

    const lines = allInRateBreakdown(base, TARIFF_PROFILES.domestic);
    const vatLine = lines.find((l) => l.id === 'vat')?.perKwhKes ?? 0;
    const repLine = lines.find((l) => l.id === 'rep')?.perKwhKes ?? 0;
    const totalFromLines = lines.reduce((acc, l) => acc + l.perKwhKes, 0);

    const expectedVat = (base + s.fuelEnergyCost + s.ferfa) * s.vatRate;
    const expectedRep = base * s.repRate;
    expect(vatLine).toBeCloseTo(expectedVat, 6);
    expect(repLine).toBeCloseTo(expectedRep, 6);
    expect(computeAllInRate(base, TARIFF_PROFILES.domestic)).toBeCloseTo(totalFromLines, 6);
  });

  it('parses StimaTracker main schedule & /historic monthly surcharge tables accurately', () => {
    const historicHtml = `
      <table>
        <thead><tr><th>Month</th><th>Fuel Cost Charge</th><th>Foreign Exchange</th><th>Inflation</th><th>WARMA</th></tr></thead>
        <tbody>
          <tr><td>2026-09</td><td>3.10</td><td>0.81</td><td>0.45</td><td>0.01</td></tr>
          <tr><td>2026-10</td><td>3.22</td><td>0.87</td><td>0.48</td><td>0.01</td></tr>
        </tbody>
      </table>`;
    const mainHtml = `
      <p>KPLC Kenya current schedule of tariffs is effective from April 2023</p>
      <table>
        <thead><tr><th>Class</th><th>Energy (KSh/kWh)</th><th>Demand (KSh/kVA)</th></tr></thead>
        <tbody>
          <tr><td>DC</td><td>20.97</td><td>n/a</td></tr>
          <tr><td>DC1</td><td>12.23</td><td>n/a</td></tr>
          <tr><td>DC2</td><td>16.30</td><td>n/a</td></tr>
          <tr><td>SC1</td><td>19.80</td><td>n/a</td></tr>
          <tr><td>SC2</td><td>18.60</td><td>n/a</td></tr>
          <tr><td>SC3</td><td>Regular: 18.20 TOU: 9.10</td><td>900</td></tr>
          <tr><td>CI1</td><td>Regular: 16.20 TOU: 8.10</td><td>800</td></tr>
          <tr><td>CI2</td><td>Regular: 14.50 TOU: 7.25</td><td>520</td></tr>
          <tr><td>CI3</td><td>Regular: 13.90 TOU: 6.95</td><td>320</td></tr>
        </tbody>
      </table>`;

    const monthly = parseStimaTrackerMonthly(historicHtml, new Date('2026-11-01T00:00:00Z'));
    expect(monthly.period).toBe('2026-10-01');
    expect(monthly.fccPerKwhKes).toBe(3.22);

    const snapshot = parseStimaTracker(mainHtml, new Date('2026-11-01T00:00:00Z'), undefined, monthly);
    expect(snapshot.monthlyUpdated).toBe(true);
    expect(snapshot.rates).toHaveLength(9);
    expect(snapshot.rates.find((r) => r.code === 'CI1')?.demandChargeKesPerKva).toBe(800);
  });

  it('provides Oct 2026 EPRA Nairobi diesel price & solar provenance helpers', () => {
    expect(latestDieselPriceKesPerLitre()).toBeCloseTo(227.76, 2);
    expect(fuelPricesOn('2026-10-20')?.dieselMinor).toBe(22776);

    const ke = solarResourceForCountry('Kenya');
    expect(ke.monthlyPeakSunHours).toHaveLength(12);
    expect(solarProvenance(undefined).kind).toBe('legacy');
    expect(solarProvenance('pvgis').kind).toBe('modelled');

    expect(isOutdatedEngineVersion(undefined)).toBe(true);
    expect(isOutdatedEngineVersion('1.9.0')).toBe(true);
    expect(isOutdatedEngineVersion(LEGACY_CUTOFF_VERSION)).toBe(false);
    expect(isOutdatedEngineVersion(ENGINE_VERSION)).toBe(false);
  });
});

describe('Workstream 2: Dispatch Conservation, Sizing Engineering & Water Pumping', () => {
  it('converges periodic opening SOC via bisection and satisfies conservation tolerance', () => {
    const day = runChronologicalDayDispatch({
      pvDcKwp: 12,
      inverterAcKw: 10,
      inverterEfficiencyFrac: 0.97,
      peakSunHours: 5.5,
      ambientTempC: 24,
      loadKwByHour: Array.from({ length: 24 }, (_, h) => (h >= 18 && h <= 21 ? 4.5 : 1.5)),
      tariffUsdByHour: Array.from({ length: 24 }, (_, h) => (h >= 18 && h < 22 ? 0.25 : 0.14)),
      batteryUsableKwh: 18,
      batteryMaxChargeKw: 8,
      batteryMaxDischargeKw: 8,
      batteryRoundTripEffFrac: 0.92,
      batteryReserveFrac: 0.15,
      gridAvailable: true,
      exportAllowed: false,
      outageHours: [19],
      outageEssentialLoadKw: 3.0,
      socMode: 'periodic',
    });

    expect(Math.abs(day.openingSocFrac - day.closingSocFrac)).toBeLessThan(1e-3);
    expect(day.conservationResidualKwh).toBeLessThan(CONSERVATION_TOLERANCE_FRAC * 10);
    expect(day.shedKwhDay).toBeCloseTo(1.5, 2); // 4.5 kW load - 3.0 kW essential at outage hour 19

    const annual = runAnnualSeasonalDispatch(
      {
        pvDcKwp: 12,
        inverterAcKw: 10,
        inverterEfficiencyFrac: 0.97,
        loadKwByHour: Array.from({ length: 24 }, () => 2),
        tariffUsdByHour: Array.from({ length: 24 }, () => 0.18),
        batteryUsableKwh: 15,
        batteryMaxChargeKw: 6,
        batteryMaxDischargeKw: 6,
        batteryRoundTripEffFrac: 0.92,
        batteryReserveFrac: 0.1,
        gridAvailable: true,
        exportAllowed: false,
      },
      Array(12).fill(5.3),
      Array(12).fill(21)
    );
    expect(annual.months).toHaveLength(12);
    expect(annual.annualSolarAcKwh).toBeGreaterThan(10_000);
  });

  it('enforces monotonic 35 mm2 cable pricing, HV empty/full battery check & equal-string layout', () => {
    const c25 = CABLE_REFERENCE.find((c) => c.sizeMM2 === 25)!;
    const c35 = CABLE_REFERENCE.find((c) => c.sizeMM2 === 35)!;
    const c50 = CABLE_REFERENCE.find((c) => c.sizeMM2 === 50)!;
    expect(c35.dcPricePerM).toBeGreaterThan(c25.dcPricePerM);
    expect(c35.dcPricePerM).toBeLessThan(c50.dcPricePerM);

    const under = checkInverterBatteryMatch({
      isHv: true,
      modulesPerBank: 2,
      moduleVoltageV: 51.2,
      inverterMinV: 160,
      inverterMaxV: 700,
    });
    expect(under.ok).toBe(false);
    expect(under.status).toBe('empty-undervoltage');

    const over = checkInverterBatteryMatch({
      isHv: true,
      modulesPerBank: 12,
      moduleVoltageV: 60,
      inverterMinV: 160,
      inverterMaxV: 700,
    });
    expect(over.ok).toBe(false);
    expect(over.status).toBe('full-overvoltage');

    const strings = buildEqualStringLayout({
      targetPanelCount: 25,
      preferredPanelsPerString: 12,
      mpptChannels: 2,
    });
    expect(strings.stringCount).toBe(2);
    expect(strings.panelsPerString).toBe(12);
    expect(strings.usedPanelCount).toBe(24);
  });

  it('sizes solar borehole water pumping with Hazen-Williams head loss & seasonal drawdown', () => {
    const res = sizeSolarWaterPumping({
      dailyDemandM3: 40,
      staticWaterLevelM: 75,
      drawdownM: 12,
      dischargeElevationM: 15,
      pipeLengthM: 180,
      pipeDiameterMm: 63,
      seasonalWaterTableDropM: 10,
      capexKSh: 1_450_000,
    });

    expect(res.totalDynamicHeadM).toBeGreaterThan(102);
    expect(res.recommendedPvKwp).toBeGreaterThan(2);
    expect(res.seasonalVariance).toBeDefined();
    expect(res.seasonalVariance!.drySeasonPvKwp).toBeGreaterThanOrEqual(res.recommendedPvKwp);
    expect(res.dieselCostSavedKShYear).toBeGreaterThan(0);
    expect(res.lcowKShPerM3).not.toBeNull();
  });
});

describe('Workstreams 3, 4 & 5: Reports, Heatmap, MCP Server, Telemetry & Deterministic AI', () => {
  it('runs least-waste simulation, builds heatmap, and exports valid .xlsx, .csv zip, .docx & .pdf', async () => {
    const catalog = buildDefaultCatalog();
    const sim = runSimulation(
      {
        location: SOLAR_LOCATIONS[0],
        loadProfile: LOAD_PROFILES[2],
        loadMultiplier: 1.0,
        systemArchitecture: 'central_inverter',
        panelId: catalog.panels[0].id,
        panelQty: 20,
        inverterId: catalog.inverters[2].id,
        inverterQty: 1,
        batteryId: catalog.batteries[0].id,
        batteryQty: 2,
        dcAcOversizeRatio: 1.2,
        targetBatteryKWh: 15,
        dynessProductLine: 'Stack100',
        panelsPerString: 10,
        microPanelId: catalog.panels[0].id,
        microInverterId: '',
        microTargetSystemKW: 5,
        installationMethod: 'clipped_direct',
        ambientTempC: 25,
        minDesignAmbientTempC: 10,
        contingencyPercent: 5,
        epcMarginPercent: 10,
        specificYieldKWhPerKWpDay: 5.5,
        selfConsumptionRatioPercent: 85,
        gridTariffKShPerKWh: 26,
        tariffEscalationPercent: 6,
        panelDegradationPercent: 0.5,
        annualOMCostPercent: 1.5,
        omEscalationPercent: 5,
        batteryReplacementYear: 11,
        batteryReplacementCostPercent: 60,
        discountRate: 12,
        inflationRate: 5.5,
        projectLifeYears: 25,
        useTOUTariff: true,
        kplcCustomerSegment: 'Small Commercial',
        tariffStructure: 'Standard',
        monthlyConsumptionKWh: 1500,
        debtFractionPercent: 0,
        loanInterestRatePercent: 15,
        loanTermYears: 5,
        includeGeneratorInterface: false,
        includeWeatherproofEnclosure: false,
        includeKPLCapplication: true,
        includeOandM: false,
        pvSizingGoal: 'least_waste',
        maxWastedFrac: 0.1,
        demandChargeKShPerKVA: 800,
        powerFactor: 0.9,
        taxShieldEnabled: true,
      },
      catalog
    );

    expect(sim.engineVersion).toBe(ENGINE_VERSION);
    expect(sim.monthlyDispatchSummary).toHaveLength(12);
    expect(sim.batteryComparison?.length).toBeGreaterThan(0);

    const heatmap = buildDispatchHeatmap(sim, 'solarAcKw');
    expect(heatmap.rows).toHaveLength(12);
    expect(heatmap.rows[0].cells).toHaveLength(24);

    const payload = {
      results: sim,
      branding: { companyName: '=SolarEPC EvilTest', clientName: 'Acme Kenya' },
      sections: DEFAULT_REPORT_SECTIONS,
    };

    const xlsxBuf = await generateWorkbookXlsxBuffer(payload);
    const xlsxZip = await JSZip.loadAsync(xlsxBuf);
    expect(xlsxZip.file('xl/workbook.xml')).toBeTruthy();

    const csvZipBuf = await generateSanitizedCsvZipBuffer(payload);
    const csvZip = await JSZip.loadAsync(csvZipBuf);
    const summaryCsv = await csvZip.file('overview.csv')!.async('string');
    expect(summaryCsv).toContain("'=SolarEPC EvilTest"); // formula injection neutralized

    const docxBuf = await generateWordProposalBuffer(payload);
    const docxZip = await JSZip.loadAsync(docxBuf);
    expect(docxZip.file('word/document.xml')).toBeTruthy();

    const pdfBytes = await generatePdfProposalBytes(payload);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    expect(pdfDoc.getPageCount()).toBeGreaterThanOrEqual(2);
  });

  it('serves MCP JSON-RPC tools, telemetry reconciliation, and deterministic AI fallback', async () => {
    const listRes = await handleMcpJsonRpc({ jsonrpc: '2.0', id: 1, method: 'tools/list' });
    expect((listRes.result as { tools: unknown[] }).tools.length).toBeGreaterThanOrEqual(4);

    const tariffCall = await handleMcpJsonRpc({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: { name: 'lookup_kplc_tariffs', arguments: { classCode: 'CI1' } },
    });
    expect(tariffCall.error).toBeUndefined();

    const report = reconcileTelemetryBatch({
      siteId: 'nairobi-hq-01',
      vendor: 'deye',
      intervalMinutes: 60,
      points: [
        { timestamp: '2026-10-20T11:00:00Z', solarKw: 4.0, loadKw: 3.0, gridImportKw: 0, gridExportKw: 0, expectedSolarKw: 8.0 },
      ],
    });
    expect(report.solarPerformanceRatioPct).toBeCloseTo(50, 1);
    expect(report.dataQualityStatus).toBe('degraded');

    const reply = buildDeterministicAuditReply({ prompt: 'Explain Oct 2026 KPLC VAT and FCC' });
    expect(reply).toContain('3.22');
    expect(reply).toContain('VAT (16%)');
  });
});
