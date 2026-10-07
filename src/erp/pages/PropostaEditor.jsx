import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useMeta } from '../components/Shell'
import { useAuth } from '../lib/auth'
import { useData, fetchRows, fetchOne, insert, update, remove, archive, notify, emitChange, useSettings } from '../lib/data'
import { acceptProposal, getPipelines } from '../lib/automations'
import { brl, brl0, today, addDays, dmy, toCents, fillTemplate, waLink } from '../lib/format'
import { PageHead, Card, Loading, ErrorBox, Field, Select, MoneyInput, AsyncButton, Badge, Modal, useConfirm } from '../components/ui'
import { PROPOSAL_STATUS, PROPOSAL_CLASS } from '../lib/constants'
import { Icon } from '../lib/icons'

const blank = () => ({ status: 'rascunho', valid_until: addDays(today(), 15), discount_pct: 0, installments: 1, payment_terms: '', first_due_on: today(), pdf_url: '', script_url: '', notes: '', title: '' })

export default function PropostaEditor() {
  const { id } = useParams()
  const isNew = id === 'nova'
  const [sp] = useSearchParams()
  const nav = useNavigate()
  const auth = useAuth()
  const confirm = useConfirm()
  const settings = useSettings()
  const [p, setP] = useState(null)
  const [items, setItems] = useState([])
  const [dirty, setDirty] = useState(false)
  const [accepting, setAccepting] = useState(false)
  const [refusing, setRefusing] = useState(false)

  const { data, loading, error, reload } = useData(async () => {
    const [services, leads, clients] = await Promise.all([
      fetchRows('services', { order: 'sort', ascending: true }),
      fetchRows('leads', { select: 'id, company, phone, client_id, partner_id, estimated_value_cents, pipeline_id, stage_id', limit: 5000 }),
      fetchRows('clients', { order: 'name', ascending: true }).catch(() => []),
    ])
    let proposal = null, its = []
    if (!isNew) {
      proposal = await fetchOne('proposals', id)
      its = await fetchRows('proposal_items', { where: (q) => q.eq('proposal_id', id), order: 'sort', ascending: true })
    }
    const contacts = proposal?.lead_id || sp.get('lead') ? await fetchRows('contacts', { where: (q) => q.eq('lead_id', proposal?.lead_id || sp.get('lead')), order: null }).catch(() => []) : []
    return { services, leads, clients, proposal, its, contacts }
  }, ['proposals', 'proposal_items', 'services'], [id])

  useEffect(() => {
    if (!data) return
    if (isNew) {
      const lead = data.leads.find((l) => l.id === sp.get('lead'))
      const contact = data.contacts.find((c) => c.decision_role === 'decisor') || data.contacts[0]
      setP({ ...blank(), lead_id: lead?.id || null, client_id: lead?.client_id || sp.get('client') || null, contact_name: contact?.name || '', title: lead ? `Proposta ${lead.company}` : '' })
      setItems([])
    } else if (data.proposal && !dirty) {
      setP(data.proposal); setItems(data.its)
    }
  }, [data, isNew]) // eslint-disable-line react-hooks/exhaustive-deps

  const totals = useMemo(() => {
    const disc = 1 - (Number(p?.discount_pct) || 0) / 100
    const once = Math.round(items.filter((i) => !i.recurring).reduce((a, i) => a + i.unit_cents * (Number(i.qty) || 1), 0) * disc)
    const monthly = Math.round(items.filter((i) => i.recurring).reduce((a, i) => a + i.unit_cents * (Number(i.qty) || 1), 0) * disc)
    return { once, monthly, year: once + monthly * 12, per: p?.installments > 1 ? Math.round(once / p.installments) : once }
  }, [items, p])

  useMeta('Comercial / Propostas', isNew ? 'Nova proposta' : `Proposta #${String(p?.number || '').padStart(3, '0')}`)
  if (error) return <div className="page"><ErrorBox error={error} onRetry={reload} /></div>
  if (loading || !data || !p) return <div className="page"><Loading rows={8} /></div>
  if (!isNew && !data.proposal) return <div className="page"><div className="empty">Proposta não encontrada. <Link to="/erp/propostas">Voltar</Link></div></div>

  const readOnly = !auth.canEdit('propostas') || ['aceita', 'recusada'].includes(p.status)
  const set = (k) => (v) => { setP((s) => ({ ...s, [k]: v })); setDirty(true) }
  const setItem = (idx, k, v) => { setItems((l) => l.map((x, i) => (i === idx ? { ...x, [k]: v } : x))); setDirty(true) }
  const addService = (s) => {
    setItems((l) => [...l, { service_id: s.id, description: s.name, includes: s.includes, qty: 1, unit_cents: s.min_cents, recurring: s.billing === 'monthly', sort: l.length, _range: [s.min_cents, s.max_cents] }])
    setDirty(true)
  }
  const target = data.clients.find((c) => c.id === p.client_id)?.name || data.leads.find((l) => l.id === p.lead_id)?.company || ''

  const save = async (patch = {}) => {
    if (!p.lead_id && !p.client_id) { notify('Escolha o lead ou o cliente.', 'err'); return null }
    const body = {
      lead_id: p.lead_id || null, client_id: p.client_id || null, title: p.title || `Proposta ${target}`, contact_name: p.contact_name || null,
      status: p.status, valid_until: p.valid_until || null, discount_pct: Number(p.discount_pct) || 0, payment_terms: p.payment_terms || null,
      installments: Number(p.installments) || 1, first_due_on: p.first_due_on || null, pdf_url: p.pdf_url || null, script_url: p.script_url || null,
      notes: p.notes || null, ...patch,
    }
    let saved
    if (isNew) saved = await insert('proposals', body)
    else saved = await update('proposals', p.id, body)
    const pid = saved.id
    // itens: apaga e recria (são poucos)
    if (!isNew) for (const it of data.its) await remove('proposal_items', it.id, { quiet: true })
    if (items.length) {
      await insert('proposal_items', items.map(({ id: _i, _range, proposal_id, ...it }, i) => ({ ...it, qty: Number(it.qty) || 1, proposal_id: pid, sort: i })), { quiet: true })
    }
    emitChange('proposals', 'proposal_items')
    setDirty(false)
    if (isNew) nav(`/erp/propostas/${pid}`, { replace: true })
    return saved
  }

  const markSent = async () => {
    const saved = await save({ status: 'enviada', sent_at: p.sent_at || new Date().toISOString() })
    if (!saved) return
    setP((s) => ({ ...s, status: 'enviada', sent_at: saved.sent_at }))
    // move o lead para "Proposta enviada" no pipeline de vendas
    if (saved.lead_id) {
      const P = await getPipelines()
      const st = P.find('vendas', (s) => s.name.toLowerCase().startsWith('proposta'))
      const lead = data.leads.find((l) => l.id === saved.lead_id)
      const curKind = P.stage(lead?.stage_id)?.kind
      if (st && curKind !== 'won' && lead?.stage_id !== st.id) {
        await update('leads', saved.lead_id, { stage_id: st.id, pipeline_id: st.pipeline_id, estimated_value_cents: totals.once + totals.monthly, next_step: 'Cobrar retorno da proposta', next_step_at: addDays(today(), 3) }, { quiet: true })
      }
      await insert('activities', { lead_id: saved.lead_id, type: 'sistema', note: `Proposta #${saved.number} enviada · ${brl0(totals.once)}${totals.monthly ? ` + ${brl0(totals.monthly)}/mês` : ''}` }, { quiet: true })
    }
    notify('Proposta marcada como enviada. O lead foi para "Proposta enviada" e o follow-up ficou para daqui a 3 dias.', 'ok')
  }

  const lead = data.leads.find((l) => l.id === p.lead_id)
  const followMsg = fillTemplate('Oi [NOME], tudo bem? Conseguiu olhar a proposta que te enviei? Se quiser, posso ajustar algum ponto ou explicar por ligação.', { NOME: (p.contact_name || '').split(' ')[0] || '' })
  const wa = waLink(lead?.phone, followMsg)

  return (
    <div className="page">
      <Link to="/erp/propostas" className="lbl" style={{ color: 'var(--mut)' }}>← Voltar para propostas</Link>
      <PageHead title={<span className="row" style={{ gap: 10 }}>{isNew ? 'Nova proposta' : <>Proposta <span className="num mut" style={{ fontWeight: 400 }}>#{String(p.number).padStart(3, '0')}</span></>} <Badge kind={PROPOSAL_CLASS[p.status]}>{PROPOSAL_STATUS[p.status]}</Badge></span>}
        sub={target ? `Para ${target}${p.sent_at ? ` · enviada em ${dmy(p.sent_at)}` : ''}${p.accepted_at ? ` · aceita em ${dmy(p.accepted_at)}` : ''}` : 'Escolha o lead ou cliente'}>
        {!readOnly ? <AsyncButton className="btn" disabled={!dirty && !isNew} onClick={() => save().then((s) => s && notify('Salvo.', 'ok'))}>Salvar rascunho</AsyncButton> : null}
        {!readOnly && ['rascunho', 'expirada'].includes(p.status) ? <AsyncButton className="btn p" onClick={markSent}>Marcar como enviada</AsyncButton> : null}
        {!readOnly && ['enviada', 'vista'].includes(p.status) ? <>
          {wa ? <a className="btn" href={wa} target="_blank" rel="noreferrer"><Icon name="wa" size={14} />Cobrar retorno</a> : null}
          {p.status === 'enviada' ? <AsyncButton className="btn" onClick={async () => { await update('proposals', p.id, { status: 'vista' }); setP({ ...p, status: 'vista' }) }}>Cliente viu</AsyncButton> : null}
<button type="button" className="btn d" onClick={() => setRefusing(true)}>Recusada</button>
          {auth.isTotal('clientes') ? <button type="button" className="btn p" onClick={() => setAccepting(true)}>Aceita</button> : null}
        </> : null}
      </PageHead>

      <div className="cols">
        <div className="stack" style={{ flex: '2 1 520px', minWidth: 0, gap: 16 }}>
          <Card pad>
            <div className="fields">
              <Field label="Lead">
                <Select disabled={readOnly} value={p.lead_id} onChange={(v) => { set('lead_id')(v); const l = data.leads.find((x) => x.id === v); if (l?.client_id) set('client_id')(l.client_id) }}
                  placeholder="—" options={data.leads.map((l) => [l.id, l.company])} />
              </Field>
              <Field label="Ou cliente existente"><Select disabled={readOnly} value={p.client_id} onChange={set('client_id')} placeholder="—" options={data.clients.map((c) => [c.id, c.name])} /></Field>
              <Field label="Contato"><input className="in" disabled={readOnly} value={p.contact_name || ''} onChange={(e) => set('contact_name')(e.target.value)} /></Field>
              <Field label="Validade"><input type="date" className="in" disabled={readOnly} value={p.valid_until || ''} onChange={(e) => set('valid_until')(e.target.value)} /></Field>
            </div>
          </Card>

          <Card title={<h2>Itens</h2>} action={<span className="lbl">clique num serviço do catálogo para adicionar</span>}>
            <div className="tbl-wrap"><table className="tbl">
              <thead><tr><th>Serviço</th><th>Inclui</th><th>Qtd</th><th>Valor unitário</th><th>Cobrança</th><th /></tr></thead>
              <tbody>
                {items.map((it, i) => (
                  <tr key={i}>
                    <td><input className="in" disabled={readOnly} value={it.description} onChange={(e) => setItem(i, 'description', e.target.value)} style={{ minWidth: 160 }} /></td>
                    <td><input className="in" disabled={readOnly} value={it.includes || ''} onChange={(e) => setItem(i, 'includes', e.target.value)} style={{ minWidth: 160 }} /></td>
                    <td><input className="in num" disabled={readOnly} style={{ width: 60 }} value={it.qty} onChange={(e) => setItem(i, 'qty', e.target.value.replace(/[^\d.]/g, ''))} /></td>
                    <td>
                      <MoneyInput disabled={readOnly} value={it.unit_cents} onChange={(v) => setItem(i, 'unit_cents', v)} style={{ width: 120 }} />
                      {it._range && it._range[1] > it._range[0] && (it.unit_cents < it._range[0] || it.unit_cents > it._range[1]) ? <span className="lbl warn" style={{ display: 'block', fontSize: 11 }}>fora da faixa {brl0(it._range[0])}–{brl0(it._range[1])}</span> : null}
                    </td>
                    <td><Select disabled={readOnly} value={it.recurring ? 'm' : 'u'} onChange={(v) => setItem(i, 'recurring', v === 'm')} options={[['u', 'Única'], ['m', 'Mensal']]} style={{ width: 100 }} /></td>
                    <td>{!readOnly ? <button type="button" className="btn s ic" aria-label="Remover item" onClick={() => { setItems((l) => l.filter((_, j) => j !== i)); setDirty(true) }}><Icon name="x" size={13} /></button> : null}</td>
                  </tr>
                ))}
                {!items.length ? <tr><td colSpan={6} className="lbl">Nenhum item. Adicione pelo catálogo ao lado.</td></tr> : null}
              </tbody>
            </table></div>
            {!readOnly ? <div style={{ padding: '10px 16px' }}><button type="button" className="btn s" onClick={() => { setItems((l) => [...l, { description: 'Item personalizado', qty: 1, unit_cents: 0, recurring: false }]); setDirty(true) }}>+ Item livre</button></div> : null}
          </Card>

          <Card pad>
            <div className="fields">
              <Field label="Parcelas (projeto)"><input type="number" min={1} max={12} disabled={readOnly} className="in num" value={p.installments} onChange={(e) => set('installments')(Number(e.target.value) || 1)} /></Field>
              <Field label="Primeiro vencimento"><input type="date" className="in" disabled={readOnly} value={p.first_due_on || ''} onChange={(e) => set('first_due_on')(e.target.value)} /></Field>
              <Field label="Desconto (%)"><input className="in num" disabled={readOnly} value={p.discount_pct} onChange={(e) => set('discount_pct')(e.target.value.replace(/[^\d.]/g, ''))} /></Field>
              <Field label="Forma de pagamento"><input className="in" disabled={readOnly} value={p.payment_terms || ''} onChange={(e) => set('payment_terms')(e.target.value)} placeholder="Ex.: Pix, 3× sem juros" /></Field>
              <Field label="Link do PDF no Drive"><input className="in" disabled={readOnly} value={p.pdf_url || ''} onChange={(e) => set('pdf_url')(e.target.value)} placeholder="https://drive.google.com/…" /></Field>
              <Field label="Link do roteiro (.docx)"><input className="in" disabled={readOnly} value={p.script_url || ''} onChange={(e) => set('script_url')(e.target.value)} placeholder="https://drive.google.com/…" /></Field>
            </div>
            <Field label="Observações" style={{ marginTop: 12 }}><textarea className="ta" rows={3} disabled={readOnly} value={p.notes || ''} onChange={(e) => set('notes')(e.target.value)} /></Field>
          </Card>
          {!isNew && auth.isTotal('propostas') ? (
            <div><button type="button" className="btn s g" onClick={async () => { if (await confirm('Arquivar esta proposta?', { ok: 'Arquivar', danger: true })) { await archive('proposals', p.id); nav('/erp/propostas') } }}><Icon name="trash" size={13} />Arquivar proposta</button></div>
          ) : null}
        </div>

        <div className="stack" style={{ flex: '1 1 300px', minWidth: 0, gap: 16 }}>
          <Card pad style={{ borderColor: 'var(--green-ln)' }} title={<h2>Resumo</h2>}>
            <div className="stack-s" style={{ gap: 10 }}>
              <div className="row" style={{ justifyContent: 'space-between', fontSize: 13 }}><span className="lbl">Projeto (único)</span><span className="num">{brl(totals.once)}</span></div>
              {p.installments > 1 && totals.once ? <div className="row" style={{ justifyContent: 'space-between', fontSize: 13 }}><span className="lbl">{p.installments} parcelas de</span><span className="num">{brl(totals.per)}</span></div> : null}
              <div className="row" style={{ justifyContent: 'space-between', fontSize: 13 }}><span className="lbl">Recorrente</span><span className="num">{brl(totals.monthly)}/mês</span></div>
              <div className="row" style={{ justifyContent: 'space-between', fontSize: 13, paddingTop: 10, borderTop: '1px solid var(--line)' }}><span>Primeiro ano</span><span className="num" style={{ fontSize: 18, color: 'var(--green-tx)' }}>{brl(totals.year)}</span></div>
              <span className="lbl" style={{ lineHeight: 1.5 }}>Ao aceitar: cria cliente, contrato, {p.installments > 1 ? `${p.installments} parcelas` : 'a cobrança'}{totals.monthly ? ', as mensalidades' : ''} e os projetos com tarefas a partir dos templates.</span>
            </div>
          </Card>
          {!readOnly ? (
            <Card pad title={<h2>Catálogo</h2>}>
              {data.services.filter((s) => s.active).map((s) => (
                <button key={s.id} type="button" className="li" onClick={() => addService(s)} style={{ width: '100%', background: 'none', border: 0, borderBottom: '1px solid var(--line-2)', color: 'var(--tx)', cursor: 'pointer', font: 'inherit', textAlign: 'left' }}>
                  <span>{s.name}</span>
                  <span className="num lbl">{s.max_cents ? (s.min_cents === s.max_cents ? brl0(s.min_cents) : `${brl0(s.min_cents)}–${brl0(s.max_cents)}`) : 'sob orçamento'}{s.billing === 'monthly' ? '/mês' : ''}</span>
                </button>
              ))}
            </Card>
          ) : null}
        </div>
      </div>

      {refusing ? <RefuseModal p={p} reasons={settings.lost_reasons || ['Preço', 'Não é o momento', 'Fechou com outro', 'Outro']}
        onDone={() => setP({ ...p, status: 'recusada' })} onClose={() => setRefusing(false)} /> : null}
      {accepting ? <AcceptModal p={p} items={items} save={save} dirty={dirty} onClose={() => setAccepting(false)} /> : null}
    </div>
  )
}

function RefuseModal({ p, reasons, onDone, onClose }) {
  const [reason, setReason] = useState(reasons[0])
  return (
    <Modal size="sm" title="Proposta recusada" onClose={onClose} footer={<>
      <button type="button" className="btn" onClick={onClose}>Cancelar</button>
      <AsyncButton className="btn d" onClick={async () => {
        await update('proposals', p.id, { status: 'recusada', refused_reason: reason })
        if (p.lead_id) {
          const P = await getPipelines()
          const lead = await fetchOne('leads', p.lead_id)
          const lost = lead && (P.of(lead.pipeline_id).find((s) => s.kind === 'lost'))
          if (lost && P.stage(lead.stage_id)?.kind !== 'won') {
            await update('leads', lead.id, { stage_id: lost.id, lost_reason: reason, next_step: null, next_step_at: null }, { quiet: true })
          }
        }
        notify('Registrado. O motivo entra no relatório de perdas.', 'ok'); onDone(); onClose()
      }}>Marcar recusada</AsyncButton>
    </>}>
      <Field label="Motivo"><Select value={reason} onChange={setReason} options={reasons} /></Field>
    </Modal>
  )
}

function AcceptModal({ p, items, save, dirty, onClose }) {
  const [firstDue, setFirstDue] = useState(p.first_due_on || today())
  const [projects, setProjects] = useState(true)
  return (
    <Modal title="Proposta aceita" onClose={onClose} footer={<>
      <button type="button" className="btn" onClick={onClose}>Cancelar</button>
      <AsyncButton className="btn p" onClick={async () => {
        if (dirty) await save()
        await acceptProposal({ ...p, first_due_on: firstDue }, items, { firstDue, createProjects: projects })
        onClose()
      }}>Confirmar e criar tudo</AsyncButton>
    </>}>
      <p style={{ fontSize: 14, lineHeight: 1.6 }}>O sistema vai criar, de uma vez:</p>
      <ul className="lbl" style={{ margin: 0, paddingLeft: 18, lineHeight: 1.9 }}>
        <li>o cliente (com os contatos do lead) e o contrato</li>
        <li>{p.installments > 1 ? `${p.installments} parcelas mensais` : 'a cobrança'} no Contas a receber{items.some((i) => i.recurring) ? ', mais as mensalidades dos itens recorrentes' : ''}</li>
        <li>os projetos com tarefas, checklist e marcos dos templates</li>
        <li>a comissão de 30% se o lead veio de um parceiro</li>
        <li>e move o lead para Ganho</li>
      </ul>
      <Field label="Primeiro vencimento"><input type="date" className="in" value={firstDue} onChange={(e) => setFirstDue(e.target.value)} /></Field>
      <label className="check"><input type="checkbox" checked={projects} onChange={(e) => setProjects(e.target.checked)} />Criar os projetos</label>
    </Modal>
  )
}

export { toCents }
