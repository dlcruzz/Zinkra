import React, { useEffect, useRef, useState, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

const SERVICES = [
  'Criação de Sites',
  'Gestão de Redes Sociais',
  'Sistemas Sob Medida',
  'SEO e Google Ads',
  'IA e Automação',
  'Identidade Visual',
  'Performance e Otimização',
  'Outro',
]

function greeting() {
  const h = new Date().getHours()
  if (h >= 5 && h < 12)  return 'Bom dia'
  if (h >= 12 && h < 18) return 'Boa tarde'
  return 'Boa noite'
}

function buildMessage(name, service) {
  return (
    `${greeting()}, Zinkra! Me chamo ${name.trim()} e vim pelo site de vocês. ` +
    `Tenho interesse no serviço de ${service} e gostaria de entender melhor como funciona o processo ` +
    `e receber um orçamento personalizado para o meu projeto. Fico no aguardo!`
  )
}

export default function WAModal() {
  const [open,    setOpen]    = useState(false)
  const [name,    setName]    = useState('')
  const [service, setService] = useState('')
  const [errors,  setErrors]  = useState({})
  const nameRef = useRef(null)

  /* intercept every wa.me link on the page */
  useEffect(() => {
    const handler = (e) => {
      const link = e.target.closest('a[href*="wa.me"]')
      if (!link) return
      e.preventDefault()
      const preService = link.dataset.waService || ''
      setService(preService)
      setErrors({})
      setOpen(true)
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [])

  /* focus name field when modal opens */
  useEffect(() => {
    if (open) setTimeout(() => nameRef.current?.focus(), 80)
  }, [open])

  /* close on Escape */
  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open])

  const validate = useCallback(() => {
    const e = {}
    if (!name.trim())       e.name    = 'Informe seu nome'
    if (!service)           e.service = 'Selecione um serviço'
    return e
  }, [name, service])

  const handleSubmit = useCallback((ev) => {
    ev.preventDefault()
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }

    const msg = buildMessage(name, service)
    window.open(
      `https://wa.me/5511959773552?text=${encodeURIComponent(msg)}`,
      '_blank',
      'noopener,noreferrer'
    )
    setOpen(false)
    setName('')
    setService('')
    setErrors({})
  }, [name, service, validate])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="wa-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[300] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(7,18,9,0.75)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          <motion.div
            key="wa-panel"
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            className="relative w-full rounded-2xl overflow-hidden"
            style={{
              maxWidth: '460px',
              backgroundColor: '#FFFFFF',
              boxShadow: '0 32px 80px rgba(0,0,0,0.28)',
            }}
          >
            {/* Header bar */}
            <div
              className="flex items-center justify-between px-7 py-5"
              style={{ borderBottom: '1px solid #E8EDEA' }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(21,196,90,0.12)' }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="#15C45A" aria-hidden="true">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                </div>
                <div>
                  <p className="font-bold text-[15px] text-[#0A0C0B] leading-tight">Fale com a Zinkra</p>
                  <p className="font-mono text-[11px]" style={{ color: '#9AA5A0' }}>Resposta em ate 2h</p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-150"
                style={{ color: '#9AA5A0' }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#F5F7F5'; e.currentTarget.style.color = '#0A0C0B' }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#9AA5A0' }}
                aria-label="Fechar"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M3 3l10 10M13 3L3 13" />
                </svg>
              </button>
            </div>

            {/* Form body */}
            <form onSubmit={handleSubmit} noValidate className="px-7 py-6 flex flex-col gap-5">

              {/* Name */}
              <div>
                <label className="block font-medium text-[13px] text-[#0A0C0B] mb-2" htmlFor="wa-name">
                  Seu nome <span style={{ color: '#15C45A' }}>*</span>
                </label>
                <input
                  ref={nameRef}
                  id="wa-name"
                  type="text"
                  value={name}
                  onChange={(e) => { setName(e.target.value); if (errors.name) setErrors(p => ({ ...p, name: '' })) }}
                  placeholder="Como podemos te chamar?"
                  className="w-full px-4 py-3 rounded-xl text-[14px] text-[#0A0C0B] outline-none transition-all duration-200"
                  style={{
                    border: errors.name ? '1.5px solid #EF4444' : '1.5px solid #E8EDEA',
                    backgroundColor: '#FAFBFA',
                  }}
                  onFocus={e => { if (!errors.name) e.target.style.borderColor = '#15C45A' }}
                  onBlur={e  => { if (!errors.name) e.target.style.borderColor = '#E8EDEA' }}
                />
                {errors.name && (
                  <p className="font-mono text-[11px] mt-1.5" style={{ color: '#EF4444' }}>{errors.name}</p>
                )}
              </div>

              {/* Service */}
              <div>
                <label className="block font-medium text-[13px] text-[#0A0C0B] mb-2" htmlFor="wa-service">
                  Qual serviço voce precisa? <span style={{ color: '#15C45A' }}>*</span>
                </label>
                <div className="relative">
                  <select
                    id="wa-service"
                    value={service}
                    onChange={(e) => { setService(e.target.value); if (errors.service) setErrors(p => ({ ...p, service: '' })) }}
                    className="w-full px-4 py-3 rounded-xl text-[14px] outline-none appearance-none transition-all duration-200"
                    style={{
                      border: errors.service ? '1.5px solid #EF4444' : '1.5px solid #E8EDEA',
                      backgroundColor: '#FAFBFA',
                      color: service ? '#0A0C0B' : '#9AA5A0',
                    }}
                    onFocus={e => { if (!errors.service) e.target.style.borderColor = '#15C45A' }}
                    onBlur={e  => { if (!errors.service) e.target.style.borderColor = '#E8EDEA' }}
                  >
                    <option value="" disabled>Selecione um servico...</option>
                    {SERVICES.map(s => (
                      <option key={s} value={s} style={{ color: '#0A0C0B' }}>{s}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2" style={{ color: '#9AA5A0' }}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                      <path d="M3 5l4 4 4-4" />
                    </svg>
                  </div>
                </div>
                {errors.service && (
                  <p className="font-mono text-[11px] mt-1.5" style={{ color: '#EF4444' }}>{errors.service}</p>
                )}
              </div>

              {/* Message preview */}
              {name.trim() && service && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="rounded-xl p-4 overflow-hidden"
                  style={{ backgroundColor: '#F5FFF8', border: '1px solid rgba(21,196,90,0.2)' }}
                >
                  <p className="font-mono text-[10px] uppercase tracking-[2px] mb-2" style={{ color: '#15C45A' }}>
                    Preview da mensagem
                  </p>
                  <p className="text-[12px] leading-relaxed" style={{ color: '#3A5545' }}>
                    {buildMessage(name, service)}
                  </p>
                </motion.div>
              )}

              {/* Submit */}
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-3 font-bold text-white py-4 rounded-xl text-[14px] uppercase tracking-wide transition-all duration-200"
                style={{ backgroundColor: '#15C45A' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#0EA84B'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#15C45A'}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Enviar pelo WhatsApp
              </button>

              <p className="text-center font-mono text-[10px]" style={{ color: '#C8DDD2' }}>
                Voce sera redirecionado para o WhatsApp com a mensagem pronta.
              </p>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
