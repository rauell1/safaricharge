/**
 * scripts/seed-database.ts
 *
 * Idempotent catalog seeding script for SafariCharge's Supabase database.
 *
 * Usage (from project root):
 *   npx tsx scripts/seed-database.ts
 *
 * What it seeds:
 *   1. battery_modules         — BATTERY_MODULE_CATALOG + 3 premium extra entries
 *   2. solar_components_catalog — SOLAR_COMPONENT_CATALOG (inverters, modules, EV chargers)
 *   3. irradiance_presets      — KENYA_COUNTY_IRRADIANCE (49 Kenya counties)
 *   4. africa_locations        — AFRICA_CITIES (213 African cities)
 *
 * Strategy:
 *   • Uses the service_role key — bypasses RLS; required for is_builtin = true rows.
 *   • UPSERT on each table's PK — fully idempotent, safe to re-run at any time.
 *   • Rows chunked at CHUNK_SIZE (50) to stay within Supabase's 1 MB body limit.
 *   • Each seeder returns a boolean; non-zero exit code if any seeder fails.
 *
 * Required environment variables (loaded from .env.local, then .env):
 *   NEXT_PUBLIC_SUPABASE_URL   — project URL
 *   SUPABASE_SERVICE_ROLE_KEY  — service role secret (never expose to browser)
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Catalog imports — relative paths from scripts/ → src/lib/
// ---------------------------------------------------------------------------
import {
  BATTERY_MODULE_CATALOG,
  type BatteryModuleSpec,
} from '../src/lib/catalog-physics-bridge';
import {
  SOLAR_COMPONENT_CATALOG,
  type SolarComponentEntry,
} from '../src/lib/solar-component-catalog';
import {
  KENYA_COUNTY_IRRADIANCE,
  type KenyaCountyIrradiance,
} from '../src/lib/kenya-irradiance-data';
import {
  AFRICA_CITIES,
  type AfricaCity,
} from '../src/lib/africa-locations-data';

// ---------------------------------------------------------------------------
// Bootstrap: load env vars
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// .env.local takes precedence; dotenv.config does NOT override already-set vars
dotenv.config({ path: path.join(rootDir, '.env.local') });
dotenv.config({ path: path.join(rootDir, '.env') });

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CHUNK_SIZE = 50;

// ---------------------------------------------------------------------------
// Additional battery modules NOT present in BATTERY_MODULE_CATALOG
// ---------------------------------------------------------------------------

interface AdditionalBatteryModule {
  id: string;
  label: string;
  usable_kwh: number;
  nominal_voltage_v: number;
  max_charge_kw_per_module: number;
  max_discharge_kw_per_module: number;
  chemistry: 'lifepo4' | 'lead-acid' | 'nmc';
  rte: number;
  min_modules: number;
  max_modules: number;
  catalog_id: string;
  is_builtin: boolean;
  user_id: null;
}

const ADDITIONAL_BATTERY_MODULES: AdditionalBatteryModule[] = [
  {
    id: 'pylontech-us3000c',
    label: 'Pylontech US3000C 2.4 kWh',
    usable_kwh: 2.4,
    nominal_voltage_v: 48,
    max_charge_kw_per_module: 1.8,
    max_discharge_kw_per_module: 1.8,
    chemistry: 'lifepo4',
    rte: 0.95,
    min_modules: 1,
    max_modules: 8,
    catalog_id: 'pylontech-us3000c',
    is_builtin: true,
    user_id: null,
  },
  {
    id: 'jinko-suntank-c10',
    label: 'Jinko SunTank C10 9.7 kWh',
    usable_kwh: 9.7,
    nominal_voltage_v: 51.2,
    max_charge_kw_per_module: 5.0,
    max_discharge_kw_per_module: 5.0,
    chemistry: 'lifepo4',
    rte: 0.96,
    min_modules: 1,
    max_modules: 4,
    catalog_id: 'jinko-suntank-c10',
    is_builtin: true,
    user_id: null,
  },
  {
    id: 'byd-lvs-4.0',
    label: 'BYD Battery-Box Premium LVS 4.0 kWh',
    usable_kwh: 3.84,
    nominal_voltage_v: 48,
    max_charge_kw_per_module: 2.5,
    max_discharge_kw_per_module: 2.5,
    chemistry: 'lifepo4',
    rte: 0.97,
    min_modules: 2,
    max_modules: 8,
    catalog_id: 'byd-lvs',
    is_builtin: true,
    user_id: null,
  },
];

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

/** Chunk an array into sub-arrays of at most `size` elements. */
function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

/** Produce an id slug from a city name and country code. */
function africaLocationSlug(name: string, countryCode: string): string {
  return (
    name.toLowerCase().replace(/[^a-z0-9]+/g, '-') +
    '-' +
    countryCode.toLowerCase()
  );
}

/** Pretty-print elapsed time in ms or s. */
function elapsed(startMs: number): string {
  const ms = Date.now() - startMs;
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${ms}ms`;
}

// ---------------------------------------------------------------------------
// Mapping functions: TypeScript catalog shape → DB snake_case row shape
// ---------------------------------------------------------------------------

function mapBatteryModuleSpec(spec: BatteryModuleSpec): Record<string, unknown> {
  return {
    id: spec.id,
    label: spec.label,
    usable_kwh: spec.usableKwh,
    nominal_voltage_v: spec.nominalVoltageV,
    max_charge_kw_per_module: spec.maxChargeKwPerModule,
    max_discharge_kw_per_module: spec.maxDischargeKwPerModule,
    chemistry: spec.chemistry,
    rte: spec.rte,
    min_modules: spec.minModules,
    max_modules: spec.maxModules,
    catalog_id: spec.catalogId,
    is_builtin: true,
    user_id: null,
  };
}

function mapSolarComponentEntry(entry: SolarComponentEntry): Record<string, unknown> {
  return {
    id: entry.id,
    brand: entry.brand,
    model: entry.model,
    category: entry.category,
    summary: entry.summary,
    typical_use: entry.typicalUse,
    specs: entry.specs,          // jsonb — array of {label, value}
    datasheet_url: entry.datasheetUrl,
    manual_url: entry.manualUrl,
    source: entry.source,
    is_builtin: true,
    user_id: null,
  };
}

function mapKenyaCountyIrradiance(county: KenyaCountyIrradiance): Record<string, unknown> {
  return {
    code: county.code,
    county: county.county,
    lat: county.lat,
    lon: county.lon,
    avg_daily_psh: county.avgDailyPsh,
    annual_yield: county.annualYieldKwhPerKwp,
    climate_zone: county.climateZone,
    is_kosap: county.isKosap,
    // gridReliability is a number in the TS type; nullable int in the DB
    grid_reliability: county.gridReliability ?? null,
    // Store the full object as JSONB for future flexibility
    data: county as unknown as Record<string, unknown>,
  };
}

function mapAfricaCity(city: AfricaCity): Record<string, unknown> {
  return {
    id: africaLocationSlug(city.name, city.countryCode),
    name: city.name,
    country: city.country,
    country_code: city.countryCode,
    region: city.region,
    lat: city.lat,
    lon: city.lon,
    elevation: city.elevation,
    avg_daily_psh: city.avgDailyPsh,
    annual_ghi: city.annualGHI,
    avg_temp_c: city.avgTempC,
  };
}

// ---------------------------------------------------------------------------
// Generic chunked UPSERT helper
// ---------------------------------------------------------------------------

async function upsertChunked(
  supabase: SupabaseClient,
  tableName: string,
  rows: Record<string, unknown>[],
  conflictColumn: string
): Promise<{ seeded: number; errors: string[] }> {
  const errors: string[] = [];
  let seeded = 0;

  for (const batch of chunk(rows, CHUNK_SIZE)) {
    const { error, count } = await supabase
      .from(tableName)
      .upsert(batch, { onConflict: conflictColumn, count: 'exact' })
      .select(); // select triggers the count

    if (error) {
      errors.push(`batch starting at offset ${seeded}: ${error.message}`);
      console.error(`  [${tableName}] UPSERT error (${error.code}): ${error.message}`);
    } else {
      // count may be null if select() returns no metadata; fallback to batch length
      seeded += count ?? batch.length;
    }
  }

  return { seeded, errors };
}

// ---------------------------------------------------------------------------
// Per-table seed functions
// ---------------------------------------------------------------------------

async function seedBatteryModules(supabase: SupabaseClient): Promise<boolean> {
  const label = 'battery_modules';
  const start = Date.now();
  console.log(`\n[${label}] Starting seed…`);

  // Combine catalog entries with the three additional modules
  const catalogRows = BATTERY_MODULE_CATALOG.map(mapBatteryModuleSpec);
  const additionalRows: Record<string, unknown>[] = ADDITIONAL_BATTERY_MODULES.map(
    (m) => ({ ...m }) as Record<string, unknown>
  );
  const allRows = [...catalogRows, ...additionalRows];

  console.log(
    `  Catalog entries: ${catalogRows.length}  |  Additional entries: ${additionalRows.length}  |  Total: ${allRows.length}`
  );

  const { seeded, errors } = await upsertChunked(supabase, label, allRows, 'id');

  if (errors.length === 0) {
    console.log(`  [${label}] Seeded ${seeded} rows successfully in ${elapsed(start)}`);
  } else {
    console.warn(`  [${label}] Seeded ${seeded} rows with ${errors.length} error(s) in ${elapsed(start)}`);
  }

  return errors.length === 0;
}

async function seedSolarComponentsCatalog(supabase: SupabaseClient): Promise<boolean> {
  const label = 'solar_components_catalog';
  const start = Date.now();
  console.log(`\n[${label}] Starting seed…`);

  const rows = SOLAR_COMPONENT_CATALOG.map(mapSolarComponentEntry);
  console.log(`  Entries: ${rows.length}`);

  const { seeded, errors } = await upsertChunked(supabase, label, rows, 'id');

  if (errors.length === 0) {
    console.log(`  [${label}] Seeded ${seeded} rows successfully in ${elapsed(start)}`);
  } else {
    console.warn(`  [${label}] Seeded ${seeded} rows with ${errors.length} error(s) in ${elapsed(start)}`);
  }

  return errors.length === 0;
}

async function seedIrradiancePresets(supabase: SupabaseClient): Promise<boolean> {
  const label = 'irradiance_presets';
  const start = Date.now();
  console.log(`\n[${label}] Starting seed…`);

  const rows = KENYA_COUNTY_IRRADIANCE.map(mapKenyaCountyIrradiance);
  console.log(`  Entries: ${rows.length}`);

  const { seeded, errors } = await upsertChunked(supabase, label, rows, 'code');

  if (errors.length === 0) {
    console.log(`  [${label}] Seeded ${seeded} rows successfully in ${elapsed(start)}`);
  } else {
    console.warn(`  [${label}] Seeded ${seeded} rows with ${errors.length} error(s) in ${elapsed(start)}`);
  }

  return errors.length === 0;
}

async function seedAfricaLocations(supabase: SupabaseClient): Promise<boolean> {
  const label = 'africa_locations';
  const start = Date.now();
  console.log(`\n[${label}] Starting seed…`);

  const rows = AFRICA_CITIES.map(mapAfricaCity);
  console.log(`  Entries: ${rows.length}`);

  const { seeded, errors } = await upsertChunked(supabase, label, rows, 'id');

  if (errors.length === 0) {
    console.log(`  [${label}] Seeded ${seeded} rows successfully in ${elapsed(start)}`);
  } else {
    console.warn(`  [${label}] Seeded ${seeded} rows with ${errors.length} error(s) in ${elapsed(start)}`);
  }

  return errors.length === 0;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

(async () => {
  const totalStart = Date.now();
  console.log('=== SafariCharge Database Seed ===');
  console.log(`Started at: ${new Date().toISOString()}`);

  // ── Validate environment ─────────────────────────────────────────────────
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    console.error('ERROR: NEXT_PUBLIC_SUPABASE_URL is not set.');
    process.exit(1);
  }
  if (!serviceRoleKey) {
    console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY is not set.');
    process.exit(1);
  }

  console.log(`Supabase URL: ${supabaseUrl}`);

  // ── Create service_role client ───────────────────────────────────────────
  // Using @supabase/supabase-js directly (NOT @supabase/ssr).
  // The service_role key bypasses RLS entirely, which is required to seed
  // built-in catalog rows (is_builtin = true, user_id = null).
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // ── Run each seeder, collecting overall success ──────────────────────────
  const results: { table: string; ok: boolean }[] = [];

  results.push({
    table: 'battery_modules',
    ok: await seedBatteryModules(supabase).catch((err) => {
      console.error('[battery_modules] Unexpected error:', err);
      return false;
    }),
  });

  results.push({
    table: 'solar_components_catalog',
    ok: await seedSolarComponentsCatalog(supabase).catch((err) => {
      console.error('[solar_components_catalog] Unexpected error:', err);
      return false;
    }),
  });

  results.push({
    table: 'irradiance_presets',
    ok: await seedIrradiancePresets(supabase).catch((err) => {
      console.error('[irradiance_presets] Unexpected error:', err);
      return false;
    }),
  });

  results.push({
    table: 'africa_locations',
    ok: await seedAfricaLocations(supabase).catch((err) => {
      console.error('[africa_locations] Unexpected error:', err);
      return false;
    }),
  });

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log('\n=== Seed Summary ===');
  let anyFailed = false;
  for (const result of results) {
    const status = result.ok ? 'OK  ' : 'FAIL';
    console.log(`  [${status}] ${result.table}`);
    if (!result.ok) anyFailed = true;
  }
  console.log(`\nCompleted in ${elapsed(totalStart)}`);

  if (anyFailed) {
    console.error('\nOne or more tables failed to seed. Check errors above.');
    process.exit(1);
  } else {
    console.log('\nAll tables seeded successfully.');
    process.exit(0);
  }
})();
