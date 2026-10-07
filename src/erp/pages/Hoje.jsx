import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMeta, useErp } from '../components/Shell'
import { useAuth } from '../lib/auth'
import { useWorld, metricValue, periodRange, weekdayCount } from '../lib/world'
import { buildInsights, buildBriefing, rankTasks } from '../lib/insights'
import { insert, updateWhere, notify } from '../lib/data'
import { today, addDays, longToday, hm, startOfWeek, WEEK_S, dm, waLink, fillTemplate, igHandle, brl0, localDay } from '../lib/format'
import { PageHead, Card, Seg, Loading, ErrorBox, Bar, AsyncButton } from '../components/ui'
import { TaskRow } from '../components/TaskRow'
import { METRICS, MONEY_METRICS } from '../lib/constants'
import { Icon } from '../lib/icons'

// "Ligar pro cliente amanhã !" -> {title, due_on, priority}
function parseQuick(text) {
  let t = text.trim(), due = today(), priority = 'normal'
  if (/\s!$|^!/.test(t)) { priority = 'urgente'; t = t.replace(/\s?!$/, '').replace(/^!\s?/, '') }
  const map = [[/\bamanh[ãa]\b/i, 1], [/\bdepois de amanh[ãa]\b/i, 2], [/\bsemana que vem\b/i, 7], [/\bhoje\b/i, 0]]
  for (const [re, d] of map) if (re.test(t)) { due = addDays(today(), d); t = t.replace(re, '').trim(); break }
  const m = t.match(/\bdia (\d{1,2})(?:\/(\d{1,2}))?\b/i)
  if (m) {
    const now = new Date()
    const mm = m[2] ? Number(m[2]) : (Number(m[1]) < now.getDate() ? now.getMonth() + 2 : now.getMonth() + 1)
    due = `${now.getFullYear()}-${String(mm).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}`
    t = t.replace(m[0], '').trim()
  }
  return { title: t.replace(/\s{2,}/g, ' '), due_on: due, priority }
}

export default function Hoje() {
  useMeta('Visão', 'Hoje')
  const auth = useAuth()
  const erp = useErp()
  const [view, setView] = useState('day')
  const [quick, setQuick] = useState('')
  const { data: w, loading, error, reload } = useWorld()

  const c = useMemo(() => {
    if (!w) return null
    const t = today()
    const ctx = { uid: auth.uid, isDirector: auth.isDirector, canSee: auth.canSee, memberName: auth.memberName }
    const insights = buildInsights(w, ctx)
    const brief = buildBriefing(w, ctx, insights)
    const mine = w.tasks.filter((x) => x.owner_id === auth.uid)
    const todayT = mine.filter((x) => x.due_on === t || (x.status === 'done' && localDay(x.done_at) === t && (!x.due_on || x.due_on <= t)))
    const late = mine.filter((x) => x.status !== 'done' && x.due_on && x.due_on < t)
    const noDate = mine.filter((x) => x.status !== 'done' && !x.due_on).slice(0, 5)
    const next = rankTasks(mine.filter((x) => x.status !== 'done' && (!x.due_on || x.due_on <= addDays(t, 1))), w).slice(0, 3)
    const meetings = w.meetings.filter((m) => localDay(m.starts_at) === t && (m.owner_id === auth.uid || auth.isDirector))
    const follow = w.leads.filter((l) => !l.archived_at && w.P.stage(l.stage_id)?.kind === 'open' && l.next_step_at && l.next_step_at <= t
      && (l.owner_id === auth.uid || (!l.owner_id && auth.isDirector)))
    const myGoals = w.goals.filter((g) => !g.archived_at && g.user_id === auth.uid)
    const daily = myGoals.map((g) => {
      const [from, to] = periodRange(g.period, t)
      const days = g.period === 'day' ? 1 : weekdayCount(from, to) || 1
      return { g, target: Number(g.target) / days, done: metricValue(w, g.metric, auth.uid, t, t) }
    })
    const week = []
    for (let i = 0; i < 7; i++) {
      const d = addDays(startOfWeek(t), i)
      week.push({ d, tasks: mine.filter((x) => x.due_on === d), meetings: w.meetings.filter((m) => localDay(m.starts_at) === d && (m.owner_id === auth.uid || auth.isDirector)) })
    }
    const playbook = (code) => w.playbooks.find((p) => p.code === code)
    return { t, insights, brief, todayT, late, noDate, next, meetings, follow, daily, week, playbook }
  }, [w, auth])

  if (error) return <div className="page"><ErrorBox error={error} onRetry={reload} /></div>
  if (loading || !c) return <div className="page"><Loading rows={6} /></div>

  const projectOf = (id) => w.projects.find((p) => p.id === id)
  const addQuick = async () => {
    const p = parseQuick(quick)
    if (!p.title) return
    await insert('tasks', { ...p, owner_id: auth.uid })
    setQuick('')
    notify(`Tarefa criada para ${p.due_on === today() ? 'hoje' : dm(p.due_on)}.`, 'ok')
  }
  const rescheduleAll = async () => {
    await updateWhere('tasks', (q) => q.in('id', c.late.map((x) => x.id)), { due_on: today() })
    notify('Atrasadas movidas para hoje.', 'ok')
  }
  const doneCount = c.todayT.filter((x) => x.status === 'done').length

  return (
    <div className="page">
      <PageHead title={longToday()} sub={c.brief.summary}>
        <Seg value={view} onChange={setView} options={[['day', 'Hoje'], ['week', 'Semana']]} />
      </PageHead>

      {c.brief.focus.length ? (
        <div className="note info row" style={{ alignItems: 'flex-start', gap: 12 }}>
          <Icon name="spark" />
          <div className="stack-s grow">
            <b style={{ fontWeight: 600, fontSize: 13 }}>Prioridades que o sistema encontrou</b>
            {c.brief.focus.map((f) => <span key={f} style={{ fontSize: 13, color: 'var(--tx-2)' }}>· {f}</span>)}
          </div>
          <Link to="/erp/inteligencia" className="btn s">Ver todas</Link>
        </div>
      ) : null}

      {view === 'week' ? (
        <div className="card tbl-wrap">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(150px, 1fr))', minWidth: 1050 }}>
            {c.week.map((d, i) => (
              <div key={d.d} style={{ borderRight: i < 6 ? '1px solid #1A1E1C' : 0, minHeight: 420, background: d.d === c.t ? '#0D110E' : undefined }}>
                <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--line)', fontSize: 12, fontWeight: d.d === c.t ? 600 : 400, color: d.d === c.t ? 'var(--green-tx)' : 'var(--mut)' }}>
                  {WEEK_S[i === 6 ? 0 : i + 1]} {d.d.slice(8)}{d.d === c.t ? ' · hoje' : ''}
                </div>
                <div className="stack-s" style={{ padding: 8 }}>
                  {d.meetings.map((m) => (
                    <Link key={m.id} to={`/erp/reunioes?id=${m.id}`} style={{ padding: '6px 8px', borderRadius: 6, fontSize: 12, background: 'var(--blue-bg)', border: '1px solid var(--blue-ln)', color: 'var(--tx)' }}>
                      {hm(m.starts_at)} {m.title}
                    </Link>
                  ))}
                  {d.tasks.map((x) => (
                    <div key={x.id} className={x.status === 'done' ? 'strike' : ''} style={{ padding: '6px 8px', borderRadius: 6, fontSize: 12, background: '#1C211E' }}>{x.title}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="cols">
          <div className="stack" style={{ flex: '2 1 520px', minWidth: 0, gap: 16 }}>
            {c.next.length ? (
              <Card title={<h2>Faça agora</h2>} action={<span className="lbl">ordenado por prazo, prioridade e impacto</span>}>
                {c.next.map((x) => <TaskRow key={x.id} task={x} project={projectOf(x.project_id)} />)}
              </Card>
            ) : null}

            <section className="card">
              <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="row" style={{ justifyContent: 'space-between' }}><h2>Tarefas de hoje</h2><span className="lbl num">{doneCount} de {c.todayT.length} feitas</span></div>
                <label><span className="sr">Nova tarefa</span>
                  <input className="in" style={{ height: 36 }} value={quick} onChange={(e) => setQuick(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addQuick() }}
                    placeholder='Adicionar tarefa… ex.: "Ligar para a Juliana amanhã !"' />
                </label>
              </div>
              {c.todayT.sort((a, b) => (a.status === 'done') - (b.status === 'done')).map((x) => <TaskRow key={x.id} task={x} project={projectOf(x.project_id)} />)}
              {!c.todayT.length ? <div className="empty">Nenhuma tarefa com prazo para hoje.</div> : null}
            </section>

            {c.late.length ? (
              <section className="card" style={{ borderColor: '#3A1A1C' }}>
                <div className="card-h"><h2 style={{ color: 'var(--red)' }}>Atrasadas ({c.late.length})</h2><AsyncButton className="btn s" onClick={rescheduleAll}>Reagendar todas para hoje</AsyncButton></div>
                {c.late.map((x) => <TaskRow key={x.id} task={x} project={projectOf(x.project_id)} />)}
              </section>
            ) : null}

            {c.noDate.length ? (
              <Card title="Sem prazo">
                {c.noDate.map((x) => <TaskRow key={x.id} task={x} project={projectOf(x.project_id)} />)}
              </Card>
            ) : null}
          </div>

          <div className="stack" style={{ flex: '1 1 300px', minWidth: 0, gap: 16 }}>
            <Card pad title={<h2>Agenda</h2>} action={<button type="button" className="btn s" onClick={() => erp.openQuick('meeting')}>Agendar</button>}>
              <div style={{ display: 'grid', gridTemplateColumns: '52px 1fr', gap: 10 }}>
                {c.meetings.map((m) => (
                  <React.Fragment key={m.id}>
                    <span className="num lbl" style={{ paddingTop: 8 }}>{hm(m.starts_at)}</span>
                    <Link to={`/erp/reunioes?id=${m.id}`} style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '8px 10px', borderRadius: 8,
                      background: m.type === 'prospeccao' ? 'var(--green-bg)' : 'var(--blue-bg)', border: `1px solid ${m.type === 'prospeccao' ? 'var(--green-ln)' : 'var(--blue-ln)'}`, color: 'var(--tx)' }}>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{m.title}</span>
                      <span className="lbl">{[m.participants, m.location, `${m.duration_min} min`].filter(Boolean).join(' · ')}</span>
                    </Link>
                  </React.Fragment>
                ))}
              </div>
              {!c.meetings.length ? <p className="lbl">Sem reuniões hoje.</p> : null}
            </Card>

            {auth.canSee('crm') ? (
              <Card pad title={<h2>Follow-ups de hoje</h2>} action={<Link to="/erp/prospeccao" style={{ fontSize: 12 }}>Abrir sessão</Link>}>
                <div className="stack-s" style={{ gap: 10 }}>
                  {c.follow.slice(0, 6).map((l) => {
                    const pb = c.playbook(l.next_step_code)
                    const msg = pb ? fillTemplate(pb.body, { EMPRESA: l.company, NICHO: (l.niche || '').toLowerCase(), BAIRRO: l.neighborhood, NOME: '' }) : ''
                    const wa = waLink(l.phone, msg)
                    return (
                      <div key={l.id} className="row" style={{ flexWrap: 'nowrap', fontSize: 13 }}>
                        <Link to={`/erp/leads/${l.id}`} className="grow ellipsis" style={{ color: 'var(--tx)' }}>{l.company}</Link>
                        <span className="lbl num">{l.next_step_code || ''}</span>
                        {l.next_step_at < c.t ? <span className="lbl" style={{ color: 'var(--red)' }}>atrasado</span> : null}
                        {wa ? <a className="btn s" href={wa}>WhatsApp</a> : l.instagram ? <span className="lbl">{igHandle(l.instagram)}</span> : null}
                      </div>
                    )
                  })}
                  {c.follow.length > 6 ? <span className="lbl">+ {c.follow.length - 6} na fila</span> : null}
                  {!c.follow.length ? <span className="lbl">Nenhum follow-up para hoje.</span> : null}
                </div>
              </Card>
            ) : null}

            {c.daily.length ? (
              <Card pad title={<h2>Meta do dia</h2>} action={<Link to="/erp/metas" style={{ fontSize: 12 }}>Metas</Link>}>
                <div className="stack" style={{ gap: 12 }}>
                  {c.daily.map(({ g, target, done }) => {
                    const money = MONEY_METRICS.has(g.metric)
                    return (
                      <div key={g.id} className="stack-s">
                        <div className="row" style={{ justifyContent: 'space-between', fontSize: 13 }}>
                          <span>{METRICS[g.metric]}</span>
                          <span className="num">{money ? brl0(done) : done} / {money ? brl0(target) : Math.ceil(target)}</span>
                        </div>
                        <Bar value={target ? (done / target) * 100 : 0} />
                      </div>
                    )
                  })}
                </div>
              </Card>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}
