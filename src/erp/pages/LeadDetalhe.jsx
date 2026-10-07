import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMeta, useErp } from '../components/Shell'
import { useAuth } from '../lib/auth'
import { useData, fetchRows, fetchOne, insert, update, remove, archive, notify, useSettings } from '../lib/data'
import { getPipelines, moveLead, registerActivity, winLead } from '../lib/automations'
import { today, addDays, dm, dmy, hm, ago, waLink, igLink, igHandle, fillTemplate, brl0, MONTHS } from '../lib/format'
import { PageHead, Card, Tabs, Loading, ErrorBox, Modal, Field, Select, MoneyInput, AsyncButton, Badge, useConfirm } from '../components/ui'
import { TaskRow } from '../components/TaskRow'
import { ACTIVITY_TYPES, RESULTS, PROPOSAL_STATUS, PROPOSAL_CLASS, MEETING_TYPES } from '../lib/constants'
import { Icon } from '../lib/icons'

export default function LeadDetalhe() {
  const { id } = useParams()
  const auth = useAuth()
  const erp = useErp()
  const nav = useNavigate()
  const confirm = useConfirm()
  const settings = useSettings()
  const [tab, setTab] = useState('timeline')
  const [editing, setEditing] = useState(false)
  const [modal, setModal] = useState(null)

  const { data, loading, error, reload } = useData(async () => {
    const lead = await fetchOne('leads', id)
    if (!lead) return { lead: null }
    const [P, contacts, acts, history, proposals, tasks, meetings, partners, playbooks] = await Promise.all([
      getPipelines(),
      fetchRows('contacts', { where: (q) => q.eq('lead_id', id), order: 'created_at', ascending: true }),
      fetchRows('activities', { where: (q) => q.eq('lead_id', id), order: 'happened_at' }),
      fetchRows('stage_history', { where: (q) => q.eq('lead_id', id), order: 'changed_at' }),
      fetchRows('proposals', { where: (q) => q.eq('lead_id', id) }).catch(() => []),
      fetchRows('tasks', { where: (q) => q.eq('lead_id', id), order: 'due_on', ascending: true }).catch(() => []),
      fetchRows('meetings', { where: (q) => q.eq('lead_id', id), order: 'starts_at' }).catch(() => []),
      fetchRows('partners', { order: 'name', ascending: true }).catch(() => []),
      fetchRows('playbooks', { order: 'code', ascending: true }).catch(() => []),
    ])
    return { lead, P, contacts, acts, history, proposals, tasks, meetings, partners, playbooks }
  }, ['leads', 'contacts', 'activities', 'stage_history', 'proposals', 'tasks', 'meetings'], [id])

  useMeta('Comercial / Leads', data?.lead?.company || 'Lead')

  if (error) return <div className="page"><ErrorBox error={error} onRetry={reload} /></div>
  if (loading || !data) return <div className="page"><Loading rows={8} /></div>
  if (!data.lead) return <div className="page"><div className="empty">Lead não encontrado ou sem permissão. <Link to="/erp/leads">Voltar</Link></div></div>

  const { lead, P, contacts, acts, history, proposals, tasks, meetings, partners, playbooks } = data
  const st = P.stage(lead.stage_id)
  const stages = P.of(lead.pipeline_id)
  const canEdit = auth.isTotal('crm') || lead.owner_id === auth.uid || !lead.owner_id
  const main = contacts.find((c) => c.decision_role === 'decisor') || contacts[0]
  const pb = playbooks.find((p) => p.code === (lead.next_step_code || 'M1')) || playbooks[0]
  const vars = { EMPRESA: lead.company, NICHO: (lead.niche || '').toLowerCase(), BAIRRO: lead.neighborhood || '', NOME: main?.name?.split(' ')[0] || '', MES: MONTHS[new Date().getMonth()] }
  const msg = pb ? fillTemplate(pb.body, vars) : ''
  const wa = waLink(main?.phone || lead.phone, msg)
  const kindClass = st?.kind === 'won' || st?.kind === 'handoff' ? 'g' : st?.kind === 'lost' ? 'r' : 'bl'
  const handoff = stages.find((s) => s.kind === 'handoff')

  const timeline = [
    ...acts.map((a) => ({ at: a.happened_at, kind: 'act', a })),
    ...history.map((h) => ({ at: h.changed_at, kind: 'stage', h })),
  ].sort((x, y) => y.at.localeCompare(x.at))

  return (
    <div className="page">
      <Link to="/erp/leads" className="lbl" style={{ color: 'var(--mut)' }}>← Voltar para leads</Link>
      <PageHead title={<span className="row" style={{ gap: 10 }}>{lead.company} {st ? <Badge kind={kindClass}>{st.name}</Badge> : null} {lead.niche ? <Badge>{lead.niche}</Badge> : null}</span>}
        sub={`Responsável: ${lead.owner_id ? auth.memberName(lead.owner_id) : 'sem dono'} · criado em ${dmy(lead.created_at)}${lead.origin ? ` · ${lead.origin}` : ''} · ${P.pipelines.find((p) => p.id === lead.pipeline_id)?.name || ''}`}>
        {wa ? <a className="btn p" href={wa}><Icon name="wa" size={14} />Abrir WhatsApp</a> : null}
        {!lead.owner_id && auth.canEdit('crm') ? <AsyncButton className="btn" onClick={() => update('leads', lead.id, { owner_id: auth.uid })}>Assumir lead</AsyncButton> : null}
        {auth.canEdit('reunioes') ? <button type="button" className="btn" onClick={() => erp.openQuick('meeting', { title: `Reunião · ${lead.company}`, type: 'prospeccao', lead_id: lead.id, participants: main?.name || '' })}>Agendar reunião</button> : null}
        {auth.canEdit('propostas') ? <button type="button" className="btn" onClick={() => nav(`/erp/propostas/nova?lead=${lead.id}`)}>Criar proposta</button> : null}
        {handoff && st?.kind === 'open' && canEdit && !auth.isDirector ? <AsyncButton className="btn" onClick={() => moveLead(lead, handoff.id).then(() => notify('Passado ao Diretor. Ele recebeu uma tarefa.', 'ok'))}>Passar ao Diretor</AsyncButton> : null}
        {auth.isTotal('clientes') && st?.kind !== 'won' ? <button type="button" className="btn" onClick={() => setModal('win')}>Marcar ganho</button> : null}
        {canEdit && st?.kind !== 'lost' ? <button type="button" className="btn d" onClick={() => setModal('lost')}>Perdido</button> : null}
      </PageHead>

      <div style={{ display: 'flex', gap: 2, borderRadius: 8, overflow: 'hidden', flexWrap: 'wrap' }} aria-label="Etapas do pipeline">
        {stages.filter((s) => s.kind !== 'lost').map((s) => {
          const cls = s.id === lead.stage_id ? 'cur' : st && s.sort < st.sort && st.kind !== 'lost' ? 'done' : ''
          return (
            <button key={s.id} type="button" className={`step ${cls}`} disabled={!canEdit} onClick={() => s.id !== lead.stage_id && moveLead(lead, s.id)}>{s.name}</button>
          )
        })}
      </div>

      <div className="cols">
        <div className="stack" style={{ flex: '1 1 320px', minWidth: 0, gap: 16 }}>
          <NextStep lead={lead} playbooks={playbooks} canEdit={canEdit} />

          <Card pad title={<h2>Dados da empresa</h2>} action={canEdit ? <button type="button" className="btn s" onClick={() => setEditing(!editing)}>{editing ? 'Fechar' : 'Editar'}</button> : null}>
            {editing ? <LeadForm lead={lead} partners={partners} onDone={() => setEditing(false)} /> : (
              <dl className="kv">
                <dt>Nicho</dt><dd>{lead.niche || '—'}</dd>
                <dt>Bairro</dt><dd>{[lead.neighborhood, lead.city].filter(Boolean).join(' · ') || '—'}</dd>
                <dt>WhatsApp</dt><dd className="num">{lead.phone || '—'}</dd>
                <dt>Instagram</dt><dd>{lead.instagram ? <a href={igLink(lead.instagram)} target="_blank" rel="noreferrer">{igHandle(lead.instagram)}</a> : '—'}</dd>
                <dt>Site atual</dt><dd>{lead.website ? <a href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} target="_blank" rel="noreferrer">{lead.website}</a> : lead.has_site ? 'Tem' : lead.has_site === false ? 'Não tem' : '—'}</dd>
                <dt>Origem</dt><dd>{lead.origin || '—'}</dd>
                <dt>Valor estimado</dt><dd className="num">{lead.estimated_value_cents ? `${brl0(lead.estimated_value_cents)}${lead.estimated_recurring ? '/mês' : ''}` : '—'}</dd>
                <dt>Indicado por</dt><dd>{partners.find((p) => p.id === lead.partner_id)?.name || '—'}</dd>
                {lead.lost_reason ? <><dt>Motivo da perda</dt><dd className="bad">{lead.lost_reason}</dd></> : null}
                {lead.client_id ? <><dt>Cliente</dt><dd><Link to={`/erp/clientes?id=${lead.client_id}`}>Abrir ficha do cliente</Link></dd></> : null}
              </dl>
            )}
          </Card>

          <Contacts lead={lead} contacts={contacts} canEdit={canEdit} />

          {canEdit ? (
            <div className="row">
              <button type="button" className="btn s g" onClick={async () => {
                if (await confirm('Arquivar este lead? Ele some das listas, mas o histórico fica guardado.', { ok: 'Arquivar', danger: true })) {
                  await archive('leads', lead.id); nav('/erp/leads')
                }
              }}><Icon name="trash" size={13} />Arquivar lead</button>
            </div>
          ) : null}
        </div>

        <div className="card" style={{ flex: '2 1 480px', minWidth: 0, padding: '0 18px 18px', display: 'flex', flexDirection: 'column' }}>
          <Tabs value={tab} onChange={setTab} options={[['timeline', 'Linha do tempo', timeline.length], ['notes', 'Notas'], ['proposals', 'Propostas', proposals.length], ['tasks', 'Tarefas', tasks.filter((x) => x.status !== 'done').length], ['meetings', 'Reuniões', meetings.length]]} />
          {tab === 'timeline' ? (
            <>
              {canEdit ? <Composer lead={lead} playbooks={playbooks} defaultCode={lead.next_step_code} /> : null}
              {timeline.map((e) => e.kind === 'act' ? (
                <div className="ev" key={'a' + e.a.id}>
                  <span className="dot" style={{ borderColor: e.a.result === 'respondeu' ? 'var(--green-tx)' : e.a.type === 'sistema' ? 'var(--mut)' : 'var(--blue)' }} />
                  <div className="stack-s" style={{ gap: 3 }}>
                    <span>{ACTIVITY_TYPES[e.a.type]}{e.a.script_code ? <> · <span className="num">{e.a.script_code}</span></> : null}{e.a.result ? ` · ${RESULTS[e.a.result]}` : ''}</span>
                    {e.a.note ? <span className="lbl" style={{ whiteSpace: 'pre-line' }}>{e.a.note}</span> : null}
                    <span className="lbl" style={{ fontSize: 11 }}>por {auth.memberName(e.a.owner_id)}</span>
                  </div>
                  <span className="lbl num">{dm(e.a.happened_at)} {hm(e.a.happened_at)}</span>
                </div>
              ) : (
                <div className="ev" key={'h' + e.h.id}>
                  <span className="dot" />
                  <div className="stack-s" style={{ gap: 3 }}>
                    <span>{e.h.from_stage ? <>Moveu de {P.stage(e.h.from_stage)?.name} para <b style={{ fontWeight: 500 }}>{P.stage(e.h.to_stage)?.name}</b></> : <>Entrou em <b style={{ fontWeight: 500 }}>{P.stage(e.h.to_stage)?.name}</b></>}</span>
                    <span className="lbl" style={{ fontSize: 11 }}>por {auth.memberName(e.h.changed_by)}</span>
                  </div>
                  <span className="lbl num">{dm(e.h.changed_at)} {hm(e.h.changed_at)}</span>
                </div>
              ))}
            </>
          ) : null}
          {tab === 'notes' ? <Notes lead={lead} canEdit={canEdit} /> : null}
          {tab === 'proposals' ? (
            <div className="stack" style={{ paddingTop: 12 }}>
              {proposals.map((p) => (
                <Link key={p.id} to={`/erp/propostas/${p.id}`} className="li" style={{ color: 'var(--tx)' }}>
                  <span><span className="num lbl">#{p.number}</span> {p.title || 'Proposta'}</span>
                  <Badge kind={PROPOSAL_CLASS[p.status]}>{PROPOSAL_STATUS[p.status]}</Badge>
                </Link>
              ))}
              {!proposals.length ? <div className="empty">Nenhuma proposta para este lead.</div> : null}
              {auth.canEdit('propostas') ? <button type="button" className="btn" style={{ width: 'max-content' }} onClick={() => nav(`/erp/propostas/nova?lead=${lead.id}`)}>Criar proposta</button> : null}
            </div>
          ) : null}
          {tab === 'tasks' ? (
            <div style={{ margin: '12px -18px 0' }}>
              {tasks.map((x) => <TaskRow key={x.id} task={x} showProject={false} owner={auth.memberName(x.owner_id)} />)}
              {!tasks.length ? <div className="empty">Nenhuma tarefa ligada a este lead.</div> : null}
              <div style={{ padding: '12px 18px 0' }}><button type="button" className="btn" onClick={() => erp.openQuick('task', { lead_id: lead.id, front: 'comercial', title: `${lead.company}: ` })}>Nova tarefa</button></div>
            </div>
          ) : null}
          {tab === 'meetings' ? (
            <div className="stack" style={{ paddingTop: 12 }}>
              {meetings.map((m) => (
                <Link key={m.id} to={`/erp/reunioes?id=${m.id}`} className="li" style={{ color: 'var(--tx)' }}>
                  <span>{m.title}</span><span className="lbl num">{MEETING_TYPES[m.type]} · {dm(m.starts_at)} {hm(m.starts_at)}</span>
                </Link>
              ))}
              {!meetings.length ? <div className="empty">Nenhuma reunião.</div> : null}
            </div>
          ) : null}
        </div>
      </div>

      {modal === 'lost' ? <LostModal lead={lead} stages={stages} reasons={settings.lost_reasons || ['Preço', 'Sem resposta', 'Já tem fornecedor', 'Não é o momento', 'Outro']} onClose={() => setModal(null)} /> : null}
      {modal === 'win' ? <WinModal lead={lead} P={P} onClose={() => setModal(null)} /> : null}
    </div>
  )
}

function NextStep({ lead, playbooks, canEdit }) {
  const [f, setF] = useState({ next_step: lead.next_step || '', next_step_at: lead.next_step_at || '', next_step_code: lead.next_step_code || '' })
  useEffect(() => setF({ next_step: lead.next_step || '', next_step_at: lead.next_step_at || '', next_step_code: lead.next_step_code || '' }), [lead.next_step, lead.next_step_at, lead.next_step_code])
  const dirty = f.next_step !== (lead.next_step || '') || f.next_step_at !== (lead.next_step_at || '') || f.next_step_code !== (lead.next_step_code || '')
  const late = lead.next_step_at && lead.next_step_at < today()
  return (
    <Card pad title={<h2>Próximo passo</h2>} style={{ borderColor: late ? 'var(--red-ln)' : !lead.next_step_at ? 'var(--yel-ln)' : undefined }}>
      <div className="stack">
        <Field label="O que fazer"><input className="in" disabled={!canEdit} value={f.next_step} onChange={(e) => setF({ ...f, next_step: e.target.value })} placeholder="Ex.: Mandar análise gratuita" /></Field>
        <div className="row" style={{ flexWrap: 'nowrap' }}>
          <Field label="Quando" style={{ flex: 1 }}><input type="date" className="in" disabled={!canEdit} value={f.next_step_at} onChange={(e) => setF({ ...f, next_step_at: e.target.value })} /></Field>
          <Field label="Mensagem" style={{ flex: 1 }}><Select disabled={!canEdit} value={f.next_step_code} onChange={(v) => setF({ ...f, next_step_code: v || '' })} placeholder="—" options={playbooks.filter((p) => p.code).map((p) => [p.code, `${p.code} · ${p.title}`])} /></Field>
        </div>
        <div className="row">
          {[['Amanhã', 1], ['3 dias', 3], ['1 semana', 7]].map(([l, d]) => (
            <button key={l} type="button" className="btn s" disabled={!canEdit} onClick={() => setF({ ...f, next_step_at: addDays(today(), d) })}>{l}</button>
          ))}
          <span className="grow" />
          {dirty ? <AsyncButton className="btn s p" onClick={() => update('leads', lead.id, { next_step: f.next_step || null, next_step_at: f.next_step_at || null, next_step_code: f.next_step_code || null }).then(() => notify('Próximo passo salvo.', 'ok'))}>Salvar</AsyncButton> : null}
        </div>
      </div>
    </Card>
  )
}

function Composer({ lead, playbooks, defaultCode }) {
  const [f, setF] = useState({ type: 'whatsapp', script_code: defaultCode || '', result: 'enviado', note: '' })
  const save = async () => {
    await registerActivity(lead, { type: f.type, script_code: f.script_code || null, result: f.type === 'nota' ? null : f.result, note: f.note || null })
    setF({ ...f, note: '' })
    notify(f.result === 'respondeu' ? 'Registrado. O lead foi para "Respondeu" e entrou na fila de hoje.' : 'Contato registrado e próximo follow-up agendado.', 'ok')
  }
  return (
    <div className="stack" style={{ padding: '16px 0', borderBottom: '1px solid var(--line)' }}>
      <div className="row">
        <Field label="Tipo"><Select value={f.type} onChange={(v) => setF({ ...f, type: v })} options={Object.entries(ACTIVITY_TYPES).filter(([k]) => !['sistema', 'reuniao'].includes(k))} /></Field>
        {f.type !== 'nota' ? <Field label="Mensagem usada"><Select value={f.script_code} onChange={(v) => setF({ ...f, script_code: v || '' })} placeholder="—" options={playbooks.filter((p) => p.code).map((p) => [p.code, `${p.code} · ${p.title}`])} /></Field> : null}
        {f.type !== 'nota' ? <Field label="Resultado"><Select value={f.result} onChange={(v) => setF({ ...f, result: v })} options={RESULTS} /></Field> : null}
      </div>
      <Field label="Observação"><textarea className="ta" rows={2} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="Ex.: pediu para mandar depois das 14h" /></Field>
      <div className="row" style={{ justifyContent: 'flex-end' }}><AsyncButton className="btn p" onClick={save}>Registrar</AsyncButton></div>
    </div>
  )
}

function Notes({ lead, canEdit }) {
  const [txt, setTxt] = useState(lead.notes || '')
  const [saved, setSaved] = useState(true)
  useEffect(() => {
    if (saved) return
    const t = setTimeout(async () => { await update('leads', lead.id, { notes: txt }, { quiet: true }); setSaved(true) }, 900)
    return () => clearTimeout(t)
  }, [txt, saved, lead.id])
  return (
    <label className="stack-s" style={{ paddingTop: 16 }}>
      <span className="lbl">{saved ? 'Salvo automaticamente' : 'Salvando…'}</span>
      <textarea className="ta" rows={12} disabled={!canEdit} value={txt} onChange={(e) => { setTxt(e.target.value); setSaved(false) }} placeholder="Anotações sobre o lead, o que ele disse, objeções…" />
    </label>
  )
}

function LeadForm({ lead, partners, onDone }) {
  const auth = useAuth()
  const [f, setF] = useState({ ...lead })
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }))
  const save = async () => {
    const { id, created_at, updated_at, created_by, stage_changed_at, ...rest } = f
    const keys = ['company', 'niche', 'neighborhood', 'city', 'phone', 'instagram', 'website', 'has_site', 'origin', 'estimated_value_cents', 'estimated_recurring', 'partner_id', 'owner_id']
    await update('leads', lead.id, Object.fromEntries(keys.map((k) => [k, rest[k] === '' ? null : rest[k]])))
    notify('Dados salvos.', 'ok'); onDone()
  }
  return (
    <div className="stack">
      <div className="fields">
        <Field label="Empresa"><input className="in" value={f.company || ''} onChange={(e) => set('company')(e.target.value)} /></Field>
        <Field label="Nicho"><input className="in" value={f.niche || ''} onChange={(e) => set('niche')(e.target.value)} /></Field>
        <Field label="Bairro"><input className="in" value={f.neighborhood || ''} onChange={(e) => set('neighborhood')(e.target.value)} /></Field>
        <Field label="Cidade"><input className="in" value={f.city || ''} onChange={(e) => set('city')(e.target.value)} /></Field>
        <Field label="WhatsApp"><input className="in" value={f.phone || ''} onChange={(e) => set('phone')(e.target.value)} /></Field>
        <Field label="Instagram"><input className="in" value={f.instagram || ''} onChange={(e) => set('instagram')(e.target.value)} /></Field>
        <Field label="Site"><input className="in" value={f.website || ''} onChange={(e) => set('website')(e.target.value)} /></Field>
        <Field label="Origem"><input className="in" value={f.origin || ''} onChange={(e) => set('origin')(e.target.value)} /></Field>
        <Field label="Valor estimado"><MoneyInput value={f.estimated_value_cents} onChange={set('estimated_value_cents')} /></Field>
        <Field label="Indicado por"><Select value={f.partner_id} onChange={set('partner_id')} placeholder="ninguém" options={partners.map((p) => [p.id, p.name])} /></Field>
        {auth.isTotal('crm') ? <Field label="Responsável"><Select value={f.owner_id} onChange={set('owner_id')} placeholder="sem dono" options={auth.members.map((m) => [m.id, m.name])} /></Field> : null}
      </div>
      <div className="row">
        <label className="check"><input type="checkbox" checked={!!f.has_site} onChange={(e) => set('has_site')(e.target.checked)} />Tem site</label>
        <label className="check"><input type="checkbox" checked={!!f.estimated_recurring} onChange={(e) => set('estimated_recurring')(e.target.checked)} />Valor é mensal</label>
      </div>
      <div className="row" style={{ justifyContent: 'flex-end' }}><button type="button" className="btn" onClick={onDone}>Cancelar</button><AsyncButton className="btn p" onClick={save}>Salvar</AsyncButton></div>
    </div>
  )
}

function Contacts({ lead, contacts, canEdit }) {
  const [adding, setAdding] = useState(false)
  const [f, setF] = useState({ name: '', phone: '', email: '', job_title: '', decision_role: 'decisor' })
  const roleCls = { decisor: 'g', filtro: 'y', influenciador: 'bl' }
  return (
    <Card pad title={<h2>Contatos</h2>} action={canEdit ? <button type="button" className="btn s" onClick={() => setAdding(!adding)}>{adding ? 'Fechar' : 'Adicionar'}</button> : null}>
      {contacts.map((c) => (
        <div key={c.id} className="li">
          <div className="stack-s" style={{ gap: 2, minWidth: 0 }}>
            <span>{c.name}{c.job_title ? <span className="lbl"> · {c.job_title}</span> : null}</span>
            <span className="lbl num">{[c.phone, c.email].filter(Boolean).join(' · ') || '—'}</span>
          </div>
          <div className="row" style={{ flexWrap: 'nowrap' }}>
            {c.phone ? <a className="btn s ic g" href={waLink(c.phone)} aria-label={`WhatsApp de ${c.name}`}><Icon name="wa" size={13} /></a> : null}
            <Badge kind={roleCls[c.decision_role]}>{c.decision_role}</Badge>
            {canEdit ? <button type="button" className="btn s ic g" aria-label="Remover contato" onClick={() => remove('contacts', c.id)}><Icon name="x" size={13} /></button> : null}
          </div>
        </div>
      ))}
      {!contacts.length && !adding ? <p className="lbl">Nenhum contato. Adicione quem decide.</p> : null}
      {adding ? (
        <div className="stack" style={{ paddingTop: 10 }}>
          <div className="fields">
            <Field label="Nome"><input className="in" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
            <Field label="WhatsApp"><input className="in" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
            <Field label="E-mail"><input className="in" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
            <Field label="Cargo"><input className="in" value={f.job_title} onChange={(e) => setF({ ...f, job_title: e.target.value })} /></Field>
            <Field label="Papel"><Select value={f.decision_role} onChange={(v) => setF({ ...f, decision_role: v })} options={{ decisor: 'Decisor', filtro: 'Filtro', influenciador: 'Influenciador' }} /></Field>
          </div>
          <AsyncButton className="btn p" onClick={async () => {
            if (!f.name.trim()) return notify('Informe o nome.', 'err')
            await insert('contacts', { ...f, lead_id: lead.id, client_id: lead.client_id || null })
            setF({ name: '', phone: '', email: '', job_title: '', decision_role: 'decisor' }); setAdding(false)
          }}>Salvar contato</AsyncButton>
        </div>
      ) : null}
    </Card>
  )
}

export function LostModal({ lead, stages, reasons, onClose }) {
  const [reason, setReason] = useState(reasons[0])
  const [note, setNote] = useState('')
  const lost = stages.find((s) => s.kind === 'lost')
  return (
    <Modal size="sm" title="Marcar como perdido" onClose={onClose} footer={<>
      <button type="button" className="btn" onClick={onClose}>Cancelar</button>
      <AsyncButton className="btn d" onClick={async () => {
        await update('leads', lead.id, { stage_id: lost?.id || lead.stage_id, lost_reason: reason, next_step: null, next_step_at: null, next_step_code: null })
        if (note) await insert('activities', { lead_id: lead.id, type: 'nota', note: `Perdido: ${reason}. ${note}` }, { quiet: true })
        notify('Marcado como perdido. O motivo entra no relatório de perdas.', 'ok'); onClose()
      }}>Marcar perdido</AsyncButton>
    </>}>
      <Field label="Motivo (obrigatório)"><Select value={reason} onChange={setReason} options={reasons} /></Field>
      <Field label="Detalhe (opcional)"><textarea className="ta" rows={3} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
    </Modal>
  )
}

export function WinModal({ lead, P, onClose }) {
  const { data } = useData(async () => ({
    services: await fetchRows('services', { order: 'sort', ascending: true }),
    templates: await fetchRows('project_templates', { order: 'name', ascending: true }),
  }), ['services'])
  const [f, setF] = useState({ service: '', title: '', kind: 'once', amount_cents: lead.estimated_value_cents || 0, installments: 1, firstDue: today(), templateId: '', createProject: true })
  const pickService = (id) => {
    const s = data?.services.find((x) => x.id === id)
    setF((v) => ({ ...v, service: id, title: s?.name || v.title, kind: s?.billing === 'monthly' ? 'recurring' : 'once', amount_cents: s?.min_cents || v.amount_cents, templateId: s?.template_id || v.templateId }))
  }
  const won = P.of(lead.pipeline_id).find((s) => s.kind === 'won') || P.find('vendas', (s) => s.kind === 'won')
  return (
    <Modal title={`Ganho: ${lead.company}`} onClose={onClose} footer={<>
      <button type="button" className="btn" onClick={onClose}>Cancelar</button>
      <AsyncButton className="btn p" onClick={async () => {
        if (!f.amount_cents) return notify('Informe o valor.', 'err')
        await winLead(lead, f)
        if (won) await update('leads', lead.id, { stage_id: won.id, pipeline_id: won.pipeline_id, next_step: null, next_step_at: null, estimated_value_cents: f.amount_cents }, { quiet: true })
        notify('Cliente, contrato, cobranças e projeto criados.', 'ok'); onClose()
      }}>Criar cliente e contrato</AsyncButton>
    </>}>
      <p className="lbl" style={{ lineHeight: 1.6 }}>Se você fez a proposta no sistema, prefira aceitar a proposta: ela já traz os itens. Aqui é o atalho para fechar direto.</p>
      <div className="fields">
        <Field label="Serviço"><Select value={f.service} onChange={pickService} placeholder="Escolha" options={(data?.services || []).map((s) => [s.id, s.name])} /></Field>
        <Field label="Título do contrato"><input className="in" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
        <Field label="Tipo"><Select value={f.kind} onChange={(v) => setF({ ...f, kind: v })} options={{ once: 'Projeto único', recurring: 'Mensal' }} /></Field>
        <Field label={f.kind === 'once' ? 'Valor total' : 'Valor mensal'}><MoneyInput value={f.amount_cents} onChange={(v) => setF({ ...f, amount_cents: v })} /></Field>
        {f.kind === 'once' ? <Field label="Parcelas"><input type="number" min={1} max={12} className="in num" value={f.installments} onChange={(e) => setF({ ...f, installments: Number(e.target.value) || 1 })} /></Field> : null}
        <Field label={f.kind === 'once' ? 'Primeiro vencimento' : 'Primeira cobrança'}><input type="date" className="in" value={f.firstDue} onChange={(e) => setF({ ...f, firstDue: e.target.value })} /></Field>
        <Field label="Template do projeto"><Select value={f.templateId} onChange={(v) => setF({ ...f, templateId: v || '' })} placeholder="sem template" options={(data?.templates || []).map((t) => [t.id, t.name])} /></Field>
      </div>
      <label className="check"><input type="checkbox" checked={f.createProject} onChange={(e) => setF({ ...f, createProject: e.target.checked })} />Criar projeto com tarefas, checklist e marcos</label>
    </Modal>
  )
}

export { useMemo }
