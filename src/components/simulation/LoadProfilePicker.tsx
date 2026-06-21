'use client';

import { Home, Building2, Factory, Leaf } from 'lucide-react';
import { useEnergySystemStore } from '@/stores/energySystemStore';
import { cn } from '@/lib/utils';

const PROFILES = [
  {
    id: 'residential' as const,
    icon: Home,
    label: 'Residential',
    sub: 'Family home · evening peak',
    batteryRatio: 5,
    color: 'var(--battery)',
    soft: 'var(--battery-soft)',
  },
  {
    id: 'commercial' as const,
    icon: Building2,
    label: 'Commercial',
    sub: 'Office or clinic · daytime load',
    batteryRatio: 3,
    color: 'var(--solar)',
    soft: 'var(--solar-soft)',
  },
  {
    id: 'industrial' as const,
    icon: Factory,
    label: 'Industrial',
    sub: 'Factory · constant base load',
    batteryRatio: 2,
    color: 'var(--grid)',
    soft: 'var(--grid-soft)',
  },
  {
    id: 'fleet-depot' as const,
    icon: Leaf,
    label: 'Off-Grid Lodge',
    sub: 'Remote · heavy evening load',
    batteryRatio: 8,
    color: 'var(--ev)',
    soft: 'var(--ev-soft)',
  },
] as const;

export function LoadProfilePicker() {
  const solarKW = useEnergySystemStore((s) => s.systemConfig.solarCapacityKW);
  const activeProfile = useEnergySystemStore((s) => s.systemConfig.loadProfile ?? 'residential');
  const updateSystemConfig = useEnergySystemStore((s) => s.updateSystemConfig);

  const handleSelect = (id: (typeof PROFILES)[number]['id'], batteryRatio: number) => {
    updateSystemConfig({
      loadProfile: id,
      batteryCapacityKWh: Math.round(solarKW * batteryRatio),
    });
  };

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
        Site type
      </p>
      <div className="grid grid-cols-2 gap-2">
        {PROFILES.map(({ id, icon: Icon, label, sub, batteryRatio, color, soft }) => {
          const active = activeProfile === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => handleSelect(id, batteryRatio)}
              className={cn(
                'flex flex-col items-start gap-1.5 rounded-xl border p-3 text-left transition-all',
                active
                  ? 'shadow-sm'
                  : 'border-[var(--border)] bg-[var(--bg-card-muted)] hover:border-[var(--border-hover)] hover:bg-[var(--bg-card)]',
              )}
              style={
                active
                  ? { borderColor: color, background: soft }
                  : undefined
              }
            >
              <Icon
                className="h-4 w-4 shrink-0"
                style={{ color: active ? color : 'var(--text-tertiary)' }}
              />
              <span
                className="text-sm font-semibold leading-tight"
                style={{ color: active ? color : 'var(--text-primary)' }}
              >
                {label}
              </span>
              <span className="text-[10px] leading-tight text-[var(--text-tertiary)]">{sub}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
