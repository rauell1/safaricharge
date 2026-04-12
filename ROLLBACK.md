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

*This file is maintained manually after each major change session.*
