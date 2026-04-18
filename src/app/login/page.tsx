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
  Lock,
  Activity,
  LayoutDashboard,
} from 'lucide-react';

type State = 'idle' | 'loading' | 'sent' | 'error';

// Toggle via NEXT_PUBLIC_SIGN_IN_ENABLED=false if you need to pause auth flows
const SIGN_IN_ENABLED = process.env.NEXT_PUBLIC_SIGN_IN_ENABLED !== 'false';

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
      setErrorMsg(
        res.error === 'Configuration'
          ? 'Magic links are not configured. Check RESEND_API_KEY and EMAIL_FROM.'
          : 'We could not send the magic link. Please try again.'
      );
      return;
    }
    setState('sent');
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
      style={{ background: '#03070f', fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      {/* Grid bg */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(16,185,129,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,0.025) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />
      {/* Glow */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background: 'radial-gradient(ellipse 55% 45% at 25% 50%, rgba(16,185,129,0.1) 0%, transparent 65%)',
        }}
      />

      {/* ── Left brand panel ── */}
      <aside
        aria-hidden="true"
        className="hidden lg:flex lg:w-[50%] xl:w-[52%] flex-col relative overflow-hidden"
        style={{ borderRight: '1px solid rgba(255,255,255,0.05)' }}
      >
        {/* Logo */}
        <header className="relative z-10 flex items-center gap-3 px-12 pt-12">
          <svg width="32" height="32" viewBox="0 0 28 28" fill="none" aria-label="SafariCharge logo">
            <circle cx="14" cy="14" r="13" stroke="rgba(16,185,129,0.3)" strokeWidth="1"/>
            <path d="M14 7 L17.5 13 L21 13 L14 21 L16 15 L12 15 Z" fill="#10b981" opacity="0.9"/>
            <circle cx="14" cy="14" r="2" fill="#10b981"/>
          </svg>
          <span className="text-base font-semibold tracking-tight" style={{ color: '#e2e8f0' }}>SafariCharge</span>
        </header>

        {/* Hero copy */}
        <div className="relative z-10 flex-1 flex flex-col justify-center px-12 pb-16">
          <p className="text-xs font-semibold uppercase tracking-widest mb-6" style={{ color: '#10b981' }}>
            Solar Energy Intelligence
          </p>
          <h1
            className="font-bold leading-[1.08] mb-6"
            style={{
              fontSize: 'clamp(2rem, 3.2vw, 3rem)',
              color: '#f0fdf8',
              letterSpacing: '-0.04em',
            }}
          >
            Optimise every<br />
            <span
              style={{
                background: 'linear-gradient(90deg, #10b981, #6ee7b7)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              kilowatt-hour
            </span>
          </h1>
          <p className="leading-relaxed max-w-xs text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Real-time monitoring, Pyomo dispatch optimisation, and AI-driven
            recommendations — built for Nairobi's solar professionals.
          </p>

          {/* Metrics */}
          <div className="grid grid-cols-2 gap-3 mt-10 max-w-xs">
            {[
              { value: '40%', label: 'Peak demand saved' },
              { value: '5 min', label: 'Re-optimise cycle' },
              { value: 'KPLC', label: 'TOU-aware engine' },
              { value: '99.2%', label: 'Energy accuracy' },
            ].map((m) => (
              <div
                key={m.label}
                className="rounded-xl p-4"
                style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}
              >
                <div className="font-bold text-lg mb-0.5" style={{ color: '#10b981', letterSpacing: '-0.04em' }}>{m.value}</div>
                <div className="text-xs" style={{ color: 'rgba(255,255,255,0.32)' }}>{m.label}</div>
              </div>
            ))}
          </div>

          {/* Pills */}
          <div className="flex flex-wrap gap-2 mt-8">
            {[
              { icon: Sun,     label: 'PV Monitoring',      color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
              { icon: Battery, label: 'BESS Optimisation',  color: '#10b981', bg: 'rgba(16,185,129,0.08)' },
              { icon: Zap,     label: 'Grid Analytics',     color: '#3b82f6', bg: 'rgba(59,130,246,0.08)' },
            ].map(({ icon: Icon, label, color, bg }) => (
              <span
                key={label}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
                style={{ background: bg, color, border: `1px solid ${color}18` }}
              >
                <Icon className="w-3 h-3" strokeWidth={2} />
                {label}
              </span>
            ))}
          </div>
        </div>

        <footer
          className="relative z-10 px-12 py-6 text-xs"
          style={{ color: 'rgba(255,255,255,0.18)', borderTop: '1px solid rgba(255,255,255,0.05)' }}
        >
          SafariCharge © 2026 · Nairobi, Kenya
        </footer>
      </aside>

      {/* ── Right panel ── */}
      <main className="flex-1 flex flex-col relative z-10">
        <header
          className="flex items-center justify-between px-7 py-5 lg:px-12 lg:py-6"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
        >
          <Link href="/landing" className="flex items-center gap-2.5">
            <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
              <circle cx="14" cy="14" r="13" stroke="rgba(16,185,129,0.3)" strokeWidth="1"/>
              <path d="M14 7 L17.5 13 L21 13 L14 21 L16 15 L12 15 Z" fill="#10b981" opacity="0.9"/>
            </svg>
            <span className="font-semibold tracking-tight text-sm" style={{ color: '#e2e8f0' }}>SafariCharge</span>
          </Link>
          <Link
            href="/landing"
            className="text-sm"
            style={{ color: 'rgba(255,255,255,0.3)', transition: 'color 150ms' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.65)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.3)'; }}
          >
            ← Back to home
          </Link>
        </header>

        <div className="flex-1 flex items-center justify-center px-7 py-14">
          <div className="w-full max-w-[400px]">

            {!SIGN_IN_ENABLED ? (
              /* ── Disabled / bypass state ── */
              <div className="space-y-4">
                {/* Header */}
                <div className="text-center mb-8">
                  <div
                    className="mx-auto w-14 h-14 rounded-2xl grid place-items-center mb-5"
                    style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.18)' }}
                  >
                    <Lock className="w-6 h-6" style={{ color: '#10b981' }} strokeWidth={1.8} />
                  </div>
                  <h1
                    className="text-xl font-bold mb-2"
                    style={{ color: '#f0fdf8', letterSpacing: '-0.03em' }}
                  >
                    Sign-in paused
                  </h1>
                  <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    Authentication is temporarily disabled. Access the full dashboard directly below — no account needed.
                  </p>
                </div>

                {/* Primary CTA — go to dashboard */}
                <Link
                  href="/demo"
                  className="group flex items-center justify-between w-full rounded-2xl px-5 py-5"
                  style={{
                    background: 'rgba(16,185,129,0.06)',
                    border: '1px solid rgba(16,185,129,0.22)',
                    transition: 'background 150ms, border-color 150ms',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(16,185,129,0.11)';
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(16,185,129,0.38)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(16,185,129,0.06)';
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(16,185,129,0.22)';
                  }}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-10 h-10 rounded-xl grid place-items-center shrink-0"
                      style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.2)' }}
                    >
                      <LayoutDashboard className="w-5 h-5" style={{ color: '#10b981' }} strokeWidth={1.8} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>Open Dashboard</p>
                      <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>Real-time solar · BESS dispatch · KPLC analytics</p>
                    </div>
                  </div>
                  <ArrowRight
                    className="w-4 h-4 shrink-0"
                    style={{ color: '#10b981', transition: 'transform 150ms' }}
                    onMouseEnter={(e) => { (e.currentTarget as SVGElement).style.transform = 'translateX(3px)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as SVGElement).style.transform = 'translateX(0)'; }}
                  />
                </Link>

                {/* Activity feed preview pill */}
                <div
                  className="flex items-center gap-3 rounded-xl px-4 py-3"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
                >
                  <Activity className="w-4 h-4 shrink-0" style={{ color: 'rgba(16,185,129,0.6)' }} />
                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.32)' }}>
                    No account needed · Full feature access · Live data
                  </span>
                </div>
              </div>
            ) : state === 'sent' ? (
              /* ── Sent state ── */
              <div
                className="text-center rounded-2xl px-6 py-8"
                style={{
                  border: '1px solid rgba(16,185,129,0.18)',
                  background: 'rgba(16,185,129,0.04)',
                }}
              >
                <div
                  className="mx-auto w-14 h-14 rounded-2xl grid place-items-center mb-5"
                  style={{ background: 'rgba(16,185,129,0.1)' }}
                >
                  <CheckCircle2 className="w-7 h-7" style={{ color: '#10b981' }} />
                </div>
                <h1 className="text-xl font-bold mb-2" style={{ color: '#f0fdf8', letterSpacing: '-0.03em' }}>
                  Check your inbox
                </h1>
                <p className="text-sm leading-relaxed mb-8" style={{ color: 'rgba(255,255,255,0.42)' }}>
                  We sent a magic link to{' '}
                  <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{email}</span>.
                  Click the link to sign in — it expires in&nbsp;10&nbsp;minutes.
                </p>
                <button
                  onClick={() => setState('idle')}
                  className="text-sm font-medium"
                  style={{ color: '#10b981', transition: 'opacity 150ms' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0.7'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
                >
                  Didn&rsquo;t receive it? Try again
                </button>
              </div>
            ) : (
              /* ── Sign-in form ── */
              <>
                <div className="mb-8">
                  <div
                    className="w-12 h-12 rounded-2xl grid place-items-center mb-5"
                    style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.18)' }}
                  >
                    <Mail className="w-5 h-5" style={{ color: '#10b981' }} strokeWidth={1.8} />
                  </div>
                  <h1 className="text-2xl font-bold mb-1.5" style={{ color: '#f0fdf8', letterSpacing: '-0.04em' }}>Sign in</h1>
                  <p className="text-sm" style={{ color: 'rgba(255,255,255,0.38)' }}>
                    Sign in with password, or receive a magic link via Resend.
                  </p>
                </div>

                <p className="mb-3 text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.6)' }}>Password</p>
                <form onSubmit={handlePasswordSignIn} className="space-y-4 mb-6">
                  <div className="space-y-1.5">
                    <label htmlFor="password-email" className="block text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.28)' }}>Email</label>
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
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.07)',
                        color: '#e2e8f0',
                        transition: 'border-color 150ms, box-shadow 150ms',
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(16,185,129,0.45)';
                        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.1)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.28)' }}>Password</label>
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
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.07)',
                        color: '#e2e8f0',
                        transition: 'border-color 150ms, box-shadow 150ms',
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(16,185,129,0.45)';
                        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.1)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    />
                  </div>
                  {passwordState === 'error' && (
                    <div className="flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm" style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.18)', color: '#f87171' }}>
                      <AlertCircle className="w-4 h-4 shrink-0" />{passwordErrorMsg}
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={passwordState === 'loading' || !passwordEmail.trim() || !password}
                    className="w-full flex items-center justify-center gap-2 font-semibold text-sm px-4 py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: '#10b981', color: '#fff', transition: 'background 150ms' }}
                    onMouseEnter={(e) => { if (!(e.currentTarget as HTMLButtonElement).disabled) (e.currentTarget as HTMLElement).style.background = '#059669'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '#10b981'; }}
                  >
                    {passwordState === 'loading'
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in&hellip;</>
                      : <>Sign in <ArrowRight className="w-4 h-4" /></>}
                  </button>
                </form>

                <div className="flex items-center gap-3 my-5" style={{ color: 'rgba(255,255,255,0.18)' }}>
                  <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
                  <span className="text-xs font-semibold tracking-wider">or magic link</span>
                  <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.28)' }}>Email address</label>
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
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.07)',
                        color: '#e2e8f0',
                        transition: 'border-color 150ms, box-shadow 150ms',
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(16,185,129,0.45)';
                        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.1)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    />
                  </div>
                  {state === 'error' && (
                    <div className="flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm" style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.18)', color: '#f87171' }}>
                      <AlertCircle className="w-4 h-4 shrink-0" />{errorMsg}
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={state === 'loading' || !email.trim()}
                    className="w-full flex items-center justify-center gap-2 font-semibold text-sm px-4 py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: '#10b981', color: '#fff', transition: 'background 150ms' }}
                    onMouseEnter={(e) => { if (!(e.currentTarget as HTMLButtonElement).disabled) (e.currentTarget as HTMLElement).style.background = '#059669'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '#10b981'; }}
                  >
                    {state === 'loading'
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending&hellip;</>
                      : <>Email me a magic link <ArrowRight className="w-4 h-4" /></>}
                  </button>
                </form>

                <p className="mt-3 text-xs text-center" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Magic links are delivered via Resend and expire after 10 minutes.
                </p>

                <div className="mt-6 text-sm text-center" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  New here?{' '}<Link href="/signup" className="underline underline-offset-2" style={{ color: 'rgba(255,255,255,0.55)' }}>Create an account</Link>
                  {' · '}
                  <Link href="/forgot-password" className="underline underline-offset-2" style={{ color: 'rgba(255,255,255,0.55)' }}>Forgot password?</Link>
                </div>

                <p className="mt-8 text-center text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.18)' }}>
                  By signing in you agree to our{' '}
                  <Link href="/landing" className="underline underline-offset-2">Terms</Link>{' '}and{' '}
                  <Link href="/landing" className="underline underline-offset-2">Privacy Policy</Link>.
                </p>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
