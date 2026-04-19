#!/usr/bin/env python3
"""Regenerates CODEBASE_MAP.md from the live filesystem.
Called by .github/workflows/update-codebase-map.yml

Defensive contract:
- Never crashes if a watched directory does not exist (returns empty table).
- Gracefully handles missing `tree` binary.
- Idempotent: running twice produces the same file.
- New files in dashboard/lib/stores dirs are listed as '—' automatically.
"""
import os
import subprocess
import datetime

total_ts = os.environ.get('TOTAL_TS', '?')
total_py = os.environ.get('TOTAL_PY', '?')
commit   = os.environ.get('LAST_COMMIT', 'unknown')[:8]
author   = os.environ.get('LAST_AUTHOR', 'unknown')
date     = os.environ.get('LAST_DATE', 'unknown')
branch   = os.environ.get('BRANCH', 'main')
now      = datetime.datetime.now(datetime.UTC).strftime('%Y-%m-%d %H:%M UTC')


def tree_lines(path, depth=3):
    """Return directory tree string; falls back gracefully if tree is missing."""
    if not os.path.isdir(path):
        return f'({path} not found)'

    def _portable_tree(start_path, max_depth):
        lines = [start_path + '/']

        def _walk(current_path, level):
            if level >= max_depth:
                return
            try:
                entries = sorted(os.listdir(current_path))
            except Exception:
                return

            for entry in entries:
                if entry in {'node_modules', '.git', '.next'}:
                    continue
                if entry.endswith('.tsbuildinfo') or entry.endswith('.lock') or entry == 'package-lock.json':
                    continue

                full = os.path.join(current_path, entry)
                rel_depth = level + 1
                lines.append('  ' * rel_depth + entry + ('/' if os.path.isdir(full) else ''))
                if os.path.isdir(full):
                    _walk(full, rel_depth)

        _walk(start_path, 0)
        return '\n'.join(lines)

    try:
        r = subprocess.run(
            ['tree', path, '--dirsfirst', f'-L{depth}',
             '-I', 'node_modules|*.tsbuildinfo|*.lock|package-lock.json'],
            capture_output=True, text=True, check=False
        )
        if r.returncode == 0 and r.stdout.strip():
            return r.stdout.strip()
        return _portable_tree(path, depth)
    except FileNotFoundError:
        return _portable_tree(path, depth)


def file_sizes(path):
    """Return [(filename, size_kb)] for all files in path; empty list if missing."""
    rows = []
    if not os.path.isdir(path):
        return rows
    try:
        for f in sorted(os.listdir(path)):
            fp = os.path.join(path, f)
            if os.path.isfile(fp):
                size_kb = round(os.path.getsize(fp) / 1024, 1)
                rows.append((f, size_kb))
    except Exception:
        pass
    return rows


DASHBOARD_DESC = {
    'AlertsList.tsx':             'Active alerts list with severity badges',
    'BatteryHealthCard.tsx':      'Battery SoH, temperature, degradation timeline',
    'BatteryPredictionCard.tsx':  'AI-powered remaining-life prediction',
    'BatteryStatusCard.tsx':      'Real-time SoC gauge + power flow',
    'DashboardHeader.tsx':        'Top nav bar — logo, time, dark-mode toggle, alerts bell',
    'DashboardLayout.tsx':        'Sidebar + main-content shell',
    'DashboardSidebar.tsx':       'Navigation tree',
    'EnergyDetailShell.tsx':      'Shared card shell for energy detail views',
    'EngineeringKpisCard.tsx':    'IEC 61724-1 KPIs — Specific Yield, PR, CF, Battery Cycles + sparkline',
    'InsightsBanner.tsx':         'AI insights ribbon',
    'MobileBottomNav.tsx':        'Mobile bottom navigation bar',
    'PanelStatusTable.tsx':       'Per-string/panel telemetry table',
    'PowerFlowVisualization.tsx': 'Animated Sankey-style power-flow diagram',
    'Sparkline.tsx':              'Reusable 48px area sparkline (Recharts)',
    'StatCards.tsx':              'Top KPI stat cards (solar, load, grid, battery)',
    'SystemVisualization.tsx':    'Full system diagram SVG',
    'TimeRangeSwitcher.tsx':      '1h / 6h / 24h / 7d time-range toggle',
    'WeatherCard.tsx':            'Weather conditions + irradiance',
}

LIB_DESC = {
    'auto-sizing-wizard.ts':      'System auto-sizing engine (PV + battery capacity)',
    'battery-economics.ts':       'LCOE, payback, NPV, ROI calculations',
    'config.ts':                  'App-wide feature flags and runtime config',
    'db.ts':                      'Prisma client singleton',
    'dc-ac-optimizer.ts':         'DC:AC ratio optimiser',
    'demoEnergyState.ts':         'Deterministic demo data generator',
    'dvshave-harness.ts':         'pvlib/SAM delta-validation harness',
    'engineeringKpis.ts':         'IEC 61724-1 KPI calculations',
    'financial-dashboard.ts':     'Financial metrics aggregation',
    'intelligence.ts':            'AI insight generation orchestrator',
    'load-validator.ts':          'Load profile validation and normalisation',
    'logger.ts':                  'Structured logger (pino wrapper)',
    'nasa-power-api.ts':          'NASA POWER API client — irradiance, weather',
    'physics-engine-bridge.ts':   'TS <-> Python physics engine IPC bridge',
    'physics-engine.ts':          'Core energy simulation physics',
    'recommendation-engine.ts':   'System optimisation recommendations',
    'security.ts':                'Input sanitisation, rate-limit, CSRF',
    'serverConfig.ts':            'Server-side validated env config',
    'solar-component-catalog.ts': 'PV panel + inverter + battery catalog',
    'system-config.ts':           'System configuration schema + defaults',
    'tariff-config.ts':           'Kenya electricity tariff configuration',
    'tariff.ts':                  'Tariff calculation utilities',
    'utils.ts':                   'cn() and misc utilities',
    'validateEnv.ts':             'Env-var validation (zod)',
}


def build_table(path, descriptions, extensions=('.tsx', '.ts')):
    """Build a markdown table for files in path.
    Unknown files are shown with description '—' instead of being silently skipped.
    """
    rows = []
    for f, kb in file_sizes(path):
        if any(f.endswith(ext) for ext in extensions):
            desc = descriptions.get(f, '—')
            rows.append('| `{}` | {} | {} kB |'.format(f, desc, kb))
    if not rows:
        return '| *(no files found)* | — | — |'
    return '\n'.join(rows)


def build_stores_table():
    rows = []
    for f, kb in file_sizes('src/stores'):
        if f.endswith('.ts'):
            rows.append('| `{}` | {} kB |'.format(f, kb))
    return '\n'.join(rows) if rows else '| *(no stores found)* | — |'


def build_api_table():
    rows = []
    api_path = 'src/app/api'
    if os.path.isdir(api_path):
        for entry in sorted(os.listdir(api_path)):
            rows.append('| `/api/{}` | — |'.format(entry))
    return '\n'.join(rows) if rows else '| *(none detected)* | — |'


comp_table   = build_table('src/components/dashboard', DASHBOARD_DESC)
lib_table    = build_table('src/lib', LIB_DESC, extensions=('.ts',))
stores_table = build_stores_table()
api_table    = build_api_table()
root_tree    = tree_lines('.', 1)
src_tree     = tree_lines('src', 3)

doc = """# SafariCharge — Codebase Map

> **Auto-generated** · Updated: {now}
> Commit: `{commit}` by {author} on {date}
> Branch: `{branch}` · TypeScript files: **{total_ts}** · Python files: **{total_py}**
> _Do not edit manually — regenerated by `.github/workflows/update-codebase-map.yml` on every push to `main`_

---

## Repository Root

```
{root_tree}
```

---

## `src/` Source Tree

```
{src_tree}
```

---

## `src/app/` — Next.js App Router

| Path | Purpose |
|---|---|
| `layout.tsx` | Root layout — fonts, global providers |
| `page.tsx` | Root redirect (-> `/demo`) |
| `error.tsx` | Global error boundary |
| `globals.css` | CSS custom properties, Tailwind base, dark-mode tokens |
| `api/` | Next.js Route Handlers |
| `demo/` | Demo page — full dashboard with simulated data |
| `scenarios/` | Scenario management & comparison UI |
| `simulation/` | Simulation runner page |
| `component-knowledge-base/` | Internal component reference |

---

## `src/app/api/` — API Routes

| Route | Purpose |
|---|---|
{api_table}

---

## `src/components/dashboard/` — Dashboard Cards

| File | Purpose | Size |
|---|---|---|
{comp_table}

---

## `src/lib/` — Business Logic

| File | Purpose | Size |
|---|---|---|
{lib_table}

---

## `src/stores/` — Zustand Stores

| File | Size |
|---|---|
{stores_table}

---

## `forecasting/` — Python Micro-service

```
forecasting/
+-- pv_load_service/
    +-- main.py          FastAPI app — POST /forecast
    +-- models.py        Pydantic schemas
    +-- trainer.py       GBR model training
    +-- predictor.py     Quantile-band inference (P10/P50/P90)
    +-- seasonal.py      Seasonal fallback
    +-- requirements.txt
```

---

## Key Data-Flow

```
[NASA POWER API]
      | irradiance / weather
      v
[physics-engine.ts]  <-- systemConfig
      | minuteDataPoint per sim-tick
      v
[energySystemStore]  --> [Dashboard Components]
      |
      v
[forecasting/pv_load_service]  <-- POST /api/forecast
      | P10 / P50 / P90
      v
[forecastStore]  ------> [DailyEnergyGraph overlay]
```

---

## Dependency Overview

| Category | Libraries |
|---|---|
| **Framework** | Next.js 15 (App Router), React 19 |
| **State** | Zustand |
| **UI** | shadcn/ui, Tailwind CSS v4, Lucide icons |
| **Charts** | Recharts |
| **DB** | Prisma + PostgreSQL |
| **Validation** | Zod |
| **Auth** | NextAuth.js |
| **Forecasting** | FastAPI, scikit-learn (GBR), pandas |
| **Observability** | OpenTelemetry, Pino |
| **Tooling** | Bun, ESLint, TypeScript 5 |
""".format(
    now=now, commit=commit, author=author, date=date,
    branch=branch, total_ts=total_ts, total_py=total_py,
    root_tree=root_tree, src_tree=src_tree,
    api_table=api_table, comp_table=comp_table,
    lib_table=lib_table, stores_table=stores_table,
)

doc = (
    doc.replace('—', '-')
       .replace('·', '-')
       .replace('’', "'")
       .replace('“', '"')
       .replace('”', '"')
)

with open('CODEBASE_MAP.md', 'w', encoding='utf-8') as fh:
    fh.write(doc)

print('CODEBASE_MAP.md written successfully ({} chars)'.format(len(doc)))
