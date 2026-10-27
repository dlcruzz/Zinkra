// Etapa 5: leitura de extrato. Todos os arquivos abaixo são INVENTADOS (nomes e valores sem relação com ninguém).
import { describe, it, expect } from 'vitest'
import {
  decodificar, detectarFormato, parseValor, parseData, parseOFX, parseCSV, lerExtrato, prepararLinhas, normalizarDescricao,
  trechoDaDescricao, categorizar, proporConciliacoes, resumoDaPrevia, ErroExtrato,
} from './extrato'

const OFX_V1 = `OFXHEADER:100
DATA:OFXSGML
VERSION:102
CHARSET:1252

<OFX>
<BANKMSGSRSV1><STMTTRNRS><STMTRS>
<BANKTRANLIST>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20270302120000[-3:BRT]
<TRNAMT>-150.00
<FITID>0001
<MEMO>COMPRA MERCADO EXEMPLO 123
</STMTTRN>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20270303
<TRNAMT>2500.50
<FITID>0002
<NAME>EMPRESA TESTE
<MEMO>PAGAMENTO
</STMTTRN>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20270303
<TRNAMT>-12,30
<FITID>0003
<MEMO>Padaria &amp; Café
</STMTTRN>
</BANKTRANLIST>
</STMTRS></STMTTRNRS></BANKMSGSRSV1>
</OFX>`

const OFX_XML = `<?xml version="1.0"?><OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><BANKTRANLIST>
<STMTTRN><TRNTYPE>DEBIT</TRNTYPE><DTPOSTED>20270305000000</DTPOSTED><TRNAMT>-45.90</TRNAMT><FITID>9</FITID><MEMO>ASSINATURA STREAMING</MEMO></STMTTRN>
</BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>`

const CSV_PONTO_E_VIRGULA = `Extrato de conta corrente (exemplo)
Conta: 0000-0 | Período: 01/03/2027 a 31/03/2027

Data;Histórico;Docto.;Situação;Crédito (R$);Débito (R$);Saldo (R$)
01/03/2027;SALDO ANTERIOR;;;;;1.000,00
02/03/2027;COMPRA MERCADO EXEMPLO;123;Ok;;150,00;850,00
03/03/2027;PAGAMENTO EMPRESA TESTE;456;Ok;2.500,50;;3.350,50
03/03/2027;PADARIA DO ZÉ;789;Ok;;12,30;3.338,20
Total;;;;2.500,50;162,30;
`

const CSV_VIRGULA_VALOR = `Data,Descrição,Valor
2027-03-02,"Mercado, loja 5",-150.00
2027-03-03,Salário exemplo,2500.50
`

describe('números e datas', () => {
  it('lê os formatos de valor mais comuns', () => {
    expect(parseValor('1.234,56')).toBe(123456)
    expect(parseValor('-1.234,56')).toBe(-123456)
    expect(parseValor('R$ 50,00')).toBe(5000)
    expect(parseValor('(50,00)')).toBe(-5000)
    expect(parseValor('50,00-')).toBe(-5000)
    expect(parseValor('-150.00')).toBe(-15000)
    expect(parseValor('1,234.56')).toBe(123456)
    expect(parseValor('1.234')).toBe(123400)
    expect(parseValor('0.5')).toBe(50)
    expect(parseValor('0,05')).toBe(5)
    expect(parseValor('')).toBeNull()
    expect(parseValor('abc')).toBeNull()
  })

  it('lê datas em vários formatos e recusa as inválidas', () => {
    expect(parseData('25/12/2027')).toBe('2027-12-25')
    expect(parseData('5/3/27')).toBe('2027-03-05')
    expect(parseData('2027-03-05')).toBe('2027-03-05')
    expect(parseData('20270305120000[-3:BRT]')).toBe('2027-03-05')
    expect(parseData('31/02/2027')).toBeNull()
    expect(parseData('Total')).toBeNull()
  })
})

describe('codificação', () => {
  it('arquivo em Windows-1252 mantém os acentos', () => {
    const bytes = Buffer.from('Data;Histórico\n01/03/2027;PADARIA DO ZÉ', 'latin1')
    expect(decodificar(bytes)).toContain('Histórico')
    expect(decodificar(bytes)).toContain('ZÉ')
  })
  it('arquivo em UTF-8 (com BOM) também', () => {
    const bytes = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from('Histórico', 'utf8')])
    expect(decodificar(bytes)).toBe('Histórico')
  })
})

describe('OFX', () => {
  it('lê o formato antigo (SGML, sem fechar tags)', () => {
    expect(detectarFormato(OFX_V1)).toBe('ofx')
    const l = parseOFX(OFX_V1)
    expect(l).toHaveLength(3)
    expect(l[0]).toEqual({ data: '2027-03-02', valor_cent: -15000, descricao: 'COMPRA MERCADO EXEMPLO 123', id_externo: '0001' })
    expect(l[1]).toMatchObject({ data: '2027-03-03', valor_cent: 250050, descricao: 'EMPRESA TESTE PAGAMENTO' })
    expect(l[2]).toMatchObject({ valor_cent: -1230, descricao: 'Padaria & Café' })
  })

  it('lê o formato novo (XML)', () => {
    expect(parseOFX(OFX_XML)).toEqual([{ data: '2027-03-05', valor_cent: -4590, descricao: 'ASSINATURA STREAMING', id_externo: '9' }])
  })

  it('erro claro quando não há lançamentos ou o lançamento é ilegível', () => {
    expect(() => parseOFX('<OFX><BANKMSGSRSV1></BANKMSGSRSV1></OFX>')).toThrow(ErroExtrato)
    expect(() => parseOFX('<OFX><STMTTRN><TRNTYPE>DEBIT<MEMO>x</STMTTRN></OFX>')).toThrow(/sem data ou valor/)
  })
})

describe('CSV', () => {
  it('lê o formato com Crédito e Débito, cabeçalho no meio e linhas de saldo/total', () => {
    const l = parseCSV(CSV_PONTO_E_VIRGULA)
    expect(l.map((x) => [x.data, x.valor_cent, x.descricao])).toEqual([
      ['2027-03-02', -15000, 'COMPRA MERCADO EXEMPLO'],
      ['2027-03-03', 250050, 'PAGAMENTO EMPRESA TESTE'],
      ['2027-03-03', -1230, 'PADARIA DO ZÉ'],
    ])
  })

  it('lê o formato com coluna Valor, vírgula e aspas', () => {
    const l = parseCSV(CSV_VIRGULA_VALOR)
    expect(l.map((x) => [x.data, x.valor_cent, x.descricao])).toEqual([['2027-03-02', -15000, 'Mercado, loja 5'], ['2027-03-03', 250050, 'Salário exemplo']])
  })

  it('erro claro quando o formato muda', () => {
    expect(() => parseCSV('a;b;c\n1;2;3')).toThrow(/colunas/)
    expect(() => parseCSV('Data;Descrição;Valor\nx;y;z')).toThrow(/nenhuma linha/)
    expect(() => parseCSV('só uma linha')).toThrow(ErroExtrato)
  })

  it('lerExtrato escolhe o leitor pelo conteúdo e acerta a codificação', () => {
    expect(lerExtrato(Buffer.from(CSV_PONTO_E_VIRGULA, 'latin1')).linhas[2].descricao).toBe('PADARIA DO ZÉ')
    expect(lerExtrato(Buffer.from(OFX_XML, 'utf8')).formato).toBe('ofx')
  })
})

describe('deduplicação por hash', () => {
  const base = [
    { data: '2027-03-02', valor_cent: -1000, descricao: 'Café do Zé' },
    { data: '2027-03-02', valor_cent: -1000, descricao: 'CAFE DO ZE' }, // igual no mesmo dia: 2ª posição
    { data: '2027-03-02', valor_cent: -1000, descricao: 'Outro lugar' },
  ]

  it('mesma linha gera o mesmo hash em importações diferentes', () => {
    const a = prepararLinhas(base), b = prepararLinhas([...base])
    expect(a.map((l) => l.hash)).toEqual(b.map((l) => l.hash))
  })

  it('duas compras iguais no mesmo dia têm hashes diferentes (posição no dia)', () => {
    const l = prepararLinhas(base)
    expect(l[0].pos).toBe(1)
    expect(l[1].pos).toBe(2)
    expect(new Set(l.map((x) => x.hash)).size).toBe(3)
  })

  it('arquivo com período sobreposto repete os mesmos hashes nas linhas em comum', () => {
    const marco = prepararLinhas([{ data: '2027-03-30', valor_cent: -500, descricao: 'Padaria' }, { data: '2027-03-31', valor_cent: -700, descricao: 'Táxi' }])
    const sobreposto = prepararLinhas([{ data: '2027-03-31', valor_cent: -700, descricao: 'Táxi' }, { data: '2027-04-01', valor_cent: -900, descricao: 'Mercado' }])
    expect(marco[1].hash).toBe(sobreposto[0].hash)
    expect(marco[0].hash).not.toBe(sobreposto[1].hash)
  })

  it('acento, caixa e pontuação não mudam o hash', () => {
    const [a] = prepararLinhas([{ data: '2027-03-02', valor_cent: -1, descricao: 'Padaria São João!' }])
    const [b] = prepararLinhas([{ data: '2027-03-02', valor_cent: -1, descricao: 'PADARIA SAO JOAO' }])
    expect(a.hash).toBe(b.hash)
    expect(normalizarDescricao('Padaria São João!')).toBe('PADARIA SAO JOAO')
  })
})

describe('categorias e regras que aprendem', () => {
  it('trecho = as duas primeiras palavras que dizem alguma coisa', () => {
    expect(trechoDaDescricao('PIX ENVIADO MERCADO EXEMPLO 12345')).toBe('MERCADO EXEMPLO')
    expect(trechoDaDescricao('COMPRA CARTAO 4455 PADARIA SAO JOAO LTDA')).toBe('PADARIA SAO')
    expect(trechoDaDescricao('PIX 123')).toBe('')
  })

  it('aplica a regra de trecho mais longo', () => {
    const regras = [{ trecho_descricao: 'MERCADO', categoria_id: 'k1' }, { trecho_descricao: 'MERCADO EXEMPLO', categoria_id: 'k2' }]
    expect(categorizar(normalizarDescricao('COMPRA MERCADO EXEMPLO 12'), regras)).toBe('k2')
    expect(categorizar(normalizarDescricao('MERCADO DO BAIRRO'), regras)).toBe('k1')
    expect(categorizar(normalizarDescricao('FARMACIA'), regras)).toBeNull()
  })

  it('regra aprendida de uma correção vale na próxima importação', () => {
    const linha = prepararLinhas([{ data: '2027-03-02', valor_cent: -3000, descricao: 'PIX ENVIADO ACADEMIA FORMA 998' }])[0]
    const regras = [{ trecho_descricao: trechoDaDescricao(linha.descricao), categoria_id: 'k9' }]
    const proxima = prepararLinhas([{ data: '2027-04-02', valor_cent: -3000, descricao: 'PIX ENVIADO ACADEMIA FORMA 112' }])[0]
    expect(categorizar(proxima.descricao_norm, regras)).toBe('k9')
  })
})

describe('conciliação com contas abertas', () => {
  const abertas = [
    { id: 'c:a', tipo: 'conta', ref: 'a', descricao: 'Aluguel', valor_cent: 90000, vencimento: '2027-03-05' },
    { id: 'c:b', tipo: 'conta', ref: 'b', descricao: 'Internet', valor_cent: 9990, vencimento: '2027-03-10' },
    { id: 'p:c', tipo: 'parcela', ref: 'c', descricao: 'Notebook (3/10)', valor_cent: 9990, vencimento: '2027-03-20' },
    { id: 'd:x|2027-03', tipo: 'divida', ref: 'x', descricao: 'Dívida: Banco', valor_cent: 5000, vencimento: '2027-03-06' },
  ]
  const linhas = prepararLinhas([
    { data: '2027-03-04', valor_cent: -90000, descricao: 'PAGAMENTO ALUGUEL IMOBILIARIA' },
    { data: '2027-03-11', valor_cent: -9990, descricao: 'DEBITO AUTOMATICO INTERNET FIBRA' },
    { data: '2027-03-06', valor_cent: -5000, descricao: 'PAGAMENTO BANCO' },
    { data: '2027-03-07', valor_cent: -123, descricao: 'SEM PAR' },
    { data: '2027-03-08', valor_cent: 90000, descricao: 'ENTRADA IGUAL AO ALUGUEL' },
  ])

  it('propõe a conta com mesmo valor e vencimento perto', () => {
    const r = proporConciliacoes(linhas, abertas)
    expect(r[0].id).toBe('c:a')
    expect(r[1].id).toBe('c:b') // a Internet e o Notebook têm o mesmo valor: vence a mais próxima/parecida
  })

  it('não concilia dívida, entrada, valor diferente nem vencimento longe; cada conta só uma vez', () => {
    const r = proporConciliacoes(linhas, abertas)
    expect(r[2]).toBeUndefined()
    expect(r[3]).toBeUndefined()
    expect(r[4]).toBeUndefined()
    const duas = prepararLinhas([{ data: '2027-03-10', valor_cent: -9990, descricao: 'INTERNET' }, { data: '2027-03-17', valor_cent: -9990, descricao: 'NOTEBOOK' }])
    const r2 = proporConciliacoes(duas, abertas)
    expect(Object.keys(r2)).toHaveLength(2)
    expect(new Set(Object.values(r2).map((o) => o.id)).size).toBe(2)
    expect(proporConciliacoes(prepararLinhas([{ data: '2027-04-30', valor_cent: -90000, descricao: 'ALUGUEL' }]), abertas)).toEqual({})
  })
})

describe('resumo da prévia', () => {
  it('conta novas, já existentes e sem categoria', () => {
    const l = [
      { situacao: 'nova', categoria_id: 'k1' }, { situacao: 'nova', categoria_id: null }, { situacao: 'nova', categoria_id: null, possivel_manual: true },
      { situacao: 'existe' }, { situacao: 'existe' },
    ]
    expect(resumoDaPrevia(l)).toEqual({ novas: 3, existiam: 2, semCategoria: 2, possiveis: 1 })
  })
})
