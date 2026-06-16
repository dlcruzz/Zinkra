import React, { useState, useEffect, useRef, useCallback } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

const PROJECTS = [
  {
    name: 'VIP Náutica',
    tag:  'Site Institucional · Náutica',
    img:  '/images/mockupvipnautica.png',
    url:  'https://www.vipnautica.com.br',
    desc: 'Site com catálogo de mais de 200 embarcações, filtros inteligentes de busca e captação de leads integrada diretamente ao sistema interno da empresa — levando cada contato automaticamente para a equipe de vendas.',
  },
  {
    name: 'Go Ibroker',
    tag:  'Site · Imobiliário · EUA',
    img:  '/images/mockupibroker.png',
    url:  'https://www.goibrokerusa.com/',
    desc: 'Site para corretora de imóveis brasileira atuando nos EUA. Apresenta a empresa e conta com um sistema de filtros que se conecta em tempo real à API do CRM e controle de estoque da cliente — exibindo os imóveis disponíveis automaticamente.',
  },
  {
    name: 'VIPSYS',
    tag:  'Sistema Interno · CRM · Náutica',
    img:  '/images/MockupVIpSys.png',
    url:  null,
    locked: true,
    desc: 'CRM comercial sob medida para a VIP Náutica. Gerencia leads com funil de vendas (Entrando → Vendido), disparo em massa via WhatsApp com variáveis personalizadas, importação de clientes por planilha, controle de acesso por perfil e dashboard de performance por consultor.',
  },
  {
    name: 'FUTDraft',
    tag:  'SaaS · Esportes',
    img:  '/images/Mockup futdraft.png',
    url:  'https://futdraftt.vercel.app/',
    desc: 'Plataforma SaaS para gerenciamento de partidas de futebol amador. Controla times de forma equilibrada, sorteia confrontos, armazena resultados em tempo real e exibe um resumo completo ao final de cada partida.',
  },
]

function Arrow({ dir, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === 'prev' ? 'Projeto anterior' : 'Próximo projeto'}
      className="w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200"
      style={{
        backgroundColor: disabled ? 'rgba(21,196,90,0.06)' : 'rgba(21,196,90,0.12)',
        border: '1.5px solid',
        borderColor: disabled ? 'rgba(21,196,90,0.15)' : 'rgba(21,196,90,0.35)',
        color: disabled ? '#3A5545' : '#15C45A',
        cursor: disabled ? 'default' : 'pointer',
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.backgroundColor = 'rgba(21,196,90,0.22)' }}
      onMouseLeave={e => { if (!disabled) e.currentTarget.style.backgroundColor = 'rgba(21,196,90,0.12)' }}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {dir === 'prev' ? <path d="M10 3L5 8l5 5" /> : <path d="M6 3l5 5-5 5" />}
      </svg>
    </button>
  )
}

export default function Projects() {
  const [active, setActive] = useState(0)
  const [fading, setFading] = useState(false)
  const headRef             = useRef(null)
  const sectionRef          = useRef(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(headRef.current,
        { opacity: 0, y: 40 },
        { opacity: 1, y: 0, duration: 0.8, ease: 'power4.out',
          scrollTrigger: { trigger: headRef.current, start: 'top 82%', once: true } }
      )
      gsap.fromTo(sectionRef.current.querySelector('.carousel-body'),
        { opacity: 0, y: 48 },
        { opacity: 1, y: 0, duration: 0.8, ease: 'power4.out',
          scrollTrigger: { trigger: sectionRef.current, start: 'top 75%', once: true } }
      )
    })
    return () => ctx.revert()
  }, [])

  const go = useCallback((dir) => {
    if (fading) return
    const next = active + dir
    if (next < 0 || next >= PROJECTS.length) return
    setFading(true)
    setTimeout(() => { setActive(next); setFading(false) }, 280)
  }, [active, fading])

  const proj = PROJECTS[active]

  return (
    <section id="projetos" ref={sectionRef} className="py-28" style={{ backgroundColor: '#071209' }}>
      <div className="max-w-7xl mx-auto px-6">

        {/* Header */}
        <div ref={headRef} className="mb-16 opacity-0">
          <p className="font-mono text-[11px] uppercase tracking-[3px] mb-5" style={{ color: '#15C45A' }}>
            Portfólio
          </p>
          <h2 className="font-black text-white leading-[1.07] tracking-tight mb-3" style={{ fontSize: 'clamp(32px, 4.8vw, 60px)' }}>
            O que já entregamos.
          </h2>
          <p className="text-[17px] max-w-lg" style={{ color: '#5A7A65' }}>
            Cada projeto com estratégia própria, entregue no prazo e com foco em resultado real.
          </p>
        </div>

        {/* Carousel */}
        <div className="carousel-body opacity-0">
          <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24">

            {/* Mockup image — já inclui o frame do celular */}
            <div
              className="shrink-0 flex items-center justify-center"
              style={{ transition: 'opacity 0.28s ease', opacity: fading ? 0 : 1 }}
            >
              <img
                key={active}
                src={proj.img}
                alt={`Mockup ${proj.name}`}
                loading="lazy"
                className="w-auto"
                style={{ maxHeight: '520px', maxWidth: '280px', objectFit: 'contain' }}
              />
            </div>

            {/* Info + navigation */}
            <div className="flex-1 min-w-0">

              <p className="font-mono text-[11px] uppercase tracking-[3px] mb-6" style={{ color: '#3A5545' }}>
                {String(active + 1).padStart(2, '0')} / {String(PROJECTS.length).padStart(2, '0')}
              </p>

              <h3
                className="font-black text-white leading-tight mb-2"
                style={{ fontSize: 'clamp(28px, 4vw, 52px)', transition: 'opacity 0.28s ease', opacity: fading ? 0 : 1 }}
              >
                {proj.name}
              </h3>

              <p className="font-mono text-[13px] mb-5" style={{ color: '#5A7A65', transition: 'opacity 0.28s ease', opacity: fading ? 0 : 1 }}>
                {proj.tag}
              </p>

              <p className="text-[15px] leading-[1.75] mb-8 max-w-md" style={{ color: '#7A9A85', transition: 'opacity 0.28s ease', opacity: fading ? 0 : 1 }}>
                {proj.desc}
              </p>

              {/* Dots */}
              <div className="flex items-center gap-2 mb-10">
                {PROJECTS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => !fading && setActive(i)}
                    aria-label={`Ver projeto ${PROJECTS[i].name}`}
                    className="rounded-full transition-all duration-300"
                    style={i === active
                      ? { width: '32px', height: '4px', backgroundColor: '#15C45A' }
                      : { width: '4px',  height: '4px', backgroundColor: '#1A3A22', cursor: 'pointer' }
                    }
                  />
                ))}
              </div>

              {/* CTA + Arrows */}
              <div className="flex items-center gap-4 flex-wrap">

                {proj.locked ? (
                  <div className="flex flex-col gap-2">
                    <div
                      className="inline-flex items-center gap-2.5 font-bold text-[13px] px-6 py-3 rounded-xl uppercase tracking-wide cursor-default"
                      style={{
                        backgroundColor: 'rgba(255,255,255,0.05)',
                        border: '1.5px solid rgba(255,255,255,0.1)',
                        color: '#5A7A65',
                        animation: 'pulse-lock 2.5s ease-in-out infinite',
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                        <rect x="3" y="11" width="18" height="11" rx="2" />
                        <path d="M7 11V7a5 5 0 0110 0v4" />
                      </svg>
                      Sistema privado
                    </div>
                    <p className="font-mono text-[10px] max-w-[260px] leading-relaxed" style={{ color: '#3A5545' }}>
                      Sistema interno — acesso restrito por segurança da empresa.
                    </p>
                  </div>
                ) : (
                  <a
                    href={proj.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 font-bold text-[13px] text-white px-6 py-3 rounded-xl uppercase tracking-wide transition-all duration-200"
                    style={{ backgroundColor: '#15C45A' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#0EA84B'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = '#15C45A'}
                  >
                    Ver projeto
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                      <path d="M3 8h10M9 4l4 4-4 4" />
                    </svg>
                  </a>
                )}

                <div className="flex items-center gap-2">
                  <Arrow dir="prev" onClick={() => go(-1)} disabled={active === 0} />
                  <Arrow dir="next" onClick={() => go(1)}  disabled={active === PROJECTS.length - 1} />
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>
    </section>
  )
}
