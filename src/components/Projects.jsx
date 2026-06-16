import React, { useState, useEffect, useRef, useCallback } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

const PROJECTS = [
  {
    name: 'VIP Náutica',
    tag:  'Site Institucional · Náutica',
    img:  '/images/vip.png',
    url:  'https://www.vipnautica.com.br',
    bg:   'linear-gradient(135deg, #0a1628 0%, #0d2137 100%)',
  },
  {
    name: 'FUTDraft',
    tag:  'Web App · Esportes',
    img:  '/images/Sys.png',
    url:  'https://futdraftt.vercel.app/',
    bg:   'linear-gradient(135deg, #071209 0%, #0d1a11 100%)',
  },
  {
    name: 'Realty Bealty',
    tag:  'Site · Imobiliário',
    img:  '/images/j.png',
    url:  'https://www.goibrokerusa.com/',
    bg:   'linear-gradient(135deg, #111116 0%, #1a1210 100%)',
  },
]

/* ─── Phone frame ─────────────────────────────────────────────────── */
function PhoneFrame({ project }) {
  return (
    <div className="relative mx-auto select-none" style={{ width: '220px' }}>
      {/* Outer shell */}
      <div
        className="relative rounded-[40px] overflow-hidden"
        style={{
          background: '#1A1A1A',
          padding: '10px',
          boxShadow:
            '0 0 0 1px rgba(255,255,255,0.12), 0 24px 64px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.08)',
        }}
      >
        {/* Screen */}
        <div
          className="relative rounded-[32px] overflow-hidden"
          style={{ background: project.bg, height: '420px' }}
        >
          {/* Dynamic island */}
          <div
            className="absolute top-3 left-1/2 -translate-x-1/2 z-20 rounded-full"
            style={{ width: '80px', height: '24px', backgroundColor: '#000' }}
          />

          {/* Screenshot */}
          <img
            src={project.img}
            alt={project.name}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover object-top"
            style={{ opacity: 0.95 }}
          />

          {/* Bottom gradient overlay so frame blends */}
          <div
            className="absolute bottom-0 inset-x-0 h-16 pointer-events-none"
            style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 100%)' }}
          />
        </div>

        {/* Side buttons (decoration) */}
      </div>

      {/* Left buttons */}
      <div className="absolute -left-[3px] top-20 w-[3px] h-8 rounded-l-sm" style={{ backgroundColor: '#2A2A2A' }} />
      <div className="absolute -left-[3px] top-32 w-[3px] h-12 rounded-l-sm" style={{ backgroundColor: '#2A2A2A' }} />
      <div className="absolute -left-[3px] top-48 w-[3px] h-12 rounded-l-sm" style={{ backgroundColor: '#2A2A2A' }} />
      {/* Right button */}
      <div className="absolute -right-[3px] top-28 w-[3px] h-16 rounded-r-sm" style={{ backgroundColor: '#2A2A2A' }} />
    </div>
  )
}

/* ─── Arrow button ────────────────────────────────────────────────── */
function Arrow({ dir, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === 'prev' ? 'Projeto anterior' : 'Próximo projeto'}
      className="w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200"
      style={{
        backgroundColor: disabled ? 'rgba(21,196,90,0.06)' : 'rgba(21,196,90,0.12)',
        border: '1.5px solid',
        borderColor: disabled ? 'rgba(21,196,90,0.15)' : 'rgba(21,196,90,0.35)',
        color: disabled ? '#3A5545' : '#15C45A',
        cursor: disabled ? 'default' : 'pointer',
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.backgroundColor = 'rgba(21,196,90,0.22)' }}
      onMouseLeave={e => { if (!disabled) e.currentTarget.style.backgroundColor = 'rgba(21,196,90,0.12)' }}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {dir === 'prev'
          ? <path d="M10 3L5 8l5 5" />
          : <path d="M6 3l5 5-5 5" />
        }
      </svg>
    </button>
  )
}

/* ─── Projects carousel ───────────────────────────────────────────── */
export default function Projects() {
  const [active, setActive]   = useState(0)
  const [anim,   setAnim]     = useState(false)
  const headRef               = useRef(null)
  const sectionRef            = useRef(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(headRef.current,
        { opacity: 0, y: 40 },
        { opacity: 1, y: 0, duration: 0.8, ease: 'power4.out',
          scrollTrigger: { trigger: headRef.current, start: 'top 82%', once: true } }
      )
      gsap.fromTo(sectionRef.current.querySelector('.carousel-body'),
        { opacity: 0, y: 48 },
        { opacity: 1, y: 0, duration: 0.8, ease: 'power4.out',
          scrollTrigger: { trigger: sectionRef.current, start: 'top 75%', once: true } }
      )
    })
    return () => ctx.revert()
  }, [])

  const go = useCallback((dir) => {
    if (anim) return
    const next = active + dir
    if (next < 0 || next >= PROJECTS.length) return
    setAnim(true)
    setTimeout(() => { setActive(next); setAnim(false) }, 320)
  }, [active, anim])

  const proj = PROJECTS[active]

  return (
    <section id="projetos" ref={sectionRef} className="py-28" style={{ backgroundColor: '#071209' }}>
      <div className="max-w-7xl mx-auto px-6">

        {/* Header */}
        <div ref={headRef} className="mb-16 opacity-0">
          <p className="font-mono text-[11px] uppercase tracking-[3px] mb-5" style={{ color: '#15C45A' }}>
            Portfólio
          </p>
          <h2 className="font-black text-white leading-[1.07] tracking-tight mb-3" style={{ fontSize: 'clamp(32px, 4.8vw, 60px)' }}>
            O que já entregamos.
          </h2>
          <p className="text-[17px] max-w-lg" style={{ color: '#5A7A65' }}>
            Cada projeto com estratégia própria, entregue no prazo e com foco em resultado real.
          </p>
        </div>

        {/* Carousel */}
        <div className="carousel-body opacity-0">
          <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24">

            {/* Phone mockup */}
            <div className="shrink-0">
              <div
                key={active}
                style={{
                  animation: anim ? 'fadeSlide 0.32s ease' : 'none',
                  opacity: anim ? 0 : 1,
                  transition: 'opacity 0.32s ease',
                }}
              >
                <PhoneFrame project={proj} />
              </div>
            </div>

            {/* Info + navigation */}
            <div className="flex-1 min-w-0">

              {/* Counter */}
              <p className="font-mono text-[11px] uppercase tracking-[3px] mb-6" style={{ color: '#3A5545' }}>
                {String(active + 1).padStart(2, '0')} / {String(PROJECTS.length).padStart(2, '0')}
              </p>

              {/* Project name */}
              <h3
                className="font-black text-white leading-tight mb-2"
                style={{ fontSize: 'clamp(28px, 4vw, 52px)', transition: 'opacity 0.3s ease', opacity: anim ? 0 : 1 }}
              >
                {proj.name}
              </h3>

              {/* Tag */}
              <p className="font-mono text-[13px] mb-8" style={{ color: '#5A7A65', transition: 'opacity 0.3s ease', opacity: anim ? 0 : 1 }}>
                {proj.tag}
              </p>

              {/* Dot indicators */}
              <div className="flex items-center gap-2 mb-10">
                {PROJECTS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => !anim && setActive(i)}
                    aria-label={`Ver projeto ${PROJECTS[i].name}`}
                    className="rounded-full transition-all duration-400"
                    style={i === active
                      ? { width: '32px', height: '4px', backgroundColor: '#15C45A' }
                      : { width: '4px',  height: '4px', backgroundColor: '#1A3A22', cursor: 'pointer' }
                    }
                  />
                ))}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-4 flex-wrap">
                <a
                  href={proj.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 font-bold text-[13px] text-white px-6 py-3 rounded-xl uppercase tracking-wide transition-all duration-200"
                  style={{ backgroundColor: '#15C45A' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#0EA84B'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = '#15C45A'}
                >
                  Ver projeto
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                    <path d="M3 8h10M9 4l4 4-4 4" />
                  </svg>
                </a>

                <div className="flex items-center gap-2">
                  <Arrow dir="prev" onClick={() => go(-1)} disabled={active === 0} />
                  <Arrow dir="next" onClick={() => go(1)}  disabled={active === PROJECTS.length - 1} />
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>
    </section>
  )
}
