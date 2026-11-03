import React, { useMemo, useState } from 'react'
import { useAuth } from '../lib/auth'
import { useData, fetchRows, insert, update, remove, notify } from '../lib/data'
import { brl, dmy, today } from '../lib/format'
import { calcularProjeto, linhaDoTempo, validarValor, avisoRecebimento, avisoAbatimento, ALERTAS, TIPOS_VALOR, FORMAS_RECEBIMENTO } from '../lib/financeiro'
import { Card, Kpi, Loading, ErrorBox, Modal, Field, Select, MoneyInput, AsyncButton, useConfirm, Badge } from './ui'
import { Icon } from '../lib/icons'

export const TABELAS_FIN = ['project_valores', 'project_recebimentos', 'project_comissao', 'project_comissao_pagamentos', 'project_comissao_abatimentos']

const FALTA_TABELA = /does not exist|schema cache|Could not find the table/i

export function useFinanceiroProjeto(projectId) {
  return useData(async () => {
    const where = (q) => q.eq('project_id', projectId)
    try {
      const [valores, recebimentos, parceiros, pagamentos, abatimentos, partners] = await Promise.all([
        fetchRows('project_valores', { where, order: 'on_date' }),
        fetchRows('project_recebimentos', { where, order: 'received_on' }),
        fetchRows('project_comissao', { where, order: 'created_at' }),
        fetchRows('project_comissao_pagamentos', { where, order: 'paid_on' }),
        fetchRows('project_comissao_abatimentos', { where, order: 'on_date' }),
        fetchRows('partners').catch(() => []),
      ])
      return { valores, recebimentos, parceiro: parceiros[0] || null, pagamentos, abatimentos, partners }
    } catch (e) {
      if (FALTA_TABELA.test(e?.message || '')) return { semTabelas: true }
      throw e
    }
  }, TABELAS_FIN, [projectId])
}

export default function FinanceiroProjeto({ project, onChanged }) {
  const auth = useAuth()
  const confirm = useConfirm()
  const [modal, setModal] = useState(null)
  const { data, loading, error, reload } = useFinanceiroProjeto(project.id)
  const canEdit = auth.canEdit('financeiro')
  const canDelete = auth.isTotal('financeiro')

  const fin = useMemo(() => (data && !data.semTabelas ? calcularProjeto(data) : null), [data])
  const tempo = useMemo(() => (data && !data.semTabelas ? linhaDoTempo(data) : []), [data])

  if (error) return <ErrorBox error={error} onRetry={reload} />
  if (loading || !data) return <Loading rows={5} />
  if (data.semTabelas) {
    return <div className="note y">O financeiro dos projetos ainda não foi criado no banco. Rode o arquivo <span className="num">supabase/erp-financeiro-projetos.sql</span> no SQL Editor do Supabase e atualize esta página.</div>
  }

  const semValor = data.valores.length === 0
  const apagar = async (tabela, id, texto) => {
    if (await confirm(`Apagar ${texto}? Isso muda os saldos do projeto.`, { ok: 'Apagar', danger: true })) {
      await remove(tabela, id)
      onChanged?.()
    }
  }
  const fechar = () => { setModal(null); onChanged?.() }

  return (
    <div className="stack" style={{ gap: 16 }}>
      <section className="grid-kpi" aria-label="Saldos do projeto">
        <Kpi label="Valor total" value={brl(fin.valorTotal)} hint={`${data.valores.length} item(ns) de valor`} />
        <Kpi label="Recebido" value={brl(fin.recebido)} accent={fin.recebido > 0 && fin.faltaReceber === 0} bar={fin.valorTotal ? (fin.recebido / fin.valorTotal) * 100 : 0} />
        <Kpi label="Falta receber" value={brl(fin.faltaReceber)} hint={fin.excedenteRecebido ? `recebido ${brl(fin.excedenteRecebido)} acima do total` : undefined} hintClass="lbl warn" />
        <Kpi label="Comissão a pagar" value={brl(fin.comissaoAPagar)} danger={false}
          hint={fin.temParceiro ? `de ${brl(fin.comissaoTotal)} · já paga ${brl(fin.comissaoPaga)}${fin.abatido ? ` · abatido ${brl(fin.abatido)}` : ''}` : 'sem parceiro neste projeto'} />
      </section>

      {fin.alertas.map((a) => <div key={a} className="note y">{ALERTAS[a]}</div>)}
      {fin.creditoComParceiro > 0 ? <div className="note info">{data.parceiro?.partner_name || 'O parceiro'} está devendo {brl(fin.creditoComParceiro)} para você.</div> : null}

      {canEdit ? (
        <div className="fin-acoes">
          <button type="button" className="btn p" onClick={() => setModal('recebimento')}><Icon name="down" size={14} />Registrar recebimento</button>
          <button type="button" className="btn" onClick={() => setModal('adicional')}><Icon name="plus" size={14} />Adicionar adicional</button>
          <button type="button" className="btn" disabled={!fin.temParceiro} title={fin.temParceiro ? '' : 'Defina o parceiro primeiro'} onClick={() => setModal('pagamento')}><Icon name="send" size={14} />Registrar pagamento de comissão</button>
          <button type="button" className="btn" disabled={!fin.temParceiro} title={fin.temParceiro ? '' : 'Defina o parceiro primeiro'} onClick={() => setModal('abatimento')}><Icon name="zap" size={14} />Registrar abatimento</button>
        </div>
      ) : null}

      {semValor ? (
        <div className="note info fin-vazio">
          <span>Este projeto ainda não tem valor combinado. Cadastre o valor base para o ERP calcular os saldos{project.value_cents ? ` (o cadastro do projeto diz ${brl(project.value_cents)}).` : '.'}</span>
          {canEdit && project.value_cents ? (
            <AsyncButton className="btn s p" onClick={async () => {
              await insert('project_valores', { project_id: project.id, kind: 'base', description: 'Valor combinado', amount_cents: project.value_cents })
              onChanged?.()
            }}>Usar {brl(project.value_cents)} como valor base</AsyncButton>
          ) : null}
        </div>
      ) : null}

      <div className="cols">
        <div className="stack" style={{ flex: '2 1 460px', minWidth: 0 }}>
          <Card pad title={<h2>Linha do tempo</h2>} action={<span className="lbl">{tempo.length} lançamento(s)</span>}>
            {tempo.length ? (
              <ol className="fin-tempo">
                {tempo.map((e) => <Evento key={e.tipo + e.row.id} e={e} canDelete={canDelete} onDelete={apagar} />)}
              </ol>
            ) : <p className="lbl">Nada lançado ainda. Use os botões acima.</p>}
          </Card>
        </div>
        <div className="stack" style={{ flex: '1 1 280px', minWidth: 0 }}>
          <Card pad title={<h2>Parceiro e comissão</h2>} action={canEdit ? <button type="button" className="btn s" onClick={() => setModal('parceiro')}>{data.parceiro ? 'Editar' : 'Definir'}</button> : null}>
            {data.parceiro ? (
              <dl className="kv">
                <dt>Parceiro</dt><dd>{data.parceiro.partner_name}</dd>
                <dt>Tipo</dt><dd>{data.parceiro.kind === 'fixa' ? 'Valor fechado' : `${String(data.parceiro.pct).replace('.', ',')}% do total`}</dd>
                <dt>Comissão total</dt><dd className="num">{brl(fin.comissaoTotal)}</dd>
              </dl>
            ) : <p className="lbl">Sem parceiro. Defina um para controlar comissão, pagamentos e abatimentos.</p>}
          </Card>
          <Card pad title={<h2>Resultado</h2>}>
            <dl className="kv">
              <dt>Lucro previsto</dt><dd className="num ok">{brl(fin.lucroPrevisto)}</dd>
            </dl>
            <span className="lbl" style={{ display: 'block', marginTop: 8 }}>Valor total − comissão total + abatimentos.</span>
          </Card>
        </div>
      </div>

      {modal === 'parceiro' ? <ParceiroModal project={project} atual={data.parceiro} partners={data.partners} onClose={fechar} /> : null}
      {['recebimento', 'adicional', 'pagamento', 'abatimento'].includes(modal) ? <LancamentoModal tipo={modal} project={project} fin={fin} onClose={fechar} /> : null}
    </div>
  )
}

function Evento({ e, canDelete, onDelete }) {
  const r = e.row
  const cfg = {
    valor: { cor: 'blue', icone: 'plus', titulo: `${TIPOS_VALOR[r.kind] || 'Valor'}${r.description ? ` · ${r.description}` : ''}`, sinal: '+', tabela: 'project_valores', texto: 'este valor' },
    recebimento: { cor: 'green', icone: 'down', titulo: `Recebimento${r.method ? ` · ${r.method}` : ''}${r.notes ? ` · ${r.notes}` : ''}`, sinal: '+', tabela: 'project_recebimentos', texto: 'este recebimento' },
    pagamento: { cor: 'yel', icone: 'send', titulo: `Pagamento de comissão${r.notes ? ` · ${r.notes}` : ''}`, sinal: '−', tabela: 'project_comissao_pagamentos', texto: 'este pagamento de comissão' },
    abatimento: { cor: 'red', icone: 'zap', titulo: `Abatimento · ${r.reason}`, sinal: '−', tabela: 'project_comissao_abatimentos', texto: 'este abatimento' },
  }[e.tipo]
  return (
    <li className={`fin-ev ${cfg.cor}`}>
      <span className="fin-ev-ic"><Icon name={cfg.icone} size={13} /></span>
      <div className="fin-ev-m">
        <span className="fin-ev-t">{cfg.titulo}</span>
        <span className="lbl num">{dmy(e.data)}{r.bank_tx_id ? <> · <Badge kind="g" dot={false}>conciliado</Badge></> : null}</span>
      </div>
      <span className="num fin-ev-v">{cfg.sinal} {brl(e.valor)}</span>
      {canDelete ? <button type="button" className="btn s ic g" aria-label="Apagar lançamento" onClick={() => onDelete(cfg.tabela, r.id, cfg.texto)}><Icon name="trash" size={13} /></button> : null}
    </li>
  )
}

const TITULOS = { recebimento: 'Registrar recebimento', adicional: 'Adicionar adicional', pagamento: 'Registrar pagamento de comissão', abatimento: 'Registrar abatimento' }

function LancamentoModal({ tipo, project, fin, onClose }) {
  const [f, setF] = useState({ valor: 0, data: today(), forma: 'Pix', obs: '', kind: 'adicional', desc: '', motivo: '' })
  const [erro, setErro] = useState('')
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }))
  const aviso = f.valor > 0 ? (tipo === 'recebimento' ? avisoRecebimento(fin, f.valor) : tipo === 'abatimento' ? avisoAbatimento(fin, f.valor) : '') : ''

  const salvar = async () => {
    const e = validarValor(f.valor) || (tipo === 'abatimento' && !f.motivo.trim() ? 'Diga o motivo do abatimento.' : '') || (!f.data ? 'Informe a data.' : '')
    setErro(e)
    if (e) return
    const base = { project_id: project.id, amount_cents: f.valor }
    if (tipo === 'recebimento') await insert('project_recebimentos', { ...base, received_on: f.data, method: f.forma, notes: f.obs.trim() || null })
    if (tipo === 'adicional') await insert('project_valores', { ...base, kind: f.kind, on_date: f.data, description: f.desc.trim() || null })
    if (tipo === 'pagamento') await insert('project_comissao_pagamentos', { ...base, paid_on: f.data, notes: f.obs.trim() || null })
    if (tipo === 'abatimento') await insert('project_comissao_abatimentos', { ...base, on_date: f.data, reason: f.motivo.trim() })
    notify('Lançado.', 'ok')
    onClose()
  }

  return (
    <Modal title={TITULOS[tipo]} size="sm" onClose={onClose}
      footer={<><button type="button" className="btn" onClick={onClose}>Cancelar</button><AsyncButton className="btn p" onClick={salvar}>Salvar</AsyncButton></>}>
      <form className="stack" onSubmit={(e) => { e.preventDefault(); document.getElementById('fin-salvar')?.click() }}>
        {tipo === 'adicional' ? (
          <Field label="Tipo"><Select value={f.kind} onChange={(v) => set('kind')(v || 'adicional')} options={TIPOS_VALOR} /></Field>
        ) : null}
        <Field label="Valor"><MoneyInput value={f.valor} onChange={set('valor')} autoFocus /></Field>
        <Field label="Data"><input type="date" className="in" value={f.data} onChange={(e) => set('data')(e.target.value)} /></Field>
        {tipo === 'recebimento' ? <Field label="Forma"><Select value={f.forma} onChange={(v) => set('forma')(v || 'Pix')} options={FORMAS_RECEBIMENTO} /></Field> : null}
        {tipo === 'adicional' ? <Field label="Descrição"><input className="in" placeholder="Ex.: página extra, integração" value={f.desc} onChange={(e) => set('desc')(e.target.value)} /></Field> : null}
        {tipo === 'abatimento' ? <Field label="Motivo"><input className="in" placeholder="Ex.: melhoria do sistema" value={f.motivo} onChange={(e) => set('motivo')(e.target.value)} /></Field> : null}
        {tipo === 'recebimento' || tipo === 'pagamento' ? <Field label="Observação"><input className="in" value={f.obs} onChange={(e) => set('obs')(e.target.value)} /></Field> : null}
        {aviso ? <div className="note y">{aviso} Você pode salvar mesmo assim.</div> : null}
        {erro ? <div className="note r">{erro}</div> : null}
        <button id="fin-salvar" type="submit" hidden />
      </form>
    </Modal>
  )
}

function ParceiroModal({ project, atual, partners, onClose }) {
  const [f, setF] = useState({
    nome: atual?.partner_name || '', partner_id: atual?.partner_id || null, kind: atual?.kind || 'fixa',
    valor: atual?.amount_cents || 0, pct: atual?.pct ?? 30,
  })
  const [erro, setErro] = useState('')
  const escolher = (nome) => {
    const p = partners.find((x) => x.name.toLowerCase() === nome.trim().toLowerCase())
    setF((x) => ({ ...x, nome, partner_id: p?.id || null }))
  }
  const salvar = async () => {
    const e = !f.nome.trim() ? 'Informe o nome do parceiro.'
      : f.kind === 'fixa' ? validarValor(f.valor)
      : !(Number(f.pct) > 0 && Number(f.pct) <= 100) ? 'O percentual precisa estar entre 0 e 100.' : ''
    setErro(e)
    if (e) return
    const row = { project_id: project.id, partner_id: f.partner_id, partner_name: f.nome.trim(), kind: f.kind,
      amount_cents: f.kind === 'fixa' ? f.valor : 0, pct: f.kind === 'percentual' ? Number(f.pct) : 0 }
    if (atual) await update('project_comissao', atual.id, row)
    else await insert('project_comissao', row)
    notify('Comissão salva.', 'ok')
    onClose()
  }
  return (
    <Modal title="Parceiro e comissão" size="sm" onClose={onClose}
      footer={<><button type="button" className="btn" onClick={onClose}>Cancelar</button><AsyncButton className="btn p" onClick={salvar}>Salvar</AsyncButton></>}>
      <div className="stack">
        <Field label="Parceiro">
          <input className="in" list="fin-parceiros" value={f.nome} autoFocus onChange={(e) => escolher(e.target.value)} placeholder="Nome do parceiro" />
          <datalist id="fin-parceiros">{partners.map((p) => <option key={p.id} value={p.name} />)}</datalist>
        </Field>
        <Field label="Tipo de comissão">
          <Select value={f.kind} onChange={(v) => setF({ ...f, kind: v || 'fixa' })} options={{ fixa: 'Valor fechado', percentual: 'Percentual sobre o total' }} />
        </Field>
        {f.kind === 'fixa'
          ? <Field label="Valor da comissão"><MoneyInput value={f.valor} onChange={(v) => setF({ ...f, valor: v })} /></Field>
          : <Field label="Percentual (%)"><input className="in num" inputMode="decimal" value={f.pct} onChange={(e) => setF({ ...f, pct: e.target.value.replace(',', '.').replace(/[^\d.]/g, '') })} /></Field>}
        {erro ? <div className="note r">{erro}</div> : null}
      </div>
    </Modal>
  )
}
