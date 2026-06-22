import React, { useEffect, useRef } from 'react'
import { Helmet } from 'react-helmet-async'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

const ENTREGAVEIS = [
  {
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#15C45A" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>,
    title: 'Logotipo profissional',
    desc: 'Criado do zero, alinhado à personalidade da marca, em versões principal, reduzida e monocromática.',
  },
  {
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>,
    title: 'Paleta de cores',
    desc: 'Cores primárias, secundárias e neutras com códigos HEX, RGB e CMYK para uso digital e impresso.',
  },
  {
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><path d="M4 7V4h16v3M9 20h6M12 4v16"/></svg>,
    title: 'Tipografia',
    desc: 'Fontes selecionadas para headline, corpo e labels — com hierarquia e regras de aplicação.',
  },
  {
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M7 12h10M12 7v10"/></svg>,
    title: 'Templates para redes sociais',
    desc: 'Posts, stories e capas padronizados no Canva ou Figma para uso imediato pela equipe.',
  },
  {
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#EC4899" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
    title: 'Manual de marca',
    desc: 'Documento completo com regras de uso, exemplos corretos e incorretos e diretrizes de aplicação.',
  },
  {
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>,
    title: 'Papelaria digital',
    desc: 'Assinatura de e-mail, apresentação padrão, papel timbrado e cartão de visita digital.',
  },
]

export default function IdentidadeVisual() {
  const headRef  = useRef(null)
  const gridRef  = useRef(null)
  const ctaRef   = useRef(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(headRef.current,
        { opacity: 0, y: 48 },
        { opacity: 1, y: 0, duration: 0.9, ease: 'power4.out' }
      )
      gsap.fromTo(gridRef.current?.children ? Array.from(gridRef.current.children) : [],
        { opacity: 0, y: 40 },
        { opacity: 1, y: 0, duration: 0.7, stagger: 0.08, ease: 'power4.out', delay: 0.3,
          scrollTrigger: { trigger: gridRef.current, start: 'top 82%', once: true } }
      )
      gsap.fromTo(ctaRef.current,
        { opacity: 0, y: 32 },
        { opacity: 1, y: 0, duration: 0.8, ease: 'power4.out',
          scrollTrigger: { trigger: ctaRef.current, start: 'top 82%', once: true } }
      )
    })
    return () => ctx.revert()
  }, [])

  return (
    <>
      <Helmet>
        <title>Identidade Visual · Design de Marca | Zinkra</title>
        <meta name="description" content="Criamos identidades visuais profissionais para empresas em São Paulo. Logo, paleta de cores, tipografia, manual de marca e templates para redes sociais." />
      </Helmet>

      <div style={{ paddingTop: '76px' }}>

        {/* Hero */}
        <section className="py-24 relative overflow-hidden" style={{ backgroundColor: '#FFFFFF' }}>
          <div
            className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full pointer-events-none -translate-y-1/3 translate-x-1/3"
            style={{ background: 'radial-gradient(circle, rgba(21,196,90,0.07) 0%, transparent 70%)' }}
          />
          <div className="max-w-7xl mx-auto px-6 relative">
            <div ref={headRef} className="max-w-2xl opacity-0">
              <div className="inline-flex mb-7">
                <span
                  className="font-mono text-[11px] uppercase tracking-[3px] px-3 py-1.5 rounded-full"
                  style={{ backgroundColor: 'rgba(21,196,90,0.1)', color: '#15C45A', border: '1px solid rgba(21,196,90,0.2)' }}
                >
                  Design · Identidade Visual
                </span>
              </div>
              <h1
                className="font-black text-[#0A0C0B] leading-[1.08] tracking-tight mb-6"
                style={{ fontSize: 'clamp(32px, 5vw, 60px)' }}
              >
                Sua marca precisa ser{' '}
                <span style={{ color: '#15C45A' }}>reconhecida.</span>
              </h1>
              <p className="text-[17px] leading-[1.8] mb-10" style={{ color: '#4A5550', maxWidth: '520px' }}>
                Criamos identidades visuais que comunicam o valor da sua empresa antes mesmo de você abrir a boca. Do logo ao manual de marca, tudo pensado para transmitir profissionalismo e confiança.
              </p>
              <a
                href="https://wa.me/5511941164044?text=Ol%C3%A1%2C%20quero%20criar%20a%20identidade%20visual%20da%20minha%20empresa%20com%20a%20Zinkra"
                target="_blank"
                rel="noopener noreferrer"
                data-wa-service="Identidade Visual"
                className="inline-flex items-center gap-3 font-bold text-white px-8 py-4 rounded-xl text-[15px] uppercase tracking-wide transition-all duration-200"
                style={{ backgroundColor: '#15C45A' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#0EA84B'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#15C45A'}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Quero minha identidade visual
              </a>
            </div>
          </div>
        </section>

        {/* Entregáveis */}
        <section className="py-24" style={{ backgroundColor: '#F5F7F5' }}>
          <div className="max-w-7xl mx-auto px-6">
            <div className="mb-14">
              <p className="font-mono text-[11px] uppercase tracking-[3px] mb-4" style={{ color: '#15C45A' }}>O que está incluso</p>
              <h2 className="font-black text-[#0A0C0B] leading-[1.08] tracking-tight" style={{ fontSize: 'clamp(26px, 4vw, 44px)' }}>
                Tudo que sua marca precisa<br />para ser levada a sério.
              </h2>
            </div>
            <div ref={gridRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {ENTREGAVEIS.map((item) => (
                <div
                  key={item.title}
                  className="bg-white p-7 rounded-2xl transition-all duration-300"
                  style={{ border: '1px solid #E8EDEA', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#15C45A'; e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.08)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#E8EDEA'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)' }}
                >
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-5" style={{ backgroundColor: '#F5F7F5', border: '1px solid #E8EDEA' }}>
                    {item.icon}
                  </div>
                  <h3 className="font-bold text-[15px] text-[#0A0C0B] mb-2">{item.title}</h3>
                  <p className="text-[13px] leading-[1.7]" style={{ color: '#6A7870' }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 text-center" style={{ backgroundColor: '#071209' }}>
          <div ref={ctaRef} className="max-w-xl mx-auto px-6 opacity-0">
            <p className="font-mono text-[11px] uppercase tracking-[3px] mb-5" style={{ color: '#5A7A65' }}>Investimento</p>
            <h2 className="font-black text-white leading-[1.08] tracking-tight mb-4" style={{ fontSize: 'clamp(24px, 4vw, 40px)' }}>
              Identidade visual a partir de{' '}
              <span style={{ color: '#15C45A' }}>R$ 1.200.</span>
            </h2>
            <p className="text-[16px] mb-8 leading-[1.7]" style={{ color: '#5A7A65' }}>
              Inclui logo, paleta, tipografia e manual de marca. Fale pelo WhatsApp para receber um orçamento detalhado.
            </p>
            <a
              href="https://wa.me/5511941164044?text=Ol%C3%A1%2C%20tenho%20interesse%20em%20identidade%20visual%20pela%20Zinkra"
              target="_blank"
              rel="noopener noreferrer"
              data-wa-service="Identidade Visual"
              className="inline-flex items-center gap-3 font-bold text-[#0A0C0B] px-10 py-4 rounded-xl text-[15px] uppercase tracking-wide transition-all duration-200"
              style={{ backgroundColor: '#15C45A' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#2EFF8B'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = '#15C45A'}
            >
              Solicitar orçamento
            </a>
          </div>
        </section>

      </div>
    </>
  )
}
