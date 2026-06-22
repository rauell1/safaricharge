'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import ParametricInputs from '@/components/sizing/ParametricInputs';
import SimulationResults from '@/components/sizing/SimulationResults';
import ProposalViewer from '@/components/sizing/ProposalViewer';
import { runSimulation } from '@/lib/sizing/solarCalculator';
import type { SimulationInputs, SimulationResults as SimResultsType } from '@/lib/sizing/solarCalculator';

export default function SizingPage() {
  const [inputs, setInputs] = useState<SimulationInputs | null>(null);
  const [results, setResults] = useState<SimResultsType | null>(null);
  const [showProposal, setShowProposal] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!inputs) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const r = runSimulation(inputs);
      setResults(r);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [inputs]);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* Header */}
      <div className="border-b border-[var(--border)] bg-[var(--bg-card)]/90 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/demo" className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition font-mono">
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Dashboard
            </Link>
            <div className="w-px h-4 bg-[var(--border)]" />
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-[var(--battery)] flex items-center justify-center font-black text-white text-xs">S</span>
              <span className="text-sm font-bold text-[var(--text-primary)] font-mono tracking-tight">
                Safari<span className="text-[var(--battery)]">Charge</span>
                <span className="text-[var(--text-muted)] font-normal ml-2">/ Parametric Sizing Engine</span>
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-mono text-[var(--text-muted)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--battery)] animate-pulse" />
            Live Simulation
          </div>
        </div>
      </div>

      {/* Main Layout */}
      <div className="max-w-[1600px] mx-auto px-4 py-6">
        <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-6">
          {/* Left Panel: Parametric Inputs */}
          <div className="xl:sticky xl:top-[57px] xl:h-[calc(100vh-57px)] xl:overflow-y-auto space-y-0 pb-6 pr-1">
            <ParametricInputs onChange={setInputs} />
          </div>

          {/* Right Panel: Results */}
          <div className="min-w-0">
            {results ? (
              <SimulationResults
                results={results}
                activeOrgName="SafariCharge"
                onViewProposal={() => setShowProposal(true)}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-[var(--text-muted)] space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] flex items-center justify-center">
                  <span className="text-2xl">⚡</span>
                </div>
                <p className="text-sm font-mono">Adjust parameters to run simulation...</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Proposal Modal */}
      {showProposal && results && (
        <ProposalViewer
          results={results}
          projectName="Sizing Project"
          clientName="Enterprise Client"
          engineerName="SafariCharge Engineer"
          onClose={() => setShowProposal(false)}
        />
      )}
    </div>
  );
}
