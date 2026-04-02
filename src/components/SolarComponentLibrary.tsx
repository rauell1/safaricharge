'use client';

import { useMemo, useState } from 'react';
import { BookOpen, ExternalLink, Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
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
  const [brand, setBrand] = useState<string>('All');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(SOLAR_COMPONENT_CATALOG[0]?.id ?? '');

  const brands = useMemo(() => {
    const scoped = category === 'All'
      ? SOLAR_COMPONENT_CATALOG
      : SOLAR_COMPONENT_CATALOG.filter((entry) => entry.category === category);

    return ['All', ...Array.from(new Set(scoped.map((entry) => entry.brand))).sort((a, b) => a.localeCompare(b))];
  }, [category]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return SOLAR_COMPONENT_CATALOG.filter((entry) => {
      const categoryOk = category === 'All' || entry.category === category;
      const brandOk = brand === 'All' || entry.brand === brand;
      const queryOk = normalizedQuery.length === 0
        || `${entry.brand} ${entry.model} ${entry.summary} ${entry.typicalUse}`.toLowerCase().includes(normalizedQuery)
        || entry.specs.some((spec) => `${spec.label} ${spec.value}`.toLowerCase().includes(normalizedQuery));

      return categoryOk && brandOk && queryOk;
    });
  }, [brand, category, query]);

  const selected = useMemo(() => {
    const inFiltered = filtered.find((entry) => entry.id === selectedId);
    return inFiltered ?? filtered[0] ?? SOLAR_COMPONENT_CATALOG[0];
  }, [filtered, selectedId]);

  const categoryCounts = useMemo(() => {
    return CATEGORY_OPTIONS.filter((option): option is SolarComponentCategory => option !== 'All').map((option) => ({
      category: option,
      count: SOLAR_COMPONENT_CATALOG.filter((entry) => entry.category === option).length,
    }));
  }, []);

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card-muted)] p-4 space-y-3">
      <div className="flex items-center gap-2">
        <BookOpen className="h-4 w-4 text-[var(--battery)]" />
        <p className="text-sm font-semibold text-[var(--text-primary)]">Component Knowledge Base</p>
      </div>
      <p className="text-xs text-[var(--text-secondary)]">
        Expanded, PVsyst-style directory with brand + model + visible key specs before opening full details.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {categoryCounts.map((item) => (
          <div key={item.category} className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-2 py-1.5">
            <p className="text-[10px] uppercase text-[var(--text-tertiary)]">{item.category}</p>
            <p className="text-sm font-semibold text-[var(--text-primary)]">{item.count}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        <Select
          value={category}
          onValueChange={(value) => {
            const next = value as SolarComponentCategory | 'All';
            setCategory(next);
            setBrand('All');
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

        <Select value={brand} onValueChange={setBrand}>
          <SelectTrigger>
            <SelectValue placeholder="Choose brand" />
          </SelectTrigger>
          <SelectContent>
            {brands.map((option) => (
              <SelectItem key={option} value={option}>{option}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative lg:col-span-2">
          <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search model, feature, or spec"
            className="pl-8"
          />
        </div>
      </div>

      <p className="text-xs text-[var(--text-secondary)]">
        Showing {filtered.length} component{filtered.length === 1 ? '' : 's'} from {new Set(filtered.map((entry) => entry.brand)).size} brand{new Set(filtered.map((entry) => entry.brand)).size === 1 ? '' : 's'}.
      </p>

      <ScrollArea className="max-h-[280px] rounded-lg border border-[var(--border)] bg-[var(--bg-card)]">
        <div className="divide-y divide-[var(--border)]">
          {filtered.map((entry) => (
            <button
              key={entry.id}
              onClick={() => setSelectedId(entry.id)}
              className={`w-full text-left px-3 py-2 transition-colors ${selected?.id === entry.id ? 'bg-[var(--battery-soft)]/60' : 'hover:bg-[var(--bg-card-muted)]'}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{entry.brand} — {entry.model}</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">{entry.category} • {entry.summary}</p>
                </div>
                <span className="text-[10px] uppercase rounded-full border border-[var(--border)] px-2 py-0.5 text-[var(--text-tertiary)]">
                  {entry.specs[0]?.value}
                </span>
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="p-4 text-xs text-[var(--text-secondary)]">No components match your filter. Try another brand, category, or keyword.</div>
          )}
        </div>
      </ScrollArea>

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
