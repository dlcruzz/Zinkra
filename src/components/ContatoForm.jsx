import React, { useState, useRef, useEffect } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

const SERVICOS = [
  'Criação de Sites',
  'Gestão de Redes Sociais',
  'Sistemas Sob Medida',
  'ERP / CRM',
  'SaaS',
  'IA e Automação',
  'Identidade Visual',
  'Outro',
]

function Field({ label, error, children }) {
  return (
    <div>
      <label className="block font-mono text-[11px] uppercase tracking-[2px] mb-2" style={{ color: '#15C45A' }}>
        {label}
      </label>
      {children}
      {error && <p className="mt-1.5 text-[12px]" style={{ color: '#EF4444' }}>{error}</p>}
    </div>
  )
}

const INPUT_STYLE = {
  width: '100%',
  padding: '12px 16px',
  borderRadius: '12px',
  fontSize: '14px',
  outline: 'none',
  transition: 'border-color 0.2s',
  backgroundColor: '#F5F7F5',
  border: '1.5px solid #E8EDEA',
  color: '#0A0C0B',
}

export default function ContatoForm() {
  const [form, setForm] = useState({ nome: '', email: '', telefone: '', servico: '', mensagem: '' })
  const [errors, setErrors] = useState({})
  const [sent, setSent] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(ref.current,
        { opacity: 0, y: 40 },
        { opacity: 1, y: 0, duration: 0.85, ease: 'power4.out',
          scrollTrigger: { trigger: ref.current, start: 'top 80%', once: true } }
      )
    })
    return () => ctx.revert()
  }, [])

  const set = (field, value) => {
    setForm(f => ({ ...f, [field]: value }))
    if (errors[field]) setErrors(e => ({ ...e, [field]: '' }))
  }

  const validate = () => {
    const e = {}
    if (!form.nome.trim())  e.nome  = 'Nome obrigatório.'
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'E-mail inválido.'
    if (!form.servico)      e.servico = 'Selecione um serviço.'
    if (!form.mensagem.trim() || form.mensagem.trim().length < 10) e.mensagem = 'Mensagem muito curta (mín. 10 caracteres).'
    return e
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    const tel  = form.telefone ? `\nTelefone: ${form.telefone}` : ''
    const msg  = encodeURIComponent(
      `Olá, Zinkra! Me chamo ${form.nome}.\nE-mail: ${form.email}${tel}\nServiço de interesse: ${form.servico}\n\n${form.mensagem}`
    )
    window.open(`https://wa.me/5511941164044?text=${msg}`, '_blank')
    setSent(true)
  }

  const focusStyle = (e) => { e.currentTarget.style.borderColor = '#15C45A' }
  const blurStyle  = (e, field) => {
    e.currentTarget.style.borderColor = errors[field] ? '#EF4444' : '#E8EDEA'
  }

  if (sent) {
    return (
      <div ref={ref} className="max-w-xl mx-auto text-center py-16 opacity-0">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
          style={{ backgroundColor: 'rgba(21,196,90,0.1)', border: '1px solid rgba(21,196,90,0.3)' }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#15C45A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>
        <h3 className="font-black text-[24px] text-[#0A0C0B] mb-3">Mensagem enviada!</h3>
        <p className="text-[16px] mb-6" style={{ color: '#4A5550' }}>
          O WhatsApp foi aberto com sua mensagem. Respondemos em até 2h em dias úteis.
        </p>
        <button
          onClick={() => { setSent(false); setForm({ nome: '', email: '', telefone: '', servico: '', mensagem: '' }) }}
          className="font-bold text-[13px] px-6 py-3 rounded-xl uppercase tracking-wide transition-all duration-200"
          style={{ border: '1.5px solid #E8EDEA', color: '#4A5550' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#15C45A'; e.currentTarget.style.color = '#15C45A' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#E8EDEA'; e.currentTarget.style.color = '#4A5550' }}
        >
          Enviar outra mensagem
        </button>
      </div>
    )
  }

  return (
    <form ref={ref} onSubmit={handleSubmit} noValidate className="max-w-xl mx-auto space-y-5 opacity-0">

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Field label="Nome *" error={errors.nome}>
          <input
            type="text"
            value={form.nome}
            onChange={e => set('nome', e.target.value)}
            placeholder="João Silva"
            style={{ ...INPUT_STYLE, borderColor: errors.nome ? '#EF4444' : '#E8EDEA' }}
            onFocus={focusStyle}
            onBlur={e => blurStyle(e, 'nome')}
          />
        </Field>
        <Field label="E-mail *" error={errors.email}>
          <input
            type="email"
            value={form.email}
            onChange={e => set('email', e.target.value)}
            placeholder="joao@empresa.com.br"
            style={{ ...INPUT_STYLE, borderColor: errors.email ? '#EF4444' : '#E8EDEA' }}
            onFocus={focusStyle}
            onBlur={e => blurStyle(e, 'email')}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Field label="Telefone / WhatsApp" error={errors.telefone}>
          <input
            type="tel"
            value={form.telefone}
            onChange={e => set('telefone', e.target.value)}
            placeholder="(11) 99999-9999"
            style={{ ...INPUT_STYLE, borderColor: '#E8EDEA' }}
            onFocus={focusStyle}
            onBlur={e => blurStyle(e, 'telefone')}
          />
        </Field>
        <Field label="Serviço de interesse *" error={errors.servico}>
          <select
            value={form.servico}
            onChange={e => set('servico', e.target.value)}
            style={{ ...INPUT_STYLE, borderColor: errors.servico ? '#EF4444' : '#E8EDEA', appearance: 'none', cursor: 'pointer' }}
            onFocus={focusStyle}
            onBlur={e => blurStyle(e, 'servico')}
          >
            <option value="">Selecione...</option>
            {SERVICOS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
      </div>

      <Field label="Mensagem *" error={errors.mensagem}>
        <textarea
          value={form.mensagem}
          onChange={e => set('mensagem', e.target.value)}
          placeholder="Conte um pouco sobre o seu projeto, empresa e o que você precisa..."
          rows={5}
          style={{ ...INPUT_STYLE, resize: 'vertical', borderColor: errors.mensagem ? '#EF4444' : '#E8EDEA' }}
          onFocus={focusStyle}
          onBlur={e => blurStyle(e, 'mensagem')}
        />
      </Field>

      <button
        type="submit"
        className="w-full font-bold text-[14px] text-[#0A0C0B] py-4 rounded-xl uppercase tracking-wide transition-all duration-200 flex items-center justify-center gap-3"
        style={{ backgroundColor: '#15C45A' }}
        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#0EA84B'}
        onMouseLeave={e => e.currentTarget.style.backgroundColor = '#15C45A'}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
        Enviar pelo WhatsApp
      </button>
      <p className="text-center font-mono text-[11px]" style={{ color: '#9AA5A0' }}>
        Sua mensagem será enviada pelo WhatsApp · Respondemos em até 2h
      </p>
    </form>
  )
}
