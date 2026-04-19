#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync, spawnSync } from 'child_process';

const repoRoot = process.cwd();
const args = process.argv.slice(2);
const target = (args[0] || 'all').toLowerCase();

function run(command, commandArgs = [], extraEnv = {}) {
  const result = spawnSync(command, commandArgs, {
    stdio: 'inherit',
    shell: false,
    cwd: repoRoot,
    env: { ...process.env, ...extraEnv },
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function canRun(command, commandArgs = ['--version']) {
  const result = spawnSync(command, commandArgs, {
    stdio: 'ignore',
    shell: false,
    cwd: repoRoot,
  });
  return result.status === 0;
}

function git(cmd, fallback = 'unknown') {
  try {
    const out = execSync(`git ${cmd}`, { cwd: repoRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    return out || fallback;
  } catch {
    return fallback;
  }
}

function countFiles(rootDir, extensions) {
  let count = 0;
  function walk(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === '.next') {
          continue;
        }
        walk(full);
      } else if (entry.isFile()) {
        if (extensions.some((ext) => entry.name.endsWith(ext))) {
          count += 1;
        }
      }
    }
  }

  if (fs.existsSync(rootDir)) {
    walk(rootDir);
  }
  return count;
}

function buildRollbackBranchName(subject, date, shaShort) {
  const slug = subject
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 38);
  return `rollback/${slug || 'snapshot'}-${date}-${shaShort}`;
}

function pythonCommand() {
  if (canRun('python3')) return { bin: 'python3', preArgs: [] };
  if (canRun('python')) return { bin: 'python', preArgs: [] };
  if (canRun('py', ['-3', '--version'])) return { bin: 'py', preArgs: ['-3'] };
  throw new Error('No Python executable found. Install python3/python/py first.');
}

function npmCommand() {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

function sharedMetadata() {
  const lastCommit = git('log -1 --format=%H', '');
  const lastShort = git('log -1 --format=%h', 'unknown');
  const lastAuthor = git('log -1 --format=%an', 'unknown');
  const lastDate = git('log -1 --date=short --format=%ad', 'unknown');
  const lastMessage = git('log -1 --format=%s', 'unknown');
  const totalCommits = git('rev-list --count HEAD', '?');
  const currentBranch = git('rev-parse --abbrev-ref HEAD', 'main');
  const repo = git('config --get remote.origin.url', 'rauell1/safaricharge')
    .replace(/^.*github.com[/:]/, '')
    .replace(/\.git$/, '') || 'rauell1/safaricharge';
  const totalTs = String(countFiles(path.join(repoRoot, 'src'), ['.ts', '.tsx']));
  const totalPy = String(countFiles(repoRoot, ['.py']));

  return {
    LAST_COMMIT: lastCommit,
    LAST_COMMIT_SHORT: lastShort,
    LAST_AUTHOR: lastAuthor,
    LAST_DATE: lastDate,
    LAST_MESSAGE: lastMessage,
    TOTAL_COMMITS: totalCommits,
    TOTAL_TS: totalTs,
    TOTAL_PY: totalPy,
    BRANCH: currentBranch,
    REPO: repo,
    GITHUB_REPOSITORY: repo,
  };
}

function runReadmeWorkflow(meta, py) {
  console.log('Running local workflow: update-readme');
  run(py.bin, [...py.preArgs, '.github/scripts/gen_readme.py'], meta);
}

function runCodebaseMapWorkflow(meta, py) {
  console.log('Running local workflow: update-codebase-map');
  run(py.bin, [...py.preArgs, '.github/scripts/gen_codebase_map.py'], meta);
}

function runRollbackWorkflow(meta, py) {
  console.log('Running local workflow: update-rollback');
  const branchName = buildRollbackBranchName(meta.LAST_MESSAGE, meta.LAST_DATE, meta.LAST_COMMIT_SHORT);
  run(
    py.bin,
    [...py.preArgs, '.github/scripts/gen_rollback_entry.py'],
    {
      ...meta,
      SHA: meta.LAST_COMMIT,
      SHA_SHORT: meta.LAST_COMMIT_SHORT,
      DATE: meta.LAST_DATE,
      SUBJECT: meta.LAST_MESSAGE,
      BRANCH_NAME: branchName,
    }
  );
}

function runCiWorkflow() {
  console.log('Running local workflow: ci (typecheck + build)');
  const npm = npmCommand();
  run(npm, ['run', 'typecheck']);
  run(npm, ['run', 'build']);
}

function main() {
  const py = pythonCommand();
  const meta = sharedMetadata();

  if (target === 'readme') {
    runReadmeWorkflow(meta, py);
    return;
  }
  if (target === 'codebase-map') {
    runCodebaseMapWorkflow(meta, py);
    return;
  }
  if (target === 'rollback') {
    runRollbackWorkflow(meta, py);
    return;
  }
  if (target === 'ci') {
    runCiWorkflow();
    return;
  }
  if (target === 'all') {
    runReadmeWorkflow(meta, py);
    runCodebaseMapWorkflow(meta, py);
    runRollbackWorkflow(meta, py);
    runCiWorkflow();
    return;
  }

  console.error('Unknown target. Use one of: readme, codebase-map, rollback, ci, all');
  process.exit(2);
}

main();
