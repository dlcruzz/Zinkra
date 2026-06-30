import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { checkPassword, saveSession, isAuthenticated } from '../../utils/propostasAuth'

export default function PropostasLogin() {
  const navigate = useNavigate()
  const [pwd, setPwd] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (isAuthenticated()) navigate('/propostas/dashboard', { replace: true })
  }, [navigate])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!pwd) return
    setLoading(true)
    setError('')
    const ok = await checkPassword(pwd)
    if (ok) {
      saveSession()
      navigate('/propostas/dashboard', { replace: true })
    } else {
      setError('Senha incorreta. Tente novamente.')
      setPwd('')
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh', backgroundColor: '#0A0C0B',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Instrument Sans', 'Inter', sans-serif",
    }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@700;900&family=Instrument+Sans:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap" />

      {/* Noindex */}
      <meta name="robots" content="noindex,nofollow" />

      {/* BG glow */}
      <div style={{ position: 'fixed', top: '-20%', right: '-10%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(21,196,90,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 400, padding: '0 24px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <span style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontWeight: 900, fontSize: 36, color: '#15C45A' }}>Z</span>
            <span style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontWeight: 700, fontSize: 28, color: '#FFF' }}>INKRA</span>
          </div>
          <p style={{ color: '#5A7A65', fontSize: 13, margin: 0, fontFamily: "'Geist Mono','JetBrains Mono',monospace", letterSpacing: 2, textTransform: 'uppercase' }}>
            Área interna
          </p>
        </div>

        {/* Card */}
        <div style={{ background: '#111116', border: '1px solid #2A2A35', borderRadius: 16, padding: '36px 32px' }}>
          <h1 style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontSize: 28, fontWeight: 900, color: '#FFF', margin: '0 0 8px' }}>
            Acesso restrito
          </h1>
          <p style={{ fontSize: 13, color: '#5A7A65', margin: '0 0 28px', lineHeight: 1.6 }}>
            Digite a senha para acessar o gerador de propostas.
          </p>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 20, position: 'relative' }}>
              <label style={{ display: 'block', fontFamily: "'Geist Mono','JetBrains Mono',monospace", fontSize: 10, letterSpacing: 2, color: '#3A5545', textTransform: 'uppercase', marginBottom: 8 }}>
                Senha
              </label>
              <input
                type={show ? 'text' : 'password'}
                value={pwd}
                onChange={e => setPwd(e.target.value)}
                placeholder="••••••••••"
                autoFocus
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: '#0A0C0B', border: `1px solid ${error ? '#F87171' : '#2A2A35'}`,
                  borderRadius: 10, padding: '13px 44px 13px 16px',
                  color: '#FFF', fontSize: 15,
                  outline: 'none', fontFamily: 'inherit',
                }}
                onFocus={e => e.currentTarget.style.borderColor = '#15C45A'}
                onBlur={e => e.currentTarget.style.borderColor = error ? '#F87171' : '#2A2A35'}
              />
              <button
                type="button"
                onClick={() => setShow(s => !s)}
                style={{ position: 'absolute', right: 14, bottom: 13, background: 'none', border: 'none', color: '#5A7A65', cursor: 'pointer', fontSize: 16, padding: 0 }}
              >
                {show ? '🙈' : '👁️'}
              </button>
            </div>

            {error && (
              <p style={{ color: '#F87171', fontSize: 13, margin: '-8px 0 16px', textAlign: 'center' }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !pwd}
              style={{
                width: '100%', padding: '14px',
                background: loading || !pwd ? '#1E2820' : 'linear-gradient(135deg, #2EFF8B, #16B85E)',
                color: loading || !pwd ? '#3A5545' : '#0A0C0B',
                border: 'none', borderRadius: 10,
                fontFamily: "'Instrument Sans','Inter',sans-serif",
                fontWeight: 700, fontSize: 15, cursor: loading || !pwd ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {loading ? 'Verificando...' : 'Acessar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
