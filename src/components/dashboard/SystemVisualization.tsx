'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useEnergyFlows, useEnergyNodes, useNodeSelection } from '@/hooks/useEnergySystem';
import { useRouter } from 'next/navigation';
import { ArrowRight, Zap } from 'lucide-react';
import type { NodeType } from '@/stores/energySystemStore';

const nodeConfig: Array<{
  key: NodeType;
  label: string;
  accent: string;
  tint: string;
  href: string;
}> = [
  { key: 'solar', label: 'Solar', accent: 'var(--solar)', tint: 'var(--solar-soft)', href: '/demo/solar' },
  { key: 'battery', label: 'Battery', accent: 'var(--battery)', tint: 'var(--battery-soft)', href: '/demo/battery' },
  { key: 'grid', label: 'Grid', accent: 'var(--grid)', tint: 'var(--grid-soft)', href: '/demo/grid' },
  { key: 'home', label: 'Home', accent: 'var(--consumption)', tint: 'var(--consumption-soft)', href: '/demo' },
  { key: 'ev1', label: 'EV 1', accent: 'var(--consumption)', tint: 'var(--consumption-soft)', href: '/demo/ev' },
  { key: 'ev2', label: 'EV 2', accent: 'var(--consumption)', tint: 'var(--consumption-soft)', href: '/demo/ev' },
] as const;

export function SystemVisualization() {
  const nodes = useEnergyNodes(['solar', 'battery', 'grid', 'home', 'ev1', 'ev2']);
  const flows = useEnergyFlows();
  const { selectNode } = useNodeSelection();
  const router = useRouter();

  const activeFlows = flows.filter((f) => f.active);

  return (
    <Card className="dashboard-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[var(--text-primary)]">
          <Zap className="h-5 w-5 text-[var(--battery)]" />
          System Visualization
          <span className="text-xs font-normal text-[var(--text-tertiary)] ml-2">
            Live with energy flow — click a node to jump to its detail page
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {nodeConfig.map((node) => {
            const data = nodes[node.key];
            return (
              <button
                key={node.key}
                className="group rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--border-strong)]"
                onClick={() => {
                  selectNode(node.key);
                  router.push(node.href);
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-[var(--text-primary)]">{node.label}</div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: node.tint, color: node.accent }}>
                    {data.status}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="text-xl font-bold" style={{ color: node.accent }}>
                    {data.powerKW.toFixed(1)} kW
                  </div>
                  {data.soc !== undefined && (
                    <span className="text-xs text-[var(--text-secondary)]">SOC {data.soc.toFixed(0)}%</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-3">
          <div className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2">Active Flows</div>
          {activeFlows.length === 0 ? (
            <div className="text-sm text-[var(--text-tertiary)]">No active flows right now.</div>
          ) : (
            <div className="space-y-2">
              {activeFlows.map((flow, idx) => (
                <div
                  key={`${flow.from}-${flow.to}-${idx}`}
                  className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2"
                >
                  <div className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
                    <span className="font-semibold capitalize">{flow.from}</span>
                    <ArrowRight className="h-4 w-4 text-[var(--text-tertiary)]" />
                    <span className="font-semibold capitalize">{flow.to}</span>
                  </div>
                  <div className="text-sm font-semibold text-[var(--text-primary)]">{flow.powerKW.toFixed(1)} kW</div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-2 text-[10px] text-[var(--text-tertiary)]">
            Driven by the shared energySystemStore — always in sync with the energy flow diagram.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
