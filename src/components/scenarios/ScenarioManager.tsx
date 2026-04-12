'use client';
/**
 * ScenarioManager
 * ────────────────
 * Left-sidebar list of scenarios with create / clone / delete actions.
 * Selecting a scenario opens the ScenarioEditor in the main panel.
 */

import React, { useState } from 'react';
import { useScenarioStore, Scenario } from '@/store/scenarioStore';

const COLOUR_RING = 'w-3 h-3 rounded-full flex-shrink-0';

function ScenarioBadge({ scenario, isActive, onSelect }: {
  scenario: Scenario;
  isActive: boolean;
  onSelect: () => void;
}) {
  const { cloneScenario, deleteScenario, toggleComparison, comparisonIds, pinScenario } =
    useScenarioStore();
  const inComparison = comparisonIds.includes(scenario.id);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
        isActive
          ? 'bg-[var(--color-primary-highlight)] text-[var(--color-primary)]'
          : 'hover:bg-[var(--color-surface-dynamic)]'
      }`}
      onClick={onSelect}
    >
      <span className={COLOUR_RING} style={{ background: scenario.colour }} />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ maxWidth: '160px' }}>{scenario.name}</p>
        {scenario.results && (
          <p className="text-xs text-[var(--color-text-muted)]">
            NPV {(scenario.results.npv25Kes / 1_000_000).toFixed(1)} M KES
            &nbsp;·&nbsp;
            {scenario.results.selfSufficiencyPct}% SS
          </p>
        )}
        {scenario.isCalculating && (
          <p className="text-xs text-[var(--color-primary)] animate-pulse">Calculating…</p>
        )}
        {!scenario.results && !scenario.isCalculating && (
          <p className="text-xs text-[var(--color-text-faint)]">Not calculated</p>
        )}
      </div>

      {/* Compare toggle */}
      <button
        className={`text-xs px-1.5 py-0.5 rounded border transition-colors ${
          inComparison
            ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
            : 'border-[var(--color-border)] text-[var(--color-text-muted)] opacity-0 group-hover:opacity-100'
        }`}
        title={inComparison ? 'Remove from comparison' : 'Add to comparison'}
        onClick={e => { e.stopPropagation(); toggleComparison(scenario.id); }}
      >
        {inComparison ? '−' : '+'}
      </button>

      {/* Context menu */}
      <div className="relative">
        <button
          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[var(--color-surface-offset)] text-[var(--color-text-muted)]"
          onClick={e => { e.stopPropagation(); setMenuOpen(v => !v); }}
          title="More options"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/>
          </svg>
        </button>
        {menuOpen && (
          <div
            className="absolute right-0 top-full mt-1 bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg shadow-lg z-20 py-1 min-w-[140px]"
            onBlur={() => setMenuOpen(false)}
          >
            {([
              { label: scenario.isPinned ? 'Unpin' : 'Pin', action: () => pinScenario(scenario.id, !scenario.isPinned) },
              { label: 'Clone', action: () => cloneScenario(scenario.id) },
              { label: 'Delete', action: () => deleteScenario(scenario.id), danger: true },
            ] as Array<{label:string; action:()=>void; danger?:boolean}>).map(item => (
              <button
                key={item.label}
                className={`w-full text-left text-sm px-3 py-1.5 hover:bg-[var(--color-surface-dynamic)] ${
                  item.danger ? 'text-[var(--color-error)]' : 'text-[var(--color-text)]'
                }`}
                onClick={e => { e.stopPropagation(); item.action(); setMenuOpen(false); }}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function ScenarioManager({ onSelect }: { onSelect: (id: string) => void }) {
  const { scenarios, activeScenarioId, createScenario, comparisonIds } = useScenarioStore();

  return (
    <aside className="flex flex-col h-full border-r border-[var(--color-border)] bg-[var(--color-surface)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
        <h3 className="text-sm font-semibold text-[var(--color-text)]">Scenarios</h3>
        <button
          className="text-xs bg-[var(--color-primary)] text-white px-2.5 py-1 rounded-md font-medium hover:bg-[var(--color-primary-hover)] transition-colors"
          onClick={() => {
            const id = createScenario();
            onSelect(id);
          }}
        >
          + New
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {scenarios.map(s => (
          <ScenarioBadge
            key={s.id}
            scenario={s}
            isActive={s.id === activeScenarioId}
            onSelect={() => { onSelect(s.id); }}
          />
        ))}
        {scenarios.length === 0 && (
          <p className="text-xs text-[var(--color-text-faint)] text-center py-8">No scenarios yet.<br/>Click + New to start.</p>
        )}
      </div>

      {/* Compare CTA */}
      {comparisonIds.length >= 2 && (
        <div className="px-3 py-2 border-t border-[var(--color-border)]">
          <p className="text-xs text-[var(--color-text-muted)] mb-1">{comparisonIds.length} selected for comparison</p>
        </div>
      )}
    </aside>
  );
}
