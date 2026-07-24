import React, { useRef, useEffect } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

const FOUNDER = {
  img: '/images/danilo-lima-cruz.png',
  name: 'Danilo Lima Cruz',
  role: 'Fundador & Diretor · Desenvolvedor · Tráfego Pago',
  desc: 'Formado em Análise e Desenvolvimento de Sistemas pela FIAP. Arquiteta os sistemas, escreve o código, cuida das campanhas de tráfego pago e lidera cada projeto do briefing ao deploy.',
  tags: ['React', 'Node.js', 'Meta Ads', 'Liderança técnica'],
}

const CREW = [
  {
    role: 'Desenvolvedor',
    desc: 'Cuida da qualidade e da performance do código em cada sistema entregue.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#15C45A" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
        <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
      </svg>
    ),
  },
  {
    role: 'Web Designer',
    desc: 'Traduz a identidade de cada marca em interfaces que vendem, não só que bonitas.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#15C45A" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" />
      </svg>
    ),
  },
  {
    role: 'Copywriter',
    desc: 'Escreve os textos que fazem visita virar cliente, sem clichê de agência.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#15C45A" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
        <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
    ),
  },
]

export default function Team() {
  const headRef  = useRef(null)
  const cardRef  = useRef(null)
  const crewRef  = useRef([])

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: { trigger: headRef.current, start: 'top 82%', once: true },
      })
      tl.fromTo(headRef.current, { opacity: 0, x: -32 }, { opacity: 1, x: 0, duration: 0.75, ease: 'power3.out' })
        .fromTo(cardRef.current,  { opacity: 0, x: 32 },  { opacity: 1, x: 0, duration: 0.75, ease: 'power3.out' }, '-=0.5')

      const crew = crewRef.current.filter(Boolean)
      if (crew.length) {
        gsap.fromTo(crew,
          { opacity: 0, y: 32 },
          { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: 'power3.out',
            scrollTrigger: { trigger: crew[0], start: 'top 88%', once: true } }
        )
      }
    })
    return () => ctx.revert()
  }, [])

  return (
    <section className="py-24" style={{ backgroundColor: '#071209' }}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-12 lg:gap-16 items-center mb-6">

          <div ref={headRef} className="opacity-0">
            <p className="font-mono text-[11px] uppercase tracking-[3px] mb-4" style={{ color: '#15C45A' }}>
              Quem faz acontecer
            </p>
            <h2 className="font-black text-white leading-[1.08] tracking-tight" style={{ fontSize: 'clamp(28px, 4vw, 48px)' }}>
              Um time enxuto,
              <br />de propósito.
            </h2>
            <p className="mt-4 text-[17px]" style={{ color: '#5A7A65' }}>
              Quatro pessoas, cada uma dona da sua parte do processo. Você fala direto com quem decide, sem repassar briefing por níveis de atendimento.
            </p>
          </div>

          <div
            ref={cardRef}
            className="rounded-2xl overflow-hidden flex flex-col sm:flex-row opacity-0 transition-all duration-300"
            style={{ backgroundColor: '#0D1210', border: '1px solid #262E28' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(21,196,90,0.4)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = '#262E28'}
          >
            <img
              src={FOUNDER.img}
              alt={FOUNDER.name}
              className="w-full sm:w-[220px] h-[260px] sm:h-auto object-cover shrink-0"
            />

            <div className="flex flex-col gap-4 p-7">
              <div>
                <p className="font-bold text-[18px] text-white mb-0.5">{FOUNDER.name}</p>
                <p className="font-mono text-[12px] uppercase tracking-[1px]" style={{ color: '#15C45A' }}>{FOUNDER.role}</p>
              </div>

              <p className="text-[14px] leading-[1.7]" style={{ color: '#7A9A85' }}>{FOUNDER.desc}</p>

              <div className="flex flex-wrap gap-2">
                {FOUNDER.tags.map(tag => (
                  <span
                    key={tag}
                    className="font-mono text-[11px] px-2.5 py-1 rounded-full"
                    style={{ backgroundColor: 'rgba(21,196,90,0.07)', color: '#5A7A65', border: '1px solid rgba(21,196,90,0.15)' }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* Rest of the crew — roles confirmed, names to follow */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {CREW.map((m, i) => (
            <div
              key={m.role}
              ref={el => crewRef.current[i] = el}
              className="p-6 rounded-2xl flex items-start gap-4 opacity-0 transition-all duration-300"
              style={{ backgroundColor: '#0D1210', border: '1px solid #262E28' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(21,196,90,0.3)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#262E28'}
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: 'rgba(21,196,90,0.1)', border: '1px solid rgba(21,196,90,0.2)' }}
              >
                {m.icon}
              </div>
              <div>
                <p className="font-bold text-[14px] text-white mb-1">{m.role}</p>
                <p className="text-[13px] leading-[1.6]" style={{ color: '#7A9A85' }}>{m.desc}</p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}
