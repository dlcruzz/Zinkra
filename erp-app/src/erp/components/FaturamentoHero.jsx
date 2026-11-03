import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { brl0, today } from '../lib/format'
import { faturado, faturamento } from '../lib/financeiro'
import { Icon } from '../lib/icons'

// Número que sobe até o valor final (some a animação para quem pede menos movimento).
function useContagem(alvo, ms = 1100) {
  const [n, setN] = useState(alvo)
  useEffect(() => {
    const reduz = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduz || !alvo) { setN(alvo); return undefined }
    let raf
    const ini = performance.now()
    const passo = (t) => {
      const k = Math.min(1, (t - ini) / ms)
      setN(Math.round(alvo * (1 - (1 - k) ** 3)))
      if (k < 1) raf = requestAnimationFrame(passo)
    }
    raf = requestAnimationFrame(passo)
    return () => cancelAnimationFrame(raf)
  }, [alvo, ms])
  return n
}

const variacao = (valor, anterior) => (anterior > 0 ? Math.round(((valor - anterior) / anterior) * 100) : null)

// Primeira coisa da Visão geral: quanto a Zinkra já faturou (valor fechado, inclui o SaaS).
// Embaixo, quanto disso já entrou no caixa e quanto falta, e de onde vem cada parte do número.
export default function FaturamentoHero({ w }) {
  const hoje = today()
  const f = useMemo(() => faturado(w, hoje), [w, hoje])
  const periodos = useMemo(() => faturamento(f.lancamentos, hoje), [f, hoje])
  const total = useContagem(f.total)
  // do maior período para o menor: os valores vão diminuindo até a semana
  const janelas = [...periodos.janelas].reverse()

  return (
    <section className="fat-hero" aria-label="Faturamento da Zinkra">
      <div className="fat-top">
        <span className="fat-eyebrow"><Icon name="spark" size={14} />Faturamento total da Zinkra</span>
        <div className="fat-total num" aria-live="polite">{brl0(total)}</div>
        <span className="fat-sub">
          {f.total
            ? <>Já entrou no caixa <b className="ok">{brl0(f.recebido)}</b>{f.falta ? <> · falta receber <b>{brl0(f.falta)}</b></> : null}. Bora fazer esse número crescer.</>
            : 'O primeiro valor fechado ou recebido começa a contar aqui.'}
        </span>
      </div>
      <ul className="fat-grid">
        {janelas.map((j, i) => {
          const v = variacao(j.valor, j.anterior)
          return (
            <li key={j.id} className="fat-tile" style={{ '--i': i }}>
              <span className="fat-rot">{j.rotulo}</span>
              <span className="fat-val num">{brl0(j.valor)}</span>
              <span className="fat-leg">{j.legenda}</span>
              {v !== null ? <span className={`fat-var ${v >= 0 ? 'up' : 'dn'}`}>{v >= 0 ? '▲' : '▼'} {Math.abs(v)}% vs período anterior</span> : null}
            </li>
          )
        })}
      </ul>
      {f.porOrigem.length ? (
        <details className="fat-origem">
          <summary>De onde vem esse número</summary>
          <div className="tbl-wrap"><table className="tbl">
            <thead><tr><th>Cliente · projeto</th><th className="r">Faturado</th><th className="r">Recebido</th><th className="r">Falta</th></tr></thead>
            <tbody>
              {f.porOrigem.map((o) => (
                <tr key={o.origem}>
                  <td data-l="Origem">{o.origem}</td>
                  <td data-l="Faturado" className="num r">{brl0(o.faturado)}</td>
                  <td data-l="Recebido" className="num r">{brl0(o.recebido)}</td>
                  <td data-l="Falta" className="num r">{o.faturado > o.recebido ? brl0(o.faturado - o.recebido) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
          <span className="lbl">Faltando algum valor? Cadastre no projeto (aba Financeiro) ou em <Link to="/erp/financeiro/saas">Financeiro SaaS</Link>.</span>
        </details>
      ) : null}
    </section>
  )
}
