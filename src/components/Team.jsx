import React, { useRef, useEffect } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

const MEMBERS = [
  {
    initials: 'DL',
    name: 'Danilo Lima',
    role: 'CEO & Dev Full-Stack',
    desc: 'Fundador da Zinkra. Responsável pela arquitetura dos sistemas, desenvolvimento front e back-end e estratégia de produto.',
    tags: ['React', 'Node.js', 'PostgreSQL'],
  },
  {
    initials: 'ZK',
    name: 'Time Zinkra',
    role: 'Design & Estratégia',
    desc: 'Responsável pela identidade visual dos projetos, UX/UI e criação de conteúdo estratégico para redes sociais.',
    tags: ['Figma', 'UI/UX', 'Social Media'],
  },
  {
    initials: 'ZK',
    name: 'Time Zinkra',
    role: 'Sistemas & Automação',
    desc: 'Especialista em integrações de APIs, automações com IA e desenvolvimento de sistemas internos e SaaS.',
    tags: ['Python', 'OpenAI', 'APIs'],
  },
]

export default function Team() {
  const headRef  = useRef(null)
  const cardsRef = useRef([])

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(headRef.current,
        { opacity: 0, y: 36 },
        { opacity: 1, y: 0, duration: 0.8, ease: 'power4.out',
          scrollTrigger: { trigger: headRef.current, start: 'top 82%', once: true } }
      )
      const cards = cardsRef.current.filter(Boolean)
      if (cards.length) {
        gsap.fromTo(cards,
          { opacity: 0, y: 40 },
          { opacity: 1, y: 0, duration: 0.7, stagger: 0.12, ease: 'power4.out',
            scrollTrigger: { trigger: cards[0], start: 'top 82%', once: true } }
        )
      }
    })
    return () => ctx.revert()
  }, [])

  return (
    <section className="py-24" style={{ backgroundColor: '#071209' }}>
      <div className="max-w-7xl mx-auto px-6">

        <div ref={headRef} className="mb-14 opacity-0">
          <p className="font-mono text-[11px] uppercase tracking-[3px] mb-4" style={{ color: '#15C45A' }}>
            Quem faz acontecer
          </p>
          <h2 className="font-black text-white leading-[1.08] tracking-tight" style={{ fontSize: 'clamp(28px, 4vw, 48px)' }}>
            Time pequeno. Entrega{' '}
            <span style={{ color: '#15C45A' }}>grande.</span>
          </h2>
          <p className="mt-4 text-[17px] max-w-lg" style={{ color: '#5A7A65' }}>
            Você fala diretamente com quem constrói o seu projeto — sem intermediários, sem jogo de telefone sem fio.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {MEMBERS.map((m, i) => (
            <div
              key={i}
              ref={el => cardsRef.current[i] = el}
              className="p-7 rounded-2xl flex flex-col gap-5 opacity-0 transition-all duration-300"
              style={{ backgroundColor: '#0D1210', border: '1px solid #262E28' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(21,196,90,0.4)'; e.currentTarget.style.transform = 'translateY(-4px)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#262E28'; e.currentTarget.style.transform = 'translateY(0)' }}
            >
              {/* Avatar */}
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-[18px]"
                style={{ backgroundColor: 'rgba(21,196,90,0.12)', color: '#15C45A', border: '1px solid rgba(21,196,90,0.25)' }}
              >
                {m.initials}
              </div>

              <div>
                <p className="font-bold text-[16px] text-white mb-0.5">{m.name}</p>
                <p className="font-mono text-[12px] uppercase tracking-[1px]" style={{ color: '#15C45A' }}>{m.role}</p>
              </div>

              <p className="text-[14px] leading-[1.7] flex-1" style={{ color: '#7A9A85' }}>{m.desc}</p>

              <div className="flex flex-wrap gap-2">
                {m.tags.map(tag => (
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
          ))}
        </div>

      </div>
    </section>
  )
}
