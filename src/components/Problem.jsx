import React, { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

/* Pain scenarios — specific, relatable, uncomfortable */
const PAINS = [
  {
    title: 'Invisível no Google',
    desc: 'Quando alguém pesquisa pelo serviço que você presta, encontra seu concorrente — não você. Aquele cliente nunca vai te ligar.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FF4D4D" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
        <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35M11 8v6M8 11h6" strokeDasharray="2 2" />
      </svg>
    ),
  },
  {
    title: 'Site que afasta, não atrai',
    desc: 'Primeiro contato visual ruim = cliente perdido em 3 segundos. Um site amador comunica: não sou confiável. O visitante some.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FF4D4D" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
        <rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" /><path d="M7 8l3 3-3 3M13 11h4" />
      </svg>
    ),
  },
  {
    title: 'Operação manual que não escala',
    desc: 'Sem sistema, você cresce até o limite da sua energia. Cada novo cliente gera mais tarefa manual. Escalar vira pesadelo.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FF4D4D" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
      </svg>
    ),
  },
]

export default function Problem() {
  const headRef  = useRef(null)
  const cardsRef = useRef([])
  const footRef  = useRef(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(headRef.current,
        { opacity: 0, y: 44 },
        { opacity: 1, y: 0, duration: 0.85, ease: 'power4.out',
          scrollTrigger: { trigger: headRef.current, start: 'top 82%', once: true } }
      )
      gsap.fromTo(cardsRef.current,
        { opacity: 0, y: 52 },
        { opacity: 1, y: 0, duration: 0.75, stagger: 0.14, ease: 'power4.out',
          scrollTrigger: { trigger: cardsRef.current[0], start: 'top 82%', once: true } }
      )
      gsap.fromTo(footRef.current,
        { opacity: 0, y: 28 },
        { opacity: 1, y: 0, duration: 0.7, ease: 'power4.out',
          scrollTrigger: { trigger: footRef.current, start: 'top 90%', once: true } }
      )
    })
    return () => ctx.revert()
  }, [])

  return (
    <section className="py-28 relative overflow-hidden" style={{ backgroundColor: '#0A0C0B' }}>
      {/* Red ambient glow — makes the pain feel present */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 70% 50% at 50% 60%, rgba(255,77,77,0.05) 0%, transparent 70%)'
      }} />
      <div className="h-px mb-20" style={{ backgroundColor: 'rgba(255,77,77,0.18)' }} />

      <div className="max-w-7xl mx-auto px-6">

        {/* Headline — direct, slightly uncomfortable */}
        <div ref={headRef} className="text-center mb-16 opacity-0">
          <p className="font-mono text-[11px] uppercase tracking-[3px] mb-5" style={{ color: 'rgba(255,77,77,0.7)' }}>
            O problema
          </p>
          <h2
            className="font-black leading-[1.06] mb-5"
            style={{ fontSize: 'clamp(30px, 4.8vw, 58px)', color: '#FF4D4D' }}
          >
            Seu negócio está perdendo clientes.<br />Todo dia.
          </h2>
          <p className="text-[18px] max-w-2xl mx-auto" style={{ color: '#C7D1CB' }}>
            Não é exagero. Cada dia sem presença digital profissional é um cliente que encontrou seu concorrente no lugar de você.
          </p>
        </div>

        {/* Pain cards — left border red, specific pain scenarios */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-14">
          {PAINS.map((p, i) => (
            <div
              key={p.title}
              ref={el => cardsRef.current[i] = el}
              className="p-8 rounded-xl relative overflow-hidden opacity-0 transition-all duration-300"
              style={{
                backgroundColor: '#111116',
                border: '1px solid rgba(255,77,77,0.15)',
                borderLeft: '3px solid #FF4D4D',
              }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 8px 40px rgba(255,77,77,0.08)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
            >
              <div className="mb-5">{p.icon}</div>
              <h3 className="font-bold text-[17px] text-white mb-3">{p.title}</h3>
              <p className="text-[14px] leading-[1.7]" style={{ color: '#C7D1CB' }}>{p.desc}</p>
            </div>
          ))}
        </div>

        {/* Agitação — custo invisível */}
        <div ref={footRef} className="text-center opacity-0">
          <div
            className="inline-block px-6 py-4 rounded-xl mb-8"
            style={{ backgroundColor: 'rgba(255,77,77,0.05)', border: '1px solid rgba(255,77,77,0.15)' }}
          >
            <p className="text-[16px]" style={{ color: '#C7D1CB' }}>
              Se você se identificou com algum desses cenários,{' '}
              <span className="font-bold text-white">você está pagando um custo invisível todo mês</span> — e esse custo cresce enquanto seus concorrentes avançam.
            </p>
          </div>

          {/* Bridge to solution — green transition */}
          <div>
            <p className="font-mono text-[12px] mb-3" style={{ color: '#4A5550' }}>a solução</p>
            <a
              href="#sobre"
              className="inline-flex items-center gap-2 font-semibold text-[15px] transition-colors duration-200"
              style={{ color: '#15C45A' }}
              onMouseEnter={e => e.currentTarget.style.color = '#2EFF8B'}
              onMouseLeave={e => e.currentTarget.style.color = '#15C45A'}
            >
              A Zinkra foi criada pra resolver exatamente isso
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                <path d="M8 3v10M3 8l5 5 5-5" />
              </svg>
            </a>
          </div>
        </div>

      </div>
    </section>
  )
}
