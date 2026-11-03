import React, { useEffect, useMemo, useState } from 'react'
import { brl0, today } from '../lib/format'
import { faturamento } from '../lib/financeiro'
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

// Primeira coisa da Visão geral: quanto a Zinkra já faturou (dinheiro que já entrou).
export default function FaturamentoHero({ recebidos }) {
  const fat = useMemo(() => faturamento(recebidos, today()), [recebidos])
  const total = useContagem(fat.total)
  // do maior período para o menor: os valores vão diminuindo até a semana
  const janelas = [...fat.janelas].reverse()

  return (
    <section className="fat-hero" aria-label="Faturamento da Zinkra">
      <div className="fat-top">
        <span className="fat-eyebrow"><Icon name="spark" size={14} />Faturamento total da Zinkra</span>
        <div className="fat-total num" aria-live="polite">{brl0(total)}</div>
        <span className="fat-sub">{fat.total ? 'tudo que já entrou no caixa. Bora fazer esse número crescer.' : 'o primeiro recebimento lançado começa a contar aqui.'}</span>
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
    </section>
  )
}
