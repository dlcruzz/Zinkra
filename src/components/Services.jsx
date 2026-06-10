import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

/* ─── Plan data ─────────────────────────────────────────────────────── */
const SITE_PLANS = [
  {
    name: 'Basic', priceNum: 497, suffix: null, popular: false,
    waService: 'Criação de Sites',
    features: [
      'Página profissional para apresentar seu negócio',
      'Botão direto para clientes falarem no WhatsApp',
      'Layout adaptado para celular (mobile-first)',
      'Carregamento rápido para não perder clientes',
      'Estrutura simples e organizada',
      'Entrega rápida',
    ],
  },
  {
    name: 'Plus', priceNum: 997, suffix: null, popular: true,
    waService: 'Criação de Sites',
    features: [
      'Site completo com até 5 páginas',
      'Design moderno e pensado para conversão',
      'Estrutura otimizada para aparecer no Google (SEO básico)',
      'Integração com WhatsApp para captar clientes',
      'Seções estratégicas (serviços, depoimentos, contato, etc)',
      'Melhor experiência para o usuário (mais chances de fechar)',
      'Entrega rápida + suporte inicial',
    ],
  },
  {
    name: 'Premium', priceNum: 1997, suffix: null, popular: false,
    waService: 'Criação de Sites',
    features: [
      'Site completo com estrutura estratégica de vendas',
      'Design premium e personalizado para sua marca',
      'Planejamento focado em gerar mais clientes',
      'Otimização avançada de velocidade e performance',
      'Estrutura preparada para crescimento do negócio',
      'Ajustes e suporte prioritário após entrega',
      'Experiência profissional que transmite mais autoridade',
      'Análise básica do negócio para o site mais estratégico',
    ],
  },
]

const SOCIAL_PLANS = [
  {
    name: 'Basic', priceNum: 197, suffix: '/mês', popular: false,
    waService: 'Gestão de Redes Sociais',
    features: [
      '8 posts por mês (feed)',
      'Criação de artes profissionais',
      'Legendas simples e organizadas',
      'Planejamento básico de conteúdo',
      'Entrega pronta para postagem',
    ],
  },
  {
    name: 'Plus', priceNum: 397, suffix: '/mês', popular: true,
    waService: 'Gestão de Redes Sociais',
    features: [
      '12 posts por mês (feed + reels)',
      'Criação de artes e vídeos curtos',
      'Legendas estratégicas para engajamento',
      'Planejamento mensal de conteúdo',
      'Stories complementares durante o mês',
      'Identidade visual alinhada com sua marca',
      'Organização do perfil',
    ],
  },
  {
    name: 'Premium', priceNum: 697, suffix: '/mês', popular: false,
    waService: 'Gestão de Redes Sociais',
    features: [
      '20+ conteúdos por mês (feed, reels e stories)',
      'Criação completa de artes e vídeos dinâmicos',
      'Estratégia de conteúdo focada em atrair clientes',
      'Planejamento avançado mensal',
      'Sequência de stories para engajamento diário',
      'Padronização profissional do perfil',
      'Otimização da bio e destaques',
      'Acompanhamento e ajustes de estratégia',
    ],
  },
]

/* ─── Plan card ─────────────────────────────────────────────────────── */
function PlanCard({ plan, isActive, onClick }) {
  return (
    <div
      onClick={onClick}
      className="flex flex-col h-full rounded-2xl overflow-hidden"
      style={{
        backgroundColor: '#FFFFFF',
        border: plan.popular ? '2px solid #15C45A' : '1.5px solid #E8EDEA',
        boxShadow: plan.popular
          ? '0 12px 48px rgba(21,196,90,0.14)'
          : isActive
            ? '0 8px 32px rgba(0,0,0,0.08)'
            : '0 2px 8px rgba(0,0,0,0.04)',
        opacity: isActive ? 1 : 0.72,
        transform: isActive ? 'scale(1)' : 'scale(0.96)',
        transition: 'transform 0.35s ease, opacity 0.35s ease, box-shadow 0.35s ease',
        cursor: isActive ? 'default' : 'pointer',
        userSelect: 'none',
      }}
    >
      {/* Popular banner */}
      {plan.popular && (
        <div
          className="flex items-center justify-center py-2"
          style={{ backgroundColor: '#15C45A' }}
        >
          <span className="font-bold text-white text-[11px] uppercase tracking-[2px]">
            Mais popular
          </span>
        </div>
      )}

      <div className="flex flex-col flex-1 p-6">
        {/* Plan name */}
        <h3 className="font-black text-[20px] text-[#0A0C0B] mb-5 leading-none">
          {plan.name}
        </h3>

        {/* Price — always visible, no blur */}
        <div className="mb-7">
          <div className="flex items-baseline gap-1 leading-none">
            <span className="font-mono text-[14px]" style={{ color: '#4A5550' }}>R$</span>
            <span
              className="font-black"
              style={{
                fontSize: 'clamp(34px, 5vw, 46px)',
                letterSpacing: '-1.5px',
                color: plan.popular ? '#15C45A' : '#0A0C0B',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {plan.priceNum.toLocaleString('pt-BR')}
            </span>
          </div>
          {plan.suffix && (
            <span className="font-mono text-[12px]" style={{ color: '#9AA5A0' }}>{plan.suffix}</span>
          )}
        </div>

        {/* Features */}
        <ul className="flex-1 space-y-3 mb-8">
          {plan.features.map((f, i) => (
            <li key={i} className="flex items-start gap-2.5 text-[13px] leading-snug" style={{ color: '#4A5550' }}>
              <span
                className="mt-[2px] shrink-0 w-4 h-4 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'rgba(21,196,90,0.13)' }}
              >
                <svg width="8" height="8" viewBox="0 0 12 12" fill="none" stroke="#15C45A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M2 6l3 3 5-5" />
                </svg>
              </span>
              {f}
            </li>
          ))}
        </ul>

        {/* CTA */}
        <a
          href="https://wa.me/5511959773552"
          target="_blank"
          rel="noopener noreferrer"
          data-wa-service={plan.waService}
          className="block w-full text-center font-bold text-[13px] py-3.5 rounded-xl uppercase tracking-wide transition-all duration-200"
          style={plan.popular
            ? { backgroundColor: '#15C45A', color: '#FFFFFF' }
            : { backgroundColor: '#F5F7F5', color: '#0A0C0B', border: '1.5px solid #E8EDEA' }
          }
          onMouseEnter={e => {
            if (plan.popular) e.currentTarget.style.backgroundColor = '#0EA84B'
            else { e.currentTarget.style.backgroundColor = '#EBF0EC'; e.currentTarget.style.borderColor = '#BDD4C5' }
          }}
          onMouseLeave={e => {
            if (plan.popular) e.currentTarget.style.backgroundColor = '#15C45A'
            else { e.currentTarget.style.backgroundColor = '#F5F7F5'; e.currentTarget.style.borderColor = '#E8EDEA' }
          }}
          onClick={e => e.stopPropagation()}
        >
          Quero este plano
        </a>
      </div>
    </div>
  )
}

/* ─── Pricing peek layout ───────────────────────────────────────────── */
function PricingPeek({ plans }) {
  const [active, setActive]     = useState(1)
  const containerRef            = useRef(null)
  const trackRef                = useRef(null)

  const positionTrack = useCallback(() => {
    const container = containerRef.current
    const track     = trackRef.current
    if (!container || !track) return
    const card = track.children[active]
    if (!card) return
    const cw         = container.offsetWidth
    const cardCenter = card.offsetLeft + card.offsetWidth / 2
    gsap.to(track, { x: cw / 2 - cardCenter, duration: active === 1 ? 0 : 0.42, ease: 'power2.inOut', overwrite: true })
  }, [active])

  useLayoutEffect(() => { positionTrack() }, [positionTrack])

  useEffect(() => {
    window.addEventListener('resize', positionTrack)
    return () => window.removeEventListener('resize', positionTrack)
  }, [positionTrack])

  return (
    <div>
      <div ref={containerRef} className="overflow-hidden py-3">
        <div
          ref={trackRef}
          className="flex"
          style={{ willChange: 'transform' }}
        >
          {plans.map((plan, i) => (
            <div
              key={plan.name}
              style={{ flex: '0 0 50%', padding: '0 8px', boxSizing: 'border-box', minWidth: 0 }}
            >
              <PlanCard
                plan={plan}
                isActive={i === active}
                onClick={() => i !== active && setActive(i)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Dot indicators */}
      <div className="flex items-center justify-center gap-2 mt-4">
        {plans.map((p, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            aria-label={`Ver plano ${p.name}`}
            className="rounded-full transition-all duration-300"
            style={i === active
              ? { width: '28px', height: '4px', backgroundColor: '#15C45A' }
              : { width: '4px',  height: '4px', backgroundColor: '#C8DDD2' }
            }
          />
        ))}
      </div>
    </div>
  )
}

/* ─── Systems card ──────────────────────────────────────────────────── */
function SystemsCard() {
  return (
    <div
      className="mt-14 p-8 md:p-10 rounded-2xl flex flex-col md:flex-row items-center gap-8 relative overflow-hidden"
      style={{ backgroundColor: '#071209', border: '1.5px solid rgba(21,196,90,0.25)', boxShadow: '0 0 48px rgba(21,196,90,0.05)' }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 60% 80% at 10% 50%, rgba(21,196,90,0.05) 0%, transparent 60%)' }}
      />
      <div className="flex-1 relative">
        <div className="flex items-center gap-3 mb-4">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#15C45A" strokeWidth="1.4" aria-hidden="true">
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
          </svg>
          <span className="font-mono text-[11px] uppercase tracking-[2px]" style={{ color: '#5A7A65' }}>Sob consulta</span>
        </div>
        <h3 className="font-black text-[20px] text-white mb-3">
          Desenvolvimento de Sistemas Sob Medida
        </h3>
        <p className="text-[14px] leading-relaxed" style={{ color: '#7A9A85' }}>
          Precisa de um sistema para sua empresa ou quer criar um SaaS? Desenvolvemos soluções sob medida — desde automações internas até plataformas completas.
        </p>
      </div>
      <div className="shrink-0 relative">
        <a
          href="https://wa.me/5511959773552"
          target="_blank"
          rel="noopener noreferrer"
          data-wa-service="Sistemas Sob Medida"
          className="inline-flex items-center gap-3 px-8 py-4 rounded-xl font-bold text-[14px] text-white transition-all duration-200 whitespace-nowrap uppercase tracking-wide"
          style={{ backgroundColor: '#15C45A' }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#0EA84B'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = '#15C45A'}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          Solicitar orçamento
        </a>
      </div>
    </div>
  )
}

/* ─── Service cards (visual / CoderSquad style) ─────────────────────── */
const SERVICE_CARDS = [
  {
    title: 'Sites & Lojas Virtuais', sub: 'Desenvolvimento Web',
    glow: 'rgba(56,189,248,0.18)', gradFrom: 'rgba(14,165,233,0.12)',
    icon: (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(56,189,248,0.9)" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" />
      </svg>
    ),
  },
  {
    title: 'Sistemas Sob Medida', sub: 'Software & SaaS',
    glow: 'rgba(21,196,90,0.18)', gradFrom: 'rgba(21,196,90,0.12)',
    icon: (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(21,196,90,0.9)" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
  },
  {
    title: 'Redes Sociais & Conteúdo', sub: 'Social Media',
    glow: 'rgba(168,85,247,0.18)', gradFrom: 'rgba(168,85,247,0.12)',
    icon: (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(168,85,247,0.9)" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true">
        <path d="M4 9h16M4 15h16M10 3l-2 18M16 3l-2 18" />
      </svg>
    ),
  },
  {
    title: 'IA & Automação', sub: 'Inteligência Artificial',
    glow: 'rgba(6,182,212,0.18)', gradFrom: 'rgba(6,182,212,0.12)',
    icon: (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(6,182,212,0.9)" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true">
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <rect x="9" y="9" width="6" height="6" />
        <path d="M9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3" />
      </svg>
    ),
  },
]

function ServiceCards() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-20">
      {SERVICE_CARDS.map((card) => (
        <a
          key={card.title}
          href="https://wa.me/5511959773552"
          target="_blank"
          rel="noopener noreferrer"
          data-wa-service={card.title.split(' & ')[0].trim()}
          className="group relative rounded-2xl overflow-hidden flex flex-col transition-all duration-300"
          style={{ backgroundColor: '#0D1210', border: '1px solid #262E28', minHeight: '260px' }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'rgba(21,196,90,0.5)'
            e.currentTarget.style.transform = 'translateY(-4px)'
            e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.2)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = '#262E28'
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = 'none'
          }}
        >
          <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse 80% 60% at 50% 20%, ${card.gradFrom} 0%, transparent 70%)` }} />
          <div className="flex-1 flex items-center justify-center pt-8 pb-4 relative">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: `1px solid ${card.glow}`, boxShadow: `0 0 24px ${card.glow}` }}>
              {card.icon}
            </div>
          </div>
          <div className="relative px-5 pb-5 pt-4" style={{ background: 'linear-gradient(to top, rgba(13,18,16,0.98) 0%, rgba(13,18,16,0.7) 100%)' }}>
            <p className="font-mono text-[10px] uppercase tracking-[2px] mb-1" style={{ color: '#4A5550' }}>{card.sub}</p>
            <div className="flex items-center justify-between gap-2">
              <p className="font-bold text-[14px] text-white leading-snug">{card.title}</p>
              <div className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: '#15C45A' }}>
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="#0A0C0B" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                  <path d="M3 8h10M9 4l4 4-4 4" />
                </svg>
              </div>
            </div>
          </div>
        </a>
      ))}
    </div>
  )
}

/* ─── Section icons ─────────────────────────────────────────────────── */
function GlobeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#15C45A" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" />
    </svg>
  )
}
function HashIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#15C45A" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <path d="M4 9h16M4 15h16M10 3l-2 18M16 3l-2 18" />
    </svg>
  )
}

/* ─── Pricing-only block (used when standalone) ─────────────────────── */
function PricingOnly() {
  return (
    <>
      <div className="mb-12">
        <h3 className="font-bold text-[16px] text-[#0A0C0B] mb-1 flex items-center gap-2.5">
          <GlobeIcon /> Criação de Sites
        </h3>
        <p className="text-[13px] mb-6" style={{ color: '#9AA5A0' }}>Clique no plano para ver todos os detalhes</p>
        <PricingPeek plans={SITE_PLANS} />
      </div>

      <div className="mb-4">
        <h3 className="font-bold text-[16px] text-[#0A0C0B] mb-1 flex items-center gap-2.5">
          <HashIcon /> Redes Sociais
        </h3>
        <p className="text-[13px] mb-6" style={{ color: '#9AA5A0' }}>Clique no plano para ver todos os detalhes</p>
        <PricingPeek plans={SOCIAL_PLANS} />
      </div>

      <SystemsCard />
    </>
  )
}

/* ─── Full Services section (used when not standalone) ─────────────── */
export default function Services({ standalone }) {
  const sectionRef = useRef(null)
  const headerRef  = useRef(null)

  useEffect(() => {
    if (standalone) return
    const ctx = gsap.context(() => {
      gsap.fromTo(headerRef.current,
        { opacity: 0, y: 40 },
        { opacity: 1, y: 0, duration: 0.8, ease: 'power4.out',
          scrollTrigger: { trigger: headerRef.current, start: 'top 82%', once: true } }
      )
    }, sectionRef)
    return () => ctx.revert()
  }, [standalone])

  if (standalone) return <PricingOnly />

  return (
    <section id="servicos" ref={sectionRef} className="py-28" style={{ backgroundColor: '#FFFFFF' }}>
      <div className="max-w-3xl mx-auto px-6">
        <div ref={headerRef} className="mb-16 opacity-0">
          <p className="font-mono text-[11px] uppercase tracking-[3px] mb-4" style={{ color: '#15C45A' }}>
            O que construímos
          </p>
          <h2 className="font-black text-[#0A0C0B] leading-[1.08] tracking-tight" style={{ fontSize: 'clamp(32px, 4.8vw, 64px)' }}>
            A solução certa<br />para cada desafio.
          </h2>
          <p className="mt-5 text-[17px] max-w-lg" style={{ color: '#4A5550' }}>
            De sites que ranqueiam a sistemas que automatizam. Atendemos todos os níveis de complexidade.
          </p>
        </div>
        <ServiceCards />
        <div className="h-px mb-10" style={{ backgroundColor: '#E8EDEA' }} />
        <PricingOnly />
      </div>
    </section>
  )
}
