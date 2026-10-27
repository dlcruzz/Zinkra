import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMeta } from '../components/Shell'
import { PageHead, Loading, ErrorBox, Empty, Seg, Badge, CountUp, useConfirm } from '../components/ui'
import { Icon } from '../lib/icons'
import { useData, notify } from '../lib/data'
import { brl, brl0, dm, MONTHS_S, addMonths } from '../lib/format'
import { hojeSP } from '../lib/pf/datas'
import { lerConfig, lerCadastros } from '../lib/pf/api'
import { lerParcelamentosResumo, lerFaturasAbertas, lerComprometimento, lerParcelasDaLinha, apagarParcelamento } from '../lib/pf/nucleo'
import { linhaDoTempo, mesesEmAlerta } from '../lib/pf/parcelas'
import { ModalParcelamento } from './modais'
import { ModalAntecipar } from './acoes'

const TABELAS = ['pf_parcelamentos', 'pf_parcelas', 'pf_faturas', 'pf_compromissos', 'pf_contas', 'pf_dividas', 'pf_recebimentos_modelo', 'pf_lancamentos']
const mesRot = (ref) => `${MONTHS_S[Number(ref.slice(5, 7)) - 1]}/${ref.slice(2, 4)}`

export default function Parcelamentos() {
  useMeta('Pessoal · Parcelamentos', 'Pessoal')
  const hoje = hojeSP()
  const { data, loading, error, reload } = useData(async () => {
    const [config, cad, resumo, faturas, parcelas, compro] = await Promise.all([
      lerConfig(), lerCadastros(), lerParcelamentosResumo(), lerFaturasAbertas(),
      lerParcelasDaLinha(addMonths(`${hoje.slice(0, 7)}-01`, 12)), lerComprometimento(12),
    ])
    return { config, ...cad, resumo, faturas, parcelas, compro }
  }, TABELAS, [hoje])
  const [modo, setModo] = useState('tempo')
  const [novo, setNovo] = useState(false)
  const [antecipando, setAntecipando] = useState(null)
  const confirmar = useConfirm()

  const tempo = useMemo(() => (data ? linhaDoTempo({ parcelas: data.parcelas, hoje, meses: 12 }) : null), [data, hoje])
  if (error) return <div className="page"><ErrorBox error={error} onRetry={reload} /></div>
  if (loading || !data) return <div className="page"><Loading rows={6} /></div>

  const { config, contas, categorias, resumo, faturas, compro } = data
  const max = Number(config.comprometimento_max_pct) || 50
  const alertas = mesesEmAlerta(compro, max)
  const emAlerta = new Set(alertas.map((a) => a.mes.slice(0, 7)))
  const falta = resumo.reduce((s, p) => s + Number(p.falta_cent), 0)
  const nomeConta = (id) => contas.find((c) => c.id === id)?.nome

  const apagar = async (p) => {
    if (!(await confirmar(`Apagar "${p.descricao}"? As parcelas em aberto somem junto e a fatura é refeita.`, { ok: 'Apagar', danger: true }))) return
    await apagarParcelamento(p.id)
    notify('Parcelamento apagado.', 'ok')
  }

  return (
    <div className="page pf pf-parc">
      <PageHead title="Parcelamentos" sub={resumo.length ? `${resumo.length} em andamento · faltam ${brl(falta)}` : 'Compras no cartão, carnês e financiamentos'}>
        <button type="button" className="btn p" onClick={() => setNovo(true)}><Icon name="plus" size={14} />Parcelamento</button>
      </PageHead>

      {alertas.length ? (
        <div className="note r pf-alerta">
          <b>Atenção ao comprometimento.</b> Parcelas, contas fixas e dívidas passam de {max.toLocaleString('pt-BR')}% da sua renda em{' '}
          {alertas.slice(0, 4).map((a, i) => <span key={a.mes}>{i ? ', ' : ''}<b>{mesRot(a.mes)}</b> ({String(a.pct).replace('.', ',')}%)</span>)}{alertas.length > 4 ? ` e mais ${alertas.length - 4}` : ''}.
        </div>
      ) : null}

      {resumo.length ? <Seg value={modo} onChange={setModo} options={[['tempo', 'Linha do tempo'], ['lista', 'Lista']]} /> : null}

      {modo === 'tempo' && resumo.length ? (
        <section className="pf-bloco">
          <div className="pf-cabeca"><div className="stack-s"><h2>Próximos 12 meses</h2><span className="lbl">Cada faixa é um parcelamento. No topo, o que vence de parcelas em cada mês.</span></div></div>
          <div className="pf-tempo-rolagem">
            <div className="pf-tempo" style={{ gridTemplateColumns: '132px repeat(12, minmax(78px, 1fr))' }}>
              <span />
              {tempo.meses.map((m) => (
                <div key={m.ref} className={`pf-tempo-mes ${emAlerta.has(m.ref.slice(0, 7)) ? 'alerta' : ''}`}>
                  <span className="lbl">{mesRot(m.ref)}</span>
                  <b className="num">{m.total_cent ? brl0(m.total_cent) : '–'}</b>
                </div>
              ))}
              {tempo.faixas.map((f, k) => {
                const corridas = []
                for (const c of f.celulas) {
                  const ult = corridas[corridas.length - 1]
                  if (ult && ult.fim === c.i - 1) { ult.itens.push(c); ult.fim = c.i } else corridas.push({ ini: c.i, fim: c.i, itens: [c] })
                }
                return (
                  <React.Fragment key={f.id}>
                    <span className="pf-tempo-nome" style={{ gridRow: k + 2 }} title={f.descricao}>{f.descricao}</span>
                    {corridas.map((r) => (
                      <div key={r.ini} className={`pf-tempo-faixa ${f.forma}`} style={{ gridRow: k + 2, gridColumn: `${r.ini + 2} / span ${r.fim - r.ini + 1}`, animationDelay: `${k * 0.06}s` }}>
                        {r.itens.map((c) => <span key={c.i}><b className="num">{c.numero}/{f.n}</b><small className="num">{brl0(c.valor_cent)}</small></span>)}
                      </div>
                    ))}
                  </React.Fragment>
                )
              })}
            </div>
          </div>
        </section>
      ) : null}

      {(modo === 'lista' || !resumo.length) ? (
        resumo.length ? (
          <section className="pf-bloco">
            {resumo.map((p, i) => {
              const pct = Math.round((p.pagas / p.n_parcelas) * 100)
              return (
                <div className="pf-linha tall pf-parc-linha" key={p.id} style={{ animationDelay: `${i * 0.04}s` }}>
                  <div className="pf-meio">
                    <span className="pf-nome">{p.descricao}</span>
                    <span className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                      <Badge dot={false}>{p.forma === 'cartao' ? nomeConta(p.conta_id) || 'Cartão' : 'Carnê ou boleto'}</Badge>
                      {p.abertas ? <span className="lbl">termina em {mesRot(p.ultima)} · próxima {dm(p.proxima)}</span> : <Badge kind="g" dot={false}>Quitado</Badge>}
                    </span>
                    <div className="pf-prog" role="img" aria-label={`${p.pagas} de ${p.n_parcelas} parcelas pagas`}><i style={{ width: `${pct}%` }} /></div>
                    <span className="lbl num">{p.pagas} de {p.n_parcelas} pagas · {p.abertas} {p.abertas === 1 ? 'restante' : 'restantes'} de {brl(p.valor_parcela_cent)}{p.juros_total_cent ? ` · juros no total ${brl(p.juros_total_cent)}` : ''}</span>
                  </div>
                  <div className="pf-dir">
                    <span className="lbl">falta pagar</span>
                    <span className="pf-valor num pf-falta">{brl(p.falta_cent)}</span>
                  </div>
                  <span className="pf-acoes">
                    {p.abertas ? <button type="button" className="btn s" onClick={() => setAntecipando(p)}>Antecipar</button> : null}
                    <button type="button" className="btn ic s g" aria-label={`Apagar ${p.descricao}`} onClick={() => apagar(p)}><Icon name="trash" size={14} /></button>
                  </span>
                </div>
              )
            })}
          </section>
        ) : <Empty icon="folder" action={<button type="button" className="btn p" onClick={() => setNovo(true)}>Cadastrar parcelamento</button>}>Nenhum parcelamento em andamento.</Empty>
      ) : null}

      {faturas.length ? (
        <section className="pf-bloco">
          <div className="pf-cabeca"><div className="stack-s"><h2>Faturas do cartão</h2><span className="lbl">Cada fatura vira uma conta a pagar no vencimento. <Link to="/erp/pessoal/contas">Ir para Contas a pagar</Link></span></div></div>
          {faturas.map((f) => {
            const fechada = hoje > f.fechamento
            return (
              <div className="pf-linha slim" key={f.id}>
                <div className="pf-dia" aria-hidden="true"><b className="num">{f.vencimento.slice(8, 10)}</b><span>{f.vencimento.slice(5, 7)}/{f.vencimento.slice(2, 4)}</span></div>
                <div className="pf-meio"><span className="pf-nome">{f.cartao} · {mesRot(f.ref_mes)}</span><span className="lbl">{fechada ? 'Fechada' : `Aberta, fecha dia ${dm(f.fechamento)}`} · vence {dm(f.vencimento)}</span></div>
                <span className="pf-valor num"><CountUp value={brl(f.total_cent)} /></span>
              </div>
            )
          })}
        </section>
      ) : null}

      {novo ? <ModalParcelamento contas={contas} categorias={categorias} onClose={() => setNovo(false)} /> : null}
      {antecipando ? <ModalAntecipar parcelamento={antecipando} contas={contas} onClose={() => setAntecipando(null)} /> : null}
    </div>
  )
}
