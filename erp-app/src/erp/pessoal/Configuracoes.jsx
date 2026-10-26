import React, { useEffect, useMemo, useState } from 'react'
import { useMeta } from '../components/Shell'
import { PageHead, Tabs, Loading, ErrorBox, Field, MoneyInput, AsyncButton, Seg } from '../components/ui'
import { useData, update, notify } from '../lib/data'
import { dm } from '../lib/format'
import { hojeSP, proximasDatas } from '../lib/pf/datas'
import { lerCadastros, lerConfig, REGRAS_FIM_SEMANA, HORIZONTES, percentual } from '../lib/pf/api'
import { RecebimentosBloco, ContasBloco, CategoriasBloco, diaSemanaData } from './listas'

const TABELAS = ['pf_config', 'pf_contas', 'pf_categorias', 'pf_recebimentos_modelo']
const txt = (n) => String(n ?? '').replace('.', ',')

export default function Configuracoes() {
  useMeta('Pessoal', 'Configurações pessoais')
  const [aba, setAba] = useState('recebimentos')
  const { data, loading, error, reload } = useData(async () => ({ config: await lerConfig(), ...(await lerCadastros()) }), TABELAS, [])
  if (error) return <div className="page"><ErrorBox error={error} onRetry={reload} /></div>
  if (loading || !data) return <div className="page"><Loading rows={8} /></div>
  const { config, contas, categorias, modelos } = data
  return (
    <div className="page pf">
      <PageHead title="Configurações pessoais" sub="Só você vê esta área. Nada daqui aparece no financeiro da Zinkra." />
      <Tabs value={aba} onChange={setAba} options={[
        ['recebimentos', 'Recebimentos'], ['regras', 'Regras'],
        ['contas', 'Contas'], ['categorias', 'Categorias'],
      ]} />
      <div className="pf-aba" key={aba}>
        {aba === 'recebimentos' ? (
          <>
            <RecebimentosBloco modelos={modelos} contas={contas} regra={config.regra_fim_semana} />
            <RegraFimDeSemana config={config} modelos={modelos} />
          </>
        ) : null}
        {aba === 'regras' ? <Regras config={config} /> : null}
        {aba === 'contas' ? <ContasBloco contas={contas} /> : null}
        {aba === 'categorias' ? <CategoriasBloco categorias={categorias} /> : null}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- fim de semana (com exemplo ao vivo)
export function RegraFimDeSemana({ config, modelos }) {
  const [regra, setRegra] = useState(config.regra_fim_semana)
  useEffect(() => setRegra(config.regra_fim_semana), [config.regra_fim_semana])
  const hoje = hojeSP()
  const exemplos = useMemo(() => {
    const dias = modelos.length ? [...new Set(modelos.filter((m) => m.ativo).map((m) => m.dia_mes))] : [15, 30]
    return dias.flatMap((d) => proximasDatas(d, regra, hoje, 3).map((o) => ({ ...o, dia: d })))
      .filter((o) => o.ajustada).sort((a, b) => (a.nominal < b.nominal ? -1 : 1)).slice(0, 3)
  }, [modelos, regra, hoje])
  const trocar = async (v) => {
    setRegra(v)
    await update('pf_config', config.id, { regra_fim_semana: v })
  }
  return (
    <div className="pf-bloco">
      <div className="pf-cabeca">
        <div className="stack-s">
          <h2>Quando o dia cai no fim de semana ou feriado</h2>
          <span className="lbl">O banco não deposita nesses dias. Escolha como o sistema deve contar.</span>
        </div>
      </div>
      <div className="pf-seg-lista"><Seg value={regra} onChange={trocar} options={REGRAS_FIM_SEMANA} /></div>
      <div className="pf-exemplos" aria-live="polite">
        {exemplos.length ? exemplos.map((o) => (
          <span key={o.nominal}>Dia <b className="num">{dm(o.nominal)}</b> ({diaSemanaData(o.nominal).split(' ')[0]}) <Seta /> <b className="num">{diaSemanaData(o.data)}</b></span>
        )) : <span className="mut">Nenhuma das próximas datas cai em fim de semana ou feriado.</span>}
      </div>
    </div>
  )
}
const Seta = () => <span aria-label="vira" className="mut">→</span>

// ---------------------------------------------------------------- colchão, reserva, horizonte
function Regras({ config }) {
  const [f, setF] = useState(() => daConfig(config))
  useEffect(() => setF(daConfig(config)), [config.updated_at]) // eslint-disable-line react-hooks/exhaustive-deps
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }))
  const salvar = async () => {
    await update('pf_config', config.id, {
      colchao_cent: f.colchao, reserva_pct: percentual(f.reserva), meta_reserva_cent: f.meta,
      horizonte: f.horizonte, acumular_sobra_dia: f.acumular, comprometimento_max_pct: percentual(f.compro),
    })
    notify('Regras salvas.', 'ok')
  }
  return (
    <div className="pf-bloco">
      <div className="pf-cabeca"><div className="stack-s"><h2>Regras do dia a dia</h2><span className="lbl">É com elas que o sistema calcula quanto você pode gastar.</span></div></div>
      <div className="fields">
        <Field label="Colchão (R$)" hint="O mínimo que você nunca quer tocar. Ele sai do que sobra para gastar."><MoneyInput value={f.colchao} onChange={set('colchao')} /></Field>
        <Field label="Guardar da sobra (%)" hint="Parte do que sobrar de cada recebimento vai para a reserva."><input className="in num" inputMode="decimal" value={f.reserva} onChange={(e) => set('reserva')(e.target.value)} /></Field>
        <Field label="Meta da reserva (R$)" hint="Quando chegar nela, para de separar."><MoneyInput value={f.meta} onChange={set('meta')} /></Field>
        <Field label="Alerta de comprometimento (%)" hint="Avisa quando parcelas e contas fixas passam disso da sua renda."><input className="in num" inputMode="decimal" value={f.compro} onChange={(e) => set('compro')(e.target.value)} /></Field>
      </div>
      <Field label="Até quando o sistema olha para frente" hint="Mais curto é mais seguro no dia a dia; mais longo enxerga as contas do ciclo seguinte.">
        <div className="pf-seg-lista"><Seg value={f.horizonte} onChange={set('horizonte')} options={HORIZONTES} /></div>
      </Field>
      <label className="check"><input type="checkbox" checked={f.acumular} onChange={(e) => set('acumular')(e.target.checked)} />O que sobrar de um dia soma no limite do dia seguinte</label>
      <div className="row"><AsyncButton className="btn p" onClick={salvar}>Salvar regras</AsyncButton></div>
    </div>
  )
}
const daConfig = (c) => ({
  colchao: c.colchao_cent, reserva: txt(c.reserva_pct), meta: c.meta_reserva_cent, horizonte: c.horizonte,
  acumular: c.acumular_sobra_dia, compro: txt(c.comprometimento_max_pct),
})
