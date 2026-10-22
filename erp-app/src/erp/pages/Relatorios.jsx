import React, { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMeta } from '../components/Shell'
import { useAuth } from '../lib/auth'
import { useWorld } from '../lib/world'
import { prospectFunnel, scriptStats } from '../lib/insights'
import { brl0, today, addDays, inRange, pctLabel, hoursLabel, startOfMonth } from '../lib/format'
import { PageHead, Card, Seg, Loading, ErrorBox, Empty } from '../components/ui'
import { Funnel, HBars } from '../components/charts'
import { FRONTS, FRONT_COLORS } from '../lib/constants'
import { toCsv, download } from '../lib/csv'
import { Icon } from '../lib/icons'

const REPORTS = [
  ['funil', 'Funil por pipeline', 'onde os leads param'],
  ['nicho', 'Conversão por nicho', 'de lead a cliente'],
  ['bairro', 'Conversão por bairro', 'onde a prospecção rende'],
  ['script', 'Conversão por script', 'qual mensagem funciona'],
  ['prospector', 'Desempenho por pessoa', 'contatos, respostas, reuniões'],
  ['receita', 'Receita por frente e cliente', 'o que dá dinheiro'],
  ['horas', 'Horas por cliente', 'tempo real × valor'],
  ['perdas', 'Motivos de perda', 'por que não fechou'],
]

export default function Relatorios() {
  useMeta('Empresa', 'Relatórios')
  const auth = useAuth()
  const [sp, setSp] = useSearchParams()
  const r = sp.get('r') || 'funil'
  const [period, setPeriod] = useState('90')
  const { data: w, loading, error, reload } = useWorld()

  const rep = useMemo(() => {
    if (!w) return null
    const t = today()
    const from = period === 'month' ? startOfMonth(t) : addDays(t, -Number(period))
    const leads = w.leads
    const created = leads.filter((l) => inRange(l.created_at, from, t))
    const conv = (key, label) => {
      const by = {}
      created.forEach((l) => { const k = l[key] || '(sem)'; (by[k] ||= { n: 0, won: 0, meet: 0 }).n++; if (l.won_at) by[k].won++; if (w.meetings.some((m) => m.lead_id === l.id)) by[k].meet++ })
      const rows = Object.entries(by).filter(([, v]) => v.n >= 3).map(([k, v]) => ({ label: k, value: v.n ? v.won / v.n : 0, display: pctLabel(v.won, v.n, 1), sub: `${v.n} leads`, raw: v }))
        .sort((a, b) => b.value - a.value || b.raw.n - a.raw.n)
      return { lead: rows[0] ? `${rows[0].label} converte ${rows[0].display} em cliente.` : 'Ainda não há dados suficientes (mínimo de 3 leads por grupo).', cols: [label, 'Taxa lead → cliente', 'Taxa', 'Base'],
        rows, csv: [[label, 'Leads', 'Reuniões', 'Ganhos', 'Taxa'], ...rows.map((x) => [x.label, x.raw.n, x.raw.meet, x.raw.won, x.display])] }
    }
    switch (r) {
      case 'funil': {
        const fs = w.P.pipelines.map((p) => {
          const st = w.P.of(p.id).filter((s) => s.kind !== 'lost')
          const ls = leads.filter((l) => l.pipeline_id === p.id && inRange(l.created_at, from, t))
          // quantos chegaram pelo menos até cada etapa
          return { p, steps: st.map((s) => ({ label: s.name, value: ls.filter((l) => { const c = w.P.stage(l.stage_id); return c && c.kind !== 'lost' && c.sort >= s.sort }).length })) }
        })
        return { kind: 'funnels', fs, prosp: prospectFunnel(w, from, t), lead: 'Quantos leads criados no período chegaram a cada etapa (posição atual). O funil de prospecção conta atividades reais.' }
      }
      case 'nicho': return conv('niche', 'Nicho')
      case 'bairro': return conv('neighborhood', 'Bairro')
      case 'script': {
        const s = scriptStats(w.activities.filter((a) => inRange(a.happened_at, from, t)))
        const rows = Object.entries(s).map(([k, v]) => ({ label: `${k} · ${w.playbooks.find((p) => p.code === k)?.title || ''}`, value: v.rate, display: pctLabel(v.rep, v.sent), sub: `${v.sent} env.`, raw: v })).sort((a, b) => b.value - a.value)
        return { lead: rows.length >= 2 ? `${rows[0].label.split(' ·')[0]} tem a melhor taxa de resposta (${rows[0].display}).` : 'Registre os contatos com o código da mensagem para comparar.', cols: ['Mensagem', 'Resposta em até 7 dias', 'Taxa', 'Envios'], rows,
          csv: [['Código', 'Enviadas', 'Respostas', 'Taxa'], ...Object.entries(s).map(([k, v]) => [k, v.sent, v.rep, pctLabel(v.rep, v.sent)])] }
      }
      case 'prospector': {
        const rows = auth.members.map((m) => {
          const acts = w.activities.filter((a) => a.owner_id === m.id && inRange(a.happened_at, from, t))
          const c = acts.filter((a) => ['whatsapp', 'ligacao', 'email', 'visita'].includes(a.type)).length
          const rep = acts.filter((a) => a.result === 'respondeu').length
          const meet = w.meetings.filter((x) => x.owner_id === m.id && x.lead_id && inRange(x.created_at, from, t)).length
          const won = leads.filter((l) => (l.owner_id === m.id || l.handed_off_by === m.id) && l.won_at && inRange(l.won_at, from, t))
          return { m, c, rep, meet, won: won.length, value: won.reduce((a, l) => a + (l.estimated_value_cents || 0), 0) }
        })
        return { kind: 'table', lead: 'Atividade e resultado de cada pessoa no período.', head: ['Pessoa', 'Contatos', 'Respostas', 'Taxa', 'Reuniões', 'Fechados', 'Valor fechado'],
          body: rows.map((x) => [x.m.name, x.c, x.rep, pctLabel(x.rep, x.c), x.meet, x.won, brl0(x.value)]) }
      }
      case 'receita': {
        const rec = w.receivables.filter((x) => x.received_on && inRange(x.received_on, from, t))
        const tot = rec.reduce((a, x) => a + x.amount_cents, 0)
        const byF = {}, byC = {}
        rec.forEach((x) => { byF[x.front] = (byF[x.front] || 0) + x.amount_cents; byC[x.client_id] = (byC[x.client_id] || 0) + x.amount_cents })
        const fronts = Object.entries(byF).map(([k, v]) => ({ label: FRONTS[k] || k, value: v, display: brl0(v), sub: pctLabel(v, tot), color: FRONT_COLORS[k] })).sort((a, b) => b.value - a.value)
        const clients = Object.entries(byC).map(([k, v]) => ({ label: w.clients.find((c) => c.id === k)?.name || 'Avulso', value: v, display: brl0(v), sub: pctLabel(v, tot) })).sort((a, b) => b.value - a.value)
        return { kind: 'double', lead: tot ? `${brl0(tot)} recebidos no período. ${fronts[0]?.label} é a maior frente (${fronts[0]?.sub}).` : 'Nenhum recebimento no período.',
          a: { title: 'Por frente', rows: fronts }, b: { title: 'Por cliente', rows: clients.slice(0, 10) },
          csv: [['Cliente', 'Recebido', '%'], ...clients.map((x) => [x.label, x.value / 100, x.sub])] }
      }
      case 'horas': {
        const by = {}
        w.timeEntries.filter((e) => inRange(e.started_at, from, t)).forEach((e) => {
          const task = w.tasks.find((x) => x.id === e.task_id)
          const proj = w.projects.find((p) => p.id === (e.project_id || task?.project_id))
          const cid = proj?.client_id || task?.client_id || 'interno'
          by[cid] = (by[cid] || 0) + (e.minutes || 0)
        })
        const rows = Object.entries(by).map(([cid, mins]) => {
          const money = cid === 'interno' ? 0 : w.receivables.filter((x) => x.client_id === cid && x.received_on && inRange(x.received_on, from, t)).reduce((a, x) => a + x.amount_cents, 0)
          return { label: cid === 'interno' ? 'Interno' : w.clients.find((c) => c.id === cid)?.name || '—', value: mins, display: hoursLabel(mins), sub: mins && money ? brl0((money / mins) * 60) + '/h' : '—', color: 'var(--blue)', money }
        }).sort((a, b) => b.value - a.value)
        return { lead: 'Horas registradas por cliente e quanto cada hora rendeu (recebido no período ÷ horas).', cols: ['Cliente', 'Horas', 'Horas', 'R$/hora'], rows,
          csv: [['Cliente', 'Minutos', 'Recebido', 'R$/hora'], ...rows.map((x) => [x.label, x.value, x.money / 100, x.sub])] }
      }
      case 'perdas': {
        const lost = leads.filter((l) => l.lost_reason && inRange(l.updated_at, from, t))
        const c = {}
        lost.forEach((l) => { c[l.lost_reason] = (c[l.lost_reason] || 0) + 1 })
        const rows = Object.entries(c).map(([k, v]) => ({ label: k, value: v, display: v, sub: pctLabel(v, lost.length), color: 'var(--org)' })).sort((a, b) => b.value - a.value)
        return { lead: rows[0] ? `"${rows[0].label}" explica ${rows[0].sub} das perdas.` : 'Nenhuma perda registrada no período.', cols: ['Motivo', 'Participação', 'Leads', '%'], rows,
          csv: [['Motivo', 'Leads', '%'], ...rows.map((x) => [x.label, x.value, x.sub])] }
      }
      default: return null
    }
  }, [w, r, period, auth.members])

  if (error) return <div className="page"><ErrorBox error={error} onRetry={reload} /></div>
  if (loading || !rep) return <div className="page"><Loading rows={6} /></div>
  const meta = REPORTS.find((x) => x[0] === r)
  const csv = rep.csv || (rep.kind === 'table' ? [rep.head, ...rep.body] : null)

  return (
    <div className="page">
      <PageHead title="Relatórios" sub="Prontos, com filtro de período e exportação CSV">
        <Seg value={period} onChange={setPeriod} options={[['month', 'Este mês'], ['30', '30 dias'], ['90', '90 dias'], ['365', '12 meses']]} />
        {csv ? <button type="button" className="btn" onClick={() => download(`relatorio-${r}-${today()}.csv`, toCsv(csv[0], csv.slice(1)))}><Icon name="download" size={14} />CSV</button> : null}
      </PageHead>
      <div className="cols">
        <nav aria-label="Relatórios" className="card" style={{ flex: '0 1 260px', padding: 8, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {REPORTS.map(([k, n, d]) => (
            <button key={k} type="button" onClick={() => setSp({ r: k })} style={{ all: 'unset', boxSizing: 'border-box', width: '100%', display: 'flex', flexDirection: 'column', gap: 2, padding: '10px 12px', borderRadius: 8, cursor: 'pointer', background: k === r ? 'var(--sel)' : undefined }}>
              <span style={{ fontSize: 13, fontWeight: 500 }}>{n}</span><span className="lbl">{d}</span>
            </button>
          ))}
        </nav>
        <section className="card pad stack" style={{ flex: '1 1 520px', minWidth: 0 }}>
          <h2 style={{ fontSize: 16 }}>{meta[1]}</h2>
          <p style={{ fontSize: 13, color: 'var(--tx-2)' }}>{rep.lead}</p>
          {rep.kind === 'funnels' ? (
            <div className="stack" style={{ gap: 24 }}>
              <div className="stack"><h3>Prospecção (atividades reais)</h3><Funnel steps={rep.prosp} /></div>
              {rep.fs.map(({ p, steps }) => <div key={p.id} className="stack"><h3>{p.name}</h3>{steps[0]?.value ? <Funnel steps={steps} /> : <span className="lbl">Sem leads criados no período.</span>}</div>)}
            </div>
          ) : rep.kind === 'table' ? (
            <div className="tbl-wrap"><table className="tbl"><thead><tr>{rep.head.map((h, i) => <th key={h} className={i ? 'r' : ''}>{h}</th>)}</tr></thead>
              <tbody>{rep.body.map((row) => <tr key={row[0]}>{row.map((c, i) => <td key={i} className={i ? 'num r' : ''}>{c}</td>)}</tr>)}</tbody></table></div>
          ) : rep.kind === 'double' ? (
            <div className="grid-2">
              <div className="stack"><h3>{rep.a.title}</h3><HBars rows={rep.a.rows} /></div>
              <div className="stack"><h3>{rep.b.title}</h3><HBars rows={rep.b.rows} color="var(--blue)" /></div>
            </div>
          ) : rep.rows?.length ? <HBars rows={rep.rows} cols={rep.cols} /> : <Empty icon="chart">Sem dados suficientes no período.</Empty>}
        </section>
      </div>
    </div>
  )
}
