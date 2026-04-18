'use client'

import { useState } from 'react'
import { CheckCircle2, Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

type AuthState = 'idle' | 'loading' | 'sent'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [state, setState] = useState<AuthState>('idle')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const trimmedEmail = email.trim().toLowerCase()
    if (!trimmedEmail) return

    setError('')
    setState('loading')

    const supabase = createClient()
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: trimmedEmail,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
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
    <>
      <style>{`
        html, body { overflow: hidden; height: 100%; }
      `}</style>

      {/* Full-viewport lock — nothing scrolls */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: '#03070f',
          fontFamily: "'Inter', system-ui, sans-serif",
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Subtle grid overlay */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'linear-gradient(rgba(16,185,129,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,0.03) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
            pointerEvents: 'none',
          }}
        />

        {/* Glow */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(ellipse 55% 45% at 50% 0%, rgba(16,185,129,0.14) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        {/* Top bar */}
        <header
          style={{
            position: 'relative',
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
            height: '60px',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="24" height="24" viewBox="0 0 28 28" fill="none" aria-label="SafariCharge">
              <circle cx="14" cy="14" r="13" stroke="rgba(16,185,129,0.35)" strokeWidth="1" />
              <path d="M14 7 L17.5 13 L21 13 L14 21 L16 15 L12 15 Z" fill="#10b981" opacity="0.9" />
              <circle cx="14" cy="14" r="2" fill="#10b981" />
            </svg>
            <span style={{ color: '#e2e8f0', fontWeight: 600, fontSize: '14px', letterSpacing: '-0.01em' }}>
              SafariCharge
            </span>
          </div>

          {/* Back to home */}
          <Link
            href="/landing"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: 'rgba(255,255,255,0.38)',
              fontSize: '13px',
              textDecoration: 'none',
              transition: 'color 150ms',
            }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.7)')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.38)')}
          >
            <ArrowLeft width={14} height={14} />
            Back to home
          </Link>
        </header>

        {/* Centred card */}
        <div
          style={{
            position: 'relative',
            zIndex: 10,
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '420px',
              borderRadius: '20px',
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.025)',
              backdropFilter: 'blur(24px)',
              boxShadow: '0 32px 80px rgba(0,0,0,0.45)',
              padding: '36px 32px',
            }}
          >
            {state === 'sent' ? (
              /* ── Success state ── */
              <div style={{ textAlign: 'center' }}>
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    background: 'rgba(16,185,129,0.1)',
                    border: '1px solid rgba(16,185,129,0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 20px',
                  }}
                >
                  <CheckCircle2 style={{ color: '#10b981', width: '26px', height: '26px' }} />
                </div>
                <h1
                  style={{
                    color: '#f0fdf8',
                    fontSize: '22px',
                    fontWeight: 700,
                    letterSpacing: '-0.025em',
                    marginBottom: '10px',
                  }}
                >
                  Check your email
                </h1>
                <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '14px', lineHeight: 1.6, marginBottom: '8px' }}>
                  We sent a magic link to{' '}
                  <strong style={{ color: '#34d399' }}>{email}</strong>.
                  <br />Click it to sign in instantly.
                </p>
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', marginTop: '16px' }}>
                  Link expires in 10 minutes · Check your spam folder
                </p>
                <button
                  onClick={() => { setState('idle'); setEmail('') }}
                  style={{
                    marginTop: '24px',
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '10px',
                    color: 'rgba(255,255,255,0.45)',
                    fontSize: '13px',
                    padding: '8px 18px',
                    cursor: 'pointer',
                    transition: 'border-color 150ms, color 150ms',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.22)'
                    ;(e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.75)'
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)'
                    ;(e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.45)'
                  }}
                >
                  Use a different email
                </button>
              </div>
            ) : (
              /* ── Form state ── */
              <>
                <div style={{ marginBottom: '28px' }}>
                  <h1
                    style={{
                      color: '#f0fdf8',
                      fontSize: '24px',
                      fontWeight: 700,
                      letterSpacing: '-0.03em',
                      marginBottom: '6px',
                      lineHeight: 1.2,
                    }}
                  >
                    Welcome to SafariCharge
                  </h1>
                  <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '14px', lineHeight: 1.5 }}>
                    Enter your email to receive a login link — no password needed.
                  </p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label
                      htmlFor="email"
                      style={{
                        display: 'block',
                        color: 'rgba(255,255,255,0.4)',
                        fontSize: '11px',
                        fontWeight: 600,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        marginBottom: '8px',
                      }}
                    >
                      Email address
                    </label>
                    <input
                      id="email"
                      type="email"
                      required
                      autoComplete="email"
                      autoFocus
                      placeholder="you@example.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      disabled={state === 'loading'}
                      style={{
                        width: '100%',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.11)',
                        borderRadius: '12px',
                        padding: '12px 16px',
                        color: '#e2e8f0',
                        fontSize: '14px',
                        outline: 'none',
                        boxSizing: 'border-box',
                        transition: 'border-color 150ms',
                      }}
                      onFocus={e => ((e.currentTarget as HTMLElement).style.borderColor = 'rgba(16,185,129,0.45)')}
                      onBlur={e => ((e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.11)')}
                    />
                  </div>

                  {error && (
                    <p style={{ color: '#f87171', fontSize: '13px', margin: 0 }}>{error}</p>
                  )}

                  <button
                    type="submit"
                    disabled={state === 'loading' || !email.trim()}
                    style={{
                      width: '100%',
                      background: state === 'loading' ? '#059669' : '#10b981',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '13px',
                      color: '#fff',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: state === 'loading' ? 'not-allowed' : 'pointer',
                      opacity: !email.trim() ? 0.55 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      transition: 'background 150ms, opacity 150ms',
                      boxShadow: '0 0 32px rgba(16,185,129,0.25)',
                    }}
                    onMouseEnter={e => {
                      if (state !== 'loading' && email.trim())
                        (e.currentTarget as HTMLElement).style.background = '#059669'
                    }}
                    onMouseLeave={e => {
                      if (state !== 'loading')
                        (e.currentTarget as HTMLElement).style.background = '#10b981'
                    }}
                  >
                    {state === 'loading' ? (
                      <>
                        <Loader2 style={{ width: '15px', height: '15px', animation: 'spin 1s linear infinite' }} />
                        Sending…
                      </>
                    ) : (
                      'Send Login Link'
                    )}
                  </button>
                </form>

                <p style={{ color: 'rgba(255,255,255,0.22)', fontSize: '12px', textAlign: 'center', marginTop: '20px' }}>
                  New here? Just enter your email — we&apos;ll create your account automatically.
                </p>
              </>
            )}
          </div>
        </div>

        {/* Footer strip */}
        <footer
          style={{
            position: 'relative',
            zIndex: 10,
            textAlign: 'center',
            padding: '14px',
            borderTop: '1px solid rgba(255,255,255,0.04)',
            color: 'rgba(255,255,255,0.18)',
            fontSize: '12px',
          }}
        >
          © {new Date().getFullYear()} SafariCharge · Nairobi, Kenya
        </footer>

        {/* Spinner keyframe */}
        <style>{`
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `}</style>
      </div>
    </>
  )
}
