import React, { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { gsap } from 'gsap'

export default function NotFound() {
  const ref = useRef(null)

  useEffect(() => {
    gsap.fromTo(ref.current,
      { opacity: 0, y: 40 },
      { opacity: 1, y: 0, duration: 0.8, ease: 'power4.out', delay: 0.1 }
    )
  }, [])

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center text-center px-6 relative overflow-hidden"
      style={{ backgroundColor: '#060807', paddingTop: '76px' }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 60% 60% at 50% 50%, rgba(21,196,90,0.04) 0%, transparent 70%)' }}
      />
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: 'linear-gradient(rgba(21,196,90,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(21,196,90,0.04) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />

      <div ref={ref} className="relative opacity-0 max-w-lg">
        <p
          className="font-black leading-none mb-6"
          style={{ fontSize: 'clamp(80px, 18vw, 160px)', color: 'rgba(21,196,90,0.12)', lineHeight: 1 }}
        >
          404
        </p>
        <h1
          className="font-black text-white leading-[1.08] tracking-tight mb-4"
          style={{ fontSize: 'clamp(24px, 4vw, 40px)' }}
        >
          Página não encontrada.
        </h1>
        <p className="text-[16px] mb-10 leading-[1.7]" style={{ color: '#5A7A65' }}>
          A URL que você acessou não existe ou foi movida. Talvez você esteja procurando por uma das páginas abaixo.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 font-bold text-[14px] text-[#0A0C0B] px-8 py-3.5 rounded-xl uppercase tracking-wide transition-all duration-200"
            style={{ backgroundColor: '#15C45A' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#0EA84B'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#15C45A'}
          >
            Ir para o início
          </Link>
          <Link
            to="/contato"
            className="inline-flex items-center gap-2 font-bold text-[14px] px-8 py-3.5 rounded-xl uppercase tracking-wide transition-all duration-200"
            style={{ border: '1.5px solid rgba(21,196,90,0.35)', color: '#15C45A', backgroundColor: 'transparent' }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(21,196,90,0.08)'; e.currentTarget.style.borderColor = '#15C45A' }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.borderColor = 'rgba(21,196,90,0.35)' }}
          >
            Falar com a Zinkra
          </Link>
        </div>

        <div className="flex flex-wrap justify-center gap-4">
          {[
            { label: 'Serviços', to: '/servicos' },
            { label: 'Projetos', to: '/projetos' },
            { label: 'SaaS',     to: '/saas'     },
            { label: 'Blog',     to: '/blog'      },
          ].map(l => (
            <Link
              key={l.to}
              to={l.to}
              className="font-mono text-[12px] uppercase tracking-[2px] transition-colors"
              style={{ color: '#3A5545' }}
              onMouseEnter={e => e.currentTarget.style.color = '#15C45A'}
              onMouseLeave={e => e.currentTarget.style.color = '#3A5545'}
            >
              {l.label} →
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
