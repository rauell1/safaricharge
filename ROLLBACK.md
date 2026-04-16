# SafariCharge — Rollback Strategy & Snapshot Log

This file tracks all rollback points (branches + tags) created in the repo.
After every major change, a new snapshot is added here — **old snapshots are never deleted**.

---

## Rollback Protocol

After every major change (bug fix, feature merge, refactor), a versioned rollback branch is created:

```
rollback/<topic>-<YYYY-MM-DD>
```

Each branch is pinned to the exact commit SHA at the time of creation.
Snapshots are cumulative — restore any prior state at any time.

### How to Roll Back to Any Snapshot

#### Option 1: View / Test (Non-destructive)
```bash
git fetch origin
git checkout rollback/<name>
```
Return to main:
```bash
git checkout main
```

#### Option 2: Create a Working Branch from Snapshot
```bash
git checkout -b restore/<name> rollback/<name>
```

#### Option 3: Restore main to a Snapshot (Destructive)
⚠️ **Warning**: This rewrites `main`. Always confirm intent before running.
```bash
git fetch origin
git checkout main
git reset --hard origin/rollback/<name>
git push origin main --force
```

#### Option 4: Restore Specific Files Only
```bash
git checkout rollback/<name> -- src/path/to/file.ts
```

---

## Snapshot Log

> Snapshots are listed newest-first. Never remove entries from this table.

| # | Branch | Pinned Commit | Description | Date |
|---|--------|--------------|-------------|------|
| 108 | `rollback/merge-pull-request-204-from-rauell1-co-2026-04-16-58e0529` | `58e0529` | Merge pull request #204 from rauell1/copilot/feat-upgrade-csv-excel-export | 2026-04-16 |
| 107 | `rollback/merge-pull-request-203-from-rauell1-co-2026-04-16-f67514d` | `f67514d` | Merge pull request #203 from rauell1/copilot/add-social-impact-dashboard-panel | 2026-04-16 |
| 106 | `rollback/merge-pull-request-202-from-rauell1-co-2026-04-16-515093a` | `515093a` | Merge pull request #202 from rauell1/copilot/add-on-grid-off-grid-simulation-paths | 2026-04-16 |
| 105 | `rollback/merge-pull-request-201-from-rauell1-co-2026-04-16-f3334b4` | `f3334b4` | Merge pull request #201 from rauell1/copilot/add-pv-sizing-calculator | 2026-04-16 |
| 104 | `rollback/merge-pull-request-200-from-rauell1-co-2026-04-16-12e4b53` | `12e4b53` | Merge pull request #200 from rauell1/copilot/add-configurable-performance-ratio | 2026-04-16 |
| 103 | `rollback/fix-add-use-client-to-landing-page-to-2026-04-15-bfc0481` | `bfc0481` | fix: add 'use client' to landing page to allow event handlers | 2026-04-15 |
| 102 | `rollback/redesign-new-landing-page-login-page-b-2026-04-15-992fa0d` | `992fa0d` | redesign: new landing page, login page, bypass auth → /demo access | 2026-04-15 |
| 101 | `rollback/bypass-auth-for-demo-redesign-landing-2026-04-15-85832a5` | `85832a5` | bypass auth for /demo; redesign landing + login pages | 2026-04-15 |
| 100 | `rollback/disable-sign-in-form-on-login-page-2026-04-15-745d012` | `745d012` | disable sign-in form on login page | 2026-04-15 |
| 99 | `rollback/fix-surface-auth-env-health-checks-and-2026-04-15-3ea6fe6` | `3ea6fe6` | fix: surface auth env health checks and fail fast on Resend errors | 2026-04-15 |
| 98 | `rollback/merge-pull-request-193-from-rauell1-co-2026-04-15-63fda6a` | `63fda6a` | Merge pull request #193 from rauell1/copilot/fix-signup-page-visual-issues | 2026-04-15 |
| 97 | `rollback/fix-set-royokola3-gmail-com-as-default-2026-04-15-48a84b5` | `48a84b5` | fix: set royokola3@gmail.com as default Resend from address in forgot-password | 2026-04-15 |
| 96 | `rollback/fix-set-royokola3-gmail-com-as-default-2026-04-15-3dcc31b` | `3dcc31b` | fix: set royokola3@gmail.com as default Resend from/admin address in auth | 2026-04-15 |
| 95 | `rollback/merge-pull-request-192-from-rauell1-co-2026-04-15-5122ec6` | `5122ec6` | Merge pull request #192 from rauell1/copilot/upgrade-safaricharge-dashboard | 2026-04-15 |
| 94 | `rollback/merge-pull-request-191-from-rauell1-co-2026-04-15-0e7df88` | `0e7df88` | Merge pull request #191 from rauell1/copilot/ui-typography-improvements | 2026-04-15 |
| 93 | `rollback/merge-pull-request-190-from-rauell1-co-2026-04-15-89a3747` | `89a3747` | Merge pull request #190 from rauell1/copilot/fix-invalid-lockfile-warning | 2026-04-15 |
| 92 | `rollback/merge-pull-request-189-from-rauell1-co-2026-04-15-4971c1e` | `4971c1e` | Merge pull request #189 from rauell1/copilot/safaricharge-landing-page-login-form | 2026-04-15 |
| 91 | `rollback/feat-supabase-ssr-client-helpers-188-2026-04-15-d0464dc` | `d0464dc` | feat: Supabase SSR client helpers (#188) | 2026-04-15 |
| 90 | `rollback/feat-pyomo-milp-dispatch-optimizer-ui-2026-04-14-6e12cb6` | `6e12cb6` | feat: Pyomo MILP dispatch optimizer + UI full overhaul (#187) | 2026-04-14 |
| 89 | `rollback/fix-rewrite-middleware-ts-with-explici-2026-04-14-c21763d` | `c21763d` | fix: rewrite middleware.ts with explicit function export (Next.js 16) (#186) | 2026-04-14 |
| 88 | `rollback/fix-bump-nodemailer-to-7-0-7-add-npmrc-2026-04-14-e059532` | `e059532` | fix: bump nodemailer to ^7.0.7 + add .npmrc legacy-peer-deps (#185) | 2026-04-14 |
| 87 | `rollback/fix-resolve-4-vercel-build-errors-184-2026-04-14-afc963a` | `afc963a` | fix: resolve 4 Vercel build errors (#184) | 2026-04-14 |
| 86 | `rollback/chore-add-nextauth-tables-to-prisma-sc-2026-04-14-d4a6249` | `d4a6249` | chore: add NextAuth tables to Prisma schema (Account, Session, VerificationToken) | 2026-04-14 |
| 85 | `rollback/feat-landing-page-magic-link-login-via-2026-04-14-f66c895` | `f66c895` | feat: landing page + magic-link login via Resend (#183) | 2026-04-14 |
| 84 | `rollback/fix-physics-epra-2025-26-tariff-rates-2026-04-14-a4d5e0c` | `a4d5e0c` | fix(physics): EPRA 2025/26 tariff rates, demand-charge savings, RTE, NOCT wind term, Nairobi TMY, V2G dead-band, seasonal naive forecast, vitest CI | 2026-04-14 |
| 83 | `rollback/feat-wire-pyomo-milp-dispatch-optimize-2026-04-14-19f65ec` | `19f65ec` | feat: wire Pyomo MILP dispatch optimizer + block-structured simulation refactor (#182) | 2026-04-14 |
| 82 | `rollback/fix-replace-css-flex-connectors-with-s-2026-04-13` | `c5596e8` | fix: replace CSS flex connectors with SVG tree on mobile — no hanging lines | 2026-04-13 |
| 81 | `rollback/feat-vertical-flow-layout-for-mobile-d-2026-04-13` | `c0fec2b` | feat: vertical flow layout for mobile, desktop tree unchanged | 2026-04-13 |
| 80 | `rollback/fix-preserve-desktop-tree-layout-on-mo-2026-04-13` | `35bd2d7` | fix: preserve desktop tree layout on mobile with horizontal scroll | 2026-04-13 |
| 79 | `rollback/fix-make-powerflowvisualization-respon-2026-04-13` | `3384d38` | fix: make PowerFlowVisualization responsive on small devices | 2026-04-13 |
| 78 | `rollback/fix-deps-force-undici-7-24-0-and-deval-2026-04-13` | `3574f25` | fix(deps): force undici>=7.24.0 and devalue>=5.3.2 via overrides (closes Dependabot #28-35) | 2026-04-13 |
| 77 | `rollback/fix-store-cast-fresh-to-savedscenario-2026-04-13` | `13aea37` | fix(store): cast fresh to SavedScenario[] to resolve TS spread type error | 2026-04-13 |
| 76 | `rollback/merge-pull-request-179-from-rauell1-co-2026-04-13` | `95f1c25` | Merge pull request #179 from rauell1/copilot/regenerate-package-lock-json | 2026-04-13 |
| 75 | `rollback/merge-pull-request-178-from-rauell1-co-2026-04-13` | `12cd4a9` | Merge pull request #178 from rauell1/copilot/add-vercel-plugin | 2026-04-13 |
| 74 | `rollback/merge-pull-request-177-from-rauell1-co-2026-04-13` | `d10c35c` | Merge pull request #177 from rauell1/copilot/add-user-signup-functionality | 2026-04-13 |
| 73 | `rollback/fix-correct-3-broken-shims-causing-ts2-2026-04-13` | `457fa61` | fix: correct 3 broken shims causing TS2305/TS2614 errors | 2026-04-13 |
| 72 | `rollback/fix-resolve-all-21-typescript-build-er-2026-04-13` | `3a27dc6` | fix: resolve all 21 TypeScript build errors | 2026-04-13 |
| 71 | `rollback/fix-repair-two-broken-imports-crashing-2026-04-13` | `4c26e8f` | fix: repair two broken imports crashing the build | 2026-04-13 |
| 70 | `rollback/arch-component-ownership-contract-no-b-2026-04-13` | `15d14b2` | arch: component ownership contract + no-barrel ESLint rule + codemod v3 multiline/comment-safe | 2026-04-13 |
| 69 | `rollback/arch-codemod-v2-catches-import-type-x-2026-04-13` | `fa3eefb` | arch: codemod v2 catches import { type X } syntax + post-deletion ESLint resurrection guard | 2026-04-13 |
| 68 | `rollback/arch-deprecation-notices-on-all-dashbo-2026-04-12` | `3ea2f0a` | arch: deprecation notices on all dashboard/ shims + domain boundary ESLint rule + codemod migration script | 2026-04-12 |
| 67 | `rollback/fix-barrel-harden-all-4-export-consist-2026-04-12` | `125c32c` | fix(barrel): harden all 4 export consistency issues | 2026-04-12 |
| 66 | `rollback/refactor-convert-dashboard-to-pure-bar-2026-04-12` | `83cd6e5` | refactor: convert dashboard/ to pure barrel re-export layer | 2026-04-12 |
| 65 | `rollback/chore-add-energyreportmodal-and-recomm-2026-04-12` | `e1cc564` | chore: add EnergyReportModal and RecommendationComponents to energy barrel | 2026-04-12 |
| 64 | `rollback/refactor-consolidate-dashboardsidebar-2026-04-12` | `82cc47b` | refactor: consolidate DashboardSidebar — layout/ is canonical, dashboard/ re-exports | 2026-04-12 |
| 63 | `rollback/feat-add-missing-energyreportmodal-com-2026-04-12` | `113e08c` | feat: add missing EnergyReportModal component to energy folder | 2026-04-12 |
| 62 | `rollback/restore-add-missing-engineeringkpiscar-2026-04-12` | `5c02e4f` | restore: add missing EngineeringKpisCard component | 2026-04-12 |
| 61 | `rollback/restore-exact-original-powerflowvisual-2026-04-12` | `18807ae` | restore: exact original PowerFlowVisualization from pre-deletion commit 9ab9427 | 2026-04-12 |
| 60 | `rollback/restore-full-financialdashboard-tsx-wa-2026-04-12` | `626f811` | restore: full FinancialDashboard.tsx (was stub from bad commit) | 2026-04-12 |
| 59 | `rollback/restore-full-systemvisualization-tsx-w-2026-04-12` | `ea5c418` | restore: full SystemVisualization.tsx (was stub from bad commit) | 2026-04-12 |
| 58 | `rollback/restore-full-powerflowvisualization-ts-2026-04-12` | `21e7e57` | restore: full PowerFlowVisualization.tsx (was stub from bad commit) | 2026-04-12 |
| 57 | `rollback/fix-replace-placeholder-stubs-with-rea-2026-04-12` | `3da49ee` | fix: replace placeholder stubs with real component content | 2026-04-12 |
| 56 | `rollback/restore-add-missing-powerflowvisualiza-2026-04-12` | `23219ba` | restore: add missing PowerFlowVisualization, SystemVisualization, FinancialDashboard to dashboard/ | 2026-04-12 |
| 55 | `rollback/fix-ai-correct-malformed-generic-on-us-2026-04-12` | `c077e41` | fix(ai): correct malformed generic on useState line 60 | 2026-04-12 |
| 54 | `rollback/restore-reinstate-full-src-components-2026-04-12` | `047112d` | restore: reinstate full src/components/dashboard/ from commit 9ab9427 | 2026-04-12 |
| 53 | `rollback/fix-restore-full-demo-page-tsx-body-fr-2026-04-12` | `473d4eb` | fix: restore full demo/page.tsx body from rollback snapshot, fix all import paths | 2026-04-12 |
| 52 | `rollback/fix-correct-components-dashboard-compo-2026-04-12` | `9c67b53` | fix: correct @/components/dashboard → @/components/layout import paths in app/page.tsx and app/demo/page.tsx | 2026-04-12 |
| 51 | `rollback/refactor-delete-dashboard-shim-subfold-2026-04-12` | `d1e901b` | refactor: delete dashboard/ shim subfolders — dashboard/ is now empty | 2026-04-12 |
| 50 | `rollback/refactor-delete-dashboard-aiassistant-2026-04-12` | `0d07242` | refactor: delete dashboard/AIAssistant (moved to ai/AIAssistant) | 2026-04-12 |
| 49 | `rollback/refactor-move-aiassistant-components-a-2026-04-12` | `8493403` | refactor: move AIAssistant → components/ai/AIAssistant, fix BatteryPredictionCard import path | 2026-04-12 |
| 48 | `rollback/refactor-delete-dashboard-shim-folder-2026-04-12` | `49f110d` | refactor: delete dashboard/ shim folder | 2026-04-12 |
| 47 | `rollback/refactor-remove-energy-energyreportmod-2026-04-12` | `fd9e8c6` | refactor: remove energy/EnergyReportModal.tsx (moved to reports/) | 2026-04-12 |
| 46 | `rollback/refactor-remove-energy-recommendationc-2026-04-12` | `0cec915` | refactor: remove energy/RecommendationComponents.tsx (moved to recommendation/) | 2026-04-12 |
| 45 | `rollback/refactor-complete-structure-move-to-re-2026-04-12` | `da5aaa2` | refactor: complete structure — move to recommendation/ & reports/, scaffold LoadConfigComponents, nuke dashboard/ shims | 2026-04-12 |
| 44 | `rollback/refactor-replace-13-duplicate-dashboar-2026-04-12` | `0d861ed` | refactor: replace 13 duplicate dashboard/ flat files with canonical re-export shims | 2026-04-12 |
| 43 | `rollback/refactor-replace-stub-ai-with-real-wir-2026-04-12` | `abfbc3c` | refactor: replace stub ai/ with real wiring; flesh out reports/ CSV export; add dashboard/ shims for duplicates | 2026-04-12 |
| 42 | `rollback/refactor-add-reports-ai-stubs-and-dash-2026-04-12` | `0d7c84a` | refactor: add reports/, ai/ stubs and dashboard/ re-export barrels for zero-breakage | 2026-04-12 |
| 41 | `rollback/refactor-decompose-dashboard-into-widg-2026-04-12` | `3be3586` | refactor: decompose dashboard/ into widgets/, financial/, reports/, ai/ per target structure | 2026-04-12 |
| 40 | `rollback/refactor-remove-duplicate-recommendati-2026-04-12` | `babc9fa` | refactor: remove duplicate RecommendationComponents.tsx from simulation/ (canonical in energy/) | 2026-04-12 |
| 39 | `rollback/refactor-remove-flat-recommendationcom-2026-04-12` | `f89ddb0` | refactor: remove flat RecommendationComponents.tsx (moved to energy/) | 2026-04-12 |
| 38 | `rollback/refactor-remove-flat-loadconfigcompone-2026-04-12` | `78746d6` | refactor: remove flat LoadConfigComponents.tsx (moved to simulation/) | 2026-04-12 |
| 37 | `rollback/refactor-remove-flat-financialdashboar-2026-04-12` | `c23231a` | refactor: remove flat FinancialDashboard.tsx (moved to dashboard/) | 2026-04-12 |
| 36 | `rollback/refactor-remove-flat-energyreportmodal-2026-04-12` | `23ef28a` | refactor: remove flat EnergyReportModal.tsx (moved to energy/) | 2026-04-12 |
| 35 | `rollback/refactor-move-flat-components-into-sub-2026-04-12` | `1d9f900` | refactor: move flat components into subfolders + fix import paths | 2026-04-12 |
| 34 | `rollback/refactor-slice-3-add-energy-energyrepo-2026-04-12` | `3db17c9` | refactor(slice-3): add energy/EnergyReportModal, simulation/LoadConfig, simulation/Recommendation | 2026-04-12 |
| 33 | `rollback/refactor-dashboard-add-dashboard-finan-2026-04-12` | `8a9d25d` | refactor(dashboard): add dashboard/FinancialDashboard.tsx | 2026-04-12 |
| 32 | `rollback/refactor-energy-remove-root-solarcompo-2026-04-12` | `25aebf9` | refactor(energy): remove root SolarComponentLibrary.tsx — now lives in energy/ | 2026-04-12 |
| 31 | `rollback/refactor-energy-move-dailyenergygraph-2026-04-12` | `dd9725c` | refactor(energy): move DailyEnergyGraph + SolarComponentLibrary into energy/ slice 2 | 2026-04-12 |
| 30 | `rollback/refactor-energy-move-energy-widget-com-2026-04-12` | `61d93a4` | refactor(energy): move energy widget components to src/components/energy/ | 2026-04-12 |
| 29 | `rollback/refactor-layout-remove-mobilebottomnav-2026-04-12` | `f7097b4` | refactor(layout): remove MobileBottomNav from dashboard/ (moved to layout/) | 2026-04-12 |
| 28 | `rollback/refactor-layout-remove-dashboardheader-2026-04-12` | `a4ce038` | refactor(layout): remove DashboardHeader from dashboard/ (moved to layout/) | 2026-04-12 |
| 27 | `rollback/refactor-layout-remove-dashboardsideba-2026-04-12` | `843ddf4` | refactor(layout): remove DashboardSidebar from dashboard/ (moved to layout/) | 2026-04-12 |
| 26 | `rollback/refactor-layout-remove-dashboardlayout-2026-04-12` | `51902ca` | refactor(layout): remove DashboardLayout from dashboard/ (moved to layout/) | 2026-04-12 |
| 25 | `rollback/refactor-layout-move-shell-components-2026-04-12` | `7a4dd3c` | refactor(layout): move shell components to src/components/layout/ | 2026-04-12 |
| 24 | `rollback/feat-use-google-drive-hosted-logo-acro-2026-04-12` | `48f05ce` | feat: use Google Drive hosted logo across all placements | 2026-04-12 |
| 23 | `rollback/feat-use-logo-png-with-full-elephant-w-2026-04-12` | `8c4563f` | feat: use logo.png with full elephant+wordmark display in sidebar | 2026-04-12 |
| 22 | `rollback/logo-2026-04-12` | `60edb78` | Logo | 2026-04-12 |
| 21 | `rollback/feat-replace-logo-with-uploaded-safari-2026-04-12` | `c513864` | feat: replace logo with uploaded SafariCharge elephant illustration (JPEG) | 2026-04-12 |
| 20 | `rollback/feat-add-safaricharge-elephant-logo-im-2026-04-12` | `bd44d9d` | feat: add SafariCharge elephant logo image | 2026-04-12 |
| 19 | `rollback/feat-replace-z-mark-logo-with-elephant-2026-04-12` | `8c2741d` | feat: replace Z-mark logo with elephant + solar panel illustration | 2026-04-12 |
| 18 | `rollback/brand-add-favicon-apple-touch-icon-and-2026-04-12` | `9d7bea2` | brand: add favicon, apple-touch-icon and full icon metadata | 2026-04-12 |
| 17 | `rollback/brand-replace-logo-with-pixel-perfect-2026-04-12` | `2dbd869` | brand: replace logo with pixel-perfect teal SafariCharge mark | 2026-04-12 |
| 16 | `rollback/feat-nav-bottom-tab-bar-on-mobile-logo-2026-04-12` | `9ab9427` | feat(nav): bottom tab bar on mobile + logo image throughout | 2026-04-12 |
| 15 | `rollback/fix-scenarios-drawer-backdrop-no-longe-2026-04-12` | `5b330db` | fix(scenarios): drawer backdrop no longer blocks sidebar nav | 2026-04-12 |
| 14 | `rollback/fix-ci-restore-rollback-md-after-reset-2026-04-12` | `2beb51b` | fix(ci): restore ROLLBACK.md after reset so rebase doesn't fail on retry | 2026-04-12 |
| 13 | `rollback/ci-remove-lint-job-tsc-covers-correctn-2026-04-12` | `64d8c30` | ci: remove lint job — tsc covers correctness; eslint-plugin-react-hooks v5 rules are too noisy | 2026-04-12 |
| 12 | `rollback/fix-lint-disable-react-hooks-v5-strict-2026-04-12` | `589c79f` | fix(lint): disable react-hooks v5 strict rules that fire on valid patterns | 2026-04-12 |
| 11 | `rollback/fix-lint-use-uselayouteffect-for-carou-2026-04-12` | `a853cab` | fix(lint): use useLayoutEffect for carousel mount sync to satisfy react-hooks/no-direct-set-state-in-use-effect | 2026-04-12 |
| 10 | `rollback/fix-lint-restore-truncated-solarcompon-2026-04-12` | `780f2eb` | fix(lint): restore truncated SolarComponentLibrary; fix setState-in-effect in SystemVisualization; move Math.random to module scope in sidebar | 2026-04-12 |
| 9 | `rollback/fix-lint-convert-require-to-esm-import-2026-04-12` | `ab57eb7` | fix(lint): convert require() to ESM imports in gen script; fix setState-in-effect and Math.random purity violations | 2026-04-12 |
| 8 | `rollback/fix-ci-update-rollback-re-run-gen-scri-2026-04-12` | `6515a03` | fix(ci): update-rollback — re-run gen script inside retry loop, drop fragile stash pattern | 2026-04-12 |
| 7 | `rollback/fix-ts-ts2554-handleduplicate-uses-sou-2026-04-12` | `480cab5` | fix(ts): TS2554 handleDuplicate uses source.finance+location; TS2769 radar restructured to RadarChart data=radarData with per-scenario dataKey columns | 2026-04-12 |
| 6 | `rollback/fix-ci-resolve-all-5-type-check-errors-2026-04-12` | `037d751` | fix(ci): resolve all 5 type-check errors and lint flag error | 2026-04-12 |
| 5 | `rollback/fix-ci-replace-single-pull-rebase-with-2026-04-12` | `abce273` | fix(ci): replace single pull--rebase with 5-attempt push retry loop in all auto-update workflows | 2026-04-12 |
| 4 | `rollback/fix-ci-update-rollback-stash-before-re-2026-04-12` | `c4aed71` | fix(ci): update-rollback — stash before rebase pull, unstash after | 2026-04-12 |
| 3 | `rollback/pre-soc-fix-2026-04-11` | `1063f307` | State before Battery SOC clean fix — includes WIP SOC merge (PR #136) + scenario management (PR #137) | 2026-04-11 |
| 2 | *(tag)* `original-dashboard-v1` | `8039cb4` | Original dashboard UI before card-based refactor (PR #41) | 2026-03-29 |
| 1 | *(initial)* `main` baseline | — | Project genesis | — |

---

## Snapshot #3 — `rollback/pre-soc-fix-2026-04-11`

- **Branch**: `rollback/pre-soc-fix-2026-04-11`
- **Commit**: `1063f307bdb96688a05bedda475ff13d4008a871`
- **Last merged PR**: #136 — [WIP] Fix battery SOC flat line in simulation
- **Also includes**: PR #137 — Scenario management (save, list, compare)
- **Why captured**: Before clean Battery SOC fix session starting 2026-04-11

---

## Snapshot #2 — `original-dashboard-v1` (tag)

- **Tag**: `original-dashboard-v1`
- **Commit**: `8039cb4`
- **Description**: Original dashboard UI before card-based refactor
- **Date**: 2026-03-29

**Original Dashboard**: Single-page layout, traditional UI components
**Post-refactor (PR #42)**: Card-based layout, sidebar navigation, modular components, enhanced animations

---

## Adding a New Snapshot (After Each Major Change)

1. Note the current `main` HEAD SHA:
   ```bash
   git rev-parse HEAD
   ```
2. Create the rollback branch:
   ```bash
   git checkout main
   git branch rollback/<topic>-<YYYY-MM-DD>
   git push origin rollback/<topic>-<YYYY-MM-DD>
   ```
3. Update this file — add a new row to the Snapshot Log table (newest first) and add a detail section below.
4. Commit the updated `ROLLBACK.md` to `main`.
---

## Snapshot #4 — `rollback/fix-ci-update-rollback-stash-before-re-2026-04-12`

- **Branch**: `rollback/fix-ci-update-rollback-stash-before-re-2026-04-12`
- **Commit**: `c4aed7146d16cb9b5cbbdc56455ab98bf4791bcc`
- **Subject**: fix(ci): update-rollback — stash before rebase pull, unstash after
- **Date**: 2026-04-12
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #5 — `rollback/fix-ci-replace-single-pull-rebase-with-2026-04-12`

- **Branch**: `rollback/fix-ci-replace-single-pull-rebase-with-2026-04-12`
- **Commit**: `abce273db3478396cc54b8b145a39051d18c5b72`
- **Subject**: fix(ci): replace single pull--rebase with 5-attempt push retry loop in all auto-update workflows
- **Date**: 2026-04-12
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #6 — `rollback/fix-ci-resolve-all-5-type-check-errors-2026-04-12`

- **Branch**: `rollback/fix-ci-resolve-all-5-type-check-errors-2026-04-12`
- **Commit**: `037d751f2b45da0ad82e55a4bea2b42650f89805`
- **Subject**: fix(ci): resolve all 5 type-check errors and lint flag error
- **Date**: 2026-04-12
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #7 — `rollback/fix-ts-ts2554-handleduplicate-uses-sou-2026-04-12`

- **Branch**: `rollback/fix-ts-ts2554-handleduplicate-uses-sou-2026-04-12`
- **Commit**: `480cab554a58f233d8f5d34f45d25945c964337d`
- **Subject**: fix(ts): TS2554 handleDuplicate uses source.finance+location; TS2769 radar restructured to RadarChart data=radarData with per-scenario dataKey columns
- **Date**: 2026-04-12
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #8 — `rollback/fix-ci-update-rollback-re-run-gen-scri-2026-04-12`

- **Branch**: `rollback/fix-ci-update-rollback-re-run-gen-scri-2026-04-12`
- **Commit**: `6515a030c2ecf21bfa9144c99c2c37792b5617a2`
- **Subject**: fix(ci): update-rollback — re-run gen script inside retry loop, drop fragile stash pattern
- **Date**: 2026-04-12
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #9 — `rollback/fix-lint-convert-require-to-esm-import-2026-04-12`

- **Branch**: `rollback/fix-lint-convert-require-to-esm-import-2026-04-12`
- **Commit**: `ab57eb7659c584c01a0bd1a7c1b15fec60840940`
- **Subject**: fix(lint): convert require() to ESM imports in gen script; fix setState-in-effect and Math.random purity violations
- **Date**: 2026-04-12
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #10 — `rollback/fix-lint-restore-truncated-solarcompon-2026-04-12`

- **Branch**: `rollback/fix-lint-restore-truncated-solarcompon-2026-04-12`
- **Commit**: `780f2eb1c98328e9bb5cb8272e2612aa591a5cd3`
- **Subject**: fix(lint): restore truncated SolarComponentLibrary; fix setState-in-effect in SystemVisualization; move Math.random to module scope in sidebar
- **Date**: 2026-04-12
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #11 — `rollback/fix-lint-use-uselayouteffect-for-carou-2026-04-12`

- **Branch**: `rollback/fix-lint-use-uselayouteffect-for-carou-2026-04-12`
- **Commit**: `a853cabec9e933c0a966e35d1251c5f18c9909ef`
- **Subject**: fix(lint): use useLayoutEffect for carousel mount sync to satisfy react-hooks/no-direct-set-state-in-use-effect
- **Date**: 2026-04-12
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #12 — `rollback/fix-lint-disable-react-hooks-v5-strict-2026-04-12`

- **Branch**: `rollback/fix-lint-disable-react-hooks-v5-strict-2026-04-12`
- **Commit**: `589c79f4a5c22b821be040c50040efc37e02dd01`
- **Subject**: fix(lint): disable react-hooks v5 strict rules that fire on valid patterns
- **Date**: 2026-04-12
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #13 — `rollback/ci-remove-lint-job-tsc-covers-correctn-2026-04-12`

- **Branch**: `rollback/ci-remove-lint-job-tsc-covers-correctn-2026-04-12`
- **Commit**: `64d8c3002d7f6b3bb4d02425a073bda4d924c25e`
- **Subject**: ci: remove lint job — tsc covers correctness; eslint-plugin-react-hooks v5 rules are too noisy
- **Date**: 2026-04-12
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #14 — `rollback/fix-ci-restore-rollback-md-after-reset-2026-04-12`

- **Branch**: `rollback/fix-ci-restore-rollback-md-after-reset-2026-04-12`
- **Commit**: `2beb51b0ab4b6bb1407e52b166e1ef56b1acbc42`
- **Subject**: fix(ci): restore ROLLBACK.md after reset so rebase doesn't fail on retry
- **Date**: 2026-04-12
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #15 — `rollback/fix-scenarios-drawer-backdrop-no-longe-2026-04-12`

- **Branch**: `rollback/fix-scenarios-drawer-backdrop-no-longe-2026-04-12`
- **Commit**: `5b330dbe7cd54e6bb9cc0b9c582c5f4a771cf649`
- **Subject**: fix(scenarios): drawer backdrop no longer blocks sidebar nav
- **Date**: 2026-04-12
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #16 — `rollback/feat-nav-bottom-tab-bar-on-mobile-logo-2026-04-12`

- **Branch**: `rollback/feat-nav-bottom-tab-bar-on-mobile-logo-2026-04-12`
- **Commit**: `9ab9427a21ec8ca655a895e445b3c1951196b74f`
- **Subject**: feat(nav): bottom tab bar on mobile + logo image throughout
- **Date**: 2026-04-12
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #17 — `rollback/brand-replace-logo-with-pixel-perfect-2026-04-12`

- **Branch**: `rollback/brand-replace-logo-with-pixel-perfect-2026-04-12`
- **Commit**: `2dbd869d0dd9ca8aba0af4b85958be9ae9317b0a`
- **Subject**: brand: replace logo with pixel-perfect teal SafariCharge mark
- **Date**: 2026-04-12
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #18 — `rollback/brand-add-favicon-apple-touch-icon-and-2026-04-12`

- **Branch**: `rollback/brand-add-favicon-apple-touch-icon-and-2026-04-12`
- **Commit**: `9d7bea2b19d22770f08889a98bf65568a4dfef52`
- **Subject**: brand: add favicon, apple-touch-icon and full icon metadata
- **Date**: 2026-04-12
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #19 — `rollback/feat-replace-z-mark-logo-with-elephant-2026-04-12`

- **Branch**: `rollback/feat-replace-z-mark-logo-with-elephant-2026-04-12`
- **Commit**: `8c2741dbfe0dabbcc67bec054634cef273dfed60`
- **Subject**: feat: replace Z-mark logo with elephant + solar panel illustration
- **Date**: 2026-04-12
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #20 — `rollback/feat-add-safaricharge-elephant-logo-im-2026-04-12`

- **Branch**: `rollback/feat-add-safaricharge-elephant-logo-im-2026-04-12`
- **Commit**: `bd44d9df2821afdd1a22a6784819c8676d2e19cc`
- **Subject**: feat: add SafariCharge elephant logo image
- **Date**: 2026-04-12
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #21 — `rollback/feat-replace-logo-with-uploaded-safari-2026-04-12`

- **Branch**: `rollback/feat-replace-logo-with-uploaded-safari-2026-04-12`
- **Commit**: `c51386472f67886a70ab10a8f4d867874c2c97f3`
- **Subject**: feat: replace logo with uploaded SafariCharge elephant illustration (JPEG)
- **Date**: 2026-04-12
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #22 — `rollback/logo-2026-04-12`

- **Branch**: `rollback/logo-2026-04-12`
- **Commit**: `60edb78b875dc9e0896b0b76fae36071b85d12c6`
- **Subject**: Logo
- **Date**: 2026-04-12
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #23 — `rollback/feat-use-logo-png-with-full-elephant-w-2026-04-12`

- **Branch**: `rollback/feat-use-logo-png-with-full-elephant-w-2026-04-12`
- **Commit**: `8c4563f700352f264220bbf5ddfd6263a7afa594`
- **Subject**: feat: use logo.png with full elephant+wordmark display in sidebar
- **Date**: 2026-04-12
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #24 — `rollback/feat-use-google-drive-hosted-logo-acro-2026-04-12`

- **Branch**: `rollback/feat-use-google-drive-hosted-logo-acro-2026-04-12`
- **Commit**: `48f05ce951339fbddb1f6f5e2937bae6ecae6ede`
- **Subject**: feat: use Google Drive hosted logo across all placements
- **Date**: 2026-04-12
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #25 — `rollback/refactor-layout-move-shell-components-2026-04-12`

- **Branch**: `rollback/refactor-layout-move-shell-components-2026-04-12`
- **Commit**: `7a4dd3c46f89b83357cdbc36b1c3730ddab1aa7a`
- **Subject**: refactor(layout): move shell components to src/components/layout/
- **Date**: 2026-04-12
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #26 — `rollback/refactor-layout-remove-dashboardlayout-2026-04-12`

- **Branch**: `rollback/refactor-layout-remove-dashboardlayout-2026-04-12`
- **Commit**: `51902cae8f23f97533385f0a7dce4ec87f25a467`
- **Subject**: refactor(layout): remove DashboardLayout from dashboard/ (moved to layout/)
- **Date**: 2026-04-12
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #27 — `rollback/refactor-layout-remove-dashboardsideba-2026-04-12`

- **Branch**: `rollback/refactor-layout-remove-dashboardsideba-2026-04-12`
- **Commit**: `843ddf4fefc24a2f78709cef2edf20b7c7a71526`
- **Subject**: refactor(layout): remove DashboardSidebar from dashboard/ (moved to layout/)
- **Date**: 2026-04-12
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #28 — `rollback/refactor-layout-remove-dashboardheader-2026-04-12`

- **Branch**: `rollback/refactor-layout-remove-dashboardheader-2026-04-12`
- **Commit**: `a4ce038b572aa21f60f1bdb8562486a9f67bbcd0`
- **Subject**: refactor(layout): remove DashboardHeader from dashboard/ (moved to layout/)
- **Date**: 2026-04-12
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #29 — `rollback/refactor-layout-remove-mobilebottomnav-2026-04-12`

- **Branch**: `rollback/refactor-layout-remove-mobilebottomnav-2026-04-12`
- **Commit**: `f7097b421fee5164768749fd974c5bb4d45e20f1`
- **Subject**: refactor(layout): remove MobileBottomNav from dashboard/ (moved to layout/)
- **Date**: 2026-04-12
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #30 — `rollback/refactor-energy-move-energy-widget-com-2026-04-12`

- **Branch**: `rollback/refactor-energy-move-energy-widget-com-2026-04-12`
- **Commit**: `61d93a49adefd61d32dd0046e10c6016f53863ac`
- **Subject**: refactor(energy): move energy widget components to src/components/energy/
- **Date**: 2026-04-12
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #31 — `rollback/refactor-energy-move-dailyenergygraph-2026-04-12`

- **Branch**: `rollback/refactor-energy-move-dailyenergygraph-2026-04-12`
- **Commit**: `dd9725c200e66afea82eec4ecbd74d277a2d9af2`
- **Subject**: refactor(energy): move DailyEnergyGraph + SolarComponentLibrary into energy/ slice 2
- **Date**: 2026-04-12
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #32 — `rollback/refactor-energy-remove-root-solarcompo-2026-04-12`

- **Branch**: `rollback/refactor-energy-remove-root-solarcompo-2026-04-12`
- **Commit**: `25aebf9b41ed9b77a63783e54ae6065189f68353`
- **Subject**: refactor(energy): remove root SolarComponentLibrary.tsx — now lives in energy/
- **Date**: 2026-04-12
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #33 — `rollback/refactor-dashboard-add-dashboard-finan-2026-04-12`

- **Branch**: `rollback/refactor-dashboard-add-dashboard-finan-2026-04-12`
- **Commit**: `8a9d25d20c956428c60ca8e3b3f8c4581ab8b606`
- **Subject**: refactor(dashboard): add dashboard/FinancialDashboard.tsx
- **Date**: 2026-04-12
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #34 — `rollback/refactor-slice-3-add-energy-energyrepo-2026-04-12`

- **Branch**: `rollback/refactor-slice-3-add-energy-energyrepo-2026-04-12`
- **Commit**: `3db17c9fcdc8a3076e25719c634307e29aec7893`
- **Subject**: refactor(slice-3): add energy/EnergyReportModal, simulation/LoadConfig, simulation/Recommendation
- **Date**: 2026-04-12
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #35 — `rollback/refactor-move-flat-components-into-sub-2026-04-12`

- **Branch**: `rollback/refactor-move-flat-components-into-sub-2026-04-12`
- **Commit**: `1d9f9005d671a44899174b3eb6d2bccdd521ad56`
- **Subject**: refactor: move flat components into subfolders + fix import paths
- **Date**: 2026-04-12
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #36 — `rollback/refactor-remove-flat-energyreportmodal-2026-04-12`

- **Branch**: `rollback/refactor-remove-flat-energyreportmodal-2026-04-12`
- **Commit**: `23ef28ab924a3eaeb20746e52e8af5a050d64ea4`
- **Subject**: refactor: remove flat EnergyReportModal.tsx (moved to energy/)
- **Date**: 2026-04-12
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #37 — `rollback/refactor-remove-flat-financialdashboar-2026-04-12`

- **Branch**: `rollback/refactor-remove-flat-financialdashboar-2026-04-12`
- **Commit**: `c23231a1567a0318c2518ea3f353893205555243`
- **Subject**: refactor: remove flat FinancialDashboard.tsx (moved to dashboard/)
- **Date**: 2026-04-12
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #38 — `rollback/refactor-remove-flat-loadconfigcompone-2026-04-12`

- **Branch**: `rollback/refactor-remove-flat-loadconfigcompone-2026-04-12`
- **Commit**: `78746d6889ed79c8b3e5cf3d79e39d91aa74812a`
- **Subject**: refactor: remove flat LoadConfigComponents.tsx (moved to simulation/)
- **Date**: 2026-04-12
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #39 — `rollback/refactor-remove-flat-recommendationcom-2026-04-12`

- **Branch**: `rollback/refactor-remove-flat-recommendationcom-2026-04-12`
- **Commit**: `f89ddb08574d28f01e8c137e8d803aed7d6ef26b`
- **Subject**: refactor: remove flat RecommendationComponents.tsx (moved to energy/)
- **Date**: 2026-04-12
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #40 — `rollback/refactor-remove-duplicate-recommendati-2026-04-12`

- **Branch**: `rollback/refactor-remove-duplicate-recommendati-2026-04-12`
- **Commit**: `babc9fa2626c76d654f7c011cb450c2161a225a1`
- **Subject**: refactor: remove duplicate RecommendationComponents.tsx from simulation/ (canonical in energy/)
- **Date**: 2026-04-12
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #41 — `rollback/refactor-decompose-dashboard-into-widg-2026-04-12`

- **Branch**: `rollback/refactor-decompose-dashboard-into-widg-2026-04-12`
- **Commit**: `3be35867e49ad15d7d92f37e7e93e906154ffb33`
- **Subject**: refactor: decompose dashboard/ into widgets/, financial/, reports/, ai/ per target structure
- **Date**: 2026-04-12
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #42 — `rollback/refactor-add-reports-ai-stubs-and-dash-2026-04-12`

- **Branch**: `rollback/refactor-add-reports-ai-stubs-and-dash-2026-04-12`
- **Commit**: `0d7c84aee4383fd664dfd1474b5af6cfc263f378`
- **Subject**: refactor: add reports/, ai/ stubs and dashboard/ re-export barrels for zero-breakage
- **Date**: 2026-04-12
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #43 — `rollback/refactor-replace-stub-ai-with-real-wir-2026-04-12`

- **Branch**: `rollback/refactor-replace-stub-ai-with-real-wir-2026-04-12`
- **Commit**: `abfbc3c8579197fc0bc2e02e999f446d3bdf6544`
- **Subject**: refactor: replace stub ai/ with real wiring; flesh out reports/ CSV export; add dashboard/ shims for duplicates
- **Date**: 2026-04-12
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #44 — `rollback/refactor-replace-13-duplicate-dashboar-2026-04-12`

- **Branch**: `rollback/refactor-replace-13-duplicate-dashboar-2026-04-12`
- **Commit**: `0d861edb796c958b526a17434397aa2c5b5b60de`
- **Subject**: refactor: replace 13 duplicate dashboard/ flat files with canonical re-export shims
- **Date**: 2026-04-12
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #45 — `rollback/refactor-complete-structure-move-to-re-2026-04-12`

- **Branch**: `rollback/refactor-complete-structure-move-to-re-2026-04-12`
- **Commit**: `da5aaa20a24500eb40017ab11a4096c6f7eb939d`
- **Subject**: refactor: complete structure — move to recommendation/ & reports/, scaffold LoadConfigComponents, nuke dashboard/ shims
- **Date**: 2026-04-12
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #46 — `rollback/refactor-remove-energy-recommendationc-2026-04-12`

- **Branch**: `rollback/refactor-remove-energy-recommendationc-2026-04-12`
- **Commit**: `0cec915630ff6d44669c35f3b397e9518339281e`
- **Subject**: refactor: remove energy/RecommendationComponents.tsx (moved to recommendation/)
- **Date**: 2026-04-12
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #47 — `rollback/refactor-remove-energy-energyreportmod-2026-04-12`

- **Branch**: `rollback/refactor-remove-energy-energyreportmod-2026-04-12`
- **Commit**: `fd9e8c6245ecb56578a94274a12faff148211006`
- **Subject**: refactor: remove energy/EnergyReportModal.tsx (moved to reports/)
- **Date**: 2026-04-12
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #48 — `rollback/refactor-delete-dashboard-shim-folder-2026-04-12`

- **Branch**: `rollback/refactor-delete-dashboard-shim-folder-2026-04-12`
- **Commit**: `49f110d49aea332550f9909dbdb3f95523788221`
- **Subject**: refactor: delete dashboard/ shim folder
- **Date**: 2026-04-12
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #49 — `rollback/refactor-move-aiassistant-components-a-2026-04-12`

- **Branch**: `rollback/refactor-move-aiassistant-components-a-2026-04-12`
- **Commit**: `8493403b281a0eab5a588a09ef6b98f0f5975c36`
- **Subject**: refactor: move AIAssistant → components/ai/AIAssistant, fix BatteryPredictionCard import path
- **Date**: 2026-04-12
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #50 — `rollback/refactor-delete-dashboard-aiassistant-2026-04-12`

- **Branch**: `rollback/refactor-delete-dashboard-aiassistant-2026-04-12`
- **Commit**: `0d07242a70cd83bb00564da48347d8ad48ca5f52`
- **Subject**: refactor: delete dashboard/AIAssistant (moved to ai/AIAssistant)
- **Date**: 2026-04-12
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #51 — `rollback/refactor-delete-dashboard-shim-subfold-2026-04-12`

- **Branch**: `rollback/refactor-delete-dashboard-shim-subfold-2026-04-12`
- **Commit**: `d1e901b89fd7ae66c0848b032fbfce43a5ca79ae`
- **Subject**: refactor: delete dashboard/ shim subfolders — dashboard/ is now empty
- **Date**: 2026-04-12
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #52 — `rollback/fix-correct-components-dashboard-compo-2026-04-12`

- **Branch**: `rollback/fix-correct-components-dashboard-compo-2026-04-12`
- **Commit**: `9c67b53d7c46c5fb487f674d7c7e1d7da1492f4e`
- **Subject**: fix: correct @/components/dashboard → @/components/layout import paths in app/page.tsx and app/demo/page.tsx
- **Date**: 2026-04-12
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #53 — `rollback/fix-restore-full-demo-page-tsx-body-fr-2026-04-12`

- **Branch**: `rollback/fix-restore-full-demo-page-tsx-body-fr-2026-04-12`
- **Commit**: `473d4eb8ef2d14abe69d6891c39d2be56a685f21`
- **Subject**: fix: restore full demo/page.tsx body from rollback snapshot, fix all import paths
- **Date**: 2026-04-12
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #54 — `rollback/restore-reinstate-full-src-components-2026-04-12`

- **Branch**: `rollback/restore-reinstate-full-src-components-2026-04-12`
- **Commit**: `047112dee6966a168b25daefe339880be06b8578`
- **Subject**: restore: reinstate full src/components/dashboard/ from commit 9ab9427
- **Date**: 2026-04-12
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #55 — `rollback/fix-ai-correct-malformed-generic-on-us-2026-04-12`

- **Branch**: `rollback/fix-ai-correct-malformed-generic-on-us-2026-04-12`
- **Commit**: `c077e41f0287d3760c21bbcd6226bb4f76ff1b96`
- **Subject**: fix(ai): correct malformed generic on useState line 60
- **Date**: 2026-04-12
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #56 — `rollback/restore-add-missing-powerflowvisualiza-2026-04-12`

- **Branch**: `rollback/restore-add-missing-powerflowvisualiza-2026-04-12`
- **Commit**: `23219ba1b07a4ff3d275587c38cc83cc0f9be406`
- **Subject**: restore: add missing PowerFlowVisualization, SystemVisualization, FinancialDashboard to dashboard/
- **Date**: 2026-04-12
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #57 — `rollback/fix-replace-placeholder-stubs-with-rea-2026-04-12`

- **Branch**: `rollback/fix-replace-placeholder-stubs-with-rea-2026-04-12`
- **Commit**: `3da49ee1525241a40f7dda68bd9a716f8b78fac3`
- **Subject**: fix: replace placeholder stubs with real component content
- **Date**: 2026-04-12
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #58 — `rollback/restore-full-powerflowvisualization-ts-2026-04-12`

- **Branch**: `rollback/restore-full-powerflowvisualization-ts-2026-04-12`
- **Commit**: `21e7e57c9e9a143bc1d91bd5b312eee38b61cb56`
- **Subject**: restore: full PowerFlowVisualization.tsx (was stub from bad commit)
- **Date**: 2026-04-12
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #59 — `rollback/restore-full-systemvisualization-tsx-w-2026-04-12`

- **Branch**: `rollback/restore-full-systemvisualization-tsx-w-2026-04-12`
- **Commit**: `ea5c418410eb0facc0559f828c76f650d3cd9188`
- **Subject**: restore: full SystemVisualization.tsx (was stub from bad commit)
- **Date**: 2026-04-12
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #60 — `rollback/restore-full-financialdashboard-tsx-wa-2026-04-12`

- **Branch**: `rollback/restore-full-financialdashboard-tsx-wa-2026-04-12`
- **Commit**: `626f8116e8b1d3e6636950e4b9e9facffdcc7101`
- **Subject**: restore: full FinancialDashboard.tsx (was stub from bad commit)
- **Date**: 2026-04-12
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #61 — `rollback/restore-exact-original-powerflowvisual-2026-04-12`

- **Branch**: `rollback/restore-exact-original-powerflowvisual-2026-04-12`
- **Commit**: `18807aed8706c46852ddd11f0a6bd934850cff40`
- **Subject**: restore: exact original PowerFlowVisualization from pre-deletion commit 9ab9427
- **Date**: 2026-04-12
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #62 — `rollback/restore-add-missing-engineeringkpiscar-2026-04-12`

- **Branch**: `rollback/restore-add-missing-engineeringkpiscar-2026-04-12`
- **Commit**: `5c02e4f49312c1b4e20b6a6d311f0c939a1b9553`
- **Subject**: restore: add missing EngineeringKpisCard component
- **Date**: 2026-04-12
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #63 — `rollback/feat-add-missing-energyreportmodal-com-2026-04-12`

- **Branch**: `rollback/feat-add-missing-energyreportmodal-com-2026-04-12`
- **Commit**: `113e08c9c7c6695483bf9ecb9e02173d3efaea31`
- **Subject**: feat: add missing EnergyReportModal component to energy folder
- **Date**: 2026-04-12
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #64 — `rollback/refactor-consolidate-dashboardsidebar-2026-04-12`

- **Branch**: `rollback/refactor-consolidate-dashboardsidebar-2026-04-12`
- **Commit**: `82cc47b28972d9f31ef43a7606732429b5541c20`
- **Subject**: refactor: consolidate DashboardSidebar — layout/ is canonical, dashboard/ re-exports
- **Date**: 2026-04-12
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #65 — `rollback/chore-add-energyreportmodal-and-recomm-2026-04-12`

- **Branch**: `rollback/chore-add-energyreportmodal-and-recomm-2026-04-12`
- **Commit**: `e1cc564bc96d8d128dd079500a9e2ac28d626fdb`
- **Subject**: chore: add EnergyReportModal and RecommendationComponents to energy barrel
- **Date**: 2026-04-12
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #66 — `rollback/refactor-convert-dashboard-to-pure-bar-2026-04-12`

- **Branch**: `rollback/refactor-convert-dashboard-to-pure-bar-2026-04-12`
- **Commit**: `83cd6e540f4a084a735f1e8245526c1e7c0127df`
- **Subject**: refactor: convert dashboard/ to pure barrel re-export layer
- **Date**: 2026-04-12
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #67 — `rollback/fix-barrel-harden-all-4-export-consist-2026-04-12`

- **Branch**: `rollback/fix-barrel-harden-all-4-export-consist-2026-04-12`
- **Commit**: `125c32c05810b24b5d0cdcca9e1b6a72ed0451ef`
- **Subject**: fix(barrel): harden all 4 export consistency issues
- **Date**: 2026-04-12
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #68 — `rollback/arch-deprecation-notices-on-all-dashbo-2026-04-12`

- **Branch**: `rollback/arch-deprecation-notices-on-all-dashbo-2026-04-12`
- **Commit**: `3ea2f0ab8ccd10b2c3d0be39f74d374131f71c21`
- **Subject**: arch: deprecation notices on all dashboard/ shims + domain boundary ESLint rule + codemod migration script
- **Date**: 2026-04-12
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #69 — `rollback/arch-codemod-v2-catches-import-type-x-2026-04-13`

- **Branch**: `rollback/arch-codemod-v2-catches-import-type-x-2026-04-13`
- **Commit**: `fa3eefb2b7c6b04259a5d1dfb2a37c42f38d1e25`
- **Subject**: arch: codemod v2 catches import { type X } syntax + post-deletion ESLint resurrection guard
- **Date**: 2026-04-13
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #70 — `rollback/arch-component-ownership-contract-no-b-2026-04-13`

- **Branch**: `rollback/arch-component-ownership-contract-no-b-2026-04-13`
- **Commit**: `15d14b2e23082971db8fb1cbe1f7f5ff25d9af73`
- **Subject**: arch: component ownership contract + no-barrel ESLint rule + codemod v3 multiline/comment-safe
- **Date**: 2026-04-13
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #71 — `rollback/fix-repair-two-broken-imports-crashing-2026-04-13`

- **Branch**: `rollback/fix-repair-two-broken-imports-crashing-2026-04-13`
- **Commit**: `4c26e8f9552cb3f96a574b955a147adcb895dd5b`
- **Subject**: fix: repair two broken imports crashing the build
- **Date**: 2026-04-13
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #72 — `rollback/fix-resolve-all-21-typescript-build-er-2026-04-13`

- **Branch**: `rollback/fix-resolve-all-21-typescript-build-er-2026-04-13`
- **Commit**: `3a27dc6602fdc8d7b00958a49a225f9e0dd67b1f`
- **Subject**: fix: resolve all 21 TypeScript build errors
- **Date**: 2026-04-13
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #73 — `rollback/fix-correct-3-broken-shims-causing-ts2-2026-04-13`

- **Branch**: `rollback/fix-correct-3-broken-shims-causing-ts2-2026-04-13`
- **Commit**: `457fa6156deee4d63ad7dbca79d176c3172838ad`
- **Subject**: fix: correct 3 broken shims causing TS2305/TS2614 errors
- **Date**: 2026-04-13
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #74 — `rollback/merge-pull-request-177-from-rauell1-co-2026-04-13`

- **Branch**: `rollback/merge-pull-request-177-from-rauell1-co-2026-04-13`
- **Commit**: `d10c35c72081caa1c0482d6c2e13dfdd8bfaa5a8`
- **Subject**: Merge pull request #177 from rauell1/copilot/add-user-signup-functionality
- **Date**: 2026-04-13
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #75 — `rollback/merge-pull-request-178-from-rauell1-co-2026-04-13`

- **Branch**: `rollback/merge-pull-request-178-from-rauell1-co-2026-04-13`
- **Commit**: `12cd4a92b575d1f5be0a865c870d347271afbada`
- **Subject**: Merge pull request #178 from rauell1/copilot/add-vercel-plugin
- **Date**: 2026-04-13
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #76 — `rollback/merge-pull-request-179-from-rauell1-co-2026-04-13`

- **Branch**: `rollback/merge-pull-request-179-from-rauell1-co-2026-04-13`
- **Commit**: `95f1c25645973311c89fb846565abd01f1e13959`
- **Subject**: Merge pull request #179 from rauell1/copilot/regenerate-package-lock-json
- **Date**: 2026-04-13
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #77 — `rollback/fix-store-cast-fresh-to-savedscenario-2026-04-13`

- **Branch**: `rollback/fix-store-cast-fresh-to-savedscenario-2026-04-13`
- **Commit**: `13aea37c77a84d54f081f53c2943bb89072209f6`
- **Subject**: fix(store): cast fresh to SavedScenario[] to resolve TS spread type error
- **Date**: 2026-04-13
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #78 — `rollback/fix-deps-force-undici-7-24-0-and-deval-2026-04-13`

- **Branch**: `rollback/fix-deps-force-undici-7-24-0-and-deval-2026-04-13`
- **Commit**: `3574f257dfc92acdad0c4e113529dcf8401cc7d8`
- **Subject**: fix(deps): force undici>=7.24.0 and devalue>=5.3.2 via overrides (closes Dependabot #28-35)
- **Date**: 2026-04-13
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #79 — `rollback/fix-make-powerflowvisualization-respon-2026-04-13`

- **Branch**: `rollback/fix-make-powerflowvisualization-respon-2026-04-13`
- **Commit**: `3384d3890e51a8d65ed228753710343081be6388`
- **Subject**: fix: make PowerFlowVisualization responsive on small devices
- **Date**: 2026-04-13
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #80 — `rollback/fix-preserve-desktop-tree-layout-on-mo-2026-04-13`

- **Branch**: `rollback/fix-preserve-desktop-tree-layout-on-mo-2026-04-13`
- **Commit**: `35bd2d7ee5e41f0c7781e30ac434a0fe39740d62`
- **Subject**: fix: preserve desktop tree layout on mobile with horizontal scroll
- **Date**: 2026-04-13
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #81 — `rollback/feat-vertical-flow-layout-for-mobile-d-2026-04-13`

- **Branch**: `rollback/feat-vertical-flow-layout-for-mobile-d-2026-04-13`
- **Commit**: `c0fec2bf828d4ea90d6ed494e0099b38bcbb119e`
- **Subject**: feat: vertical flow layout for mobile, desktop tree unchanged
- **Date**: 2026-04-13
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #82 — `rollback/fix-replace-css-flex-connectors-with-s-2026-04-13`

- **Branch**: `rollback/fix-replace-css-flex-connectors-with-s-2026-04-13`
- **Commit**: `c5596e88bc5b084da7eb74d5b38b9f7c8c885598`
- **Subject**: fix: replace CSS flex connectors with SVG tree on mobile — no hanging lines
- **Date**: 2026-04-13
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #83 — `rollback/feat-wire-pyomo-milp-dispatch-optimize-2026-04-14-19f65ec`

- **Branch**: `rollback/feat-wire-pyomo-milp-dispatch-optimize-2026-04-14-19f65ec`
- **Commit**: `19f65ec45cd9e2df3aae5a720ef332b8fa27120f`
- **Subject**: feat: wire Pyomo MILP dispatch optimizer + block-structured simulation refactor (#182)
- **Date**: 2026-04-14
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #84 — `rollback/fix-physics-epra-2025-26-tariff-rates-2026-04-14-a4d5e0c`

- **Branch**: `rollback/fix-physics-epra-2025-26-tariff-rates-2026-04-14-a4d5e0c`
- **Commit**: `a4d5e0c96f335bacfca3c5997c4a5934b6bb4fa4`
- **Subject**: fix(physics): EPRA 2025/26 tariff rates, demand-charge savings, RTE, NOCT wind term, Nairobi TMY, V2G dead-band, seasonal naive forecast, vitest CI
- **Date**: 2026-04-14
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #85 — `rollback/feat-landing-page-magic-link-login-via-2026-04-14-f66c895`

- **Branch**: `rollback/feat-landing-page-magic-link-login-via-2026-04-14-f66c895`
- **Commit**: `f66c895cffb3fd02f072fed108334dfc2fb30355`
- **Subject**: feat: landing page + magic-link login via Resend (#183)
- **Date**: 2026-04-14
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #86 — `rollback/chore-add-nextauth-tables-to-prisma-sc-2026-04-14-d4a6249`

- **Branch**: `rollback/chore-add-nextauth-tables-to-prisma-sc-2026-04-14-d4a6249`
- **Commit**: `d4a62493b17c7010b40d48cc4aaf204d2a64d6f1`
- **Subject**: chore: add NextAuth tables to Prisma schema (Account, Session, VerificationToken)
- **Date**: 2026-04-14
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #87 — `rollback/fix-resolve-4-vercel-build-errors-184-2026-04-14-afc963a`

- **Branch**: `rollback/fix-resolve-4-vercel-build-errors-184-2026-04-14-afc963a`
- **Commit**: `afc963a4b008a8b82109f174ba5aeebcb11df273`
- **Subject**: fix: resolve 4 Vercel build errors (#184)
- **Date**: 2026-04-14
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #88 — `rollback/fix-bump-nodemailer-to-7-0-7-add-npmrc-2026-04-14-e059532`

- **Branch**: `rollback/fix-bump-nodemailer-to-7-0-7-add-npmrc-2026-04-14-e059532`
- **Commit**: `e0595320d0be4e277891ad7420a171feaafe1854`
- **Subject**: fix: bump nodemailer to ^7.0.7 + add .npmrc legacy-peer-deps (#185)
- **Date**: 2026-04-14
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #89 — `rollback/fix-rewrite-middleware-ts-with-explici-2026-04-14-c21763d`

- **Branch**: `rollback/fix-rewrite-middleware-ts-with-explici-2026-04-14-c21763d`
- **Commit**: `c21763d74ec91c8b2bb0e8915748c661df053fa9`
- **Subject**: fix: rewrite middleware.ts with explicit function export (Next.js 16) (#186)
- **Date**: 2026-04-14
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #90 — `rollback/feat-pyomo-milp-dispatch-optimizer-ui-2026-04-14-6e12cb6`

- **Branch**: `rollback/feat-pyomo-milp-dispatch-optimizer-ui-2026-04-14-6e12cb6`
- **Commit**: `6e12cb620c0429f1e3c3b5223ff3ad2e728004c1`
- **Subject**: feat: Pyomo MILP dispatch optimizer + UI full overhaul (#187)
- **Date**: 2026-04-14
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #91 — `rollback/feat-supabase-ssr-client-helpers-188-2026-04-15-d0464dc`

- **Branch**: `rollback/feat-supabase-ssr-client-helpers-188-2026-04-15-d0464dc`
- **Commit**: `d0464dcf4fc526f6b728d3087c7284a99f56e6fe`
- **Subject**: feat: Supabase SSR client helpers (#188)
- **Date**: 2026-04-15
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #92 — `rollback/merge-pull-request-189-from-rauell1-co-2026-04-15-4971c1e`

- **Branch**: `rollback/merge-pull-request-189-from-rauell1-co-2026-04-15-4971c1e`
- **Commit**: `4971c1ee4f0a6961c17c306d5a78d46d813d98dd`
- **Subject**: Merge pull request #189 from rauell1/copilot/safaricharge-landing-page-login-form
- **Date**: 2026-04-15
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #93 — `rollback/merge-pull-request-190-from-rauell1-co-2026-04-15-89a3747`

- **Branch**: `rollback/merge-pull-request-190-from-rauell1-co-2026-04-15-89a3747`
- **Commit**: `89a374712232239e79c37ef40d295abfbb278465`
- **Subject**: Merge pull request #190 from rauell1/copilot/fix-invalid-lockfile-warning
- **Date**: 2026-04-15
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #94 — `rollback/merge-pull-request-191-from-rauell1-co-2026-04-15-0e7df88`

- **Branch**: `rollback/merge-pull-request-191-from-rauell1-co-2026-04-15-0e7df88`
- **Commit**: `0e7df8810bd7d42b6669e8eb4e128c5cd45962d6`
- **Subject**: Merge pull request #191 from rauell1/copilot/ui-typography-improvements
- **Date**: 2026-04-15
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #95 — `rollback/merge-pull-request-192-from-rauell1-co-2026-04-15-5122ec6`

- **Branch**: `rollback/merge-pull-request-192-from-rauell1-co-2026-04-15-5122ec6`
- **Commit**: `5122ec689b462ea03e658adb9bd2698b59f9b392`
- **Subject**: Merge pull request #192 from rauell1/copilot/upgrade-safaricharge-dashboard
- **Date**: 2026-04-15
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #96 — `rollback/fix-set-royokola3-gmail-com-as-default-2026-04-15-3dcc31b`

- **Branch**: `rollback/fix-set-royokola3-gmail-com-as-default-2026-04-15-3dcc31b`
- **Commit**: `3dcc31b80323c1274edc60f6bb6f857252abd464`
- **Subject**: fix: set royokola3@gmail.com as default Resend from/admin address in auth
- **Date**: 2026-04-15
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #97 — `rollback/fix-set-royokola3-gmail-com-as-default-2026-04-15-48a84b5`

- **Branch**: `rollback/fix-set-royokola3-gmail-com-as-default-2026-04-15-48a84b5`
- **Commit**: `48a84b548d93432417cf1506bd3cb6ccffe5c014`
- **Subject**: fix: set royokola3@gmail.com as default Resend from address in forgot-password
- **Date**: 2026-04-15
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #98 — `rollback/merge-pull-request-193-from-rauell1-co-2026-04-15-63fda6a`

- **Branch**: `rollback/merge-pull-request-193-from-rauell1-co-2026-04-15-63fda6a`
- **Commit**: `63fda6addafdd06abb61eea9477524e6502666a0`
- **Subject**: Merge pull request #193 from rauell1/copilot/fix-signup-page-visual-issues
- **Date**: 2026-04-15
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #99 — `rollback/fix-surface-auth-env-health-checks-and-2026-04-15-3ea6fe6`

- **Branch**: `rollback/fix-surface-auth-env-health-checks-and-2026-04-15-3ea6fe6`
- **Commit**: `3ea6fe6a7d28a6e0ed28564883339420822a7ef4`
- **Subject**: fix: surface auth env health checks and fail fast on Resend errors
- **Date**: 2026-04-15
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #100 — `rollback/disable-sign-in-form-on-login-page-2026-04-15-745d012`

- **Branch**: `rollback/disable-sign-in-form-on-login-page-2026-04-15-745d012`
- **Commit**: `745d0127b05a48f647ec9a208055f110a6835608`
- **Subject**: disable sign-in form on login page
- **Date**: 2026-04-15
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #101 — `rollback/bypass-auth-for-demo-redesign-landing-2026-04-15-85832a5`

- **Branch**: `rollback/bypass-auth-for-demo-redesign-landing-2026-04-15-85832a5`
- **Commit**: `85832a5f79a6c9796515bce279a5a0295dd90956`
- **Subject**: bypass auth for /demo; redesign landing + login pages
- **Date**: 2026-04-15
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #102 — `rollback/redesign-new-landing-page-login-page-b-2026-04-15-992fa0d`

- **Branch**: `rollback/redesign-new-landing-page-login-page-b-2026-04-15-992fa0d`
- **Commit**: `992fa0db90517648084145812f9965ceba1f98eb`
- **Subject**: redesign: new landing page, login page, bypass auth → /demo access
- **Date**: 2026-04-15
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #103 — `rollback/fix-add-use-client-to-landing-page-to-2026-04-15-bfc0481`

- **Branch**: `rollback/fix-add-use-client-to-landing-page-to-2026-04-15-bfc0481`
- **Commit**: `bfc04814b8fd8330fb87ac30f0f683bd61022a89`
- **Subject**: fix: add 'use client' to landing page to allow event handlers
- **Date**: 2026-04-15
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #104 — `rollback/merge-pull-request-200-from-rauell1-co-2026-04-16-12e4b53`

- **Branch**: `rollback/merge-pull-request-200-from-rauell1-co-2026-04-16-12e4b53`
- **Commit**: `12e4b53417a1e503bc997ee853d6203b7e1a13d4`
- **Subject**: Merge pull request #200 from rauell1/copilot/add-configurable-performance-ratio
- **Date**: 2026-04-16
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #105 — `rollback/merge-pull-request-201-from-rauell1-co-2026-04-16-f3334b4`

- **Branch**: `rollback/merge-pull-request-201-from-rauell1-co-2026-04-16-f3334b4`
- **Commit**: `f3334b48e71c97d92bc15820c2788de36a87a574`
- **Subject**: Merge pull request #201 from rauell1/copilot/add-pv-sizing-calculator
- **Date**: 2026-04-16
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #106 — `rollback/merge-pull-request-202-from-rauell1-co-2026-04-16-515093a`

- **Branch**: `rollback/merge-pull-request-202-from-rauell1-co-2026-04-16-515093a`
- **Commit**: `515093a1d137b2382fa16237a0599bc7431e9eec`
- **Subject**: Merge pull request #202 from rauell1/copilot/add-on-grid-off-grid-simulation-paths
- **Date**: 2026-04-16
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #107 — `rollback/merge-pull-request-203-from-rauell1-co-2026-04-16-f67514d`

- **Branch**: `rollback/merge-pull-request-203-from-rauell1-co-2026-04-16-f67514d`
- **Commit**: `f67514d8ec36b111886425e71fb6b4807409d1a7`
- **Subject**: Merge pull request #203 from rauell1/copilot/add-social-impact-dashboard-panel
- **Date**: 2026-04-16
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #108 — `rollback/merge-pull-request-204-from-rauell1-co-2026-04-16-58e0529`

- **Branch**: `rollback/merge-pull-request-204-from-rauell1-co-2026-04-16-58e0529`
- **Commit**: `58e0529a71298d5cea99db38078b8a72bf516804`
- **Subject**: Merge pull request #204 from rauell1/copilot/feat-upgrade-csv-excel-export
- **Date**: 2026-04-16
- **Auto-generated**: yes (by update-rollback.yml)


---

*This file is maintained manually after each major change session.*
