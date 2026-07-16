'use client'

import { Suspense, useMemo, useState } from 'react'
import { Loader2, LockKeyhole, Mail } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createClient, isSupabaseConfigured } from '@/lib/supabase'
import {
  AuthShell, authInputCls, authLabelCls, authButtonCls, authErrorCls, authSuccessCls,
} from '@/components/marketing/AuthShell'

function LoginForm() {
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
    if (!isSupabaseConfigured()) {
      setError('Authentication is not configured for this deployment.')
      setLoading(false)
      return
    }
    const supabase = createClient()

    const normalizedEmail = email.trim().toLowerCase()

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
    if (!isSupabaseConfigured()) {
      setError('Authentication is not configured for this deployment.')
      setLoading(false)
      return
    }
    const supabase = createClient()

    const normalizedEmail = email.trim().toLowerCase()

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
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold tracking-[-0.03em] leading-tight mb-2 text-[var(--text-primary)]">
            Reset Password
          </h1>
          <p className="text-[13px] leading-relaxed text-[var(--text-tertiary)]">
            We&apos;ll send a password recovery link to your work email.
          </p>
        </div>

        {error && <div className={authErrorCls}>{error}</div>}
        {success && <div className={authSuccessCls}>{success}</div>}

        <form onSubmit={handleForgotPassword} className="flex flex-col gap-4">
          <div>
            <label htmlFor="email" className={authLabelCls}>
              Work Email
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
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
                className={authInputCls}
              />
            </div>
          </div>

          <div className="mt-1.5">
            <button type="submit" disabled={loading} className={authButtonCls}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending Link…
                </>
              ) : (
                'Send recovery link'
              )}
            </button>
          </div>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => { reset(); setMode('login') }}
            className="text-[13.5px] font-semibold text-[var(--battery)] transition-colors hover:text-[var(--battery-bright)]"
          >
            ← Back to sign in
          </button>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold tracking-[-0.03em] leading-tight mb-2 text-[var(--text-primary)]">
          Sign in to SafariCharge
        </h1>
        <p className="text-[13px] leading-relaxed text-[var(--text-tertiary)]">
          Access your clean energy management workspace.
        </p>
      </div>

      {error && <div className={authErrorCls}>{error}</div>}

      <form onSubmit={handleSignIn} className="flex flex-col gap-4">
        <div>
          <label htmlFor="email" className={authLabelCls}>
            Work Email
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
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
              className={authInputCls}
            />
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="password" className={`${authLabelCls} mb-0`}>
              Password
            </label>
            <button
              type="button"
              onClick={() => { reset(); setMode('forgot_password') }}
              className="text-[11.5px] font-semibold text-[var(--battery)] transition-colors hover:text-[var(--battery-bright)]"
            >
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
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
              className={authInputCls}
            />
          </div>
        </div>

        <div className="mt-1.5">
          <button type="submit" disabled={loading} className={authButtonCls}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing in…
              </>
            ) : (
              'Sign in to dashboard'
            )}
          </button>
        </div>
      </form>

      <div className="mt-6 text-center">
        <p className="text-[13.5px] text-[var(--text-tertiary)]">
          New to SafariCharge?{' '}
          <Link href="/signup" className="font-semibold text-[var(--battery)] no-underline transition-colors hover:text-[var(--battery-bright)]">
            Create an account
          </Link>
        </p>
      </div>
    </>
  )
}

export default function LoginPage() {
  return (
    <AuthShell>
      <Suspense fallback={<div className="text-sm text-[var(--text-tertiary)]">Loading…</div>}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  )
}
