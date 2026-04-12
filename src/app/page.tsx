'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

// ─────────────────────────────────────────────────────────────────────────────
// SafariCharge Landing Page
// Art direction: East African off-grid solar → warm, grounded, technical.
// Palette:  deep forest green (#0a4a3a) primary, warm sand (#f5f0e8) base,
//           amber (#e8920a) accent.
// Typography: display → "Plus Jakarta Sans" (bold, confident)
//             body    → "Inter" (clean, legible)
// ─────────────────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="4"/>
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
      </svg>
    ),
    title: 'Live PV Monitoring',
    body: 'Real-time solar irradiance, panel output, and inverter health — updated every 5 seconds via MQTT or Modbus.',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2"/>
        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
        <line x1="12" y1="12" x2="12" y2="16"/>
        <line x1="10" y1="14" x2="14" y2="14"/>
      </svg>
    ),
    title: 'Battery Intelligence',
    body: 'State of charge, cycle counting, and degradation forecasting for LiFePO₄, NMC, and lead-acid banks.',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
    title: 'ML Load Forecasting',
    body: '48-hour PV yield and load predictions with confidence bands — powered by a Gradient Boosting model trained on Nairobi solar data.',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
    title: 'Engineering KPIs',
    body: 'Specific yield, performance ratio, capacity factor, and self-sufficiency — the metrics your bankability reports demand.',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"/>
        <line x1="12" y1="20" x2="12" y2="4"/>
        <line x1="6"  y1="20" x2="6"  y2="14"/>
      </svg>
    ),
    title: 'Scenario Comparison',
    body: 'Model different battery sizes, PV arrays, and tariff structures side by side before committing capital.',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
    title: 'AI Assistant',
    body: 'Ask plain-language questions about your system. Powered by Gemini — gets to the point, no jargon.',
  },
];

const METRICS = [
  { value: '1 400', unit: 'kWh/kWp', label: 'Nairobi specific yield' },
  { value: '90', unit: '%', label: 'Target performance ratio' },
  { value: '<5 s', unit: '', label: 'Live data refresh' },
  { value: '48 h', unit: '', label: 'Forecast horizon' },
];

// Minimal animated counter hook
function useCounter(target: number, duration = 1200, started = false) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!started) return;
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setVal(Math.round(p * target));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, started]);
  return val;
}

function MetricCard({ value, unit, label }: { value: string; unit: string; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.4 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  // Only animate purely numeric values
  const numeric = /^[\d,]+$/.test(value.replace(',', ''));
  const target  = numeric ? parseInt(value.replace(',', ''), 10) : 0;
  const count   = useCounter(target, 1200, visible && numeric);
  const display = numeric ? count.toLocaleString() : value;

  return (
    <div ref={ref} style={styles.metricCard}>
      <span style={styles.metricValue}>{display}<span style={styles.metricUnit}>{unit}</span></span>
      <span style={styles.metricLabel}>{label}</span>
    </div>
  );
}

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <style>{CSS}</style>

      {/* ─── Nav ──────────────────────────────────────────────────────── */}
      <nav style={styles.nav}>
        <div style={styles.navInner}>
          {/* Use Next.js Link for internal navigation */}
          <Link href="/" style={styles.navLogo} aria-label="SafariCharge home">
            {/* Inline SVG wordmark */}
            <svg width="160" height="32" viewBox="0 0 160 32" fill="none" aria-hidden="true">
              {/* Sun mark */}
              <circle cx="14" cy="16" r="5" fill="#e8920a"/>
              <line x1="14" y1="7"  x2="14" y2="9"  stroke="#e8920a" strokeWidth="2" strokeLinecap="round"/>
              <line x1="14" y1="23" x2="14" y2="25" stroke="#e8920a" strokeWidth="2" strokeLinecap="round"/>
              <line x1="7"  y1="16" x2="5"  y2="16" stroke="#e8920a" strokeWidth="2" strokeLinecap="round"/>
              <line x1="23" y1="16" x2="21" y2="16" stroke="#e8920a" strokeWidth="2" strokeLinecap="round"/>
              <line x1="9.1" y1="11.1" x2="7.7" y2="9.7"  stroke="#e8920a" strokeWidth="2" strokeLinecap="round"/>
              <line x1="20.3" y1="22.3" x2="18.9" y2="20.9" stroke="#e8920a" strokeWidth="2" strokeLinecap="round"/>
              <line x1="9.1" y1="20.9" x2="7.7" y2="22.3"  stroke="#e8920a" strokeWidth="2" strokeLinecap="round"/>
              <line x1="20.3" y1="9.7" x2="18.9" y2="11.1" stroke="#e8920a" strokeWidth="2" strokeLinecap="round"/>
              {/* Wordmark */}
              <text x="30" y="21" fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="700" fontSize="16" fill="#0a4a3a" letterSpacing="-0.3">SafariCharge</text>
            </svg>
          </Link>

          <div style={{ ...styles.navLinks, display: menuOpen ? 'flex' : undefined }} className="nav-links">
            <a href="#features" style={styles.navLink} onClick={() => setMenuOpen(false)}>Features</a>
            <a href="#metrics"  style={styles.navLink} onClick={() => setMenuOpen(false)}>Performance</a>
            <a href="#how"      style={styles.navLink} onClick={() => setMenuOpen(false)}>How it works</a>
            <Link href="/dashboard" style={styles.navCta}>Open dashboard →</Link>
          </div>

          <button
            style={styles.hamburger}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(v => !v)}
          >
            {menuOpen
              ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
            }
          </button>
        </div>
      </nav>

      <main>
        {/* ─── Hero ───────────────────────────────────────────────────── */}
        <section style={styles.hero}>
          {/* Subtle radial gradient orb — one, behind the text, no blobs */}
          <div style={styles.heroOrb} aria-hidden="true"/>

          <div style={styles.heroContent}>
            <span style={styles.heroEyebrow}>Solar monitoring for East Africa</span>
            <h1 style={styles.heroTitle}>
              Every watt,<br />
              <span style={styles.heroAccent}>accounted for.</span>
            </h1>
            <p style={styles.heroBody}>
              SafariCharge gives solar engineers and project developers a real-time
              window into off-grid PV systems — from panel to battery to load — with
              the forecasting and KPI analytics that bankability reports demand.
            </p>
            <div style={styles.heroCtas}>
              <Link href="/dashboard" style={styles.ctaPrimary}>Open the demo dashboard</Link>
              <a href="#features" style={styles.ctaSecondary}>See features</a>
            </div>
          </div>

          {/* Dashboard preview card */}
          <div style={styles.heroCard} aria-hidden="true">
            <div style={styles.heroCardInner}>
              <div style={styles.heroCardHeader}>
                <span style={styles.heroDot} /><span style={styles.heroDot} /><span style={styles.heroDot} />
                <span style={styles.heroCardTitle}>Live overview</span>
              </div>
              {/* Mini stat rows */}
              {[
                { label: 'PV Output',     val: '4.2 kW',  color: '#e8920a', w: '78%' },
                { label: 'Battery SOC',   val: '87 %',    color: '#0a4a3a', w: '87%' },
                { label: 'Load',          val: '1.8 kW',  color: '#4a7c59', w: '42%' },
                { label: 'Grid export',   val: '2.4 kW',  color: '#2d6a9f', w: '56%' },
              ].map(row => (
                <div key={row.label} style={styles.heroStat}>
                  <span style={styles.heroStatLabel}>{row.label}</span>
                  <div style={styles.heroBar}>
                    <div style={{ ...styles.heroBarFill, width: row.w, background: row.color }} />
                  </div>
                  <span style={styles.heroStatVal}>{row.val}</span>
                </div>
              ))}
              {/* Mini sparkline SVG */}
              <svg width="100%" height="56" viewBox="0 0 280 56" preserveAspectRatio="none" style={{ marginTop: '12px', opacity: 0.85 }}>
                <polyline
                  points="0,50 30,38 60,28 90,20 120,14 150,18 180,12 210,22 240,30 280,24"
                  fill="none" stroke="#e8920a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                />
                <polyline
                  points="0,50 30,48 60,44 90,42 120,40 150,44 180,46 210,42 240,44 280,40"
                  fill="none" stroke="#0a4a3a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 3"
                />
              </svg>
              <div style={styles.heroLegend}>
                <span style={{ color: '#e8920a' }}>&#9644; PV yield</span>
                <span style={{ color: '#0a4a3a' }}>&#9644; Load</span>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Metrics strip ────────────────────────────────────────────── */}
        <section id="metrics" style={styles.metricsSection}>
          <div style={styles.container}>
            <div style={styles.metricsGrid}>
              {METRICS.map(m => <MetricCard key={m.label} {...m} />)}
            </div>
          </div>
        </section>

        {/* ─── Features ─────────────────────────────────────────────── */}
        <section id="features" style={styles.featuresSection}>
          <div style={styles.container}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>Built for solar engineers,<br/>not spreadsheet warriors.</h2>
              <p style={styles.sectionSub}>
                Every feature is driven by what field engineers and project finance teams
                actually need to commission, operate, and report on off-grid PV systems.
              </p>
            </div>
            <div style={styles.featuresGrid}>
              {FEATURES.map(f => (
                <div key={f.title} style={styles.featureCard}>
                  <div style={styles.featureIcon}>{f.icon}</div>
                  <h3 style={styles.featureTitle}>{f.title}</h3>
                  <p  style={styles.featureBody}>{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── How it works ─────────────────────────────────────────── */}
        <section id="how" style={styles.howSection}>
          <div style={styles.container}>
            <h2 style={{ ...styles.sectionTitle, textAlign: 'center', marginBottom: '48px' }}>From inverter to insight in minutes.</h2>
            <div style={styles.howSteps}>
              {[
                { n: '01', title: 'Connect your hardware', body: 'Point the IoT bridge at your MQTT broker or Modbus TCP address. Supports Growatt, Victron, SolarEdge, and any standard Modbus device.' },
                { n: '02', title: 'Data flows automatically', body: 'Readings land in the PostgreSQL time-series store every 5 seconds. The dashboard updates live — no refresh needed.' },
                { n: '03', title: 'Forecast and optimise', body: 'The ML service generates 48-hour PV yield and load forecasts. Run scenario comparisons to size your next battery or array upgrade.' },
                { n: '04', title: 'Export for bankability', body: 'Download IEC 61724 KPI reports as PDF or CSV. Share a read-only link with lenders, EPC contractors, or operations teams.' },
              ].map(step => (
                <div key={step.n} style={styles.howStep}>
                  <span style={styles.howNum}>{step.n}</span>
                  <h3 style={styles.howTitle}>{step.title}</h3>
                  <p  style={styles.howBody}>{step.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── CTA band ──────────────────────────────────────────────── */}
        <section style={styles.ctaBand}>
          <div style={{ ...styles.container, textAlign: 'center' }}>
            <h2 style={styles.ctaBandTitle}>Ready to see your system?</h2>
            <p  style={styles.ctaBandSub}>The demo dashboard runs on simulated Nairobi data. No sign-up, no hardware required.</p>
            <Link href="/dashboard" style={styles.ctaPrimaryLarge}>Open the dashboard →</Link>
          </div>
        </section>
      </main>

      {/* ─── Footer ──────────────────────────────────────────────────── */}
      <footer style={styles.footer}>
        <div style={{ ...styles.container, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <span style={{ color: '#6b7280', fontSize: '14px' }}>© 2026 SafariCharge. Built for East African off-grid solar.</span>
          <div style={{ display: 'flex', gap: '24px' }}>
            <Link href="/dashboard" style={styles.footerLink}>Dashboard</Link>
            <a href="mailto:hello@safaricharge.io" style={styles.footerLink}>Contact</a>
          </div>
        </div>
      </footer>
    </>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────────────────
const C = {
  bg:        '#f5f0e8',   // warm sand
  surface:   '#faf9f5',
  green:     '#0a4a3a',   // deep forest green
  greenMid:  '#1a6b52',
  greenLight:'#4a7c59',
  amber:     '#e8920a',
  amberLight:'#f5b849',
  text:      '#1a1a1a',
  muted:     '#5a5a5a',
  faint:     '#9a9a9a',
  border:    'rgba(10,74,58,0.1)',
};

const styles: Record<string, React.CSSProperties> = {
  // Nav
  nav: { position: 'sticky', top: 0, zIndex: 100, background: `${C.bg}ee`, backdropFilter: 'blur(12px)', borderBottom: `1px solid ${C.border}` },
  navInner: { maxWidth: '1200px', margin: '0 auto', padding: '0 24px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' },
  navLogo: { textDecoration: 'none', flexShrink: 0 },
  navLinks: { display: 'flex', alignItems: 'center', gap: '32px' },
  navLink: { textDecoration: 'none', color: C.muted, fontSize: '15px', fontWeight: 500 },
  navCta: { textDecoration: 'none', background: C.green, color: '#fff', padding: '8px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: 600 },
  hamburger: { display: 'none', background: 'none', border: 'none', cursor: 'pointer', color: C.text, padding: '4px' },

  // Hero
  hero: { minHeight: 'calc(100vh - 64px)', display: 'flex', alignItems: 'center', gap: '64px', maxWidth: '1200px', margin: '0 auto', padding: '80px 24px', flexWrap: 'wrap', position: 'relative', overflow: 'hidden' },
  heroOrb: { position: 'absolute', top: '-100px', left: '-80px', width: '500px', height: '500px', borderRadius: '50%', background: `radial-gradient(circle, ${C.amber}18 0%, transparent 70%)`, pointerEvents: 'none' },
  heroContent: { flex: '1 1 400px', maxWidth: '560px' },
  heroEyebrow: { display: 'inline-block', background: `${C.amber}22`, color: C.amber, fontSize: '13px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '4px 12px', borderRadius: '100px', marginBottom: '20px' },
  heroTitle: { fontSize: 'clamp(2.4rem, 5vw, 4rem)', fontWeight: 800, lineHeight: 1.1, color: C.text, marginBottom: '20px', fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.02em' },
  heroAccent: { color: C.green },
  heroBody: { fontSize: '17px', lineHeight: 1.7, color: C.muted, marginBottom: '36px', maxWidth: '52ch' },
  heroCtas: { display: 'flex', gap: '16px', flexWrap: 'wrap' },
  ctaPrimary: { textDecoration: 'none', background: C.green, color: '#fff', padding: '14px 28px', borderRadius: '10px', fontSize: '15px', fontWeight: 600 },
  ctaSecondary: { textDecoration: 'none', color: C.green, padding: '14px 20px', fontSize: '15px', fontWeight: 500 },

  // Hero card
  heroCard: { flex: '1 1 320px', maxWidth: '440px' },
  heroCardInner: { background: C.surface, border: `1px solid ${C.border}`, borderRadius: '16px', padding: '24px', boxShadow: '0 8px 32px rgba(10,74,58,0.1)' },
  heroCardHeader: { display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '20px' },
  heroDot: { width: '10px', height: '10px', borderRadius: '50%', background: C.border, display: 'inline-block' },
  heroCardTitle: { marginLeft: '8px', fontSize: '12px', fontWeight: 600, color: C.muted, letterSpacing: '0.06em', textTransform: 'uppercase' },
  heroStat: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' },
  heroStatLabel: { fontSize: '12px', color: C.muted, width: '80px', flexShrink: 0 },
  heroBar: { flex: 1, height: '6px', background: `${C.green}15`, borderRadius: '3px', overflow: 'hidden' },
  heroBarFill: { height: '100%', borderRadius: '3px', transition: 'width 1s ease' },
  heroStatVal: { fontSize: '12px', fontWeight: 600, color: C.text, width: '52px', textAlign: 'right', flexShrink: 0 },
  heroLegend: { display: 'flex', gap: '16px', fontSize: '11px', marginTop: '4px', color: C.muted },

  // Metrics
  metricsSection: { background: C.green, padding: '48px 24px' },
  metricsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0', maxWidth: '1200px', margin: '0 auto' },
  metricCard: { padding: '24px 32px', borderRight: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: '4px' },
  metricValue: { fontSize: 'clamp(2rem, 4vw, 2.8rem)', fontWeight: 800, color: '#fff', fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1, fontVariantNumeric: 'tabular-nums' },
  metricUnit: { fontSize: '1rem', fontWeight: 500, marginLeft: '4px', color: C.amberLight },
  metricLabel: { fontSize: '13px', color: 'rgba(255,255,255,0.65)', marginTop: '4px' },

  // Features
  featuresSection: { padding: 'clamp(64px, 8vw, 120px) 24px', background: C.surface },
  sectionHeader: { maxWidth: '680px', marginBottom: '64px' },
  sectionTitle: { fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)', fontWeight: 800, color: C.text, fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1.15, marginBottom: '16px', letterSpacing: '-0.02em' },
  sectionSub: { fontSize: '17px', lineHeight: 1.7, color: C.muted },
  featuresGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '2px', background: C.border },
  featureCard: { background: C.surface, padding: '36px 32px', transition: 'background 200ms' },
  featureIcon: { color: C.green, marginBottom: '16px' },
  featureTitle: { fontSize: '17px', fontWeight: 700, color: C.text, marginBottom: '8px', fontFamily: "'Plus Jakarta Sans', sans-serif" },
  featureBody: { fontSize: '15px', lineHeight: 1.65, color: C.muted },

  // How it works
  howSection: { padding: 'clamp(64px, 8vw, 120px) 24px', background: C.bg },
  howSteps: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '40px' },
  howStep: { display: 'flex', flexDirection: 'column', gap: '10px' },
  howNum: { fontSize: '13px', fontWeight: 700, color: C.amber, letterSpacing: '0.1em' },
  howTitle: { fontSize: '17px', fontWeight: 700, color: C.text, fontFamily: "'Plus Jakarta Sans', sans-serif" },
  howBody: { fontSize: '15px', lineHeight: 1.65, color: C.muted },

  // CTA band
  ctaBand: { background: `linear-gradient(135deg, ${C.green} 0%, ${C.greenMid} 100%)`, padding: 'clamp(64px, 8vw, 100px) 24px' },
  ctaBandTitle: { fontSize: 'clamp(1.8rem, 3.5vw, 2.6rem)', fontWeight: 800, color: '#fff', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '16px', letterSpacing: '-0.02em' },
  ctaBandSub: { fontSize: '17px', color: 'rgba(255,255,255,0.75)', marginBottom: '36px' },
  ctaPrimaryLarge: { textDecoration: 'none', display: 'inline-block', background: C.amber, color: '#fff', padding: '16px 36px', borderRadius: '10px', fontSize: '16px', fontWeight: 700 },

  // Footer
  footer: { borderTop: `1px solid ${C.border}`, padding: '24px', background: C.bg },
  footerLink: { textDecoration: 'none', color: C.muted, fontSize: '14px' },

  // Shared
  container: { maxWidth: '1200px', margin: '0 auto' },
};

// Responsive CSS injected as a <style> tag
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600&display=swap');
  body { font-family: 'Inter', sans-serif; background: #f5f0e8; margin: 0; }
  *, *::before, *::after { box-sizing: border-box; }
  a { transition: opacity 150ms; }
  a:hover { opacity: 0.8; }
  .nav-links { display: flex !important; }
  @media (max-width: 768px) {
    .nav-links {
      display: none !important;
      position: absolute;
      top: 64px;
      left: 0;
      right: 0;
      background: #f5f0e8;
      flex-direction: column !important;
      padding: 16px 24px 24px;
      gap: 16px !important;
      border-bottom: 1px solid rgba(10,74,58,0.1);
      z-index: 99;
    }
    .nav-links[style*='flex'] { display: flex !important; }
  }
  @media (max-width: 768px) {
    button[aria-label='Open menu'], button[aria-label='Close menu'] { display: flex !important; align-items: center; }
  }
`;
