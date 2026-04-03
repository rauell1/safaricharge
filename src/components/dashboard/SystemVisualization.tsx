'use client';

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useEnergyFlows, useEnergyNodes, useNodeSelection } from '@/hooks/useEnergySystem';
import { useRouter } from 'next/navigation';
import { ArrowRight, Battery, ChevronLeft, ChevronRight, Home, Sun, TowerControl, Zap, CarFront } from 'lucide-react';
import type { NodeType } from '@/stores/energySystemStore';
import { useIsMobile } from '@/hooks/use-mobile';

const nodeConfig: Array<{
  key: NodeType;
  label: string;
  accent: string;
  tint: string;
  href: string;
  icon: React.ElementType;
}> = [
  { key: 'solar', label: 'Solar', accent: 'var(--solar)', tint: 'var(--solar-soft)', href: '/demo/solar', icon: Sun },
  { key: 'battery', label: 'Battery', accent: 'var(--battery)', tint: 'var(--battery-soft)', href: '/demo/battery', icon: Battery },
  { key: 'grid', label: 'Grid', accent: 'var(--grid)', tint: 'var(--grid-soft)', href: '/demo/grid', icon: TowerControl },
  { key: 'home', label: 'Home', accent: 'var(--consumption)', tint: 'var(--consumption-soft)', href: '/demo', icon: Home },
  { key: 'ev1', label: 'EV 1', accent: 'var(--consumption)', tint: 'var(--consumption-soft)', href: '/demo/ev', icon: CarFront },
  { key: 'ev2', label: 'EV 2', accent: 'var(--consumption)', tint: 'var(--consumption-soft)', href: '/demo/ev', icon: CarFront },
] as const;

export function SystemVisualization() {
  const nodes = useEnergyNodes(['solar', 'battery', 'grid', 'home', 'ev1', 'ev2']);
  const flows = useEnergyFlows();
  const { selectNode } = useNodeSelection();
  const router = useRouter();
  const isMobile = useIsMobile();
  const [mobileStep, setMobileStep] = useState(0);

  const activeFlows = flows.filter((f) => f.active);
  const mobileNodes = useMemo(
    () =>
      nodeConfig.map((node) => ({
        ...node,
        status: nodes[node.key].status,
        power: nodes[node.key].powerKW,
        soc: nodes[node.key].soc,
      })),
    [nodes]
  );
  const currentMobileNode = mobileNodes[Math.max(0, Math.min(mobileStep, mobileNodes.length - 1))];
  const MobileIcon = currentMobileNode.icon;

  const handleNodeClick = (node: (typeof nodeConfig)[number]) => {
    selectNode(node.key);
    router.push(node.href);
  };

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
        {isMobile ? (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
            <div className="flex items-center justify-between">
              <button
                type="button"
                className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)]"
                onClick={() => setMobileStep((prev) => (prev === 0 ? mobileNodes.length - 1 : prev - 1))}
                aria-label="Previous system node"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="text-center">
                <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                  Node {mobileStep + 1} of {mobileNodes.length}
                </div>
                <div className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{currentMobileNode.label}</div>
              </div>
              <button
                type="button"
                className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)]"
                onClick={() => setMobileStep((prev) => (prev + 1) % mobileNodes.length)}
                aria-label="Next system node"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => handleNodeClick(currentMobileNode)}
              className="mt-4 flex w-full items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-3 text-left"
            >
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2"
                style={{ borderColor: currentMobileNode.accent, backgroundColor: currentMobileNode.tint }}
              >
                <MobileIcon className="h-6 w-6" style={{ color: currentMobileNode.accent }} />
              </div>
              <div className="min-w-0">
                <div className="text-xs text-[var(--text-tertiary)]">{currentMobileNode.status}</div>
                <div className="text-lg font-bold leading-none" style={{ color: currentMobileNode.accent }}>
                  {currentMobileNode.power.toFixed(1)} kW
                </div>
              </div>
            </button>

            {currentMobileNode.soc !== undefined && (
              <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-3 text-xs text-[var(--text-secondary)]">
                Battery SOC: <span className="font-semibold text-[var(--text-primary)]">{currentMobileNode.soc.toFixed(0)}%</span>
              </div>
            )}

            <div className="mt-3 flex items-center justify-center gap-2">
              {mobileNodes.map((node, idx) => (
                <button
                  key={node.key}
                  type="button"
                  onClick={() => setMobileStep(idx)}
                  className="h-2 rounded-full transition-all"
                  style={{
                    width: idx === mobileStep ? '20px' : '8px',
                    backgroundColor: idx === mobileStep ? node.accent : 'var(--border)',
                  }}
                  aria-label={`Go to ${node.label} node`}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {nodeConfig.map((node) => {
              const data = nodes[node.key];
              return (
                <button
                  key={node.key}
                  className="group rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--border-strong)]"
                  onClick={() => handleNodeClick(node)}
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
        )}

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
