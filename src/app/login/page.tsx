'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { Sun, Mail, ArrowRight, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

type State = 'idle' | 'loading' | 'sent' | 'error';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<State>('idle');
  const [errorMsg, setErrorMsg] = useState('');

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

  return (
    <div className="min-h-screen bg-[#0d1117] flex flex-col">
      {/* Nav */}
      <header className="flex items-center justify-between px-6 py-5">
        <Link href="/landing" className="flex items-center gap-2.5">
          <span className="grid place-items-center w-8 h-8 rounded-lg bg-emerald-500/15">
            <Sun className="w-4 h-4 text-emerald-400" strokeWidth={2.5} />
          </span>
          <span className="font-semibold tracking-tight text-white text-sm">SafariCharge</span>
        </Link>
        <Link href="/landing" className="text-sm text-white/40 hover:text-white/70 transition-colors">
          Back to home
        </Link>
      </header>

      {/* Card */}
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm">
          {state === 'sent' ? (
            /* ── Success state ── */
            <div className="text-center">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-500/10 grid place-items-center mb-5">
                <CheckCircle2 className="w-7 h-7 text-emerald-400" />
              </div>
              <h1 className="text-xl font-semibold text-white mb-2">Check your inbox</h1>
              <p className="text-sm text-white/45 leading-relaxed mb-6">
                We sent a magic link to <span className="text-white/70 font-medium">{email}</span>.
                Click the link to sign in — it expires in&nbsp;10&nbsp;minutes.
              </p>
              <p className="text-xs text-white/25">
                No email?{' '}
                <button
                  onClick={() => { setState('idle'); }}
                  className="text-emerald-400 hover:underline"
                >
                  Try again
                </button>
              </p>
            </div>
          ) : (
            /* ── Form state ── */
            <>
              {/* Header */}
              <div className="text-center mb-8">
                <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-500/10 grid place-items-center mb-5">
                  <Mail className="w-7 h-7 text-emerald-400" />
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">Sign in to SafariCharge</h1>
                <p className="text-sm text-white/45">
                  Enter your email and we&rsquo;ll send you a magic link.
                  No password needed.
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="email" className="block text-xs font-medium text-white/50 uppercase tracking-wider">
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
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 disabled:opacity-50 transition-all"
                  />
                </div>

                {state === 'error' && (
                  <div className="flex items-center gap-2.5 rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-sm text-red-400">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {errorMsg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={state === 'loading' || !email.trim()}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold text-sm px-4 py-3 rounded-xl transition-colors"
                >
                  {state === 'loading' ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Sending&hellip;</>
                  ) : (
                    <>Send magic link <ArrowRight className="w-4 h-4" /></>
                  )}
                </button>
              </form>

              {/* Footer links */}
              <p className="mt-8 text-center text-xs text-white/25">
                By signing in, you agree to our{' '}
                <Link href="/landing" className="text-white/40 hover:text-white/60 underline underline-offset-2">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/landing" className="text-white/40 hover:text-white/60 underline underline-offset-2">
                  Privacy Policy
                </Link>.
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
