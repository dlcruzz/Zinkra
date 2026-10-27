// Importação de extrato bancário (OFX e CSV). Tudo roda no navegador e é PURO: o arquivo nunca sai daqui,
// só as linhas já tratadas vão para o banco. Valores em centavos (saída negativa), datas AAAA-MM-DD.
import { daysBetween } from '../format'

export class ErroExtrato extends Error {}

// ---------------------------------------------------------------------------
// Codificação: tenta UTF-8; se o arquivo não for, lê como Windows-1252 (padrão dos bancos brasileiros)
// ---------------------------------------------------------------------------
export function decodificar(buffer) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
  let texto
  try { texto = new TextDecoder('utf-8', { fatal: true }).decode(bytes) } catch { texto = new TextDecoder('windows-1252').decode(bytes) }
  return texto.replace(/^﻿/, '')
}

export const detectarFormato = (texto) => (/<OFX>|OFXHEADER|<STMTTRN>/i.test(texto) ? 'ofx' : 'csv')

// ---------------------------------------------------------------------------
// Números e datas
// ---------------------------------------------------------------------------
// "1.234,56" | "-1234.56" | "R$ 1.234,56" | "(50,00)" | "50,00-" | "1,234.56" -> centavos; null se não for número
export function parseValor(txt) {
  if (txt === null || txt === undefined) return null
  let s = String(txt).trim()
  if (!s) return null
  let neg = false
  if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1) }
  if (/-$/.test(s)) { neg = true; s = s.slice(0, -1) }
  if (/^-/.test(s)) { neg = true; s = s.slice(1) }
  s = s.replace(/R\$|\s| |\+/g, '')
  if (/^-/.test(s)) { neg = !neg; s = s.slice(1) }
  if (!/^[\d.,]+$/.test(s) || !/\d/.test(s)) return null
  const v = s.lastIndexOf(','), p = s.lastIndexOf('.')
  let inteiro, dec = ''
  if (v >= 0 && p >= 0) {
    const sep = Math.max(v, p)
    inteiro = s.slice(0, sep).replace(/[.,]/g, ''); dec = s.slice(sep + 1)
  } else if (v >= 0 || p >= 0) {
    const sep = Math.max(v, p), resto = s.slice(sep + 1)
    const varios = (s.match(/[.,]/g) || []).length > 1
    if (varios || (resto.length === 3 && sep > 0 && s.slice(0, sep) !== '0' && /^\d{1,3}$/.test(s.slice(0, sep)) && s[sep] === '.')) { inteiro = s.replace(/[.,]/g, ''); dec = '' } else { inteiro = s.slice(0, sep); dec = resto }
  } else inteiro = s
  if (dec.length > 2) return null
  const cent = Number(inteiro || '0') * 100 + Number((dec + '00').slice(0, 2))
  return Number.isFinite(cent) ? (neg ? -cent : cent) : null
}

// "25/12/2026" | "25/12/26" | "2026-12-25" | "20261225..." -> AAAA-MM-DD; null se inválida
export function parseData(txt) {
  const s = String(txt ?? '').trim()
  let a, m, d
  let r = s.match(/^(\d{4})-(\d{2})-(\d{2})/) || s.match(/^(\d{4})(\d{2})(\d{2})/)
  if (r) { a = r[1]; m = r[2]; d = r[3] } else {
    r = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/)
    if (!r) return null
    d = r[1].padStart(2, '0'); m = r[2].padStart(2, '0'); a = r[3].length === 2 ? `20${r[3]}` : r[3]
  }
  const dt = new Date(Number(a), Number(m) - 1, Number(d))
  if (dt.getFullYear() !== Number(a) || dt.getMonth() !== Number(m) - 1 || dt.getDate() !== Number(d)) return null
  return `${a}-${m}-${d}`
}

const entidades = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))

// ---------------------------------------------------------------------------
// OFX (versão 1 em SGML, sem fechar as tags, e versão 2 em XML)
// ---------------------------------------------------------------------------
export function parseOFX(texto) {
  const blocos = texto.match(/<STMTTRN>[\s\S]*?(?=<\/STMTTRN>|<STMTTRN>|<\/BANKTRANLIST>|<\/CCSTMTTRNRS>|<\/STMTRS>|$)/gi) || []
  if (!blocos.length) throw new ErroExtrato('Não encontrei lançamentos nesse arquivo OFX. O formato do banco pode ter mudado; se ele abre normalmente no app do banco, tente exportar em CSV.')
  const pega = (b, tag) => { const r = b.match(new RegExp(`<${tag}>([^<\\r\\n]*)`, 'i')); return r ? entidades(r[1].trim()) : '' }
  const linhas = []
  for (const b of blocos) {
    const data = parseData(pega(b, 'DTPOSTED'))
    const valor = parseValor(pega(b, 'TRNAMT'))
    if (!data || valor === null) throw new ErroExtrato('Um lançamento do OFX veio sem data ou valor legível. O formato do arquivo pode ter mudado.')
    const memo = pega(b, 'MEMO'), nome = pega(b, 'NAME')
    linhas.push({ data, valor_cent: valor, descricao: (memo && nome && !memo.includes(nome) ? `${nome} ${memo}` : memo || nome || pega(b, 'TRNTYPE') || 'Sem descrição').replace(/\s+/g, ' ').trim(), id_externo: pega(b, 'FITID') || null })
  }
  return linhas
}

// ---------------------------------------------------------------------------
// CSV (separador ; , ou tab; cabeçalho em qualquer linha; coluna Valor ou Crédito/Débito)
// ---------------------------------------------------------------------------
const semAcento = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '')
const chave = (s) => semAcento(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

function dividirLinha(linha, sep) {
  const cel = []
  let atual = '', aspas = false
  for (let i = 0; i < linha.length; i++) {
    const c = linha[i]
    if (aspas) { if (c === '"') { if (linha[i + 1] === '"') { atual += '"'; i++ } else aspas = false } else atual += c } else if (c === '"') aspas = true
    else if (c === sep) { cel.push(atual.trim()); atual = '' } else atual += c
  }
  cel.push(atual.trim())
  return cel
}

export function parseCSV(texto) {
  const linhas = texto.split(/\r\n|\n|\r/).filter((l) => l.trim())
  if (linhas.length < 2) throw new ErroExtrato('O arquivo está vazio ou tem só uma linha. Confira se é o extrato certo.')
  const amostra = linhas.slice(0, 25)
  const sep = [';', '\t', ','].map((s) => [s, amostra.reduce((n, l) => n + (l.split(s).length - 1), 0)]).sort((a, b) => b[1] - a[1])[0][0]
  let cab = -1, cols = null
  for (let i = 0; i < Math.min(linhas.length, 40); i++) {
    const cel = dividirLinha(linhas[i], sep).map(chave)
    const data = cel.findIndex((c) => /^data/.test(c))
    const valor = cel.findIndex((c) => /^valor/.test(c))
    const cred = cel.findIndex((c) => /^credito/.test(c)), deb = cel.findIndex((c) => /^debito/.test(c))
    if (data >= 0 && (valor >= 0 || (cred >= 0 && deb >= 0))) {
      let desc = cel.findIndex((c) => /(descri|historico|lancamento|memo|estabelecimento|detalhe)/.test(c))
      if (desc < 0) desc = cel.findIndex((_, k) => k !== data && k !== valor && k !== cred && k !== deb && !/^(docto|documento|saldo|situacao|numero|n)/.test(cel[k]))
      cab = i; cols = { data, valor, cred, deb, desc }
      break
    }
  }
  if (cab < 0) throw new ErroExtrato('Não reconheci as colunas do CSV. Preciso de uma coluna de Data, uma de Descrição (ou Histórico) e uma de Valor (ou Crédito e Débito). O formato do banco pode ter mudado.')
  const out = []
  for (const l of linhas.slice(cab + 1)) {
    const cel = dividirLinha(l, sep)
    const data = parseData(cel[cols.data])
    if (!data) continue // linhas de saldo, totais e rodapé
    let valor = null
    if (cols.valor >= 0) valor = parseValor(cel[cols.valor])
    else {
      const c = parseValor(cel[cols.cred]), d = parseValor(cel[cols.deb])
      if (c) valor = Math.abs(c)
      else if (d) valor = -Math.abs(d)
    }
    if (valor === null || valor === 0) continue
    out.push({ data, valor_cent: valor, descricao: (cols.desc >= 0 ? cel[cols.desc] : '') || 'Sem descrição', id_externo: null })
  }
  if (!out.length) throw new ErroExtrato('Achei o cabeçalho, mas nenhuma linha com data e valor válidos. O formato do arquivo pode ter mudado.')
  return out
}

export function lerExtrato(buffer) {
  const texto = decodificar(buffer)
  const formato = detectarFormato(texto)
  const linhas = formato === 'ofx' ? parseOFX(texto) : parseCSV(texto)
  return { formato, linhas: prepararLinhas(linhas) }
}

// ---------------------------------------------------------------------------
// Descrição normalizada, hash de deduplicação e categorização
// ---------------------------------------------------------------------------
export const normalizarDescricao = (s) => semAcento(s).toUpperCase().replace(/[^A-Z0-9]+/g, ' ').replace(/\s+/g, ' ').trim()

// hash de texto (cyrb53): curto, rápido e igual em qualquer navegador
export function hashTexto(str) {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i)
    h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, '0')
}

// hash = data + valor + descrição normalizada + posição no dia (a 2ª compra igual no mesmo dia ganha posição 2)
export function prepararLinhas(linhas) {
  const vistos = new Map()
  return linhas.map((l) => {
    const norm = normalizarDescricao(l.descricao)
    const base = `${l.data}|${l.valor_cent}|${norm}`
    const pos = (vistos.get(base) || 0) + 1
    vistos.set(base, pos)
    return { ...l, descricao_norm: norm, pos, hash: `ex1:${hashTexto(`${base}|${pos}`)}` }
  })
}

const PALAVRAS_COMUNS = new Set(['PIX', 'ENVIADO', 'RECEBIDO', 'COMPRA', 'CARTAO', 'DEBITO', 'CREDITO', 'PAGAMENTO', 'PAG', 'TRANSFERENCIA', 'TRANSF', 'TED', 'DOC', 'DE', 'DA', 'DO', 'EM', 'COM', 'NO', 'NA', 'PARA', 'POR', 'LTDA', 'SA', 'ME', 'BR', 'ELO', 'VISA', 'MASTERCARD'])

// o pedaço da descrição que serve de regra: as 2 primeiras palavras que dizem alguma coisa
export function trechoDaDescricao(descricao) {
  const palavras = normalizarDescricao(descricao).split(' ').filter((p) => p.length >= 3 && !/\d/.test(p) && !PALAVRAS_COMUNS.has(p))
  return palavras.slice(0, 2).join(' ')
}

// regras: [{ trecho_descricao, categoria_id }]. Vale a regra de trecho mais longo que aparece na descrição.
export function categorizar(descricaoNorm, regras) {
  let melhor = null
  for (const r of regras) {
    const t = normalizarDescricao(r.trecho_descricao)
    if (t && descricaoNorm.includes(t) && (!melhor || t.length > melhor.t.length)) melhor = { t, id: r.categoria_id }
  }
  return melhor ? melhor.id : null
}

// ---------------------------------------------------------------------------
// Conciliação: saída importada que bate com uma conta em aberto (mesmo valor, vencimento perto)
// ---------------------------------------------------------------------------
// linhas: as do extrato; abertas: [{ id, tipo, ref, descricao, valor_cent, vencimento }] (contas e parcelas).
// Devolve { [índice da linha]: obrigação }. Cada conta só é usada uma vez; vence a mais próxima e mais parecida.
export function proporConciliacoes(linhas, abertas, { toleranciaDias = 7 } = {}) {
  const pares = []
  linhas.forEach((l, i) => {
    if (l.valor_cent >= 0 || l.ignorar) return
    const palavras = new Set(l.descricao_norm.split(' '))
    for (const o of abertas) {
      if (o.tipo === 'divida' || o.valor_cent !== -l.valor_cent) continue
      const dist = Math.abs(daysBetween(l.data, o.vencimento))
      if (dist > toleranciaDias) continue
      const parecidas = normalizarDescricao(o.descricao).split(' ').filter((p) => p.length >= 3 && palavras.has(p)).length
      pares.push({ i, o, nota: dist * 10 - parecidas * 8 })
    }
  })
  pares.sort((a, b) => a.nota - b.nota || a.i - b.i)
  const usadas = new Set(), feitas = new Set(), res = {}
  for (const p of pares) {
    if (usadas.has(p.o.id) || feitas.has(p.i)) continue
    usadas.add(p.o.id); feitas.add(p.i); res[p.i] = p.o
  }
  return res
}

export const resumoDaPrevia = (linhas) => ({
  novas: linhas.filter((l) => l.situacao === 'nova').length,
  existiam: linhas.filter((l) => l.situacao === 'existe').length,
  semCategoria: linhas.filter((l) => l.situacao === 'nova' && !l.categoria_id).length,
  possiveis: linhas.filter((l) => l.situacao === 'nova' && l.possivel_manual).length,
})
