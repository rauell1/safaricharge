'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage('');
    setLoading(true);

    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = (await res.json()) as { message?: string; error?: string };
    setMessage(data.message ?? data.error ?? 'Request processed.');
    setLoading(false);
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg-primary)' }}>
      <div className="w-full max-w-md rounded-2xl border p-6 space-y-5" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Forgot password</h1>
        <form onSubmit={onSubmit} className="space-y-4">
          <input className="w-full rounded-xl px-4 py-3 text-sm" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} type="email" placeholder="Email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <button disabled={loading} className="w-full rounded-xl py-3 text-sm font-semibold disabled:opacity-60" style={{ background: 'var(--battery)', color: '#fff' }}>
            {loading ? 'Sending...' : 'Send reset link'}
          </button>
        </form>
        {message && <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{message}</p>}
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Back to <Link className="underline" href="/login">login</Link>
        </p>
      </div>
    </main>
  );
}
