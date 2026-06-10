import React, { useRef, useEffect } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

export default function Vision() {
  const sectionRef = useRef(null)
  const headRef    = useRef(null)
  const bodyRef    = useRef(null)
  const ctaRef     = useRef(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: { trigger: headRef.current, start: 'top 78%', once: true },
      })
      tl.fromTo(headRef.current, { opacity: 0, y: 52 }, { opacity: 1, y: 0, duration: 0.9, ease: 'power4.out' })
        .fromTo(bodyRef.current,  { opacity: 0, y: 32 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power4.out' }, '-=0.5')
        .fromTo(ctaRef.current,   { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power4.out' }, '-=0.4')
    }, sectionRef)
    return () => ctx.revert()
  }, [])

  return (
    <section
      ref={sectionRef}
      className="py-32 text-center relative overflow-hidden"
      style={{ backgroundColor: '#060807' }}
    >
      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(21,196,90,0.04) 0%, transparent 70%)',
        }}
      />
      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage: 'linear-gradient(rgba(21,196,90,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(21,196,90,0.04) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />

      <div className="max-w-3xl mx-auto px-6 relative">

        {/* Headline */}
        <div ref={headRef} className="mb-10 opacity-0">
          <p className="font-mono text-[11px] uppercase tracking-[3px] mb-6" style={{ color: '#4A5550' }}>
            Próximo nível
          </p>
          <h2
            className="font-black text-white leading-[1.06] tracking-tight"
            style={{ fontSize: 'clamp(34px, 5.5vw, 72px)' }}
          >
            Imagine seu negócio
            <br />
            <span style={{ color: '#15C45A' }}>daqui a 60 dias.</span>
          </h2>
        </div>

        {/* Body */}
        <div
          ref={bodyRef}
          className="mb-14 space-y-5 text-[17px] opacity-0"
          style={{ lineHeight: '1.8', color: '#8A9990' }}
        >
          <p>
            Seu site aparece no Google quando o cliente pesquisa. Novos contatos chegam{' '}
            <strong className="text-white">todos os dias, sem você fazer nada</strong>.
          </p>
          <p>
            Suas redes sociais trabalham enquanto você dorme. Seguidores viram clientes que{' '}
            <strong className="text-white">já confiam na sua marca antes de falar com você</strong>.
          </p>
          <p>
            Seus concorrentes continuam no mesmo lugar. E você?{' '}
            <strong className="text-white">Na frente, com tecnologia trabalhando por você.</strong>
          </p>
          <p
            className="text-[19px] font-bold pt-4"
            style={{ color: '#C7D1CB' }}
          >
            A questão não é <em>SE</em> você vai transformar seu negócio.{' '}
            <span style={{ color: '#15C45A' }}>É QUANDO.</span>
          </p>
        </div>

        {/* CTA */}
        <div ref={ctaRef} className="opacity-0">
          <a
            href="https://wa.me/5511959773552?text=Ol%C3%A1%2C%20quero%20transformar%20meu%20neg%C3%B3cio%20com%20a%20Zinkra"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 font-bold text-[#0A0C0B] rounded-lg transition-all duration-200"
            style={{ backgroundColor: '#15C45A', padding: '18px 48px', fontSize: '16px' }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = '#2EFF8B'
              e.currentTarget.style.boxShadow = '0 0 40px rgba(21,196,90,0.25)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = '#15C45A'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            Quero começar agora
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </a>

          <p className="mt-5 font-mono text-[12px]" style={{ color: '#4A5550' }}>
            Orçamento gratuito · Sem compromisso · Respondemos em até 2h
          </p>
        </div>

      </div>
    </section>
  )
}
