'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Download, ExternalLink, Search, Upload } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useIsMobile } from '@/hooks/use-mobile';
import { markExternalUploadActive, clearExternalUploadActive } from '@/lib/external-upload-guard';
import { SOLAR_COMPONENT_CATALOG, type SolarComponentCategory, type SolarComponentEntry } from '@/lib/solar-component-catalog';
import { useEnergySystemStore } from '@/stores/energySystemStore';
import { applyCatalogComponentToSystemConfig } from '@/lib/system-config-catalog-sync';

type SolarComponentLibraryProps = {
  standalone?: boolean;
};

type UploadedAsset = {
  id: string;
  name: string;
  category: SolarComponentCategory;
  url: string;
  uploadedAt: string;
};

const CATEGORY_OPTIONS: Array<SolarComponentCategory | 'All'> = [
  'All',
  'Solar Module',
  'Inverter',
  'Battery Storage',
  'EV Charger',
  'Monitoring',
];

const cleanText = (text: string) => text.replace(/[–—]/g, '-');
const getHostnameLabel = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'manufacturer website';
  }
};

const getOriginUrl = (url: string) => {
  try {
    return new URL(url).origin;
  } catch {
    return url;
  }
};

export function SolarComponentLibrary({ standalone = false }: SolarComponentLibraryProps) {
  const isMobile = useIsMobile();
  const fullSystemConfig = useEnergySystemStore((s) => s.fullSystemConfig);
  const updateFullSystemConfig = useEnergySystemStore((s) => s.updateFullSystemConfig);
  const updateSystemConfig = useEnergySystemStore((s) => s.updateSystemConfig);
  const updateNode = useEnergySystemStore((s) => s.updateNode);
  const [catalog, setCatalog] = useState<SolarComponentEntry[]>(SOLAR_COMPONENT_CATALOG);
  const [assets, setAssets] = useState<UploadedAsset[]>([]);
  const [category, setCategory] = useState<SolarComponentCategory | 'All'>('All');
  const [brand, setBrand] = useState<string>('All');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(SOLAR_COMPONENT_CATALOG[0]?.id ?? '');
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [files, setFiles] = useState<FileList | null>(null);
  const [status, setStatus] = useState('');

  const refresh = async () => {
    const response = await fetch('/api/component-library', { cache: 'no-store' });
    if (!response.ok) return;
    const payload = await response.json();
    setCatalog(payload.entries ?? SOLAR_COMPONENT_CATALOG);
    setAssets(payload.uploadedAssets ?? []);
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const brands = useMemo(() => {
    const scoped = category === 'All'
      ? catalog
      : catalog.filter((entry) => entry.category === category);

    return ['All', ...Array.from(new Set(scoped.map((entry) => entry.brand))).sort((a, b) => a.localeCompare(b))];
  }, [catalog, category]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return catalog.filter((entry) => {
      const categoryOk = category === 'All' || entry.category === category;
      const brandOk = brand === 'All' || entry.brand === brand;
      const queryOk = normalizedQuery.length === 0
        || `${entry.brand} ${entry.model} ${entry.summary} ${entry.typicalUse}`.toLowerCase().includes(normalizedQuery)
        || entry.specs.some((spec) => `${spec.label} ${spec.value}`.toLowerCase().includes(normalizedQuery));

      return categoryOk && brandOk && queryOk;
    });
  }, [brand, category, query, catalog]);

  const selected = useMemo(() => {
    const inFiltered = filtered.find((entry) => entry.id === selectedId);
    return inFiltered ?? filtered[0] ?? catalog[0];
  }, [filtered, selectedId, catalog]);

  const categoryCounts = useMemo(() => {
    return CATEGORY_OPTIONS.filter((option): option is SolarComponentCategory => option !== 'All').map((option) => ({
      category: option,
      count: catalog.filter((entry) => entry.category === option).length,
    }));
  }, [catalog]);

  const selectedHost = selected ? getHostnameLabel(selected.datasheetUrl) : 'manufacturer website';

  useEffect(() => {
    if (isMobile && selected) {
      setIsDetailsOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile, selected?.id]);

  const submitUploads = async () => {
    markExternalUploadActive(true);
    setStatus('Uploading...');
    const formData = new FormData();

    if (importJson.trim().length > 0) {
      formData.append('catalog', importJson);
    }

    if (files) {
      Array.from(files).forEach((file) => {
        formData.append('files', file);
      });
    }

    try {
      const response = await fetch('/api/component-library', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        setStatus('Upload failed. Please check the JSON format and file types.');
        return;
      }

      const payload = await response.json();
      setStatus(`Uploaded ${payload.uploadedFiles} file(s), imported ${payload.importedCount} catalog entries.`);
      setImportJson('');
      setFiles(null);
      await refresh();
    } finally {
      clearExternalUploadActive();
    }
  };

  const handleUseComponent = () => {
    if (!selected) return;
    const next = applyCatalogComponentToSystemConfig(fullSystemConfig, selected);
    updateFullSystemConfig(next);
    updateSystemConfig({
      solarCapacityKW: next.solar.totalCapacityKw,
      inverterKW: next.inverter.capacityKw,
      batteryCapacityKWh: next.battery.capacityKwh,
    });
    updateNode('solar', { capacityKW: next.solar.totalCapacityKw });
    updateNode('battery', { capacityKWh: next.battery.capacityKwh });
    setStatus(`Configured ${selected.brand} ${cleanText(selected.model)} in system configuration.`);
  };

  void categoryCounts;

  return (
    <section className={`rounded-[28px] border border-[var(--border)] bg-[linear-gradient(180deg,rgba(17,24,39,0.98),rgba(15,23,42,0.96))] shadow-[0_24px_80px_rgba(0,0,0,0.28)] ${standalone ? 'p-5 sm:p-6 lg:p-8' : 'p-4 sm:p-5'}`}>
      <div className="space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--battery)]/30 bg-[var(--battery-soft)] text-[var(--battery)]">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--text-tertiary)]">Component Knowledge Base</p>
                <h2 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">Browse solar hardware with clearer hierarchy</h2>
              </div>
            </div>
            <p className="text-sm text-[var(--text-secondary)] max-w-xl leading-relaxed text-justify [text-align-last:left]">
              Filter modules, inverters, battery storage, EV chargers, and monitoring tools without losing the selected spec sheet or the download links.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:min-w-[420px]">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card-muted)] px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-[var(--text-tertiary)]">Entries</p>
              <p className="mt-1 text-lg font-semibold text-[var(--text-primary)]">{catalog.length}</p>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card-muted)] px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-[var(--text-tertiary)]">Visible</p>
              <p className="mt-1 text-lg font-semibold text-[var(--text-primary)]">{filtered.length}</p>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card-muted)] px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-[var(--text-tertiary)]">Brands</p>
              <p className="mt-1 text-lg font-semibold text-[var(--text-primary)]">{new Set(filtered.map((entry) => entry.brand)).size}</p>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card-muted)] px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-[var(--text-tertiary)]">Uploads</p>
              <p className="mt-1 text-lg font-semibold text-[var(--text-primary)]">{assets.length}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <Select
            value={category}
            onValueChange={(value) => {
              const next = value as SolarComponentCategory | 'All';
              setCategory(next);
              setBrand('All');
            }}
          >
            <SelectTrigger className="w-full rounded-2xl border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-primary)]">
              <SelectValue placeholder="Choose category" />
            </SelectTrigger>
            <SelectContent className="border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-primary)]">
              {CATEGORY_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={brand} onValueChange={setBrand}>
            <SelectTrigger className="w-full rounded-2xl border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-primary)]">
              <SelectValue placeholder="Choose brand" />
            </SelectTrigger>
            <SelectContent className="border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-primary)]">
              {brands.map((option) => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search model, feature, or spec"
              className="h-11 rounded-2xl border-[var(--border)] bg-[var(--bg-card)] pl-10 text-[var(--text-primary)]"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-card-muted)] px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild size="sm" variant="outline" className="border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-primary)]">
              <a href="/api/component-library?categories=Inverter,Battery%20Storage,Solar%20Module&format=csv">
                <Download className="mr-1 h-3.5 w-3.5" /> Download CSV
              </a>
            </Button>
            {!standalone && (
              <Button asChild size="sm" variant="outline" className="border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-primary)]">
                <Link href="/component-knowledge-base">Open full page</Link>
              </Button>
            )}
          </div>
          <span className="text-xs text-[var(--text-secondary)]">
            Showing {filtered.length} item{filtered.length === 1 ? '' : 's'} across {new Set(filtered.map((entry) => entry.brand)).size} brand(s).
          </span>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.85fr)]">
          <div className="rounded-[24px] border border-[var(--border)] bg-[var(--bg-card-muted)]">
            <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-[var(--text-tertiary)]">Catalog</p>
                <p className="text-sm font-semibold text-[var(--text-primary)]">{filtered.length} filtered entries</p>
              </div>
              <span className="rounded-full border border-[var(--border)] bg-[var(--bg-card)] px-2.5 py-1 text-[11px] text-[var(--text-secondary)]">{category === 'All' ? 'All categories' : category}</span>
            </div>
            <ScrollArea className="h-[560px]">
              <div className="space-y-2 p-3">
                {filtered.length === 0 ? (
                  <div className="flex h-40 items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg-card)] text-sm text-[var(--text-secondary)]">
                    No components match the current filters.
                  </div>
                ) : (
                  filtered.map((entry) => (
                    <div
                      key={entry.id}
                      onClick={() => setSelectedId(entry.id)}
                      className={`w-full rounded-2xl border px-4 py-3 text-left transition-all cursor-pointer ${selected?.id === entry.id ? 'border-[var(--battery)] bg-[var(--battery-soft)] shadow-[0_12px_30px_rgba(16,185,129,0.12)]' : 'border-[var(--border)] bg-[var(--bg-card)] hover:border-[var(--border-hover)] hover:bg-[var(--bg-card-hover)]'}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-[var(--text-primary)]">{entry.brand} - {cleanText(entry.model)}</p>
                            <span className="rounded-full border border-[var(--border)] bg-[var(--bg-card-muted)] px-2 py-0.5 text-[10px] uppercase tracking-wide text-[var(--text-tertiary)]">
                              {entry.category}
                            </span>
                          </div>
                          <p className="text-xs leading-relaxed text-justify text-[var(--text-secondary)] [text-align-last:left]">{cleanText(entry.summary)}</p>
                          <p className="text-[11px] text-[var(--text-tertiary)]">{cleanText(entry.typicalUse)}</p>
                          <a
                            href={getOriginUrl(entry.datasheetUrl)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(event) => event.stopPropagation()}
                            className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[var(--battery)] hover:underline"
                          >
                            {getHostnameLabel(entry.datasheetUrl)} <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-2">
                          <span className="rounded-full border border-[var(--border)] bg-[var(--bg-card-muted)] px-2.5 py-1 text-[10px] uppercase tracking-wide text-[var(--text-secondary)]">
                            {cleanText(entry.specs[0]?.value ?? 'N/A')}
                          </span>
                          <span className="text-[10px] text-[var(--text-tertiary)]">{selected?.id === entry.id ? 'Selected' : 'Tap to inspect'}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          <div className="space-y-4">
            <div className="rounded-[24px] border border-[var(--border)] bg-[var(--bg-card)] p-4 sm:p-5">
              {isMobile ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-tertiary)]">Selected component</p>
                      <h3 className="mt-1 text-lg font-bold text-[var(--text-primary)]">{selected ? `${selected.brand} ${cleanText(selected.model)}` : 'No component selected'}</h3>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-full border-[var(--border)] bg-[var(--bg-card-muted)] text-[var(--text-primary)]"
                      onClick={() => setIsDetailsOpen(true)}
                      disabled={!selected}
                    >
                      View details
                    </Button>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed text-justify [text-align-last:left]">
                    Tap a row in the catalog to open the selected component in a focused bottom drawer.
                  </p>
                </div>
              ) : selected ? (
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-tertiary)]">Selected component</p>
                      <h3 className="mt-1 text-xl font-bold text-[var(--text-primary)]">{selected.brand} {cleanText(selected.model)}</h3>
                      <p className="mt-1 text-sm text-[var(--text-secondary)]">{selected.category} • {cleanText(selected.summary)}</p>
                    </div>
                    <span className="rounded-full border border-[var(--battery)]/20 bg-[var(--battery-soft)] px-3 py-1 text-[11px] font-semibold text-[var(--battery)]">{selectedHost}</span>
                  </div>

                  <p className="text-sm leading-relaxed text-justify text-[var(--text-secondary)] [text-align-last:left]">{cleanText(selected.typicalUse)}</p>

                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card-muted)] p-4">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Key specifications</p>
                      <span className="text-[10px] text-[var(--text-tertiary)]">{selected.specs.length} items</span>
                    </div>
                    <div className="space-y-2">
                      {selected.specs.map((spec) => (
                        <div key={spec.label} className="flex items-start justify-between gap-4 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2.5">
                          <span className="text-sm text-[var(--text-secondary)]">{cleanText(spec.label)}</span>
                          <span className="max-w-[60%] text-right text-sm font-semibold text-[var(--text-primary)]">{cleanText(spec.value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <a href={selected.datasheetUrl} target="_blank" rel="noopener noreferrer" className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card-muted)] px-4 py-3 transition-colors hover:border-[var(--battery)]/40 hover:bg-[var(--battery-soft)]">
                      <span className="text-[11px] uppercase tracking-wide text-[var(--text-tertiary)]">Datasheet</span>
                      <div className="mt-1 flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">Open source <ExternalLink className="h-3.5 w-3.5" /></div>
                    </a>
                    <a href={selected.manualUrl} target="_blank" rel="noopener noreferrer" className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card-muted)] px-4 py-3 transition-colors hover:border-[var(--grid)]/40 hover:bg-[var(--grid-soft)]">
                      <span className="text-[11px] uppercase tracking-wide text-[var(--text-tertiary)]">Installation manual</span>
                      <div className="mt-1 flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">Open source <ExternalLink className="h-3.5 w-3.5" /></div>
                    </a>
                  </div>
                  <Button onClick={handleUseComponent} className="w-full sm:w-auto rounded-xl bg-[var(--battery)] text-white hover:opacity-90">
                    Use this component
                  </Button>
                </div>
              ) : (
                <div className="flex min-h-[240px] items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg-card-muted)] text-sm text-[var(--text-secondary)]">
                  Select a component to inspect its specs.
                </div>
              )}
            </div>

            {standalone && (
              <div className="rounded-[24px] border border-[var(--border)] bg-[var(--bg-card)] p-4 sm:p-5 space-y-4">
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">Upload and maintain knowledge base data</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">Upload JSON catalog entries and spec-sheet files. New uploads appear in the list below.</p>
                </div>

                <textarea
                  value={importJson}
                  onChange={(event) => setImportJson(event.target.value)}
                  className="w-full min-h-[140px] rounded-2xl border border-[var(--border)] bg-[var(--bg-card-muted)] p-3 text-xs text-[var(--text-primary)] outline-none"
                  placeholder='Optional: paste JSON array of catalog entries with brand, model, category, specs, datasheetUrl, manualUrl and source.'
                />

                <input
                  type="file"
                  multiple
                  title="Upload component library files"
                  aria-label="Upload component library files"
                  onChange={(event) => setFiles(event.target.files)}
                  className="block w-full text-xs text-[var(--text-secondary)]"
                />

                <Button onClick={submitUploads} className="w-full sm:w-auto rounded-xl bg-[var(--battery)] text-white hover:opacity-90">
                  <Upload className="mr-1 h-3.5 w-3.5" /> Save uploads
                </Button>

                {status && <p className="text-xs text-[var(--text-secondary)]">{status}</p>}

                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Uploaded specs</p>
                  {assets.length === 0 ? (
                    <p className="text-xs text-[var(--text-secondary)]">No uploaded files yet.</p>
                  ) : (
                    assets.slice(0, 12).map((asset) => (
                      <a key={asset.id} href={asset.url} target="_blank" rel="noreferrer" className="block rounded-xl border border-[var(--border)] bg-[var(--bg-card-muted)] px-3 py-2 text-xs text-[var(--text-primary)] transition-colors hover:border-[var(--border-hover)] hover:bg-[var(--bg-card-hover)]">
                        {asset.name} ({asset.category})
                      </a>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <Drawer open={isMobile && isDetailsOpen && !!selected} onOpenChange={setIsDetailsOpen}>
        <DrawerContent className="rounded-t-[28px] border-t border-[var(--border)] bg-[var(--bg-card)] px-4 pb-6 pt-3">
          <DrawerHeader className="px-1 pb-4 text-left">
            <DrawerTitle className="text-[var(--text-primary)]">{selected ? `${selected.brand} ${cleanText(selected.model)}` : 'Selected component'}</DrawerTitle>
            <DrawerDescription className="text-[var(--text-secondary)]">
              {selected ? `${selected.category} • ${cleanText(selected.summary)}` : 'Select a component from the catalog.'}
            </DrawerDescription>
          </DrawerHeader>
          {selected && (
            <ScrollArea className="max-h-[70vh] pr-1">
              <div className="space-y-4 pb-2">
                <p className="text-sm leading-relaxed text-justify text-[var(--text-secondary)] [text-align-last:left]">{cleanText(selected.typicalUse)}</p>
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card-muted)] p-4">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Key specifications</p>
                    <span className="text-[10px] text-[var(--text-tertiary)]">{selected.specs.length} items</span>
                  </div>
                  <div className="space-y-2">
                    {selected.specs.map((spec) => (
                      <div key={spec.label} className="flex items-start justify-between gap-4 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2.5">
                        <span className="text-sm text-[var(--text-secondary)]">{cleanText(spec.label)}</span>
                        <span className="max-w-[60%] text-right text-sm font-semibold text-[var(--text-primary)]">{cleanText(spec.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <a href={selected.datasheetUrl} target="_blank" rel="noopener noreferrer" className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card-muted)] px-4 py-3 transition-colors hover:border-[var(--battery)]/40 hover:bg-[var(--battery-soft)]">
                    <span className="text-[11px] uppercase tracking-wide text-[var(--text-tertiary)]">Datasheet</span>
                    <div className="mt-1 flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">Open source <ExternalLink className="h-3.5 w-3.5" /></div>
                  </a>
                  <a href={selected.manualUrl} target="_blank" rel="noopener noreferrer" className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card-muted)] px-4 py-3 transition-colors hover:border-[var(--grid)]/40 hover:bg-[var(--grid-soft)]">
                    <span className="text-[11px] uppercase tracking-wide text-[var(--text-tertiary)]">Installation manual</span>
                    <div className="mt-1 flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">Open source <ExternalLink className="h-3.5 w-3.5" /></div>
                  </a>
                </div>
                <Button onClick={handleUseComponent} className="w-full rounded-xl bg-[var(--battery)] text-white hover:opacity-90">
                  Use this component
                </Button>
              </div>
            </ScrollArea>
          )}
        </DrawerContent>
      </Drawer>
    </section>
  );
}
