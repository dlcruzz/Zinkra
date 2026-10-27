import React from 'react'
import { brl, brlShort, dm, MONTHS_S } from '../lib/format'

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

// ---------------------------------------------------------------------------
// Gráficos da Visão geral. Barras em HTML (rótulos direto nas barras, sem legenda para decifrar),
// animadas ao entrar. Cores: verde = entrou, vermelho = saiu, azul/laranja/vermelho = parcelas/fixas/dívidas.
// ---------------------------------------------------------------------------
const mesRot = (ref) => MONTHS_S[Number(ref.slice(5, 7)) - 1]

// entradas × saídas por mês
export function EntradasSaidas({ meses }) {
  const max = Math.max(1, ...meses.flatMap((m) => [m.entradas_cent, m.saidas_cent]))
  return (
    <div className="pf-gr">
      <div className="pf-gr-leg"><span><i style={{ background: 'var(--green)' }} />Entrou</span><span><i style={{ background: 'var(--red)' }} />Saiu</span></div>
      <div className="pf-gr-cols" style={{ gridTemplateColumns: `repeat(${meses.length}, minmax(0, 1fr))` }}>
        {meses.map((m, i) => (
          <div key={m.mes} className="pf-gr-col" role="img" aria-label={`${mesRot(m.mes)}: entrou ${brl(m.entradas_cent)}, saiu ${brl(m.saidas_cent)}`}>
            <div className="pf-gr-par">
              {[['entradas_cent', 'var(--green)'], ['saidas_cent', 'var(--red)']].map(([k, cor]) => (
                <div key={k} className="pf-gr-barra">
                  <span className="pf-gr-rot num">{m[k] ? brlShort(m[k]).replace('R$ ', '') : ''}</span>
                  <i style={{ height: `${Math.max(m[k] ? 3 : 0, (m[k] / max) * 100)}%`, background: cor, animationDelay: `${i * 0.06}s` }} />
                </div>
              ))}
            </div>
            <span className={`pf-gr-mes ${i === meses.length - 1 ? 'atual' : ''}`}>{mesRot(m.mes)}</span>
            <span className="pf-gr-duo num"><b style={{ color: 'var(--green-tx)' }}>{brlShort(m.entradas_cent).replace('R$ ', '')}</b><b style={{ color: 'var(--red)' }}>{brlShort(m.saidas_cent).replace('R$ ', '')}</b></span>
          </div>
        ))}
      </div>
    </div>
  )
}

// gastos por categoria: nome, barra e valor na mesma linha
export function PorCategoria({ itens, maxLinhas = 7 }) {
  const total = itens.reduce((s, c) => s + c.total_cent, 0)
  const top = itens.slice(0, maxLinhas)
  const resto = itens.slice(maxLinhas).reduce((s, c) => s + c.total_cent, 0)
  const linhas = resto ? [...top, { nome: 'Outras', cor: '#5A625E', total_cent: resto }] : top
  const max = Math.max(1, ...linhas.map((c) => c.total_cent))
  return (
    <div className="pf-cat">
      {linhas.map((c, i) => (
        <div key={c.nome} className="pf-cat-linha" style={{ animationDelay: `${i * 0.05}s` }}>
          <span className="pf-cat-nome"><i style={{ background: c.cor }} />{c.nome}</span>
          <span className="pf-cat-trilho"><i style={{ width: `${(c.total_cent / max) * 100}%`, background: c.cor, animationDelay: `${i * 0.05}s` }} /></span>
          <span className="pf-cat-val num">{brl(c.total_cent)}<small>{total ? Math.round((c.total_cent / total) * 100) : 0}%</small></span>
        </div>
      ))}
    </div>
  )
}

// gasto do dia a dia por dia da semana (domingo primeiro)
const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
export function DiaDaSemana({ valores }) {
  const max = Math.max(1, ...valores)
  const maior = valores.indexOf(Math.max(...valores))
  return (
    <div className="pf-dow" role="img" aria-label={DIAS.map((d, i) => `${d}: ${brl(valores[i])}`).join(', ')}>
      {valores.map((v, i) => (
        <div key={i} className={`pf-dow-col ${v && i === maior ? 'pico' : ''}`}>
          <span className="pf-gr-rot num">{v ? brlShort(v).replace('R$ ', '') : ''}</span>
          <div className="pf-dow-barra"><i style={{ height: `${Math.max(v ? 3 : 0, (v / max) * 100)}%`, animationDelay: `${i * 0.05}s` }} /></div>
          <span className="pf-gr-mes">{DIAS[i]}</span>
        </div>
      ))}
    </div>
  )
}

// comprometimento futuro: barras empilhadas por mês + linha do limite (% da renda)
export function Comprometimento({ linhas, maxPct }) {
  const renda = linhas[0]?.renda_cent || 0
  const topo = Math.max(1, renda, ...linhas.map((l) => l.parcelas_cent + l.fixas_cent + l.dividas_cent)) * 1.08
  const limite = renda ? (renda * maxPct) / 100 : 0
  const partes = [['dividas_cent', 'var(--red)', 'Dívidas'], ['fixas_cent', 'var(--org)', 'Contas fixas'], ['parcelas_cent', 'var(--blue)', 'Parcelas']]
  return (
    <div className="pf-gr">
      <div className="pf-gr-leg">{[...partes].reverse().map(([, cor, nome]) => <span key={nome}><i style={{ background: cor }} />{nome}</span>)}{limite ? <span><i className="pf-tracejado" />limite de {maxPct.toLocaleString('pt-BR')}% da renda</span> : null}</div>
      <div className="pf-gr-rolagem">
        <div className="pf-comp-gr" style={{ gridTemplateColumns: `repeat(${linhas.length}, minmax(34px, 1fr))` }}>
          {limite ? <div className="pf-linha-limite" style={{ top: 18 + ZONA * (1 - limite / topo) }}><span>{brl0Curto(limite)}</span></div> : null}
          {linhas.map((l, i) => {
            const total = l.parcelas_cent + l.fixas_cent + l.dividas_cent
            const pct = renda ? Math.round((total / renda) * 100) : null
            return (
              <div key={l.mes} className="pf-comp-col" role="img" aria-label={`${mesRot(l.mes)}: parcelas ${brl(l.parcelas_cent)}, contas fixas ${brl(l.fixas_cent)}, dívidas ${brl(l.dividas_cent)}${pct !== null ? `, ${pct}% da renda` : ''}`}>
                <span className={`pf-gr-rot num ${pct !== null && pct > maxPct ? 'neg' : ''}`}>{pct !== null ? `${pct}%` : ''}</span>
                <div className="pf-comp-pilha" style={{ height: (total / topo) * ZONA, animationDelay: `${i * 0.05}s` }}>
                  {partes.map(([k, cor]) => (l[k] ? <i key={k} style={{ flexGrow: l[k], background: cor }} title={`${brl(l[k])}`} /> : null))}
                </div>
                <span className="pf-gr-mes">{mesRot(l.mes)}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
const ZONA = 140 // altura (px) da área das barras
const brl0Curto = (c) => brlShort(c).replace('R$ ', '')
