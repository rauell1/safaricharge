'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Users, FolderOpen, Activity, MessageSquare, RefreshCw,
  TrendingUp, Zap, Database, Shield, Clock, ChevronRight, LogOut,
} from 'lucide-react'
import { createClient } from '@/lib/supabase'

interface AdminStats {
  users: number
  scenarios: number
  simulation_runs: number
  ai_conversations: number
  ai_messages: number
  recent_users: Array<{ id: string; email: string; subscription_status: string; plan: string; created_at: string }>
  recent_scenarios: Array<{ id: string; name: string; created_at: string; updated_at: string }>
}

function StatCard({ icon: Icon, label, value, color, sub }: {
  icon: React.ElementType; label: string; value: number | string; color: string; sub?: string
}) {
  return (
    <div style={{ background: 'var(--bg-card)', border: `1px solid var(--border)`, borderRadius: 16, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12, boxShadow: 'var(--card-shadow)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</span>
        <div style={{ padding: 8, borderRadius: 10, background: `${color}15`, border: `1px solid ${color}30` }}>
          <Icon size={16} style={{ color }} />
        </div>
      </div>
      <div>
        <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>{value}</div>
        {sub && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{sub}</div>}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    active: { bg: 'var(--battery-soft)', color: 'var(--battery)', label: 'Active' },
    inactive: { bg: 'var(--bg-card-muted)', color: 'var(--text-muted)', label: 'Inactive' },
    trial: { bg: 'var(--warning-soft)', color: 'var(--warning)', label: 'Trial' },
  }
  const s = map[status] ?? map.inactive
  return (
    <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: s.bg, color: s.color, border: `1px solid ${s.color}20` }}>
      {s.label}
    </span>
  )
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const handleSignOut = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      
      // Force clear all authentication and session tracking cookies
      document.cookie = 'sc_last_seen=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      document.cookie = 'sc_auth_checked_at=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      document.cookie = 'sc_admin_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      
      // Perform full page redirection back to login gateway
      window.location.assign('/login');
    } catch (err) {
      console.error('Failed to sign out:', err);
    }
  };

  const fetchStats = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/stats')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setStats(await res.json())
      setLastRefresh(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stats')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchStats() }, [fetchStats])

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; background: var(--bg-primary); }
        @keyframes pulse { 0%,100%{opacity:.2;transform:scale(1)} 50%{opacity:.5;transform:scale(1.04)} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        .row-hover:hover { background: var(--bg-card-hover) !important; }
      `}</style>

      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontFamily: "'Inter',system-ui,sans-serif", display: 'flex', flexDirection: 'column' }}>
        {/* Background decoration */}
        <div aria-hidden style={{ position: 'fixed', inset: 0, backgroundImage: 'linear-gradient(var(--site-grid-line) 1px,transparent 1px),linear-gradient(90deg,var(--site-grid-line) 1px,transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none', zIndex: 0 }} />

        {/* Header */}
        <header style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px', height: 64, borderBottom: '1px solid var(--border)', background: 'var(--site-nav-bg)', backdropFilter: 'blur(16px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ padding: 8, borderRadius: 10, background: 'var(--battery-soft)', border: '1px solid rgba(16,185,129,0.2)' }}>
              <Shield size={18} style={{ color: 'var(--battery)' }} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--battery)', lineHeight: 1.1 }}>SafariCharge</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Admin Dashboard</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {lastRefresh && (
              <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={12} /> Updated {timeAgo(lastRefresh.toISOString())}
              </span>
            )}
            <Link
              href="/landing"
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500, cursor: 'pointer', textDecoration: 'none', transition: 'all 0.2s' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-primary)'; (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--border-strong)'; (e.currentTarget as HTMLAnchorElement).style.background = 'var(--bg-card-hover)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-secondary)'; (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLAnchorElement).style.background = 'var(--bg-card)'; }}
            >
              Main Site
            </Link>
            <Link
              href="/dashboard"
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(16,185,129,0.2)', background: 'var(--battery-soft)', color: 'var(--battery)', fontSize: 13, fontWeight: 500, cursor: 'pointer', textDecoration: 'none', transition: 'all 0.2s' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(16,185,129,0.15)'; (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(16,185,129,0.35)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = 'var(--battery-soft)'; (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(16,185,129,0.2)'; }}
            >
              Monitoring Dashboard
            </Link>
            <button
              onClick={fetchStats}
              disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(16,185,129,0.2)', background: 'var(--battery-soft)', color: 'var(--battery)', fontSize: 13, fontWeight: 500, cursor: loading ? 'default' : 'pointer' }}
            >
              <RefreshCw size={13} style={loading ? { animation: 'spin 1s linear infinite' } : undefined} />
              Refresh
            </button>
            <button
              onClick={handleSignOut}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.2)', background: 'var(--alert-soft)', color: 'var(--alert)', fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.15)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(239,68,68,0.35)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--alert-soft)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(239,68,68,0.2)'; }}
            >
              <LogOut size={13} />
              Sign Out
            </button>
          </div>
        </header>

        {/* Content */}
        <main style={{ position: 'relative', zIndex: 1, flex: 1, maxWidth: 1200, width: '100%', margin: '0 auto', padding: '32px 24px' }}>

          {error && (
            <div style={{ padding: '12px 16px', borderRadius: 10, background: 'var(--alert-soft)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--alert)', fontSize: 13, marginBottom: 24 }}>
              {error} -  <button onClick={fetchStats} style={{ background: 'none', border: 'none', color: 'var(--alert)', textDecoration: 'underline', cursor: 'pointer', fontSize: 13 }}>Retry</button>
            </div>
          )}

          {/* Page title */}
          <div style={{ marginBottom: 28 }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px 0', letterSpacing: '-0.02em' }}>
              Platform Overview
            </h1>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>
              Real-time metrics from the Supabase database
            </p>
          </div>

          {/* Stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
            <StatCard icon={Users} label="Total Users" value={loading ? ' - ' : (stats?.users ?? 0)} color="var(--battery)" sub="registered profiles" />
            <StatCard icon={FolderOpen} label="Scenarios" value={loading ? ' - ' : (stats?.scenarios ?? 0)} color="#6366f1" sub="saved configurations" />
            <StatCard icon={Activity} label="Sim Runs" value={loading ? ' - ' : (stats?.simulation_runs ?? 0)} color="#f59e0b" sub="simulation sessions" />
            <StatCard icon={MessageSquare} label="AI Chats" value={loading ? ' - ' : (stats?.ai_conversations ?? 0)} color="#06b6d4" sub={`${stats?.ai_messages ?? 0} messages total`} />
          </div>

          {/* Two-column lower section */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>

            {/* Recent Users */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', boxShadow: 'var(--card-shadow)' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Users size={15} style={{ color: 'var(--battery)' }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Recent Users</span>
                </div>
                <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
              </div>
              <div>
                {loading ? (
                  <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Loading…</div>
                ) : (stats?.recent_users?.length ?? 0) === 0 ? (
                  <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No users yet</div>
                ) : stats?.recent_users.map((u) => (
                  <div key={u.id} className="row-hover" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}>
                    <div>
                      <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{u.email ?? u.id.slice(0, 16) + '…'}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{timeAgo(u.created_at)} · {u.plan ?? 'free'}</div>
                    </div>
                    <StatusBadge status={u.subscription_status ?? 'inactive'} />
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Scenarios */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', boxShadow: 'var(--card-shadow)' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FolderOpen size={15} style={{ color: '#6366f1' }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Recent Scenarios</span>
                </div>
                <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
              </div>
              <div>
                {loading ? (
                  <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Loading…</div>
                ) : (stats?.recent_scenarios?.length ?? 0) === 0 ? (
                  <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No scenarios yet</div>
                ) : stats?.recent_scenarios.map((s) => (
                  <div key={s.id} className="row-hover" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}>
                    <div>
                      <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{s.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>Updated {timeAgo(s.updated_at)}</div>
                    </div>
                    <Zap size={13} style={{ color: '#6366f1' }} />
                  </div>
                ))}
              </div>
            </div>

            {/* Infrastructure Status */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', boxShadow: 'var(--card-shadow)' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Database size={15} style={{ color: '#06b6d4' }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Infrastructure</span>
              </div>
              <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  { label: 'Supabase DB', ok: !error && !loading, detail: 'PostgreSQL · pnlylqdtaucoegotbycw' },
                  { label: 'Auth System', ok: true, detail: 'Supabase magic-link · httpOnly sessions' },
                  { label: 'Admin Auth', ok: true, detail: 'HMAC-SHA256 · server-side only' },
                  { label: 'API Routes', ok: true, detail: 'Next.js App Router · edge-compatible' },
                ].map(({ label, ok, detail }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{label}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{detail}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: ok ? '#10b981' : '#ef4444', boxShadow: `0 0 6px ${ok ? '#10b981' : '#ef4444'}` }} />
                      <span style={{ fontSize: 11, color: ok ? '#10b981' : '#ef4444' }}>{ok ? 'Online' : 'Error'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Usage */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', boxShadow: 'var(--card-shadow)' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <TrendingUp size={15} style={{ color: '#f59e0b' }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>AI Assistant Usage</span>
              </div>
              <div style={{ padding: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  {[
                    { label: 'Conversations', value: stats?.ai_conversations ?? 0, color: '#06b6d4' },
                    { label: 'Messages', value: stats?.ai_messages ?? 0, color: 'var(--battery)' },
                    { label: 'Avg msg/conv', value: stats?.ai_conversations ? Math.round((stats.ai_messages ?? 0) / stats.ai_conversations) : 0, color: '#f59e0b' },
                    { label: 'Sim Runs', value: stats?.simulation_runs ?? 0, color: '#6366f1' },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ padding: '14px 16px', borderRadius: 12, background: `${color}08`, border: `1px solid ${color}20` }}>
                      <div style={{ fontSize: 22, fontWeight: 700, color, lineHeight: 1 }}>{loading ? ' - ' : value}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>

        <footer style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: 16, borderTop: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 11.5 }}>
          © {new Date().getFullYear()} SafariCharge · Admin Gateway · Session expires after 1 hour of inactivity
        </footer>
      </div>
    </>
  )
}
