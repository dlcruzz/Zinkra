import { describe, it, expect } from 'vitest'
import { calcularProjeto, calcularCarteira, linhaDoTempo, validarValor, avisoRecebimento, avisoAbatimento, semDuplicidade, mesesCobrados, valorDoItem, resumoComanda, faturamento, datasDeCobranca, resumoSaas, faturado, previsaoDoSaldo, saldoPrevistoAte } from './financeiro'

// Valores abaixo são só de teste (nada disso vai para o banco).
const v = (amount_cents, extra = {}) => ({ amount_cents, ...extra })

describe('projeto com parceiro e comissão fixa (caso de referência do briefing)', () => {
  const fin = calcularProjeto({
    valores: [v(350000), v(120000)],
    recebimentos: [v(105000), v(120000), v(150000)],
    parceiro: { kind: 'fixa', amount_cents: 104000 },
    pagamentos: [v(50000)],
    abatimentos: [v(15000)],
  })
  it('valor total = base + adicional', () => expect(fin.valorTotal).toBe(470000))
  it('total recebido', () => expect(fin.recebido).toBe(375000))
  it('falta receber é R$ 950,00 (não R$ 900,00: os R$ 50,00 de diferença não são corrigidos)', () => {
    expect(fin.faltaReceber).toBe(95000)
    expect(fin.faltaReceber).not.toBe(90000)
  })
  it('comissão total fixa de R$ 1.040,00', () => expect(fin.comissaoTotal).toBe(104000))
  it('comissão a pagar = 1.040 − 500 − 150 = R$ 390,00', () => expect(fin.comissaoAPagar).toBe(39000))
  it('lucro previsto = total − comissão + abatimentos', () => expect(fin.lucroPrevisto).toBe(470000 - 104000 + 15000))
  it('sem alertas e não está quitado', () => { expect(fin.alertas).toEqual([]); expect(fin.quitado).toBe(false) })
})

describe('comissão percentual', () => {
  it('aplica o percentual sobre o total (com adicionais)', () => {
    const fin = calcularProjeto({ valores: [v(300000), v(100000)], parceiro: { kind: 'percentual', pct: 30 } })
    expect(fin.comissaoTotal).toBe(120000)
    expect(fin.comissaoAPagar).toBe(120000)
  })
  it('percentual fracionado arredonda em centavos inteiros', () => {
    const fin = calcularProjeto({ valores: [v(100001)], parceiro: { kind: 'percentual', pct: 12.5 } })
    expect(fin.comissaoTotal).toBe(12500) // 12.500,125 centavos
    expect(Number.isInteger(fin.comissaoTotal)).toBe(true)
  })
  it('acompanha o total quando entra um adicional', () => {
    const base = { parceiro: { kind: 'percentual', pct: 10 } }
    expect(calcularProjeto({ ...base, valores: [v(100000)] }).comissaoTotal).toBe(10000)
    expect(calcularProjeto({ ...base, valores: [v(100000), v(50000)] }).comissaoTotal).toBe(15000)
  })
})

describe('projeto sem parceiro', () => {
  const fin = calcularProjeto({ valores: [v(200000)], recebimentos: [v(50000)], pagamentos: [v(1000)], abatimentos: [v(500)] })
  it('não tem comissão e ignora pagamentos soltos', () => {
    expect(fin.temParceiro).toBe(false)
    expect(fin.comissaoTotal).toBe(0)
    expect(fin.comissaoAPagar).toBe(0)
    expect(fin.creditoComParceiro).toBe(0)
  })
  it('lucro é o valor total', () => expect(fin.lucroPrevisto).toBe(200000))
  it('quita quando recebe tudo', () => {
    expect(calcularProjeto({ valores: [v(200000)], recebimentos: [v(200000)] }).quitado).toBe(true)
  })
})

describe('recebimento acima do total', () => {
  const fin = calcularProjeto({ valores: [v(100000)], recebimentos: [v(80000), v(30000)] })
  it('falta receber não fica negativa e o excedente aparece', () => {
    expect(fin.faltaReceber).toBe(0)
    expect(fin.excedenteRecebido).toBe(10000)
  })
  it('gera alerta e aviso (sem bloquear)', () => {
    expect(fin.alertas).toContain('recebido_acima_do_total')
    expect(avisoRecebimento(calcularProjeto({ valores: [v(100000)], recebimentos: [v(80000)] }), 30000)).toMatch(/passa do valor/)
    expect(avisoRecebimento(calcularProjeto({ valores: [v(100000)], recebimentos: [v(80000)] }), 20000)).toBe('')
  })
})

describe('abatimento maior que a comissão a pagar', () => {
  const fin = calcularProjeto({
    valores: [v(500000)], parceiro: { kind: 'fixa', amount_cents: 100000 },
    pagamentos: [v(80000)], abatimentos: [v(50000)],
  })
  it('o saldo a pagar não fica negativo: vira crédito com o parceiro, com alerta', () => {
    expect(fin.comissaoAPagar).toBe(0)
    expect(fin.creditoComParceiro).toBe(30000)
    expect(fin.alertas).toContain('abatimento_maior_que_saldo')
  })
  it('avisa antes de registrar um abatimento maior que o saldo', () => {
    const antes = calcularProjeto({ valores: [v(500000)], parceiro: { kind: 'fixa', amount_cents: 100000 }, pagamentos: [v(80000)] })
    expect(avisoAbatimento(antes, 50000)).toMatch(/maior que a comissão/)
    expect(avisoAbatimento(antes, 20000)).toBe('')
  })
  it('pagamento acima do combinado tem alerta próprio', () => {
    const f = calcularProjeto({ valores: [v(500000)], parceiro: { kind: 'fixa', amount_cents: 100000 }, pagamentos: [v(120000)] })
    expect(f.alertas).toContain('comissao_paga_a_mais')
  })
})

describe('validação de valor', () => {
  it('recusa zero, negativo e não inteiro', () => {
    expect(validarValor(0)).not.toBe('')
    expect(validarValor(-100)).not.toBe('')
    expect(validarValor(10.5)).not.toBe('')
    expect(validarValor(NaN)).not.toBe('')
  })
  it('aceita valor positivo inteiro', () => expect(validarValor(100)).toBe(''))
})

describe('linha do tempo', () => {
  it('junta tudo em ordem de data, mais recente primeiro', () => {
    const t = linhaDoTempo({
      valores: [v(1, { on_date: '2026-01-10' })],
      recebimentos: [v(2, { received_on: '2026-03-01' })],
      pagamentos: [v(3, { paid_on: '2026-02-01' })],
      abatimentos: [v(4, { on_date: '2026-02-15' })],
    })
    expect(t.map((x) => x.tipo)).toEqual(['recebimento', 'abatimento', 'pagamento', 'valor'])
  })
})

describe('carteira e duplicidade', () => {
  const f = {
    valores: [{ project_id: 'a', amount_cents: 100000 }, { project_id: 'b', amount_cents: 50000 }],
    recebimentos: [{ project_id: 'a', amount_cents: 40000 }],
    parceiros: [{ project_id: 'a', kind: 'fixa', amount_cents: 20000 }],
    pagamentos: [], abatimentos: [],
  }
  it('soma só projetos do modelo novo', () => {
    const { linhas, totais } = calcularCarteira(f, [{ id: 'a' }, { id: 'b' }, { id: 'c' }])
    expect(linhas).toHaveLength(2)
    expect(totais.valorTotal).toBe(150000)
    expect(totais.faltaReceber).toBe(110000)
    expect(totais.comissaoAPagar).toBe(20000)
  })
  it('tira do fluxo as parcelas do contrato de um projeto do modelo novo', () => {
    const w = {
      projects: [{ id: 'a', contract_id: 'k1' }, { id: 'z', contract_id: 'k2' }],
      receivables: [{ id: 1, contract_id: 'k1' }, { id: 2, contract_id: 'k2' }],
      commissions: [{ contract_id: 'k1', payable_id: 'p1' }],
      payables: [{ id: 'p1' }, { id: 'p2' }],
    }
    const r = semDuplicidade(w, f)
    expect(r.receivables.map((x) => x.id)).toEqual([2])
    expect(r.payables.map((x) => x.id)).toEqual(['p2'])
  })
})
describe('comanda: adicional meses depois entra na mesma conta', () => {
  const base = { id: 'i1', kind: 'base', amount_cents: 350000 }
  it('um adicional novo soma no total sem criar projeto', () => {
    const antes = calcularProjeto({ valores: [base], recebimentos: [v(350000)] })
    expect(antes.faltaReceber).toBe(0)
    const depois = calcularProjeto({ valores: [base, { id: 'i2', kind: 'adicional', amount_cents: 80000 }], recebimentos: [v(350000)] })
    expect(depois.valorTotal).toBe(430000)
    expect(depois.faltaReceber).toBe(80000)
  })
  it('resumo por item mostra quanto entrou apontando para cada um', () => {
    const r = resumoComanda({
      valores: [base, { id: 'i2', kind: 'adicional', amount_cents: 80000 }],
      recebimentos: [v(200000, { valor_id: 'i1' }), v(80000, { valor_id: 'i2' }), v(50000)],
    })
    expect(r.itens.map((i) => [i.cobrado, i.recebido])).toEqual([[350000, 200000], [80000, 80000]])
    expect(r.semItem).toBe(50000)
    expect(r.recebido).toBe(330000)
    expect(r.faltaReceber).toBe(100000)
  })
})

describe('mensalidade', () => {
  const m = (extra = {}) => ({ id: 'm1', kind: 'mensalidade', amount_cents: 45000, starts_on: '2026-11-05', ...extra })
  it('antes do início não cobra nada', () => expect(mesesCobrados(m(), '2026-11-04')).toBe(0))
  it('no dia do início cobra o primeiro mês', () => expect(mesesCobrados(m(), '2026-11-05')).toBe(1))
  it('conta um mês novo a cada dia de cobrança', () => {
    expect(mesesCobrados(m(), '2026-12-04')).toBe(1)
    expect(mesesCobrados(m(), '2026-12-05')).toBe(2)
    expect(mesesCobrados(m(), '2027-11-05')).toBe(13)
  })
  it('para de cobrar depois do fim', () => {
    expect(mesesCobrados(m({ ends_on: '2027-01-04' }), '2028-01-01')).toBe(2)
  })
  it('início no dia 31 cobra no dia 28 dos meses curtos', () => {
    expect(mesesCobrados(m({ starts_on: '2026-01-31' }), '2026-02-28')).toBe(2)
  })
  it('entra no valor total e no que falta receber', () => {
    const fin = calcularProjeto({ valores: [m()], recebimentos: [v(45000)], hoje: '2027-01-10' })
    expect(valorDoItem(m(), '2027-01-10')).toBe(45000 * 3)
    expect(fin.valorTotal).toBe(135000)
    expect(fin.faltaReceber).toBe(90000)
  })
})

describe('faturamento por período', () => {
  const hoje = '2026-11-10'
  const r = (amount_cents, received_on) => ({ amount_cents, received_on })
  const dados = [r(1000, '2026-11-10'), r(2000, '2026-11-04'), r(4000, '2026-10-20'), r(8000, '2026-06-01'), r(16000, '2025-11-12'), r(500, '2026-05-01'), r(32000, null), r(64000, '2026-12-01')]
  const fat = faturamento(dados, hoje)
  const por = (id) => fat.janelas.find((j) => j.id === id).valor
  it('total só conta o que já foi recebido até hoje', () => expect(fat.total).toBe(1000 + 2000 + 4000 + 8000 + 16000 + 500))
  it('semana = últimos 7 dias incluindo hoje', () => expect(por('semana')).toBe(3000))
  it('15 dias, mês, 3 meses, 6 meses e 1 ano', () => {
    expect(por('quinzena')).toBe(3000)
    expect(por('mes')).toBe(7000)
    expect(por('tri')).toBe(7000)
    expect(por('sem')).toBe(15000)
    expect(por('ano')).toBe(31500)
  })
  it('traz o período anterior de mesmo tamanho para comparar', () => {
    expect(fat.janelas.find((j) => j.id === 'mes').anterior).toBe(0)
    expect(fat.janelas.find((j) => j.id === 'sem').anterior).toBe(500)
  })
  it('sem lançamentos tudo vem zerado', () => {
    const z = faturamento([], hoje)
    expect(z.total).toBe(0)
    expect(z.janelas.every((j) => j.valor === 0 && j.anterior === 0)).toBe(true)
  })
})
describe('datas de cobrança da mensalidade', () => {
  it('uma data por mês cobrado, no dia do início (31 vira 28)', () => {
    expect(datasDeCobranca({ kind: 'mensalidade', amount_cents: 1, starts_on: '2026-01-31' }, '2026-03-30'))
      .toEqual(['2026-01-28', '2026-02-28', '2026-03-28'])
  })
  it('vira o ano certo', () => {
    expect(datasDeCobranca({ kind: 'mensalidade', amount_cents: 1, starts_on: '2026-11-05' }, '2027-01-06'))
      .toEqual(['2026-11-05', '2026-12-05', '2027-01-05'])
  })
})

describe('financeiro SaaS', () => {
  const dados = {
    produtos: [{ id: 's1', name: 'App' }],
    assinaturas: [
      { id: 'a1', produto_id: 's1', amount_cents: 4000, starts_on: '2026-09-10', ends_on: null },
      { id: 'a2', produto_id: 's1', amount_cents: 9000, starts_on: '2026-01-01', ends_on: '2026-03-31' },
    ],
    recebimentos: [{ produto_id: 's1', assinatura_id: 'a1', amount_cents: 4000, received_on: '2026-10-10' }],
  }
  const r = resumoSaas(dados, '2026-11-12')
  it('MRR só conta assinatura vigente', () => { expect(r.mrr).toBe(4000); expect(r.assinantes).toBe(1) })
  it('em aberto = mensalidades vencidas sem recebimento ligado', () => {
    const a1 = r.assinaturas.find((l) => l.assinatura.id === 'a1')
    expect(a1.meses).toBe(3)
    expect(a1.emAberto).toBe(8000)
    expect(r.assinaturas.find((l) => l.assinatura.id === 'a2').emAberto).toBe(27000)
    expect(r.emAberto).toBe(35000)
  })
  it('recebido total e do mês', () => { expect(r.recebidoTotal).toBe(4000); expect(r.recebidoMes).toBe(0) })
  it('resumo por produto', () => expect(r.porProduto[0]).toMatchObject({ mrr: 4000, assinantes: 1, recebido: 4000 }))
  it('sem dados tudo zero', () => expect(resumoSaas({}, '2026-11-12')).toMatchObject({ mrr: 0, recebidoTotal: 0, emAberto: 0 }))
})

describe('faturado (valor fechado) x recebido', () => {
  const hoje = '2026-11-03'
  const w = {
    clients: [{ id: 'c1', name: 'Cliente A' }, { id: 'c2', name: 'Cliente B' }],
    projects: [{ id: 'p1', client_id: 'c1', name: 'Sistema X' }],
    contracts: [{ id: 'k1', client_id: 'c2', title: 'Site' }],
    fin: {
      valores: [
        { project_id: 'p1', kind: 'base', amount_cents: 300000, on_date: '2026-10-01' },
        { project_id: 'p1', kind: 'adicional', amount_cents: 100000, on_date: '2026-10-20' },
      ],
      recebimentos: [{ project_id: 'p1', amount_cents: 250000, received_on: '2026-10-05' }],
    },
    receivables: [
      { id: 'r1', contract_id: 'k1', client_id: 'c2', amount_cents: 50000, due_on: '2026-10-10', received_on: '2026-10-11' },
      { id: 'r2', contract_id: 'k1', client_id: 'c2', amount_cents: 30000, due_on: '2026-10-25', received_on: null },
      { id: 'r3', contract_id: 'k1', client_id: 'c2', amount_cents: 30000, due_on: '2026-12-25', received_on: null },
      { id: 'proj-rec-a', amount_cents: 250000, due_on: '2026-10-05', received_on: '2026-10-05' },
      { id: 'saas-rec-b', amount_cents: 4000, due_on: '2026-11-02', received_on: '2026-11-02' },
    ],
    saas: { produtos: [{ id: 's1', name: 'App' }], recebimentos: [{ produto_id: 's1', amount_cents: 4000, received_on: '2026-11-02' }] },
  }
  const f = faturado(w, hoje)
  it('faturado conta o valor fechado do projeto, mesmo sem ter recebido tudo', () => {
    expect(f.total).toBe(300000 + 100000 + 50000 + 30000 + 4000)
  })
  it('parcela futura não é faturada ainda', () => expect(f.total).not.toBe(300000 + 100000 + 50000 + 30000 + 30000 + 4000))
  it('recebido só conta o que entrou, sem contar duas vezes', () => {
    expect(f.recebido).toBe(250000 + 50000 + 4000)
    expect(f.falta).toBe(f.total - f.recebido)
  })
  it('origem por cliente/projeto, contrato e SaaS', () => {
    expect(f.porOrigem).toEqual([
      { origem: 'Cliente A · Sistema X', faturado: 400000, recebido: 250000 },
      { origem: 'Cliente B · Site', faturado: 80000, recebido: 50000 },
      { origem: 'SaaS · App', faturado: 4000, recebido: 4000 },
    ])
  })
  it('alimenta os períodos pela data de cada lançamento', () => {
    const por = (id) => faturamento(f.lancamentos, hoje).janelas.find((j) => j.id === id).valor
    expect(por('semana')).toBe(4000)
    expect(por('mes')).toBe(f.total - 300000) // o item de 01/10 já saiu da janela de 30 dias
    expect(por('tri')).toBe(f.total)
  })
  it('mensalidade de projeto entra mês a mês', () => {
    const w2 = { ...w, fin: { valores: [{ project_id: 'p1', kind: 'mensalidade', amount_cents: 45000, starts_on: '2026-09-05' }], recebimentos: [] }, receivables: [], saas: null }
    expect(faturado(w2, hoje).total).toBe(45000 * 2) // 05/09 e 05/10; o de 05/11 ainda não venceu
  })
})
describe('previsão de receber o saldo do projeto', () => {
  const f = {
    valores: [{ project_id: 'p1', kind: 'base', amount_cents: 100000 }, { project_id: 'p2', kind: 'base', amount_cents: 50000 }],
    recebimentos: [{ project_id: 'p1', amount_cents: 40000 }],
    comandas: [
      { project_id: 'p1', status: 'aberta', receber_previsto_em: '2026-11-20' },
      { project_id: 'p2', status: 'aberta', receber_previsto_em: null },
    ],
  }
  const { linhas } = calcularCarteira(f, [{ id: 'p1' }, { id: 'p2' }])
  it('a carteira traz a previsão da comanda aberta', () => expect(linhas.map((l) => l.previsao)).toEqual(['2026-11-20', null]))
  it('previsaoDoSaldo ignora comanda encerrada', () => {
    expect(previsaoDoSaldo({ comandas: [{ project_id: 'p1', status: 'encerrada', receber_previsto_em: '2026-11-20' }] }, 'p1')).toBeNull()
  })
  it('só entra no a receber o saldo com previsão até a data', () => {
    expect(saldoPrevistoAte(linhas, '2026-12-03')).toBe(60000)
    expect(saldoPrevistoAte(linhas, '2026-11-10')).toBe(0)
  })
})
