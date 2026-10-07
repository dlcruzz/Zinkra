import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMeta } from '../components/Shell'
import { useAuth } from '../lib/auth'
import { useData, fetchRows, update, notify } from '../lib/data'
import { brl0, dm, today, daysFromToday } from '../lib/format'
import { PageHead, Seg, Loading, ErrorBox, Badge, Select, Empty } from '../components/ui'
import { PROJECT_STAGES, PROJECT_STAGE_CLASS, FRONTS } from '../lib/constants'
import { NewProject } from './Clientes'

const OPEN = new Set(['briefing', 'design', 'desenvolvimento', 'revisao', 'ajustes'])

export default function Projetos() {
  useMeta('Operação', 'Projetos')
  const auth = useAuth()
  const nav = useNavigate()
  const [view, setView] = useState('kanban')
  const [front, setFront] = useState('')
  const [showDone, setShowDone] = useState(false)
  const [creating, setCreating] = useState(false)
  const [drag, setDrag] = useState(null)

  const { data, loading, error, reload } = useData(async () => {
    const [projects, tasks, clients, time] = await Promise.all([
      fetchRows('projects'),
      fetchRows('tasks', { select: 'id, project_id, status, due_on', limit: 5000 }),
      fetchRows('clients', { select: 'id, name' }).catch(() => []),
      fetchRows('time_entries', { select: 'project_id, task_id, minutes', order: null }).catch(() => []),
    ])
    return { projects, tasks, clients, time }
  }, ['projects', 'tasks', 'time_entries'])

  const rows = useMemo(() => {
    if (!data) return []
    return data.projects.filter((p) => (!front || p.front === front) && (auth.isTotal('projetos') || p.owner_id === auth.uid)).map((p) => {
      const ts = data.tasks.filter((x) => x.project_id === p.id)
      const done = ts.filter((x) => x.status === 'done').length
      const taskIds = new Set(ts.map((x) => x.id))
      const mins = data.time.filter((e) => e.project_id === p.id || taskIds.has(e.task_id)).reduce((a, e) => a + (e.minutes || 0), 0)
      return { ...p, total: ts.length, done, mins, client: data.clients.find((c) => c.id === p.client_id)?.name || 'Interno' }
    })
  }, [data, front, auth])

  if (error) return <div className="page"><ErrorBox error={error} onRetry={reload} /></div>
  if (loading || !data) return <div className="page"><Loading rows={6} /></div>
  const t = today()
  const active = rows.filter((p) => OPEN.has(p.stage))
  const late = active.filter((p) => p.due_on && p.due_on < t)
  const week = active.filter((p) => p.due_on && daysFromToday(p.due_on) >= 0 && daysFromToday(p.due_on) <= 7)
  const stages = Object.keys(PROJECT_STAGES).filter((s) => showDone || s !== 'entregue')

  const card = (p) => {
    const lateP = p.due_on && p.due_on < t && OPEN.has(p.stage)
    return (
      <div key={p.id} className="kcard" draggable={auth.canEdit('projetos')} onDragStart={() => setDrag(p)} onDragEnd={() => setDrag(null)}
        onClick={() => nav(`/erp/projetos/${p.id}`)} role="link" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') nav(`/erp/projetos/${p.id}`) }}>
        <div className="stack-s" style={{ gap: 3 }}><span style={{ fontWeight: 500 }}>{p.name}</span><span className="lbl">{p.client}</span></div>
        <div className="row" style={{ gap: 6 }}>{p.type ? <span className="tagx">{p.type}</span> : null}<span className="tagx num">{p.value_cents ? brl0(p.value_cents) : FRONTS[p.front]}</span></div>
        <div className="stack-s" style={{ gap: 5 }}>
          <div className="row lbl" style={{ justifyContent: 'space-between' }}><span>{p.done} de {p.total} tarefas</span>
            <span className="num" style={lateP ? { color: 'var(--red)' } : undefined}>{p.stage === 'entregue' ? `entregue ${dm(p.delivered_on)}` : p.due_on ? (lateP ? `atrasado ${-daysFromToday(p.due_on)}d` : `prazo ${dm(p.due_on)}`) : 'sem prazo'}</span></div>
          <div className="bar" style={{ height: 4 }}><i style={{ width: `${p.total ? (p.done / p.total) * 100 : 0}%` }} /></div>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <PageHead title="Projetos" sub={`${active.length} ativos · ${late.length} atrasado(s) · ${week.length} entrega(s) nos próximos 7 dias`}>
        <Seg value={view} onChange={setView} options={[['kanban', 'Kanban'], ['list', 'Lista'], ['timeline', 'Linha do tempo']]} />
        <Select value={front} onChange={(v) => setFront(v || '')} placeholder="Todas as frentes" options={FRONTS} style={{ width: 170 }} />
        <label className="check"><input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} />Mostrar entregues</label>
        {auth.canEdit('projetos') ? <button type="button" className="btn p" onClick={() => setCreating(true)}>Novo projeto</button> : null}
      </PageHead>

      {view === 'kanban' ? (
        <div className="kanban"><div className="kanban-in">
          {stages.map((s) => {
            const list = rows.filter((p) => p.stage === s)
            return (
              <section key={s} className="kcol" style={{ width: 256 }} onDragOver={(e) => e.preventDefault()}
                onDrop={async () => {
                  if (!drag || drag.stage === s) return
                  await update('projects', drag.id, { stage: s, ...(s === 'entregue' ? { delivered_on: today() } : {}) })
                  if (s === 'entregue') notify('Projeto entregue. A inteligência vai sugerir upsell e pedido de indicação.', 'ok')
                }}>
                <div className="kcol-h"><h2>{PROJECT_STAGES[s]}</h2><span className="num lbl">{list.length}</span></div>
                {list.map(card)}
              </section>
            )
          })}
        </div></div>
      ) : null}

      {view === 'list' ? (
        <div className="card tbl-wrap"><table className="tbl">
          <thead><tr><th>Projeto</th><th>Cliente</th><th>Etapa</th><th>Responsável</th><th className="r">Tarefas</th><th className="r">Horas</th><th className="r">Valor</th><th>Prazo</th></tr></thead>
          <tbody>
            {rows.filter((p) => showDone || p.stage !== 'entregue').sort((a, b) => (a.due_on || '9') < (b.due_on || '9') ? -1 : 1).map((p) => (
              <tr key={p.id} className="click" onClick={() => nav(`/erp/projetos/${p.id}`)}>
                <td style={{ fontWeight: 500 }}>{p.name}</td><td>{p.client}</td>
                <td><Badge kind={PROJECT_STAGE_CLASS[p.stage]}>{PROJECT_STAGES[p.stage]}</Badge></td>
                <td>{auth.memberName(p.owner_id)}</td>
                <td className="num r">{p.done}/{p.total}</td>
                <td className="num r" style={p.est_hours && p.mins / 60 > p.est_hours ? { color: 'var(--yel)' } : undefined}>{Math.round(p.mins / 60)}h{p.est_hours ? ` / ${p.est_hours}h` : ''}</td>
                <td className="num r">{p.value_cents ? brl0(p.value_cents) : '—'}</td>
                <td className="num" style={p.due_on && p.due_on < t && OPEN.has(p.stage) ? { color: 'var(--red)' } : undefined}>{p.due_on ? dm(p.due_on) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
      ) : null}

      {view === 'timeline' ? <Timeline rows={active.filter((p) => p.starts_on && p.due_on)} onOpen={(id) => nav(`/erp/projetos/${id}`)} /> : null}
      {!rows.length ? <Empty icon="folder">Nenhum projeto. Eles nascem quando uma proposta é aceita, ou crie um aqui.</Empty> : null}
      {creating ? <NewProject onClose={() => setCreating(false)} onSaved={(p) => nav(`/erp/projetos/${p.id}`)} /> : null}
    </div>
  )
}

function Timeline({ rows, onOpen }) {
  if (!rows.length) return <div className="card"><Empty icon="cal">Projetos ativos com início e prazo aparecem aqui.</Empty></div>
  const t = today()
  const toN = (d) => Date.parse(d + 'T12:00:00') / 864e5
  const lo = Math.min(toN(t) - 7, ...rows.map((p) => toN(p.starts_on)))
  const hi = Math.max(toN(t) + 14, ...rows.map((p) => toN(p.due_on)))
  const x = (d) => ((toN(d) - lo) / (hi - lo)) * 100
  const weeks = []
  for (let n = lo; n <= hi; n += 7) weeks.push(new Date(n * 864e5).toISOString().slice(0, 10))
  return (
    <div className="card" style={{ padding: 18, overflowX: 'auto' }}>
      <div style={{ minWidth: 760 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 12 }}>
          <span />
          <div style={{ position: 'relative', height: 22 }}>
            {weeks.map((w) => <span key={w} className="lbl num" style={{ position: 'absolute', left: `${x(w)}%`, fontSize: 11 }}>{dm(w)}</span>)}
          </div>
          {rows.sort((a, b) => a.due_on.localeCompare(b.due_on)).map((p) => {
            const late = p.due_on < t
            return (
              <React.Fragment key={p.id}>
                <button type="button" className="ellipsis" onClick={() => onOpen(p.id)} style={{ background: 'none', border: 0, color: 'var(--tx)', textAlign: 'left', font: 'inherit', fontSize: 13, cursor: 'pointer', padding: 0 }}>{p.name}</button>
                <div style={{ position: 'relative', height: 26, borderBottom: '1px solid var(--line-2)' }}>
                  <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${x(t)}%`, borderLeft: '1px dashed var(--green)' }} />
                  <div title={`${dm(p.starts_on)} a ${dm(p.due_on)}`} style={{ position: 'absolute', top: 6, height: 14, borderRadius: 7, left: `${x(p.starts_on)}%`, width: `${Math.max(1, x(p.due_on) - x(p.starts_on))}%`,
                    background: late ? 'var(--red-bg)' : 'var(--green-bg)', border: `1px solid ${late ? 'var(--red-ln)' : 'var(--green-ln)'}` }}>
                    <div style={{ height: '100%', width: `${p.total ? (p.done / p.total) * 100 : 0}%`, background: late ? '#E5484D' : 'var(--green)', borderRadius: 7, opacity: 0.6 }} />
                  </div>
                </div>
              </React.Fragment>
            )
          })}
        </div>
        <p className="lbl" style={{ marginTop: 10 }}>Tracejado verde = hoje. O preenchimento da barra é o % de tarefas concluídas.</p>
      </div>
    </div>
  )
}
