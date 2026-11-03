// Leitura de extrato em arquivo (OFX ou CSV exportado do app do Nubank).
// Tudo roda no navegador: o arquivo não é enviado a nenhum servidor.
// Cada linha vira { external_id, posted_on, description, amount_cents, direction, counterparty }.
import { parseCsv } from '../csv'
import { extrairContraparte } from './conciliacao'

// "1.234,56" | "-1234.56" | "R$ 10" -> centavos com sinal (inteiro)
export function valorEmCentavos(texto, { pontoDecimal = false } = {}) {
  let s = String(texto ?? '').replace(/[^\d,.\-+]/g, '')
  if (!s) return null
  let neg = false
  if (s.startsWith('-')) neg = true
  if (/-$/.test(s)) neg = true
  s = s.replace(/[-+]/g, '')
  let dec = ''
  let inteiro = s
  const ultV = s.lastIndexOf(','), ultP = s.lastIndexOf('.')
  const sep = Math.max(ultV, ultP)
  if (sep >= 0) {
    const depois = s.slice(sep + 1)
    const soUmTipo = (ultV < 0) !== (ultP < 0)
    // "1.234" sem vírgula: milhar. Em OFX o ponto é sempre decimal.
    const decimal = pontoDecimal || !soUmTipo || ultV >= 0 || depois.length <= 2
    if (decimal) { inteiro = s.slice(0, sep); dec = depois }
  }
  inteiro = inteiro.replace(/[.,]/g, '')
  if (!/^\d*$/.test(inteiro) || !/^\d*$/.test(dec)) return null
  const cents = Number(inteiro || '0') * 100 + Number((dec + '00').slice(0, 2))
  if (!Number.isFinite(cents)) return null
  return neg ? -cents : cents
}

const dataIso = (y, m, d) => `${y}-${m}-${d}`

// "20261015120000[-3:BRT]" -> "2026-10-15"
export function dataOfx(s) {
  const m = /^(\d{4})(\d{2})(\d{2})/.exec(String(s || '').trim())
  return m ? dataIso(m[1], m[2], m[3]) : null
}

// "15/10/2026" | "2026-10-15" -> "2026-10-15"
export function dataBr(s) {
  const t = String(s || '').trim()
  let m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(t)
  if (m) return dataIso(m[3], m[2], m[1])
  m = /^(\d{4})-(\d{2})-(\d{2})/.exec(t)
  return m ? dataIso(m[1], m[2], m[3]) : null
}

function montar({ id, data, descricao, centavos }) {
  if (!data || centavos === null || centavos === 0) return null
  const direction = centavos > 0 ? 'entrada' : 'saida'
  return {
    external_id: id,
    posted_on: data,
    description: descricao,
    amount_cents: Math.abs(centavos),
    direction,
    counterparty: extrairContraparte(descricao),
  }
}

// hash simples e estável para quando o arquivo não traz identificador
function hashCurto(s) {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0
  return (h >>> 0).toString(36)
}

export function parseOfx(texto) {
  const src = String(texto || '')
  const conta = /<ACCTID>([^<\r\n]+)/i.exec(src)?.[1]?.trim() || 'conta'
  const blocos = src.split(/<STMTTRN>/i).slice(1)
  const campo = (b, tag) => new RegExp(`<${tag}>([^<\\r\\n]*)`, 'i').exec(b)?.[1]?.trim() || ''
  const vistos = new Map()
  const out = []
  for (const b of blocos) {
    const fitid = campo(b, 'FITID')
    const descricao = [campo(b, 'MEMO') || campo(b, 'NAME')].join('').replace(/\s+/g, ' ').trim()
    const data = dataOfx(campo(b, 'DTPOSTED'))
    const centavos = valorEmCentavos(campo(b, 'TRNAMT'), { pontoDecimal: true })
    let id = fitid ? `ofx:${conta}:${fitid}` : `ofx:${conta}:${hashCurto([data, centavos, descricao].join('|'))}`
    const n = (vistos.get(id) || 0) + 1
    vistos.set(id, n)
    if (!fitid && n > 1) id += `#${n}` // duas linhas idênticas no mesmo arquivo
    const t = montar({ id, data, descricao, centavos })
    if (t) out.push(t)
  }
  return out
}

const norm = (h) => String(h).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()

export function parseCsvExtrato(texto) {
  const { headers, rows } = parseCsv(texto)
  const H = headers.map(norm)
  const achar = (...nomes) => H.findIndex((h) => nomes.some((n) => h === n || h.startsWith(n)))
  const iData = achar('data', 'date')
  const iValor = achar('valor', 'amount', 'value')
  const iId = achar('identificador', 'id', 'fitid')
  const iDesc = achar('descricao', 'historico', 'description', 'detalhe')
  if (iData < 0 || iValor < 0) throw new Error('Não encontrei as colunas de data e valor no CSV.')
  const vistos = new Map()
  const out = []
  for (const r of rows) {
    const data = dataBr(r[iData])
    const centavos = valorEmCentavos(r[iValor])
    const descricao = (iDesc >= 0 ? r[iDesc] : '').replace(/\s+/g, ' ').trim()
    const ident = iId >= 0 ? r[iId].trim() : ''
    let id = ident ? `csv:${ident}` : `csv:${hashCurto([data, centavos, descricao].join('|'))}`
    const n = (vistos.get(id) || 0) + 1
    vistos.set(id, n)
    if (!ident && n > 1) id += `#${n}`
    const t = montar({ id, data, descricao, centavos })
    if (t) out.push(t)
  }
  return out
}

// decide o formato pelo conteúdo e lê o arquivo (UTF-8 ou Windows-1252)
export async function lerArquivoExtrato(file) {
  const buf = await file.arrayBuffer()
  const cabeca = new TextDecoder('latin1').decode(buf.slice(0, 600))
  const latin = /CHARSET:\s*1252/i.test(cabeca)
  const texto = new TextDecoder(latin ? 'windows-1252' : 'utf-8').decode(buf)
  if (/<OFX>|OFXHEADER/i.test(texto)) return parseOfx(texto)
  return parseCsvExtrato(texto)
}
