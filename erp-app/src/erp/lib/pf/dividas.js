// Dívidas: ordem de pagamento e comparação de custo. Funções puras, em centavos.

// maior juros primeiro; empate: menor saldo
export const ordemPorJuros = (dividas) => [...dividas].sort((a, b) => (Number(b.juros_mes_pct) || 0) - (Number(a.juros_mes_pct) || 0) || a.saldo_devedor_cent - b.saldo_devedor_cent)
export const ordemPorSaldo = (dividas) => [...dividas].sort((a, b) => a.saldo_devedor_cent - b.saldo_devedor_cent)

/**
 * Simula mês a mês até quitar tudo (no máximo 50 anos).
 *  estrategia: 'minimos' (só a parcela mínima de cada uma, sem passar nada adiante) |
 *              'juros' (extra vai para a de maior juros) | 'saldo' (extra vai para a de menor saldo).
 * Nas estratégias com extra, a parcela mínima de uma dívida quitada passa a engrossar o extra.
 * Devolve { meses, juros_cent, pago_cent, quita, quitacoes: [{ id, credor, mes }] }.
 */
export function simularQuitacao({ dividas, extraCent = 0, estrategia = 'juros' }) {
  const ativas = dividas.filter((d) => d.saldo_devedor_cent > 0).map((d) => ({ ...d, saldo: d.saldo_devedor_cent, taxa: (Number(d.juros_mes_pct) || 0) / 100, minima: d.parcela_minima_cent || 0 }))
  const ordem = estrategia === 'saldo' ? ordemPorSaldo(ativas).map((d) => d.id) : ordemPorJuros(ativas).map((d) => d.id)
  const orcamento = ativas.reduce((s, d) => s + d.minima, 0) + (estrategia === 'minimos' ? 0 : extraCent)
  const quitacoes = []
  let juros = 0, pago = 0, mes = 0
  while (ativas.some((d) => d.saldo > 0) && mes < 600) {
    mes += 1
    for (const d of ativas) if (d.saldo > 0) { const j = Math.round(d.saldo * d.taxa); d.saldo += j; juros += j }
    let sobra = estrategia === 'minimos' ? 0 : orcamento
    if (estrategia === 'minimos') {
      for (const d of ativas) { const p = Math.min(d.saldo, d.minima); d.saldo -= p; pago += p }
    } else {
      for (const d of ativas) { const p = Math.min(d.saldo, d.minima); d.saldo -= p; pago += p; sobra -= p }
      for (const id of ordem) {
        const d = ativas.find((x) => x.id === id)
        if (d.saldo > 0 && sobra > 0) { const p = Math.min(d.saldo, sobra); d.saldo -= p; pago += p; sobra -= p }
      }
    }
    for (const d of ativas) if (d.saldo === 0 && !quitacoes.some((q) => q.id === d.id)) quitacoes.push({ id: d.id, credor: d.credor, mes })
  }
  return { meses: mes, juros_cent: juros, pago_cent: pago, quita: ativas.every((d) => d.saldo === 0), quitacoes }
}

// as três opções lado a lado, com a economia de cada uma contra "só o mínimo"
export function compararEstrategias(dividas, extraCent) {
  const minimos = simularQuitacao({ dividas, estrategia: 'minimos' })
  const juros = simularQuitacao({ dividas, extraCent, estrategia: 'juros' })
  const saldo = simularQuitacao({ dividas, extraCent, estrategia: 'saldo' })
  const eco = (x) => (minimos.quita ? minimos.juros_cent - x.juros_cent : null)
  return [
    { id: 'minimos', titulo: 'Só o mínimo', ...minimos, economia_cent: 0 },
    { id: 'juros', titulo: 'Maior juros primeiro', ...juros, economia_cent: eco(juros) },
    { id: 'saldo', titulo: 'Menor saldo primeiro', ...saldo, economia_cent: eco(saldo) },
  ]
}
