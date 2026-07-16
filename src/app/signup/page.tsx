'use client'

import { Suspense, useState } from 'react'
import { Loader2, LockKeyhole, Mail } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import {
  AuthShell, authInputCls, authLabelCls, authButtonCls, authErrorCls, authSuccessCls,
} from '@/components/marketing/AuthShell'

function RegisterForm() {
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const reset = () => {
    setError('')
    setSuccess('')
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    reset()

    const normalizedEmail = email.trim().toLowerCase()
    if (normalizedEmail !== 'royokola3@gmail.com') {
      setError('Registration is restricted to authorized email addresses.')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    const supabase = createClient()

    const { error: signUpErr } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
      },
    })

    if (signUpErr) {
      setError(signUpErr.message || 'Unable to create your account right now.')
      setLoading(false)
      return
    }

    setSuccess('Account created! Check your email to confirm, then sign in.')
    setEmail('')
    setPassword('')
    setConfirmPassword('')
    setLoading(false)
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold tracking-[-0.03em] leading-tight mb-2 text-[var(--text-primary)]">
          Create your account
        </h1>
        <p className="text-[13px] leading-relaxed text-[var(--text-tertiary)]">
          Join SafariCharge for clean energy site intelligence.
        </p>
      </div>

      {error && <div className={authErrorCls}>{error}</div>}
      {success && <div className={authSuccessCls}>{success}</div>}

      <form onSubmit={handleRegister} className="flex flex-col gap-4">
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
          <label htmlFor="password" className={authLabelCls}>
            Password
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
              <LockKeyhole size={16} />
            </div>
            <input
              id="password"
              type="password"
              required
              autoComplete="new-password"
              placeholder="Minimum 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={authInputCls}
            />
          </div>
        </div>

        <div>
          <label htmlFor="confirmPassword" className={authLabelCls}>
            Confirm Password
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
              <LockKeyhole size={16} />
            </div>
            <input
              id="confirmPassword"
              type="password"
              required
              autoComplete="new-password"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={authInputCls}
            />
          </div>
        </div>

        <div className="mt-1.5">
          <button type="submit" disabled={loading} className={authButtonCls}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating account…
              </>
            ) : (
              'Create account'
            )}
          </button>
        </div>
      </form>

      <div className="mt-6 text-center">
        <p className="text-[13.5px] text-[var(--text-tertiary)]">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-[var(--battery)] no-underline transition-colors hover:text-[var(--battery-bright)]">
            Sign in instead
          </Link>
        </p>
      </div>
    </>
  )
}

export default function SignupPage() {
  return (
    <AuthShell>
      <Suspense fallback={<div className="text-sm text-[var(--text-tertiary)]">Loading…</div>}>
        <RegisterForm />
      </Suspense>
    </AuthShell>
  )
}
