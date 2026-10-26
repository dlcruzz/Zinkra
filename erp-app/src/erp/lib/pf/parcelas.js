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
