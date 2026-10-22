import React, { useMemo, useState } from 'react'
import { useMeta } from '../components/Shell'
import { useAuth } from '../lib/auth'
import { useWorld, cashSummary, monthlyFlow, proposalTotal } from '../lib/world'
import { buildInsights, buildBriefing, prospectFunnel, scriptStats } from '../lib/insights'
import { supabase } from '../lib/supabase'
import { brl0, today, startOfMonth, endOfMonth, localDay } from '../lib/format'
import { PageHead, Card, Loading, ErrorBox, Seg, Spinner } from '../components/ui'
import { InsightList } from '../components/Insights'
import { Icon } from '../lib/icons'

const AUTOMATIONS = [
  ['Contato registrado', 'agenda o próximo follow-up (F1 em 3 dias; R1 em 30 dias depois de 3 tentativas) e move o lead de etapa.'],
  ['Lead respondeu', 'vai para "Respondeu" e entra na fila de hoje com a mensagem V2.'],
  ['Número inválido', 'o lead vai para Perdido com o motivo preenchido.'],
  ['Lead passado ao Diretor', 'cria a tarefa "Conduzir proposta" para o Diretor.'],
  ['Proposta aceita', 'cria cliente, contratos, parcelas, mensalidades, projetos com tarefas, checklist e marcos, e a comissão do parceiro.'],
  ['Contrato mensal', 'gera as cobranças de cada mês sozinho.'],
  ['Despesa recorrente', 'se lança nos meses seguintes sozinha.'],
  ['Cliente pagou', 'libera a comissão do parceiro como conta a pagar.'],
  ['Tarefa recorrente concluída', 'cria a próxima ocorrência.'],
  ['Reunião', 'cada próximo passo vira tarefa com um clique.'],
  ['Cronômetro', 'calcula horas por projeto e o valor real por hora de cada cliente.'],
]

function compactSummary(w, ctx, insights) {
  const t = today()
  const cs = cashSummary(w, t)
  const flow = monthlyFlow(w, 3, 2, t).map((m) => ({ mes: m.key, entradas: m.in / 100, saidas: m.out / 100 }))
  const funnel = prospectFunnel(w, startOfMonth(t), endOfMonth(t))
  const scripts = Object.entries(scriptStats(w.activities)).map(([k, s]) => ({ codigo: k, enviadas: s.sent, respostas: s.rep }))
  const openProps = w.proposals.filter((p) => ['enviada', 'vista'].includes(p.status)).map((p) => ({ status: p.status, valor: proposalTotal(p, w.items).year / 100, enviada: localDay(p.sent_at) }))
  return {
    hoje: t,
    caixa: { recebido_mes: cs.received / 100, recorrente_mensal: cs.mrr / 100, a_receber_30d: cs.recv30 / 100, a_pagar_30d: cs.pay30 / 100, saldo_projetado: cs.projected / 100, vencidos_receber: cs.overdueR.length },
    meta_mensal: (w.settings.goals?.monthly_revenue_cents || 0) / 100,
    fluxo: flow, funil_mes: funnel, scripts, propostas_abertas: openProps,
    leads_abertos: w.leads.filter((l) => w.P.stage(l.stage_id)?.kind === 'open').length,
    projetos_ativos: w.projects.filter((p) => !['entregue', 'manutencao'].includes(p.stage)).length,
    tarefas_atrasadas: w.tasks.filter((x) => x.status !== 'done' && x.due_on && x.due_on < t).length,
    clientes_ativos: w.clients.filter((c) => c.status === 'ativo').length,
    sinais: insights.slice(0, 15).map((i) => `${i.area}: ${i.title}. ${i.detail}`),
  }
}

export default function Inteligencia() {
  useMeta('Visão', 'Inteligência')
  const auth = useAuth()
  const [area, setArea] = useState('all')
  const [q, setQ] = useState('')
  const [ai, setAi] = useState({ busy: false, text: '', err: '' })
  const { data: w, loading, error, reload } = useWorld()

  const c = useMemo(() => {
    if (!w) return null
    const ctx = { uid: auth.uid, isDirector: auth.isDirector, canSee: auth.canSee, memberName: auth.memberName }
    const insights = buildInsights(w, ctx)
    return { ctx, insights, brief: buildBriefing(w, ctx, insights) }
  }, [w, auth])

  if (error) return <div className="page"><ErrorBox error={error} onRetry={reload} /></div>
  if (loading || !c) return <div className="page"><Loading rows={6} /></div>

  const areas = ['all', ...Array.from(new Set(c.insights.map((i) => i.area)))]
  const list = area === 'all' ? c.insights : c.insights.filter((i) => i.area === area)
  const counts = { hi: c.insights.filter((i) => i.level === 'hi').length, md: c.insights.filter((i) => i.level === 'md').length, op: c.insights.filter((i) => i.level === 'op').length }

  const askAi = async (question) => {
    setAi({ busy: true, text: '', err: '' })
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/erp-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ question: question || null, summary: compactSummary(w, c.ctx, c.insights) }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'O assistente não respondeu.')
      setAi({ busy: false, text: data.text, err: '' })
    } catch (e) {
      setAi({ busy: false, text: '', err: e.message })
    }
  }

  return (
    <div className="page">
      <PageHead title="Inteligência" sub={c.brief.summary} />

      <div className="card stats">
        <div className="stat"><span className="lbl">Urgentes</span><span className="num" style={{ fontSize: 20, color: counts.hi ? 'var(--red)' : undefined }}>{counts.hi}</span></div>
        <div className="stat"><span className="lbl">Pedem atenção</span><span className="num" style={{ fontSize: 20, color: counts.md ? 'var(--yel)' : undefined }}>{counts.md}</span></div>
        <div className="stat"><span className="lbl">Oportunidades</span><span className="num" style={{ fontSize: 20, color: 'var(--green-tx)' }}>{counts.op}</span></div>
      </div>

      <div className="cols">
        <div className="stack" style={{ flex: '2 1 520px', minWidth: 0 }}>
          <Seg value={area} onChange={setArea} options={areas.map((a) => [a, a === 'all' ? 'Tudo' : a])} />
          <Card>
            <InsightList items={list} />
          </Card>
        </div>

        <div className="stack" style={{ flex: '1 1 320px', minWidth: 0 }}>
          {auth.isDirector ? (
            <Card pad title={<h2 className="row" style={{ gap: 8 }}><Icon name="spark" /> Assistente</h2>}>
              <div className="stack">
                <p className="lbl" style={{ lineHeight: 1.6 }}>Analisa os números da empresa e sugere um plano. Envia só um resumo (totais e contagens), sem nomes de clientes ou contatos.</p>
                <button type="button" className="btn p" disabled={ai.busy} onClick={() => askAi(null)}>{ai.busy ? <Spinner /> : null}Gerar plano da semana</button>
                <form className="row" style={{ flexWrap: 'nowrap' }} onSubmit={(e) => { e.preventDefault(); if (q.trim()) askAi(q.trim()) }}>
                  <label className="grow"><span className="sr">Pergunta</span><input className="in" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ex.: onde estou perdendo mais dinheiro?" /></label>
                  <button type="submit" className="btn" disabled={ai.busy}>Perguntar</button>
                </form>
                {ai.err ? <div className="note r">{ai.err}</div> : null}
                {ai.text ? <div className="box" style={{ fontSize: 13 }}>{ai.text}</div> : null}
              </div>
            </Card>
          ) : null}
          <Card pad title="O que o sistema faz sozinho">
            <div className="stack-s" style={{ gap: 10 }}>
              {AUTOMATIONS.map(([a, b]) => (
                <div key={a} style={{ fontSize: 13, lineHeight: 1.5 }}><b style={{ fontWeight: 500 }}>{a}:</b> <span className="mut">{b}</span></div>
              ))}
            </div>
          </Card>
          {c.insights.length === 0 ? null : (
            <p className="lbl">Dispense uma sugestão no × e ela some por 7 dias. Os limites (dias parado, dias até follow-up) ficam em Configurações.</p>
          )}
        </div>
      </div>
    </div>
  )
}

export { brl0 }
