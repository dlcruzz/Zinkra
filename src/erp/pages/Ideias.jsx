import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMeta } from '../components/Shell'
import { useAuth } from '../lib/auth'
import { useData, fetchRows, insert, update, notify } from '../lib/data'
import { createProjectFromTemplate } from '../lib/automations'
import { today, addDays } from '../lib/format'
import { PageHead, Seg, Loading, ErrorBox, Select, Modal, Field, AsyncButton } from '../components/ui'
import { IDEA_TYPES, IDEA_STATUS } from '../lib/constants'

export default function Ideias() {
  useMeta('Empresa', 'Ideias')
  const auth = useAuth()
  const [view, setView] = useState('board')
  const [f, setF] = useState({ title: '', type: 'produto' })
  const [open, setOpen] = useState(null)
  const [drag, setDrag] = useState(null)
  const { data, loading, error, reload } = useData(() => fetchRows('ideas'), ['ideas'])

  if (error) return <div className="page"><ErrorBox error={error} onRetry={reload} /></div>
  if (loading || !data) return <div className="page"><Loading rows={6} /></div>
  const ideas = data
  const canEdit = (i) => auth.isTotal('ideias') || i.owner_id === auth.uid

  const card = (i) => (
    <div key={i.id} className="kcard" draggable={canEdit(i)} onDragStart={() => setDrag(i)} onClick={() => setOpen(i)} style={i.status === 'descartada' ? { color: 'var(--mut-2)' } : i.status === 'aprovada' ? { borderColor: 'var(--green-ln)' } : undefined}>
      <span>{i.title}</span>
      <div className="row" style={{ gap: 6 }}>
        <span className="tagx">{IDEA_TYPES[i.type]}</span>
        {i.impact || i.effort ? <span className="tagx num" title="Impacto · Esforço">I{i.impact || '?'} · E{i.effort || '?'}</span> : null}
        <span className="lbl" style={{ marginLeft: 'auto', fontSize: 11 }}>{auth.memberName(i.owner_id)}</span>
      </div>
      {i.status === 'descartada' && i.outcome ? <span className="lbl">{i.outcome}</span> : null}
      {i.project_id ? <Link to={`/erp/projetos/${i.project_id}`} className="lbl" style={{ color: 'var(--blue)' }} onClick={(e) => e.stopPropagation()}>→ projeto</Link> : null}
    </div>
  )

  const scored = ideas.filter((i) => i.impact && i.effort && !['descartada', 'virou'].includes(i.status))
  const quad = (i) => (i.impact >= 3 ? (i.effort <= 3 ? 0 : 1) : (i.effort <= 3 ? 2 : 3))
  const Q = [['Fazer já', 'alto impacto, pouco esforço', 'var(--green-bg)'], ['Planejar', 'alto impacto, muito esforço'], ['Encaixar quando sobrar tempo', 'baixo impacto, pouco esforço'], ['Evitar', 'baixo impacto, muito esforço']]

  return (
    <div className="page">
      <PageHead title="Banco de ideias" sub={`${ideas.length} ideias · ${ideas.filter((i) => i.status === 'aprovada').length} aprovadas · ${ideas.filter((i) => i.status === 'virou').length} viraram projeto`}>
        <Seg value={view} onChange={setView} options={[['board', 'Quadro'], ['matrix', 'Matriz']]} />
      </PageHead>

      <form className="row" onSubmit={async (e) => { e.preventDefault(); if (!f.title.trim()) return; await insert('ideas', { ...f, title: f.title.trim() }); setF({ ...f, title: '' }); notify('Ideia salva em Nova.', 'ok') }}>
        <label className="grow" style={{ minWidth: 220 }}><span className="sr">Nova ideia</span><input className="in" style={{ height: 38 }} placeholder="Anotar uma ideia… (Enter salva)" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></label>
        <Select value={f.type} onChange={(v) => setF({ ...f, type: v })} options={IDEA_TYPES} style={{ width: 180, height: 38 }} aria-label="Tipo" />
        <button type="submit" className="btn p" style={{ height: 38 }}>Salvar</button>
      </form>

      {view === 'board' ? (
        <div className="kanban"><div className="kanban-in">
          {Object.entries(IDEA_STATUS).map(([s, label]) => {
            const list = ideas.filter((i) => i.status === s)
            return (
              <section key={s} className="kcol" style={{ width: 240 }} onDragOver={(e) => e.preventDefault()} onDrop={() => { if (drag && drag.status !== s) { if (s === 'virou') setOpen({ ...drag, _convert: true }); else update('ideas', drag.id, { status: s }) } setDrag(null) }}>
                <div className="kcol-h"><h2>{label}</h2><span className="num lbl">{list.length}</span></div>
                {list.map(card)}
              </section>
            )
          })}
        </div></div>
      ) : (
        <div className="card pad stack">
          <div className="row" style={{ justifyContent: 'space-between' }}><h2>Impacto × esforço</h2><span className="lbl">Dê nota de 1 a 5 em cada ideia para ela aparecer aqui. Comece pelo quadrante verde.</span></div>
          <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr', gap: 8 }}>
            <div className="lbl" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', textAlign: 'center' }}>Impacto →</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', border: '1px solid #232826', borderRadius: 8, overflow: 'hidden' }}>
              {Q.map(([t, sub, bg], qi) => (
                <div key={t} style={{ minHeight: 200, padding: 14, display: 'flex', flexDirection: 'column', gap: 8, background: bg, borderRight: qi % 2 === 0 ? '1px solid #232826' : 0, borderBottom: qi < 2 ? '1px solid #232826' : 0 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: qi === 0 ? 'var(--green-tx)' : 'var(--tx-3)' }}>{t} <span className="lbl" style={{ fontWeight: 400 }}>· {sub}</span></span>
                  <div className="row">
                    {scored.filter((i) => quad(i) === qi).sort((a, b) => b.impact - b.effort - (a.impact - a.effort)).map((i) => (
                      <button key={i.id} type="button" onClick={() => setOpen(i)} style={{ height: 26, padding: '0 10px', borderRadius: 13, background: '#1C211E', border: '1px solid var(--line-3)', color: 'var(--tx)', fontSize: 12, cursor: 'pointer' }}>{i.title}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <span />
            <div className="lbl" style={{ textAlign: 'center' }}>Esforço →</div>
          </div>
        </div>
      )}

      {open ? <IdeaModal idea={open} canEdit={canEdit(open)} onClose={() => setOpen(null)} /> : null}
    </div>
  )
}

function IdeaModal({ idea, canEdit, onClose }) {
  const auth = useAuth()
  const [f, setF] = useState({ ...idea })
  const [mode, setMode] = useState(idea._convert ? 'convert' : 'edit')
  const set = (k) => (v) => setF({ ...f, [k]: v })
  const save = async () => {
    await update('ideas', idea.id, { title: f.title, type: f.type, status: f.status, impact: f.impact ? Number(f.impact) : null, effort: f.effort ? Number(f.effort) : null, note: f.note || null, outcome: f.outcome || null })
    notify('Ideia salva.', 'ok'); onClose()
  }
  const toTask = async () => {
    const t = await insert('tasks', { title: idea.title, description: idea.note, due_on: addDays(today(), 7), front: 'interno', owner_id: auth.uid })
    await update('ideas', idea.id, { status: 'virou', task_id: t.id, outcome: 'Virou tarefa' })
    notify('Virou tarefa com prazo de 7 dias.', 'ok'); onClose()
  }
  const toProject = async () => {
    const p = await createProjectFromTemplate(null, { name: idea.title, scope: idea.note, front: 'interno', owner_id: auth.uid })
    await update('ideas', idea.id, { status: 'virou', project_id: p.id, outcome: 'Virou projeto' })
    notify('Projeto interno criado.', 'ok'); onClose()
  }
  return (
    <Modal title="Ideia" onClose={onClose} footer={canEdit ? (mode === 'convert' ? <><button type="button" className="btn" onClick={() => setMode('edit')}>Voltar</button></> : <>
      <button type="button" className="btn" onClick={() => setMode('convert')}>Transformar em…</button><span className="grow" />
      <button type="button" className="btn" onClick={onClose}>Cancelar</button><AsyncButton className="btn p" onClick={save}>Salvar</AsyncButton>
    </>) : <button type="button" className="btn" onClick={onClose}>Fechar</button>}>
      {mode === 'convert' ? (
        <div className="stack">
          <p style={{ fontSize: 14 }}>{idea.title}</p>
          <AsyncButton className="btn" onClick={toTask}>Virar tarefa (prazo em 7 dias)</AsyncButton>
          <AsyncButton className="btn" onClick={toProject}>Virar projeto interno</AsyncButton>
        </div>
      ) : (
        <>
          <Field label="Ideia"><input className="in" disabled={!canEdit} value={f.title} onChange={(e) => set('title')(e.target.value)} /></Field>
          <div className="fields">
            <Field label="Tipo"><Select disabled={!canEdit} value={f.type} onChange={set('type')} options={IDEA_TYPES} /></Field>
            <Field label="Status"><Select disabled={!canEdit} value={f.status} onChange={set('status')} options={IDEA_STATUS} /></Field>
            <Field label="Impacto (1–5)"><Select disabled={!canEdit} value={f.impact ? String(f.impact) : ''} onChange={set('impact')} placeholder="—" options={['1', '2', '3', '4', '5']} /></Field>
            <Field label="Esforço (1–5)"><Select disabled={!canEdit} value={f.effort ? String(f.effort) : ''} onChange={set('effort')} placeholder="—" options={['1', '2', '3', '4', '5']} /></Field>
          </div>
          <Field label="Detalhe"><textarea className="ta" rows={4} disabled={!canEdit} value={f.note || ''} onChange={(e) => set('note')(e.target.value)} /></Field>
          {f.status === 'descartada' ? <Field label="Por que foi descartada"><input className="in" disabled={!canEdit} value={f.outcome || ''} onChange={(e) => set('outcome')(e.target.value)} /></Field> : null}
          <span className="lbl">Por {auth.memberName(idea.owner_id)}</span>
        </>
      )}
    </Modal>
  )
}
