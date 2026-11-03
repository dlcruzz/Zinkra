import React, { useMemo, useState } from 'react'
import { useMeta } from '../components/Shell'
import { useAuth } from '../lib/auth'
import { useData, fetchRows, insert, update, remove, notify } from '../lib/data'
import { brl, dmy, today } from '../lib/format'
import { resumoSaas, validarValor } from '../lib/financeiro'
import { PageHead, Kpi, Card, Loading, ErrorBox, Modal, Field, Select, MoneyInput, AsyncButton, Badge, Empty, useConfirm } from '../components/ui'
import { Icon } from '../lib/icons'

const TABELAS = ['saas_produtos', 'saas_assinaturas', 'saas_recebimentos']
const FALTA_TABELA = /does not exist|schema cache|Could not find the table/i

async function carregar() {
  try {
    const [produtos, assinaturas, recebimentos] = await Promise.all([
      fetchRows('saas_produtos', { order: 'name', ascending: true }),
      fetchRows('saas_assinaturas', { order: 'starts_on' }),
      fetchRows('saas_recebimentos', { order: 'received_on' }),
    ])
    return { produtos, assinaturas, recebimentos }
  } catch (e) {
    if (FALTA_TABELA.test(e?.message || '')) return { semTabelas: true }
    throw e
  }
}

// Produtos próprios da Zinkra (SaaS): assinaturas mensais e o que entra delas.
export default function FinanceiroSaas() {
  useMeta('Financeiro', 'Financeiro SaaS')
  const auth = useAuth()
  const confirm = useConfirm()
  const [modal, setModal] = useState(null)
  const { data, loading, error, reload } = useData(carregar, TABELAS)
  const canEdit = auth.canEdit('financeiro')
  const canDelete = auth.isTotal('financeiro')
  const r = useMemo(() => (data && !data.semTabelas ? resumoSaas(data, today()) : null), [data])

  if (error) return <div className="page"><ErrorBox error={error} onRetry={reload} /></div>
  if (loading || !data) return <div className="page"><Loading rows={5} /></div>
  if (data.semTabelas) {
    return <div className="page"><PageHead title="Financeiro SaaS" /><div className="note y">O financeiro SaaS ainda não foi criado no banco. Rode o arquivo <span className="num">supabase/erp-saas.sql</span> no SQL Editor do Supabase e atualize a página.</div></div>
  }

  const nomeProduto = (id) => data.produtos.find((p) => p.id === id)?.name || 'produto removido'
  const apagar = async (tabela, id, texto) => {
    if (await confirm(`Apagar ${texto}? Isso muda os totais.`, { ok: 'Apagar', danger: true })) await remove(tabela, id)
  }
  const fechar = () => setModal(null)
  const semProduto = data.produtos.length === 0

  return (
    <div className="page">
      <PageHead title="Financeiro SaaS" sub="Produtos próprios da Zinkra: assinaturas mensais e o que entra delas">
        {canEdit ? <>
          <button type="button" className="btn" onClick={() => setModal({ tipo: 'produto' })}><Icon name="plus" size={14} />Novo produto</button>
          <button type="button" className="btn" disabled={semProduto} onClick={() => setModal({ tipo: 'assinatura' })}><Icon name="plus" size={14} />Nova assinatura</button>
          <button type="button" className="btn p" disabled={semProduto} onClick={() => setModal({ tipo: 'recebimento' })}><Icon name="down" size={14} />Registrar recebimento</button>
        </> : null}
      </PageHead>

      <section className="grid-kpi" aria-label="Resumo do SaaS">
        <Kpi label="Receita mensal recorrente" value={brl(r.mrr)} hint={`${r.assinantes} assinatura(s) vigente(s)`} accent={r.mrr > 0} />
        <Kpi label="Recebido no mês" value={brl(r.recebidoMes)} />
        <Kpi label="Recebido no total" value={brl(r.recebidoTotal)} hint="entra no faturamento da Visão geral" />
        <Kpi label="Mensalidades em aberto" value={brl(r.emAberto)} hint={r.emAberto ? 'vencidas e sem recebimento ligado' : 'nada em aberto'} hintClass={r.emAberto ? 'warn lbl' : 'lbl'} />
      </section>

      {semProduto ? (
        <div className="card"><Empty icon="spark">Nenhum produto ainda. Cadastre o primeiro (por exemplo, a Corte) em "Novo produto".</Empty></div>
      ) : (
        <>
          <Card pad title={<h2>Produtos</h2>}>
            <div className="tbl-wrap"><table className="tbl">
              <thead><tr><th>Produto</th><th className="r">Assinaturas</th><th className="r">Mensal recorrente</th><th className="r">Recebido</th><th className="r">Em aberto</th><th /></tr></thead>
              <tbody>
                {r.porProduto.map(({ produto, mrr, assinantes, recebido, emAberto }) => (
                  <tr key={produto.id}>
                    <td data-l="Produto"><span style={{ fontWeight: 500 }}>{produto.name}</span>{produto.active ? null : <> <Badge dot={false}>inativo</Badge></>}{produto.notes ? <><br /><span className="lbl">{produto.notes}</span></> : null}</td>
                    <td data-l="Assinaturas" className="num r">{assinantes}</td>
                    <td data-l="Mensal recorrente" className="num r">{brl(mrr)}</td>
                    <td data-l="Recebido" className="num r">{brl(recebido)}</td>
                    <td data-l="Em aberto" className="num r">{emAberto ? brl(emAberto) : '—'}</td>
                    <td className="r">
                      {canEdit ? <button type="button" className="btn s ic g" aria-label="Editar produto" onClick={() => setModal({ tipo: 'produto', editar: produto })}><Icon name="edit" size={13} /></button> : null}
                      {canDelete ? <button type="button" className="btn s ic g" aria-label="Apagar produto" onClick={() => apagar('saas_produtos', produto.id, `o produto ${produto.name}`)}><Icon name="trash" size={13} /></button> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          </Card>

          <Card pad title={<h2>Assinaturas</h2>} action={<span className="lbl">mensalidade cobrada no dia do início, todo mês</span>}>
            {r.assinaturas.length ? (
              <div className="tbl-wrap"><table className="tbl">
                <thead><tr><th>Produto / assinante</th><th className="r">Por mês</th><th>Período</th><th className="r">Meses</th><th className="r">Recebido</th><th className="r">Em aberto</th><th /></tr></thead>
                <tbody>
                  {r.assinaturas.map(({ assinatura: a, vigente, meses, recebido, emAberto }) => (
                    <tr key={a.id}>
                      <td data-l="Assinante"><span style={{ fontWeight: 500 }}>{nomeProduto(a.produto_id)}</span> {vigente ? <Badge kind="g" dot={false}>vigente</Badge> : <Badge dot={false}>encerrada</Badge>}<br /><span className="lbl">{a.customer || 'sem nome do assinante'}</span></td>
                      <td data-l="Por mês" className="num r">{brl(a.amount_cents)}</td>
                      <td data-l="Período" className="num">{dmy(a.starts_on)}{a.ends_on ? ` até ${dmy(a.ends_on)}` : ' em diante'}</td>
                      <td data-l="Meses" className="num r">{meses}</td>
                      <td data-l="Recebido" className="num r">{brl(recebido)}</td>
                      <td data-l="Em aberto" className="num r">{emAberto ? brl(emAberto) : '—'}</td>
                      <td className="r">
                        {canEdit ? <button type="button" className="btn s" onClick={() => setModal({ tipo: 'recebimento', assinatura: a })}>Receber</button> : null}
                        {canEdit ? <button type="button" className="btn s ic g" aria-label="Alterar assinatura" onClick={() => setModal({ tipo: 'assinatura', editar: a })}><Icon name="edit" size={13} /></button> : null}
                        {canDelete ? <button type="button" className="btn s ic g" aria-label="Apagar assinatura" onClick={() => apagar('saas_assinaturas', a.id, 'esta assinatura')}><Icon name="trash" size={13} /></button> : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
            ) : <p className="lbl">Nenhuma assinatura. Use "Nova assinatura" para cadastrar quem paga mensalidade.</p>}
          </Card>

          <Card pad title={<h2>Recebimentos</h2>} action={<span className="lbl">{data.recebimentos.length} lançamento(s)</span>}>
            {data.recebimentos.length ? (
              <ol className="fin-tempo">
                {data.recebimentos.map((x) => (
                  <li key={x.id} className="fin-ev green">
                    <span className="fin-ev-ic"><Icon name="down" size={13} /></span>
                    <div className="fin-ev-m">
                      <span className="fin-ev-t">{nomeProduto(x.produto_id)}{x.notes ? ` · ${x.notes}` : ''}</span>
                      <span className="lbl num">{dmy(x.received_on)}</span>
                    </div>
                    <span className="num fin-ev-v">+ {brl(x.amount_cents)}</span>
                    {canDelete ? <button type="button" className="btn s ic g" aria-label="Apagar recebimento" onClick={() => apagar('saas_recebimentos', x.id, 'este recebimento')}><Icon name="trash" size={13} /></button> : null}
                  </li>
                ))}
              </ol>
            ) : <p className="lbl">Nada recebido ainda.</p>}
          </Card>
        </>
      )}

      {modal?.tipo === 'produto' ? <ProdutoModal editar={modal.editar} onClose={fechar} /> : null}
      {modal?.tipo === 'assinatura' ? <AssinaturaModal editar={modal.editar} produtos={data.produtos} onClose={fechar} /> : null}
      {modal?.tipo === 'recebimento' ? <RecebimentoModal assinatura={modal.assinatura} produtos={data.produtos} assinaturas={data.assinaturas} onClose={fechar} /> : null}
    </div>
  )
}

function Rodape({ onClose, salvar }) {
  return <><button type="button" className="btn" onClick={onClose}>Cancelar</button><AsyncButton className="btn p" onClick={salvar}>Salvar</AsyncButton></>
}

function ProdutoModal({ editar, onClose }) {
  const [f, setF] = useState({ name: editar?.name || '', notes: editar?.notes || '', active: editar?.active ?? true })
  const [erro, setErro] = useState('')
  const salvar = async () => {
    if (!f.name.trim()) return setErro('Informe o nome do produto.')
    const row = { name: f.name.trim(), notes: f.notes.trim() || null, active: f.active }
    if (editar) await update('saas_produtos', editar.id, row)
    else await insert('saas_produtos', row)
    notify('Produto salvo.', 'ok')
    onClose()
  }
  return (
    <Modal title={editar ? 'Editar produto' : 'Novo produto'} size="sm" onClose={onClose} footer={<Rodape onClose={onClose} salvar={salvar} />}>
      <div className="stack">
        <Field label="Nome"><input className="in" autoFocus placeholder="Ex.: Corte" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="Observação"><input className="in" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
        <label className="row" style={{ gap: 8 }}><input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} />Produto ativo</label>
        {erro ? <div className="note r">{erro}</div> : null}
      </div>
    </Modal>
  )
}

function AssinaturaModal({ editar, produtos, onClose }) {
  const [f, setF] = useState({
    produto: editar?.produto_id || produtos[0]?.id, customer: editar?.customer || '', valor: editar?.amount_cents || 0,
    inicio: editar?.starts_on || today(), fim: editar?.ends_on || '',
  })
  const [erro, setErro] = useState('')
  const salvar = async () => {
    const e = validarValor(f.valor) || (!f.inicio ? 'Informe quando a cobrança começa.' : '') || (f.fim && f.fim < f.inicio ? 'O fim não pode ser antes do início.' : '')
    setErro(e)
    if (e) return
    const row = { produto_id: f.produto, customer: f.customer.trim() || null, amount_cents: f.valor, starts_on: f.inicio, ends_on: f.fim || null }
    if (editar) await update('saas_assinaturas', editar.id, row)
    else await insert('saas_assinaturas', row)
    notify('Assinatura salva.', 'ok')
    onClose()
  }
  return (
    <Modal title={editar ? 'Alterar assinatura' : 'Nova assinatura'} size="sm" onClose={onClose} footer={<Rodape onClose={onClose} salvar={salvar} />}>
      <div className="stack">
        <Field label="Produto"><Select value={f.produto} onChange={(v) => setF({ ...f, produto: v })} options={produtos.map((p) => [p.id, p.name])} /></Field>
        <Field label="Assinante"><input className="in" placeholder="Nome de quem paga" value={f.customer} onChange={(e) => setF({ ...f, customer: e.target.value })} /></Field>
        <Field label="Valor por mês"><MoneyInput value={f.valor} onChange={(v) => setF({ ...f, valor: v })} autoFocus /></Field>
        <Field label="Começa a cobrar em"><input type="date" className="in" value={f.inicio} onChange={(e) => setF({ ...f, inicio: e.target.value })} /></Field>
        <Field label="Termina em (opcional)"><input type="date" className="in" value={f.fim} onChange={(e) => setF({ ...f, fim: e.target.value })} /></Field>
        {erro ? <div className="note r">{erro}</div> : null}
      </div>
    </Modal>
  )
}

function RecebimentoModal({ assinatura, produtos, assinaturas, onClose }) {
  const [f, setF] = useState({
    produto: assinatura?.produto_id || produtos[0]?.id, assinatura: assinatura?.id || '', valor: assinatura?.amount_cents || 0,
    data: today(), obs: '',
  })
  const [erro, setErro] = useState('')
  const doProduto = assinaturas.filter((a) => a.produto_id === f.produto)
  const escolherAssinatura = (id) => {
    const a = assinaturas.find((x) => x.id === id)
    setF((x) => ({ ...x, assinatura: id || '', valor: a ? a.amount_cents : x.valor }))
  }
  const salvar = async () => {
    const e = validarValor(f.valor) || (!f.data ? 'Informe a data.' : '')
    setErro(e)
    if (e) return
    await insert('saas_recebimentos', { produto_id: f.produto, assinatura_id: f.assinatura || null, amount_cents: f.valor, received_on: f.data, notes: f.obs.trim() || null })
    notify('Recebimento lançado.', 'ok')
    onClose()
  }
  return (
    <Modal title="Registrar recebimento do SaaS" size="sm" onClose={onClose} footer={<Rodape onClose={onClose} salvar={salvar} />}>
      <div className="stack">
        <Field label="Produto"><Select value={f.produto} onChange={(v) => setF({ ...f, produto: v, assinatura: '' })} options={produtos.map((p) => [p.id, p.name])} /></Field>
        <Field label="Referente à assinatura">
          <Select value={f.assinatura} onChange={escolherAssinatura} placeholder="Geral do produto (sem assinatura)"
            options={doProduto.map((a) => [a.id, `${a.customer || 'sem nome'} · ${brl(a.amount_cents)}/mês`])} />
        </Field>
        <Field label="Valor"><MoneyInput value={f.valor} onChange={(v) => setF({ ...f, valor: v })} autoFocus /></Field>
        <Field label="Data"><input type="date" className="in" value={f.data} onChange={(e) => setF({ ...f, data: e.target.value })} /></Field>
        <Field label="Observação"><input className="in" placeholder="Ex.: mensalidade de novembro" value={f.obs} onChange={(e) => setF({ ...f, obs: e.target.value })} /></Field>
        {erro ? <div className="note r">{erro}</div> : null}
      </div>
    </Modal>
  )
}
