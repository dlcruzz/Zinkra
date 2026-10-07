import React, { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMeta, useErp } from '../components/Shell'
import { useAuth } from '../lib/auth'
import { useData, fetchRows, insert, update, remove, archive, notify } from '../lib/data'
import { actionToTask } from '../lib/automations'
import { dm, hm, today, addDays, WEEK, MONTHS, startOfWeek, WEEK_S, localDay } from '../lib/format'
import { PageHead, Seg, Loading, ErrorBox, Badge, Field, Select, AsyncButton, Empty, useConfirm } from '../components/ui'
import { MEETING_TYPES } from '../lib/constants'
import { Icon } from '../lib/icons'

const TYPE_CLS = { prospeccao: 'g', briefing: 'bl', alinhamento: 'bl', entrega: 'g', interna: '' }

export default function Reunioes() {
  useMeta('Operação', 'Reuniões')
  const auth = useAuth()
  const erp = useErp()
  const [sp, setSp] = useSearchParams()
  const [view, setView] = useState('lista')
  const [type, setType] = useState('')
  const sel = sp.get('id')

  const { data, loading, error, reload } = useData(async () => {
    const [meetings, actions, leads, clients, projects] = await Promise.all([
      fetchRows('meetings', { order: 'starts_at', ascending: true }),
      fetchRows('meeting_actions', { order: 'sort', ascending: true }).catch(() => []),
      fetchRows('leads', { select: 'id, company', limit: 5000 }).catch(() => []),
      fetchRows('clients', { select: 'id, name' }).catch(() => []),
      fetchRows('projects', { select: 'id, name' }).catch(() => []),
    ])
    return { meetings, actions, leads, clients, projects }
  }, ['meetings', 'meeting_actions'])

  const { up, past } = useMemo(() => {
    if (!data) return { up: [], past: [] }
    const now = new Date().toISOString()
    const m = data.meetings.filter((x) => !type || x.type === type)
    return { up: m.filter((x) => new Date(new Date(x.starts_at).getTime() + x.duration_min * 60000).toISOString() >= now), past: m.filter((x) => new Date(new Date(x.starts_at).getTime() + x.duration_min * 60000).toISOString() < now).reverse() }
  }, [data, type])

  useEffect(() => { if (data && !sel && (up[0] || past[0])) setSp({ id: (up[0] || past[0]).id }, { replace: true }) }, [data]) // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return <div className="page"><ErrorBox error={error} onRetry={reload} /></div>
  if (loading || !data) return <div className="page"><Loading rows={6} /></div>
  const meeting = data.meetings.find((m) => m.id === sel)
  const t = today()
  const week = up.filter((m) => localDay(m.starts_at) <= addDays(t, 7)).length
  const pending = past.filter((m) => !m.notes && !m.decisions && localDay(m.starts_at) >= addDays(t, -14)).length

  const item = (m) => (
    <button key={m.id} type="button" onClick={() => setSp({ id: m.id })}
      style={{ all: 'unset', boxSizing: 'border-box', width: '100%', display: 'grid', gridTemplateColumns: '54px 1fr', gap: 12, padding: '12px 14px', borderBottom: '1px solid var(--line-2)', cursor: 'pointer', background: m.id === sel ? 'var(--sel)' : undefined }}>
      <span className="stack-s" style={{ gap: 2 }}><span className="num" style={{ fontSize: 13 }}>{localDay(m.starts_at) === t ? 'Hoje' : dm(m.starts_at)}</span><span className="num lbl">{hm(m.starts_at)}</span></span>
      <span className="stack-s" style={{ gap: 4, minWidth: 0 }}>
        <span className="ellipsis" style={{ fontSize: 13, fontWeight: 500 }}>{m.title}</span>
        <span className="lbl ellipsis">{MEETING_TYPES[m.type]}{m.location ? ` · ${m.location}` : ''}{!m.notes && !m.decisions && localDay(m.starts_at) < t ? ' · sem notas' : ''}</span>
      </span>
    </button>
  )

  return (
    <div className="page">
      <PageHead title="Reuniões" sub={`${week} nos próximos 7 dias${pending ? ` · ${pending} sem notas registradas` : ''}`}>
        <Seg value={view} onChange={setView} options={[['lista', 'Lista'], ['cal', 'Calendário']]} />
        <Select value={type} onChange={(v) => setType(v || '')} placeholder="Todos os tipos" options={MEETING_TYPES} style={{ width: 160 }} />
        {auth.canEdit('reunioes') ? <button type="button" className="btn p" onClick={() => erp.openQuick('meeting')}>Nova reunião</button> : null}
      </PageHead>

      {view === 'cal' ? <Calendar meetings={data.meetings.filter((m) => !type || m.type === type)} onPick={(id) => { setSp({ id }); setView('lista') }} /> : (
        <div className="cols">
          <div className="card" style={{ flex: '1 1 320px', minWidth: 0, overflow: 'hidden' }}>
            <div className="lbl" style={{ padding: '10px 14px', background: '#0F1210', borderBottom: '1px solid var(--line)' }}>Próximas</div>
            {up.map(item)}
            {!up.length ? <p className="lbl" style={{ padding: 14 }}>Nenhuma reunião agendada.</p> : null}
            <div className="lbl" style={{ padding: '10px 14px', background: '#0F1210', borderBottom: '1px solid var(--line)' }}>Anteriores</div>
            {past.slice(0, 30).map(item)}
          </div>
          {meeting ? <MeetingView key={meeting.id} m={meeting} data={data} /> : <div className="card" style={{ flex: '2 1 480px' }}><Empty icon="cal">Selecione uma reunião.</Empty></div>}
        </div>
      )}
    </div>
  )
}

function MeetingView({ m, data }) {
  const auth = useAuth()
  const confirm = useConfirm()
  const canEdit = auth.isTotal('reunioes') || m.owner_id === auth.uid
  const [f, setF] = useState({ agenda: m.agenda || '', notes: m.notes || '', decisions: m.decisions || '' })
  const [dirty, setDirty] = useState(false)
  const [a, setA] = useState({ title: '', owner_id: auth.uid, due_on: addDays(today(), 2) })
  const [edit, setEdit] = useState(false)
  const actions = data.actions.filter((x) => x.meeting_id === m.id)
  const lead = data.leads.find((l) => l.id === m.lead_id)
  const client = data.clients.find((c) => c.id === m.client_id)
  const project = data.projects.find((p) => p.id === m.project_id)
  const d = new Date(m.starts_at)

  useEffect(() => {
    if (!dirty) return
    const t = setTimeout(async () => { await update('meetings', m.id, f, { quiet: true }); setDirty(false) }, 1000)
    return () => clearTimeout(t)
  }, [f, dirty, m.id])
  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setDirty(true) }

  return (
    <article className="card" style={{ flex: '2 1 480px', minWidth: 0, padding: 20, display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div className="stack-s">
          <h2 style={{ fontSize: 18 }}>{m.title}</h2>
          <span className="lbl">{WEEK[d.getDay()]}, {d.getDate()} de {MONTHS[d.getMonth()]} · {hm(m.starts_at)} · {m.duration_min} min{m.location ? ` · ${m.location}` : ''}</span>
        </div>
        <div className="row">
          <Badge kind={TYPE_CLS[m.type]}>{MEETING_TYPES[m.type]}</Badge>
          {lead ? <Link to={`/erp/leads/${lead.id}`} className="b bl">Lead · {lead.company}</Link> : null}
          {client ? <Link to={`/erp/clientes?id=${client.id}`} className="b bl">Cliente · {client.name}</Link> : null}
          {project ? <Link to={`/erp/projetos/${project.id}`} className="b bl">Projeto · {project.name}</Link> : null}
          {canEdit ? <button type="button" className="btn s" onClick={() => setEdit(!edit)}>{edit ? 'Fechar' : 'Editar'}</button> : null}
        </div>
      </div>
      {edit ? <EditMeeting m={m} data={data} onDone={() => setEdit(false)} /> : null}
      <div className="stack-s"><h3>Participantes</h3><span style={{ fontSize: 13 }}>{m.participants || '—'}</span></div>
      <label className="stack-s"><h3>Pauta</h3><textarea className="ta" rows={3} disabled={!canEdit} value={f.agenda} onChange={set('agenda')} placeholder="Um tópico por linha" /></label>
      <label className="stack-s"><h3>Notas</h3><textarea className="ta" rows={5} disabled={!canEdit} value={f.notes} onChange={set('notes')} placeholder="O que foi falado" /></label>
      <label className="stack-s"><h3>Decisões</h3><textarea className="ta" rows={3} disabled={!canEdit} value={f.decisions} onChange={set('decisions')} placeholder="Uma decisão por linha" /></label>
      <span className="lbl">{dirty ? 'Salvando…' : 'Notas salvas automaticamente'}</span>

      <div className="stack-s">
        <h3>Próximos passos</h3>
        {actions.map((x) => (
          <div key={x.id} className="li">
            <span className="grow">{x.title}</span>
            <span className="lbl">{x.owner_id ? auth.memberName(x.owner_id) : x.who || '—'}</span>
            <span className="num lbl">{x.due_on ? dm(x.due_on) : '—'}</span>
            {x.task_id ? <span className="b g dot">Tarefa criada</span> : canEdit ? <AsyncButton className="btn s" onClick={() => actionToTask(m, x).then(() => notify('Virou tarefa.', 'ok'))}>Virar tarefa</AsyncButton> : null}
            {canEdit ? <button type="button" className="btn s ic g" aria-label="Remover" onClick={() => remove('meeting_actions', x.id)}><Icon name="x" size={12} /></button> : null}
          </div>
        ))}
        {canEdit ? (
          <form className="row" onSubmit={async (e) => {
            e.preventDefault()
            if (!a.title.trim()) return
            const row = await insert('meeting_actions', { meeting_id: m.id, title: a.title.trim(), owner_id: a.owner_id || null, due_on: a.due_on || null, sort: actions.length })
            if (a.owner_id) await actionToTask(m, row)
            setA({ ...a, title: '' })
          }}>
            <input className="in" style={{ flex: '1 1 220px' }} placeholder="Próximo passo (vira tarefa ao adicionar)" value={a.title} onChange={(e) => setA({ ...a, title: e.target.value })} />
            <Select value={a.owner_id} onChange={(v) => setA({ ...a, owner_id: v })} placeholder="cliente / externo" options={auth.members.map((x) => [x.id, x.name])} style={{ width: 160 }} />
            <input type="date" className="in" style={{ width: 150 }} value={a.due_on} onChange={(e) => setA({ ...a, due_on: e.target.value })} />
            <button type="submit" className="btn">Adicionar</button>
          </form>
        ) : null}
      </div>
      {canEdit ? <button type="button" className="btn s g" style={{ width: 'max-content' }} onClick={async () => { if (await confirm('Arquivar esta reunião?', { ok: 'Arquivar', danger: true })) archive('meetings', m.id) }}><Icon name="trash" size={13} />Arquivar reunião</button> : null}
    </article>
  )
}

function EditMeeting({ m, data, onDone }) {
  const d = new Date(m.starts_at)
  const pad = (n) => String(n).padStart(2, '0')
  const [f, setF] = useState({ title: m.title, type: m.type, date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
    duration_min: m.duration_min, location: m.location || '', participants: m.participants || '', lead_id: m.lead_id, client_id: m.client_id, project_id: m.project_id })
  return (
    <div className="stack" style={{ padding: 14, border: '1px solid var(--line)', borderRadius: 8 }}>
      <div className="fields">
        <Field label="Título"><input className="in" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
        <Field label="Tipo"><Select value={f.type} onChange={(v) => setF({ ...f, type: v })} options={MEETING_TYPES} /></Field>
        <Field label="Data"><input type="date" className="in" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
        <Field label="Hora"><input type="time" className="in" value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })} /></Field>
        <Field label="Duração (min)"><input className="in num" value={f.duration_min} onChange={(e) => setF({ ...f, duration_min: Number(e.target.value) || 30 })} /></Field>
        <Field label="Local"><input className="in" value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} /></Field>
        <Field label="Participantes"><input className="in" value={f.participants} onChange={(e) => setF({ ...f, participants: e.target.value })} /></Field>
        <Field label="Lead"><Select value={f.lead_id} onChange={(v) => setF({ ...f, lead_id: v })} placeholder="—" options={data.leads.map((l) => [l.id, l.company])} /></Field>
        <Field label="Cliente"><Select value={f.client_id} onChange={(v) => setF({ ...f, client_id: v })} placeholder="—" options={data.clients.map((c) => [c.id, c.name])} /></Field>
        <Field label="Projeto"><Select value={f.project_id} onChange={(v) => setF({ ...f, project_id: v })} placeholder="—" options={data.projects.map((p) => [p.id, p.name])} /></Field>
      </div>
      <AsyncButton className="btn p" style={{ width: 'max-content' }} onClick={async () => {
        const { date, time, ...rest } = f
        await update('meetings', m.id, { ...rest, starts_at: new Date(`${date}T${time}:00`).toISOString() })
        notify('Reunião atualizada.', 'ok'); onDone()
      }}>Salvar</AsyncButton>
    </div>
  )
}

function Calendar({ meetings, onPick }) {
  const [ref, setRef] = useState(startOfWeek(today()))
  const days = Array.from({ length: 7 }).map((_, i) => addDays(ref, i))
  const t = today()
  return (
    <div className="stack">
      <div className="row">
        <button type="button" className="btn s" onClick={() => setRef(addDays(ref, -7))}>←</button>
        <button type="button" className="btn s" onClick={() => setRef(startOfWeek(today()))}>Esta semana</button>
        <button type="button" className="btn s" onClick={() => setRef(addDays(ref, 7))}>→</button>
        <span className="lbl">{dm(days[0])} a {dm(days[6])}</span>
      </div>
      <div className="card tbl-wrap">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(140px, 1fr))', minWidth: 980 }}>
          {days.map((d, i) => (
            <div key={d} style={{ borderRight: i < 6 ? '1px solid #1A1E1C' : 0, minHeight: 360, background: d === t ? '#0D110E' : undefined }}>
              <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--line)', fontSize: 12, color: d === t ? 'var(--green-tx)' : 'var(--mut)' }}>{WEEK_S[(i + 1) % 7]} {d.slice(8)}</div>
              <div className="stack-s" style={{ padding: 8 }}>
                {meetings.filter((m) => localDay(m.starts_at) === d).map((m) => (
                  <button key={m.id} type="button" onClick={() => onPick(m.id)} style={{ all: 'unset', cursor: 'pointer', padding: '6px 8px', borderRadius: 6, fontSize: 12, background: m.type === 'prospeccao' ? 'var(--green-bg)' : 'var(--blue-bg)', border: `1px solid ${m.type === 'prospeccao' ? 'var(--green-ln)' : 'var(--blue-ln)'}` }}>
                    <span className="num">{hm(m.starts_at)}</span> {m.title}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
