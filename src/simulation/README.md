# ⚠️ Legacy Simulation Directory — DO NOT USE

The files in this directory (`runSimulation.ts`, `solarEngine.ts`, `timeEngine.ts`, `mathUtils.ts`)
are the **original first-generation simulation engine** and are **no longer active**.

They were fully replaced by:
- `src/lib/physics-engine.ts` — new generalized physics engine
- `src/lib/physics-engine-bridge.ts` — wires the engine into Zustand stores

These files are retained for historical reference only. Do not import from this directory.
See `ENGINEERING_ISSUES_V2_2026-04-10.md` §A for the full migration rationale.
