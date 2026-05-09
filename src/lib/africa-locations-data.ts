export interface AfricaCity {
  name: string
  country: string
  countryCode: string
  region: 'North Africa' | 'West Africa' | 'Central Africa' | 'East Africa' | 'Southern Africa'
  lat: number
  lon: number
  elevation: number
  avgDailyPsh: number
  annualGHI: number
  avgTempC: number
}

// ── North Africa ─────────────────────────────────────────────────────────────

const northAfrica: AfricaCity[] = [
  // Egypt
  { name: 'Cairo',          country: 'Egypt', countryCode: 'EG', region: 'North Africa', lat: 30.06,  lon: 31.25,  elevation: 23,   avgDailyPsh: 5.92, annualGHI: 2161, avgTempC: 22.0 },
  { name: 'Alexandria',     country: 'Egypt', countryCode: 'EG', region: 'North Africa', lat: 31.20,  lon: 29.92,  elevation: 32,   avgDailyPsh: 5.71, annualGHI: 2084, avgTempC: 20.5 },
  { name: 'Aswan',          country: 'Egypt', countryCode: 'EG', region: 'North Africa', lat: 24.09,  lon: 32.90,  elevation: 194,  avgDailyPsh: 7.32, annualGHI: 2672, avgTempC: 27.8 },
  { name: 'Luxor',          country: 'Egypt', countryCode: 'EG', region: 'North Africa', lat: 25.70,  lon: 32.65,  elevation: 82,   avgDailyPsh: 7.18, annualGHI: 2621, avgTempC: 26.2 },
  { name: 'Hurghada',       country: 'Egypt', countryCode: 'EG', region: 'North Africa', lat: 27.26,  lon: 33.81,  elevation: 14,   avgDailyPsh: 6.95, annualGHI: 2537, avgTempC: 25.1 },
  // Libya
  { name: 'Tripoli',        country: 'Libya', countryCode: 'LY', region: 'North Africa', lat: 32.90,  lon: 13.18,  elevation: 81,   avgDailyPsh: 5.80, annualGHI: 2117, avgTempC: 20.8 },
  { name: 'Benghazi',       country: 'Libya', countryCode: 'LY', region: 'North Africa', lat: 32.12,  lon: 20.07,  elevation: 120,  avgDailyPsh: 6.05, annualGHI: 2208, avgTempC: 19.6 },
  { name: 'Sabha',          country: 'Libya', countryCode: 'LY', region: 'North Africa', lat: 27.03,  lon: 14.43,  elevation: 432,  avgDailyPsh: 7.20, annualGHI: 2628, avgTempC: 23.9 },
  { name: 'Misrata',        country: 'Libya', countryCode: 'LY', region: 'North Africa', lat: 32.38,  lon: 15.10,  elevation: 30,   avgDailyPsh: 5.88, annualGHI: 2146, avgTempC: 21.3 },
  // Tunisia
  { name: 'Tunis',          country: 'Tunisia', countryCode: 'TN', region: 'North Africa', lat: 36.82,  lon: 10.18,  elevation: 4,    avgDailyPsh: 5.22, annualGHI: 1905, avgTempC: 18.8 },
  { name: 'Sfax',           country: 'Tunisia', countryCode: 'TN', region: 'North Africa', lat: 34.74,  lon: 10.76,  elevation: 23,   avgDailyPsh: 5.51, annualGHI: 2011, avgTempC: 19.6 },
  { name: 'Tozeur',         country: 'Tunisia', countryCode: 'TN', region: 'North Africa', lat: 33.92,  lon: 8.13,   elevation: 46,   avgDailyPsh: 6.08, annualGHI: 2219, avgTempC: 22.4 },
  { name: 'Sousse',         country: 'Tunisia', countryCode: 'TN', region: 'North Africa', lat: 35.83,  lon: 10.64,  elevation: 12,   avgDailyPsh: 5.38, annualGHI: 1964, avgTempC: 18.9 },
  // Algeria
  { name: 'Algiers',        country: 'Algeria', countryCode: 'DZ', region: 'North Africa', lat: 36.74,  lon: 3.06,   elevation: 24,   avgDailyPsh: 5.25, annualGHI: 1916, avgTempC: 18.2 },
  { name: 'Oran',           country: 'Algeria', countryCode: 'DZ', region: 'North Africa', lat: 35.70,  lon: -0.63,  elevation: 98,   avgDailyPsh: 5.40, annualGHI: 1971, avgTempC: 17.8 },
  { name: 'Tamanrasset',    country: 'Algeria', countryCode: 'DZ', region: 'North Africa', lat: 22.78,  lon: 5.53,   elevation: 1377, avgDailyPsh: 7.40, annualGHI: 2701, avgTempC: 21.7 },
  { name: 'Ouargla',        country: 'Algeria', countryCode: 'DZ', region: 'North Africa', lat: 31.95,  lon: 5.40,   elevation: 141,  avgDailyPsh: 6.55, annualGHI: 2391, avgTempC: 23.4 },
  { name: 'Tindouf',        country: 'Algeria', countryCode: 'DZ', region: 'North Africa', lat: 27.67,  lon: -8.15,  elevation: 439,  avgDailyPsh: 7.10, annualGHI: 2592, avgTempC: 22.6 },
  // Morocco
  { name: 'Casablanca',     country: 'Morocco', countryCode: 'MA', region: 'North Africa', lat: 33.59,  lon: -7.62,  elevation: 56,   avgDailyPsh: 5.18, annualGHI: 1891, avgTempC: 18.4 },
  { name: 'Marrakech',      country: 'Morocco', countryCode: 'MA', region: 'North Africa', lat: 31.63,  lon: -8.00,  elevation: 466,  avgDailyPsh: 5.75, annualGHI: 2099, avgTempC: 20.3 },
  { name: 'Ouarzazate',     country: 'Morocco', countryCode: 'MA', region: 'North Africa', lat: 30.92,  lon: -6.91,  elevation: 1136, avgDailyPsh: 6.30, annualGHI: 2300, avgTempC: 19.8 },
  { name: 'Fes',            country: 'Morocco', countryCode: 'MA', region: 'North Africa', lat: 34.03,  lon: -5.00,  elevation: 411,  avgDailyPsh: 5.42, annualGHI: 1978, avgTempC: 18.7 },
  { name: 'Agadir',         country: 'Morocco', countryCode: 'MA', region: 'North Africa', lat: 30.42,  lon: -9.60,  elevation: 22,   avgDailyPsh: 5.65, annualGHI: 2062, avgTempC: 20.1 },
  // Mauritania
  { name: 'Nouakchott',     country: 'Mauritania', countryCode: 'MR', region: 'North Africa', lat: 18.08,  lon: -15.97, elevation: 3,    avgDailyPsh: 5.90, annualGHI: 2154, avgTempC: 28.5 },
  { name: 'Nouadhibou',     country: 'Mauritania', countryCode: 'MR', region: 'North Africa', lat: 20.93,  lon: -17.04, elevation: 4,    avgDailyPsh: 6.20, annualGHI: 2263, avgTempC: 22.0 },
  { name: 'Kiffa',          country: 'Mauritania', countryCode: 'MR', region: 'North Africa', lat: 16.63,  lon: -11.40, elevation: 107,  avgDailyPsh: 6.10, annualGHI: 2227, avgTempC: 30.1 },
  { name: 'Atar',           country: 'Mauritania', countryCode: 'MR', region: 'North Africa', lat: 20.52,  lon: -13.05, elevation: 228,  avgDailyPsh: 6.55, annualGHI: 2391, avgTempC: 26.8 },
  // Western Sahara
  { name: 'Laayoune',       country: 'Western Sahara', countryCode: 'EH', region: 'North Africa', lat: 27.15,  lon: -13.20, elevation: 70,   avgDailyPsh: 6.40, annualGHI: 2336, avgTempC: 19.8 },
  { name: 'Dakhla',         country: 'Western Sahara', countryCode: 'EH', region: 'North Africa', lat: 23.72,  lon: -15.93, elevation: 8,    avgDailyPsh: 6.60, annualGHI: 2409, avgTempC: 20.5 },
  { name: 'Smara',          country: 'Western Sahara', countryCode: 'EH', region: 'North Africa', lat: 26.73,  lon: -11.68, elevation: 150,  avgDailyPsh: 6.50, annualGHI: 2373, avgTempC: 22.3 },
  // Sudan
  { name: 'Khartoum',       country: 'Sudan', countryCode: 'SD', region: 'North Africa', lat: 15.55,  lon: 32.53,  elevation: 380,  avgDailyPsh: 6.85, annualGHI: 2500, avgTempC: 29.6 },
  { name: 'Omdurman',       country: 'Sudan', countryCode: 'SD', region: 'North Africa', lat: 15.65,  lon: 32.48,  elevation: 374,  avgDailyPsh: 6.82, annualGHI: 2489, avgTempC: 29.8 },
  { name: 'Port Sudan',     country: 'Sudan', countryCode: 'SD', region: 'North Africa', lat: 19.61,  lon: 37.22,  elevation: 6,    avgDailyPsh: 7.00, annualGHI: 2555, avgTempC: 28.4 },
  { name: 'Kassala',        country: 'Sudan', countryCode: 'SD', region: 'North Africa', lat: 15.45,  lon: 36.40,  elevation: 503,  avgDailyPsh: 6.60, annualGHI: 2409, avgTempC: 28.3 },
  { name: 'El Obeid',       country: 'Sudan', countryCode: 'SD', region: 'North Africa', lat: 13.18,  lon: 30.22,  elevation: 569,  avgDailyPsh: 6.30, annualGHI: 2300, avgTempC: 27.5 },
]

// ── West Africa ──────────────────────────────────────────────────────────────

const westAfrica: AfricaCity[] = [
  // Niger
  { name: 'Niamey',         country: 'Niger', countryCode: 'NE', region: 'West Africa', lat: 13.51,  lon: 2.12,   elevation: 223,  avgDailyPsh: 6.25, annualGHI: 2281, avgTempC: 29.1 },
  { name: 'Zinder',         country: 'Niger', countryCode: 'NE', region: 'West Africa', lat: 13.80,  lon: 8.99,   elevation: 462,  avgDailyPsh: 6.40, annualGHI: 2336, avgTempC: 28.7 },
  { name: 'Maradi',         country: 'Niger', countryCode: 'NE', region: 'West Africa', lat: 13.50,  lon: 7.10,   elevation: 376,  avgDailyPsh: 6.30, annualGHI: 2300, avgTempC: 28.9 },
  { name: 'Agadez',         country: 'Niger', countryCode: 'NE', region: 'West Africa', lat: 16.97,  lon: 7.99,   elevation: 524,  avgDailyPsh: 6.85, annualGHI: 2500, avgTempC: 27.6 },
  // Mali
  { name: 'Bamako',         country: 'Mali', countryCode: 'ML', region: 'West Africa', lat: 12.65,  lon: -8.00,  elevation: 380,  avgDailyPsh: 5.85, annualGHI: 2135, avgTempC: 28.3 },
  { name: 'Timbuktu',       country: 'Mali', countryCode: 'ML', region: 'West Africa', lat: 16.77,  lon: -3.00,  elevation: 261,  avgDailyPsh: 6.55, annualGHI: 2391, avgTempC: 30.2 },
  { name: 'Gao',            country: 'Mali', countryCode: 'ML', region: 'West Africa', lat: 16.27,  lon: -0.04,  elevation: 264,  avgDailyPsh: 6.60, annualGHI: 2409, avgTempC: 30.5 },
  { name: 'Mopti',          country: 'Mali', countryCode: 'ML', region: 'West Africa', lat: 14.48,  lon: -4.20,  elevation: 272,  avgDailyPsh: 6.10, annualGHI: 2227, avgTempC: 29.0 },
  // Burkina Faso
  { name: 'Ouagadougou',    country: 'Burkina Faso', countryCode: 'BF', region: 'West Africa', lat: 12.37,  lon: -1.53,  elevation: 316,  avgDailyPsh: 5.95, annualGHI: 2172, avgTempC: 28.4 },
  { name: 'Bobo-Dioulasso', country: 'Burkina Faso', countryCode: 'BF', region: 'West Africa', lat: 11.18,  lon: -4.30,  elevation: 439,  avgDailyPsh: 5.65, annualGHI: 2062, avgTempC: 27.3 },
  { name: 'Koudougou',      country: 'Burkina Faso', countryCode: 'BF', region: 'West Africa', lat: 12.25,  lon: -2.37,  elevation: 298,  avgDailyPsh: 5.88, annualGHI: 2146, avgTempC: 28.1 },
  { name: 'Dori',           country: 'Burkina Faso', countryCode: 'BF', region: 'West Africa', lat: 14.03,  lon: -0.03,  elevation: 277,  avgDailyPsh: 6.18, annualGHI: 2256, avgTempC: 29.8 },
  // Senegal
  { name: 'Dakar',          country: 'Senegal', countryCode: 'SN', region: 'West Africa', lat: 14.72,  lon: -17.47, elevation: 22,   avgDailyPsh: 5.55, annualGHI: 2026, avgTempC: 24.6 },
  { name: 'Saint-Louis',    country: 'Senegal', countryCode: 'SN', region: 'West Africa', lat: 16.03,  lon: -16.50, elevation: 7,    avgDailyPsh: 5.80, annualGHI: 2117, avgTempC: 25.8 },
  { name: 'Tambacounda',    country: 'Senegal', countryCode: 'SN', region: 'West Africa', lat: 13.77,  lon: -13.67, elevation: 49,   avgDailyPsh: 5.70, annualGHI: 2081, avgTempC: 28.5 },
  { name: 'Ziguinchor',     country: 'Senegal', countryCode: 'SN', region: 'West Africa', lat: 12.57,  lon: -16.27, elevation: 20,   avgDailyPsh: 5.10, annualGHI: 1862, avgTempC: 27.2 },
  // Gambia
  { name: 'Banjul',         country: 'Gambia', countryCode: 'GM', region: 'West Africa', lat: 13.45,  lon: -16.57, elevation: 28,   avgDailyPsh: 5.20, annualGHI: 1898, avgTempC: 26.8 },
  { name: 'Serekunda',      country: 'Gambia', countryCode: 'GM', region: 'West Africa', lat: 13.44,  lon: -16.68, elevation: 23,   avgDailyPsh: 5.18, annualGHI: 1891, avgTempC: 26.9 },
  { name: 'Brikama',        country: 'Gambia', countryCode: 'GM', region: 'West Africa', lat: 13.27,  lon: -16.65, elevation: 18,   avgDailyPsh: 5.15, annualGHI: 1880, avgTempC: 27.0 },
  // Guinea-Bissau
  { name: 'Bissau',         country: 'Guinea-Bissau', countryCode: 'GW', region: 'West Africa', lat: 11.87,  lon: -15.60, elevation: 14,   avgDailyPsh: 4.85, annualGHI: 1770, avgTempC: 26.7 },
  { name: 'Bafatá',         country: 'Guinea-Bissau', countryCode: 'GW', region: 'West Africa', lat: 12.17,  lon: -14.65, elevation: 35,   avgDailyPsh: 5.00, annualGHI: 1825, avgTempC: 27.4 },
  { name: 'Gabú',           country: 'Guinea-Bissau', countryCode: 'GW', region: 'West Africa', lat: 12.28,  lon: -14.22, elevation: 62,   avgDailyPsh: 5.05, annualGHI: 1843, avgTempC: 27.8 },
  // Guinea
  { name: 'Conakry',        country: 'Guinea', countryCode: 'GN', region: 'West Africa', lat: 9.54,   lon: -13.68, elevation: 26,   avgDailyPsh: 4.55, annualGHI: 1661, avgTempC: 26.5 },
  { name: 'Kankan',         country: 'Guinea', countryCode: 'GN', region: 'West Africa', lat: 10.38,  lon: -9.30,  elevation: 375,  avgDailyPsh: 5.00, annualGHI: 1825, avgTempC: 27.1 },
  { name: 'Labé',           country: 'Guinea', countryCode: 'GN', region: 'West Africa', lat: 11.32,  lon: -12.28, elevation: 1064, avgDailyPsh: 4.90, annualGHI: 1789, avgTempC: 22.5 },
  { name: 'N\'Zérékoré',    country: 'Guinea', countryCode: 'GN', region: 'West Africa', lat: 7.75,   lon: -8.82,  elevation: 524,  avgDailyPsh: 4.65, annualGHI: 1697, avgTempC: 25.4 },
  // Sierra Leone
  { name: 'Freetown',       country: 'Sierra Leone', countryCode: 'SL', region: 'West Africa', lat: 8.49,   lon: -13.23, elevation: 27,   avgDailyPsh: 4.40, annualGHI: 1606, avgTempC: 26.2 },
  { name: 'Bo',             country: 'Sierra Leone', countryCode: 'SL', region: 'West Africa', lat: 7.97,   lon: -11.74, elevation: 76,   avgDailyPsh: 4.55, annualGHI: 1661, avgTempC: 26.0 },
  { name: 'Kenema',         country: 'Sierra Leone', countryCode: 'SL', region: 'West Africa', lat: 7.88,   lon: -11.19, elevation: 55,   avgDailyPsh: 4.60, annualGHI: 1679, avgTempC: 26.1 },
  // Liberia
  { name: 'Monrovia',       country: 'Liberia', countryCode: 'LR', region: 'West Africa', lat: 6.30,   lon: -10.80, elevation: 23,   avgDailyPsh: 4.25, annualGHI: 1551, avgTempC: 26.8 },
  { name: 'Buchanan',       country: 'Liberia', countryCode: 'LR', region: 'West Africa', lat: 5.88,   lon: -10.04, elevation: 6,    avgDailyPsh: 4.30, annualGHI: 1570, avgTempC: 26.6 },
  { name: 'Gbarnga',        country: 'Liberia', countryCode: 'LR', region: 'West Africa', lat: 7.00,   lon: -9.47,  elevation: 223,  avgDailyPsh: 4.45, annualGHI: 1624, avgTempC: 26.0 },
  // Côte d'Ivoire
  { name: 'Abidjan',        country: "Côte d'Ivoire", countryCode: 'CI', region: 'West Africa', lat: 5.35,   lon: -4.00,  elevation: 22,   avgDailyPsh: 4.70, annualGHI: 1716, avgTempC: 26.6 },
  { name: 'Yamoussoukro',   country: "Côte d'Ivoire", countryCode: 'CI', region: 'West Africa', lat: 6.82,   lon: -5.28,  elevation: 213,  avgDailyPsh: 4.80, annualGHI: 1752, avgTempC: 26.2 },
  { name: 'Bouaké',         country: "Côte d'Ivoire", countryCode: 'CI', region: 'West Africa', lat: 7.69,   lon: -5.03,  elevation: 375,  avgDailyPsh: 5.00, annualGHI: 1825, avgTempC: 26.5 },
  { name: 'Korhogo',        country: "Côte d'Ivoire", countryCode: 'CI', region: 'West Africa', lat: 9.45,   lon: -5.63,  elevation: 393,  avgDailyPsh: 5.30, annualGHI: 1935, avgTempC: 27.8 },
  // Ghana
  { name: 'Accra',          country: 'Ghana', countryCode: 'GH', region: 'West Africa', lat: 5.55,   lon: -0.20,  elevation: 61,   avgDailyPsh: 5.00, annualGHI: 1825, avgTempC: 27.2 },
  { name: 'Kumasi',         country: 'Ghana', countryCode: 'GH', region: 'West Africa', lat: 6.69,   lon: -1.62,  elevation: 270,  avgDailyPsh: 4.85, annualGHI: 1770, avgTempC: 26.6 },
  { name: 'Tamale',         country: 'Ghana', countryCode: 'GH', region: 'West Africa', lat: 9.40,   lon: -0.85,  elevation: 183,  avgDailyPsh: 5.40, annualGHI: 1971, avgTempC: 28.5 },
  { name: 'Bolgatanga',     country: 'Ghana', countryCode: 'GH', region: 'West Africa', lat: 10.79,  lon: -0.85,  elevation: 200,  avgDailyPsh: 5.55, annualGHI: 2026, avgTempC: 29.2 },
  // Togo
  { name: 'Lomé',           country: 'Togo', countryCode: 'TG', region: 'West Africa', lat: 6.13,   lon: 1.22,   elevation: 30,   avgDailyPsh: 4.90, annualGHI: 1789, avgTempC: 27.5 },
  { name: 'Sokodé',         country: 'Togo', countryCode: 'TG', region: 'West Africa', lat: 8.99,   lon: 1.14,   elevation: 404,  avgDailyPsh: 5.10, annualGHI: 1862, avgTempC: 26.8 },
  { name: 'Kara',           country: 'Togo', countryCode: 'TG', region: 'West Africa', lat: 9.55,   lon: 1.19,   elevation: 400,  avgDailyPsh: 5.20, annualGHI: 1898, avgTempC: 27.0 },
  // Benin
  { name: 'Cotonou',        country: 'Benin', countryCode: 'BJ', region: 'West Africa', lat: 6.37,   lon: 2.42,   elevation: 9,    avgDailyPsh: 4.88, annualGHI: 1781, avgTempC: 27.8 },
  { name: 'Porto-Novo',     country: 'Benin', countryCode: 'BJ', region: 'West Africa', lat: 6.50,   lon: 2.63,   elevation: 24,   avgDailyPsh: 4.90, annualGHI: 1789, avgTempC: 27.7 },
  { name: 'Parakou',        country: 'Benin', countryCode: 'BJ', region: 'West Africa', lat: 9.34,   lon: 2.63,   elevation: 393,  avgDailyPsh: 5.30, annualGHI: 1935, avgTempC: 28.2 },
  { name: 'Natitingou',     country: 'Benin', countryCode: 'BJ', region: 'West Africa', lat: 10.32,  lon: 1.38,   elevation: 459,  avgDailyPsh: 5.45, annualGHI: 1989, avgTempC: 27.5 },
  // Nigeria
  { name: 'Lagos',          country: 'Nigeria', countryCode: 'NG', region: 'West Africa', lat: 6.46,   lon: 3.39,   elevation: 4,    avgDailyPsh: 4.75, annualGHI: 1734, avgTempC: 27.9 },
  { name: 'Abuja',          country: 'Nigeria', countryCode: 'NG', region: 'West Africa', lat: 9.05,   lon: 7.49,   elevation: 476,  avgDailyPsh: 5.30, annualGHI: 1935, avgTempC: 26.4 },
  { name: 'Kano',           country: 'Nigeria', countryCode: 'NG', region: 'West Africa', lat: 12.00,  lon: 8.52,   elevation: 475,  avgDailyPsh: 6.10, annualGHI: 2227, avgTempC: 26.8 },
  { name: 'Ibadan',         country: 'Nigeria', countryCode: 'NG', region: 'West Africa', lat: 7.38,   lon: 3.90,   elevation: 186,  avgDailyPsh: 4.95, annualGHI: 1807, avgTempC: 26.6 },
  { name: 'Maiduguri',      country: 'Nigeria', countryCode: 'NG', region: 'West Africa', lat: 11.83,  lon: 13.15,  elevation: 354,  avgDailyPsh: 6.25, annualGHI: 2281, avgTempC: 28.5 },
  { name: 'Port Harcourt',  country: 'Nigeria', countryCode: 'NG', region: 'West Africa', lat: 4.78,   lon: 7.01,   elevation: 18,   avgDailyPsh: 4.50, annualGHI: 1643, avgTempC: 27.3 },
  // Cabo Verde
  { name: 'Praia',          country: 'Cabo Verde', countryCode: 'CV', region: 'West Africa', lat: 14.93,  lon: -23.51, elevation: 28,   avgDailyPsh: 6.00, annualGHI: 2190, avgTempC: 24.2 },
  { name: 'Mindelo',        country: 'Cabo Verde', countryCode: 'CV', region: 'West Africa', lat: 16.89,  lon: -25.00, elevation: 11,   avgDailyPsh: 6.10, annualGHI: 2227, avgTempC: 23.5 },
  { name: 'Sal',            country: 'Cabo Verde', countryCode: 'CV', region: 'West Africa', lat: 16.73,  lon: -22.94, elevation: 54,   avgDailyPsh: 6.20, annualGHI: 2263, avgTempC: 24.0 },
]

// ── Central Africa ───────────────────────────────────────────────────────────

const centralAfrica: AfricaCity[] = [
  // Chad
  { name: "N'Djamena",      country: 'Chad', countryCode: 'TD', region: 'Central Africa', lat: 12.11,  lon: 15.04,  elevation: 295,  avgDailyPsh: 6.10, annualGHI: 2227, avgTempC: 28.8 },
  { name: 'Moundou',        country: 'Chad', countryCode: 'TD', region: 'Central Africa', lat: 8.57,   lon: 16.08,  elevation: 420,  avgDailyPsh: 5.60, annualGHI: 2044, avgTempC: 27.3 },
  { name: 'Abéché',         country: 'Chad', countryCode: 'TD', region: 'Central Africa', lat: 13.83,  lon: 20.83,  elevation: 545,  avgDailyPsh: 6.40, annualGHI: 2336, avgTempC: 29.2 },
  { name: 'Sarh',           country: 'Chad', countryCode: 'TD', region: 'Central Africa', lat: 9.15,   lon: 18.39,  elevation: 368,  avgDailyPsh: 5.55, annualGHI: 2026, avgTempC: 27.6 },
  // Cameroon
  { name: 'Yaoundé',        country: 'Cameroon', countryCode: 'CM', region: 'Central Africa', lat: 3.87,   lon: 11.52,  elevation: 726,  avgDailyPsh: 4.50, annualGHI: 1643, avgTempC: 23.6 },
  { name: 'Douala',         country: 'Cameroon', countryCode: 'CM', region: 'Central Africa', lat: 4.05,   lon: 9.70,   elevation: 13,   avgDailyPsh: 4.10, annualGHI: 1497, avgTempC: 26.5 },
  { name: 'Garoua',         country: 'Cameroon', countryCode: 'CM', region: 'Central Africa', lat: 9.30,   lon: 13.40,  elevation: 241,  avgDailyPsh: 5.70, annualGHI: 2081, avgTempC: 28.4 },
  { name: 'Maroua',         country: 'Cameroon', countryCode: 'CM', region: 'Central Africa', lat: 10.59,  lon: 14.32,  elevation: 404,  avgDailyPsh: 5.95, annualGHI: 2172, avgTempC: 28.9 },
  // Central African Republic
  { name: 'Bangui',         country: 'Central African Republic', countryCode: 'CF', region: 'Central Africa', lat: 4.36,   lon: 18.55,  elevation: 373,  avgDailyPsh: 4.65, annualGHI: 1697, avgTempC: 25.8 },
  { name: 'Bambari',        country: 'Central African Republic', countryCode: 'CF', region: 'Central Africa', lat: 5.77,   lon: 20.68,  elevation: 469,  avgDailyPsh: 4.70, annualGHI: 1716, avgTempC: 25.5 },
  { name: 'Berberati',      country: 'Central African Republic', countryCode: 'CF', region: 'Central Africa', lat: 4.26,   lon: 15.79,  elevation: 580,  avgDailyPsh: 4.55, annualGHI: 1661, avgTempC: 24.8 },
  // Equatorial Guinea
  { name: 'Malabo',         country: 'Equatorial Guinea', countryCode: 'GQ', region: 'Central Africa', lat: 3.75,   lon: 8.78,   elevation: 41,   avgDailyPsh: 4.00, annualGHI: 1460, avgTempC: 25.8 },
  { name: 'Bata',           country: 'Equatorial Guinea', countryCode: 'GQ', region: 'Central Africa', lat: 1.87,   lon: 9.77,   elevation: 17,   avgDailyPsh: 4.10, annualGHI: 1497, avgTempC: 25.6 },
  { name: 'Ebebiyín',       country: 'Equatorial Guinea', countryCode: 'GQ', region: 'Central Africa', lat: 2.15,   lon: 11.33,  elevation: 636,  avgDailyPsh: 4.20, annualGHI: 1533, avgTempC: 24.5 },
  // Gabon
  { name: 'Libreville',     country: 'Gabon', countryCode: 'GA', region: 'Central Africa', lat: 0.39,   lon: 9.45,   elevation: 9,    avgDailyPsh: 4.15, annualGHI: 1515, avgTempC: 26.0 },
  { name: 'Port-Gentil',    country: 'Gabon', countryCode: 'GA', region: 'Central Africa', lat: -0.72,  lon: 8.78,   elevation: 7,    avgDailyPsh: 4.20, annualGHI: 1533, avgTempC: 25.8 },
  { name: 'Franceville',    country: 'Gabon', countryCode: 'GA', region: 'Central Africa', lat: -1.63,  lon: 13.58,  elevation: 310,  avgDailyPsh: 4.35, annualGHI: 1588, avgTempC: 24.5 },
  // Republic of Congo
  { name: 'Brazzaville',    country: 'Republic of Congo', countryCode: 'CG', region: 'Central Africa', lat: -4.27,  lon: 15.28,  elevation: 320,  avgDailyPsh: 4.40, annualGHI: 1606, avgTempC: 24.9 },
  { name: 'Pointe-Noire',   country: 'Republic of Congo', countryCode: 'CG', region: 'Central Africa', lat: -4.78,  lon: 11.87,  elevation: 17,   avgDailyPsh: 4.30, annualGHI: 1570, avgTempC: 24.7 },
  { name: 'Dolisie',        country: 'Republic of Congo', countryCode: 'CG', region: 'Central Africa', lat: -4.20,  lon: 12.67,  elevation: 378,  avgDailyPsh: 4.35, annualGHI: 1588, avgTempC: 24.3 },
  // DR Congo
  { name: 'Kinshasa',       country: 'DR Congo', countryCode: 'CD', region: 'Central Africa', lat: -4.32,  lon: 15.32,  elevation: 312,  avgDailyPsh: 4.45, annualGHI: 1624, avgTempC: 25.2 },
  { name: 'Lubumbashi',     country: 'DR Congo', countryCode: 'CD', region: 'Central Africa', lat: -11.67, lon: 27.47,  elevation: 1231, avgDailyPsh: 5.30, annualGHI: 1935, avgTempC: 20.2 },
  { name: 'Mbuji-Mayi',     country: 'DR Congo', countryCode: 'CD', region: 'Central Africa', lat: -6.15,  lon: 23.60,  elevation: 614,  avgDailyPsh: 4.65, annualGHI: 1697, avgTempC: 24.1 },
  { name: 'Kisangani',      country: 'DR Congo', countryCode: 'CD', region: 'Central Africa', lat: 0.52,   lon: 25.19,  elevation: 396,  avgDailyPsh: 4.40, annualGHI: 1606, avgTempC: 25.3 },
  { name: 'Goma',           country: 'DR Congo', countryCode: 'CD', region: 'Central Africa', lat: -1.67,  lon: 29.22,  elevation: 1534, avgDailyPsh: 4.80, annualGHI: 1752, avgTempC: 19.8 },
  // São Tomé and Príncipe
  { name: 'São Tomé',       country: 'São Tomé and Príncipe', countryCode: 'ST', region: 'Central Africa', lat: 0.34,   lon: 6.73,   elevation: 7,    avgDailyPsh: 4.10, annualGHI: 1497, avgTempC: 26.0 },
  { name: 'Trinidade',      country: 'São Tomé and Príncipe', countryCode: 'ST', region: 'Central Africa', lat: 0.29,   lon: 6.67,   elevation: 14,   avgDailyPsh: 4.05, annualGHI: 1478, avgTempC: 26.1 },
  { name: 'Santo António',  country: 'São Tomé and Príncipe', countryCode: 'ST', region: 'Central Africa', lat: 1.65,   lon: 7.42,   elevation: 11,   avgDailyPsh: 4.15, annualGHI: 1515, avgTempC: 25.6 },
]

// ── East Africa ──────────────────────────────────────────────────────────────

const eastAfrica: AfricaCity[] = [
  // South Sudan
  { name: 'Juba',           country: 'South Sudan', countryCode: 'SS', region: 'East Africa', lat: 4.85,   lon: 31.60,  elevation: 460,  avgDailyPsh: 5.55, annualGHI: 2026, avgTempC: 29.0 },
  { name: 'Wau',            country: 'South Sudan', countryCode: 'SS', region: 'East Africa', lat: 7.70,   lon: 28.00,  elevation: 438,  avgDailyPsh: 5.65, annualGHI: 2062, avgTempC: 27.8 },
  { name: 'Malakal',        country: 'South Sudan', countryCode: 'SS', region: 'East Africa', lat: 9.55,   lon: 31.66,  elevation: 388,  avgDailyPsh: 5.90, annualGHI: 2154, avgTempC: 28.5 },
  { name: 'Yei',            country: 'South Sudan', countryCode: 'SS', region: 'East Africa', lat: 4.09,   lon: 30.68,  elevation: 662,  avgDailyPsh: 5.20, annualGHI: 1898, avgTempC: 26.4 },
  // Ethiopia
  { name: 'Addis Ababa',    country: 'Ethiopia', countryCode: 'ET', region: 'East Africa', lat: 9.02,   lon: 38.75,  elevation: 2355, avgDailyPsh: 5.55, annualGHI: 2026, avgTempC: 16.5 },
  { name: 'Dire Dawa',      country: 'Ethiopia', countryCode: 'ET', region: 'East Africa', lat: 9.60,   lon: 41.87,  elevation: 1180, avgDailyPsh: 6.00, annualGHI: 2190, avgTempC: 25.0 },
  { name: 'Mekelle',        country: 'Ethiopia', countryCode: 'ET', region: 'East Africa', lat: 13.49,  lon: 39.48,  elevation: 2084, avgDailyPsh: 6.20, annualGHI: 2263, avgTempC: 18.8 },
  { name: 'Gondar',         country: 'Ethiopia', countryCode: 'ET', region: 'East Africa', lat: 12.60,  lon: 37.47,  elevation: 2133, avgDailyPsh: 5.85, annualGHI: 2135, avgTempC: 19.1 },
  { name: 'Hawassa',        country: 'Ethiopia', countryCode: 'ET', region: 'East Africa', lat: 7.05,   lon: 38.47,  elevation: 1708, avgDailyPsh: 5.45, annualGHI: 1989, avgTempC: 20.8 },
  { name: 'Bahir Dar',      country: 'Ethiopia', countryCode: 'ET', region: 'East Africa', lat: 11.59,  lon: 37.38,  elevation: 1840, avgDailyPsh: 5.65, annualGHI: 2062, avgTempC: 20.0 },
  // Eritrea
  { name: 'Asmara',         country: 'Eritrea', countryCode: 'ER', region: 'East Africa', lat: 15.34,  lon: 38.93,  elevation: 2325, avgDailyPsh: 6.40, annualGHI: 2336, avgTempC: 16.5 },
  { name: 'Keren',          country: 'Eritrea', countryCode: 'ER', region: 'East Africa', lat: 15.78,  lon: 38.45,  elevation: 1391, avgDailyPsh: 6.55, annualGHI: 2391, avgTempC: 20.6 },
  { name: 'Massawa',        country: 'Eritrea', countryCode: 'ER', region: 'East Africa', lat: 15.61,  lon: 39.45,  elevation: 8,    avgDailyPsh: 6.80, annualGHI: 2482, avgTempC: 30.0 },
  // Djibouti
  { name: 'Djibouti City',  country: 'Djibouti', countryCode: 'DJ', region: 'East Africa', lat: 11.59,  lon: 43.14,  elevation: 12,   avgDailyPsh: 6.70, annualGHI: 2446, avgTempC: 28.5 },
  { name: 'Ali Sabieh',     country: 'Djibouti', countryCode: 'DJ', region: 'East Africa', lat: 11.16,  lon: 42.71,  elevation: 790,  avgDailyPsh: 6.50, annualGHI: 2373, avgTempC: 26.3 },
  { name: 'Tadjoura',       country: 'Djibouti', countryCode: 'DJ', region: 'East Africa', lat: 11.79,  lon: 42.89,  elevation: 23,   avgDailyPsh: 6.65, annualGHI: 2427, avgTempC: 28.2 },
  // Somalia
  { name: 'Mogadishu',      country: 'Somalia', countryCode: 'SO', region: 'East Africa', lat: 2.05,   lon: 45.34,  elevation: 9,    avgDailyPsh: 6.60, annualGHI: 2409, avgTempC: 27.8 },
  { name: 'Hargeisa',       country: 'Somalia', countryCode: 'SO', region: 'East Africa', lat: 9.56,   lon: 44.07,  elevation: 1334, avgDailyPsh: 7.00, annualGHI: 2555, avgTempC: 21.4 },
  { name: 'Bosaso',         country: 'Somalia', countryCode: 'SO', region: 'East Africa', lat: 11.28,  lon: 49.18,  elevation: 4,    avgDailyPsh: 7.20, annualGHI: 2628, avgTempC: 29.9 },
  { name: 'Kismayo',        country: 'Somalia', countryCode: 'SO', region: 'East Africa', lat: -0.36,  lon: 42.54,  elevation: 12,   avgDailyPsh: 6.45, annualGHI: 2354, avgTempC: 27.5 },
  // Kenya
  { name: 'Nairobi',        country: 'Kenya', countryCode: 'KE', region: 'East Africa', lat: -1.29,  lon: 36.82,  elevation: 1661, avgDailyPsh: 5.60, annualGHI: 2044, avgTempC: 17.8 },
  { name: 'Mombasa',        country: 'Kenya', countryCode: 'KE', region: 'East Africa', lat: -4.05,  lon: 39.67,  elevation: 17,   avgDailyPsh: 5.90, annualGHI: 2154, avgTempC: 27.1 },
  { name: 'Kisumu',         country: 'Kenya', countryCode: 'KE', region: 'East Africa', lat: -0.10,  lon: 34.76,  elevation: 1131, avgDailyPsh: 5.20, annualGHI: 1898, avgTempC: 22.6 },
  { name: 'Nakuru',         country: 'Kenya', countryCode: 'KE', region: 'East Africa', lat: -0.30,  lon: 36.07,  elevation: 1850, avgDailyPsh: 5.50, annualGHI: 2008, avgTempC: 17.5 },
  { name: 'Eldoret',        country: 'Kenya', countryCode: 'KE', region: 'East Africa', lat: 0.52,   lon: 35.27,  elevation: 2085, avgDailyPsh: 5.40, annualGHI: 1971, avgTempC: 16.5 },
  { name: 'Turkana (Lodwar)', country: 'Kenya', countryCode: 'KE', region: 'East Africa', lat: 3.12,   lon: 35.60,  elevation: 506,  avgDailyPsh: 6.30, annualGHI: 2300, avgTempC: 30.5 },
  // Uganda
  { name: 'Kampala',        country: 'Uganda', countryCode: 'UG', region: 'East Africa', lat: 0.32,   lon: 32.58,  elevation: 1189, avgDailyPsh: 5.10, annualGHI: 1862, avgTempC: 22.6 },
  { name: 'Gulu',           country: 'Uganda', countryCode: 'UG', region: 'East Africa', lat: 2.77,   lon: 32.30,  elevation: 1109, avgDailyPsh: 5.35, annualGHI: 1953, avgTempC: 25.0 },
  { name: 'Mbarara',        country: 'Uganda', countryCode: 'UG', region: 'East Africa', lat: -0.61,  lon: 30.66,  elevation: 1430, avgDailyPsh: 5.00, annualGHI: 1825, avgTempC: 20.8 },
  { name: 'Jinja',          country: 'Uganda', countryCode: 'UG', region: 'East Africa', lat: 0.45,   lon: 33.20,  elevation: 1155, avgDailyPsh: 5.05, annualGHI: 1843, avgTempC: 22.0 },
  // Tanzania
  { name: 'Dar es Salaam',  country: 'Tanzania', countryCode: 'TZ', region: 'East Africa', lat: -6.80,  lon: 39.28,  elevation: 55,   avgDailyPsh: 5.80, annualGHI: 2117, avgTempC: 25.8 },
  { name: 'Dodoma',         country: 'Tanzania', countryCode: 'TZ', region: 'East Africa', lat: -6.17,  lon: 35.74,  elevation: 1119, avgDailyPsh: 5.65, annualGHI: 2062, avgTempC: 21.8 },
  { name: 'Mwanza',         country: 'Tanzania', countryCode: 'TZ', region: 'East Africa', lat: -2.52,  lon: 32.91,  elevation: 1140, avgDailyPsh: 5.30, annualGHI: 1935, avgTempC: 22.5 },
  { name: 'Arusha',         country: 'Tanzania', countryCode: 'TZ', region: 'East Africa', lat: -3.37,  lon: 36.68,  elevation: 1387, avgDailyPsh: 5.50, annualGHI: 2008, avgTempC: 20.2 },
  { name: 'Mbeya',          country: 'Tanzania', countryCode: 'TZ', region: 'East Africa', lat: -8.90,  lon: 33.46,  elevation: 1792, avgDailyPsh: 5.40, annualGHI: 1971, avgTempC: 18.8 },
  // Rwanda
  { name: 'Kigali',         country: 'Rwanda', countryCode: 'RW', region: 'East Africa', lat: -1.94,  lon: 30.06,  elevation: 1567, avgDailyPsh: 5.05, annualGHI: 1843, avgTempC: 19.8 },
  { name: 'Butare',         country: 'Rwanda', countryCode: 'RW', region: 'East Africa', lat: -2.60,  lon: 29.74,  elevation: 1768, avgDailyPsh: 4.95, annualGHI: 1807, avgTempC: 19.2 },
  { name: 'Ruhengeri',      country: 'Rwanda', countryCode: 'RW', region: 'East Africa', lat: -1.50,  lon: 29.63,  elevation: 1849, avgDailyPsh: 4.90, annualGHI: 1789, avgTempC: 18.5 },
  // Burundi
  { name: 'Bujumbura',      country: 'Burundi', countryCode: 'BI', region: 'East Africa', lat: -3.38,  lon: 29.36,  elevation: 785,  avgDailyPsh: 5.10, annualGHI: 1862, avgTempC: 23.6 },
  { name: 'Gitega',         country: 'Burundi', countryCode: 'BI', region: 'East Africa', lat: -3.43,  lon: 29.92,  elevation: 1633, avgDailyPsh: 4.95, annualGHI: 1807, avgTempC: 20.1 },
  { name: 'Ngozi',          country: 'Burundi', countryCode: 'BI', region: 'East Africa', lat: -2.91,  lon: 29.83,  elevation: 1630, avgDailyPsh: 4.90, annualGHI: 1789, avgTempC: 19.8 },
  // Seychelles
  { name: 'Victoria',       country: 'Seychelles', countryCode: 'SC', region: 'East Africa', lat: -4.62,  lon: 55.45,  elevation: 3,    avgDailyPsh: 5.40, annualGHI: 1971, avgTempC: 27.5 },
  { name: 'Anse Boileau',   country: 'Seychelles', countryCode: 'SC', region: 'East Africa', lat: -4.72,  lon: 55.49,  elevation: 12,   avgDailyPsh: 5.35, annualGHI: 1953, avgTempC: 27.4 },
  { name: 'Praslin Island', country: 'Seychelles', countryCode: 'SC', region: 'East Africa', lat: -4.33,  lon: 55.73,  elevation: 5,    avgDailyPsh: 5.45, annualGHI: 1989, avgTempC: 27.6 },
  // Comoros
  { name: 'Moroni',         country: 'Comoros', countryCode: 'KM', region: 'East Africa', lat: -11.70, lon: 43.26,  elevation: 26,   avgDailyPsh: 5.00, annualGHI: 1825, avgTempC: 26.0 },
  { name: 'Mutsamudu',      country: 'Comoros', countryCode: 'KM', region: 'East Africa', lat: -12.17, lon: 44.40,  elevation: 6,    avgDailyPsh: 5.05, annualGHI: 1843, avgTempC: 25.8 },
  { name: 'Fomboni',        country: 'Comoros', countryCode: 'KM', region: 'East Africa', lat: -12.29, lon: 43.74,  elevation: 9,    avgDailyPsh: 5.02, annualGHI: 1832, avgTempC: 25.9 },
]

// ── Southern Africa ──────────────────────────────────────────────────────────

const southernAfrica: AfricaCity[] = [
  // Zambia
  { name: 'Lusaka',         country: 'Zambia', countryCode: 'ZM', region: 'Southern Africa', lat: -15.42, lon: 28.28,  elevation: 1279, avgDailyPsh: 5.60, annualGHI: 2044, avgTempC: 20.9 },
  { name: 'Ndola',          country: 'Zambia', countryCode: 'ZM', region: 'Southern Africa', lat: -12.97, lon: 28.63,  elevation: 1270, avgDailyPsh: 5.45, annualGHI: 1989, avgTempC: 21.0 },
  { name: 'Livingstone',    country: 'Zambia', countryCode: 'ZM', region: 'Southern Africa', lat: -17.85, lon: 25.87,  elevation: 990,  avgDailyPsh: 5.95, annualGHI: 2172, avgTempC: 21.8 },
  { name: 'Kasama',         country: 'Zambia', countryCode: 'ZM', region: 'Southern Africa', lat: -10.21, lon: 31.18,  elevation: 1388, avgDailyPsh: 5.30, annualGHI: 1935, avgTempC: 20.4 },
  // Malawi
  { name: 'Lilongwe',       country: 'Malawi', countryCode: 'MW', region: 'Southern Africa', lat: -13.97, lon: 33.79,  elevation: 1050, avgDailyPsh: 5.50, annualGHI: 2008, avgTempC: 20.2 },
  { name: 'Blantyre',       country: 'Malawi', countryCode: 'MW', region: 'Southern Africa', lat: -15.79, lon: 35.00,  elevation: 1040, avgDailyPsh: 5.55, annualGHI: 2026, avgTempC: 20.5 },
  { name: 'Mzuzu',          country: 'Malawi', countryCode: 'MW', region: 'Southern Africa', lat: -11.46, lon: 34.02,  elevation: 1250, avgDailyPsh: 5.30, annualGHI: 1935, avgTempC: 19.5 },
  // Mozambique
  { name: 'Maputo',         country: 'Mozambique', countryCode: 'MZ', region: 'Southern Africa', lat: -25.97, lon: 32.57,  elevation: 47,   avgDailyPsh: 5.50, annualGHI: 2008, avgTempC: 22.1 },
  { name: 'Beira',          country: 'Mozambique', countryCode: 'MZ', region: 'Southern Africa', lat: -19.84, lon: 34.84,  elevation: 9,    avgDailyPsh: 5.60, annualGHI: 2044, avgTempC: 24.6 },
  { name: 'Nampula',        country: 'Mozambique', countryCode: 'MZ', region: 'Southern Africa', lat: -15.12, lon: 39.27,  elevation: 441,  avgDailyPsh: 5.70, annualGHI: 2081, avgTempC: 24.9 },
  { name: 'Pemba',          country: 'Mozambique', countryCode: 'MZ', region: 'Southern Africa', lat: -12.97, lon: 40.52,  elevation: 50,   avgDailyPsh: 5.80, annualGHI: 2117, avgTempC: 26.2 },
  // Angola
  { name: 'Luanda',         country: 'Angola', countryCode: 'AO', region: 'Southern Africa', lat: -8.84,  lon: 13.23,  elevation: 68,   avgDailyPsh: 5.00, annualGHI: 1825, avgTempC: 25.2 },
  { name: 'Huambo',         country: 'Angola', countryCode: 'AO', region: 'Southern Africa', lat: -12.78, lon: 15.74,  elevation: 1701, avgDailyPsh: 5.40, annualGHI: 1971, avgTempC: 18.5 },
  { name: 'Lubango',        country: 'Angola', countryCode: 'AO', region: 'Southern Africa', lat: -14.92, lon: 13.50,  elevation: 1760, avgDailyPsh: 5.65, annualGHI: 2062, avgTempC: 18.0 },
  { name: 'Benguela',       country: 'Angola', countryCode: 'AO', region: 'Southern Africa', lat: -12.58, lon: 13.41,  elevation: 12,   avgDailyPsh: 5.50, annualGHI: 2008, avgTempC: 22.8 },
  // Namibia
  { name: 'Windhoek',       country: 'Namibia', countryCode: 'NA', region: 'Southern Africa', lat: -22.57, lon: 17.08,  elevation: 1726, avgDailyPsh: 6.15, annualGHI: 2245, avgTempC: 18.8 },
  { name: 'Walvis Bay',     country: 'Namibia', countryCode: 'NA', region: 'Southern Africa', lat: -22.96, lon: 14.51,  elevation: 7,    avgDailyPsh: 6.40, annualGHI: 2336, avgTempC: 16.9 },
  { name: 'Swakopmund',     country: 'Namibia', countryCode: 'NA', region: 'Southern Africa', lat: -22.68, lon: 14.53,  elevation: 15,   avgDailyPsh: 6.35, annualGHI: 2318, avgTempC: 16.5 },
  { name: 'Keetmanshoop',   country: 'Namibia', countryCode: 'NA', region: 'Southern Africa', lat: -26.58, lon: 18.13,  elevation: 1004, avgDailyPsh: 6.50, annualGHI: 2373, avgTempC: 17.6 },
  // Botswana
  { name: 'Gaborone',       country: 'Botswana', countryCode: 'BW', region: 'Southern Africa', lat: -24.65, lon: 25.91,  elevation: 998,  avgDailyPsh: 5.90, annualGHI: 2154, avgTempC: 18.8 },
  { name: 'Francistown',    country: 'Botswana', countryCode: 'BW', region: 'Southern Africa', lat: -21.17, lon: 27.51,  elevation: 1000, avgDailyPsh: 5.95, annualGHI: 2172, avgTempC: 19.5 },
  { name: 'Maun',           country: 'Botswana', countryCode: 'BW', region: 'Southern Africa', lat: -19.98, lon: 23.43,  elevation: 946,  avgDailyPsh: 6.20, annualGHI: 2263, avgTempC: 22.0 },
  // Zimbabwe
  { name: 'Harare',         country: 'Zimbabwe', countryCode: 'ZW', region: 'Southern Africa', lat: -17.83, lon: 31.05,  elevation: 1490, avgDailyPsh: 5.60, annualGHI: 2044, avgTempC: 18.4 },
  { name: 'Bulawayo',       country: 'Zimbabwe', countryCode: 'ZW', region: 'Southern Africa', lat: -20.15, lon: 28.58,  elevation: 1344, avgDailyPsh: 5.80, annualGHI: 2117, avgTempC: 18.8 },
  { name: 'Mutare',         country: 'Zimbabwe', countryCode: 'ZW', region: 'Southern Africa', lat: -18.97, lon: 32.65,  elevation: 1106, avgDailyPsh: 5.50, annualGHI: 2008, avgTempC: 19.2 },
  { name: 'Gweru',          country: 'Zimbabwe', countryCode: 'ZW', region: 'Southern Africa', lat: -19.45, lon: 29.82,  elevation: 1421, avgDailyPsh: 5.65, annualGHI: 2062, avgTempC: 18.6 },
  // South Africa
  { name: 'Johannesburg',   country: 'South Africa', countryCode: 'ZA', region: 'Southern Africa', lat: -26.20, lon: 28.04,  elevation: 1753, avgDailyPsh: 5.50, annualGHI: 2008, avgTempC: 15.8 },
  { name: 'Cape Town',      country: 'South Africa', countryCode: 'ZA', region: 'Southern Africa', lat: -33.93, lon: 18.42,  elevation: 42,   avgDailyPsh: 5.40, annualGHI: 1971, avgTempC: 17.2 },
  { name: 'Durban',         country: 'South Africa', countryCode: 'ZA', region: 'Southern Africa', lat: -29.86, lon: 31.02,  elevation: 8,    avgDailyPsh: 5.10, annualGHI: 1862, avgTempC: 20.6 },
  { name: 'Pretoria',       country: 'South Africa', countryCode: 'ZA', region: 'Southern Africa', lat: -25.75, lon: 28.18,  elevation: 1339, avgDailyPsh: 5.55, annualGHI: 2026, avgTempC: 17.8 },
  { name: 'Port Elizabeth', country: 'South Africa', countryCode: 'ZA', region: 'Southern Africa', lat: -33.96, lon: 25.61,  elevation: 56,   avgDailyPsh: 5.30, annualGHI: 1935, avgTempC: 17.5 },
  { name: 'Upington',       country: 'South Africa', countryCode: 'ZA', region: 'Southern Africa', lat: -28.45, lon: 21.26,  elevation: 848,  avgDailyPsh: 6.40, annualGHI: 2336, avgTempC: 19.8 },
  // Lesotho
  { name: 'Maseru',         country: 'Lesotho', countryCode: 'LS', region: 'Southern Africa', lat: -29.32, lon: 27.48,  elevation: 1620, avgDailyPsh: 5.60, annualGHI: 2044, avgTempC: 13.8 },
  { name: 'Teyateyaneng',   country: 'Lesotho', countryCode: 'LS', region: 'Southern Africa', lat: -29.15, lon: 27.75,  elevation: 1625, avgDailyPsh: 5.55, annualGHI: 2026, avgTempC: 13.5 },
  { name: 'Mafeteng',       country: 'Lesotho', countryCode: 'LS', region: 'Southern Africa', lat: -29.82, lon: 27.24,  elevation: 1620, avgDailyPsh: 5.60, annualGHI: 2044, avgTempC: 13.2 },
  // Eswatini
  { name: 'Mbabane',        country: 'Eswatini', countryCode: 'SZ', region: 'Southern Africa', lat: -26.32, lon: 31.14,  elevation: 1243, avgDailyPsh: 5.30, annualGHI: 1935, avgTempC: 17.0 },
  { name: 'Manzini',        country: 'Eswatini', countryCode: 'SZ', region: 'Southern Africa', lat: -26.50, lon: 31.38,  elevation: 709,  avgDailyPsh: 5.40, annualGHI: 1971, avgTempC: 19.5 },
  { name: 'Siteki',         country: 'Eswatini', countryCode: 'SZ', region: 'Southern Africa', lat: -26.45, lon: 31.95,  elevation: 670,  avgDailyPsh: 5.35, annualGHI: 1953, avgTempC: 19.8 },
  // Madagascar
  { name: 'Antananarivo',   country: 'Madagascar', countryCode: 'MG', region: 'Southern Africa', lat: -18.92, lon: 47.54,  elevation: 1276, avgDailyPsh: 5.00, annualGHI: 1825, avgTempC: 17.8 },
  { name: 'Toamasina',      country: 'Madagascar', countryCode: 'MG', region: 'Southern Africa', lat: -18.15, lon: 49.40,  elevation: 6,    avgDailyPsh: 4.70, annualGHI: 1716, avgTempC: 24.5 },
  { name: 'Mahajanga',      country: 'Madagascar', countryCode: 'MG', region: 'Southern Africa', lat: -15.72, lon: 46.32,  elevation: 6,    avgDailyPsh: 5.40, annualGHI: 1971, avgTempC: 25.5 },
  { name: 'Fianarantsoa',   country: 'Madagascar', countryCode: 'MG', region: 'Southern Africa', lat: -21.45, lon: 47.09,  elevation: 1219, avgDailyPsh: 4.90, annualGHI: 1789, avgTempC: 18.2 },
  { name: 'Toliara',        country: 'Madagascar', countryCode: 'MG', region: 'Southern Africa', lat: -23.35, lon: 43.67,  elevation: 9,    avgDailyPsh: 5.50, annualGHI: 2008, avgTempC: 24.8 },
  // Mauritius
  { name: 'Port Louis',     country: 'Mauritius', countryCode: 'MU', region: 'Southern Africa', lat: -20.16, lon: 57.50,  elevation: 5,    avgDailyPsh: 5.20, annualGHI: 1898, avgTempC: 24.8 },
  { name: 'Vacoas',         country: 'Mauritius', countryCode: 'MU', region: 'Southern Africa', lat: -20.30, lon: 57.48,  elevation: 453,  avgDailyPsh: 5.05, annualGHI: 1843, avgTempC: 21.5 },
  { name: 'Curepipe',       country: 'Mauritius', countryCode: 'MU', region: 'Southern Africa', lat: -20.32, lon: 57.52,  elevation: 551,  avgDailyPsh: 5.00, annualGHI: 1825, avgTempC: 20.8 },
]

export const AFRICA_CITIES: AfricaCity[] = [
  ...northAfrica,
  ...westAfrica,
  ...centralAfrica,
  ...eastAfrica,
  ...southernAfrica,
]

export const AFRICA_CITIES_BY_COUNTRY: Record<string, AfricaCity[]> = AFRICA_CITIES.reduce<Record<string, AfricaCity[]>>(
  (acc, city) => {
    if (!acc[city.country]) acc[city.country] = []
    acc[city.country].push(city)
    return acc
  },
  {},
)

export const AFRICA_COUNTRIES: string[] = Object.keys(AFRICA_CITIES_BY_COUNTRY).sort()

export function searchAfricaCities(query: string): AfricaCity[] {
  const q = query.toLowerCase()
  return AFRICA_CITIES.filter(
    (city) =>
      city.name.toLowerCase().includes(q) ||
      city.country.toLowerCase().includes(q),
  )
}
