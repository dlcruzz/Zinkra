import React, { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

/* ─── Animated counter ──────────────────────────────────────────────── */
function Counter({ target }) {
  const [val, setVal] = useState(0)
  const el   = useRef(null)
  const done = useRef(false)
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !done.current) {
        done.current = true
        gsap.to({ n: 0 }, {
          n: target, duration: 2.2, ease: 'power2.out',
          onUpdate() { setVal(Math.round(this.targets()[0].n)) },
        })
      }
    }, { threshold: 0.5 })
    if (el.current) io.observe(el.current)
    return () => io.disconnect()
  }, [target])
  return <span ref={el}>{val}</span>
}

/* ─── Value props — why trust Zinkra ──────────────────────────────── */
const PROPS = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#15C45A" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ),
    title: '100% sob medida',
    desc: 'Zero templates. Zero terceirização. Cada projeto sai do zero pensado pro seu negócio — não adaptado de outro.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#15C45A" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
    title: 'Foco em resultado',
    desc: 'Não medimos sucesso pela entrega do código. Medimos pelo crescimento do seu negócio. Projeto encerrado = resultado aparecendo.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#15C45A" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
    title: 'Time direto, sem intermediário',
    desc: 'Você fala com quem constrói. Sem jogo de telefone sem fio entre você e o dev. Decisão rápida, execução mais rápida ainda.',
  },
]

const WHY_BOXES = [
  { stat: '+ de 50',   label: 'projetos entregues', sub: 'Sites, sistemas e redes sociais' },
  { stat: '+ de 35',   label: 'clientes satisfeitos', sub: 'Que continuam crescendo' },
  { stat: '100%',      label: 'sob medida, do zero', sub: 'Sem template. Sem terceirização.' },
]

const STATS = [
  { value: 50,   suffix: '+', label: 'Projetos entregues' },
  { value: 35,   suffix: '+', label: 'Clientes satisfeitos' },
  { value: 1200, suffix: '+', label: 'Artes criadas' },
  { value: 100,  suffix: '%', label: 'Sob medida' },
]

export default function About() {
  const propsRef  = useRef([])
  const whyRef    = useRef([])
  const leftRef   = useRef(null)
  const rightRef  = useRef(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(propsRef.current,
        { opacity: 0, y: 40 },
        { opacity: 1, y: 0, duration: 0.7, stagger: 0.12, ease: 'power4.out',
          scrollTrigger: { trigger: propsRef.current[0], start: 'top 82%', once: true } }
      )
      gsap.fromTo(whyRef.current,
        { opacity: 0, y: 36 },
        { opacity: 1, y: 0, duration: 0.65, stagger: 0.12, ease: 'power4.out',
          scrollTrigger: { trigger: whyRef.current[0], start: 'top 82%', once: true } }
      )
      gsap.fromTo(leftRef.current,
        { opacity: 0, x: -52 },
        { opacity: 1, x: 0, duration: 0.9, ease: 'power4.out',
          scrollTrigger: { trigger: leftRef.current, start: 'top 82%', once: true } }
      )
      gsap.fromTo(rightRef.current,
        { opacity: 0, x: 52 },
        { opacity: 1, x: 0, duration: 0.9, ease: 'power4.out',
          scrollTrigger: { trigger: rightRef.current, start: 'top 82%', once: true } }
      )
    })
    return () => ctx.revert()
  }, [])

  return (
    <section id="sobre" className="py-28 bg-grid-light" style={{ backgroundColor: '#FFFFFF' }}>
      <div className="h-px mb-20" style={{ backgroundColor: '#E8EDEA' }} />
      <div className="max-w-7xl mx-auto px-6">

        {/* Section label */}
        <div className="mb-14">
          <p className="font-mono text-[11px] uppercase tracking-[3px] mb-5" style={{ color: '#15C45A' }}>A solução</p>
          <h2 className="font-black text-[#0A0C0B] leading-[1.07] tracking-tight" style={{ fontSize: 'clamp(30px, 4.5vw, 60px)', maxWidth: '680px' }}>
            Uma equipe técnica que<br />pensa em resultado.
          </h2>
        </div>

        {/* "Por que escolher" — outlined stat boxes (CoderSquad style) */}
        <div className="mb-6">
          <p
            className="font-black text-[#0A0C0B] mb-2"
            style={{ fontSize: 'clamp(22px, 3vw, 36px)' }}
          >
            Por que escolher a{' '}
            <span style={{ color: '#15C45A' }}>Zinkra?</span>
          </p>
          <p className="text-[16px] mb-8 max-w-xl" style={{ color: '#4A5550' }}>
            <strong className="text-[#0A0C0B]">Diferente das outras agências</strong>, somos parceiros do seu negócio — não apenas fornecedores. Cada projeto tem ROI como meta, não apenas entrega.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-16">
            {WHY_BOXES.map((b, i) => (
              <div
                key={b.label}
                ref={el => whyRef.current[i] = el}
                className="p-7 rounded-2xl text-center opacity-0 transition-all duration-300"
                style={{ border: '1px solid rgba(21,196,90,0.25)', backgroundColor: 'rgba(21,196,90,0.03)' }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'rgba(21,196,90,0.5)'
                  e.currentTarget.style.backgroundColor = 'rgba(21,196,90,0.06)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'rgba(21,196,90,0.25)'
                  e.currentTarget.style.backgroundColor = 'rgba(21,196,90,0.03)'
                }}
              >
                <p className="font-black text-white mb-1" style={{ fontSize: 'clamp(28px, 3.5vw, 44px)', lineHeight: 1 }}>
                  {b.stat}
                </p>
                <p className="font-bold text-[15px] mb-1 capitalize" style={{ color: '#0A0C0B' }}>{b.label}</p>
                <p className="font-mono text-[11px]" style={{ color: '#4A5550' }}>{b.sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Three value props — why we're different */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-20">
          {PROPS.map((p, i) => (
            <div
              key={p.title}
              ref={el => propsRef.current[i] = el}
              className="p-7 rounded-xl transition-all duration-300 opacity-0"
              style={{ backgroundColor: '#F5F7F5', border: '1px solid #E8EDEA' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#15C45A'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#E8EDEA'}
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center mb-5"
                style={{ backgroundColor: 'rgba(21,196,90,0.1)', border: '1px solid rgba(21,196,90,0.2)' }}
              >
                {p.icon}
              </div>
              <h3 className="font-bold text-[16px] text-[#0A0C0B] mb-2">{p.title}</h3>
              <p className="text-[14px] leading-[1.7]" style={{ color: '#4A5550' }}>{p.desc}</p>
            </div>
          ))}
        </div>

        {/* Two-column: story + stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* Left — brand story */}
          <div ref={leftRef} style={{ opacity: 0 }}>
            <div className="space-y-4 mb-8 text-[17px] leading-[1.8]" style={{ color: '#4A5550' }}>
              <p>A Zinkra nasceu de uma frustração real: ver empreendedores com ótimos negócios perdendo clientes por falta de presença digital profissional.</p>
              <p>Não terceirizamos. Não usamos templates. Cada projeto que entregamos é construído do zero — com estratégia, execução técnica de qualidade e comprometimento com o crescimento do seu negócio.</p>
            </div>
            <p className="font-bold text-[18px]" style={{ color: '#15C45A' }}>
              Aqui não vendemos serviços — entregamos crescimento.
            </p>
          </div>

          {/* Right — animated stat grid */}
          <div ref={rightRef} className="grid grid-cols-2 gap-4" style={{ opacity: 0 }}>
            {STATS.map(s => (
              <div
                key={s.label}
                className="p-7 rounded-xl transition-all duration-300"
                style={{ backgroundColor: '#F5F7F5', border: '1px solid #E8EDEA' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#15C45A'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#E8EDEA'}
              >
                <div className="font-black mb-2" style={{ fontSize: '48px', lineHeight: 1, color: '#15C45A' }}>
                  <Counter target={s.value} />{s.suffix}
                </div>
                <p className="font-mono text-[11px] uppercase tracking-[2px]" style={{ color: '#8A9990' }}>
                  {s.label}
                </p>
              </div>
            ))}
          </div>

        </div>
      </div>
    </section>
  )
}
