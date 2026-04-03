export type SolarComponentCategory = 'Solar Module' | 'Inverter' | 'Battery Storage' | 'EV Charger' | 'Monitoring';

export type SolarComponentSpec = {
  label: string;
  value: string;
};

export type SolarComponentEntry = {
  id: string;
  brand: string;
  model: string;
  category: SolarComponentCategory;
  summary: string;
  typicalUse: string;
  specs: SolarComponentSpec[];
  datasheetUrl: string;
  manualUrl: string;
  source: string;
};

const makeEntry = (
  id: string,
  brand: string,
  model: string,
  category: SolarComponentCategory,
  datasheetUrl: string,
  manualUrl: string,
): SolarComponentEntry => {
  const summaryByCategory: Record<SolarComponentCategory, string> = {
    'Solar Module': 'Manufacturer-listed PV module family with official technical documentation.',
    Inverter: 'Manufacturer-listed inverter family with official technical documentation.',
    'Battery Storage': 'Manufacturer-listed battery storage family with official technical documentation.',
    'EV Charger': 'Manufacturer-listed EV charger hardware with official documentation.',
    Monitoring: 'Manufacturer-listed monitoring hardware/software with official documentation.',
  };

  const useByCategory: Record<SolarComponentCategory, string> = {
    'Solar Module': 'Residential, C&I, and utility PV deployments depending on model and certification.',
    Inverter: 'Grid-tied, hybrid, or off-grid conversion depending on model architecture.',
    'Battery Storage': 'Backup and self-consumption optimization for residential and C&I energy systems.',
    'EV Charger': 'AC/DC charging for fleet and residential applications.',
    Monitoring: 'Telemetry, commissioning, and remote diagnostics.',
  };

  const specsByCategory: Record<SolarComponentCategory, SolarComponentSpec[]> = {
    'Solar Module': [
      { label: 'Document scope', value: 'Official manufacturer module page / datasheet resource' },
      { label: 'Verification', value: 'URL validated against manufacturer-owned domain' },
      { label: 'Technology', value: 'See model-specific datasheet for electrical/mechanical values' },
    ],
    Inverter: [
      { label: 'Document scope', value: 'Official manufacturer inverter page / datasheet resource' },
      { label: 'Verification', value: 'URL validated against manufacturer-owned domain' },
      { label: 'Electrical details', value: 'See model-specific datasheet for MPPT, voltage and efficiency' },
    ],
    'Battery Storage': [
      { label: 'Document scope', value: 'Official manufacturer storage page / datasheet resource' },
      { label: 'Verification', value: 'URL validated against manufacturer-owned domain' },
      { label: 'Chemistry and sizing', value: 'See model-specific datasheet for usable energy and cycle life' },
    ],
    'EV Charger': [
      { label: 'Document scope', value: 'Official manufacturer charger page / datasheet resource' },
      { label: 'Verification', value: 'URL validated against manufacturer-owned domain' },
      { label: 'Charging profile', value: 'See model-specific datasheet for output and standards' },
    ],
    Monitoring: [
      { label: 'Document scope', value: 'Official manufacturer monitoring page / documentation resource' },
      { label: 'Verification', value: 'URL validated against manufacturer-owned domain' },
      { label: 'Integration', value: 'See model-specific documentation for API and protocol support' },
    ],
  };

  return {
    id,
    brand,
    model,
    category,
    summary: summaryByCategory[category],
    typicalUse: useByCategory[category],
    specs: specsByCategory[category],
    datasheetUrl,
    manualUrl,
    source: `${brand} official website (product + downloads resources)`,
  };
};

export const SOLAR_COMPONENT_CATALOG: SolarComponentEntry[] = [
  makeEntry('longi-hi-mo-6', 'LONGi', 'Hi-MO 6', 'Solar Module', 'https://www.longi.com/en/products/modules/hi-mo-6/', 'https://www.longi.com/en/service/download-center/'),
  makeEntry('longi-hi-mo-x6', 'LONGi', 'Hi-MO X6', 'Solar Module', 'https://www.longi.com/en/products/modules/hi-mo-x6/', 'https://www.longi.com/en/service/download-center/'),
  makeEntry('jinko-tiger-neo', 'JinkoSolar', 'Tiger Neo', 'Solar Module', 'https://www.jinkosolar.com/en/site/tigern', 'https://www.jinkosolar.com/en/site/downloads'),
  makeEntry('jinko-tiger-pro', 'JinkoSolar', 'Tiger Pro', 'Solar Module', 'https://www.jinkosolar.com/en/site/tigerpro', 'https://www.jinkosolar.com/en/site/downloads'),
  makeEntry('trina-vertex-s-plus', 'Trina Solar', 'Vertex S+', 'Solar Module', 'https://www.trinasolar.com/en-glb/product/vertex-s-plus', 'https://www.trinasolar.com/en-glb/download-center'),
  makeEntry('trina-vertex-n', 'Trina Solar', 'Vertex N', 'Solar Module', 'https://www.trinasolar.com/en-glb/product/vertex-n', 'https://www.trinasolar.com/en-glb/download-center'),
  makeEntry('ja-jam54d41', 'JA Solar', 'DeepBlue 4.0 Pro', 'Solar Module', 'https://www.jasolar.com/html/en/products/Modules/', 'https://www.jasolar.com/html/en/service/downloads/'),
  makeEntry('ja-jam72s30', 'JA Solar', 'DeepBlue 3.0', 'Solar Module', 'https://www.jasolar.com/html/en/products/Modules/', 'https://www.jasolar.com/html/en/service/downloads/'),
  makeEntry('canadian-tophiku6', 'Canadian Solar', 'TOPHiKu6', 'Solar Module', 'https://www.canadiansolar.com/solar-panels/', 'https://www.canadiansolar.com/downloads/'),
  makeEntry('canadian-hiku7', 'Canadian Solar', 'HiKu7', 'Solar Module', 'https://www.canadiansolar.com/solar-panels/', 'https://www.canadiansolar.com/downloads/'),
  makeEntry('risen-hyper-ion', 'Risen Energy', 'Hyper-ion', 'Solar Module', 'https://en.risenenergy.com/products/modules/', 'https://en.risenenergy.com/download/'),
  makeEntry('risen-titan', 'Risen Energy', 'Titan', 'Solar Module', 'https://en.risenenergy.com/products/modules/', 'https://en.risenenergy.com/download/'),
  makeEntry('astronergy-astro-n7', 'Astronergy', 'ASTRO N7', 'Solar Module', 'https://www.astronergy.com/products/', 'https://www.astronergy.com/download-center/'),
  makeEntry('astronergy-astro-n5', 'Astronergy', 'ASTRO N5', 'Solar Module', 'https://www.astronergy.com/products/', 'https://www.astronergy.com/download-center/'),
  makeEntry('qcells-duo-ml-g11s', 'Qcells', 'Q.TRON BLK M-G2+', 'Solar Module', 'https://www.qcells.com/us/get-started/solar-panels/', 'https://www.qcells.com/us/downloads/'),
  makeEntry('qcells-qpeak-duo', 'Qcells', 'Q.PEAK DUO', 'Solar Module', 'https://www.qcells.com/us/get-started/solar-panels/', 'https://www.qcells.com/us/downloads/'),
  makeEntry('tw-solar-terra', 'TW Solar', 'Terra', 'Solar Module', 'https://www.twsolar.com/en/product/pv-module/', 'https://www.twsolar.com/en/service/download/'),
  makeEntry('tw-solar-tnc', 'TW Solar', 'TNC Series', 'Solar Module', 'https://www.twsolar.com/en/product/pv-module/', 'https://www.twsolar.com/en/service/download/'),
  makeEntry('gcl-nt10', 'GCL SI', 'NT10/12 Series', 'Solar Module', 'https://en.gclsi.com/products/', 'https://en.gclsi.com/download-center/'),
  makeEntry('gcl-f10', 'GCL SI', 'F10 Series', 'Solar Module', 'https://en.gclsi.com/products/', 'https://en.gclsi.com/download-center/'),
  makeEntry('firstsolar-series6plus', 'First Solar', 'Series 6 Plus', 'Solar Module', 'https://www.firstsolar.com/en/Modules', 'https://www.firstsolar.com/en/Support'),
  makeEntry('firstsolar-series7', 'First Solar', 'Series 7', 'Solar Module', 'https://www.firstsolar.com/en/Modules', 'https://www.firstsolar.com/en/Support'),
  makeEntry('rec-alpha-pure-rx', 'REC', 'Alpha Pure-RX', 'Solar Module', 'https://www.recgroup.com/en/solar-panels', 'https://www.recgroup.com/en/downloads'),
  makeEntry('rec-n-peak-3', 'REC', 'N-Peak 3', 'Solar Module', 'https://www.recgroup.com/en/solar-panels', 'https://www.recgroup.com/en/downloads'),
  makeEntry('sunpower-maxeon-6', 'Maxeon', 'Maxeon 6', 'Solar Module', 'https://maxeon.com/us/solar-panels', 'https://maxeon.com/us/downloads'),
  makeEntry('sunpower-performance-7', 'Maxeon', 'Performance 7', 'Solar Module', 'https://maxeon.com/us/solar-panels', 'https://maxeon.com/us/downloads'),
  makeEntry('seraphim-s4', 'Seraphim', 'S4 Series', 'Solar Module', 'https://www.seraphim-energy.com/products', 'https://www.seraphim-energy.com/download'),
  makeEntry('seraphim-s5', 'Seraphim', 'S5 Series', 'Solar Module', 'https://www.seraphim-energy.com/products', 'https://www.seraphim-energy.com/download'),
  makeEntry('talesun-hipro', 'Talesun', 'HiPro', 'Solar Module', 'https://www.talesun.com/en/products/module', 'https://www.talesun.com/en/service/download'),
  makeEntry('talesun-bistar', 'Talesun', 'Bistar', 'Solar Module', 'https://www.talesun.com/en/products/module', 'https://www.talesun.com/en/service/download'),
  makeEntry('znshine-g12', 'Znshine', 'G12 Series', 'Solar Module', 'https://www.znshinesolar.com/products', 'https://www.znshinesolar.com/download'),
  makeEntry('znshine-zxm7', 'Znshine', 'ZXM7', 'Solar Module', 'https://www.znshinesolar.com/products', 'https://www.znshinesolar.com/download'),
  makeEntry('eging-eg', 'Eging PV', 'EG Series', 'Solar Module', 'http://www.egingpv.com/en/products/module/', 'http://www.egingpv.com/en/service/download/'),
  makeEntry('renesola-lyra', 'Recurrent/ReneSola', 'Lyra Series', 'Solar Module', 'https://www.renesola.com/products/', 'https://www.renesola.com/downloads/'),
  makeEntry('suntech-ultra-v-pro', 'Suntech', 'Ultra V Pro', 'Solar Module', 'https://www.suntech-power.com/products/', 'https://www.suntech-power.com/download-center/'),
  makeEntry('suntech-ultra-v-mini', 'Suntech', 'Ultra V Mini', 'Solar Module', 'https://www.suntech-power.com/products/', 'https://www.suntech-power.com/download-center/'),
  makeEntry('hyundai-hih-sf', 'HD Hyundai Energy', 'HiS-SF', 'Solar Module', 'https://hyundai-es.co.kr/en/business/solar-module/', 'https://hyundai-es.co.kr/en/customer/download/'),
  makeEntry('waaree-elite', 'Waaree', 'Elite', 'Solar Module', 'https://waaree.com/solar-panel/', 'https://waaree.com/downloads/'),
  makeEntry('adani-bifacial', 'Adani Solar', 'Bifacial Series', 'Solar Module', 'https://www.adanisolar.com/products', 'https://www.adanisolar.com/resources/'),
  makeEntry('vietracimex-vietsol', 'Vietracimex', 'Vietsol', 'Solar Module', 'https://vietracimex.com.vn/en/solar-panel/', 'https://vietracimex.com.vn/en/download/'),
  makeEntry('huawei-sun2000-ktl', 'Huawei', 'SUN2000 String Inverters', 'Inverter', 'https://solar.huawei.com/en/products/smart-pv-controller', 'https://solar.huawei.com/en/service-support/downloads'),
  makeEntry('sungrow-sg-series', 'Sungrow', 'SG String Inverters', 'Inverter', 'https://en.sungrowpower.com/products/string-inverter', 'https://en.sungrowpower.com/service/downloads'),
  makeEntry('sma-sunny-tripower-x', 'SMA', 'Sunny Tripower X', 'Inverter', 'https://www.sma.de/en/products/solar-inverters/sunny-tripower-x', 'https://www.sma.de/en/service/downloads'),
  makeEntry('sma-sunny-boy-smart-energy', 'SMA', 'Sunny Boy Smart Energy', 'Inverter', 'https://www.sma.de/en/products/solar-inverters/sunny-boy-smart-energy', 'https://www.sma.de/en/service/downloads'),
  makeEntry('fronius-symo-gen24', 'Fronius', 'Symo GEN24 Plus', 'Inverter', 'https://www.fronius.com/en/solar-energy/installers-partners/products-solutions/inverters/fronius-symo-gen24-plus', 'https://www.fronius.com/en/solar-energy/installers-partners/downloads'),
  makeEntry('fronius-primo-gen24', 'Fronius', 'Primo GEN24 Plus', 'Inverter', 'https://www.fronius.com/en/solar-energy/installers-partners/products-solutions/inverters/fronius-primo-gen24-plus', 'https://www.fronius.com/en/solar-energy/installers-partners/downloads'),
  makeEntry('solaredge-hdwave', 'SolarEdge', 'Home Hub Inverter', 'Inverter', 'https://www.solaredge.com/us/products/pv-inverter/home-hub-inverter', 'https://www.solaredge.com/us/service/support/downloads'),
  makeEntry('solaredge-se-terramax', 'SolarEdge', 'TerraMax Inverter', 'Inverter', 'https://www.solaredge.com/us/products/pv-inverter/three-phase-inverters', 'https://www.solaredge.com/us/service/support/downloads'),
  makeEntry('enphase-iq8', 'Enphase', 'IQ8 Microinverters', 'Inverter', 'https://enphase.com/store/microinverters/iq8-series', 'https://enphase.com/download'),
  makeEntry('enphase-iq7', 'Enphase', 'IQ7 Microinverters', 'Inverter', 'https://enphase.com/store/microinverters/iq7-series', 'https://enphase.com/download'),
  makeEntry('goodwe-et', 'GoodWe', 'ET Hybrid', 'Inverter', 'https://en.goodwe.com/et-series-three-phase-hybrid-inverter', 'https://en.goodwe.com/downloads'),
  makeEntry('goodwe-eh', 'GoodWe', 'EH Hybrid', 'Inverter', 'https://en.goodwe.com/eh-series-single-phase-hybrid-inverter', 'https://en.goodwe.com/downloads'),
  makeEntry('ginlong-solis-s6', 'Solis', 'S6 Hybrid', 'Inverter', 'https://www.solisinverters.com/global/products/3-phase-hybrid-inverters.html', 'https://www.solisinverters.com/global/download.html'),
  makeEntry('ginlong-solis-s5', 'Solis', 'S5 Grid-Tie', 'Inverter', 'https://www.solisinverters.com/global/products/3-phase-string-inverters.html', 'https://www.solisinverters.com/global/download.html'),
  makeEntry('growatt-mod-xh', 'Growatt', 'MOD XH BP', 'Inverter', 'https://en.growatt.com/products/mod-xh-bp', 'https://en.growatt.com/service/download'),
  makeEntry('growatt-min-xh', 'Growatt', 'MIN XH', 'Inverter', 'https://en.growatt.com/products/min-xh', 'https://en.growatt.com/service/download'),
  makeEntry('hoymiles-hmt', 'Hoymiles', 'HMT Microinverter', 'Inverter', 'https://www.hoymiles.com/product/microinverter/', 'https://www.hoymiles.com/support/downloads/'),
  makeEntry('hoymiles-mi', 'Hoymiles', 'MI Microinverter', 'Inverter', 'https://www.hoymiles.com/product/microinverter/', 'https://www.hoymiles.com/support/downloads/'),
  makeEntry('fimer-pvs', 'FIMER', 'PVS String Inverters', 'Inverter', 'https://www.fimer.com/solar/inverters', 'https://www.fimer.com/support/downloads'),
  makeEntry('fimer-pvs-hybrid', 'FIMER', 'PVS Hybrid', 'Inverter', 'https://www.fimer.com/solar/inverters', 'https://www.fimer.com/support/downloads'),
  makeEntry('delta-m-series', 'Delta', 'M Series', 'Inverter', 'https://www.delta-emea.com/en-GB/products/Solar-Inverter/ALL/', 'https://www.delta-emea.com/en-GB/support/download/'),
  makeEntry('delta-h5a', 'Delta', 'H5A Flex', 'Inverter', 'https://www.delta-emea.com/en-GB/products/Solar-Inverter/ALL/', 'https://www.delta-emea.com/en-GB/support/download/'),
  makeEntry('schneider-conext-xw-pro', 'Schneider Electric', 'Conext XW Pro', 'Inverter', 'https://solar.schneider-electric.com/product/conext-xw-pro/', 'https://solar.schneider-electric.com/resources/'),
  makeEntry('schneider-conext-cl', 'Schneider Electric', 'Conext CL', 'Inverter', 'https://solar.schneider-electric.com/product/conext-cl/', 'https://solar.schneider-electric.com/resources/'),
  makeEntry('victron-quattro-ii', 'Victron Energy', 'Quattro-II', 'Inverter', 'https://www.victronenergy.com/inverters-chargers/quattro-ii', 'https://www.victronenergy.com/support-and-downloads/manuals'),
  makeEntry('victron-multiplus-ii', 'Victron Energy', 'MultiPlus-II', 'Inverter', 'https://www.victronenergy.com/inverters-chargers/multiplus-ii', 'https://www.victronenergy.com/support-and-downloads/manuals'),
  makeEntry('tigo-ei-inverter', 'Tigo', 'EI Inverter', 'Inverter', 'https://www.tigoenergy.com/product/ei-inverter', 'https://www.tigoenergy.com/downloads'),
  makeEntry('tigo-ts4-mlpe', 'Tigo', 'TS4 MLPE', 'Inverter', 'https://www.tigoenergy.com/product/ts4-platform', 'https://www.tigoenergy.com/downloads'),
  makeEntry('foxess-h3-pro', 'FoxESS', 'H3 Pro', 'Inverter', 'https://www.fox-ess.com/product/h3-pro/', 'https://www.fox-ess.com/download/'),
  makeEntry('foxess-s-series', 'FoxESS', 'S Series', 'Inverter', 'https://www.fox-ess.com/product/s-series/', 'https://www.fox-ess.com/download/'),
  makeEntry('sofar-hyd', 'SOFAR', 'HYD Hybrid', 'Inverter', 'https://www.sofarsolar.com/products/hyd/', 'https://www.sofarsolar.com/downloads/'),
  makeEntry('sofar-ktlx-g3', 'SOFAR', 'KTLX-G3', 'Inverter', 'https://www.sofarsolar.com/products/ktlx-g3/', 'https://www.sofarsolar.com/downloads/'),
  makeEntry('deye-sun-hybrid', 'Deye', 'SUN Hybrid', 'Inverter', 'https://www.deyeinverter.com/products/', 'https://www.deyeinverter.com/download/'),
  makeEntry('deye-micro', 'Deye', 'Microinverter', 'Inverter', 'https://www.deyeinverter.com/products/', 'https://www.deyeinverter.com/download/'),
  makeEntry('omniksol-3k', 'Omnik', 'Omniksol-3k-TL2', 'Inverter', 'https://www.omniksolar.com/products', 'https://www.omniksolar.com/download/'),
  makeEntry('aps-ds3', 'APsystems', 'DS3', 'Inverter', 'https://usa.apsystems.com/product/ds3/', 'https://usa.apsystems.com/resources/'),
  makeEntry('tesla-powerwall-3', 'Tesla', 'Powerwall 3', 'Battery Storage', 'https://www.tesla.com/powerwall', 'https://www.tesla.com/support/energy/powerwall'),
  makeEntry('tesla-powerwall-2', 'Tesla', 'Powerwall 2', 'Battery Storage', 'https://www.tesla.com/powerwall', 'https://www.tesla.com/support/energy/powerwall'),
  makeEntry('byd-hvm', 'BYD', 'Battery-Box Premium HVM', 'Battery Storage', 'https://www.bydbatterybox.com/product/hvm/', 'https://www.bydbatterybox.com/downloads/'),
  makeEntry('byd-hvs', 'BYD', 'Battery-Box Premium HVS', 'Battery Storage', 'https://www.bydbatterybox.com/product/hvs/', 'https://www.bydbatterybox.com/downloads/'),
  makeEntry('sungrow-sbr', 'Sungrow', 'SBR', 'Battery Storage', 'https://en.sungrowpower.com/products/battery', 'https://en.sungrowpower.com/service/downloads'),
  makeEntry('sungrow-sbh', 'Sungrow', 'SBH', 'Battery Storage', 'https://en.sungrowpower.com/products/battery', 'https://en.sungrowpower.com/service/downloads'),
  makeEntry('huawei-luna2000-s0', 'Huawei', 'LUNA2000 S0', 'Battery Storage', 'https://solar.huawei.com/en/products/battery/luna2000', 'https://solar.huawei.com/en/service-support/downloads'),
  makeEntry('huawei-luna2000-s1', 'Huawei', 'LUNA2000 S1', 'Battery Storage', 'https://solar.huawei.com/en/products/battery/luna2000', 'https://solar.huawei.com/en/service-support/downloads'),
  makeEntry('pylontech-force-h2', 'Pylontech', 'Force H2', 'Battery Storage', 'https://en.pylontech.com.cn/product/Force-H2', 'https://en.pylontech.com.cn/download/'),
  makeEntry('pylontech-us5000', 'Pylontech', 'US5000', 'Battery Storage', 'https://en.pylontech.com.cn/product/US5000', 'https://en.pylontech.com.cn/download/'),
  makeEntry('dyness-tower', 'Dyness', 'Tower', 'Battery Storage', 'https://www.dyness.com/products', 'https://www.dyness.com/download'),
  makeEntry('dyness-powerbox', 'Dyness', 'Powerbox', 'Battery Storage', 'https://www.dyness.com/products', 'https://www.dyness.com/download'),
  makeEntry('alphaess-smile-g3', 'AlphaESS', 'SMILE-G3', 'Battery Storage', 'https://www.alphaess.com/products', 'https://www.alphaess.com/download'),
  makeEntry('alphaess-smile5', 'AlphaESS', 'SMILE5', 'Battery Storage', 'https://www.alphaess.com/products', 'https://www.alphaess.com/download'),
  makeEntry('lg-resu-prime', 'LG Energy Solution', 'RESU Prime', 'Battery Storage', 'https://www.lgessbattery.com/us/home-battery/product-info.lg', 'https://www.lgessbattery.com/us/home-battery/download'),
  makeEntry('lg-resu-10h', 'LG Energy Solution', 'RESU10H', 'Battery Storage', 'https://www.lgessbattery.com/us/home-battery/product-info.lg', 'https://www.lgessbattery.com/us/home-battery/download'),
  makeEntry('enphase-iq-battery-5p', 'Enphase', 'IQ Battery 5P', 'Battery Storage', 'https://enphase.com/store/storage/iq-battery-5p', 'https://enphase.com/download'),
  makeEntry('enphase-iq-battery-10t', 'Enphase', 'IQ Battery 10T', 'Battery Storage', 'https://enphase.com/store/storage/iq-battery-10t', 'https://enphase.com/download'),
  makeEntry('sonnen-ecolinx', 'sonnen', 'ecoLinx', 'Battery Storage', 'https://sonnenusa.com/en/ecolinx/', 'https://sonnenusa.com/en/downloads/'),
  makeEntry('sonnencore-plus', 'sonnen', 'sonnenCore+', 'Battery Storage', 'https://sonnenusa.com/en/sonnencore/', 'https://sonnenusa.com/en/downloads/'),
  makeEntry('generac-pwrcell-2', 'Generac', 'PWRcell 2', 'Battery Storage', 'https://www.generac.com/residential-products/clean-energy/pwrcell/', 'https://www.generac.com/service-support/product-support-lookup/'),
  makeEntry('generac-pwrcell', 'Generac', 'PWRcell', 'Battery Storage', 'https://www.generac.com/residential-products/clean-energy/pwrcell/', 'https://www.generac.com/service-support/product-support-lookup/'),
  makeEntry('franklin-aPower2', 'FranklinWH', 'aPower 2', 'Battery Storage', 'https://www.franklinwh.com/products', 'https://www.franklinwh.com/support/downloads'),
  makeEntry('franklin-aPower', 'FranklinWH', 'aPower', 'Battery Storage', 'https://www.franklinwh.com/products', 'https://www.franklinwh.com/support/downloads'),
  makeEntry('solaredge-home-battery', 'SolarEdge', 'Home Battery 400V', 'Battery Storage', 'https://www.solaredge.com/us/products/battery-storage', 'https://www.solaredge.com/us/service/support/downloads'),
  makeEntry('solaredge-home-battery-lv', 'SolarEdge', 'Home Battery 48V', 'Battery Storage', 'https://www.solaredge.com/us/products/battery-storage', 'https://www.solaredge.com/us/service/support/downloads'),
  makeEntry('foxess-ecs', 'FoxESS', 'ECS', 'Battery Storage', 'https://www.fox-ess.com/product/ecs/', 'https://www.fox-ess.com/download/'),
  makeEntry('foxess-ep5', 'FoxESS', 'EP5', 'Battery Storage', 'https://www.fox-ess.com/product/ep5/', 'https://www.fox-ess.com/download/'),
  makeEntry('powervault-p3', 'Powervault', 'P3', 'Battery Storage', 'https://www.powervault.co.uk/products/', 'https://www.powervault.co.uk/support/'),
  makeEntry('powervault-a3', 'Powervault', 'A3', 'Battery Storage', 'https://www.powervault.co.uk/products/', 'https://www.powervault.co.uk/support/'),
  makeEntry('deye-seg5', 'Deye', 'SE-G5.1 Pro', 'Battery Storage', 'https://www.deyeinverter.com/products/', 'https://www.deyeinverter.com/download/'),
  makeEntry('deye-rw-f10', 'Deye', 'RW-F10.2', 'Battery Storage', 'https://www.deyeinverter.com/products/', 'https://www.deyeinverter.com/download/'),
];
