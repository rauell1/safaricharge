'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Download, ExternalLink, Search, Upload } from 'lucide-react';

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
import { SOLAR_COMPONENT_CATALOG, type SolarComponentCategory, type SolarComponentEntry } from '@/lib/solar-component-catalog';

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

export function SolarComponentLibrary({ standalone = false }: SolarComponentLibraryProps) {
  const [catalog, setCatalog] = useState<SolarComponentEntry[]>(SOLAR_COMPONENT_CATALOG);
  const [assets, setAssets] = useState<UploadedAsset[]>([]);
  const [category, setCategory] = useState<SolarComponentCategory | 'All'>('All');
  const [brand, setBrand] = useState<string>('All');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(SOLAR_COMPONENT_CATALOG[0]?.id ?? '');
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
    refresh();
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

  const submitUploads = async () => {
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
  };

  return (
    <div className={`rounded-xl border border-[var(--border)] bg-[var(--bg-card)] ${standalone ? 'p-6 space-y-5' : 'p-4 space-y-3'}`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-[var(--battery)]" />
            <p className="text-sm font-semibold text-[var(--text-primary)]">Component Knowledge Base</p>
          </div>
          <p className="text-xs text-[var(--text-secondary)]">
            Clean and readable component directory with visible specs, no long-hyphen typography, and stronger contrast.
          </p>
        </div>

        {!standalone && (
          <Button asChild size="sm" variant="outline" className="bg-[var(--bg-card)] text-[var(--text-primary)] border-[var(--border)]">
            <Link href="/component-knowledge-base">Open full page</Link>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {categoryCounts.map((item) => (
          <div key={item.category} className="rounded-lg border border-[var(--border)] bg-[var(--bg-card-muted)] px-2 py-1.5">
            <p className="text-[10px] uppercase tracking-wide text-[var(--text-secondary)]">{item.category}</p>
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
          <SelectTrigger className="w-full bg-[var(--bg-card)] text-[var(--text-primary)]">
            <SelectValue placeholder="Choose category" />
          </SelectTrigger>
          <SelectContent className="bg-[var(--bg-card)] text-[var(--text-primary)] border-[var(--border)]">
            {CATEGORY_OPTIONS.map((option) => (
              <SelectItem key={option} value={option}>{option}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={brand} onValueChange={setBrand}>
          <SelectTrigger className="w-full bg-[var(--bg-card)] text-[var(--text-primary)]">
            <SelectValue placeholder="Choose brand" />
          </SelectTrigger>
          <SelectContent className="bg-[var(--bg-card)] text-[var(--text-primary)] border-[var(--border)]">
            {brands.map((option) => (
              <SelectItem key={option} value={option}>{option}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative lg:col-span-2">
          <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search model, feature, or spec"
            className="pl-8 bg-[var(--bg-card)] text-[var(--text-primary)]"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button asChild size="sm" variant="outline" className="bg-[var(--bg-card)] text-[var(--text-primary)]">
          <a href="/api/component-library?categories=Inverter,Battery%20Storage,Solar%20Module&format=csv">
            <Download className="h-3.5 w-3.5 mr-1" /> Download inverter/battery/panel list
          </a>
        </Button>
        <span className="text-xs text-[var(--text-secondary)]">
          Showing {filtered.length} item{filtered.length === 1 ? '' : 's'} across {new Set(filtered.map((entry) => entry.brand)).size} brand(s).
        </span>
      </div>

      <ScrollArea className="max-h-[320px] rounded-lg border border-[var(--border)] bg-[var(--bg-card-muted)]">
        <div className="divide-y divide-[var(--border)]">
          {filtered.map((entry) => (
            <button
              key={entry.id}
              onClick={() => setSelectedId(entry.id)}
              className={`w-full text-left px-3 py-2 transition-colors ${selected?.id === entry.id ? 'bg-[var(--battery-soft)]' : 'hover:bg-[var(--bg-card)]'}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{entry.brand} - {cleanText(entry.model)}</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">{entry.category} • {cleanText(entry.summary)}</p>
                </div>
                <span className="text-[10px] uppercase rounded-full border border-[var(--border)] px-2 py-0.5 text-[var(--text-secondary)] bg-[var(--bg-card)]">
                  {cleanText(entry.specs[0]?.value ?? 'N/A')}
                </span>
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>

      {selected && (
        <Dialog>
          <DialogTrigger asChild>
            <Button className="w-full bg-[var(--bg-card)] text-[var(--text-primary)] border-[var(--border)]" variant="outline">Open Detailed Specs</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl bg-[var(--bg-card)] border-[var(--border)]">
            <DialogHeader>
              <DialogTitle>{selected.brand} {cleanText(selected.model)}</DialogTitle>
              <DialogDescription>{selected.category} • {cleanText(selected.summary)}</DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[65vh] pr-4">
              <div className="space-y-4 text-sm">
                <p className="text-[var(--text-secondary)]">{cleanText(selected.typicalUse)}</p>
                <div className="rounded-lg border border-[var(--border)] p-3 space-y-2 bg-[var(--bg-card-muted)]">
                  <p className="text-xs font-semibold uppercase text-[var(--text-secondary)]">Key specifications</p>
                  {selected.specs.map((spec) => (
                    <div key={spec.label} className="flex items-center justify-between gap-3">
                      <span className="text-[var(--text-secondary)]">{cleanText(spec.label)}</span>
                      <span className="font-semibold text-[var(--text-primary)] text-right">{cleanText(spec.value)}</span>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <a href={selected.datasheetUrl} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-[var(--border)] px-3 py-2 hover:bg-[var(--bg-card-muted)] transition-colors">
                    <span className="text-xs uppercase text-[var(--text-secondary)]">Datasheet</span>
                    <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">Open source <ExternalLink className="h-3.5 w-3.5" /></div>
                  </a>
                  <a href={selected.manualUrl} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-[var(--border)] px-3 py-2 hover:bg-[var(--bg-card-muted)] transition-colors">
                    <span className="text-xs uppercase text-[var(--text-secondary)]">Installation Manual</span>
                    <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">Open source <ExternalLink className="h-3.5 w-3.5" /></div>
                  </a>
                </div>
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      )}

      {standalone && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card-muted)] p-3 space-y-3">
          <p className="text-sm font-semibold text-[var(--text-primary)]">Upload and maintain knowledge base data</p>
          <p className="text-xs text-[var(--text-secondary)]">Upload JSON catalog entries and spec-sheet files (PDF, XLSX, DOCX, ZIP). Files are available in this page after upload.</p>
          <textarea
            value={importJson}
            onChange={(event) => setImportJson(event.target.value)}
            className="w-full min-h-[120px] rounded-md border border-[var(--border)] bg-[var(--bg-card)] p-2 text-xs text-[var(--text-primary)]"
            placeholder='Optional: paste JSON array of catalog entries with brand, model, category, specs, datasheetUrl, manualUrl and source.'
          />
          <input
            type="file"
            multiple
            onChange={(event) => setFiles(event.target.files)}
            className="block w-full text-xs text-[var(--text-secondary)]"
          />
          <Button onClick={submitUploads} className="w-full sm:w-auto">
            <Upload className="h-3.5 w-3.5 mr-1" /> Save uploads
          </Button>
          {status && <p className="text-xs text-[var(--text-secondary)]">{status}</p>}

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Uploaded specs</p>
            {assets.length === 0 ? (
              <p className="text-xs text-[var(--text-secondary)]">No uploaded files yet.</p>
            ) : (
              assets.slice(0, 12).map((asset) => (
                <a key={asset.id} href={asset.url} target="_blank" rel="noreferrer" className="block rounded-md border border-[var(--border)] px-2 py-1.5 text-xs hover:bg-[var(--bg-card)] text-[var(--text-primary)]">
                  {asset.name} ({asset.category})
                </a>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
