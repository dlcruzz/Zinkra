import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMeta, useErp } from '../components/Shell'
import { useAuth } from '../lib/auth'
import { useData, fetchRows, fetchOne, insert, update, remove, archive, notify } from '../lib/data'
import { startTimer, stopTimer } from '../lib/automations'
import { brl0, dm, dmy, today, daysFromToday, minutesLabel, hoursLabel } from '../lib/format'
import { PageHead, Card, Tabs, Loading, ErrorBox, Badge, Field, Select, MoneyInput, AsyncButton, Bar, useConfirm } from '../components/ui'
import { TaskRow } from '../components/TaskRow'
import { PROJECT_STAGES, PROJECT_STAGE_CLASS, FRONTS, MEETING_TYPES } from '../lib/constants'
import { Icon } from '../lib/icons'

export default function ProjetoDetalhe() {
  const { id } = useParams()
  const auth = useAuth()
  const erp = useErp()
  const nav = useNavigate()
  const confirm = useConfirm()
  const [tab, setTab] = useState('geral')

  const { data, loading, error, reload } = useData(async () => {
    const p = await fetchOne('projects', id)
    if (!p) return { p: null }
    const [tasks, checklist, milestones, meetings, client, time] = await Promise.all([
      fetchRows('tasks', { where: (q) => q.eq('project_id', id), order: 'sort', ascending: true }),
      fetchRows('project_checklist', { where: (q) => q.eq('project_id', id), order: 'sort', ascending: true }),
      fetchRows('milestones', { where: (q) => q.eq('project_id', id), order: 'sort', ascending: true }),
      fetchRows('meetings', { where: (q) => q.eq('project_id', id), order: 'starts_at' }).catch(() => []),
      p.client_id ? fetchOne('clients', p.client_id).catch(() => null) : null,
      fetchRows('time_entries', { order: 'started_at' }).catch(() => []),
    ])
    const tids = new Set(tasks.map((x) => x.id))
    return { p, tasks, checklist, milestones, meetings, client, time: time.filter((e) => e.project_id === id || tids.has(e.task_id)) }
  }, ['projects', 'tasks', 'project_checklist', 'milestones', 'time_entries', 'meetings'], [id])

  useMeta('Operação / Projetos', data?.p?.name || 'Projeto')
  if (error) return <div className="page"><ErrorBox error={error} onRetry={reload} /></div>
  if (loading || !data) return <div className="page"><Loading rows={8} /></div>
  if (!data.p) return <div className="page"><div className="empty">Projeto não encontrado. <Link to="/erp/projetos">Voltar</Link></div></div>

  const { p, tasks, checklist, milestones, meetings, client, time } = data
  const canEdit = auth.isTotal('projetos') || p.owner_id === auth.uid
  const done = tasks.filter((x) => x.status === 'done').length
  const mins = time.reduce((a, e) => a + (e.minutes || 0), 0)
  const due = p.due_on ? daysFromToday(p.due_on) : null
  const running = erp.timer?.entry && (erp.timer.entry.project_id === p.id || tasks.some((x) => x.id === erp.timer.entry.task_id))

  return (
    <div className="page">
      <Link to="/erp/projetos" className="lbl" style={{ color: 'var(--mut)' }}>← Voltar para projetos</Link>
      <PageHead title={<span className="row" style={{ gap: 10 }}>{p.name} <Badge kind={PROJECT_STAGE_CLASS[p.stage]}>{PROJECT_STAGES[p.stage]}</Badge></span>}
        sub={<>{client ? <>Cliente: <Link to={`/erp/clientes?id=${client.id}`}>{client.name}</Link> · </> : 'Interno · '}{p.type || FRONTS[p.front]}{p.value_cents ? ` · ${brl0(p.value_cents)}` : ''} · responsável {auth.memberName(p.owner_id)}{p.due_on ? ` · prazo ${dm(p.due_on)} (${due < 0 ? `${-due} dias atrasado` : due === 0 ? 'hoje' : `faltam ${due} dias`})` : ''}</>}>
        {canEdit ? (
          <button type="button" className="btn" onClick={() => (running ? stopTimer(erp.timer.entry) : startTimer({ project_id: p.id, note: p.name }))}>
            <Icon name={running ? 'stop' : 'play'} size={13} />{running ? 'Parar cronômetro' : 'Iniciar cronômetro'}
          </button>
        ) : null}
        {canEdit ? <Select value={p.stage} onChange={(v) => update('projects', p.id, { stage: v, ...(v === 'entregue' ? { delivered_on: today() } : {}) })} options={PROJECT_STAGES} style={{ width: 180 }} aria-label="Etapa" /> : null}
        {canEdit ? <button type="button" className="btn p" onClick={() => erp.openQuick('task', { project_id: p.id, client_id: p.client_id, front: p.front, owner_id: p.owner_id })}>Nova tarefa</button> : null}
      </PageHead>

      <Tabs value={tab} onChange={setTab} options={[['geral', 'Visão geral'], ['tarefas', 'Tarefas', tasks.length], ['marcos', 'Marcos', milestones.length], ['horas', 'Horas'], ['reunioes', 'Reuniões', meetings.length], ['notas', 'Notas']]} />

      {tab === 'geral' ? (
        <div className="cols">
          <div className="stack" style={{ flex: '2 1 480px', minWidth: 0, gap: 16 }}>
            <Scope p={p} canEdit={canEdit} />
            <Checklist p={p} items={checklist} canEdit={canEdit} />
          </div>
          <div className="stack" style={{ flex: '1 1 300px', minWidth: 0, gap: 16 }}>
            <Card pad title={<h2>Andamento</h2>}>
              <div className="stack">
                <div className="stack-s"><div className="row" style={{ justifyContent: 'space-between', fontSize: 13 }}><span>Tarefas</span><span className="num">{done} / {tasks.length}</span></div><Bar large value={tasks.length ? (done / tasks.length) * 100 : 0} /></div>
                <div className="stack-s"><div className="row" style={{ justifyContent: 'space-between', fontSize: 13 }}><span>Horas</span><span className="num">{hoursLabel(mins)}{p.est_hours ? ` / ${p.est_hours}h estimadas` : ''}</span></div>
                  {p.est_hours ? <Bar large value={(mins / 60 / p.est_hours) * 100} className={mins / 60 > p.est_hours ? 'd' : mins / 60 > p.est_hours * 0.8 ? 'w' : ''} /> : null}</div>
                {p.value_cents && mins ? <span className="lbl">Valor por hora até agora: <span className="num" style={{ color: 'var(--tx)' }}>{brl0((p.value_cents / mins) * 60)}</span></span> : null}
              </div>
            </Card>
            <Links p={p} canEdit={canEdit} />
            <Card pad title={<h2>Dados</h2>}><Meta p={p} canEdit={canEdit} /></Card>
            {auth.isTotal('projetos') ? <button type="button" className="btn s g" style={{ width: 'max-content' }} onClick={async () => { if (await confirm('Arquivar este projeto e esconder suas tarefas?', { ok: 'Arquivar', danger: true })) { await archive('projects', p.id); nav('/erp/projetos') } }}><Icon name="trash" size={13} />Arquivar projeto</button> : null}
          </div>
        </div>
      ) : null}

      {tab === 'tarefas' ? (
        <Card>
          {['doing', 'todo', 'review', 'done'].map((s) => {
            const list = tasks.filter((x) => x.status === s)
            if (!list.length) return null
            return (
              <div key={s}>
                <div className="lbl" style={{ padding: '10px 16px', background: 'var(--s3)' }}>{{ doing: 'Fazendo', todo: 'A fazer', review: 'Revisão', done: 'Feito' }[s]} · {list.length}</div>
                {list.sort((a, b) => (a.due_on || '9') < (b.due_on || '9') ? -1 : 1).map((x) => <TaskRow key={x.id} task={x} showProject={false} owner={auth.memberName(x.owner_id)} />)}
              </div>
            )
          })}
          {!tasks.length ? <div className="empty">Nenhuma tarefa.</div> : null}
        </Card>
      ) : null}

      {tab === 'marcos' ? <Milestones p={p} items={milestones} canEdit={canEdit} /> : null}

      {tab === 'horas' ? (
        <Card>
          <div className="tbl-wrap"><table className="tbl">
            <thead><tr><th>Data</th><th>Tarefa</th><th>Pessoa</th><th className="r">Duração</th></tr></thead>
            <tbody>
              {time.map((e) => (
                <tr key={e.id}><td className="num">{dm(e.started_at)}</td><td>{tasks.find((x) => x.id === e.task_id)?.title || e.note || '—'}</td><td>{auth.memberName(e.owner_id)}</td>
                  <td className="num r">{e.ended_at ? minutesLabel(e.minutes) : <span className="ok">rodando</span>}</td></tr>
              ))}
              {!time.length ? <tr><td colSpan={4} className="lbl">Nenhuma hora registrada. Use ▶ nas tarefas ou o botão de cronômetro do projeto.</td></tr> : null}
            </tbody>
          </table></div>
          <div className="tbl-foot"><span>Total</span><span className="num">{minutesLabel(mins)}</span></div>
        </Card>
      ) : null}

      {tab === 'reunioes' ? (
        <Card pad>
          {meetings.map((m) => <Link key={m.id} to={`/erp/reunioes?id=${m.id}`} className="li" style={{ color: 'var(--tx)' }}><span>{m.title}</span><span className="lbl num">{MEETING_TYPES[m.type]} · {dm(m.starts_at)}</span></Link>)}
          {!meetings.length ? <p className="lbl">Nenhuma reunião ligada a este projeto.</p> : null}
          <button type="button" className="btn" style={{ marginTop: 12 }} onClick={() => erp.openQuick('meeting', { title: `Alinhamento · ${p.name}`, project_id: p.id, client_id: p.client_id })}>Agendar reunião</button>
        </Card>
      ) : null}

      {tab === 'notas' ? <Notes p={p} canEdit={canEdit} /> : null}
    </div>
  )
}

function Scope({ p, canEdit }) {
  const [edit, setEdit] = useState(false)
  const [txt, setTxt] = useState(p.scope || '')
  return (
    <Card pad title={<h2>Escopo</h2>} action={canEdit ? <button type="button" className="btn s" onClick={() => setEdit(!edit)}>{edit ? 'Cancelar' : 'Editar'}</button> : null}>
      {edit ? (
        <div className="stack"><textarea className="ta" rows={5} value={txt} onChange={(e) => setTxt(e.target.value)} />
          <AsyncButton className="btn p" style={{ width: 'max-content' }} onClick={async () => { await update('projects', p.id, { scope: txt }); setEdit(false) }}>Salvar</AsyncButton></div>
      ) : <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--tx-2)', whiteSpace: 'pre-line' }}>{p.scope || <span className="lbl">Sem escopo descrito. Escreva o que está incluído para evitar ajustes fora do combinado.</span>}</p>}
    </Card>
  )
}

function Checklist({ p, items, canEdit }) {
  const [txt, setTxt] = useState('')
  const done = items.filter((i) => i.done).length
  return (
    <Card pad title={<h2>Checklist de entrega</h2>} action={<span className="lbl num">{done} de {items.length}</span>}>
      {items.map((i) => (
        <div key={i.id} className="row" style={{ padding: '8px 0', borderBottom: '1px solid var(--line-2)', flexWrap: 'nowrap' }}>
          <label className="check grow"><input type="checkbox" disabled={!canEdit} checked={i.done} onChange={(e) => update('project_checklist', i.id, { done: e.target.checked })} /><span className={i.done ? 'strike' : ''}>{i.title}</span></label>
          {canEdit ? <button type="button" className="btn s ic g" aria-label="Remover item" onClick={() => remove('project_checklist', i.id)}><Icon name="x" size={12} /></button> : null}
        </div>
      ))}
      {canEdit ? (
        <form className="row" style={{ paddingTop: 10, flexWrap: 'nowrap' }} onSubmit={async (e) => { e.preventDefault(); if (!txt.trim()) return; await insert('project_checklist', { project_id: p.id, title: txt.trim(), sort: items.length }); setTxt('') }}>
          <input className="in" placeholder="Novo item do checklist" value={txt} onChange={(e) => setTxt(e.target.value)} /><button type="submit" className="btn">Adicionar</button>
        </form>
      ) : null}
      {items.length && done === items.length && p.stage !== 'entregue' && canEdit ? (
        <div className="note g row" style={{ marginTop: 12, justifyContent: 'space-between' }}><span>Checklist completo.</span>
          <AsyncButton className="btn s p" onClick={() => update('projects', p.id, { stage: 'entregue', delivered_on: today() }).then(() => notify('Projeto entregue.', 'ok'))}>Marcar como entregue</AsyncButton></div>
      ) : null}
    </Card>
  )
}

function Milestones({ p, items, canEdit }) {
  const [f, setF] = useState({ title: '', due_on: '' })
  const t = today()
  return (
    <Card pad>
      {items.map((m) => (
        <div key={m.id} style={{ display: 'grid', gridTemplateColumns: '90px 18px 1fr auto', gap: 12, alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--line-2)' }}>
          <span className="num lbl" style={!m.done && m.due_on && m.due_on < t ? { color: 'var(--red)' } : undefined}>{m.due_on ? dm(m.due_on) : '—'}</span>
          <button type="button" aria-label={m.done ? 'Marcar pendente' : 'Marcar concluído'} disabled={!canEdit} onClick={() => update('milestones', m.id, { done: !m.done })}
            style={{ width: 14, height: 14, borderRadius: '50%', padding: 0, cursor: 'pointer', background: m.done ? 'var(--green)' : 'transparent', border: `2px solid ${m.done ? 'var(--green)' : m.due_on && m.due_on <= t ? 'var(--yel)' : '#3A413D'}` }} />
          <span style={{ fontSize: 13 }} className={m.done ? 'mut' : ''}>{m.title}</span>
          {canEdit ? <button type="button" className="btn s ic g" aria-label="Remover marco" onClick={() => remove('milestones', m.id)}><Icon name="x" size={12} /></button> : <span />}
        </div>
      ))}
      {!items.length ? <p className="lbl">Nenhum marco. Marcos são entregas que o cliente vê (layout aprovado, publicação).</p> : null}
      {canEdit ? (
        <form className="row" style={{ paddingTop: 12 }} onSubmit={async (e) => { e.preventDefault(); if (!f.title) return; await insert('milestones', { ...f, due_on: f.due_on || null, project_id: p.id, sort: items.length }); setF({ title: '', due_on: '' }) }}>
          <input className="in" style={{ width: 260 }} placeholder="Novo marco" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
          <input type="date" className="in" style={{ width: 160 }} value={f.due_on} onChange={(e) => setF({ ...f, due_on: e.target.value })} />
          <button type="submit" className="btn">Adicionar</button>
        </form>
      ) : null}
    </Card>
  )
}

function Links({ p, canEdit }) {
  const [f, setF] = useState({ label: '', url: '' })
  const links = Array.isArray(p.links) ? p.links : []
  const save = (next) => update('projects', p.id, { links: next })
  return (
    <Card pad title={<h2>Links</h2>}>
      <div className="stack-s" style={{ gap: 8 }}>
        {links.map((l, i) => (
          <div key={i} className="row" style={{ flexWrap: 'nowrap' }}>
            <a href={l.url} target="_blank" rel="noreferrer" className="grow" style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 12px', border: '1px solid var(--line)', borderRadius: 8, fontSize: 13, color: 'var(--tx)', background: 'var(--s3)' }}>
              <span className="ellipsis">{l.label || l.url}</span><span className="lbl">↗</span>
            </a>
            {canEdit ? <button type="button" className="btn s ic g" aria-label="Remover link" onClick={() => save(links.filter((_, j) => j !== i))}><Icon name="x" size={12} /></button> : null}
          </div>
        ))}
        {!links.length ? <p className="lbl">Figma, GitHub, Vercel, Drive: guarde aqui os links, não os arquivos.</p> : null}
        {canEdit ? (
          <form className="stack-s" onSubmit={async (e) => { e.preventDefault(); if (!f.url) return; await save([...links, { label: f.label || f.url.replace(/^https?:\/\//, '').split('/')[0], url: /^https?:/.test(f.url) ? f.url : `https://${f.url}` }]); setF({ label: '', url: '' }) }}>
            <div className="row" style={{ flexWrap: 'nowrap' }}>
              <input className="in" placeholder="Nome (ex.: Figma)" value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} />
              <input className="in" placeholder="https://…" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} />
            </div>
            <button type="submit" className="btn">Adicionar link</button>
          </form>
        ) : null}
      </div>
    </Card>
  )
}

function Meta({ p, canEdit }) {
  const auth = useAuth()
  const [f, setF] = useState({ starts_on: p.starts_on || '', due_on: p.due_on || '', value_cents: p.value_cents, est_hours: p.est_hours || '', owner_id: p.owner_id, front: p.front, name: p.name })
  useEffect(() => setF({ starts_on: p.starts_on || '', due_on: p.due_on || '', value_cents: p.value_cents, est_hours: p.est_hours || '', owner_id: p.owner_id, front: p.front, name: p.name }), [p])
  if (!canEdit) return <dl className="kv"><dt>Início</dt><dd>{dmy(p.starts_on)}</dd><dt>Prazo</dt><dd>{dmy(p.due_on)}</dd><dt>Valor</dt><dd>{brl0(p.value_cents)}</dd></dl>
  return (
    <div className="stack">
      <Field label="Nome"><input className="in" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
      <div className="fields">
        <Field label="Início"><input type="date" className="in" value={f.starts_on} onChange={(e) => setF({ ...f, starts_on: e.target.value })} /></Field>
        <Field label="Prazo"><input type="date" className="in" value={f.due_on} onChange={(e) => setF({ ...f, due_on: e.target.value })} /></Field>
        <Field label="Valor"><MoneyInput value={f.value_cents} onChange={(v) => setF({ ...f, value_cents: v })} /></Field>
        <Field label="Horas estimadas"><input className="in num" value={f.est_hours} onChange={(e) => setF({ ...f, est_hours: e.target.value.replace(/[^\d.]/g, '') })} /></Field>
        <Field label="Frente"><Select value={f.front} onChange={(v) => setF({ ...f, front: v })} options={FRONTS} /></Field>
        <Field label="Responsável"><Select value={f.owner_id} onChange={(v) => setF({ ...f, owner_id: v })} options={auth.members.map((m) => [m.id, m.name])} /></Field>
      </div>
      <AsyncButton className="btn" onClick={() => update('projects', p.id, { ...f, starts_on: f.starts_on || null, due_on: f.due_on || null, est_hours: f.est_hours || null }).then(() => notify('Salvo.', 'ok'))}>Salvar dados</AsyncButton>
    </div>
  )
}

function Notes({ p, canEdit }) {
  const [txt, setTxt] = useState(p.notes || '')
  const [saved, setSaved] = useState(true)
  useEffect(() => {
    if (saved) return
    const t = setTimeout(async () => { await update('projects', p.id, { notes: txt }, { quiet: true }); setSaved(true) }, 900)
    return () => clearTimeout(t)
  }, [txt, saved, p.id])
  return (
    <label className="card pad stack-s">
      <span className="lbl">{saved ? 'Notas do projeto · salvo automaticamente' : 'Salvando…'}</span>
      <textarea className="ta" rows={14} disabled={!canEdit} value={txt} onChange={(e) => { setTxt(e.target.value); setSaved(false) }} />
    </label>
  )
}
