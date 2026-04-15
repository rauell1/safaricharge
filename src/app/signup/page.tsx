'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import Link from 'next/link';

export default function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
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
      <div className="w-full max-w-md rounded-2xl border p-6 space-y-5" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Create account</h1>
        <form onSubmit={onSubmit} className="space-y-4">
          <input className="w-full rounded-xl px-4 py-3 text-sm" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} type="email" placeholder="Email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className="w-full rounded-xl px-4 py-3 text-sm" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} type="password" placeholder="Password (min 8 chars)" required value={password} onChange={(e) => setPassword(e.target.value)} />
          <input className="w-full rounded-xl px-4 py-3 text-sm" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} type="password" placeholder="Confirm password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          {error && <p className="text-sm" style={{ color: 'var(--alert)' }}>{error}</p>}
          <button disabled={loading} className="w-full rounded-xl py-3 text-sm font-semibold disabled:opacity-60" style={{ background: 'var(--battery)', color: '#fff' }}>
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Already have an account? <Link className="underline" href="/login">Sign in</Link>
        </p>
      </div>
    </main>
  );
}
