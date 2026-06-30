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

function CheckItem({ children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 9 }}>
      <span style={{ color: G, fontSize: 14, marginTop: 1, flexShrink: 0 }}>✓</span>
      <span style={{ fontSize: 13, lineHeight: 1.5, color: '#C8D8CC' }}>{children}</span>
    </div>
  )
}

function StepCard({ step, title, desc }) {
  return (
    <div style={{
      background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 10,
      padding: '18px 20px', flex: 1,
    }}>
      <div style={{
        fontFamily: "'Geist Mono','JetBrains Mono',monospace",
        fontSize: 11, color: G, marginBottom: 8, letterSpacing: 1,
      }}>{step}</div>
      <div style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontSize: 16, fontWeight: 700, color: '#FFF', marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.55 }}>{desc}</div>
    </div>
  )
}

/* ─── PAGE 1: Capa ─────────────────────────────────────────────── */
function PageCapa({ fields, tmpl }) {
  const specificPrice = fields.preco ? parseFloat(fields.preco.replace(/\D+/g, '')) : null
  return (
    <div style={{ width: 794, height: 1123, backgroundColor: DARK, position: 'relative', overflow: 'hidden', pageBreakAfter: 'always', breakAfter: 'page', display: 'flex', flexDirection: 'column', fontFamily: "'Instrument Sans','Inter',sans-serif", boxSizing: 'border-box' }}>
      {/* BG decoration */}
      <div style={{ position: 'absolute', top: -120, right: -120, width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(21,196,90,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -60, left: -80, width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle, rgba(21,196,90,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />

      {/* Logo area */}
      <div style={{ padding: '32px 48px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontWeight: 900, fontSize: 32, color: G, lineHeight: 1 }}>Z</span>
          <span style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontWeight: 700, fontSize: 24, color: '#FFF', lineHeight: 1 }}>INKRA</span>
        </div>
        <span style={{ fontFamily: "'Geist Mono','JetBrains Mono',monospace", fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: MUTED }}>{fields.data}</span>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 48px' }}>
        <Chip>{tmpl.tag} — {tmpl.plan}</Chip>
        <div style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontSize: 13, fontWeight: 700, color: MUTED, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 12 }}>
          Proposta exclusiva para
        </div>
        <h1 style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontSize: 64, fontWeight: 900, color: '#FFF', lineHeight: 1.05, margin: '0 0 16px' }}>
          {fields.cliente || 'Nome do Cliente'}
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ height: 3, width: 48, backgroundColor: G, borderRadius: 2 }} />
          <span style={{ fontSize: 18, color: '#8AA895', fontWeight: 500 }}>{tmpl.capa.subtitle}</span>
        </div>
        <p style={{ fontSize: 15, color: MUTED, maxWidth: 460, lineHeight: 1.6 }}>{tmpl.capa.tagline}</p>
        {fields.observacao && (
          <div style={{ marginTop: 24, padding: '14px 20px', background: 'rgba(21,196,90,0.08)', border: `1px solid rgba(21,196,90,0.25)`, borderRadius: 10, maxWidth: 500 }}>
            <p style={{ fontSize: 13, color: '#A8C8B0', lineHeight: 1.6, margin: 0 }}>{fields.observacao}</p>
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div style={{ height: 4, background: `linear-gradient(90deg, #2EFF8B, #16B85E)` }} />
    </div>
  )
}

/* ─── PAGE 2: Quem somos ───────────────────────────────────────── */
function PageQuemSomos() {
  const stats = [
    { value: '50+', label: 'Clientes atendidos' },
    { value: '35+', label: 'Projetos entregues' },
    { value: '100%', label: 'Personalizado' },
  ]
  return (
    <PropostaPage dark label="Quem somos">
      <div style={{ paddingTop: 32 }}>
        <Chip>A Zinkra</Chip>
        <h2 style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontSize: 42, fontWeight: 900, color: '#FFF', lineHeight: 1.1, margin: '0 0 16px' }}>
          Software house brasileira focada em resultado
        </h2>
        <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.7, maxWidth: 580, marginBottom: 36 }}>
          A Zinkra é uma software house especializada em desenvolvimento de sites profissionais, sistemas sob medida e gestão de redes sociais. Cada projeto é construído do zero, com foco total no objetivo do cliente — sem templates prontos, sem terceirização, sem enrolação.
        </p>

        <div style={{ display: 'flex', gap: 16, marginBottom: 36 }}>
          {stats.map(s => (
            <div key={s.value} style={{ flex: 1, background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '24px 20px', textAlign: 'center' }}>
              <div style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontSize: 48, fontWeight: 900, color: G, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 12, color: MUTED, marginTop: 6, letterSpacing: 0.5 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {[
            { icon: '🎯', title: 'Sem intermediários', desc: 'Você fala direto com quem desenvolve. Sem gerente de conta repassando o briefing pela terceira vez.' },
            { icon: '⚡', title: 'Entregas no prazo', desc: 'Processos ágeis e comunicação direta garantem que você receba o que foi prometido na data combinada.' },
            { icon: '🔒', title: 'Desenvolvimento in-house', desc: 'Nada é terceirizado. Cada linha de código é escrita pela nossa própria equipe, em São Paulo.' },
            { icon: '📊', title: 'Foco em resultado', desc: 'Não entregamos apenas sites bonitos — entregamos soluções que geram leads, vendas e crescimento.' },
          ].map(d => (
            <div key={d.title} style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '16px 18px', display: 'flex', gap: 12 }}>
              <span style={{ fontSize: 20, flexShrink: 0, marginTop: 2 }}>{d.icon}</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: '#E0E8E2', marginBottom: 4 }}>{d.title}</div>
                <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.55 }}>{d.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PropostaPage>
  )
}

/* ─── PAGE 3: O problema ───────────────────────────────────────── */
function PageProblema({ tmpl }) {
  return (
    <PropostaPage dark={false} label="O problema">
      <div style={{ paddingTop: 32 }}>
        <Chip>Diagnóstico</Chip>
        <h2 style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontSize: 42, fontWeight: 900, color: '#0A0C0B', lineHeight: 1.1, margin: '0 0 20px' }}>
          {tmpl.problema.title}
        </h2>
        <p style={{ fontSize: 14, color: '#4A5550', lineHeight: 1.7, marginBottom: 36, maxWidth: 560 }}>
          Essa realidade é mais comum do que parece. A maioria das empresas investe em redes sociais ou anúncios sem ter uma base sólida — e perdem clientes que chegam até elas mas não convertem.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 40 }}>
          {tmpl.problema.points.map((p, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 16, padding: '18px 20px', background: '#F7F8F7', border: '1px solid #E5E7E5', borderLeft: `4px solid ${G}`, borderRadius: 10 }}>
              <span style={{ fontFamily: "'Geist Mono','JetBrains Mono',monospace", fontSize: 11, color: G, flexShrink: 0, marginTop: 2, letterSpacing: 1 }}>0{i + 1}</span>
              <span style={{ fontSize: 14, color: '#1A2820', lineHeight: 1.6 }}>{p}</span>
            </div>
          ))}
        </div>

        <div style={{ padding: '20px 24px', background: 'rgba(21,196,90,0.08)', border: `1px solid rgba(21,196,90,0.3)`, borderRadius: 12 }}>
          <p style={{ fontSize: 13, color: '#1A4A28', lineHeight: 1.7, margin: 0, fontWeight: 500 }}>
            💡 A boa notícia é que todos esses problemas têm solução — e você não precisa gastar uma fortuna para resolver.
          </p>
        </div>
      </div>
    </PropostaPage>
  )
}

/* ─── PAGE 4: A solução ────────────────────────────────────────── */
function PageSolucao({ tmpl }) {
  return (
    <PropostaPage dark label="A solução">
      <div style={{ paddingTop: 32 }}>
        <Chip>Nossa proposta</Chip>
        <h2 style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontSize: 40, fontWeight: 900, color: '#FFF', lineHeight: 1.1, margin: '0 0 16px' }}>
          {tmpl.solucao.title}
        </h2>
        <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.7, maxWidth: 560, marginBottom: 32 }}>{tmpl.solucao.desc}</p>

        <div style={{ display: 'flex', gap: 16, marginBottom: 36 }}>
          {tmpl.solucao.highlights.map(h => (
            <div key={h.label} style={{ flex: 1, background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '22px 18px', textAlign: 'center' }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>{h.icon}</div>
              <div style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontSize: 18, fontWeight: 700, color: '#FFF', marginBottom: 4 }}>{h.label}</div>
              <div style={{ fontSize: 12, color: MUTED }}>{h.desc}</div>
            </div>
          ))}
        </div>

        <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '20px 24px' }}>
          <div style={{ fontFamily: "'Geist Mono','JetBrains Mono',monospace", fontSize: 10, color: G, letterSpacing: 2, marginBottom: 10 }}>DIFERENCIAL ZINKRA</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            {[
              { a: 'Desenvolvido do zero', b: 'Templates prontos' },
              { a: 'Equipe interna', b: 'Terceirizado' },
              { a: 'Focado no seu objetivo', b: 'Solução genérica' },
            ].map((row, i) => (
              <div key={i}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ color: G, fontSize: 12 }}>✓</span>
                  <span style={{ fontSize: 12, color: '#D0E0D4', fontWeight: 500 }}>{row.a}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: '#F87171', fontSize: 12 }}>✕</span>
                  <span style={{ fontSize: 12, color: MUTED }}>{row.b}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PropostaPage>
  )
}

/* ─── PAGE 5: O que está incluso ───────────────────────────────── */
function PageIncluso({ tmpl }) {
  return (
    <PropostaPage dark={false} label="O que está incluso">
      <div style={{ paddingTop: 28 }}>
        <Chip>{tmpl.tag} — Plano {tmpl.plan}</Chip>
        <h2 style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontSize: 38, fontWeight: 900, color: '#0A0C0B', lineHeight: 1.1, margin: '0 0 24px' }}>
          Tudo que você recebe com este plano
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {tmpl.incluso.map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 16px', background: '#F7F8F7', border: '1px solid #E5E7E5', borderRadius: 8 }}>
              <span style={{ color: G, fontSize: 14, flexShrink: 0, marginTop: 1 }}>✓</span>
              <span style={{ fontSize: 13, color: '#1A2820', lineHeight: 1.5 }}>{item}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 20, padding: '16px 20px', background: 'rgba(21,196,90,0.06)', border: '1px solid rgba(21,196,90,0.2)', borderRadius: 10 }}>
          <p style={{ margin: 0, fontSize: 13, color: '#1A4A28', lineHeight: 1.6 }}>
            ✦ Tudo desenvolvido do zero pela nossa equipe interna — sem templates e sem terceirização.
          </p>
        </div>
      </div>
    </PropostaPage>
  )
}

/* ─── PAGE 6: Como funciona ────────────────────────────────────── */
function PageComoFunciona({ tmpl }) {
  return (
    <PropostaPage dark label="Como funciona">
      <div style={{ paddingTop: 28 }}>
        <Chip>Processo</Chip>
        <h2 style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontSize: 40, fontWeight: 900, color: '#FFF', lineHeight: 1.1, margin: '0 0 12px' }}>
          Da ideia ao ar em {tmpl.plan === 'Basic' ? '7 dias' : tmpl.plan === 'Plus' ? '15 dias' : '30 dias'}
        </h2>
        <p style={{ fontSize: 14, color: MUTED, marginBottom: 32, lineHeight: 1.6 }}>
          Um processo claro, transparente e sem surpresas.
        </p>
        <div style={{ display: 'flex', gap: 16, marginBottom: 32 }}>
          {tmpl.processo.map(p => <StepCard key={p.step} {...p} />)}
        </div>
        <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '20px 24px' }}>
          <div style={{ fontFamily: "'Geist Mono','JetBrains Mono',monospace", fontSize: 10, color: G, letterSpacing: 2, marginBottom: 12 }}>COMUNICAÇÃO</div>
          <div style={{ display: 'flex', gap: 24 }}>
            {[
              { icon: '💬', label: 'WhatsApp direto', desc: 'Acesso direto à equipe — sem chamados nem tickets' },
              { icon: '🗓️', label: 'Reuniões focadas', desc: 'Somente quando necessário, sem reuniões desnecessárias' },
              { icon: '📋', label: 'Relatório de progresso', desc: 'Você sabe exatamente em que etapa seu projeto está' },
            ].map(c => (
              <div key={c.label} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: 24, marginBottom: 6 }}>{c.icon}</div>
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

/* ─── PAGE 7: Investimento ─────────────────────────────────────── */
function PageInvestimento({ tmpl, fields }) {
  const specificPrice = fields.preco ? parseInt(fields.preco.replace(/\D/g, ''), 10) : null
  const displayMin = specificPrice || tmpl.price.min
  const displayMax = specificPrice ? null : tmpl.price.max
  const priceText = displayMax ? `R$ ${displayMin.toLocaleString('pt-BR')} – R$ ${displayMax.toLocaleString('pt-BR')}` : `R$ ${displayMin.toLocaleString('pt-BR')}`
  const parcelaBase = specificPrice || Math.round((tmpl.price.min + tmpl.price.max) / 2)
  const parcela = Math.ceil(parcelaBase / 12)

  return (
    <PropostaPage dark={false} label="Investimento">
      <div style={{ paddingTop: 28 }}>
        <Chip>Investimento</Chip>
        <h2 style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontSize: 40, fontWeight: 900, color: '#0A0C0B', lineHeight: 1.1, margin: '0 0 24px' }}>
          Plano {tmpl.plan} — valores e condições
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
          {/* Valor do projeto */}
          <div style={{ background: DARK, borderRadius: 16, padding: '28px 24px', border: `2px solid ${G}` }}>
            <div style={{ fontFamily: "'Geist Mono','JetBrains Mono',monospace", fontSize: 10, color: G, letterSpacing: 2, marginBottom: 12 }}>VALOR DO PROJETO</div>
            <div style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontSize: 40, fontWeight: 900, color: G, lineHeight: 1 }}>{priceText}</div>
            <div style={{ fontSize: 12, color: '#5A7A65', marginTop: 8 }}>Valor único — sem mensalidade de licença</div>
            {tmpl.parcelamento && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${BORDER}` }}>
                <div style={{ fontSize: 12, color: '#8AA895', marginBottom: 4 }}>ou parcelado em</div>
                <div style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontSize: 26, fontWeight: 700, color: '#FFF' }}>
                  12× de R$ {parcela.toLocaleString('pt-BR')}
                </div>
                <div style={{ fontSize: 11, color: '#5A7A65', marginTop: 4 }}>sem juros no cartão de crédito</div>
              </div>
            )}
          </div>

          {/* Manutenção mensal */}
          <div style={{ background: '#F7F8F7', border: '1px solid #E5E7E5', borderRadius: 16, padding: '28px 24px' }}>
            <div style={{ fontFamily: "'Geist Mono','JetBrains Mono',monospace", fontSize: 10, color: G, letterSpacing: 2, marginBottom: 12 }}>MANUTENÇÃO MENSAL (OPCIONAL)</div>
            <div style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontSize: 40, fontWeight: 900, color: '#0A0C0B', lineHeight: 1 }}>
              R$ {tmpl.maintenance.toLocaleString('pt-BR')}<span style={{ fontSize: 18 }}>/mês</span>
            </div>
            <div style={{ fontSize: 12, color: '#4A5550', marginTop: 8 }}>Inclui: atualizações de conteúdo, backup, SSL e suporte prioritário</div>
            <div style={{ marginTop: 16 }}>
              {['Atualizações de texto e imagens', 'Backup automático mensal', 'Monitoramento de performance', 'Suporte prioritário via WhatsApp'].map(i => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ color: G, fontSize: 12 }}>✓</span>
                  <span style={{ fontSize: 12, color: '#2A3A2E' }}>{i}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ padding: '16px 20px', background: 'rgba(21,196,90,0.06)', border: '1px solid rgba(21,196,90,0.2)', borderRadius: 10 }}>
          <p style={{ margin: 0, fontSize: 13, color: '#1A4A28', lineHeight: 1.6 }}>
            💳 <strong>Formas de pagamento:</strong> Pix (à vista com desconto), cartão de crédito em até 12× sem juros, ou 50% de entrada + 50% na entrega.
          </p>
        </div>
      </div>
    </PropostaPage>
  )
}

/* ─── PAGE 8: Fechamento ───────────────────────────────────────── */
function PageFechamento({ fields, tmpl }) {
  return (
    <div style={{ width: 794, height: 1123, backgroundColor: DARK, position: 'relative', overflow: 'hidden', pageBreakAfter: 'always', breakAfter: 'page', display: 'flex', flexDirection: 'column', fontFamily: "'Instrument Sans','Inter',sans-serif", boxSizing: 'border-box' }}>
      <div style={{ position: 'absolute', top: -80, right: -80, width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(21,196,90,0.1) 0%, transparent 70%)' }} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 60px', textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(21,196,90,0.12)', border: `2px solid ${G}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, marginBottom: 24 }}>💬</div>

        <h2 style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontSize: 52, fontWeight: 900, color: '#FFF', lineHeight: 1.05, margin: '0 0 16px' }}>
          Pronto para começar,<br />{(fields.cliente || '').split(' ')[0] || 'parceiro'}?
        </h2>
        <p style={{ fontSize: 15, color: MUTED, lineHeight: 1.7, maxWidth: 460, marginBottom: 40 }}>
          Essa proposta é válida por 7 dias. Entre em contato agora para tirar dúvidas, alinhar detalhes e dar o primeiro passo.
        </p>

        <div style={{ display: 'flex', gap: 16, marginBottom: 48 }}>
          <a href="https://wa.me/5511941164044" style={{ padding: '14px 32px', borderRadius: 10, background: `linear-gradient(135deg, #2EFF8B, #16B85E)`, color: DARK, fontWeight: 700, fontSize: 15, textDecoration: 'none', display: 'inline-block' }}>
            Falar pelo WhatsApp
          </a>
          <a href="mailto:contato@zinkra.com.br" style={{ padding: '14px 32px', borderRadius: 10, background: 'transparent', border: `1px solid ${BORDER}`, color: '#C0D0C4', fontWeight: 600, fontSize: 15, textDecoration: 'none', display: 'inline-block' }}>
            Enviar e-mail
          </a>
        </div>

        <div style={{ display: 'flex', gap: 32, color: MUTED, fontSize: 13 }}>
          <span>📞 (11) 94116-4044</span>
          <span>✉️ contato@zinkra.com.br</span>
          <span>🌐 zinkra.com.br</span>
        </div>
      </div>

      <div style={{ height: 4, background: `linear-gradient(90deg, #2EFF8B, #16B85E)` }} />
    </div>
  )
}

/* ─── EXPORT: Template completo Site ───────────────────────────── */
export default function TemplateSite({ fields, tmpl }) {
  return (
    <div style={{ width: 794 }}>
      <PageCapa fields={fields} tmpl={tmpl} />
      <PageQuemSomos />
      <PageProblema tmpl={tmpl} />
      <PageSolucao tmpl={tmpl} />
      <PageIncluso tmpl={tmpl} />
      <PageComoFunciona tmpl={tmpl} />
      <PageInvestimento tmpl={tmpl} fields={fields} />
      <PageFechamento fields={fields} tmpl={tmpl} />
    </div>
  )
}
