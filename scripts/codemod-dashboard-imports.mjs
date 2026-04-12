#!/usr/bin/env node
/**
 * codemod-dashboard-imports.mjs  v3
 * ─────────────────────────────────────────────────────────────────────────────
 * Rewrites all @/components/dashboard/X imports to canonical domain paths.
 *
 * What’s new in v3:
 *   - Multiline import normalizer: collapses multiline import blocks into
 *     single lines before pattern matching, then restores them. Handles:
 *       import {          import { BatteryHealthCard,  // Battery widget
 *         BatteryHealthCard,       AlertsList
 *         // comment       } from '@/components/dashboard'
 *         AlertsList
 *       } from '@/components/dashboard'
 *   - Comment-stripping inside import braces before specifier parsing
 *   - Trailing comma tolerance
 *   - Still preserves inline `type` modifiers (TS 4.5+)
 *   - Barrel splitter + CI exit code from v2 unchanged
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
 *   7. Flip resurrection guard: eslint.config.mjs warn → error, remove ignores block
 *   8. npm run build && git commit -m "arch: activate resurrection guard"
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';
import path from 'path';

// ── Canonical import map ────────────────────────────────────────────────────
// Source of truth: COMPONENT_OWNERSHIP.md
// Keep in sync whenever a component is added, moved, or deleted.
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

// ── v3: Multiline import normalizer ───────────────────────────────────────────
//
// Problem: regex patterns work on single lines. A multiline import like:
//   import {
//     BatteryHealthCard,
//     // a comment
//     AlertsList
//   } from '@/components/dashboard'
//
// ...spans 5 lines and cannot be matched by a line-anchored pattern.
//
// Strategy:
//   1. normalizeMultilineImports(): collapse every multiline import block into
//      a single line, stripping inline comments and normalizing whitespace.
//      Track original text ↔ collapsed text mapping for faithful restoration.
//   2. Run all regex patterns against the normalized single-line form.
//   3. restoreMultilineImports(): for any import that was NOT rewritten,
//      restore the original multiline form so we only touch what we change.

/**
 * Collapse multiline import blocks to single lines.
 * Returns { normalized: string, map: Map<collapsedLine, originalBlock> }
 */
function normalizeMultilineImports(source) {
  const map = new Map();

  // Match: import ... { ... (possibly multiline) ... } from '...';
  // The opening brace may be on the same line as `import` or on the next.
  const MULTILINE_IMPORT_RE =
    /^(import\s+(?:type\s+)?)(\{[^}]*\n[^}]*\})(\s*from\s*['"][^'"]+['"];?)$/gm;

  const normalized = source.replace(
    // Use a broader match that catches the full block across newlines
    /(import\s+(?:type\s+)?)\{([^}]*)\}(\s*from\s*['"][^'"]+['"];?)/gs,
    (match, keyword, specifiers, fromClause) => {
      // Only normalize if the block actually spans multiple lines
      if (!match.includes('\n')) return match;

      // Strip inline comments from specifiers
      const cleanSpecifiers = specifiers
        .replace(/\/\/[^\n]*/g, '')  // remove // comments
        .replace(/\/\*[^*]*\*+([^/*][^*]*\*+)*\//g, '') // remove /* */ comments
        .split('\n')
        .map(s => s.trim())
        .filter(Boolean)
        .join(' ');

      // Normalize whitespace and trailing commas in specifiers
      const normalizedSpecifiers = cleanSpecifiers
        .replace(/\s*,\s*/g, ', ')  // normalize comma spacing
        .replace(/,\s*$/, '');      // remove trailing comma

      const collapsed = `${keyword}{ ${normalizedSpecifiers} }${fromClause}`;

      // Store the original block so we can restore it if we don't touch it
      map.set(collapsed.trim(), match);
      return collapsed;
    }
  );

  return { normalized, map };
}

/**
 * For lines that were NOT rewritten, restore their original multiline form.
 * Lines that WERE rewritten stay in their new normalized (single-line) form.
 */
function restoreUnchangedMultilineImports(rewritten, map) {
  let result = rewritten;
  for (const [collapsed, original] of map.entries()) {
    // If the collapsed form survived untouched in the rewritten output, restore it
    if (result.includes(collapsed)) {
      result = result.replace(collapsed, original);
    }
  }
  return result;
}

// ── Regex patterns (operate on normalized single-line input) ─────────────────

// Standard + `import type { X }` forms
const STANDARD_RE =
  /^(import\s+(?:type\s+)?(?:[\w{}\s,*]+\s+from\s+)['"])(@\/components\/dashboard(?:\/([\w]+))?)['"];?$/gm;

// Inline `type` modifier: import { type X, Y } from '...'
const INLINE_TYPE_RE =
  /^(import\s+\{[^}]*\btype\s+\w[^}]*\}\s+from\s+['"])(@\/components\/dashboard(?:\/([\w]+))?)['"];?$/gm;

// ── Barrel splitter ─────────────────────────────────────────────────────────────
function suggestBarrelSplit(matchLine) {
  const specifiersMatch = matchLine.match(/import\s+(?:type\s+)?\{([^}]+)\}/);
  if (!specifiersMatch) return null;

  const rawSpecifiers = specifiersMatch[1]
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  const byPath  = new Map();
  const unknown = [];

  for (const spec of rawSpecifiers) {
    const isInlineType = spec.startsWith('type ');
    const cleanSpec    = isInlineType ? spec.replace(/^type\s+/, '') : spec;
    const localName    = cleanSpec.split(/\s+as\s+/)[0].trim();
    const alias        = cleanSpec.includes(' as ') ? cleanSpec.split(/\s+as\s+/)[1].trim() : null;
    const canonical    = CANONICAL_MAP[localName];

    if (!canonical) { unknown.push(spec); continue; }

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
    lines.push(allTypes
      ? `import type { ${specList} } from '${canonicalPath}';`
      : `import { ${specs.join(', ')} } from '${canonicalPath}';`);
  }

  return { lines, unknown };
}

// ── Rewrite logic ─────────────────────────────────────────────────────────────
function applyPattern(text, pattern, outputLog) {
  let autoFixed = 0;
  let barrelHits = 0;

  const result = text.replace(
    pattern,
    (match, prefix, importPath, componentName) => {
      if (componentName && CANONICAL_MAP[componentName]) {
        const canonical = CANONICAL_MAP[componentName];
        outputLog.push({ type: 'auto', from: importPath, to: canonical });
        autoFixed++;
        return match.replace(importPath, canonical);
      }
      if (!componentName) {
        const suggestion = suggestBarrelSplit(match);
        outputLog.push({ type: 'barrel', match, suggestion });
        barrelHits++;
        return match; // never auto-rewrite barrels
      }
      return match;
    }
  );
  pattern.lastIndex = 0;
  return { result, autoFixed, barrelHits };
}

function processFile(filePath) {
  const original = readFileSync(filePath, 'utf8');
  const rel      = path.relative(process.cwd(), filePath);

  // Step 1: normalize multiline imports
  const { normalized, map: multilineMap } = normalizeMultilineImports(original);

  let rewritten  = normalized;
  let autoFixed  = 0;
  let barrelHits = 0;
  const outputLog = [];

  // Step 2: apply both patterns against normalized form
  for (const pattern of [STANDARD_RE, INLINE_TYPE_RE]) {
    const { result, autoFixed: af, barrelHits: bh } = applyPattern(rewritten, pattern, outputLog);
    rewritten  = result;
    autoFixed  += af;
    barrelHits += bh;
  }

  if (outputLog.length === 0) return { autoFixed: 0, barrelHits: 0 };

  // Step 3: restore unchanged multiline blocks
  if (!DRY_RUN && autoFixed > 0) {
    // Only restore blocks we did NOT touch
    rewritten = restoreUnchangedMultilineImports(rewritten, multilineMap);
  }

  // Print results
  console.log(`\n📄 ${rel}`);
  for (const item of outputLog) {
    if (item.type === 'auto') {
      console.log(`  ✅ ${item.from}`);
      console.log(`       → ${item.to}`);
    } else {
      console.log(`  ⚠️  BARREL — requires manual split:`);
      console.log(`     Original:  ${item.match.trim()}`);
      if (item.suggestion?.lines.length > 0) {
        console.log(`     Replace with:`);
        item.suggestion.lines.forEach(l => console.log(`       ${l}`));
        if (item.suggestion.unknown.length > 0) {
          console.log(`     ❓ Unknown specifiers (add to CANONICAL_MAP): ${item.suggestion.unknown.join(', ')}`);
        }
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
  console.log('\n🔍 safaricharge dashboard/ import codemod  v3');
  console.log(`   Mode:   ${DRY_RUN ? 'DRY RUN — pass --write to apply' : '✏️  WRITE MODE'}`);
  console.log(`   Target: ${TARGET_DIR}/**/*.{ts,tsx}\n`);

  const files = await glob(`${TARGET_DIR}/**/*.{ts,tsx}`, {
    ignore: ['**/node_modules/**', '**/.next/**', 'src/components/dashboard/**'],
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

  console.log('\n─────────────────────────────────────────────────');
  console.log(`Scanned ${files.length} files, ${affectedFiles} affected.`);
  console.log(`  ✅ Auto-fixed:         ${totalAutoFixed} import(s)`);
  console.log(`  ⚠️  Barrel (manual):    ${totalBarrelHits} import(s)`);

  if (totalBarrelHits > 0) {
    console.log('\n⚠️  Barrel imports above need manual splitting. See suggested replacements.');
    console.log('   After fixing, re-run to confirm zero remaining dashboard imports.');
    if (!DRY_RUN) process.exit(1);
  }

  if (totalAutoFixed === 0 && totalBarrelHits === 0) {
    console.log('\n✅ Zero @/components/dashboard imports remain.');
    console.log('   Safe to delete: git rm -r src/components/dashboard/');
    console.log('   Then: flip resurrection guard warn → error in eslint.config.mjs');
  }

  if (DRY_RUN && affectedFiles > 0) {
    console.log('\nApply with:');
    console.log('  node scripts/codemod-dashboard-imports.mjs --write');
  }

  console.log('');
}

main().catch((err) => { console.error(err); process.exit(1); });
