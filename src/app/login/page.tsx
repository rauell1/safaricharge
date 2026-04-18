'use client'

import { Suspense, useMemo, useState, useEffect, useRef } from 'react'
import { CheckCircle2, Loader2, ArrowLeft, Mail } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'

type AuthState = 'idle' | 'loading' | 'sent'
type OAuthProvider = 'google' | 'azure'

const MAGIC_LINK_COOLDOWN_SECONDS = 60 // 1 min between resends

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
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '4px 0' }}>
      <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
      <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>or</span>
      <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
    </div>
  )
}

function LoginForm() {
  const searchParams = useSearchParams()
  const nextPath = useMemo(() => searchParams.get('next') ?? '/dashboard', [searchParams])
  const initialError = useMemo(() => {
    const errorParam = searchParams.get('error')
    if (errorParam === 'auth_failed') return 'We could not verify that login link. Please request a new one.'
    if (errorParam === 'profile_upsert_failed') return 'We could not finish setting up your profile. Please try again.'
    return ''
  }, [searchParams])

  const [email, setEmail] = useState('')
  const [error, setError] = useState(initialError)
  const [state, setState] = useState<AuthState>('idle')
  const [oauthLoading, setOauthLoading] = useState<OAuthProvider | null>(null)
  const [cooldown, setCooldown] = useState(0) // seconds remaining
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Countdown ticker
  useEffect(() => {
    if (cooldown <= 0) {
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }
    timerRef.current = setInterval(() => setCooldown(c => c - 1), 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [cooldown])

  const handleEmailSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (cooldown > 0) return
    const trimmedEmail = email.trim().toLowerCase()
    if (!trimmedEmail) return
    setError('')
    setState('loading')
    const supabase = createClient()
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: trimmedEmail,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
        shouldCreateUser: true,
      },
    })
    if (otpError) {
      setError(otpError.message || 'Failed to send login link. Please try again.')
      setState('idle')
      return
    }
    setEmail(trimmedEmail)
    setState('sent')
    setCooldown(MAGIC_LINK_COOLDOWN_SECONDS)
  }

  const handleOAuth = async (provider: OAuthProvider) => {
    setError('')
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

  const btnBase: React.CSSProperties = {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '12px',
    padding: '12px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background 150ms, border-color 150ms',
    background: 'rgba(255,255,255,0.04)',
    color: '#e2e8f0',
  }

  if (state === 'sent') {
    return (
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: '56px', height: '56px', borderRadius: '50%',
          background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
        }}>
          <CheckCircle2 style={{ color: '#10b981', width: '26px', height: '26px' }} />
        </div>
        <h1 style={{ color: '#f0fdf8', fontSize: '22px', fontWeight: 700, letterSpacing: '-0.025em', marginBottom: '10px' }}>
          Check your email
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '14px', lineHeight: 1.6 }}>
          We sent a magic link to <strong style={{ color: '#34d399' }}>{email}</strong>.<br />
          Click it to sign in instantly.
        </p>
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', marginTop: '12px' }}>
          Link expires in 10 minutes · Check your spam folder
        </p>

        {/* Resend with cooldown */}
        <button
          onClick={async () => {
            if (cooldown > 0) return
            setState('loading')
            const supabase = createClient()
            const { error: otpError } = await supabase.auth.signInWithOtp({
              email,
              options: {
                emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
                shouldCreateUser: true,
              },
            })
            if (otpError) {
              setError(otpError.message || 'Failed to resend. Please try again.')
            } else {
              setCooldown(MAGIC_LINK_COOLDOWN_SECONDS)
            }
            setState('sent')
          }}
          disabled={cooldown > 0}
          style={{
            marginTop: '20px',
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '10px',
            color: cooldown > 0 ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.55)',
            fontSize: '13px',
            padding: '8px 18px',
            cursor: cooldown > 0 ? 'not-allowed' : 'pointer',
            transition: 'border-color 150ms, color 150ms',
          }}
        >
          {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend magic link'}
        </button>

        {error && <p style={{ color: '#f87171', fontSize: '13px', marginTop: '12px' }}>{error}</p>}

        <button
          onClick={() => { setState('idle'); setEmail(''); setError('') }}
          style={{
            marginTop: '10px', background: 'transparent', border: 'none',
            color: 'rgba(255,255,255,0.28)', fontSize: '12px', padding: '4px 8px',
            cursor: 'pointer', textDecoration: 'underline',
          }}
        >
          Use a different email
        </button>
      </div>
    )
  }

  return (
    <>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ color: '#f0fdf8', fontSize: '24px', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '6px', lineHeight: 1.2 }}>
          Welcome to SafariCharge
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '14px', lineHeight: 1.5 }}>
          Sign in to your account to continue.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* Google */}
        <button
          onClick={() => handleOAuth('google')}
          disabled={!!oauthLoading || state === 'loading'}
          style={{ ...btnBase, opacity: oauthLoading && oauthLoading !== 'google' ? 0.45 : 1 }}
          onMouseEnter={e => { if (!oauthLoading) { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.2)' } }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)' }}
        >
          {oauthLoading === 'google' ? <Loader2 style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} /> : <GoogleIcon />}
          Continue with Google
        </button>

        {/* Microsoft */}
        <button
          onClick={() => handleOAuth('azure')}
          disabled={!!oauthLoading || state === 'loading'}
          style={{ ...btnBase, opacity: oauthLoading && oauthLoading !== 'azure' ? 0.45 : 1 }}
          onMouseEnter={e => { if (!oauthLoading) { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.2)' } }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)' }}
        >
          {oauthLoading === 'azure' ? <Loader2 style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} /> : <MicrosoftIcon />}
          Continue with Microsoft
        </button>

        <Divider />

        {/* Magic link form */}
        <form onSubmit={handleEmailSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label htmlFor="email" style={{
              display: 'block', color: 'rgba(255,255,255,0.4)', fontSize: '11px',
              fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px',
            }}>
              Email address
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={state === 'loading' || !!oauthLoading}
              style={{
                width: '100%', background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.11)', borderRadius: '12px',
                padding: '12px 16px', color: '#e2e8f0', fontSize: '14px',
                outline: 'none', boxSizing: 'border-box', transition: 'border-color 150ms',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = 'rgba(16,185,129,0.45)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.11)')}
            />
          </div>

          {error && <p style={{ color: '#f87171', fontSize: '13px', margin: 0 }}>{error}</p>}

          <button
            type="submit"
            disabled={state === 'loading' || !email.trim() || !!oauthLoading || cooldown > 0}
            style={{
              width: '100%',
              background: state === 'loading' ? '#059669' : '#10b981',
              border: 'none', borderRadius: '12px', padding: '13px', color: '#fff',
              fontSize: '14px', fontWeight: 600,
              cursor: (state === 'loading' || !!oauthLoading || cooldown > 0) ? 'not-allowed' : 'pointer',
              opacity: (!email.trim() || !!oauthLoading || cooldown > 0) ? 0.55 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              transition: 'background 150ms, opacity 150ms',
              boxShadow: '0 0 32px rgba(16,185,129,0.25)',
            }}
            onMouseEnter={e => { if (state !== 'loading' && email.trim() && !oauthLoading && cooldown === 0) (e.currentTarget as HTMLElement).style.background = '#059669' }}
            onMouseLeave={e => { if (state !== 'loading') (e.currentTarget as HTMLElement).style.background = '#10b981' }}
          >
            {state === 'loading'
              ? <><Loader2 style={{ width: '15px', height: '15px', animation: 'spin 1s linear infinite' }} />Sending…</>
              : cooldown > 0
                ? `Wait ${cooldown}s to resend`
                : <><Mail style={{ width: '15px', height: '15px' }} />Send Magic Link</>}
          </button>
        </form>

        <p style={{ color: 'rgba(255,255,255,0.22)', fontSize: '12px', textAlign: 'center', marginTop: '4px' }}>
          New here? Just sign in — we&apos;ll create your account automatically.
        </p>
      </div>
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

      <div style={{
        position: 'fixed', inset: 0, background: '#03070f',
        fontFamily: "'Inter', system-ui, sans-serif", display: 'flex', flexDirection: 'column',
      }}>
        <div aria-hidden style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(rgba(16,185,129,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,0.03) 1px, transparent 1px)',
          backgroundSize: '64px 64px', pointerEvents: 'none',
        }} />
        <div aria-hidden style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse 55% 45% at 50% 0%, rgba(16,185,129,0.14) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <header style={{
          position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', padding: '0 24px', height: '60px',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="24" height="24" viewBox="0 0 28 28" fill="none" aria-label="SafariCharge">
              <circle cx="14" cy="14" r="13" stroke="rgba(16,185,129,0.35)" strokeWidth="1" />
              <path d="M14 7 L17.5 13 L21 13 L14 21 L16 15 L12 15 Z" fill="#10b981" opacity="0.9" />
              <circle cx="14" cy="14" r="2" fill="#10b981" />
            </svg>
            <span style={{ color: '#e2e8f0', fontWeight: 600, fontSize: '14px', letterSpacing: '-0.01em' }}>SafariCharge</span>
          </div>
          <Link
            href="/landing"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.38)', fontSize: '13px', textDecoration: 'none', transition: 'color 150ms' }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.7)')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.38)')}
          >
            <ArrowLeft width={14} height={14} />
            Back to home
          </Link>
        </header>

        <div style={{
          position: 'relative', zIndex: 10, flex: 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
        }}>
          <div style={{
            width: '100%', maxWidth: '420px', borderRadius: '20px',
            border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.025)',
            backdropFilter: 'blur(24px)', boxShadow: '0 32px 80px rgba(0,0,0,0.45)',
            padding: '36px 32px',
          }}>
            <Suspense fallback={<div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '14px' }}>Loading…</div>}>
              <LoginForm />
            </Suspense>
          </div>
        </div>

        <footer style={{
          position: 'relative', zIndex: 10, textAlign: 'center', padding: '14px',
          borderTop: '1px solid rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.18)', fontSize: '12px',
        }}>
          © {new Date().getFullYear()} SafariCharge · Nairobi, Kenya
        </footer>
      </div>
    </>
  )
}
