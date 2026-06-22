import React, { useRef, useEffect, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

const FAQS = [
  {
    q: 'Quanto custa desenvolver um sistema sob medida?',
    a: 'O custo varia conforme a complexidade do projeto. Sistemas simples partem de R$ 3.000, enquanto ERPs e plataformas SaaS completas podem custar R$ 15.000 ou mais. Solicite um orçamento gratuito pelo WhatsApp para receber uma proposta personalizada.',
  },
  {
    q: 'O que é uma software house?',
    a: 'Uma software house é uma empresa especializada no desenvolvimento de softwares, sistemas e soluções digitais personalizadas. A Zinkra é uma software house focada em criar sistemas internos, ERPs, SaaS e sites sob medida — tudo desenvolvido internamente, sem terceirização e sem templates.',
  },
  {
    q: 'Quanto tempo leva para criar um site profissional?',
    a: 'Um site profissional pode ser entregue entre 7 e 30 dias, dependendo da complexidade. Sites simples ficam prontos em até 7 dias úteis. Projetos com múltiplas páginas, integrações ou e-commerce levam de 2 a 4 semanas.',
  },
  {
    q: 'Vale a pena desenvolver um ERP próprio?',
    a: 'Vale quando sua empresa tem processos únicos que sistemas prontos não atendem. Um ERP sob medida é 100% adaptado ao seu fluxo de trabalho, elimina licenças mensais recorrentes e pode ser escalado conforme o crescimento do negócio.',
  },
  {
    q: 'Como escolher uma empresa de desenvolvimento de software?',
    a: 'Avalie o portfólio, confirme se o desenvolvimento é feito internamente sem terceirização, peça referências e analise a comunicação. A Zinkra desenvolve 100% in-house, com suporte direto da equipe que constrói — sem intermediários.',
  },
  {
    q: 'Qual a diferença entre um site e um sistema web?',
    a: 'Um site apresenta sua empresa e atrai clientes — é sua vitrine digital. Um sistema web é uma plataforma funcional, como um ERP, SaaS ou painel interno, que automatiza processos e gestão. A Zinkra desenvolve ambos sob medida.',
  },
  {
    q: 'O que é SaaS e quanto custa desenvolver?',
    a: 'SaaS é um software vendido por assinatura via internet, como Trello ou Notion. Desenvolver um SaaS sob medida custa a partir de R$ 10.000, dependendo das funcionalidades. A Zinkra entrega o MVP completo com infraestrutura escalável.',
  },
  {
    q: 'A Zinkra oferece suporte após a entrega do projeto?',
    a: 'Sim. Todos os projetos incluem suporte inicial pós-entrega. Oferecemos também planos de manutenção mensal para sites e sistemas, garantindo atualizações, correções e evolução contínua da plataforma conforme seu negócio cresce.',
  },
]

function Item({ faq, index }) {
  const [open, setOpen] = useState(false)
  const bodyRef = useRef(null)

  useEffect(() => {
    const el = bodyRef.current
    if (!el) return
    if (open) {
      gsap.fromTo(el, { height: 0, opacity: 0 }, { height: 'auto', opacity: 1, duration: 0.35, ease: 'power3.out' })
    } else {
      gsap.to(el, { height: 0, opacity: 0, duration: 0.28, ease: 'power3.in' })
    }
  }, [open])

  return (
    <div
      className="rounded-xl overflow-hidden transition-all duration-200"
      style={{ border: open ? '1px solid rgba(21,196,90,0.35)' : '1px solid #E8EDEA', backgroundColor: open ? 'rgba(21,196,90,0.02)' : '#FFFFFF' }}
    >
      <button
        className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
      >
        <span className="font-bold text-[15px] text-[#0A0C0B] leading-snug">{faq.q}</span>
        <span
          className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300"
          style={{ backgroundColor: open ? '#15C45A' : 'rgba(21,196,90,0.1)', transform: open ? 'rotate(45deg)' : 'rotate(0deg)' }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke={open ? '#fff' : '#15C45A'} strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 1v10M1 6h10" />
          </svg>
        </span>
      </button>
      <div ref={bodyRef} style={{ height: 0, overflow: 'hidden', opacity: 0 }}>
        <p className="px-6 pb-5 text-[14px] leading-[1.75]" style={{ color: '#4A5550' }}>{faq.a}</p>
      </div>
    </div>
  )
}

export default function FAQ() {
  const headRef = useRef(null)
  const listRef = useRef(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(headRef.current,
        { opacity: 0, y: 36 },
        { opacity: 1, y: 0, duration: 0.8, ease: 'power4.out',
          scrollTrigger: { trigger: headRef.current, start: 'top 82%', once: true } }
      )
      gsap.fromTo(listRef.current,
        { opacity: 0, y: 32 },
        { opacity: 1, y: 0, duration: 0.75, ease: 'power4.out',
          scrollTrigger: { trigger: listRef.current, start: 'top 82%', once: true } }
      )
    })
    return () => ctx.revert()
  }, [])

  return (
    <section className="py-28" style={{ backgroundColor: '#F5F7F5' }}>
      <div className="max-w-3xl mx-auto px-6">

        <div ref={headRef} className="mb-14 opacity-0">
          <p className="font-mono text-[11px] uppercase tracking-[3px] mb-4" style={{ color: '#15C45A' }}>
            Perguntas frequentes
          </p>
          <h2 className="font-black text-[#0A0C0B] leading-[1.08] tracking-tight" style={{ fontSize: 'clamp(28px, 4vw, 48px)' }}>
            Dúvidas que todo cliente<br />
            <span style={{ color: '#15C45A' }}>tem antes de contratar.</span>
          </h2>
        </div>

        <div ref={listRef} className="space-y-3 opacity-0">
          {FAQS.map((faq, i) => (
            <Item key={i} faq={faq} index={i} />
          ))}
        </div>

      </div>
    </section>
  )
}
