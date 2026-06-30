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

function PageCapa({ fields }) {
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
        <Chip>Sistema sob Medida</Chip>
        <div style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontSize: 13, fontWeight: 700, color: MUTED, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 12 }}>Proposta exclusiva para</div>
        <h1 style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontSize: 64, fontWeight: 900, color: '#FFF', lineHeight: 1.05, margin: '0 0 16px' }}>
          {fields.cliente || 'Nome do Cliente'}
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ height: 3, width: 48, backgroundColor: G, borderRadius: 2 }} />
          <span style={{ fontSize: 18, color: '#8AA895', fontWeight: 500 }}>Sistema sob Medida</span>
        </div>
        <p style={{ fontSize: 15, color: MUTED, maxWidth: 460, lineHeight: 1.6 }}>Tecnologia construída para o seu processo</p>
        {fields.observacao && (
          <div style={{ marginTop: 24, padding: '14px 20px', background: 'rgba(21,196,90,0.08)', border: '1px solid rgba(21,196,90,0.25)', borderRadius: 10, maxWidth: 540 }}>
            <p style={{ fontSize: 13, color: '#A8C8B0', lineHeight: 1.6, margin: 0, fontStyle: 'italic' }}>{fields.observacao}</p>
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
          A Zinkra é especializada em desenvolvimento de sistemas sob medida: CRMs, ERPs, plataformas SaaS e sistemas internos. Cada solução é construída para o processo real do cliente — sem adaptar sua operação a um software genérico.
        </p>
        <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
          {[{ value: '50+', label: 'Clientes atendidos' }, { value: '35+', label: 'Projetos entregues' }, { value: '100%', label: 'Sob medida' }].map(s => (
            <div key={s.value} style={{ flex: 1, background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '20px', textAlign: 'center' }}>
              <div style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontSize: 44, fontWeight: 900, color: G, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 12, color: MUTED, marginTop: 6 }}>{s.label}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            { icon: '🎯', title: 'Processo mapeado', desc: 'Começamos entendendo como sua operação funciona de verdade.' },
            { icon: '🔗', title: 'Integrações nativas', desc: 'Conectamos ao que você já usa: WhatsApp, ERPs, APIs externas.' },
            { icon: '📈', title: 'Escalável por design', desc: 'Arquitetura preparada para crescer com o seu negócio.' },
            { icon: '🔒', title: 'Código é seu', desc: 'Você recebe o código-fonte completo — sem dependência de ninguém.' },
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
        <p style={{ fontSize: 14, color: '#4A5550', lineHeight: 1.7, marginBottom: 24, maxWidth: 560 }}>
          Essa realidade é muito comum entre empresas que cresceram usando planilhas e processos manuais. Em algum momento, o que funcionava para 5 pessoas começa a travar uma equipe de 20.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
          {tmpl.problema.points.map((p, i) => (
            <div key={i} style={{ display: 'flex', gap: 14, padding: '14px 16px', background: '#F7F8F7', border: '1px solid #E5E7E5', borderLeft: `4px solid ${G}`, borderRadius: 8 }}>
              <span style={{ fontFamily: "'Geist Mono','JetBrains Mono',monospace", fontSize: 11, color: G, flexShrink: 0, marginTop: 2, letterSpacing: 1 }}>0{i + 1}</span>
              <span style={{ fontSize: 13, color: '#1A2820', lineHeight: 1.6 }}>{p}</span>
            </div>
          ))}
        </div>
        <div style={{ padding: '14px 18px', background: 'rgba(21,196,90,0.06)', border: '1px solid rgba(21,196,90,0.2)', borderRadius: 10 }}>
          <p style={{ margin: 0, fontSize: 13, color: '#1A4A28', lineHeight: 1.6 }}>
            💡 Um sistema sob medida resolve exatamente esses problemas — e se adapta ao seu processo, não o contrário.
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
        <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
          {tmpl.solucao.highlights.map(h => (
            <div key={h.label} style={{ flex: 1, background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '20px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 26, marginBottom: 10 }}>{h.icon}</div>
              <div style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontSize: 17, fontWeight: 700, color: '#FFF', marginBottom: 4 }}>{h.label}</div>
              <div style={{ fontSize: 12, color: MUTED }}>{h.desc}</div>
            </div>
          ))}
        </div>
        <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '16px 20px' }}>
          <div style={{ fontFamily: "'Geist Mono','JetBrains Mono',monospace", fontSize: 10, color: G, letterSpacing: 2, marginBottom: 10 }}>O QUE ESTÁ INCLUSO EM TODO PROJETO</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {tmpl.incluso.slice(0, 6).map(item => (
              <div key={item} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <span style={{ color: G, fontSize: 12, flexShrink: 0, marginTop: 1 }}>✓</span>
                <span style={{ fontSize: 12, color: MUTED, lineHeight: 1.5 }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PropostaPage>
  )
}

function PageModulos({ tmpl }) {
  return (
    <PropostaPage dark={false} label="Módulos possíveis">
      <div style={{ paddingTop: 28 }}>
        <Chip>Possibilidades</Chip>
        <h2 style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontSize: 38, fontWeight: 900, color: '#0A0C0B', lineHeight: 1.1, margin: '0 0 16px' }}>
          Módulos que podem compor o seu sistema
        </h2>
        <p style={{ fontSize: 14, color: '#4A5550', lineHeight: 1.7, marginBottom: 22, maxWidth: 560 }}>
          O sistema é construído com os módulos que fazem sentido para a sua operação — você não paga por funcionalidades que não vai usar.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 22 }}>
          {tmpl.modulos.map(m => (
            <div key={m.label} style={{ background: '#F7F8F7', border: '1px solid #E5E7E5', borderRadius: 12, padding: '18px 16px' }}>
              <div style={{ fontSize: 24, marginBottom: 10 }}>{m.icon}</div>
              <div style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontSize: 17, fontWeight: 700, color: '#0A0C0B', marginBottom: 6 }}>{m.label}</div>
              <div style={{ fontSize: 12, color: '#4A5550', lineHeight: 1.55 }}>{m.desc}</div>
            </div>
          ))}
        </div>
        <div style={{ padding: '14px 18px', background: 'rgba(21,196,90,0.06)', border: '1px solid rgba(21,196,90,0.2)', borderRadius: 10 }}>
          <p style={{ margin: 0, fontSize: 13, color: '#1A4A28', lineHeight: 1.6 }}>
            ✦ Os módulos acima são exemplos do que já desenvolvemos. O seu sistema será desenhado do zero, a partir do mapeamento do seu processo real.
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
        <Chip>Processo</Chip>
        <h2 style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontSize: 40, fontWeight: 900, color: '#FFF', lineHeight: 1.1, margin: '0 0 12px' }}>
          Do briefing ao sistema em produção
        </h2>
        <p style={{ fontSize: 14, color: MUTED, marginBottom: 28, lineHeight: 1.6 }}>
          Um processo estruturado com entregas parciais para você acompanhar tudo.
        </p>
        <div style={{ display: 'flex', gap: 14, marginBottom: 24 }}>
          {tmpl.processo.map(p => (
            <div key={p.step} style={{ flex: 1, background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '16px' }}>
              <div style={{ fontFamily: "'Geist Mono','JetBrains Mono',monospace", fontSize: 11, color: G, marginBottom: 8, letterSpacing: 1 }}>{p.step}</div>
              <div style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontSize: 15, fontWeight: 700, color: '#FFF', marginBottom: 6 }}>{p.title}</div>
              <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.55 }}>{p.desc}</div>
            </div>
          ))}
        </div>
        <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '16px 20px' }}>
          <div style={{ fontFamily: "'Geist Mono','JetBrains Mono',monospace", fontSize: 10, color: G, letterSpacing: 2, marginBottom: 10 }}>TECNOLOGIAS</div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {['React', 'Node.js', 'PostgreSQL', 'Python', 'REST APIs', 'Docker', 'AWS / Vercel', 'WhatsApp API'].map(t => (
              <span key={t} style={{ fontFamily: "'Geist Mono','JetBrains Mono',monospace", fontSize: 11, color: G, border: `1px solid ${BORDER}`, borderRadius: 4, padding: '4px 10px' }}>{t}</span>
            ))}
          </div>
        </div>
      </div>
    </PropostaPage>
  )
}

function PageInvestimento({ fields }) {
  const h1 = fields.horario1 || 'A definir com você'
  const h2 = fields.horario2 || 'Ou conforme sua disponibilidade'

  return (
    <PropostaPage dark={false} label="Investimento">
      <div style={{ paddingTop: 24 }}>
        <Chip>Investimento</Chip>
        <h2 style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontSize: 38, fontWeight: 900, color: '#0A0C0B', lineHeight: 1.1, margin: '0 0 16px' }}>
          O investimento depende do escopo
        </h2>
        <p style={{ fontSize: 14, color: '#4A5550', lineHeight: 1.7, marginBottom: 22, maxWidth: 580 }}>
          Diferente de produtos genéricos, o valor de um sistema sob medida varia conforme a complexidade e quantidade de módulos. Por isso, não apresentamos um preço fixo antes de entender seu projeto.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 22 }}>
          {[
            { label: 'Sistema Simples', desc: '1–2 módulos, sem integrações', value: 'R$ 3.000 – 8.000' },
            { label: 'Sistema Médio', desc: '3–5 módulos com integrações', value: 'R$ 8.000 – 20.000' },
            { label: 'Sistema Completo', desc: 'ERP ou SaaS multi-tenant', value: 'R$ 18.000 – 50.000' },
          ].map(r => (
            <div key={r.label} style={{ background: '#F7F8F7', border: '1px solid #E5E7E5', borderRadius: 12, padding: '18px 16px' }}>
              <div style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontSize: 16, fontWeight: 700, color: '#0A0C0B', marginBottom: 6 }}>{r.label}</div>
              <div style={{ fontSize: 12, color: '#4A5550', marginBottom: 10, lineHeight: 1.5 }}>{r.desc}</div>
              <div style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontSize: 18, fontWeight: 900, color: G }}>{r.value}</div>
            </div>
          ))}
        </div>

        <div style={{ background: DARK, border: `2px solid ${G}`, borderRadius: 14, padding: '20px 22px', marginBottom: 16 }}>
          <div style={{ fontFamily: "'Geist Mono','JetBrains Mono',monospace", fontSize: 10, color: G, letterSpacing: 2, marginBottom: 12 }}>HORÁRIOS DISPONÍVEIS PARA REUNIÃO</div>
          <div style={{ display: 'flex', gap: 16 }}>
            {[{ n: '01', h: h1 }, { n: '02', h: h2 }].map(slot => (
              <div key={slot.n} style={{ flex: 1, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ fontFamily: "'Geist Mono','JetBrains Mono',monospace", fontSize: 10, color: G, marginBottom: 8, letterSpacing: 1 }}>OPÇÃO {slot.n}</div>
                <div style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontSize: 18, fontWeight: 700, color: '#FFF' }}>{slot.h}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: '12px 16px', background: 'rgba(21,196,90,0.06)', border: '1px solid rgba(21,196,90,0.2)', borderRadius: 10 }}>
          <p style={{ margin: 0, fontSize: 12, color: '#1A4A28', lineHeight: 1.6 }}>
            💡 Na reunião mapeamos o escopo completo e em até 48h entregamos uma proposta com valor fechado e cronograma.
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
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(21,196,90,0.12)', border: `2px solid ${G}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, marginBottom: 24 }}>⚙️</div>
        <h2 style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontSize: 52, fontWeight: 900, color: '#FFF', lineHeight: 1.05, margin: '0 0 16px' }}>
          Vamos construir<br />algo incrível?
        </h2>
        <p style={{ fontSize: 15, color: MUTED, lineHeight: 1.7, maxWidth: 460, marginBottom: 40 }}>
          Cada sistema que a Zinkra entrega é único — como o negócio do cliente. Vamos conversar sobre o seu?
        </p>
        <div style={{ display: 'flex', gap: 16, marginBottom: 48 }}>
          <a href="https://wa.me/5511941164044" style={{ padding: '14px 32px', borderRadius: 10, background: 'linear-gradient(135deg, #2EFF8B, #16B85E)', color: DARK, fontWeight: 700, fontSize: 15, textDecoration: 'none', display: 'inline-block' }}>Confirmar reunião</a>
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

export default function TemplateSistema({ fields, tmpl }) {
  return (
    <div style={{ width: 794 }}>
      <PageCapa fields={fields} />
      <PageQuemSomos />
      <PageProblema tmpl={tmpl} />
      <PageSolucao tmpl={tmpl} />
      <PageModulos tmpl={tmpl} />
      <PageComoFunciona tmpl={tmpl} />
      <PageInvestimento fields={fields} />
      <PageFechamento fields={fields} />
    </div>
  )
}
