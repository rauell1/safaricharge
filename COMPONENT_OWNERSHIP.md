# SafariCharge — Component Ownership Contract

> **This file is the authoritative source of truth for component domain ownership.**
> Edit this file whenever a component is created, moved, or deleted.
> It is referenced by the resurrection guard in `eslint.config.mjs` and
> the codemod map in `scripts/codemod-dashboard-imports.mjs`.
> It is **never** auto-generated — it is a human-maintained architectural contract.

---

## Ownership Rules

| Rule | Description |
|---|---|
| One canonical home | Every component lives in exactly one domain folder |
| No cross-domain imports | `widgets/` ≠ import from `energy/`; `energy/` ≠ import from `dashboard/` |
| No logic in shims | `dashboard/` shims are re-export-only (enforced by ESLint) |
| Named export preferred | `export function X()` over `export default`. Shims bridge both styles. |
| Barrel imports forbidden | No `import { X, Y } from '@/components/dashboard'`; import per-file |

---

## `energy/` — Domain Logic

Owns all battery, solar panel, and power-flow components. These are data-heavy
and tightly coupled to the physics engine and energy stores.

| Component | Export style | Canonical import path |
|---|---|---|
| `BatteryHealthCard` | named | `@/components/energy/BatteryHealthCard` |
| `BatteryStatusCard` | named | `@/components/energy/BatteryStatusCard` |
| `BatteryPredictionCard` | named | `@/components/energy/BatteryPredictionCard` |
| `PanelStatusTable` | named + default alias | `@/components/energy/PanelStatusTable` |
| `PowerFlowVisualization` | named | `@/components/energy/PowerFlowVisualization` |
| `SystemVisualization` | named | `@/components/energy/SystemVisualization` |
| `Sparkline` | named | `@/components/energy/Sparkline` |

**Naming convention:** `Battery*`, `Panel*`, `Power*`, `System*`, `Energy*` prefixes belong here.

---

## `widgets/` — Reusable UI Primitives

Owns generic, reusable UI components that are not tightly coupled to a specific
energy domain. May be used by any domain or page.

| Component | Export style | Canonical import path |
|---|---|---|
| `EnergyDetailShell` | named | `@/components/widgets/EnergyDetailShell` |
| `AlertsList` | named | `@/components/widgets/AlertsList` |
| `StatCards` | named | `@/components/widgets/StatCards` |
| `InsightsBanner` | named | `@/components/widgets/InsightsBanner` |
| `WeatherCard` | named | `@/components/widgets/WeatherCard` |
| `EngineeringKpisCard` | named | `@/components/widgets/EngineeringKpisCard` |
| `TimeRangeSwitcher` | named | `@/components/widgets/TimeRangeSwitcher` |

**Naming convention:** Generic UI nouns. No `Battery*` or `Panel*` here.

---

## `layout/` — App Shell

Owns all structural layout components. Nothing in `layout/` should import from
`energy/` or `widgets/` directly — it receives content via composition (children/slots).

| Component | Export style | Canonical import path |
|---|---|---|
| `DashboardLayout` | named | `@/components/layout/DashboardLayout` |
| `DashboardHeader` | named | `@/components/layout/DashboardHeader` |
| `DashboardSidebar` | named | `@/components/layout/DashboardSidebar` |
| `MobileBottomNav` | named | `@/components/layout/MobileBottomNav` |

---

## `financial/` — Financial Domain

Owns all financial reporting and metrics components.

| Component | Export style | Canonical import path |
|---|---|---|
| `FinancialDashboard` | default + named alias | `@/components/financial/FinancialDashboard` |

**Type exports:** `FinancialDashboardProps` is exported from the same file.

---

## `reports/` — Reporting & Export Domain

Owns all report generation, print, and export components.

| Component | Export style | Canonical import path |
|---|---|---|
| `EnergyReportModal` | named | `@/components/reports/EnergyReportModal` |

---

## `dashboard/` — ⚠️ DEPRECATED SHIM LAYER

This folder exists **only** for backward compatibility. Every file in it is a
pure re-export shim pointing to a canonical domain above.

**Do not:**
- Add new components here
- Add logic, hooks, or JSX here (ESLint will error)
- Import `@/components/dashboard/*` in new code (ESLint will warn → error post-deletion)

**Migration status:** Pending. Run the codemod to migrate all callers:
```bash
node scripts/codemod-dashboard-imports.mjs          # audit
node scripts/codemod-dashboard-imports.mjs --write  # apply
```

See deletion sequence in `scripts/codemod-dashboard-imports.mjs` header.

---

## Invariants (Enforced by ESLint + Guard Script)

These rules are machine-enforced. Violations will fail CI.

```
✘ widgets/ imports from energy/        → ESLint error
✘ energy/ imports from dashboard/      → ESLint error
✘ dashboard/ contains JSX or hooks     → ESLint error
✘ @/components/*/index barrel import   → ESLint error
✔ dashboard/ import (while shims live)  → ESLint warn (becomes error post-deletion)
```

---

## Adding a New Component

1. Identify the domain: energy (physics-coupled), widgets (generic UI), layout (shell), financial, reports
2. Create the file in the correct domain folder
3. Use `export function ComponentName()` (named export)
4. Add a row to the relevant table above
5. If migrating from `dashboard/`, update `scripts/codemod-dashboard-imports.mjs` `CANONICAL_MAP`

---

## Future Domain Roadmap

As the system grows, these sub-domains may be split out:

```
energy/
  battery/    ← Battery* components
  solar/      ← Panel*, PowerFlow*, SystemVisualization
  grid/       ← Grid-tied components (future)
  ev/         ← EV charging components (future)
```

When a sub-domain is created, update this file, the codemod map, and the ESLint
boundary rules in `eslint.config.mjs`.
