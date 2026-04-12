#!/usr/bin/env node
/**
 * check-no-duplicate-components.mjs  v2
 *
 * Scans src/components/ for TSX/TS files that share the same basename
 * across different directories — including case-insensitive matches on
 * Linux CI (where 'statcards.tsx' and 'StatCards.tsx' are different files
 * but resolve to the same module on case-insensitive macOS).
 *
 * Also warns if the same component name is exported with inconsistent styles
 * (one default, one named) across non-shim files.
 *
 * Usage:
 *   node scripts/check-no-duplicate-components.mjs
 *
 * Add to package.json + CI:
 *   "lint:components": "node scripts/check-no-duplicate-components.mjs"
 */

import { readdirSync, readFileSync, statSync } from 'fs';
import { join, basename, extname, relative } from 'path';

// The dashboard/ folder is the ONLY allowed re-export shim directory.
// Files there are expected to share names — they re-export, they don't implement.
const REEXPORT_DIRS = ['src/components/dashboard'];

const ROOT = join(process.cwd(), 'src', 'components');

/** Recursively collect all .tsx/.ts component files */
function collectFiles(dir, results = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      collectFiles(full, results);
    } else if (['.tsx', '.ts'].includes(extname(entry)) && entry !== 'index.ts') {
      results.push(full);
    }
  }
  return results;
}

/** Returns true if the file is inside an allowed re-export shim directory */
function isReexportShim(filePath) {
  const rel = relative(process.cwd(), filePath).replace(/\\/g, '/');
  return REEXPORT_DIRS.some(d => rel.startsWith(d));
}

/** Returns true if file content is purely re-export lines (no real logic) */
function isShimContent(filePath) {
  const src = readFileSync(filePath, 'utf8');
  const nonCommentLines = src
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0)
    .filter(l => !l.startsWith('//') && !l.startsWith('/*') && !l.startsWith('*'));
  return nonCommentLines.every(
    l => l.startsWith('export {') || l.startsWith('export type') || l.startsWith("'use client'")
  );
}

/** Detect export style from file content */
function detectExportStyle(filePath) {
  const src = readFileSync(filePath, 'utf8');
  const hasDefault = /^export default /m.test(src);
  const hasNamed = /^export (function|const|class) /m.test(src) || /^export \{ [^}]+ \}/m.test(src);
  if (hasDefault && hasNamed) return 'mixed';
  if (hasDefault) return 'default';
  if (hasNamed) return 'named';
  return 'unknown';
}

const allFiles = collectFiles(ROOT);

// ── PASS 1: Exact duplicate basenames (case-sensitive) ──────────────────────
const byName = new Map();
for (const f of allFiles) {
  const name = basename(f).replace(/\.tsx?$/, '');
  if (!byName.has(name)) byName.set(name, []);
  byName.get(name).push(f);
}

// ── PASS 2: Case-insensitive duplicates (Linux CI trap) ──────────────────────
const byNameLower = new Map();
for (const f of allFiles) {
  const name = basename(f).replace(/\.tsx?$/, '').toLowerCase();
  if (!byNameLower.has(name)) byNameLower.set(name, []);
  byNameLower.get(name).push(f);
}

let hasViolation = false;
const reported = new Set();

// Check exact duplicates among non-shim implementations
for (const [name, files] of byName) {
  if (files.length <= 1) continue;
  const implementations = files.filter(f => !isReexportShim(f) || !isShimContent(f));
  if (implementations.length > 1) {
    const key = name;
    if (reported.has(key)) continue;
    reported.add(key);
    console.error(`\n❌ DUPLICATE COMPONENT: ${name}`);
    for (const f of implementations) {
      const style = detectExportStyle(f);
      console.error(`   → ${relative(process.cwd(), f)}  [export: ${style}]`);
    }
    hasViolation = true;
  }
}

// Check case-insensitive duplicates among non-shim implementations
for (const [nameLower, files] of byNameLower) {
  if (files.length <= 1) continue;
  const implementations = files.filter(f => !isReexportShim(f) || !isShimContent(f));
  // Only flag if the exact names differ (i.e. truly a case mismatch)
  const exactNames = new Set(implementations.map(f => basename(f).replace(/\.tsx?$/, '')));
  if (exactNames.size > 1) {
    const key = `ci:${nameLower}`;
    if (reported.has(key)) continue;
    reported.add(key);
    console.error(`\n⚠️  CASE-INSENSITIVE DUPLICATE (Linux CI risk): ${nameLower}`);
    for (const f of implementations) {
      console.error(`   → ${relative(process.cwd(), f)}`);
    }
    hasViolation = true;
  }
}

// ── PASS 3: Export style consistency warnings ────────────────────────────────
console.log('\n📋 Export style audit (non-shim canonical files):');
const styleMap = new Map(); // name → { file, style }[]
for (const f of allFiles) {
  if (isReexportShim(f)) continue;
  const name = basename(f).replace(/\.tsx?$/, '');
  if (!styleMap.has(name)) styleMap.set(name, []);
  styleMap.get(name).push({ file: f, style: detectExportStyle(f) });
}

for (const [name, entries] of styleMap) {
  const styles = new Set(entries.map(e => e.style).filter(s => s !== 'unknown'));
  if (styles.size > 1) {
    console.warn(`\n⚠️  MIXED EXPORT STYLES: ${name}`);
    for (const { file, style } of entries) {
      console.warn(`   → ${relative(process.cwd(), file)}  [${style}]`);
    }
  }
}

// ── Result ────────────────────────────────────────────────────────────────────
if (hasViolation) {
  console.error('\n💥 Violations found. Consolidate into canonical directories + add dashboard/ shim.');
  process.exit(1);
} else {
  console.log('\n✅ No duplicate component implementations found.');
  process.exit(0);
}
