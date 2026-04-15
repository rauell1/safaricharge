'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { Loader2, Sun } from 'lucide-react';

export default function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = 'var(--battery)';
    e.currentTarget.style.boxShadow = '0 0 0 3px var(--battery-soft)';
  };
  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = 'var(--border)';
    e.currentTarget.style.boxShadow = 'none';
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      setError(data.error ?? 'Could not create account.');
      setLoading(false);
      return;
    }

    const login = await signIn('credentials', {
      email,
      password,
      redirect: true,
      callbackUrl: '/demo',
    });

    if (login?.error) {
      setError('Account created, but sign in failed. Please log in manually.');
      setLoading(false);
      return;
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg-primary)' }}>
      <div className="w-full max-w-[440px] rounded-2xl border p-8 space-y-5" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
        <div className="mb-8">
          <div className="w-12 h-12 rounded-2xl grid place-items-center mb-5" style={{ background: 'var(--battery-soft)' }}>
            <Sun className="w-6 h-6" style={{ color: 'var(--battery)' }} />
          </div>
          <h1 className="text-2xl font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>Create account</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Join SafariCharge and start monitoring your solar system.
          </p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
              Email address
            </label>
            <input
              id="email"
              className="w-full rounded-xl px-4 py-3 text-sm outline-none"
              style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)', transition: 'border-color 180ms ease, box-shadow 180ms ease' }}
              type="email"
              placeholder="Email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
              Password
            </label>
            <input
              id="password"
              className="w-full rounded-xl px-4 py-3 text-sm outline-none"
              style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)', transition: 'border-color 180ms ease, box-shadow 180ms ease' }}
              type="password"
              placeholder="Password (min 8 chars)"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="confirmPassword" className="block text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
              Confirm password
            </label>
            <input
              id="confirmPassword"
              className="w-full rounded-xl px-4 py-3 text-sm outline-none"
              style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)', transition: 'border-color 180ms ease, box-shadow 180ms ease' }}
              type="password"
              placeholder="Confirm password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
            />
          </div>
          {error && <p className="text-sm" style={{ color: 'var(--alert)' }}>{error}</p>}
          <button disabled={loading} className="w-full rounded-xl py-3 text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2" style={{ background: 'var(--battery)', color: '#fff' }}>
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating account...</> : 'Create account'}
          </button>
        </form>
        <p className="text-sm text-center whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
          Already have an account? <Link className="underline" href="/login">Sign in</Link>
        </p>
      </div>
    </main>
  );
}
