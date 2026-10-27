import React, { useMemo, useState } from 'react'
import { useMeta } from '../components/Shell'
import { PageHead, Loading, ErrorBox, Empty, CountUp, Badge, Field, MoneyInput, useConfirm } from '../components/ui'
import { Icon } from '../lib/icons'
import { useData, fetchRows, remove, notify } from '../lib/data'
import { brl } from '../lib/format'
import { hojeSP } from '../lib/pf/datas'
import { lerCadastros, PRIORIDADES, PRIORIDADE_COR } from '../lib/pf/api'
import { ordemPorJuros, compararEstrategias } from '../lib/pf/dividas'
import { ModalDivida } from './modais'
import { ModalPagar } from './acoes'

const TABELAS = ['pf_dividas', 'pf_contas']
const pctTxt = (v) => `${String(v).replace('.', ',')}% ao mês`

export default function Dividas() {
  useMeta('Pessoal · Dívidas', 'Pessoal')
  const hoje = hojeSP()
  const { data, loading, error, reload } = useData(async () => {
    const [cad, dividas] = await Promise.all([lerCadastros(), fetchRows('pf_dividas', { where: (q) => q.eq('ativo', true), order: 'credor', ascending: true })])
    return { ...cad, dividas }
  }, TABELAS, [])
  const [modal, setModal] = useState(null) // true = nova, objeto = editar
  const [pagando, setPagando] = useState(null)
  const [extra, setExtra] = useState(0)
  const confirmar = useConfirm()
  const dividas = data?.dividas || []
  const comparacao = useMemo(() => (dividas.length ? compararEstrategias(dividas, extra) : []), [dividas, extra])
  if (error) return <div className="page"><ErrorBox error={error} onRetry={reload} /></div>
  if (loading || !data) return <div className="page"><Loading rows={5} /></div>

  const total = dividas.reduce((s, d) => s + d.saldo_devedor_cent, 0)
  const minimos = dividas.reduce((s, d) => s + d.parcela_minima_cent, 0)
  const ordem = ordemPorJuros(dividas)
  const semJuros = dividas.filter((d) => !Number(d.juros_mes_pct))
  const melhor = [...comparacao].filter((c) => c.quita).sort((a, b) => a.juros_cent - b.juros_cent)[0]

  const apagar = async (d) => {
    if (!(await confirmar(`Apagar a dívida com ${d.credor}?`, { ok: 'Apagar', danger: true }))) return
    await remove('pf_dividas', d.id)
    notify('Dívida apagada.', 'ok')
  }
  const meses = (n) => (n >= 600 ? 'mais de 50 anos' : n >= 12 ? `${Math.floor(n / 12)} ${Math.floor(n / 12) === 1 ? 'ano' : 'anos'}${n % 12 ? ` e ${n % 12} ${n % 12 === 1 ? 'mês' : 'meses'}` : ''}` : `${n} ${n === 1 ? 'mês' : 'meses'}`)

  return (
    <div className="page pf pf-div">
      <PageHead title="Dívidas" sub={dividas.length ? `${dividas.length} ${dividas.length === 1 ? 'dívida' : 'dívidas'} · mínimo de ${brl(minimos)} por mês` : 'Empréstimos, cheque especial, acordos'}>
        <button type="button" className="btn p" onClick={() => setModal(true)}><Icon name="plus" size={14} />Dívida</button>
      </PageHead>

      {dividas.length ? (
        <>
          <div className="pf-faixa pf-faixa-dois">
            <div><span className="lbl">Quanto você deve</span><b className="num neg"><CountUp value={brl(total)} /></b></div>
            <div><span className="lbl">Parcelas mínimas por mês</span><b className="num"><CountUp value={brl(minimos)} /></b></div>
          </div>

          <section className="pf-bloco">
            {dividas.map((d, i) => (
              <div className="pf-linha tall" key={d.id} style={{ animationDelay: `${i * 0.04}s` }}>
                <div className="pf-meio">
                  <span className="pf-nome">{d.credor}</span>
                  <span className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                    <Badge kind={PRIORIDADE_COR[d.prioridade]} dot={false}>{PRIORIDADES[d.prioridade]}</Badge>
                    <span className="lbl">{d.juros_mes_pct ? pctTxt(d.juros_mes_pct) : 'juros não informado'} · mínimo {brl(d.parcela_minima_cent)}{d.dia_venc ? ` · vence dia ${d.dia_venc}` : ''}</span>
                  </span>
                </div>
                <span className="pf-valor num">{brl(d.saldo_devedor_cent)}</span>
                <span className="pf-acoes">
                  <button type="button" className="btn s" onClick={() => setPagando({ id: `d:${d.id}`, ref: d.id, tipo: 'divida', descricao: `Dívida: ${d.credor}`, valor_cent: d.parcela_minima_cent, vencimento: hoje, multa_pct: 0, juros_dia_pct: 0 })}>Pagar</button>
                  <button type="button" className="btn ic s g" aria-label={`Editar ${d.credor}`} onClick={() => setModal(d)}><Icon name="edit" size={14} /></button>
                  <button type="button" className="btn ic s g" aria-label={`Apagar ${d.credor}`} onClick={() => apagar(d)}><Icon name="trash" size={14} /></button>
                </span>
              </div>
            ))}
          </section>

          <section className="pf-bloco">
            <div className="pf-cabeca"><div className="stack-s"><h2>Em que ordem atacar</h2><span className="lbl">Pague o mínimo de todas. O dinheiro que sobrar vai primeiro para a que cobra mais juros.</span></div></div>
            <ol className="pf-ordem">
              {ordem.map((d, i) => (
                <li key={d.id} style={{ animationDelay: `${i * 0.06}s` }}>
                  <span className="pf-n num">{i + 1}</span>
                  <span className="pf-meio"><span className="pf-nome">{d.credor}</span><span className="lbl">{d.juros_mes_pct ? pctTxt(d.juros_mes_pct) : 'juros não informado'} · deve {brl(d.saldo_devedor_cent)}</span></span>
                </li>
              ))}
            </ol>
            {semJuros.length ? <span className="note y">Falta informar o juros de {semJuros.map((d) => d.credor).join(', ')}. Sem isso a ordem e a comparação abaixo ficam imprecisas.</span> : null}
          </section>

          <section className="pf-bloco">
            <div className="pf-cabeca"><div className="stack-s"><h2>Quanto custa cada jeito de pagar</h2><span className="lbl">Simulação mês a mês, com os juros informados.</span></div></div>
            <Field label="Quanto dá para pagar a mais por mês (R$)" hint="Além das parcelas mínimas. Pode deixar em zero."><MoneyInput value={extra} onChange={setExtra} /></Field>
            <div className="pf-comp">
              {comparacao.map((c, i) => (
                <div key={c.id} className={`pf-comp-linha ${melhor && melhor.id === c.id && extra > 0 ? 'melhor' : ''}`} style={{ animationDelay: `${i * 0.07}s` }}>
                  <span className="pf-nome">{c.titulo}</span>
                  <div className="pf-comp-dados">
                    <span><small className="lbl">quita em</small><b className="num">{c.quita ? meses(c.meses) : 'nunca'}</b></span>
                    <span><small className="lbl">juros no total</small><b className="num">{c.quita ? brl(c.juros_cent) : '—'}</b></span>
                    <span><small className="lbl">economia</small><b className={`num ${c.economia_cent > 0 ? 'pos' : ''}`}>{c.economia_cent === null ? 'quita só assim' : c.economia_cent > 0 ? brl(c.economia_cent) : '—'}</b></span>
                  </div>
                  {!c.quita ? <span className="lbl neg">O mínimo não cobre os juros: a dívida só cresce.</span> : null}
                </div>
              ))}
            </div>
            {extra === 0 ? <span className="lbl">Coloque um valor acima para ver quanto cada ordem economiza.</span> : null}
          </section>
        </>
      ) : <Empty icon="shield" action={<button type="button" className="btn p" onClick={() => setModal(true)}>Cadastrar dívida</button>}>Nenhuma dívida cadastrada. Quando houver, as parcelas mínimas entram no cálculo do dia.</Empty>}

      {modal ? <ModalDivida divida={modal === true ? null : modal} onClose={() => setModal(null)} /> : null}
      {pagando ? <ModalPagar item={pagando} contas={data.contas} onClose={() => setPagando(null)} /> : null}
    </div>
  )
}
