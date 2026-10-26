import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMeta } from '../components/Shell'
import { PageHead, Loading, ErrorBox, CountUp, Field, MoneyInput, Select, AsyncButton } from '../components/ui'
import { useData, notify } from '../lib/data'
import { brl, dm, addDays } from '../lib/format'
import { hojeSP } from '../lib/pf/datas'
import { entradasEsperadas, planoDaEntrada } from '../lib/pf/motor'
import { lerNucleo, TABELAS_NUCLEO, registrarRecebimento, separarReserva, contaPadrao, categoriaReserva } from '../lib/pf/nucleo'
import { diaSemanaData } from './listas'

const COR = { atrasadas: 'var(--red)', ciclo: 'var(--blue)', deficit: 'var(--org)', reserva: 'var(--yel)', livre: 'var(--green)' }
const NOME = { atrasadas: 'Atrasadas', ciclo: 'Contas do ciclo', deficit: 'Ciclo seguinte', reserva: 'Reserva', livre: 'Livre' }

export default function Receber() {
  useMeta('Pessoal · Receber', 'Pessoal')
  const hoje = hojeSP()
  const { data, loading, error, reload } = useData(() => lerNucleo(hoje), TABELAS_NUCLEO, [hoje])
  if (error) return <div className="page"><ErrorBox error={error} onRetry={reload} /></div>
  if (loading || !data) return <div className="page"><Loading rows={6} /></div>
  if (!data.config.onboarding_ok_em) {
    return <div className="page pf"><PageHead title="Receber" /><span className="note y">Termine os <Link to="/erp/pessoal/primeiros-passos">primeiros passos</Link> antes de registrar um recebimento.</span></div>
  }
  return <Formulario data={data} hoje={hoje} />
}

function Formulario({ data, hoje }) {
  const { config, modelos, compromissos, parcelas, recebidos, contas, categorias, reservaAtual } = data
  const regra = config.regra_fim_semana
  const desdeMin = config.onboarding_ok_em.slice(0, 10)
  const opcoes = useMemo(() => {
    const desde = addDays(hoje, -7) > desdeMin ? addDays(hoje, -7) : desdeMin
    return entradasEsperadas({ modelos, regra, desde, ate: addDays(hoje, 45), recebidos }).slice(0, 5)
  }, [modelos, regra, recebidos, hoje, desdeMin])

  const inicial = opcoes.find((o) => o.data <= hoje) || opcoes[0] || null
  const [sel, setSel] = useState(inicial ? inicial.id : 'avulsa')
  const ocorrencia = opcoes.find((o) => o.id === sel) || null
  const [valor, setValor] = useState(inicial ? inicial.valor_cent : 0)
  const [dataRec, setDataRec] = useState(hoje)
  const [descAvulsa, setDescAvulsa] = useState('')
  const correntes = contas.filter((c) => c.ativo && c.tipo !== 'cartao')
  const [conta, setConta] = useState(contaPadrao(contas)?.id || null)
  const [ja, setJa] = useState([])
  const [feito, setFeito] = useState(null)

  useEffect(() => { setValor(ocorrencia ? ocorrencia.valor_cent : 0); setJa([]) }, [sel]) // eslint-disable-line react-hooks/exhaustive-deps

  const entrada = ocorrencia ? categorias.find((c) => c.tipo === 'entrada' && c.nome === 'Salário') : categorias.find((c) => c.tipo === 'entrada' && c.nome === 'Outras entradas')
  const comum = { valorCent: valor, data: dataRec, config, modelos, recebidos, ocorrenciaId: ocorrencia?.id || null, compromissos, parcelas, reservaAtualCent: reservaAtual }
  const base = useMemo(() => planoDaEntrada({ ...comum, jaPagas: [] }), [valor, dataRec, ocorrencia]) // eslint-disable-line react-hooks/exhaustive-deps
  const plano = useMemo(() => planoDaEntrada({ ...comum, jaPagas: ja }), [valor, dataRec, ocorrencia, ja]) // eslint-disable-line react-hooks/exhaustive-deps

  const marcar = (id) => setJa((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]))
  const confirmar = async () => {
    if (!valor) return notify('Informe quanto você recebeu.', 'err')
    if (!ocorrencia && !descAvulsa.trim()) return notify('Escreva de onde veio esse dinheiro.', 'err')
    const r = await registrarRecebimento({ ocorrencia, valorCent: valor, data: dataRec, contaId: conta || ocorrencia?.contaId, categoriaId: entrada?.id, descricao: ocorrencia ? ocorrencia.descricao : descAvulsa.trim(), jaPagas: ja })
    if (r.falhas.length) notify('O recebimento foi registrado, mas algumas contas não deram baixa. Confira em Contas a pagar.', 'err')
    else notify('Recebimento registrado.', 'ok')
    setFeito({ plano, valor })
  }

  if (feito) return <Concluido feito={feito} contas={contas} categorias={categorias} conta={conta} data={dataRec} />

  const passoPor = Object.fromEntries(plano.passos.map((p) => [p.id, p]))
  return (
    <div className="page pf pf-receber">
      <PageHead title="Receber" sub="Registre o dinheiro que entrou e veja para onde ele vai." />

      <section className="pf-bloco">
        <div className="pf-cabeca"><div className="stack-s"><h2>Qual dinheiro entrou?</h2><span className="lbl">Escolha o recebimento esperado ou registre outro.</span></div></div>
        <div className="pf-chips grande" role="radiogroup" aria-label="Recebimento">
          {opcoes.map((o) => (
            <button key={o.id} type="button" role="radio" aria-checked={sel === o.id} className={sel === o.id ? 'on' : ''} onClick={() => setSel(o.id)}>
              <span>{o.descricao}</span><small className="num">{diaSemanaData(o.data)}{o.valor_cent ? ` · ${brl(o.valor_cent)}` : ''}</small>
            </button>
          ))}
          <button type="button" role="radio" aria-checked={sel === 'avulsa'} className={sel === 'avulsa' ? 'on' : ''} onClick={() => setSel('avulsa')}><span>Outra entrada</span><small>dinheiro avulso</small></button>
        </div>
        <div className="fields">
          <Field label="Quanto entrou (R$)"><MoneyInput value={valor} onChange={setValor} aria-label="Valor recebido" /></Field>
          <Field label="Entrou em"><input type="date" className="in" value={dataRec} onChange={(e) => setDataRec(e.target.value)} /></Field>
          {!ocorrencia ? <Field label="De onde veio"><input className="in" value={descAvulsa} onChange={(e) => setDescAvulsa(e.target.value)} placeholder="Ex.: trabalho extra, reembolso" /></Field> : null}
          {correntes.length > 1 ? <Field label="Caiu em qual conta"><Select value={conta} onChange={setConta} options={correntes.map((c) => [c.id, c.nome])} /></Field> : null}
        </div>
      </section>

      <section className={`pf-plano ${plano.fecha ? '' : 'falta'}`} aria-live="polite">
        <div className="pf-cabeca">
          <div className="stack-s">
            <h2>O plano dessa entrada</h2>
            <span className="lbl">{plano.proxima ? `Para durar até ${dm(plano.proxima)}, ${plano.dias} ${plano.dias === 1 ? 'dia' : 'dias'}.` : 'Sem outro recebimento cadastrado: olho os próximos 30 dias.'}</span>
          </div>
          <span className="pf-plano-total num"><CountUp value={brl(valor)} /></span>
        </div>

        <div className="pf-empilhada" role="img" aria-label={plano.partes.map((p) => `${NOME[p.id]}: ${brl(p.valor_cent)}`).join(', ')}>
          {plano.partes.map((p) => <i key={p.id} style={{ flexGrow: p.valor_cent, background: COR[p.id] }} title={`${NOME[p.id]}: ${brl(p.valor_cent)}`} />)}
        </div>
        <div className="legend pf-plano-leg">
          {plano.partes.filter((p) => p.valor_cent > 0).map((p) => <span key={p.id}><i style={{ background: COR[p.id] }} />{NOME[p.id]} <b className="num">{brl(p.valor_cent)}</b></span>)}
        </div>

        {!plano.fecha ? (
          <div className="note r">
            Essa entrada não cobre as contas até {plano.proxima ? dm(plano.vespera) : 'o fim do período'}. <b>Faltam {brl(plano.faltou)}</b>. Nada vai para a reserva e o limite diário fica em zero. <Link to="/erp/pessoal">Veja o que dá para adiar na tela Hoje.</Link>
          </div>
        ) : null}

        <ol className="pf-passos-plano">
          {plano.passos.map((p, i) => {
            const lista = (p.id === 'atrasadas' || p.id === 'ciclo') ? base.passos.find((x) => x.id === p.id).itens : []
            return (
              <li key={p.id} style={{ animationDelay: `${i * 0.07}s` }}>
                <span className="pf-n num" style={{ borderColor: COR[p.id], color: COR[p.id] }}>{i + 1}</span>
                <div className="pf-meio">
                  <div className="pf-passo-linha">
                    <span className="pf-nome">{p.titulo}</span>
                    <span className="pf-valor num">{brl(p.valor_cent)}</span>
                  </div>
                  {p.id !== 'livre' && p.devido_cent > p.valor_cent ? <span className="lbl neg">Só cobre {brl(p.valor_cent)} dos {brl(p.devido_cent)} devidos.</span> : null}
                  {p.nota ? <span className="lbl">{p.nota}</span> : null}
                  {lista.length ? (
                    <div className="pf-check">
                      {lista.map((o) => {
                        const pago = ja.includes(o.id)
                        return (
                          <label key={o.id} className={`pf-check-item ${pago ? 'pago' : ''}`}>
                            <input type="checkbox" checked={pago} onChange={() => marcar(o.id)} />
                            <span className="pf-check-t"><span>{o.descricao}</span><small>{o.vencimento < dataRec ? 'atrasada' : `vence ${dm(o.vencimento)}`}{pago ? ' · já paga' : ''}</small></span>
                            <span className="num">{brl(o.devido_cent)}</span>
                          </label>
                        )
                      })}
                      <span className="lbl">Marque "já paguei" nas que você quitou antes de receber: elas saem do plano e ganham baixa.</span>
                    </div>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ol>

        {plano.fecha ? (
          <div className="pf-resultado">
            <span className="lbl">Livre para gastar</span>
            <b className="num"><CountUp value={brl(passoPor.livre.valor_cent)} /></b>
            <span className="lbl">{brl(plano.limiteDiario)} por dia</span>
          </div>
        ) : null}

        <div className="pf-nav">
          <Link to="/erp/pessoal" className="btn">Voltar</Link>
          <AsyncButton className="btn p" onClick={confirmar}>Confirmar recebimento</AsyncButton>
        </div>
      </section>
    </div>
  )
}

function Concluido({ feito, contas, categorias, conta, data }) {
  const { plano } = feito
  const reserva = plano.partes.find((p) => p.id === 'reserva').valor_cent
  const cat = categoriaReserva(categorias)
  const [separado, setSeparado] = useState(false)
  const separar = async () => {
    await separarReserva({ valorCent: reserva, contaId: conta || contaPadrao(contas)?.id, categoriaId: cat.id, data })
    setSeparado(true)
    notify(`${brl(reserva)} separados para a reserva.`, 'ok')
  }
  return (
    <div className="page pf pf-receber">
      <PageHead title="Recebimento registrado" sub="O saldo já foi atualizado." />
      <section className="pf-bloco pf-feito">
        <span className="pf-selo num">PLANO PRONTO</span>
        <p className="pf-feito-t">Você tem <b className="num">{brl(plano.livre)}</b> livres{plano.proxima ? ` até ${dm(plano.proxima)}` : ''}: <b className="num">{brl(plano.limiteDiario)}</b> por dia.</p>
        {reserva > 0 && cat ? (
          <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
            <span className="lbl">O plano manda {brl(reserva)} para a reserva.</span>
            {separado ? <span className="note g">Separado.</span> : <AsyncButton className="btn s" onClick={separar}>Separar {brl(reserva)} agora</AsyncButton>}
          </div>
        ) : null}
        <div className="pf-nav">
          <Link to="/erp/pessoal/contas" className="btn">Pagar as contas</Link>
          <Link to="/erp/pessoal" className="btn p">Ver quanto posso gastar hoje</Link>
        </div>
      </section>
    </div>
  )
}
