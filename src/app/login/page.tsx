'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import {
  Sun,
  Zap,
  Battery,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Mail,
} from 'lucide-react';

type State = 'idle' | 'loading' | 'sent' | 'error';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [passwordEmail, setPasswordEmail] = useState('');
  const [password, setPassword] = useState('');
  const [state, setState] = useState<State>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [passwordState, setPasswordState] = useState<State>('idle');
  const [passwordErrorMsg, setPasswordErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setState('loading');
    setErrorMsg('');

    const res = await signIn('email', {
      email: email.trim().toLowerCase(),
      redirect: false,
      callbackUrl: '/demo',
    });

    if (res?.error) {
      setState('error');
      setErrorMsg('We could not send the magic link. Please try again.');
    } else {
      setState('sent');
    }
  };

  const handlePasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordEmail.trim() || !password) return;
    setPasswordState('loading');
    setPasswordErrorMsg('');

    const res = await signIn('credentials', {
      email: passwordEmail.trim().toLowerCase(),
      password,
      redirect: false,
      callbackUrl: '/demo',
    });

    if (res?.error) {
      setPasswordState('error');
      setPasswordErrorMsg('Invalid email or password.');
      return;
    }

    if (res?.ok) {
      window.location.href = '/demo';
      return;
    }

    setPasswordState('error');
    setPasswordErrorMsg('Could not sign in.');
  };

  return (
    <div
      className="min-h-screen flex"
      style={{ background: 'var(--bg-primary)', fontFamily: 'var(--font-sans)' }}
    >
      {/* ── Left brand panel (hidden on mobile) ── */}
      <aside
        aria-hidden="true"
        className="hidden lg:flex lg:w-[52%] xl:w-[55%] flex-col relative overflow-hidden"
        style={{
          background:
            'linear-gradient(145deg, #080d18 0%, #0d1a2e 40%, #091a12 100%)',
        }}
      >
        {/* Subtle grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        {/* Radial glow */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-[0.07] pointer-events-none"
          style={{
            background:
              'radial-gradient(circle, #10b981 0%, transparent 70%)',
          }}
        />

        {/* Logo */}
        <header className="relative z-10 flex items-center gap-3 px-10 pt-10">
          <span
            className="grid place-items-center w-9 h-9 rounded-xl"
            style={{ background: 'rgba(16,185,129,0.15)' }}
          >
            <Sun className="w-5 h-5" style={{ color: 'var(--battery)' }} strokeWidth={2} />
          </span>
          <span
            className="text-base font-semibold tracking-tight"
            style={{ color: 'var(--text-primary)' }}
          >
            SafariCharge
          </span>
        </header>

        {/* Hero copy */}
        <div className="relative z-10 flex-1 flex flex-col justify-center px-10 pb-16">
          <p
            className="text-xs font-semibold uppercase tracking-wider mb-4"
            style={{ color: 'var(--battery)' }}
          >
            Solar Energy Intelligence
          </p>
          <h1
            className="text-4xl xl:text-5xl font-bold leading-[1.12] mb-6"
            style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
          >
            Optimise every<br />kilowatt-hour
          </h1>
          <p
            className="text-base leading-relaxed max-w-xs"
            style={{ color: 'var(--text-secondary)' }}
          >
            Real-time monitoring, Pyomo dispatch optimisation, and AI-driven
            recommendations — built for Nairobi&rsquo;s solar professionals.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-3 mt-10">
            {[
              { icon: Sun,     label: 'PV Monitoring',         color: 'var(--solar)',   bg: 'var(--solar-soft)' },
              { icon: Battery, label: 'BESS Optimisation',    color: 'var(--battery)', bg: 'var(--battery-soft)' },
              { icon: Zap,     label: 'Grid Analytics',        color: 'var(--grid)',    bg: 'var(--grid-soft)' },
            ].map(({ icon: Icon, label, color, bg }) => (
              <span
                key={label}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-medium"
                style={{ background: bg, color, border: `1px solid ${color}26` }}
              >
                <Icon className="w-3.5 h-3.5" strokeWidth={2} />
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <footer
          className="relative z-10 px-10 py-6 text-xs"
          style={{ color: 'var(--text-tertiary)', borderTop: '1px solid var(--border)' }}
        >
          SafariCharge &copy; 2026 &mdash; Nairobi, Kenya
        </footer>
      </aside>

      {/* ── Right auth panel ── */}
      <main className="flex-1 flex flex-col">
        {/* Mobile nav */}
        <header
          className="flex items-center justify-between px-6 py-5 lg:px-10 lg:py-6"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <Link href="/landing" className="flex items-center gap-2.5">
            <span
              className="grid place-items-center w-8 h-8 rounded-lg"
              style={{ background: 'rgba(16,185,129,0.12)' }}
            >
              <Sun className="w-4 h-4" style={{ color: 'var(--battery)' }} strokeWidth={2.5} />
            </span>
            <span
              className="font-semibold tracking-tight text-sm"
              style={{ color: 'var(--text-primary)' }}
            >
              SafariCharge
            </span>
          </Link>
          <Link
            href="/landing"
            className="text-sm transition-colors"
            style={{ color: 'var(--text-tertiary)' }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)')
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLElement).style.color = 'var(--text-tertiary)')
            }
          >
            Back to home
          </Link>
        </header>

        {/* Form area */}
        <div className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-[380px]">

            {state === 'sent' ? (
              /* ── Sent state ── */
              <div
                className="text-center rounded-2xl px-6 py-8"
                style={{
                  border: '1px solid var(--battery-soft)',
                  background: 'rgba(16,185,129,0.05)',
                }}
              >
                <div
                  className="mx-auto w-16 h-16 rounded-2xl grid place-items-center mb-6"
                  style={{ background: 'var(--battery-soft)' }}
                >
                  <CheckCircle2
                    className="w-8 h-8"
                    style={{ color: 'var(--battery)' }}
                  />
                </div>
                <h1
                  className="text-2xl font-bold mb-2"
                  style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
                >
                  Check your inbox
                </h1>
                <p
                  className="text-sm leading-relaxed mb-8"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  We sent a magic link to{' '}
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                    {email}
                  </span>
                  . Click the link to sign in — it expires in&nbsp;10&nbsp;minutes.
                </p>
                <button
                  onClick={() => setState('idle')}
                  className="text-sm font-medium transition-colors"
                  style={{ color: 'var(--battery)' }}
                >
                  Didn&rsquo;t receive it? Try again
                </button>
              </div>
            ) : (
              /* ── Form state ── */
              <>
                {/* Heading */}
                <div className="mb-8">
                  <div
                    className="w-12 h-12 rounded-2xl grid place-items-center mb-5"
                    style={{ background: 'var(--battery-soft)' }}
                  >
                    <Mail
                      className="w-6 h-6"
                      style={{ color: 'var(--battery)' }}
                    />
                  </div>
                  <h1
                    className="text-2xl font-bold mb-1.5"
                    style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
                  >
                    Sign in
                  </h1>
                   <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Sign in with password, or receive a magic link via Resend.
                   </p>
                 </div>

                {/* Password sign-in */}
                <p className="mb-3 text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Sign in with password
                </p>
                <form onSubmit={handlePasswordSignIn} className="space-y-4 mb-6">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="password-email"
                      className="block text-xs font-semibold uppercase tracking-wider"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      Email
                    </label>
                    <input
                      id="password-email"
                      type="email"
                      autoComplete="email"
                      required
                      value={passwordEmail}
                      onChange={(e) => setPasswordEmail(e.target.value)}
                      disabled={passwordState === 'loading'}
                      className="w-full rounded-xl px-4 py-3 text-sm outline-none disabled:opacity-50"
                      style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label
                      htmlFor="password"
                      className="block text-xs font-semibold uppercase tracking-wider"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      Password
                    </label>
                    <input
                      id="password"
                      type="password"
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={passwordState === 'loading'}
                      className="w-full rounded-xl px-4 py-3 text-sm outline-none disabled:opacity-50"
                      style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </div>
                  {passwordState === 'error' && (
                    <div
                      className="flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm"
                      style={{
                        background: 'var(--alert-soft)',
                        border: '1px solid rgba(239,68,68,0.25)',
                        color: 'var(--alert)',
                      }}
                    >
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {passwordErrorMsg}
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={passwordState === 'loading' || !passwordEmail.trim() || !password}
                    className="w-full flex items-center justify-center gap-2 font-semibold text-sm px-4 py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      background: 'var(--battery)',
                      color: '#fff',
                    }}
                  >
                    {passwordState === 'loading' ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Signing in&hellip;</>
                    ) : (
                      <>Sign in with password <ArrowRight className="w-4 h-4" /></>
                    )}
                  </button>
                </form>

                {/* Divider */}
                <div
                  className="flex items-center gap-3 my-6"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  <div
                    className="flex-1 h-px"
                    style={{ background: 'var(--border)' }}
                  />
                  <span className="text-xs font-semibold tracking-wider">or sign in with a magic link</span>
                  <div
                    className="flex-1 h-px"
                    style={{ background: 'var(--border)' }}
                  />
                </div>

                {/* Magic-link form */}
                <p className="mb-3 text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Or get a magic link
                </p>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="email"
                      className="block text-xs font-semibold uppercase tracking-wider"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      Email address
                    </label>
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      required
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={state === 'loading'}
                      className="w-full rounded-xl px-4 py-3 text-sm outline-none disabled:opacity-50"
                      style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-primary)',
                        transition: 'border-color 180ms ease, box-shadow 180ms ease',
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'var(--battery)';
                        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.15)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    />
                  </div>

                  {state === 'error' && (
                    <div
                      className="flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm"
                      style={{
                        background: 'var(--alert-soft)',
                        border: '1px solid rgba(239,68,68,0.25)',
                        color: 'var(--alert)',
                      }}
                    >
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {errorMsg}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={state === 'loading' || !email.trim()}
                    className="w-full flex items-center justify-center gap-2 font-semibold text-sm px-4 py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      background: 'var(--battery)',
                      color: '#fff',
                    }}
                    onMouseEnter={(e) => {
                      if (!(e.currentTarget as HTMLButtonElement).disabled)
                        (e.currentTarget as HTMLElement).style.background = 'var(--battery-bright)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = 'var(--battery)';
                    }}
                  >
                    {state === 'loading' ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Sending&hellip;</>
                    ) : (
                      <>Email me a magic link <ArrowRight className="w-4 h-4" /></>
                    )}
                  </button>
                </form>

                <div className="text-sm text-center" style={{ color: 'var(--text-secondary)' }}>
                  New here? <Link href="/signup" className="underline underline-offset-2">Create an account</Link>
                  {' · '}
                  <Link href="/forgot-password" className="underline underline-offset-2">Forgot password?</Link>
                </div>

                {/* Footer */}
                <p
                  className="mt-8 text-center text-xs leading-relaxed"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  By signing in you agree to our{' '}
                  <Link
                    href="/landing"
                    className="underline underline-offset-2 transition-colors"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    Terms
                  </Link>{' '}
                  and{' '}
                  <Link
                    href="/landing"
                    className="underline underline-offset-2 transition-colors"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    Privacy Policy
                  </Link>.
                </p>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
