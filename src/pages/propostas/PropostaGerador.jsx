import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { isAuthenticated } from '../../utils/propostasAuth'
import { getTemplate } from '../../components/propostas/data/templateData'
import TemplateSite from '../../components/propostas/TemplateSite'
import TemplateComparativo from '../../components/propostas/TemplateComparativo'
import TemplateSocial from '../../components/propostas/TemplateSocial'
import TemplateDiagnostico from '../../components/propostas/TemplateDiagnostico'
import TemplateSistema from '../../components/propostas/TemplateSistema'

const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

function formatDateBR(dateStr) {
  if (!dateStr) return ''
  const [y, m] = dateStr.split('-')
  return `${MONTHS[parseInt(m, 10) - 1]} de ${y}`
}

function Field({ label, children, required }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <label style={{ display: 'block', fontFamily: "'Geist Mono','JetBrains Mono',monospace", fontSize: 10, letterSpacing: 2, color: '#3A5545', textTransform: 'uppercase', marginBottom: 8 }}>
        {label}{required && <span style={{ color: '#F87171', marginLeft: 4 }}>*</span>}
      </label>
      {children}
    </div>
  )
}

const inputStyle = {
  width: '100%', boxSizing: 'border-box',
  background: '#0A0C0B', border: '1px solid #2A2A35', borderRadius: 10,
  padding: '12px 16px', color: '#FFF', fontSize: 14,
  outline: 'none', fontFamily: "'Instrument Sans','Inter',sans-serif",
  transition: 'border-color 0.2s',
}

function Input({ value, onChange, placeholder, type = 'text' }) {
  return (
    <input
      type={type} value={value} onChange={onChange} placeholder={placeholder}
      style={inputStyle}
      onFocus={e => e.currentTarget.style.borderColor = '#15C45A'}
      onBlur={e => e.currentTarget.style.borderColor = '#2A2A35'}
    />
  )
}

function Textarea({ value, onChange, placeholder, rows = 3 }) {
  return (
    <textarea
      value={value} onChange={onChange} placeholder={placeholder} rows={rows}
      style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
      onFocus={e => e.currentTarget.style.borderColor = '#15C45A'}
      onBlur={e => e.currentTarget.style.borderColor = '#2A2A35'}
    />
  )
}

function renderTemplate(tmpl, fields) {
  const props = { tmpl, fields }
  if (tmpl.type === 'site') return <TemplateSite {...props} />
  if (tmpl.type === 'comparativo') return <TemplateComparativo {...props} />
  if (tmpl.type === 'social') return <TemplateSocial {...props} />
  if (tmpl.type === 'diagnostico') return <TemplateDiagnostico {...props} />
  if (tmpl.type === 'sistema') return <TemplateSistema {...props} />
  return null
}

export default function PropostaGerador() {
  const { templateId } = useParams()
  const navigate = useNavigate()
  const templateRef = useRef(null)

  const [fields, setFields] = useState({
    cliente: '', data: '', preco: '', horario1: '', horario2: '', observacao: '', clientUrl: '',
  })
  const [generating, setGenerating] = useState(false)
  const [preview, setPreview] = useState(false)
  const [error, setError] = useState('')

  const tmpl = getTemplate(templateId)

  useEffect(() => {
    if (!isAuthenticated()) navigate('/propostas', { replace: true })
    if (!tmpl) navigate('/propostas/dashboard', { replace: true })
  }, [navigate, tmpl])

  if (!tmpl) return null

  const set = key => e => setFields(f => ({ ...f, [key]: e.target.value }))

  const resolvedFields = {
    ...fields,
    data: formatDateBR(fields.data) || fields.data,
  }

  async function handleGenerate() {
    if (!fields.cliente.trim()) { setError('Informe o nome do cliente.'); return }
    if (!fields.data) { setError('Selecione a data.'); return }
    setError('')
    setGenerating(true)

    try {
      // Ensure fonts are loaded
      await document.fonts.ready

      const html2pdf = (await import('html2pdf.js')).default
      const el = templateRef.current

      const slug = fields.cliente.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
      const filename = `proposta-zinkra-${slug}-${tmpl.id}.pdf`

      const opt = {
        margin: 0,
        filename,
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#0A0C0B',
          logging: false,
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'] },
      }

      await html2pdf().set(opt).from(el).save()
    } catch (err) {
      console.error(err)
      setError('Erro ao gerar o PDF. Tente novamente.')
    }

    setGenerating(false)
  }

  const hasScheduling = tmpl.showSchedulingFields
  const hasClientUrl = tmpl.showClientUrlField
  const hasCustomPrice = tmpl.showCustomPrice

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0A0C0B', fontFamily: "'Instrument Sans','Inter',sans-serif" }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@700;900&family=Instrument+Sans:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap" />
      <meta name="robots" content="noindex,nofollow" />

      {/* Topbar */}
      <div style={{ borderBottom: '1px solid #1E2820', padding: '0 40px', height: 60, display: 'flex', alignItems: 'center', gap: 16 }}>
        <Link to="/propostas/dashboard" style={{ color: '#5A7A65', textDecoration: 'none', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
          ← Voltar
        </Link>
        <div style={{ width: 1, height: 20, background: '#2A2A35' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontWeight: 900, fontSize: 24, color: '#15C45A' }}>Z</span>
          <span style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontWeight: 700, fontSize: 18, color: '#FFF' }}>INKRA</span>
          <span style={{ fontFamily: "'Geist Mono','JetBrains Mono',monospace", fontSize: 10, letterSpacing: 2, color: '#3A5545', marginLeft: 10, textTransform: 'uppercase' }}>
            {tmpl.label}
          </span>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 32, alignItems: 'flex-start' }}>

          {/* FORM */}
          <div>
            <h2 style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontSize: 28, fontWeight: 900, color: '#FFF', margin: '0 0 24px' }}>
              Dados da proposta
            </h2>

            <div style={{ background: '#111116', border: '1px solid #2A2A35', borderRadius: 14, padding: '28px 24px' }}>
              <Field label="Nome do cliente" required>
                <Input value={fields.cliente} onChange={set('cliente')} placeholder="Ex: Gustavo Santos" />
              </Field>

              <Field label="Data" required>
                <input
                  type="month" value={fields.data}
                  onChange={set('data')}
                  style={{ ...inputStyle }}
                  onFocus={e => e.currentTarget.style.borderColor = '#15C45A'}
                  onBlur={e => e.currentTarget.style.borderColor = '#2A2A35'}
                />
              </Field>

              {hasCustomPrice && (
                <Field label="Valor específico (opcional)">
                  <Input value={fields.preco} onChange={set('preco')} placeholder={`Ex: R$ ${(tmpl.price?.min || 0).toLocaleString('pt-BR')}`} />
                  <p style={{ fontSize: 11, color: '#3A5545', margin: '6px 0 0', lineHeight: 1.5 }}>
                    Deixe em branco para usar a faixa {tmpl.price?.min ? `R$ ${tmpl.price.min.toLocaleString('pt-BR')}–${tmpl.price.max.toLocaleString('pt-BR')}` : ''}
                  </p>
                </Field>
              )}

              {hasScheduling && (
                <>
                  <Field label="Horário sugerido 1 (opcional)">
                    <Input value={fields.horario1} onChange={set('horario1')} placeholder="Ex: Quinta, dia 02 às 10:00" />
                  </Field>
                  <Field label="Horário sugerido 2 (opcional)">
                    <Input value={fields.horario2} onChange={set('horario2')} placeholder="Ex: Quinta, dia 02 às 16:00" />
                  </Field>
                </>
              )}

              {hasClientUrl && (
                <Field label="URL do site do cliente (opcional)">
                  <Input value={fields.clientUrl} onChange={set('clientUrl')} placeholder="Ex: www.empresa.com.br" />
                </Field>
              )}

              <Field label="Observação personalizada (opcional)">
                <Textarea value={fields.observacao} onChange={set('observacao')} placeholder="Frase específica para aparecer na capa, contexto do diagnóstico, etc." rows={3} />
              </Field>

              {error && (
                <p style={{ color: '#F87171', fontSize: 13, margin: '0 0 16px', textAlign: 'center' }}>{error}</p>
              )}

              <button
                onClick={handleGenerate}
                disabled={generating}
                style={{
                  width: '100%', padding: '14px',
                  background: generating ? '#1E2820' : 'linear-gradient(135deg, #2EFF8B, #16B85E)',
                  color: generating ? '#3A5545' : '#0A0C0B',
                  border: 'none', borderRadius: 10,
                  fontFamily: "'Instrument Sans','Inter',sans-serif",
                  fontWeight: 700, fontSize: 15, cursor: generating ? 'not-allowed' : 'pointer',
                  marginBottom: 12,
                }}
              >
                {generating ? '⏳ Gerando PDF...' : '⬇ Baixar PDF'}
              </button>

              <button
                onClick={() => setPreview(p => !p)}
                style={{
                  width: '100%', padding: '12px',
                  background: 'transparent',
                  color: '#5A7A65',
                  border: '1px solid #2A2A35', borderRadius: 10,
                  fontFamily: "'Instrument Sans','Inter',sans-serif",
                  fontWeight: 600, fontSize: 14, cursor: 'pointer',
                }}
              >
                {preview ? '🙈 Ocultar prévia' : '👁 Ver prévia'}
              </button>
            </div>

            <div style={{ marginTop: 16, padding: '14px 16px', background: 'rgba(21,196,90,0.04)', border: '1px solid rgba(21,196,90,0.15)', borderRadius: 10 }}>
              <p style={{ margin: 0, fontSize: 12, color: '#3A5545', lineHeight: 1.6 }}>
                💡 O PDF será gerado com as fontes e cores exatas da identidade visual Zinkra. Se a prévia mostrar corretamente, o PDF vai refletir o mesmo resultado.
              </p>
            </div>
          </div>

          {/* PREVIEW */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontSize: 22, fontWeight: 700, color: '#FFF', margin: 0 }}>
                {preview ? 'Prévia da proposta' : 'Sobre este template'}
              </h3>
              {!preview && (
                <span style={{ fontFamily: "'Geist Mono','JetBrains Mono',monospace", fontSize: 10, letterSpacing: 2, color: '#3A5545', textTransform: 'uppercase' }}>
                  8 páginas · A4
                </span>
              )}
            </div>

            {preview ? (
              <div style={{ border: '1px solid #2A2A35', borderRadius: 12, overflow: 'auto', maxHeight: '80vh', background: '#0A0C0B' }}>
                <div style={{ transform: 'scale(0.65)', transformOrigin: 'top left', width: '154%' }}>
                  <div ref={templateRef}>
                    {renderTemplate(tmpl, resolvedFields)}
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Hidden render for PDF generation even when preview is off */}
                <div ref={templateRef} style={{ position: 'absolute', left: -99999, top: 0, pointerEvents: 'none' }}>
                  {renderTemplate(tmpl, resolvedFields)}
                </div>

                {/* Info cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[
                    { icon: '📄', label: 'Páginas', value: tmpl.type === 'comparativo' ? '7 páginas (sem "O que está incluso" duplo)' : '8 páginas completas em A4' },
                    { icon: '🎨', label: 'Visual', value: 'Fundo escuro #0A0C0B, verde #15C45A, Big Shoulders Display + Instrument Sans' },
                    { icon: '📋', label: 'Conteúdo', value: `Capa → Quem somos → Problema → Solução → ${tmpl.type === 'comparativo' ? 'Comparativo' : 'O que está incluso'} → Como funciona → Investimento → Fechamento` },
                    { icon: '💾', label: 'Arquivo', value: `proposta-zinkra-[cliente]-${tmpl.id}.pdf` },
                  ].map(i => (
                    <div key={i.label} style={{ background: '#111116', border: '1px solid #2A2A35', borderRadius: 10, padding: '16px 18px', display: 'flex', gap: 14 }}>
                      <span style={{ fontSize: 20, flexShrink: 0 }}>{i.icon}</span>
                      <div>
                        <div style={{ fontFamily: "'Geist Mono','JetBrains Mono',monospace", fontSize: 10, color: '#3A5545', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>{i.label}</div>
                        <div style={{ fontSize: 13, color: '#8AA895', lineHeight: 1.5 }}>{i.value}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
