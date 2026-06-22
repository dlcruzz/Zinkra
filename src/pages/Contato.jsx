import React, { useRef, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { gsap } from 'gsap'
import CTA         from '../components/CTA'
import ContatoForm from '../components/ContatoForm'

export default function Contato() {
  const formHeadRef = useRef(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(formHeadRef.current,
        { opacity: 0, y: 36 },
        { opacity: 1, y: 0, duration: 0.8, ease: 'power4.out',
          scrollTrigger: { trigger: formHeadRef.current, start: 'top 82%', once: true } }
      )
    })
    return () => ctx.revert()
  }, [])

  return (
    <>
      <Helmet>
        <title>Contato · Orçamento Gratuito | Zinkra</title>
        <meta name="description" content="Entre em contato com a Zinkra para um orçamento gratuito. Desenvolvemos sistemas, sites e ERPs sob medida para empresas em todo o Brasil." />
      </Helmet>

      <div style={{ paddingTop: '76px' }}>
        <CTA />

        {/* Formulário */}
        <section className="py-24" style={{ backgroundColor: '#FFFFFF' }}>
          <div className="max-w-3xl mx-auto px-6">
            <div ref={formHeadRef} className="text-center mb-14 opacity-0">
              <p className="font-mono text-[11px] uppercase tracking-[3px] mb-4" style={{ color: '#15C45A' }}>
                Formulário de contato
              </p>
              <h2 className="font-black text-[#0A0C0B] leading-[1.08] tracking-tight" style={{ fontSize: 'clamp(26px, 4vw, 44px)' }}>
                Prefere escrever? <span style={{ color: '#15C45A' }}>Sem problema.</span>
              </h2>
              <p className="mt-4 text-[16px]" style={{ color: '#4A5550' }}>
                Preencha o formulário e enviamos tudo já formatado pelo WhatsApp.
              </p>
            </div>
            <ContatoForm />
          </div>
        </section>
      </div>
    </>
  )
}
