// Parcelamentos: contas puras, em centavos inteiros.
import { addMonths } from '../format'

// Entra o valor da parcela OU o total; devolve os dois coerentes.
// A diferença de centavos fica na última parcela (ver gerarParcelas).
export function valoresDoParcelamento({ modo, valorCent, n }) {
  if (modo === 'total') {
    return { total: valorCent, parcela: n > 0 ? Math.round(valorCent / n) : 0 }
  }
  return { total: valorCent * n, parcela: valorCent }
}

// Gera só as parcelas que ainda faltam (jaPagas já foram). `proximoVenc` é o vencimento
// da primeira parcela restante. A última parcela absorve a diferença de arredondamento.
export function gerarParcelas({ total, parcela, n, jaPagas, proximoVenc }) {
  const lista = []
  for (let numero = jaPagas + 1; numero <= n; numero++) {
    const ultima = numero === n
    const valor = ultima ? Math.max(0, total - parcela * (n - 1)) : parcela
    lista.push({ numero, vencimento: addMonths(proximoVenc, numero - jaPagas - 1), valor_cent: valor })
  }
  return lista
}

// data da parcela nº 1, a partir do vencimento da próxima parcela
export const primeiraData = (proximoVenc, jaPagas) => addMonths(proximoVenc, -jaPagas)

// resumo para exibição: quantas faltam e quanto ainda deve (parcela fixa; a última pode diferir poucos centavos)
export function resumoParcelamento(p) {
  const restantes = Math.max(0, p.n_parcelas - p.parcela_atual)
  const falta = restantes === 0 ? 0 : Math.max(0, p.valor_total_cent - p.valor_parcela_cent * p.parcela_atual)
  return { restantes, falta, terminaEm: restantes ? addMonths(p.primeira_data, p.n_parcelas - 1) : null }
}

// ---------------------------------------------------------------------------
// Linha do tempo: próximos `meses` meses, uma faixa por parcelamento
// ---------------------------------------------------------------------------
// `parcelas`: em aberto, com { parcelamento_id, descricao, n_parcelas, forma, numero, vencimento, valor_cent }.
export function linhaDoTempo({ parcelas, hoje, meses = 12 }) {
  const a0 = Number(hoje.slice(0, 4)), m0 = Number(hoje.slice(5, 7)) - 1
  const cols = Array.from({ length: meses }, (_, i) => {
    const t = m0 + i, a = a0 + Math.floor(t / 12), m = (t % 12) + 1
    return { ref: `${a}-${String(m).padStart(2, '0')}-01`, total_cent: 0 }
  })
  const indice = (iso) => (Number(iso.slice(0, 4)) - a0) * 12 + (Number(iso.slice(5, 7)) - 1 - m0)
  const mapa = new Map()
  for (const p of parcelas) {
    const i = indice(p.vencimento)
    if (i < 0 || i >= meses) continue
    cols[i].total_cent += p.valor_cent
    if (!mapa.has(p.parcelamento_id)) mapa.set(p.parcelamento_id, { id: p.parcelamento_id, descricao: p.descricao, forma: p.forma, n: p.n_parcelas, celulas: [] })
    const f = mapa.get(p.parcelamento_id)
    const c = f.celulas.find((x) => x.i === i)
    if (c) c.valor_cent += p.valor_cent
    else f.celulas.push({ i, numero: p.numero, valor_cent: p.valor_cent })
  }
  const faixas = [...mapa.values()].map((f) => ({ ...f, celulas: f.celulas.sort((a, b) => a.i - b.i) }))
    .sort((a, b) => a.celulas[0].i - b.celulas[0].i || a.descricao.localeCompare(b.descricao))
  return { meses: cols, faixas }
}

// Taxa de juros mensal embutida num parcelamento (tabela Price): valor à vista, parcela fixa, nº de parcelas.
// Devolve em % ao mês, ou 0 se a soma das parcelas não passa do à vista.
export function taxaImplicita(avistaCent, parcelaCent, n) {
  if (!(avistaCent > 0) || !(parcelaCent > 0) || n < 1 || parcelaCent * n <= avistaCent) return 0
  let lo = 0, hi = 1
  const valorPresente = (i) => (i === 0 ? parcelaCent * n : parcelaCent * (1 - Math.pow(1 + i, -n)) / i)
  for (let k = 0; k < 80; k++) {
    const mid = (lo + hi) / 2
    if (valorPresente(mid) > avistaCent) lo = mid; else hi = mid
  }
  return Math.round(((lo + hi) / 2) * 10000) / 100
}

// Custo total do crédito: o que paga a mais do que pagaria à vista.
export const custoDoCredito = (avistaCent, totalCent) => (avistaCent > 0 ? Math.max(0, totalCent - avistaCent) : 0)

// Parcelas e contas fixas passam do percentual da renda? `linhas`: saída de pf_comprometimento.
export function mesesEmAlerta(linhas, maxPct) {
  return linhas
    .filter((l) => l.renda_cent > 0)
    .map((l) => ({ ...l, comprometido_cent: l.parcelas_cent + l.fixas_cent + l.dividas_cent, pct: Math.round(((l.parcelas_cent + l.fixas_cent + l.dividas_cent) / l.renda_cent) * 1000) / 10 }))
    .filter((l) => l.pct > maxPct)
}
