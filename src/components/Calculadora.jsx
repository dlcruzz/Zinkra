import React, { useRef, useEffect, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

/* ─── Data ──────────────────────────────────────────────────────────── */
const SERVICES = [
  {
    id: 'site',
    label: 'Site Profissional',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" />
      </svg>
    ),
    sub: 'Landing page, site institucional ou e-commerce',
    options: [
      { id: 'basic',   label: 'Basic',   desc: '1 página, mobile-first, entrega rápida',                          min: 570,    max: 900,    tag: 'Mais rápido'  },
      { id: 'plus',    label: 'Plus',    desc: 'Até 5 páginas, SEO básico, design para conversão',                min: 1150,   max: 1800,   tag: 'Mais popular' },
      { id: 'premium', label: 'Premium', desc: 'Completo, estratégico, performance avançada',                     min: 2300,   max: 4000,   tag: 'Mais completo' },
      { id: 'ecom',    label: 'E-commerce', desc: 'Loja virtual integrada com pagamento e gestão de produtos',   min: 4500,   max: 9000,   tag: 'Loja online'  },
    ],
  },
  {
    id: 'sistema',
    label: 'Sistema / Software',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
    sub: 'CRM, ERP, sistema interno, SaaS ou automações',
    options: [
      { id: 'simples',  label: 'Sistema Simples',   desc: '1 a 2 módulos, painel básico, sem integração externa',   min: 3000,  max: 8000,  tag: 'Ponto de partida' },
      { id: 'medio',    label: 'Sistema Médio',     desc: '3 a 5 módulos, CRM/ERP, com integrações de API',         min: 8000,  max: 20000, tag: 'Mais comum'       },
      { id: 'completo', label: 'Sistema Completo',  desc: 'ERP robusto ou SaaS multi-tenant, pronto para escalar',  min: 18000, max: 50000, tag: 'Escala real'      },
      { id: 'mvp',      label: 'MVP de SaaS',       desc: 'Produto mínimo viável para validar a ideia no mercado',  min: 8000,  max: 18000, tag: 'Lançar rápido'    },
    ],
  },
  {
    id: 'social',
    label: 'Redes Sociais',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
        <path d="M4 9h16M4 15h16M10 3l-2 18M16 3l-2 18" />
      </svg>
    ),
    sub: 'Gestão de conteúdo, artes e estratégia mensal',
    options: [
      { id: 'basic',   label: 'Basic',   desc: '8 posts/mês, artes profissionais, legendas simples',         min: 227,  max: 227,  tag: '/mês', suffix: '/mês' },
      { id: 'plus',    label: 'Plus',    desc: '12 posts + reels, estratégia mensal, stories',               min: 457,  max: 457,  tag: '/mês', suffix: '/mês' },
      { id: 'premium', label: 'Premium', desc: '20+ conteúdos, vídeos dinâmicos, acompanhamento diário',    min: 797,  max: 797,  tag: '/mês', suffix: '/mês' },
    ],
  },
  {
    id: 'ia',
    label: 'IA & Automação',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <rect x="9" y="9" width="6" height="6" />
        <path d="M9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3" />
      </svg>
    ),
    sub: 'Chatbots, automações com IA e integrações inteligentes',
    options: [
      { id: 'chatbot',    label: 'Chatbot IA',         desc: 'Atendimento automático via WhatsApp ou site com IA',      min: 1800, max: 4000,  tag: 'Mais pedido' },
      { id: 'automacao',  label: 'Automação de Fluxo', desc: 'Automatize processos repetitivos com integrações',        min: 1200, max: 5000,  tag: 'ROI rápido'  },
      { id: 'ia-custom',  label: 'IA sob medida',      desc: 'Solução personalizada com LLM integrado ao seu sistema',  min: 5000, max: 20000, tag: 'Avançado'    },
    ],
  },
]

const ADDONS = [
  { id: 'seo',       label: 'SEO avançado',           desc: 'Otimização técnica para Google',      price: 800  },
  { id: 'manut',     label: 'Manutenção mensal',      desc: 'Suporte e atualizações pós-entrega',  price: 150, suffix: '/mês' },
  { id: 'analytics', label: 'Analytics & relatórios', desc: 'Dashboard com métricas do negócio',   price: 600  },
  { id: 'integracao',label: 'Integração de API',      desc: 'Conectar a sistemas externos',        price: 1200 },
]

function fmt(v) {
  return v.toLocaleString('pt-BR')
}

/* ─── Step components ───────────────────────────────────────────────── */
function Step1({ onSelect }) {
  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-[3px] mb-2" style={{ color: '#15C45A' }}>Passo 1 de 3</p>
      <h3 className="font-black text-[#0A0C0B] text-[22px] mb-8">O que você precisa?</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {SERVICES.map(svc => (
          <button
            key={svc.id}
            onClick={() => onSelect(svc)}
            className="text-left p-5 rounded-2xl transition-all duration-200 group"
            style={{ border: '1.5px solid #E8EDEA', backgroundColor: '#FFFFFF' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#15C45A'; e.currentTarget.style.backgroundColor = 'rgba(21,196,90,0.02)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#E8EDEA'; e.currentTarget.style.backgroundColor = '#FFFFFF' }}
          >
            <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: 'rgba(21,196,90,0.1)', color: '#15C45A' }}>
              {svc.icon}
            </div>
            <p className="font-bold text-[15px] text-[#0A0C0B] mb-1">{svc.label}</p>
            <p className="text-[13px] leading-snug" style={{ color: '#6A7870' }}>{svc.sub}</p>
          </button>
        ))}
      </div>
    </div>
  )
}

function Step2({ service, onSelect, onBack }) {
  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-2 mb-6 text-[13px] font-medium transition-colors" style={{ color: '#9AA5A0' }}
        onMouseEnter={e => e.currentTarget.style.color = '#15C45A'} onMouseLeave={e => e.currentTarget.style.color = '#9AA5A0'}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M13 8H3M7 4L3 8l4 4" /></svg>
        Voltar
      </button>
      <p className="font-mono text-[11px] uppercase tracking-[3px] mb-2" style={{ color: '#15C45A' }}>Passo 2 de 3</p>
      <h3 className="font-black text-[#0A0C0B] text-[22px] mb-8">Qual complexidade?</h3>
      <div className="space-y-3">
        {service.options.map(opt => (
          <button
            key={opt.id}
            onClick={() => onSelect(opt)}
            className="w-full text-left p-5 rounded-2xl transition-all duration-200 flex items-center justify-between gap-4"
            style={{ border: '1.5px solid #E8EDEA', backgroundColor: '#FFFFFF' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#15C45A'; e.currentTarget.style.backgroundColor = 'rgba(21,196,90,0.02)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#E8EDEA'; e.currentTarget.style.backgroundColor = '#FFFFFF' }}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-[15px] text-[#0A0C0B]">{opt.label}</span>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(21,196,90,0.1)', color: '#15C45A' }}>{opt.tag}</span>
              </div>
              <p className="text-[13px]" style={{ color: '#6A7870' }}>{opt.desc}</p>
            </div>
            <div className="text-right shrink-0">
              <div className="font-black text-[18px]" style={{ color: '#15C45A' }}>
                {opt.min === opt.max
                  ? `R$ ${fmt(opt.min)}`
                  : `R$ ${fmt(opt.min)} – ${fmt(opt.max)}`}
              </div>
              {opt.suffix && <div className="font-mono text-[11px]" style={{ color: '#9AA5A0' }}>{opt.suffix}</div>}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

function Step3({ service, option, onBack, onReset }) {
  const [addons, setAddons] = useState([])

  const toggle = (id) => setAddons(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id])

  const addonTotal = ADDONS.filter(a => addons.includes(a.id)).reduce((s, a) => s + a.price, 0)
  const totalMin   = option.min + addonTotal
  const totalMax   = (option.min === option.max ? option.min : option.max) + addonTotal

  const msg = encodeURIComponent(
    `Olá, fiz o orçamento estimado pelo site e tenho interesse em: ${service.label} — ${option.label}` +
    (addons.length ? `. Extras: ${ADDONS.filter(a => addons.includes(a.id)).map(a => a.label).join(', ')}` : '') +
    `. Faixa estimada: R$ ${fmt(totalMin)}${totalMin !== totalMax ? ` – R$ ${fmt(totalMax)}` : ''}. Quero um orçamento real.`
  )

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-2 mb-6 text-[13px] font-medium transition-colors" style={{ color: '#9AA5A0' }}
        onMouseEnter={e => e.currentTarget.style.color = '#15C45A'} onMouseLeave={e => e.currentTarget.style.color = '#9AA5A0'}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M13 8H3M7 4L3 8l4 4" /></svg>
        Voltar
      </button>
      <p className="font-mono text-[11px] uppercase tracking-[3px] mb-2" style={{ color: '#15C45A' }}>Passo 3 de 3</p>
      <h3 className="font-black text-[#0A0C0B] text-[22px] mb-6">Extras opcionais</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
        {ADDONS.map(addon => {
          const selected = addons.includes(addon.id)
          return (
            <button
              key={addon.id}
              onClick={() => toggle(addon.id)}
              className="text-left p-4 rounded-xl transition-all duration-200 flex items-center gap-3"
              style={{
                border: selected ? '1.5px solid #15C45A' : '1.5px solid #E8EDEA',
                backgroundColor: selected ? 'rgba(21,196,90,0.05)' : '#FFFFFF',
              }}
            >
              <div
                className="w-5 h-5 rounded flex items-center justify-center shrink-0 transition-all duration-200"
                style={{ backgroundColor: selected ? '#15C45A' : 'transparent', border: selected ? 'none' : '1.5px solid #C8DDD2' }}
              >
                {selected && <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 6l3 3 5-5" /></svg>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[13px] text-[#0A0C0B] leading-none mb-0.5">{addon.label}</p>
                <p className="text-[12px]" style={{ color: '#9AA5A0' }}>{addon.desc}</p>
              </div>
              <span className="font-mono text-[12px] font-bold shrink-0" style={{ color: '#15C45A' }}>
                +R${fmt(addon.price)}{addon.suffix || ''}
              </span>
            </button>
          )
        })}
      </div>

      {/* Result card */}
      <div className="rounded-2xl p-6 mb-6" style={{ backgroundColor: '#071209', border: '1.5px solid rgba(21,196,90,0.25)' }}>
        <p className="font-mono text-[11px] uppercase tracking-[3px] mb-4" style={{ color: '#5A7A65' }}>Estimativa</p>
        <div className="flex items-end justify-between gap-4 mb-4">
          <div>
            <p className="font-bold text-white text-[15px]">{service.label} — {option.label}</p>
            {addons.length > 0 && (
              <p className="text-[13px] mt-1" style={{ color: '#5A7A65' }}>
                + {ADDONS.filter(a => addons.includes(a.id)).map(a => a.label).join(', ')}
              </p>
            )}
          </div>
          <div className="text-right shrink-0">
            <div className="font-black leading-none" style={{ fontSize: 'clamp(22px, 4vw, 36px)', color: '#15C45A' }}>
              {totalMin === totalMax ? `R$ ${fmt(totalMin)}` : `R$ ${fmt(totalMin)} – ${fmt(totalMax)}`}
            </div>
            {option.suffix && <div className="font-mono text-[12px] mt-1" style={{ color: '#5A7A65' }}>{option.suffix}</div>}
          </div>
        </div>
        <p className="font-mono text-[11px]" style={{ color: '#3A5545' }}>
          * Estimativa baseada nos planos da Zinkra. O valor exato depende do escopo detalhado do projeto.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <a
          href={`https://wa.me/5511941164044?text=${msg}`}
          target="_blank"
          rel="noopener noreferrer"
          data-wa-service={service.label}
          className="flex-1 inline-flex items-center justify-center gap-3 font-bold text-[#0A0C0B] py-4 rounded-xl text-[14px] uppercase tracking-wide transition-all duration-200"
          style={{ backgroundColor: '#15C45A' }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#0EA84B'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = '#15C45A'}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          Pedir orçamento exato
        </a>
        <button
          onClick={onReset}
          className="px-6 py-4 rounded-xl font-bold text-[14px] uppercase tracking-wide transition-all duration-200"
          style={{ border: '1.5px solid #E8EDEA', color: '#9AA5A0', backgroundColor: '#FFFFFF' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#15C45A'; e.currentTarget.style.color = '#15C45A' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#E8EDEA'; e.currentTarget.style.color = '#9AA5A0' }}
        >
          Recalcular
        </button>
      </div>
    </div>
  )
}

/* ─── Main component ────────────────────────────────────────────────── */
export default function Calculadora() {
  const [step,    setStep]    = useState(1)
  const [service, setService] = useState(null)
  const [option,  setOption]  = useState(null)
  const sectionRef = useRef(null)
  const headRef    = useRef(null)
  const cardRef    = useRef(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(headRef.current,
        { opacity: 0, y: 36 },
        { opacity: 1, y: 0, duration: 0.8, ease: 'power4.out',
          scrollTrigger: { trigger: headRef.current, start: 'top 82%', once: true } }
      )
      gsap.fromTo(cardRef.current,
        { opacity: 0, y: 40 },
        { opacity: 1, y: 0, duration: 0.8, ease: 'power4.out',
          scrollTrigger: { trigger: cardRef.current, start: 'top 82%', once: true } }
      )
    })
    return () => ctx.revert()
  }, [])

  const reset = () => { setStep(1); setService(null); setOption(null) }

  return (
    <section ref={sectionRef} id="calculadora" className="py-28" style={{ backgroundColor: '#F5F7F5' }}>
      <div className="max-w-3xl mx-auto px-6">

        <div ref={headRef} className="mb-14 opacity-0">
          <p className="font-mono text-[11px] uppercase tracking-[3px] mb-4" style={{ color: '#15C45A' }}>
            Calculadora de orçamento
          </p>
          <h2 className="font-black text-[#0A0C0B] leading-[1.08] tracking-tight" style={{ fontSize: 'clamp(28px, 4vw, 48px)' }}>
            Quanto vai custar{' '}
            <span style={{ color: '#15C45A' }}>o seu projeto?</span>
          </h2>
          <p className="mt-4 text-[17px]" style={{ color: '#4A5550' }}>
            Responda 3 perguntas rápidas e receba uma estimativa baseada nos nossos planos — sem compromisso.
          </p>
        </div>

        <div
          ref={cardRef}
          className="p-8 rounded-2xl opacity-0"
          style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8EDEA', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}
        >
          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-8">
            {[1, 2, 3].map(s => (
              <React.Fragment key={s}>
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-[12px] transition-all duration-300"
                  style={s <= step ? { backgroundColor: '#15C45A', color: '#fff' } : { backgroundColor: '#F5F7F5', color: '#9AA5A0', border: '1.5px solid #E8EDEA' }}
                >
                  {s < step ? (
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 6l3 3 5-5" /></svg>
                  ) : s}
                </div>
                {s < 3 && <div className="flex-1 h-px" style={{ backgroundColor: s < step ? '#15C45A' : '#E8EDEA' }} />}
              </React.Fragment>
            ))}
          </div>

          {step === 1 && (
            <Step1 onSelect={svc => { setService(svc); setStep(2) }} />
          )}
          {step === 2 && service && (
            <Step2
              service={service}
              onSelect={opt => { setOption(opt); setStep(3) }}
              onBack={() => setStep(1)}
            />
          )}
          {step === 3 && service && option && (
            <Step3
              service={service}
              option={option}
              onBack={() => setStep(2)}
              onReset={reset}
            />
          )}
        </div>

      </div>
    </section>
  )
}
