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

*This file is maintained manually after each major change session.*
