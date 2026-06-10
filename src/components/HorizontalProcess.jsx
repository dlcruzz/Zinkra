import React, { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

const STEPS = [
  {
    num: '01',
    label: 'Briefing e Contratação',
    desc: 'Coleta de informações sobre seu negócio, objetivos e formalização do contrato.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
  {
    num: '02',
    label: 'Design e Estratégia',
    desc: 'Alinhamento de ideias, identidade visual e planejamento estratégico da solução.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4l3 3" />
      </svg>
    ),
  },
  {
    num: '03',
    label: 'Desenvolvimento',
    desc: 'Construção técnica 100% personalizada das plataformas e sistemas digitais.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
  },
  {
    num: '04',
    label: 'Pesquisa e Testes',
    desc: 'Análise do cenário competitivo, testes de qualidade e validação técnica do projeto.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
        <circle cx="11" cy="11" r="8" />
        <path d="M21 21l-4.35-4.35" />
      </svg>
    ),
  },
  {
    num: '05',
    label: 'Publicação e Suporte',
    desc: 'Capacitação da equipe, lançamento do projeto e suporte inicial garantido.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
      </svg>
    ),
  },
]

export default function HorizontalProcess() {
  const headRef  = useRef(null)
  const stepsRef = useRef([])

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(headRef.current,
        { opacity: 0, y: 36 },
        { opacity: 1, y: 0, duration: 0.8, ease: 'power4.out',
          scrollTrigger: { trigger: headRef.current, start: 'top 82%', once: true } }
      )
      gsap.fromTo(stepsRef.current,
        { opacity: 0, y: 48 },
        { opacity: 1, y: 0, duration: 0.65, stagger: 0.1, ease: 'power4.out',
          scrollTrigger: { trigger: stepsRef.current[0], start: 'top 82%', once: true } }
      )
    })
    return () => ctx.revert()
  }, [])

  return (
    <section className="py-24 relative overflow-hidden" style={{ backgroundColor: '#071209' }}>

      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(21,196,90,0.05) 0%, transparent 70%)' }}
      />

      <div className="max-w-7xl mx-auto px-6 relative">

        <div ref={headRef} className="text-center mb-16 opacity-0">
          <p className="font-mono text-[11px] uppercase tracking-[3px] mb-4" style={{ color: '#15C45A' }}>
            Nosso processo
          </p>
          <h2
            className="font-black text-white leading-[1.08] tracking-tight"
            style={{ fontSize: 'clamp(26px, 4vw, 50px)' }}
          >
            Tudo a partir de um processo<br />
            <span style={{ color: '#15C45A' }}>dividido em 5 etapas.</span>
          </h2>
        </div>

        {/* Steps — horizontal, connected */}
        <div className="relative">

          {/* Connecting line */}
          <div
            className="absolute top-[44px] left-[10%] right-[10%] h-px hidden lg:block"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(21,196,90,0.25), rgba(21,196,90,0.25), transparent)' }}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8">
            {STEPS.map((step, i) => (
              <div
                key={step.num}
                ref={el => stepsRef.current[i] = el}
                className="flex flex-col items-center text-center opacity-0"
              >
                {/* Icon circle */}
                <div
                  className="w-[88px] h-[88px] rounded-full flex items-center justify-center mb-6 relative z-10"
                  style={{
                    backgroundColor: '#0D1A12',
                    border: '2px solid rgba(21,196,90,0.3)',
                    color: '#15C45A',
                    boxShadow: '0 0 0 6px rgba(21,196,90,0.06)',
                  }}
                >
                  {step.icon}
                </div>

                <p className="font-black text-[13px] mb-2 leading-snug" style={{ color: '#15C45A' }}>
                  {step.label}
                </p>
                <p className="text-[12px] leading-[1.65]" style={{ color: '#6A8A75' }}>
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  )
}
