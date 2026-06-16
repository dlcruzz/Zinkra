import React, { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

const PROJECTS = [
  {
    name: 'FinFlow',
    tag:  'SaaS · Finanças',
    img:  '/images/fin.png',
    bg:   'linear-gradient(135deg, #111116 0%, #18211D 100%)',
  },
  {
    name: 'VIP Náutica',
    tag:  'Site Institucional · Náutica',
    img:  '/images/vip.png',
    bg:   'linear-gradient(135deg, #111116 0%, #1a1a2e 100%)',
  },
  {
    name: 'FUTDraft',
    tag:  'Web App · Esportes',
    img:  '/images/Sys.png',
    bg:   'linear-gradient(135deg, #111116 0%, #0d1a11 100%)',
  },
  {
    name: 'Realty Bealty',
    tag:  'Site · Imobiliário',
    img:  '/images/j.png',
    bg:   'linear-gradient(135deg, #111116 0%, #1a1210 100%)',
  },
]

export default function Projects() {
  const headRef  = useRef(null)
  const cardsRef = useRef([])

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(headRef.current,
        { opacity: 0, y: 40 },
        { opacity: 1, y: 0, duration: 0.8, ease: 'power4.out',
          scrollTrigger: { trigger: headRef.current, start: 'top 82%', once: true } }
      )
      gsap.fromTo(cardsRef.current,
        { opacity: 0, y: 48 },
        { opacity: 1, y: 0, duration: 0.7, stagger: 0.1, ease: 'power4.out',
          scrollTrigger: { trigger: cardsRef.current[0], start: 'top 82%', once: true } }
      )
    })
    return () => ctx.revert()
  }, [])

  return (
    <section id="projetos" className="py-28" style={{ backgroundColor: '#F5F7F5' }}>
      <div className="max-w-7xl mx-auto px-6">
        <div ref={headRef} className="mb-14 opacity-0">
          <p className="font-mono text-[11px] uppercase tracking-[3px] mb-5" style={{ color: '#15C45A' }}>
            Portfólio
          </p>
          <h2 className="font-black text-[#0A0C0B] leading-[1.07] tracking-tight mb-3" style={{ fontSize: 'clamp(32px, 4.8vw, 60px)' }}>
            O que já entregamos.
          </h2>
          <p className="text-[17px] max-w-lg" style={{ color: '#4A5550' }}>Cada projeto com estratégia própria, entregue no prazo e com foco em resultado real.</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {PROJECTS.map((p, i) => (
            <div
              key={p.name}
              ref={el => cardsRef.current[i] = el}
              className="rounded-2xl overflow-hidden transition-all duration-300 opacity-0 group"
              style={{ border: '1px solid #E8EDEA' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#15C45A'; e.currentTarget.style.transform = 'translateY(-4px)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#E8EDEA'; e.currentTarget.style.transform = 'translateY(0)' }}
            >
              <div
                className="h-52 flex items-center justify-center overflow-hidden p-4"
                style={{ background: p.bg }}
              >
                <img
                  src={p.img}
                  alt={p.name}
                  loading="lazy"
                  className="max-h-full w-auto object-contain transition-transform duration-500 group-hover:scale-[1.04]"
                  style={{ filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.35))' }}
                  onError={e => { e.currentTarget.style.display = 'none' }}
                />
              </div>
              <div className="p-5" style={{ backgroundColor: '#FFFFFF' }}>
                <h3 className="font-bold text-[15px] text-[#0A0C0B] mb-1">{p.name}</h3>
                <p className="font-mono text-[11px] mb-4" style={{ color: '#8A9990' }}>{p.tag}</p>
                <button
                  className="text-[12px] px-4 py-1.5 rounded-md transition-all duration-200"
                  style={{ border: '1px solid #E8EDEA', color: '#4A5550' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#15C45A'; e.currentTarget.style.color = '#0A0C0B' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#E8EDEA'; e.currentTarget.style.color = '#4A5550' }}
                >
                  Ver projeto
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
