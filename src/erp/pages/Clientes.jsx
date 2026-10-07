import React, { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMeta, useErp } from '../components/Shell'
import { useAuth } from '../lib/auth'
import { useData, fetchRows, insert, update, archive, notify, rpc } from '../lib/data'
import { createInstallments, createProjectFromTemplate, getPipelines } from '../lib/automations'
import { brl0, dm, dmy, today, daysSince, waLink, igLink, igHandle, localDay, relDay } from '../lib/format'
import { PageHead, Tabs, Loading, ErrorBox, Badge, Modal, Field, Select, MoneyInput, AsyncButton, Empty, useConfirm } from '../components/ui'
import { CLIENT_STATUS, PROJECT_STAGES, PROJECT_STAGE_CLASS, FRONTS, MEETING_TYPES } from '../lib/constants'
import { Icon } from '../lib/icons'

export default function Clientes() {
  useMeta('Operação', 'Clientes')
  const auth = useAuth()
  const erp = useErp()
  const [sp, setSp] = useSearchParams()
  const [filter, setFilter] = useState('ativo')
  const [tab, setTab] = useState('contratos')
  const [modal, setModal] = useState(null)
  const selId = sp.get('id')

  const { data, loading, error, reload } = useData(async () => {
    const [clients, contracts, receivables, projects, meetings, contacts, activities] = await Promise.all([
      fetchRows('clients', { order: 'name', ascending: true }),
      fetchRows('contracts').catch(() => []),
      fetchRows('receivables', { order: 'due_on', ascending: true }).catch(() => []),
      fetchRows('projects').catch(() => []),
      fetchRows('meetings', { order: 'starts_at' }).catch(() => []),
      fetchRows('contacts', { where: (q) => q.not('client_id', 'is', null), order: null }).catch(() => []),
      fetchRows('activities', { where: (q) => q.not('client_id', 'is', null), order: 'happened_at', limit: 2000 }).catch(() => []),
    ])
    return { clients, contracts, receivables, projects, meetings, contacts, activities }
  }, ['clients', 'contracts', 'receivables', 'projects', 'meetings', 'contacts', 'activities'])

  const rows = useMemo(() => {
    if (!data) return []
    const t = today()
    return data.clients.map((c) => {
      const cts = data.contracts.filter((k) => k.client_id === c.id && k.active)
      const recv = data.receivables.filter((r) => r.client_id === c.id)
      const overdue = recv.filter((r) => !r.received_on && r.due_on < t)
      const mrr = cts.filter((k) => k.kind === 'recurring' && (!k.ends_on || k.ends_on >= t)).reduce((a, k) => a + k.monthly_cents, 0)
      const lastTouch = [...data.meetings.filter((m) => m.client_id === c.id).map((m) => localDay(m.starts_at)), ...data.activities.filter((a) => a.client_id === c.id).map((a) => localDay(a.happened_at)), c.since].filter((d) => d && d <= t).sort().pop()
      const lateProj = data.projects.some((p) => p.client_id === c.id && p.due_on && p.due_on < t && !['entregue', 'manutencao'].includes(p.stage))
      const health = overdue.some((r) => daysSince(r.due_on) > 15) || (lateProj && overdue.length) ? 'rk' : overdue.length || lateProj || daysSince(lastTouch) > 60 ? 'at' : 'ok'
      return {
        ...c, cts, mrr, overdue, lastTouch, health,
        services: cts.map((k) => k.title).join(', '),
        total: recv.filter((r) => r.received_on).reduce((a, r) => a + r.amount_cents, 0),
        open: recv.filter((r) => !r.received_on).reduce((a, r) => a + r.amount_cents, 0),
      }
    })
  }, [data])

  useEffect(() => { if (rows.length && !selId) setSp({ id: (rows.find((r) => r.status === filter) || rows[0]).id }, { replace: true }) }, [rows.length]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (sp.get('upsell') && selId && !modal) setModal('upsell') }, [sp, selId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return <div className="page"><ErrorBox error={error} onRetry={reload} /></div>
  if (loading || !data) return <div className="page"><Loading rows={8} /></div>
  const H = { ok: ['Em dia', 'g'], at: ['Atenção', 'y'], rk: ['Risco', 'r'] }
  const list = rows.filter((r) => filter === 'todos' || r.status === filter)
  const sel = rows.find((r) => r.id === selId)
  const mrrAll = rows.filter((r) => r.status === 'ativo').reduce((a, r) => a + r.mrr, 0)
  const contacts = sel ? data.contacts.filter((c) => c.client_id === sel.id) : []

  return (
    <div className="page">
      <PageHead title="Clientes" sub={`${rows.filter((r) => r.status === 'ativo').length} ativos · ${brl0(mrrAll)}/mês recorrente · clique numa linha para abrir a ficha ao lado`}>
        {auth.canEdit('clientes') ? <button type="button" className="btn p" onClick={() => setModal('new')}>Novo cliente</button> : null}
      </PageHead>
      <Tabs value={filter} onChange={setFilter} options={[['ativo', 'Ativos', rows.filter((r) => r.status === 'ativo').length], ['pausado', 'Pausados'], ['encerrado', 'Encerrados'], ['todos', 'Todos', rows.length]]} />

      <div className="cols">
        <div className="card" style={{ flex: '3 1 520px', minWidth: 0, overflow: 'hidden' }}>
          <div className="tbl-wrap"><table className="tbl">
            <thead><tr><th>Cliente</th><th>Serviços ativos</th><th className="r">Recorrente</th><th>Desde</th><th>Saúde</th></tr></thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.id} className={`click ${c.id === selId ? 'on' : ''}`} onClick={() => { setSp({ id: c.id }); setTab('contratos') }}>
                  <td style={{ fontWeight: 500 }}>{c.name}</td>
                  <td className="lbl ellipsis" style={{ maxWidth: 260, color: 'var(--tx-3)' }}>{c.services || '—'}</td>
                  <td className="num r">{c.mrr ? brl0(c.mrr) : '—'}</td>
                  <td className="num lbl">{c.since ? `${c.since.slice(5, 7)}/${c.since.slice(2, 4)}` : '—'}</td>
                  <td><Badge kind={H[c.health][1]}>{H[c.health][0]}</Badge></td>
                </tr>
              ))}
              {!list.length ? <tr><td colSpan={5}><Empty icon="building">Nenhum cliente aqui. Clientes nascem quando uma proposta é aceita ou um lead é marcado como ganho.</Empty></td></tr> : null}
            </tbody>
          </table></div>
        </div>

        {sel ? (
          <aside className="card" aria-label="Ficha do cliente" style={{ flex: '2 1 380px', minWidth: 0, padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div className="stack-s" style={{ gap: 4 }}>
                <h2 style={{ fontSize: 17 }}>{sel.name}</h2>
                <span className="lbl">{[sel.contact_name, sel.phone, `cliente desde ${dmy(sel.since)}`].filter(Boolean).join(' · ')}</span>
                <span className="lbl">Último contato: {sel.lastTouch ? relDay(sel.lastTouch) : '—'}</span>
              </div>
              <div className="row">
                {sel.phone ? <a className="btn s ic" href={waLink(sel.phone)} target="_blank" rel="noreferrer" aria-label="WhatsApp"><Icon name="wa" size={13} /></a> : null}
                {sel.instagram ? <a className="btn s ic" href={igLink(sel.instagram)} target="_blank" rel="noreferrer" aria-label={igHandle(sel.instagram)}>IG</a> : null}
                <Badge kind={H[sel.health][1]}>{H[sel.health][0]}</Badge>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
              {[['Recorrente', sel.mrr ? brl0(sel.mrr) : '—'], ['Total recebido', brl0(sel.total)], ['Em aberto', brl0(sel.open)]].map(([l, v]) => (
                <div key={l} style={{ padding: 10, borderRadius: 8, background: 'var(--s3)', border: '1px solid var(--line)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span className="lbl">{l}</span><span className="num" style={l === 'Em aberto' && sel.overdue.length ? { color: 'var(--red)' } : undefined}>{v}</span>
                </div>
              ))}
            </div>
            <Tabs value={tab} onChange={setTab} options={[['contratos', 'Contratos'], ['projetos', 'Projetos'], ['faturas', 'Faturas'], ['reunioes', 'Reuniões'], ['contatos', 'Contatos'], ['dados', 'Dados']]} />

            {tab === 'contratos' ? (
              <div>
                {data.contracts.filter((k) => k.client_id === sel.id).map((k) => (
                  <div key={k.id} className="li">
                    <div className="stack-s" style={{ gap: 3 }}>
                      <span style={{ fontWeight: 500 }}>{k.title} {!k.active ? <span className="lbl">· encerrado</span> : null}</span>
                      <span className="lbl">{k.kind === 'recurring' ? `mensal · todo dia ${k.billing_day || '—'} · desde ${dm(k.starts_on)}` : `${k.installments} parcela(s) · ${FRONTS[k.front] || ''}`}{k.link ? <> · <a href={k.link} target="_blank" rel="noreferrer">contrato ↗</a></> : null}</span>
                    </div>
                    <div className="row" style={{ flexWrap: 'nowrap' }}>
                      <span className="num">{k.kind === 'recurring' ? `${brl0(k.monthly_cents)}/mês` : brl0(k.total_cents)}</span>
                      {auth.isTotal('clientes') && k.active ? <button type="button" className="btn s g" onClick={() => update('contracts', k.id, { active: false, ends_on: today() }).then(() => notify('Contrato encerrado. Novas cobranças não serão geradas.', 'ok'))}>Encerrar</button> : null}
                    </div>
                  </div>
                ))}
                {!data.contracts.some((k) => k.client_id === sel.id) ? <p className="lbl">Nenhum contrato.</p> : null}
              </div>
            ) : null}
            {tab === 'projetos' ? (
              <div>
                {data.projects.filter((p) => p.client_id === sel.id).map((p) => (
                  <Link key={p.id} to={`/erp/projetos/${p.id}`} className="li" style={{ color: 'var(--tx)' }}><span>{p.name}</span><Badge kind={PROJECT_STAGE_CLASS[p.stage]}>{PROJECT_STAGES[p.stage]}</Badge></Link>
                ))}
                {!data.projects.some((p) => p.client_id === sel.id) ? <p className="lbl">Nenhum projeto.</p> : null}
              </div>
            ) : null}
            {tab === 'faturas' ? (
              <div>
                {data.receivables.filter((r) => r.client_id === sel.id).map((r) => (
                  <div key={r.id} className="li">
                    <span>{r.description} <span className="lbl num">{r.part_label}</span></span>
                    <span className="row" style={{ flexWrap: 'nowrap' }}>
                      <span className="num lbl">{dm(r.due_on)}</span><span className="num">{brl0(r.amount_cents)}</span>
                      <Badge kind={r.received_on ? 'g' : r.due_on < today() ? 'r' : ''}>{r.received_on ? 'Recebida' : r.due_on < today() ? 'Vencida' : 'A vencer'}</Badge>
                    </span>
                  </div>
                ))}
                {!data.receivables.some((r) => r.client_id === sel.id) ? <p className="lbl">Nenhuma fatura.</p> : null}
              </div>
            ) : null}
            {tab === 'reunioes' ? (
              <div>
                {data.meetings.filter((m) => m.client_id === sel.id).map((m) => (
                  <Link key={m.id} to={`/erp/reunioes?id=${m.id}`} className="li" style={{ color: 'var(--tx)' }}><span>{m.title}</span><span className="lbl num">{MEETING_TYPES[m.type]} · {dm(m.starts_at)}</span></Link>
                ))}
                {!data.meetings.some((m) => m.client_id === sel.id) ? <p className="lbl">Nenhuma reunião.</p> : null}
              </div>
            ) : null}
            {tab === 'contatos' ? <ClientContacts client={sel} contacts={contacts} /> : null}
            {tab === 'dados' ? <ClientForm client={sel} onDone={() => setTab('contratos')} /> : null}

            {auth.canEdit('clientes') ? (
              <div className="row">
                <button type="button" className="btn" onClick={() => setModal('contract')}>Novo contrato</button>
                {auth.canEdit('projetos') ? <button type="button" className="btn" onClick={() => setModal('project')}>Novo projeto</button> : null}
                <button type="button" className="btn" onClick={() => erp.openQuick('meeting', { title: `Check-in · ${sel.name}`, type: 'alinhamento', client_id: sel.id, participants: sel.contact_name || '' })}>Agendar check-in</button>
                <button type="button" className="btn" onClick={() => setModal('upsell')}>Oportunidade de upsell</button>
              </div>
            ) : null}
          </aside>
        ) : null}
      </div>

      {modal === 'new' ? <NewClient onClose={() => setModal(null)} onSaved={(c) => setSp({ id: c.id })} /> : null}
      {modal === 'contract' && sel ? <NewContract client={sel} onClose={() => setModal(null)} /> : null}
      {modal === 'project' && sel ? <NewProject client={sel} onClose={() => setModal(null)} /> : null}
      {modal === 'upsell' && sel ? <Upsell client={sel} onClose={() => { setModal(null); if (sp.get('upsell')) setSp({ id: sel.id }) }} /> : null}
    </div>
  )
}

function ClientForm({ client, onDone }) {
  const auth = useAuth()
  const confirm = useConfirm()
  const [f, setF] = useState({ ...client })
  const set = (k) => (e) => setF({ ...f, [k]: e?.target ? e.target.value : e })
  return (
    <div className="stack">
      <div className="fields">
        <Field label="Nome"><input className="in" value={f.name || ''} onChange={set('name')} /></Field>
        <Field label="Contato principal"><input className="in" value={f.contact_name || ''} onChange={set('contact_name')} /></Field>
        <Field label="WhatsApp"><input className="in" value={f.phone || ''} onChange={set('phone')} /></Field>
        <Field label="E-mail"><input className="in" value={f.email || ''} onChange={set('email')} /></Field>
        <Field label="Instagram"><input className="in" value={f.instagram || ''} onChange={set('instagram')} /></Field>
        <Field label="Nicho"><input className="in" value={f.niche || ''} onChange={set('niche')} /></Field>
        <Field label="Cliente desde"><input type="date" className="in" value={f.since || ''} onChange={set('since')} /></Field>
        <Field label="Situação"><Select value={f.status} onChange={set('status')} options={CLIENT_STATUS} /></Field>
      </div>
      <Field label="Observações"><textarea className="ta" rows={3} value={f.notes || ''} onChange={set('notes')} /></Field>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        {auth.isTotal('clientes') ? <button type="button" className="btn s g" onClick={async () => { if (await confirm('Arquivar este cliente?', { ok: 'Arquivar', danger: true })) archive('clients', client.id) }}><Icon name="trash" size={13} />Arquivar</button> : <span />}
        <AsyncButton className="btn p" onClick={async () => {
          const keys = ['name', 'contact_name', 'phone', 'email', 'instagram', 'niche', 'since', 'status', 'notes']
          await update('clients', client.id, Object.fromEntries(keys.map((k) => [k, f[k] || null])))
          notify('Cliente salvo.', 'ok'); onDone()
        }}>Salvar</AsyncButton>
      </div>
    </div>
  )
}

function ClientContacts({ client, contacts }) {
  const [f, setF] = useState({ name: '', phone: '', email: '', job_title: '' })
  return (
    <div className="stack">
      {contacts.map((c) => (
        <div key={c.id} className="li"><span>{c.name}{c.job_title ? <span className="lbl"> · {c.job_title}</span> : null}</span><span className="lbl num">{[c.phone, c.email].filter(Boolean).join(' · ')}</span></div>
      ))}
      {!contacts.length ? <p className="lbl">Nenhum contato cadastrado.</p> : null}
      <div className="row">
        <input className="in" style={{ width: 150 }} placeholder="Nome" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <input className="in" style={{ width: 150 }} placeholder="WhatsApp" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
        <input className="in" style={{ width: 150 }} placeholder="Cargo" value={f.job_title} onChange={(e) => setF({ ...f, job_title: e.target.value })} />
        <AsyncButton className="btn" onClick={async () => { if (!f.name) return; await insert('contacts', { ...f, client_id: client.id }); setF({ name: '', phone: '', email: '', job_title: '' }) }}>Adicionar</AsyncButton>
      </div>
    </div>
  )
}

function NewClient({ onClose, onSaved }) {
  const [f, setF] = useState({ name: '', contact_name: '', phone: '', email: '', niche: '', since: today() })
  return (
    <Modal title="Novo cliente" onClose={onClose} footer={<><button type="button" className="btn" onClick={onClose}>Cancelar</button><AsyncButton className="btn p" onClick={async () => {
      if (!f.name.trim()) return notify('Informe o nome.', 'err')
      const c = await insert('clients', f); notify('Cliente criado.', 'ok'); onSaved(c); onClose()
    }}>Criar cliente</AsyncButton></>}>
      <p className="lbl">Dica: o caminho normal é aceitar uma proposta, que já cria cliente, contrato e cobranças. Use aqui para clientes antigos.</p>
      <div className="fields">
        {[['name', 'Nome'], ['contact_name', 'Contato'], ['phone', 'WhatsApp'], ['email', 'E-mail'], ['niche', 'Nicho']].map(([k, l]) => (
          <Field key={k} label={l}><input className="in" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></Field>
        ))}
        <Field label="Cliente desde"><input type="date" className="in" value={f.since} onChange={(e) => setF({ ...f, since: e.target.value })} /></Field>
      </div>
    </Modal>
  )
}

function NewContract({ client, onClose }) {
  const [f, setF] = useState({ title: '', kind: 'recurring', front: 'social', amount: 0, installments: 1, starts_on: today(), billing_day: 10, link: '' })
  return (
    <Modal title={`Novo contrato · ${client.name}`} onClose={onClose} footer={<><button type="button" className="btn" onClick={onClose}>Cancelar</button><AsyncButton className="btn p" onClick={async () => {
      if (!f.title || !f.amount) return notify('Informe título e valor.', 'err')
      const k = await insert('contracts', {
        client_id: client.id, title: f.title, kind: f.kind, front: f.front, link: f.link || null, starts_on: f.starts_on,
        total_cents: f.kind === 'once' ? f.amount : 0, monthly_cents: f.kind === 'recurring' ? f.amount : 0,
        installments: f.installments, billing_day: f.kind === 'recurring' ? f.billing_day : null, partner_id: client.partner_id || null,
      })
      if (f.kind === 'once') await createInstallments(k, { firstDue: f.starts_on, installments: f.installments })
      else await rpc('erp_generate_recurring', {}, { quiet: true })
      notify(f.kind === 'once' ? 'Contrato e parcelas criados.' : 'Contrato mensal criado. As cobranças se geram sozinhas todo mês.', 'ok'); onClose()
    }}>Criar contrato</AsyncButton></>}>
      <div className="fields">
        <Field label="Título"><input className="in" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Ex.: Manutenção mensal" /></Field>
        <Field label="Tipo"><Select value={f.kind} onChange={(v) => setF({ ...f, kind: v })} options={{ recurring: 'Mensal', once: 'Projeto único' }} /></Field>
        <Field label="Frente"><Select value={f.front} onChange={(v) => setF({ ...f, front: v })} options={FRONTS} /></Field>
        <Field label={f.kind === 'once' ? 'Valor total' : 'Valor mensal'}><MoneyInput value={f.amount} onChange={(v) => setF({ ...f, amount: v })} /></Field>
        {f.kind === 'once' ? <Field label="Parcelas"><input type="number" min={1} className="in num" value={f.installments} onChange={(e) => setF({ ...f, installments: Number(e.target.value) || 1 })} /></Field>
          : <Field label="Dia da cobrança"><input type="number" min={1} max={28} className="in num" value={f.billing_day} onChange={(e) => setF({ ...f, billing_day: Math.min(28, Number(e.target.value) || 10) })} /></Field>}
        <Field label={f.kind === 'once' ? 'Primeiro vencimento' : 'Início'}><input type="date" className="in" value={f.starts_on} onChange={(e) => setF({ ...f, starts_on: e.target.value })} /></Field>
        <Field label="Link do contrato assinado"><input className="in" value={f.link} onChange={(e) => setF({ ...f, link: e.target.value })} placeholder="https://drive.google.com/…" /></Field>
      </div>
    </Modal>
  )
}

export function NewProject({ client, onClose, onSaved }) {
  const auth = useAuth()
  const { data } = useData(async () => ({
    templates: await fetchRows('project_templates', { order: 'name', ascending: true }),
    clients: client ? [] : await fetchRows('clients', { order: 'name', ascending: true }),
  }), ['project_templates'])
  const [f, setF] = useState({ name: '', template: '', client_id: client?.id || '', value_cents: 0, starts_on: today(), due_on: '', owner_id: auth.uid })
  return (
    <Modal title="Novo projeto" onClose={onClose} footer={<><button type="button" className="btn" onClick={onClose}>Cancelar</button><AsyncButton className="btn p" onClick={async () => {
      if (!f.name.trim()) return notify('Dê um nome ao projeto.', 'err')
      const tpl = data?.templates.find((x) => x.id === f.template)
      const p = await createProjectFromTemplate(f.template || null, {
        name: f.name.trim(), client_id: f.client_id || null, value_cents: f.value_cents, starts_on: f.starts_on,
        due_on: f.due_on || undefined, owner_id: f.owner_id, type: tpl?.name || null,
      })
      notify(f.template ? 'Projeto criado com tarefas, checklist e marcos do template.' : 'Projeto criado.', 'ok'); onSaved?.(p); onClose()
    }}>Criar projeto</AsyncButton></>}>
      <div className="fields">
        <Field label="Nome"><input className="in" autoFocus value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder={client ? `Ex.: Site ${client.name}` : ''} /></Field>
        <Field label="Template"><Select value={f.template} onChange={(v) => setF({ ...f, template: v || '' })} placeholder="sem template" options={(data?.templates || []).map((t) => [t.id, t.name])} /></Field>
        {!client ? <Field label="Cliente"><Select value={f.client_id} onChange={(v) => setF({ ...f, client_id: v || '' })} placeholder="interno (sem cliente)" options={(data?.clients || []).map((c) => [c.id, c.name])} /></Field> : null}
        <Field label="Valor"><MoneyInput value={f.value_cents} onChange={(v) => setF({ ...f, value_cents: v })} /></Field>
        <Field label="Início"><input type="date" className="in" value={f.starts_on} onChange={(e) => setF({ ...f, starts_on: e.target.value })} /></Field>
        <Field label="Prazo" hint="vazio = calculado pelo template"><input type="date" className="in" value={f.due_on} onChange={(e) => setF({ ...f, due_on: e.target.value })} /></Field>
        <Field label="Responsável"><Select value={f.owner_id} onChange={(v) => setF({ ...f, owner_id: v })} options={auth.members.map((m) => [m.id, m.name])} /></Field>
      </div>
    </Modal>
  )
}

function Upsell({ client, onClose }) {
  const [f, setF] = useState({ note: '', value: 22700 })
  return (
    <Modal size="sm" title={`Upsell · ${client.name}`} onClose={onClose} footer={<><button type="button" className="btn" onClick={onClose}>Cancelar</button><AsyncButton className="btn p" onClick={async () => {
      const P = await getPipelines()
      const p = P.bySlug('upsell')
      const st = p && P.of(p.id)[0]
      if (!st) return notify('Pipeline de upsell não encontrado.', 'err')
      await insert('leads', {
        company: client.name, phone: client.phone, instagram: client.instagram, niche: client.niche, client_id: client.id,
        pipeline_id: p.id, stage_id: st.id, estimated_value_cents: f.value, estimated_recurring: true, origin: 'Cliente ativo',
        next_step: f.note || 'Oferecer plano mensal', next_step_at: today(),
      })
      notify('Oportunidade criada no pipeline de Upsell.', 'ok'); onClose()
    }}>Criar oportunidade</AsyncButton></>}>
      <Field label="O que oferecer"><input className="in" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="Ex.: Social Media Basic + pedir indicação" /></Field>
      <Field label="Valor mensal estimado"><MoneyInput value={f.value} onChange={(v) => setF({ ...f, value: v })} /></Field>
    </Modal>
  )
}
