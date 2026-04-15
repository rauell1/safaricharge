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
} from 'lucide-react';

type State = 'idle' | 'loading' | 'sent' | 'error';

// Set to true to re-enable sign-in
const SIGN_IN_ENABLED = false;

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
      style={{ background: '#050911', fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      {/* Noise texture */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.025]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '200px 200px',
        }}
      />

      {/* ── Left brand panel ── */}
      <aside
        aria-hidden="true"
        className="hidden lg:flex lg:w-[52%] xl:w-[55%] flex-col relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #060d1a 0%, #071810 60%, #050911 100%)' }}
      >
        {/* Grid */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.7) 1px, transparent 1px)',
            backgroundSize: '56px 56px',
          }}
        />
        {/* Radial glow */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 65%)' }}
        />
        {/* Corner accent */}
        <div
          className="absolute bottom-0 right-0 w-80 h-80 pointer-events-none"
          style={{ background: 'radial-gradient(circle at bottom right, rgba(16,185,129,0.06) 0%, transparent 70%)' }}
        />

        {/* Logo */}
        <header className="relative z-10 flex items-center gap-3 px-12 pt-12">
          <span
            className="grid place-items-center w-9 h-9 rounded-xl"
            style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.25)' }}
          >
            <Sun className="w-5 h-5" style={{ color: '#10b981' }} strokeWidth={2} />
          </span>
          <span className="text-base font-semibold tracking-tight" style={{ color: '#f1f5f9' }}>
            SafariCharge
          </span>
        </header>

        {/* Hero copy */}
        <div className="relative z-10 flex-1 flex flex-col justify-center px-12 pb-16">
          <p className="text-xs font-semibold uppercase tracking-widest mb-5" style={{ color: '#10b981' }}>
            Solar Energy Intelligence
          </p>
          <h1
            className="font-bold leading-[1.1] mb-6"
            style={{
              fontSize: 'clamp(2rem, 3.5vw, 3rem)',
              color: '#f1f5f9',
              letterSpacing: '-0.03em',
            }}
          >
            Optimise every<br />kilowatt-hour
          </h1>
          <p
            className="leading-relaxed max-w-xs text-sm"
            style={{ color: 'rgba(255,255,255,0.45)' }}
          >
            Real-time monitoring, Pyomo dispatch optimisation, and AI-driven
            recommendations — built for Nairobi's solar professionals.
          </p>

          {/* Metric row */}
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
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div className="font-bold text-lg mb-0.5" style={{ color: '#10b981', letterSpacing: '-0.03em' }}>{m.value}</div>
                <div className="text-xs" style={{ color: 'rgba(255,255,255,0.38)' }}>{m.label}</div>
              </div>
            ))}
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-2 mt-8">
            {[
              { icon: Sun,     label: 'PV Monitoring',      color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
              { icon: Battery, label: 'BESS Optimisation',  color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
              { icon: Zap,     label: 'Grid Analytics',     color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
            ].map(({ icon: Icon, label, color, bg }) => (
              <span
                key={label}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
                style={{ background: bg, color, border: `1px solid ${color}22` }}
              >
                <Icon className="w-3 h-3" strokeWidth={2} />
                {label}
              </span>
            ))}
          </div>
        </div>

        <footer
          className="relative z-10 px-12 py-6 text-xs"
          style={{ color: 'rgba(255,255,255,0.22)', borderTop: '1px solid rgba(255,255,255,0.055)' }}
        >
          SafariCharge © 2026 · Nairobi, Kenya
        </footer>
      </aside>

      {/* ── Right auth panel ── */}
      <main className="flex-1 flex flex-col relative z-10">
        <header
          className="flex items-center justify-between px-7 py-5 lg:px-12 lg:py-6"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <Link href="/landing" className="flex items-center gap-2.5 group">
            <span
              className="grid place-items-center w-8 h-8 rounded-lg transition-all group-hover:scale-105"
              style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.2)' }}
            >
              <Sun className="w-4 h-4" style={{ color: '#10b981' }} strokeWidth={2.5} />
            </span>
            <span className="font-semibold tracking-tight text-sm" style={{ color: '#f1f5f9' }}>
              SafariCharge
            </span>
          </Link>
          <Link
            href="/landing"
            className="text-sm transition-colors"
            style={{ color: 'rgba(255,255,255,0.35)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.7)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.35)'; }}
          >
            ← Back to home
          </Link>
        </header>

        <div className="flex-1 flex items-center justify-center px-7 py-14">
          <div className="w-full max-w-[390px]">

            {!SIGN_IN_ENABLED ? (
              /* ── Disabled state ── */
              <>
                {/* Notice card */}
                <div
                  className="rounded-2xl px-7 py-8 mb-6 text-center"
                  style={{
                    background: 'rgba(255,255,255,0.025)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <div
                    className="mx-auto w-14 h-14 rounded-2xl grid place-items-center mb-5"
                    style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}
                  >
                    <Lock className="w-7 h-7" style={{ color: '#10b981' }} />
                  </div>
                  <h1
                    className="text-xl font-bold mb-2"
                    style={{ color: '#f1f5f9', letterSpacing: '-0.02em' }}
                  >
                    Sign-in temporarily disabled
                  </h1>
                  <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
                    Account creation and sign-in are currently paused.
                    You can still access the dashboard directly.
                  </p>
                </div>

                {/* Dashboard CTA */}
                <Link
                  href="/demo"
                  className="flex items-center justify-between w-full rounded-2xl px-5 py-4 mb-4 transition-all group"
                  style={{
                    background: 'rgba(16,185,129,0.08)',
                    border: '1px solid rgba(16,185,129,0.25)',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(16,185,129,0.13)';
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(16,185,129,0.4)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(16,185,129,0.08)';
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(16,185,129,0.25)';
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-xl grid place-items-center"
                      style={{ background: 'rgba(16,185,129,0.15)' }}
                    >
                      <Activity className="w-4 h-4" style={{ color: '#10b981' }} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: '#f1f5f9' }}>Open Dashboard</p>
                      <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Real-time solar · BESS · KPLC analytics</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" style={{ color: '#10b981' }} />
                </Link>

                <p className="text-center text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
                  No account needed · Full access · Live data
                </p>
              </>
            ) : state === 'sent' ? (
              /* ── Sent state ── */
              <div
                className="text-center rounded-2xl px-6 py-8"
                style={{
                  border: '1px solid rgba(16,185,129,0.2)',
                  background: 'rgba(16,185,129,0.05)',
                }}
              >
                <div
                  className="mx-auto w-14 h-14 rounded-2xl grid place-items-center mb-5"
                  style={{ background: 'rgba(16,185,129,0.12)' }}
                >
                  <CheckCircle2 className="w-7 h-7" style={{ color: '#10b981' }} />
                </div>
                <h1 className="text-xl font-bold mb-2" style={{ color: '#f1f5f9', letterSpacing: '-0.02em' }}>
                  Check your inbox
                </h1>
                <p className="text-sm leading-relaxed mb-8" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  We sent a magic link to{' '}
                  <span style={{ color: '#f1f5f9', fontWeight: 600 }}>{email}</span>.
                  Click the link to sign in — it expires in&nbsp;10&nbsp;minutes.
                </p>
                <button
                  onClick={() => setState('idle')}
                  className="text-sm font-medium transition-colors"
                  style={{ color: '#10b981' }}
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
                    style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}
                  >
                    <Mail className="w-6 h-6" style={{ color: '#10b981' }} />
                  </div>
                  <h1 className="text-2xl font-bold mb-1.5" style={{ color: '#f1f5f9', letterSpacing: '-0.03em' }}>Sign in</h1>
                  <p className="text-sm" style={{ color: 'rgba(255,255,255,0.42)' }}>
                    Sign in with password, or receive a magic link via Resend.
                  </p>
                </div>

                {/* Password form */}
                <p className="mb-3 text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.7)' }}>Password</p>
                <form onSubmit={handlePasswordSignIn} className="space-y-4 mb-6">
                  <div className="space-y-1.5">
                    <label htmlFor="password-email" className="block text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>Email</label>
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
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.09)',
                        color: '#f1f5f9',
                      }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>Password</label>
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
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.09)',
                        color: '#f1f5f9',
                      }}
                    />
                  </div>
                  {passwordState === 'error' && (
                    <div className="flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
                      <AlertCircle className="w-4 h-4 shrink-0" />{passwordErrorMsg}
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={passwordState === 'loading' || !passwordEmail.trim() || !password}
                    className="w-full flex items-center justify-center gap-2 font-semibold text-sm px-4 py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: '#10b981', color: '#fff' }}
                    onMouseEnter={(e) => { if (!(e.currentTarget as HTMLButtonElement).disabled) (e.currentTarget as HTMLElement).style.background = '#34d399'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '#10b981'; }}
                  >
                    {passwordState === 'loading'
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in&hellip;</>
                      : <>Sign in <ArrowRight className="w-4 h-4" /></>}
                  </button>
                </form>

                {/* Divider */}
                <div className="flex items-center gap-3 my-5" style={{ color: 'rgba(255,255,255,0.2)' }}>
                  <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />
                  <span className="text-xs font-semibold tracking-wider">or magic link</span>
                  <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />
                </div>

                {/* Magic-link form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>Email address</label>
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
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.09)',
                        color: '#f1f5f9',
                        transition: 'border-color 180ms ease, box-shadow 180ms ease',
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(16,185,129,0.5)';
                        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.12)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    />
                  </div>
                  {state === 'error' && (
                    <div className="flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
                      <AlertCircle className="w-4 h-4 shrink-0" />{errorMsg}
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={state === 'loading' || !email.trim()}
                    className="w-full flex items-center justify-center gap-2 font-semibold text-sm px-4 py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: '#10b981', color: '#fff' }}
                    onMouseEnter={(e) => { if (!(e.currentTarget as HTMLButtonElement).disabled) (e.currentTarget as HTMLElement).style.background = '#34d399'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '#10b981'; }}
                  >
                    {state === 'loading'
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending&hellip;</>
                      : <>Email me a magic link <ArrowRight className="w-4 h-4" /></>}
                  </button>
                </form>

                <div className="mt-6 text-sm text-center" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  New here?{' '}<Link href="/signup" className="underline underline-offset-2" style={{ color: 'rgba(255,255,255,0.6)' }}>Create an account</Link>
                  {' · '}
                  <Link href="/forgot-password" className="underline underline-offset-2" style={{ color: 'rgba(255,255,255,0.6)' }}>Forgot password?</Link>
                </div>

                <p className="mt-8 text-center text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.2)' }}>
                  By signing in you agree to our{' '}
                  <Link href="/landing" className="underline underline-offset-2" style={{ color: 'rgba(255,255,255,0.2)' }}>Terms</Link>{' '}and{' '}
                  <Link href="/landing" className="underline underline-offset-2" style={{ color: 'rgba(255,255,255,0.2)' }}>Privacy Policy</Link>.
                </p>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
