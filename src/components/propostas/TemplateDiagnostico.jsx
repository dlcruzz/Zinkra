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
        <Chip>Diagnóstico · Nosso Estúdio</Chip>
        <div style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontSize: 13, fontWeight: 700, color: MUTED, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 12 }}>Proposta exclusiva para</div>
        <h1 style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontSize: 64, fontWeight: 900, color: '#FFF', lineHeight: 1.05, margin: '0 0 16px' }}>
          {fields.cliente || 'Nome do Cliente'}
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ height: 3, width: 48, backgroundColor: G, borderRadius: 2 }} />
          <span style={{ fontSize: 18, color: '#8AA895', fontWeight: 500 }}>Proposta Comercial</span>
        </div>
        <p style={{ fontSize: 15, color: MUTED, maxWidth: 460, lineHeight: 1.6 }}>
          Diagnóstico e oportunidades para o seu negócio
        </p>
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
          A Zinkra é uma software house especializada em desenvolvimento de sites profissionais, sistemas sob medida e gestão de redes sociais. Cada projeto é construído do zero, sem templates e sem terceirização.
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
            { icon: '🎯', title: 'Sem intermediários', desc: 'Você fala direto com quem desenvolve.' },
            { icon: '⚡', title: 'Entregas no prazo', desc: 'Processos ágeis e sem surpresas.' },
            { icon: '🔒', title: 'Desenvolvimento in-house', desc: 'Nada é terceirizado.' },
            { icon: '📊', title: 'Foco em resultado', desc: 'Soluções que geram crescimento real.' },
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

function PageDiagnostico({ fields }) {
  return (
    <PropostaPage dark={false} label="Diagnóstico">
      <div style={{ paddingTop: 24 }}>
        <Chip>Diagnóstico</Chip>
        <h2 style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontSize: 38, fontWeight: 900, color: '#0A0C0B', lineHeight: 1.1, margin: '0 0 16px' }}>
          O que identificamos no seu negócio
        </h2>
        {fields.clientUrl && (
          <div style={{ marginBottom: 16, padding: '10px 14px', background: '#F0F4F0', border: '1px solid #D0E0D4', borderRadius: 8 }}>
            <span style={{ fontFamily: "'Geist Mono','JetBrains Mono',monospace", fontSize: 10, color: G, letterSpacing: 1, marginRight: 8 }}>SITE ANALISADO</span>
            <span style={{ fontSize: 12, color: '#4A5550' }}>{fields.clientUrl}</span>
          </div>
        )}
        <p style={{ fontSize: 14, color: '#4A5550', lineHeight: 1.7, marginBottom: 20, maxWidth: 580 }}>
          Com base na nossa análise inicial do seu negócio e presença digital, identificamos oportunidades claras de melhoria em duas frentes que têm impacto direto em crescimento e eficiência:
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{ background: '#F7F8F7', border: '1px solid #E5E7E5', borderLeft: `4px solid ${G}`, borderRadius: 10, padding: '20px 18px' }}>
            <div style={{ fontFamily: "'Geist Mono','JetBrains Mono',monospace", fontSize: 10, color: G, letterSpacing: 2, marginBottom: 10 }}>FRENTE 01</div>
            <div style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontSize: 22, fontWeight: 700, color: '#0A0C0B', marginBottom: 10 }}>Presença Digital</div>
            <div style={{ fontSize: 13, color: '#4A5550', lineHeight: 1.65 }}>
              {fields.observacao || 'Sua presença digital tem oportunidades de melhoria que impactam diretamente a captação de novos clientes e a credibilidade da marca no ambiente online.'}
            </div>
            <div style={{ marginTop: 14 }}>
              {['Site desatualizado ou sem conversão clara', 'Ausência no Google (SEO)', 'Presença fraca nas redes sociais'].map(i => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 6 }}>
                  <span style={{ color: '#F87171', fontSize: 12, flexShrink: 0, marginTop: 1 }}>✕</span>
                  <span style={{ fontSize: 12, color: '#4A5550', lineHeight: 1.5 }}>{i}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ background: '#F7F8F7', border: '1px solid #E5E7E5', borderLeft: `4px solid ${G}`, borderRadius: 10, padding: '20px 18px' }}>
            <div style={{ fontFamily: "'Geist Mono','JetBrains Mono',monospace", fontSize: 10, color: G, letterSpacing: 2, marginBottom: 10 }}>FRENTE 02</div>
            <div style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontSize: 22, fontWeight: 700, color: '#0A0C0B', marginBottom: 10 }}>Processos Internos</div>
            <div style={{ fontSize: 13, color: '#4A5550', lineHeight: 1.65 }}>
              Processos operacionais que ainda dependem de planilhas ou controles manuais representam riscos de erro e perda de produtividade que escalam com o crescimento do negócio.
            </div>
            <div style={{ marginTop: 14 }}>
              {['Operação dependente de planilhas', 'Retrabalho por falta de automação', 'Dados descentralizados sem visibilidade'].map(i => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 6 }}>
                  <span style={{ color: '#F87171', fontSize: 12, flexShrink: 0, marginTop: 1 }}>✕</span>
                  <span style={{ fontSize: 12, color: '#4A5550', lineHeight: 1.5 }}>{i}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PropostaPage>
  )
}

function PageSolucao() {
  return (
    <PropostaPage dark label="A solução">
      <div style={{ paddingTop: 28 }}>
        <Chip>Nossa proposta</Chip>
        <h2 style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontSize: 40, fontWeight: 900, color: '#FFF', lineHeight: 1.1, margin: '0 0 16px' }}>
          Duas frentes, uma parceria de longo prazo
        </h2>
        <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.7, maxWidth: 560, marginBottom: 28 }}>
          A Zinkra pode atuar nas duas frentes simultaneamente ou por etapas — conforme o momento e a prioridade do seu negócio.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
          {[
            { label: 'Presença Digital', icon: '🌐', items: ['Site profissional sob medida', 'SEO e visibilidade no Google', 'Gestão de redes sociais', 'Identidade visual consistente'] },
            { label: 'Sistema sob Medida', icon: '⚙️', items: ['Sistema interno personalizado', 'Automação de processos', 'Painel de gestão centralizado', 'Integrações com ferramentas já usadas'] },
          ].map(s => (
            <div key={s.label} style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '22px 20px' }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>{s.icon}</div>
              <div style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontSize: 22, fontWeight: 700, color: '#FFF', marginBottom: 14 }}>{s.label}</div>
              {s.items.map(item => (
                <div key={item} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 8 }}>
                  <span style={{ color: G, fontSize: 12, flexShrink: 0, marginTop: 1 }}>✓</span>
                  <span style={{ fontSize: 12, color: MUTED, lineHeight: 1.5 }}>{item}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '16px 20px' }}>
          <p style={{ margin: 0, fontSize: 13, color: '#A0B8A8', lineHeight: 1.6 }}>
            ✦ Podemos começar por qualquer frente — o importante é dar o primeiro passo. Cada projeto é orçado individualmente de acordo com o escopo.
          </p>
        </div>
      </div>
    </PropostaPage>
  )
}

function PageComoFunciona() {
  return (
    <PropostaPage dark={false} label="Como funciona">
      <div style={{ paddingTop: 28 }}>
        <Chip>Próximos passos</Chip>
        <h2 style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontSize: 40, fontWeight: 900, color: '#0A0C0B', lineHeight: 1.1, margin: '0 0 16px' }}>
          Do diagnóstico ao projeto em execução
        </h2>
        <p style={{ fontSize: 14, color: '#4A5550', marginBottom: 28, lineHeight: 1.6 }}>
          Depois de entender o seu contexto, o próximo passo é simples: uma reunião para alinhar prioridades e apresentar a proposta com escopo e valores específicos para o seu caso.
        </p>
        <div style={{ display: 'flex', gap: 14, marginBottom: 28 }}>
          {[
            { step: '01', title: 'Reunião de alinhamento', desc: 'Conversa de 30 a 60 minutos para entender o negócio, objetivos e prioridades com detalhes.' },
            { step: '02', title: 'Proposta detalhada', desc: 'Em até 48h após a reunião, entregamos uma proposta com escopo, prazo e investimento exatos.' },
            { step: '03', title: 'Aprovação e início', desc: 'Com a proposta aprovada, iniciamos em até 5 dias úteis com kickoff do projeto.' },
            { step: '04', title: 'Entregas com transparência', desc: 'Você acompanha cada etapa com acesso direto à equipe e relatórios de progresso.' },
          ].map(p => (
            <div key={p.step} style={{ flex: 1, background: '#F7F8F7', border: '1px solid #E5E7E5', borderRadius: 10, padding: '16px' }}>
              <div style={{ fontFamily: "'Geist Mono','JetBrains Mono',monospace", fontSize: 11, color: G, marginBottom: 8, letterSpacing: 1 }}>{p.step}</div>
              <div style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontSize: 15, fontWeight: 700, color: '#0A0C0B', marginBottom: 6 }}>{p.title}</div>
              <div style={{ fontSize: 12, color: '#4A5550', lineHeight: 1.55 }}>{p.desc}</div>
            </div>
          ))}
        </div>
        <div style={{ padding: '16px 20px', background: 'rgba(21,196,90,0.06)', border: '1px solid rgba(21,196,90,0.2)', borderRadius: 10 }}>
          <p style={{ margin: 0, fontSize: 13, color: '#1A4A28', lineHeight: 1.6 }}>
            💡 <strong>Sem compromisso:</strong> A reunião é gratuita e não gera nenhuma obrigação. Vamos conversar, entender o cenário e só depois apresentar uma proposta com valores reais.
          </p>
        </div>
      </div>
    </PropostaPage>
  )
}

function PagePorqueZinkra() {
  return (
    <PropostaPage dark label="Por que a Zinkra">
      <div style={{ paddingTop: 28 }}>
        <Chip>Diferenciais</Chip>
        <h2 style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontSize: 40, fontWeight: 900, color: '#FFF', lineHeight: 1.1, margin: '0 0 16px' }}>
          Por que escolher a Zinkra?
        </h2>
        <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.7, maxWidth: 560, marginBottom: 28 }}>
          Somos uma equipe técnica e criativa que fala a linguagem do negócio — não de tecnologia por tecnologia.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
          {[
            { icon: '🤝', title: 'Parceria de verdade', desc: 'Não somos fornecedores — somos o time de tecnologia da sua empresa, acessível e comprometido.' },
            { icon: '🔍', title: 'Transparência total', desc: 'Você sabe exatamente o que está sendo construído, quanto vai custar e quando vai entregar.' },
            { icon: '🚀', title: 'Foco em resultado', desc: 'Não entregamos apenas projetos bonitos — entregamos soluções que geram crescimento mensurável.' },
            { icon: '🔒', title: 'Código seu, sempre', desc: 'Todos os projetos são entregues com código-fonte — você nunca fica refém de ninguém.' },
          ].map(d => (
            <div key={d.title} style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '20px' }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>{d.icon}</div>
              <div style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontSize: 18, fontWeight: 700, color: '#FFF', marginBottom: 8 }}>{d.title}</div>
              <div style={{ fontSize: 13, color: MUTED, lineHeight: 1.6 }}>{d.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </PropostaPage>
  )
}

function PageAgendamento({ fields }) {
  const h1 = fields.horario1 || 'A definir com você'
  const h2 = fields.horario2 || 'Ou conforme sua disponibilidade'

  return (
    <PropostaPage dark={false} label="Próximos passos">
      <div style={{ paddingTop: 24 }}>
        <Chip>Agendamento</Chip>
        <h2 style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontSize: 38, fontWeight: 900, color: '#0A0C0B', lineHeight: 1.1, margin: '0 0 16px' }}>
          Vamos conversar?
        </h2>
        <p style={{ fontSize: 14, color: '#4A5550', lineHeight: 1.7, maxWidth: 520, marginBottom: 28 }}>
          Reservamos dois horários para uma conversa sem compromisso de 30 a 60 minutos, para entender melhor o seu cenário e apresentar uma proposta com valores reais.
        </p>

        <div style={{ display: 'flex', gap: 16, marginBottom: 28 }}>
          {[{ n: '01', h: h1 }, { n: '02', h: h2 }].map(slot => (
            <div key={slot.n} style={{ flex: 1, background: DARK, border: `2px solid ${G}`, borderRadius: 14, padding: '24px 20px', textAlign: 'center' }}>
              <div style={{ fontFamily: "'Geist Mono','JetBrains Mono',monospace", fontSize: 10, color: G, letterSpacing: 2, marginBottom: 12 }}>OPÇÃO {slot.n}</div>
              <div style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontSize: 22, fontWeight: 700, color: '#FFF', lineHeight: 1.3 }}>{slot.h}</div>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: 24, padding: '18px 22px', background: '#F7F8F7', border: '1px solid #E5E7E5', borderRadius: 12 }}>
          <div style={{ fontFamily: "'Geist Mono','JetBrains Mono',monospace", fontSize: 10, color: G, letterSpacing: 2, marginBottom: 10 }}>O QUE VOCÊ PODE ESPERAR DA REUNIÃO</div>
          {['Entendimento do seu negócio, operação e objetivos', 'Análise das suas principais dores e oportunidades', 'Apresentação do que a Zinkra pode entregar para você', 'Proposta com escopo e valores em até 48h após a reunião'].map(i => (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 8 }}>
              <span style={{ color: G, fontSize: 12, flexShrink: 0, marginTop: 1 }}>✓</span>
              <span style={{ fontSize: 13, color: '#1A2820', lineHeight: 1.5 }}>{i}</span>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <a href="https://wa.me/5511941164044" style={{ padding: '14px 28px', borderRadius: 10, background: 'linear-gradient(135deg, #2EFF8B, #16B85E)', color: DARK, fontWeight: 700, fontSize: 14, textDecoration: 'none', display: 'inline-block' }}>
            Confirmar pelo WhatsApp
          </a>
          <span style={{ fontSize: 13, color: '#4A5550' }}>ou envie um e-mail para <strong>contato@zinkra.com.br</strong></span>
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
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(21,196,90,0.12)', border: `2px solid ${G}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, marginBottom: 24 }}>🤝</div>
        <h2 style={{ fontFamily: "'Big Shoulders Display',sans-serif", fontSize: 52, fontWeight: 900, color: '#FFF', lineHeight: 1.05, margin: '0 0 16px' }}>
          Vamos dar o<br />primeiro passo?
        </h2>
        <p style={{ fontSize: 15, color: MUTED, lineHeight: 1.7, maxWidth: 460, marginBottom: 40 }}>
          Estamos animados com o que podemos construir juntos. Confirme um dos horários propostos e vamos conversar.
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

export default function TemplateDiagnostico({ fields, tmpl }) {
  return (
    <div style={{ width: 794 }}>
      <PageCapa fields={fields} />
      <PageQuemSomos />
      <PageDiagnostico fields={fields} />
      <PageSolucao />
      <PageComoFunciona />
      <PagePorqueZinkra />
      <PageAgendamento fields={fields} />
      <PageFechamento fields={fields} />
    </div>
  )
}
