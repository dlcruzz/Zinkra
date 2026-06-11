import React, { useEffect, useRef } from 'react'
import { gsap } from 'gsap'

function WAIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

function ImgPlaceholder({ name, className = '', style = {} }) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-2xl ${className}`}
      style={{ background: '#EEF5F1', border: '2px dashed #C8DDD2', ...style }}
    >
      <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#B0C8BA" strokeWidth="1.4" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
      <p className="font-mono text-[12px] mt-3 text-center px-4" style={{ color: '#9AB8A8' }}>
        [{name}]
      </p>
    </div>
  )
}

export default function Hero() {
  const leftRef  = useRef(null)
  const rightRef = useRef(null)

  useEffect(() => {
    gsap.fromTo(leftRef.current,
      { opacity: 0, x: -48 },
      { opacity: 1, x: 0, duration: 0.95, ease: 'power4.out', delay: 0.15 }
    )
    gsap.fromTo(rightRef.current,
      { opacity: 0, x: 48 },
      { opacity: 1, x: 0, duration: 0.95, ease: 'power4.out', delay: 0.35 }
    )
  }, [])

  return (
    <section
      id="home"
      className="relative overflow-hidden"
      style={{ backgroundColor: '#FFFFFF', paddingTop: '80px' }}
    >
      {/* Decorative green blob top-right */}
      <div
        className="absolute top-0 right-0 w-[700px] h-[700px] rounded-full pointer-events-none -translate-y-1/3 translate-x-1/3"
        style={{ background: 'radial-gradient(circle, rgba(21,196,90,0.09) 0%, transparent 70%)' }}
      />

      <div className="max-w-7xl mx-auto px-6 py-16 lg:py-28 relative">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">

          {/* Left: copy */}
          <div ref={leftRef}>
            <div className="inline-flex mb-7">
              <span
                className="font-mono text-[11px] uppercase tracking-[3px] px-3 py-1.5 rounded-full"
                style={{ backgroundColor: 'rgba(21,196,90,0.1)', color: '#15C45A', border: '1px solid rgba(21,196,90,0.2)' }}
              >
                Software House · São Paulo, SP
              </span>
            </div>

            <h1
              className="font-black leading-[1.08] tracking-tight mb-6"
              style={{ fontSize: 'clamp(36px, 5vw, 64px)' }}
            >
              <span className="text-[#0A0C0B]">Sistemas, Sites e ERPs</span>
              <br />
              <span style={{ color: '#15C45A' }}>Sob Medida em São Paulo.</span>
            </h1>

            <p
              className="text-[17px] leading-[1.8] mb-8"
              style={{ color: '#4A5550', maxWidth: '520px' }}
            >
              Software house especializada em desenvolvimento de sistemas internos, ERPs personalizados, SaaS e criação de sites profissionais. 100% desenvolvido em São Paulo, sem terceirização, sem templates — com foco total em resultado para o seu negócio.
            </p>

            <a
              href="https://wa.me/5511959773552?text=Ol%C3%A1%2C%20quero%20um%20or%C3%A7amento%20para%20meu%20projeto"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 font-bold text-white px-8 py-4 rounded-lg text-[15px] uppercase tracking-wide transition-all duration-200 mb-10"
              style={{ backgroundColor: '#15C45A' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#0EA84B'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = '#15C45A'}
            >
              <WAIcon />
              Quero meu projeto
            </a>

            {/* Stats row */}
            <div className="flex flex-wrap gap-8 pt-6" style={{ borderTop: '1px solid #E8EDEA' }}>
              {[
                { v: '50+',  l: 'Projetos entregues' },
                { v: '35+',  l: 'Clientes satisfeitos' },
                { v: '100%', l: 'Personalizado' },
              ].map(s => (
                <div key={s.l}>
                  <div className="font-black text-[28px] leading-none" style={{ color: '#15C45A' }}>{s.v}</div>
                  <div className="font-mono text-[11px] uppercase tracking-[1px] mt-1" style={{ color: '#9AA5A0' }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: hero image */}
          <div ref={rightRef} className="relative h-[420px] lg:h-[520px]">
            <div
              className="absolute -top-6 -right-6 w-40 h-40 rounded-full"
              style={{ background: 'rgba(21,196,90,0.12)' }}
            />
            <div
              className="absolute bottom-8 -left-6 w-24 h-24 rounded-full"
              style={{ background: 'rgba(21,196,90,0.07)' }}
            />
            <img
              src="/images/imagem-hero.png"
              alt="Software house Zinkra — desenvolvimento de sistemas, sites e ERPs sob medida em São Paulo"
              className="w-full h-full object-cover rounded-2xl relative z-10"
              fetchpriority="high"
            />
          </div>

        </div>
      </div>

      {/* Wave divider */}
      <div style={{ lineHeight: 0, marginTop: '-2px' }}>
        <svg viewBox="0 0 1440 54" preserveAspectRatio="none" className="w-full block" style={{ height: '54px' }}>
          <path d="M0,27 C360,54 1080,0 1440,27 L1440,54 L0,54 Z" fill="#F5F7F5" />
        </svg>
      </div>
    </section>
  )
}
