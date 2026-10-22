// Convida um usuário para o ERP Zinkra e já define o papel dele.
// Só o Diretor geral pode chamar. Precisa de SUPABASE_SERVICE_ROLE_KEY na Vercel
// (NUNCA coloque essa chave com prefixo VITE_: ela não pode ir para o navegador).

const ROLES = new Set(['diretor', 'prospector', 'dev', 'social', 'financeiro'])

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' })
  const sbUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const sbAnon = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!sbUrl || !sbAnon || !service) return res.status(501).json({ error: 'Defina SUPABASE_SERVICE_ROLE_KEY na Vercel para convidar usuários.' })

  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!token) return res.status(401).json({ error: 'Não autenticado' })

  try {
    const u = await fetch(`${sbUrl}/auth/v1/user`, { headers: { apikey: sbAnon, Authorization: `Bearer ${token}` } })
    if (!u.ok) return res.status(401).json({ error: 'Sessão inválida' })
    const me = await u.json()
    const pr = await fetch(`${sbUrl}/rest/v1/profiles?id=eq.${me.id}&select=role,active`, { headers: { apikey: service, Authorization: `Bearer ${service}` } })
    const [profile] = (await pr.json()) || []
    if (!profile || profile.role !== 'diretor' || !profile.active) return res.status(403).json({ error: 'Só o Diretor geral convida usuários.' })

    const { email, name, role } = req.body || {}
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'E-mail inválido' })
    if (!ROLES.has(role)) return res.status(400).json({ error: 'Papel inválido' })

    const origin = req.headers.origin || `https://${req.headers.host}`
    const inv = await fetch(`${sbUrl}/auth/v1/invite`, {
      method: 'POST',
      headers: { apikey: service, Authorization: `Bearer ${service}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, data: { name: name || email.split('@')[0] }, redirect_to: `${origin}/erp/conta?senha=1` }),
    })
    const invited = await inv.json()
    if (!inv.ok) return res.status(400).json({ error: invited?.msg || invited?.error_description || 'Não foi possível convidar' })

    // o gatilho cria o perfil como "pendente"; aqui definimos o papel escolhido
    const id = invited.id || invited.user?.id
    await fetch(`${sbUrl}/rest/v1/profiles?id=eq.${id}`, {
      method: 'PATCH',
      headers: { apikey: service, Authorization: `Bearer ${service}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ role, name: name || email.split('@')[0] }),
    })
    return res.status(200).json({ ok: true, id })
  } catch (e) {
    return res.status(500).json({ error: 'Erro ao convidar: ' + (e.message || e) })
  }
}
