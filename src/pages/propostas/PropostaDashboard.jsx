import React, { useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { isAuthenticated, clearSession } from '../../utils/propostasAuth'
import { TEMPLATES } from '../../components/propostas/data/templateData'

const TAG_COLORS = {
  'Site': { bg: 'rgba(59,130,246,0.1)', text: '#93C5FD', border: 'rgba(59,130,246,0.3)' },
  'Comparativo': { bg: 'rgba(168,85,247,0.1)', text: '#D8B4FE', border: 'rgba(168,85,247,0.3)' },
  'Redes Sociais': { bg: 'rgba(249,115,22,0.1)', text: '#FED7AA', border: 'rgba(249,115,22,0.3)' },
  'Diagnóstico': { bg: 'rgba(21,196,90,0.1)', text: '#6EE7A2', border: 'rgba(21,196,90,0.3)' },
  'Sistema': { bg: 'rgba(234,179,8,0.1)', text: '#FDE68A', border: 'rgba(234,179,8,0.3)' },
}

export default function PropostaDashboard() {
  const navigate = useNavigate()

  useEffect(() => {
    if (!isAuthenticated()) navigate('/propostas', { replace: true })
  }, [navigate])

  function handleLogout() {
    clearSession()
    navigate('/propostas', { replace: true })
  }

  return (
    <div style={{
      minHeight: '100vh', backgroundColor: '#0A0C0B',
      fontFamily: "'Instrument Sans','Inter',sans-serif",
    }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@700;900&family=Instrument+Sans:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap" />
      <meta name="robots" content="noindex,nofollow" />

      {/* Topbar */}
      <div style={{ borderBottom: '1px solid #1E2820', padding: '0 40px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontWeight: 900, fontSize: 28, color: '#15C45A' }}>Z</span>
          <span style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontWeight: 700, fontSize: 22, color: '#FFF' }}>INKRA</span>
          <span style={{ fontFamily: "'Geist Mono','JetBrains Mono',monospace", fontSize: 10, letterSpacing: 2, color: '#3A5545', marginLeft: 12, marginTop: 4, textTransform: 'uppercase' }}>Propostas</span>
        </div>
        <button
          onClick={handleLogout}
          style={{ background: 'none', border: '1px solid #2A2A35', borderRadius: 8, padding: '7px 16px', color: '#5A7A65', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          Sair
        </button>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '48px 40px' }}>
        <div style={{ marginBottom: 40 }}>
          <h1 style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontSize: 42, fontWeight: 900, color: '#FFF', margin: '0 0 8px' }}>
            Gerador de Propostas
          </h1>
          <p style={{ color: '#5A7A65', fontSize: 14, margin: 0 }}>
            Selecione o modelo para gerar uma proposta personalizada em PDF.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {TEMPLATES.map(tmpl => {
            const tagStyle = TAG_COLORS[tmpl.tag] || TAG_COLORS['Diagnóstico']
            return (
              <div
                key={tmpl.id}
                style={{
                  background: '#111116', border: '1px solid #2A2A35', borderRadius: 14,
                  padding: '24px', display: 'flex', flexDirection: 'column',
                  transition: 'border-color 0.2s, transform 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#15C45A'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#2A2A35'; e.currentTarget.style.transform = 'translateY(0)' }}
              >
                {/* Preview mock — miniatura de capa */}
                <div style={{
                  height: 100, borderRadius: 8, marginBottom: 18,
                  background: 'linear-gradient(135deg, #0A0C0B 0%, #111116 100%)',
                  border: '1px solid #1E2820', position: 'relative', overflow: 'hidden',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: 'radial-gradient(circle, rgba(21,196,90,0.15) 0%, transparent 70%)' }} />
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontSize: 28, fontWeight: 900, color: '#15C45A', lineHeight: 1 }}>Z</div>
                    <div style={{ fontFamily: "'Geist Mono','JetBrains Mono',monospace", fontSize: 8, color: '#3A5545', letterSpacing: 1, marginTop: 4 }}>PROPOSTA</div>
                  </div>
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, #2EFF8B, #16B85E)' }} />
                </div>

                {/* Tag */}
                <span style={{
                  display: 'inline-block', alignSelf: 'flex-start', marginBottom: 10,
                  fontFamily: "'Geist Mono','JetBrains Mono',monospace", fontSize: 9,
                  letterSpacing: 2, textTransform: 'uppercase', padding: '3px 10px', borderRadius: 4,
                  background: tagStyle.bg, color: tagStyle.text, border: `1px solid ${tagStyle.border}`,
                }}>{tmpl.tag}</span>

                <h3 style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontSize: 20, fontWeight: 700, color: '#FFF', margin: '0 0 6px', lineHeight: 1.2 }}>
                  {tmpl.label}
                </h3>
                <p style={{ fontSize: 12, color: '#5A7A65', margin: '0 0 20px', lineHeight: 1.5, flex: 1 }}>
                  {tmpl.type === 'site' && `Plano ${tmpl.plan} · R$ ${tmpl.price.min.toLocaleString('pt-BR')}–${tmpl.price.max.toLocaleString('pt-BR')}`}
                  {tmpl.type === 'social' && `Plano ${tmpl.plan} · R$ ${(tmpl.price.fixed || tmpl.price.min).toLocaleString('pt-BR')}/mês`}
                  {tmpl.type === 'comparativo' && `Comparativo lado a lado · 7 páginas`}
                  {tmpl.type === 'diagnostico' && 'Diagnóstico sem valor · CTA de reunião'}
                  {tmpl.type === 'sistema' && 'Sem valor fechado · CTA de reunião'}
                </p>

                <Link
                  to={`/propostas/gerar/${tmpl.id}`}
                  style={{
                    display: 'block', textAlign: 'center',
                    padding: '11px 0', borderRadius: 10,
                    background: 'linear-gradient(135deg, #2EFF8B, #16B85E)',
                    color: '#0A0C0B', fontWeight: 700, fontSize: 14,
                    textDecoration: 'none', transition: 'opacity 0.2s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                >
                  Gerar proposta
                </Link>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
