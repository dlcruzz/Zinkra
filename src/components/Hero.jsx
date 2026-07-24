import React, { useEffect, useRef } from 'react'
import { gsap } from 'gsap'

function WAIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

export default function Hero() {
  const leftRef  = useRef(null)
  const rightRef = useRef(null)

  useEffect(() => {
    gsap.fromTo(leftRef.current,
      { opacity: 0, y: 28 },
      { opacity: 1, y: 0, duration: 0.85, ease: 'power3.out', delay: 0.1 }
    )
    gsap.fromTo(rightRef.current,
      { opacity: 0, scale: 0.97 },
      { opacity: 1, scale: 1, duration: 1.1, ease: 'power2.out', delay: 0.25 }
    )
  }, [])

  return (
    <section
      id="home"
      className="relative overflow-hidden"
      style={{ backgroundColor: '#FFFFFF', paddingTop: '80px' }}
    >
      <div className="max-w-7xl mx-auto px-6 py-16 lg:py-24 relative">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">

          {/* Left: copy */}
          <div ref={leftRef}>
            <div className="inline-flex items-center gap-2 mb-7">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#15C45A' }} />
              <span
                className="font-mono text-[11px] uppercase tracking-[3px]"
                style={{ color: '#4A5550' }}
              >
                Equipe própria em São Paulo
              </span>
            </div>

            <h1
              className="font-black leading-[1.08] tracking-tight mb-6"
              style={{ fontSize: 'clamp(36px, 5vw, 64px)' }}
            >
              <span className="text-[#0A0C0B]">Sistemas, sites e ERPs</span>
              <br />
              <span style={{ color: '#15C45A' }}>sob medida, sem atalho.</span>
            </h1>

            <p
              className="text-[17px] leading-[1.8] mb-9"
              style={{ color: '#4A5550', maxWidth: '520px' }}
            >
              Construímos por dentro, do primeiro wireframe ao deploy. Nada de terceirizar parte do projeto pra outra agência: você fala direto com quem escreve o código.
            </p>

            <div className="flex flex-wrap items-center gap-4 mb-10">
              <a
                href="https://wa.me/5511941164044?text=Ol%C3%A1%2C%20quero%20um%20or%C3%A7amento%20para%20meu%20projeto"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 font-bold text-white px-8 py-4 rounded-lg text-[15px] uppercase tracking-wide transition-all duration-200"
                style={{ backgroundColor: '#15C45A' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#0EA84B'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#15C45A'}
              >
                <WAIcon />
                Quero meu projeto
              </a>
              <a
                href="#servicos-home"
                className="inline-flex items-center gap-2 font-bold text-[15px] px-2 py-4 transition-colors duration-200"
                style={{ color: '#0A0C0B' }}
              >
                Ver o que fazemos
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                  <path d="M3 8h10M9 4l4 4-4 4" />
                </svg>
              </a>
            </div>

            {/* Proof strip */}
            <div className="flex flex-wrap gap-8 pt-6" style={{ borderTop: '1px solid #E8EDEA' }}>
              {[
                { v: '50+',  l: 'Projetos entregues' },
                { v: '35+',  l: 'Clientes satisfeitos' },
                { v: '0',    l: 'Times terceirizados' },
              ].map(s => (
                <div key={s.l}>
                  <div className="font-black text-[28px] leading-none" style={{ color: '#15C45A' }}>{s.v}</div>
                  <div className="font-mono text-[11px] uppercase tracking-[1px] mt-1" style={{ color: '#9AA5A0' }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: real client work, not a stock mockup */}
          <div ref={rightRef} className="relative h-[440px] lg:h-[560px] flex items-center justify-center">
            <svg
              className="absolute pointer-events-none select-none"
              style={{ top: '-6%', right: '4%', width: '58%', height: '112%', zIndex: 0 }}
              viewBox="0 0 100 160"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M8 8 H92 L8 152 H92"
                stroke="#15C45A"
                strokeOpacity="0.14"
                strokeWidth="9"
                strokeLinecap="square"
              />
            </svg>

            <img
              src="/images/mockupvipnautica.png"
              alt="VIP Náutica — site institucional desenvolvido pela Zinkra, com catálogo de mais de 200 embarcações"
              className="h-full w-auto relative z-10 select-none"
              style={{ filter: 'drop-shadow(0 24px 48px rgba(10,12,11,0.22))' }}
              fetchpriority="high"
            />

            {/* Real result callout, not a fabricated stat card */}
            <div
              className="absolute bottom-6 -left-2 lg:left-2 flex items-center gap-3 px-5 py-3.5 rounded-2xl z-20"
              style={{ backgroundColor: '#FFFFFF', boxShadow: '0 8px 32px rgba(0,0,0,0.14)' }}
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center font-black text-[15px] shrink-0"
                style={{ backgroundColor: 'rgba(21,196,90,0.12)', color: '#15C45A' }}
              >
                3x
              </div>
              <div>
                <div className="font-bold text-[13px] text-[#0A0C0B] leading-tight">Mais leads gerados</div>
                <div className="font-mono text-[10px] mt-0.5" style={{ color: '#9AA5A0' }}>Case real · VIP Náutica</div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}
