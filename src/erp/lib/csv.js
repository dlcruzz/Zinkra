// CSV / TSV simples, com aspas. Detecta o separador (tab, ; ou ,).
export function parseCsv(text) {
  const src = String(text || '').replace(/^﻿/, '')
  const first = src.split(/\r?\n/)[0] || ''
  const sep = first.includes('\t') ? '\t' : (first.split(';').length > first.split(',').length ? ';' : ',')
  const rows = []
  let row = [], cell = '', q = false
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (q) {
      if (ch === '"' && src[i + 1] === '"') { cell += '"'; i++ }
      else if (ch === '"') q = false
      else cell += ch
    } else if (ch === '"') q = true
    else if (ch === sep) { row.push(cell); cell = '' }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++
      row.push(cell); rows.push(row); row = []; cell = ''
    } else cell += ch
  }
  if (cell || row.length) { row.push(cell); rows.push(row) }
  const clean = rows.filter((r) => r.some((c) => String(c).trim()))
  if (!clean.length) return { headers: [], rows: [] }
  const headers = clean[0].map((h) => String(h).trim())
  return { headers, rows: clean.slice(1).map((r) => headers.map((_, i) => String(r[i] ?? '').trim())) }
}

export function toCsv(headers, rows) {
  const esc = (v) => {
    const s = v === null || v === undefined ? '' : String(v)
    return /[";\n,]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return '﻿' + [headers, ...rows].map((r) => r.map(esc).join(';')).join('\n')
}

export function download(filename, content, type = 'text/csv;charset=utf-8') {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '')

// adivinha o campo do ERP a partir do nome da coluna da planilha
export const LEAD_FIELDS = {
  company: 'Empresa', contact_name: 'Contato · nome', neighborhood: 'Bairro', city: 'Cidade', niche: 'Nicho',
  phone: 'WhatsApp / telefone', instagram: 'Instagram', website: 'Site (endereço)', has_site: 'Tem site?', origin: 'Origem',
  estimated_value: 'Valor estimado', notes: 'Observações', stage: 'Etapa / status', '': '— ignorar —',
}
export function guessField(header) {
  const h = norm(header)
  if (/empresa|razao|nomefantasia|negocio|clinica|company/.test(h)) return 'company'
  if (/nomedocontato|contato|responsavel|nome$/.test(h)) return 'contact_name'
  if (/cidadebairro|bairro|regiao/.test(h)) return 'neighborhood'
  if (/^cidade/.test(h)) return 'city'
  if (/nicho|segmento|ramo|categoria/.test(h)) return 'niche'
  if (/^wame|walink/.test(h)) return ''
  if (/telefone|whats|celular|fone/.test(h)) return 'phone'
  if (/insta/.test(h)) return 'instagram'
  if (/siteatual|temsite/.test(h)) return 'has_site'
  if (/^site|url|website/.test(h)) return 'website'
  if (/ondeachei|origem|fonte|canal/.test(h)) return 'origin'
  if (/valor|ticket|orcamento/.test(h)) return 'estimated_value'
  if (/status|etapa|fase/.test(h)) return 'stage'
  if (/obs|nota|coment/.test(h)) return 'notes'
  return ''
}
export const yes = (v) => /^(s|sim|y|yes|true|1|x|tem)$/i.test(String(v || '').trim())
