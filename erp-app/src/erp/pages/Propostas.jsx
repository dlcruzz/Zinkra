import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMeta } from '../components/Shell'
import { useAuth } from '../lib/auth'
import { useData, fetchRows } from '../lib/data'
import { proposalTotal } from '../lib/world'
import { brl0, dm, daysSince, daysFromToday, pctLabel, localDay } from '../lib/format'
import { PageHead, Tabs, Loading, ErrorBox, Badge, Empty } from '../components/ui'
import { PROPOSAL_STATUS, PROPOSAL_CLASS } from '../lib/constants'

export default function Propostas() {
  useMeta('Comercial', 'Propostas')
  const auth = useAuth()
  const nav = useNavigate()
  const [tab, setTab] = useState('todas')
  const { data, loading, error, reload } = useData(async () => {
    const [proposals, items, clients, leads] = await Promise.all([
      fetchRows('proposals'), fetchRows('proposal_items', { order: null }),
      fetchRows('clients').catch(() => []), fetchRows('leads', { archived: true, select: 'id, company' }).catch(() => []),
    ])
    return { proposals, items, clients, leads }
  }, ['proposals', 'proposal_items'])

  const stats = useMemo(() => {
    if (!data) return null
    const p = data.proposals
    const open = p.filter((x) => ['enviada', 'vista'].includes(x.status))
    const decided = p.filter((x) => ['aceita', 'recusada', 'expirada'].includes(x.status))
    const accepted = p.filter((x) => x.status === 'aceita')
    const respDays = decided.filter((x) => x.sent_at && (x.accepted_at || x.updated_at)).map((x) => daysSince(localDay(x.sent_at)) - daysSince(localDay(x.accepted_at || x.updated_at)))
    return {
      openTotal: open.reduce((a, x) => { const t = proposalTotal(x, data.items); return a + t.once + t.monthly }, 0),
      rate: pctLabel(accepted.length, decided.length),
      avg: respDays.length ? Math.round(respDays.reduce((a, b) => a + b, 0) / respDays.length) : null,
    }
  }, [data])

  if (error) return <div className="page"><ErrorBox error={error} onRetry={reload} /></div>
  if (loading || !data) return <div className="page"><Loading rows={6} /></div>
  const name = (p) => data.clients.find((c) => c.id === p.client_id)?.name || data.leads.find((l) => l.id === p.lead_id)?.company || '—'
  const count = (s) => data.proposals.filter((p) => p.status === s).length
  const list = data.proposals.filter((p) => tab === 'todas' || p.status === tab)

  return (
    <div className="page">
      <PageHead title="Propostas" sub={`${brl0(stats.openTotal)} em aberto · taxa de aceite ${stats.rate}${stats.avg !== null ? ` · resposta em ${stats.avg} dias em média` : ''}`}>
        {auth.isTotal('config') ? <button type="button" className="btn" onClick={() => nav('/erp/config?s=services')}>Catálogo de serviços</button> : null}
        {auth.canEdit('propostas') ? <button type="button" className="btn p" onClick={() => nav('/erp/propostas/nova')}>Nova proposta</button> : null}
      </PageHead>
      <Tabs value={tab} onChange={setTab} options={[['todas', 'Todas', data.proposals.length], ...Object.entries(PROPOSAL_STATUS).map(([k, v]) => [k, v, count(k)])]} />
      <div className="card" style={{ overflow: 'hidden' }}><div className="tbl-wrap"><table className="tbl">
        <thead><tr><th>Nº</th><th>Cliente / lead</th><th>Serviços</th><th className="r">Valor</th><th>Pagamento</th><th>Status</th><th>Enviada</th><th>Validade</th><th>Arquivo</th></tr></thead>
        <tbody>
          {list.map((p) => {
            const t = proposalTotal(p, data.items)
            const its = data.items.filter((i) => i.proposal_id === p.id)
            const exp = p.valid_until ? daysFromToday(p.valid_until) : null
            return (
              <tr key={p.id} className="click" onClick={(e) => { if (!e.target.closest('a')) nav(`/erp/propostas/${p.id}`) }}>
                <td className="num lbl">#{String(p.number).padStart(3, '0')}</td>
                <td style={{ fontWeight: 500 }}>{name(p)}</td>
                <td className="ellipsis" style={{ maxWidth: 240 }}>{its.map((i) => i.description).join(' + ') || p.title || '—'}</td>
                <td className="num r">{t.once ? brl0(t.once) : ''}{t.monthly ? `${t.once ? ' + ' : ''}${brl0(t.monthly)}/mês` : ''}{!t.once && !t.monthly ? '—' : ''}</td>
                <td>{p.payment_terms || (p.installments > 1 ? `${p.installments} parcelas` : 'À vista')}</td>
                <td><Badge kind={PROPOSAL_CLASS[p.status]}>{PROPOSAL_STATUS[p.status]}</Badge></td>
                <td className="num">{p.sent_at ? dm(p.sent_at) : '—'}</td>
                <td className="num" style={['enviada', 'vista'].includes(p.status) && exp !== null && exp <= 3 ? { color: exp < 0 ? 'var(--red)' : 'var(--yel)' } : undefined}>{p.valid_until ? dm(p.valid_until) : '—'}</td>
                <td>{p.pdf_url ? <a href={p.pdf_url} target="_blank" rel="noreferrer">Drive ↗</a> : <span className="lbl">—</span>}</td>
              </tr>
            )
          })}
          {!list.length ? <tr><td colSpan={9}><Empty icon="doc">Nenhuma proposta aqui.</Empty></td></tr> : null}
        </tbody>
      </table></div></div>
    </div>
  )
}
