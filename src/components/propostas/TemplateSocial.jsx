import React from 'react'
import PropostaPage from './PropostaPage'

const G = '#15C45A'
const DARK = '#0A0C0B'
const CARD_BG = '#111116'
const BORDER = '#2A2A35'
const MUTED = '#5A7A65'

function Chip({ children }) {
  return (
    <span style={{
      fontFamily: "'Geist Mono','JetBrains Mono',monospace",
      fontSize: 10, letterSpacing: 2, textTransform: 'uppercase',
      color: G, border: `1px solid ${G}`, borderRadius: 4,
      padding: '3px 10px', display: 'inline-block', marginBottom: 16,
    }}>{children}</span>
  )
}

function PageCapa({ fields, tmpl }) {
  return (
    <div style={{ width: 794, height: 1123, backgroundColor: DARK, position: 'relative', overflow: 'hidden', pageBreakAfter: 'always', breakAfter: 'page', display: 'flex', flexDirection: 'column', fontFamily: "'Instrument Sans','Inter',sans-serif", boxSizing: 'border-box' }}>
      <div style={{ position: 'absolute', top: -120, right: -120, width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(21,196,90,0.12) 0%, transparent 70%)' }} />
      <div style={{ position: 'absolute', bottom: -60, left: -80, width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle, rgba(21,196,90,0.07) 0%, transparent 70%)' }} />
      <div style={{ padding: '32px 48px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontWeight: 900, fontSize: 32, color: G }}>Z</span>
          <span style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontWeight: 700, fontSize: 24, color: '#FFF' }}>INKRA</span>
        </div>
        <span style={{ fontFamily: "'Geist Mono','JetBrains Mono',monospace", fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: MUTED }}>{fields.data}</span>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 48px' }}>
        <Chip>{tmpl.tag} — {tmpl.plan}</Chip>
        <div style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontSize: 13, fontWeight: 700, color: MUTED, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 12 }}>Proposta exclusiva para</div>
        <h1 style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontSize: 64, fontWeight: 900, color: '#FFF', lineHeight: 1.05, margin: '0 0 16px' }}>
          {fields.cliente || 'Nome do Cliente'}
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ height: 3, width: 48, backgroundColor: G, borderRadius: 2 }} />
          <span style={{ fontSize: 18, color: '#8AA895', fontWeight: 500 }}>{tmpl.capa.subtitle}</span>
        </div>
        <p style={{ fontSize: 15, color: MUTED, maxWidth: 460, lineHeight: 1.6 }}>{tmpl.capa.tagline}</p>
        {fields.observacao && (
          <div style={{ marginTop: 24, padding: '14px 20px', background: 'rgba(21,196,90,0.08)', border: '1px solid rgba(21,196,90,0.25)', borderRadius: 10, maxWidth: 500 }}>
            <p style={{ fontSize: 13, color: '#A8C8B0', lineHeight: 1.6, margin: 0 }}>{fields.observacao}</p>
          </div>
        )}
      </div>
      <div style={{ height: 4, background: 'linear-gradient(90deg, #2EFF8B, #16B85E)' }} />
    </div>
  )
}

function PageQuemSomos() {
  return (
    <PropostaPage dark label="Quem somos">
      <div style={{ paddingTop: 28 }}>
        <Chip>A Zinkra</Chip>
        <h2 style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontSize: 42, fontWeight: 900, color: '#FFF', lineHeight: 1.1, margin: '0 0 16px' }}>
          Software house brasileira focada em resultado
        </h2>
        <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.7, maxWidth: 560, marginBottom: 24 }}>
          A Zinkra desenvolve sites, sistemas e gerencia redes sociais com foco em resultado. Nossa equipe de design e marketing cria conteúdo estratégico que transforma seguidores em clientes.
        </p>
        <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
          {[{ value: '50+', label: 'Clientes atendidos' }, { value: '35+', label: 'Projetos entregues' }, { value: '100%', label: 'Personalizado' }].map(s => (
            <div key={s.value} style={{ flex: 1, background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '20px', textAlign: 'center' }}>
              <div style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontSize: 44, fontWeight: 900, color: G, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 12, color: MUTED, marginTop: 6 }}>{s.label}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            { icon: '🎨', title: 'Design estratégico', desc: 'Artes que refletem sua identidade visual e atraem clientes.' },
            { icon: '📅', title: 'Calendário editorial', desc: 'Planejamento antecipado e consistente de todo o mês.' },
            { icon: '✍️', title: 'Copy estratégico', desc: 'Legendas e CTAs que convertem seguidores em clientes.' },
            { icon: '📊', title: 'Relatórios mensais', desc: 'Métricas reais para entender o que funciona para a sua marca.' },
          ].map(d => (
            <div key={d.title} style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '14px 16px', display: 'flex', gap: 10 }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>{d.icon}</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: '#E0E8E2', marginBottom: 4 }}>{d.title}</div>
                <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.5 }}>{d.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PropostaPage>
  )
}

function PageProblema({ tmpl }) {
  return (
    <PropostaPage dark={false} label="O problema">
      <div style={{ paddingTop: 28 }}>
        <Chip>Diagnóstico</Chip>
        <h2 style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontSize: 40, fontWeight: 900, color: '#0A0C0B', lineHeight: 1.1, margin: '0 0 20px' }}>
          {tmpl.problema.title}
        </h2>
        <p style={{ fontSize: 14, color: '#4A5550', lineHeight: 1.7, marginBottom: 28, maxWidth: 560 }}>
          Essa é a realidade de grande parte dos perfis no Instagram hoje. Sem estratégia, o conteúdo não cresce — e cada dia que passa é uma oportunidade perdida.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 28 }}>
          {tmpl.problema.points.map((p, i) => (
            <div key={i} style={{ display: 'flex', gap: 14, padding: '14px 16px', background: '#F7F8F7', border: '1px solid #E5E7E5', borderLeft: `4px solid ${G}`, borderRadius: 8 }}>
              <span style={{ fontFamily: "'Geist Mono','JetBrains Mono',monospace", fontSize: 11, color: G, flexShrink: 0, marginTop: 2, letterSpacing: 1 }}>0{i + 1}</span>
              <span style={{ fontSize: 13, color: '#1A2820', lineHeight: 1.6 }}>{p}</span>
            </div>
          ))}
        </div>
        <div style={{ padding: '14px 18px', background: 'rgba(21,196,90,0.06)', border: '1px solid rgba(21,196,90,0.2)', borderRadius: 10 }}>
          <p style={{ margin: 0, fontSize: 13, color: '#1A4A28', lineHeight: 1.6 }}>
            💡 A boa notícia: com uma estratégia clara e conteúdo consistente, qualquer perfil consegue crescer e converter.
          </p>
        </div>
      </div>
    </PropostaPage>
  )
}

function PageSolucao({ tmpl }) {
  return (
    <PropostaPage dark label="A solução">
      <div style={{ paddingTop: 28 }}>
        <Chip>Nossa proposta</Chip>
        <h2 style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontSize: 40, fontWeight: 900, color: '#FFF', lineHeight: 1.1, margin: '0 0 16px' }}>
          {tmpl.solucao.title}
        </h2>
        <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.7, maxWidth: 560, marginBottom: 28 }}>{tmpl.solucao.desc}</p>
        <div style={{ display: 'flex', gap: 16, marginBottom: 28 }}>
          {tmpl.solucao.highlights.map(h => (
            <div key={h.label} style={{ flex: 1, background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '20px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 26, marginBottom: 10 }}>{h.icon}</div>
              <div style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontSize: 17, fontWeight: 700, color: '#FFF', marginBottom: 4 }}>{h.label}</div>
              <div style={{ fontSize: 12, color: MUTED }}>{h.desc}</div>
            </div>
          ))}
        </div>
        <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '18px 22px' }}>
          <div style={{ fontFamily: "'Geist Mono','JetBrains Mono',monospace", fontSize: 10, color: G, letterSpacing: 2, marginBottom: 12 }}>NOSSA ABORDAGEM</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            {['Identidade visual 100% consistente', 'Conteúdo planejado com antecedência', 'Copy estratégico que converte', 'Calendário editorial mensal', 'Formatos otimizados por plataforma', 'Relatório de desempenho mensal'].map(i => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <span style={{ color: G, fontSize: 12, flexShrink: 0, marginTop: 1 }}>✓</span>
                <span style={{ fontSize: 12, color: '#C0D0C4', lineHeight: 1.5 }}>{i}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PropostaPage>
  )
}

function PageIncluso({ tmpl }) {
  return (
    <PropostaPage dark={false} label="O que está incluso">
      <div style={{ paddingTop: 28 }}>
        <Chip>{tmpl.tag} — Plano {tmpl.plan}</Chip>
        <h2 style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontSize: 38, fontWeight: 900, color: '#0A0C0B', lineHeight: 1.1, margin: '0 0 22px' }}>
          Tudo que você recebe todo mês
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {tmpl.incluso.map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 16px', background: '#F7F8F7', border: '1px solid #E5E7E5', borderRadius: 8 }}>
              <span style={{ color: G, fontSize: 14, flexShrink: 0, marginTop: 1 }}>✓</span>
              <span style={{ fontSize: 13, color: '#1A2820', lineHeight: 1.5 }}>{item}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 18, padding: '14px 18px', background: 'rgba(21,196,90,0.06)', border: '1px solid rgba(21,196,90,0.2)', borderRadius: 10 }}>
          <p style={{ margin: 0, fontSize: 13, color: '#1A4A28', lineHeight: 1.6 }}>
            ✦ Todo o conteúdo é criado do zero pela nossa equipe, com identidade visual da sua marca aplicada em todos os formatos.
          </p>
        </div>
      </div>
    </PropostaPage>
  )
}

function PageComoFunciona({ tmpl }) {
  return (
    <PropostaPage dark label="Como funciona">
      <div style={{ paddingTop: 28 }}>
        <Chip>Processo mensal</Chip>
        <h2 style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontSize: 40, fontWeight: 900, color: '#FFF', lineHeight: 1.1, margin: '0 0 12px' }}>
          Conteúdo pronto, todo mês, sem esforço seu
        </h2>
        <p style={{ fontSize: 14, color: MUTED, marginBottom: 28, lineHeight: 1.6 }}>Um processo organizado que você aprova e pronto.</p>
        <div style={{ display: 'flex', gap: 14, marginBottom: 28 }}>
          {tmpl.processo.map(p => (
            <div key={p.step} style={{ flex: 1, background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '16px' }}>
              <div style={{ fontFamily: "'Geist Mono','JetBrains Mono',monospace", fontSize: 11, color: G, marginBottom: 8, letterSpacing: 1 }}>{p.step}</div>
              <div style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontSize: 16, fontWeight: 700, color: '#FFF', marginBottom: 6 }}>{p.title}</div>
              <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.55 }}>{p.desc}</div>
            </div>
          ))}
        </div>
        <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '18px 22px' }}>
          <div style={{ fontFamily: "'Geist Mono','JetBrains Mono',monospace", fontSize: 10, color: G, letterSpacing: 2, marginBottom: 12 }}>PLATAFORMAS ATENDIDAS</div>
          <div style={{ display: 'flex', gap: 24 }}>
            {['📸 Instagram', '👥 Facebook', '🎬 TikTok (sob consulta)', '📌 Pinterest (sob consulta)'].map(p => (
              <div key={p} style={{ fontSize: 13, color: '#C0D0C4' }}>{p}</div>
            ))}
          </div>
        </div>
      </div>
    </PropostaPage>
  )
}

function PageInvestimento({ tmpl }) {
  const isFixed = tmpl.price.fixed !== undefined
  const priceText = isFixed ? `R$ ${tmpl.price.fixed.toLocaleString('pt-BR')}${tmpl.price.suffix}` : `R$ ${tmpl.price.min.toLocaleString('pt-BR')}${tmpl.price.suffix}`

  return (
    <PropostaPage dark={false} label="Investimento">
      <div style={{ paddingTop: 28 }}>
        <Chip>Investimento</Chip>
        <h2 style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontSize: 40, fontWeight: 900, color: '#0A0C0B', lineHeight: 1.1, margin: '0 0 24px' }}>
          Plano {tmpl.plan} — mensalidade
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
          <div style={{ background: DARK, borderRadius: 16, padding: '28px 24px', border: `2px solid ${G}` }}>
            <div style={{ fontFamily: "'Geist Mono','JetBrains Mono',monospace", fontSize: 10, color: G, letterSpacing: 2, marginBottom: 12 }}>MENSALIDADE</div>
            <div style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontSize: 52, fontWeight: 900, color: G, lineHeight: 1 }}>{priceText}</div>
            <div style={{ fontSize: 12, color: '#5A7A65', marginTop: 12 }}>Sem fidelidade — cancele quando quiser</div>
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${BORDER}` }}>
              <div style={{ fontSize: 13, color: '#8AA895', fontWeight: 500 }}>✓ Contrato mensal renovável</div>
              <div style={{ fontSize: 13, color: '#8AA895', fontWeight: 500, marginTop: 6 }}>✓ Sem taxa de cancelamento</div>
              <div style={{ fontSize: 13, color: '#8AA895', fontWeight: 500, marginTop: 6 }}>✓ Arquivos sempre seus</div>
            </div>
          </div>
          <div style={{ background: '#F7F8F7', border: '1px solid #E5E7E5', borderRadius: 16, padding: '28px 24px' }}>
            <div style={{ fontFamily: "'Geist Mono','JetBrains Mono',monospace", fontSize: 10, color: G, letterSpacing: 2, marginBottom: 12 }}>O QUE ESTÁ INCLUSO</div>
            {tmpl.incluso.slice(0, 6).map(item => (
              <div key={item} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 8 }}>
                <span style={{ color: G, fontSize: 12, flexShrink: 0, marginTop: 1 }}>✓</span>
                <span style={{ fontSize: 12, color: '#2A3A2E', lineHeight: 1.5 }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ padding: '14px 18px', background: 'rgba(21,196,90,0.06)', border: '1px solid rgba(21,196,90,0.2)', borderRadius: 10 }}>
          <p style={{ margin: 0, fontSize: 13, color: '#1A4A28', lineHeight: 1.6 }}>
            💳 <strong>Pagamento:</strong> Pix mensal (todo dia 5) ou cartão de crédito recorrente. Todos os arquivos e direitos autorais são seus ao cancelar.
          </p>
        </div>
      </div>
    </PropostaPage>
  )
}

function PageFechamento({ fields }) {
  return (
    <div style={{ width: 794, height: 1123, backgroundColor: DARK, position: 'relative', overflow: 'hidden', pageBreakAfter: 'always', breakAfter: 'page', display: 'flex', flexDirection: 'column', fontFamily: "'Instrument Sans','Inter',sans-serif", boxSizing: 'border-box' }}>
      <div style={{ position: 'absolute', top: -80, right: -80, width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(21,196,90,0.1) 0%, transparent 70%)' }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 60px', textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(21,196,90,0.12)', border: `2px solid ${G}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, marginBottom: 24 }}>💬</div>
        <h2 style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontSize: 52, fontWeight: 900, color: '#FFF', lineHeight: 1.05, margin: '0 0 16px' }}>
          Pronto para começar,<br />{(fields.cliente || '').split(' ')[0] || 'parceiro'}?
        </h2>
        <p style={{ fontSize: 15, color: MUTED, lineHeight: 1.7, maxWidth: 460, marginBottom: 40 }}>
          Essa proposta é válida por 7 dias. Entre em contato para tirar dúvidas, alinhar detalhes e iniciar a gestão das suas redes.
        </p>
        <div style={{ display: 'flex', gap: 16, marginBottom: 48 }}>
          <a href="https://wa.me/5511941164044" style={{ padding: '14px 32px', borderRadius: 10, background: 'linear-gradient(135deg, #2EFF8B, #16B85E)', color: DARK, fontWeight: 700, fontSize: 15, textDecoration: 'none', display: 'inline-block' }}>Falar pelo WhatsApp</a>
          <a href="mailto:contato@zinkra.com.br" style={{ padding: '14px 32px', borderRadius: 10, background: 'transparent', border: `1px solid ${BORDER}`, color: '#C0D0C4', fontWeight: 600, fontSize: 15, textDecoration: 'none', display: 'inline-block' }}>Enviar e-mail</a>
        </div>
        <div style={{ display: 'flex', gap: 32, color: MUTED, fontSize: 13 }}>
          <span>📞 (11) 94116-4044</span>
          <span>✉️ contato@zinkra.com.br</span>
          <span>🌐 zinkra.com.br</span>
        </div>
      </div>
      <div style={{ height: 4, background: 'linear-gradient(90deg, #2EFF8B, #16B85E)' }} />
    </div>
  )
}

export default function TemplateSocial({ fields, tmpl }) {
  return (
    <div style={{ width: 794 }}>
      <PageCapa fields={fields} tmpl={tmpl} />
      <PageQuemSomos />
      <PageProblema tmpl={tmpl} />
      <PageSolucao tmpl={tmpl} />
      <PageIncluso tmpl={tmpl} />
      <PageComoFunciona tmpl={tmpl} />
      <PageInvestimento tmpl={tmpl} />
      <PageFechamento fields={fields} />
    </div>
  )
}
