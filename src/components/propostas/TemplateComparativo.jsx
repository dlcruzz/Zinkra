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
        <Chip>Site — {tmpl.plan}</Chip>
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
        <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.7, maxWidth: 560, marginBottom: 28 }}>
          A Zinkra é especializada em desenvolvimento de sites profissionais, sistemas sob medida e gestão de redes sociais. Cada projeto é construído do zero, com foco total no seu objetivo.
        </p>
        <div style={{ display: 'flex', gap: 16, marginBottom: 28 }}>
          {[{ value: '50+', label: 'Clientes atendidos' }, { value: '35+', label: 'Projetos entregues' }, { value: '100%', label: 'Personalizado' }].map(s => (
            <div key={s.value} style={{ flex: 1, background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '20px', textAlign: 'center' }}>
              <div style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontSize: 44, fontWeight: 900, color: G, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 12, color: MUTED, marginTop: 6 }}>{s.label}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            { icon: '🎯', title: 'Sem intermediários', desc: 'Você fala direto com quem desenvolve.' },
            { icon: '⚡', title: 'Entregas no prazo', desc: 'Processos ágeis e sem surpresas.' },
            { icon: '🔒', title: 'Desenvolvimento in-house', desc: 'Nada é terceirizado.' },
            { icon: '📊', title: 'Foco em resultado', desc: 'Sites que geram leads e vendas.' },
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

function PageProblema() {
  return (
    <PropostaPage dark={false} label="O problema">
      <div style={{ paddingTop: 28 }}>
        <Chip>Por que atualizar seu site?</Chip>
        <h2 style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontSize: 40, fontWeight: 900, color: '#0A0C0B', lineHeight: 1.1, margin: '0 0 20px' }}>
          Seu site atual está custando oportunidades
        </h2>
        <p style={{ fontSize: 14, color: '#4A5550', lineHeight: 1.7, marginBottom: 28, maxWidth: 560 }}>
          A maioria das empresas perde clientes porque o site não transmite confiança, não carrega rápido ou não converte visitantes em contatos.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 28 }}>
          {['Carregamento lento no celular — visitante sai antes de ler a primeira linha', 'Design desatualizado que passa desconfiança e afasta potenciais clientes', 'Invisível no Google — nenhum cliente chega até você organicamente', 'Sem chamada clara para ação — o visitante não sabe o que fazer na página'].map((p, i) => (
            <div key={i} style={{ display: 'flex', gap: 14, padding: '14px 16px', background: '#F7F8F7', border: '1px solid #E5E7E5', borderLeft: `4px solid ${G}`, borderRadius: 8 }}>
              <span style={{ fontFamily: "'Geist Mono','JetBrains Mono',monospace", fontSize: 11, color: G, flexShrink: 0, marginTop: 2, letterSpacing: 1 }}>0{i + 1}</span>
              <span style={{ fontSize: 13, color: '#1A2820', lineHeight: 1.6 }}>{p}</span>
            </div>
          ))}
        </div>
        <div style={{ padding: '16px 20px', background: 'rgba(21,196,90,0.06)', border: '1px solid rgba(21,196,90,0.2)', borderRadius: 10 }}>
          <p style={{ margin: 0, fontSize: 13, color: '#1A4A28', lineHeight: 1.6 }}>
            💡 Esses problemas têm solução — e preparamos duas opções para você escolher o melhor encaixe para o seu momento.
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
        <Chip>Nossas opções para você</Chip>
        <h2 style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontSize: 38, fontWeight: 900, color: '#FFF', lineHeight: 1.1, margin: '0 0 12px' }}>
          Dois planos, um objetivo — site que converte
        </h2>
        <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.6, marginBottom: 28 }}>
          Separamos duas opções para que você escolha o nível de presença digital que faz sentido para o seu negócio agora.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {tmpl.plans.map(plan => (
            <div key={plan.id} style={{ background: plan.highlight ? 'rgba(21,196,90,0.08)' : CARD_BG, border: `2px solid ${plan.highlight ? G : BORDER}`, borderRadius: 14, padding: '24px 20px', position: 'relative' }}>
              {plan.badge && (
                <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: G, color: DARK, fontFamily: "'Geist Mono','JetBrains Mono',monospace", fontSize: 10, letterSpacing: 2, padding: '4px 14px', borderRadius: 20, fontWeight: 700, whiteSpace: 'nowrap' }}>
                  {plan.badge}
                </div>
              )}
              <div style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontSize: 28, fontWeight: 900, color: plan.highlight ? G : '#FFF', marginBottom: 8 }}>
                {plan.label}
              </div>
              <div style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontSize: 22, fontWeight: 700, color: '#FFF', marginBottom: 16 }}>
                R$ {plan.price.min.toLocaleString('pt-BR')} – {plan.price.max.toLocaleString('pt-BR')}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {plan.items.map(item => (
                  <div key={item} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <span style={{ color: G, fontSize: 12, flexShrink: 0, marginTop: 1 }}>✓</span>
                    <span style={{ fontSize: 12, color: plan.highlight ? '#D0E0D4' : MUTED, lineHeight: 1.5 }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </PropostaPage>
  )
}

function PageComoFunciona() {
  const steps = [
    { step: '01', title: 'Briefing', desc: 'Você preenche o formulário com informações da empresa, público-alvo e objetivos.' },
    { step: '02', title: 'Design', desc: 'Criamos o layout e enviamos para aprovação antes de codificar.' },
    { step: '03', title: 'Revisão', desc: 'Rodadas de ajuste inclusas: texto, cores, imagens.' },
    { step: '04', title: 'Entrega', desc: 'Site publicado com SSL, Analytics e suporte inicial.' },
  ]
  return (
    <PropostaPage dark label="Como funciona">
      <div style={{ paddingTop: 28 }}>
        <Chip>Processo</Chip>
        <h2 style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontSize: 40, fontWeight: 900, color: '#FFF', lineHeight: 1.1, margin: '0 0 12px' }}>
          Da ideia ao ar — simples e rápido
        </h2>
        <p style={{ fontSize: 14, color: MUTED, marginBottom: 28, lineHeight: 1.6 }}>
          Processo claro e transparente, sem surpresas.
        </p>
        <div style={{ display: 'flex', gap: 14, marginBottom: 28 }}>
          {steps.map(p => (
            <div key={p.step} style={{ flex: 1, background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '16px' }}>
              <div style={{ fontFamily: "'Geist Mono','JetBrains Mono',monospace", fontSize: 11, color: G, marginBottom: 8, letterSpacing: 1 }}>{p.step}</div>
              <div style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontSize: 16, fontWeight: 700, color: '#FFF', marginBottom: 6 }}>{p.title}</div>
              <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.55 }}>{p.desc}</div>
            </div>
          ))}
        </div>
        <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '18px 22px' }}>
          <div style={{ fontFamily: "'Geist Mono','JetBrains Mono',monospace", fontSize: 10, color: G, letterSpacing: 2, marginBottom: 12 }}>COMUNICAÇÃO DIRETA</div>
          <div style={{ display: 'flex', gap: 24 }}>
            {[
              { icon: '💬', label: 'WhatsApp direto', desc: 'Acesso direto à equipe — sem chamados' },
              { icon: '🗓️', label: 'Reuniões focadas', desc: 'Somente quando necessário' },
              { icon: '📋', label: 'Progresso claro', desc: 'Você sabe em que etapa está' },
            ].map(c => (
              <div key={c.label} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: 22, marginBottom: 6 }}>{c.icon}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#D0E0D4', marginBottom: 4 }}>{c.label}</div>
                <div style={{ fontSize: 11, color: MUTED, lineHeight: 1.5 }}>{c.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PropostaPage>
  )
}

function PageInvestimento({ tmpl }) {
  return (
    <PropostaPage dark={false} label="Investimento">
      <div style={{ paddingTop: 28 }}>
        <Chip>Comparativo de planos</Chip>
        <h2 style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontSize: 38, fontWeight: 900, color: '#0A0C0B', lineHeight: 1.1, margin: '0 0 20px' }}>
          Escolha o plano ideal para o seu negócio
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
          {tmpl.plans.map(plan => {
            const parcelaBase = Math.round((plan.price.min + plan.price.max) / 2)
            const parcela = Math.ceil(parcelaBase / 12)
            return (
              <div key={plan.id} style={{ background: plan.highlight ? DARK : '#F7F8F7', border: `2px solid ${plan.highlight ? G : '#E5E7E5'}`, borderRadius: 16, padding: '26px 22px', position: 'relative' }}>
                {plan.badge && (
                  <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: G, color: DARK, fontFamily: "'Geist Mono','JetBrains Mono',monospace", fontSize: 10, letterSpacing: 2, padding: '4px 14px', borderRadius: 20, fontWeight: 700, whiteSpace: 'nowrap' }}>
                    {plan.badge}
                  </div>
                )}
                <div style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontSize: 26, fontWeight: 900, color: plan.highlight ? G : '#0A0C0B', marginBottom: 4 }}>{plan.label}</div>
                <div style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontSize: 32, fontWeight: 900, color: plan.highlight ? '#FFF' : '#0A0C0B', marginBottom: 8 }}>
                  R$ {plan.price.min.toLocaleString('pt-BR')} – {plan.price.max.toLocaleString('pt-BR')}
                </div>
                <div style={{ fontSize: 12, color: plan.highlight ? MUTED : '#6A7A70', marginBottom: 16 }}>
                  ou 12× de R$ {parcela.toLocaleString('pt-BR')} s/juros · Manutenção: R$ {plan.maintenance}/mês
                </div>
                {plan.items.map(item => (
                  <div key={item} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 8 }}>
                    <span style={{ color: G, fontSize: 12, flexShrink: 0, marginTop: 1 }}>✓</span>
                    <span style={{ fontSize: 12, color: plan.highlight ? '#C0D0C4' : '#2A3A2E', lineHeight: 1.5 }}>{item}</span>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
        <div style={{ padding: '14px 18px', background: 'rgba(21,196,90,0.06)', border: '1px solid rgba(21,196,90,0.2)', borderRadius: 10 }}>
          <p style={{ margin: 0, fontSize: 13, color: '#1A4A28', lineHeight: 1.6 }}>
            💳 Pagamento via Pix (à vista), cartão em até 12× sem juros ou 50% entrada + 50% na entrega.
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
          Essa proposta é válida por 7 dias. Entre em contato para tirar dúvidas, alinhar detalhes e dar o primeiro passo.
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

export default function TemplateComparativo({ fields, tmpl }) {
  return (
    <div style={{ width: 794 }}>
      <PageCapa fields={fields} tmpl={tmpl} />
      <PageQuemSomos />
      <PageProblema />
      <PageSolucao tmpl={tmpl} />
      <PageComoFunciona />
      <PageInvestimento tmpl={tmpl} />
      <PageFechamento fields={fields} />
    </div>
  )
}
