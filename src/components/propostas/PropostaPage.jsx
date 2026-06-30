import React from 'react'

const LOGO_DARK_INLINE = `
  <svg width="90" height="28" viewBox="0 0 120 36" fill="none" xmlns="http://www.w3.org/2000/svg">
    <text x="0" y="28" font-family="'Big Shoulders Display', sans-serif" font-weight="900" font-size="32" fill="#15C45A">Z</text>
    <text x="24" y="28" font-family="'Big Shoulders Display', sans-serif" font-weight="700" font-size="24" fill="#FFFFFF">INKRA</text>
  </svg>
`
const LOGO_LIGHT_INLINE = `
  <svg width="90" height="28" viewBox="0 0 120 36" fill="none" xmlns="http://www.w3.org/2000/svg">
    <text x="0" y="28" font-family="'Big Shoulders Display', sans-serif" font-weight="900" font-size="32" fill="#15C45A">Z</text>
    <text x="24" y="28" font-family="'Big Shoulders Display', sans-serif" font-weight="700" font-size="24" fill="#0A0C0B">INKRA</text>
  </svg>
`

export default function PropostaPage({ dark = true, label = '', children }) {
  const bg = dark ? '#0A0C0B' : '#FFFFFF'
  const fg = dark ? '#FFFFFF' : '#0A0C0B'
  const borderColor = dark ? '#1E2820' : '#E5E7E5'
  const footerColor = dark ? '#3A5545' : '#9AA5A0'
  const logoSvg = dark ? LOGO_DARK_INLINE : LOGO_LIGHT_INLINE

  return (
    <div style={{
      width: 794,
      height: 1123,
      backgroundColor: bg,
      color: fg,
      position: 'relative',
      overflow: 'hidden',
      pageBreakAfter: 'always',
      breakAfter: 'page',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: "'Instrument Sans', 'Inter', sans-serif",
      boxSizing: 'border-box',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '18px 36px 0',
        height: 58,
        flexShrink: 0,
      }}>
        <div dangerouslySetInnerHTML={{ __html: logoSvg }} />
        {label && (
          <span style={{
            fontFamily: "'Geist Mono', 'JetBrains Mono', monospace",
            fontSize: 10,
            letterSpacing: 2,
            textTransform: 'uppercase',
            color: '#15C45A',
          }}>{label}</span>
        )}
      </div>

      {/* Green divider */}
      <div style={{ height: 1, backgroundColor: '#15C45A', margin: '0 36px', flexShrink: 0 }} />

      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden', padding: '0 36px' }}>
        {children}
      </div>

      {/* Footer */}
      <div style={{
        height: 42,
        borderTop: `1px solid ${borderColor}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
        flexShrink: 0,
        fontFamily: "'Geist Mono', 'JetBrains Mono', monospace",
        fontSize: 10,
        color: footerColor,
      }}>
        <span>zinkra.com.br</span>
        <span>·</span>
        <span>contato@zinkra.com.br</span>
        <span>·</span>
        <span>(11) 94116-4044</span>
      </div>
    </div>
  )
}
