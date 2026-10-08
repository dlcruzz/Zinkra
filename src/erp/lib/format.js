// Formatação de dinheiro e datas. Valores no banco ficam em centavos.

const brlFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const brlInt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

export const brl = (cents) => brlFmt.format((Number(cents) || 0) / 100)
export const brl0 = (cents) => brlInt.format(Math.round((Number(cents) || 0) / 100))
export const brlShort = (cents) => {
  const v = (Number(cents) || 0) / 100
  if (Math.abs(v) >= 1000) return 'R$ ' + (v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' mil'
  return brlInt.format(v)
}

// "1.150,50" | "1150.5" | "R$ 1.150" -> 115050
export function toCents(input) {
  if (input === null || input === undefined || input === '') return 0
  if (typeof input === 'number') return Math.round(input * 100)
  let s = String(input).replace(/[^\d,.-]/g, '')
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.')
  const n = parseFloat(s)
  return Number.isFinite(n) ? Math.round(n * 100) : 0
}
export const centsToInput = (cents) =>
  cents ? ((Number(cents) || 0) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''

export const pct = (n, d) => (d ? Math.round((n / d) * 100) : 0)
export const pctLabel = (n, d, digits = 0) =>
  d ? ((n / d) * 100).toLocaleString('pt-BR', { maximumFractionDigits: digits }) + '%' : '—'

// ---------- datas (sempre no fuso local do navegador) ----------
const pad = (n) => String(n).padStart(2, '0')
export const isoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const today = () => isoDate(new Date())
export const parseDate = (iso) => {
  if (!iso) return null
  if (iso instanceof Date) return iso
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, m, d] = iso.split('-').map(Number)
    return new Date(y, m - 1, d)
  }
  return new Date(iso)
}
export const addDays = (iso, n) => {
  const d = parseDate(iso || today())
  d.setDate(d.getDate() + n)
  return isoDate(d)
}
export const addMonths = (iso, n) => {
  const d = parseDate(iso || today())
  const day = d.getDate()
  d.setDate(1)
  d.setMonth(d.getMonth() + n)
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  d.setDate(Math.min(day, last))
  return isoDate(d)
}
export const daysBetween = (a, b) => {
  const da = parseDate(a), db = parseDate(b)
  if (!da || !db) return null
  const ua = Date.UTC(da.getFullYear(), da.getMonth(), da.getDate())
  const ub = Date.UTC(db.getFullYear(), db.getMonth(), db.getDate())
  return Math.round((ub - ua) / 86400000)
}
export const daysFromToday = (iso) => daysBetween(today(), iso)   // positivo = futuro
export const daysSince = (iso) => (iso ? daysBetween(iso, today()) : null)

export const dm = (iso) => {
  const d = parseDate(iso)
  return d ? `${pad(d.getDate())}/${pad(d.getMonth() + 1)}` : '—'
}
export const dmy = (iso) => {
  const d = parseDate(iso)
  return d ? `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}` : '—'
}
export const hm = (iso) => {
  const d = parseDate(iso)
  return d ? `${pad(d.getHours())}:${pad(d.getMinutes())}` : ''
}
export const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
export const MONTHS_S = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
export const WEEK = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
export const WEEK_S = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export const longToday = () => {
  const d = new Date()
  return `${WEEK[d.getDay()]}, ${d.getDate()} de ${MONTHS[d.getMonth()]}`
}
export const monthKey = (iso) => (iso ? String(iso).slice(0, 7) : '')
export const monthLabel = (key) => {
  const [y, m] = key.split('-').map(Number)
  return `${MONTHS_S[m - 1]}/${String(y).slice(2)}`
}
export const startOfMonth = (iso = today()) => iso.slice(0, 8) + '01'
export const endOfMonth = (iso = today()) => {
  const d = parseDate(startOfMonth(iso))
  return isoDate(new Date(d.getFullYear(), d.getMonth() + 1, 0))
}
export const startOfWeek = (iso = today()) => {
  const d = parseDate(iso)
  const dow = (d.getDay() + 6) % 7 // segunda = 0
  d.setDate(d.getDate() - dow)
  return isoDate(d)
}
// dia local (YYYY-MM-DD) de uma data ou timestamp do banco (que vem em UTC)
export const localDay = (v) => {
  if (!v) return ''
  const s = String(v)
  if (s.length <= 10) return s
  return isoDate(new Date(s))
}
export const inRange = (iso, a, b) => {
  if (!iso) return false
  const s = localDay(iso)
  return s >= a && s <= b
}

// dias úteis (seg–sex) entre duas datas, inclusive
export function businessDays(a, b) {
  let n = 0
  const d = parseDate(a), end = parseDate(b)
  while (d <= end) {
    const w = d.getDay()
    if (w !== 0 && w !== 6) n++
    d.setDate(d.getDate() + 1)
  }
  return n
}

export function relDay(iso) {
  const n = daysFromToday(iso)
  if (n === null) return '—'
  if (n === 0) return 'hoje'
  if (n === 1) return 'amanhã'
  if (n === -1) return 'ontem'
  if (n < 0) return `há ${-n} dias`
  if (n < 7) return WEEK_S[parseDate(iso).getDay()].toLowerCase()
  return dm(iso)
}
export function ago(ts) {
  if (!ts) return '—'
  const d = parseDate(ts)
  const mins = Math.round((Date.now() - d.getTime()) / 60000)
  if (mins < 1) return 'agora'
  if (mins < 60) return `há ${mins} min`
  const h = Math.round(mins / 60)
  if (h < 24) return `há ${h} h`
  const days = daysSince(isoDate(d))
  if (days === 1) return 'ontem'
  return `há ${days} dias`
}
export const minutesLabel = (m) => {
  m = Math.round(Number(m) || 0)
  const h = Math.floor(m / 60)
  return h ? `${h}h ${String(m % 60).padStart(2, '0')}m` : `${m}m`
}
export const hoursLabel = (m) => {
  const h = (Number(m) || 0) / 60
  return h.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + 'h'
}

export const initials = (name = '') =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || '?'

export const onlyDigits = (s) => String(s || '').replace(/\D/g, '')
export const waLink = (phone, text = '') => {
  let d = onlyDigits(phone)
  if (!d) return null
  if (d.length <= 11) d = '55' + d
  // abre direto no WhatsApp Desktop instalado (sem passar pelo WhatsApp Web nem abrir aba nova)
  return `whatsapp://send?phone=${d}${text ? '&text=' + encodeURIComponent(text) : ''}`
}
export const igLink = (ig) => {
  if (!ig) return null
  const h = String(ig).trim().replace(/^@/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/\/$/, '')
  return `https://instagram.com/${h}`
}
export const igHandle = (ig) => (ig ? '@' + String(ig).trim().replace(/^@/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/\/$/, '') : '')
// abre a conversa do Direct com o perfil (o Instagram não aceita texto pronto no link)
export const igDm = (ig) => (ig ? `https://ig.me/m/${igHandle(ig).slice(1).split(/[/?]/)[0]}` : null)
export const normalizePhone = (p) => onlyDigits(p).replace(/^55(?=\d{10,11}$)/, '')

// preenche [EMPRESA], [NOME], [BAIRRO]… num texto de playbook
export function fillTemplate(text, vars) {
  return String(text || '').replace(/\[([A-ZÇÃÕÉÊÍÓÚ_]+)\]/g, (m, k) => {
    const v = vars[k]
    return v === undefined || v === null || v === '' ? m : v
  })
}
