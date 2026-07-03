'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import {
  HelpCircle, X, ChevronDown, ChevronRight, Sparkles,
  Zap, Battery, Sun, Cable, Landmark, FileText, Cpu,
} from 'lucide-react';
import { useModalRoot } from '@/hooks/useModalRoot';

interface HelpTopic {
  id: string;
  icon: React.ElementType;
  title: string;
  body: React.ReactNode;
}

const TOPICS: HelpTopic[] = [
  {
    id: 'quick-start',
    icon: Sparkles,
    title: 'Quick start - sizing a system in 4 steps',
    body: (
      <ol className="list-decimal list-inside space-y-1.5">
        <li><strong>Pick a location</strong> at the top. This sets sun hours and the grid tariff used for savings.</li>
        <li><strong>Set your target size</strong> in Section A. Use Direct kW if you already know the size, or Load-Based to derive it from daily consumption and peak load.</li>
        <li><strong>Choose hardware</strong> in Sections B-D: inverter brand and voltage class, panel wattage, and battery capacity. Everything else auto-calculates.</li>
        <li><strong>Read the results</strong> on the right: payback, NPV, IRR, the full bill of materials, and a client-ready PDF proposal.</li>
      </ol>
    ),
  },
  {
    id: 'architecture',
    icon: Cpu,
    title: 'Hybrid vs Microinverter - which architecture?',
    body: (
      <div className="space-y-2">
        <p><strong>Hybrid / Grid-Tied / Off-Grid</strong> uses one central inverter. Choose Hybrid (LV or HV) when you want battery backup, Grid-Tied when you only want cheaper daytime power with no battery, and Off-Grid for sites without a reliable grid connection.</p>
        <p><strong>Microinverter (AC-coupled)</strong> puts a small inverter behind every 2 panels - no central inverter, no battery. Best for small rooftops with shading, or phased installations. A project uses one architecture or the other, never both.</p>
      </div>
    ),
  },
  {
    id: 'voltage-class',
    icon: Zap,
    title: 'LV vs HV vs Grid-Tied inverters',
    body: (
      <div className="space-y-2">
        <p><strong>LV (48V)</strong> suits systems up to about 16 kW. Batteries connect in parallel on a 48V bus - simple and widely supported.</p>
        <p><strong>HV (150-850V)</strong> is recommended above 10-15 kW and for all commercial systems. Battery modules stack in series, which reduces conversion losses.</p>
        <p><strong>Grid-Tied</strong> has no battery port at all - PV feeds the grid or your loads directly. Cheapest option per kW, but no backup during outages.</p>
      </div>
    ),
  },
  {
    id: 'battery',
    icon: Battery,
    title: 'How battery sizing works',
    body: (
      <div className="space-y-2">
        <p>The battery section follows your inverter choice automatically: LV inverters use <strong>Dyness DL5.0 modules in parallel</strong> (5.12 kWh each, max 40 units); HV inverters use <strong>Stack100</strong> (5.12 kWh/module) or <strong>Stack280</strong> (14.3 kWh/module) towers of 3-15 modules.</p>
        <p>In Load-Based mode the suggested capacity = essential outage load x backup hours / 90% usable depth of discharge, so the usable energy - not just the nameplate - covers your outage.</p>
        <p>The voltage check confirms the tower voltage sits inside your inverter&apos;s battery window (for example 160-800V on large Deye units).</p>
      </div>
    ),
  },
  {
    id: 'pv',
    icon: Sun,
    title: 'PV array and the DC/AC ratio',
    body: (
      <div className="space-y-2">
        <p>The target array = inverter AC capacity x the DC/AC oversize ratio (typically 1.2-1.4). Oversizing improves energy yield because panels rarely produce their full nameplate rating.</p>
        <p>The tool warns you if the array would exceed the inverter&apos;s maximum PV input, and checks the cold-morning string voltage against the MPPT window.</p>
      </div>
    ),
  },
  {
    id: 'financials',
    icon: Landmark,
    title: 'Understanding the financial results',
    body: (
      <div className="space-y-2">
        <p><strong>Simple payback</strong>: years until raw savings repay the investment. Under 6 years is strong for commercial solar in Kenya.</p>
        <p><strong>NPV</strong>: total wealth created after discounting future savings. Any value above zero beats your discount rate.</p>
        <p><strong>IRR</strong>: the annualized return - compare it to T-bills or your business hurdle rate.</p>
        <p><strong>LCOE</strong>: the true lifetime cost per kWh produced. It must beat the grid tariff for the project to make sense.</p>
        <p>Savings are modeled per the engineering workbook: annual generation = PV kWp x specific yield x 365, valued at the blended tariff for the share you self-consume, escalating 6%/year, with panel degradation and a battery replacement in year 11.</p>
      </div>
    ),
  },
  {
    id: 'cables',
    icon: Cable,
    title: 'Cable sizing and engineering checks',
    body: (
      <p>
        Every circuit (PV string, DC main, AC output, battery interconnect) is sized to IEC 60364-5-52 by both ampacity and voltage drop, with derating for the installation method and ambient temperature. The results feed real cable prices into the bill of materials - a 5 kW and a 200 kW system genuinely need different copper.
      </p>
    ),
  },
  {
    id: 'proposal',
    icon: FileText,
    title: 'Generating a client proposal',
    body: (
      <p>
        Once the results look right, use the <strong>Generate Bankable PDF Proposal</strong> button at the bottom of the results. It produces a plain-language summary with the system configuration, itemized pricing including 16% VAT, and the financial case - ready to print or save as PDF for your client.
      </p>
    ),
  },
];

function TopicRow({ topic }: { topic: HelpTopic }) {
  const [open, setOpen] = useState(false);
  const Icon = topic.icon;
  return (
    <div className="border border-[var(--border)] rounded-xl overflow-hidden bg-[var(--bg-card)]">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--bg-card-muted)] transition-colors"
      >
        <span className="w-7 h-7 rounded-lg bg-[var(--battery-soft)] text-[var(--battery)] flex items-center justify-center shrink-0">
          <Icon className="w-3.5 h-3.5" />
        </span>
        <span className="text-sm font-semibold text-[var(--text-primary)] flex-1">{topic.title}</span>
        {open ? <ChevronDown className="w-4 h-4 text-[var(--text-tertiary)] shrink-0" /> : <ChevronRight className="w-4 h-4 text-[var(--text-tertiary)] shrink-0" />}
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 text-xs text-[var(--text-secondary)] leading-relaxed border-t border-[var(--border)]">
          <div className="pt-3">{topic.body}</div>
        </div>
      )}
    </div>
  );
}

export default function HelpPanel() {
  const [open, setOpen] = useState(false);
  const modalRoot = useModalRoot();

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  return (
    <>
      {/* Floating help button - icon-only on mobile to minimize overlap with page content */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Open help and guidance"
        className="fixed bottom-5 right-4 sm:bottom-6 sm:right-6 z-40 flex items-center gap-2 rounded-full bg-[var(--battery)] text-white w-11 h-11 sm:w-auto sm:h-auto sm:pl-4 sm:pr-5 sm:py-3 justify-center text-sm font-semibold shadow-lg shadow-emerald-600/25 hover:bg-emerald-700 active:scale-95 transition-all"
      >
        <HelpCircle className="w-4 h-4 shrink-0" />
        <span className="hidden sm:inline">Help</span>
      </button>

      {open && modalRoot && createPortal(
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Sizing engine help">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40" onClick={close} />

          {/* Slide-over panel */}
          <div className="absolute right-0 top-0 h-full w-full max-w-md bg-[var(--bg-primary)] shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] bg-[var(--bg-card)]">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-[var(--battery-soft)] text-[var(--battery)] flex items-center justify-center">
                  <HelpCircle className="w-4 h-4" />
                </span>
                <div>
                  <h2 className="text-sm font-bold text-[var(--text-primary)]">Help & Guidance</h2>
                  <p className="text-[10px] text-[var(--text-muted)]">Parametric Sizing Engine</p>
                </div>
              </div>
              <button
                onClick={close}
                aria-label="Close help"
                className="w-8 h-8 rounded-lg bg-[var(--bg-card-muted)] hover:bg-[var(--border)] text-[var(--text-secondary)] flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              <p className="text-xs text-[var(--text-tertiary)] leading-relaxed">
                Size a solar hybrid system from 1 kW to 400 kW+ using live Kenya hardware pricing. Pick a topic below, or ask the AI assistant for tailored direction.
              </p>

              {TOPICS.map((t) => <TopicRow key={t.id} topic={t} />)}

              {/* AI assistance CTA */}
              <div className="rounded-xl border border-[var(--battery)]/20 bg-[var(--battery-soft)] p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[var(--battery)]" />
                  <span className="text-sm font-bold text-[var(--battery)]">Still stuck? Ask for direction</span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  The SafariCharge AI assistant can recommend a system size for your site, explain any metric on this page, and compare hardware options.
                </p>
                <Link
                  href="/ai-assistant"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--battery)] px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Open AI Assistant
                </Link>
              </div>
            </div>
          </div>
        </div>,
        modalRoot,
      )}
    </>
  );
}
