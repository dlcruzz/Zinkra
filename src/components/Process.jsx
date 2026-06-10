import React, { useRef, useEffect } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

const STEPS = [
  {
    num: '01',
    label: 'Descoberta',
    desc: 'Entendemos seu negócio, seus objetivos e seus clientes. Antes de criar qualquer coisa, mapeamos o problema com precisão cirúrgica.',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#15C45A" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
        <circle cx="11" cy="11" r="8" />
        <path d="M21 21l-4.35-4.35" />
      </svg>
    ),
  },
  {
    num: '02',
    label: 'Estratégia & Design',
    desc: 'Desenhamos a solução: identidade visual, copy e arquitetura. Tudo pensado pra converter — não só pra ficar bonito.',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#15C45A" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
        <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
    ),
  },
  {
    num: '03',
    label: 'Desenvolvimento',
    desc: 'Construção técnica 100% personalizada. Zero template. Código limpo, rápido e preparado pra crescer junto com o seu negócio.',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#15C45A" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
  },
  {
    num: '04',
    label: 'Entrega & Suporte',
    desc: 'Lançamento assistido, treinamento e suporte inicial. Você não fica sozinho depois da entrega — garantimos que funciona de verdade.',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#15C45A" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
      </svg>
    ),
  },
]

export default function Process() {
  const sectionRef = useRef(null)
  const stepRefs   = useRef([])

  useEffect(() => {
    const ctx = gsap.context(() => {
      stepRefs.current.forEach((el, i) => {
        if (!el) return
        gsap.fromTo(el,
          { opacity: 0, x: -48 },
          {
            opacity: 1, x: 0,
            duration: 0.75,
            ease: 'power4.out',
            delay: i * 0.1,
            scrollTrigger: { trigger: el, start: 'top 82%', once: true },
          }
        )
      })
    }, sectionRef)
    return () => ctx.revert()
  }, [])

  return (
    <section
      ref={sectionRef}
      className="py-28"
      style={{ backgroundColor: '#070908' }}
    >
      <div className="h-px mb-20" style={{ backgroundColor: '#1E2620' }} />
      <div className="max-w-4xl mx-auto px-6">

        <div className="mb-16">
          <p className="font-mono text-[11px] uppercase tracking-[3px] mb-4" style={{ color: '#15C45A' }}>
            Como trabalhamos
          </p>
          <h2
            className="font-black text-white leading-[1.08] tracking-tight"
            style={{ fontSize: 'clamp(30px, 4.5vw, 58px)' }}
          >
            Tudo a partir de um processo<br />
            <span style={{ color: '#15C45A' }}>dividido em 4 etapas.</span>
          </h2>
        </div>

        <div className="relative">
          {/* Vertical connector line */}
          <div
            className="absolute left-[38px] top-10 bottom-10 w-px hidden md:block"
            style={{ backgroundColor: 'rgba(21,196,90,0.12)' }}
          />

          <div className="space-y-4">
            {STEPS.map((step, i) => (
              <div
                key={step.num}
                ref={el => stepRefs.current[i] = el}
                className="flex items-center gap-6 p-6 rounded-2xl transition-all duration-300 opacity-0 group"
                style={{
                  backgroundColor: '#0D1210',
                  border: '1px solid #1E2620',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'rgba(21,196,90,0.35)'
                  e.currentTarget.style.backgroundColor = '#0F1511'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = '#1E2620'
                  e.currentTarget.style.backgroundColor = '#0D1210'
                }}
              >
                {/* Number bubble */}
                <div
                  className="shrink-0 w-[76px] h-[76px] rounded-2xl flex items-center justify-center"
                  style={{
                    backgroundColor: 'rgba(21,196,90,0.06)',
                    border: '1px solid rgba(21,196,90,0.18)',
                  }}
                >
                  <span
                    className="font-black font-mono leading-none"
                    style={{ fontSize: '28px', color: '#15C45A' }}
                  >
                    {step.num}
                  </span>
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p
                    className="font-bold text-[16px] mb-1"
                    style={{ color: '#15C45A' }}
                  >
                    {step.label}
                  </p>
                  <p className="text-[14px] leading-relaxed" style={{ color: '#8A9990' }}>
                    {step.desc}
                  </p>
                </div>

                {/* Icon */}
                <div
                  className="shrink-0 w-14 h-14 rounded-xl hidden sm:flex items-center justify-center transition-all duration-300"
                  style={{
                    backgroundColor: 'rgba(21,196,90,0.04)',
                    border: '1px solid rgba(21,196,90,0.1)',
                  }}
                >
                  {step.icon}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-14 text-center">
          <a
            href="https://wa.me/5511959773552?text=Ol%C3%A1%2C%20quero%20iniciar%20meu%20projeto%20com%20a%20Zinkra"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 font-bold text-[14px] text-[#0A0C0B] px-8 py-4 rounded-lg transition-all duration-200"
            style={{ backgroundColor: '#15C45A' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#2EFF8B'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#15C45A'}
          >
            Quero iniciar o meu projeto
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M3 8h10M9 4l4 4-4 4" />
            </svg>
          </a>
        </div>

      </div>
    </section>
  )
}
