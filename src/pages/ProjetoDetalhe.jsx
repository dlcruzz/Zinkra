import React, { useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { gsap } from 'gsap'
import { PROJECTS } from '../data/projects'

function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-6" style={{ paddingTop: '76px' }}>
      <p className="font-mono text-[11px] uppercase tracking-[3px] mb-4" style={{ color: '#15C45A' }}>404</p>
      <h1 className="font-black text-[#0A0C0B] text-[32px] mb-4">Projeto não encontrado</h1>
      <Link to="/projetos" className="font-bold text-[14px] underline" style={{ color: '#15C45A' }}>
        Ver todos os projetos
      </Link>
    </div>
  )
}

export default function ProjetoDetalhe() {
  const { slug }   = useParams()
  const project    = PROJECTS.find(p => p.slug === slug)
  const headRef    = useRef(null)
  const contentRef = useRef(null)

  useEffect(() => {
    if (!project) return
    const ctx = gsap.context(() => {
      gsap.fromTo(headRef.current,
        { opacity: 0, y: 48 },
        { opacity: 1, y: 0, duration: 0.9, ease: 'power4.out', delay: 0.1 }
      )
      gsap.fromTo(contentRef.current,
        { opacity: 0, y: 40 },
        { opacity: 1, y: 0, duration: 0.8, ease: 'power4.out', delay: 0.3 }
      )
    })
    return () => ctx.revert()
  }, [project])

  if (!project) return <NotFound />

  return (
    <div style={{ paddingTop: '76px' }}>

      {/* Header */}
      <section className="py-20 relative overflow-hidden" style={{ backgroundColor: project.locked ? '#070908' : '#071209' }}>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 60% 60% at 30% 50%, rgba(21,196,90,0.05) 0%, transparent 70%)' }}
        />
        <div className="max-w-7xl mx-auto px-6 relative">
          <div ref={headRef} className="opacity-0">
            <Link
              to="/projetos"
              className="inline-flex items-center gap-2 font-mono text-[12px] uppercase tracking-[2px] mb-8 transition-colors"
              style={{ color: '#3A5545' }}
              onMouseEnter={e => e.currentTarget.style.color = '#15C45A'}
              onMouseLeave={e => e.currentTarget.style.color = '#3A5545'}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                <path d="M13 8H3M7 4L3 8l4 4" />
              </svg>
              Portfólio
            </Link>

            <div className="inline-flex mb-5">
              <span
                className="font-mono text-[11px] uppercase tracking-[3px] px-3 py-1.5 rounded-full"
                style={{ backgroundColor: 'rgba(21,196,90,0.12)', color: '#15C45A', border: '1px solid rgba(21,196,90,0.25)' }}
              >
                {project.category}
              </span>
            </div>

            <h1
              className="font-black text-white leading-[1.06] tracking-tight mb-4"
              style={{ fontSize: 'clamp(32px, 5vw, 64px)' }}
            >
              {project.name}
            </h1>
            <p className="text-[17px] max-w-xl" style={{ color: '#5A7A65' }}>{project.desc}</p>

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-6 mt-8 pt-8" style={{ borderTop: '1px solid rgba(21,196,90,0.15)' }}>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[2px] mb-1" style={{ color: '#3A5545' }}>Prazo</p>
                <p className="font-bold text-[14px] text-white">{project.duration}</p>
              </div>
              <div className="h-8 w-px" style={{ backgroundColor: 'rgba(21,196,90,0.15)' }} />
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[2px] mb-1" style={{ color: '#3A5545' }}>Categoria</p>
                <p className="font-bold text-[14px] text-white">{project.category}</p>
              </div>
              <div className="h-8 w-px" style={{ backgroundColor: 'rgba(21,196,90,0.15)' }} />
              <div className="flex flex-wrap gap-2">
                {project.stack.map(s => (
                  <span
                    key={s}
                    className="font-mono text-[11px] px-3 py-1 rounded-full"
                    style={{ backgroundColor: 'rgba(21,196,90,0.08)', color: '#5A7A65', border: '1px solid rgba(21,196,90,0.15)' }}
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Body */}
      <section className="py-20" style={{ backgroundColor: '#FFFFFF' }}>
        <div ref={contentRef} className="max-w-7xl mx-auto px-6 opacity-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">

            {/* Left: mockup */}
            <div className="sticky top-24">
              {project.locked ? (
                <div
                  className="h-[480px] rounded-2xl flex flex-col items-center justify-center gap-4"
                  style={{ backgroundColor: '#0D1210', border: '1.5px solid rgba(21,196,90,0.2)' }}
                >
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(21,196,90,0.4)" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0110 0v4" />
                  </svg>
                  <p className="font-mono text-[12px] uppercase tracking-[2px]" style={{ color: '#3A5545' }}>
                    Acesso restrito
                  </p>
                  <p className="text-[13px] text-center max-w-[240px]" style={{ color: '#3A5545' }}>
                    Sistema interno — imagens confidenciais por segurança do cliente.
                  </p>
                </div>
              ) : (
                <img
                  src={project.img}
                  alt={`Mockup ${project.name}`}
                  className="w-full rounded-2xl object-contain"
                  style={{ maxHeight: '520px' }}
                />
              )}
            </div>

            {/* Right: case study */}
            <div className="space-y-12">

              {/* Challenge */}
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[3px] mb-3" style={{ color: '#15C45A' }}>O desafio</p>
                <p className="text-[16px] leading-[1.8]" style={{ color: '#4A5550' }}>{project.challenge}</p>
              </div>

              {/* Solution */}
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[3px] mb-3" style={{ color: '#15C45A' }}>A solução</p>
                <p className="text-[16px] leading-[1.8]" style={{ color: '#4A5550' }}>{project.solution}</p>
              </div>

              {/* Results */}
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[3px] mb-5" style={{ color: '#15C45A' }}>Resultados</p>
                <div className="grid grid-cols-3 gap-4">
                  {project.results.map(r => (
                    <div
                      key={r.label}
                      className="p-5 rounded-2xl text-center"
                      style={{ backgroundColor: '#F5F7F5', border: '1px solid #E8EDEA' }}
                    >
                      <div className="font-black text-[24px] leading-none mb-2" style={{ color: '#15C45A' }}>{r.value}</div>
                      <div className="font-mono text-[11px] uppercase tracking-[1px]" style={{ color: '#9AA5A0' }}>{r.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA */}
              <div className="pt-4" style={{ borderTop: '1px solid #E8EDEA' }}>
                {project.url && !project.locked ? (
                  <div className="flex flex-wrap gap-3">
                    <a
                      href={project.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 font-bold text-[14px] text-white px-6 py-3 rounded-xl uppercase tracking-wide transition-all duration-200"
                      style={{ backgroundColor: '#15C45A' }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#0EA84B'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = '#15C45A'}
                    >
                      Ver projeto ao vivo
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                        <path d="M3 8h10M9 4l4 4-4 4" />
                      </svg>
                    </a>
                    <a
                      href={`https://wa.me/5511941164044?text=Ol%C3%A1%2C%20vi%20o%20case%20${encodeURIComponent(project.name)}%20e%20quero%20um%20projeto%20similar`}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-wa-service="Projetos"
                      className="inline-flex items-center gap-2 font-bold text-[14px] px-6 py-3 rounded-xl uppercase tracking-wide transition-all duration-200"
                      style={{ border: '1.5px solid #15C45A', color: '#15C45A', backgroundColor: 'transparent' }}
                      onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(21,196,90,0.06)' }}
                      onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent' }}
                    >
                      Quero algo assim
                    </a>
                  </div>
                ) : (
                  <a
                    href={`https://wa.me/5511941164044?text=Ol%C3%A1%2C%20quero%20um%20projeto%20similar%20ao%20${encodeURIComponent(project.name)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-wa-service="Projetos"
                    className="inline-flex items-center gap-2 font-bold text-[14px] text-white px-6 py-3 rounded-xl uppercase tracking-wide transition-all duration-200"
                    style={{ backgroundColor: '#15C45A' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#0EA84B'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = '#15C45A'}
                  >
                    Quero algo assim
                  </a>
                )}
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* More projects */}
      <section className="py-16" style={{ backgroundColor: '#F5F7F5', borderTop: '1px solid #E8EDEA' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between mb-8">
            <p className="font-bold text-[16px] text-[#0A0C0B]">Outros projetos</p>
            <Link
              to="/projetos"
              className="font-mono text-[12px] uppercase tracking-[2px] transition-colors"
              style={{ color: '#9AA5A0' }}
              onMouseEnter={e => e.currentTarget.style.color = '#15C45A'}
              onMouseLeave={e => e.currentTarget.style.color = '#9AA5A0'}
            >
              Ver todos →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {PROJECTS.filter(p => p.slug !== slug).slice(0, 3).map(p => (
              <Link
                key={p.slug}
                to={`/projetos/${p.slug}`}
                className="p-5 rounded-2xl flex flex-col gap-3 transition-all duration-200"
                style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8EDEA' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#15C45A'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#E8EDEA'; e.currentTarget.style.transform = 'translateY(0)' }}
              >
                <img src={p.img} alt={p.name} className="w-full h-32 object-contain rounded-xl" style={{ backgroundColor: '#F5F7F5' }} />
                <div>
                  <p className="font-bold text-[14px] text-[#0A0C0B]">{p.name}</p>
                  <p className="font-mono text-[11px] mt-0.5" style={{ color: '#9AA5A0' }}>{p.category}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

    </div>
  )
}
