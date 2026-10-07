import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMeta } from '../components/Shell'
import { useAuth } from '../lib/auth'
import { useWorld, cashSummary, monthlyFlow, proposalTotal } from '../lib/world'
import { buildInsights, prospectFunnel } from '../lib/insights'
import { brl0, today, addDays, startOfMonth, endOfMonth, startOfWeek, MONTHS, dm, daysSince, monthLabel, inRange, pct, hoursLabel, localDay } from '../lib/format'
import { PageHead, Kpi, Card, Seg, Loading, ErrorBox, Badge } from '../components/ui'
import { GroupedBars, Funnel, StackBar } from '../components/charts'
import { InsightList } from '../components/Insights'
import { PROJECT_STAGES, PROJECT_STAGE_CLASS, FRONTS, FRONT_COLORS } from '../lib/constants'

const OPEN = new Set(['briefing', 'design', 'desenvolvimento', 'revisao', 'ajustes'])

function rangeFor(p) {
  const t = today()
  if (p === 'week') return [startOfWeek(t), addDays(startOfWeek(t), 6), [addDays(startOfWeek(t), -7), addDays(startOfWeek(t), -1)]]
  if (p === 'quarter') {
    const m = Number(t.slice(5, 7)), q0 = Math.floor((m - 1) / 3) * 3 + 1
    const a = `${t.slice(0, 4)}-${String(q0).padStart(2, '0')}-01`
    return [a, endOfMonth(`${t.slice(0, 4)}-${String(q0 + 2).padStart(2, '0')}-01`), null]
  }
  const prev = addDays(startOfMonth(t), -1)
  return [startOfMonth(t), endOfMonth(t), [startOfMonth(prev), prev]]
}

export default function Dashboard() {
  useMeta('Visão', 'Dashboard')
  const auth = useAuth()
  const [period, setPeriod] = useState('month')
  const { data: w, loading, error, reload } = useWorld()

  const calc = useMemo(() => {
    if (!w) return null
    const t = today()
    const [from, to, prev] = rangeFor(period)
    const cs = cashSummary(w, t)
    const goal = w.settings.goals?.monthly_revenue_cents || 0
    const flow = monthlyFlow(w, 6, 0, t)
    const funnel = prospectFunnel(w, from, to)
    const prevMonthRev = prev ? w.receivables.filter((r) => r.received_on && inRange(r.received_on, prev[0], prev[1])).reduce((a, r) => a + r.amount_cents, 0) : 0
    const projects = w.projects.filter((p) => OPEN.has(p.stage)).sort((a, b) => (a.due_on || '9') < (b.due_on || '9') ? -1 : 1)
    const people = auth.members.map((m) => {
      const mine = w.tasks.filter((x) => x.owner_id === m.id)
      return {
        ...m,
        open: mine.filter((x) => x.status !== 'done').length,
        late: mine.filter((x) => x.status !== 'done' && x.due_on && x.due_on < t).length,
        done: mine.filter((x) => x.done_at && inRange(x.done_at, from, to)).length,
      }
    })
    const created = w.tasks.filter((x) => inRange(x.created_at, from, to)).length
    const doneP = w.tasks.filter((x) => x.done_at && inRange(x.done_at, from, to)).length
    const openProps = w.proposals.filter((p) => ['enviada', 'vista'].includes(p.status))
    const propsTotal = openProps.reduce((a, p) => a + proposalTotal(p, w.items).once + proposalTotal(p, w.items).monthly, 0)
    // horas por frente
    const byFront = {}
    w.timeEntries.filter((e) => inRange(e.started_at, from, to)).forEach((e) => {
      const task = w.tasks.find((x) => x.id === e.task_id)
      const proj = w.projects.find((p) => p.id === (e.project_id || task?.project_id))
      const f = task?.front || proj?.front || 'interno'
      byFront[f] = (byFront[f] || 0) + (e.minutes || Math.round((Date.now() - new Date(e.started_at)) / 60000))
    })
    const totalMin = Object.values(byFront).reduce((a, b) => a + b, 0)
    const recurringClients = new Set(w.contracts.filter((c) => c.kind === 'recurring' && c.active).map((c) => c.client_id)).size
    const ctx = { uid: auth.uid, isDirector: auth.isDirector, canSee: auth.canSee, memberName: auth.memberName }
    const insights = buildInsights(w, ctx)
    return { t, from, to, cs, goal, flow, funnel, prevMonthRev, projects, people, created, doneP, openProps, propsTotal, byFront, totalMin, recurringClients, insights }
  }, [w, period, auth])

  if (error) return <div className="page"><ErrorBox error={error} onRetry={reload} /></div>
  if (loading || !calc) return <div className="page"><Loading rows={6} /></div>
  const c = calc
  const now = new Date()
  const revDelta = c.prevMonthRev ? Math.round(((c.cs.received - c.prevMonthRev) / c.prevMonthRev) * 100) : null
  const maxFunnelDrop = (() => {
    let worst = null
    c.funnel.forEach((s, i) => {
      if (!i || !c.funnel[i - 1].value) return
      const r = s.value / c.funnel[i - 1].value
      if (!worst || r < worst.r) worst = { r, a: c.funnel[i - 1].label, b: s.label }
    })
    return worst
  })()

  return (
    <div className="page">
      <PageHead title="Visão geral da Zinkra" sub={`${MONTHS[now.getMonth()]} de ${now.getFullYear()} · atualizado agora`}>
        <Seg value={period} onChange={setPeriod} options={[['week', 'Semana'], ['month', 'Mês'], ['quarter', 'Trimestre']]} />
      </PageHead>

      <section aria-label="Dinheiro" className="grid-kpi">
        <Kpi label="Recebido no mês" value={brl0(c.cs.received)} bar={c.goal ? pct(c.cs.received, c.goal) : undefined}
          hint={c.goal ? `${pct(c.cs.received, c.goal)}% da meta de ${brl0(c.goal)}` : 'Defina a meta em Configurações'} />
        <Kpi label="Recorrente mensal" value={brl0(c.cs.mrr)} hint={`${c.recurringClients} cliente(s) com plano mensal`} />
        <Kpi label="A receber em 30 dias" value={brl0(c.cs.recv30)}
          hint={c.cs.overdueR.length ? `${c.cs.overdueR.length} vencida(s) · ${brl0(c.cs.overdueR.reduce((a, r) => a + r.amount_cents, 0))}` : 'Nada vencido'}
          hintClass={c.cs.overdueR.length ? 'dn' : 'lbl'} />
        <Kpi label="A pagar em 30 dias" value={brl0(c.cs.pay30)}
          hint={c.cs.payWeek.length ? `${c.cs.payWeek.length} vence(m) esta semana` : 'Nada nesta semana'} hintClass={c.cs.payWeek.length ? 'warn lbl' : 'lbl'} />
        <Kpi label="Saldo projetado 30 dias" value={brl0(c.cs.projected)} accent
          hint={revDelta !== null ? `${revDelta >= 0 ? '+' : ''}${revDelta}% de recebimento vs mês anterior` : 'caixa + receber − pagar'}
          hintClass={revDelta === null ? 'lbl' : revDelta >= 0 ? 'up' : 'dn'} />
      </section>

      <section className="grid-2">
        <Card pad title={<h2>Entradas e saídas · 6 meses</h2>} action={<div className="legend"><span><i style={{ background: 'var(--green)' }} />Entradas</span><span><i style={{ background: '#4A524E' }} />Saídas</span></div>}>
          <GroupedBars labels={c.flow.map((m) => monthLabel(m.key))} highlight={c.flow.length - 1} goal={c.goal}
            series={[{ name: 'Entradas', color: 'var(--green)', values: c.flow.map((m) => m.inDone) }, { name: 'Saídas', color: '#4A524E', values: c.flow.map((m) => m.outDone) }]} />
          {c.goal ? <span className="lbl" style={{ display: 'block', marginTop: 8 }}>Tracejado = meta mensal de {brl0(c.goal)}</span> : null}
        </Card>
        <Card pad title={<h2>Funil de prospecção · {period === 'week' ? 'semana' : period === 'month' ? 'mês' : 'trimestre'}</h2>} action={<Link to="/erp/relatorios" style={{ fontSize: 12 }}>Ver relatório</Link>}>
          <Funnel steps={c.funnel} />
          <span className="lbl" style={{ display: 'block', marginTop: 12 }}>
            % = conversão da etapa anterior.{maxFunnelDrop ? ` Maior queda: ${maxFunnelDrop.a.toLowerCase()} → ${maxFunnelDrop.b.toLowerCase()}.` : ''}
          </span>
        </Card>
      </section>

      <section className="grid-3">
        <Card title="O sistema sugere" action={<Link to="/erp/inteligencia" style={{ fontSize: 12 }}>Todas ({c.insights.length})</Link>}>
          <InsightList items={c.insights} limit={5} compact />
        </Card>
        <Card title="Projetos ativos" action={<Link to="/erp/projetos" style={{ fontSize: 12 }}>Todos ({c.projects.length})</Link>}>
          <div className="tbl-wrap"><table className="tbl">
            <thead><tr><th>Projeto</th><th>Etapa</th><th>Prazo</th></tr></thead>
            <tbody>
              {c.projects.slice(0, 6).map((p) => (
                <tr key={p.id}>
                  <td className="ellipsis" style={{ maxWidth: 220 }}><Link to={`/erp/projetos/${p.id}`} style={{ color: 'var(--tx)' }}>{p.name}</Link></td>
                  <td><Badge kind={PROJECT_STAGE_CLASS[p.stage]}>{PROJECT_STAGES[p.stage]}</Badge></td>
                  <td className="num" style={p.due_on && p.due_on < c.t ? { color: 'var(--red)' } : undefined}>{p.due_on ? dm(p.due_on) : '—'}</td>
                </tr>
              ))}
              {!c.projects.length ? <tr><td colSpan={3} className="lbl">Nenhum projeto ativo.</td></tr> : null}
            </tbody>
          </table></div>
        </Card>
        <Card title="Propostas abertas" action={<Link to="/erp/propostas" style={{ fontSize: 12 }}>{brl0(c.propsTotal)} em aberto</Link>}>
          <div className="tbl-wrap"><table className="tbl">
            <thead><tr><th>Cliente</th><th>Valor</th><th>Enviada há</th></tr></thead>
            <tbody>
              {c.openProps.slice(0, 6).map((p) => {
                const tot = proposalTotal(p, w.items)
                const name = w.clients.find((x) => x.id === p.client_id)?.name || w.leads.find((l) => l.id === p.lead_id)?.company || p.title
                const d = daysSince(localDay(p.sent_at))
                return (
                  <tr key={p.id}>
                    <td className="ellipsis" style={{ maxWidth: 200 }}><Link to={`/erp/propostas/${p.id}`} style={{ color: 'var(--tx)' }}>{name}</Link></td>
                    <td className="num">{tot.once ? brl0(tot.once) : ''}{tot.monthly ? `${tot.once ? ' + ' : ''}${brl0(tot.monthly)}/mês` : ''}</td>
                    <td className="num" style={d >= 7 ? { color: 'var(--yel)' } : undefined}>{d ?? '—'} dias</td>
                  </tr>
                )
              })}
              {!c.openProps.length ? <tr><td colSpan={3} className="lbl">Nenhuma proposta aguardando resposta.</td></tr> : null}
            </tbody>
          </table></div>
        </Card>
      </section>

      <section className="grid-2">
        <Card title="Tarefas por pessoa" action={<Link to="/erp/tarefas" style={{ fontSize: 12 }}>Abrir tarefas</Link>}>
          <div className="tbl-wrap"><table className="tbl">
            <thead><tr><th>Pessoa</th><th className="r">Abertas</th><th className="r">Vencidas</th><th className="r">Feitas no período</th></tr></thead>
            <tbody>
              {c.people.map((p) => (
                <tr key={p.id}><td>{p.name}</td><td className="num r">{p.open}</td><td className="num r" style={p.late ? { color: 'var(--red)' } : undefined}>{p.late}</td><td className="num r">{p.done}</td></tr>
              ))}
            </tbody>
          </table></div>
          <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="lbl" style={{ display: 'flex', justifyContent: 'space-between' }}><span>Concluídas × criadas no período</span><span className="num">{c.doneP} / {c.created}</span></div>
            <div className="bar"><i style={{ width: `${c.created ? Math.min(100, (c.doneP / c.created) * 100) : 0}%` }} /></div>
          </div>
        </Card>
        <Card pad title={<h2>Horas por frente</h2>} action={<span className="lbl num">{hoursLabel(c.totalMin)} registradas</span>}>
          {c.totalMin ? (
            <StackBar format={(v) => hoursLabel(v)} parts={Object.keys(FRONTS).map((k) => ({ label: FRONTS[k], value: c.byFront[k] || 0, color: FRONT_COLORS[k] })).filter((p) => p.value)} />
          ) : <p className="lbl">Nenhuma hora registrada no período. Use o botão ▶ nas tarefas para cronometrar.</p>}
        </Card>
      </section>
    </div>
  )
}
