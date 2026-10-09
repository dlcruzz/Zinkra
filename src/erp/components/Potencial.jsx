import React, { useMemo, useState } from 'react'
import { HBars } from './charts'
import { CountUp } from './ui'
import { potential, short } from '../lib/potencial'

// Painel positivo: quanto mercado ainda tem pela frente, para não desanimar com os "nãos" do dia.
export default function Potencial({ terms, leads, acts, compact = false }) {
  const [all, setAll] = useState(false)
  const p = useMemo(() => potential({ terms, leads, acts }), [terms, leads, acts])
  const total = p.toCapture + p.newEst + p.notContacted
  const rows = (all ? p.states : p.states.slice(0, compact ? 4 : 8)).map((s) => ({
    label: `${s.name} (${s.cities} cidade${s.cities === 1 ? '' : 's'})`,
    value: s.est,
    display: `~${short(s.est)}`,
    sub: `${Math.round(s.pct * 100)}% feito`,
  }))
  return (
    <div className="card pot">
      <div className="pot-head">
        <div className="stack-s" style={{ gap: 4 }}>
          <span className="lbl">Ainda pela frente (estimativa)</span>
          <span className="pot-big num">~<CountUp value={total.toLocaleString('pt-BR')} /></span>
          <span className="lbl">pessoas e empresas para você prospectar</span>
        </div>
        <div className="pot-split">
          <div><b className="num">{short(p.notContacted)}</b><span className="lbl">já na sua base, sem contato</span></div>
          <div><b className="num">~{short(p.toCapture)}</b><span className="lbl">nos bairros cadastrados que faltam buscar</span></div>
          <div><b className="num">~{short(p.newEst)}</b><span className="lbl">em {p.newCities.length} cidades sugeridas ainda não abertas</span></div>
        </div>
      </div>
      <p className="pot-msg">
        {p.perSale
          ? <>Pelo seu histórico, sai <b>1 venda a cada {p.perSale} contatos</b>. Com {short(p.notContacted)} leads esperando, dá umas <b>{Math.max(1, Math.floor(p.notContacted / p.perSale))} vendas</b> no seu ritmo, sem captar mais ninguém.</>
          : <>Você já falou com <b>{p.contacted.toLocaleString('pt-BR')}</b> pessoas. Na prospecção fria é normal precisar de muitas mensagens até a primeira venda: cada "não" deixa o sistema mais esperto sobre onde e para quem vender.</>}
      </p>
      {rows.length ? (
        <>
          <span className="lbl">Por estado: leads ainda a captar e quanto das buscas você já fez</span>
          <HBars rows={rows} />
          {!compact && p.states.length > 8 ? <button type="button" className="btn s g" style={{ alignSelf: 'flex-start' }} onClick={() => setAll((a) => !a)}>{all ? 'Mostrar menos' : `Ver os ${p.states.length} estados`}</button> : null}
        </>
      ) : null}
      <span className="lbl" style={{ fontSize: 11.5 }}>Conta feita com a sua média de {p.yieldPer.toFixed(1).replace('.', ',')} lead(s) por busca. Quanto mais você capta, mais exata fica.</span>
    </div>
  )
}
