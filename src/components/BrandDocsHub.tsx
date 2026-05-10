'use client';

import React, { useMemo, useState } from 'react';
import { SOLAR_COMPONENT_CATALOG, SolarComponentCategory } from '@/lib/solar-component-catalog';
import { ExternalLink, FileText, BookOpen, Search, Globe, LogIn, Zap } from 'lucide-react';
import { useEnergySystemStore } from '@/stores/energySystemStore';
import { applyCatalogComponentToSystemConfig } from '@/lib/system-config-catalog-sync';

// ─── Brand-level metadata ────────────────────────────────────────────────────

type AccessType = 'public' | 'free-login';

interface BrandMeta {
  downloadCentre: string;
  access: AccessType;
  eastAfricaReady: boolean;
  note?: string;
}

const BRAND_META: Record<string, BrandMeta> = {
  // ── Inverters ──────────────────────────────────────────────────────────────
  Sungrow:            { downloadCentre: 'https://en.sungrowpower.com/service/downloads',               access: 'free-login', eastAfricaReady: true,  note: 'SH hybrid + SBR docs most complete for EA off-grid' },
  SMA:                { downloadCentre: 'https://www.sma.de/en/service/downloads',                     access: 'public',     eastAfricaReady: false },
  Huawei:             { downloadCentre: 'https://solar.huawei.com/en/service-support/downloads',       access: 'public',     eastAfricaReady: true  },
  Fronius:            { downloadCentre: 'https://www.fronius.com/en/solar-energy/installers-partners/downloads', access: 'public', eastAfricaReady: true },
  SolarEdge:          { downloadCentre: 'https://www.solaredge.com/us/service/support/downloads',      access: 'public',     eastAfricaReady: false },
  Enphase:            { downloadCentre: 'https://enphase.com/download',                               access: 'public',     eastAfricaReady: false },
  GoodWe:             { downloadCentre: 'https://en.goodwe.com/downloads',                            access: 'public',     eastAfricaReady: true  },
  Solis:              { downloadCentre: 'https://www.solisinverters.com/global/download.html',         access: 'public',     eastAfricaReady: false },
  Growatt:            { downloadCentre: 'https://en.growatt.com/service/download',                    access: 'public',     eastAfricaReady: false },
  Victron:            { downloadCentre: 'https://www.victronenergy.com/support-and-downloads/manuals', access: 'public',    eastAfricaReady: true  },
  'Victron Energy':   { downloadCentre: 'https://www.victronenergy.com/support-and-downloads/manuals', access: 'public',    eastAfricaReady: true  },
  Deye:               { downloadCentre: 'https://www.deyeinverter.com/download/',                     access: 'public',     eastAfricaReady: true  },
  'Schneider Electric': { downloadCentre: 'https://solar.schneider-electric.com/resources/',          access: 'public',     eastAfricaReady: false },
  FoxESS:             { downloadCentre: 'https://www.fox-ess.com/download/',                          access: 'public',     eastAfricaReady: false },
  SOFAR:              { downloadCentre: 'https://www.sofarsolar.com/downloads/',                      access: 'public',     eastAfricaReady: false },
  Delta:              { downloadCentre: 'https://www.delta-emea.com/en-GB/support/download/',          access: 'public',     eastAfricaReady: false },
  FIMER:              { downloadCentre: 'https://www.fimer.com/support/downloads',                    access: 'public',     eastAfricaReady: false },
  Hoymiles:           { downloadCentre: 'https://www.hoymiles.com/support/downloads/',                access: 'public',     eastAfricaReady: false },
  Tigo:               { downloadCentre: 'https://www.tigoenergy.com/downloads',                       access: 'public',     eastAfricaReady: false },
  APsystems:          { downloadCentre: 'https://usa.apsystems.com/resources/',                       access: 'public',     eastAfricaReady: false },
  Omnik:              { downloadCentre: 'https://www.omniksolar.com/download/',                       access: 'public',     eastAfricaReady: false },
  // ── Batteries ─────────────────────────────────────────────────────────────
  Tesla:              { downloadCentre: 'https://energylibrary.tesla.com',                            access: 'public',     eastAfricaReady: false, note: 'energylibrary.tesla.com — cleanest single source' },
  BYD:                { downloadCentre: 'https://www.bydbatterybox.com/downloads/',                   access: 'public',     eastAfricaReady: true,  note: 'Well-organised by model; no login needed' },
  Pylontech:          { downloadCentre: 'https://en.pylontech.com.cn/download/',                     access: 'public',     eastAfricaReady: true  },
  Dyness:             { downloadCentre: 'https://www.dyness.com/download',                            access: 'public',     eastAfricaReady: false },
  AlphaESS:           { downloadCentre: 'https://www.alphaess.com/download',                         access: 'public',     eastAfricaReady: false },
  'LG Energy Solution': { downloadCentre: 'https://www.lgessbattery.com/us/home-battery/download',   access: 'public',     eastAfricaReady: false },
  sonnen:             { downloadCentre: 'https://sonnenusa.com/en/downloads/',                        access: 'public',     eastAfricaReady: false },
  Generac:            { downloadCentre: 'https://www.generac.com/service-support/product-support-lookup/', access: 'public', eastAfricaReady: false },
  FranklinWH:         { downloadCentre: 'https://www.franklinwh.com/support/downloads',              access: 'public',     eastAfricaReady: false },
  Powervault:         { downloadCentre: 'https://www.powervault.co.uk/support/',                      access: 'public',     eastAfricaReady: false },
  // ── Solar Modules ─────────────────────────────────────────────────────────
  LONGi:              { downloadCentre: 'https://www.longi.com/en/service/download-center/',          access: 'public',     eastAfricaReady: true  },
  JinkoSolar:         { downloadCentre: 'https://www.jinkosolar.com/en/site/downloads',               access: 'public',     eastAfricaReady: true,  note: 'Select product model first on the downloads page' },
  'Trina Solar':      { downloadCentre: 'https://www.trinasolar.com/en-glb/download-center',         access: 'public',     eastAfricaReady: true  },
  'JA Solar':         { downloadCentre: 'https://www.jasolar.com/html/en/service/downloads/',         access: 'public',     eastAfricaReady: true  },
  'Canadian Solar':   { downloadCentre: 'https://www.canadiansolar.com/downloads/',                  access: 'public',     eastAfricaReady: false },
  Qcells:             { downloadCentre: 'https://www.qcells.com/us/downloads/',                      access: 'public',     eastAfricaReady: false },
  'Risen Energy':     { downloadCentre: 'https://en.risenenergy.com/download/',                      access: 'public',     eastAfricaReady: false },
  Astronergy:         { downloadCentre: 'https://www.astronergy.com/download-center/',               access: 'public',     eastAfricaReady: false },
  'TW Solar':         { downloadCentre: 'https://www.twsolar.com/en/service/download/',              access: 'public',     eastAfricaReady: false },
  'GCL SI':           { downloadCentre: 'https://en.gclsi.com/download-center/',                    access: 'public',     eastAfricaReady: false },
  'First Solar':      { downloadCentre: 'https://www.firstsolar.com/en/Support',                     access: 'public',     eastAfricaReady: false },
  REC:                { downloadCentre: 'https://www.recgroup.com/en/downloads',                     access: 'public',     eastAfricaReady: false },
  Maxeon:             { downloadCentre: 'https://maxeon.com/us/downloads',                           access: 'public',     eastAfricaReady: false },
  Seraphim:           { downloadCentre: 'https://www.seraphim-energy.com/download',                  access: 'public',     eastAfricaReady: false },
  Talesun:            { downloadCentre: 'https://www.talesun.com/en/service/download',               access: 'public',     eastAfricaReady: false },
  Znshine:            { downloadCentre: 'https://www.znshinesolar.com/download',                     access: 'public',     eastAfricaReady: false },
  'Eging PV':         { downloadCentre: 'http://www.egingpv.com/en/service/download/',               access: 'public',     eastAfricaReady: false },
  'Recurrent/ReneSola': { downloadCentre: 'https://www.renesola.com/downloads/',                    access: 'public',     eastAfricaReady: false },
  Suntech:            { downloadCentre: 'https://www.suntech-power.com/download-center/',            access: 'public',     eastAfricaReady: false },
  'HD Hyundai Energy':{ downloadCentre: 'https://hyundai-es.co.kr/en/customer/download/',            access: 'public',     eastAfricaReady: false },
  Waaree:             { downloadCentre: 'https://waaree.com/downloads/',                             access: 'public',     eastAfricaReady: false },
  'Adani Solar':      { downloadCentre: 'https://www.adanisolar.com/resources/',                    access: 'public',     eastAfricaReady: false },
  Vietracimex:        { downloadCentre: 'https://vietracimex.com.vn/en/download/',                  access: 'public',     eastAfricaReady: false },
};

// ─── Category tabs ────────────────────────────────────────────────────────────

const TABS: { label: string; value: SolarComponentCategory | 'All' }[] = [
  { label: 'All',          value: 'All' },
  { label: 'Inverters',    value: 'Inverter' },
  { label: 'Batteries',    value: 'Battery Storage' },
  { label: 'Solar Panels', value: 'Solar Module' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

function getBrandEntries(brand: string) {
  return SOLAR_COMPONENT_CATALOG.filter((e) => e.brand === brand);
}

// ─── Card component ───────────────────────────────────────────────────────────

function BrandCard({ brand, category }: { brand: string; category: SolarComponentCategory }) {
  const entries = getBrandEntries(brand);
  const fullSystemConfig = useEnergySystemStore((s) => s.fullSystemConfig);
  const updateFullSystemConfig = useEnergySystemStore((s) => s.updateFullSystemConfig);
  const updateSystemConfig = useEnergySystemStore((s) => s.updateSystemConfig);
  const updateNode = useEnergySystemStore((s) => s.updateNode);
  const meta = BRAND_META[brand];
  const downloadCentre = meta?.downloadCentre ?? entries[0]?.manualUrl ?? '#';
  const access: AccessType = meta?.access ?? 'public';
  const isEA = meta?.eastAfricaReady ?? false;

  // Deduplicate datasheet + manual URLs across models
  const datasheetLinks = unique(entries.map((e) => e.datasheetUrl)).slice(0, 4);
  const manualLinks    = unique(entries.map((e) => e.manualUrl)).slice(0, 4);
  // Individual model links (up to 4)
  const models = entries.slice(0, 4);

  const categoryColor: Record<SolarComponentCategory, string> = {
    Inverter:        'bg-blue-500/10 text-blue-400 border-blue-500/20',
    'Battery Storage': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    'Solar Module':  'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    'EV Charger':    'bg-purple-500/10 text-purple-400 border-purple-500/20',
    Monitoring:      'bg-sky-500/10 text-sky-400 border-sky-500/20',
  };

  const handleUseComponent = () => {
    const entry = entries[0];
    if (!entry) return;
    const next = applyCatalogComponentToSystemConfig(fullSystemConfig, entry);
    updateFullSystemConfig(next);
    updateSystemConfig({
      solarCapacityKW: next.solar.totalCapacityKw,
      inverterKW: next.inverter.capacityKw,
      batteryCapacityKWh: next.battery.capacityKwh,
    });
    updateNode('solar', { capacityKW: next.solar.totalCapacityKw });
    updateNode('battery', { capacityKWh: next.battery.capacityKwh });
  };

  return (
    <div className="group rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5 flex flex-col gap-4 hover:border-emerald-500/30 hover:shadow-[0_8px_32px_rgba(16,185,129,0.06)] transition-all duration-200">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1.5">
          <span className="text-base font-semibold text-[var(--text-primary)] leading-tight">{brand}</span>
          <span className={`inline-flex items-center self-start rounded-full border px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase ${categoryColor[category]}`}>
            {category}
          </span>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          {access === 'public' ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-400 font-medium">
              <Globe className="w-3 h-3" /> Public
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 text-[10px] text-sky-400 font-medium">
              <LogIn className="w-3 h-3" /> Free Login
            </span>
          )}
          {isEA && (
            <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 text-[10px] text-orange-400 font-medium">
              <Zap className="w-3 h-3" /> EA Ready
            </span>
          )}
        </div>
      </div>

      {/* Note */}
      {meta?.note && (
        <p className="text-[11px] text-[var(--text-muted)] bg-[var(--bg-hover)] rounded-lg px-3 py-2 leading-relaxed border border-[var(--border)]">
          {meta.note}
        </p>
      )}

      {/* Models */}
      {models.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">Models in catalog</span>
          <div className="flex flex-wrap gap-1.5">
            {models.map((m) => (
              <a
                key={m.id}
                href={m.datasheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--bg-hover)] px-2.5 py-1 text-[11px] text-[var(--text-secondary)] hover:border-emerald-500/40 hover:text-emerald-400 transition-colors"
              >
                <FileText className="w-3 h-3" />
                {m.model}
              </a>
            ))}
            {entries.length > 4 && (
              <span className="inline-flex items-center rounded-lg border border-[var(--border)] bg-[var(--bg-hover)] px-2.5 py-1 text-[11px] text-[var(--text-muted)]">
                +{entries.length - 4} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Quick links */}
      <div className="flex flex-col gap-1.5 mt-auto pt-2 border-t border-[var(--border)]">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">Documentation</span>
        <div className="flex flex-wrap gap-2">
          {datasheetLinks[0] && (
            <a
              href={datasheetLinks[0]}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-hover)] px-3 py-1.5 text-[11px] font-medium text-[var(--text-secondary)] hover:border-emerald-500/40 hover:text-emerald-400 transition-colors"
            >
              <FileText className="w-3.5 h-3.5" /> Datasheets
            </a>
          )}
          {manualLinks[0] && manualLinks[0] !== datasheetLinks[0] && (
            <a
              href={manualLinks[0]}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-hover)] px-3 py-1.5 text-[11px] font-medium text-[var(--text-secondary)] hover:border-emerald-500/40 hover:text-emerald-400 transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5" /> Manuals
            </a>
          )}
          <a
            href={downloadCentre}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-1.5 text-[11px] font-medium text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/50 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Download Centre
          </a>
          <button
            type="button"
            onClick={handleUseComponent}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-medium text-emerald-300 hover:bg-emerald-500/15 transition-colors"
          >
            Use this component
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function BrandDocsHub() {
  const [activeTab, setActiveTab] = useState<SolarComponentCategory | 'All'>('All');
  const [search, setSearch] = useState('');
  const [eaOnly, setEaOnly] = useState(false);

  // Collect unique (brand, category) pairs from the catalog
  const brandCategoryPairs = useMemo(() => {
    const seen = new Set<string>();
    const pairs: { brand: string; category: SolarComponentCategory }[] = [];
    for (const entry of SOLAR_COMPONENT_CATALOG) {
      const key = `${entry.brand}||${entry.category}`;
      if (!seen.has(key)) {
        seen.add(key);
        pairs.push({ brand: entry.brand, category: entry.category });
      }
    }
    return pairs;
  }, []);

  const filtered = useMemo(() => {
    return brandCategoryPairs.filter(({ brand, category }) => {
      const matchesTab = activeTab === 'All' || category === activeTab;
      const q = search.toLowerCase();
      const matchesSearch = !q || brand.toLowerCase().includes(q) ||
        getBrandEntries(brand).some((e) => e.model.toLowerCase().includes(q));
      const matchesEA = !eaOnly || (BRAND_META[brand]?.eastAfricaReady ?? false);
      return matchesTab && matchesSearch && matchesEA;
    });
  }, [brandCategoryPairs, activeTab, search, eaOnly]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { All: brandCategoryPairs.length };
    for (const tab of TABS.slice(1)) {
      c[tab.value] = brandCategoryPairs.filter((p) => p.category === tab.value).length;
    }
    return c;
  }, [brandCategoryPairs]);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Brand Documentation Hub</h2>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            {brandCategoryPairs.length} brands across {SOLAR_COMPONENT_CATALOG.length} catalog entries — direct links to official datasheets and download centres.
          </p>
        </div>
        {/* EA filter */}
        <button
          onClick={() => setEaOnly((v) => !v)}
          className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-all ${
            eaOnly
              ? 'border-orange-500/50 bg-orange-500/10 text-orange-400'
              : 'border-[var(--border)] bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:border-orange-500/30 hover:text-orange-400'
          }`}
        >
          <Zap className="w-4 h-4" />
          East Africa Ready
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
        <input
          type="text"
          placeholder="Search brands or models…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-hover)] pl-10 pr-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
        />
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-all ${
              activeTab === tab.value
                ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                : 'border-[var(--border)] bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:border-emerald-500/30 hover:text-emerald-300'
            }`}
          >
            {tab.label}
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
              activeTab === tab.value ? 'bg-emerald-500/20 text-emerald-300' : 'bg-[var(--bg-card)] text-[var(--text-muted)]'
            }`}>
              {counts[tab.value] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Search className="w-10 h-10 text-[var(--text-muted)] mb-3" />
          <p className="text-[var(--text-secondary)] font-medium">No brands match your filters</p>
          <p className="text-sm text-[var(--text-muted)] mt-1">Try adjusting the search or tab selection.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(({ brand, category }) => (
            <BrandCard key={`${brand}||${category}`} brand={brand} category={category} />
          ))}
        </div>
      )}
    </div>
  );
}
