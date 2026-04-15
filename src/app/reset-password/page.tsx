'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import Link from 'next/link';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage('');
    if (!token) {
      setMessage('Reset token is missing.');
      return;
    }
    if (password !== confirmPassword) {
      setMessage('Passwords do not match.');
      return;
    }

    setLoading(true);
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    setMessage(data.ok ? 'Password reset complete. You can now sign in.' : data.error ?? 'Reset failed.');
    setLoading(false);
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg-primary)' }}>
      <div className="w-full max-w-md rounded-2xl border p-6 space-y-5" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Reset password</h1>
        <form onSubmit={onSubmit} className="space-y-4">
          <input className="w-full rounded-xl px-4 py-3 text-sm" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} type="password" placeholder="New password (min 8 chars)" required value={password} onChange={(e) => setPassword(e.target.value)} />
          <input className="w-full rounded-xl px-4 py-3 text-sm" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} type="password" placeholder="Confirm new password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          <button disabled={loading} className="w-full rounded-xl py-3 text-sm font-semibold disabled:opacity-60" style={{ background: 'var(--battery)', color: '#fff' }}>
            {loading ? 'Updating...' : 'Update password'}
          </button>
        </form>
        {message && <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{message}</p>}
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Go to <Link className="underline" href="/login">login</Link>
        </p>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg-primary)' }}>
          <div className="w-full max-w-md rounded-2xl border p-6" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading reset form...</p>
          </div>
        </main>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
