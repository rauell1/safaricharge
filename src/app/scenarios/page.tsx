'use client';

import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import ScenarioCompare, { type SavedDesignOption } from '@/components/sizing/ScenarioCompare';
import ProposalViewer from '@/components/sizing/ProposalViewer';
import { GitCompare } from 'lucide-react';

export default function ScenariosPage() {
  const [activeExportOption, setActiveExportOption] = useState<SavedDesignOption | null>(null);

  return (
    <DashboardLayout activeSection="scenarios">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <span
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ background: 'var(--battery-soft)' }}
          >
            <GitCompare className="h-5 w-5" style={{ color: 'var(--battery)' }} />
          </span>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              3-Option Scenario Comparison
            </h1>
            <p className="text-xs text-[var(--text-secondary)]">
              Compare up to three saved Solar + BESS design runs side by side across PV capacity, curtailment, CapEx, IRR, NPV, and useful LCOE.
            </p>
          </div>
        </div>

        <ScenarioCompare onSelectForExport={(opt) => setActiveExportOption(opt)} />

        {activeExportOption && (
          <ProposalViewer
            results={activeExportOption.results}
            projectName={activeExportOption.label}
            clientName="Comparison Client"
            engineerName="SafariCharge Engineering"
            onClose={() => setActiveExportOption(null)}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
