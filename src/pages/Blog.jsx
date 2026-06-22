import React, { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { POSTS } from '../data/blog'

const CATEGORY_COLORS = {
  Sistemas: '#15C45A',
  Sites:    '#3B82F6',
  SaaS:     '#8B5CF6',
  Design:   '#EC4899',
}

function PostCard({ post, index, cardRef }) {
  const color = CATEGORY_COLORS[post.category] || '#15C45A'
  return (
    <Link
      ref={cardRef}
      to={`/blog/${post.slug}`}
      className="flex flex-col rounded-2xl overflow-hidden transition-all duration-300 opacity-0"
      style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8EDEA' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = '#15C45A'; e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.08)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = '#E8EDEA'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
    >
      {/* Cover */}
      <div
        className="h-44 flex items-center justify-center relative"
        style={{ backgroundColor: `${color}0D` }}
      >
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: 'linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
        <span
          className="font-black relative"
          style={{ fontSize: '64px', color: `${color}25`, lineHeight: 1 }}
        >
          {index + 1}
        </span>
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-6">
        <div className="flex items-center gap-3 mb-3">
          <span
            className="font-mono text-[10px] uppercase tracking-[2px] px-2.5 py-1 rounded-full"
            style={{ backgroundColor: `${color}15`, color }}
          >
            {post.category}
          </span>
          <span className="font-mono text-[11px]" style={{ color: '#9AA5A0' }}>
            {post.readTime} de leitura
          </span>
        </div>
        <h2 className="font-bold text-[16px] text-[#0A0C0B] leading-snug mb-3 flex-1">
          {post.title}
        </h2>
        <p className="text-[13px] leading-[1.65] mb-5" style={{ color: '#6A7870' }}>
          {post.excerpt}
        </p>
        <div className="flex items-center justify-between pt-4" style={{ borderTop: '1px solid #E8EDEA' }}>
          <span className="font-mono text-[11px]" style={{ color: '#9AA5A0' }}>
            {new Date(post.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
          </span>
          <span className="font-bold text-[13px] flex items-center gap-1" style={{ color: '#15C45A' }}>
            Ler artigo
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
              <path d="M3 8h10M9 4l4 4-4 4" />
            </svg>
          </span>
        </div>
      </div>
    </Link>
  )
}

export default function Blog() {
  const headRef  = useRef(null)
  const cardsRef = useRef([])

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(headRef.current,
        { opacity: 0, y: 40 },
        { opacity: 1, y: 0, duration: 0.85, ease: 'power4.out' }
      )
      const cards = cardsRef.current.filter(Boolean)
      if (cards.length) {
        gsap.fromTo(cards,
          { opacity: 0, y: 48 },
          { opacity: 1, y: 0, duration: 0.7, stagger: 0.1, ease: 'power4.out', delay: 0.3 }
        )
      }
    })
    return () => ctx.revert()
  }, [])

  return (
    <>
      <Helmet>
        <title>Blog · Tecnologia para Negócios | Zinkra</title>
        <meta name="description" content="Artigos práticos sobre sistemas sob medida, criação de sites, SaaS e automações. Conteúdo da Zinkra para empreendedores que querem crescer com tecnologia." />
      </Helmet>

      <div style={{ paddingTop: '76px' }}>

        <section className="py-20 relative overflow-hidden" style={{ backgroundColor: '#FFFFFF' }}>
          <div
            className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full pointer-events-none -translate-y-1/3 translate-x-1/3"
            style={{ background: 'radial-gradient(circle, rgba(21,196,90,0.07) 0%, transparent 70%)' }}
          />
          <div className="max-w-7xl mx-auto px-6 relative">
            <div ref={headRef} className="opacity-0">
              <div className="inline-flex mb-6">
                <span
                  className="font-mono text-[11px] uppercase tracking-[3px] px-3 py-1.5 rounded-full"
                  style={{ backgroundColor: 'rgba(21,196,90,0.1)', color: '#15C45A', border: '1px solid rgba(21,196,90,0.2)' }}
                >
                  Blog · Zinkra
                </span>
              </div>
              <h1
                className="font-black text-[#0A0C0B] leading-[1.08] tracking-tight mb-5"
                style={{ fontSize: 'clamp(32px, 5vw, 60px)' }}
              >
                Tecnologia que{' '}
                <span style={{ color: '#15C45A' }}>faz sentido para o negócio.</span>
              </h1>
              <p className="text-[17px] leading-[1.8] max-w-xl" style={{ color: '#4A5550' }}>
                Artigos práticos sobre sistemas, sites e automações — escritos por quem constrói, para quem decide.
              </p>
            </div>
          </div>
        </section>

        <section className="pb-28" style={{ backgroundColor: '#F5F7F5' }}>
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {POSTS.map((post, i) => (
                <PostCard
                  key={post.slug}
                  post={post}
                  index={i}
                  cardRef={el => cardsRef.current[i] = el}
                />
              ))}
            </div>
          </div>
        </section>

      </div>
    </>
  )
}
