import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMeta } from '../components/Shell'
import { PageHead, Loading, ErrorBox, CountUp, Modal, Empty } from '../components/ui'
import { Icon } from '../lib/icons'
import { useData } from '../lib/data'
import { brl, dm, dmy } from '../lib/format'
import { hojeSP } from '../lib/pf/datas'
import { lerConfig } from '../lib/pf/api'
import { lerNucleo, TABELAS_NUCLEO } from '../lib/pf/nucleo'
import { diaSemanaData } from './listas'
import { ModalGasto, ModalPagar } from './acoes'
import { LinhaSaldo } from './graficos'

const TABELAS = [...TABELAS_NUCLEO, 'pf_dividas', 'pf_faturas']

const ESTADOS = {
  verde: { rotulo: 'Dentro do limite', icone: 'check' },
  amarelo: { rotulo: 'Quase no limite', icone: 'bell' },
  vermelho: { rotulo: 'Sem folga hoje', icone: 'stop' },
}

function titulo(p) {
  if (p.estado !== 'vermelho') return 'Você pode gastar hoje'
  if (p.faltam) return 'Faltam para fechar o ciclo'
  if (p.livre > 0) return 'Você já usou o limite de hoje'
  return 'Hoje não gaste nada'
}

export default function Inicio() {
  useMeta('Pessoal', 'Pessoal')
  const hoje = hojeSP()
  const { data, loading, error, reload } = useData(async () => {
    const config = await lerConfig()
    if (!config.onboarding_ok_em) return { config, pendente: true }
    return lerNucleo(hoje, config)
  }, TABELAS, [hoje])
  const [gasto, setGasto] = useState(false)
  const [porque, setPorque] = useState(false)
  const [pagando, setPagando] = useState(null)
  if (error) return <div className="page"><ErrorBox error={error} onRetry={reload} /></div>
  if (loading || !data) return <div className="page"><Loading rows={6} /></div>

  if (data.pendente) {
    const { config } = data
    return (
      <div className="page pf">
        <PageHead title="Suas finanças pessoais" sub="Separadas da Zinkra. Só você vê." />
        <section className="pf-convite">
          <span className="pf-selo num">PASSO {Math.min(4, config.onboarding_passo)} DE 4</span>
          <h2>Vamos montar o seu mês</h2>
          <p>Quatro perguntas rápidas: quanto você tem hoje, quando o dinheiro entra, o que está para vencer e o que ainda está parcelado. Leva uns cinco minutos e cada passo já fica salvo.</p>
          <Link to="/erp/pessoal/primeiros-passos" className="btn p">{config.onboarding_passo > 1 ? 'Continuar de onde parei' : 'Começar'}<Icon name="arrow" size={14} /></Link>
        </section>
      </div>
    )
  }

  const { painel: p, contas, categorias, saldos, dividas } = data
  const est = ESTADOS[p.estado]
  const usado = p.limite ? Math.min(100, Math.round((p.gastoHoje / p.limite) * 100)) : p.gastoHoje ? 100 : 0
  const valorGrande = p.faltam ? p.faltam : Math.max(0, p.disponivel)
  const contasHoje = [...p.atrasadas, ...p.proximasContas]
  const prox = p.proximaEntrada
  const nomeEntrada = prox ? prox.entradas.map((e) => e.descricao).join(' + ') : null

  return (
    <div className="pf-hoje page pf">
      <PageHead title="Hoje" sub={`${diaSemanaData(hoje)} · só você vê esta página`}>
        <Link to="/erp/pessoal/receber" className="btn">Receber</Link>
      </PageHead>

      {p.conviteRegistrar ? (
        <Link to="/erp/pessoal/receber" className="pf-aviso-rec">
          <span className="pf-ponto-vivo" aria-hidden="true" />
          <span><b>{p.pendentes[0].data === hoje ? 'Hoje é dia de receber' : `Era para entrar em ${dm(p.pendentes[0].data)}`}:</b> {p.pendentes[0].descricao}. Toque para registrar e ver o plano.</span>
          <Icon name="arrow" size={14} />
        </Link>
      ) : null}

      <section className={`pf-agora ${p.estado}`} aria-live="polite">
        <div className="pf-agora-topo">
          <span className={`pf-estado ${p.estado}`}><Icon name={est.icone} size={13} />{est.rotulo}</span>
          {p.semEntrada ? <span className="lbl">Sem recebimento cadastrado</span> : <span className="lbl">até {dm(p.fimCiclo)} · {p.dias} {p.dias === 1 ? 'dia' : 'dias'}</span>}
        </div>
        <h2 className="pf-agora-t">{titulo(p)}</h2>
        <div className="pf-numerao num"><CountUp value={brl(valorGrande)} /></div>
        <div className="pf-limite" role="img" aria-label={`Já usou ${usado}% do limite de hoje`}>
          <div className="pf-limite-trilho"><i style={{ width: `${usado}%` }} /><b style={{ left: '70%' }} aria-hidden="true" /></div>
          <div className="pf-limite-leg">
            <span>Gastou <b className="num">{brl(p.gastoHoje)}</b></span>
            <span>Limite do dia <b className="num">{brl(p.limite)}</b></span>
          </div>
        </div>
        <div className="pf-agora-acoes">
          <button type="button" className="btn p pf-btn-gasto" onClick={() => setGasto(true)}><Icon name="plus" size={16} />Gasto</button>
          <button type="button" className="btn pf-btn-porque" onClick={() => setPorque(true)}>Por quê?</button>
        </div>
      </section>

      {p.faltam ? (
        <section className="pf-aperto">
          <div className="stack-s">
            <h2>O dinheiro não fecha até {dm(p.fimHorizonte)}</h2>
            <span className="lbl">Faltam {brl(p.faltam)}. Veja o que dá para fazer, do mais barato para o mais caro.</span>
          </div>
          {p.adiar?.itens.length ? (
            <div className="stack-s">
              <span className="pf-grupo-t"><span>Dá para adiar</span><span className="num">custo estimado {brl(p.adiar.custo_cent)}</span></span>
              {p.adiar.itens.map((i) => (
                <div className="pf-linha slim" key={i.id}>
                  <div className="pf-meio"><span className="pf-nome">{i.descricao}</span><span className="lbl">vence {dm(i.vencimento)}{i.custo_cent ? ` · adiar até ${dm(p.proximaEntrada?.data || p.fimHorizonte)} custa ${brl(i.custo_cent)}` : ' · sem multa nem juros cadastrados'}</span></div>
                  <span className="pf-valor num">{brl(i.valor_cent)}</span>
                </div>
              ))}
              <span className="lbl">{p.adiar.cobreTudo ? 'Adiando essas, o ciclo fecha.' : `Adiando essas ainda faltam ${brl(p.faltam - p.adiar.cobre_cent)}. O restante precisa de dinheiro novo ou de corte.`}</span>
            </div>
          ) : <span className="lbl">Nenhuma conta marcada como "pode adiar" cai nesse período. Marque quais podem esperar em Contas a pagar.</span>}
          {dividas.length ? <span className="lbl">Nas dívidas, pague só o mínimo: {dividas.map((d) => `${d.credor} (${brl(d.parcela_minima_cent)})`).join(', ')}.</span> : null}
        </section>
      ) : null}

      <div className="pf-faixa">
        <div><span className="lbl">Saldo nas contas</span><b className="num">{brl(p.saldoCent)}</b></div>
        <div><span className="lbl">Livre até {dm(p.fimHorizonte)}</span><b className={`num ${p.livre < 0 ? 'neg' : ''}`}>{brl(p.livre)}</b></div>
        <div><span className="lbl">Colchão guardado</span><b className="num">{brl(p.colchao)}</b></div>
      </div>

      <div className="pf-duas-col">
        <section className="pf-bloco">
          <div className="pf-cabeca"><div className="stack-s"><h2>Contas próximas</h2><span className="lbl">Atrasadas e as dos próximos 7 dias.</span></div><Link to="/erp/pessoal/contas" className="btn s g">Ver todas</Link></div>
          {contasHoje.length ? contasHoje.map((o, i) => {
            const atrasada = o.vencimento < hoje
            return (
              <div className={`pf-linha ${atrasada ? 'atrasada' : ''}`} key={o.id} style={{ animationDelay: `${i * 0.04}s` }}>
                <div className="pf-dia" aria-hidden="true"><b className="num">{o.vencimento.slice(8)}</b><span>{o.vencimento.slice(5, 7)}/{o.vencimento.slice(2, 4)}</span></div>
                <div className="pf-meio">
                  <span className="pf-nome">{o.descricao}</span>
                  <span className="lbl">{atrasada ? `${o.dias_atraso} ${o.dias_atraso === 1 ? 'dia' : 'dias'} de atraso${o.encargos_cent ? ` · +${brl(o.encargos_cent)} de multa e juros` : ''}` : o.vencimento === hoje ? 'vence hoje' : `vence ${diaSemanaData(o.vencimento)}`}</span>
                </div>
                <span className="pf-valor num">{brl(o.valor_cent + (o.encargos_cent || 0))}</span>
                <button type="button" className="btn s" onClick={() => setPagando(o)}>Pagar</button>
              </div>
            )
          }) : <Empty icon="check">Nenhuma conta atrasada nem para os próximos 7 dias.</Empty>}
        </section>

        <section className="pf-bloco">
          <div className="pf-cabeca"><div className="stack-s"><h2>Próximo recebimento</h2><span className="lbl">{nomeEntrada || 'Cadastre um recebimento em Configurações.'}</span></div></div>
          {prox ? (
            <div className="pf-contagem">
              <span className="pf-dias num"><CountUp value={String(prox.dias_ate)} /></span>
              <span className="pf-dias-t">{prox.dias_ate === 1 ? 'dia' : 'dias'}<br /><span className="lbl">{diaSemanaData(prox.data)}</span></span>
              <span className="pf-quanto num">{prox.entradas.reduce((s, e) => s + e.valor_cent, 0) ? brl(prox.entradas.reduce((s, e) => s + e.valor_cent, 0)) : <span className="mut">sem valor</span>}</span>
            </div>
          ) : null}
          <LinhaSaldo serie={p.serie} colchao={p.colchao} fimCiclo={p.fimCiclo} entradas={p.entradasFuturas} />
        </section>
      </div>

      {p.avisos.length ? (
        <div className="stack-s">
          {p.avisos.map((a) => <span className="note y" key={a}>{a}</span>)}
        </div>
      ) : null}
      <span className="lbl">Saldo informado e lançamentos de {saldos.contas.length} {saldos.contas.length === 1 ? 'conta' : 'contas'}. <Link to="/erp/pessoal/lancamentos">Ver lançamentos</Link></span>

      {gasto ? <ModalGasto categorias={categorias} contas={contas} onClose={() => setGasto(false)} /> : null}
      {pagando ? <ModalPagar item={pagando} contas={contas} onClose={() => setPagando(null)} /> : null}
      {porque ? <ModalPorque painel={p} onClose={() => setPorque(false)} /> : null}
    </div>
  )
}

// "Por quê?": a conta inteira, sem caixa-preta
function ModalPorque({ painel: p, onClose }) {
  return (
    <Modal title="Como cheguei nesse número" onClose={onClose} footer={<button type="button" className="btn p" onClick={onClose}>Entendi</button>}>
      <ol className="pf-porque">
        {p.explicacao.map((l, i) => (
          <li key={l.chave} style={{ animationDelay: `${i * 0.05}s` }} className={l.sinal === '=' ? 'res' : ''}>
            <span className="pf-sinal num" aria-hidden="true">{l.sinal || '•'}</span>
            <div className="pf-porque-t">
              <span className="pf-nome">{l.texto}</span>
              {l.nota ? <span className="lbl">{l.nota}</span> : null}
              {l.itens?.length ? (
                <details>
                  <summary className="lbl">ver {l.itens.length} {l.itens.length === 1 ? 'item' : 'itens'}</summary>
                  {l.itens.map((it, k) => <div key={k} className="pf-porque-item"><span>{it.texto}</span><span className="num">{brl(it.valor_cent)}</span></div>)}
                </details>
              ) : null}
            </div>
            <span className="pf-valor num">{l.valor !== undefined ? l.valor : brl(l.valor_cent)}</span>
          </li>
        ))}
      </ol>
      <span className="lbl">Atualizado com os dados de {dmy(p.hoje)}. O limite do dia não muda a cada gasto: ele sempre parte do saldo do começo do dia.</span>
    </Modal>
  )
}
