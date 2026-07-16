'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Building2, Loader2, Phone, UserRound } from 'lucide-react'
import {
  AuthShell, authInputCls, authLabelCls, authButtonCls,
} from '@/components/marketing/AuthShell'

function Field({ id, label, icon, ...props }: any) {
  return (
    <div>
      <label htmlFor={id} className={authLabelCls}>
        {label}
      </label>
      <div className="relative">
        <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">{icon}</div>
        <input id={id} {...props} className={authInputCls} />
      </div>
    </div>
  )
}

function OnboardingForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  // Validate the next param to prevent open redirect
  const rawNext = searchParams.get('next') ?? '/dashboard'
  const nextParam = rawNext.startsWith('/') ? rawNext : '/dashboard'
  // New users go through site-setup; returning users skip straight to destination
  const next = `/site-setup?next=${encodeURIComponent(nextParam)}`

  const [fullName, setFullName] = useState('')
  const [organization, setOrganization] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    // If this user already has a complete profile (e.g. existing user caught
    // by the middleware sc_onboarded check), skip the form and go to their
    // destination. The GET /api/profile response also sets sc_onboarded so
    // the middleware won't redirect them again.
    fetch('/api/profile')
      .then(r => r.json())
      .then(data => {
        if (!data.needs_onboarding) {
          router.replace(nextParam)
        } else {
          setChecking(false)
        }
      })
      .catch(() => setChecking(false))
  }, [nextParam, router])

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

  if (checking) {
    return <div className="p-8 text-center text-sm text-[var(--text-tertiary)]">Loading…</div>
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
      <div className="mb-1.5">
        <h1 className="font-display text-[22px] font-bold tracking-[-0.03em] leading-tight mb-1.5 text-[var(--text-primary)]">
          One last step
        </h1>
        <p className="text-[13px] leading-relaxed text-[var(--text-tertiary)]">
          Tell us a bit about yourself to personalise your SafariCharge workspace.
        </p>
      </div>

      <Field id="ob-name" label="Full name" type="text" autoComplete="name" placeholder="Jane Njeri" value={fullName} onChange={(e: any) => setFullName(e.target.value)} icon={<UserRound size={15} />} required />
      <Field id="ob-org" label="Organisation" type="text" autoComplete="organization" placeholder="e.g. Kenya Power, KETRACO" value={organization} onChange={(e: any) => setOrganization(e.target.value)} icon={<Building2 size={15} />} required />
      <Field id="ob-phone" label="Phone (optional)" type="tel" autoComplete="tel" placeholder="+254 700 000 000" value={phone} onChange={(e: any) => setPhone(e.target.value)} icon={<Phone size={15} />} />

      {error && <p className="text-[13px] text-[var(--alert)]">{error}</p>}

      <button type="submit" disabled={loading} className={authButtonCls}>
        {loading ? <><Loader2 className="h-[15px] w-[15px] animate-spin" />Saving…</> : 'Complete setup →'}
      </button>
    </form>
  )
}

export default function OnboardingPage() {
  return (
    <AuthShell>
      <Suspense fallback={<div className="text-sm text-[var(--text-tertiary)]">Loading…</div>}>
        <OnboardingForm />
      </Suspense>
    </AuthShell>
  )
}
