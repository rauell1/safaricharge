'use client'

import { useState } from 'react'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase'

type AuthState = 'idle' | 'loading' | 'sent'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [state, setState] = useState<AuthState>('idle')

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedEmail = email.trim().toLowerCase()
    if (!trimmedEmail) {
      return
    }

    setError('')
    setState('loading')

    const supabase = createClient()
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: trimmedEmail,
      options: {
        emailRedirectTo: 'https://sc-solar-dashboard.vercel.app/dashboard',
      },
    })

    if (otpError) {
      setError(otpError.message || 'Failed to send login link. Please try again.')
      setState('idle')
      return
    }

    setEmail(trimmedEmail)
    setState('sent')
  }

  return (
    <main
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: '#03070f', fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      <div
        className="w-full max-w-[420px] rounded-2xl border px-6 py-8 sm:px-8 sm:py-10"
        style={{
          borderColor: 'rgba(255,255,255,0.08)',
          background: 'rgba(255,255,255,0.03)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.35)',
        }}
      >
        <div className="flex items-center gap-2.5 mb-6">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-label="SafariCharge logo">
            <circle cx="14" cy="14" r="13" stroke="rgba(16,185,129,0.35)" strokeWidth="1" />
            <path d="M14 7 L17.5 13 L21 13 L14 21 L16 15 L12 15 Z" fill="#10b981" opacity="0.9" />
            <circle cx="14" cy="14" r="2" fill="#10b981" />
          </svg>
          <span className="font-semibold text-sm tracking-tight" style={{ color: '#e2e8f0' }}>
            SafariCharge
          </span>
        </div>

        {state === 'sent' ? (
          <div
            className="rounded-xl border px-5 py-6 text-center"
            style={{ borderColor: 'rgba(16,185,129,0.24)', background: 'rgba(16,185,129,0.06)' }}
          >
            <CheckCircle2 className="mx-auto mb-3 h-8 w-8" style={{ color: '#10b981' }} />
            <h1 className="text-xl font-semibold mb-2" style={{ color: '#f0fdf8' }}>
              Check your email
            </h1>
            <p className="text-sm mb-3" style={{ color: 'rgba(255,255,255,0.72)' }}>
              We sent a magic link to <strong>{email}</strong>. Click it to sign in.
            </p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Link expires in 10 minutes. Check your spam folder.
            </p>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold mb-1.5" style={{ color: '#f0fdf8', letterSpacing: '-0.02em' }}>
              Welcome to SafariCharge
            </h1>
            <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.7)' }}>
              Enter your email to receive a login link
            </p>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-1.5">
                <label
                  htmlFor="email"
                  className="block text-xs font-semibold uppercase tracking-wider"
                  style={{ color: 'rgba(255,255,255,0.45)' }}
                >
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={state === 'loading'}
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none disabled:opacity-60"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: '#e2e8f0',
                  }}
                />
              </div>

              {error ? (
                <p className="text-sm" style={{ color: '#f87171' }}>
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={state === 'loading' || !email.trim()}
                className="w-full rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{ background: '#10b981' }}
              >
                {state === 'loading' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send Login Link'
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  )
}
