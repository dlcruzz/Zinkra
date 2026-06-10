import React, { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

/* ─── Specific results — not vague praise ──────────────────────────── */
const TESTIMONIALS = [
  {
    quote: 'Em menos de 30 dias com o novo site, o número de clientes chegando pelo Google triplicou. Hoje recebo mensagens todo dia de pessoas que me encontraram na busca.',
    name:  'João Silva',
    role:  'Barbearia Estilo',
    result: 'Google +3x',
  },
  {
    quote: 'Nossa presença no Instagram ficou completamente profissional. A diferença foi imediata — as pessoas começaram a perguntar de qual agência éramos. As vendas cresceram mês a mês.',
    name:  'Mariana Costa',
    role:  'Loja Maré',
    result: 'Vendas +40%',
  },
  {
    quote: 'O sistema interno que a Zinkra desenvolveu economiza mais de 3 horas por dia da minha equipe. O que demorava o dia inteiro agora é automático. Valeu cada centavo.',
    name:  'Carlos Mendes',
    role:  'Mecânica do Carlos',
    result: '−3h/dia manual',
  },
]

export default function Testimonials() {
  const headRef  = useRef(null)
  const cardsRef = useRef([])

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(headRef.current,
        { opacity: 0, y: 36 },
        { opacity: 1, y: 0, duration: 0.8, ease: 'power4.out',
          scrollTrigger: { trigger: headRef.current, start: 'top 82%', once: true } }
      )
      gsap.fromTo(cardsRef.current,
        { opacity: 0, y: 44 },
        { opacity: 1, y: 0, duration: 0.75, stagger: 0.14, ease: 'power4.out',
          scrollTrigger: { trigger: cardsRef.current[0], start: 'top 82%', once: true } }
      )
    })
    return () => ctx.revert()
  }, [])

  return (
    <section className="py-28" style={{ backgroundColor: '#FFFFFF' }}>
      <div className="h-px mb-20" style={{ backgroundColor: '#E8EDEA' }} />
      <div className="max-w-7xl mx-auto px-6">

        {/* Header — proof framing */}
        <div ref={headRef} className="mb-14 opacity-0">
          <p className="font-mono text-[11px] uppercase tracking-[3px] mb-5" style={{ color: '#15C45A' }}>
            Prova social
          </p>
          <h2 className="font-black text-[#0A0C0B] leading-[1.07] tracking-tight" style={{ fontSize: 'clamp(28px, 4vw, 52px)' }}>
            Quem confiou, conta.
          </h2>
          <p className="mt-4 text-[18px] max-w-lg" style={{ color: '#4A5550' }}>
            Resultados reais de negócios que apostaram no digital com a Zinkra.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {TESTIMONIALS.map((t, i) => (
            <div
              key={t.name}
              ref={el => cardsRef.current[i] = el}
              className="p-8 rounded-2xl flex flex-col relative transition-all duration-300 opacity-0"
              style={{ backgroundColor: '#F5F7F5', border: '1px solid #E8EDEA' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#15C45A'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#E8EDEA'}
            >
              {/* Result badge — anchors credibility */}
              <div className="flex items-center justify-between mb-6">
                <div
                  className="font-mono text-[11px] font-bold px-2.5 py-1 rounded"
                  style={{ backgroundColor: 'rgba(21,196,90,0.1)', color: '#15C45A', border: '1px solid rgba(21,196,90,0.2)' }}
                >
                  {t.result}
                </div>
              </div>

              {/* Quote mark — subtle, not decorative overload */}
              <div
                className="font-serif select-none leading-none mb-4"
                style={{ fontSize: '40px', color: 'rgba(21,196,90,0.2)', lineHeight: 0.8 }}
                aria-hidden="true"
              >
                "
              </div>

              {/* Testimonial — specific, with result */}
              <p className="italic text-[15px] leading-[1.75] flex-1 mb-7" style={{ color: '#4A5550' }}>
                "{t.quote}"
              </p>

              {/* Identity */}
              <div className="pt-5" style={{ borderTop: '1px solid #E8EDEA' }}>
                <p className="font-bold text-[14px] text-[#0A0C0B]">{t.name}</p>
                <p className="text-[12px] mt-0.5 font-mono" style={{ color: '#8A9990' }}>{t.role}</p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}
