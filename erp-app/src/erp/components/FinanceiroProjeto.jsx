import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { useData, fetchRows, fetchOne, insert, update, remove, archive, notify } from '../lib/data'
import { brl, dmy, hm, today } from '../lib/format'
import { calcularProjeto, resumoComanda, linhaDoTempo, validarValor, avisoRecebimento, avisoAbatimento, ALERTAS, TIPOS_VALOR, FORMAS_RECEBIMENTO } from '../lib/financeiro'
import { Card, Kpi, Loading, ErrorBox, Modal, Field, Select, MoneyInput, AsyncButton, useConfirm, Badge } from './ui'
import { Icon } from '../lib/icons'

export const TABELAS_FIN = ['project_valores', 'project_recebimentos', 'project_comissao', 'project_comissao_pagamentos', 'project_comissao_abatimentos', 'project_comandas']

const FALTA_TABELA = /does not exist|schema cache|Could not find the table/i

// comandas e histórico vêm de supabase/erp-comandas.sql; sem ele o financeiro segue funcionando sem eles
const opcional = (promessa) => promessa.catch((e) => {
  if (FALTA_TABELA.test(e?.message || '')) return null
  throw e
})

export function useFinanceiroProjeto(projectId, clientId = null) {
  return useData(async () => {
    const where = (q) => q.eq('project_id', projectId)
    try {
      const [valores, recebimentos, parceiros, pagamentos, abatimentos, partners, comandas, historico, cliente, legados] = await Promise.all([
        fetchRows('project_valores', { where, order: 'on_date' }),
        fetchRows('project_recebimentos', { where, order: 'received_on' }),
        fetchRows('project_comissao', { where, order: 'created_at' }),
        fetchRows('project_comissao_pagamentos', { where, order: 'paid_on' }),
        fetchRows('project_comissao_abatimentos', { where, order: 'on_date' }),
        fetchRows('partners').catch(() => []),
        opcional(fetchRows('project_comandas', { where, order: 'created_at', ascending: true })),
        opcional(fetchRows('project_fin_log', { where, order: 'feito_em', limit: 40 })),
        clientId ? fetchOne('clients', clientId).catch(() => null) : null,
        clientId ? fetchRows('receivables', { where: (q) => q.eq('client_id', clientId), order: 'due_on', ascending: true }).catch(() => []) : [],
      ])
      return { valores, recebimentos, parceiro: parceiros[0] || null, pagamentos, abatimentos, partners, comandas, historico, cliente, legados }
    } catch (e) {
      if (FALTA_TABELA.test(e?.message || '')) return { semTabelas: true }
      throw e
    }
  }, [...TABELAS_FIN, 'project_fin_log', 'clients', 'receivables'], [projectId, clientId])
}

const rotuloItem = (v) => `${TIPOS_VALOR[v.kind] || 'Valor'}${v.description ? ` · ${v.description}` : ''}`

export default function FinanceiroProjeto({ project, onChanged }) {
  const auth = useAuth()
  const confirm = useConfirm()
  const [modal, setModal] = useState(null)
  const { data, loading, error, reload } = useFinanceiroProjeto(project.id, project.client_id)
  const canEdit = auth.canEdit('financeiro')
  const canDelete = auth.isTotal('financeiro')

  const fin = useMemo(() => (data && !data.semTabelas ? calcularProjeto(data) : null), [data])
  const resumo = useMemo(() => (data && !data.semTabelas ? resumoComanda(data) : null), [data])
  const tempo = useMemo(() => (data && !data.semTabelas ? linhaDoTempo(data) : []), [data])

  if (error) return <ErrorBox error={error} onRetry={reload} />
  if (loading || !data) return <Loading rows={5} />
  if (data.semTabelas) {
    return <div className="note y">O financeiro dos projetos ainda não foi criado no banco. Rode o arquivo <span className="num">supabase/erp-financeiro-projetos.sql</span> no SQL Editor do Supabase e atualize esta página.</div>
  }

  const temComandas = data.comandas !== null
  const comanda = temComandas ? (data.comandas.find((c) => c.status === 'aberta') || data.comandas[0] || null) : null
  const itensPorId = Object.fromEntries(data.valores.map((v) => [v.id, rotuloItem(v)]))
  const semValor = data.valores.length === 0
  // parcelas do modelo antigo (Contas a receber) do mesmo cliente que ainda contam por fora deste financeiro
  const legados = (data.legados || []).filter((x) => !(project.contract_id && x.contract_id === project.contract_id))
  const arquivarLegado = async (x) => {
    if (await confirm(`Arquivar a parcela "${x.description}" de ${brl(x.amount_cents)}? Ela sai de Contas a receber e dos totais. Dá para desfazer logo depois.`, { ok: 'Arquivar' })) await archive('receivables', x.id)
  }

  // a comanda nasce no primeiro lançamento; depois todo item e recebimento cai nela
  const garantirComanda = async () => {
    if (!temComandas) return null
    if (comanda) return comanda.id
    const nova = await insert('project_comandas', { project_id: project.id, client_id: project.client_id || null, title: project.name })
    return nova.id
  }

  const apagar = async (tabela, id, texto) => {
    if (await confirm(`Apagar ${texto}? Isso muda os saldos do projeto e fica no histórico.`, { ok: 'Apagar', danger: true })) {
      await remove(tabela, id)
      onChanged?.()
    }
  }
  const fechar = () => { setModal(null); onChanged?.() }

  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="fin-vinculo" aria-label="Vínculo do financeiro">
        <div>
          <span className="lbl">Cliente</span>
          {data.cliente
            ? <b><Link to={`/erp/clientes?id=${data.cliente.id}`}>{data.cliente.name}</Link>{data.cliente.contact_name ? <span className="lbl"> · {data.cliente.contact_name}</span> : null}</b>
            : <b className="warn">Sem cliente vinculado ao projeto</b>}
        </div>
        <div><span className="lbl">Projeto</span><b>{project.name}</b></div>
        <div>
          <span className="lbl">Comanda</span>
          {temComandas
            ? <b>{comanda ? comanda.title : 'Será criada no primeiro lançamento'}{comanda ? <> <Badge kind={comanda.status === 'aberta' ? 'g' : ''} dot={false}>{comanda.status}</Badge></> : null}</b>
            : <b className="lbl">Rode supabase/erp-comandas.sql para ativar</b>}
        </div>
      </div>

      {comanda && Object.hasOwn(comanda, 'receber_previsto_em') && fin.faltaReceber > 0 ? (
        <div className="note info fin-vazio">
          <span>{comanda.receber_previsto_em ? <>Previsão de receber o saldo de {brl(fin.faltaReceber)}: <b>{dmy(comanda.receber_previsto_em)}</b>.</> : <>Falta receber {brl(fin.faltaReceber)}. Diga quando você espera receber para o saldo entrar no caixa dos próximos 30 dias.</>}</span>
          {canEdit ? <button type="button" className="btn s" onClick={() => setModal('previsao')}>{comanda.receber_previsto_em ? 'Mudar previsão' : 'Definir previsão'}</button> : null}
        </div>
      ) : null}

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
          <button type="button" className="btn" onClick={() => setModal('adicional')}><Icon name="plus" size={14} />Adicionar item na comanda</button>
          <button type="button" className="btn" disabled={!fin.temParceiro} title={fin.temParceiro ? '' : 'Defina o parceiro primeiro'} onClick={() => setModal('pagamento')}><Icon name="send" size={14} />Registrar pagamento de comissão</button>
          <button type="button" className="btn" disabled={!fin.temParceiro} title={fin.temParceiro ? '' : 'Defina o parceiro primeiro'} onClick={() => setModal('abatimento')}><Icon name="zap" size={14} />Registrar abatimento</button>
        </div>
      ) : null}

      {semValor ? (
        <div className="note info fin-vazio">
          <span>Este projeto ainda não tem valor combinado. Cadastre o valor base para o ERP calcular os saldos{project.value_cents ? ` (o cadastro do projeto diz ${brl(project.value_cents)}).` : '.'}</span>
          {canEdit && project.value_cents ? (
            <AsyncButton className="btn s p" onClick={async () => {
              const comandaId = await garantirComanda()
              await insert('project_valores', { project_id: project.id, kind: 'base', description: 'Valor combinado', amount_cents: project.value_cents, ...(comandaId ? { comanda_id: comandaId } : {}) })
              onChanged?.()
            }}>Usar {brl(project.value_cents)} como valor base</AsyncButton>
          ) : null}
        </div>
      ) : null}

      <div className="cols">
        <div className="stack" style={{ flex: '2 1 460px', minWidth: 0 }}>
          {data.valores.length ? (
            <Card pad title={<h2>Itens da comanda</h2>} action={<span className="lbl">cobrado até hoje · recebido neste item</span>}>
              <ul className="fin-itens">
                {resumo.itens.map(({ item, cobrado, meses, recebido }) => (
                  <li key={item.id} className="fin-item">
                    <div className="fin-item-m">
                      <span className="fin-ev-t">{rotuloItem(item)}</span>
                      <span className="lbl num">
                        {item.kind === 'mensalidade'
                          ? `${brl(item.amount_cents)} por mês · desde ${dmy(item.starts_on)}${item.ends_on ? ` até ${dmy(item.ends_on)}` : ''} · ${meses} mês(es) cobrado(s)`
                          : dmy(item.on_date)}
                      </span>
                    </div>
                    <div className="fin-item-v num"><b>{brl(cobrado)}</b><span className="lbl">recebido {brl(recebido)}</span></div>
                    {canEdit ? <button type="button" className="btn s ic g" aria-label="Alterar este item" onClick={() => setModal({ editar: item })}><Icon name="edit" size={13} /></button> : null}
                    {canDelete ? <button type="button" className="btn s ic g" aria-label="Apagar este item" onClick={() => apagar('project_valores', item.id, 'este item de valor')}><Icon name="trash" size={13} /></button> : null}
                  </li>
                ))}
              </ul>
              {resumo.semItem ? <span className="lbl" style={{ display: 'block', marginTop: 8 }}>{brl(resumo.semItem)} recebidos sem apontar para um item específico (contam no total da comanda).</span> : null}
            </Card>
          ) : null}

          <Card pad title={<h2>Linha do tempo</h2>} action={<span className="lbl">{tempo.length} lançamento(s)</span>}>
            {tempo.length ? (
              <ol className="fin-tempo">
                {tempo.map((e) => <Evento key={e.tipo + e.row.id} e={e} itens={itensPorId} canDelete={canDelete} onDelete={apagar} />)}
              </ol>
            ) : <p className="lbl">Nada lançado ainda. Use os botões acima.</p>}
          </Card>

          {canEdit && legados.length && !semValor ? (
            <Card pad title={<h2>Parcelas antigas deste cliente</h2>} action={<span className="lbl">modelo antigo</span>}>
              <p className="lbl" style={{ marginBottom: 8 }}>Estas parcelas vêm de Contas a receber e ainda contam por fora deste financeiro. Se o valor delas já está lançado aqui, arquive para não contar duas vezes.</p>
              <ul className="fin-itens">
                {legados.map((x) => (
                  <li key={x.id} className="fin-item">
                    <div className="fin-item-m">
                      <span className="fin-ev-t">{x.description}{x.part_label ? ` (${x.part_label})` : ''}</span>
                      <span className="lbl num">{x.received_on ? `recebida em ${dmy(x.received_on)}` : `vence em ${dmy(x.due_on)}`}</span>
                    </div>
                    <div className="fin-item-v num"><b>{brl(x.amount_cents)}</b></div>
                    <button type="button" className="btn s" onClick={() => arquivarLegado(x)}>Arquivar</button>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
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
          {data.historico ? (
            <Card pad title={<h2>Histórico de alterações</h2>} action={<span className="lbl">{data.historico.length ? 'mais recentes' : ''}</span>}>
              {data.historico.length ? (
                <ol className="fin-hist">
                  {data.historico.map((l) => <li key={l.id}>{descreverLog(l)}<span className="lbl">{dmy(l.feito_em)} {hm(l.feito_em)} · {auth.memberName(l.feito_por)}</span></li>)}
                </ol>
              ) : <p className="lbl">Toda criação, troca de valor ou exclusão aparece aqui.</p>}
            </Card>
          ) : null}
        </div>
      </div>

      {modal === 'parceiro' ? <ParceiroModal project={project} atual={data.parceiro} partners={data.partners} onClose={fechar} /> : null}
      {modal === 'previsao' && comanda ? <PrevisaoModal comanda={comanda} onClose={fechar} /> : null}
      {['recebimento', 'adicional', 'pagamento', 'abatimento'].includes(modal) || modal?.editar
        ? <LancamentoModal tipo={modal?.editar ? 'adicional' : modal} editar={modal?.editar} project={project} fin={fin} itens={data.valores}
            temComandas={temComandas} garantirComanda={garantirComanda} onClose={fechar} /> : null}
    </div>
  )
}

const TABELA_LOG = {
  project_valores: 'Item', project_recebimentos: 'Recebimento', project_comissao: 'Comissão',
  project_comissao_pagamentos: 'Pagamento de comissão', project_comissao_abatimentos: 'Abatimento', project_comandas: 'Comanda',
}

function descreverLog(l) {
  const antes = l.antes || {}
  const depois = l.depois || {}
  const ref = l.acao === 'apagado' ? antes : depois
  const nome = ref.description || ref.reason || ref.title || ref.partner_name || ''
  const quanto = l.acao === 'alterado' && antes.amount_cents != null && antes.amount_cents !== depois.amount_cents
    ? `${brl(antes.amount_cents)} → ${brl(depois.amount_cents)}`
    : ref.amount_cents != null ? brl(ref.amount_cents) : ''
  return <span className="fin-hist-t">{TABELA_LOG[l.tabela] || l.tabela} {l.acao}{nome ? ` · ${nome}` : ''}{quanto ? ` · ${quanto}` : ''}</span>
}

function Evento({ e, itens, canDelete, onDelete }) {
  const r = e.row
  const cfg = {
    valor: { cor: 'blue', icone: 'plus', titulo: `${rotuloItem(r)}${r.kind === 'mensalidade' ? ' (por mês)' : ''}`, sinal: '+', tabela: 'project_valores', texto: 'este valor' },
    recebimento: { cor: 'green', icone: 'down', titulo: `Recebimento${r.method ? ` · ${r.method}` : ''}${r.valor_id && itens[r.valor_id] ? ` · ref. ${itens[r.valor_id]}` : ''}${r.notes ? ` · ${r.notes}` : ''}`, sinal: '+', tabela: 'project_recebimentos', texto: 'este recebimento' },
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

const TITULOS = { recebimento: 'Registrar recebimento', adicional: 'Adicionar item na comanda', pagamento: 'Registrar pagamento de comissão', abatimento: 'Registrar abatimento' }
const GERAL = '_geral'

function LancamentoModal({ tipo, editar, project, fin, itens, temComandas, garantirComanda, onClose }) {
  const [f, setF] = useState({
    valor: editar?.amount_cents || 0,
    data: (editar && (editar.kind === 'mensalidade' ? editar.starts_on : editar.on_date)) || today(),
    fim: editar?.ends_on || '',
    forma: 'Pix', obs: '', motivo: '',
    kind: editar?.kind || 'adicional', desc: editar?.description || '', item: GERAL,
  })
  const [erro, setErro] = useState('')
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }))
  const mensal = tipo === 'adicional' && f.kind === 'mensalidade'
  const aviso = f.valor > 0 && !editar ? (tipo === 'recebimento' ? avisoRecebimento(fin, f.valor) : tipo === 'abatimento' ? avisoAbatimento(fin, f.valor) : '') : ''
  const opcoesItem = [[GERAL, 'Geral da comanda (sem item específico)'], ...itens.map((v) => [v.id, rotuloItem(v)])]

  const salvar = async () => {
    const e = validarValor(f.valor)
      || (tipo === 'abatimento' && !f.motivo.trim() ? 'Diga o motivo do abatimento.' : '')
      || (!f.data ? (mensal ? 'Informe quando a cobrança começa.' : 'Informe a data.') : '')
      || (mensal && f.fim && f.fim < f.data ? 'O fim da mensalidade não pode ser antes do início.' : '')
    setErro(e)
    if (e) return
    const base = { project_id: project.id, amount_cents: f.valor }
    if (tipo === 'adicional') {
      const campos = { kind: f.kind, on_date: f.data, description: f.desc.trim() || null, ...(temComandas ? { starts_on: mensal ? f.data : null, ends_on: mensal && f.fim ? f.fim : null } : {}) }
      if (editar) {
        await update('project_valores', editar.id, { amount_cents: f.valor, ...campos })
        notify('Item alterado. A mudança ficou no histórico.', 'ok')
      } else {
        const comandaId = await garantirComanda()
        await insert('project_valores', { ...base, ...campos, ...(comandaId ? { comanda_id: comandaId } : {}) })
        notify('Lançado.', 'ok')
      }
      return onClose()
    }
    if (tipo === 'recebimento') {
      const comandaId = await garantirComanda()
      await insert('project_recebimentos', { ...base, received_on: f.data, method: f.forma, notes: f.obs.trim() || null,
        ...(comandaId ? { comanda_id: comandaId, valor_id: f.item === GERAL ? null : f.item } : {}) })
    }
    if (tipo === 'pagamento') await insert('project_comissao_pagamentos', { ...base, paid_on: f.data, notes: f.obs.trim() || null })
    if (tipo === 'abatimento') await insert('project_comissao_abatimentos', { ...base, on_date: f.data, reason: f.motivo.trim() })
    notify('Lançado.', 'ok')
    onClose()
  }

  return (
    <Modal title={editar ? 'Alterar item da comanda' : TITULOS[tipo]} size="sm" onClose={onClose}
      footer={<><button type="button" className="btn" onClick={onClose}>Cancelar</button><AsyncButton className="btn p" onClick={salvar}>Salvar</AsyncButton></>}>
      <form className="stack" onSubmit={(e) => { e.preventDefault(); document.getElementById('fin-salvar')?.click() }}>
        {tipo === 'adicional' ? (
          <Field label="Tipo"><Select value={f.kind} onChange={(v) => set('kind')(v || 'adicional')} options={temComandas ? TIPOS_VALOR : Object.fromEntries(Object.entries(TIPOS_VALOR).filter(([k]) => k !== 'mensalidade'))} /></Field>
        ) : null}
        {tipo === 'recebimento' && temComandas ? (
          <Field label="Referente a"><Select value={f.item} onChange={(v) => set('item')(v || GERAL)} options={opcoesItem} /></Field>
        ) : null}
        <Field label={mensal ? 'Valor por mês' : 'Valor'}><MoneyInput value={f.valor} onChange={set('valor')} autoFocus /></Field>
        <Field label={mensal ? 'Começa a cobrar em' : 'Data'}><input type="date" className="in" value={f.data} onChange={(e) => set('data')(e.target.value)} /></Field>
        {mensal ? <Field label="Termina em (opcional)"><input type="date" className="in" value={f.fim} onChange={(e) => set('fim')(e.target.value)} /></Field> : null}
        {tipo === 'recebimento' ? <Field label="Forma"><Select value={f.forma} onChange={(v) => set('forma')(v || 'Pix')} options={FORMAS_RECEBIMENTO} /></Field> : null}
        {tipo === 'adicional' ? <Field label="Descrição"><input className="in" placeholder="Ex.: página extra, integração, plano mensal" value={f.desc} onChange={(e) => set('desc')(e.target.value)} /></Field> : null}
        {tipo === 'abatimento' ? <Field label="Motivo"><input className="in" placeholder="Ex.: melhoria do sistema" value={f.motivo} onChange={(e) => set('motivo')(e.target.value)} /></Field> : null}
        {tipo === 'recebimento' || tipo === 'pagamento' ? <Field label="Observação"><input className="in" value={f.obs} onChange={(e) => set('obs')(e.target.value)} /></Field> : null}
        {mensal ? <div className="note info">A mensalidade soma no total do projeto uma vez por mês, a partir da data de início.</div> : null}
        {editar ? <div className="note info">O valor antigo e o novo ficam guardados no histórico da comanda.</div> : null}
        {aviso ? <div className="note y">{aviso} Você pode salvar mesmo assim.</div> : null}
        {erro ? <div className="note r">{erro}</div> : null}
        <button id="fin-salvar" type="submit" hidden />
      </form>
    </Modal>
  )
}

function PrevisaoModal({ comanda, onClose }) {
  const [data, setData] = useState(comanda.receber_previsto_em || '')
  const salvar = async () => {
    await update('project_comandas', comanda.id, { receber_previsto_em: data || null })
    notify(data ? 'Previsão salva.' : 'Previsão removida.', 'ok')
    onClose()
  }
  return (
    <Modal title="Previsão de receber o saldo" size="sm" onClose={onClose}
      footer={<><button type="button" className="btn" onClick={onClose}>Cancelar</button><AsyncButton className="btn p" onClick={salvar}>Salvar</AsyncButton></>}>
      <div className="stack">
        <Field label="Espero receber em"><input type="date" className="in" value={data} autoFocus onChange={(e) => setData(e.target.value)} /></Field>
        <div className="note info">Deixe em branco para tirar a previsão. O saldo com previsão nos próximos 30 dias entra no "a receber" e no saldo projetado.</div>
      </div>
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
