import React, { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

const SERVICES = [
  {
    color: '#15C45A',
    title: 'Sites Personalizados',
    desc: 'Criamos um site único e personalizado para sua empresa com layout totalmente moldado para vendas e conversão.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" />
      </svg>
    ),
  },
  {
    color: '#3B82F6',
    title: 'Sites Responsivos',
    desc: 'Site responsivo, podendo se adaptar em todos os dispositivos, além de uma estrutura clara e intuitiva.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
        <rect x="5" y="2" width="14" height="20" rx="2" />
        <path d="M12 18h.01" />
      </svg>
    ),
  },
  {
    color: '#F59E0B',
    title: 'Páginas Rápidas',
    desc: 'Site com carregamento ultra-rápido, oferecendo uma navegação eficiente e uma melhor experiência ao usuário.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    ),
  },
  {
    color: '#8B5CF6',
    title: 'Suporte Especializado',
    desc: 'Conte com um time de especialistas para dar suporte às suas necessidades sob demanda, sempre que precisar.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
        <path d="M3 18v-6a9 9 0 0118 0v6" />
        <path d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3z" />
      </svg>
    ),
  },
  {
    color: '#EC4899',
    title: 'Sistemas Sob Medida',
    desc: 'Integramos e desenvolvemos sistemas internos, ERPs, SaaS e plataformas digitais totalmente personalizados.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
  },
  {
    color: '#10B981',
    title: 'SEO e Google',
    desc: 'Seguimos todos os critérios do Google, garantindo que sua empresa apareça na maior rede de pesquisa do mundo.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
        <circle cx="11" cy="11" r="8" />
        <path d="M21 21l-4.35-4.35" />
      </svg>
    ),
  },
  {
    color: '#6366F1',
    title: 'Redes Sociais',
    desc: 'Gestão completa de redes sociais com criação de conteúdo estratégico e design profissional para sua marca.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
        <path d="M4 9h16M4 15h16M10 3l-2 18M16 3l-2 18" />
      </svg>
    ),
  },
  {
    color: '#F97316',
    title: 'IA e Automação',
    desc: 'Estratégias de inteligência artificial focadas em otimizar a experiência do usuário, automatizar processos e escalar resultados.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <rect x="9" y="9" width="6" height="6" />
        <path d="M9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3" />
      </svg>
    ),
  },
]

export default function ServicesGrid() {
  const headRef  = useRef(null)
  const cardsRef = useRef([])

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(headRef.current,
        { opacity: 0, y: 32 },
        { opacity: 1, y: 0, duration: 0.8, ease: 'power4.out',
          scrollTrigger: { trigger: headRef.current, start: 'top 85%', once: true } }
      )
      gsap.fromTo(cardsRef.current,
        { opacity: 0, y: 40 },
        { opacity: 1, y: 0, duration: 0.65, stagger: 0.07, ease: 'power4.out',
          scrollTrigger: { trigger: cardsRef.current[0], start: 'top 85%', once: true } }
      )
    })
    return () => ctx.revert()
  }, [])

  return (
    <section id="servicos" style={{ backgroundColor: '#F5F7F5', paddingTop: '64px', paddingBottom: '80px' }}>
      <div className="max-w-7xl mx-auto px-6">

        <div ref={headRef} className="text-center mb-14 opacity-0">
          <p className="font-mono text-[11px] uppercase tracking-[3px] mb-4" style={{ color: '#15C45A' }}>
            O que fazemos
          </p>
          <h2
            className="font-black text-[#0A0C0B] leading-[1.08] tracking-tight"
            style={{ fontSize: 'clamp(28px, 4vw, 52px)' }}
          >
            Soluções completas para o seu negócio.
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {SERVICES.map((svc, i) => (
            <div
              key={svc.title}
              ref={el => cardsRef.current[i] = el}
              className="bg-white p-7 rounded-2xl opacity-0 transition-all duration-300 group"
              style={{ border: '1px solid #E8EDEA', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
              onMouseEnter={e => {
                e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.10)'
                e.currentTarget.style.transform = 'translateY(-4px)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              {/* Icon */}
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center mb-5"
                style={{ backgroundColor: `${svc.color}18`, color: svc.color }}
              >
                {svc.icon}
              </div>
              <h3
                className="font-bold text-[15px] mb-3 leading-snug"
                style={{ color: svc.color }}
              >
                {svc.title}
              </h3>
              <p className="text-[13px] leading-[1.7]" style={{ color: '#6A7870' }}>
                {svc.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
