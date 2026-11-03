import { describe, it, expect } from 'vitest'
import { valorEmCentavos, parseOfx, parseCsvExtrato, dataOfx } from './arquivo'
import { extrairContraparte, chaveContraparte, parecenca, sugerir } from './conciliacao'

// Todos os nomes e valores abaixo são inventados, só para teste.

describe('valorEmCentavos', () => {
  it('lê formatos brasileiros e americanos', () => {
    expect(valorEmCentavos('1.234,56')).toBe(123456)
    expect(valorEmCentavos('-1234.56')).toBe(-123456)
    expect(valorEmCentavos('R$ 10')).toBe(1000)
    expect(valorEmCentavos('0,5')).toBe(50)
    expect(valorEmCentavos('1.234')).toBe(123400)
  })
  it('em OFX o ponto é sempre decimal', () => expect(valorEmCentavos('1.234', { pontoDecimal: true })).toBe(123))
  it('texto sem número vira null', () => expect(valorEmCentavos('abc')).toBeNull())
})

const OFX = `OFXHEADER:100
DATA:OFXSGML
CHARSET:1252
<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><BANKACCTFROM><ACCTID>12345-6</BANKACCTFROM>
<BANKTRANLIST>
<STMTTRN><TRNTYPE>CREDIT<DTPOSTED>20261015120000[-3:BRT]<TRNAMT>1200.00<FITID>aaa-1<MEMO>Transferência recebida pelo Pix - MARIA TESTE DA SILVA - •••.111.222-•• - BANCO X</STMTTRN>
<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20261016<TRNAMT>-500.50<FITID>aaa-2<MEMO>Transferência enviada pelo Pix - ANDRE EXEMPLO - •••.333.444-•• - BANCO Y</STMTTRN>
</BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>`

describe('parseOfx', () => {
  const t = parseOfx(OFX)
  it('lê entradas e saídas com valor positivo e sentido', () => {
    expect(t).toHaveLength(2)
    expect(t[0]).toMatchObject({ posted_on: '2026-10-15', amount_cents: 120000, direction: 'entrada' })
    expect(t[1]).toMatchObject({ posted_on: '2026-10-16', amount_cents: 50050, direction: 'saida' })
  })
  it('id externo vem do FITID (estável entre importações)', () => {
    expect(t[0].external_id).toBe('ofx:12345-6:aaa-1')
    expect(parseOfx(OFX).map((x) => x.external_id)).toEqual(t.map((x) => x.external_id))
  })
  it('extrai o nome da contraparte', () => {
    expect(t[0].counterparty).toBe('MARIA TESTE DA SILVA')
    expect(t[1].counterparty).toBe('ANDRE EXEMPLO')
  })
  it('data com fuso', () => expect(dataOfx('20261015120000[-3:BRT]')).toBe('2026-10-15'))
})

describe('parseCsvExtrato', () => {
  const csv = 'Data,Valor,Identificador,Descrição\n15/10/2026,"1.200,00",id-1,Transferência recebida pelo Pix - MARIA TESTE DA SILVA - •••.1 - X\n16/10/2026,-500.50,id-2,Pagamento\n'
  it('lê colunas por nome', () => {
    const t = parseCsvExtrato(csv)
    expect(t).toHaveLength(2)
    expect(t[0]).toMatchObject({ external_id: 'csv:id-1', amount_cents: 120000, direction: 'entrada' })
    expect(t[1]).toMatchObject({ amount_cents: 50050, direction: 'saida' })
  })
  it('sem identificador, duas linhas iguais não colapsam e o id é estável', () => {
    const c = 'Data;Valor;Descrição\n01/10/2026;-10,00;Taxa\n01/10/2026;-10,00;Taxa\n'
    const a = parseCsvExtrato(c), b = parseCsvExtrato(c)
    expect(new Set(a.map((x) => x.external_id)).size).toBe(2)
    expect(a.map((x) => x.external_id)).toEqual(b.map((x) => x.external_id))
  })
  it('erro claro quando faltam colunas', () => expect(() => parseCsvExtrato('a,b\n1,2')).toThrow(/data e valor/))
})

describe('nomes', () => {
  it('chave sem acento e sem pontuação (igual ao banco)', () => expect(chaveContraparte('  JOSÉ  d\'Ávila-ME ')).toBe('jose d avila me'))
  it('parecença ignora ltda e ordem', () => {
    expect(parecenca('MARIA TESTE DA SILVA', 'Maria Teste')).toBe(1)
    expect(parecenca('PADARIA CENTRAL LTDA', 'Padaria Central')).toBe(1)
    expect(parecenca('Carlos Souza', 'Maria Souza')).toBeLessThan(1)
  })
  it('extrai contraparte', () => expect(extrairContraparte('Compra no débito')).toBe(''))
})

describe('sugerir', () => {
  const fin = (faltaReceber, comissaoAPagar = 0) => ({ faltaReceber, comissaoAPagar })
  const projetos = [
    { id: 'p1', name: 'Site Alfa', clientName: 'Maria Teste', fin: fin(0), comissao: null },
    { id: 'p2', name: 'Sistema Beta', clientName: 'Maria Teste', fin: fin(95000), comissao: { partner_name: 'André Exemplo' } },
  ]
  const entrada = { direction: 'entrada', amount_cents: 1, counterparty: 'MARIA TESTE DA SILVA' }
  it('entrada de cliente conhecido vira recebimento do projeto com saldo', () => {
    const s = sugerir(entrada, { projetos })
    expect(s).toMatchObject({ tipo: 'recebimento', alvo: 'p2', origem: 'nome' })
  })
  it('saída para parceiro vira pagamento de comissão', () => {
    const s = sugerir({ direction: 'saida', amount_cents: 5, counterparty: 'ANDRE EXEMPLO' }, { projetos: [{ ...projetos[1], fin: fin(0, 39000) }] })
    expect(s).toMatchObject({ tipo: 'pagamento_comissao', alvo: 'p2' })
  })
  it('regra aprendida tem prioridade sobre o nome', () => {
    const regras = [{ counterparty_key: chaveContraparte('MARIA TESTE DA SILVA'), direction: 'entrada', target_type: 'recebimento', project_id: 'p1' }]
    expect(sugerir(entrada, { projetos, regras })).toMatchObject({ alvo: 'p1', origem: 'regra' })
  })
  it('saída com valor igual ao de uma conta aberta sugere conta a pagar', () => {
    const s = sugerir({ direction: 'saida', amount_cents: 9900, counterparty: 'HOSPEDAGEM XYZ' }, { projetos, contasAbertas: [{ id: 'c1', supplier: 'Hospedagem XYZ', description: 'Servidor', amount_cents: 9900 }] })
    expect(s).toMatchObject({ tipo: 'conta_pagar', alvo: 'c1' })
  })
  it('sem pista nenhuma, não sugere', () => {
    expect(sugerir({ direction: 'entrada', amount_cents: 1, counterparty: 'Desconhecido Total' }, { projetos })).toBeNull()
  })
})
