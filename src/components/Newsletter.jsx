import React, { useRef, useEffect, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

export default function Newsletter() {
  const [email, setEmail]   = useState('')
  const [sent, setSent]     = useState(false)
  const [error, setError]   = useState('')
  const sectionRef = useRef(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(sectionRef.current,
        { opacity: 0, y: 36 },
        { opacity: 1, y: 0, duration: 0.8, ease: 'power4.out',
          scrollTrigger: { trigger: sectionRef.current, start: 'top 82%', once: true } }
      )
    })
    return () => ctx.revert()
  }, [])

  const validate = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!validate(email)) { setError('Digite um e-mail válido.'); return }
    setError('')
    const msg = encodeURIComponent(`Olá! Quero receber conteúdos e novidades da Zinkra. Meu e-mail é: ${email}`)
    window.open(`https://wa.me/5511941164044?text=${msg}`, '_blank')
    setSent(true)
  }

  return (
    <section style={{ backgroundColor: '#0A0C0B', borderTop: '1px solid #1A2E20' }}>
      <div ref={sectionRef} className="max-w-3xl mx-auto px-6 py-20 text-center opacity-0">
        <p className="font-mono text-[11px] uppercase tracking-[3px] mb-4" style={{ color: '#15C45A' }}>
          Newsletter
        </p>
        <h2
          className="font-black text-white leading-[1.08] tracking-tight mb-4"
          style={{ fontSize: 'clamp(24px, 4vw, 40px)' }}
        >
          Receba conteúdos sobre{' '}
          <span style={{ color: '#15C45A' }}>tecnologia para negócios.</span>
        </h2>
        <p className="text-[16px] mb-8 leading-[1.7]" style={{ color: '#5A7A65' }}>
          Artigos, cases e dicas práticas sobre sites, sistemas e automações — sem spam, só conteúdo útil.
        </p>

        {sent ? (
          <div className="inline-flex items-center gap-3 px-6 py-4 rounded-2xl" style={{ backgroundColor: 'rgba(21,196,90,0.1)', border: '1px solid rgba(21,196,90,0.3)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#15C45A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <span className="font-bold text-white text-[14px]">Ótimo! Te esperamos no WhatsApp.</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setError('') }}
                placeholder="seu@email.com.br"
                className="flex-1 px-5 py-3.5 rounded-xl text-[14px] outline-none transition-all duration-200"
                style={{
                  backgroundColor: '#0D1210',
                  border: error ? '1.5px solid #EF4444' : '1.5px solid rgba(21,196,90,0.25)',
                  color: '#C7D1CB',
                }}
                onFocus={e => e.currentTarget.style.borderColor = '#15C45A'}
                onBlur={e => e.currentTarget.style.borderColor = error ? '#EF4444' : 'rgba(21,196,90,0.25)'}
              />
              <button
                type="submit"
                className="font-bold text-[13px] text-[#0A0C0B] px-6 py-3.5 rounded-xl uppercase tracking-wide transition-all duration-200 whitespace-nowrap"
                style={{ backgroundColor: '#15C45A' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#0EA84B'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#15C45A'}
              >
                Quero receber
              </button>
            </div>
            {error && <p className="mt-2 text-[12px]" style={{ color: '#EF4444' }}>{error}</p>}
            <p className="mt-4 font-mono text-[11px]" style={{ color: '#3A5545' }}>
              Sem spam. Cancele quando quiser.
            </p>
          </form>
        )}
      </div>
    </section>
  )
}
