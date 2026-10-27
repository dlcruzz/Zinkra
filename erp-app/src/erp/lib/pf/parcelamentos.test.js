// Etapa 3: parcelamentos, faturas, dívidas e a integração com o motor. Números inventados.
import { describe, it, expect } from 'vitest'
import { calcularPainel, planoDaEntrada, obrigacoesDeDividas, normalizarObrigacoes, faturaDaCompra, parcelasNoCartao } from './motor'
import { linhaDoTempo, taxaImplicita, custoDoCredito, mesesEmAlerta, resumoParcelamento, gerarParcelas } from './parcelas'
import { simularQuitacao, compararEstrategias, ordemPorJuros } from './dividas'

const cfg = { colchao_cent: 0, regra_fim_semana: 'manter', horizonte: 'proxima_entrada', acumular_sobra_dia: false }
const modelo = [{ id: 'm', descricao: 'Pagamento', dia_mes: 20, valor_esperado_cent: 300000, ativo: true }]
const base = { hoje: '2027-03-01', config: cfg, saldoCent: 100000, modelos: modelo }

describe('cartão e parcelas no motor', () => {
  it('compra no dia exato do fechamento entra na fatura do mês; no dia seguinte, na próxima', () => {
    const c = { fechamento_dia: 10, vencimento_dia: 18 }
    expect(faturaDaCompra('2027-03-10', c).ref_mes).toBe('2027-03-01')
    expect(faturaDaCompra('2027-03-11', c).ref_mes).toBe('2027-04-01')
    expect(faturaDaCompra('2027-03-10', c).vencimento).toBe('2027-03-18')
  })

  it('fatura que cruza o mês: parcelas seguem mês a mês, inclusive na virada do ano', () => {
    const lista = parcelasNoCartao({ dataCompra: '2027-11-28', cartao: { fechamento_dia: 25, vencimento_dia: 5 }, valores: [100, 100, 100, 100] })
    expect(lista.map((x) => x.ref_mes)).toEqual(['2027-12-01', '2028-01-01', '2028-02-01', '2028-03-01'])
    expect(lista.map((x) => x.vencimento)).toEqual(['2028-01-05', '2028-02-05', '2028-03-05', '2028-04-05'])
  })

  it('parcela terminando: a última parcela absorve os centavos e o resumo zera', () => {
    const resto = gerarParcelas({ total: 100000, parcela: 33333, n: 3, jaPagas: 0, proximoVenc: '2027-03-10' })
    expect(resto.map((x) => x.valor_cent)).toEqual([33333, 33333, 33334])
    expect(resto.reduce((s, x) => s + x.valor_cent, 0)).toBe(100000)
    expect(resumoParcelamento({ n_parcelas: 3, parcela_atual: 3, valor_total_cent: 100000, valor_parcela_cent: 33333, primeira_data: '2027-01-10' }).restantes).toBe(0)
  })

  it('fatura (conta a pagar) entra na conta; as parcelas dentro dela não contam duas vezes', () => {
    const fatura = { id: 'f', descricao: 'Fatura', valor_cent: 40000, vencimento: '2027-03-10', status: 'aberta', fatura_id: 'ff', prioridade: 'essencial' }
    const parcela = { id: 'p', status: 'aberta', fatura_id: 'ff', valor_cent: 40000, vencimento: '2027-03-10', descricao: 'Compra (1/3)' }
    const p = calcularPainel({ ...base, compromissos: [fatura], parcelas: [parcela] })
    expect(p.serie.find((d) => d.data === '2027-03-10').saiu_cent).toBe(40000)
    expect(p.livre).toBe(60000)
  })

  it('parcela de carnê (sem fatura) conta no próprio vencimento', () => {
    const parcela = { id: 'p', status: 'aberta', fatura_id: null, valor_cent: 25000, vencimento: '2027-03-05', descricao: 'Carnê (2/6)' }
    expect(calcularPainel({ ...base, parcelas: [parcela] }).livre).toBe(75000)
  })
})

describe('dívidas no motor', () => {
  const divida = { id: 'd1', credor: 'Credor A', saldo_devedor_cent: 500000, parcela_minima_cent: 30000, dia_venc: 10, ativo: true, prioridade: 'essencial' }

  it('parcela mínima entra todo mês no dia de vencer', () => {
    const { itens } = obrigacoesDeDividas({ dividas: [divida], hoje: '2027-03-01', ate: '2027-05-31' })
    expect(itens.map((i) => i.vencimento)).toEqual(['2027-03-10', '2027-04-10', '2027-05-10'])
    expect(itens[0]).toMatchObject({ tipo: 'divida', valor_cent: 30000, ref: 'd1' })
  })

  it('mês já pago sai; dívida sem dia de vencimento vira aviso', () => {
    const r = obrigacoesDeDividas({ dividas: [divida, { ...divida, id: 'd2', credor: 'Credor B', dia_venc: null }], pagas: ['d1|2027-03'], hoje: '2027-03-01', ate: '2027-04-30' })
    expect(r.itens.map((i) => i.vencimento)).toEqual(['2027-04-10'])
    expect(r.semDia.map((d) => d.credor)).toEqual(['Credor B'])
    const p = calcularPainel({ ...base, dividas: [{ ...divida, dia_venc: null }] })
    expect(p.avisos.join(' ')).toMatch(/Credor A/)
  })

  it('o mínimo reduz o livre do ciclo e entra no plano da entrada', () => {
    const sem = calcularPainel({ ...base })
    const com = calcularPainel({ ...base, dividas: [divida] })
    expect(sem.livre - com.livre).toBe(30000)
    const plano = planoDaEntrada({ valorCent: 300000, data: '2027-03-01', config: cfg, modelos: modelo, dividas: [divida] })
    expect(plano.passos.find((x) => x.id === 'ciclo').itens.map((i) => i.tipo)).toEqual(['divida'])
  })

  it('parcela vencida há mais de 15 dias sem registro não vira atrasada para sempre', () => {
    const { itens } = obrigacoesDeDividas({ dividas: [{ ...divida, dia_venc: 1 }], hoje: '2027-03-20', ate: '2027-03-31' })
    expect(itens).toHaveLength(0)
  })

  it('o id da obrigação separa os meses (dá para marcar uma só como paga)', () => {
    const o = normalizarObrigacoes({ extras: obrigacoesDeDividas({ dividas: [divida], hoje: '2027-03-01', ate: '2027-04-30' }).itens })
    expect(new Set(o.map((x) => x.id)).size).toBe(2)
  })
})

describe('linha do tempo dos parcelamentos', () => {
  const parcelas = [
    { parcelamento_id: 'a', descricao: 'Compra A', n_parcelas: 4, forma: 'cartao', numero: 3, vencimento: '2027-03-10', valor_cent: 10000 },
    { parcelamento_id: 'a', descricao: 'Compra A', n_parcelas: 4, forma: 'cartao', numero: 4, vencimento: '2027-04-10', valor_cent: 10000 },
    { parcelamento_id: 'b', descricao: 'Compra B', n_parcelas: 20, forma: 'carne', numero: 1, vencimento: '2027-04-15', valor_cent: 5000 },
    { parcelamento_id: 'b', descricao: 'Compra B', n_parcelas: 20, forma: 'carne', numero: 2, vencimento: '2028-02-15', valor_cent: 5000 },
    { parcelamento_id: 'b', descricao: 'Compra B', n_parcelas: 20, forma: 'carne', numero: 3, vencimento: '2028-03-15', valor_cent: 5000 }, // fora dos 12 meses
  ]
  const t = linhaDoTempo({ parcelas, hoje: '2027-03-12', meses: 12 })

  it('12 colunas a partir do mês de hoje, com o total do mês', () => {
    expect(t.meses).toHaveLength(12)
    expect(t.meses[0].ref).toBe('2027-03-01')
    expect(t.meses[11].ref).toBe('2028-02-01')
    expect(t.meses.slice(0, 3).map((m) => m.total_cent)).toEqual([10000, 15000, 0])
    expect(t.meses[11].total_cent).toBe(5000)
  })

  it('uma faixa por parcelamento, com n/N e valor em cada mês, só dentro da janela', () => {
    expect(t.faixas.map((f) => f.descricao)).toEqual(['Compra A', 'Compra B'])
    expect(t.faixas[0].celulas).toEqual([{ i: 0, numero: 3, valor_cent: 10000 }, { i: 1, numero: 4, valor_cent: 10000 }])
    expect(t.faixas[1].celulas.map((c) => c.i)).toEqual([1, 11])
  })
})

describe('custo do crédito e alerta de comprometimento', () => {
  it('custo = total pago − valor à vista, e a taxa mensal embutida', () => {
    expect(custoDoCredito(100000, 120000)).toBe(20000)
    expect(custoDoCredito(100000, 90000)).toBe(0)
    expect(custoDoCredito(0, 120000)).toBe(0)
    // 10 parcelas de 10.000 para 90.000 à vista: cerca de 2% ao mês (confere: 10.000 × (1 − 1,0196^-10) ÷ 0,0196 ≈ 90.000)
    const taxa = taxaImplicita(90000, 10000, 10)
    expect(taxa).toBeGreaterThan(1.9)
    expect(taxa).toBeLessThan(2.0)
    expect(taxaImplicita(100000, 10000, 10)).toBe(0) // sem juros
  })

  it('mês com comprometimento acima do limite entra no alerta', () => {
    const linhas = [
      { mes: '2027-03-01', parcelas_cent: 20000, fixas_cent: 30000, dividas_cent: 0, renda_cent: 100000 },
      { mes: '2027-04-01', parcelas_cent: 40000, fixas_cent: 30000, dividas_cent: 10000, renda_cent: 100000 },
      { mes: '2027-05-01', parcelas_cent: 0, fixas_cent: 0, dividas_cent: 0, renda_cent: 0 }, // sem renda cadastrada: não alerta
    ]
    const a = mesesEmAlerta(linhas, 50)
    expect(a.map((x) => x.mes)).toEqual(['2027-04-01'])
    expect(a[0].pct).toBe(80)
    expect(mesesEmAlerta(linhas, 90)).toEqual([])
  })
})

describe('dívidas: ordem e comparação de custo', () => {
  const dividas = [
    { id: 'a', credor: 'Cheque especial', saldo_devedor_cent: 100000, parcela_minima_cent: 10000, juros_mes_pct: 8 },
    { id: 'b', credor: 'Empréstimo', saldo_devedor_cent: 300000, parcela_minima_cent: 15000, juros_mes_pct: 2 },
    { id: 'c', credor: 'Loja', saldo_devedor_cent: 50000, parcela_minima_cent: 5000, juros_mes_pct: 4 },
  ]

  it('ordem sugerida: maior juros primeiro', () => {
    expect(ordemPorJuros(dividas).map((d) => d.id)).toEqual(['a', 'c', 'b'])
  })

  it('pagar extra no maior juros custa menos juros do que pagar só o mínimo', () => {
    const [min, juros, saldo] = compararEstrategias(dividas, 20000)
    expect(min.quita).toBe(true)
    expect(juros.meses).toBeLessThan(min.meses)
    expect(juros.juros_cent).toBeLessThan(min.juros_cent)
    expect(juros.economia_cent).toBe(min.juros_cent - juros.juros_cent)
    expect(juros.juros_cent).toBeLessThanOrEqual(saldo.juros_cent) // maior juros primeiro nunca paga mais juros
    expect(juros.quitacoes).toHaveLength(3)
  })

  it('mínimo que não cobre os juros nunca quita', () => {
    const r = simularQuitacao({ dividas: [{ id: 'x', credor: 'X', saldo_devedor_cent: 100000, parcela_minima_cent: 1000, juros_mes_pct: 5 }], estrategia: 'minimos' })
    expect(r.quita).toBe(false)
    const [min, juros] = compararEstrategias([{ id: 'x', credor: 'X', saldo_devedor_cent: 100000, parcela_minima_cent: 1000, juros_mes_pct: 5 }], 20000)
    expect(min.economia_cent).toBe(0)
    expect(juros.quita).toBe(true)
    expect(juros.economia_cent).toBeNull()
  })

  it('sem juros: paga exatamente o saldo', () => {
    const r = simularQuitacao({ dividas: [{ id: 'y', credor: 'Y', saldo_devedor_cent: 30000, parcela_minima_cent: 10000, juros_mes_pct: 0 }], estrategia: 'minimos' })
    expect(r).toMatchObject({ meses: 3, juros_cent: 0, pago_cent: 30000, quita: true })
  })
})
