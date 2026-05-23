'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { LockKeyhole, Mail, Loader2, Server, ShieldCheck, Cpu } from 'lucide-react'
import Link from 'next/link'

export default function AdminLoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [statusText, setStatusText] = useState('System Offline')

  // Check if logout was requested
  useEffect(() => {
    if (searchParams.get('logout') === '1') {
      document.cookie = 'sc_admin_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
      setStatusText('Session Terminated Successfully')
    } else {
      setStatusText('System Status: Ready to Authenticate')
    }
  }, [searchParams])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    setStatusText('Initiating Secure Handshake...')

    setTimeout(() => {
      const trimmedEmail = email.trim().toLowerCase()
      if (trimmedEmail === 'royokola3@gmail.com' && password === 'info@rauell.systems') {
        setStatusText('Access Granted. Establishing Uplink...')
        
        // Write the secure admin cookie
        document.cookie = 'sc_admin_token=safaricharge-admin-session-active; path=/; max-age=3600; SameSite=Lax; Secure'
        
        setTimeout(() => {
          router.push('/admin')
        }, 800)
      } else {
        setError('Access Denied. Invalid Administrator Credentials.')
        setStatusText('Handshake Failed. Security Threat Logged.')
        setLoading(false)
      }
    }, 1200)
  }

  const primaryBtn: React.CSSProperties = {
    width: '100%',
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    border: '1px solid #34d399',
    borderRadius: 10,
    padding: '13px',
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    boxShadow: '0 0 24px rgba(16,185,129,0.3)',
    transition: 'all 0.2s ease-in-out',
    textShadow: '0 1px 2px rgba(0,0,0,0.2)',
  }

  return (
    <>
      <style>{`
        html, body { overflow: hidden; height: 100%; margin: 0; padding: 0; background: #030712; }
        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.05); }
        }
        .glow-effect {
          box-shadow: 0 0 40px rgba(16,185,129,0.1);
        }
        .input-glow:focus {
          border-color: #10b981 !important;
          box-shadow: 0 0 15px rgba(16,185,129,0.2) !important;
        }
      `}</style>
      
      <div style={{ position: 'fixed', inset: 0, color: '#f3f4f6', fontFamily: "'Outfit', 'Inter', system-ui, sans-serif", display: 'flex', flexDirection: 'column' }}>
        {/* Animated matrix grid */}
        <div aria-hidden style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(16, 185, 129, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(16, 185, 129, 0.03) 1px, transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none' }} />
        
        {/* High-tech glow orbs */}
        <div aria-hidden style={{ position: 'absolute', top: '-10%', left: '30%', width: '40vw', height: '40vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 70%)', filter: 'blur(40px)', pointerEvents: 'none', animation: 'pulse 8s infinite ease-in-out' }} />
        <div aria-hidden style={{ position: 'absolute', bottom: '-10%', right: '20%', width: '35vw', height: '35vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(6,182,212,0.04) 0%, transparent 70%)', filter: 'blur(30px)', pointerEvents: 'none', animation: 'pulse 12s infinite ease-in-out' }} />
        
        {/* Cyberpunk Scanline */}
        <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent, rgba(16,185,129,0.02) 10%, transparent 20%)', height: '100%', width: '100%', animation: 'scanline 6s linear infinite', pointerEvents: 'none' }} />

        {/* Dynamic header */}
        <header style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px', height: 70, borderBottom: '1px solid rgba(16,185,129,0.1)', background: 'rgba(3,7,18,0.6)', backdropFilter: 'blur(10px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Server style={{ color: '#10b981', width: 22, height: 22 }} />
            <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em', color: '#10b981' }}>SafariCharge Admin Gateway</span>
          </div>
          <Link href="/landing" style={{ fontSize: 13, textDecoration: 'none', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.08)', padding: '6px 14px', borderRadius: 8, transition: 'all 0.2s', background: 'rgba(255,255,255,0.02)' }}>
            Leave Gateway
          </Link>
        </header>

        {/* Main Content Form */}
        <div style={{ position: 'relative', zIndex: 10, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, overflowY: 'auto' }}>
          <div className="glow-effect" style={{ width: '100%', maxWidth: 440, borderRadius: 20, border: '1px solid rgba(16,185,129,0.15)', background: 'rgba(10,15,30,0.7)', backdropFilter: 'blur(30px)', padding: '36px 32px', boxSizing: 'border-box' }}>
            
            {/* Shield and Status indicator */}
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ display: 'inline-flex', padding: 12, borderRadius: '50%', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', marginBottom: 14 }}>
                <ShieldCheck style={{ width: 32, height: 32, color: '#10b981' }} />
              </div>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: '#f3f4f6', margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
                Secure Admin Access
              </h1>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 20, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: loading ? '#34d399' : error ? '#ef4444' : '#10b981', boxShadow: `0 0 8px ${loading ? '#34d399' : error ? '#ef4444' : '#10b981'}` }} />
                <span style={{ fontSize: 11.5, fontFamily: 'monospace', color: '#9ca3af' }}>{statusText}</span>
              </div>
            </div>

            {error && (
              <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', fontSize: 13, marginBottom: 18, fontFamily: 'monospace' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label htmlFor="email" style={{ display: 'block', color: '#9ca3af', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
                  Admin Email
                </label>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#6b7280', pointerEvents: 'none' }}>
                    <Mail size={16} />
                  </div>
                  <input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="operator@safaricharge.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-glow"
                    style={{ width: '100%', background: 'rgba(3,7,18,0.5)', border: '1px solid rgba(16,185,129,0.12)', borderRadius: 10, padding: '12px 14px 12px 42px', color: '#f3f4f6', fontSize: 14, outline: 'none', boxSizing: 'border-box', transition: 'all 0.2s' }}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" style={{ display: 'block', color: '#9ca3af', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
                  Key Phrase
                </label>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#6b7280', pointerEvents: 'none' }}>
                    <LockKeyhole size={16} />
                  </div>
                  <input
                    id="password"
                    type="password"
                    required
                    autoComplete="current-password"
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-glow"
                    style={{ width: '100%', background: 'rgba(3,7,18,0.5)', border: '1px solid rgba(16,185,129,0.12)', borderRadius: 10, padding: '12px 14px 12px 42px', color: '#f3f4f6', fontSize: 14, outline: 'none', boxSizing: 'border-box', transition: 'all 0.2s' }}
                  />
                </div>
              </div>

              <div style={{ marginTop: 8 }}>
                <button type="submit" disabled={loading} style={primaryBtn}>
                  {loading ? (
                    <>
                      <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} />
                      Securing Handshake…
                    </>
                  ) : (
                    <>
                      <Cpu size={16} />
                      Establish secure Link
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Dynamic footer */}
        <footer style={{ zIndex: 10, textAlign: 'center', padding: 16, borderTop: '1px solid rgba(16,185,129,0.06)', color: '#4b5563', fontSize: 11.5, background: 'rgba(3,7,18,0.8)' }}>
          © {new Date().getFullYear()} SafariCharge · Authorized Administrator Gateway · High-Efficiency Security Core
        </footer>
      </div>
    </>
  )
}
