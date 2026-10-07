import React, { useMemo, useState } from 'react'
import { useMeta, useErp } from '../components/Shell'
import { useAuth } from '../lib/auth'
import { useData, fetchRows, update, archive, notify } from '../lib/data'
import { today, addDays, startOfWeek, dm, WEEK_S, minutesLabel, localDay } from '../lib/format'
import { PageHead, Seg, Loading, ErrorBox, Drawer, Field, Select, AsyncButton, Empty, useConfirm } from '../components/ui'
import { TaskRow } from '../components/TaskRow'
import { rankTasks } from '../lib/insights'
import { TASK_STATUS, PRIORITIES, PRIORITY_CLASS, FRONTS, RECURRENCE, PRIORITY_ORDER } from '../lib/constants'

export default function Tarefas() {
  useMeta('Operação', 'Tarefas')
  const auth = useAuth()
  const erp = useErp()
  const [view, setView] = useState('lista')
  const [who, setWho] = useState(auth.isTotal('tarefas') ? '' : auth.uid)
  const [front, setFront] = useState('')
  const [project, setProject] = useState('')
  const [group, setGroup] = useState('status')
  const [showDone, setShowDone] = useState(false)
  const [open, setOpen] = useState(null)
  const [drag, setDrag] = useState(null)
  const [weekRef, setWeekRef] = useState(startOfWeek(today()))

  const { data, loading, error, reload } = useData(async () => {
    const [tasks, projects, time] = await Promise.all([
      fetchRows('tasks', { limit: 5000 }),
      fetchRows('projects', { select: 'id, name, due_on, client_id' }).catch(() => []),
      fetchRows('time_entries', { select: 'task_id, minutes', order: null }).catch(() => []),
    ])
    return { tasks, projects, time }
  }, ['tasks', 'projects', 'time_entries'])

  const list = useMemo(() => {
    if (!data) return []
    const since = addDays(today(), -14)
    return data.tasks.filter((x) => (!who || x.owner_id === who) && (!front || x.front === front) && (!project || x.project_id === project)
      && (showDone || x.status !== 'done' || (x.done_at && localDay(x.done_at) >= since)))
  }, [data, who, front, project, showDone])

  if (error) return <div className="page"><ErrorBox error={error} onRetry={reload} /></div>
  if (loading || !data) return <div className="page"><Loading rows={8} /></div>
  const t = today()
  const projectOf = (id) => data.projects.find((p) => p.id === id)
  const openN = list.filter((x) => x.status !== 'done').length
  const late = list.filter((x) => x.status !== 'done' && x.due_on && x.due_on < t).length
  const doneW = data.tasks.filter((x) => x.done_at && localDay(x.done_at) >= startOfWeek(t) && (!who || x.owner_id === who)).length

  const groups = (() => {
    const by = {
      status: (x) => [x.status, TASK_STATUS[x.status]],
      projeto: (x) => [x.project_id || 'none', projectOf(x.project_id)?.name || 'Sem projeto'],
      pessoa: (x) => [x.owner_id || 'none', auth.memberName(x.owner_id)],
      prioridade: (x) => [x.priority, PRIORITIES[x.priority]],
      prazo: (x) => (x.status === 'done' ? ['z', 'Feitas'] : !x.due_on ? ['y', 'Sem prazo'] : x.due_on < t ? ['a', 'Atrasadas'] : x.due_on === t ? ['b', 'Hoje'] : x.due_on <= addDays(t, 7) ? ['c', 'Próximos 7 dias'] : ['d', 'Depois']),
    }[group]
    const m = new Map()
    rankTasks(list, data).forEach((x) => { const [k, l] = by(x); if (!m.has(k)) m.set(k, { k, l, items: [] }); m.get(k).items.push(x) })
    const order = group === 'status' ? ['doing', 'todo', 'review', 'done'] : group === 'prioridade' ? Object.keys(PRIORITY_ORDER) : null
    return [...m.values()].sort((a, b) => (order ? order.indexOf(a.k) - order.indexOf(b.k) : a.k < b.k ? -1 : 1))
  })()

  const days = Array.from({ length: 7 }).map((_, i) => addDays(weekRef, i))

  return (
    <div className="page">
      <PageHead title="Tarefas" sub={`${openN} abertas · ${late} vencida(s) · ${doneW} concluída(s) nesta semana`}>
        <Seg value={view} onChange={setView} options={[['lista', 'Lista'], ['kanban', 'Kanban'], ['cal', 'Calendário']]} />
        <button type="button" className="btn p" onClick={() => erp.openQuick('task', { owner_id: who || auth.uid })}>Nova tarefa</button>
      </PageHead>

      <div className="row">
        {auth.isTotal('tarefas') ? <label className={`chip ${who ? 'on' : ''}`}>Responsável<select value={who} onChange={(e) => setWho(e.target.value)}><option value="">todos</option>{auth.members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label> : null}
        <label className={`chip ${front ? 'on' : ''}`}>Frente<select value={front} onChange={(e) => setFront(e.target.value)}><option value="">todas</option>{Object.entries(FRONTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
        <label className={`chip ${project ? 'on' : ''}`}>Projeto<select value={project} onChange={(e) => setProject(e.target.value)}><option value="">todos</option>{data.projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        {view === 'lista' ? <label className="chip on">Agrupar por<select value={group} onChange={(e) => setGroup(e.target.value)}><option value="status">status</option><option value="prazo">prazo</option><option value="projeto">projeto</option><option value="pessoa">pessoa</option><option value="prioridade">prioridade</option></select></label> : null}
        <label className="check"><input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} />Mostrar todas as concluídas</label>
      </div>

      {view === 'lista' ? (
        <div className="card" style={{ overflow: 'hidden' }}>
          {groups.map((g) => (
            <div key={g.k}>
              <div className="lbl" style={{ padding: '9px 16px', background: 'var(--s3)', borderTop: '1px solid var(--line-2)', fontWeight: 500, color: g.l === 'Atrasadas' ? 'var(--red)' : 'var(--tx-3)' }}>{g.l} · {g.items.length}</div>
              {g.items.map((x) => <TaskRow key={x.id} task={x} project={projectOf(x.project_id)} onOpen={setOpen} owner={!who ? auth.memberName(x.owner_id) : null} />)}
            </div>
          ))}
          {!list.length ? <Empty icon="check">Nenhuma tarefa com esses filtros.</Empty> : null}
        </div>
      ) : null}

      {view === 'kanban' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, alignItems: 'start' }}>
          {Object.entries(TASK_STATUS).map(([s, label]) => {
            const items = rankTasks(list.filter((x) => x.status === s), data)
            return (
              <section key={s} className="kcol" style={{ width: 'auto' }} onDragOver={(e) => e.preventDefault()} onDrop={() => { if (drag && drag.status !== s) update('tasks', drag.id, { status: s }); setDrag(null) }}>
                <div className="kcol-h"><h2>{label}</h2><span className="num lbl">{items.length}</span></div>
                {items.slice(0, s === 'done' ? 20 : 200).map((x) => (
                  <div key={x.id} className="kcard" draggable onDragStart={() => setDrag(x)} onClick={() => setOpen(x)} style={x.status === 'done' ? { color: 'var(--mut-2)' } : undefined}>
                    <span className={x.status === 'done' ? 'strike' : ''}>{x.title}</span>
                    <div className="row" style={{ justifyContent: 'space-between' }}>
                      <span className="lbl ellipsis" style={{ maxWidth: 150 }}>{projectOf(x.project_id)?.name || FRONTS[x.front]}</span>
                      <span className="row" style={{ gap: 6 }}>
                        {x.priority !== 'normal' && x.status !== 'done' ? <span className={PRIORITY_CLASS[x.priority]} style={{ height: 18, fontSize: 11 }}>{PRIORITIES[x.priority]}</span> : null}
                        {x.due_on ? <span className="num lbl" style={x.status !== 'done' && x.due_on < t ? { color: 'var(--red)' } : undefined}>{dm(x.due_on)}</span> : null}
                      </span>
                    </div>
                  </div>
                ))}
              </section>
            )
          })}
        </div>
      ) : null}

      {view === 'cal' ? (
        <div className="stack">
          <div className="row">
            <button type="button" className="btn s" onClick={() => setWeekRef(addDays(weekRef, -7))}>← Semana anterior</button>
            <button type="button" className="btn s" onClick={() => setWeekRef(startOfWeek(today()))}>Esta semana</button>
            <button type="button" className="btn s" onClick={() => setWeekRef(addDays(weekRef, 7))}>Próxima →</button>
            <span className="lbl">Arraste uma tarefa para outro dia para mudar o prazo.</span>
          </div>
          <div className="card tbl-wrap">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(150px, 1fr))', minWidth: 1050 }}>
              {days.map((d, i) => {
                const items = list.filter((x) => x.due_on === d)
                return (
                  <div key={d} onDragOver={(e) => e.preventDefault()} onDrop={() => { if (drag && drag.due_on !== d) update('tasks', drag.id, { due_on: d }); setDrag(null) }}
                    style={{ borderRight: i < 6 ? '1px solid #1A1E1C' : 0, minHeight: 440, background: d === t ? '#0D110E' : undefined }}>
                    <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--line)', fontSize: 12, color: d === t ? 'var(--green-tx)' : 'var(--mut)', fontWeight: d === t ? 600 : 400 }}>
                      {WEEK_S[(i + 1) % 7]} {d.slice(8)}/{d.slice(5, 7)}{d === t ? ' · hoje' : ''}
                    </div>
                    <div className="stack-s" style={{ padding: 8 }}>
                      {items.map((x) => (
                        <div key={x.id} draggable onDragStart={() => setDrag(x)} onClick={() => setOpen(x)} className={x.status === 'done' ? 'strike' : ''}
                          style={{ padding: '6px 8px', borderRadius: 6, fontSize: 12, background: '#1C211E', cursor: 'grab', borderLeft: `2px solid ${x.priority === 'urgente' ? '#E5484D' : x.priority === 'alta' ? 'var(--org)' : 'transparent'}` }}>
                          {x.title}{projectOf(x.project_id) ? <span className="lbl" style={{ display: 'block', fontSize: 11 }}>{projectOf(x.project_id).name}</span> : null}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      ) : null}

      {open ? <TaskDrawer task={data.tasks.find((x) => x.id === open.id) || open} projects={data.projects} minutes={data.time.filter((e) => e.task_id === open.id).reduce((a, e) => a + (e.minutes || 0), 0)} onClose={() => setOpen(null)} /> : null}
    </div>
  )
}

function TaskDrawer({ task, projects, minutes, onClose }) {
  const auth = useAuth()
  const confirm = useConfirm()
  const [f, setF] = useState({ ...task })
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }))
  const save = async () => {
    const keys = ['title', 'description', 'status', 'priority', 'due_on', 'front', 'project_id', 'recurrence', 'owner_id', 'est_minutes']
    await update('tasks', task.id, Object.fromEntries(keys.map((k) => [k, f[k] === '' ? null : f[k]])))
    notify('Tarefa salva.', 'ok'); onClose()
  }
  return (
    <Drawer title="Tarefa" onClose={onClose} footer={<>
      <button type="button" className="btn g" onClick={async () => { if (await confirm('Arquivar esta tarefa?', { ok: 'Arquivar', danger: true })) { await archive('tasks', task.id); onClose() } }}>Arquivar</button>
      <span className="grow" />
      <button type="button" className="btn" onClick={onClose}>Cancelar</button>
      <AsyncButton className="btn p" onClick={save}>Salvar</AsyncButton>
    </>}>
      <Field label="Título"><input className="in" value={f.title} onChange={(e) => set('title')(e.target.value)} /></Field>
      <div className="fields">
        <Field label="Status"><Select value={f.status} onChange={set('status')} options={TASK_STATUS} /></Field>
        <Field label="Prioridade"><Select value={f.priority} onChange={set('priority')} options={PRIORITIES} /></Field>
        <Field label="Prazo"><input type="date" className="in" value={f.due_on || ''} onChange={(e) => set('due_on')(e.target.value)} /></Field>
        <Field label="Repetir"><Select value={f.recurrence} onChange={set('recurrence')} options={RECURRENCE} /></Field>
        <Field label="Frente"><Select value={f.front} onChange={set('front')} options={FRONTS} /></Field>
        <Field label="Projeto"><Select value={f.project_id} onChange={set('project_id')} placeholder="nenhum" options={projects.map((p) => [p.id, p.name])} /></Field>
        {auth.isTotal('tarefas') ? <Field label="Responsável"><Select value={f.owner_id} onChange={set('owner_id')} options={auth.members.map((m) => [m.id, m.name])} /></Field> : null}
        <Field label="Estimativa (min)"><input className="in num" value={f.est_minutes || ''} onChange={(e) => set('est_minutes')(e.target.value.replace(/\D/g, '') || null)} /></Field>
      </div>
      <Field label="Descrição"><textarea className="ta" rows={6} value={f.description || ''} onChange={(e) => set('description')(e.target.value)} /></Field>
      <span className="lbl">Tempo registrado: <span className="num">{minutesLabel(minutes)}</span>{f.recurrence !== 'none' ? ' · ao concluir, a próxima ocorrência é criada sozinha' : ''}</span>
    </Drawer>
  )
}
