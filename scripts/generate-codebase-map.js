#!/usr/bin/env node
/**
 * SafariCharge – Codebase Map Generator
 * ======================================
 * Scans the repository and writes:
 *   docs/codebase-map.md   (human-readable)
 *   docs/codebase-map.json (machine-readable)
 *   docs/.map-hashes.json  (file hash cache for incremental updates)
 *
 * Usage:
 *   node scripts/generate-codebase-map.js [--full]
 *
 * Flags:
 *   --full   Force full re-scan regardless of file hash cache
 *
 * Environment:
 *   Requires Node.js >= 18 (uses built-in crypto, fs, child_process).
 *   No external npm dependencies needed.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const REPO_ROOT = path.resolve(__dirname, '..');
const DOCS_DIR = path.join(REPO_ROOT, 'docs');
const HASH_CACHE_PATH = path.join(DOCS_DIR, '.map-hashes.json');
const MAP_MD_PATH = path.join(DOCS_DIR, 'codebase-map.md');
const MAP_JSON_PATH = path.join(DOCS_DIR, 'codebase-map.json');
const GENERATOR_VERSION = '1.0.0';

/** Source directories to scan */
const SCAN_DIRS = ['src', 'prisma', 'scripts', '.githooks'];

/** File extensions to include in analysis */
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.mjs', '.json', '.prisma', '.css', '.md']);

/** Files/dirs to skip */
const SKIP_PATTERNS = [
  /node_modules/,
  /\.next/,
  /\.git\//,
  /tsconfig\.tsbuildinfo/,
  /__pycache__/,
  /\.cpython-/,
  /bun\.lock/,
  /package-lock\.json/,
  /docs\/\.map-hashes\.json/,
];

// Risk classification rules (evaluated in order, first match wins)
const RISK_RULES = [
  { pattern: /src\/app\/page\.tsx$/, risk: 'critical', hotspot: true },
  { pattern: /src\/app\/api\/safaricharge-ai/, risk: 'critical', hotspot: true },
  { pattern: /src\/middleware\.ts$/, risk: 'critical' },
  { pattern: /src\/lib\/config\.ts$/, risk: 'critical' },
  { pattern: /src\/simulation\/runSimulation\.ts$/, risk: 'critical', hotspot: true },
  { pattern: /src\/lib\/(physics-engine|recommendation-engine|financial-dashboard|tariff|nasa-power-api)/, risk: 'high' },
  { pattern: /src\/simulation\//, risk: 'high' },
  { pattern: /src\/hooks\/useEnergySystem/, risk: 'high', hotspot: true },
  { pattern: /src\/components\/RecommendationComponents/, risk: 'high', hotspot: true },
  { pattern: /src\/components\/dashboard\//, risk: 'medium' },
  { pattern: /src\/lib\/security\.ts$/, risk: 'medium' },
  { pattern: /src\/lib\/services\//, risk: 'medium' },
  { pattern: /src\/components\/(?!ui\/)/, risk: 'medium' },
  { pattern: /src\/components\/ui\//, risk: 'low' },
  { pattern: /src\/lib\//, risk: 'low' },
];

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function run(cmd, opts = {}) {
  try {
    return execSync(cmd, { cwd: REPO_ROOT, encoding: 'utf8', ...opts }).trim();
  } catch {
    return '';
  }
}

function sha256(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

function shouldSkip(filePath) {
  return SKIP_PATTERNS.some((p) => p.test(filePath));
}

function classifyRisk(filePath) {
  for (const rule of RISK_RULES) {
    if (rule.pattern.test(filePath)) {
      return { risk: rule.risk, hotspot: !!rule.hotspot };
    }
  }
  return { risk: 'low', hotspot: false };
}

function countLines(absolutePath) {
  try {
    const content = fs.readFileSync(absolutePath, 'utf8');
    return content.split('\n').length;
  } catch {
    return 0;
  }
}

/**
 * Extract import paths from a TypeScript/JS file using a lightweight regex pass.
 * Not a full AST parser – handles common patterns only.
 */
function extractImports(content) {
  const imports = [];
  const patterns = [
    /^import\s+.*?from\s+['"]([^'"]+)['"]/gm,
    /^import\s+['"]([^'"]+)['"]/gm,
    /require\s*\(\s*['"]([^'"]+)['"]\s*\)/gm,
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(content)) !== null) {
      imports.push(m[1]);
    }
  }
  return [...new Set(imports)];
}

/**
 * Extract named exports from a TypeScript/JS file.
 */
function extractExports(content) {
  const exports = [];
  const patterns = [
    /^export\s+(?:async\s+)?function\s+(\w+)/gm,
    /^export\s+(?:const|let|var)\s+(\w+)/gm,
    /^export\s+(?:interface|type|class|enum)\s+(\w+)/gm,
    /^export\s+default\s+(?:function\s+)?(\w+)/gm,
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(content)) !== null) {
      exports.push(m[1]);
    }
  }
  return [...new Set(exports)];
}

// ---------------------------------------------------------------------------
// Git helpers
// ---------------------------------------------------------------------------

function getGitInfo() {
  const commit = run('git rev-parse HEAD') || 'unknown';
  const branch = run('git branch --show-current') || run('git rev-parse --abbrev-ref HEAD') || 'unknown';
  const timestamp = new Date().toISOString();

  // Files changed since last commit
  const changedRaw = run('git diff --name-only HEAD~1..HEAD 2>/dev/null || git diff --name-only HEAD') || '';
  const changes = changedRaw.split('\n').filter(Boolean);

  // Last 5 commit messages for summary
  const recentCommits = run('git log --oneline -5').split('\n').filter(Boolean);

  return { commit, branch, timestamp, changes, recentCommits };
}

function getHotspotHistory(filePath) {
  // Count commits touching each file (approximate hotspot score)
  const rel = path.relative(REPO_ROOT, filePath);
  const count = parseInt(run(`git log --oneline --follow -- "${rel}" | wc -l`), 10) || 0;
  return count;
}

// ---------------------------------------------------------------------------
// File scanner
// ---------------------------------------------------------------------------

function scanDirectory(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;

  function walk(current) {
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      const rel = path.relative(REPO_ROOT, fullPath);

      if (shouldSkip(rel)) continue;

      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (SOURCE_EXTENSIONS.has(ext)) {
          results.push(fullPath);
        }
      }
    }
  }

  walk(dir);
  return results;
}

function analyseFile(absolutePath) {
  const rel = path.relative(REPO_ROOT, absolutePath);
  const ext = path.extname(absolutePath);
  const { risk, hotspot } = classifyRisk(rel);
  const loc = countLines(absolutePath);
  const stat = fs.statSync(absolutePath);

  let imports = [];
  let exports = [];

  if (['.ts', '.tsx', '.js', '.mjs'].includes(ext)) {
    try {
      const content = fs.readFileSync(absolutePath, 'utf8');
      imports = extractImports(content);
      exports = extractExports(content);
    } catch {
      // ignore read errors
    }
  }

  return {
    path: rel,
    extension: ext,
    linesOfCode: loc,
    sizeBytes: stat.size,
    lastModified: stat.mtime.toISOString(),
    risk,
    hotspot,
    imports: imports.filter((i) => i.startsWith('@/') || i.startsWith('.')),
    exports,
    commitCount: 0, // populated later if needed
  };
}

// ---------------------------------------------------------------------------
// Incremental update logic
// ---------------------------------------------------------------------------

function loadHashCache() {
  try {
    return JSON.parse(fs.readFileSync(HASH_CACHE_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function saveHashCache(cache) {
  fs.mkdirSync(DOCS_DIR, { recursive: true });
  fs.writeFileSync(HASH_CACHE_PATH, JSON.stringify(cache, null, 2));
}

function computeFileHashes(files) {
  const hashes = {};
  for (const f of files) {
    try {
      const content = fs.readFileSync(f);
      hashes[path.relative(REPO_ROOT, f)] = sha256(content);
    } catch {
      // ignore
    }
  }
  return hashes;
}

function detectChangedFiles(previousHashes, currentHashes) {
  const changed = [];
  const added = [];
  const removed = [];

  for (const [k, v] of Object.entries(currentHashes)) {
    if (!previousHashes[k]) {
      added.push(k);
    } else if (previousHashes[k] !== v) {
      changed.push(k);
    }
  }

  for (const k of Object.keys(previousHashes)) {
    if (!currentHashes[k]) {
      removed.push(k);
    }
  }

  return { changed, added, removed };
}

// ---------------------------------------------------------------------------
// Tree builder (text rendering)
// ---------------------------------------------------------------------------

function buildTreeLine(rel, info, indent = '') {
  const name = path.basename(rel);
  const riskIcon = { critical: '🔴', high: '🟠', medium: '🟡', low: '🟢' }[info.risk] || '';
  const hotspotTag = info.hotspot ? ' 🔥' : '';
  const locTag = info.linesOfCode > 200 ? ` [${info.linesOfCode} lines]` : '';
  return `${indent}📄 ${name}${hotspotTag}${locTag}   ${riskIcon}`;
}

// ---------------------------------------------------------------------------
// Markdown generator
// ---------------------------------------------------------------------------

function generateMarkdown(gitInfo, nodes, delta, previousCommit) {
  const ts = gitInfo.timestamp;
  const commit = gitInfo.commit.slice(0, 7);
  const fullCommit = gitInfo.commit;

  const criticalNodes = nodes.filter((n) => n.risk === 'critical');
  const hotspotNodes = nodes.filter((n) => n.hotspot);
  const totalFiles = nodes.length;
  const totalLoc = nodes.reduce((a, n) => a + n.linesOfCode, 0);

  const changeList = [
    ...delta.added.map((f) => `- ➕ Added: \`${f}\``),
    ...delta.changed.map((f) => `- ✏️  Modified: \`${f}\``),
    ...delta.removed.map((f) => `- 🗑️  Removed: \`${f}\``),
  ].join('\n') || '- No source changes detected since last map\n';

  // Group nodes by top-level directory for tree rendering
  const groups = {};
  for (const n of nodes) {
    const parts = n.path.split('/');
    const top = parts.length > 1 ? parts[0] + '/' + parts[1] : parts[0];
    if (!groups[top]) groups[top] = [];
    groups[top].push(n);
  }

  const hotspotTable = hotspotNodes
    .map((n) => `| \`${n.path}\` | ${n.linesOfCode} | ${n.risk} |`)
    .join('\n');

  const criticalTable = criticalNodes
    .map((n) => `| \`${n.path}\` | ${n.linesOfCode} | ${n.exports.slice(0, 3).join(', ')} |`)
    .join('\n');

  return `# SafariCharge – Codebase Map

> **Auto-generated by \`scripts/generate-codebase-map.js\` v${GENERATOR_VERSION}**
> This file is version-controlled and automatically updated on every push via GitHub Actions.
> **Do not edit manually.**

---

## Version Metadata

| Field | Value |
|-------|-------|
| **Commit** | \`${fullCommit}\` |
| **Short SHA** | \`${commit}\` |
| **Branch** | \`${gitInfo.branch}\` |
| **Generated At** | \`${ts}\` |
| **Generator** | \`scripts/generate-codebase-map.js v${GENERATOR_VERSION}\` |
| **Total Files Scanned** | ${totalFiles} |
| **Total Lines of Code** | ${totalLoc.toLocaleString()} |

### Changes Since Previous Map
${changeList}

### Recent Commits
${gitInfo.recentCommits.map((c) => `- ${c}`).join('\n')}

---

## Hotspot Files 🔥

| File | Lines | Risk |
|------|-------|------|
${hotspotTable || '| — | — | — |'}

---

## Critical Nodes 🔴

| File | Lines | Key Exports |
|------|-------|-------------|
${criticalTable || '| — | — | — |'}

---

## File Tree (auto-generated)

\`\`\`
safaricharge/
${nodes
  .sort((a, b) => a.path.localeCompare(b.path))
  .map((n) => {
    const riskIcon = { critical: '🔴', high: '🟠', medium: '🟡', low: '🟢' }[n.risk] || '';
    const hotspotTag = n.hotspot ? ' 🔥' : '';
    const locTag = n.linesOfCode > 300 ? ` [${n.linesOfCode} LOC]` : '';
    const parts = n.path.split('/');
    const indent = '  '.repeat(parts.length - 1);
    return `${indent}├── ${parts[parts.length - 1]}${hotspotTag}${locTag}  ${riskIcon}`;
  })
  .join('\n')}
\`\`\`

---

## Dependency Map (import relationships)

\`\`\`
${nodes
  .filter((n) => n.imports.length > 0)
  .sort((a, b) => b.imports.length - a.imports.length)
  .slice(0, 25)
  .map((n) => `${n.path}\n  └── imports: ${n.imports.slice(0, 5).join(', ')}`)
  .join('\n\n')}
\`\`\`

---

## Risk Summary

| Risk Level | Count |
|-----------|-------|
| 🔴 Critical | ${nodes.filter((n) => n.risk === 'critical').length} |
| 🟠 High | ${nodes.filter((n) => n.risk === 'high').length} |
| 🟡 Medium | ${nodes.filter((n) => n.risk === 'medium').length} |
| 🟢 Low | ${nodes.filter((n) => n.risk === 'low').length} |

---

## Auto-Update System

This map is maintained by three layers:

1. **Local hooks** (\`.githooks/\`) — immediate update after each local commit
   \`\`\`bash
   git config core.hooksPath .githooks
   \`\`\`

2. **GitHub Actions** (\`.github/workflows/update-codebase-map.yml\`) — authoritative CI update on push/PR

3. **Generator script** (\`scripts/generate-codebase-map.js\`) — shared analysis engine

*Map generated by \`scripts/generate-codebase-map.js\`. Last commit: \`${fullCommit}\`*
`;
}

// ---------------------------------------------------------------------------
// JSON map generator
// ---------------------------------------------------------------------------

function generateJson(gitInfo, nodes, delta) {
  // Build import graph
  const importGraph = {};
  for (const n of nodes) {
    if (n.imports.length > 0) {
      importGraph[n.path] = n.imports;
    }
  }

  return {
    version: {
      commit: gitInfo.commit,
      branch: gitInfo.branch,
      timestamp: gitInfo.timestamp,
      generator: 'scripts/generate-codebase-map.js',
      generatorVersion: GENERATOR_VERSION,
      changes: {
        added: delta.added,
        modified: delta.changed,
        removed: delta.removed,
      },
    },
    stats: {
      totalFiles: nodes.length,
      totalLinesOfCode: nodes.reduce((a, n) => a + n.linesOfCode, 0),
      criticalFiles: nodes.filter((n) => n.risk === 'critical').length,
      highRiskFiles: nodes.filter((n) => n.risk === 'high').length,
      hotspotFiles: nodes.filter((n) => n.hotspot).length,
    },
    files: nodes,
    importGraph,
    hotspots: nodes.filter((n) => n.hotspot).map((n) => ({
      path: n.path,
      linesOfCode: n.linesOfCode,
      risk: n.risk,
      imports: n.imports,
    })),
    recentCommits: gitInfo.recentCommits,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const forceFullScan = args.includes('--full');

  console.log('🔍 SafariCharge Codebase Map Generator v' + GENERATOR_VERSION);
  console.log('   Repo:', REPO_ROOT);

  // Ensure docs dir exists
  fs.mkdirSync(DOCS_DIR, { recursive: true });

  // Get git metadata
  const gitInfo = getGitInfo();
  console.log(`   Commit: ${gitInfo.commit.slice(0, 7)} (${gitInfo.branch})`);
  console.log(`   Changed files: ${gitInfo.changes.length}`);

  // Collect all source files
  const allFiles = [];
  for (const dir of SCAN_DIRS) {
    const absDir = path.join(REPO_ROOT, dir);
    allFiles.push(...scanDirectory(absDir));
  }
  // Also include root config files
  for (const rootFile of ['package.json', 'next.config.ts', 'tsconfig.json', 'tailwind.config.ts', '.env.example', 'Caddyfile.txt']) {
    const f = path.join(REPO_ROOT, rootFile);
    if (fs.existsSync(f)) allFiles.push(f);
  }

  console.log(`   Found ${allFiles.length} files to analyse`);

  // Load previous hash cache
  const previousHashes = forceFullScan ? {} : loadHashCache();

  // Compute current hashes
  const currentHashes = computeFileHashes(allFiles);

  // Detect delta
  const delta = detectChangedFiles(previousHashes, currentHashes);
  console.log(`   Delta: +${delta.added.length} added, ~${delta.changed.length} modified, -${delta.removed.length} removed`);

  // Determine which files to re-analyse
  const filesToAnalyse = forceFullScan
    ? allFiles
    : allFiles.filter((f) => {
        const rel = path.relative(REPO_ROOT, f);
        return !previousHashes[rel] || previousHashes[rel] !== currentHashes[rel];
      });

  console.log(`   Analysing ${filesToAnalyse.length} file(s)...`);

  // Load existing JSON map to merge unchanged nodes
  let existingNodes = {};
  try {
    const existing = JSON.parse(fs.readFileSync(MAP_JSON_PATH, 'utf8'));
    if (existing.files) {
      for (const node of existing.files) {
        existingNodes[node.path] = node;
      }
    }
  } catch {
    // No existing map — full analysis
  }

  // Analyse changed files
  const analysedNodes = {};
  for (const f of filesToAnalyse) {
    const rel = path.relative(REPO_ROOT, f);
    analysedNodes[rel] = analyseFile(f);
  }

  // Merge: start with existing, override with newly analysed, remove deleted
  const mergedNodes = {};
  for (const [k, v] of Object.entries(existingNodes)) {
    if (!delta.removed.includes(k)) {
      mergedNodes[k] = v;
    }
  }
  Object.assign(mergedNodes, analysedNodes);

  const nodes = Object.values(mergedNodes);

  // Generate outputs
  console.log('   Writing docs/codebase-map.md ...');
  const md = generateMarkdown(gitInfo, nodes, delta, null);
  fs.writeFileSync(MAP_MD_PATH, md, 'utf8');

  console.log('   Writing docs/codebase-map.json ...');
  const json = generateJson(gitInfo, nodes, delta);
  fs.writeFileSync(MAP_JSON_PATH, JSON.stringify(json, null, 2), 'utf8');

  // Save updated hash cache
  saveHashCache(currentHashes);

  console.log('✅ Map updated successfully');
  console.log(`   docs/codebase-map.md  (${(fs.statSync(MAP_MD_PATH).size / 1024).toFixed(1)} KB)`);
  console.log(`   docs/codebase-map.json (${(fs.statSync(MAP_JSON_PATH).size / 1024).toFixed(1)} KB)`);
}

main().catch((err) => {
  console.error('❌ Map generation failed:', err.message);
  process.exit(1);
});
