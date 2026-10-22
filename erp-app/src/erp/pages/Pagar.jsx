import React, { useMemo, useState } from 'react'
import { useMeta, useErp } from '../components/Shell'
import { useAuth } from '../lib/auth'
import { useData, fetchRows, update, archive, notify } from '../lib/data'
import { markPaid } from '../lib/automations'
import { brl, brl0, dm, today, addDays, startOfMonth, endOfMonth, addMonths, MONTHS, daysFromToday } from '../lib/format'
import { PageHead, Tabs, Loading, ErrorBox, Badge, Modal, Field, Select, AsyncButton, Empty, Stat, MoneyInput, useConfirm } from '../components/ui'
import { FRONTS, METHODS } from '../lib/constants'
import { toCsv, download } from '../lib/csv'
import { Icon } from '../lib/icons'

const REC = { once: 'única', monthly: 'mensal', yearly: 'anual' }

export default function Pagar() {
  useMeta('Financeiro', 'Contas a pagar')
  const auth = useAuth()
  const erp = useErp()
  const confirm = useConfirm()
  const [month, setMonth] = useState(startOfMonth(today()))
  const [tab, setTab] = useState('todas')
  const [paying, setPaying] = useState(null)
  const [editing, setEditing] = useState(null)

  const { data, loading, error, reload } = useData(async () => ({
    rows: await fetchRows('payables', { order: 'due_on', ascending: true }),
    cats: await fetchRows('categories', { order: 'sort', ascending: true }).catch(() => []),
  }), ['payables', 'categories'])

  const t = today()
  const m0 = month, m1 = endOfMonth(month)
  const inMonth = useMemo(() => (data?.rows || []).filter((p) => (p.due_on >= m0 && p.due_on <= m1) || (!p.paid_on && p.due_on < m0 && m0 === startOfMonth(t))), [data, m0, m1, t])
  if (error) return <div className="page"><ErrorBox error={error} onRetry={reload} /></div>
  if (loading || !data) return <div className="page"><Loading rows={8} /></div>

  const open = inMonth.filter((p) => !p.paid_on)
  const sum = (l) => l.reduce((a, p) => a + p.amount_cents, 0)
  const overdue = open.filter((p) => p.due_on < t)
  const week = open.filter((p) => p.due_on >= t && p.due_on <= addDays(t, 7))
  const list = inMonth.filter((p) => tab === 'todas' || (tab === 'abertas' && !p.paid_on) || (tab === 'pagas' && p.paid_on) || (tab === 'recorrentes' && p.recurrence !== 'once') || (tab === 'comissoes' && p.category === 'Comissões'))
  const byCat = {}
  inMonth.forEach((p) => { byCat[p.category] = (byCat[p.category] || 0) + p.amount_cents })

  const status = (p) => {
    if (p.paid_on) return <Badge kind="g">Paga {dm(p.paid_on)}{p.method ? ` · ${p.method}` : ''}</Badge>
    const d = daysFromToday(p.due_on)
    if (d < 0) return <Badge kind="r">Vencida há {-d} dia(s)</Badge>
    if (d === 0) return <Badge kind="y">Vence hoje</Badge>
    if (d <= 7) return <Badge kind="y">Vence em {d} dia(s)</Badge>
    return <Badge>A vencer</Badge>
  }
  const exportCsv = () => download(`contas-a-pagar-${month.slice(0, 7)}.csv`, toCsv(
    ['Vencimento', 'Descrição', 'Fornecedor', 'Categoria', 'Frente', 'Recorrência', 'Valor', 'Pago em', 'Forma'],
    inMonth.map((p) => [p.due_on, p.description, p.supplier, p.category, FRONTS[p.front], REC[p.recurrence], (p.amount_cents / 100).toFixed(2).replace('.', ','), p.paid_on, p.method])))

  return (
    <div className="page">
      <PageHead title="Contas a pagar" sub="Despesas recorrentes se lançam sozinhas todo mês. Comissões aparecem aqui quando o cliente paga.">
        <div className="row" style={{ gap: 4 }}>
          <button type="button" className="btn s ic" aria-label="Mês anterior" onClick={() => setMonth(addMonths(month, -1))}>‹</button>
          <span style={{ minWidth: 130, textAlign: 'center', fontSize: 13, textTransform: 'capitalize' }}>{MONTHS[Number(month.slice(5, 7)) - 1]} {month.slice(0, 4)}</span>
          <button type="button" className="btn s ic" aria-label="Próximo mês" onClick={() => setMonth(addMonths(month, 1))}>›</button>
        </div>
        <button type="button" className="btn" onClick={exportCsv}><Icon name="download" size={14} />CSV</button>
        {auth.canEdit('financeiro') ? <button type="button" className="btn p" onClick={() => erp.openQuick('expense')}>Nova despesa</button> : null}
      </PageHead>

      <div className="card stats">
        <Stat label="Vencidas" value={brl0(sum(overdue))} valueClass={overdue.length ? 'bad' : ''} sub={`${overdue.length} conta(s)`} />
        <Stat label="Vencem em 7 dias" value={brl0(sum(week))} valueClass={week.length ? 'warn' : ''} sub={`${week.length} conta(s)`} />
        <Stat label="Em aberto no mês" value={brl0(sum(open))} />
        <Stat label="Pago no mês" value={brl0(sum(inMonth.filter((p) => p.paid_on)))} valueClass="ok" />
        <Stat label="Total do mês" value={brl0(sum(inMonth))} sub={Object.entries(byCat).sort((a, b) => b[1] - a[1])[0] ? `maior: ${Object.entries(byCat).sort((a, b) => b[1] - a[1])[0][0]}` : ''} />
      </div>

      <Tabs value={tab} onChange={setTab} options={[['todas', 'Todas', inMonth.length], ['abertas', 'Em aberto', open.length], ['pagas', 'Pagas'], ['recorrentes', 'Recorrentes'], ['comissoes', 'Comissões']]} />
      <div className="card" style={{ overflow: 'hidden' }}><div className="tbl-wrap"><table className="tbl">
        <thead><tr><th>Vencimento</th><th>Descrição</th><th>Fornecedor</th><th>Categoria</th><th>Frente</th><th>Recorrência</th><th className="r">Valor</th><th>Status</th><th /></tr></thead>
        <tbody>
          {list.map((p) => (
            <tr key={p.id}>
              <td className="num">{dm(p.due_on)}</td>
              <td style={{ fontWeight: 500 }}>{p.description}{p.link ? <> <a href={p.link} target="_blank" rel="noreferrer" className="lbl">↗</a></> : null}</td>
              <td>{p.supplier || '—'}</td><td>{p.category}</td><td>{FRONTS[p.front]}</td><td className="lbl">{REC[p.recurrence]}</td>
              <td className="num r">{brl(p.amount_cents)}</td>
              <td>{status(p)}</td>
              <td>
                <div className="row" style={{ flexWrap: 'nowrap', gap: 4 }}>
                  {!p.paid_on && auth.canEdit('financeiro') ? <button type="button" className="btn s" onClick={() => setPaying(p)}>Marcar paga</button> : null}
                  {p.paid_on && auth.canEdit('financeiro') ? <button type="button" className="btn s g" onClick={() => update('payables', p.id, { paid_on: null, method: null })}>Desfazer</button> : null}
                  {auth.canEdit('financeiro') ? <button type="button" className="btn s ic g" aria-label="Editar" onClick={() => setEditing(p)}><Icon name="edit" size={13} /></button> : null}
                </div>
              </td>
            </tr>
          ))}
          {!list.length ? <tr><td colSpan={9}><Empty icon="money">Nenhuma conta neste mês.</Empty></td></tr> : null}
        </tbody>
      </table></div></div>

      {paying ? (
        <PayModal title={`Pagar · ${paying.description}`} amount={paying.amount_cents} onClose={() => setPaying(null)}
          onConfirm={(o) => markPaid(paying, o).then(() => notify('Conta paga.', 'ok'))} />
      ) : null}
      {editing ? (
        <EditPayable p={editing} cats={data.cats} onClose={() => setEditing(null)} onArchive={async () => {
          if (await confirm(editing.recurrence !== 'once' ? 'Arquivar esta conta? Para parar a recorrência, arquive a primeira conta da série ou mude a recorrência para "única".' : 'Arquivar esta conta?', { ok: 'Arquivar', danger: true })) {
            await archive('payables', editing.id); setEditing(null)
          }
        }} />
      ) : null}
    </div>
  )
}

export function PayModal({ title, amount, onClose, onConfirm, verb = 'Pago' }) {
  const [date, setDate] = useState(today())
  const [method, setMethod] = useState('Pix')
  return (
    <Modal size="sm" title={title} onClose={onClose} footer={<>
      <button type="button" className="btn" onClick={onClose}>Cancelar</button>
      <AsyncButton className="btn p" onClick={async () => { await onConfirm({ date, method }); onClose() }}>Confirmar</AsyncButton>
    </>}>
      <div className="row" style={{ justifyContent: 'space-between', fontSize: 14 }}><span className="lbl">Valor</span><span className="num">{brl(amount)}</span></div>
      <div className="fields">
        <Field label={`${verb} em`}><input type="date" className="in" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="Forma"><Select value={method} onChange={setMethod} options={METHODS} /></Field>
      </div>
    </Modal>
  )
}

function EditPayable({ p, cats, onClose, onArchive }) {
  const [f, setF] = useState({ ...p })
  const set = (k) => (e) => setF({ ...f, [k]: e?.target ? e.target.value : e })
  return (
    <Modal title="Editar conta" onClose={onClose} footer={<>
      <button type="button" className="btn g" onClick={onArchive}>Arquivar</button><span className="grow" />
      <button type="button" className="btn" onClick={onClose}>Cancelar</button>
      <AsyncButton className="btn p" onClick={async () => {
        const keys = ['description', 'supplier', 'category', 'front', 'amount_cents', 'due_on', 'recurrence', 'link', 'notes']
        await update('payables', p.id, Object.fromEntries(keys.map((k) => [k, f[k] === '' ? null : f[k]])))
        notify('Conta atualizada.', 'ok'); onClose()
      }}>Salvar</AsyncButton>
    </>}>
      <div className="fields">
        <Field label="Descrição"><input className="in" value={f.description} onChange={set('description')} /></Field>
        <Field label="Fornecedor"><input className="in" value={f.supplier || ''} onChange={set('supplier')} /></Field>
        <Field label="Valor"><MoneyInput value={f.amount_cents} onChange={(v) => setF({ ...f, amount_cents: v })} /></Field>
        <Field label="Vencimento"><input type="date" className="in" value={f.due_on} onChange={set('due_on')} /></Field>
        <Field label="Categoria"><Select value={f.category} onChange={set('category')} options={cats.map((c) => c.name)} /></Field>
        <Field label="Frente"><Select value={f.front} onChange={set('front')} options={FRONTS} /></Field>
        <Field label="Recorrência"><Select value={f.recurrence} onChange={set('recurrence')} options={{ once: 'Única', monthly: 'Mensal', yearly: 'Anual' }} /></Field>
        <Field label="Link"><input className="in" value={f.link || ''} onChange={set('link')} /></Field>
      </div>
    </Modal>
  )
}
