#!/usr/bin/env node
/**
 * codemod-dashboard-imports.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Option B: Codemod Migration — rewrites all @/components/dashboard/X imports
 * to their canonical domain paths in one pass.
 *
 * Usage:
 *   # Dry run (shows what would change, writes nothing):
 *   node scripts/codemod-dashboard-imports.mjs
 *
 *   # Apply all rewrites:
 *   node scripts/codemod-dashboard-imports.mjs --write
 *
 *   # Scope to a specific directory:
 *   node scripts/codemod-dashboard-imports.mjs --write --dir src/app
 *
 * After running with --write:
 *   1. Run: npm run lint (to confirm no new violations)
 *   2. Run: npm run build (to confirm no broken imports)
 *   3. When all callers are migrated, delete src/components/dashboard/
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';
import path from 'path';

// ── Canonical import map ─────────────────────────────────────────────────────
// Maps every component name exported from dashboard/ to its canonical path.
// Update this map if you add new shims.
const CANONICAL_MAP = {
  // layout/
  DashboardLayout:        '@/components/layout/DashboardLayout',
  DashboardHeader:        '@/components/layout/DashboardHeader',
  DashboardSidebar:       '@/components/layout/DashboardSidebar',
  MobileBottomNav:        '@/components/layout/MobileBottomNav',

  // energy/
  BatteryHealthCard:      '@/components/energy/BatteryHealthCard',
  BatteryStatusCard:      '@/components/energy/BatteryStatusCard',
  BatteryPredictionCard:  '@/components/energy/BatteryPredictionCard',
  PanelStatusTable:       '@/components/energy/PanelStatusTable',
  PowerFlowVisualization: '@/components/energy/PowerFlowVisualization',
  SystemVisualization:    '@/components/energy/SystemVisualization',
  Sparkline:              '@/components/energy/Sparkline',

  // widgets/
  EnergyDetailShell:      '@/components/widgets/EnergyDetailShell',
  AlertsList:             '@/components/widgets/AlertsList',
  StatCards:              '@/components/widgets/StatCards',
  InsightsBanner:         '@/components/widgets/InsightsBanner',
  WeatherCard:            '@/components/widgets/WeatherCard',
  EngineeringKpisCard:    '@/components/widgets/EngineeringKpisCard',
  TimeRangeSwitcher:      '@/components/widgets/TimeRangeSwitcher',

  // financial/
  FinancialDashboard:     '@/components/financial/FinancialDashboard',
};

// ── CLI flags ─────────────────────────────────────────────────────────────────
const DRY_RUN   = !process.argv.includes('--write');
const dirFlag   = process.argv.indexOf('--dir');
const TARGET_DIR = dirFlag !== -1 ? process.argv[dirFlag + 1] : 'src';

// ── Patterns ─────────────────────────────────────────────────────────────────
// Matches:
//   import X from '@/components/dashboard/X'
//   import { X, Y } from '@/components/dashboard/X'
//   import type { X } from '@/components/dashboard/X'
//   import { X } from '@/components/dashboard'     (barrel)
const DASHBOARD_IMPORT_RE =
  /^(import\s+(?:type\s+)?(?:[\w{}\s,*]+\s+from\s+)['"])(@\/components\/dashboard(?:\/([\w]+))?)['"];?$/gm;

// ── Rewrite logic ─────────────────────────────────────────────────────────────
function rewriteFile(filePath) {
  const original = readFileSync(filePath, 'utf8');
  let rewritten  = original;
  let changed    = false;
  const rewrites = [];

  rewritten = rewritten.replace(
    DASHBOARD_IMPORT_RE,
    (match, prefix, importPath, componentName) => {
      // Single-component shim import: @/components/dashboard/ComponentName
      if (componentName && CANONICAL_MAP[componentName]) {
        const canonical = CANONICAL_MAP[componentName];
        rewrites.push({ from: importPath, to: canonical });
        changed = true;
        return match.replace(importPath, canonical);
      }

      // Barrel import: @/components/dashboard — cannot auto-resolve without
      // knowing which named exports are used. Flag it for manual review.
      if (!componentName) {
        rewrites.push({
          from: importPath,
          to: '⚠️  MANUAL REVIEW — split barrel import into individual canonical paths',
        });
        // Do not rewrite barrel imports automatically.
        return match;
      }

      return match;
    }
  );

  if (rewrites.length === 0) return;

  const rel = path.relative(process.cwd(), filePath);
  console.log(`\n📄 ${rel}`);
  for (const r of rewrites) {
    const icon = r.to.startsWith('⚠️') ? '  ⚠️ ' : '  ✅';
    console.log(`${icon}  ${r.from}`);
    if (!r.to.startsWith('⚠️')) console.log(`       → ${r.to}`);
    else console.log(`       ${r.to}`);
  }

  if (!DRY_RUN && changed) {
    writeFileSync(filePath, rewritten, 'utf8');
    console.log('     [written]');
  } else if (DRY_RUN) {
    console.log('     [dry run — not written]');
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🔍 safaricharge dashboard/ import codemod');
  console.log(`   Mode:   ${DRY_RUN ? 'DRY RUN (pass --write to apply)' : 'WRITE MODE'}`);
  console.log(`   Target: ${TARGET_DIR}/**/*.{ts,tsx}\n`);

  const files = await glob(`${TARGET_DIR}/**/*.{ts,tsx}`, {
    ignore: [
      '**/node_modules/**',
      '**/.next/**',
      // Skip the shims themselves — they are the migration source, not the target
      'src/components/dashboard/**',
    ],
  });

  let totalFiles    = 0;
  let affectedFiles = 0;

  for (const file of files) {
    const content = readFileSync(file, 'utf8');
    if (!content.includes('@/components/dashboard')) continue;
    totalFiles++;
    rewriteFile(file);
    affectedFiles++;
  }

  console.log('\n─────────────────────────────────────────────────');
  console.log(`Scanned ${files.length} files.`);
  console.log(`Found ${affectedFiles} file(s) with @/components/dashboard imports.`);

  if (DRY_RUN && affectedFiles > 0) {
    console.log('\nRun with --write to apply all rewrites:');
    console.log('  node scripts/codemod-dashboard-imports.mjs --write');
  }

  if (affectedFiles === 0) {
    console.log('\n✅ No @/components/dashboard imports found. Migration complete!');
    console.log('   You can safely delete src/components/dashboard/');
  }

  console.log('');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
