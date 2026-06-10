import React, { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

function ImgPlaceholder({ name }) {
  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center rounded-full"
      style={{ background: '#EEF5F1', border: '2px dashed #C8DDD2' }}
    >
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#B0C8BA" strokeWidth="1.4" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
      <p className="font-mono text-[11px] mt-3 text-center px-4" style={{ color: '#9AB8A8' }}>
        [{name}]
      </p>
    </div>
  )
}

function CheckItem({ text }) {
  return (
    <div className="flex items-start gap-3">
      <div
        className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5"
        style={{ backgroundColor: 'rgba(21,196,90,0.15)' }}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
          <path d="M2 5l2.5 2.5 3.5-4" stroke="#15C45A" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <span className="text-[15px] leading-[1.6]" style={{ color: '#4A5550' }}>{text}</span>
    </div>
  )
}

export default function WhySection() {
  const imgRef  = useRef(null)
  const textRef = useRef(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(imgRef.current,
        { opacity: 0, x: -52 },
        { opacity: 1, x: 0, duration: 0.9, ease: 'power4.out',
          scrollTrigger: { trigger: imgRef.current, start: 'top 82%', once: true } }
      )
      gsap.fromTo(textRef.current,
        { opacity: 0, x: 52 },
        { opacity: 1, x: 0, duration: 0.9, ease: 'power4.out',
          scrollTrigger: { trigger: textRef.current, start: 'top 82%', once: true } }
      )
    })
    return () => ctx.revert()
  }, [])

  return (
    <section id="sobre" className="py-24" style={{ backgroundColor: '#FFFFFF' }}>
      <div className="max-w-7xl mx-auto px-6">

        <div className="text-center mb-16">
          <p className="font-mono text-[11px] uppercase tracking-[3px] mb-4" style={{ color: '#15C45A' }}>
            Nossa abordagem
          </p>
          <h2
            className="font-black text-[#0A0C0B] leading-[1.08] tracking-tight"
            style={{ fontSize: 'clamp(26px, 4vw, 50px)' }}
          >
            Por que ter uma{' '}
            <span style={{ color: '#15C45A' }}>Presenca Digital Profissional?</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* Left: circular image */}
          <div ref={imgRef} className="flex justify-center opacity-0">
            <div className="relative">
              {/* Decorative ring */}
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  transform: 'scale(1.08)',
                  background: 'linear-gradient(135deg, rgba(21,196,90,0.2) 0%, rgba(21,196,90,0.05) 100%)',
                }}
              />
              <div
                className="relative w-[340px] h-[340px] lg:w-[400px] lg:h-[400px] rounded-full overflow-hidden"
                style={{ border: '4px solid rgba(21,196,90,0.25)' }}
              >
                <img
                  src="/images/imagem-sobre.png"
                  alt="Equipe Zinkra"
                  className="w-full h-full object-cover"
                />
              </div>
              {/* Badge */}
              <div
                className="absolute bottom-6 -right-4 px-4 py-2 rounded-xl font-bold text-[13px] text-white"
                style={{ backgroundColor: '#15C45A', boxShadow: '0 8px 24px rgba(21,196,90,0.3)' }}
              >
                +50 projetos entregues
              </div>
            </div>
          </div>

          {/* Right: text */}
          <div ref={textRef} className="opacity-0">
            <p className="text-[17px] leading-[1.8] mb-8" style={{ color: '#4A5550' }}>
              Ter uma presenca digital profissional e essencial para qualquer empresa que deseja crescer e se destacar no mercado. Ela aumenta sua credibilidade, mostrando aos clientes que voce e confiavel e leva o negocio a serio.
            </p>
            <p className="text-[17px] leading-[1.8] mb-10" style={{ color: '#4A5550' }}>
              Com a Zinkra, seu negocio estara disponivel 24 horas por dia, 7 dias por semana, alcancando clientes a qualquer hora e em qualquer lugar — com tecnologia que trabalha por voce.
            </p>

            <div className="space-y-4 mb-10">
              <CheckItem text="100% personalizado — nenhum template, nenhuma terceirizacao" />
              <CheckItem text="Foco em resultado mensuravel, nao apenas entrega de codigo" />
              <CheckItem text="Voce fala direto com quem constroi — sem intermediarios" />
              <CheckItem text="Suporte prioritario apos a entrega do projeto" />
            </div>

            <a
              href="https://wa.me/5511959773552?text=Ol%C3%A1%2C%20quero%20meu%20site%20profissional"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 font-bold text-white px-8 py-4 rounded-lg text-[15px] uppercase tracking-wide transition-all duration-200"
              style={{ backgroundColor: '#15C45A' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#0EA84B'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = '#15C45A'}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Quero meu site profissional
            </a>
          </div>

        </div>
      </div>
    </section>
  )
}
