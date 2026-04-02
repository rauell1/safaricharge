'use client';

import { useMemo, useState } from 'react';
import { BookOpen, ExternalLink } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SOLAR_COMPONENT_CATALOG, type SolarComponentCategory } from '@/lib/solar-component-catalog';

const CATEGORY_OPTIONS: Array<SolarComponentCategory | 'All'> = [
  'All',
  'Solar Module',
  'Inverter',
  'Battery Storage',
  'EV Charger',
  'Monitoring',
];

export function SolarComponentLibrary() {
  const [category, setCategory] = useState<SolarComponentCategory | 'All'>('All');
  const [selectedId, setSelectedId] = useState(SOLAR_COMPONENT_CATALOG[0]?.id ?? '');

  const filtered = useMemo(() => {
    if (category === 'All') return SOLAR_COMPONENT_CATALOG;
    return SOLAR_COMPONENT_CATALOG.filter((entry) => entry.category === category);
  }, [category]);

  const selected = useMemo(() => {
    const inFiltered = filtered.find((entry) => entry.id === selectedId);
    return inFiltered ?? filtered[0] ?? SOLAR_COMPONENT_CATALOG[0];
  }, [filtered, selectedId]);

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card-muted)] p-4 space-y-3">
      <div className="flex items-center gap-2">
        <BookOpen className="h-4 w-4 text-[var(--battery)]" />
        <p className="text-sm font-semibold text-[var(--text-primary)]">Component Knowledge Base</p>
      </div>
      <p className="text-xs text-[var(--text-secondary)]">
        Curated from manufacturer documentation. Use filters, then open details to compare specs and manuals.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Select
          value={category}
          onValueChange={(value) => {
            const next = value as SolarComponentCategory | 'All';
            setCategory(next);
            const first = (next === 'All'
              ? SOLAR_COMPONENT_CATALOG
              : SOLAR_COMPONENT_CATALOG.filter((entry) => entry.category === next))[0];
            if (first) setSelectedId(first.id);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Choose category" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORY_OPTIONS.map((option) => (
              <SelectItem key={option} value={option}>{option}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selected?.id ?? ''} onValueChange={setSelectedId}>
          <SelectTrigger>
            <SelectValue placeholder="Choose component" />
          </SelectTrigger>
          <SelectContent>
            {filtered.map((entry) => (
              <SelectItem key={entry.id} value={entry.id}>
                {entry.brand} — {entry.model}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selected && (
        <Dialog>
          <DialogTrigger asChild>
            <Button className="w-full" variant="outline">Open Detailed Specs</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selected.brand} {selected.model}</DialogTitle>
              <DialogDescription>{selected.category} • {selected.summary}</DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[65vh] pr-4">
              <div className="space-y-4 text-sm">
                <p className="text-[var(--text-secondary)]">{selected.typicalUse}</p>
                <div className="rounded-lg border border-[var(--border)] p-3 space-y-2">
                  <p className="text-xs font-semibold uppercase text-[var(--text-tertiary)]">Key specifications</p>
                  {selected.specs.map((spec) => (
                    <div key={spec.label} className="flex items-center justify-between gap-3">
                      <span className="text-[var(--text-secondary)]">{spec.label}</span>
                      <span className="font-semibold text-[var(--text-primary)] text-right">{spec.value}</span>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <a href={selected.datasheetUrl} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-[var(--border)] px-3 py-2 hover:bg-[var(--bg-card)] transition-colors">
                    <span className="text-xs uppercase text-[var(--text-tertiary)]">Datasheet</span>
                    <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">Open source <ExternalLink className="h-3.5 w-3.5" /></div>
                  </a>
                  <a href={selected.manualUrl} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-[var(--border)] px-3 py-2 hover:bg-[var(--bg-card)] transition-colors">
                    <span className="text-xs uppercase text-[var(--text-tertiary)]">Installation Manual</span>
                    <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">Open source <ExternalLink className="h-3.5 w-3.5" /></div>
                  </a>
                </div>

                <p className="text-xs text-[var(--text-tertiary)]">
                  Source provenance: {selected.source}
                </p>
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
