'use client';

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useEnergyFlows, useEnergyNodes, useNodeSelection } from '@/hooks/useEnergySystem';
import { useRouter } from 'next/navigation';
import { ArrowRight, Battery, ChevronLeft, ChevronRight, Home, Sun, TowerControl, Zap, CarFront } from 'lucide-react';
import type { NodeType } from '@/stores/energySystemStore';
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from '@/components/ui/carousel';
import { Slider } from '@/components/ui/slider';

const nodeConfig: Array<{
  key: NodeType;
  label: string;
  accent: string;
  tint: string;
  href: string;
  icon: React.ElementType;
}> = [
  { key: 'solar',   label: 'Solar',   accent: 'var(--solar)',       tint: 'var(--solar-soft)',       href: '/demo/solar',   icon: Sun },
  { key: 'battery', label: 'Battery', accent: 'var(--battery)',     tint: 'var(--battery-soft)',     href: '/demo/battery', icon: Battery },
  { key: 'grid',    label: 'Grid',    accent: 'var(--grid)',        tint: 'var(--grid-soft)',        href: '/demo/grid',    icon: TowerControl },
  { key: 'home',    label: 'Home',    accent: 'var(--consumption)', tint: 'var(--consumption-soft)', href: '/demo',         icon: Home },
  { key: 'ev1',     label: 'EV 1',    accent: 'var(--consumption)', tint: 'var(--consumption-soft)', href: '/demo/ev',      icon: CarFront },
  { key: 'ev2',     label: 'EV 2',    accent: 'var(--consumption)', tint: 'var(--consumption-soft)', href: '/demo/ev',      icon: CarFront },
] as const;

export function SystemVisualization() {
  const nodes = useEnergyNodes(['solar', 'battery', 'grid', 'home', 'ev1', 'ev2']);
  const flows = useEnergyFlows();
  const { selectNode } = useNodeSelection();
  const router = useRouter();
  const [mobileStep, setMobileStep] = useState(0);
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();

  const activeFlows = flows.filter((f) => f.active);
  const mobileNodes = useMemo(
    () => nodeConfig.map((node) => ({ ...node, status: nodes[node.key].status, power: nodes[node.key].powerKW, soc: nodes[node.key].soc })),
    [nodes]
  );
  const currentMobileNode = mobileNodes[Math.max(0, Math.min(mobileStep, mobileNodes.length - 1))];

  const syncSlideToStep = useCallback(() => {
    if (!carouselApi) return;
    setMobileStep(carouselApi.selectedScrollSnap());
  }, [carouselApi]);

  useLayoutEffect(() => {
    if (!carouselApi) return;
    setMobileStep(carouselApi.selectedScrollSnap());
  }, [carouselApi]);

  useEffect(() => {
    if (!carouselApi) return;
    carouselApi.on('select', syncSlideToStep);
    return () => { carouselApi.off('select', syncSlideToStep); };
  }, [carouselApi, syncSlideToStep]);

  useEffect(() => {
    if (!carouselApi) return;
    if (carouselApi.selectedScrollSnap() !== mobileStep) carouselApi.scrollTo(mobileStep);
  }, [carouselApi, mobileStep]);

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

        {/* ── Mobile carousel layout (hidden on md+) ─────────────────────────
            CSS-only visibility: no JS isMobile check means zero hydration flash.
            Embla re-initialises via ResizeObserver when revealed on small screens.
        ──────────────────────────────────────────────────────────────────── */}
        <div className="md:hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
          <div className="flex items-center justify-between">
            <button
              type="button"
              className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-2.5 text-[var(--text-secondary)] transition-all duration-200 hover:border-[var(--border-strong)] hover:bg-[var(--bg-secondary)] active:scale-95"
              onClick={() => setMobileStep((prev) => (prev === 0 ? mobileNodes.length - 1 : prev - 1))}
              aria-label="Previous system node"
            >
              <ChevronLeft className="h-5 w-5" strokeWidth={2} />
            </button>
            <div className="text-center">
              <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)] font-medium">
                Node {mobileStep + 1} of {mobileNodes.length}
              </div>
              <div className="mt-1 flex items-center justify-center gap-2">
                <div className="text-sm font-semibold text-[var(--text-primary)]">{currentMobileNode.label}</div>
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: currentMobileNode.accent }} />
              </div>
            </div>
            <button
              type="button"
              className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-2.5 text-[var(--text-secondary)] transition-all duration-200 hover:border-[var(--border-strong)] hover:bg-[var(--bg-secondary)] active:scale-95"
              onClick={() => setMobileStep((prev) => (prev + 1) % mobileNodes.length)}
              aria-label="Next system node"
            >
              <ChevronRight className="h-5 w-5" strokeWidth={2} />
            </button>
          </div>

          <Carousel setApi={setCarouselApi} opts={{ align: 'start', loop: true }} className="mt-4">
            <CarouselContent className="ml-0">
              {mobileNodes.map((node) => {
                const NodeIcon = node.icon;
                return (
                  <CarouselItem key={node.key} className="pl-0">
                    <button
                      type="button"
                      onClick={() => handleNodeClick(node)}
                      className="flex w-full items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 text-left transition-all duration-300 hover:scale-[1.02] hover:border-[var(--border-strong)] active:scale-[0.98]"
                    >
                      <div
                        className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 shadow-lg transition-all duration-300"
                        style={{ borderColor: node.accent, backgroundColor: node.tint, boxShadow: `0 4px 20px ${node.accent}40, 0 0 0 3px ${node.tint}` }}
                      >
                        <NodeIcon className="h-8 w-8 transition-transform duration-300" style={{ color: node.accent }} strokeWidth={2.5} />
                        {(node.status === 'online' || node.status === 'charging' || node.status === 'discharging') && (
                          <div className="absolute -right-1 -top-1 h-4 w-4 rounded-full border-2 border-[var(--bg-card)] animate-pulse-glow" style={{ backgroundColor: node.accent }} />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <div className="text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">{node.status}</div>
                          {(node.status === 'online' || node.status === 'charging' || node.status === 'discharging') && (
                            <span className="h-1.5 w-1.5 rounded-full animate-pulse-glow" style={{ backgroundColor: node.accent }} />
                          )}
                        </div>
                        <div className="mt-1 text-2xl font-bold leading-none tracking-tight" style={{ color: node.accent }}>
                          {node.power.toFixed(1)}{' '}
                          <span className="text-sm font-medium text-[var(--text-secondary)]">kW</span>
                        </div>
                      </div>
                    </button>
                  </CarouselItem>
                );
              })}
            </CarouselContent>
          </Carousel>

          <div className="mt-4 px-1">
            <Slider
              min={0}
              max={mobileNodes.length - 1}
              step={1}
              value={[mobileStep]}
              onValueChange={(value) => setMobileStep(value[0] ?? 0)}
              aria-label="System node slider"
            />
          </div>

          {currentMobileNode.soc !== undefined && (
            <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-3 text-xs text-[var(--text-secondary)]">
              Battery SOC:{' '}
              <span className="font-semibold text-[var(--text-primary)]">{currentMobileNode.soc.toFixed(0)}%</span>
            </div>
          )}

          <div className="mt-4 flex items-center justify-center gap-2">
            {mobileNodes.map((node, idx) => {
              const NodeIcon = node.icon;
              const isActive = idx === mobileStep;
              return (
                <button
                  key={node.key}
                  type="button"
                  onClick={() => setMobileStep(idx)}
                  className="relative flex items-center justify-center rounded-full border transition-all duration-300"
                  style={{
                    width: isActive ? '40px' : '32px',
                    height: isActive ? '40px' : '32px',
                    borderColor: isActive ? node.accent : 'var(--border)',
                    backgroundColor: isActive ? node.tint : 'transparent',
                    boxShadow: isActive ? `0 2px 12px ${node.accent}30` : 'none',
                  }}
                  aria-label={`Go to ${node.label} node`}
                >
                  <NodeIcon
                    className="transition-all duration-300"
                    style={{
                      width: isActive ? '20px' : '16px',
                      height: isActive ? '20px' : '16px',
                      color: isActive ? node.accent : 'var(--text-tertiary)',
                    }}
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Desktop grid layout (hidden below md) ───────────────────────── */}
        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {nodeConfig.map((node) => {
            const data = nodes[node.key];
            const NodeIcon = node.icon;
            return (
              <button
                key={node.key}
                className="group rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--border-strong)] hover:shadow-lg"
                onClick={() => handleNodeClick(node)}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 group-hover:scale-110"
                      style={{ backgroundColor: node.tint }}
                    >
                      <NodeIcon className="h-4 w-4" style={{ color: node.accent }} strokeWidth={2.5} />
                    </div>
                    <div className="text-sm font-semibold text-[var(--text-primary)]">{node.label}</div>
                  </div>
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: node.tint, color: node.accent }}
                  >
                    {data.status}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold" style={{ color: node.accent }}>
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

        {/* ── Active flows ─────────────────────────────────────────────────── */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-3">
          <div className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2">Active Flows</div>
          {activeFlows.length === 0 ? (
            <div className="text-sm text-[var(--text-tertiary)]">No active flows right now.</div>
          ) : (
            <div className="space-y-2">
              {activeFlows.map((flow, idx) => (
                <div key={`${flow.from}-${flow.to}-${idx}`} className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2">
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
