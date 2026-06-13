import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'SafariCharge — Solar Energy Management for Kenya & Africa'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-start',
          background: 'linear-gradient(135deg, #0a1628 0%, #01352a 50%, #0d2818 100%)',
          padding: '80px',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Top accent bar */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'linear-gradient(90deg, #22c55e, #01696f, #f59e0b)',
          }}
        />

        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '40px' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #22c55e, #01696f)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
            }}
          >
            ☀
          </div>
          <span style={{ color: '#22c55e', fontSize: '28px', fontWeight: 700, letterSpacing: '-0.5px' }}>
            SafariCharge
          </span>
        </div>

        {/* Headline */}
        <div
          style={{
            fontSize: '60px',
            fontWeight: 800,
            color: '#ffffff',
            lineHeight: 1.1,
            letterSpacing: '-1.5px',
            marginBottom: '24px',
            maxWidth: '900px',
          }}
        >
          Solar Energy Management
          <br />
          <span style={{ color: '#22c55e' }}>for Kenya & Africa</span>
        </div>

        {/* Sub-headline */}
        <div style={{ fontSize: '24px', color: '#94a3b8', marginBottom: '48px', maxWidth: '720px' }}>
          MILP dispatch · KPLC tariff engine · BESS simulation · Financial ROI · 200+ Africa locations
        </div>

        {/* Feature pills */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {['Free to use', 'No sign-up for demo', 'Kenya · East Africa · Pan-Africa'].map((tag) => (
            <div
              key={tag}
              style={{
                background: 'rgba(34, 197, 94, 0.15)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                color: '#22c55e',
                padding: '8px 20px',
                borderRadius: '999px',
                fontSize: '18px',
                fontWeight: 500,
              }}
            >
              {tag}
            </div>
          ))}
        </div>

        {/* URL */}
        <div
          style={{
            position: 'absolute',
            bottom: '40px',
            right: '80px',
            color: '#475569',
            fontSize: '18px',
          }}
        >
          solar.rauell.systems
        </div>
      </div>
    ),
    { ...size },
  )
}
