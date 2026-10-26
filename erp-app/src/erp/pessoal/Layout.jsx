import React, { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { usePfDono } from '../lib/pf/dono'
import { garantirBase } from '../lib/pf/api'
import { ErrorBox, Loading } from '../components/ui'

// Guarda das rotas /erp/pessoal/*: quem não é o dono volta para o início do ERP.
// O banco também nega os dados (RLS), então isto é a segunda trava, não a única.
export default function PessoalLayout() {
  const auth = useAuth()
  const { dono, pronto } = usePfDono()
  const [base, setBase] = useState({ ok: false, erro: null })
  const [tentativa, setTentativa] = useState(0)

  useEffect(() => {
    if (!dono || !auth.uid) return undefined
    let vivo = true
    setBase({ ok: false, erro: null })
    garantirBase(auth.uid)
      .then(() => { if (vivo) setBase({ ok: true, erro: null }) })
      .catch((erro) => { if (vivo) setBase({ ok: false, erro }) })
    return () => { vivo = false }
  }, [dono, auth.uid, tentativa])

  if (!pronto) return <div className="page"><Loading rows={3} /></div>
  if (!dono) return <Navigate to="/erp" replace />
  if (base.erro) return <div className="page"><ErrorBox error={base.erro} onRetry={() => setTentativa((n) => n + 1)} /></div>
  if (!base.ok) return <div className="page"><Loading rows={5} /></div>
  return <Outlet />
}
