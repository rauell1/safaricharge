// SafariCharge Ltd - May 2026 Hardware Catalog & Sizing Database
// Sourced from "solar_sizing_calculator_Final" Google Sheets (SafariCharge production workbook)
// All prices in KSh (Kenyan Shillings), ex-VAT unless noted

export interface HardwareComponent {
  id: string;
  category: 'panel' | 'inverter' | 'battery' | 'bos' | 'service' | 'microinverter' | 'accessory';
  brand: string;
  model: string;
  specifications: string;
  costKSh: number;
  costUSD: number;
  unit: string;
  ratingWatts?: number;
  capacityKWh?: number;
  efficiency?: number;
  warrantyYears: number;
  origin: string;
  phase?: '1P' | '3P';
  voltageClass?: 'LV (48V)' | 'HV (160-700V)' | 'HV (160-800V)' | 'HV (150-850V)' | 'Grid-Tied' | 'Off-Grid';
  maxPVInputKWp?: number;
  mpptCount?: number;
  maxChargeCurrent?: number;
  source?: string;
}

export interface SolarLocation {
  id: string;
  name: string;
  country: string;
  peakSunHours: number;
  monthlyIrradiance: number[];
  gridTariffKSh: number;
  gridTariffUSD: number;
  gridFeedInTariffKSh: number;
  gridFeedInTariffUSD: number;
  gridReliability: number;
  outageHoursPerDay: number;
  co2Intensity: number;
}

export interface LoadProfilePreset {
  id: string;
  name: string;
  description: string;
  baseHourlyLoadKW: number[];
  totalDailyKWh: number;
}

// ========== 1. COMPLETE INVERTER DATABASE (Deye, Solis, Jinko) ==========
export const INVERTER_CATALOG: HardwareComponent[] = [
  // ---- DEYE LV (48V) Single-Phase ----
  { id:'inv-deye-5k-lv-1p', category:'inverter', brand:'Deye', model:'SUN-5K-SG04LP1-EU', specifications:'5kW 1P LV Hybrid, 2 MPPT, 120A charge', costKSh:110000, costUSD:863, unit:'pcs', ratingWatts:5000, efficiency:0.96, warrantyYears:5, origin:'China', phase:'1P', voltageClass:'LV (48V)', maxPVInputKWp:6.5, mpptCount:2, maxChargeCurrent:120, source:'Regional LV benchmark' },
  { id:'inv-deye-8k-lv-1p', category:'inverter', brand:'Deye', model:'SUN-8K-SG01LP1-EU', specifications:'8kW 1P LV Hybrid, 2 MPPT, 185A charge', costKSh:162900, costUSD:1277, unit:'pcs', ratingWatts:8000, efficiency:0.96, warrantyYears:5, origin:'China', phase:'1P', voltageClass:'LV (48V)', maxPVInputKWp:12.0, mpptCount:2, maxChargeCurrent:185, source:'SolarShop Africa Kenya (confirmed)' },
  { id:'inv-deye-12k-lv-1p', category:'inverter', brand:'Deye', model:'SUN-12K-SG01LP1-EU', specifications:'12kW 1P LV Hybrid, 3 MPPT, 240A charge', costKSh:235000, costUSD:1843, unit:'pcs', ratingWatts:12000, efficiency:0.96, warrantyYears:5, origin:'China', phase:'1P', voltageClass:'LV (48V)', maxPVInputKWp:18.0, mpptCount:3, maxChargeCurrent:240, source:'Regional LV benchmark' },
  { id:'inv-deye-16k-lv-1p', category:'inverter', brand:'Deye', model:'SUN-16K-SG01LP1-EU', specifications:'16kW 1P LV Hybrid, 3 MPPT, 240A charge', costKSh:295000, costUSD:2314, unit:'pcs', ratingWatts:16000, efficiency:0.96, warrantyYears:5, origin:'China', phase:'1P', voltageClass:'LV (48V)', maxPVInputKWp:24.0, mpptCount:3, maxChargeCurrent:240, source:'Regional LV benchmark' },
  // Deye LV 3-Phase
  { id:'inv-deye-5k-lv-3p', category:'inverter', brand:'Deye', model:'SUN-5K-SG04LP3-EU', specifications:'5kW 3P LV Hybrid, 2 MPPT, 120A', costKSh:145300, costUSD:1140, unit:'pcs', ratingWatts:5000, efficiency:0.96, warrantyYears:5, origin:'China', phase:'3P', voltageClass:'LV (48V)', maxPVInputKWp:6.5, mpptCount:2, maxChargeCurrent:120, source:'Multline Autosystems Kenya (confirmed)' },
  { id:'inv-deye-8k-lv-3p', category:'inverter', brand:'Deye', model:'SUN-8K-SG04LP3-EU', specifications:'8kW 3P LV Hybrid, 2 MPPT, 160A', costKSh:185000, costUSD:1451, unit:'pcs', ratingWatts:8000, efficiency:0.96, warrantyYears:5, origin:'China', phase:'3P', voltageClass:'LV (48V)', maxPVInputKWp:10.4, mpptCount:2, maxChargeCurrent:160, source:'Regional LV benchmark' },
  { id:'inv-deye-10k-lv-3p', category:'inverter', brand:'Deye', model:'SUN-10K-SG04LP3-EU', specifications:'10kW 3P LV Hybrid, 2 MPPT, 200A', costKSh:210000, costUSD:1647, unit:'pcs', ratingWatts:10000, efficiency:0.96, warrantyYears:5, origin:'China', phase:'3P', voltageClass:'LV (48V)', maxPVInputKWp:13.0, mpptCount:2, maxChargeCurrent:200, source:'Regional LV benchmark' },
  { id:'inv-deye-12k-lv-3p', category:'inverter', brand:'Deye', model:'SUN-12K-SG04LP3-EU', specifications:'12kW 3P LV Hybrid, 2 MPPT, 240A', costKSh:240000, costUSD:1882, unit:'pcs', ratingWatts:12000, efficiency:0.96, warrantyYears:5, origin:'China', phase:'3P', voltageClass:'LV (48V)', maxPVInputKWp:15.6, mpptCount:2, maxChargeCurrent:240, source:'Regional LV benchmark' },
  // ---- DEYE HV (160-700V) 3-Phase ----
  { id:'inv-deye-5k-hv', category:'inverter', brand:'Deye', model:'SUN-5K-SG01HP3-EU-AM2', specifications:'5kW 3P HV Hybrid, 2 MPPT, 30A', costKSh:175000, costUSD:1373, unit:'pcs', ratingWatts:5000, efficiency:0.97, warrantyYears:5, origin:'China', phase:'3P', voltageClass:'HV (160-700V)', maxPVInputKWp:7.5, mpptCount:2, maxChargeCurrent:30, source:'Regional HV benchmark' },
  { id:'inv-deye-8k-hv', category:'inverter', brand:'Deye', model:'SUN-8K-SG01HP3-EU-AM2', specifications:'8kW 3P HV Hybrid, 2 MPPT, 37A', costKSh:230000, costUSD:1804, unit:'pcs', ratingWatts:8000, efficiency:0.97, warrantyYears:5, origin:'China', phase:'3P', voltageClass:'HV (160-700V)', maxPVInputKWp:12.0, mpptCount:2, maxChargeCurrent:37, source:'Regional HV benchmark' },
  { id:'inv-deye-10k-hv', category:'inverter', brand:'Deye', model:'SUN-10K-SG01HP3-EU-AM2', specifications:'10kW 3P HV Hybrid, 2 MPPT, 37A', costKSh:265000, costUSD:2078, unit:'pcs', ratingWatts:10000, efficiency:0.97, warrantyYears:5, origin:'China', phase:'3P', voltageClass:'HV (160-700V)', maxPVInputKWp:15.0, mpptCount:2, maxChargeCurrent:37, source:'Regional HV benchmark' },
  { id:'inv-deye-12k-hv', category:'inverter', brand:'Deye', model:'SUN-12K-SG01HP3-EU-AM2', specifications:'12kW 3P HV Hybrid, 2 MPPT, 37A', costKSh:295000, costUSD:2314, unit:'pcs', ratingWatts:12000, efficiency:0.97, warrantyYears:5, origin:'China', phase:'3P', voltageClass:'HV (160-700V)', maxPVInputKWp:18.0, mpptCount:2, maxChargeCurrent:37, source:'Sunnergie EU (converted)' },
  { id:'inv-deye-15k-hv', category:'inverter', brand:'Deye', model:'SUN-15K-SG01HP3-EU-AM2', specifications:'15kW 3P HV Hybrid, 2 MPPT, 37A', costKSh:345000, costUSD:2706, unit:'pcs', ratingWatts:15000, efficiency:0.97, warrantyYears:5, origin:'China', phase:'3P', voltageClass:'HV (160-700V)', maxPVInputKWp:19.5, mpptCount:2, maxChargeCurrent:37, source:'Sunnergie EU benchmark (converted)' },
  { id:'inv-deye-20k-hv', category:'inverter', brand:'Deye', model:'SUN-20K-SG01HP3-EU-AM2', specifications:'20kW 3P HV Hybrid, 2 MPPT, 50A', costKSh:410000, costUSD:3216, unit:'pcs', ratingWatts:20000, efficiency:0.97, warrantyYears:5, origin:'China', phase:'3P', voltageClass:'HV (160-700V)', maxPVInputKWp:30.0, mpptCount:2, maxChargeCurrent:50, source:'Sunnergie EU (converted)' },
  // ---- DEYE HV (160-800V) BM3/BM4 Series (30-50kW) ----
  { id:'inv-deye-30k-hv', category:'inverter', brand:'Deye', model:'SUN-30K-SG01HP3-EU-BM3', specifications:'30kW 3P HV Hybrid, 2 MPPT, 75A', costKSh:560000, costUSD:4392, unit:'pcs', ratingWatts:30000, efficiency:0.975, warrantyYears:5, origin:'China', phase:'3P', voltageClass:'HV (160-800V)', maxPVInputKWp:45.0, mpptCount:2, maxChargeCurrent:75, source:'Regional HV benchmark' },
  { id:'inv-deye-40k-hv', category:'inverter', brand:'Deye', model:'SUN-40K-SG01HP3-EU-BM4', specifications:'40kW 3P HV Hybrid, 2 MPPT, 100A', costKSh:700000, costUSD:5490, unit:'pcs', ratingWatts:40000, efficiency:0.975, warrantyYears:5, origin:'China', phase:'3P', voltageClass:'HV (160-800V)', maxPVInputKWp:60.0, mpptCount:2, maxChargeCurrent:100, source:'Regional HV benchmark' },
  { id:'inv-deye-50k-hv', category:'inverter', brand:'Deye', model:'SUN-50K-SG01HP3-EU-BM4', specifications:'50kW 3P HV Hybrid, 2 MPPT, 100A', costKSh:850000, costUSD:6667, unit:'pcs', ratingWatts:50000, efficiency:0.975, warrantyYears:5, origin:'China', phase:'3P', voltageClass:'HV (160-800V)', maxPVInputKWp:75.0, mpptCount:2, maxChargeCurrent:100, source:'Regional HV benchmark' },

  // ---- SOLIS LV (48V) ----
  { id:'inv-solis-5k-lv', category:'inverter', brand:'Solis', model:'S6-EH1P5K-L-PLUS', specifications:'5kW 1P LV Hybrid, 2 MPPT, 105A', costKSh:120000, costUSD:941, unit:'pcs', ratingWatts:5000, efficiency:0.96, warrantyYears:5, origin:'China', phase:'1P', voltageClass:'LV (48V)', maxPVInputKWp:8.0, mpptCount:2, maxChargeCurrent:105, source:'Solargen Technologies (confirmed)' },
  { id:'inv-solis-6k-lv', category:'inverter', brand:'Solis', model:'S6-EH1P6K-L-PLUS', specifications:'6kW 1P LV Hybrid, 2 MPPT, 120A', costKSh:145000, costUSD:1137, unit:'pcs', ratingWatts:6000, efficiency:0.96, warrantyYears:5, origin:'China', phase:'1P', voltageClass:'LV (48V)', maxPVInputKWp:9.6, mpptCount:2, maxChargeCurrent:120, source:'Regional LV benchmark' },
  { id:'inv-solis-8k-lv', category:'inverter', brand:'Solis', model:'S6-EH1P8K-L-PLUS', specifications:'8kW 1P LV Hybrid, 2 MPPT, 150A', costKSh:168000, costUSD:1318, unit:'pcs', ratingWatts:8000, efficiency:0.96, warrantyYears:5, origin:'China', phase:'1P', voltageClass:'LV (48V)', maxPVInputKWp:12.8, mpptCount:2, maxChargeCurrent:150, source:'Solargen Technologies (confirmed)' },
  { id:'inv-solis-10k-lv', category:'inverter', brand:'Solis', model:'S6-EH1P10K-L-PLUS', specifications:'10kW 1P LV Hybrid, 4 MPPT, 200A', costKSh:204000, costUSD:1600, unit:'pcs', ratingWatts:10000, efficiency:0.96, warrantyYears:5, origin:'China', phase:'1P', voltageClass:'LV (48V)', maxPVInputKWp:16.0, mpptCount:4, maxChargeCurrent:200, source:'Solargen Technologies (CONFIRMED)' },
  { id:'inv-solis-12k-lv', category:'inverter', brand:'Solis', model:'S6-EH1P12K03-NV-YD-L', specifications:'12kW 1P LV Hybrid, 4 MPPT, 240A', costKSh:276000, costUSD:2165, unit:'pcs', ratingWatts:12000, efficiency:0.96, warrantyYears:5, origin:'China', phase:'1P', voltageClass:'LV (48V)', maxPVInputKWp:19.2, mpptCount:4, maxChargeCurrent:240, source:'Solargen Technologies (CONFIRMED)' },
  { id:'inv-solis-16k-lv', category:'inverter', brand:'Solis', model:'S6-EH1P16K03-NV-YD-L', specifications:'16kW 1P LV Hybrid, 4 MPPT, 240A', costKSh:318000, costUSD:2494, unit:'pcs', ratingWatts:16000, efficiency:0.96, warrantyYears:5, origin:'China', phase:'1P', voltageClass:'LV (48V)', maxPVInputKWp:25.6, mpptCount:4, maxChargeCurrent:240, source:'Solargen Technologies (CONFIRMED)' },
  // Solis LV 3-Phase
  { id:'inv-solis-10k-lv-3p', category:'inverter', brand:'Solis', model:'S6-EH3P10K02-NV-YD-L', specifications:'10kW 3P LV Hybrid, 4 MPPT, 200A', costKSh:282000, costUSD:2212, unit:'pcs', ratingWatts:10000, efficiency:0.96, warrantyYears:5, origin:'China', phase:'3P', voltageClass:'LV (48V)', maxPVInputKWp:16.0, mpptCount:4, maxChargeCurrent:200, source:'Solargen Technologies (CONFIRMED)' },
  { id:'inv-solis-12k-lv-3p', category:'inverter', brand:'Solis', model:'S6-EH3P12K02-NV-YD-L', specifications:'12kW 3P LV Hybrid, 4 MPPT, 240A', costKSh:294000, costUSD:2306, unit:'pcs', ratingWatts:12000, efficiency:0.96, warrantyYears:5, origin:'China', phase:'3P', voltageClass:'LV (48V)', maxPVInputKWp:19.2, mpptCount:4, maxChargeCurrent:240, source:'Solargen Technologies (CONFIRMED)' },
  { id:'inv-solis-15k-lv-3p', category:'inverter', brand:'Solis', model:'S6-EH3P15K02-NV-YD-L', specifications:'15kW 3P LV Hybrid, 4 MPPT, 240A', costKSh:308400, costUSD:2419, unit:'pcs', ratingWatts:15000, efficiency:0.96, warrantyYears:5, origin:'China', phase:'3P', voltageClass:'LV (48V)', maxPVInputKWp:24.0, mpptCount:4, maxChargeCurrent:240, source:'Solargen Technologies (CONFIRMED)' },
  // ---- SOLIS HV (150-850V) ----
  { id:'inv-solis-5k-hv', category:'inverter', brand:'Solis', model:'S6-EH1P5K-H', specifications:'5kW 1P HV Hybrid, 3 MPPT, 25A', costKSh:180000, costUSD:1412, unit:'pcs', ratingWatts:5000, efficiency:0.97, warrantyYears:5, origin:'China', phase:'1P', voltageClass:'HV (150-850V)', maxPVInputKWp:7.5, mpptCount:3, maxChargeCurrent:25, source:'Regional HV benchmark' },
  { id:'inv-solis-7.6k-hv', category:'inverter', brand:'Solis', model:'S6-EH1P7.6K-H', specifications:'7.6kW 1P HV Hybrid, 3 MPPT, 25A', costKSh:215000, costUSD:1686, unit:'pcs', ratingWatts:7600, efficiency:0.97, warrantyYears:5, origin:'China', phase:'1P', voltageClass:'HV (150-850V)', maxPVInputKWp:11.4, mpptCount:3, maxChargeCurrent:25, source:'Regional HV benchmark' },
  { id:'inv-solis-10k-hv', category:'inverter', brand:'Solis', model:'S6-EH1P10K-H', specifications:'10kW 1P HV Hybrid, 4 MPPT, 35A', costKSh:260000, costUSD:2039, unit:'pcs', ratingWatts:10000, efficiency:0.97, warrantyYears:5, origin:'China', phase:'1P', voltageClass:'HV (150-850V)', maxPVInputKWp:15.0, mpptCount:4, maxChargeCurrent:35, source:'Regional HV benchmark' },
  { id:'inv-solis-11.4k-hv', category:'inverter', brand:'Solis', model:'S6-EH1P11.4K-H', specifications:'11.4kW 1P HV Hybrid, 4 MPPT, 35A', costKSh:280000, costUSD:2196, unit:'pcs', ratingWatts:11400, efficiency:0.97, warrantyYears:5, origin:'China', phase:'1P', voltageClass:'HV (150-850V)', maxPVInputKWp:17.1, mpptCount:4, maxChargeCurrent:35, source:'Regional HV benchmark' },
  { id:'inv-solis-5k-hv-3p', category:'inverter', brand:'Solis', model:'S6-EH3P5K-H', specifications:'5kW 3P HV Hybrid, 3 MPPT, 25A', costKSh:195000, costUSD:1529, unit:'pcs', ratingWatts:5000, efficiency:0.97, warrantyYears:5, origin:'China', phase:'3P', voltageClass:'HV (150-850V)', maxPVInputKWp:10.0, mpptCount:3, maxChargeCurrent:25, source:'Regional HV benchmark' },
  { id:'inv-solis-8k-hv-3p', category:'inverter', brand:'Solis', model:'S6-EH3P8K-H', specifications:'8kW 3P HV Hybrid, 4 MPPT, 35A', costKSh:245000, costUSD:1922, unit:'pcs', ratingWatts:8000, efficiency:0.97, warrantyYears:5, origin:'China', phase:'3P', voltageClass:'HV (150-850V)', maxPVInputKWp:16.0, mpptCount:4, maxChargeCurrent:35, source:'Regional HV benchmark' },
  { id:'inv-solis-10k-hv-3p', category:'inverter', brand:'Solis', model:'S6-EH3P10K-H', specifications:'10kW 3P HV Hybrid, 4 MPPT, 35A', costKSh:204000, costUSD:1600, unit:'pcs', ratingWatts:10000, efficiency:0.97, warrantyYears:5, origin:'China', phase:'3P', voltageClass:'HV (150-850V)', maxPVInputKWp:20.0, mpptCount:4, maxChargeCurrent:35, source:'Solargen Technologies (confirmed)' },
  { id:'inv-solis-15k-hv-3p', category:'inverter', brand:'Solis', model:'S6-EH3P15K-H', specifications:'15kW 3P HV Hybrid, 4 MPPT, 50A', costKSh:246000, costUSD:1929, unit:'pcs', ratingWatts:15000, efficiency:0.97, warrantyYears:5, origin:'China', phase:'3P', voltageClass:'HV (150-850V)', maxPVInputKWp:30.0, mpptCount:4, maxChargeCurrent:50, source:'Solargen Technologies (confirmed)' },
  { id:'inv-solis-20k-hv-3p', category:'inverter', brand:'Solis', model:'S6-EH3P20K-H', specifications:'20kW 3P HV Hybrid, 4 MPPT, 50A', costKSh:294000, costUSD:2306, unit:'pcs', ratingWatts:20000, efficiency:0.97, warrantyYears:5, origin:'China', phase:'3P', voltageClass:'HV (150-850V)', maxPVInputKWp:40.0, mpptCount:4, maxChargeCurrent:50, source:'Solargen Technologies (confirmed)' },
  { id:'inv-solis-30k-hv-3p', category:'inverter', brand:'Solis', model:'S6-EH3P30K-H', specifications:'30kW 3P HV Hybrid, 4 MPPT, 70A', costKSh:552000, costUSD:4330, unit:'pcs', ratingWatts:30000, efficiency:0.97, warrantyYears:5, origin:'China', phase:'3P', voltageClass:'HV (150-850V)', maxPVInputKWp:60.0, mpptCount:4, maxChargeCurrent:70, source:'Solargen Technologies (confirmed)' },
  { id:'inv-solis-40k-hv-3p', category:'inverter', brand:'Solis', model:'S6-EH3P40K-H', specifications:'40kW 3P HV Hybrid, 4 MPPT, 70A', costKSh:560000, costUSD:4392, unit:'pcs', ratingWatts:40000, efficiency:0.97, warrantyYears:5, origin:'China', phase:'3P', voltageClass:'HV (150-850V)', maxPVInputKWp:80.0, mpptCount:4, maxChargeCurrent:70, source:'Regional HV benchmark' },
  { id:'inv-solis-50k-hv-3p', category:'inverter', brand:'Solis', model:'S6-EH3P50K-H', specifications:'50kW 3P HV Hybrid, 4 MPPT, 70A', costKSh:708000, costUSD:5553, unit:'pcs', ratingWatts:50000, efficiency:0.97, warrantyYears:5, origin:'China', phase:'3P', voltageClass:'HV (150-850V)', maxPVInputKWp:100.0, mpptCount:4, maxChargeCurrent:70, source:'Solargen Technologies (confirmed)' },

  // ---- JINKO LV Hybrids ----
  { id:'inv-jinko-3.6k-lv', category:'inverter', brand:'Jinko', model:'JKS-3.6K-SG03LP1-EU', specifications:'3.6kW 1P LV Hybrid, 2 MPPT, 80A', costKSh:87000, costUSD:682, unit:'pcs', ratingWatts:3600, efficiency:0.96, warrantyYears:5, origin:'China', phase:'1P', voltageClass:'LV (48V)', maxPVInputKWp:5.4, mpptCount:2, maxChargeCurrent:80, source:'Megawatt Energies (CONFIRMED platinum-tier)' },
  { id:'inv-jinko-5k-lv', category:'inverter', brand:'Jinko', model:'JKS-5K-SG03LP1-EU', specifications:'5kW 1P LV Hybrid, 2 MPPT, 110A', costKSh:149500, costUSD:1173, unit:'pcs', ratingWatts:5000, efficiency:0.96, warrantyYears:5, origin:'China', phase:'1P', voltageClass:'LV (48V)', maxPVInputKWp:7.5, mpptCount:2, maxChargeCurrent:110, source:'Solargen Technologies (CONFIRMED)' },
  { id:'inv-jinko-8k-lv', category:'inverter', brand:'Jinko', model:'Jinko 8K SP Hybrid LV', specifications:'8kW 1P LV Hybrid, 2 MPPT, 160A', costKSh:180000, costUSD:1412, unit:'pcs', ratingWatts:8000, efficiency:0.96, warrantyYears:5, origin:'China', phase:'1P', voltageClass:'LV (48V)', maxPVInputKWp:12.0, mpptCount:2, maxChargeCurrent:160, source:'Megawatt Energies (CONFIRMED platinum-tier)' },
  { id:'inv-jinko-8k-lv-3p', category:'inverter', brand:'Jinko', model:'Jinko 8K TP Hybrid LV', specifications:'8kW 3P LV Hybrid, 2 MPPT, 160A', costKSh:276000, costUSD:2165, unit:'pcs', ratingWatts:8000, efficiency:0.96, warrantyYears:5, origin:'China', phase:'3P', voltageClass:'LV (48V)', maxPVInputKWp:12.0, mpptCount:2, maxChargeCurrent:160, source:'Solargen Technologies (CONFIRMED)' },
  { id:'inv-jinko-10k-lv-3p', category:'inverter', brand:'Jinko', model:'Jinko 10K TP Hybrid LV', specifications:'10kW 3P LV Hybrid, 2 MPPT, 200A', costKSh:260000, costUSD:2039, unit:'pcs', ratingWatts:10000, efficiency:0.96, warrantyYears:5, origin:'China', phase:'3P', voltageClass:'LV (48V)', maxPVInputKWp:15.0, mpptCount:2, maxChargeCurrent:200, source:'Megawatt Energies (CONFIRMED platinum-tier)' },
  { id:'inv-jinko-12k-lv-3p', category:'inverter', brand:'Jinko', model:'Jinko 12K TP Hybrid LV', specifications:'12kW 3P LV Hybrid, 2 MPPT, 240A', costKSh:310500, costUSD:2435, unit:'pcs', ratingWatts:12000, efficiency:0.96, warrantyYears:5, origin:'China', phase:'3P', voltageClass:'LV (48V)', maxPVInputKWp:18.0, mpptCount:2, maxChargeCurrent:240, source:'Solargen Technologies' },

  // ---- DEYE Microinverters (Section F) ----
  { id:'inv-deye-m60', category:'microinverter', brand:'Deye', model:'SUN-M60G4-EU-Q0', specifications:'600W AC Microinverter, 2 panels/unit, max 420W/panel', costKSh:15200, costUSD:119, unit:'pcs', ratingWatts:600, efficiency:0.965, warrantyYears:10, origin:'China', maxPVInputKWp:0.84, source:'Deye microinverter catalog' },
  { id:'inv-deye-m80', category:'microinverter', brand:'Deye', model:'SUN-M80G4-EU-Q0', specifications:'800W AC Microinverter, 2 panels/unit, max 550W/panel', costKSh:19200, costUSD:151, unit:'pcs', ratingWatts:800, efficiency:0.965, warrantyYears:10, origin:'China', maxPVInputKWp:1.1, source:'Deye microinverter catalog' },
  { id:'inv-deye-m100', category:'microinverter', brand:'Deye', model:'SUN-M100G4-EU-Q0', specifications:'1000W AC Microinverter, 2 panels/unit, max 650W/panel', costKSh:23800, costUSD:187, unit:'pcs', ratingWatts:1000, efficiency:0.965, warrantyYears:10, origin:'China', maxPVInputKWp:1.3, source:'Deye microinverter catalog' },
];

// ========== 2. PANEL DATABASE (Jinko Solar, May 2026) ==========
export const PANEL_CATALOG: HardwareComponent[] = [
  { id:'panel-jinko-450', category:'panel', brand:'Jinko Solar', model:'Jinko 450W Mono PERC', specifications:'450W Mono PERC, Half-Cell', costKSh:9200, costUSD:72, unit:'pcs', ratingWatts:450, efficiency:0.205, warrantyYears:25, origin:'China', source:'SolarPanelsShop Kenya (confirmed)' },
  { id:'panel-jinko-580', category:'panel', brand:'Jinko Solar', model:'Jinko 580W N-Type/TOPCon', specifications:'580W N-Type TOPCon, Bifacial', costKSh:10500, costUSD:82, unit:'pcs', ratingWatts:580, efficiency:0.215, warrantyYears:25, origin:'China', source:'SolarShop Africa Kenya (confirmed)' },
  { id:'panel-jinko-620', category:'panel', brand:'Jinko Solar', model:'Jinko 620W N-Type/TOPCon Bifacial', specifications:'620W N-Type TOPCon, Bifacial, Half-Cell', costKSh:11900, costUSD:93, unit:'pcs', ratingWatts:620, efficiency:0.22, warrantyYears:25, origin:'China', source:'SolarShop Africa Kenya (confirmed)' },
  { id:'panel-jinko-615', category:'panel', brand:'Jinko Solar', model:'Jinko 615W Bi-Facial Mono', specifications:'615W N-Type TOPCon, Bifacial', costKSh:14391, costUSD:113, unit:'pcs', ratingWatts:615, efficiency:0.219, warrantyYears:25, origin:'China', source:'Solargen Technologies (confirmed retail; dealer KSh11,070)' },
  { id:'panel-jinko-625', category:'panel', brand:'Jinko Solar', model:'Jinko 625W Bi-Facial Mono', specifications:'625W N-Type TOPCon, Bifacial', costKSh:14625, costUSD:115, unit:'pcs', ratingWatts:625, efficiency:0.223, warrantyYears:25, origin:'China', source:'Solargen Technologies (confirmed retail; dealer KSh11,250)' },
];

// ========== 3. BATTERY DATABASE (Dyness LiFePO4 + Alternatives) ==========
export const BATTERY_CATALOG: HardwareComponent[] = [
  // Dyness LV 48V Modules
  { id:'bat-dyness-dl5.0', category:'battery', brand:'Dyness', model:'B51100 / DL5.0C (LV 48V)', specifications:'5.12kWh LiFePO4, 48V, 100Ah, 1C discharge, parallel up to 50 units', costKSh:115264, costUSD:904, unit:'pcs', capacityKWh:5.12, efficiency:0.95, warrantyYears:10, origin:'China', source:'Roam Electric internal catalogue (confirmed June 2026)' },
  { id:'bat-dyness-dl2.5', category:'battery', brand:'Dyness', model:'DL2.5 (LV 25.6V)', specifications:'2.56kWh LiFePO4, 25.6V, 100Ah, 1.3C discharge', costKSh:50509, costUSD:396, unit:'pcs', capacityKWh:2.56, efficiency:0.95, warrantyYears:10, origin:'China', source:'Roam Electric internal catalogue (confirmed)' },
  // Dyness HV Stack100
  { id:'bat-dyness-stack100-mod', category:'battery', brand:'Dyness', model:'Stack100 (S51100) HV Module', specifications:'5.12kWh LiFePO4, 51.2V/module, stack 3-15 modules/tower (15.36-76.8kWh)', costKSh:132500, costUSD:1039, unit:'pcs', capacityKWh:5.12, efficiency:0.96, warrantyYears:10, origin:'China', source:'SolarShop Africa Kenya (confirmed)' },
  { id:'bat-dyness-bdu', category:'accessory', brand:'Dyness', model:'BDU (Battery Distribution Unit)', specifications:'Required per Stack100/Stack280 tower for BMS communication', costKSh:95000, costUSD:745, unit:'pcs', warrantyYears:5, origin:'China', source:'SolarShop Africa Kenya (confirmed)' },
  // Dyness Stack280 HV
  { id:'bat-dyness-stack280-0.7c', category:'battery', brand:'Dyness', model:'Stack280 HV 0.7C Module', specifications:'14.3kWh LiFePO4, 51.2V/module, 0.7C discharge, stack 3-15 modules/tower', costKSh:288877, costUSD:2266, unit:'pcs', capacityKWh:14.3, efficiency:0.96, warrantyYears:10, origin:'China', source:'Roam Electric + Raynow Energy (confirmed, 0.7C tier)' },
  { id:'bat-dyness-stack280-0.5c', category:'battery', brand:'Dyness', model:'Stack280 HV 0.5C Module', specifications:'14.3kWh LiFePO4, 0.5C discharge', costKSh:292878, costUSD:2297, unit:'pcs', capacityKWh:14.3, efficiency:0.96, warrantyYears:10, origin:'China', source:'Roam Electric (confirmed)' },
  { id:'bat-dyness-stack280-1c', category:'battery', brand:'Dyness', model:'Stack280 HV 1C Module', specifications:'14.3kWh LiFePO4, 1C discharge', costKSh:270840, costUSD:2124, unit:'pcs', capacityKWh:14.3, efficiency:0.96, warrantyYears:10, origin:'China', source:'Roam Electric + Raynow Energy (confirmed)' },
  // Dyness Pre-Assembled Towers
  { id:'bat-dyness-tower-t7', category:'battery', brand:'Dyness', model:'Tower T7', specifications:'7.1kWh complete tower, 192V', costKSh:350000, costUSD:2745, unit:'pcs', capacityKWh:7.1, efficiency:0.96, warrantyYears:10, origin:'China', source:'Regional/EU benchmark (converted)' },
  { id:'bat-dyness-tower-t10', category:'battery', brand:'Dyness', model:'Tower T10', specifications:'10.66kWh complete tower, 288V', costKSh:500000, costUSD:3922, unit:'pcs', capacityKWh:10.66, efficiency:0.96, warrantyYears:10, origin:'China', source:'Regional/EU benchmark (converted)' },
  { id:'bat-dyness-tower-t14', category:'battery', brand:'Dyness', model:'Tower T14', specifications:'14.21kWh complete tower, 384V', costKSh:650000, costUSD:5098, unit:'pcs', capacityKWh:14.21, efficiency:0.96, warrantyYears:10, origin:'China', source:'Regional/EU benchmark (converted)' },
  { id:'bat-dyness-tower-t21', category:'battery', brand:'Dyness', model:'Tower T21', specifications:'21.31kWh complete tower, 576V', costKSh:950000, costUSD:7451, unit:'pcs', capacityKWh:21.31, efficiency:0.96, warrantyYears:10, origin:'China', source:'Regional/EU benchmark (converted)' },
  // Alternative brands
  { id:'bat-maqbul-5.12', category:'battery', brand:'Maqbul', model:'Lithium Battery LV 5.12kWh 100Ah', specifications:'5.12kWh LiFePO4, 48V, 100Ah', costKSh:111800, costUSD:877, unit:'pcs', capacityKWh:5.12, efficiency:0.95, warrantyYears:5, origin:'Various', source:'Solargen Technologies (CONFIRMED retail)' },
  { id:'bat-maqbul-14.3', category:'battery', brand:'Maqbul', model:'Lithium Battery LV 14.3kWh 288Ah', specifications:'14.3kWh LiFePO4, 48V, single large module', costKSh:247000, costUSD:1937, unit:'pcs', capacityKWh:14.3, efficiency:0.95, warrantyYears:5, origin:'Various', source:'Solargen Technologies (CONFIRMED retail)' },
  { id:'bat-jinko-4.8', category:'battery', brand:'Jinko', model:'Battery 4.8kWh 48V 100Ah', specifications:'4.8kWh LiFePO4, 48V, 100Ah', costKSh:141600, costUSD:1111, unit:'pcs', capacityKWh:4.8, efficiency:0.95, warrantyYears:5, origin:'China', source:'Solargen Technologies (CONFIRMED retail)' },
];

// ========== 4. BOS RATES (Balance of System, Nairobi Market May 2026) ==========
export interface BOSItem {
  id: string;
  section: string;
  item: string;
  basis: string;
  rateKSh: number;
  rateUSD: number;
  minLotKSh: number;
  source: string;
}

export const BOS_RATES: BOSItem[] = [
  { id:'bos-mounting', section:'4. Mounting', item:'Aluminium ground/roof-mount racking system', basis:'per kWp DC', rateKSh:14000, rateUSD:110, minLotKSh:14000, source:'Solar Store East Africa' },
  { id:'bos-mc4', section:'5. DC BOS', item:'MC4 connectors, branch/Y-connectors and crimping', basis:'per kWp DC', rateKSh:250, rateUSD:2, minLotKSh:15000, source:'Solar Store East Africa' },
  { id:'bos-dc-combiner', section:'5. DC BOS', item:'PV DC combiner box with DC MCBs and string fusing', basis:'per inverter unit', rateKSh:75000, rateUSD:588, minLotKSh:75000, source:'Solar Store East Africa' },
  { id:'bos-dc-spd', section:'5. DC BOS', item:'DC Surge Protection Device (SPD), Type II, for PV array', basis:'per inverter unit', rateKSh:18000, rateUSD:141, minLotKSh:18000, source:'Solar Store East Africa' },
  { id:'bos-ac-cable', section:'6. AC BOS', item:'AC output cable (inverter to DB) - engineered per Cable Sizing', basis:'per m (see cable table)', rateKSh:665, rateUSD:5.2, minLotKSh:0, source:'Cable Sizing sheet' },
  { id:'bos-ats', section:'6. AC BOS', item:'Automatic Transfer Switch (ATS) / changeover switch', basis:'per system (lot)', rateKSh:145000, rateUSD:1137, minLotKSh:145000, source:'Solar Store East Africa' },
  { id:'bos-mccb', section:'6. AC BOS', item:'3-Phase MCCBs (main inverter output, grid-tie, load breakers)', basis:'per inverter unit', rateKSh:75000, rateUSD:588, minLotKSh:75000, source:'Solar Store East Africa' },
  { id:'bos-ac-spd', section:'6. AC BOS', item:'AC Surge Protection Device (SPD), Type II, distribution board', basis:'per system (lot)', rateKSh:22000, rateUSD:173, minLotKSh:22000, source:'Solar Store East Africa' },
  { id:'bos-earthing', section:'7. Earthing', item:'Earthing system - rods, bars, copper tape bonding', basis:'per system (lot)', rateKSh:65000, rateUSD:510, minLotKSh:65000, source:'Kenyan electrical code' },
  { id:'bos-trays', section:'7. Earthing', item:'Cable trays, trunking, conduits and ducting', basis:'per system (lot)', rateKSh:60000, rateUSD:471, minLotKSh:60000, source:'Solar Store East Africa' },
  { id:'bos-battery-rack', section:'2. Storage', item:'Battery rack / enclosure / base stand', basis:'per battery tower', rateKSh:45000, rateUSD:353, minLotKSh:45000, source:'Solar Store East Africa' },
  { id:'bos-gen-avs', section:'8. Gen Interface', item:'Generator AVS/auto-start interface', basis:'per system (lot, optional)', rateKSh:75000, rateUSD:588, minLotKSh:75000, source:'Solar Store East Africa' },
  { id:'bos-enclosure', section:'8. Gen Interface', item:'Outdoor weatherproof enclosure IP55/NEMA 3R', basis:'per system (lot, optional)', rateKSh:180000, rateUSD:1412, minLotKSh:180000, source:'Solar Store East Africa' },
  { id:'bos-fire', section:'8. Gen Interface', item:'Fire safety provision (extinguisher, signage)', basis:'per system (lot, optional)', rateKSh:15000, rateUSD:118, minLotKSh:15000, source:'Battery safety supplement' },
  { id:'bos-transport', section:'9. Install', item:'Transport and delivery of equipment to site (Nairobi)', basis:'per system (lot)', rateKSh:45000, rateUSD:353, minLotKSh:45000, source:'Solar Store East Africa' },
  { id:'bos-kplc', section:'10. Grid', item:'KPLC net-metering/interconnection application support', basis:'per system (lot, optional)', rateKSh:50000, rateUSD:392, minLotKSh:50000, source:'Only if grid export intended' },
  { id:'bos-oandm', section:'10. Grid', item:'First-year Operations & Maintenance (quarterly visits)', basis:'per year (optional)', rateKSh:120000, rateUSD:941, minLotKSh:120000, source:'Optional annual service contract' },
  { id:'bos-dc-isolator', section:'5. DC BOS', item:'DC Isolator switch (PV array or battery-side disconnect)', basis:'per inverter unit', rateKSh:4080, rateUSD:32, minLotKSh:4080, source:'Suntree 4P 32A 1000VDC, Megawatt confirmed' },
  { id:'bos-epm-meter', section:'10. Grid', item:'EPM Meter (export/import metering, 3-phase with CTs)', basis:'per system', rateKSh:26680, rateUSD:209, minLotKSh:26680, source:'Acrel 3-phase, Megawatt confirmed' },
  { id:'bos-monitoring', section:'3. Inverter', item:'Wi-Fi/LAN monitoring dongle and cloud configuration', basis:'per inverter unit', rateKSh:18000, rateUSD:141, minLotKSh:18000, source:'Remote monitoring, firmware updates' },
];

// Battery Cabinet Size Table (Suntree via Megawatt, for LV48 slot-aware sizing)
export const BATTERY_CABINET_SIZES: { slots: number; costKSh: number; costUSD: number }[] = [
  { slots: 2, costKSh: 29500, costUSD: 231 },
  { slots: 4, costKSh: 37120, costUSD: 291 },
  { slots: 6, costKSh: 52600, costUSD: 413 },
  { slots: 8, costKSh: 75400, costUSD: 591 },
  { slots: 10, costKSh: 98600, costUSD: 773 },
  { slots: 12, costKSh: 127600, costUSD: 1001 },
  { slots: 14, costKSh: 156600, costUSD: 1228 },
  { slots: 16, costKSh: 179800, costUSD: 1410 },
];

// ========== 5. IEC 60364-5-52 CABLE REFERENCE TABLE ==========
export interface CableSpec {
  sizeMM2: number;
  ampacityA: number; // PVC-insulated copper, Method C, 30°C ambient
  mVperAm: number;   // mV drop per amp per meter
  dcPricePerM: number; // KSh/m DC single-core
  acPricePerM: number; // KSh/m AC multi-core (DC x 1.7)
}

export const CABLE_REFERENCE: CableSpec[] = [
  { sizeMM2: 1.5, ampacityA: 19.5, mVperAm: 29.0, dcPricePerM: 58, acPricePerM: 99 },
  { sizeMM2: 2.5, ampacityA: 27.0, mVperAm: 18.0, dcPricePerM: 88, acPricePerM: 150 },
  { sizeMM2: 4.0, ampacityA: 36.0, mVperAm: 11.0, dcPricePerM: 95, acPricePerM: 162 },
  { sizeMM2: 6.0, ampacityA: 46.0, mVperAm: 7.3, dcPricePerM: 140, acPricePerM: 238 },
  { sizeMM2: 10.0, ampacityA: 63.0, mVperAm: 4.4, dcPricePerM: 268, acPricePerM: 456 },
  { sizeMM2: 16.0, ampacityA: 85.0, mVperAm: 2.8, dcPricePerM: 391, acPricePerM: 665 },
  { sizeMM2: 25.0, ampacityA: 112.0, mVperAm: 1.75, dcPricePerM: 754, acPricePerM: 1282 },
  { sizeMM2: 35.0, ampacityA: 138.0, mVperAm: 1.25, dcPricePerM: 1508, acPricePerM: 2564 },
  { sizeMM2: 50.0, ampacityA: 168.0, mVperAm: 0.93, dcPricePerM: 977, acPricePerM: 1661 },
  { sizeMM2: 70.0, ampacityA: 213.0, mVperAm: 0.63, dcPricePerM: 1281, acPricePerM: 2178 },
  { sizeMM2: 95.0, ampacityA: 258.0, mVperAm: 0.46, dcPricePerM: 1637, acPricePerM: 2783 },
  { sizeMM2: 120.0, ampacityA: 299.0, mVperAm: 0.37, dcPricePerM: 1975, acPricePerM: 3358 },
  { sizeMM2: 150.0, ampacityA: 344.0, mVperAm: 0.30, dcPricePerM: 2363, acPricePerM: 4017 },
  { sizeMM2: 185.0, ampacityA: 392.0, mVperAm: 0.24, dcPricePerM: 2797, acPricePerM: 4755 },
  { sizeMM2: 240.0, ampacityA: 461.0, mVperAm: 0.18, dcPricePerM: 3448, acPricePerM: 5862 },
  { sizeMM2: 300.0, ampacityA: 530.0, mVperAm: 0.15, dcPricePerM: 4125, acPricePerM: 7013 },
];

// ========== 6. SOLAR LOCATIONS (East Africa Focus) ==========
export const SOLAR_LOCATIONS: SolarLocation[] = [
  {
    id: 'loc-nairobi',
    name: 'Nairobi',
    country: 'Kenya',
    peakSunHours: 5.4,
    monthlyIrradiance: [5.8, 6.1, 5.9, 5.2, 4.6, 4.3, 4.1, 4.4, 5.3, 5.6, 5.1, 5.3],
    gridTariffKSh: 28.6, gridTariffUSD: 0.22,
    gridFeedInTariffKSh: 10.4, gridFeedInTariffUSD: 0.08,
    gridReliability: 88,
    outageHoursPerDay: 2.5,
    co2Intensity: 0.12
  },
  {
    id: 'loc-johannesburg',
    name: 'Johannesburg',
    country: 'South Africa',
    peakSunHours: 5.8,
    monthlyIrradiance: [6.5, 6.0, 5.5, 5.0, 4.5, 4.2, 4.4, 5.1, 5.9, 6.2, 6.3, 6.4],
    gridTariffKSh: 23.4, gridTariffUSD: 0.18,
    gridFeedInTariffKSh: 7.8, gridFeedInTariffUSD: 0.06,
    gridReliability: 75,
    outageHoursPerDay: 4.0,
    co2Intensity: 0.95
  },
  {
    id: 'loc-lagos',
    name: 'Lagos',
    country: 'Nigeria',
    peakSunHours: 4.6,
    monthlyIrradiance: [5.2, 5.4, 5.1, 4.8, 4.5, 3.8, 3.4, 3.5, 3.9, 4.4, 4.8, 5.0],
    gridTariffKSh: 31.2, gridTariffUSD: 0.24,
    gridFeedInTariffKSh: 0, gridFeedInTariffUSD: 0.0,
    gridReliability: 35,
    outageHoursPerDay: 12.0,
    co2Intensity: 0.62
  },
  {
    id: 'loc-cairo',
    name: 'Cairo',
    country: 'Egypt',
    peakSunHours: 6.2,
    monthlyIrradiance: [4.1, 4.9, 5.8, 6.8, 7.5, 8.1, 8.0, 7.4, 6.6, 5.4, 4.4, 3.8],
    gridTariffKSh: 14.3, gridTariffUSD: 0.11,
    gridFeedInTariffKSh: 5.2, gridFeedInTariffUSD: 0.04,
    gridReliability: 95,
    outageHoursPerDay: 0.5,
    co2Intensity: 0.53
  },
  {
    id: 'loc-riyadh',
    name: 'Riyadh',
    country: 'Saudi Arabia',
    peakSunHours: 6.4,
    monthlyIrradiance: [4.5, 5.3, 6.0, 6.8, 7.6, 8.2, 8.1, 7.8, 7.2, 6.1, 5.0, 4.2],
    gridTariffKSh: 10.4, gridTariffUSD: 0.08,
    gridFeedInTariffKSh: 3.9, gridFeedInTariffUSD: 0.03,
    gridReliability: 99.5,
    outageHoursPerDay: 0.0,
    co2Intensity: 0.68
  }
];

// ========== 7. LOAD PROFILE PRESETS ==========
export const LOAD_PROFILES: LoadProfilePreset[] = [
  {
    id: 'profile-residential-med',
    name: 'Residential (Standard Family)',
    description: 'Double peak load: morning before work (7am-9am) and evening cooking/entertainment (6pm-10pm). Low daytime load.',
    baseHourlyLoadKW: [
      0.6, 0.5, 0.4, 0.4, 0.5, 0.8, 1.8, 3.2, 2.8, 1.2, 0.8, 0.8,
      0.9, 0.8, 0.7, 0.9, 1.2, 2.5, 4.2, 4.8, 3.9, 2.5, 1.2, 0.8
    ],
    totalDailyKWh: 37.8
  },
  {
    id: 'profile-commercial-clinic',
    name: 'Commercial Day Clinic / Office',
    description: 'High day-time operation load (8am-5pm) matching peak solar hours.',
    baseHourlyLoadKW: [
      1.2, 1.2, 1.1, 1.1, 1.2, 2.0, 4.5, 8.2, 12.5, 14.8, 15.2, 14.5,
      15.0, 14.8, 14.2, 12.8, 8.5, 4.0, 2.5, 2.0, 1.8, 1.5, 1.3, 1.2
    ],
    totalDailyKWh: 161.7
  },
  {
    id: 'profile-industrial-light',
    name: 'Light Industrial / Cold Storage',
    description: 'Constant refrigeration base load (20kW) with high operational spikes during factory shift hours (7am-4pm).',
    baseHourlyLoadKW: [
      18.0, 18.0, 18.0, 18.0, 19.0, 22.0, 35.0, 52.0, 65.0, 70.0, 72.0, 68.0,
      70.0, 68.0, 65.0, 48.0, 25.0, 20.0, 19.0, 18.0, 18.0, 18.0, 18.0, 18.0
    ],
    totalDailyKWh: 898.0
  },
  {
    id: 'profile-eco-lodge',
    name: 'Off-Grid Eco-Lodge / Hospitality',
    description: 'Moderate day-time load, heavy evening loads (6pm-11pm) for lighting, laundry, heating, and catering.',
    baseHourlyLoadKW: [
      2.5, 2.2, 2.0, 2.0, 2.2, 3.5, 6.0, 8.5, 6.2, 5.0, 4.8, 5.2,
      5.5, 5.8, 6.0, 7.5, 10.2, 14.5, 18.0, 19.5, 15.0, 8.0, 4.5, 3.0
    ],
    totalDailyKWh: 166.1
  }
];

// ========== 8. LEGACY COMPATIBILITY: Combined HARDWARE_CATALOG ==========
export const HARDWARE_CATALOG: HardwareComponent[] = [
  ...PANEL_CATALOG,
  ...INVERTER_CATALOG.filter(c => c.category === 'inverter'),
  ...BATTERY_CATALOG,
  // Legacy BOS items preserved for backward compatibility
  { id:'bos-mount-pitched', category:'bos', brand:'SafariCharge', model:'Pitched Roof Aluminium Mount', specifications:'Per panel rails/clamps', costKSh:2800, costUSD:22, unit:'panel_qty', warrantyYears:10, origin:'Local' },
  { id:'bos-mount-flat', category:'bos', brand:'SafariCharge', model:'Flat Roof Ballasted Bracket', specifications:'15° tilt, per panel', costKSh:4800, costUSD:38, unit:'panel_qty', warrantyYears:10, origin:'Local' },
  { id:'bos-mount-ground', category:'bos', brand:'SafariCharge', model:'Ground Mount A-Frame', specifications:'Galvanized steel, per panel', costKSh:8300, costUSD:65, unit:'panel_qty', warrantyYears:15, origin:'Local' },
  { id:'bos-cabling-res', category:'bos', brand:'Generic Solar', model:'Residential DC/AC BOS Kit', specifications:'Cable, MC4, combiner box, SPD', costKSh:57500, costUSD:450, unit:'project', warrantyYears:5, origin:'Various' },
  { id:'bos-cabling-comm', category:'bos', brand:'Generic Solar', model:'Commercial DC/AC Distribution Board', specifications:'Heavy trunking, AC sub-board, SPDs', costKSh:229500, costUSD:1800, unit:'project', warrantyYears:5, origin:'Various' },
  { id:'srv-epc-res', category:'service', brand:'SafariCharge', model:'Residential EPC Installation Labor', specifications:'Roof rigging, wiring, commissioning', costKSh:121000, costUSD:950, unit:'project', warrantyYears:1, origin:'Local' },
  { id:'srv-epc-comm', category:'service', brand:'SafariCharge', model:'Commercial EPC Installation Labor', specifications:'Commercial crew, crane, grid connection', costKSh:612000, costUSD:4800, unit:'project', warrantyYears:2, origin:'Local' },
  { id:'srv-engineering-design', category:'service', brand:'SafariCharge', model:'Engineering & SLD Design', specifications:'CAD Layouts, SLDs, structural calcs', costKSh:51000, costUSD:400, unit:'project', warrantyYears:1, origin:'Local' },
];

// ========== 9. PROJECT PRESETS ==========
export interface ProjectPreset {
  name: string;
  clientName: string;
  locationId: string;
  loadProfileId: string;
  loadMultiplier: number;
  targetAutonomyHours: number;
  availableRoofSpaceM2: number;
  selectedPanelId: string;
  selectedInverterId: string;
  selectedBatteryId: string;
  gridOutageSimulation: boolean;
  contingencyPercent: number;
  epcMarginPercent: number;
}

export const PROJECT_PRESETS: ProjectPreset[] = [
  {
    name: 'Lagos Medical Clinic Backup Solar',
    clientName: 'West-End Medical Center',
    locationId: 'loc-lagos',
    loadProfileId: 'profile-commercial-clinic',
    loadMultiplier: 1.0,
    targetAutonomyHours: 8,
    availableRoofSpaceM2: 250,
    selectedPanelId: 'panel-jinko-620',
    selectedInverterId: 'inv-deye-20k-hv',
    selectedBatteryId: 'bat-dyness-stack280-0.7c',
    gridOutageSimulation: true,
    contingencyPercent: 5,
    epcMarginPercent: 18
  },
  {
    name: 'Joburg Cold Storage Peak Shaving',
    clientName: 'Vaal River Logistics Ltd',
    locationId: 'loc-johannesburg',
    loadProfileId: 'profile-industrial-light',
    loadMultiplier: 1.0,
    targetAutonomyHours: 4,
    availableRoofSpaceM2: 1200,
    selectedPanelId: 'panel-jinko-625',
    selectedInverterId: 'inv-solis-50k-hv-3p',
    selectedBatteryId: 'bat-dyness-stack280-1c',
    gridOutageSimulation: true,
    contingencyPercent: 3,
    epcMarginPercent: 12
  },
  {
    name: 'Nairobi Eco-Residential Solar PV',
    clientName: 'Dr. Amina Osei Residence',
    locationId: 'loc-nairobi',
    loadProfileId: 'profile-residential-med',
    loadMultiplier: 1.2,
    targetAutonomyHours: 6,
    availableRoofSpaceM2: 80,
    selectedPanelId: 'panel-jinko-580',
    selectedInverterId: 'inv-solis-8k-lv',
    selectedBatteryId: 'bat-dyness-dl5.0',
    gridOutageSimulation: true,
    contingencyPercent: 5,
    epcMarginPercent: 20
  }
];

// ========== 10. QUOTE HISTORY ==========
export interface QuoteHistoryItem {
  id: string;
  projectName: string;
  clientName: string;
  location: string;
  systemSizeKW: number;
  batteryKWh: number;
  capexKSh: number;
  capexUSD: number;
  paybackYears: number;
  dateCreated: string;
  engineer: string;
}

export const MOCK_QUOTE_HISTORY: QuoteHistoryItem[] = [
  {
    id: 'quote-2026-001',
    projectName: 'Karen Suburb Villa Hybrid',
    clientName: 'Charles Njonjo',
    location: 'Nairobi, Kenya',
    systemSizeKW: 11.5,
    batteryKWh: 19.2,
    capexKSh: 2150000,
    capexUSD: 16850,
    paybackYears: 5.4,
    dateCreated: 'May 12, 2026',
    engineer: 'Sarah Jenkins, Senior Modeler'
  },
  {
    id: 'quote-2026-002',
    projectName: 'Sandton Corporate Office Phase 1',
    clientName: 'Zenith Holdings SA',
    location: 'Johannesburg, South Africa',
    systemSizeKW: 150.0,
    batteryKWh: 120.0,
    capexKSh: 18150000,
    capexUSD: 142300,
    paybackYears: 4.8,
    dateCreated: 'May 18, 2026',
    engineer: 'Marcus Vance, Commercial Solar Lead'
  },
  {
    id: 'quote-2026-003',
    projectName: 'Ikeja Supermarket Emergency Power',
    clientName: 'ShopSmart Nigeria',
    location: 'Lagos, Nigeria',
    systemSizeKW: 45.0,
    batteryKWh: 88.4,
    capexKSh: 10050000,
    capexUSD: 78900,
    paybackYears: 3.2,
    dateCreated: 'May 22, 2026',
    engineer: 'Sarah Jenkins, Senior Modeler'
  }
];

// Panel datasheet electrical properties
export const PANEL_ELECTRICAL: Record<string, { vmp: number; isc: number; voc: number; imp: number }> = {
  'panel-jinko-450': { vmp: 41.5, isc: 11.2, voc: 49.8, imp: 10.84 },
  'panel-jinko-580': { vmp: 42.5, isc: 14.1, voc: 51.0, imp: 13.65 },
  'panel-jinko-620': { vmp: 45.79, isc: 14.25, voc: 54.95, imp: 13.54 },
  'panel-jinko-615': { vmp: 45.79, isc: 14.13, voc: 54.95, imp: 13.43 },
  'panel-jinko-625': { vmp: 45.79, isc: 14.37, voc: 54.95, imp: 13.65 },
};

// Exchange rate (May 2026): 1 USD ≈ 127.5 KSh
export const KSH_PER_USD = 127.5;

export function kshToUsd(ksh: number): number {
  return Math.round(ksh / KSH_PER_USD);
}

export function usdToKsh(usd: number): number {
  return Math.round(usd * KSH_PER_USD);
}
