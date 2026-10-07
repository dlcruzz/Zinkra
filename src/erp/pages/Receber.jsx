import React, { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMeta } from '../components/Shell'
import { useAuth } from '../lib/auth'
import { useData, fetchRows, insert, update, notify, useSettings } from '../lib/data'
import { markReceived } from '../lib/automations'
import { brl, brl0, dm, today, addDays, startOfMonth, endOfMonth, daysFromToday, waLink, fillTemplate } from '../lib/format'
import { PageHead, Tabs, Loading, ErrorBox, Badge, Modal, Field, Select, MoneyInput, AsyncButton, Empty, Stat } from '../components/ui'
import { FRONTS, METHODS } from '../lib/constants'
import { toCsv, download } from '../lib/csv'
import { Icon } from '../lib/icons'

export default function Receber() {
  useMeta('Financeiro', 'Contas a receber')
  const auth = useAuth()
  const settings = useSettings()
  const [sp] = useSearchParams()
  const [tab, setTab] = useState(sp.get('f') || 'abertas')
  const [sel, setSel] = useState(null)
  const [adding, setAdding] = useState(false)
  const [method, setMethod] = useState('Pix')
  const [date, setDate] = useState(today())
  const [copied, setCopied] = useState(false)

  const { data, loading, error, reload } = useData(async () => ({
    rows: await fetchRows('receivables', { order: 'due_on', ascending: true }),
    clients: await fetchRows('clients').catch(() => []),
    playbooks: await fetchRows('playbooks', { where: (q) => q.eq('collection', 'Cobrança'), order: 'code', ascending: true }).catch(() => []),
  }), ['receivables', 'clients'])

  const t = today()
  const list = useMemo(() => {
    if (!data) return []
    const r = data.rows
    const f = {
      abertas: (x) => !x.received_on,
      vencidas: (x) => !x.received_on && x.due_on < t,
      semana: (x) => !x.received_on && x.due_on >= t && x.due_on <= addDays(t, 7),
      recebidas: (x) => x.received_on && x.received_on >= addDays(t, -90),
      recorrentes: (x) => x.part_label && /^\d{2}\/\d{4}$/.test(x.part_label),
      todas: () => true,
    }[tab] || (() => true)
    const l = r.filter(f)
    return tab === 'recebidas' ? [...l].reverse() : l
  }, [data, tab, t])

  useEffect(() => { if (list.length && (!sel || !list.some((x) => x.id === sel))) setSel(list[0].id) }, [list]) // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return <div className="page"><ErrorBox error={error} onRetry={reload} /></div>
  if (loading || !data) return <div className="page"><Loading rows={8} /></div>
  const client = (id) => data.clients.find((c) => c.id === id)
  const open = data.rows.filter((x) => !x.received_on)
  const sum = (l) => l.reduce((a, x) => a + x.amount_cents, 0)
  const overdue = open.filter((x) => x.due_on < t)
  const soon = open.filter((x) => x.due_on >= t && x.due_on <= addDays(t, 7))
  const monthOpen = open.filter((x) => x.due_on >= startOfMonth(t) && x.due_on <= endOfMonth(t))
  const monthRec = data.rows.filter((x) => x.received_on && x.received_on >= startOfMonth(t) && x.received_on <= endOfMonth(t))
  const r = data.rows.find((x) => x.id === sel)
  const c = r ? client(r.client_id) : null
  const pix = settings.company?.pix || '64.312.169/0001-60'
  const pb = r ? data.playbooks.find((p) => p.code === (r.due_on < t ? 'C2' : 'C1')) : null
  const desc = r ? (r.part_label && /^\d+\/\d+$/.test(r.part_label) ? `parcela ${r.part_label} do ${r.description}` : `${r.description}${r.part_label ? ` (${r.part_label})` : ''}`) : ''
  const msg = r ? fillTemplate(pb?.body || 'Olá, [NOME]! Passando para lembrar da cobrança de [DESCRICAO], no valor de [VALOR], com vencimento em [DATA].\nChave Pix (CNPJ): [PIX] · Zinkra\nObrigado!', {
    NOME: (c?.contact_name || c?.name || '').split(' ')[0], DESCRICAO: desc, VALOR: brl(r.amount_cents), DATA: dm(r.due_on), PIX: pix,
  }) : ''
  const exportCsv = () => download(`contas-a-receber-${t}.csv`, toCsv(['Vencimento', 'Cliente', 'Referência', 'Parcela', 'Valor', 'Recebido em', 'Forma'],
    list.map((x) => [x.due_on, client(x.client_id)?.name, x.description, x.part_label, (x.amount_cents / 100).toFixed(2).replace('.', ','), x.received_on, x.method])))

  const status = (x) => {
    if (x.received_on) return <Badge kind="g">Recebida {dm(x.received_on)}</Badge>
    const d = daysFromToday(x.due_on)
    if (d < 0) return <Badge kind="r">Vencida há {-d}d</Badge>
    if (d <= 3) return <Badge kind="y">{d === 0 ? 'Vence hoje' : `Vence em ${d}d`}</Badge>
    return <Badge>A vencer</Badge>
  }

  return (
    <div className="page">
      <PageHead title="Contas a receber" sub="Parcelas e mensalidades geradas a partir dos contratos e propostas aceitas.">
        <button type="button" className="btn" onClick={exportCsv}><Icon name="download" size={14} />CSV</button>
        {auth.canEdit('financeiro') ? <button type="button" className="btn p" onClick={() => setAdding(true)}>Lançamento avulso</button> : null}
      </PageHead>

      <div className="card stats">
        <Stat label="Vencido" value={brl0(sum(overdue))} valueClass={overdue.length ? 'bad' : ''} sub={`${overdue.length} cobrança(s)`} />
        <Stat label="A vencer em 7 dias" value={brl0(sum(soon))} valueClass={soon.length ? 'warn' : ''} sub={`${soon.length} cobrança(s)`} />
        <Stat label="A vencer no mês" value={brl0(sum(monthOpen))} sub={`${monthOpen.length} cobrança(s)`} />
        <Stat label="Recebido no mês" value={brl0(sum(monthRec))} valueClass="ok" sub={`${monthRec.length} pagamento(s)`} />
      </div>

      <div className="cols">
        <div className="stack" style={{ flex: '3 1 560px', minWidth: 0 }}>
          <Tabs value={tab} onChange={setTab} options={[['abertas', 'Em aberto', open.length], ['vencidas', 'Vencidas', overdue.length], ['semana', 'Próximos 7 dias', soon.length], ['recebidas', 'Recebidas (90 dias)'], ['recorrentes', 'Mensalidades'], ['todas', 'Todas']]} />
          <div className="card" style={{ overflow: 'hidden' }}><div className="tbl-wrap"><table className="tbl">
            <thead><tr><th>Vencimento</th><th>Cliente</th><th>Referência</th><th>Parcela</th><th className="r">Valor</th><th>Status</th></tr></thead>
            <tbody>
              {list.map((x) => (
                <tr key={x.id} className={`click ${x.id === sel ? 'on' : ''}`} onClick={() => { setSel(x.id); setCopied(false) }}>
                  <td className="num">{dm(x.due_on)}</td>
                  <td style={{ fontWeight: 500 }}>{client(x.client_id)?.name || '—'}</td>
                  <td className="lbl" style={{ color: 'var(--tx-3)' }}>{x.description}</td>
                  <td className="num">{x.part_label || '—'}</td>
                  <td className="num r">{brl(x.amount_cents)}</td>
                  <td>{status(x)}</td>
                </tr>
              ))}
              {!list.length ? <tr><td colSpan={6}><Empty icon="money">Nada aqui.</Empty></td></tr> : null}
            </tbody>
          </table></div></div>
        </div>

        {r ? (
          <aside className="card" aria-label="Cobrança" style={{ flex: '1 1 320px', minWidth: 0, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h2>{r.received_on ? 'Recebimento' : 'Cobrança'} · {c?.name || r.description}</h2>
            <div className="row" style={{ justifyContent: 'space-between', fontSize: 13 }}><span className="lbl">Valor</span><span className="num">{brl(r.amount_cents)}</span></div>
            <div className="row" style={{ justifyContent: 'space-between', fontSize: 13 }}><span className="lbl">Vencimento</span><span className="num">{dm(r.due_on)}</span></div>
            <div className="row" style={{ justifyContent: 'space-between', fontSize: 13 }}><span className="lbl">Frente</span><span>{FRONTS[r.front]}</span></div>
            {!r.received_on ? (
              <>
                <div className="box" style={{ fontSize: 13 }}>{msg}</div>
                <div className="row">
                  <button type="button" className="btn" onClick={async () => { try { await navigator.clipboard.writeText(msg); setCopied(true) } catch { notify('Não consegui copiar.', 'err') } }}><Icon name="copy" size={14} />{copied ? 'Copiado' : 'Copiar mensagem'}</button>
                  {waLink(c?.phone, msg) ? <a className="btn" href={waLink(c.phone, msg)} target="_blank" rel="noreferrer"><Icon name="wa" size={14} />Abrir WhatsApp</a> : <span className="lbl">Cliente sem WhatsApp cadastrado.</span>}
                </div>
                {auth.canEdit('financeiro') ? (
                  <div className="stack" style={{ borderTop: '1px solid var(--line)', paddingTop: 12 }}>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>Registrar recebimento</span>
                    <div className="row" style={{ flexWrap: 'nowrap' }}>
                      <Field label="Data" style={{ flex: 1 }}><input type="date" className="in" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
                      <Field label="Forma" style={{ flex: 1 }}><Select value={method} onChange={setMethod} options={METHODS} /></Field>
                    </div>
                    <AsyncButton className="btn p" onClick={() => markReceived(r, { date, method }).then(() => notify('Recebido. Se havia comissão de parceiro, ela foi liberada no Contas a pagar.', 'ok'))}>Marcar como recebido</AsyncButton>
                  </div>
                ) : null}
              </>
            ) : (
              <>
                <div className="note g">Recebido em {dm(r.received_on)}{r.method ? ` via ${r.method}` : ''}.</div>
                {auth.canEdit('financeiro') ? <button type="button" className="btn s g" style={{ width: 'max-content' }} onClick={() => update('receivables', r.id, { received_on: null, method: null })}>Desfazer recebimento</button> : null}
              </>
            )}
            {auth.canEdit('financeiro') && !r.received_on ? <EditDue r={r} /> : null}
          </aside>
        ) : null}
      </div>

      {adding ? <NewReceivable clients={data.clients} onClose={() => setAdding(false)} /> : null}
    </div>
  )
}

function EditDue({ r }) {
  const [due, setDue] = useState(r.due_on)
  const [amount, setAmount] = useState(r.amount_cents)
  useEffect(() => { setDue(r.due_on); setAmount(r.amount_cents) }, [r.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const dirty = due !== r.due_on || amount !== r.amount_cents
  return (
    <details className="lbl" open={dirty || undefined}>
      <summary style={{ cursor: 'pointer' }}>Mudar vencimento ou valor</summary>
      <div className="row" style={{ paddingTop: 8 }}>
        <input type="date" className="in" style={{ width: 150 }} value={due} onChange={(e) => setDue(e.target.value)} aria-label="Novo vencimento" />
        <MoneyInput value={amount} onChange={setAmount} style={{ width: 120 }} aria-label="Novo valor" />
        <AsyncButton className="btn s p" disabled={!dirty} onClick={() => update('receivables', r.id, { due_on: due, amount_cents: amount }).then(() => notify('Cobrança atualizada.', 'ok'))}>Salvar</AsyncButton>
      </div>
    </details>
  )
}

function NewReceivable({ clients, onClose }) {
  const [f, setF] = useState({ client_id: '', description: '', amount_cents: 0, due_on: today(), front: 'sites', received: false })
  return (
    <Modal title="Lançamento avulso" onClose={onClose} footer={<><button type="button" className="btn" onClick={onClose}>Cancelar</button><AsyncButton className="btn p" onClick={async () => {
      if (!f.description || !f.amount_cents) return notify('Informe descrição e valor.', 'err')
      const { received, ...rest } = f
      await insert('receivables', { ...rest, client_id: f.client_id || null, received_on: received ? today() : null, method: received ? 'Pix' : null })
      notify('Lançado.', 'ok'); onClose()
    }}>Salvar</AsyncButton></>}>
      <p className="lbl">Para parcelas de projeto e mensalidades, prefira criar o contrato no cliente: as cobranças se geram sozinhas.</p>
      <div className="fields">
        <Field label="Cliente"><Select value={f.client_id} onChange={(v) => setF({ ...f, client_id: v || '' })} placeholder="—" options={clients.map((c) => [c.id, c.name])} /></Field>
        <Field label="Descrição"><input className="in" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
        <Field label="Valor"><MoneyInput value={f.amount_cents} onChange={(v) => setF({ ...f, amount_cents: v })} /></Field>
        <Field label="Vencimento"><input type="date" className="in" value={f.due_on} onChange={(e) => setF({ ...f, due_on: e.target.value })} /></Field>
        <Field label="Frente"><Select value={f.front} onChange={(v) => setF({ ...f, front: v })} options={FRONTS} /></Field>
      </div>
      <label className="check"><input type="checkbox" checked={f.received} onChange={(e) => setF({ ...f, received: e.target.checked })} />Já recebido</label>
    </Modal>
  )
}
