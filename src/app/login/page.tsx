'use client'

import { Suspense, useMemo, useState } from 'react'
import { ArrowLeft, Loader2, LockKeyhole, Mail } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { BrandLogo } from '@/components/brand-logo'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  // Validate the `next` param to prevent open redirect attacks.
  const nextPath = useMemo(() => {
    const n = searchParams.get('next') ?? '/dashboard'
    return n.startsWith('/') ? n : '/dashboard'
  }, [searchParams])
  
  const initialError = useMemo(() => {
    const reason = searchParams.get('reason')
    const err = searchParams.get('error')
    if (reason === 'session_expired') return 'Your session expired after 1 hour of inactivity. Please sign in again.'
    if (err === 'auth_failed') return 'We could not verify your sign-in request. Please try again.'
    if (err === 'email_not_confirmed') return 'Please confirm your email address to authenticate and access the dashboard.'
    return ''
  }, [searchParams])

  const [mode, setMode] = useState<'login' | 'forgot_password'>('login')
  const [error, setError] = useState(initialError)
  const [success, setSuccess] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const reset = () => {
    setError('')
    setSuccess('')
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    reset()
    setLoading(true)
    const supabase = createClient()
    
    const normalizedEmail = email.trim().toLowerCase()
    if (normalizedEmail !== 'royokola3@gmail.com') {
      setError('Access restricted to authorized email address.')
      setLoading(false)
      return
    }

    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    })

    if (signInErr) {
      // Use a generic message to avoid leaking whether the email is registered.
      const msg = signInErr.message || ''
      if (msg.toLowerCase().includes('not confirmed') || msg.toLowerCase().includes('email')) {
        setError('Please confirm your email address before signing in. Check your inbox for the confirmation link.')
      } else {
        setError('Invalid email or password. Please try again.')
      }
      setLoading(false)
      return
    }

    // Check whether this user has completed onboarding. The GET /api/profile
    // response also sets the sc_onboarded cookie if the profile is complete,
    // so the middleware will let subsequent requests through without a redirect.
    try {
      const profileRes = await fetch('/api/profile')
      if (profileRes.ok) {
        const profileData = await profileRes.json()
        if (profileData.needs_onboarding) {
          window.location.assign(`/onboarding?next=${encodeURIComponent(nextPath)}`)
          return
        }
      }
    } catch {
      // Network error -  proceed to dashboard; middleware will enforce onboarding if needed.
    }

    // Direct redirection via full reload to force session cookie sync with Next.js edge middleware
    window.location.assign(nextPath)
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    reset()
    setLoading(true)
    const supabase = createClient()

    const normalizedEmail = email.trim().toLowerCase()
    if (normalizedEmail !== 'royokola3@gmail.com') {
      setError('Access restricted to authorized email address.')
      setLoading(false)
      return
    }

    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
    })

    if (resetErr) {
      setError(resetErr.message || 'Unable to send password reset link. Please try again.')
      setLoading(false)
      return
    }

    setSuccess('Password reset link sent! Check your email to recover your account.')
    setLoading(false)
  }

  if (mode === 'forgot_password') {
    return (
      <>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ color: 'var(--site-page-fg)', fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 8, lineHeight: 1.2 }}>
            Reset Password
          </h1>
          <p style={{ color: 'var(--site-page-muted)', fontSize: 13, lineHeight: 1.55 }}>
            We'll send a password recovery link to your work email.
          </p>
        </div>

        {error && (
          <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', fontSize: 13, marginBottom: 18, fontFamily: 'monospace' }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{ padding: '12px 16px', borderRadius: 8, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', color: 'var(--battery)', fontSize: 13.5, marginBottom: 18, lineHeight: 1.4 }}>
            {success}
          </div>
        )}

        <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
                style={{ width: '100%', background: '#ffffff', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px 12px 42px', color: 'var(--text-primary)', fontSize: 14, outline: 'none', boxSizing: 'border-box', transition: 'all 0.2s' }}
              />
            </div>
          </div>

          <div style={{ marginTop: 6 }}>
            <button
              type="submit"
              disabled={loading}
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
                  Sending Link…
                </>
              ) : (
                'Send recovery link'
              )}
            </button>
          </div>
        </form>

        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <button
            type="button"
            onClick={() => { reset(); setMode('login') }}
            style={{ border: 'none', background: 'transparent', color: 'var(--battery)', fontWeight: 600, fontSize: 13.5, cursor: 'pointer' }}
          >
            ← Back to sign in
          </button>
        </div>
      </>
    )
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
              style={{ width: '100%', background: '#ffffff', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px 12px 42px', color: 'var(--text-primary)', fontSize: 14, outline: 'none', boxSizing: 'border-box', transition: 'all 0.2s' }}
            />
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <label htmlFor="password" style={{ color: 'var(--site-page-muted)', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Password
            </label>
            <button
              type="button"
              onClick={() => { reset(); setMode('forgot_password') }}
              style={{ border: 'none', background: 'transparent', color: 'var(--battery)', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', padding: 0 }}
            >
              Forgot password?
            </button>
          </div>
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
              style={{ width: '100%', background: '#ffffff', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px 12px 42px', color: 'var(--text-primary)', fontSize: 14, outline: 'none', boxSizing: 'border-box', transition: 'all 0.2s' }}
            />
          </div>
        </div>

        <div style={{ marginTop: 6 }}>
          <button
            type="submit"
            disabled={loading}
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
            <Link href="/landing" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--site-page-muted)', fontSize: 13, textDecoration: 'none' }}>
              <ArrowLeft size={14} /> Back to home
            </Link>
          </div>
        </header>

        {/* Main Content Form */}
        <div style={{ position: 'relative', zIndex: 10, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, overflowY: 'auto' }}>
          <div style={{ width: '100%', maxWidth: 440, borderRadius: 20, border: '1px solid var(--border)', background: 'var(--site-page-surface)', backdropFilter: 'blur(30px)', padding: '36px 32px', boxSizing: 'border-box', boxShadow: '0 20px 48px rgba(13,31,23,0.08), 0 1px 4px rgba(13,31,23,0.02)' }}>
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
