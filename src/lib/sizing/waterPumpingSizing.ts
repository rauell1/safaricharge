/**
 * Solar Water Pumping (Borehole & Irrigation) Hydraulic + PV Sizing Engine
 * Ported from StimaPulse V2 with EPRA Nairobi diesel baseline & LCOW.
 */
import { latestDieselPriceKesPerLitre } from '@/lib/fuel-prices';

const WATER_DENSITY_KG_M3 = 1000;
const GRAVITY_M_S2 = 9.81;
const DEFAULT_HAZEN_WILLIAMS_C = 140; // HDPE / uPVC pipe

export interface WaterPumpingInputs {
  dailyDemandM3: number;
  staticWaterLevelM: number;
  drawdownM?: number;
  dischargeElevationM?: number;
  pressureHeadM?: number;
  pipeLengthM?: number;
  pipeDiameterMm?: number;
  peakSunHours?: number;
  pumpEfficiencyFrac?: number;
  motorEfficiencyFrac?: number;
  pvDerateFrac?: number;
  seasonalWaterTableDropM?: number;
  capexKSh?: number;
  annualOmFrac?: number;
  discountRateFrac?: number;
  projectYears?: number;
  dieselLitersPerKwh?: number;
  dieselPriceKShPerLiter?: number;
}

export interface WaterPumpingResult {
  totalDynamicHeadM: number;
  headBreakdown: {
    staticLiftM: number;
    elevationM: number;
    frictionLossM: number;
    pressureHeadM: number;
  };
  designFlowM3H: number;
  operatingHoursPerDay: number;
  hydraulicPowerKw: number;
  electricalPowerKw: number;
  recommendedPvKwp: number;
  recommendedInverterKw: number;
  recommendedTankVolumeM3: number;
  tankAutonomyHours: number;
  dailyEnergyKwh: number;
  annualWaterVolumeM3: number;
  annualEnergyKwh: number;
  specificEnergyKwhPerM3: number;
  dieselDisplacedLitersYear: number;
  dieselCostSavedKShYear: number;
  co2AvoidedKgYear: number;
  lcowKShPerM3: number | null;
  solarFraction: number;
  seasonalVariance?: {
    drySeasonTotalHeadM: number;
    drySeasonHydraulicPowerKw: number;
    drySeasonElectricalPowerKw: number;
    drySeasonPvKwp: number;
    deltaPvKwp: number;
    advisory: string;
  };
}

/**
 * Hazen-Williams pipe friction loss in meters for water flow rate (m³/h).
 */
export function calculatePipeFrictionLossM(
  flowM3H: number,
  pipeLengthM: number,
  pipeDiameterMm: number,
  hazenWilliamsC = DEFAULT_HAZEN_WILLIAMS_C
): number {
  if (flowM3H <= 0 || pipeLengthM <= 0 || pipeDiameterMm <= 0) return 0;
  const qM3S = flowM3H / 3600;
  const dM = pipeDiameterMm / 1000;
  return (
    10.67 *
    pipeLengthM *
    Math.pow(qM3S, 1.852) /
    (Math.pow(hazenWilliamsC, 1.852) * Math.pow(dM, 4.87))
  );
}

export function sizeSolarWaterPumping(inputs: WaterPumpingInputs): WaterPumpingResult {
  const dailyDemandM3 = Math.max(0.5, inputs.dailyDemandM3);
  const staticWaterLevelM = Math.max(0, inputs.staticWaterLevelM);
  const drawdownM = Math.max(0, inputs.drawdownM ?? 8);
  const dischargeElevationM = Math.max(0, inputs.dischargeElevationM ?? 10);
  const pressureHeadM = Math.max(0, inputs.pressureHeadM ?? 5);
  const peakSunHours = Math.max(2, inputs.peakSunHours ?? 5.27);
  const pumpEff = Math.max(0.25, Math.min(0.85, inputs.pumpEfficiencyFrac ?? 0.58));
  const motorEff = Math.max(0.5, Math.min(0.95, inputs.motorEfficiencyFrac ?? 0.85));
  const pvDerate = Math.max(0.5, Math.min(0.95, inputs.pvDerateFrac ?? 0.78));
  const annualOmFrac = Math.max(0, inputs.annualOmFrac ?? 0.02);
  const discountRateFrac = Math.max(0, inputs.discountRateFrac ?? 0.12);
  const projectYears = Math.max(1, inputs.projectYears ?? 15);
  const dieselLitersPerKwh = Math.max(0.1, inputs.dieselLitersPerKwh ?? 0.3);
  const dieselPriceKShPerLiter = inputs.dieselPriceKShPerLiter ?? latestDieselPriceKesPerLitre();

  const operatingHoursPerDay = peakSunHours;
  const designFlowM3H = dailyDemandM3 / operatingHoursPerDay;
  const pipeLengthM = inputs.pipeLengthM ?? (staticWaterLevelM + dischargeElevationM + 30);
  const pipeDiameterMm = inputs.pipeDiameterMm ?? 50;
  const frictionLossM = calculatePipeFrictionLossM(designFlowM3H, pipeLengthM, pipeDiameterMm);

  const pumpingWaterLevelM = staticWaterLevelM + drawdownM;
  const totalDynamicHeadM = pumpingWaterLevelM + dischargeElevationM + pressureHeadM + frictionLossM;

  const flowM3S = designFlowM3H / 3600;
  const hydraulicPowerKw = (WATER_DENSITY_KG_M3 * GRAVITY_M_S2 * flowM3S * totalDynamicHeadM) / 1000;
  const combinedEff = pumpEff * motorEff;
  const electricalPowerKw = combinedEff > 0 ? hydraulicPowerKw / combinedEff : 0;

  const recommendedPvKwp = Math.ceil((electricalPowerKw / pvDerate) * 10) / 10;
  const recommendedInverterKw = Math.ceil(electricalPowerKw * 1.25 * 10) / 10;

  const recommendedTankVolumeM3 = Math.ceil(dailyDemandM3 * 1.5);
  const tankAutonomyHours = dailyDemandM3 > 0 ? (recommendedTankVolumeM3 / dailyDemandM3) * 24 : 0;

  const dailyEnergyKwh = electricalPowerKw * operatingHoursPerDay;
  const annualWaterVolumeM3 = dailyDemandM3 * 365;
  const annualEnergyKwh = dailyEnergyKwh * 365;
  const specificEnergyKwhPerM3 = dailyDemandM3 > 0 ? dailyEnergyKwh / dailyDemandM3 : 0;

  const dieselDisplacedLitersYear = Math.round(annualEnergyKwh * dieselLitersPerKwh);
  const dieselCostSavedKShYear = Math.round(dieselDisplacedLitersYear * dieselPriceKShPerLiter);
  const co2AvoidedKgYear = Math.round(dieselDisplacedLitersYear * 2.68);

  let lcowKShPerM3: number | null = null;
  const capexKSh = inputs.capexKSh ?? 0;
  if (capexKSh > 0 && annualWaterVolumeM3 > 0) {
    const annuityFactor =
      discountRateFrac === 0
        ? projectYears
        : (1 - Math.pow(1 + discountRateFrac, -projectYears)) / discountRateFrac;
    const discountedCostKSh = capexKSh + capexKSh * annualOmFrac * annuityFactor;
    const discountedWaterM3 = annualWaterVolumeM3 * annuityFactor;
    lcowKShPerM3 = Math.round((discountedCostKSh / discountedWaterM3) * 100) / 100;
  }

  let seasonalVariance: WaterPumpingResult['seasonalVariance'];
  if (inputs.seasonalWaterTableDropM && inputs.seasonalWaterTableDropM > 0) {
    const seasonalDropM = inputs.seasonalWaterTableDropM;
    const drySeasonPumpingWaterLevelM = pumpingWaterLevelM + seasonalDropM;
    const drySeasonTdhM = drySeasonPumpingWaterLevelM + dischargeElevationM + pressureHeadM + frictionLossM;
    const drySeasonHydraulicKw = (WATER_DENSITY_KG_M3 * GRAVITY_M_S2 * flowM3S * drySeasonTdhM) / 1000;
    const drySeasonElectricalKw = combinedEff > 0 ? drySeasonHydraulicKw / combinedEff : 0;
    const drySeasonPvKwp = Math.ceil((drySeasonElectricalKw / pvDerate) * 10) / 10;
    const deltaPvKwp = Math.max(0, Math.round((drySeasonPvKwp - recommendedPvKwp) * 10) / 10);
    const advisory =
      deltaPvKwp > 0
        ? `Dry season drawdown (${seasonalDropM} m) increases TDH to ${Math.round(drySeasonTdhM)} m. Add +${deltaPvKwp} kWp PV (${drySeasonPvKwp} kWp total) to prevent drought flow drop.`
        : `Installed PV array (${recommendedPvKwp} kWp) sustains design discharge across a ${seasonalDropM} m seasonal water-table drop.`;

    seasonalVariance = {
      drySeasonTotalHeadM: Math.round(drySeasonTdhM * 10) / 10,
      drySeasonHydraulicPowerKw: Math.round(drySeasonHydraulicKw * 100) / 100,
      drySeasonElectricalPowerKw: Math.round(drySeasonElectricalKw * 100) / 100,
      drySeasonPvKwp,
      deltaPvKwp,
      advisory,
    };
  }

  return {
    totalDynamicHeadM: Math.round(totalDynamicHeadM * 10) / 10,
    headBreakdown: {
      staticLiftM: Math.round(pumpingWaterLevelM * 10) / 10,
      elevationM: Math.round(dischargeElevationM * 10) / 10,
      frictionLossM: Math.round(frictionLossM * 10) / 10,
      pressureHeadM: Math.round(pressureHeadM * 10) / 10,
    },
    designFlowM3H: Math.round(designFlowM3H * 10) / 10,
    operatingHoursPerDay: Math.round(operatingHoursPerDay * 10) / 10,
    hydraulicPowerKw: Math.round(hydraulicPowerKw * 100) / 100,
    electricalPowerKw: Math.round(electricalPowerKw * 100) / 100,
    recommendedPvKwp,
    recommendedInverterKw,
    recommendedTankVolumeM3,
    tankAutonomyHours: Math.round(tankAutonomyHours * 10) / 10,
    dailyEnergyKwh: Math.round(dailyEnergyKwh * 10) / 10,
    annualWaterVolumeM3: Math.round(annualWaterVolumeM3),
    annualEnergyKwh: Math.round(annualEnergyKwh),
    specificEnergyKwhPerM3: Math.round(specificEnergyKwhPerM3 * 1000) / 1000,
    dieselDisplacedLitersYear,
    dieselCostSavedKShYear,
    co2AvoidedKgYear,
    lcowKShPerM3,
    solarFraction: 1.0,
    ...(seasonalVariance ? { seasonalVariance } : {}),
  };
}
