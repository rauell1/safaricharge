#!/usr/bin/env node
/**
 * check-no-duplicate-components.mjs
 *
 * Scans src/components/ for TSX/TS files that share the same basename
 * across different directories. Exits with code 1 if duplicates are found
 * outside of the allowed re-export layer (dashboard/).
 *
 * Usage:
 *   node scripts/check-no-duplicate-components.mjs
 *
 * Add to CI:
 *   "scripts": { "lint:components": "node scripts/check-no-duplicate-components.mjs" }
 */

import { readdirSync, readFileSync, statSync } from 'fs';
import { join, basename, extname, relative } from 'path';

// The dashboard/ folder is the ONLY allowed re-export shim directory.
// Files there are expected to duplicate names — they are re-exports, not implementations.
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

/** Returns true if the file is in an allowed re-export directory */
function isReexportShim(filePath) {
  const rel = relative(process.cwd(), filePath).replace(/\\/g, '/');
  return REEXPORT_DIRS.some(d => rel.startsWith(d));
}

/** Returns true if the file content looks like a pure re-export shim */
function isShimContent(filePath) {
  const src = readFileSync(filePath, 'utf8');
  const nonCommentLines = src
    .split('\n')
    .filter(l => l.trim() && !l.trim().startsWith('//'))
    .filter(l => !l.trim().startsWith('export type'));
  return nonCommentLines.every(l => /^export \{/.test(l.trim()) || /^export \{ default/.test(l.trim()));
}

const allFiles = collectFiles(ROOT);

// Group by basename (without extension)
const byName = new Map();
for (const f of allFiles) {
  const name = basename(f).replace(/\.tsx?$/, '');
  if (!byName.has(name)) byName.set(name, []);
  byName.get(name).push(f);
}

let hasViolation = false;

for (const [name, files] of byName) {
  if (files.length <= 1) continue;

  // Filter out legitimate re-export shims
  const implementations = files.filter(f => !isReexportShim(f) || !isShimContent(f));

  if (implementations.length > 1) {
    console.error(`\n❌ DUPLICATE COMPONENT: ${name}`);
    for (const f of implementations) {
      console.error(`   → ${relative(process.cwd(), f)}`);
    }
    hasViolation = true;
  }
}

if (hasViolation) {
  console.error('\n💥 Duplicate component implementations detected.');
  console.error('   Consolidate them into the canonical directory and add a re-export shim in dashboard/.');
  process.exit(1);
} else {
  console.log('✅ No duplicate component implementations found.');
  process.exit(0);
}
