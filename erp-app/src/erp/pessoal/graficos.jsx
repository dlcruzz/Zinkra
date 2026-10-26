import React from 'react'
import { brl, dm } from '../lib/format'

// Saldo projetado dia a dia: linha que se desenha sozinha, com os dias de recebimento marcados.
// Sem texto dentro do SVG (ele encolhe no celular); os rótulos ficam em HTML.
export function LinhaSaldo({ serie, colchao = 0, fimCiclo, entradas = [], altura = 150 }) {
  if (!serie?.length) return null
  const W = 600, H = altura, PAD = 10
  const valores = serie.map((d) => d.saldo_cent)
  const min = Math.min(0, colchao, ...valores), max = Math.max(colchao, ...valores, 1)
  const folga = (max - min) * 0.08 || 1
  const y = (v) => PAD + (H - 2 * PAD) * (1 - (v - (min - folga)) / (max + folga - (min - folga)))
  const x = (i) => (serie.length === 1 ? W / 2 : PAD + ((W - 2 * PAD) * i) / (serie.length - 1))
  // saldo é "degrau": só muda no dia em que entra ou sai dinheiro
  const pontos = serie.map((d, i) => [x(i), y(d.saldo_cent)])
  let linha = `M${pontos[0][0].toFixed(1)} ${pontos[0][1].toFixed(1)}`
  for (let i = 1; i < pontos.length; i++) linha += ` H${pontos[i][0].toFixed(1)} V${pontos[i][1].toFixed(1)}`
  const area = `${linha} V${y(min - folga).toFixed(1)} H${pontos[0][0].toFixed(1)} Z`
  const datasEntrada = new Set(entradas.map((e) => e.data))
  const marcas = serie.map((d, i) => (datasEntrada.has(d.data) ? i : -1)).filter((i) => i >= 0)
  const iFim = fimCiclo ? serie.findIndex((d) => d.data === fimCiclo) : -1
  const iPior = valores.indexOf(Math.min(...valores))
  const negativo = Math.min(...valores) < 0
  return (
    <div className="pf-grafico">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Saldo projetado de ${dm(serie[0].data)} a ${dm(serie[serie.length - 1].data)}. Pior momento: ${brl(valores[iPior])} em ${dm(serie[iPior].data)}.`}>
        <defs>
          <linearGradient id="pf-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={negativo ? '#FF7A7D' : '#15C45A'} stopOpacity=".28" />
            <stop offset="1" stopColor={negativo ? '#FF7A7D' : '#15C45A'} stopOpacity="0" />
          </linearGradient>
        </defs>
        {min < 0 ? <line x1="0" x2={W} y1={y(0)} y2={y(0)} className="pf-g-zero" /> : null}
        {colchao > 0 ? <line x1="0" x2={W} y1={y(colchao)} y2={y(colchao)} className="pf-g-colchao" /> : null}
        {iFim >= 0 ? <line x1={x(iFim)} x2={x(iFim)} y1={PAD} y2={H - PAD} className="pf-g-fim" /> : null}
        <path d={area} fill="url(#pf-area)" className="pf-g-area" />
        <path d={linha} pathLength="1" className={`pf-g-linha ${negativo ? 'neg' : ''}`} />
        {marcas.map((i) => <circle key={i} cx={x(i)} cy={y(valores[i])} r="5" className="pf-g-entrada" />)}
        <circle cx={x(iPior)} cy={y(valores[iPior])} r="4.5" className={`pf-g-pior ${valores[iPior] < colchao ? 'neg' : ''}`} />
      </svg>
      <div className="pf-g-eixo">
        <span>{dm(serie[0].data)}</span>
        <span>{dm(serie[Math.floor((serie.length - 1) / 2)].data)}</span>
        <span>{dm(serie[serie.length - 1].data)}</span>
      </div>
      <div className="legend pf-g-leg">
        <span><i style={{ background: 'var(--green)' }} />recebimento</span>
        <span><i style={{ background: valores[iPior] < colchao ? 'var(--red)' : 'var(--tx)' }} />pior dia: {dm(serie[iPior].data)} ({brl(valores[iPior])})</span>
      </div>
    </div>
  )
}
