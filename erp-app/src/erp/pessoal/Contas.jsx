import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMeta } from '../components/Shell'
import { PageHead, Loading, ErrorBox, Badge, Empty, Seg, Select, Tabs, useConfirm } from '../components/ui'
import { Icon } from '../lib/icons'
import { useData, fetchRows, notify } from '../lib/data'
import { brl, dm, MONTHS, addMonths, daysBetween } from '../lib/format'
import { hojeSP, gradeDoMes } from '../lib/pf/datas'
import { lerCadastros, lerConfig, PRIORIDADES, PRIORIDADE_COR, RECORRENCIAS } from '../lib/pf/api'
import { lerCompromissosAbertos, lerParcelasAbertas, reabrirCompromisso } from '../lib/pf/nucleo'
import { encargosDeAtraso, entradasEsperadas, obrigacoesDeDividas } from '../lib/pf/motor'
import { addDays } from '../lib/format'
import { diaSemanaData } from './listas'
import { ModalCompromisso } from './modais'
import { ModalPagar, ModalCancelar } from './acoes'

const TABELAS = ['pf_dividas', 'pf_faturas', 'pf_compromissos', 'pf_parcelas', 'pf_parcelamentos', 'pf_categorias', 'pf_contas', 'pf_lancamentos', 'pf_recebimentos_modelo']
const COR_PRIO = { essencial: 'var(--blue)', importante: 'var(--tx-3)', adiavel: 'var(--yel)' }
const fimDoMes = (mes) => addMonths(`${mes}-01`, 1).slice(0, 8) + '01'

// conta ou parcela no mesmo formato, para as listas
function emItem(raw, tipo) {
  return {
    uid: `${tipo}:${raw.id}`, tipo, raw, ref: raw.id, id: `${tipo === 'parcela' ? 'p' : 'c'}:${raw.id}`, descricao: raw.descricao, valor_cent: Number(raw.valor_cent),
    vencimento: raw.vencimento, prioridade: raw.prioridade || 'importante', status: raw.status, pago_em: raw.pago_em, categoria_id: raw.categoria_id || null,
    recorrencia: tipo === 'conta' ? raw.recorrencia : 'unica', multa_pct: Number(raw.multa_pct) || 0, juros_dia_pct: Number(raw.juros_dia_pct) || 0,
  }
}

// parcela mínima de dívida (vem do motor) no mesmo formato das contas
const emItemDivida = (o) => ({ ...o, uid: o.id, raw: null, status: 'aberta', pago_em: null, categoria_id: null, recorrencia: 'unica' })

export default function Contas() {
  useMeta('Pessoal · Contas a pagar', 'Pessoal')
  const hoje = hojeSP()
  const [mes, setMes] = useState(hoje.slice(0, 7))
  const { data, loading, error, reload } = useData(async () => {
    const ini = `${mes}-01`, fim = fimDoMes(mes)
    const [config, cad, abertas, parcelasAbertas, doMes, parcelasDoMes, dividasRows, pagasRows] = await Promise.all([
      lerConfig(), lerCadastros(), lerCompromissosAbertos(), lerParcelasAbertas(),
      fetchRows('pf_compromissos', {
        where: (q) => q.neq('status', 'aberta').or(`and(vencimento.gte.${ini},vencimento.lt.${fim}),and(pago_em.gte.${ini},pago_em.lt.${fim})`), order: 'vencimento', ascending: true,
      }),
      fetchRows('pf_parcelas', {
        select: '*, pf_parcelamentos(descricao, n_parcelas, categoria_id)', where: (q) => q.neq('status', 'aberta').or(`and(vencimento.gte.${ini},vencimento.lt.${fim}),and(pago_em.gte.${ini},pago_em.lt.${fim})`), order: 'vencimento', ascending: true,
      }),
      fetchRows('pf_dividas', { where: (q) => q.eq('ativo', true), order: 'credor', ascending: true }),
      fetchRows('pf_lancamentos', { select: 'data,divida_id', order: 'data', ascending: true, where: (q) => q.not('divida_id', 'is', null).gte('data', addDays(hoje, -40)) }),
    ])
    const dv = obrigacoesDeDividas({ dividas: dividasRows, pagas: pagasRows.map((r) => `${r.divida_id}|${r.data.slice(0, 7)}`), hoje, ate: addDays(hoje, 75) }).itens
    const desc = (p) => ({ ...p, descricao: p.pf_parcelamentos ? `${p.pf_parcelamentos.descricao} (${p.numero}/${p.pf_parcelamentos.n_parcelas})` : 'Parcela', categoria_id: p.pf_parcelamentos?.categoria_id || null })
    return { config, ...cad, abertas, parcelasAbertas, doMes, parcelasDoMes: parcelasDoMes.map(desc), dividas: dv }
  }, TABELAS, [hoje, mes])

  const [modo, setModo] = useState('lista')
  const [aba, setAba] = useState('abertas')
  const [prio, setPrio] = useState(null)
  const [dia, setDia] = useState(hoje)
  const [nova, setNova] = useState(false)
  const [editando, setEditando] = useState(null)
  const [pagando, setPagando] = useState(null)
  const [cancelando, setCancelando] = useState(null)
  const confirmar = useConfirm()

  const itens = useMemo(() => {
    if (!data) return { abertas: [], pagas: [], doMes: [] }
    const abertas = [...data.abertas.map((c) => emItem(c, 'conta')), ...data.parcelasAbertas.map((p) => emItem(p, 'parcela')), ...data.dividas.map(emItemDivida)]
      .sort((a, b) => (a.vencimento < b.vencimento ? -1 : a.vencimento > b.vencimento ? 1 : a.descricao.localeCompare(b.descricao)))
    const outras = [...data.doMes.map((c) => emItem(c, 'conta')), ...data.parcelasDoMes.map((p) => emItem(p, 'parcela'))]
    const pagas = outras.filter((i) => i.status === 'paga' && i.pago_em && i.pago_em.slice(0, 7) === mes).sort((a, b) => (a.pago_em < b.pago_em ? 1 : -1))
    const noMes = [...abertas.filter((i) => i.vencimento.slice(0, 7) === mes), ...outras.filter((i) => i.status === 'paga' && i.vencimento.slice(0, 7) === mes)]
    return { abertas, pagas, doMes: noMes }
  }, [data, mes])

  if (error) return <div className="page"><ErrorBox error={error} onRetry={reload} /></div>
  if (loading || !data) return <div className="page"><Loading rows={6} /></div>

  const { categorias, contas } = data
  const catDe = (id) => categorias.find((c) => c.id === id)
  const filtra = (lista) => lista.filter((i) => !prio || i.prioridade === prio)
  const abertas = filtra(itens.abertas)
  const atrasadas = abertas.filter((i) => i.vencimento < hoje)
  const semana = abertas.filter((i) => i.vencimento >= hoje && daysBetween(hoje, i.vencimento) <= 7)
  const depois = abertas.filter((i) => i.vencimento >= hoje && daysBetween(hoje, i.vencimento) > 7)
  const totalAbertas = abertas.reduce((s, i) => s + i.valor_cent + (i.vencimento < hoje ? encargosDeAtraso(i, hoje) : 0), 0)
  const [ano, mm] = mes.split('-').map(Number)
  const irMes = (n) => setMes(addMonths(`${mes}-01`, n).slice(0, 7))

  const reabrir = async (i) => {
    if (!(await confirmar(`Reabrir "${i.descricao}"? O lançamento do pagamento será apagado.`, { ok: 'Reabrir' }))) return
    await reabrirCompromisso(i.ref)
    notify('Conta reaberta.', 'ok')
  }

  const ctx = { hoje, aba, catDe, setPagando, setEditando, setCancelando, reabrir }

  const grupo = (titulo, lista, extra, cls = '') => lista.length ? (
    <section className={`pf-bloco ${cls}`}>
      <div className="pf-cabeca"><div className="stack-s"><h2>{titulo}</h2>{extra ? <span className="lbl">{extra}</span> : null}</div></div>
      {lista.map((i, n) => <Linha key={i.uid} i={i} n={n} ctx={ctx} />)}
    </section>
  ) : null

  const porMes = {}
  for (const i of depois) (porMes[i.vencimento.slice(0, 7)] ||= []).push(i)

  return (
    <div className="page pf pf-contas">
      <PageHead title="Contas a pagar" sub={`${itens.abertas.length} em aberto · ${brl(totalAbertas)} no total`}>
        <button type="button" className="btn p" onClick={() => setNova(true)}><Icon name="plus" size={14} />Nova conta</button>
      </PageHead>

      <div className="pf-barra-filtros">
        <Seg value={modo} onChange={setModo} options={[['lista', 'Lista'], ['calendario', 'Calendário']]} />
        {modo === 'lista' ? <Tabs value={aba} onChange={setAba} options={[['abertas', 'Em aberto', itens.abertas.length], ['pagas', 'Pagas no mês', itens.pagas.length]]} /> : null}
        <Select value={prio} onChange={setPrio} placeholder="Toda importância" options={PRIORIDADES} aria-label="Filtrar por importância" />
      </div>

      {modo === 'lista' && aba === 'abertas' ? (
        <>
          {grupo('Atrasadas', atrasadas, 'Pague primeiro: os juros crescem todo dia.', 'atrasadas')}
          {grupo('Próximos 7 dias', semana)}
          {Object.keys(porMes).sort().map((m) => <React.Fragment key={m}>{grupo(`${MONTHS[Number(m.slice(5)) - 1][0].toUpperCase()}${MONTHS[Number(m.slice(5)) - 1].slice(1)} de ${m.slice(0, 4)}`, porMes[m])}</React.Fragment>)}
          {!abertas.length ? <Empty icon="check" action={<button type="button" className="btn p" onClick={() => setNova(true)}>Cadastrar uma conta</button>}>Nenhuma conta em aberto{prio ? ' com essa importância' : ''}.</Empty> : null}
        </>
      ) : null}

      {modo === 'lista' && aba === 'pagas' ? (
        <>
          <MesNav ano={ano} mm={mm} irMes={irMes} />
          {filtra(itens.pagas).length ? (
            <section className="pf-bloco">
              <div className="pf-cabeca"><div className="stack-s"><h2>Pago em {MONTHS[mm - 1]}</h2><span className="lbl num">{brl(filtra(itens.pagas).reduce((s, i) => s + i.valor_cent, 0))} em {filtra(itens.pagas).length} {filtra(itens.pagas).length === 1 ? 'conta' : 'contas'}</span></div></div>
              {filtra(itens.pagas).map((i, n) => <Linha key={i.uid} i={i} n={n} ctx={ctx} />)}
            </section>
          ) : <Empty icon="check">Nenhuma conta paga em {MONTHS[mm - 1]}.</Empty>}
        </>
      ) : null}

      {modo === 'calendario' ? (
        <Calendario ano={ano} mm={mm} irMes={irMes} itens={filtra(itens.doMes)} atrasadas={atrasadas.filter((i) => i.vencimento < `${mes}-01`).length} dia={dia} setDia={setDia} hoje={hoje} modelos={data.modelos} regra={data.config.regra_fim_semana} ctx={ctx} />
      ) : null}

      {nova ? <ModalCompromisso categorias={categorias} onClose={() => setNova(false)} /> : null}
      {editando ? <ModalCompromisso compromisso={editando} categorias={categorias} onClose={() => setEditando(null)} /> : null}
      {pagando ? <ModalPagar item={pagando} contas={contas} onClose={() => setPagando(null)} /> : null}
      {cancelando ? <ModalCancelar conta={cancelando} onClose={() => setCancelando(null)} /> : null}
      <span className="lbl">Quer ver o que já saiu da conta? <Link to="/erp/pessoal/lancamentos">Lançamentos</Link></span>
    </div>
  )
}

function Linha({ i, n, ctx }) {
  const { hoje, aba, catDe, setPagando, setEditando, setCancelando, reabrir } = ctx
  const atrasada = i.status === 'aberta' && i.vencimento < hoje
  const enc = atrasada ? encargosDeAtraso(i, hoje) : 0
  const cat = catDe(i.categoria_id)
  return (
    <div className={`pf-linha ${atrasada ? 'atrasada' : ''} ${i.status !== 'aberta' ? 'quieta' : ''}`} style={{ animationDelay: `${Math.min(n, 12) * 0.03}s` }}>
      <div className="pf-dia" aria-hidden="true"><b className="num">{(i.status === 'paga' && aba === 'pagas' ? i.pago_em : i.vencimento).slice(8, 10)}</b><span>{(i.status === 'paga' && aba === 'pagas' ? i.pago_em : i.vencimento).slice(5, 7)}/{(i.status === 'paga' && aba === 'pagas' ? i.pago_em : i.vencimento).slice(2, 4)}</span></div>
      <div className="pf-meio">
        <span className="pf-nome">{i.descricao}</span>
        <span className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
          {i.status === 'paga' ? <Badge kind="g" dot={false}>Paga em {dm(i.pago_em)}</Badge> : <Badge kind={PRIORIDADE_COR[i.prioridade]} dot={false}>{PRIORIDADES[i.prioridade]}</Badge>}
          {i.tipo === 'parcela' ? <Badge dot={false}>Parcelamento</Badge> : null}
          {i.tipo === 'divida' ? <Badge dot={false}>Dívida</Badge> : null}
          {i.raw?.fatura_id ? <Badge dot={false}>Fatura do cartão</Badge> : null}
          {i.recorrencia !== 'unica' ? <Badge dot={false}>{RECORRENCIAS[i.recorrencia]}</Badge> : null}
          {cat ? <span className="lbl"><i className="pf-bolinha-s" style={{ background: cat.cor }} />{cat.nome}</span> : null}
        </span>
        {atrasada ? <span className="lbl neg">{daysBetween(i.vencimento, hoje)} {daysBetween(i.vencimento, hoje) === 1 ? 'dia' : 'dias'} de atraso{enc ? ` · +${brl(enc)} de multa e juros` : ''}</span> : null}
      </div>
      <span className="pf-valor num">{brl(i.valor_cent + enc)}</span>
      <span className="pf-acoes">
        {i.status === 'aberta' ? <button type="button" className="btn s" onClick={() => setPagando(i)}>Pagar</button> : null}
        {i.status === 'aberta' && i.tipo === 'conta' && !i.raw.fatura_id ? <button type="button" className="btn ic s g" aria-label={`Editar ${i.descricao}`} onClick={() => setEditando(i.raw)}><Icon name="edit" size={14} /></button> : null}
        {i.status === 'aberta' && i.tipo === 'conta' && !i.raw.fatura_id ? <button type="button" className="btn ic s g" aria-label={`Cancelar ${i.descricao}`} onClick={() => setCancelando(i.raw)}><Icon name="trash" size={14} /></button> : null}
        {i.status === 'paga' && i.tipo === 'conta' ? <button type="button" className="btn s g" onClick={() => reabrir(i)}>Reabrir</button> : null}
      </span>
    </div>
  )
}

export function MesNav({ ano, mm, irMes }) {
  return (
    <div className="pf-mes-nav">
      <button type="button" className="btn ic s" aria-label="Mês anterior" onClick={() => irMes(-1)}><Icon name="back" size={14} /></button>
      <b>{MONTHS[mm - 1][0].toUpperCase() + MONTHS[mm - 1].slice(1)} de {ano}</b>
      <button type="button" className="btn ic s" aria-label="Próximo mês" onClick={() => irMes(1)}><Icon name="arrow" size={14} /></button>
    </div>
  )
}

const SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
function Calendario({ ano, mm, irMes, itens, atrasadas, dia, setDia, hoje, modelos, regra, ctx }) {
  const mes = `${ano}-${String(mm).padStart(2, '0')}`
  const semanas = gradeDoMes(ano, mm)
  const porDia = {}
  for (const i of itens) (porDia[i.vencimento] ||= []).push(i)
  const entradas = {}
  for (const e of entradasEsperadas({ modelos, regra, desde: `${mes}-01`, ate: addMonths(`${mes}-01`, 1).slice(0, 8) + '01' })) { if (e.data.startsWith(mes)) entradas[e.data] = e }
  const totalMes = itens.filter((i) => i.status === 'aberta').reduce((s, i) => s + i.valor_cent, 0)
  const doDia = porDia[dia] || []
  const diaNoMes = dia.startsWith(mes)
  return (
    <>
      <MesNav ano={ano} mm={mm} irMes={irMes} />
      <section className="pf-bloco">
        <div className="pf-cal" role="grid" aria-label={`Calendário de ${MONTHS[mm - 1]}`}>
          {SEMANA.map((s, i) => <span key={i} className="pf-cal-cab" role="columnheader">{s}</span>)}
          {semanas.flat().map((d, k) => {
            if (!d) return <span key={k} className="pf-cal-vazio" />
            const lista = porDia[d] || []
            const vencida = lista.some((i) => i.status === 'aberta' && d < hoje)
            return (
              <button key={d} type="button" role="gridcell" aria-selected={d === dia} aria-label={`${Number(d.slice(8))} de ${MONTHS[mm - 1]}: ${lista.length} ${lista.length === 1 ? 'conta' : 'contas'}${entradas[d] ? ', dia de receber' : ''}`}
                className={`pf-cal-dia ${d === dia ? 'sel' : ''} ${d === hoje ? 'hoje' : ''} ${vencida ? 'venc' : ''}`} onClick={() => setDia(d)}>
                <b className="num">{Number(d.slice(8))}</b>
                <span className="pf-cal-pontos" aria-hidden="true">
                  {entradas[d] ? <i className="rec" /> : null}
                  {lista.slice(0, 3).map((i) => <i key={i.uid} style={{ background: i.status === 'paga' ? 'var(--green)' : COR_PRIO[i.prioridade] }} />)}
                </span>
                {lista.length > 3 ? <small className="num">+{lista.length - 3}</small> : null}
              </button>
            )
          })}
        </div>
        <div className="legend">
          <span><i className="rec-leg" />dia de receber</span>
          <span><i style={{ background: COR_PRIO.essencial }} />essencial</span>
          <span><i style={{ background: COR_PRIO.importante }} />importante</span>
          <span><i style={{ background: COR_PRIO.adiavel }} />pode adiar</span>
          <span><i style={{ background: 'var(--green)' }} />paga</span>
        </div>
        <span className="lbl">Em aberto neste mês: <b className="num">{brl(totalMes)}</b>.{atrasadas ? ` Há ${atrasadas} ${atrasadas === 1 ? 'conta atrasada' : 'contas atrasadas'} de meses anteriores (aba Lista).` : ''}</span>
      </section>
      <section className="pf-bloco">
        <div className="pf-cabeca"><div className="stack-s"><h2>{diaNoMes ? diaSemanaData(dia) : 'Escolha um dia'}</h2>{entradas[dia] ? <span className="lbl">Dia de receber: {entradas[dia].descricao}</span> : null}</div></div>
        {doDia.length ? doDia.map((i, n) => <Linha key={i.uid} i={i} n={n} ctx={ctx} />) : <Empty icon="cal">Nenhuma conta nesse dia.</Empty>}
      </section>
    </>
  )
}
