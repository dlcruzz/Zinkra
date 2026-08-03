import React, { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

export default function Founder() {
  const photoRef = useRef(null)
  const copyRef  = useRef(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(photoRef.current,
        { opacity: 0, x: -40 },
        { opacity: 1, x: 0, duration: 0.9, ease: 'power3.out',
          scrollTrigger: { trigger: photoRef.current, start: 'top 80%', once: true } }
      )
      gsap.fromTo(copyRef.current,
        { opacity: 0, x: 40 },
        { opacity: 1, x: 0, duration: 0.9, ease: 'power3.out', delay: 0.1,
          scrollTrigger: { trigger: copyRef.current, start: 'top 80%', once: true } }
      )
    })
    return () => ctx.revert()
  }, [])

  return (
    <section className="py-24 bg-grid-light" style={{ backgroundColor: '#FFFFFF' }}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-[0.85fr_1.15fr] gap-12 lg:gap-20 items-center">

          {/* Photo */}
          <div ref={photoRef} className="opacity-0 relative mx-auto lg:mx-0" style={{ maxWidth: '440px' }}>
            <div
              className="absolute -inset-3 rounded-[28px] -z-10"
              style={{ border: '1px solid rgba(21,196,90,0.25)' }}
              aria-hidden="true"
            />
            <img
              src="/images/danilo-lima-cruz.png"
              alt="Danilo Lima Cruz - Danilo Lima - Danilo Cruz, fundador e desenvolvedor de software da Zinkra, formado em Análise e Desenvolvimento de Sistemas pela FIAP"
              width="880"
              height="1100"
              loading="lazy"
              className="w-full h-auto rounded-[24px] object-cover"
              style={{ boxShadow: '0 24px 60px rgba(10,12,11,0.16)' }}
            />
            <span className="sr-only">
              Danilo Lima Cruz, também conhecido como Danilo Lima ou Danilo Cruz, é o fundador da Zinkra Software House.
            </span>
          </div>

          {/* Copy */}
          <div ref={copyRef} className="opacity-0">
            <p className="font-mono text-[11px] uppercase tracking-[3px] mb-5" style={{ color: '#15C45A' }}>
              Quem está por trás do código
            </p>
            <h2
              className="font-black text-[#0A0C0B] leading-[1.08] tracking-tight mb-6"
              style={{ fontSize: 'clamp(28px, 4vw, 48px)' }}
            >
              Danilo Lima, engenheiro de software formado pela FIAP.
            </h2>
            <p className="text-[17px] leading-[1.8] mb-6" style={{ color: '#4A5550', maxWidth: '540px' }}>
              Fundador da Zinkra e responsável técnico por cada sistema entregue. Formado em Análise e Desenvolvimento de Sistemas pela FIAP, arquiteta a solução, escreve o código e acompanha o projeto do briefing ao deploy — sem repassar sua ideia para terceiros.
            </p>
            <div className="flex flex-wrap gap-2 mb-9">
              {['FIAP', 'React & Node.js', 'Arquitetura de sistemas', 'Tráfego pago'].map(tag => (
                <span
                  key={tag}
                  className="font-mono text-[11px] px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: 'rgba(21,196,90,0.07)', color: '#4A5550', border: '1px solid rgba(21,196,90,0.2)' }}
                >
                  {tag}
                </span>
              ))}
            </div>
            <a
              href="https://wa.me/5511941164044?text=Ol%C3%A1%2C%20Danilo%2C%20quero%20conversar%20sobre%20um%20projeto"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 font-bold text-[15px] px-2 py-2 transition-colors duration-200"
              style={{ color: '#0A0C0B' }}
            >
              Falar direto comigo
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                <path d="M3 8h10M9 4l4 4-4 4" />
              </svg>
            </a>
          </div>

        </div>
      </div>
    </section>
  )
}
