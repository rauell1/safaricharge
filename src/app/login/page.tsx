'use client'

import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, CheckCircle2, Loader2, LockKeyhole, Mail, UserRound, Building2, Phone } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'

type OAuthProvider = 'google' | 'azure'
type Mode = 'signin' | 'register' | 'magic'
type MagicState = 'idle' | 'loading' | 'sent'

const MAGIC_LINK_COOLDOWN_SECONDS = 60

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

function MicrosoftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="1" y="1" width="10.5" height="10.5" fill="#F25022"/>
      <rect x="12.5" y="1" width="10.5" height="10.5" fill="#7FBA00"/>
      <rect x="1" y="12.5" width="10.5" height="10.5" fill="#00A4EF"/>
      <rect x="12.5" y="12.5" width="10.5" height="10.5" fill="#FFB900"/>
    </svg>
  )
}

function Divider() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '6px 0' }}>
      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
      <span style={{ color: 'rgba(255,255,255,0.26)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' }}>or continue with</span>
      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
    </div>
  )
}

function Field({ id, label, icon, ...props }: any) {
  return (
    <div>
      <label htmlFor={id} style={{ display: 'block', color: 'rgba(255,255,255,0.44)', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.28)' }}>{icon}</div>
        <input
          id={id}
          {...props}
          style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.11)', borderRadius: 12, padding: '12px 14px 12px 42px', color: '#e2e8f0', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
        />
      </div>
    </div>
  )
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = useMemo(() => searchParams.get('next') ?? '/dashboard', [searchParams])
  const initialReason = searchParams.get('reason')
  const initialError = useMemo(() => {
    const errorParam = searchParams.get('error')
    if (initialReason === 'session_expired') return 'Your session expired after 15 minutes. Please sign in again.'
    if (errorParam === 'auth_failed') return 'We could not verify your sign-in request. Please try again.'
    if (errorParam === 'profile_upsert_failed') return 'We signed you in, but could not save your profile details. Please retry.'
    return ''
  }, [searchParams, initialReason])

  const [mode, setMode] = useState<Mode>('signin')
  const [error, setError] = useState(initialError)
  const [success, setSuccess] = useState('')
  const [oauthLoading, setOauthLoading] = useState<OAuthProvider | null>(null)
  const [magicState, setMagicState] = useState<MagicState>('idle')
  const [cooldown, setCooldown] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [organization, setOrganization] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (cooldown <= 0) {
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }
    timerRef.current = setInterval(() => setCooldown(c => c - 1), 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [cooldown])

  const resetMessages = () => {
    setError('')
    setSuccess('')
  }

  const handleOAuth = async (provider: OAuthProvider) => {
    resetMessages()
    setOauthLoading(provider)
    const supabase = createClient()
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
        scopes: provider === 'azure' ? 'openid email profile' : undefined,
      },
    })
    if (oauthError) {
      setError(oauthError.message || `Failed to sign in with ${provider}. Please try again.`)
      setOauthLoading(null)
    }
  }

  const handlePasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    resetMessages()
    setLoading(true)
    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
    if (signInError) {
      setError(signInError.message || 'Unable to sign in with email and password.')
      setLoading(false)
      return
    }
    router.replace(nextPath)
    router.refresh()
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    resetMessages()
    if (!fullName.trim() || !organization.trim() || !phone.trim()) {
      setError('Please complete your professional profile details before creating your account.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    const supabase = createClient()
    const normalizedEmail = email.trim().toLowerCase()
    const { error: signUpError } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          phone: phone.trim(),
          organization: organization.trim(),
        },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
      },
    })

    if (signUpError) {
      setError(signUpError.message || 'Unable to create your account right now.')
      setLoading(false)
      return
    }

    const { error: profileError } = await supabase.from('profiles').upsert({
      id: (await supabase.auth.getUser()).data.user?.id,
      email: normalizedEmail,
      full_name: fullName.trim(),
      phone: phone.trim(),
      organization: organization.trim(),
      subscription_status: 'inactive',
      plan: 'free',
    }, { onConflict: 'id', ignoreDuplicates: false })

    if (profileError) {
      setError('Account created, but we could not save your profile details. Please sign in and retry.')
      setLoading(false)
      return
    }

    setSuccess('Your account has been created successfully. You can now sign in with your email and password.')
    setMode('signin')
    setPassword('')
    setConfirmPassword('')
    setLoading(false)
  }

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    if (cooldown > 0) return
    resetMessages()
    setMagicState('loading')
    const supabase = createClient()
    const normalizedEmail = email.trim().toLowerCase()
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
        shouldCreateUser: true,
        data: {
          full_name: fullName.trim() || undefined,
          phone: phone.trim() || undefined,
          organization: organization.trim() || undefined,
        },
      },
    })
    if (otpError) {
      setError(otpError.message || 'Failed to send login link. Please try again.')
      setMagicState('idle')
      return
    }
    setMagicState('sent')
    setCooldown(MAGIC_LINK_COOLDOWN_SECONDS)
  }

  const primaryButton: React.CSSProperties = {
    width: '100%', background: '#10b981', border: 'none', borderRadius: 12, padding: '13px', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 0 32px rgba(16,185,129,0.24)',
  }

  const secondaryButton: React.CSSProperties = {
    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '12px', fontSize: 14, fontWeight: 500, cursor: 'pointer', background: 'rgba(255,255,255,0.04)', color: '#e2e8f0',
  }

  return (
    <>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ color: '#f0fdf8', fontSize: 26, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 6, lineHeight: 1.2 }}>
          Secure access to SafariCharge
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.48)', fontSize: 14, lineHeight: 1.55 }}>
          Sign in to continue to the renewable energy intelligence workspace. Sessions automatically expire after 15 minutes for security.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
        {['signin', 'register', 'magic'].map((tab) => (
          <button
            key={tab}
            onClick={() => { setMode(tab as Mode); resetMessages() }}
            style={{ borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', padding: '10px 8px', fontSize: 12, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', background: mode === tab ? 'rgba(16,185,129,0.16)' : 'rgba(255,255,255,0.03)', color: mode === tab ? '#d1fae5' : 'rgba(255,255,255,0.45)' }}
          >
            {tab === 'signin' ? 'Sign in' : tab === 'register' ? 'Create account' : 'Magic link'}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
        <button onClick={() => handleOAuth('google')} disabled={!!oauthLoading || loading} style={{ ...secondaryButton, opacity: oauthLoading && oauthLoading !== 'google' ? 0.45 : 1 }}>
          {oauthLoading === 'google' ? <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} /> : <GoogleIcon />} Continue with Google
        </button>
        <button onClick={() => handleOAuth('azure')} disabled={!!oauthLoading || loading} style={{ ...secondaryButton, opacity: oauthLoading && oauthLoading !== 'azure' ? 0.45 : 1 }}>
          {oauthLoading === 'azure' ? <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} /> : <MicrosoftIcon />} Continue with Microsoft
        </button>
      </div>

      <Divider />

      {mode === 'signin' && (
        <form onSubmit={handlePasswordSignIn} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Field id="signin-email" label="Work email" type="email" autoComplete="email" placeholder="name@company.com" value={email} onChange={(e: any) => setEmail(e.target.value)} icon={<Mail size={16} />} required />
          <Field id="signin-password" label="Password" type="password" autoComplete="current-password" placeholder="Enter your password" value={password} onChange={(e: any) => setPassword(e.target.value)} icon={<LockKeyhole size={16} />} required />
          {error && <p style={{ color: '#fca5a5', fontSize: 13 }}>{error}</p>}
          {success && <p style={{ color: '#86efac', fontSize: 13 }}>{success}</p>}
          <button type="submit" disabled={loading || !!oauthLoading} style={{ ...primaryButton, opacity: loading ? 0.7 : 1 }}>
            {loading ? <><Loader2 style={{ width: 15, height: 15, animation: 'spin 1s linear infinite' }} />Signing in…</> : 'Sign in to dashboard'}
          </button>
        </form>
      )}

      {mode === 'register' && (
        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Field id="full-name" label="Full name" type="text" autoComplete="name" placeholder="Jane Njeri" value={fullName} onChange={(e: any) => setFullName(e.target.value)} icon={<UserRound size={16} />} required />
          <Field id="work-org" label="Organization" type="text" autoComplete="organization" placeholder="SafariCharge Energy" value={organization} onChange={(e: any) => setOrganization(e.target.value)} icon={<Building2 size={16} />} required />
          <Field id="phone" label="Phone number" type="tel" autoComplete="tel" placeholder="+254 700 000 000" value={phone} onChange={(e: any) => setPhone(e.target.value)} icon={<Phone size={16} />} required />
          <Field id="register-email" label="Email address" type="email" autoComplete="email" placeholder="name@company.com" value={email} onChange={(e: any) => setEmail(e.target.value)} icon={<Mail size={16} />} required />
          <Field id="register-password" label="Password" type="password" autoComplete="new-password" placeholder="Minimum 8 characters" value={password} onChange={(e: any) => setPassword(e.target.value)} icon={<LockKeyhole size={16} />} required />
          <Field id="confirm-password" label="Confirm password" type="password" autoComplete="new-password" placeholder="Re-enter password" value={confirmPassword} onChange={(e: any) => setConfirmPassword(e.target.value)} icon={<LockKeyhole size={16} />} required />
          {error && <p style={{ color: '#fca5a5', fontSize: 13 }}>{error}</p>}
          {success && <p style={{ color: '#86efac', fontSize: 13 }}>{success}</p>}
          <button type="submit" disabled={loading || !!oauthLoading} style={{ ...primaryButton, opacity: loading ? 0.7 : 1 }}>
            {loading ? <><Loader2 style={{ width: 15, height: 15, animation: 'spin 1s linear infinite' }} />Creating account…</> : 'Create secure account'}
          </button>
          <p style={{ color: 'rgba(255,255,255,0.26)', fontSize: 12, lineHeight: 1.5 }}>
            Your professional details help us personalise simulations, project recommendations, and future account provisioning.
          </p>
        </form>
      )}

      {mode === 'magic' && (
        <form onSubmit={handleMagicLink} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Field id="magic-name" label="Full name" type="text" autoComplete="name" placeholder="Optional but recommended" value={fullName} onChange={(e: any) => setFullName(e.target.value)} icon={<UserRound size={16} />} />
          <Field id="magic-org" label="Organization" type="text" autoComplete="organization" placeholder="Optional but recommended" value={organization} onChange={(e: any) => setOrganization(e.target.value)} icon={<Building2 size={16} />} />
          <Field id="magic-phone" label="Phone number" type="tel" autoComplete="tel" placeholder="Optional but recommended" value={phone} onChange={(e: any) => setPhone(e.target.value)} icon={<Phone size={16} />} />
          <Field id="magic-email" label="Work email" type="email" autoComplete="email" placeholder="name@company.com" value={email} onChange={(e: any) => setEmail(e.target.value)} icon={<Mail size={16} />} required />
          {error && <p style={{ color: '#fca5a5', fontSize: 13 }}>{error}</p>}
          {success && <p style={{ color: '#86efac', fontSize: 13 }}>{success}</p>}
          {magicState === 'sent' && <p style={{ color: '#86efac', fontSize: 13 }}>Magic link sent to {email}. Check your inbox to continue.</p>}
          <button type="submit" disabled={magicState === 'loading' || !!oauthLoading || cooldown > 0} style={{ ...primaryButton, opacity: (magicState === 'loading' || cooldown > 0) ? 0.7 : 1 }}>
            {magicState === 'loading' ? <><Loader2 style={{ width: 15, height: 15, animation: 'spin 1s linear infinite' }} />Sending…</> : cooldown > 0 ? `Wait ${cooldown}s to resend` : <><Mail style={{ width: 15, height: 15 }} />Send secure magic link</>}
          </button>
        </form>
      )}
    </>
  )
}

export default function LoginPage() {
  return (
    <>
      <style>{`
        html, body { overflow: hidden; height: 100%; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      <div style={{ position: 'fixed', inset: 0, background: '#03070f', fontFamily: "'Inter', system-ui, sans-serif", display: 'flex', flexDirection: 'column' }}>
        <div aria-hidden style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(16,185,129,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,0.03) 1px, transparent 1px)', backgroundSize: '64px 64px', pointerEvents: 'none' }} />
        <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 55% 45% at 50% 0%, rgba(16,185,129,0.14) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <header style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', height: '60px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="24" height="24" viewBox="0 0 28 28" fill="none" aria-label="SafariCharge">
              <circle cx="14" cy="14" r="13" stroke="rgba(16,185,129,0.35)" strokeWidth="1" />
              <path d="M14 7 L17.5 13 L21 13 L14 21 L16 15 L12 15 Z" fill="#10b981" opacity="0.9" />
              <circle cx="14" cy="14" r="2" fill="#10b981" />
            </svg>
            <span style={{ color: '#e2e8f0', fontWeight: 600, fontSize: '14px', letterSpacing: '-0.01em' }}>SafariCharge</span>
          </div>
          <Link href="/landing" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.38)', fontSize: '13px', textDecoration: 'none' }}>
            <ArrowLeft width={14} height={14} /> Back to home
          </Link>
        </header>

        <div style={{ position: 'relative', zIndex: 10, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ width: '100%', maxWidth: '520px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.025)', backdropFilter: 'blur(24px)', boxShadow: '0 32px 80px rgba(0,0,0,0.45)', padding: '36px 32px' }}>
            <Suspense fallback={<div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '14px' }}>Loading…</div>}>
              <LoginForm />
            </Suspense>
          </div>
        </div>

        <footer style={{ position: 'relative', zIndex: 10, textAlign: 'center', padding: '14px', borderTop: '1px solid rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.18)', fontSize: '12px' }}>
          © {new Date().getFullYear()} SafariCharge · Secure access for clean energy professionals
        </footer>
      </div>
    </>
  )
}
