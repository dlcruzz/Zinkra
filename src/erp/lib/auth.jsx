import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'
import { emitChange } from './data'

const AuthCtx = createContext(null)
export const useAuth = () => useContext(AuthCtx)

export const ROLES = {
  diretor: 'Diretor geral',
  prospector: 'Prospector',
  dev: 'Desenvolvedor',
  social: 'Social media',
  financeiro: 'Financeiro',
  pendente: 'Aguardando liberação',
}

export const MODULES = [
  ['dashboard', 'Dashboard geral'], ['crm', 'CRM e pipelines'], ['prospeccao', 'Prospecção'], ['metas', 'Metas'],
  ['propostas', 'Propostas'], ['clientes', 'Clientes e contratos'], ['projetos', 'Projetos'], ['tarefas', 'Tarefas'],
  ['reunioes', 'Reuniões'], ['financeiro', 'Financeiro'], ['parceiros', 'Parceiros e comissões'], ['ideias', 'Ideias'],
  ['playbooks', 'Playbooks'], ['relatorios', 'Relatórios'], ['config', 'Configurações'],
]

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [perms, setPerms] = useState({})
  const [members, setMembers] = useState([])
  const [aal, setAal] = useState({ current: null, next: null })
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (s) => {
    if (!s?.user) {
      setProfile(null); setPerms({}); setMembers([]); setLoading(false)
      return
    }
    const [{ data: p }, { data: lvl }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', s.user.id).maybeSingle(),
      supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    ])
    setAal({ current: lvl?.currentLevel || null, next: lvl?.nextLevel || null })
    setProfile(p)
    if (p && p.role !== 'pendente') {
      const [{ data: rp }, { data: ms }] = await Promise.all([
        supabase.from('role_permissions').select('module, level').eq('role', p.role),
        supabase.from('profiles').select('id, name, email, role, active').order('name'),
      ])
      setPerms(Object.fromEntries((rp || []).map((r) => [r.module, r.level])))
      setMembers((ms || []).filter((m) => m.active && m.role !== 'pendente'))
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      loadProfile(data.session)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s)
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'MFA_CHALLENGE_VERIFIED' || event === 'USER_UPDATED') {
        loadProfile(s)
      }
    })
    return () => sub.subscription.unsubscribe()
  }, [loadProfile])

  const value = useMemo(() => {
    const level = (m) => perms[m] || 'none'
    const needsMfa = aal.next === 'aal2' && aal.current !== 'aal2'
    return {
      session, profile, perms, members, loading, aal, needsMfa,
      user: session?.user || null,
      uid: session?.user?.id || null,
      role: profile?.role,
      isDirector: profile?.role === 'diretor',
      level,
      canSee: (m) => level(m) !== 'none',
      canEdit: (m) => level(m) === 'total' || level(m) === 'own',
      isTotal: (m) => level(m) === 'total',
      memberName: (id) => members.find((m) => m.id === id)?.name || (id ? '—' : 'sem dono'),
      async signIn(email, password) {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
        setAal({ current: data?.currentLevel, next: data?.nextLevel })
        return data?.nextLevel === 'aal2' && data?.currentLevel !== 'aal2'
      },
      async verifyMfa(code) {
        const { data: f, error: e1 } = await supabase.auth.mfa.listFactors()
        if (e1) throw e1
        const factor = (f?.totp || []).find((x) => x.status === 'verified')
        if (!factor) throw new Error('Nenhum autenticador cadastrado.')
        const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code })
        if (error) throw error
        const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
        setAal({ current: data?.currentLevel, next: data?.nextLevel })
      },
      async signOut() {
        await supabase.auth.signOut()
      },
      async reloadProfile() {
        await loadProfile(session)
        emitChange('profiles', 'role_permissions')
      },
    }
  }, [session, profile, perms, members, loading, aal, loadProfile])

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}
