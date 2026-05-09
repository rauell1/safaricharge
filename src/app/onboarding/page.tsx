'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Building2, Loader2, Phone, UserRound } from 'lucide-react'
import { BrandLogo } from '@/components/brand-logo'
import { ThemeToggle } from '@/components/theme-toggle'

function Field({ id, label, icon, ...props }: any) {
  return (
    <div>
      <label htmlFor={id} style={{ display: 'block', color: 'var(--text-secondary)', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }}>{icon}</div>
        <input id={id} {...props} style={{ width: '100%', background: 'var(--bg-card-muted)', border: '1px solid var(--border)', borderRadius: 10, padding: '11px 14px 11px 42px', color: 'var(--text-primary)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
      </div>
    </div>
  )
}

function OnboardingForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextParam = searchParams.get('next') ?? '/dashboard'
  // Always route new users through site setup before the app.
  const next = `/site-setup?next=${encodeURIComponent(nextParam)}`

  const [fullName, setFullName] = useState('')
  const [organization, setOrganization] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName.trim()) { setError('Please enter your full name.'); return }
    if (!organization.trim()) { setError('Please enter your organisation.'); return }
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/login'); return }

    const res = await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: user.id,
        email: user.email,
        full_name: fullName.trim(),
        organization: organization.trim(),
        phone: phone.trim() || null,
      }),
    })

    if (!res.ok) {
      setError('Could not save your profile. Please try again.')
      setLoading(false)
      return
    }

    router.replace(next)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ marginBottom: 6 }}>
        <h1 style={{ color: 'var(--text-primary)', fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 6, lineHeight: 1.2 }}>
          One last step
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.55 }}>
          Tell us a bit about yourself to personalise your SafariCharge workspace.
        </p>
      </div>

      <Field id="ob-name" label="Full name" type="text" autoComplete="name" placeholder="Jane Njeri" value={fullName} onChange={(e: any) => setFullName(e.target.value)} icon={<UserRound size={15} />} required />
      <Field id="ob-org" label="Organisation" type="text" autoComplete="organization" placeholder="e.g. Kenya Power, KETRACO" value={organization} onChange={(e: any) => setOrganization(e.target.value)} icon={<Building2 size={15} />} required />
      <Field id="ob-phone" label="Phone (optional)" type="tel" autoComplete="tel" placeholder="+254 700 000 000" value={phone} onChange={(e: any) => setPhone(e.target.value)} icon={<Phone size={15} />} />

      {error && <p style={{ color: '#fca5a5', fontSize: 13 }}>{error}</p>}

      <button type="submit" disabled={loading} style={{ width: '100%', background: 'linear-gradient(135deg, #059669, #10b981)', border: 'none', borderRadius: 10, padding: '13px', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 0 28px rgba(16,185,129,0.22)', opacity: loading ? 0.7 : 1 }}>
        {loading ? <><Loader2 style={{ width: 15, height: 15, animation: 'spin 1s linear infinite' }} />Saving…</> : 'Complete setup →'}
      </button>
    </form>
  )
}

export default function OnboardingPage() {
  return (
    <>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      <div style={{ position: 'fixed', inset: 0, background: 'var(--bg-primary)', fontFamily: "'Inter', system-ui, sans-serif", display: 'flex', flexDirection: 'column' }}>
        <div aria-hidden style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(16,185,129,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,0.03) 1px, transparent 1px)', backgroundSize: '64px 64px', pointerEvents: 'none' }} />
        <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 55% 45% at 50% 0%, rgba(16,185,129,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <header style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', padding: '0 24px', height: 60, borderBottom: '1px solid var(--border)' }}>
          <BrandLogo href="/landing" size="sm" />
          <ThemeToggle />
        </header>
        <div style={{ position: 'relative', zIndex: 10, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ width: '100%', maxWidth: 440, borderRadius: 18, border: '1px solid var(--border)', background: 'var(--bg-card-muted)', backdropFilter: 'blur(24px)', boxShadow: '0 32px 80px rgba(0,0,0,0.18)', padding: '32px 28px' }}>
            <Suspense fallback={<div style={{ color: 'var(--text-tertiary)', fontSize: 14 }}>Loading…</div>}>
              <OnboardingForm />
            </Suspense>
          </div>
        </div>
      </div>
    </>
  )
}
