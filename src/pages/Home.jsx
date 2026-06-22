import React, { useEffect, useRef } from 'react'
import { Helmet } from 'react-helmet-async'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Hero              from '../components/Hero'
import TechStack         from '../components/TechStack'
import ServicesGrid      from '../components/ServicesGrid'
import ClientLogos       from '../components/ClientLogos'
import HorizontalProcess from '../components/HorizontalProcess'
import Performance       from '../components/Performance'
import Vision            from '../components/Vision'
import Newsletter        from '../components/Newsletter'

function FinalCTA() {
  const ref = useRef(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(ref.current,
        { opacity: 0, y: 40 },
        { opacity: 1, y: 0, duration: 0.85, ease: 'power4.out',
          scrollTrigger: { trigger: ref.current, start: 'top 80%', once: true } }
      )
    })
    return () => ctx.revert()
  }, [])

  return (
    <section
      className="py-28 text-center relative overflow-hidden"
      style={{ backgroundColor: '#071209' }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(21,196,90,0.06) 0%, transparent 70%)' }}
      />
      <div ref={ref} className="max-w-2xl mx-auto px-6 relative opacity-0">
        <p className="font-mono text-[11px] uppercase tracking-[3px] mb-5" style={{ color: '#5A7A65' }}>
          Próximo passo
        </p>
        <h2
          className="font-black text-white leading-[1.06] tracking-tight mb-5"
          style={{ fontSize: 'clamp(28px, 4.5vw, 58px)' }}
        >
          Pronto para fazer sua empresa{' '}
          <span style={{ color: '#15C45A' }}>decolar?</span>
        </h2>
        <p className="text-[17px] mb-10 leading-[1.75]" style={{ color: '#5A7A65' }}>
          Marque uma conversa gratuita. A gente entende seu negócio, apresenta as soluções certas e te dá um orçamento sem compromisso.
        </p>
        <a
          href="https://wa.me/5511941164044?text=Ol%C3%A1%2C%20quero%20uma%20an%C3%A1lise%20gratuita%20do%20meu%20projeto"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-3 font-bold text-white px-10 py-4 rounded-lg text-[15px] uppercase tracking-wide transition-all duration-200 mb-8"
          style={{ backgroundColor: '#15C45A' }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#0EA84B'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = '#15C45A'}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          Quero uma análise gratuita
        </a>
        <div className="flex items-center justify-center gap-6 flex-wrap">
          {['Sem compromisso', 'Orçamento gratuito', 'Respondemos em até 2h'].map(t => (
            <div key={t} className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#15C45A' }} />
              <span className="font-mono text-[11px]" style={{ color: '#3A5545' }}>{t}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default function Home() {
  return (
    <>
      <Helmet>
        <title>Software House no Brasil | Sistemas, Sites e ERPs Sob Medida | Zinkra</title>
        <meta name="description" content="Software house especializada em sistemas internos, ERPs, SaaS e sites sob medida para empresas em todo o Brasil. 100% personalizado, sem templates. Orçamento gratuito." />
      </Helmet>
      <Hero />
      <TechStack />
      <ServicesGrid limit={4} />
      <ClientLogos />
      <HorizontalProcess />
      <Performance />
      <Vision />
      <Newsletter />
      <FinalCTA />
    </>
  )
}
