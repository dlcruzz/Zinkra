import { describe, it, expect } from 'vitest'
import {
  PADRAO, ORDEM, validarPercentuais, dividir, configEm, comissaoDoRecebimento, entradasDasCaixinhas,
  saidasDaCompra, saldosCaixinhas, validarSaque, progressoCompra, podeComprometer, extrato, pagaveisDeCompras,
} from './caixinhas'

const cfg = { id: 'c1', vigente_desde: '2026-11-09', pct_gastar: 40, pct_guardar: 15, pct_caixa: 25, pct_invest: 20 }
const total = (p) => ORDEM.reduce((a, k) => a + p[k], 0)

describe('percentuais e divisão', () => {
  it('só aceita soma 100', () => {
    expect(validarPercentuais(PADRAO)).toBe('')
    expect(validarPercentuais({ ...PADRAO, invest: 25 })).toMatch(/100%/)
    expect(validarPercentuais({ ...PADRAO, invest: -5, gastar: 65 })).toMatch(/zero para cima/)
  })
  it('divide 10.000 centavos em 4.000 / 1.500 / 2.500 / 2.000', () => {
    expect(dividir(10000, PADRAO)).toEqual({ gastar: 4000, guardar: 1500, caixa: 2500, invest: 2000 })
  })
  it('nunca perde nem cria centavo', () => {
    for (const base of [1, 7, 99, 1001, 77872, 366000]) expect(total(dividir(base, PADRAO))).toBe(base)
  })
  it('a regra vigente é a mais recente até a data; antes da primeira não há regra', () => {
    const nova = { ...cfg, id: 'c2', vigente_desde: '2027-01-01', pct_gastar: 50, pct_guardar: 10, pct_caixa: 20, pct_invest: 20 }
    expect(configEm([cfg, nova], '2026-11-08')).toBeNull()
    expect(configEm([cfg, nova], '2026-12-31').id).toBe('c1')
    expect(configEm([cfg, nova], '2027-01-01').id).toBe('c2')
  })
})

describe('comissão sai antes da divisão', () => {
  const fin = { valorTotal: 470000, comissaoTotal: 104000 } // Adeilton: 4.700 com 1.040 de comissão
  it('tira a parte proporcional da comissão', () => {
    expect(comissaoDoRecebimento(470000, fin)).toBe(104000)
    expect(comissaoDoRecebimento(100000, fin)).toBe(22128)
    expect(comissaoDoRecebimento(100000, { valorTotal: 470000, comissaoTotal: 0 })).toBe(0)
    expect(comissaoDoRecebimento(100000, null)).toBe(0)
  })
  it('exemplo do Danilo: R$ 4.700 com R$ 1.040 de comissão divide R$ 3.660', () => {
    const e = entradasDasCaixinhas({
      fin: { recebimentos: [{ id: 'r1', project_id: 'p1', amount_cents: 470000, received_on: '2026-11-10' }] },
      linhas: [{ projeto: { id: 'p1' }, fin }], configs: [cfg], hoje: '2026-11-30',
    })
    expect(e).toHaveLength(1)
    expect(e[0].base).toBe(366000)
    expect(e[0].partes).toEqual({ gastar: 146400, guardar: 54900, caixa: 91500, invest: 73200 })
  })
})

describe('entradas', () => {
  const base = { configs: [cfg], hoje: '2026-11-30' }
  it('só divide o que entrou a partir da regra (o passado fica de fora)', () => {
    const e = entradasDasCaixinhas({ ...base, fin: { recebimentos: [
      { id: 'a', project_id: 'p', amount_cents: 100000, received_on: '2026-10-31' },
      { id: 'b', project_id: 'p', amount_cents: 100000, received_on: '2026-11-09' },
    ] } })
    expect(e.map((x) => x.origem_id)).toEqual(['b'])
  })
  it('recebimento futuro não entra; SaaS entra inteiro', () => {
    const e = entradasDasCaixinhas({ ...base,
      fin: { recebimentos: [{ id: 'f', project_id: 'p', amount_cents: 5000, received_on: '2026-12-15' }] },
      saas: { recebimentos: [{ id: 's', amount_cents: 4000, received_on: '2026-11-12' }] } })
    expect(e).toHaveLength(1)
    expect(e[0]).toMatchObject({ origem_tipo: 'saas', base: 4000, comissao: 0 })
  })
  it('marca como repassado o que já foi movido no banco, uma vez só', () => {
    const e = entradasDasCaixinhas({ ...base, fin: { recebimentos: [{ id: 'b', project_id: 'p', amount_cents: 100000, received_on: '2026-11-10' }] },
      repasses: [{ origem_tipo: 'recebimento', origem_id: 'b', repassado_em: '2026-11-10' }] })
    expect(e[0].repassado).toBe(true)
  })
})

describe('saldos', () => {
  const entradas = entradasDasCaixinhas({ configs: [cfg], hoje: '2026-11-30',
    fin: { recebimentos: [{ id: 'b', project_id: 'p', amount_cents: 100000, received_on: '2026-11-10' }] } })
  // 1.000 → 400 / 150 / 250 / 200
  it('saldo = entrou - saiu e mostra o que está parado na conta', () => {
    const s = saldosCaixinhas({ entradas })
    expect(s.invest).toMatchObject({ entrou: 20000, saiu: 0, saldo: 20000, livre: 20000, paradoNaConta: 20000 })
    expect(s.gastar.saldo).toBe(40000)
  })
  it('saque e transferência movem saldo; transferência não cria dinheiro', () => {
    const movimentos = [
      { id: 'm1', caixinha: 'gastar', tipo: 'saida', amount_cents: 10000, motivo: 'x', destino: 'y' },
      { id: 'm2', caixinha: 'invest', tipo: 'saida', amount_cents: 5000, grupo: 'g', motivo: 'Transferência', destino: 'Caixa da Zinkra' },
      { id: 'm3', caixinha: 'caixa', tipo: 'entrada', amount_cents: 5000, grupo: 'g' },
    ]
    const s = saldosCaixinhas({ entradas, movimentos })
    expect(s.gastar.saldo).toBe(30000)
    expect(s.invest.saldo).toBe(15000)
    expect(s.caixa.saldo).toBe(30000)
    expect(ORDEM.reduce((a, k) => a + s[k].saldo, 0)).toBe(100000 - 10000)
  })
})

describe('compras', () => {
  const entradas = entradasDasCaixinhas({ configs: [cfg], hoje: '2026-11-30',
    fin: { recebimentos: [{ id: 'b', project_id: 'p', amount_cents: 100000, received_on: '2026-11-10' }] } }) // invest 20.000
  const tripe = { id: 't', nome: 'Tripé', valor_cents: 60000, status: 'desejo' }
  const reservas = [{ id: 'r1', compra_id: 't', caixinha: 'invest', amount_cents: 18000, created_at: '2026-11-11' }]

  it('compromete saldo e mostra quanto falta (30% / 70%)', () => {
    const p = progressoCompra(tripe, reservas)
    expect(p).toMatchObject({ reservado: 18000, falta: 42000, pct: 30, completo: false })
    const s = saldosCaixinhas({ entradas, compras: [tripe], reservas })
    expect(s.invest).toMatchObject({ saldo: 20000, comprometido: 18000, livre: 2000 })
  })
  it('só deixa comprometer o que está livre e o que falta da compra', () => {
    const s = saldosCaixinhas({ entradas, compras: [tripe], reservas })
    expect(podeComprometer(tripe, reservas, s, 'invest')).toBe(2000)
    expect(podeComprometer({ ...tripe, valor_cents: 19000 }, reservas, s, 'invest')).toBe(1000)
  })
  it('comprar consome UMA vez: reservado primeiro, resto de pago_de; vira uma saída no fluxo de caixa', () => {
    const comprada = { ...tripe, status: 'comprada', pago_cents: 25000, comprada_em: '2026-11-20', pago_de: 'caixa' }
    expect(saidasDaCompra(comprada, reservas)).toEqual({ caixa: 7000, invest: 18000 })
    const s = saldosCaixinhas({ entradas, compras: [comprada], reservas })
    expect(s.invest).toMatchObject({ saiu: 18000, saldo: 2000, comprometido: 0 })
    expect(s.caixa).toMatchObject({ saiu: 7000, saldo: 25000 - 7000 })
    expect(pagaveisDeCompras([comprada, tripe])).toEqual([
      { id: 'compra-t', category: 'Compras', recurrence: 'once', series_id: null, amount_cents: 25000, due_on: '2026-11-20', paid_on: '2026-11-20' }])
  })
  it('reserva maior que o preço pago libera a sobra', () => {
    const comprada = { ...tripe, status: 'comprada', pago_cents: 10000, comprada_em: '2026-11-20', pago_de: 'invest' }
    expect(saidasDaCompra(comprada, reservas)).toEqual({ caixa: 0, invest: 10000 })
  })
})

describe('saque exige motivo e destino', () => {
  const s = { invest: { livre: 20000 } }
  const ok = { caixinha: 'invest', valor: 5000, motivo: 'Contratar social media', destino: 'Pagar o primeiro mês' }
  it('aceita saque completo', () => expect(validarSaque(ok, s)).toBe(''))
  it('recusa sem motivo, sem destino, zero ou acima do livre', () => {
    expect(validarSaque({ ...ok, motivo: '  ' }, s)).toMatch(/por que/)
    expect(validarSaque({ ...ok, destino: '' }, s)).toMatch(/o que vai fazer/)
    expect(validarSaque({ ...ok, valor: 0 }, s)).toMatch(/maior que zero/)
    expect(validarSaque({ ...ok, valor: 20001 }, s)).toMatch(/livre/)
  })
})

describe('extrato', () => {
  it('mostra saque com o porquê e o destino, em ordem da data mais nova', () => {
    const movimentos = [{ id: 'm', caixinha: 'invest', tipo: 'saida', amount_cents: 5000, feito_em: '2026-12-01', motivo: 'Contratar social media', destino: 'Primeiro mês' }]
    const ex = extrato({ caixinha: 'invest', movimentos })
    expect(ex[0]).toMatchObject({ sinal: -1, valor: 5000, titulo: 'Contratar social media', detalhe: 'Para: Primeiro mês', tipo: 'saque' })
  })
})
