import { describe, it, expect } from 'vitest'
import { calcularProjeto, calcularCarteira, linhaDoTempo, validarValor, avisoRecebimento, avisoAbatimento, semDuplicidade } from './financeiro'

// Valores abaixo são só de teste (nada disso vai para o banco).
const v = (amount_cents, extra = {}) => ({ amount_cents, ...extra })

describe('projeto com parceiro e comissão fixa (caso King Mídia / André)', () => {
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
