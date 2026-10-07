import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMeta } from '../components/Shell'
import { useAuth } from '../lib/auth'
import { useData, fetchRows, insert, update, notify } from '../lib/data'
import { markPaid } from '../lib/automations'
import { brl0, dm, waLink } from '../lib/format'
import { PageHead, Loading, ErrorBox, Badge, Modal, Field, AsyncButton, Empty, Stat, Card } from '../components/ui'
import { COMMISSION_STATUS, COMMISSION_CLASS } from '../lib/constants'
import { PayModal } from './Pagar'
import { Icon } from '../lib/icons'

export default function Parceiros() {
  useMeta('Empresa', 'Parceiros')
  const auth = useAuth()
  const [modal, setModal] = useState(null)
  const [paying, setPaying] = useState(null)
  const { data, loading, error, reload } = useData(async () => {
    const [partners, commissions, leads, clients, payables] = await Promise.all([
      fetchRows('partners', { order: 'name', ascending: true }),
      fetchRows('commissions').catch(() => []),
      fetchRows('leads', { select: 'id, company, partner_id, stage_id, won_at, estimated_value_cents', archived: true, limit: 5000 }).catch(() => []),
      fetchRows('clients', { select: 'id, name' }).catch(() => []),
      fetchRows('payables', { where: (q) => q.not('commission_id', 'is', null), order: null }).catch(() => []),
    ])
    return { partners, commissions, leads, clients, payables }
  }, ['partners', 'commissions', 'payables', 'leads'])

  if (error) return <div className="page"><ErrorBox error={error} onRetry={reload} /></div>
  if (loading || !data) return <div className="page"><Loading rows={6} /></div>
  const year = String(new Date().getFullYear())
  const sum = (l) => l.reduce((a, c) => a + c.amount_cents, 0)
  const toPay = data.commissions.filter((c) => c.status === 'a_pagar')
  const expected = data.commissions.filter((c) => c.status === 'prevista')
  const paidYear = data.commissions.filter((c) => c.status === 'paga' && (c.updated_at || '').startsWith(year))

  return (
    <div className="page">
      <PageHead title="Parceiros indicadores" sub="Comissão sobre o valor do projeto fechado, liberada quando o cliente paga. Contratos mensais geram comissão sobre a primeira mensalidade.">
        {auth.canEdit('parceiros') ? <button type="button" className="btn p" onClick={() => setModal({})}>Novo parceiro</button> : null}
      </PageHead>

      <div className="card stats">
        <Stat label="Parceiros ativos" value={data.partners.filter((p) => p.active).length} />
        <Stat label="Leads indicados" value={data.leads.filter((l) => l.partner_id).length} />
        <Stat label="Fechados" value={data.leads.filter((l) => l.partner_id && l.won_at).length} />
        <Stat label="Comissão prevista" value={brl0(sum(expected))} sub="aguarda o cliente pagar" />
        <Stat label="Liberada para pagar" value={brl0(sum(toPay))} valueClass={toPay.length ? 'warn' : ''} />
        <Stat label="Paga no ano" value={brl0(sum(paidYear))} />
      </div>

      <Card title="Parceiros">
        <div className="tbl-wrap"><table className="tbl">
          <thead><tr><th>Parceiro</th><th>Origem</th><th className="r">%</th><th className="r">Indicados</th><th className="r">Fechados</th><th className="r">Comissão total</th><th /></tr></thead>
          <tbody>
            {data.partners.map((p) => {
              const ind = data.leads.filter((l) => l.partner_id === p.id)
              const com = data.commissions.filter((c) => c.partner_id === p.id && c.status !== 'cancelada')
              return (
                <tr key={p.id} style={!p.active ? { opacity: 0.5 } : undefined}>
                  <td style={{ fontWeight: 500 }}>{p.name}</td><td>{p.origin || '—'}</td><td className="num r">{Number(p.pct)}%</td>
                  <td className="num r">{ind.length}</td><td className="num r">{ind.filter((l) => l.won_at).length}</td><td className="num r">{brl0(sum(com))}</td>
                  <td><div className="row" style={{ flexWrap: 'nowrap', gap: 4 }}>
                    {p.phone ? <a className="btn s ic g" href={waLink(p.phone, `Oi ${p.name.split(' ')[0]}, tudo bem? Passando para agradecer pelas indicações. Se lembrar de alguém que precise de site ou sistema, pode mandar que eu cuido de tudo.`)} target="_blank" rel="noreferrer" aria-label="WhatsApp"><Icon name="wa" size={13} /></a> : null}
                    {auth.canEdit('parceiros') ? <button type="button" className="btn s ic g" aria-label="Editar" onClick={() => setModal(p)}><Icon name="edit" size={13} /></button> : null}
                  </div></td>
                </tr>
              )
            })}
            {!data.partners.length ? <tr><td colSpan={7}><Empty icon="users">Nenhum parceiro. Cadastre quem indica clientes; no lead, escolha "Indicado por" e a comissão se calcula sozinha.</Empty></td></tr> : null}
          </tbody>
        </table></div>
      </Card>

      <Card title="Comissões" action={<Link to="/erp/financeiro/pagar" style={{ fontSize: 12 }}>Ver no Contas a pagar</Link>}>
        <div className="tbl-wrap"><table className="tbl">
          <thead><tr><th>Referência</th><th>Cliente</th><th>Parceiro</th><th className="r">Base</th><th className="r">Comissão</th><th>Status</th><th /></tr></thead>
          <tbody>
            {data.commissions.map((c) => {
              const pay = data.payables.find((x) => x.commission_id === c.id)
              return (
                <tr key={c.id}>
                  <td>{c.description || '—'}</td>
                  <td>{data.clients.find((x) => x.id === c.client_id)?.name || '—'}</td>
                  <td>{data.partners.find((x) => x.id === c.partner_id)?.name}</td>
                  <td className="num r">{brl0(c.base_cents)}</td>
                  <td className="num r">{brl0(c.amount_cents)} <span className="lbl">({Number(c.pct)}%)</span></td>
                  <td><Badge kind={COMMISSION_CLASS[c.status]}>{COMMISSION_STATUS[c.status]}{pay?.paid_on ? ` ${dm(pay.paid_on)}` : ''}</Badge></td>
                  <td>
                    {c.status === 'a_pagar' && pay && auth.canEdit('financeiro') ? <button type="button" className="btn s" onClick={() => setPaying(pay)}>Pagar</button> : null}
                    {c.status === 'prevista' && auth.isTotal('parceiros') ? <button type="button" className="btn s g" onClick={() => update('commissions', c.id, { status: 'cancelada' })}>Cancelar</button> : null}
                  </td>
                </tr>
              )
            })}
            {!data.commissions.length ? <tr><td colSpan={7} className="lbl">Nenhuma comissão ainda.</td></tr> : null}
          </tbody>
        </table></div>
      </Card>

      {modal ? <PartnerModal p={modal} onClose={() => setModal(null)} /> : null}
      {paying ? <PayModal title={`Pagar comissão · ${paying.supplier || ''}`} amount={paying.amount_cents} onClose={() => setPaying(null)} onConfirm={(o) => markPaid(paying, o).then(() => notify('Comissão paga.', 'ok'))} /> : null}
    </div>
  )
}

function PartnerModal({ p, onClose }) {
  const [f, setF] = useState({ name: p.name || '', origin: p.origin || '', phone: p.phone || '', pct: p.pct ?? 30, active: p.active ?? true })
  return (
    <Modal size="sm" title={p.id ? 'Editar parceiro' : 'Novo parceiro'} onClose={onClose} footer={<><button type="button" className="btn" onClick={onClose}>Cancelar</button><AsyncButton className="btn p" onClick={async () => {
      if (!f.name.trim()) return notify('Informe o nome.', 'err')
      const body = { ...f, pct: Number(f.pct) || 30 }
      if (p.id) await update('partners', p.id, body); else await insert('partners', body)
      notify('Parceiro salvo.', 'ok'); onClose()
    }}>Salvar</AsyncButton></>}>
      <Field label="Nome"><input className="in" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
      <Field label="Origem"><input className="in" value={f.origin} onChange={(e) => setF({ ...f, origin: e.target.value })} placeholder="Ex.: King Mídia (cliente)" /></Field>
      <Field label="WhatsApp"><input className="in" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
      <Field label="Percentual"><input className="in num" value={f.pct} onChange={(e) => setF({ ...f, pct: e.target.value.replace(/[^\d.]/g, '') })} /></Field>
      <label className="check"><input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} />Ativo</label>
    </Modal>
  )
}
