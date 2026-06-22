import React, { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import SaasCard from '../components/SaasCard'

const SAAS_PRODUCTS = [
  {
    name: 'FUTDraft',
    desc: 'Plataforma para gerenciamento de partidas de futebol amador. Controla times equilibrados, sorteia confrontos, armazena resultados em tempo real e exibe resumo completo ao final de cada partida.',
    img: '/images/Mockup futdraft.png',
    tags: ['React', 'Node.js', 'Supabase'],
    demo: 'https://futdraftt.vercel.app/',
    waText: 'Ol%C3%A1%2C%20quero%20saber%20mais%20sobre%20o%20FUTDraft%20da%20Zinkra',
  },
  {
    name: 'Em breve',
    desc: 'Novo produto SaaS em desenvolvimento pela Zinkra. Fique de olho nas novidades.',
    img: null,
    tags: ['Em breve'],
    demo: null,
    waText: 'Ol%C3%A1%2C%20quero%20saber%20mais%20sobre%20os%20SaaS%20da%20Zinkra',
  },
  {
    name: 'Em breve',
    desc: 'Novo produto SaaS em desenvolvimento pela Zinkra. Fique de olho nas novidades.',
    img: null,
    tags: ['Em breve'],
    demo: null,
    waText: 'Ol%C3%A1%2C%20quero%20saber%20mais%20sobre%20os%20SaaS%20da%20Zinkra',
  },
]

function WAIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

export default function Saas() {
  const headRef = useRef(null)
  const gridRef = useRef(null)
  const ctaRef  = useRef(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(headRef.current,
        { opacity: 0, y: 48 },
        { opacity: 1, y: 0, duration: 0.9, ease: 'power4.out',
          scrollTrigger: { trigger: headRef.current, start: 'top 82%', once: true } }
      )
      gsap.fromTo(gridRef.current,
        { opacity: 0, y: 48 },
        { opacity: 1, y: 0, duration: 0.85, ease: 'power4.out',
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
    <div style={{ paddingTop: '76px' }}>

      {/* Header */}
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
                Zinkra Soluções
              </span>
            </div>
            <h1
              className="font-black leading-[1.08] tracking-tight mb-6"
              style={{ fontSize: 'clamp(32px, 5vw, 60px)', color: '#0A0C0B' }}
            >
              SaaS prontos para{' '}
              <span style={{ color: '#15C45A' }}>o seu negócio.</span>
            </h1>
            <p className="text-[17px] leading-[1.8]" style={{ color: '#4A5550', maxWidth: '520px' }}>
              Soluções desenvolvidas internamente pela Zinkra, disponíveis para uso ou licenciamento. Produtos testados, escaláveis e prontos para acelerar o seu negócio.
            </p>
          </div>
        </div>
      </section>

      {/* Products grid */}
      <section className="py-20" style={{ backgroundColor: '#071209' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-0">
            {SAAS_PRODUCTS.map((product, i) => (
              <SaasCard key={i} {...product} />
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-24 text-center" style={{ backgroundColor: '#060807' }}>
        <div ref={ctaRef} className="max-w-2xl mx-auto px-6 opacity-0">
          <p className="font-mono text-[11px] uppercase tracking-[3px] mb-6" style={{ color: '#4A5550' }}>
            Desenvolvimento sob medida
          </p>
          <h2
            className="font-black text-white leading-[1.08] tracking-tight mb-5"
            style={{ fontSize: 'clamp(26px, 4vw, 48px)' }}
          >
            Tem uma ideia de sistema ou SaaS?{' '}
            <span style={{ color: '#15C45A' }}>A Zinkra desenvolve sob medida.</span>
          </h2>
          <p className="text-[17px] mb-10 leading-[1.75]" style={{ color: '#5A7A65' }}>
            Da ideia ao produto final — desenvolvemos SaaS completos com infraestrutura escalável, desde o MVP até o lançamento.
          </p>
          <a
            href="https://wa.me/5511941164044?text=Ol%C3%A1%2C%20tenho%20uma%20ideia%20de%20SaaS%20e%20quero%20desenvolver%20com%20a%20Zinkra"
            target="_blank"
            rel="noopener noreferrer"
            data-wa-service="SaaS"
            className="inline-flex items-center gap-3 font-bold text-[#0A0C0B] px-10 py-4 rounded-lg text-[15px] uppercase tracking-wide transition-all duration-200"
            style={{ backgroundColor: '#15C45A' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#2EFF8B'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#15C45A'}
          >
            <WAIcon />
            Quero desenvolver meu SaaS
          </a>
          <p className="mt-5 font-mono text-[12px]" style={{ color: '#4A5550' }}>
            Orçamento gratuito · Sem compromisso · Respondemos em até 2h
          </p>
        </div>
      </section>

    </div>
  )
}
