import React, { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMeta } from '../components/Shell'
import { useAuth } from '../lib/auth'
import { useData, fetchRows, insert, update, archive, notify, useSettings } from '../lib/data'
import { markReceived } from '../lib/automations'
import { brl, brl0, dm, today, addDays, startOfMonth, endOfMonth, daysFromToday, waLink, fillTemplate } from '../lib/format'
import { PageHead, Tabs, Loading, ErrorBox, Badge, Modal, Field, Select, MoneyInput, AsyncButton, Empty, Stat, useConfirm } from '../components/ui'
import { FRONTS, METHODS } from '../lib/constants'
import { calcularCarteira, semDuplicidade, separarSemProjeto, TIPOS_VALOR, validarValor } from '../lib/financeiro'
import { carregarFinanceiro } from '../components/FinanceiroLista'
import { TABELAS_FIN, comandaDoProjeto } from '../components/FinanceiroProjeto'
import { toCsv, download } from '../lib/csv'
import { Icon } from '../lib/icons'

// Todo valor pertence a um projeto: parcela antiga sem projeto fica fora das contas e aparece no aviso "Sem projeto".
// Projeto no financeiro novo substitui as parcelas antigas do contrato dele: elas não entram na conta duas vezes.
function visiveis(data) {
  const { vinculadas, semProjeto } = separarSemProjeto(data.rows, data.projects)
  if (!data.fin) return { rows: vinculadas, escondidas: 0, semProjeto }
  const rows = semDuplicidade({ projects: data.projects, receivables: vinculadas, payables: [], commissions: [] }, data.fin).receivables
  return { rows, escondidas: vinculadas.length - rows.length, semProjeto }
}

export default function Receber() {
  useMeta('Financeiro', 'Contas a receber')
  const auth = useAuth()
  const settings = useSettings()
  const [sp] = useSearchParams()
  const [tab, setTab] = useState(sp.get('f') || 'abertas')
  const [sel, setSel] = useState(null)
  const [adding, setAdding] = useState(false)
  const [mover, setMover] = useState(null)
  const confirm = useConfirm()
  const [method, setMethod] = useState('Pix')
  const [date, setDate] = useState(today())
  const [copied, setCopied] = useState(false)

  const { data, loading, error, reload } = useData(async () => ({
    rows: await fetchRows('receivables', { order: 'due_on', ascending: true }),
    clients: await fetchRows('clients').catch(() => []),
    playbooks: await fetchRows('playbooks', { where: (q) => q.eq('collection', 'Cobrança'), order: 'code', ascending: true }).catch(() => []),
    projects: await fetchRows('projects').catch(() => []),
    fin: await carregarFinanceiro().catch(() => null),
  }), ['receivables', 'clients', 'projects', ...TABELAS_FIN])

  const t = today()
  const { rows: todos, escondidas, semProjeto } = useMemo(() => (data ? visiveis(data) : { rows: [], escondidas: 0, semProjeto: [] }), [data])
  const list = useMemo(() => {
    if (!data) return []
    const r = todos
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
  }, [data, todos, tab, t])

  useEffect(() => { if (list.length && (!sel || !list.some((x) => x.id === sel))) setSel(list[0].id) }, [list]) // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return <div className="page"><ErrorBox error={error} onRetry={reload} /></div>
  if (loading || !data) return <div className="page"><Loading rows={8} /></div>
  const client = (id) => data.clients.find((c) => c.id === id)
  const open = todos.filter((x) => !x.received_on)
  const sum = (l) => l.reduce((a, x) => a + x.amount_cents, 0)
  const overdue = open.filter((x) => x.due_on < t)
  const soon = open.filter((x) => x.due_on >= t && x.due_on <= addDays(t, 7))
  const monthOpen = open.filter((x) => x.due_on >= startOfMonth(t) && x.due_on <= endOfMonth(t))
  const monthRec = todos.filter((x) => x.received_on && x.received_on >= startOfMonth(t) && x.received_on <= endOfMonth(t))
  const r = todos.find((x) => x.id === sel)
  const saldos = (data.fin ? calcularCarteira(data.fin, data.projects).linhas : [])
    .filter((l) => l.fin.faltaReceber > 0)
    .sort((a, b) => ((a.previsao || '9') < (b.previsao || '9') ? -1 : 1))
  const totalSaldos = saldos.reduce((a, l) => a + l.fin.faltaReceber, 0)
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
      <PageHead title="Contas a receber" sub="Parcelas e mensalidades dos contratos e o saldo a receber dos projetos.">
        <button type="button" className="btn" onClick={exportCsv}><Icon name="download" size={14} />CSV</button>
        {auth.canEdit('financeiro') ? <button type="button" className="btn p" onClick={() => setAdding(true)}>Lançar em um projeto</button> : null}
      </PageHead>

      <div className="card stats">
        <Stat label="Vencido" value={brl0(sum(overdue))} valueClass={overdue.length ? 'bad' : ''} sub={`${overdue.length} cobrança(s)`} />
        <Stat label="A vencer em 7 dias" value={brl0(sum(soon))} valueClass={soon.length ? 'warn' : ''} sub={`${soon.length} cobrança(s)`} />
        <Stat label="A vencer no mês" value={brl0(sum(monthOpen))} sub={`${monthOpen.length} cobrança(s)`} />
        <Stat label="Recebido no mês" value={brl0(sum(monthRec))} valueClass="ok" sub={`${monthRec.length} pagamento(s)`} />
      </div>

      {semProjeto.length ? (
        <div className="card" style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h2>Sem projeto</h2>
            <span className="lbl">{brl(sum(semProjeto))} fora do faturamento e do caixa · todo valor precisa pertencer a um projeto</span>
          </div>
          <div className="tbl-wrap"><table className="tbl">
            <thead><tr><th>Cliente</th><th>Referência</th><th>Data</th><th className="r">Valor</th><th /></tr></thead>
            <tbody>
              {semProjeto.map((x) => (
                <tr key={x.id}>
                  <td data-l="Cliente" style={{ fontWeight: 500 }}>{client(x.client_id)?.name || '—'}</td>
                  <td data-l="Referência" className="lbl">{x.description}{x.part_label ? ` (${x.part_label})` : ''}</td>
                  <td data-l="Data" className="num">{x.received_on ? `recebida ${dm(x.received_on)}` : `vence ${dm(x.due_on)}`}</td>
                  <td data-l="Valor" className="num r">{brl(x.amount_cents)}</td>
                  <td className="r">{auth.canEdit('financeiro') ? (
                    <div className="row" style={{ justifyContent: 'flex-end' }}>
                      <button type="button" className="btn s p" onClick={() => setMover(x)}>Mover para projeto</button>
                      <button type="button" className="btn s" onClick={async () => { if (await confirm(`Arquivar "${x.description}" de ${brl(x.amount_cents)}? Dá para desfazer logo depois.`, { ok: 'Arquivar' })) await archive('receivables', x.id) }}>Arquivar</button>
                    </div>
                  ) : null}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>
      ) : null}

      {saldos.length ? (
        <div className="card" style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h2>Saldo dos projetos</h2>
            <span className="lbl">{brl(totalSaldos)} a receber · vem do financeiro de cada projeto</span>
          </div>
          <div className="tbl-wrap"><table className="tbl">
            <thead><tr><th>Cliente · projeto</th><th>Previsão</th><th className="r">Falta receber</th><th /></tr></thead>
            <tbody>
              {saldos.map(({ projeto: p, fin: f, previsao }) => (
                <tr key={p.id}>
                  <td data-l="Projeto"><span style={{ fontWeight: 500 }}>{client(p.client_id)?.name || 'Sem cliente'}</span><br /><span className="lbl">{p.name}</span></td>
                  <td data-l="Previsão" className="num">{previsao ? dm(previsao) : <span className="lbl">sem previsão</span>}</td>
                  <td data-l="Falta receber" className="num r">{brl(f.faltaReceber)}</td>
                  <td className="r"><Link className="btn s" to={`/erp/projetos/${p.id}`}>Abrir projeto</Link></td>
                </tr>
              ))}
            </tbody>
          </table></div>
          {escondidas ? <span className="lbl">{escondidas} parcela(s) antiga(s) deste contrato ficaram escondidas, porque o projeto agora é controlado pelo financeiro dele.</span> : null}
        </div>
      ) : null}

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
                  {waLink(c?.phone, msg) ? <a className="btn" href={waLink(c.phone, msg)}><Icon name="wa" size={14} />Abrir WhatsApp</a> : <span className="lbl">Cliente sem WhatsApp cadastrado.</span>}
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

      {adding ? <LancarNoProjeto projects={data.projects} clients={data.clients} onClose={() => setAdding(false)} /> : null}
      {mover ? <LancarNoProjeto projects={data.projects} clients={data.clients} origem={mover} onClose={() => setMover(null)} /> : null}
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

// Lançamento sempre dentro de um projeto (obrigatório). Com `origem`, move uma parcela antiga sem projeto:
// cria o item na comanda, o recebimento (se já foi recebida) e arquiva a parcela antiga.
function LancarNoProjeto({ projects, clients, origem = null, onClose }) {
  const dono = origem ? projects.find((p) => p.client_id && p.client_id === origem.client_id) : null
  const [f, setF] = useState({
    project_id: dono?.id || '', kind: origem ? 'base' : 'adicional', description: origem?.description || '',
    amount_cents: origem?.amount_cents || 0, data: origem?.received_on || origem?.due_on || today(), received: Boolean(origem?.received_on),
    method: origem?.method || 'Pix',
  })
  const [erro, setErro] = useState('')
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }))
  const nomeCliente = (id) => clients.find((c) => c.id === id)?.name
  const opcoes = projects.map((p) => [p.id, `${nomeCliente(p.client_id) || 'Sem cliente'} · ${p.name}`])
  const salvar = async () => {
    const e = !f.project_id ? 'Escolha o projeto: todo valor precisa pertencer a um projeto.' : validarValor(f.amount_cents)
    setErro(e)
    if (e) return
    const projeto = projects.find((p) => p.id === f.project_id)
    const comandaId = await comandaDoProjeto(projeto)
    const item = await insert('project_valores', { project_id: projeto.id, kind: f.kind, description: f.description.trim() || null, amount_cents: f.amount_cents, on_date: f.data, ...(comandaId ? { comanda_id: comandaId } : {}) })
    if (f.received && f.kind !== 'desconto') {
      await insert('project_recebimentos', { project_id: projeto.id, amount_cents: f.amount_cents, received_on: origem?.received_on || f.data, method: f.method, notes: origem ? 'Movido de Contas a receber' : null, ...(comandaId ? { comanda_id: comandaId, valor_id: item?.id || null } : {}) })
    }
    if (origem) await archive('receivables', origem.id, { quiet: true })
    notify(origem ? 'Movido para o projeto.' : 'Lançado no projeto.', 'ok')
    onClose()
  }
  return (
    <Modal title={origem ? 'Mover para um projeto' : 'Lançar em um projeto'} onClose={onClose} footer={<><button type="button" className="btn" onClick={onClose}>Cancelar</button><AsyncButton className="btn p" onClick={salvar}>Salvar</AsyncButton></>}>
      <p className="lbl">{origem ? 'A parcela antiga sai de Contas a receber e passa a valer dentro da comanda do projeto escolhido.' : 'O valor entra na comanda do projeto, soma no faturamento e aparece em Contas a receber como saldo do projeto.'}</p>
      <div className="fields">
        <Field label="Projeto"><Select value={f.project_id} onChange={(v) => set('project_id')(v || '')} placeholder="Escolha o projeto" options={opcoes} /></Field>
        <Field label="Tipo"><Select value={f.kind} onChange={(v) => set('kind')(v || 'adicional')} options={Object.fromEntries(Object.entries(TIPOS_VALOR).filter(([k]) => k !== 'mensalidade'))} /></Field>
        <Field label="Descrição"><input className="in" value={f.description} onChange={(e) => set('description')(e.target.value)} /></Field>
        <Field label="Valor"><MoneyInput value={f.amount_cents} onChange={set('amount_cents')} /></Field>
        <Field label="Data"><input type="date" className="in" value={f.data} onChange={(e) => set('data')(e.target.value)} /></Field>
      </div>
      {f.kind !== 'desconto' ? <label className="check"><input type="checkbox" checked={f.received} onChange={(e) => set('received')(e.target.checked)} />Já recebido</label> : null}
      {erro ? <div className="note r">{erro}</div> : null}
    </Modal>
  )
}
