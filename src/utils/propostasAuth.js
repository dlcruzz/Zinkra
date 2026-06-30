const KEY = 'zinkra_propostas_session'
const TTL = 24 * 60 * 60 * 1000

export function saveSession() {
  localStorage.setItem(KEY, JSON.stringify({ at: Date.now() }))
}

export function isAuthenticated() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return false
    const { at } = JSON.parse(raw)
    return Date.now() - at < TTL
  } catch {
    return false
  }
}

export function clearSession() {
  localStorage.removeItem(KEY)
}

export async function checkPassword(password) {
  try {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    const data = await res.json()
    return data.ok === true
  } catch {
    // fallback para dev local sem Vercel: lê VITE_PROPOSALS_PASSWORD
    const devPwd = import.meta.env.VITE_PROPOSALS_PASSWORD
    return devPwd ? password === devPwd : false
  }
}
