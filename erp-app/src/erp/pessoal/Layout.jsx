import React, { useEffect, useState } from 'react'
import { Navigate, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { usePfDono } from '../lib/pf/dono'
import { garantirBase } from '../lib/pf/api'
import { gerarRecorrentes } from '../lib/pf/nucleo'
import { hojeSP } from '../lib/pf/datas'
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
      // contas que se repetem: mantém as ocorrências de 90 dias à frente (silencioso, sem duplicar)
      .then(() => gerarRecorrentes(hojeSP()).catch((e) => console.warn('Recorrentes:', e)))
      .catch((erro) => { if (vivo) setBase({ ok: false, erro }) })
    return () => { vivo = false }
  }, [dono, auth.uid, tentativa])

  if (!pronto) return <div className="page"><Loading rows={3} /></div>
  if (!dono) return <Navigate to="/erp" replace />
  if (base.erro) return <div className="page"><ErrorBox error={base.erro} onRetry={() => setTentativa((n) => n + 1)} /></div>
  if (!base.ok) return <div className="page"><Loading rows={5} /></div>
  return (
    <>
      <nav className="pf-sub" aria-label="Seções de finanças pessoais">
        {ABAS.map(([to, rotulo, fim]) => <NavLink key={to} to={to} end={fim} className={({ isActive }) => (isActive ? 'on' : '')}>{rotulo}</NavLink>)}
      </nav>
      <Outlet />
    </>
  )
}

const ABAS = [
  ['/erp/pessoal', 'Hoje', true],
  ['/erp/pessoal/receber', 'Receber', false],
  ['/erp/pessoal/contas', 'Contas a pagar', false],
  ['/erp/pessoal/lancamentos', 'Lançamentos', false],
  ['/erp/pessoal/parcelamentos', 'Parcelamentos', false],
  ['/erp/pessoal/dividas', 'Dívidas', false],
  ['/erp/pessoal/visao-geral', 'Visão geral', false],
  ['/erp/pessoal/config', 'Configurações', false],
]
