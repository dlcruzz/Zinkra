import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMeta } from '../components/Shell'
import { PageHead, Loading, ErrorBox, CountUp, Empty } from '../components/ui'
import { useData } from '../lib/data'
import { brl, dm, MONTHS, addMonths } from '../lib/format'
import { hojeSP } from '../lib/pf/datas'
import { lerConfig } from '../lib/pf/api'
import { lerNucleo, lerResumoMes, lerFluxoMeses, lerComprometimento, TABELAS_NUCLEO } from '../lib/pf/nucleo'
import { mesesEmAlerta } from '../lib/pf/parcelas'
import { LinhaSaldo, EntradasSaidas, PorCategoria, DiaDaSemana, Comprometimento } from './graficos'
import { MesNav } from './Contas'

const TABELAS = [...TABELAS_NUCLEO, 'pf_dividas', 'pf_faturas']
const DIAS_EXTENSO = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']

export default function Geral() {
  useMeta('Pessoal · Visão geral', 'Pessoal')
  const hoje = hojeSP()
  const [mes, setMes] = useState(hoje.slice(0, 7))
  const geral = useData(async () => {
    const config = await lerConfig()
    const [fluxo, compro, nucleo] = await Promise.all([lerFluxoMeses(6), lerComprometimento(12), config.onboarding_ok_em ? lerNucleo(hoje, config, { serieDias: 60 }) : null])
    return { config, fluxo, compro, nucleo }
  }, TABELAS, [hoje])
  const doMes = useData(() => lerResumoMes(`${mes}-01`), ['pf_lancamentos', 'pf_categorias', 'pf_contas'], [mes])

  if (geral.error) return <div className="page"><ErrorBox error={geral.error} onRetry={geral.reload} /></div>
  if (geral.loading || !geral.data) return <div className="page"><Loading rows={6} /></div>
  const { config, fluxo, compro, nucleo } = geral.data
  if (!nucleo) return <div className="page pf"><PageHead title="Visão geral" /><span className="note y">Termine os <Link to="/erp/pessoal/primeiros-passos">primeiros passos</Link> para ver os gráficos.</span></div>

  const r = doMes.data
  const [ano, mm] = mes.split('-').map(Number)
  const max = Number(config.comprometimento_max_pct) || 50
  const alertas = mesesEmAlerta(compro, max)
  const painel = nucleo.painel
  const dow = r?.dia_semana || []
  const pico = dow.length ? dow.indexOf(Math.max(...dow)) : -1
  const semDados = fluxo.every((m) => !m.entradas_cent && !m.saidas_cent)

  return (
    <div className="page pf pf-geral">
      <PageHead title="Visão geral" sub="Os números do seu dinheiro em gráficos. Só você vê." />

      <MesNav ano={ano} mm={mm} irMes={(n) => setMes(addMonths(`${mes}-01`, n).slice(0, 7))} />
      {doMes.error ? <ErrorBox error={doMes.error} onRetry={doMes.reload} /> : !r ? <Loading rows={2} /> : (
        <div className="pf-faixa pf-faixa-4">
          <div><span className="lbl">Entrou em {MONTHS[mm - 1]}</span><b className="num pos"><CountUp value={brl(r.entradas_cent)} /></b></div>
          <div><span className="lbl">Saiu</span><b className="num"><CountUp value={brl(r.saidas_cent)} /></b></div>
          <div><span className="lbl">Sobrou</span><b className={`num ${r.entradas_cent - r.saidas_cent - r.reservado_cent < 0 ? 'neg' : ''}`}><CountUp value={brl(r.entradas_cent - r.saidas_cent - r.reservado_cent)} /></b></div>
          <div><span className="lbl">Guardado na reserva</span><b className="num"><CountUp value={brl(r.reservado_cent)} /></b></div>
        </div>
      )}
      {r?.maior_gasto ? <span className="lbl">Maior saída do mês: <b className="num">{brl(r.maior_gasto.valor_cent)}</b>{r.maior_gasto.descricao ? ` · ${r.maior_gasto.descricao}` : ''} ({dm(r.maior_gasto.data)}).</span> : null}

      <section className="pf-bloco">
        <div className="pf-cabeca"><div className="stack-s"><h2>Entrou e saiu, mês a mês</h2><span className="lbl">Últimos 6 meses. Compras no cartão contam quando a fatura é paga.</span></div></div>
        {semDados ? <Empty icon="chart">Ainda não há lançamentos. Os gráficos se enchem conforme você registra gastos e recebimentos.</Empty> : <EntradasSaidas meses={fluxo} />}
      </section>

      <div className="pf-duas-col">
        <section className="pf-bloco">
          <div className="pf-cabeca"><div className="stack-s"><h2>Para onde foi o dinheiro</h2><span className="lbl">Saídas de {MONTHS[mm - 1]} por categoria.</span></div></div>
          {r?.categorias?.length ? <PorCategoria itens={r.categorias} /> : <Empty icon="chart">Nenhuma saída neste mês.</Empty>}
        </section>
        <section className="pf-bloco">
          <div className="pf-cabeca"><div className="stack-s"><h2>Em que dia você mais gasta</h2><span className="lbl">Gastos do dia a dia, sem contas fixas, parcelas e dívidas.</span></div></div>
          {dow.some(Boolean) ? (
            <>
              <DiaDaSemana valores={dow} />
              <span className="lbl">Seu dia mais pesado em {MONTHS[mm - 1]} é <b>{DIAS_EXTENSO[pico]}</b>, com {brl(dow[pico])}.</span>
            </>
          ) : <Empty icon="chart">Sem gastos do dia a dia neste mês.</Empty>}
        </section>
      </div>

      <section className="pf-bloco">
        <div className="pf-cabeca"><div className="stack-s"><h2>Saldo dos próximos 60 dias</h2><span className="lbl">Com os recebimentos previstos e as contas que vencem. A linha tracejada é o seu colchão.</span></div></div>
        <LinhaSaldo serie={painel.serie} colchao={painel.colchao} fimCiclo={painel.fimCiclo} entradas={painel.entradasFuturas} altura={170} />
      </section>

      <section className="pf-bloco">
        <div className="pf-cabeca"><div className="stack-s"><h2>Quanto já está comprometido</h2><span className="lbl">Parcelas, contas fixas e dívidas dos próximos 12 meses, contra a sua renda esperada.</span></div></div>
        {compro[0]?.renda_cent ? null : <span className="note y">Cadastre seus recebimentos fixos em Configurações para ver a porcentagem da renda.</span>}
        <Comprometimento linhas={compro} maxPct={max} />
        {alertas.length ? <span className="note r">Passa de {max.toLocaleString('pt-BR')}% da renda em {alertas.slice(0, 4).map((a) => `${MONTHS[Number(a.mes.slice(5, 7)) - 1]} (${String(a.pct).replace('.', ',')}%)`).join(', ')}{alertas.length > 4 ? ` e mais ${alertas.length - 4}` : ''}. <Link to="/erp/pessoal/parcelamentos">Ver parcelamentos</Link></span> : null}
      </section>
    </div>
  )
}
