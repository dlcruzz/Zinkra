import React, { useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { gsap } from 'gsap'
import { POSTS } from '../data/blog'

const CATEGORY_COLORS = {
  Sistemas: '#15C45A',
  Sites:    '#3B82F6',
  SaaS:     '#8B5CF6',
  Design:   '#EC4899',
}

function renderSection(s, i) {
  switch (s.type) {
    case 'h2':
      return (
        <h2 key={i} className="font-black text-[#0A0C0B] leading-snug mt-10 mb-4" style={{ fontSize: 'clamp(20px, 2.5vw, 26px)' }}>
          {s.content}
        </h2>
      )
    case 'p':
      return (
        <p key={i} className="text-[16px] leading-[1.85] mb-5" style={{ color: '#4A5550' }}>
          {s.content}
        </p>
      )
    case 'ul':
      return (
        <ul key={i} className="mb-5 space-y-2">
          {s.items.map((item, j) => (
            <li key={j} className="flex items-start gap-3 text-[15px] leading-[1.7]" style={{ color: '#4A5550' }}>
              <span
                className="mt-[5px] shrink-0 w-4 h-4 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'rgba(21,196,90,0.15)' }}
              >
                <svg width="8" height="8" viewBox="0 0 12 12" fill="none" stroke="#15C45A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M2 6l3 3 5-5" />
                </svg>
              </span>
              {item}
            </li>
          ))}
        </ul>
      )
    default:
      return null
  }
}

export default function BlogPost() {
  const { slug } = useParams()
  const post     = POSTS.find(p => p.slug === slug)
  const headRef  = useRef(null)
  const bodyRef  = useRef(null)

  useEffect(() => {
    if (!post) return
    const ctx = gsap.context(() => {
      gsap.fromTo(headRef.current, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.85, ease: 'power4.out', delay: 0.1 })
      gsap.fromTo(bodyRef.current, { opacity: 0, y: 32 }, { opacity: 1, y: 0, duration: 0.8,  ease: 'power4.out', delay: 0.3 })
    })
    return () => ctx.revert()
  }, [post])

  if (!post) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-6" style={{ paddingTop: '76px' }}>
        <h1 className="font-black text-[32px] text-[#0A0C0B] mb-4">Artigo não encontrado</h1>
        <Link to="/blog" className="font-bold" style={{ color: '#15C45A' }}>← Ver todos os artigos</Link>
      </div>
    )
  }

  const color   = CATEGORY_COLORS[post.category] || '#15C45A'
  const related = POSTS.filter(p => p.slug !== slug).slice(0, 2)

  return (
    <>
      <Helmet>
        <title>{post.title} | Blog Zinkra</title>
        <meta name="description" content={post.excerpt} />
        <meta property="og:title" content={`${post.title} | Blog Zinkra`} />
        <meta property="og:description" content={post.excerpt} />
      </Helmet>

      <div style={{ paddingTop: '76px' }}>

        {/* Header */}
        <section className="py-20" style={{ backgroundColor: '#FFFFFF' }}>
          <div className="max-w-3xl mx-auto px-6">
            <div ref={headRef} className="opacity-0">
              <Link
                to="/blog"
                className="inline-flex items-center gap-2 font-mono text-[12px] uppercase tracking-[2px] mb-8 transition-colors"
                style={{ color: '#9AA5A0' }}
                onMouseEnter={e => e.currentTarget.style.color = '#15C45A'}
                onMouseLeave={e => e.currentTarget.style.color = '#9AA5A0'}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                  <path d="M13 8H3M7 4L3 8l4 4" />
                </svg>
                Blog
              </Link>

              <div className="flex items-center gap-3 mb-5">
                <span
                  className="font-mono text-[11px] uppercase tracking-[2px] px-3 py-1 rounded-full"
                  style={{ backgroundColor: `${color}15`, color }}
                >
                  {post.category}
                </span>
                <span className="font-mono text-[11px]" style={{ color: '#9AA5A0' }}>{post.readTime} de leitura</span>
                <span className="font-mono text-[11px]" style={{ color: '#9AA5A0' }}>
                  {new Date(post.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                </span>
              </div>

              <h1
                className="font-black text-[#0A0C0B] leading-[1.07] tracking-tight mb-6"
                style={{ fontSize: 'clamp(26px, 4.5vw, 48px)' }}
              >
                {post.title}
              </h1>
              <p className="text-[17px] leading-[1.8]" style={{ color: '#4A5550' }}>{post.excerpt}</p>
            </div>
          </div>
        </section>

        {/* Body */}
        <section className="pb-20" style={{ backgroundColor: '#FFFFFF' }}>
          <div className="max-w-3xl mx-auto px-6">
            <div className="h-px mb-10" style={{ backgroundColor: '#E8EDEA' }} />
            <div ref={bodyRef} className="opacity-0">
              {post.sections.map((s, i) => renderSection(s, i))}
            </div>

            {/* CTA inline */}
            <div
              className="mt-14 p-8 rounded-2xl text-center"
              style={{ backgroundColor: '#071209', border: '1px solid rgba(21,196,90,0.2)' }}
            >
              <p className="font-mono text-[11px] uppercase tracking-[3px] mb-3" style={{ color: '#5A7A65' }}>Gostou do conteúdo?</p>
              <h3 className="font-black text-white text-[22px] mb-3">Fale com a Zinkra sobre o seu projeto.</h3>
              <p className="text-[14px] mb-6" style={{ color: '#5A7A65' }}>Orçamento gratuito, sem compromisso.</p>
              <a
                href="https://wa.me/5511941164044?text=Ol%C3%A1%2C%20li%20um%20artigo%20do%20blog%20da%20Zinkra%20e%20quero%20saber%20mais"
                target="_blank"
                rel="noopener noreferrer"
                data-wa-service="Blog"
                className="inline-flex items-center gap-2 font-bold text-[13px] text-[#0A0C0B] px-7 py-3.5 rounded-xl uppercase tracking-wide transition-all duration-200"
                style={{ backgroundColor: '#15C45A' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#0EA84B'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#15C45A'}
              >
                Quero conversar sobre meu projeto
              </a>
            </div>
          </div>
        </section>

        {/* Related posts */}
        {related.length > 0 && (
          <section className="py-16" style={{ backgroundColor: '#F5F7F5', borderTop: '1px solid #E8EDEA' }}>
            <div className="max-w-3xl mx-auto px-6">
              <p className="font-bold text-[15px] text-[#0A0C0B] mb-6">Outros artigos</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {related.map(p => (
                  <Link
                    key={p.slug}
                    to={`/blog/${p.slug}`}
                    className="p-5 rounded-2xl transition-all duration-200"
                    style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8EDEA' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#15C45A'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#E8EDEA'; e.currentTarget.style.transform = 'translateY(0)' }}
                  >
                    <span
                      className="font-mono text-[10px] uppercase tracking-[2px] px-2 py-0.5 rounded-full mb-3 inline-block"
                      style={{ backgroundColor: `${CATEGORY_COLORS[p.category] || '#15C45A'}15`, color: CATEGORY_COLORS[p.category] || '#15C45A' }}
                    >
                      {p.category}
                    </span>
                    <p className="font-bold text-[14px] text-[#0A0C0B] leading-snug">{p.title}</p>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

      </div>
    </>
  )
}
