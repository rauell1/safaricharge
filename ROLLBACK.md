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

*This file is maintained manually after each major change session.*
