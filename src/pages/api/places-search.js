// Captação automática pelo Google (Places API New · Text Search).
// O ERP manda o termo de busca ("Dentista em Moema, São Paulo - SP") e recebe os estabelecimentos
// já no formato das colunas da captação. A chave do Google fica só aqui no servidor.
//
// Variáveis na Vercel:
//   GOOGLE_PLACES_KEY              chave da API do Google (Places API New ativada)
//   VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY   as mesmas do front (para conferir quem chama)
//
// Custo: cada página de até 20 resultados é 1 chamada "Text Search Enterprise"
// (telefone e site são campos Enterprise). O Google dá uma cota grátis por mês;
// acima dela cobra por 1.000 chamadas. Coloque um limite diário no Google Cloud para não ter surpresa.

const FIELDS = [
  'places.id', 'places.displayName', 'places.nationalPhoneNumber', 'places.internationalPhoneNumber',
  'places.websiteUri', 'places.formattedAddress', 'places.addressComponents', 'places.googleMapsUri',
  'places.businessStatus', 'nextPageToken',
].join(',')

// link que não é site próprio (rede social, agregador, agenda)
const NOT_SITE = /(instagram\.com|facebook\.com|fb\.com|linktr\.ee|linktree|wa\.me|whatsapp\.com|api\.whatsapp|bio\.link|beacons\.ai|taplink|doctoralia|ifood\.com|tiktok\.com|youtube\.com|linkedin\.com|google\.com|business\.site|g\.page|sites\.google)/i

function igFrom(url) {
  const m = String(url || '').match(/instagram\.com\/([A-Za-z0-9._]+)/i)
  return m && !['p', 'reel', 'explore', 'accounts'].includes(m[1].toLowerCase()) ? '@' + m[1] : ''
}

function hoodFrom(components = []) {
  const pick = (t) => components.find((c) => (c.types || []).includes(t))
  const c = pick('sublocality_level_1') || pick('sublocality') || pick('neighborhood')
  return c ? c.longText || c.shortText || '' : ''
}

function toRow(p, query) {
  const site = p.websiteUri || ''
  const own = site && !NOT_SITE.test(site)
  return {
    company: p.displayName?.text || '',
    phone: p.nationalPhoneNumber || p.internationalPhoneNumber || '',
    instagram: igFrom(site),
    site: own ? 'Sim' : 'Não',
    website: own ? site : '',
    neighborhood: hoodFrom(p.addressComponents),
    address: p.formattedAddress || '',
    maps: p.googleMapsUri || '',
    place_id: p.id,
    where: query,
  }
}

async function checkUser(req) {
  const sbUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const sbAnon = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!token || !sbUrl || !sbAnon) return null
  const u = await fetch(`${sbUrl}/auth/v1/user`, { headers: { apikey: sbAnon, Authorization: `Bearer ${token}` } })
  if (!u.ok) return null
  const user = await u.json()
  const p = await fetch(`${sbUrl}/rest/v1/profiles?id=eq.${user.id}&select=role,active`, { headers: { apikey: sbAnon, Authorization: `Bearer ${token}` } })
  const [profile] = (await p.json()) || []
  return profile && profile.active ? { id: user.id, role: profile.role } : null
}

export default async function handler(req, res) {
  const key = process.env.GOOGLE_PLACES_KEY
  // GET: o ERP pergunta se a captação automática está ligada
  if (req.method === 'GET') return res.status(200).json({ configured: Boolean(key) })
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' })
  if (!key) return res.status(501).json({ error: 'Captação automática desligada: defina GOOGLE_PLACES_KEY nas variáveis da Vercel.' })

  const user = await checkUser(req).catch(() => null)
  if (!user) return res.status(401).json({ error: 'Sessão inválida. Entre de novo no ERP.' })

  const { query, pages = 3 } = req.body || {}
  if (!query || String(query).length > 200) return res.status(400).json({ error: 'Termo de busca inválido.' })
  const maxPages = Math.max(1, Math.min(3, Number(pages) || 1))

  const rows = []
  const seen = new Set()
  let pageToken = ''
  let calls = 0
  try {
    for (let i = 0; i < maxPages; i++) {
      const body = { textQuery: String(query), languageCode: 'pt-BR', regionCode: 'BR', pageSize: 20 }
      if (pageToken) body.pageToken = pageToken
      const r = await fetch('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': FIELDS },
        body: JSON.stringify(body),
      })
      calls++
      const data = await r.json().catch(() => ({}))
      if (!r.ok) {
        const msg = data?.error?.message || `Google respondeu ${r.status}`
        return res.status(r.status === 429 ? 429 : 502).json({ error: msg, rows, calls })
      }
      for (const p of data.places || []) {
        if (p.businessStatus && p.businessStatus !== 'OPERATIONAL') continue
        if (seen.has(p.id)) continue
        seen.add(p.id)
        rows.push(toRow(p, query))
      }
      pageToken = data.nextPageToken || ''
      if (!pageToken) break
    }
    return res.status(200).json({ rows, calls })
  } catch (e) {
    return res.status(500).json({ error: String(e.message || e), rows, calls })
  }
}
