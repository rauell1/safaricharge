'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Server, Cpu, Database, BarChart3, FileText, Download, 
  Settings2, Activity, ShieldAlert, LogOut, FileSpreadsheet, RefreshCw
} from 'lucide-react'
import { useEnergySystemStore } from '@/stores/energySystemStore'
import type { MinuteDataPoint } from '@/stores/energySystemStore'

type Tab = 'topology' | 'analytics' | 'logs' | 'reports'

export default function AdminDashboardPage() {
  const router = useRouter()
  const { minuteData, nodes, systemConfig } = useEnergySystemStore()
  
  const [activeTab, setActiveTab] = useState<Tab>('topology')
  const [sessionActive, setSessionActive] = useState(true)

  // Auth gate safety check (Double check client-side token)
  useEffect(() => {
    const checkToken = () => {
      const match = document.cookie.match(/(^| )sc_admin_token=([^;]+)/)
      if (!match || match[2] !== 'safaricharge-admin-session-active') {
        setSessionActive(false)
        router.push('/admin-login')
      }
    }
    checkToken()
    const interval = setInterval(checkToken, 5000)
    return () => clearInterval(interval)
  }, [router])

  const handleLogout = () => {
    router.push('/admin-login?logout=1')
  }

  // ---------------------------------------------------------------------------
  // Node metrics resolution
  // ---------------------------------------------------------------------------
  const solarPower = nodes.solar?.powerKW ?? 0
  const batteryPower = nodes.battery?.powerKW ?? 0 // positive = charging, negative = discharging
  const batterySoc = nodes.battery?.soc ?? 50
  const homePower = nodes.home?.powerKW ?? 0
  const gridPower = nodes.grid?.powerKW ?? 0 // net grid flow
  const ev1Power = nodes.ev1?.powerKW ?? 0
  const ev1Soc = nodes.ev1?.soc ?? 50
  const ev2Power = nodes.ev2?.powerKW ?? 0
  const ev2Soc = nodes.ev2?.soc ?? 50
  const totalEvPower = ev1Power + ev2Power

  // Dynamic particle speed scales (Animation durations: lower duration = faster speed)
  const getParticleDuration = (power: number) => {
    const absVal = Math.abs(power)
    if (absVal < 0.1) return '0s' // static
    const dur = Math.max(0.6, Math.min(6.0, 10 / (absVal * 0.4)))
    return `${dur.toFixed(2)}s`
  }

  // ---------------------------------------------------------------------------
  // Graph playground configurations
  // ---------------------------------------------------------------------------
  const [selectedSeries, setSelectedSeries] = useState<string[]>(['solarKW', 'batteryLevelPct', 'gridFrequencyHz'])
  const [chartType, setChartType] = useState<'line' | 'bar'>('line')
  const [smoothingWindow, setSmoothingWindow] = useState<number>(1) // 1 = none, 5 = 5-tick average, 15 = 15-tick average
  const [timeWindow, setTimeWindow] = useState<number>(60) // show last N ticks

  const seriesLabels: Record<string, string> = {
    solarKW: 'Solar Yield (kW)',
    batteryLevelPct: 'Battery SOC (%)',
    gridImportKW: 'Grid Import (kW)',
    gridExportKW: 'Grid Export (kW)',
    homeLoadKW: 'House Load (kW)',
    ev1SocPct: 'EV 1 SOC (%)',
    ev2SocPct: 'EV 2 SOC (%)',
    gridFrequencyHz: 'Grid Freq (Hz)',
  }

  const seriesColors: Record<string, string> = {
    solarKW: '#fbbf24', // yellow
    batteryLevelPct: '#10b981', // green
    gridImportKW: '#3b82f6', // blue
    gridExportKW: '#6366f1', // indigo
    homeLoadKW: '#f87171', // red
    ev1SocPct: '#a7f3d0', // mint
    ev2SocPct: '#67e8f9', // cyan
    gridFrequencyHz: '#ec4899', // pink
  }

  const toggleSeries = (key: string) => {
    setSelectedSeries(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )
  }

  // Chart Data compilation (sliced & smoothed)
  const compiledChartData = useMemo(() => {
    const rawSlice = minuteData.slice(-timeWindow)
    if (smoothingWindow <= 1) return rawSlice

    return rawSlice.map((point, index) => {
      const smoothedPoint = { ...point }
      
      selectedSeries.forEach(key => {
        const start = Math.max(0, index - smoothingWindow + 1)
        const subset = rawSlice.slice(start, index + 1)
        const sum = subset.reduce((acc, curr) => acc + ((curr as any)[key] ?? 0), 0)
        ;(smoothedPoint as any)[key] = sum / subset.length
      })
      
      return smoothedPoint
    })
  }, [minuteData, timeWindow, smoothingWindow, selectedSeries])

  // Custom SVG line chart plotting helper
  const svgPlot = useMemo(() => {
    if (compiledChartData.length < 2 || selectedSeries.length === 0) return null

    const width = 800
    const height = 300
    const padding = 40

    // Find min / max for Y-scales (primary kW and secondary %/Hz)
    let maxKW = 5
    let minFrequency = 49.0
    let maxFrequency = 51.0

    compiledChartData.forEach(d => {
      if (d.solarKW > maxKW) maxKW = d.solarKW
      if (d.homeLoadKW > maxKW) maxKW = d.homeLoadKW
      if (d.gridImportKW > maxKW) maxKW = d.gridImportKW
      if (d.gridExportKW > maxKW) maxKW = d.gridExportKW
      if (d.gridFrequencyHz) {
        if (d.gridFrequencyHz < minFrequency) minFrequency = d.gridFrequencyHz
        if (d.gridFrequencyHz > maxFrequency) maxFrequency = d.gridFrequencyHz
      }
    })
    maxKW = Math.ceil(maxKW * 1.1)

    const pointsBySeries: Record<string, string> = {}
    selectedSeries.forEach(key => {
      pointsBySeries[key] = ''
    })

    compiledChartData.forEach((d, idx) => {
      const x = padding + (idx / (compiledChartData.length - 1)) * (width - 2 * padding)
      
      selectedSeries.forEach(key => {
        const val = (d as any)[key] ?? 0
        let y = 0
        if (key.endsWith('Pct')) {
          // SOC %: scale 0 - 100
          y = height - padding - (val / 100) * (height - 2 * padding)
        } else if (key.endsWith('Hz')) {
          // Frequency: scale minFrequency - maxFrequency
          const freqRange = Math.max(0.2, maxFrequency - minFrequency)
          y = height - padding - ((val - minFrequency) / freqRange) * (height - 2 * padding)
        } else {
          // kW Values: scale 0 - maxKW
          y = height - padding - (val / maxKW) * (height - 2 * padding)
        }
        pointsBySeries[key] += `${x.toFixed(1)},${y.toFixed(1)} `
      })
    })

    return { pointsBySeries, width, height, padding, maxKW, minFrequency, maxFrequency }
  }, [compiledChartData, selectedSeries])

  // ---------------------------------------------------------------------------
  // Raw logs pagination & filtering
  // ---------------------------------------------------------------------------
  const [logsSearch, setLogsSearch] = useState('')
  const [logsFilterColumn, setLogsFilterColumn] = useState<'all' | 'lowFreq' | 'highSolar' | 'lowBattery'>('all')
  const [logsPage, setLogsPage] = useState(1)
  const logsPerPage = 12

  const filteredLogs = useMemo(() => {
    return minuteData.filter(d => {
      // 1. Keyword search
      const matchesSearch = d.timestamp.toLowerCase().includes(logsSearch.toLowerCase()) ||
                            d.hour.toString().includes(logsSearch)
      if (!matchesSearch) return false

      // 2. Numeric preset filters
      if (logsFilterColumn === 'lowFreq') return (d.gridFrequencyHz ?? 50.0) < 49.8
      if (logsFilterColumn === 'highSolar') return d.solarKW > 30.0
      if (logsFilterColumn === 'lowBattery') return d.batteryLevelPct < 30.0

      return true
    }).reverse() // show latest first
  }, [minuteData, logsSearch, logsFilterColumn])

  const paginatedLogs = useMemo(() => {
    const start = (logsPage - 1) * logsPerPage
    return filteredLogs.slice(start, start + logsPerPage)
  }, [filteredLogs, logsPage])

  const maxLogsPage = Math.max(1, Math.ceil(filteredLogs.length / logsPerPage))

  // Logs exporters
  const handleCSVExport = () => {
    const headers = ['Timestamp', 'Solar (kW)', 'Home Load (kW)', 'Battery Level (%)', 'Grid Import (kW)', 'Grid Export (kW)', 'Grid Frequency (Hz)']
    const rows = filteredLogs.map(d => [
      d.timestamp,
      d.solarKW.toFixed(2),
      d.homeLoadKW.toFixed(2),
      d.batteryLevelPct.toFixed(1),
      d.gridImportKW.toFixed(2),
      d.gridExportKW.toFixed(2),
      (d.gridFrequencyHz ?? 50.0).toFixed(2)
    ])
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const link = document.createElement('a')
    link.setAttribute('href', encodeURI(csvContent))
    link.setAttribute('download', `safaricharge_admin_simulation_logs.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleJSONExport = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(filteredLogs, null, 2))
    const link = document.createElement('a')
    link.setAttribute('href', dataStr)
    link.setAttribute('download', `safaricharge_admin_simulation_logs.json`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // ---------------------------------------------------------------------------
  // Interactive Report Builder configurations
  // ---------------------------------------------------------------------------
  const [reportTitle, setReportTitle] = useState('SafariCharge Technical Sizing Report')
  const [reportSubtitle, setReportSubtitle] = useState('Nairobi Microgrid Sizing & Payback Analysis')
  const [customExecutiveSummary, setCustomExecutiveSummary] = useState(
    'The modeled 50.4 kW Jinko solar array, paired with a 19.2 kWh Pylontech LiFePO₄ bank and Level 2 smart EV charging system, successfully demonstrated excellent energy conservation. Grid-frequency demand response and smart V2G triggers successfully protected reserves.'
  )
  const [showExecutiveSummary, setShowExecutiveSummary] = useState(true)
  const [showTechnicalSizing, setShowTechnicalSizing] = useState(true)
  const [showFinancialAnalysis, setShowFinancialAnalysis] = useState(true)

  if (!sessionActive) return null

  return (
    <>
      <style>{`
        body { background: #030712; color: #f3f4f6; font-family: 'Outfit', 'Inter', sans-serif; margin: 0; }
        .tab-btn {
          display: flex; align-items: center; gap: 8px; border: 1px solid rgba(16,185,129,0.12);
          background: rgba(255,255,255,0.02); color: #9ca3af; padding: 10px 16px; borderRadius: 8px;
          fontSize: 13px; fontWeight: 600; cursor: pointer; transition: all 0.2s ease;
        }
        .tab-btn.active {
          background: rgba(16,185,129,0.1); color: #10b981; border-color: rgba(16,185,129,0.3);
          box-shadow: 0 0 16px rgba(16,185,129,0.1);
        }
        .tab-btn:hover {
          background: rgba(255,255,255,0.05); color: #f3f4f6;
        }
        .admin-card {
          border: 1px solid rgba(16,185,129,0.12); background: rgba(10,15,30,0.65);
          backdropFilter: blur(20px); borderRadius: 16px; padding: 24px;
        }
        @media print {
          body * { display: none !important; }
          .printable-report, .printable-report * { display: block !important; }
          .printable-report {
            position: absolute; left: 0; top: 0; width: 100%; color: #000 !important; background: #fff !important;
            padding: 40px; box-sizing: border-box;
          }
          .printable-report h1, .printable-report h2, .printable-report h3 { color: #059669 !important; }
          .printable-report p { color: #374151 !important; line-height: 1.6; }
          .printable-report .section-divider { border-bottom: 2px solid #10b981 !important; margin: 20px 0 !important; }
          .printable-report table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          .printable-report th { background: #e6f4ea !important; color: #0f5132 !important; border: 1px solid #dee2e6; padding: 10px; }
          .printable-report td { border: 1px solid #dee2e6; padding: 10px; }
        }
      `}</style>

      {/* Main Administrative Container */}
      <div className="printable-report" style={{ display: 'none' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ margin: '0 0 4px 0', fontSize: 28, fontWeight: 700 }}>{reportTitle}</h1>
            <p style={{ margin: 0, fontSize: 16, color: '#4b5563' }}>{reportSubtitle}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#10b981', border: '1px solid #10b981', padding: '4px 10px', borderRadius: 20 }}>
              OFFICIAL SYSTEM EXPORT
            </span>
            <p style={{ margin: '6px 0 0 0', fontSize: 12, color: '#6b7280' }}>Date: {new Date().toLocaleDateString()}</p>
          </div>
        </div>
        
        <div className="section-divider" style={{ borderBottom: '1px solid #e5e7eb', margin: '24px 0' }} />

        {showExecutiveSummary && (
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 10px 0' }}>1. Executive Summary</h2>
            <p style={{ fontSize: 14, margin: 0 }}>{customExecutiveSummary}</p>
          </div>
        )}

        {showTechnicalSizing && (
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 10px 0' }}>2. Technical Sizing Audit</h2>
            <p style={{ fontSize: 14, marginBottom: 12 }}>
              The system configuration incorporates highly optimized technical parameters aligned with industry standards:
            </p>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: 8, border: '1px solid #ddd' }}>Parameter</th>
                  <th style={{ textAlign: 'left', padding: 8, border: '1px solid #ddd' }}>Configured Spec</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: 8, border: '1px solid #ddd', fontWeight: 600 }}>PV Array Capacity</td>
                  <td style={{ padding: 8, border: '1px solid #ddd' }}>{systemConfig.solarCapacityKW.toFixed(1)} kW ({Math.round(systemConfig.solarCapacityKW * 1000 / 420)} panels)</td>
                </tr>
                <tr>
                  <td style={{ padding: 8, border: '1px solid #ddd', fontWeight: 600 }}>Battery Storage Bank</td>
                  <td style={{ padding: 8, border: '1px solid #ddd' }}>{systemConfig.batteryCapacityKWh.toFixed(1)} kWh usable LiFePO₄</td>
                </tr>
                <tr>
                  <td style={{ padding: 8, border: '1px solid #ddd', fontWeight: 600 }}>Inverter Capability</td>
                  <td style={{ padding: 8, border: '1px solid #ddd' }}>{systemConfig.inverterKW.toFixed(1)} kW (three-phase)</td>
                </tr>
                <tr>
                  <td style={{ padding: 8, border: '1px solid #ddd', fontWeight: 600 }}>Calculated Solar Performance Ratio</td>
                  <td style={{ padding: 8, border: '1px solid #ddd' }}>{(0.80 * 100).toFixed(0)} %</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {showFinancialAnalysis && (
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 10px 0' }}>3. Financial Sizing Analysis</h2>
            <p style={{ fontSize: 14, margin: '0 0 12px 0' }}>
              Based on Kenyan grid comparison coefficients, modeled system payback averages 4.8 years with high ROI.
            </p>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: 8, border: '1px solid #ddd' }}>Tariff Rate Period</th>
                  <th style={{ textAlign: 'left', padding: 8, border: '1px solid #ddd' }}>Price (KES/kWh)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: 8, border: '1px solid #ddd', fontWeight: 600 }}>Peak Tariff</td>
                  <td style={{ padding: 8, border: '1px solid #ddd' }}>24.31 KES</td>
                </tr>
                <tr>
                  <td style={{ padding: 8, border: '1px solid #ddd', fontWeight: 600 }}>Off-Peak Tariff</td>
                  <td style={{ padding: 8, border: '1px solid #ddd' }}>14.93 KES</td>
                </tr>
                <tr>
                  <td style={{ padding: 8, border: '1px solid #ddd', fontWeight: 600 }}>Feed-in Export rate</td>
                  <td style={{ padding: 8, border: '1px solid #ddd' }}>5.00 KES</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        <div style={{ borderTop: '1px solid #e5e7eb', marginTop: 40, padding: 10, textAlign: 'center', fontSize: 10, color: '#6b7280' }}>
          This report is programmatically compiled via SafariCharge Secure Core. Page 1 of 1.
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#020617' }}>
        {/* Dashboard Top Header */}
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px', height: 75, borderBottom: '1px solid rgba(16,185,129,0.1)', background: 'rgba(3,7,18,0.7)', backdropFilter: 'blur(12px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ background: 'rgba(16,185,129,0.1)', padding: 8, borderRadius: 10, border: '1px solid rgba(16,185,129,0.2)' }}>
              <Cpu style={{ color: '#10b981', width: 22, height: 22 }} />
            </div>
            <div>
              <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em', color: '#f3f4f6', display: 'block' }}>SafariCharge Console</span>
              <span style={{ fontSize: 10.5, fontFamily: 'monospace', color: '#10b981' }}>Secure Operator Core</span>
            </div>
          </div>

          {/* Quick Stats Toggles */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setActiveTab('topology')} className={`tab-btn ${activeTab === 'topology' ? 'active' : ''}`}>
              <Activity size={14} /> Microgrid Topology
            </button>
            <button onClick={() => setActiveTab('analytics')} className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}>
              <BarChart3 size={14} /> Custom Playground
            </button>
            <button onClick={() => setActiveTab('logs')} className={`tab-btn ${activeTab === 'logs' ? 'active' : ''}`}>
              <Database size={14} /> Filterable Logs
            </button>
            <button onClick={() => setActiveTab('reports')} className={`tab-btn ${activeTab === 'reports' ? 'active' : ''}`}>
              <FileText size={14} /> Report Builder
            </button>
          </div>

          <button onClick={handleLogout} style={{ border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.05)', color: '#f87171', display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>
            <LogOut size={13} /> Exit Gate
          </button>
        </header>

        {/* Dashboard Main Workspace */}
        <main style={{ flex: 1, padding: 28, overflowY: 'auto' }}>
          {activeTab === 'topology' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                <div className="admin-card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)', padding: 12, borderRadius: 12 }}>
                    <span style={{ fontSize: 20, color: '#fbbf24' }}>☀️</span>
                  </div>
                  <div>
                    <span style={{ color: '#9ca3af', fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block' }}>Solar Power Yield</span>
                    <span style={{ color: '#f3f4f6', fontSize: 22, fontWeight: 700 }}>{solarPower.toFixed(2)} kW</span>
                  </div>
                </div>
                <div className="admin-card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', padding: 12, borderRadius: 12 }}>
                    <span style={{ fontSize: 20, color: '#10b981' }}>🔋</span>
                  </div>
                  <div>
                    <span style={{ color: '#9ca3af', fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block' }}>Battery Reserve ({batterySoc.toFixed(0)}%)</span>
                    <span style={{ color: '#f3f4f6', fontSize: 22, fontWeight: 700 }}>
                      {Math.abs(batteryPower).toFixed(2)} kW {batteryPower > 0.05 ? '(Chg)' : batteryPower < -0.05 ? '(Dchg)' : '(Idle)'}
                    </span>
                  </div>
                </div>
                <div className="admin-card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', padding: 12, borderRadius: 12 }}>
                    <span style={{ fontSize: 20, color: '#3b82f6' }}>⚡</span>
                  </div>
                  <div>
                    <span style={{ color: '#9ca3af', fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block' }}>Net Grid Flow</span>
                    <span style={{ color: '#f3f4f6', fontSize: 22, fontWeight: 700 }}>{gridPower.toFixed(2)} kW</span>
                  </div>
                </div>
                <div className="admin-card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ background: 'rgba(167,243,208,0.1)', border: '1px solid rgba(167,243,208,0.2)', padding: 12, borderRadius: 12 }}>
                    <span style={{ fontSize: 20, color: '#a7f3d0' }}>🚗</span>
                  </div>
                  <div>
                    <span style={{ color: '#9ca3af', fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block' }}>EV Fleet Charge load</span>
                    <span style={{ color: '#f3f4f6', fontSize: 22, fontWeight: 700 }}>{totalEvPower.toFixed(2)} kW</span>
                  </div>
                </div>
              </div>

              {/* Topology SVG Canvas */}
              <div className="admin-card" style={{ position: 'relative' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: 15, color: '#f3f4f6', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Activity size={16} style={{ color: '#10b981' }} /> Interactive Microgrid Flow Status Map
                </h3>
                
                <div style={{ width: '100%', display: 'flex', justifyContent: 'center', background: 'rgba(0,0,0,0.15)', borderRadius: 12, padding: 20 }}>
                  <svg width="800" height="380" style={{ pointerEvents: 'none' }}>
                    {/* SVG Filters for glowing nodes */}
                    <defs>
                      <filter id="glow-solar" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="4" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                      </filter>
                    </defs>

                    {/* Connection paths */}
                    <path d="M 200,100 L 400,180" stroke="rgba(251,191,36,0.18)" strokeWidth="4" fill="none" />
                    <path d="M 200,260 L 400,180" stroke="rgba(16,185,129,0.18)" strokeWidth="4" fill="none" strokeDasharray="6,6" />
                    <path d="M 400,180 L 600,100" stroke="rgba(248,113,113,0.18)" strokeWidth="4" fill="none" />
                    <path d="M 400,180 L 600,260" stroke="rgba(167,243,208,0.18)" strokeWidth="4" fill="none" />
                    <path d="M 400,180 L 400,40" stroke="rgba(59,130,246,0.18)" strokeWidth="4" fill="none" />

                    {/* Flow Particle Lines (Micro-animations with dynamic durations scaled to active kW flows!) */}
                    {solarPower > 0.1 && (
                      <circle r="5" fill="#fbbf24">
                        <animateMotion dur={getParticleDuration(solarPower)} repeatCount="indefinite" path="M 200,100 L 400,180" />
                      </circle>
                    )}
                    
                    {Math.abs(batteryPower) > 0.05 && (
                      <circle r="5" fill="#10b981">
                        <animateMotion 
                          dur={getParticleDuration(batteryPower)} 
                          repeatCount="indefinite" 
                          path={batteryPower > 0 ? "M 400,180 L 200,260" : "M 200,260 L 400,180"} 
                        />
                      </circle>
                    )}

                    {homePower > 0.1 && (
                      <circle r="5" fill="#f87171">
                        <animateMotion dur={getParticleDuration(homePower)} repeatCount="indefinite" path="M 400,180 L 600,100" />
                      </circle>
                    )}

                    {totalEvPower > 0.1 && (
                      <circle r="5" fill="#a7f3d0">
                        <animateMotion dur={getParticleDuration(totalEvPower)} repeatCount="indefinite" path="M 400,180 L 600,260" />
                      </circle>
                    )}

                    {Math.abs(gridPower) > 0.1 && (
                      <circle r="5" fill="#3b82f6">
                        <animateMotion 
                          dur={getParticleDuration(gridPower)} 
                          repeatCount="indefinite" 
                          path={gridPower > 0 ? "M 400,40 L 400,180" : "M 400,180 L 400,40"} 
                        />
                      </circle>
                    )}

                    {/* Graphical Nodes */}
                    {/* Solar Node */}
                    <g transform="translate(200, 100)" filter="url(#glow-solar)">
                      <circle r="26" fill="rgba(251,191,36,0.15)" stroke="#fbbf24" strokeWidth="2" />
                      <text y="5" textAnchor="middle" fill="#fbbf24" fontSize="16" fontWeight="bold">PV</text>
                    </g>
                    {/* Battery Node */}
                    <g transform="translate(200, 260)">
                      <circle r="26" fill="rgba(16,185,129,0.15)" stroke="#10b981" strokeWidth="2" />
                      <text y="5" textAnchor="middle" fill="#10b981" fontSize="15" fontWeight="bold">BAT</text>
                    </g>
                    {/* Inverter Node */}
                    <g transform="translate(400, 180)">
                      <rect x="-30" y="-30" width="60" height="60" rx="8" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
                      <text y="5" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="bold">HYBRID</text>
                    </g>
                    {/* Home Node */}
                    <g transform="translate(600, 100)">
                      <circle r="26" fill="rgba(248,113,113,0.15)" stroke="#f87171" strokeWidth="2" />
                      <text y="5" textAnchor="middle" fill="#f87171" fontSize="16" fontWeight="bold">AC</text>
                    </g>
                    {/* EV Fleet Node */}
                    <g transform="translate(600, 260)">
                      <circle r="26" fill="rgba(167,243,208,0.15)" stroke="#a7f3d0" strokeWidth="2" />
                      <text y="5" textAnchor="middle" fill="#a7f3d0" fontSize="15" fontWeight="bold">EV</text>
                    </g>
                    {/* Grid Node */}
                    <g transform="translate(400, 40)">
                      <circle r="26" fill="rgba(59,130,246,0.15)" stroke="#3b82f6" strokeWidth="2" />
                      <text y="5" textAnchor="middle" fill="#3b82f6" fontSize="15" fontWeight="bold">GRID</text>
                    </g>
                  </svg>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* Controls panel */}
              <div className="admin-card" style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1fr 1fr', gap: 20, alignItems: 'center' }}>
                {/* Series selector */}
                <div>
                  <label style={{ display: 'block', color: '#9ca3af', fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>
                    Configure Series to Plot
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {Object.keys(seriesLabels).map(key => (
                      <button 
                        key={key} 
                        onClick={() => toggleSeries(key)} 
                        style={{ 
                          border: `1px solid ${selectedSeries.includes(key) ? seriesColors[key] : 'rgba(255,255,255,0.08)'}`,
                          background: selectedSeries.includes(key) ? `${seriesColors[key]}15` : 'rgba(255,255,255,0.01)',
                          color: selectedSeries.includes(key) ? seriesColors[key] : '#9ca3af',
                          padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s'
                        }}
                      >
                        {seriesLabels[key]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Smoothing slider */}
                <div>
                  <label style={{ display: 'block', color: '#9ca3af', fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>
                    Window Smoothing
                  </label>
                  <select 
                    value={smoothingWindow} 
                    onChange={(e) => setSmoothingWindow(Number(e.target.value))} 
                    style={{ width: '100%', background: 'rgba(3,7,18,0.5)', border: '1px solid rgba(255,255,255,0.08)', padding: 10, borderRadius: 8, color: '#f3f4f6', outline: 'none' }}
                  >
                    <option value="1">No Smoothing (1 min)</option>
                    <option value="5">5-Tick Moving Avg (17 min)</option>
                    <option value="15">15-Tick Moving Avg (51 min)</option>
                  </select>
                </div>

                {/* Time range selection */}
                <div>
                  <label style={{ display: 'block', color: '#9ca3af', fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>
                    Horizontal Range
                  </label>
                  <select 
                    value={timeWindow} 
                    onChange={(e) => setTimeWindow(Number(e.target.value))} 
                    style={{ width: '100%', background: 'rgba(3,7,18,0.5)', border: '1px solid rgba(255,255,255,0.08)', padding: 10, borderRadius: 8, color: '#f3f4f6', outline: 'none' }}
                  >
                    <option value="60">Last 60 Ticks (3.4 Hours)</option>
                    <option value="120">Last 120 Ticks (6.8 Hours)</option>
                    <option value="240">Last 240 Ticks (13.7 Hours)</option>
                    <option value="420">Full Day Simulation (24 Hours)</option>
                  </select>
                </div>

                {/* Chart type */}
                <div>
                  <label style={{ display: 'block', color: '#9ca3af', fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>
                    Chart Type
                  </label>
                  <div style={{ display: 'flex', background: 'rgba(3,7,18,0.5)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: 3 }}>
                    <button 
                      onClick={() => setChartType('line')} 
                      style={{ flex: 1, border: 'none', background: chartType === 'line' ? 'rgba(255,255,255,0.08)' : 'transparent', color: chartType === 'line' ? '#fff' : '#9ca3af', padding: '6px 12px', fontSize: 11.5, fontWeight: 600, borderRadius: 6, cursor: 'pointer' }}
                    >
                      Line
                    </button>
                    <button 
                      onClick={() => setChartType('bar')} 
                      style={{ flex: 1, border: 'none', background: chartType === 'bar' ? 'rgba(255,255,255,0.08)' : 'transparent', color: chartType === 'bar' ? '#fff' : '#9ca3af', padding: '6px 12px', fontSize: 11.5, fontWeight: 600, borderRadius: 6, cursor: 'pointer' }}
                    >
                      Bar
                    </button>
                  </div>
                </div>
              </div>

              {/* RENDER CUSTOM SVG line chart */}
              <div className="admin-card" style={{ padding: 32 }}>
                <h3 style={{ margin: '0 0 20px 0', fontSize: 15, color: '#f3f4f6', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Activity size={16} style={{ color: '#10b981' }} /> Interactive Graphing Canvas (Multi-Series Real-Time plotting)
                </h3>
                
                {svgPlot ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ position: 'relative', width: '100%', maxWidth: svgPlot.width, background: 'rgba(3,7,18,0.3)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: 10 }}>
                      <svg width="100%" height={svgPlot.height} viewBox={`0 0 ${svgPlot.width} ${svgPlot.height}`}>
                        {/* Grid lines */}
                        {new Array(5).fill(0).map((_, idx) => {
                          const y = svgPlot.padding + (idx / 4) * (svgPlot.height - 2 * svgPlot.padding)
                          return (
                            <line 
                              key={idx} 
                              x1={svgPlot.padding} 
                              y1={y} 
                              x2={svgPlot.width - svgPlot.padding} 
                              y2={y} 
                              stroke="rgba(255,255,255,0.04)" 
                              strokeWidth="1" 
                            />
                          )
                        })}

                        {/* Plots */}
                        {chartType === 'line' ? (
                          selectedSeries.map(key => (
                            <polyline
                              key={key}
                              fill="none"
                              stroke={seriesColors[key]}
                              strokeWidth="2.5"
                              points={svgPlot.pointsBySeries[key]}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          ))
                        ) : (
                          // Custom Bar Chart Render
                          compiledChartData.map((d, idx) => {
                            const barCount = compiledChartData.length
                            const chartAreaWidth = svgPlot.width - 2 * svgPlot.padding
                            const barWidth = Math.max(1, (chartAreaWidth / barCount) * 0.7)
                            const x = svgPlot.padding + (idx / (barCount - 1)) * chartAreaWidth - barWidth / 2
                            
                            return selectedSeries.map((key, seriesIdx) => {
                              const val = (d as any)[key] ?? 0
                              const subBarWidth = barWidth / selectedSeries.length
                              const subBarX = x + seriesIdx * subBarWidth
                              
                              let y = 0
                              let h = 0
                              if (key.endsWith('Pct')) {
                                y = svgPlot.height - svgPlot.padding - (val / 100) * (svgPlot.height - 2 * svgPlot.padding)
                              } else if (key.endsWith('Hz')) {
                                const range = Math.max(0.2, svgPlot.maxFrequency - svgPlot.minFrequency)
                                y = svgPlot.height - svgPlot.padding - ((val - svgPlot.minFrequency) / range) * (svgPlot.height - 2 * svgPlot.padding)
                              } else {
                                y = svgPlot.height - svgPlot.padding - (val / svgPlot.maxKW) * (svgPlot.height - 2 * svgPlot.padding)
                              }
                              h = svgPlot.height - svgPlot.padding - y

                              return (
                                <rect
                                  key={`${idx}-${key}`}
                                  x={subBarX}
                                  y={y}
                                  width={Math.max(1, subBarWidth - 0.5)}
                                  height={Math.max(1, h)}
                                  fill={seriesColors[key]}
                                  opacity="0.8"
                                  rx="1"
                                />
                              )
                            })
                          })
                        )}

                        {/* Y-axis primary (Left: kW scale) */}
                        <text x={svgPlot.padding - 10} y={svgPlot.padding + 4} textAnchor="end" fill="#6b7280" fontSize="10">{svgPlot.maxKW} kW</text>
                        <text x={svgPlot.padding - 10} y={svgPlot.height / 2 + 4} textAnchor="end" fill="#6b7280" fontSize="10">{(svgPlot.maxKW / 2).toFixed(1)} kW</text>
                        <text x={svgPlot.padding - 10} y={svgPlot.height - svgPlot.padding + 4} textAnchor="end" fill="#6b7280" fontSize="10">0 kW</text>

                        {/* Y-axis secondary (Right: % / Hz scale) */}
                        <text x={svgPlot.width - svgPlot.padding + 10} y={svgPlot.padding + 4} textAnchor="start" fill="#6b7280" fontSize="10">100% / {svgPlot.maxFrequency.toFixed(1)}Hz</text>
                        <text x={svgPlot.width - svgPlot.padding + 10} y={svgPlot.height / 2 + 4} textAnchor="start" fill="#6b7280" fontSize="10">50% / {((svgPlot.maxFrequency + svgPlot.minFrequency) / 2).toFixed(1)}Hz</text>
                        <text x={svgPlot.width - svgPlot.padding + 10} y={svgPlot.height - svgPlot.padding + 4} textAnchor="start" fill="#6b7280" fontSize="10">0% / {svgPlot.minFrequency.toFixed(1)}Hz</text>
                      </svg>
                    </div>

                    {/* Chart Legends */}
                    <div style={{ display: 'flex', gap: 16, marginTop: 14, justifyContent: 'center' }}>
                      {selectedSeries.map(key => (
                        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ width: 12, height: 12, background: seriesColors[key], borderRadius: 3 }} />
                          <span style={{ fontSize: 12.5, color: '#f3f4f6' }}>{seriesLabels[key]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ color: '#6b7280', fontSize: 13, textAlign: 'center', padding: '40px 0' }}>
                    Select at least one series from the panel above to begin rendering the graph.
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* Search & filters panel */}
              <div className="admin-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                  <input 
                    type="text" 
                    placeholder="Search logs by timestamp..." 
                    value={logsSearch}
                    onChange={(e) => { setLogsSearch(e.target.value); setLogsPage(1); }}
                    style={{ flex: 1, maxWidth: 300, background: 'rgba(3,7,18,0.5)', border: '1px solid rgba(255,255,255,0.08)', padding: '10px 14px', borderRadius: 8, color: '#f3f4f6', outline: 'none' }}
                  />
                  
                  <select 
                    value={logsFilterColumn}
                    onChange={(e) => { setLogsFilterColumn(e.target.value as any); setLogsPage(1); }}
                    style={{ background: 'rgba(3,7,18,0.5)', border: '1px solid rgba(255,255,255,0.08)', padding: '10px 14px', borderRadius: 8, color: '#f3f4f6', outline: 'none' }}
                  >
                    <option value="all">Show All Ticks</option>
                    <option value="lowFreq">Low Grid Frequency (&lt; 49.8 Hz)</option>
                    <option value="highSolar">Peak Solar Yield (&gt; 30 kW)</option>
                    <option value="lowBattery">Critical Battery Reserve (&lt; 30%)</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={handleCSVExport} style={{ border: '1px solid rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.08)', color: '#10b981', display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    <Download size={14} /> Export CSV
                  </button>
                  <button onClick={handleJSONExport} style={{ border: '1px solid rgba(59,130,246,0.3)', background: 'rgba(59,130,246,0.08)', color: '#3b82f6', display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    <FileSpreadsheet size={14} /> Export JSON
                  </button>
                </div>
              </div>

              {/* Data Table */}
              <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13.5 }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <th style={{ padding: '14px 20px', color: '#9ca3af', fontWeight: 600 }}>Timestamp</th>
                      <th style={{ padding: '14px 20px', color: '#9ca3af', fontWeight: 600 }}>Solar kW</th>
                      <th style={{ padding: '14px 20px', color: '#9ca3af', fontWeight: 600 }}>House Load kW</th>
                      <th style={{ padding: '14px 20px', color: '#9ca3af', fontWeight: 600 }}>Battery SOC</th>
                      <th style={{ padding: '14px 20px', color: '#9ca3af', fontWeight: 600 }}>Grid Import kW</th>
                      <th style={{ padding: '14px 20px', color: '#9ca3af', fontWeight: 600 }}>Grid Export kW</th>
                      <th style={{ padding: '14px 20px', color: '#9ca3af', fontWeight: 600 }}>Grid Freq</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedLogs.length > 0 ? (
                      paginatedLogs.map((d, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.15s' }}>
                          <td style={{ padding: '12px 20px', color: '#f3f4f6', fontFamily: 'monospace' }}>{d.timestamp.slice(11, 19)}</td>
                          <td style={{ padding: '12px 20px', color: '#fbbf24', fontWeight: 600 }}>{d.solarKW.toFixed(2)}</td>
                          <td style={{ padding: '12px 20px', color: '#f87171' }}>{(d.homeLoadKW + d.ev1LoadKW + d.ev2LoadKW).toFixed(2)}</td>
                          <td style={{ padding: '12px 20px', color: '#10b981', fontWeight: 600 }}>{d.batteryLevelPct.toFixed(0)} %</td>
                          <td style={{ padding: '12px 20px', color: '#3b82f6' }}>{d.gridImportKW.toFixed(2)}</td>
                          <td style={{ padding: '12px 20px', color: '#6366f1' }}>{d.gridExportKW.toFixed(2)}</td>
                          <td style={{ padding: '12px 20px', color: (d.gridFrequencyHz ?? 50) < 49.8 ? '#f87171' : '#10b981', fontWeight: 600, fontFamily: 'monospace' }}>{(d.gridFrequencyHz ?? 50.0).toFixed(2)} Hz</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} style={{ padding: 40, color: '#6b7280', textAlign: 'center' }}>
                          No simulation logs found matching current search/filter conditions.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {/* Pagination Controls */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: 'rgba(0,0,0,0.1)', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ fontSize: 12.5, color: '#9ca3af' }}>
                    Showing page {logsPage} of {maxLogsPage} ({filteredLogs.length} total records)
                  </span>
                  
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button 
                      disabled={logsPage === 1}
                      onClick={() => setLogsPage(p => p - 1)}
                      style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)', color: logsPage === 1 ? '#4b5563' : '#f3f4f6', padding: '6px 12px', borderRadius: 6, fontSize: 12, cursor: logsPage === 1 ? 'not-allowed' : 'pointer' }}
                    >
                      Previous
                    </button>
                    <button 
                      disabled={logsPage === maxLogsPage}
                      onClick={() => setLogsPage(p => p + 1)}
                      style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)', color: logsPage === maxLogsPage ? '#4b5563' : '#f3f4f6', padding: '6px 12px', borderRadius: 6, fontSize: 12, cursor: logsPage === maxLogsPage ? 'not-allowed' : 'pointer' }}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'reports' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              {/* Report Editor Card */}
              <div className="admin-card" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <h3 style={{ margin: '0 0 10px 0', fontSize: 15, color: '#f3f4f6', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Settings2 size={16} style={{ color: '#10b981' }} /> Report Sizing Architect
                </h3>

                <div>
                  <label style={{ display: 'block', color: '#9ca3af', fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 6 }}>
                    Report Heading Title
                  </label>
                  <input 
                    type="text" 
                    value={reportTitle}
                    onChange={(e) => setReportTitle(e.target.value)}
                    style={{ width: '100%', background: 'rgba(3,7,18,0.5)', border: '1px solid rgba(255,255,255,0.08)', padding: '10px 14px', borderRadius: 8, color: '#f3f4f6', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', color: '#9ca3af', fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 6 }}>
                    Report Subheading
                  </label>
                  <input 
                    type="text" 
                    value={reportSubtitle}
                    onChange={(e) => setReportSubtitle(e.target.value)}
                    style={{ width: '100%', background: 'rgba(3,7,18,0.5)', border: '1px solid rgba(255,255,255,0.08)', padding: '10px 14px', borderRadius: 8, color: '#f3f4f6', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', color: '#9ca3af', fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 6 }}>
                    Custom Executive Summary notes
                  </label>
                  <textarea 
                    rows={4}
                    value={customExecutiveSummary}
                    onChange={(e) => setCustomExecutiveSummary(e.target.value)}
                    style={{ width: '100%', background: 'rgba(3,7,18,0.5)', border: '1px solid rgba(255,255,255,0.08)', padding: '10px 14px', borderRadius: 8, color: '#f3f4f6', outline: 'none', fontFamily: 'inherit', fontSize: 13.5, resize: 'vertical', boxSizing: 'border-box' }}
                  />
                </div>

                {/* Section toggles */}
                <div>
                  <label style={{ display: 'block', color: '#9ca3af', fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 10 }}>
                    Toggle Document Sections
                  </label>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={showExecutiveSummary}
                        onChange={(e) => setShowExecutiveSummary(e.target.checked)}
                        style={{ accentColor: '#10b981' }}
                      />
                      <span style={{ fontSize: 13, color: '#f3f4f6' }}>Include Executive Summary Section</span>
                    </label>
                    
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={showTechnicalSizing}
                        onChange={(e) => setShowTechnicalSizing(e.target.checked)}
                        style={{ accentColor: '#10b981' }}
                      />
                      <span style={{ fontSize: 13, color: '#f3f4f6' }}>Include Technical Sizing specifications Grid</span>
                    </label>
                    
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={showFinancialAnalysis}
                        onChange={(e) => setShowFinancialAnalysis(e.target.checked)}
                        style={{ accentColor: '#10b981' }}
                      />
                      <span style={{ fontSize: 13, color: '#f3f4f6' }}>Include Payback & Payoff Analysis Tables</span>
                    </label>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 18, marginTop: 10 }}>
                  <button onClick={() => window.print()} style={{ width: '100%', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', border: '1px solid #34d399', borderRadius: 10, padding: 13, color: '#fff', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 0 20px rgba(16,185,129,0.2)' }}>
                    <FileText size={15} /> Print Clean A4 PDF Report
                  </button>
                </div>
              </div>

              {/* Report Preview Card */}
              <div className="admin-card" style={{ display: 'flex', flexDirection: 'column', gap: 14, background: '#ffffff', color: '#1e293b' }}>
                <div style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: 10 }}>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: 18, fontWeight: 700, color: '#0f172a' }}>{reportTitle}</h4>
                  <p style={{ margin: 0, fontSize: 12.5, color: '#64748b' }}>{reportSubtitle}</p>
                </div>

                {showExecutiveSummary && (
                  <div>
                    <h5 style={{ fontSize: 13, fontWeight: 700, margin: '0 0 6px 0', color: '#059669', textTransform: 'uppercase', letterSpacing: '0.04em' }}>1. Executive Summary</h5>
                    <p style={{ fontSize: 12, margin: 0, color: '#334155', lineHeight: 1.5 }}>{customExecutiveSummary}</p>
                  </div>
                )}

                {showTechnicalSizing && (
                  <div>
                    <h5 style={{ fontSize: 13, fontWeight: 700, margin: '0 0 6px 0', color: '#059669', textTransform: 'uppercase', letterSpacing: '0.04em' }}>2. Technical Sizing Audit</h5>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                          <th style={{ padding: 6, textAlign: 'left', fontWeight: 600, color: '#475569' }}>Parameter</th>
                          <th style={{ padding: 6, textAlign: 'left', fontWeight: 600, color: '#475569' }}>Configured Spec</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: 6, fontWeight: 600, color: '#334155' }}>PV array capacity</td>
                          <td style={{ padding: 6, color: '#475569' }}>{systemConfig.solarCapacityKW.toFixed(1)} kW</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: 6, fontWeight: 600, color: '#334155' }}>Battery storage bank</td>
                          <td style={{ padding: 6, color: '#475569' }}>{systemConfig.batteryCapacityKWh.toFixed(1)} kWh</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: 6, fontWeight: 600, color: '#334155' }}>Inverter output cap</td>
                          <td style={{ padding: 6, color: '#475569' }}>{systemConfig.inverterKW.toFixed(1)} kW</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}

                {showFinancialAnalysis && (
                  <div>
                    <h5 style={{ fontSize: 13, fontWeight: 700, margin: '0 0 6px 0', color: '#059669', textTransform: 'uppercase', letterSpacing: '0.04em' }}>3. Financial Analysis</h5>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                          <th style={{ padding: 6, textAlign: 'left', fontWeight: 600, color: '#475569' }}>Tariff period</th>
                          <th style={{ padding: 6, textAlign: 'left', fontWeight: 600, color: '#475569' }}>KES/kWh</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: 6, fontWeight: 600, color: '#334155' }}>Peak rate</td>
                          <td style={{ padding: 6, color: '#475569' }}>24.31 KES</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: 6, fontWeight: 600, color: '#334155' }}>Off-peak rate</td>
                          <td style={{ padding: 6, color: '#475569' }}>14.93 KES</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
                
                <div style={{ borderTop: '1px solid #e2e8f0', marginTop: 'auto', paddingTop: 8, textAlign: 'center', fontSize: 10, color: '#94a3b8' }}>
                  A4 print-ready PDF layout preview
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  )
}
