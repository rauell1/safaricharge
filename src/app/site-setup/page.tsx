'use client'

import { Suspense, useState, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { BrandLogo } from '@/components/brand-logo'
import { ThemeToggle } from '@/components/theme-toggle'

// ─── Types ────────────────────────────────────────────────────────────────────

interface LocationOption {
  city: string
  lat: number
  lon: number
}

interface SiteDetails {
  siteName: string
  siteType: 'Residential' | 'Commercial' | 'Industrial' | ''
  gridConnection: 'On-Grid' | 'Off-Grid' | 'Hybrid' | ''
  location: LocationOption | null
}

interface SiteSpecs {
  pvCapacity: string
  batteryStorage: string
  peakLoad: string
  dailyEnergy: string
  evChargers: string
}

// ─── Static data ──────────────────────────────────────────────────────────────

const KENYAN_CITIES: LocationOption[] = [
  { city: 'Nairobi',  lat: -1.2921, lon: 36.8219 },
  { city: 'Mombasa',  lat: -4.0435, lon: 39.6682 },
  { city: 'Kisumu',   lat: -0.0917, lon: 34.7680 },
  { city: 'Nakuru',   lat: -0.3031, lon: 36.0800 },
  { city: 'Eldoret',  lat:  0.5143, lon: 35.2698 },
]

// ─── Shared sub-components ────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ display: 'block', color: 'var(--text-secondary)', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
      {children}
    </span>
  )
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={{ width: '100%', background: 'var(--bg-card-muted)', border: '1px solid var(--border)', borderRadius: 10, padding: '11px 14px', color: 'var(--text-primary)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
    />
  )
}

function NumberInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="number"
      min="0"
      step="any"
      {...props}
      style={{ width: '100%', background: 'var(--bg-card-muted)', border: '1px solid var(--border)', borderRadius: 10, padding: '11px 14px', color: 'var(--text-primary)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
    />
  )
}

function HelperText({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 4, lineHeight: 1.4 }}>
      {children}
    </p>
  )
}

function PillGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: T[]
  value: T | ''
  onChange: (v: T) => void
}) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {options.map((opt) => {
        const active = value === opt
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            style={{
              padding: '8px 16px',
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              border: `1.5px solid ${active ? 'var(--battery)' : 'var(--border)'}`,
              background: active ? 'var(--battery-soft)' : 'transparent',
              color: active ? 'var(--battery)' : 'var(--text-secondary)',
              transition: 'background 0.15s, border-color 0.15s, color 0.15s',
            }}
          >
            {opt}
          </button>
        )
      })}
    </div>
  )
}

// ─── Location search ──────────────────────────────────────────────────────────

function LocationSearch({
  value,
  onChange,
}: {
  value: LocationOption | null
  onChange: (loc: LocationOption | null) => void
}) {
  const [query, setQuery] = useState(value?.city ?? '')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const filtered = query.trim().length === 0
    ? KENYAN_CITIES
    : KENYAN_CITIES.filter((c) => c.city.toLowerCase().startsWith(query.toLowerCase()))

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleSelect(loc: LocationOption) {
    onChange(loc)
    setQuery(loc.city)
    setOpen(false)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value)
    onChange(null)
    setOpen(true)
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <input
        type="text"
        placeholder="Search city…"
        value={query}
        onChange={handleChange}
        onFocus={() => setOpen(true)}
        autoComplete="off"
        style={{ width: '100%', background: 'var(--bg-card-muted)', border: '1px solid var(--border)', borderRadius: 10, padding: '11px 14px', color: 'var(--text-primary)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
      />
      {open && filtered.length > 0 && (
        <ul
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            background: 'var(--bg-card-muted)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            listStyle: 'none',
            margin: 0,
            padding: '4px 0',
            zIndex: 50,
            boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
            overflow: 'hidden',
          }}
        >
          {filtered.map((loc) => (
            <li
              key={loc.city}
              onMouseDown={() => handleSelect(loc)}
              style={{
                padding: '10px 14px',
                cursor: 'pointer',
                color: 'var(--text-primary)',
                fontSize: 14,
                background: value?.city === loc.city ? 'var(--battery-soft)' : 'transparent',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLLIElement).style.background = 'var(--battery-soft)' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLLIElement).style.background = value?.city === loc.city ? 'var(--battery-soft)' : 'transparent' }}
            >
              {loc.city}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ step }: { step: number }) {
  // step is 1 or 2 (step 3 is confirmation, no counter)
  const pct = step === 1 ? 50 : 100
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600 }}>
          Step {step} of 2
        </span>
        <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
          {step === 1 ? 'Site Details' : 'Specifications'}
        </span>
      </div>
      <div style={{ height: 3, background: 'var(--border)', borderRadius: 999, overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background: 'var(--battery)',
            borderRadius: 999,
            transition: 'width 0.35s ease',
          }}
        />
      </div>
    </div>
  )
}

// ─── Summary row helper ───────────────────────────────────────────────────────

function SummaryRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{label}</span>
      <span style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 600, textAlign: 'right', maxWidth: '55%' }}>{value}</span>
    </div>
  )
}

// ─── Main form ────────────────────────────────────────────────────────────────

function SiteSetupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/dashboard'

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [error, setError] = useState('')

  const [details, setDetails] = useState<SiteDetails>({
    siteName: '',
    siteType: '',
    gridConnection: '',
    location: null,
  })

  const [specs, setSpecs] = useState<SiteSpecs>({
    pvCapacity: '',
    batteryStorage: '',
    peakLoad: '',
    dailyEnergy: '',
    evChargers: '0',
  })

  // ── Step 1 submit ────────────────────────────────────────────────────────────

  function handleStep1(e: React.FormEvent) {
    e.preventDefault()
    if (!details.siteName.trim()) { setError('Please enter a site name.'); return }
    if (!details.siteType) { setError('Please select a site type.'); return }
    if (!details.gridConnection) { setError('Please select a grid connection type.'); return }
    if (!details.location) { setError('Please select a location from the list.'); return }
    setError('')
    setStep(2)
  }

  // ── Step 2 submit ────────────────────────────────────────────────────────────

  function handleStep2(e: React.FormEvent) {
    e.preventDefault()
    if (!specs.pvCapacity || Number(specs.pvCapacity) <= 0) { setError('Please enter a valid PV Array Capacity.'); return }
    if (!specs.peakLoad || Number(specs.peakLoad) <= 0) { setError('Please enter a valid Peak Load.'); return }
    if (!specs.dailyEnergy || Number(specs.dailyEnergy) <= 0) { setError('Please enter a valid Daily Energy Consumption.'); return }
    setError('')
    setStep(3)
  }

  // ── Final submit ─────────────────────────────────────────────────────────────

  function handleFinish() {
    const config = {
      siteName: details.siteName.trim(),
      siteType: details.siteType,
      gridConnection: details.gridConnection,
      location: details.location,
      pvCapacity: Number(specs.pvCapacity),
      batteryStorage: Number(specs.batteryStorage) || 0,
      peakLoad: Number(specs.peakLoad),
      dailyEnergy: Number(specs.dailyEnergy),
      evChargers: Number(specs.evChargers) || 0,
    }
    localStorage.setItem('sc_site_config', JSON.stringify(config))
    router.push(next)
  }

  // ── Primary button style ─────────────────────────────────────────────────────

  const primaryBtn: React.CSSProperties = {
    width: '100%',
    background: 'linear-gradient(135deg, #059669, #10b981)',
    border: 'none',
    borderRadius: 10,
    padding: '13px',
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    boxShadow: '0 0 28px rgba(16,185,129,0.22)',
  }

  const secondaryBtn: React.CSSProperties = {
    width: '100%',
    background: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: '12px',
    color: 'var(--text-secondary)',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* ── Step 1: Site Details ── */}
      {step === 1 && (
        <form onSubmit={handleStep1} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <ProgressBar step={1} />

          <div style={{ marginBottom: 2 }}>
            <h1 style={{ color: 'var(--text-primary)', fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 6, lineHeight: 1.2 }}>
              Set up your site
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.55 }}>
              Tell us about the site you want to monitor and manage.
            </p>
          </div>

          {/* Site name */}
          <div>
            <Label>Site name *</Label>
            <TextInput
              id="ss-name"
              type="text"
              placeholder="e.g. Westlands Office Park"
              value={details.siteName}
              onChange={(e) => setDetails((d) => ({ ...d, siteName: e.target.value }))}
              autoComplete="off"
              required
            />
          </div>

          {/* Site type */}
          <div>
            <Label>Site type *</Label>
            <PillGroup
              options={['Residential', 'Commercial', 'Industrial'] as const}
              value={details.siteType}
              onChange={(v) => setDetails((d) => ({ ...d, siteType: v }))}
            />
          </div>

          {/* Grid connection */}
          <div>
            <Label>Grid connection *</Label>
            <PillGroup
              options={['On-Grid', 'Off-Grid', 'Hybrid'] as const}
              value={details.gridConnection}
              onChange={(v) => setDetails((d) => ({ ...d, gridConnection: v }))}
            />
          </div>

          {/* Location */}
          <div>
            <Label>Location *</Label>
            <LocationSearch value={details.location} onChange={(loc) => setDetails((d) => ({ ...d, location: loc }))} />
          </div>

          {error && <p style={{ color: '#fca5a5', fontSize: 13, margin: 0 }}>{error}</p>}

          <button type="submit" style={primaryBtn}>
            Continue →
          </button>
        </form>
      )}

      {/* ── Step 2: Specifications ── */}
      {step === 2 && (
        <form onSubmit={handleStep2} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <ProgressBar step={2} />

          <div style={{ marginBottom: 2 }}>
            <h1 style={{ color: 'var(--text-primary)', fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 6, lineHeight: 1.2 }}>
              Site specifications
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.55 }}>
              Enter your site's electrical capacity and load profile.
            </p>
          </div>

          {/* PV capacity */}
          <div>
            <Label>PV Array Capacity (kWp) *</Label>
            <NumberInput
              placeholder="e.g. 50"
              value={specs.pvCapacity}
              onChange={(e) => setSpecs((s) => ({ ...s, pvCapacity: e.target.value }))}
              required
            />
          </div>

          {/* Battery storage */}
          <div>
            <Label>Battery Storage (kWh)</Label>
            <NumberInput
              placeholder="0 if none"
              value={specs.batteryStorage}
              onChange={(e) => setSpecs((s) => ({ ...s, batteryStorage: e.target.value }))}
            />
          </div>

          {/* Peak load */}
          <div>
            <Label>Peak Load (kW) *</Label>
            <NumberInput
              placeholder="e.g. 30"
              value={specs.peakLoad}
              onChange={(e) => setSpecs((s) => ({ ...s, peakLoad: e.target.value }))}
              required
            />
            <HelperText>Maximum expected power demand</HelperText>
          </div>

          {/* Daily energy */}
          <div>
            <Label>Daily Energy Consumption (kWh/day) *</Label>
            <NumberInput
              placeholder="e.g. 120"
              value={specs.dailyEnergy}
              onChange={(e) => setSpecs((s) => ({ ...s, dailyEnergy: e.target.value }))}
              required
            />
          </div>

          {/* EV chargers */}
          <div>
            <Label>Number of EV Chargers</Label>
            <NumberInput
              placeholder="0"
              value={specs.evChargers}
              onChange={(e) => setSpecs((s) => ({ ...s, evChargers: e.target.value }))}
            />
          </div>

          {error && <p style={{ color: '#fca5a5', fontSize: 13, margin: 0 }}>{error}</p>}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button type="submit" style={primaryBtn}>
              Review summary →
            </button>
            <button type="button" onClick={() => { setError(''); setStep(1) }} style={secondaryBtn}>
              ← Back
            </button>
          </div>
        </form>
      )}

      {/* ── Step 3: Confirmation ── */}
      {step === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ marginBottom: 2 }}>
            <h1 style={{ color: 'var(--text-primary)', fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 6, lineHeight: 1.2 }}>
              Review your site
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.55 }}>
              Everything look good? Hit the button below to go to your dashboard.
            </p>
          </div>

          {/* Details section */}
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
              Site Details
            </p>
            <div style={{ background: 'var(--bg-card-muted)', border: '1px solid var(--border)', borderRadius: 12, padding: '0 14px' }}>
              <SummaryRow label="Site name" value={details.siteName} />
              <SummaryRow label="Site type" value={details.siteType} />
              <SummaryRow label="Grid connection" value={details.gridConnection} />
              <SummaryRow
                label="Location"
                value={details.location
                  ? `${details.location.city} (${details.location.lat.toFixed(4)}, ${details.location.lon.toFixed(4)})`
                  : '—'}
              />
            </div>
          </div>

          {/* Specs section */}
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
              Specifications
            </p>
            <div style={{ background: 'var(--bg-card-muted)', border: '1px solid var(--border)', borderRadius: 12, padding: '0 14px' }}>
              <SummaryRow label="PV Array Capacity" value={`${specs.pvCapacity} kWp`} />
              <SummaryRow label="Battery Storage" value={`${specs.batteryStorage || '0'} kWh`} />
              <SummaryRow label="Peak Load" value={`${specs.peakLoad} kW`} />
              <SummaryRow label="Daily Energy Consumption" value={`${specs.dailyEnergy} kWh/day`} />
              <SummaryRow
                label="EV Chargers"
                value={specs.evChargers || '0'}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button type="button" onClick={handleFinish} style={primaryBtn}>
              Go to Dashboard →
            </button>
            <button type="button" onClick={() => setStep(2)} style={secondaryBtn}>
              ← Edit specifications
            </button>
          </div>
        </div>
      )}

    </div>
  )
}

// ─── Page shell ───────────────────────────────────────────────────────────────

export default function SiteSetupPage() {
  return (
    <>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'var(--bg-primary)',
          fontFamily: "'Inter', system-ui, sans-serif",
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Grid texture */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'linear-gradient(rgba(16,185,129,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,0.03) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
            pointerEvents: 'none',
          }}
        />
        {/* Radial glow */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(ellipse 55% 45% at 50% 0%, rgba(16,185,129,0.12) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        {/* Header */}
        <header
          style={{
            position: 'relative',
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            padding: '0 24px',
            height: 60,
            borderBottom: '1px solid var(--border)',
          }}
        >
          <BrandLogo href="/landing" size="sm" />
          <ThemeToggle />
        </header>

        {/* Card */}
        <div
          style={{
            position: 'relative',
            zIndex: 10,
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            overflowY: 'auto',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 440,
              borderRadius: 18,
              border: '1px solid var(--border)',
              background: 'var(--bg-card-muted)',
              backdropFilter: 'blur(24px)',
              boxShadow: '0 32px 80px rgba(0,0,0,0.18)',
              padding: '32px 28px',
            }}
          >
            <Suspense fallback={<div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Loading…</div>}>
              <SiteSetupForm />
            </Suspense>
          </div>
        </div>
      </div>
    </>
  )
}
