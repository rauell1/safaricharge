'use client';
/**
 * ScenarioPage
 * ──────────────
 * Top-level layout for the Scenarios dashboard section:
 *   [│ ScenarioManager sidebar │ ScenarioEditor OR ScenarioComparison main panel ]
 *
 * A "Compare" tab appears in the header when 2+ scenarios are selected.
 */

import React, { useState } from 'react';
import { ScenarioManager } from './ScenarioManager';
import { ScenarioEditor }  from './ScenarioEditor';
import { ScenarioComparison } from './ScenarioComparison';
import { useScenarioStore } from '@/store/scenarioStore';

type Tab = 'edit' | 'compare';

export function ScenarioPage() {
  const { comparisonIds, setActive, activeScenarioId, scenarios } = useScenarioStore();
  const [tab, setTab] = useState<Tab>('edit');

  const handleSelect = (id: string) => {
    setActive(id);
    setTab('edit');
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top tab bar */}
      <div className="flex items-center gap-0 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 flex-shrink-0">
        {(['edit', 'compare'] as Tab[]).map(t => (
          <button
            key={t}
            className={`text-sm px-4 py-2.5 font-medium border-b-2 transition-colors capitalize ${
              tab === t
                ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            } ${ t === 'compare' && comparisonIds.length < 2 ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={t === 'compare' && comparisonIds.length < 2}
            onClick={() => setTab(t)}
          >
            {t === 'compare' ? `Compare (${comparisonIds.length})` : 'Editor'}
          </button>
        ))}
        <span className="ml-auto text-xs text-[var(--color-text-faint)]">
          {scenarios.length} scenario{scenarios.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar — always visible */}
        <div className="w-56 flex-shrink-0">
          <ScenarioManager onSelect={handleSelect} />
        </div>

        {/* Main panel */}
        <div className="flex-1 overflow-hidden bg-[var(--color-bg)]">
          {tab === 'compare'
            ? <ScenarioComparison />
            : <ScenarioEditor scenarioId={activeScenarioId ?? scenarios[0]?.id ?? ''} />
          }
        </div>
      </div>
    </div>
  );
}
