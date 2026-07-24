import React, { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

export default function FeaturedService() {
  const imgRef  = useRef(null)
  const textRef = useRef(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(imgRef.current,
        { opacity: 0, scale: 0.94 },
        { opacity: 1, scale: 1, duration: 0.85, ease: 'power2.out',
          scrollTrigger: { trigger: imgRef.current, start: 'top 82%', once: true } }
      )
      gsap.fromTo(textRef.current,
        { opacity: 0, y: 36 },
        { opacity: 1, y: 0, duration: 0.75, ease: 'power3.out',
          scrollTrigger: { trigger: textRef.current, start: 'top 82%', once: true } }
      )
    })
    return () => ctx.revert()
  }, [])

  return (
    <section className="py-24" style={{ backgroundColor: '#F5F7F5' }}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* Left: real client system, not a stock mockup */}
          <div ref={imgRef} className="h-[420px] lg:h-[500px] opacity-0 flex items-center justify-center relative">
            <img
              src="/images/MockupVIpSys.png"
              alt="VIPSYS — CRM comercial sob medida desenvolvido pela Zinkra para a VIP Náutica"
              className="max-h-full w-auto"
              style={{ filter: 'drop-shadow(0 24px 48px rgba(10,12,11,0.16))' }}
              loading="lazy"
            />
            <div
              className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 px-5 py-3 rounded-2xl"
              style={{ backgroundColor: '#FFFFFF', boxShadow: '0 8px 32px rgba(0,0,0,0.14)' }}
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center font-black text-[13px]"
                style={{ backgroundColor: 'rgba(21,196,90,0.12)', color: '#15C45A' }}
              >
                CRM
              </div>
              <div>
                <div className="font-bold text-[13px] text-[#0A0C0B] leading-tight">Funil de vendas automatizado</div>
                <div className="font-mono text-[10px] mt-0.5" style={{ color: '#9AA5A0' }}>VIPSYS · Sistema privado</div>
              </div>
            </div>
          </div>

          {/* Right: text */}
          <div ref={textRef} className="opacity-0">
            <p className="font-mono text-[11px] uppercase tracking-[3px] mb-5" style={{ color: '#15C45A' }}>
              Desenvolvimento de sistemas
            </p>
            <h2
              className="font-black text-[#0A0C0B] leading-[1.1] tracking-tight mb-6"
              style={{ fontSize: 'clamp(28px, 4vw, 52px)' }}
            >
              Criação de Sistemas e{' '}
              <span style={{ color: '#15C45A' }}>Plataformas Sob Medida</span>
            </h2>
            <p className="text-[16px] leading-[1.8] mb-5" style={{ color: '#4A5550' }}>
              Para a VIP Náutica, construímos o VIPSYS: um CRM que tirou o time comercial das planilhas. Funil de leads, disparo em massa via WhatsApp com variáveis personalizadas e dashboard de performance por consultor, tudo em tempo real.
            </p>
            <p className="text-[16px] leading-[1.8] mb-10" style={{ color: '#4A5550' }}>
              É esse nível de sistema que desenvolvemos sob medida: banco de dados, integrações de API, controle de acesso por perfil e responsividade completa, pensado pro processo real da sua empresa.
            </p>

            <div className="flex flex-wrap gap-3 mb-10">
              {['ERP e CRM', 'SaaS', 'Dashboards', 'Automações', 'Integração de APIs'].map(tag => (
                <span
                  key={tag}
                  className="font-mono text-[12px] px-3 py-1.5 rounded-full"
                  style={{ backgroundColor: 'rgba(21,196,90,0.1)', color: '#15C45A', border: '1px solid rgba(21,196,90,0.2)' }}
                >
                  {tag}
                </span>
              ))}
            </div>

            <a
              href="https://wa.me/5511941164044?text=Ol%C3%A1%2C%20tenho%20interesse%20em%20desenvolvimento%20de%20sistemas%20pela%20Zinkra"
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
              Quero um sistema personalizado
            </a>
          </div>

        </div>
      </div>
    </section>
  )
}
