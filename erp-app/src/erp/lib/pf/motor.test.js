// Testes do motor do módulo Pessoal. Todos os números são inventados e genéricos.
// Valores em centavos. Datas em março de 2027 (a segunda-feira 01/03/2027) com a regra "manter",
// para o dia da semana não interferir, exceto nos testes de fim de semana.
import { describe, it, expect } from 'vitest'
import {
  ocorrenciasDeRecebimento, entradasEsperadas, normalizarObrigacoes, encargosDeAtraso, projetarSaldo, estadoDoDia,
  calcularPainel, planoDaEntrada, sugerirAdiamentos, faturaDaCompra, parcelasNoCartao, ocorrenciasRecorrentes,
} from './motor'
import { dataDoMes, ajustarPelaRegra, gradeDoMes } from './datas'
import { resumoParcelamento, gerarParcelas } from './parcelas'

const modelos2 = [
  { id: 'm1', descricao: 'Pagamento A', dia_mes: 5, valor_esperado_cent: 300000, ativo: true },
  { id: 'm2', descricao: 'Pagamento B', dia_mes: 20, valor_esperado_cent: 200000, ativo: true },
]
const aluguel = { id: 'a', descricao: 'Aluguel', valor_cent: 90000, vencimento: '2027-03-03', status: 'aberta', prioridade: 'essencial' }
const cfg = { colchao_cent: 20000, regra_fim_semana: 'manter', horizonte: 'proxima_entrada', acumular_sobra_dia: false }
const base = { hoje: '2027-03-01', config: cfg, saldoCent: 200000, modelos: modelos2, compromissos: [aluguel] }

describe('4.1 datas de recebimento', () => {
  it('dia 30 em fevereiro vira o último dia do mês (28 e 29 em ano bissexto)', () => {
    expect(dataDoMes(2027, 2, 30)).toBe('2027-02-28')
    expect(dataDoMes(2028, 2, 30)).toBe('2028-02-29')
    expect(dataDoMes(2027, 4, 31)).toBe('2027-04-30')
    const o = ocorrenciasDeRecebimento([{ id: 'm', dia_mes: 30, ativo: true, valor_esperado_cent: 1 }], 'manter', '2027-01-15', '2027-03-15')
    expect(o.map((x) => x.data)).toEqual(['2027-01-30', '2027-02-28'])
  })

  it('dia 15 caindo no domingo (15/11/2026): as três regras de fim de semana', () => {
    const m = [{ id: 'm', dia_mes: 15, ativo: true, valor_esperado_cent: 1 }]
    const acha = (regra) => ocorrenciasDeRecebimento(m, regra, '2026-11-01', '2026-11-30')
    expect(acha('antecipar').map((x) => x.data)).toEqual(['2026-11-13'])
    expect(acha('proximo_dia_util').map((x) => x.data)).toEqual(['2026-11-16'])
    expect(acha('manter').map((x) => x.data)).toEqual(['2026-11-15'])
    expect(acha('antecipar')[0]).toMatchObject({ nominal: '2026-11-15', ajustada: true })
    expect(acha('manter')[0].ajustada).toBe(false)
    expect(ajustarPelaRegra('2026-11-15', 'antecipar')).toBe('2026-11-13')
  })

  it('ajuste "próximo dia útil" que empurra a data para o mês seguinte ainda é encontrado', () => {
    // 31/07/2027 é sábado: vai para segunda 02/08
    const m = [{ id: 'm', dia_mes: 31, ativo: true, valor_esperado_cent: 1 }]
    expect(ocorrenciasDeRecebimento(m, 'proximo_dia_util', '2027-08-01', '2027-08-15').map((x) => x.data)).toEqual(['2027-08-02'])
  })

  it('hoje é dia de pagamento e não foi registrado: convida a registrar e a entrada de hoje conta', () => {
    const p = calcularPainel({ ...base, hoje: '2027-03-05', saldoCent: 50000, compromissos: [], config: { ...cfg, colchao_cent: 0 } })
    expect(p.conviteRegistrar).toBe(true)
    expect(p.pendentes.map((x) => x.data)).toEqual(['2027-03-05'])
    expect(p.proximaEntrada.data).toBe('2027-03-20') // a de hoje não é "a próxima"
    expect(p.dias).toBe(15)
    expect(p.livre).toBe(350000) // 50.000 + a entrada de hoje
    expect(p.limite).toBe(23333)
  })

  it('depois de registrar, o convite some e o cálculo continua coerente', () => {
    const p = calcularPainel({
      ...base, hoje: '2027-03-05', saldoCent: 350000, compromissos: [], config: { ...cfg, colchao_cent: 0 },
      recebidos: [{ modelo_id: 'm1', ref: '2027-03-05' }],
    })
    expect(p.conviteRegistrar).toBe(false)
    expect(p.limite).toBe(23333)
  })

  it('não cobra registro de recebimentos anteriores ao início do histórico', () => {
    const p = calcularPainel({ ...base, hoje: '2027-03-05', desdeMin: '2027-03-06', compromissos: [] })
    expect(p.conviteRegistrar).toBe(false)
    expect(entradasEsperadas({ modelos: modelos2, regra: 'manter', desde: '2027-03-01', ate: '2027-03-31', recebidos: [{ modelo_id: 'm2', ref: '2027-03-20' }] }).map((x) => x.data)).toEqual(['2027-03-05'])
  })
})

describe('4.2 saldo projetado dia a dia', () => {
  it('soma entradas esperadas e subtrai contas no dia do vencimento', () => {
    const entradas = ocorrenciasDeRecebimento(modelos2, 'manter', '2027-03-01', '2027-03-10')
    const serie = projetarSaldo({ saldoCent: 100000, hoje: '2027-03-01', ate: '2027-03-06', entradas, obrigacoes: normalizarObrigacoes({ compromissos: [aluguel] }) })
    expect(serie.map((d) => d.saldo_cent)).toEqual([100000, 100000, 10000, 10000, 310000, 310000])
    expect(serie[2].saidas[0].descricao).toBe('Aluguel')
  })

  it('conta atrasada cai inteira em hoje, com multa e juros até hoje', () => {
    const atrasada = { id: 'v', descricao: 'Conta velha', valor_cent: 10000, vencimento: '2027-02-25', status: 'aberta', multa_pct: 2, juros_dia_pct: 0.033 }
    expect(encargosDeAtraso(normalizarObrigacoes({ compromissos: [atrasada] })[0], '2027-03-01')).toBe(213)
    const p = calcularPainel({ ...base, saldoCent: 50000, compromissos: [atrasada], config: { ...cfg, colchao_cent: 0 } })
    expect(p.serie[0].saiu_cent).toBe(10213)
    expect(p.atrasadas).toHaveLength(1)
    expect(p.atrasadas[0]).toMatchObject({ encargos_cent: 213, dias_atraso: 4 })
    expect(p.livre).toBe(39787)
    expect(p.limite).toBe(9946) // 39787 / 4 dias, arredondado para baixo
  })

  it('parcela aberta conta como obrigação; parcela já dentro de uma fatura não conta de novo', () => {
    const parcela = { id: 'p1', status: 'aberta', fatura_id: null, valor_cent: 10000, vencimento: '2027-03-03', descricao: 'Parcela 10/10' }
    expect(normalizarObrigacoes({ parcelas: [parcela] })).toHaveLength(1)
    expect(normalizarObrigacoes({ parcelas: [{ ...parcela, fatura_id: 'f1' }] })).toHaveLength(0)
    expect(normalizarObrigacoes({ compromissos: [{ ...aluguel, parcela_id: 'p1' }] })).toHaveLength(0)
  })
})

describe('4.3 quanto posso gastar hoje', () => {
  it('limite do dia = (pior saldo − colchão) ÷ dias, e o que já gastou sai do disponível', () => {
    const p = calcularPainel({ ...base, saldoCent: 195000, gastosPorDia: { '2027-03-01': 5000 } })
    expect(p.saldoInicioDia).toBe(200000)
    expect(p.pior).toEqual({ data: '2027-03-03', saldo_cent: 110000 })
    expect(p.livre).toBe(90000)
    expect(p.dias).toBe(4)
    expect(p.limite).toBe(22500)
    expect(p.disponivel).toBe(17500)
    expect(p.estado).toBe('verde')
    expect(p.mensagem).toContain('Você pode gastar')
  })

  it('o limite do dia não muda a cada gasto', () => {
    const a = calcularPainel({ ...base, saldoCent: 200000 })
    const b = calcularPainel({ ...base, saldoCent: 190000, gastosPorDia: { '2027-03-01': 10000 } })
    expect(b.limite).toBe(a.limite)
    expect(b.disponivel).toBe(a.disponivel - 10000)
  })

  it('estados: verde acima de 30% do limite, amarelo até 30%, vermelho sem saldo', () => {
    expect(estadoDoDia({ livreCent: 90000, limiteCent: 22500, disponivelCent: 6751 })).toBe('verde')
    expect(estadoDoDia({ livreCent: 90000, limiteCent: 22500, disponivelCent: 6750 })).toBe('amarelo')
    expect(estadoDoDia({ livreCent: 90000, limiteCent: 22500, disponivelCent: 1 })).toBe('amarelo')
    expect(estadoDoDia({ livreCent: 90000, limiteCent: 22500, disponivelCent: 0 })).toBe('vermelho')
    expect(estadoDoDia({ livreCent: 0, limiteCent: 0, disponivelCent: 0 })).toBe('vermelho')
    expect(estadoDoDia({ livreCent: -1, limiteCent: 0, disponivelCent: 5 })).toBe('vermelho')
    // pelo painel
    expect(calcularPainel({ ...base, saldoCent: 200000 - 15000, gastosPorDia: { '2027-03-01': 15000 } }).estado).toBe('verde')
    expect(calcularPainel({ ...base, saldoCent: 200000 - 17000, gastosPorDia: { '2027-03-01': 17000 } }).estado).toBe('amarelo')
    const vermelho = calcularPainel({ ...base, saldoCent: 200000 - 22500, gastosPorDia: { '2027-03-01': 22500 } })
    expect(vermelho.estado).toBe('vermelho')
    expect(vermelho.disponivel).toBe(0)
  })

  it('déficit: entrada menor que as contas — mostra quanto falta e o que adiar com o custo', () => {
    const contas = [
      { id: 'x', descricao: 'Conta fixa', valor_cent: 50000, vencimento: '2027-03-02', status: 'aberta', prioridade: 'importante' },
      { id: 'y', descricao: 'Pode esperar A', valor_cent: 20000, vencimento: '2027-03-03', status: 'aberta', prioridade: 'adiavel', multa_pct: 2, juros_dia_pct: 0.1 },
      { id: 'z', descricao: 'Pode esperar B', valor_cent: 30000, vencimento: '2027-03-04', status: 'aberta', prioridade: 'adiavel' },
    ]
    const p = calcularPainel({ ...base, saldoCent: 10000, compromissos: contas, config: { ...cfg, colchao_cent: 0 } })
    expect(p.livre).toBe(-90000)
    expect(p.faltam).toBe(90000)
    expect(p.estado).toBe('vermelho')
    expect(p.limite).toBe(0)
    expect(p.mensagem).toMatch(/^Faltam /)
    expect(p.adiar.itens.map((i) => i.id)).toEqual(['c:z', 'c:y']) // o mais barato de adiar primeiro
    expect(p.adiar.itens[1]).toMatchObject({ dias_adiados: 2, custo_cent: 440 })
    expect(p.adiar.custo_cent).toBe(440)
    expect(p.adiar.cobreTudo).toBe(false)
    expect(sugerirAdiamentos({ faltaCent: 25000, obrigacoes: normalizarObrigacoes({ compromissos: contas }), hoje: '2027-03-01', fimHorizonte: '2027-03-04', dataEntrada: '2027-03-05' }).cobreTudo).toBe(true)
  })

  it('horizonte curto (até a próxima entrada) × longo (até a segunda entrada)', () => {
    const grande = { id: 'b', descricao: 'Conta grande', valor_cent: 350000, vencimento: '2027-03-18', status: 'aberta', prioridade: 'importante' }
    const compromissos = [aluguel, grande]
    const curto = calcularPainel({ ...base, compromissos })
    const longo = calcularPainel({ ...base, compromissos, config: { ...cfg, horizonte: 'segunda_entrada' } })
    expect(curto.fimHorizonte).toBe('2027-03-04')
    expect(curto.livre).toBe(90000)
    expect(curto.limite).toBe(22500)
    expect(longo.fimHorizonte).toBe('2027-03-19')
    expect(longo.pior).toEqual({ data: '2027-03-18', saldo_cent: 60000 })
    expect(longo.livre).toBe(40000)
    expect(longo.limite).toBe(10000) // protege a conta grande do ciclo seguinte
    expect(longo.dias).toBe(curto.dias) // os dias a dividir continuam até a próxima entrada
  })

  it('acumular sobra ligado × desligado', () => {
    const comum = {
      hoje: '2027-03-03', saldoCent: 100000, compromissos: [], inicioCiclo: '2027-03-01', gastosPorDia: {},
      modelos: [{ id: 'm', descricao: 'Pagamento', dia_mes: 11, valor_esperado_cent: 100, ativo: true }],
    }
    const ligado = calcularPainel({ ...comum, config: { ...cfg, colchao_cent: 0, acumular_sobra_dia: true } })
    const desligado = calcularPainel({ ...comum, config: { ...cfg, colchao_cent: 0, acumular_sobra_dia: false } })
    expect(ligado.dias).toBe(8)
    expect(ligado.limite).toBe(12500) // 2 dias sem gastar: a sobra entra no limite de hoje
    expect(desligado.limite).toBe(10000) // fica no limite original do ciclo (100.000 ÷ 10 dias)
    expect(desligado.sobraDeOntem).toBe(2500)
    expect(ligado.explicacao.find((l) => l.chave === 'limite').nota).toMatch(/sobraram/)
    expect(desligado.explicacao.find((l) => l.chave === 'limite').nota).toMatch(/folga/)
  })

  it('gastar demais nos dias anteriores reduz o limite nos dois modos', () => {
    const comum = {
      hoje: '2027-03-03', saldoCent: 60000, compromissos: [], inicioCiclo: '2027-03-01', gastosPorDia: { '2027-03-01': 20000, '2027-03-02': 20000 },
      modelos: [{ id: 'm', descricao: 'Pagamento', dia_mes: 11, valor_esperado_cent: 100, ativo: true }],
    }
    for (const acumular_sobra_dia of [true, false]) {
      expect(calcularPainel({ ...comum, config: { ...cfg, colchao_cent: 0, acumular_sobra_dia } }).limite).toBe(7500) // 60.000 ÷ 8
    }
  })

  it('valor zero: sem saldo e sem sobra, hoje não gasta nada', () => {
    const p = calcularPainel({ ...base, saldoCent: 0, compromissos: [], config: { ...cfg, colchao_cent: 0 } })
    expect(p.livre).toBe(0)
    expect(p.limite).toBe(0)
    expect(p.faltam).toBe(0)
    expect(p.estado).toBe('vermelho')
    expect(p.mensagem).toBe('Hoje não gaste nada')
  })

  it('valor zero também com colchão maior que o saldo: falta, não "sobra negativa"', () => {
    const p = calcularPainel({ ...base, saldoCent: 5000, compromissos: [], config: { ...cfg, colchao_cent: 20000 } })
    expect(p.livre).toBe(-15000)
    expect(p.limite).toBe(0)
    expect(p.estado).toBe('vermelho')
  })

  it('nenhuma entrada cadastrada: divide por 30 dias e avisa', () => {
    const p = calcularPainel({ hoje: '2027-03-01', config: { ...cfg, colchao_cent: 0 }, saldoCent: 300000, modelos: [], compromissos: [] })
    expect(p.semEntrada).toBe(true)
    expect(p.proximaEntrada).toBeNull()
    expect(p.dias).toBe(30)
    expect(p.limite).toBe(10000)
    expect(p.avisos.join(' ')).toMatch(/Nenhum recebimento cadastrado/)
  })

  it('o "Por quê?" fecha a conta: as linhas somam até o pior saldo e o livre', () => {
    const p = calcularPainel({ ...base, config: { ...cfg, horizonte: 'segunda_entrada' }, compromissos: [aluguel, { id: 'b', descricao: 'Conta grande', valor_cent: 350000, vencimento: '2027-03-18', status: 'aberta', prioridade: 'importante' }] })
    const l = Object.fromEntries(p.explicacao.map((x) => [x.chave, x]))
    expect(l.saldo.valor_cent + l.entradas.valor_cent - l.contas.valor_cent).toBe(l.pior.valor_cent)
    expect(l.pior.valor_cent - l.colchao.valor_cent).toBe(l.livre.valor_cent)
    expect(l.contas.itens.map((i) => i.valor_cent).reduce((a, b) => a + b, 0)).toBe(l.contas.valor_cent)
    expect(Math.floor(l.livre.valor_cent / l.dias.valor)).toBe(l.limite.valor_cent)
    expect(l.disponivel.valor_cent).toBe(p.disponivel)
  })
})

describe('4.4 plano da entrada', () => {
  const contas = [
    { id: 'at', descricao: 'Atrasada', valor_cent: 20000, vencimento: '2027-03-01', status: 'aberta', juros_dia_pct: 0.1 },
    { id: 'c1', descricao: 'Conta do ciclo 1', valor_cent: 90000, vencimento: '2027-03-10', status: 'aberta' },
    { id: 'c2', descricao: 'Conta do ciclo 2', valor_cent: 60000, vencimento: '2027-03-18', status: 'aberta' },
    { id: 's1', descricao: 'Conta do ciclo seguinte', valor_cent: 250000, vencimento: '2027-03-25', status: 'aberta' },
  ]
  const entrada = (extra = {}) => planoDaEntrada({
    valorCent: 500000, data: '2027-03-05', config: { ...cfg, reserva_pct: 10, meta_reserva_cent: 0 }, modelos: modelos2,
    ocorrenciaId: 'm1|2027-03-05', compromissos: contas, ...extra,
  })

  it('ordem fixa: atrasadas, contas do ciclo, reforço do ciclo seguinte, reserva e livre', () => {
    const p = entrada()
    expect(p.proxima).toBe('2027-03-20')
    expect(p.dias).toBe(15)
    expect(p.passos.map((x) => x.id)).toEqual(['atrasadas', 'ciclo', 'deficit', 'reserva', 'livre'])
    const v = Object.fromEntries(p.passos.map((x) => [x.id, x.valor_cent]))
    expect(v.atrasadas).toBe(20080) // 20.000 + 4 dias de juros
    expect(v.ciclo).toBe(150000)
    expect(v.deficit).toBe(50000) // 250.000 de contas contra 200.000 que entram
    expect(v.reserva).toBe(27992) // 10% de 279.920
    expect(v.livre).toBe(251928)
    expect(p.limiteDiario).toBe(16795)
    expect(p.jurosEvitados).toBe(300) // 0,1% ao dia de 20.000, por 15 dias
    expect(p.fecha).toBe(true)
    expect(p.partes.reduce((s, x) => s + x.valor_cent, 0)).toBe(500000) // tudo foi distribuído
  })

  it('entrada menor que as contas: mostra o déficit, nada vai para reserva e o limite é zero', () => {
    const p = entrada({ valorCent: 100000 })
    const v = Object.fromEntries(p.passos.map((x) => [x.id, x.valor_cent]))
    expect(p.fecha).toBe(false)
    expect(p.faltou).toBe(70080)
    expect(v).toMatchObject({ atrasadas: 20080, ciclo: 79920, deficit: 0, reserva: 0, livre: 0 })
    expect(p.limiteDiario).toBe(0)
  })

  it('conta que já foi paga por fora sai do plano', () => {
    const p = entrada({ jaPagas: ['c:c1'] })
    expect(p.passos.find((x) => x.id === 'ciclo').valor_cent).toBe(60000)
  })

  it('reserva respeita a meta e o que já foi guardado', () => {
    const reserva = (extra) => entrada({ config: { ...cfg, reserva_pct: 10, meta_reserva_cent: 20000 }, ...extra }).passos.find((x) => x.id === 'reserva').valor_cent
    expect(reserva({ reservaAtualCent: 5000 })).toBe(15000)
    expect(reserva({ reservaAtualCent: 20000 })).toBe(0)
    expect(reserva({ reservaAtualCent: 99999 })).toBe(0)
  })

  it('sem próxima entrada cadastrada, olha 30 dias', () => {
    const p = planoDaEntrada({ valorCent: 300000, data: '2027-03-05', config: { ...cfg, reserva_pct: 0 }, modelos: [], compromissos: [] })
    expect(p.proxima).toBeNull()
    expect(p.dias).toBe(30)
    expect(p.limiteDiario).toBe(10000)
  })

  it('valor zero', () => {
    const p = entrada({ valorCent: 0 })
    expect(p.livre).toBe(0)
    expect(p.fecha).toBe(false)
  })
})

describe('4.5 parcelas e cartão', () => {
  it('parcela terminando: restante, quanto falta e o mês em que acaba', () => {
    const p = { n_parcelas: 10, parcela_atual: 9, valor_total_cent: 100000, valor_parcela_cent: 10000, primeira_data: '2026-06-10' }
    expect(resumoParcelamento(p)).toEqual({ restantes: 1, falta: 10000, terminaEm: '2027-03-10' })
    expect(resumoParcelamento({ ...p, parcela_atual: 10 })).toEqual({ restantes: 0, falta: 0, terminaEm: null })
    // a última parcela absorve a diferença de centavos
    expect(gerarParcelas({ total: 100001, parcela: 10000, n: 10, jaPagas: 9, proximoVenc: '2027-03-10' })).toEqual([{ numero: 10, vencimento: '2027-03-10', valor_cent: 10001 }])
  })

  it('compra no cartão no dia exato do fechamento entra na fatura que fecha naquele dia', () => {
    const cartao = { fechamento_dia: 20, vencimento_dia: 28 }
    expect(faturaDaCompra('2027-03-20', cartao)).toEqual({ ref_mes: '2027-03-01', fechamento: '2027-03-20', vencimento: '2027-03-28' })
    expect(faturaDaCompra('2027-03-19', cartao).ref_mes).toBe('2027-03-01')
    expect(faturaDaCompra('2027-03-21', cartao)).toEqual({ ref_mes: '2027-04-01', fechamento: '2027-04-20', vencimento: '2027-04-28' })
  })

  it('fatura que cruza o mês: fecha dia 25 e vence dia 5 do mês seguinte, inclusive na virada do ano', () => {
    const cartao = { fechamento_dia: 25, vencimento_dia: 5 }
    expect(faturaDaCompra('2027-03-10', cartao)).toEqual({ ref_mes: '2027-03-01', fechamento: '2027-03-25', vencimento: '2027-04-05' })
    expect(faturaDaCompra('2027-12-26', cartao)).toEqual({ ref_mes: '2028-01-01', fechamento: '2028-01-25', vencimento: '2028-02-05' })
    expect(faturaDaCompra('2027-12-10', cartao)).toEqual({ ref_mes: '2027-12-01', fechamento: '2027-12-25', vencimento: '2028-01-05' })
  })

  it('parcelas 2…n caem nas faturas seguintes (fechamento dia 31 respeita o mês curto)', () => {
    const lista = parcelasNoCartao({ dataCompra: '2027-01-31', cartao: { fechamento_dia: 31, vencimento_dia: 10 }, valores: [100, 100, 100] })
    expect(lista.map((x) => x.fechamento)).toEqual(['2027-01-31', '2027-02-28', '2027-03-31'])
    expect(lista.map((x) => x.vencimento)).toEqual(['2027-02-10', '2027-03-10', '2027-04-10'])
    expect(lista.map((x) => x.numero)).toEqual([1, 2, 3])
  })
})

describe('contas recorrentes', () => {
  const mensal = { id: 'r1', descricao: 'Assinatura', valor_cent: 3000, vencimento: '2027-01-31', recorrencia: 'mensal', dia_venc: 31, prioridade: 'adiavel', status: 'aberta' }

  it('gera 90 dias à frente, respeitando mês curto', () => {
    const novas = ocorrenciasRecorrentes({ modelos: [mensal], hoje: '2027-02-10' })
    expect(novas.map((x) => x.vencimento)).toEqual(['2027-02-28', '2027-03-31', '2027-04-30'])
    expect(novas[0]).toMatchObject({ origem_id: 'r1', descricao: 'Assinatura', valor_cent: 3000, status: 'aberta', prioridade: 'adiavel' })
  })

  it('não duplica: só devolve o que ainda não existe e rodar de novo não gera nada', () => {
    const existentes = [{ origem_id: 'r1', vencimento: '2027-03-31' }]
    const novas = ocorrenciasRecorrentes({ modelos: [mensal], hoje: '2027-02-10', existentes })
    expect(novas.map((x) => x.vencimento)).toEqual(['2027-02-28', '2027-04-30'])
    const tudo = novas.map((x) => ({ origem_id: x.origem_id, vencimento: x.vencimento })).concat(existentes)
    expect(ocorrenciasRecorrentes({ modelos: [mensal], hoje: '2027-02-10', existentes: tudo })).toEqual([])
  })

  it('não gera datas passadas nem de série cancelada; a janela anda com o tempo', () => {
    const velha = { ...mensal, id: 'r2', vencimento: '2026-01-10', dia_venc: 10 }
    expect(ocorrenciasRecorrentes({ modelos: [velha], hoje: '2027-02-10' }).map((x) => x.vencimento)).toEqual(['2027-02-10', '2027-03-10', '2027-04-10', '2027-05-10'])
    expect(ocorrenciasRecorrentes({ modelos: [{ ...mensal, status: 'cancelada' }], hoje: '2027-02-10' })).toEqual([])
    expect(ocorrenciasRecorrentes({ modelos: [{ ...mensal, recorrencia: 'unica' }], hoje: '2027-02-10' })).toEqual([])
    expect(ocorrenciasRecorrentes({ modelos: [velha], hoje: '2027-03-12' }).map((x) => x.vencimento)).toEqual(['2027-04-10', '2027-05-10', '2027-06-10'])
  })

  it('anual gera só quando entra na janela de 90 dias', () => {
    const anual = { ...mensal, id: 'r3', recorrencia: 'anual', vencimento: '2026-06-15', dia_venc: 15 }
    expect(ocorrenciasRecorrentes({ modelos: [anual], hoje: '2027-03-01' })).toEqual([])
    expect(ocorrenciasRecorrentes({ modelos: [anual], hoje: '2027-04-01' }).map((x) => x.vencimento)).toEqual(['2027-06-15'])
  })
})

describe('calendário', () => {
  it('monta as semanas do mês (domingo a sábado)', () => {
    const fev = gradeDoMes(2027, 2) // 01/02/2027 é segunda
    expect(fev).toHaveLength(5)
    expect(fev[0][0]).toBeNull()
    expect(fev[0][1]).toBe('2027-02-01')
    expect(fev[4][6]).toBeNull()
    expect(fev.flat().filter(Boolean)).toHaveLength(28)
  })
})
