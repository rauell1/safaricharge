'use client'

import { Suspense, useMemo, useState } from 'react'
import { ArrowLeft, Loader2, LockKeyhole, Mail, UserRound, Building2, Phone } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'

type OAuthProvider = 'google' | 'azure'
type Mode = 'signin' | 'register'

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
      <span style={{ color: 'rgba(255,255,255,0.26)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' }}>or continue with email</span>
      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
    </div>
  )
}

function Field({ id, label, icon, ...props }: any) {
  return (
    <div>
      <label htmlFor={id} style={{ display: 'block', color: 'rgba(255,255,255,0.44)', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.28)', pointerEvents: 'none' }}>{icon}</div>
        <input
          id={id}
          {...props}
          style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.11)', borderRadius: 10, padding: '11px 14px 11px 42px', color: '#e2e8f0', fontSize: 14, outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s' }}
        />
      </div>
    </div>
  )
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = useMemo(() => searchParams.get('next') ?? '/dashboard', [searchParams])
  const initialError = useMemo(() => {
    const reason = searchParams.get('reason')
    const err = searchParams.get('error')
    if (reason === 'session_expired') return 'Your session expired after 15 minutes of inactivity. Please sign in again.'
    if (err === 'auth_failed') return 'We could not verify your sign-in request. Please try again.'
    return ''
  }, [searchParams])

  const [mode, setMode] = useState<Mode>('signin')
  const [error, setError] = useState(initialError)
  const [success, setSuccess] = useState('')
  const [oauthLoading, setOauthLoading] = useState<OAuthProvider | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [organization, setOrganization] = useState('')
  const [loading, setLoading] = useState(false)

  const reset = () => { setError(''); setSuccess('') }

  const handleOAuth = async (provider: OAuthProvider) => {
    reset()
    setOauthLoading(provider)
    const supabase = createClient()
    const { error: e } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
        scopes: provider === 'azure' ? 'openid email profile' : undefined,
      },
    })
    if (e) { setError(e.message || `Could not sign in with ${provider}.`); setOauthLoading(null) }
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault(); reset(); setLoading(true)
    const supabase = createClient()
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
    if (signInErr) { setError(signInErr.message || 'Unable to sign in. Check your email and password.'); setLoading(false); return }
    router.replace(nextPath); router.refresh()
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault(); reset()
    if (!fullName.trim()) { setError('Please enter your full name.'); return }
    if (!organization.trim()) { setError('Please enter your organisation.'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return }
    setLoading(true)
    const supabase = createClient()
    const normalizedEmail = email.trim().toLowerCase()
    const { error: signUpErr } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: { full_name: fullName.trim(), phone: phone.trim(), organization: organization.trim() },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
      },
    })
    if (signUpErr) { setError(signUpErr.message || 'Unable to create your account right now.'); setLoading(false); return }

    // Profile is upserted in /auth/callback after the user confirms their email.
    // Do NOT call /api/profile here — the user row does not exist in auth.users yet
    // and the FK constraint would cause a 500.
    setSuccess('Account created! Check your email to confirm, then sign in.')
    setMode('signin')
    setPassword(''); setConfirmPassword(''); setFullName(''); setPhone(''); setOrganization('')
    setLoading(false)
  }

  const primaryBtn: React.CSSProperties = {
    width: '100%', background: 'linear-gradient(135deg, #059669, #10b981)', border: 'none', borderRadius: 10,
    padding: '13px', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    boxShadow: '0 0 28px rgba(16,185,129,0.22)', transition: 'opacity 0.15s',
  }
  const oauthBtn: React.CSSProperties = {
    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '11px',
    fontSize: 14, fontWeight: 500, cursor: 'pointer', background: 'rgba(255,255,255,0.04)', color: '#e2e8f0',
    transition: 'background 0.15s',
  }

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ color: '#f0fdf8', fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 6, lineHeight: 1.2 }}>
          {mode === 'signin' ? 'Sign in to SafariCharge' : 'Create your account'}
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.42)', fontSize: 13, lineHeight: 1.55 }}>
          {mode === 'signin'
            ? 'Sessions expire after 15 minutes of inactivity for security.'
            : 'Clean energy professionals workspace. Your details personalise your experience.'}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 18 }}>
        {(['signin', 'register'] as Mode[]).map(t => (
          <button key={t} onClick={() => { setMode(t); reset() }} style={{
            borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', padding: '9px',
            fontSize: 12, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase',
            background: mode === t ? 'rgba(16,185,129,0.18)' : 'rgba(255,255,255,0.03)',
            color: mode === t ? '#d1fae5' : 'rgba(255,255,255,0.4)', cursor: 'pointer',
          }}>
            {t === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
        <button onClick={() => handleOAuth('google')} disabled={!!oauthLoading || loading} style={{ ...oauthBtn, opacity: oauthLoading && oauthLoading !== 'google' ? 0.45 : 1 }}>
          {oauthLoading === 'google' ? <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} /> : <GoogleIcon />}
          Continue with Google
        </button>
        <button onClick={() => handleOAuth('azure')} disabled={!!oauthLoading || loading} style={{ ...oauthBtn, opacity: oauthLoading && oauthLoading !== 'azure' ? 0.45 : 1 }}>
          {oauthLoading === 'azure' ? <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} /> : <MicrosoftIcon />}
          Continue with Microsoft
        </button>
      </div>

      <Divider />

      {error && <p style={{ color: '#fca5a5', fontSize: 13, marginBottom: 10 }}>{error}</p>}
      {success && <p style={{ color: '#86efac', fontSize: 13, marginBottom: 10 }}>{success}</p>}

      {mode === 'signin' && (
        <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
          <Field id="email" label="Work email" type="email" autoComplete="email" placeholder="name@company.com" value={email} onChange={(e: any) => setEmail(e.target.value)} icon={<Mail size={15} />} required />
          <div>
            <Field id="password" label="Password" type="password" autoComplete="current-password" placeholder="Your password" value={password} onChange={(e: any) => setPassword(e.target.value)} icon={<LockKeyhole size={15} />} required />
            <div style={{ textAlign: 'right', marginTop: 6 }}>
              <Link href="/forgot-password" style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, textDecoration: 'none' }}>Forgot password?</Link>
            </div>
          </div>
          <button type="submit" disabled={loading || !!oauthLoading} style={{ ...primaryBtn, opacity: loading ? 0.7 : 1 }}>
            {loading ? <><Loader2 style={{ width: 15, height: 15, animation: 'spin 1s linear infinite' }} />Signing in…</> : 'Sign in to dashboard'}
          </button>
        </form>
      )}

      {mode === 'register' && (
        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
          <Field id="full-name" label="Full name" type="text" autoComplete="name" placeholder="Jane Njeri" value={fullName} onChange={(e: any) => setFullName(e.target.value)} icon={<UserRound size={15} />} required />
          <Field id="organization" label="Organisation" type="text" autoComplete="organization" placeholder="e.g. Kenya Power, KETRACO, NGO" value={organization} onChange={(e: any) => setOrganization(e.target.value)} icon={<Building2 size={15} />} required />
          <Field id="phone" label="Phone (optional)" type="tel" autoComplete="tel" placeholder="+254 700 000 000" value={phone} onChange={(e: any) => setPhone(e.target.value)} icon={<Phone size={15} />} />
          <Field id="reg-email" label="Work email" type="email" autoComplete="email" placeholder="name@company.com" value={email} onChange={(e: any) => setEmail(e.target.value)} icon={<Mail size={15} />} required />
          <Field id="reg-password" label="Password" type="password" autoComplete="new-password" placeholder="Min. 8 characters" value={password} onChange={(e: any) => setPassword(e.target.value)} icon={<LockKeyhole size={15} />} required />
          <Field id="confirm-password" label="Confirm password" type="password" autoComplete="new-password" placeholder="Re-enter password" value={confirmPassword} onChange={(e: any) => setConfirmPassword(e.target.value)} icon={<LockKeyhole size={15} />} required />
          <button type="submit" disabled={loading || !!oauthLoading} style={{ ...primaryBtn, opacity: loading ? 0.7 : 1 }}>
            {loading ? <><Loader2 style={{ width: 15, height: 15, animation: 'spin 1s linear infinite' }} />Creating account…</> : 'Create account'}
          </button>
          <p style={{ color: 'rgba(255,255,255,0.22)', fontSize: 11.5, lineHeight: 1.55 }}>
            By creating an account you agree to SafariCharge&apos;s terms of service and privacy policy.
          </p>
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
        <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 55% 45% at 50% 0%, rgba(16,185,129,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <header style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', height: 60, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="24" height="24" viewBox="0 0 28 28" fill="none" aria-label="SafariCharge">
              <circle cx="14" cy="14" r="13" stroke="rgba(16,185,129,0.35)" strokeWidth="1" />
              <path d="M14 7 L17.5 13 L21 13 L14 21 L16 15 L12 15 Z" fill="#10b981" opacity="0.9" />
              <circle cx="14" cy="14" r="2" fill="#10b981" />
            </svg>
            <span style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 14, letterSpacing: '-0.01em' }}>SafariCharge</span>
          </div>
          <Link href="/landing" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.35)', fontSize: 13, textDecoration: 'none' }}>
            <ArrowLeft width={14} height={14} /> Back to home
          </Link>
        </header>
        <div style={{ position: 'relative', zIndex: 10, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', overflowY: 'auto' }}>
          <div style={{ width: '100%', maxWidth: 480, borderRadius: 18, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.025)', backdropFilter: 'blur(24px)', boxShadow: '0 32px 80px rgba(0,0,0,0.45)', padding: '32px 28px' }}>
            <Suspense fallback={<div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>Loading…</div>}>
              <LoginForm />
            </Suspense>
          </div>
        </div>
        <footer style={{ position: 'relative', zIndex: 10, textAlign: 'center', padding: '12px', borderTop: '1px solid rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.16)', fontSize: 12 }}>
          © {new Date().getFullYear()} SafariCharge · Secure access for clean energy professionals
        </footer>
      </div>
    </>
  )
}
