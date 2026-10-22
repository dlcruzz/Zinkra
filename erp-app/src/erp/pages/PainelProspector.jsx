import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMeta } from '../components/Shell'
import { useAuth } from '../lib/auth'
import { useWorld, metricValue, periodRange, weekdayCount } from '../lib/world'
import { scriptStats, prospectFunnel } from '../lib/insights'
import { today, addDays, startOfWeek, startOfMonth, endOfMonth, WEEK_S, brl0, pctLabel, dm, inRange, localDay } from '../lib/format'
import { PageHead, Card, Loading, ErrorBox, Bar, Badge, Select } from '../components/ui'
import { Funnel } from '../components/charts'

const CONTACT = new Set(['whatsapp', 'ligacao', 'email', 'visita'])

export default function PainelProspector() {
  useMeta('Visão', 'Painel do prospector')
  const auth = useAuth()
  const prospectors = auth.members.filter((m) => m.role === 'prospector')
  const [who, setWho] = useState(auth.role === 'prospector' ? auth.uid : (prospectors[0]?.id || auth.uid))
  const { data: w, loading, error, reload } = useWorld()

  const c = useMemo(() => {
    if (!w) return null
    const t = today()
    const goal = (metric, period) => w.goals.find((g) => !g.archived_at && g.user_id === who && g.metric === metric && g.period === period)
    const dailyTarget = (metric) => {
      const d = goal(metric, 'day'); if (d) return Number(d.target)
      const m = goal(metric, 'month'); if (m) return Number(m.target) / (weekdayCount(startOfMonth(t), endOfMonth(t)) || 22)
      const wk = goal(metric, 'week'); if (wk) return Number(wk.target) / 5
      return null
    }
    const weekTarget = (metric) => {
      const wk = goal(metric, 'week'); if (wk) return Number(wk.target)
      const m = goal(metric, 'month'); if (m) return Math.round(Number(m.target) / 4.3)
      return null
    }
    const [ws, we] = periodRange('week', t)
    const contacts = metricValue(w, 'contatos', who, t, t)
    const replies = metricValue(w, 'respostas', who, t, t)
    const meetingsW = metricValue(w, 'reunioes', who, ws, we)
    const wonLeads = w.leads.filter((l) => l.won_at && inRange(l.won_at, startOfMonth(t), endOfMonth(t)) && (l.owner_id === who || l.handed_off_by === who))
    const days = Array.from({ length: 5 }).map((_, i) => {
      const d = addDays(startOfWeek(t), i)
      return { d, n: w.activities.filter((a) => a.owner_id === who && CONTACT.has(a.type) && localDay(a.happened_at) === d).length }
    })
    const myActs = w.activities.filter((a) => a.owner_id === who)
    const scripts = Object.entries(scriptStats(myActs)).map(([code, s]) => ({ code, ...s, title: w.playbooks.find((p) => p.code === code)?.title || '' }))
      .sort((a, b) => b.rate - a.rate)
    const handoffs = w.leads.filter((l) => l.handed_off_by === who).sort((a, b) => (b.handed_off_at || '').localeCompare(a.handed_off_at || '')).slice(0, 10)
    const queue = w.leads.filter((l) => l.owner_id === who && w.P.stage(l.stage_id)?.kind === 'open' && l.next_step_at && l.next_step_at <= t).length
    const funnel = prospectFunnel(w, startOfMonth(t), endOfMonth(t), who)
    // ritmo: projeção de contatos até o fim do dia (8h–18h)
    const h = new Date().getHours() + new Date().getMinutes() / 60
    const elapsed = Math.max(0.5, Math.min(10, h - 8))
    const projected = h > 8 ? Math.round((contacts / elapsed) * 10) : null
    return { t, contacts, replies, meetingsW, wonLeads, days, scripts, handoffs, queue, funnel, projected,
      tC: dailyTarget('contatos'), tR: dailyTarget('respostas'), tM: weekTarget('reunioes') }
  }, [w, who])

  if (error) return <div className="page"><ErrorBox error={error} onRetry={reload} /></div>
  if (loading || !c) return <div className="page"><Loading rows={6} /></div>
  const maxDay = Math.max(1, c.tC || 0, ...c.days.map((d) => d.n))
  const name = auth.memberName(who)

  return (
    <div className="page">
      <PageHead title={`${name}${auth.members.find((m) => m.id === who)?.role === 'prospector' ? ' · prospector' : ''}`}
        sub={auth.isDirector ? 'Painel inicial do prospector. Escolha a pessoa ao lado.' : `${c.queue} lead(s) na sua fila de hoje.`}>
        {auth.isTotal('crm') ? (
          <label className="lbl row" style={{ gap: 8 }}>Ver como
            <Select value={who} onChange={setWho} options={auth.members.map((m) => [m.id, m.name])} style={{ width: 160 }} />
          </label>
        ) : null}
        <Link to="/erp/prospeccao" className="btn p">Iniciar sessão de prospecção</Link>
      </PageHead>

      <section className="grid-kpi">
        <div className="card stat" style={{ padding: 16, gap: 10 }}>
          <span className="lbl">Contatos hoje</span>
          <span className="num big">{c.contacts}{c.tC ? <span className="mut" style={{ fontSize: 14 }}> / {Math.ceil(c.tC)}</span> : null}</span>
          {c.tC ? <Bar value={(c.contacts / c.tC) * 100} /> : null}
          <span className="lbl">{c.projected !== null ? `no ritmo atual: ${c.projected} até as 18h` : 'o dia ainda não começou'}</span>
        </div>
        <div className="card stat" style={{ padding: 16, gap: 10 }}>
          <span className="lbl">Respostas hoje</span>
          <span className="num big">{c.replies}{c.tR ? <span className="mut" style={{ fontSize: 14 }}> / {Math.ceil(c.tR)}</span> : null}</span>
          {c.tR ? <Bar value={(c.replies / c.tR) * 100} /> : null}
          <span className="lbl">{pctLabel(c.replies, c.contacts)} de taxa de resposta</span>
        </div>
        <div className="card stat" style={{ padding: 16, gap: 10 }}>
          <span className="lbl">Reuniões na semana</span>
          <span className="num big">{c.meetingsW}{c.tM ? <span className="mut" style={{ fontSize: 14 }}> / {c.tM}</span> : null}</span>
          {c.tM ? <Bar value={(c.meetingsW / c.tM) * 100} /> : null}
          <span className="lbl">{c.tM ? `faltam ${Math.max(0, c.tM - c.meetingsW)} até sexta` : 'sem meta semanal'}</span>
        </div>
        <div className="card stat" style={{ padding: 16, gap: 10 }}>
          <span className="lbl">Fechados a partir dos seus leads</span>
          <span className="num big">{c.wonLeads.length}</span>
          <span className="up">{brl0(c.wonLeads.reduce((a, l) => a + (l.estimated_value_cents || 0), 0))} no mês</span>
          <span className="lbl">contam na sua meta</span>
        </div>
      </section>

      <div className="cols">
        <Card pad title={<h2>Contatos por dia · esta semana</h2>} style={{ flex: '1 1 380px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 18, alignItems: 'end', height: 150, borderBottom: '1px solid #232826', position: 'relative' }}>
            {c.tC ? <div title={`Meta: ${Math.ceil(c.tC)}`} style={{ position: 'absolute', left: 0, right: 0, bottom: `${(c.tC / maxDay) * 100}%`, borderTop: '1px dashed #5A625E' }} /> : null}
            {c.days.map((d) => (
              <div key={d.d} title={`${d.n} contatos`} style={{ height: `${(d.n / maxDay) * 100}%`, background: 'var(--green)', borderRadius: '4px 4px 0 0', opacity: d.d === c.t ? 1 : d.d < c.t ? 0.85 : 0.3 }} />
            ))}
          </div>
          <div className="lbl" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 18, textAlign: 'center', marginTop: 8 }}>
            {c.days.map((d, i) => <span key={d.d} style={d.d === c.t ? { color: 'var(--tx)' } : undefined}>{d.d === c.t ? 'Hoje' : WEEK_S[i + 1]} {d.n}</span>)}
          </div>
          {c.tC ? <span className="lbl" style={{ display: 'block', marginTop: 8 }}>Tracejado = meta de {Math.ceil(c.tC)} por dia</span> : null}
        </Card>
        <Card pad title={<h2>Funil do mês</h2>} style={{ flex: '1 1 380px' }}>
          <Funnel steps={c.funnel} />
        </Card>
      </div>

      <div className="cols">
        <Card title="Scripts que mais convertem" style={{ flex: '1 1 380px' }}>
          <div className="tbl-wrap"><table className="tbl">
            <thead><tr><th>Mensagem</th><th className="r">Enviadas</th><th className="r">Respostas</th><th className="r">Taxa</th></tr></thead>
            <tbody>
              {c.scripts.map((s, i) => (
                <tr key={s.code}><td><span className="num">{s.code}</span> · {s.title}</td><td className="num r">{s.sent}</td><td className="num r">{s.rep}</td>
                  <td className="num r" style={{ color: i === 0 && s.sent >= 10 ? 'var(--green-tx)' : s.rate < 0.08 && s.sent >= 10 ? 'var(--red)' : undefined }}>{pctLabel(s.rep, s.sent)}</td></tr>
              ))}
              {!c.scripts.length ? <tr><td colSpan={4} className="lbl">Registre os contatos com o código da mensagem para medir.</td></tr> : null}
            </tbody>
          </table></div>
        </Card>
        <Card title="Reuniões passadas para o Diretor" action={<span className="lbl">a conversão conta para quem prospectou</span>} style={{ flex: '1 1 480px' }}>
          <div className="tbl-wrap"><table className="tbl">
            <thead><tr><th>Lead</th><th>Nicho</th><th>Passado em</th><th>Situação agora</th><th className="r">Valor</th></tr></thead>
            <tbody>
              {c.handoffs.map((l) => {
                const st = w.P.stage(l.stage_id)
                return (
                  <tr key={l.id}>
                    <td><Link to={`/erp/leads/${l.id}`} style={{ color: 'var(--tx)' }}>{l.company}</Link></td>
                    <td>{l.niche || '—'}</td>
                    <td className="num">{dm(l.handed_off_at)}</td>
                    <td><Badge kind={st?.kind === 'won' ? 'g' : st?.kind === 'lost' ? 'r' : 'y'}>{st?.name}{l.lost_reason ? ` · ${l.lost_reason.toLowerCase()}` : ''}</Badge></td>
                    <td className="num r">{l.estimated_value_cents ? brl0(l.estimated_value_cents) : '—'}</td>
                  </tr>
                )
              })}
              {!c.handoffs.length ? <tr><td colSpan={5} className="lbl">Nenhuma reunião passada ainda.</td></tr> : null}
            </tbody>
          </table></div>
        </Card>
      </div>
    </div>
  )
}
