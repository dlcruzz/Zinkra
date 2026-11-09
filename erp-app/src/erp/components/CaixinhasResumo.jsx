import React from 'react'
import { Link } from 'react-router-dom'
import { brl } from '../lib/format'
import { ORDEM, NOMES } from '../lib/caixinhas'
import { Icon } from '../lib/icons'

// Visão geral: quanto há em cada caixinha (caixa da Zinkra e investimento em destaque) e o que falta mover no banco.
export default function CaixinhasResumo({ w }) {
  const cx = w.caixinhas
  if (!cx || !cx.configs.length) return null
  const parado = cx.entradas.filter((e) => !e.repassado)
  const paradoTotal = parado.reduce((a, e) => a + e.base, 0)
  const destaque = ['caixa', 'invest']
  return (
    <section className="card" aria-label="Caixinhas" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="row" style={{ justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <span className="lbl"><Icon name="money" size={13} /> CAIXINHAS · saldo de cada uma</span>
        <Link to="/erp/financeiro/caixinhas" className="lbl" style={{ color: 'var(--green-tx)' }}>Abrir caixinhas</Link>
      </div>
      <div className="grid-kpi">
        {[...destaque, ...ORDEM.filter((k) => !destaque.includes(k))].map((k) => {
          const s = cx.saldos[k]
          const forte = destaque.includes(k)
          return (
            <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span className="lbl">{NOMES[k]}</span>
              <span className="num" style={{ fontSize: forte ? 24 : 18, color: forte ? 'var(--green-tx)' : undefined }}>{brl(s.saldo)}</span>
              {s.comprometido ? <span className="lbl">{brl(s.comprometido)} comprometido com compras</span> : null}
            </div>
          )
        })}
      </div>
      {parado.length ? (
        <div className="note y">{parado.length} entrada(s) ainda para mover no banco ({brl(paradoTotal)} já dividido). <Link to="/erp/financeiro/caixinhas" style={{ color: 'inherit', textDecoration: 'underline' }}>Ver e marcar</Link></div>
      ) : null}
    </section>
  )
}
