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

export const SOLAR_COMPONENT_CATALOG: SolarComponentEntry[] = [
  {
    id: 'longi-hi-mo-x6',
    brand: 'LONGi',
    model: 'Hi-MO X6 (LR5/54HTH)',
    category: 'Solar Module',
    summary: 'N-type mono module family commonly used in C&I and residential deployments.',
    typicalUse: 'Rooftop and distributed generation projects with high-efficiency panel targets.',
    specs: [
      { label: 'Power class', value: '≈ 415–440 W' },
      { label: 'Cell technology', value: 'HPBC / N-type' },
      { label: 'Module efficiency', value: 'Up to about 22%' },
    ],
    datasheetUrl: 'https://www.longi.com/en/products/modules/hi-mo-x6/',
    manualUrl: 'https://www.longi.com/uploads/2023/03/17/00f2d1e1cbf8a4c848ca560f9dd1265a.pdf',
    source: 'LONGi official product page and installation manual',
  },
  {
    id: 'jinko-tiger-neo',
    brand: 'Jinko Solar',
    model: 'Tiger Neo N-type 54HL4R',
    category: 'Solar Module',
    summary: 'High-volume N-type module line with strong temperature performance.',
    typicalUse: 'Residential and commercial rooftops where high W/m² is important.',
    specs: [
      { label: 'Power class', value: '≈ 420–440 W' },
      { label: 'Cell technology', value: 'N-type TOPCon' },
      { label: 'Module efficiency', value: 'Up to about 22%' },
    ],
    datasheetUrl: 'https://www.jinkosolar.com/en/site/tigern',
    manualUrl: 'https://jinkosolar.eu/wp-content/uploads/2023/04/JinkoSolar-Installation-Manual.pdf',
    source: 'Jinko Solar official product and installation documents',
  },
  {
    id: 'trina-vertex-s-plus',
    brand: 'Trina Solar',
    model: 'Vertex S+ (NEG9R.28)',
    category: 'Solar Module',
    summary: 'Dual-glass rooftop module series used in utility and C&I portfolios.',
    typicalUse: 'Commercial rooftops and distributed systems targeting long-life glass/glass modules.',
    specs: [
      { label: 'Power class', value: '≈ 430–455 W' },
      { label: 'Cell technology', value: 'N-type i-TOPCon' },
      { label: 'Module efficiency', value: 'Up to about 22.8%' },
    ],
    datasheetUrl: 'https://www.trinasolar.com/en-glb/product/vertex-s-plus',
    manualUrl: 'https://static.trinasolar.com/sites/default/files/2024-01/Installation_Manual_Module_EN.pdf',
    source: 'Trina Solar official product page and module installation manual',
  },
  {
    id: 'huawei-sun2000-100ktl',
    brand: 'Huawei',
    model: 'SUN2000-100KTL-M2',
    category: 'Inverter',
    summary: 'Three-phase smart string inverter widely deployed in C&I systems.',
    typicalUse: 'Commercial rooftop and ground-mount projects requiring multi-MPPT flexibility.',
    specs: [
      { label: 'AC nominal power', value: '100 kW' },
      { label: 'Max efficiency', value: '≈ 98.8%' },
      { label: 'MPPT trackers', value: '10' },
    ],
    datasheetUrl: 'https://solar.huawei.com/en/products/smart-pv-controller/sun2000-100ktl-m2',
    manualUrl: 'https://support.huawei.com/enterprise/en/doc/EDOC1100167257',
    source: 'Huawei FusionSolar official product and user documentation',
  },
  {
    id: 'sma-sunny-tripower-x',
    brand: 'SMA',
    model: 'Sunny Tripower X',
    category: 'Inverter',
    summary: 'Commercial inverter platform with integrated system management features.',
    typicalUse: 'Medium C&I sites that need scalable string-level PV conversion.',
    specs: [
      { label: 'Power class', value: '≈ 12–25 kW (model dependent)' },
      { label: 'Topology', value: 'Transformerless, 3-phase' },
      { label: 'Max efficiency', value: 'Up to about 98.4%' },
    ],
    datasheetUrl: 'https://www.sma.de/en/products/solar-inverters/sunny-tripower-x',
    manualUrl: 'https://files.sma.de/downloads/STPXX-3SE-40-BE-en-15.pdf',
    source: 'SMA official product and operating manual files',
  },
  {
    id: 'fronius-symo-advanced',
    brand: 'Fronius',
    model: 'Fronius Symo Advanced',
    category: 'Inverter',
    summary: 'Three-phase inverter family focused on flexible C&I integration.',
    typicalUse: 'C&I grid-tied systems with monitoring and advanced safety requirements.',
    specs: [
      { label: 'Power class', value: '≈ 10–20 kW' },
      { label: 'Topology', value: 'Transformerless, 3-phase' },
      { label: 'Max efficiency', value: 'Up to about 98%' },
    ],
    datasheetUrl: 'https://www.fronius.com/en/solar-energy/installers-partners/products-solutions/inverters/fronius-symo-advanced',
    manualUrl: 'https://www.fronius.com/~/downloads/Solar%20Energy/Operating%20Instructions/42,0426,0338.pdf',
    source: 'Fronius official product page and operating instructions',
  },
  {
    id: 'tesla-powerwall-2',
    brand: 'Tesla',
    model: 'Powerwall 2',
    category: 'Battery Storage',
    summary: 'AC-coupled residential storage system with integrated inverter.',
    typicalUse: 'Backup + self-consumption optimization in home and small business systems.',
    specs: [
      { label: 'Usable energy', value: '13.5 kWh' },
      { label: 'Continuous power', value: '5 kW (higher peak)' },
      { label: 'Chemistry', value: 'Lithium-ion' },
    ],
    datasheetUrl: 'https://www.tesla.com/powerwall',
    manualUrl: 'https://digitalassets.tesla.com/tesla-contents/image/upload/powerwall-2-ac-datasheet-en-na.pdf',
    source: 'Tesla official Powerwall product and technical documentation',
  },
  {
    id: 'byd-battery-box-hvm',
    brand: 'BYD',
    model: 'Battery-Box Premium HVM',
    category: 'Battery Storage',
    summary: 'Modular high-voltage LFP battery stack for residential and C&I hybrid systems.',
    typicalUse: 'Scalable storage for hybrid inverter ecosystems with modular expansion.',
    specs: [
      { label: 'Usable energy range', value: '≈ 8.3–66.2 kWh (stack dependent)' },
      { label: 'Chemistry', value: 'LFP (Lithium Iron Phosphate)' },
      { label: 'Scalability', value: 'Modular tower architecture' },
    ],
    datasheetUrl: 'https://www.bydbatterybox.com/product/hvm/',
    manualUrl: 'https://www.bydbatterybox.com/uploads/downloads/Battery-Box_Premium_HVM_Installation_Manual_EN_V1.9.pdf',
    source: 'BYD Battery-Box official product and installation manual',
  },
  {
    id: 'sungrow-sbr',
    brand: 'Sungrow',
    model: 'SBR High Voltage Battery',
    category: 'Battery Storage',
    summary: 'High-voltage modular battery platform used with Sungrow hybrid inverters.',
    typicalUse: 'Residential and light C&I storage where module-level expansion is needed.',
    specs: [
      { label: 'Capacity range', value: '≈ 9.6–25.6 kWh (system dependent)' },
      { label: 'Chemistry', value: 'LFP' },
      { label: 'Expansion', value: 'Stackable modular units' },
    ],
    datasheetUrl: 'https://en.sungrowpower.com/productDetail/1475/sbr096-256',
    manualUrl: 'https://en.sungrowpower.com/upload/file/20220817/SBR096-256-User-Manual.pdf',
    source: 'Sungrow official product page and user manual',
  },
  {
    id: 'wallbox-pulsar-plus',
    brand: 'Wallbox',
    model: 'Pulsar Plus',
    category: 'EV Charger',
    summary: 'Compact smart EV charger frequently paired with solar systems.',
    typicalUse: 'Residential EV charging with app-based energy management.',
    specs: [
      { label: 'Power class', value: 'Up to 22 kW (3-phase variants)' },
      { label: 'Connectivity', value: 'Wi-Fi / Bluetooth' },
      { label: 'Use case', value: 'Home & light commercial' },
    ],
    datasheetUrl: 'https://wallbox.com/en_us/pulsar-plus-ev-charger',
    manualUrl: 'https://support.wallbox.com/wp-content/uploads/ht_kb/2024/05/Pulsar-Plus-NA-Installation-Guide.pdf',
    source: 'Wallbox official product and installation guides',
  },
  {
    id: 'enphase-envoy',
    brand: 'Enphase',
    model: 'IQ Gateway (Envoy)',
    category: 'Monitoring',
    summary: 'Gateway and communications hub for system telemetry and control.',
    typicalUse: 'Fleet/system monitoring, commissioning and cloud analytics.',
    specs: [
      { label: 'Role', value: 'Gateway + monitoring' },
      { label: 'Communications', value: 'Ethernet / cellular / Wi-Fi (model dependent)' },
      { label: 'Integration', value: 'Microinverter and storage ecosystems' },
    ],
    datasheetUrl: 'https://enphase.com/installers/communication/iq-gateway',
    manualUrl: 'https://enphase.com/download/iq-gateway-installation-and-operation-manual',
    source: 'Enphase official product page and installation/operation manual',
  },
];
