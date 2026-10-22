import React, { useEffect, useMemo, useState } from 'react'
import { useMeta } from '../components/Shell'
import { useAuth } from '../lib/auth'
import { useData, fetchRows, insert, update, archive, notify } from '../lib/data'
import { scriptStats } from '../lib/insights'
import { pctLabel, addDays, today } from '../lib/format'
import { PageHead, Loading, ErrorBox, Field, AsyncButton, Empty, useConfirm } from '../components/ui'
import { Icon } from '../lib/icons'

export default function Playbooks() {
  useMeta('Empresa', 'Playbooks')
  const auth = useAuth()
  const confirm = useConfirm()
  const [col, setCol] = useState('')
  const [sel, setSel] = useState(null)
  const [edit, setEdit] = useState(null)
  const canEdit = auth.isTotal('playbooks')

  const { data, loading, error, reload } = useData(async () => ({
    list: await fetchRows('playbooks', { order: 'code', ascending: true }),
    acts: await fetchRows('activities', { select: 'lead_id, script_code, result, happened_at', where: (q) => q.gte('happened_at', addDays(today(), -180)), order: null, limit: 20000 }).catch(() => []),
  }), ['playbooks', 'activities'])

  const stats = useMemo(() => (data ? scriptStats(data.acts) : {}), [data])
  const cols = useMemo(() => (data ? Array.from(new Set(data.list.map((p) => p.collection))).sort() : []), [data])
  useEffect(() => { if (data && !col && cols.length) setCol(cols[0]) }, [cols]) // eslint-disable-line react-hooks/exhaustive-deps
  const items = (data?.list || []).filter((p) => p.collection === col)
  useEffect(() => { if (items.length && !items.some((i) => i.id === sel)) setSel(items[0].id) }, [col, items.length]) // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return <div className="page"><ErrorBox error={error} onRetry={reload} /></div>
  if (loading || !data) return <div className="page"><Loading rows={6} /></div>
  const cur = data.list.find((p) => p.id === sel)
  const st = cur?.code ? stats[cur.code] : null

  return (
    <div className="page">
      <PageHead title="Playbooks" sub="Scripts, objeções e checklists. A sessão de prospecção puxa as mensagens daqui e mede qual converte mais.">
        {canEdit ? <button type="button" className="btn p" onClick={() => setEdit({ collection: col || 'Prospecção', code: '', title: '', when_to_use: '', body: '' })}>Novo script</button> : null}
      </PageHead>
      <div className="cols">
        <nav aria-label="Coleções" className="card" style={{ flex: '0 1 220px', padding: 8, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {cols.map((c) => (
            <button key={c} type="button" className={`nav-item ${c === col ? 'on' : ''}`} style={{ border: 0, background: c === col ? undefined : 'transparent', cursor: 'pointer', textAlign: 'left' }} onClick={() => setCol(c)}>
              <span>{c}</span><span className="cnt">{data.list.filter((p) => p.collection === c).length}</span>
            </button>
          ))}
        </nav>
        <div className="card" style={{ flex: '1 1 280px', minWidth: 0, overflow: 'hidden' }}>
          {items.map((p) => {
            const s = p.code ? stats[p.code] : null
            return (
              <button key={p.id} type="button" onClick={() => setSel(p.id)} style={{ all: 'unset', boxSizing: 'border-box', width: '100%', display: 'flex', flexDirection: 'column', gap: 4, padding: '12px 14px', borderBottom: '1px solid var(--line-2)', cursor: 'pointer', background: p.id === sel ? 'var(--sel)' : undefined }}>
                <span className="row" style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{p.code ? <span className="num ok">{p.code}</span> : null}{p.code ? ' · ' : ''}{p.title}</span>
                  {s?.sent ? <span className="num lbl">{pctLabel(s.rep, s.sent)}</span> : null}
                </span>
                <span className="lbl">{p.when_to_use || '—'}</span>
              </button>
            )
          })}
          {!items.length ? <Empty icon="book">Nada nesta coleção.</Empty> : null}
        </div>
        {cur ? (
          <article className="card" style={{ flex: '2 1 420px', minWidth: 0, padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div className="stack-s"><h2 style={{ fontSize: 17 }}>{cur.code ? <span className="num ok">{cur.code} · </span> : null}{cur.title}</h2><span className="lbl">{cur.collection}{cur.when_to_use ? ` · quando usar: ${cur.when_to_use}` : ''}</span></div>
              <div className="row">
                <button type="button" className="btn" onClick={() => navigator.clipboard?.writeText(cur.body).then(() => notify('Copiado.', 'ok'))}><Icon name="copy" size={14} />Copiar</button>
                {canEdit ? <button type="button" className="btn" onClick={() => setEdit(cur)}>Editar</button> : null}
              </div>
            </div>
            {cur.code ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
                {[['Enviadas (180 dias)', st?.sent || 0], ['Respostas em 7 dias', st?.rep || 0], ['Taxa', st?.sent ? pctLabel(st.rep, st.sent) : '—']].map(([l, v]) => (
                  <div key={l} style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--s3)', border: '1px solid var(--line)', display: 'flex', flexDirection: 'column', gap: 2 }}><span className="lbl">{l}</span><span className="num">{v}</span></div>
                ))}
              </div>
            ) : null}
            <div className="box">{cur.body}</div>
            <span className="lbl">Variáveis: [EMPRESA], [NOME], [NICHO], [BAIRRO], [MES] são preenchidas com os dados do lead. Cobrança: [DESCRICAO], [VALOR], [DATA], [PIX].</span>
            {canEdit ? <button type="button" className="btn s g" style={{ width: 'max-content' }} onClick={async () => { if (await confirm('Arquivar este script? O histórico de envios continua.', { ok: 'Arquivar', danger: true })) archive('playbooks', cur.id) }}><Icon name="trash" size={13} />Arquivar</button> : null}
          </article>
        ) : null}
      </div>
      {edit ? <EditPlaybook p={edit} cols={cols} onClose={() => setEdit(null)} onSaved={(r) => { setCol(r.collection); setSel(r.id) }} /> : null}
    </div>
  )
}

function EditPlaybook({ p, cols, onClose, onSaved }) {
  const [f, setF] = useState({ ...p })
  return (
    <div className="erp-overlay center" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal lg" role="dialog" aria-label="Script">
        <div className="modal-h"><h2 style={{ fontSize: 15 }}>{p.id ? 'Editar script' : 'Novo script'}</h2><button type="button" className="btn ic s g" aria-label="Fechar" onClick={onClose}><Icon name="x" /></button></div>
        <div className="modal-b">
          <div className="fields">
            <Field label="Coleção"><input className="in" list="pb-cols" value={f.collection} onChange={(e) => setF({ ...f, collection: e.target.value })} /><datalist id="pb-cols">{cols.map((c) => <option key={c} value={c} />)}</datalist></Field>
            <Field label="Código (ex.: M3)"><input className="in num" value={f.code || ''} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase() })} /></Field>
            <Field label="Título"><input className="in" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
            <Field label="Quando usar"><input className="in" value={f.when_to_use || ''} onChange={(e) => setF({ ...f, when_to_use: e.target.value })} /></Field>
          </div>
          <Field label="Texto"><textarea className="ta" rows={10} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} /></Field>
        </div>
        <div className="modal-f">
          <button type="button" className="btn" onClick={onClose}>Cancelar</button>
          <AsyncButton className="btn p" onClick={async () => {
            if (!f.title || !f.body) return notify('Preencha título e texto.', 'err')
            const body = { collection: f.collection || 'Prospecção', code: f.code || null, title: f.title, when_to_use: f.when_to_use || null, body: f.body }
            const r = p.id ? await update('playbooks', p.id, body) : await insert('playbooks', body)
            notify('Script salvo.', 'ok'); onSaved(r); onClose()
          }}>Salvar</AsyncButton>
        </div>
      </div>
    </div>
  )
}
