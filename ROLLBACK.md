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
| 207 | `rollback/docs-auto-regenerate-codebase-map-md-s-2026-05-12-c8099e6` | `c8099e6` | docs(auto): regenerate CODEBASE_MAP.md [skip ci] | 2026-05-12 |
| 206 | `rollback/docs-auto-regenerate-codebase-map-md-s-2026-05-11-67191a2` | `67191a2` | docs(auto): regenerate CODEBASE_MAP.md [skip ci] | 2026-05-11 |
| 205 | `rollback/merge-pull-request-254-from-rauell1-co-2026-05-10-cdb3b7e` | `cdb3b7e` | Merge pull request #254 from rauell1/copilot/enhance-solar-simulation-engine | 2026-05-10 |
| 204 | `rollback/feat-wire-real-world-physics-from-cata-2026-05-10-900a10c` | `900a10c` | feat: wire real-world physics from catalog IDs into simulation engine | 2026-05-10 |
| 203 | `rollback/rename-system-type-installation-type-i-2026-05-10-e6e0d1d` | `e6e0d1d` | rename System Type → Installation Type in PV sizing section to reduce UI ambiguity with System Mode simulation control | 2026-05-10 |
| 202 | `rollback/add-setsystemmode-action-to-keep-ui-sy-2026-05-10-5a61fea` | `5a61fea` | Add setSystemMode action to keep UI system type and simulation mode in sync | 2026-05-10 |
| 201 | `rollback/wire-installed-catalog-ids-into-system-2026-05-10-7482d1d` | `7482d1d` | Wire installed catalog IDs into SystemConfiguration, add installed-components summary helper, and feed catalog-based physics into simulation | 2026-05-10 |
| 200 | `rollback/add-useinstalledcomponents-hook-and-ca-2026-05-10-b3c6b41` | `b3c6b41` | Add useInstalledComponents hook and catalog-driven wiring for installed components | 2026-05-10 |
| 199 | `rollback/feat-sim-wire-catalog-datasheet-specs-2026-05-10-99ab6c8` | `99ab6c8` | feat(sim): wire catalog datasheet specs into physics engine | 2026-05-10 |
| 198 | `rollback/feat-add-branddocshub-component-with-t-2026-05-10-89eebfc` | `89eebfc` | feat: add BrandDocsHub component with Tier 1 brand documentation links | 2026-05-10 |
| 197 | `rollback/docs-auto-regenerate-codebase-map-md-s-2026-05-10-07f7b6f` | `07f7b6f` | docs(auto): regenerate CODEBASE_MAP.md [skip ci] | 2026-05-10 |
| 196 | `rollback/real-hardware-specs-from-deye-jinko-da-2026-05-10-909d6f8` | `909d6f8` | Real hardware specs from Deye & Jinko datasheets wired into simulation | 2026-05-10 |
| 195 | `rollback/docs-auto-regenerate-readme-md-skip-ci-2026-05-10-226a27e` | `226a27e` | docs(auto): regenerate README.md [skip ci] | 2026-05-10 |
| 194 | `rollback/africa-inverter-presets-move-config-to-2026-05-10-1849c7c` | `1849c7c` | Africa inverter presets, move config to System Config, add PDF report | 2026-05-10 |
| 193 | `rollback/improve-sld-ac-bus-visibility-configur-2026-05-10-cb1d1f1` | `cb1d1f1` | Improve SLD: AC Bus visibility, configurable EV & inverter panels (#249) | 2026-05-10 |
| 192 | `rollback/docs-auto-regenerate-readme-md-skip-ci-2026-05-09-dfbffcf` | `dfbffcf` | docs(auto): regenerate README.md [skip ci] | 2026-05-09 |
| 191 | `rollback/fix-bugs-improve-ui-location-sync-live-2026-05-10-2be6dcc` | `2be6dcc` | Fix bugs & improve UI: location sync, live nodes, dark mode (#247) | 2026-05-10 |
| 190 | `rollback/merge-pull-request-246-from-rauell1-cl-2026-05-10-889a0db` | `889a0db` | Merge pull request #246 from rauell1/claude/fix-bugs-improve-ui-G0zsr | 2026-05-10 |
| 189 | `rollback/merge-pull-request-245-from-rauell1-cl-2026-05-10-7e34dc3` | `7e34dc3` | Merge pull request #245 from rauell1/claude/fix-bugs-improve-ui-G0zsr | 2026-05-10 |
| 188 | `rollback/merge-pull-request-244-from-rauell1-cl-2026-05-09-f4b8ba5` | `f4b8ba5` | Merge pull request #244 from rauell1/claude/fix-bugs-improve-ui-G0zsr | 2026-05-09 |
| 187 | `rollback/merge-fix-bugs-improve-ui-add-logout-e-2026-05-09-aa37128` | `aa37128` | Merge: fix bugs, improve UI, add logout, enforce mandatory signup | 2026-05-09 |
| 186 | `rollback/merge-pull-request-242-from-rauell1-cl-2026-05-09-83682b1` | `83682b1` | Merge pull request #242 from rauell1/claude/fix-bugs-improve-ui-G0zsr | 2026-05-09 |
| 185 | `rollback/docs-auto-regenerate-codebase-map-md-s-2026-05-09-f14e5dd` | `f14e5dd` | docs(auto): regenerate CODEBASE_MAP.md [skip ci] | 2026-05-09 |
| 184 | `rollback/docs-auto-regenerate-codebase-map-md-s-2026-05-08-190553a` | `190553a` | docs(auto): regenerate CODEBASE_MAP.md [skip ci] | 2026-05-08 |
| 183 | `rollback/docs-auto-regenerate-codebase-map-md-s-2026-05-07-76d01a0` | `76d01a0` | docs(auto): regenerate CODEBASE_MAP.md [skip ci] | 2026-05-07 |
| 182 | `rollback/docs-auto-regenerate-codebase-map-md-s-2026-05-06-610ece3` | `610ece3` | docs(auto): regenerate CODEBASE_MAP.md [skip ci] | 2026-05-06 |
| 181 | `rollback/docs-auto-regenerate-codebase-map-md-s-2026-05-05-68fbdbd` | `68fbdbd` | docs(auto): regenerate CODEBASE_MAP.md [skip ci] | 2026-05-05 |
| 180 | `rollback/docs-auto-regenerate-codebase-map-md-s-2026-05-04-d36adcb` | `d36adcb` | docs(auto): regenerate CODEBASE_MAP.md [skip ci] | 2026-05-04 |
| 179 | `rollback/docs-auto-regenerate-codebase-map-md-s-2026-05-03-2e3d934` | `2e3d934` | docs(auto): regenerate CODEBASE_MAP.md [skip ci] | 2026-05-03 |
| 178 | `rollback/fix-clean-dashboard-mobile-navigation-2026-05-02-d70f295` | `d70f295` | fix: clean dashboard mobile navigation and themed panels | 2026-05-02 |
| 177 | `rollback/fix-complete-pv-sizing-configuration-m-2026-05-02-58f4b1a` | `58f4b1a` | fix: complete pv sizing configuration move | 2026-05-02 |
| 176 | `rollback/docs-auto-regenerate-codebase-map-md-s-2026-05-02-03d0656` | `03d0656` | docs(auto): regenerate CODEBASE_MAP.md [skip ci] | 2026-05-02 |
| 175 | `rollback/fix-normalize-lockfile-for-vercel-inst-2026-05-02-5724279` | `5724279` | fix: normalize lockfile for vercel install | 2026-05-02 |
| 174 | `rollback/fix-resolve-dependency-vulnerabilities-2026-05-02-b6dc6e0` | `b6dc6e0` | fix: resolve dependency vulnerabilities | 2026-05-02 |
| 173 | `rollback/chore-record-branch-cleanup-for-rollba-2026-04-28-bd57230` | `bd57230` | chore: record branch cleanup for rollback reference (2026-04-28) | 2026-04-28 |
| 172 | `rollback/feat-move-pv-sizing-from-navbar-into-s-2026-04-28-0c7a21c` | `0c7a21c` | feat: move PV Sizing from navbar into System Configuration page | 2026-04-28 |
| 171 | `rollback/feat-move-save-scenario-from-navbar-mo-2026-04-28-cdef08f` | `cdef08f` | feat: move Save Scenario from navbar modal into Scenarios page inline section | 2026-04-28 |
| 170 | `rollback/fix-pin-all-radix-portals-to-modal-roo-2026-04-28-43cc568` | `43cc568` | fix: pin all Radix portals to #modal-root at <body> level | 2026-04-28 |
| 169 | `rollback/fix-remove-overflow-x-hidden-and-trans-2026-04-28-52c9631` | `52c9631` | fix: remove overflow-x-hidden and transform-creating wrappers from DashboardLayout | 2026-04-28 |
| 168 | `rollback/fix-move-overflow-x-guard-off-html-bod-2026-04-28-fd45e75` | `fd45e75` | fix: move overflow-x guard off html/body to fix dialog centering | 2026-04-28 |
| 167 | `rollback/fix-resolve-dialog-modal-narrow-strip-2026-04-28-f343af3` | `f343af3` | fix: resolve dialog/modal narrow-strip rendering across all pages | 2026-04-28 |
| 166 | `rollback/fix-sidebar-ai-assistant-item-toggles-2026-04-28-d3a5cef` | `d3a5cef` | fix: sidebar AI Assistant item toggles panel instead of navigating to /ai-assistant | 2026-04-28 |
| 165 | `rollback/feat-add-persistent-floating-ai-button-2026-04-28-83a8f1e` | `83a8f1e` | feat: add persistent floating AI button (FAB) + wire mobile nav AI toggle | 2026-04-28 |
| 164 | `rollback/fix-dialog-z-index-centering-scroll-an-2026-04-28-3758ecf` | `3758ecf` | fix: dialog z-index, centering, scroll, and overflow across all pages | 2026-04-28 |
| 163 | `rollback/fix-patch-alert-dialog-sheet-globals-c-2026-04-28-8b62765` | `8b62765` | fix: patch alert-dialog + sheet + globals.css so ALL shadcn overlay components use project design tokens | 2026-04-28 |
| 162 | `rollback/fix-dialog-background-border-text-toke-2026-04-28-436c0bc` | `436c0bc` | fix: dialog background/border/text tokens — use project CSS vars not shadcn bg-background | 2026-04-28 |
| 161 | `rollback/fix-horizontal-text-alignment-in-popup-2026-04-28-4e0a0bf` | `4e0a0bf` | fix: horizontal text alignment in popups/status bars + remove long hyphens throughout | 2026-04-28 |
| 160 | `rollback/fix-export-horizontal-card-layout-remo-2026-04-28-a6928d1` | `a6928d1` | fix(export): horizontal card layout, remove all em dashes and long hyphens | 2026-04-28 |
| 159 | `rollback/fix-export-remove-pdfmake-xlsx-deps-fi-2026-04-28-1ab8c7d` | `1ab8c7d` | fix(export): remove pdfmake/xlsx deps, fix useSimulationStore 404 — use zero-dep PDF builder + jszip CSV multi-sheet | 2026-04-28 |
| 158 | `rollback/feat-export-page-clean-navbar-fix-popu-2026-04-28-c036e8c` | `c036e8c` | feat: export page, clean navbar, fix popups, graphs zip, multi-sheet CSV | 2026-04-28 |
| 157 | `rollback/feat-floating-ai-button-landing-light-2026-04-28-23140b0` | `23140b0` | feat: floating AI button, landing light mode, full color token compliance | 2026-04-28 |
| 156 | `rollback/fix-toast-only-on-site-leave-seamless-2026-04-28-65961c2` | `65961c2` | fix: toast only on site-leave, seamless nav, strip sidebar descriptions | 2026-04-28 |
| 155 | `rollback/feat-default-light-mode-strict-theme-t-2026-04-28-a144876` | `a144876` | feat: default light mode, strict theme tokens, dark/light toggle in sidebar footer | 2026-04-28 |
| 154 | `rollback/fix-mobile-sliders-icon-auto-sizing-re-2026-04-28-3f3f940` | `3f3f940` | fix: mobile sliders, icon auto-sizing, readability, persistent sim-reset toast | 2026-04-28 |
| 153 | `rollback/fix-mobile-slider-icon-sizing-readabil-2026-04-28-3b264e6` | `3b264e6` | fix: mobile slider, icon sizing, readability, simulation-reset toast notification | 2026-04-28 |
| 152 | `rollback/fix-resolve-turbopack-generic-syntax-e-2026-04-28-37dc261` | `37dc261` | fix: resolve Turbopack generic syntax error in AIAssistant useState | 2026-04-28 |
| 151 | `rollback/feat-light-dark-mode-persistent-ai-pan-2026-04-28-3b9ad56` | `3b9ad56` | feat: light/dark mode, persistent AI panel & faster page transitions | 2026-04-28 |
| 150 | `rollback/docs-auto-regenerate-codebase-map-md-s-2026-04-28-78b6c80` | `78b6c80` | docs(auto): regenerate CODEBASE_MAP.md [skip ci] | 2026-04-28 |
| 149 | `rollback/docs-auto-regenerate-codebase-map-md-s-2026-04-27-0d642fa` | `0d642fa` | docs(auto): regenerate CODEBASE_MAP.md [skip ci] | 2026-04-27 |
| 148 | `rollback/docs-auto-regenerate-codebase-map-md-s-2026-04-26-ebc4abc` | `ebc4abc` | docs(auto): regenerate CODEBASE_MAP.md [skip ci] | 2026-04-26 |
| 147 | `rollback/docs-auto-regenerate-codebase-map-md-s-2026-04-25-3d81acd` | `3d81acd` | docs(auto): regenerate CODEBASE_MAP.md [skip ci] | 2026-04-25 |
| 146 | `rollback/docs-auto-regenerate-codebase-map-md-s-2026-04-24-e660d4b` | `e660d4b` | docs(auto): regenerate CODEBASE_MAP.md [skip ci] | 2026-04-24 |
| 145 | `rollback/docs-auto-regenerate-codebase-map-md-s-2026-04-23-0a061c6` | `0a061c6` | docs(auto): regenerate CODEBASE_MAP.md [skip ci] | 2026-04-23 |
| 144 | `rollback/docs-auto-regenerate-codebase-map-md-s-2026-04-22-58a7b62` | `58a7b62` | docs(auto): regenerate CODEBASE_MAP.md [skip ci] | 2026-04-22 |
| 143 | `rollback/merge-branch-main-of-https-github-com-2026-04-21-c31658f` | `c31658f` | Merge branch 'main' of https://github.com/rauell1/safaricharge | 2026-04-21 |
| 142 | `rollback/feat-implement-theme-provider-and-togg-2026-04-21-91244f6` | `91244f6` | feat: implement theme provider and toggle components; update styles for light and dark modes | 2026-04-21 |
| 141 | `rollback/docs-auto-regenerate-codebase-map-md-s-2026-04-21-928e688` | `928e688` | docs(auto): regenerate CODEBASE_MAP.md [skip ci] | 2026-04-21 |
| 140 | `rollback/feat-implement-animatedloadingstate-co-2026-04-20-57fafc6` | `57fafc6` | feat: implement AnimatedLoadingState component and refactor loading screens to use it feat: add external upload guard with session storage management feat: enhance DashboardLayout with external upload notifications and state management fix: update DashboardSidebar logo implementation | 2026-04-20 |
| 139 | `rollback/merge-branch-main-of-https-github-com-2026-04-20-2ba304b` | `2ba304b` | Merge branch 'main' of https://github.com/rauell1/safaricharge | 2026-04-20 |
| 138 | `rollback/fix-routes-add-missing-ai-assistant-re-2026-04-20-0fa6f35` | `0fa6f35` | fix(routes): add missing ai-assistant recommendation and configuration pages | 2026-04-20 |
| 137 | `rollback/merge-branch-main-of-https-github-com-2026-04-20-4cdb3f7` | `4cdb3f7` | Merge branch 'main' of https://github.com/rauell1/safaricharge | 2026-04-20 |
| 136 | `rollback/merge-branch-main-of-https-github-com-2026-04-20-d69ba90` | `d69ba90` | Merge branch 'main' of https://github.com/rauell1/safaricharge | 2026-04-20 |
| 135 | `rollback/fix-layout-harden-hero-and-planner-col-2026-04-20-40a5c17` | `40a5c17` | fix(layout): harden hero and planner column widths to prevent text collapse | 2026-04-20 |
| 134 | `rollback/docs-auto-regenerate-codebase-map-md-s-2026-04-20-a81706d` | `a81706d` | docs(auto): regenerate CODEBASE_MAP.md [skip ci] | 2026-04-20 |
| 133 | `rollback/merge-branch-main-of-https-github-com-2026-04-20-f6b8a09` | `f6b8a09` | Merge branch 'main' of https://github.com/rauell1/safaricharge | 2026-04-20 |
| 132 | `rollback/merge-branch-main-of-https-github-com-2026-04-20-aea790d` | `aea790d` | Merge branch 'main' of https://github.com/rauell1/safaricharge | 2026-04-20 |
| 131 | `rollback/merge-branch-main-of-https-github-com-2026-04-20-53993a8` | `53993a8` | Merge branch 'main' of https://github.com/rauell1/safaricharge | 2026-04-20 |
| 130 | `rollback/merge-branch-main-of-https-github-com-2026-04-20-b49f481` | `b49f481` | Merge branch 'main' of https://github.com/rauell1/safaricharge | 2026-04-20 |
| 129 | `rollback/feat-refactor-sizingpage-layout-and-in-2026-04-20-e479bc6` | `e479bc6` | feat: Refactor SizingPage layout and introduce new form components | 2026-04-20 |
| 128 | `rollback/docs-auto-regenerate-codebase-map-md-s-2026-04-20-33ad9ef` | `33ad9ef` | docs(auto): regenerate CODEBASE_MAP.md [skip ci] | 2026-04-20 |
| 127 | `rollback/fix-add-packagemanager-field-to-packag-2026-04-19-ad059e8` | `ad059e8` | fix: add packageManager field to package.json | 2026-04-19 |
| 126 | `rollback/refactor-code-structure-for-improved-r-2026-04-19-8c6f6f1` | `8c6f6f1` | Refactor code structure for improved readability and maintainability | 2026-04-19 |
| 125 | `rollback/feat-implement-authentication-middlewa-2026-04-19-a5a5129` | `a5a5129` | feat: implement authentication middleware for session management and user validation | 2026-04-19 |
| 124 | `rollback/fix-remove-flex-direction-column-from-2026-04-18-53841af` | `53841af` | fix: remove flex-direction column from .page-shell to restore horizontal text flow | 2026-04-18 |
| 123 | `rollback/fix-clean-magic-link-login-page-full-v-2026-04-18-9aef114` | `9aef114` | fix: clean magic-link login page — full viewport, no scroll, back-to-home link | 2026-04-18 |
| 122 | `rollback/merge-pull-request-222-from-rauell1-co-2026-04-18-baaa8f8` | `baaa8f8` | Merge pull request #222 from rauell1/copilot/refactor-authentication-system | 2026-04-18 |
| 121 | `rollback/merge-pull-request-221-from-rauell1-co-2026-04-18-d4d8504` | `d4d8504` | Merge pull request #221 from rauell1/codex/fix-sender-email-resend | 2026-04-18 |
| 120 | `rollback/merge-pull-request-220-from-rauell1-co-2026-04-18-a1e884a` | `a1e884a` | Merge pull request #220 from rauell1/codex/fix-login-page-layout-and-dropdown-visibility | 2026-04-18 |
| 119 | `rollback/merge-pull-request-219-from-rauell1-co-2026-04-18-3d6ad98` | `3d6ad98` | Merge pull request #219 from rauell1/codex/fix-ui-login-page | 2026-04-18 |
| 118 | `rollback/merge-pull-request-218-from-rauell1-co-2026-04-18-a693beb` | `a693beb` | Merge pull request #218 from rauell1/copilot/revamp-safaricharge-landing-page | 2026-04-18 |
| 117 | `rollback/merge-pull-request-194-from-rauell1-fi-2026-04-18-2eec621` | `2eec621` | Merge pull request #194 from rauell1/fix/codebase-cleanup-p0-p1 | 2026-04-18 |
| 116 | `rollback/merge-pull-request-217-from-rauell1-co-2026-04-18-2dcacf8` | `2dcacf8` | Merge pull request #217 from rauell1/copilot/fix-damaged-lockfile | 2026-04-18 |
| 115 | `rollback/merge-pull-request-216-from-rauell1-co-2026-04-18-8407f30` | `8407f30` | Merge pull request #216 from rauell1/copilot/add-energy-intelligence-page | 2026-04-18 |
| 114 | `rollback/merge-pull-request-215-from-rauell1-co-2026-04-18-64fd1b6` | `64fd1b6` | Merge pull request #215 from rauell1/copilot/add-financial-modeling-engine | 2026-04-18 |
| 113 | `rollback/merge-pull-request-214-from-rauell1-co-2026-04-18-1f1b43c` | `1f1b43c` | Merge pull request #214 from rauell1/copilot/feat-ev-mobility-simulation-engine | 2026-04-18 |
| 112 | `rollback/merge-pull-request-213-from-rauell1-co-2026-04-18-0f7355e` | `0f7355e` | Merge pull request #213 from rauell1/copilot/add-inverter-simulation-module | 2026-04-18 |
| 111 | `rollback/merge-pull-request-208-from-rauell1-co-2026-04-18-c4b35b4` | `c4b35b4` | Merge pull request #208 from rauell1/copilot/add-battery-simulation-engine | 2026-04-18 |
| 110 | `rollback/merge-pull-request-206-from-rauell1-co-2026-04-18-d27454e` | `d27454e` | Merge pull request #206 from rauell1/copilot/add-docs-grid-resilience-ev-charging | 2026-04-18 |
| 109 | `rollback/feat-add-kenya-county-irradiance-prese-2026-04-16-3d5fbea` | `3d5fbea` | feat: add Kenya county irradiance presets & social impact calculator | 2026-04-16 |
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

## Snapshot #109 — `rollback/feat-add-kenya-county-irradiance-prese-2026-04-16-3d5fbea`

- **Branch**: `rollback/feat-add-kenya-county-irradiance-prese-2026-04-16-3d5fbea`
- **Commit**: `3d5fbea4ac183c61a5ee06ac27d8e745836a3fec`
- **Subject**: feat: add Kenya county irradiance presets & social impact calculator
- **Date**: 2026-04-16
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #110 — `rollback/merge-pull-request-206-from-rauell1-co-2026-04-18-d27454e`

- **Branch**: `rollback/merge-pull-request-206-from-rauell1-co-2026-04-18-d27454e`
- **Commit**: `d27454e23be3aecadeda1bf5b81ad3f5bf337df6`
- **Subject**: Merge pull request #206 from rauell1/copilot/add-docs-grid-resilience-ev-charging
- **Date**: 2026-04-18
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #111 — `rollback/merge-pull-request-208-from-rauell1-co-2026-04-18-c4b35b4`

- **Branch**: `rollback/merge-pull-request-208-from-rauell1-co-2026-04-18-c4b35b4`
- **Commit**: `c4b35b4211a1755cc006853bcecb50b96e4730e7`
- **Subject**: Merge pull request #208 from rauell1/copilot/add-battery-simulation-engine
- **Date**: 2026-04-18
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #112 — `rollback/merge-pull-request-213-from-rauell1-co-2026-04-18-0f7355e`

- **Branch**: `rollback/merge-pull-request-213-from-rauell1-co-2026-04-18-0f7355e`
- **Commit**: `0f7355e3ffdc9dda4ea65b932808ce983fe45ca6`
- **Subject**: Merge pull request #213 from rauell1/copilot/add-inverter-simulation-module
- **Date**: 2026-04-18
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #113 — `rollback/merge-pull-request-214-from-rauell1-co-2026-04-18-1f1b43c`

- **Branch**: `rollback/merge-pull-request-214-from-rauell1-co-2026-04-18-1f1b43c`
- **Commit**: `1f1b43c2b5154ed1ddd9ebe25a685cb7e10581c5`
- **Subject**: Merge pull request #214 from rauell1/copilot/feat-ev-mobility-simulation-engine
- **Date**: 2026-04-18
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #114 — `rollback/merge-pull-request-215-from-rauell1-co-2026-04-18-64fd1b6`

- **Branch**: `rollback/merge-pull-request-215-from-rauell1-co-2026-04-18-64fd1b6`
- **Commit**: `64fd1b6c078b785219121dc34528ba984e1a05f2`
- **Subject**: Merge pull request #215 from rauell1/copilot/add-financial-modeling-engine
- **Date**: 2026-04-18
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #115 — `rollback/merge-pull-request-216-from-rauell1-co-2026-04-18-8407f30`

- **Branch**: `rollback/merge-pull-request-216-from-rauell1-co-2026-04-18-8407f30`
- **Commit**: `8407f30f414cc3757241baf0e85b4b3562497c0a`
- **Subject**: Merge pull request #216 from rauell1/copilot/add-energy-intelligence-page
- **Date**: 2026-04-18
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #116 — `rollback/merge-pull-request-217-from-rauell1-co-2026-04-18-2dcacf8`

- **Branch**: `rollback/merge-pull-request-217-from-rauell1-co-2026-04-18-2dcacf8`
- **Commit**: `2dcacf801117e3518a82f1042054eef3cba96e65`
- **Subject**: Merge pull request #217 from rauell1/copilot/fix-damaged-lockfile
- **Date**: 2026-04-18
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #117 — `rollback/merge-pull-request-194-from-rauell1-fi-2026-04-18-2eec621`

- **Branch**: `rollback/merge-pull-request-194-from-rauell1-fi-2026-04-18-2eec621`
- **Commit**: `2eec6211b2dc994f187761986cb4fd90f6ff5204`
- **Subject**: Merge pull request #194 from rauell1/fix/codebase-cleanup-p0-p1
- **Date**: 2026-04-18
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #118 — `rollback/merge-pull-request-218-from-rauell1-co-2026-04-18-a693beb`

- **Branch**: `rollback/merge-pull-request-218-from-rauell1-co-2026-04-18-a693beb`
- **Commit**: `a693bebe5e985a520c1b3739628a9e768b6a238b`
- **Subject**: Merge pull request #218 from rauell1/copilot/revamp-safaricharge-landing-page
- **Date**: 2026-04-18
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #119 — `rollback/merge-pull-request-219-from-rauell1-co-2026-04-18-3d6ad98`

- **Branch**: `rollback/merge-pull-request-219-from-rauell1-co-2026-04-18-3d6ad98`
- **Commit**: `3d6ad985891cb1d4d6c7115508c0c19e29534aa5`
- **Subject**: Merge pull request #219 from rauell1/codex/fix-ui-login-page
- **Date**: 2026-04-18
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #120 — `rollback/merge-pull-request-220-from-rauell1-co-2026-04-18-a1e884a`

- **Branch**: `rollback/merge-pull-request-220-from-rauell1-co-2026-04-18-a1e884a`
- **Commit**: `a1e884a15985eee7037cf21604acbe91889d8d20`
- **Subject**: Merge pull request #220 from rauell1/codex/fix-login-page-layout-and-dropdown-visibility
- **Date**: 2026-04-18
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #121 — `rollback/merge-pull-request-221-from-rauell1-co-2026-04-18-d4d8504`

- **Branch**: `rollback/merge-pull-request-221-from-rauell1-co-2026-04-18-d4d8504`
- **Commit**: `d4d85047e46d798093c76fb7e269f7e9741e8757`
- **Subject**: Merge pull request #221 from rauell1/codex/fix-sender-email-resend
- **Date**: 2026-04-18
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #122 — `rollback/merge-pull-request-222-from-rauell1-co-2026-04-18-baaa8f8`

- **Branch**: `rollback/merge-pull-request-222-from-rauell1-co-2026-04-18-baaa8f8`
- **Commit**: `baaa8f81ef84a8a340d84689aaf46a5d266ca843`
- **Subject**: Merge pull request #222 from rauell1/copilot/refactor-authentication-system
- **Date**: 2026-04-18
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #123 — `rollback/fix-clean-magic-link-login-page-full-v-2026-04-18-9aef114`

- **Branch**: `rollback/fix-clean-magic-link-login-page-full-v-2026-04-18-9aef114`
- **Commit**: `9aef114402e2c36e80e3c2a2a0edba2e5e8a1063`
- **Subject**: fix: clean magic-link login page — full viewport, no scroll, back-to-home link
- **Date**: 2026-04-18
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #124 — `rollback/fix-remove-flex-direction-column-from-2026-04-18-53841af`

- **Branch**: `rollback/fix-remove-flex-direction-column-from-2026-04-18-53841af`
- **Commit**: `53841af523e2f42fb7dbc94efaa16f9914a4e0a5`
- **Subject**: fix: remove flex-direction column from .page-shell to restore horizontal text flow
- **Date**: 2026-04-18
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #125 — `rollback/feat-implement-authentication-middlewa-2026-04-19-a5a5129`

- **Branch**: `rollback/feat-implement-authentication-middlewa-2026-04-19-a5a5129`
- **Commit**: `a5a512995c47528202e8ae42c8b85b8e3891cc1e`
- **Subject**: feat: implement authentication middleware for session management and user validation
- **Date**: 2026-04-19
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #126 — `rollback/refactor-code-structure-for-improved-r-2026-04-19-8c6f6f1`

- **Branch**: `rollback/refactor-code-structure-for-improved-r-2026-04-19-8c6f6f1`
- **Commit**: `8c6f6f15de5f44d5a9dc070102e5e121c4d2ced1`
- **Subject**: Refactor code structure for improved readability and maintainability
- **Date**: 2026-04-19
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #127 — `rollback/fix-add-packagemanager-field-to-packag-2026-04-19-ad059e8`

- **Branch**: `rollback/fix-add-packagemanager-field-to-packag-2026-04-19-ad059e8`
- **Commit**: `ad059e83361a62537b46b1ec4779b8facff78492`
- **Subject**: fix: add packageManager field to package.json
- **Date**: 2026-04-19
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #128 — `rollback/docs-auto-regenerate-codebase-map-md-s-2026-04-20-33ad9ef`

- **Branch**: `rollback/docs-auto-regenerate-codebase-map-md-s-2026-04-20-33ad9ef`
- **Commit**: `33ad9efa563841aeaa85b14b9200a2d39ee5231e`
- **Subject**: docs(auto): regenerate CODEBASE_MAP.md [skip ci]
- **Date**: 2026-04-20
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #129 — `rollback/feat-refactor-sizingpage-layout-and-in-2026-04-20-e479bc6`

- **Branch**: `rollback/feat-refactor-sizingpage-layout-and-in-2026-04-20-e479bc6`
- **Commit**: `e479bc6ac1163a17586fbb733f198af9ea7860d0`
- **Subject**: feat: Refactor SizingPage layout and introduce new form components
- **Date**: 2026-04-20
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #130 — `rollback/merge-branch-main-of-https-github-com-2026-04-20-b49f481`

- **Branch**: `rollback/merge-branch-main-of-https-github-com-2026-04-20-b49f481`
- **Commit**: `b49f481a6823aeb55cc5a6755d3a5cde559e7177`
- **Subject**: Merge branch 'main' of https://github.com/rauell1/safaricharge
- **Date**: 2026-04-20
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #131 — `rollback/merge-branch-main-of-https-github-com-2026-04-20-53993a8`

- **Branch**: `rollback/merge-branch-main-of-https-github-com-2026-04-20-53993a8`
- **Commit**: `53993a8ba053dac28d16007807bbcbf05c86d601`
- **Subject**: Merge branch 'main' of https://github.com/rauell1/safaricharge
- **Date**: 2026-04-20
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #132 — `rollback/merge-branch-main-of-https-github-com-2026-04-20-aea790d`

- **Branch**: `rollback/merge-branch-main-of-https-github-com-2026-04-20-aea790d`
- **Commit**: `aea790dced89aa58b17fae4b1684dc10ee1077cc`
- **Subject**: Merge branch 'main' of https://github.com/rauell1/safaricharge
- **Date**: 2026-04-20
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #133 — `rollback/merge-branch-main-of-https-github-com-2026-04-20-f6b8a09`

- **Branch**: `rollback/merge-branch-main-of-https-github-com-2026-04-20-f6b8a09`
- **Commit**: `f6b8a0936136194313debf373a3e5621af8219fd`
- **Subject**: Merge branch 'main' of https://github.com/rauell1/safaricharge
- **Date**: 2026-04-20
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #134 — `rollback/docs-auto-regenerate-codebase-map-md-s-2026-04-20-a81706d`

- **Branch**: `rollback/docs-auto-regenerate-codebase-map-md-s-2026-04-20-a81706d`
- **Commit**: `a81706d01bad85de8819bf4bc5e50635508a845b`
- **Subject**: docs(auto): regenerate CODEBASE_MAP.md [skip ci]
- **Date**: 2026-04-20
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #135 — `rollback/fix-layout-harden-hero-and-planner-col-2026-04-20-40a5c17`

- **Branch**: `rollback/fix-layout-harden-hero-and-planner-col-2026-04-20-40a5c17`
- **Commit**: `40a5c17b1a264aedd8cc67f05a324b8271c97b11`
- **Subject**: fix(layout): harden hero and planner column widths to prevent text collapse
- **Date**: 2026-04-20
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #136 — `rollback/merge-branch-main-of-https-github-com-2026-04-20-d69ba90`

- **Branch**: `rollback/merge-branch-main-of-https-github-com-2026-04-20-d69ba90`
- **Commit**: `d69ba90caf66483829cd5aa997967b807196b275`
- **Subject**: Merge branch 'main' of https://github.com/rauell1/safaricharge
- **Date**: 2026-04-20
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #137 — `rollback/merge-branch-main-of-https-github-com-2026-04-20-4cdb3f7`

- **Branch**: `rollback/merge-branch-main-of-https-github-com-2026-04-20-4cdb3f7`
- **Commit**: `4cdb3f7dfa9eeba19c6a55446e12df326decc2a5`
- **Subject**: Merge branch 'main' of https://github.com/rauell1/safaricharge
- **Date**: 2026-04-20
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #138 — `rollback/fix-routes-add-missing-ai-assistant-re-2026-04-20-0fa6f35`

- **Branch**: `rollback/fix-routes-add-missing-ai-assistant-re-2026-04-20-0fa6f35`
- **Commit**: `0fa6f351ca0caf9bd8fb881c9196bb97ad5cdf8f`
- **Subject**: fix(routes): add missing ai-assistant recommendation and configuration pages
- **Date**: 2026-04-20
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #139 — `rollback/merge-branch-main-of-https-github-com-2026-04-20-2ba304b`

- **Branch**: `rollback/merge-branch-main-of-https-github-com-2026-04-20-2ba304b`
- **Commit**: `2ba304bc258f06f61c8693ace82badbf7808ce57`
- **Subject**: Merge branch 'main' of https://github.com/rauell1/safaricharge
- **Date**: 2026-04-20
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #140 — `rollback/feat-implement-animatedloadingstate-co-2026-04-20-57fafc6`

- **Branch**: `rollback/feat-implement-animatedloadingstate-co-2026-04-20-57fafc6`
- **Commit**: `57fafc649e333a93437dc12534df7d0564bf59cd`
- **Subject**: feat: implement AnimatedLoadingState component and refactor loading screens to use it feat: add external upload guard with session storage management feat: enhance DashboardLayout with external upload notifications and state management fix: update DashboardSidebar logo implementation
- **Date**: 2026-04-20
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #141 — `rollback/docs-auto-regenerate-codebase-map-md-s-2026-04-21-928e688`

- **Branch**: `rollback/docs-auto-regenerate-codebase-map-md-s-2026-04-21-928e688`
- **Commit**: `928e6886483b25b40b559a6f25223edf942fd1a1`
- **Subject**: docs(auto): regenerate CODEBASE_MAP.md [skip ci]
- **Date**: 2026-04-21
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #142 — `rollback/feat-implement-theme-provider-and-togg-2026-04-21-91244f6`

- **Branch**: `rollback/feat-implement-theme-provider-and-togg-2026-04-21-91244f6`
- **Commit**: `91244f682d7ef2e798874ff85cee4cbb2f4fbf94`
- **Subject**: feat: implement theme provider and toggle components; update styles for light and dark modes
- **Date**: 2026-04-21
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #143 — `rollback/merge-branch-main-of-https-github-com-2026-04-21-c31658f`

- **Branch**: `rollback/merge-branch-main-of-https-github-com-2026-04-21-c31658f`
- **Commit**: `c31658f913088920dd96f6e2afe587fba65ededf`
- **Subject**: Merge branch 'main' of https://github.com/rauell1/safaricharge
- **Date**: 2026-04-21
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #144 — `rollback/docs-auto-regenerate-codebase-map-md-s-2026-04-22-58a7b62`

- **Branch**: `rollback/docs-auto-regenerate-codebase-map-md-s-2026-04-22-58a7b62`
- **Commit**: `58a7b62a3525b1d75ca8c7466ef03be0415de55a`
- **Subject**: docs(auto): regenerate CODEBASE_MAP.md [skip ci]
- **Date**: 2026-04-22
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #145 — `rollback/docs-auto-regenerate-codebase-map-md-s-2026-04-23-0a061c6`

- **Branch**: `rollback/docs-auto-regenerate-codebase-map-md-s-2026-04-23-0a061c6`
- **Commit**: `0a061c6d5a10430ed251f55c6d0dab13107372c2`
- **Subject**: docs(auto): regenerate CODEBASE_MAP.md [skip ci]
- **Date**: 2026-04-23
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #146 — `rollback/docs-auto-regenerate-codebase-map-md-s-2026-04-24-e660d4b`

- **Branch**: `rollback/docs-auto-regenerate-codebase-map-md-s-2026-04-24-e660d4b`
- **Commit**: `e660d4b114d6a22ff942136fc206b399a32d4b63`
- **Subject**: docs(auto): regenerate CODEBASE_MAP.md [skip ci]
- **Date**: 2026-04-24
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #147 — `rollback/docs-auto-regenerate-codebase-map-md-s-2026-04-25-3d81acd`

- **Branch**: `rollback/docs-auto-regenerate-codebase-map-md-s-2026-04-25-3d81acd`
- **Commit**: `3d81acd00398ea4838420048bfe7a99002eae4c7`
- **Subject**: docs(auto): regenerate CODEBASE_MAP.md [skip ci]
- **Date**: 2026-04-25
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #148 — `rollback/docs-auto-regenerate-codebase-map-md-s-2026-04-26-ebc4abc`

- **Branch**: `rollback/docs-auto-regenerate-codebase-map-md-s-2026-04-26-ebc4abc`
- **Commit**: `ebc4abc905779f71b62a044d2a890b1c883e5c09`
- **Subject**: docs(auto): regenerate CODEBASE_MAP.md [skip ci]
- **Date**: 2026-04-26
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #149 — `rollback/docs-auto-regenerate-codebase-map-md-s-2026-04-27-0d642fa`

- **Branch**: `rollback/docs-auto-regenerate-codebase-map-md-s-2026-04-27-0d642fa`
- **Commit**: `0d642fa83d533f246bdfef3544a3f7d70b7709e8`
- **Subject**: docs(auto): regenerate CODEBASE_MAP.md [skip ci]
- **Date**: 2026-04-27
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #150 — `rollback/docs-auto-regenerate-codebase-map-md-s-2026-04-28-78b6c80`

- **Branch**: `rollback/docs-auto-regenerate-codebase-map-md-s-2026-04-28-78b6c80`
- **Commit**: `78b6c80804d484e7a2ecf6d2aac57eb6174430f2`
- **Subject**: docs(auto): regenerate CODEBASE_MAP.md [skip ci]
- **Date**: 2026-04-28
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #151 — `rollback/feat-light-dark-mode-persistent-ai-pan-2026-04-28-3b9ad56`

- **Branch**: `rollback/feat-light-dark-mode-persistent-ai-pan-2026-04-28-3b9ad56`
- **Commit**: `3b9ad5676c4f0968254e746959736efbc5f3f12b`
- **Subject**: feat: light/dark mode, persistent AI panel & faster page transitions
- **Date**: 2026-04-28
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #152 — `rollback/fix-resolve-turbopack-generic-syntax-e-2026-04-28-37dc261`

- **Branch**: `rollback/fix-resolve-turbopack-generic-syntax-e-2026-04-28-37dc261`
- **Commit**: `37dc261267d56c184a63a0302f84448789bcf716`
- **Subject**: fix: resolve Turbopack generic syntax error in AIAssistant useState
- **Date**: 2026-04-28
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #153 — `rollback/fix-mobile-slider-icon-sizing-readabil-2026-04-28-3b264e6`

- **Branch**: `rollback/fix-mobile-slider-icon-sizing-readabil-2026-04-28-3b264e6`
- **Commit**: `3b264e60ed91a05573abcd943c631fb1d91f65c9`
- **Subject**: fix: mobile slider, icon sizing, readability, simulation-reset toast notification
- **Date**: 2026-04-28
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #154 — `rollback/fix-mobile-sliders-icon-auto-sizing-re-2026-04-28-3f3f940`

- **Branch**: `rollback/fix-mobile-sliders-icon-auto-sizing-re-2026-04-28-3f3f940`
- **Commit**: `3f3f940c1b0240e81e753aea3db01c69aa6c9c58`
- **Subject**: fix: mobile sliders, icon auto-sizing, readability, persistent sim-reset toast
- **Date**: 2026-04-28
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #155 — `rollback/feat-default-light-mode-strict-theme-t-2026-04-28-a144876`

- **Branch**: `rollback/feat-default-light-mode-strict-theme-t-2026-04-28-a144876`
- **Commit**: `a144876e3fe7225c6e6f05b5705b0b76e0b01de0`
- **Subject**: feat: default light mode, strict theme tokens, dark/light toggle in sidebar footer
- **Date**: 2026-04-28
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #156 — `rollback/fix-toast-only-on-site-leave-seamless-2026-04-28-65961c2`

- **Branch**: `rollback/fix-toast-only-on-site-leave-seamless-2026-04-28-65961c2`
- **Commit**: `65961c222f4a8db6f9eeacc5a4ee8080380b5d9b`
- **Subject**: fix: toast only on site-leave, seamless nav, strip sidebar descriptions
- **Date**: 2026-04-28
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #157 — `rollback/feat-floating-ai-button-landing-light-2026-04-28-23140b0`

- **Branch**: `rollback/feat-floating-ai-button-landing-light-2026-04-28-23140b0`
- **Commit**: `23140b05fb1f6c8d505784b266da8189bff70b20`
- **Subject**: feat: floating AI button, landing light mode, full color token compliance
- **Date**: 2026-04-28
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #158 — `rollback/feat-export-page-clean-navbar-fix-popu-2026-04-28-c036e8c`

- **Branch**: `rollback/feat-export-page-clean-navbar-fix-popu-2026-04-28-c036e8c`
- **Commit**: `c036e8c0255dc7400690ba4e439f6f2c3bd95fa1`
- **Subject**: feat: export page, clean navbar, fix popups, graphs zip, multi-sheet CSV
- **Date**: 2026-04-28
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #159 — `rollback/fix-export-remove-pdfmake-xlsx-deps-fi-2026-04-28-1ab8c7d`

- **Branch**: `rollback/fix-export-remove-pdfmake-xlsx-deps-fi-2026-04-28-1ab8c7d`
- **Commit**: `1ab8c7deabe19556d1e6e64751cd39e144f30f9d`
- **Subject**: fix(export): remove pdfmake/xlsx deps, fix useSimulationStore 404 — use zero-dep PDF builder + jszip CSV multi-sheet
- **Date**: 2026-04-28
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #160 — `rollback/fix-export-horizontal-card-layout-remo-2026-04-28-a6928d1`

- **Branch**: `rollback/fix-export-horizontal-card-layout-remo-2026-04-28-a6928d1`
- **Commit**: `a6928d1249dd1faffed8cef0fe5b779a2d742e2a`
- **Subject**: fix(export): horizontal card layout, remove all em dashes and long hyphens
- **Date**: 2026-04-28
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #161 — `rollback/fix-horizontal-text-alignment-in-popup-2026-04-28-4e0a0bf`

- **Branch**: `rollback/fix-horizontal-text-alignment-in-popup-2026-04-28-4e0a0bf`
- **Commit**: `4e0a0bf7888a02dd464b8501e04e78b877fe08f7`
- **Subject**: fix: horizontal text alignment in popups/status bars + remove long hyphens throughout
- **Date**: 2026-04-28
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #162 — `rollback/fix-dialog-background-border-text-toke-2026-04-28-436c0bc`

- **Branch**: `rollback/fix-dialog-background-border-text-toke-2026-04-28-436c0bc`
- **Commit**: `436c0bcb58aed3775779a2c6716659170317b470`
- **Subject**: fix: dialog background/border/text tokens — use project CSS vars not shadcn bg-background
- **Date**: 2026-04-28
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #163 — `rollback/fix-patch-alert-dialog-sheet-globals-c-2026-04-28-8b62765`

- **Branch**: `rollback/fix-patch-alert-dialog-sheet-globals-c-2026-04-28-8b62765`
- **Commit**: `8b62765a0f19274a7bc0898d30c86742f3a5da1d`
- **Subject**: fix: patch alert-dialog + sheet + globals.css so ALL shadcn overlay components use project design tokens
- **Date**: 2026-04-28
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #164 — `rollback/fix-dialog-z-index-centering-scroll-an-2026-04-28-3758ecf`

- **Branch**: `rollback/fix-dialog-z-index-centering-scroll-an-2026-04-28-3758ecf`
- **Commit**: `3758ecf1d400c7001471f563234bc12b03c1d644`
- **Subject**: fix: dialog z-index, centering, scroll, and overflow across all pages
- **Date**: 2026-04-28
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #165 — `rollback/feat-add-persistent-floating-ai-button-2026-04-28-83a8f1e`

- **Branch**: `rollback/feat-add-persistent-floating-ai-button-2026-04-28-83a8f1e`
- **Commit**: `83a8f1e430a33bc399761f453f4d015c2398c9d8`
- **Subject**: feat: add persistent floating AI button (FAB) + wire mobile nav AI toggle
- **Date**: 2026-04-28
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #166 — `rollback/fix-sidebar-ai-assistant-item-toggles-2026-04-28-d3a5cef`

- **Branch**: `rollback/fix-sidebar-ai-assistant-item-toggles-2026-04-28-d3a5cef`
- **Commit**: `d3a5cef9b107db36285303654f4c1c40ffca0333`
- **Subject**: fix: sidebar AI Assistant item toggles panel instead of navigating to /ai-assistant
- **Date**: 2026-04-28
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #167 — `rollback/fix-resolve-dialog-modal-narrow-strip-2026-04-28-f343af3`

- **Branch**: `rollback/fix-resolve-dialog-modal-narrow-strip-2026-04-28-f343af3`
- **Commit**: `f343af3686433eb60b7787409949986824e395cc`
- **Subject**: fix: resolve dialog/modal narrow-strip rendering across all pages
- **Date**: 2026-04-28
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #168 — `rollback/fix-move-overflow-x-guard-off-html-bod-2026-04-28-fd45e75`

- **Branch**: `rollback/fix-move-overflow-x-guard-off-html-bod-2026-04-28-fd45e75`
- **Commit**: `fd45e75e049535273721a11f467898770ffd7e47`
- **Subject**: fix: move overflow-x guard off html/body to fix dialog centering
- **Date**: 2026-04-28
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #169 — `rollback/fix-remove-overflow-x-hidden-and-trans-2026-04-28-52c9631`

- **Branch**: `rollback/fix-remove-overflow-x-hidden-and-trans-2026-04-28-52c9631`
- **Commit**: `52c9631e4ed9383cf5014a327a2d20bb84204984`
- **Subject**: fix: remove overflow-x-hidden and transform-creating wrappers from DashboardLayout
- **Date**: 2026-04-28
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #170 — `rollback/fix-pin-all-radix-portals-to-modal-roo-2026-04-28-43cc568`

- **Branch**: `rollback/fix-pin-all-radix-portals-to-modal-roo-2026-04-28-43cc568`
- **Commit**: `43cc568c837f63825f2ad8b54b382609e7f98f28`
- **Subject**: fix: pin all Radix portals to #modal-root at <body> level
- **Date**: 2026-04-28
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #171 — `rollback/feat-move-save-scenario-from-navbar-mo-2026-04-28-cdef08f`

- **Branch**: `rollback/feat-move-save-scenario-from-navbar-mo-2026-04-28-cdef08f`
- **Commit**: `cdef08f6eee0bfe72ed19087cdfe71392dd49cf5`
- **Subject**: feat: move Save Scenario from navbar modal into Scenarios page inline section
- **Date**: 2026-04-28
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #172 — `rollback/feat-move-pv-sizing-from-navbar-into-s-2026-04-28-0c7a21c`

- **Branch**: `rollback/feat-move-pv-sizing-from-navbar-into-s-2026-04-28-0c7a21c`
- **Commit**: `0c7a21c536f459cef61a50321444f9808396f359`
- **Subject**: feat: move PV Sizing from navbar into System Configuration page
- **Date**: 2026-04-28
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #173 — `rollback/chore-record-branch-cleanup-for-rollba-2026-04-28-bd57230`

- **Branch**: `rollback/chore-record-branch-cleanup-for-rollba-2026-04-28-bd57230`
- **Commit**: `bd57230f9f8750f86436a84511e194745bcdde87`
- **Subject**: chore: record branch cleanup for rollback reference (2026-04-28)
- **Date**: 2026-04-28
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #174 — `rollback/fix-resolve-dependency-vulnerabilities-2026-05-02-b6dc6e0`

- **Branch**: `rollback/fix-resolve-dependency-vulnerabilities-2026-05-02-b6dc6e0`
- **Commit**: `b6dc6e0a8e41f6c1aa3ba9e3b85034bfbdba5429`
- **Subject**: fix: resolve dependency vulnerabilities
- **Date**: 2026-05-02
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #175 — `rollback/fix-normalize-lockfile-for-vercel-inst-2026-05-02-5724279`

- **Branch**: `rollback/fix-normalize-lockfile-for-vercel-inst-2026-05-02-5724279`
- **Commit**: `5724279d493acdafd2c0316034f38469865b8927`
- **Subject**: fix: normalize lockfile for vercel install
- **Date**: 2026-05-02
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #176 — `rollback/docs-auto-regenerate-codebase-map-md-s-2026-05-02-03d0656`

- **Branch**: `rollback/docs-auto-regenerate-codebase-map-md-s-2026-05-02-03d0656`
- **Commit**: `03d06568172f56e7035b4507e45c5abeadb21bf0`
- **Subject**: docs(auto): regenerate CODEBASE_MAP.md [skip ci]
- **Date**: 2026-05-02
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #177 — `rollback/fix-complete-pv-sizing-configuration-m-2026-05-02-58f4b1a`

- **Branch**: `rollback/fix-complete-pv-sizing-configuration-m-2026-05-02-58f4b1a`
- **Commit**: `58f4b1a561f4d7561dea4823bff9701d9d852169`
- **Subject**: fix: complete pv sizing configuration move
- **Date**: 2026-05-02
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #178 — `rollback/fix-clean-dashboard-mobile-navigation-2026-05-02-d70f295`

- **Branch**: `rollback/fix-clean-dashboard-mobile-navigation-2026-05-02-d70f295`
- **Commit**: `d70f2956d82aacd61debb7cdbe0020dd6d00a420`
- **Subject**: fix: clean dashboard mobile navigation and themed panels
- **Date**: 2026-05-02
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #179 — `rollback/docs-auto-regenerate-codebase-map-md-s-2026-05-03-2e3d934`

- **Branch**: `rollback/docs-auto-regenerate-codebase-map-md-s-2026-05-03-2e3d934`
- **Commit**: `2e3d934d18dc09b89af8f5a247418711c20e9e70`
- **Subject**: docs(auto): regenerate CODEBASE_MAP.md [skip ci]
- **Date**: 2026-05-03
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #180 — `rollback/docs-auto-regenerate-codebase-map-md-s-2026-05-04-d36adcb`

- **Branch**: `rollback/docs-auto-regenerate-codebase-map-md-s-2026-05-04-d36adcb`
- **Commit**: `d36adcb2315920138f67bf03e24966ab26a905f0`
- **Subject**: docs(auto): regenerate CODEBASE_MAP.md [skip ci]
- **Date**: 2026-05-04
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #181 — `rollback/docs-auto-regenerate-codebase-map-md-s-2026-05-05-68fbdbd`

- **Branch**: `rollback/docs-auto-regenerate-codebase-map-md-s-2026-05-05-68fbdbd`
- **Commit**: `68fbdbd38451c6c5973bac4c3eb09d8201582a5d`
- **Subject**: docs(auto): regenerate CODEBASE_MAP.md [skip ci]
- **Date**: 2026-05-05
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #182 — `rollback/docs-auto-regenerate-codebase-map-md-s-2026-05-06-610ece3`

- **Branch**: `rollback/docs-auto-regenerate-codebase-map-md-s-2026-05-06-610ece3`
- **Commit**: `610ece3a8a3e4ed8c0820d2b5d780ee274519984`
- **Subject**: docs(auto): regenerate CODEBASE_MAP.md [skip ci]
- **Date**: 2026-05-06
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #183 — `rollback/docs-auto-regenerate-codebase-map-md-s-2026-05-07-76d01a0`

- **Branch**: `rollback/docs-auto-regenerate-codebase-map-md-s-2026-05-07-76d01a0`
- **Commit**: `76d01a051f5f7b18529ee10f057133ac66206ab7`
- **Subject**: docs(auto): regenerate CODEBASE_MAP.md [skip ci]
- **Date**: 2026-05-07
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #184 — `rollback/docs-auto-regenerate-codebase-map-md-s-2026-05-08-190553a`

- **Branch**: `rollback/docs-auto-regenerate-codebase-map-md-s-2026-05-08-190553a`
- **Commit**: `190553a1997734c80ecb929bff8ab787a6f94361`
- **Subject**: docs(auto): regenerate CODEBASE_MAP.md [skip ci]
- **Date**: 2026-05-08
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #185 — `rollback/docs-auto-regenerate-codebase-map-md-s-2026-05-09-f14e5dd`

- **Branch**: `rollback/docs-auto-regenerate-codebase-map-md-s-2026-05-09-f14e5dd`
- **Commit**: `f14e5dd749923cf3884cc5a23705d18dc85a2c4f`
- **Subject**: docs(auto): regenerate CODEBASE_MAP.md [skip ci]
- **Date**: 2026-05-09
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #186 — `rollback/merge-pull-request-242-from-rauell1-cl-2026-05-09-83682b1`

- **Branch**: `rollback/merge-pull-request-242-from-rauell1-cl-2026-05-09-83682b1`
- **Commit**: `83682b1645d63b1296174c06044265e8cb1c931b`
- **Subject**: Merge pull request #242 from rauell1/claude/fix-bugs-improve-ui-G0zsr
- **Date**: 2026-05-09
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #187 — `rollback/merge-fix-bugs-improve-ui-add-logout-e-2026-05-09-aa37128`

- **Branch**: `rollback/merge-fix-bugs-improve-ui-add-logout-e-2026-05-09-aa37128`
- **Commit**: `aa3712880e16f3c166d8a14a9a8b2e1f55f83dc6`
- **Subject**: Merge: fix bugs, improve UI, add logout, enforce mandatory signup
- **Date**: 2026-05-09
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #188 — `rollback/merge-pull-request-244-from-rauell1-cl-2026-05-09-f4b8ba5`

- **Branch**: `rollback/merge-pull-request-244-from-rauell1-cl-2026-05-09-f4b8ba5`
- **Commit**: `f4b8ba5b62d0dcce7a49f9130dd71bfd5fe122aa`
- **Subject**: Merge pull request #244 from rauell1/claude/fix-bugs-improve-ui-G0zsr
- **Date**: 2026-05-09
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #189 — `rollback/merge-pull-request-245-from-rauell1-cl-2026-05-10-7e34dc3`

- **Branch**: `rollback/merge-pull-request-245-from-rauell1-cl-2026-05-10-7e34dc3`
- **Commit**: `7e34dc336f0e3f66b2d93c0509b5ad268a62eee2`
- **Subject**: Merge pull request #245 from rauell1/claude/fix-bugs-improve-ui-G0zsr
- **Date**: 2026-05-10
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #190 — `rollback/merge-pull-request-246-from-rauell1-cl-2026-05-10-889a0db`

- **Branch**: `rollback/merge-pull-request-246-from-rauell1-cl-2026-05-10-889a0db`
- **Commit**: `889a0db976b302ad24343e020dbb878e316a280b`
- **Subject**: Merge pull request #246 from rauell1/claude/fix-bugs-improve-ui-G0zsr
- **Date**: 2026-05-10
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #191 — `rollback/fix-bugs-improve-ui-location-sync-live-2026-05-10-2be6dcc`

- **Branch**: `rollback/fix-bugs-improve-ui-location-sync-live-2026-05-10-2be6dcc`
- **Commit**: `2be6dccdb95159eac01a2b036b4aee1c4903ba05`
- **Subject**: Fix bugs & improve UI: location sync, live nodes, dark mode (#247)
- **Date**: 2026-05-10
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #192 — `rollback/docs-auto-regenerate-readme-md-skip-ci-2026-05-09-dfbffcf`

- **Branch**: `rollback/docs-auto-regenerate-readme-md-skip-ci-2026-05-09-dfbffcf`
- **Commit**: `dfbffcf5f4f05d7bdf3ef2bea2709962ca49c77e`
- **Subject**: docs(auto): regenerate README.md [skip ci]
- **Date**: 2026-05-09
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #193 — `rollback/improve-sld-ac-bus-visibility-configur-2026-05-10-cb1d1f1`

- **Branch**: `rollback/improve-sld-ac-bus-visibility-configur-2026-05-10-cb1d1f1`
- **Commit**: `cb1d1f1af1410b0a91174774a7a000ca619ddc24`
- **Subject**: Improve SLD: AC Bus visibility, configurable EV & inverter panels (#249)
- **Date**: 2026-05-10
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #194 — `rollback/africa-inverter-presets-move-config-to-2026-05-10-1849c7c`

- **Branch**: `rollback/africa-inverter-presets-move-config-to-2026-05-10-1849c7c`
- **Commit**: `1849c7c8ac8c0d99dbb650cb9524ae0a422e36d7`
- **Subject**: Africa inverter presets, move config to System Config, add PDF report
- **Date**: 2026-05-10
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #195 — `rollback/docs-auto-regenerate-readme-md-skip-ci-2026-05-10-226a27e`

- **Branch**: `rollback/docs-auto-regenerate-readme-md-skip-ci-2026-05-10-226a27e`
- **Commit**: `226a27e8d07cabfb0ae95035b74aa51c415142dd`
- **Subject**: docs(auto): regenerate README.md [skip ci]
- **Date**: 2026-05-10
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #196 — `rollback/real-hardware-specs-from-deye-jinko-da-2026-05-10-909d6f8`

- **Branch**: `rollback/real-hardware-specs-from-deye-jinko-da-2026-05-10-909d6f8`
- **Commit**: `909d6f81b15934f1c6d033c0306708d54aeb8ee9`
- **Subject**: Real hardware specs from Deye & Jinko datasheets wired into simulation
- **Date**: 2026-05-10
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #197 — `rollback/docs-auto-regenerate-codebase-map-md-s-2026-05-10-07f7b6f`

- **Branch**: `rollback/docs-auto-regenerate-codebase-map-md-s-2026-05-10-07f7b6f`
- **Commit**: `07f7b6f36d3b942d8406f62efbe53c4e77c022e6`
- **Subject**: docs(auto): regenerate CODEBASE_MAP.md [skip ci]
- **Date**: 2026-05-10
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #198 — `rollback/feat-add-branddocshub-component-with-t-2026-05-10-89eebfc`

- **Branch**: `rollback/feat-add-branddocshub-component-with-t-2026-05-10-89eebfc`
- **Commit**: `89eebfca76db306ef79146825d41d861be90d6bf`
- **Subject**: feat: add BrandDocsHub component with Tier 1 brand documentation links
- **Date**: 2026-05-10
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #199 — `rollback/feat-sim-wire-catalog-datasheet-specs-2026-05-10-99ab6c8`

- **Branch**: `rollback/feat-sim-wire-catalog-datasheet-specs-2026-05-10-99ab6c8`
- **Commit**: `99ab6c8a2bbbd913a67fcb6eba3de45695c8e404`
- **Subject**: feat(sim): wire catalog datasheet specs into physics engine
- **Date**: 2026-05-10
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #200 — `rollback/add-useinstalledcomponents-hook-and-ca-2026-05-10-b3c6b41`

- **Branch**: `rollback/add-useinstalledcomponents-hook-and-ca-2026-05-10-b3c6b41`
- **Commit**: `b3c6b414db55e9095ef2e1c2e58a0631f9376641`
- **Subject**: Add useInstalledComponents hook and catalog-driven wiring for installed components
- **Date**: 2026-05-10
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #201 — `rollback/wire-installed-catalog-ids-into-system-2026-05-10-7482d1d`

- **Branch**: `rollback/wire-installed-catalog-ids-into-system-2026-05-10-7482d1d`
- **Commit**: `7482d1da8c83c694d6773c9404752db6732354a0`
- **Subject**: Wire installed catalog IDs into SystemConfiguration, add installed-components summary helper, and feed catalog-based physics into simulation
- **Date**: 2026-05-10
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #202 — `rollback/add-setsystemmode-action-to-keep-ui-sy-2026-05-10-5a61fea`

- **Branch**: `rollback/add-setsystemmode-action-to-keep-ui-sy-2026-05-10-5a61fea`
- **Commit**: `5a61fea9a0020cd351876be26a41e67e6b3ac2b3`
- **Subject**: Add setSystemMode action to keep UI system type and simulation mode in sync
- **Date**: 2026-05-10
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #203 — `rollback/rename-system-type-installation-type-i-2026-05-10-e6e0d1d`

- **Branch**: `rollback/rename-system-type-installation-type-i-2026-05-10-e6e0d1d`
- **Commit**: `e6e0d1de7941526325171eb67e0f229d2a59016b`
- **Subject**: rename System Type → Installation Type in PV sizing section to reduce UI ambiguity with System Mode simulation control
- **Date**: 2026-05-10
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #204 — `rollback/feat-wire-real-world-physics-from-cata-2026-05-10-900a10c`

- **Branch**: `rollback/feat-wire-real-world-physics-from-cata-2026-05-10-900a10c`
- **Commit**: `900a10c106ea3600126c92c4786c2b5e1d55270f`
- **Subject**: feat: wire real-world physics from catalog IDs into simulation engine
- **Date**: 2026-05-10
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #205 — `rollback/merge-pull-request-254-from-rauell1-co-2026-05-10-cdb3b7e`

- **Branch**: `rollback/merge-pull-request-254-from-rauell1-co-2026-05-10-cdb3b7e`
- **Commit**: `cdb3b7eaf6340452f3e82e0e66e81f19b1abc39c`
- **Subject**: Merge pull request #254 from rauell1/copilot/enhance-solar-simulation-engine
- **Date**: 2026-05-10
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #206 — `rollback/docs-auto-regenerate-codebase-map-md-s-2026-05-11-67191a2`

- **Branch**: `rollback/docs-auto-regenerate-codebase-map-md-s-2026-05-11-67191a2`
- **Commit**: `67191a2c02414f1876ad9d7d91ada77eecba0937`
- **Subject**: docs(auto): regenerate CODEBASE_MAP.md [skip ci]
- **Date**: 2026-05-11
- **Auto-generated**: yes (by update-rollback.yml)
---

## Snapshot #207 — `rollback/docs-auto-regenerate-codebase-map-md-s-2026-05-12-c8099e6`

- **Branch**: `rollback/docs-auto-regenerate-codebase-map-md-s-2026-05-12-c8099e6`
- **Commit**: `c8099e62025c92f9fc34a4eb6df64d27ead078a1`
- **Subject**: docs(auto): regenerate CODEBASE_MAP.md [skip ci]
- **Date**: 2026-05-12
- **Auto-generated**: yes (by update-rollback.yml)


---

*This file is maintained manually after each major change session.*
