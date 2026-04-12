#!/usr/bin/env node
/**
 * codemod-dashboard-imports.mjs  v2
 * ─────────────────────────────────────────────────────────────────────────────
 * Rewrites all @/components/dashboard/X imports to canonical domain paths.
 *
 * What’s new in v2:
 *   - Catches `import { type X }` inline-type syntax (TS 4.5+)
 *   - Barrel import splitter: groups components by domain and emits
 *     ready-to-paste replacement lines
 *   - Exits with code 1 when barrel imports still need manual resolution (CI-safe)
 *   - Richer summary: auto-fixed / barrel-manual / total counts
 *
 * Usage:
 *   node scripts/codemod-dashboard-imports.mjs            # dry run
 *   node scripts/codemod-dashboard-imports.mjs --write    # apply rewrites
 *   node scripts/codemod-dashboard-imports.mjs --write --dir src/app
 *
 * Migration sequence:
 *   1. node scripts/codemod-dashboard-imports.mjs          # audit
 *   2. node scripts/codemod-dashboard-imports.mjs --write  # apply
 *   3. Fix any remaining barrel imports (shown in output)
 *   4. npm run lint
 *   5. npm run build
 *   6. git rm -r src/components/dashboard/
 *   7. Flip resurrection guard in eslint.config.mjs from 'warn' → 'error'
 *   8. npm run build && git commit
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';
import path from 'path';

// ── Canonical import map ────────────────────────────────────────────────────
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
const DRY_RUN    = !process.argv.includes('--write');
const dirFlag    = process.argv.indexOf('--dir');
const TARGET_DIR = dirFlag !== -1 ? process.argv[dirFlag + 1] : 'src';

// ── Regex patterns ────────────────────────────────────────────────────────────

// Pattern 1: standard and `import type` forms
//   import X from '...'
//   import { X } from '...'
//   import type { X } from '...'
//   import * as X from '...'
const STANDARD_RE =
  /^(import\s+(?:type\s+)?(?:[\w{}\s,*]+\s+from\s+)['"])(@\/components\/dashboard(?:\/([\w]+))?)['"];?$/gm;

// Pattern 2: inline `type` modifier inside braces (TS 4.5+)
//   import { type X } from '...'
//   import { type X, Y, type Z } from '...'
// We match the whole import statement to replace only the path portion.
const INLINE_TYPE_RE =
  /^(import\s+\{[^}]*\btype\s+\w[^}]*\}\s+from\s+['"])(@\/components\/dashboard(?:\/([\w]+))?)['"];?$/gm;

// ── Barrel splitter ────────────────────────────────────────────────────────────
// Given a barrel import like:
//   import { BatteryHealthCard, AlertsList, type StatCardsProps } from '@/components/dashboard'
// Returns a formatted multi-line suggestion grouped by domain:
//   import { BatteryHealthCard } from '@/components/energy/BatteryHealthCard';
//   import { AlertsList } from '@/components/widgets/AlertsList';
//   import type { StatCardsProps } from '@/components/widgets/StatCards';
function suggestBarrelSplit(matchLine) {
  // Extract named specifiers from the braces
  const specifiersMatch = matchLine.match(/import\s+(?:type\s+)?\{([^}]+)\}/);
  if (!specifiersMatch) return null;

  const rawSpecifiers = specifiersMatch[1]
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  // Group by canonical path
  const byPath = new Map();
  const unknown = [];

  for (const spec of rawSpecifiers) {
    // Handle inline `type` modifier: `type X` or `type X as Y`
    const isInlineType = spec.startsWith('type ');
    const cleanSpec    = isInlineType ? spec.replace(/^type\s+/, '') : spec;
    const localName    = cleanSpec.split(/\s+as\s+/)[0].trim(); // strip alias
    const alias        = cleanSpec.includes(' as ') ? cleanSpec.split(/\s+as\s+/)[1].trim() : null;

    const canonical = CANONICAL_MAP[localName];
    if (!canonical) {
      unknown.push(spec);
      continue;
    }

    if (!byPath.has(canonical)) byPath.set(canonical, []);
    const specString = alias
      ? (isInlineType ? `type ${localName} as ${alias}` : `${localName} as ${alias}`)
      : (isInlineType ? `type ${localName}` : localName);
    byPath.get(canonical).push(specString);
  }

  const lines = [];
  for (const [canonicalPath, specs] of byPath.entries()) {
    const allTypes = specs.every(s => s.startsWith('type '));
    const specList = specs.map(s => s.replace(/^type /, '')).join(', ');
    if (allTypes) {
      lines.push(`import type { ${specList} } from '${canonicalPath}';`);
    } else {
      // Mix of type and value imports — keep inline type modifiers
      lines.push(`import { ${specs.join(', ')} } from '${canonicalPath}';`);
    }
  }

  return { lines, unknown };
}

// ── Rewrite logic ─────────────────────────────────────────────────────────────
function processFile(filePath) {
  const original = readFileSync(filePath, 'utf8');
  let rewritten  = original;
  let autoFixed  = 0;
  let barrelHits = 0;
  const output   = [];
  const rel      = path.relative(process.cwd(), filePath);

  // ─ Pass 1: standard + import type { X } forms ────────────────────────────
  for (const pattern of [STANDARD_RE, INLINE_TYPE_RE]) {
    rewritten = rewritten.replace(
      pattern,
      (match, prefix, importPath, componentName) => {
        // Single-file import: @/components/dashboard/ComponentName
        if (componentName && CANONICAL_MAP[componentName]) {
          const canonical = CANONICAL_MAP[componentName];
          output.push({ type: 'auto', from: importPath, to: canonical });
          autoFixed++;
          return match.replace(importPath, canonical);
        }

        // Barrel import: @/components/dashboard (no trailing component)
        if (!componentName) {
          const suggestion = suggestBarrelSplit(match);
          output.push({ type: 'barrel', match, suggestion });
          barrelHits++;
          // Never auto-rewrite barrel imports
          return match;
        }

        return match;
      }
    );
    // Reset lastIndex for safety between patterns
    pattern.lastIndex = 0;
  }

  if (output.length === 0) return { autoFixed: 0, barrelHits: 0 };

  // ─ Print results ──────────────────────────────────────────────────────────────
  console.log(`\n📄 ${rel}`);

  for (const item of output) {
    if (item.type === 'auto') {
      console.log(`  ✅ ${item.from}`);
      console.log(`       → ${item.to}`);
    } else {
      // Barrel import — show the original line + suggested replacement
      console.log(`  ⚠️  BARREL — requires manual split:`);
      console.log(`     Original:  ${item.match.trim()}`);
      if (item.suggestion && item.suggestion.lines.length > 0) {
        console.log(`     Replace with:`);
        for (const line of item.suggestion.lines) {
          console.log(`       ${line}`);
        }
        if (item.suggestion.unknown.length > 0) {
          console.log(`     ❓ Unknown specifiers (add to CANONICAL_MAP): ${item.suggestion.unknown.join(', ')}`);
        }
      } else {
        console.log(`     (Could not parse specifiers — fix manually)`);
      }
    }
  }

  if (!DRY_RUN && autoFixed > 0) {
    writeFileSync(filePath, rewritten, 'utf8');
    console.log(`     [✓ written — ${autoFixed} import(s) rewritten]`);
  } else if (DRY_RUN) {
    console.log(`     [dry run — not written]`);
  }

  return { autoFixed, barrelHits };
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🔍 safaricharge dashboard/ import codemod  v2');
  console.log(`   Mode:   ${DRY_RUN ? 'DRY RUN — pass --write to apply' : '✏️  WRITE MODE'}`);
  console.log(`   Target: ${TARGET_DIR}/**/*.{ts,tsx}\n`);

  const files = await glob(`${TARGET_DIR}/**/*.{ts,tsx}`, {
    ignore: [
      '**/node_modules/**',
      '**/.next/**',
      'src/components/dashboard/**', // skip shims themselves
    ],
  });

  let totalAutoFixed  = 0;
  let totalBarrelHits = 0;
  let affectedFiles   = 0;

  for (const file of files) {
    const content = readFileSync(file, 'utf8');
    if (!content.includes('@/components/dashboard')) continue;
    affectedFiles++;
    const { autoFixed, barrelHits } = processFile(file);
    totalAutoFixed  += autoFixed;
    totalBarrelHits += barrelHits;
  }

  // ─ Summary ──────────────────────────────────────────────────────────────
  console.log('\n─────────────────────────────────────────────────');
  console.log(`Scanned ${files.length} files, ${affectedFiles} affected.`);
  console.log(`  ✅ Auto-fixed:         ${totalAutoFixed} import(s)`);
  console.log(`  ⚠️  Barrel (manual):    ${totalBarrelHits} import(s)`);

  if (totalBarrelHits > 0) {
    console.log('\n⚠️  Barrel imports above need manual splitting. See suggested replacements.');
    console.log('   After fixing, re-run to confirm zero remaining dashboard imports.');
    // Non-zero exit so CI can catch unresolved barrels
    if (!DRY_RUN) process.exit(1);
  }

  if (totalAutoFixed === 0 && totalBarrelHits === 0) {
    console.log('\n✅ Zero @/components/dashboard imports remain.');
    console.log('   Safe to delete: git rm -r src/components/dashboard/');
    console.log('   Then flip the resurrection guard in eslint.config.mjs: warn → error');
  }

  if (DRY_RUN && affectedFiles > 0) {
    console.log('\nApply with:');
    console.log('  node scripts/codemod-dashboard-imports.mjs --write');
  }

  console.log('');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
