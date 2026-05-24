'use client'

import { Suspense, useMemo, useState } from 'react'
import { ArrowLeft, Loader2, LockKeyhole, Mail } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { BrandLogo } from '@/components/brand-logo'
import { ThemeToggle } from '@/components/theme-toggle'

type OAuthProvider = 'google' | 'apple'

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

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
    </svg>
  )
}

function Divider() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '14px 0' }}>
      <div style={{ flex: 1, height: 1, background: 'var(--site-page-border)' }} />
      <span style={{ color: 'var(--site-page-muted)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        or sign in with email
      </span>
      <div style={{ flex: 1, height: 1, background: 'var(--site-page-border)' }} />
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
    if (reason === 'session_expired') return 'Your session expired after 1 hour of inactivity. Please sign in again.'
    if (err === 'auth_failed') return 'We could not verify your sign-in request. Please try again.'
    if (err === 'email_not_confirmed') return 'Please confirm your email address to authenticate and access the dashboard.'
    return ''
  }, [searchParams])

  const [error, setError] = useState(initialError)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<OAuthProvider | null>(null)

  const reset = () => { setError('') }

  const handleOAuth = async (provider: OAuthProvider) => {
    reset()
    setOauthLoading(provider)
    const supabase = createClient()
    const { error: e } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
      },
    })
    if (e) {
      setError(e.message || `Could not sign in with ${provider}.`)
      setOauthLoading(null)
    }
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    reset()
    setLoading(true)
    const supabase = createClient()
    
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })
    
    if (signInErr) {
      setError(signInErr.message || 'Unable to sign in. Check your email and password.')
      setLoading(false)
      return
    }

    // Direct redirection — let middleware dynamically route based on role
    router.push(nextPath)
  }

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ color: 'var(--site-page-fg)', fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 8, lineHeight: 1.2 }}>
          Sign in to SafariCharge
        </h1>
        <p style={{ color: 'var(--site-page-muted)', fontSize: 13, lineHeight: 1.55 }}>
          Access your clean energy management workspace.
        </p>
      </div>

      {error && (
        <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', fontSize: 13, marginBottom: 18, fontFamily: 'monospace' }}>
          {error}
        </div>
      )}

      {/* OAuth buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
        <button
          onClick={() => handleOAuth('google')}
          disabled={!!oauthLoading || loading}
          className="oauth-btn"
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            border: '1px solid var(--site-page-border)', borderRadius: 10, padding: '11px',
            fontSize: 14, fontWeight: 500, cursor: 'pointer', background: 'var(--site-page-surface)', color: 'var(--site-page-fg)',
            transition: 'all 0.2s', opacity: oauthLoading && oauthLoading !== 'google' ? 0.45 : 1
          }}
        >
          {oauthLoading === 'google'
            ? <Loader2 className="animate-spin w-4 h-4" />
            : <GoogleIcon />}
          Continue with Google
        </button>
        <button
          onClick={() => handleOAuth('apple')}
          disabled={!!oauthLoading || loading}
          className="oauth-btn"
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            border: '1px solid var(--site-page-border)', borderRadius: 10, padding: '11px',
            fontSize: 14, fontWeight: 500, cursor: 'pointer', background: 'var(--site-page-surface)', color: 'var(--site-page-fg)',
            transition: 'all 0.2s', opacity: oauthLoading && oauthLoading !== 'apple' ? 0.45 : 1
          }}
        >
          {oauthLoading === 'apple'
            ? <Loader2 className="animate-spin w-4 h-4" />
            : <AppleIcon />}
          Continue with Apple
        </button>
      </div>

      <Divider />

      <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label htmlFor="email" style={{ display: 'block', color: 'var(--site-page-muted)', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
            Work Email
          </label>
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--site-page-soft)', pointerEvents: 'none' }}>
              <Mail size={16} />
            </div>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-glow"
              style={{ width: '100%', background: 'rgba(3,7,18,0.5)', border: '1px solid var(--site-page-border)', borderRadius: 10, padding: '12px 14px 12px 42px', color: 'var(--site-page-fg)', fontSize: 14, outline: 'none', boxSizing: 'border-box', transition: 'all 0.2s' }}
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" style={{ display: 'block', color: 'var(--site-page-muted)', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
            Password
          </label>
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--site-page-soft)', pointerEvents: 'none' }}>
              <LockKeyhole size={16} />
            </div>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-glow"
              style={{ width: '100%', background: 'rgba(3,7,18,0.5)', border: '1px solid var(--site-page-border)', borderRadius: 10, padding: '12px 14px 12px 42px', color: 'var(--site-page-fg)', fontSize: 14, outline: 'none', boxSizing: 'border-box', transition: 'all 0.2s' }}
            />
          </div>
        </div>

        <div style={{ marginTop: 6 }}>
          <button
            type="submit"
            disabled={loading || !!oauthLoading}
            style={{
              width: '100%',
              background: 'var(--battery)',
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
              boxShadow: '0 0 24px rgba(16,185,129,0.22)',
              transition: 'all 0.2s',
              opacity: loading ? 0.75 : 1
            }}
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin w-4 h-4" />
                Signing in…
              </>
            ) : (
              'Sign in to dashboard'
            )}
          </button>
        </div>
      </form>

      <div style={{ marginTop: 24, textAlign: 'center' }}>
        <p style={{ color: 'var(--site-page-muted)', fontSize: 13.5, margin: 0 }}>
          New to SafariCharge?{' '}
          <Link href="/signup" style={{ color: 'var(--battery)', fontWeight: 600, textDecoration: 'none' }}>
            Create an account
          </Link>
        </p>
      </div>
    </>
  )
}

export default function LoginPage() {
  return (
    <>
      <style jsx global>{`
        html, body { overflow: hidden; height: 100%; margin: 0; padding: 0; background: var(--site-page-bg); }
        .input-glow:focus {
          border-color: var(--battery) !important;
          box-shadow: 0 0 12px rgba(16,185,129,0.2) !important;
        }
        .oauth-btn:hover {
          background: var(--bg-card-hover) !important;
          border-color: var(--site-page-soft) !important;
        }
      `}</style>
      
      <div style={{ position: 'fixed', inset: 0, color: 'var(--site-page-fg)', fontFamily: "'Inter', system-ui, sans-serif", display: 'flex', flexDirection: 'column' }}>
        {/* Subtle grid backdrop */}
        <div aria-hidden style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(var(--site-grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--site-grid-line) 1px, transparent 1px)', backgroundSize: '64px 64px', pointerEvents: 'none' }} />
        
        {/* Top glow */}
        <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 55% 45% at 50% 0%, var(--site-top-glow) 0%, transparent 70%)', pointerEvents: 'none' }} />

        {/* Dynamic header */}
        <header style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', height: 60, borderBottom: '1px solid var(--site-page-border)', background: 'var(--site-nav-bg)', backdropFilter: 'blur(10px)' }}>
          <BrandLogo href="/landing" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ThemeToggle />
            <Link href="/landing" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--site-page-muted)', fontSize: 13, textDecoration: 'none' }}>
              <ArrowLeft size={14} /> Back to home
            </Link>
          </div>
        </header>

        {/* Main Content Form */}
        <div style={{ position: 'relative', zIndex: 10, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, overflowY: 'auto' }}>
          <div style={{ width: '100%', maxWidth: 440, borderRadius: 20, border: '1px solid var(--site-page-border)', background: 'var(--site-page-surface)', backdropFilter: 'blur(30px)', padding: '36px 32px', boxSizing: 'border-box', boxShadow: '0 24px 60px rgba(0,0,0,0.2)' }}>
            <Suspense fallback={<div style={{ color: 'var(--site-page-muted)', fontSize: 14 }}>Loading…</div>}>
              <LoginForm />
            </Suspense>
          </div>
        </div>

        {/* Footer */}
        <footer style={{ zIndex: 10, textAlign: 'center', padding: 14, borderTop: '1px solid var(--site-page-border)', color: 'var(--site-page-muted)', fontSize: 12, background: 'var(--site-nav-bg)' }}>
          © {new Date().getFullYear()} SafariCharge · Secure access for clean energy professionals
        </footer>
      </div>
    </>
  )
}
