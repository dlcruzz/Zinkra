import React, { lazy, useEffect, useState } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import './erp.css'
import { supabaseConfigured } from './lib/supabase'
import { AuthProvider, useAuth } from './lib/auth'
import { Shell, useMeta } from './components/Shell'
import { Toasts, ConfirmProvider, Spinner } from './components/ui'
import { dailyHousekeeping } from './lib/automations'
import { friendlyError } from './lib/data'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const Hoje = lazy(() => import('./pages/Hoje'))
const Inteligencia = lazy(() => import('./pages/Inteligencia'))
const PainelProspector = lazy(() => import('./pages/PainelProspector'))
const Leads = lazy(() => import('./pages/Leads'))
const LeadDetalhe = lazy(() => import('./pages/LeadDetalhe'))
const Pipelines = lazy(() => import('./pages/Pipelines'))
const Prospeccao = lazy(() => import('./pages/Prospeccao'))
const Metas = lazy(() => import('./pages/Metas'))
const Propostas = lazy(() => import('./pages/Propostas'))
const PropostaEditor = lazy(() => import('./pages/PropostaEditor'))
const Clientes = lazy(() => import('./pages/Clientes'))
const Projetos = lazy(() => import('./pages/Projetos'))
const ProjetoDetalhe = lazy(() => import('./pages/ProjetoDetalhe'))
const Tarefas = lazy(() => import('./pages/Tarefas'))
const Reunioes = lazy(() => import('./pages/Reunioes'))
const Pagar = lazy(() => import('./pages/Pagar'))
const Receber = lazy(() => import('./pages/Receber'))
const Fluxo = lazy(() => import('./pages/Fluxo'))
const Ideias = lazy(() => import('./pages/Ideias'))
const Playbooks = lazy(() => import('./pages/Playbooks'))
const Parceiros = lazy(() => import('./pages/Parceiros'))
const Relatorios = lazy(() => import('./pages/Relatorios'))
const Config = lazy(() => import('./pages/Config'))
const Conta = lazy(() => import('./pages/Conta'))

function Brand({ size = 26 }) {
  return <span style={{ fontSize: size, fontWeight: 700, letterSpacing: '-0.04em' }}><span style={{ color: 'var(--green)' }}>Z</span>inkra<span style={{ color: 'var(--green)' }}>.</span></span>
}

function AuthFrame({ children }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', minHeight: '100vh' }}>
      <div style={{ flex: '1 1 480px', minHeight: 320, background: 'var(--bg-side)', borderRight: '1px solid #1A1E1C', padding: 48,
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', overflow: 'hidden' }}>
        <Brand />
        <span aria-hidden="true" style={{ position: 'absolute', right: -40, bottom: -120, fontSize: 520, fontWeight: 700, lineHeight: 1, color: '#121714', letterSpacing: '-0.06em' }}>Z</span>
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 420 }}>
          <span className="num" style={{ fontSize: 12, color: 'var(--green)' }}>ERP · ACESSO INTERNO</span>
          <p style={{ fontSize: 28, lineHeight: 1.25, fontWeight: 600, letterSpacing: '-0.02em' }}>Comercial, projetos e financeiro da Zinkra num lugar só.</p>
          <p className="mut">Acesso apenas por convite. Se você não tem um login, fale com o Diretor geral.</p>
        </div>
      </div>
      <div style={{ flex: '1 1 420px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 24px' }}>
        <div style={{ width: 360, maxWidth: '100%', display: 'flex', flexDirection: 'column', gap: 18 }}>{children}</div>
      </div>
    </div>
  )
}

function Login() {
  const auth = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState(auth.session && auth.needsMfa ? 2 : 1)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [reset, setReset] = useState(false)

  useEffect(() => { if (auth.session && auth.needsMfa) setStep(2) }, [auth.session, auth.needsMfa])

  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true)
    try {
      if (reset) {
        const { supabase } = await import('./lib/supabase')
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/erp/conta?senha=1` })
        if (error) throw error
        setErr('Enviamos um link para redefinir a senha no seu e-mail.')
      } else if (step === 1) {
        const needs = await auth.signIn(email.trim(), password)
        if (needs) setStep(2)
      } else {
        await auth.verifyMfa(code.replace(/\D/g, ''))
      }
    } catch (ex) {
      const m = ex.message || ''
      setErr(/Invalid login/i.test(m) ? 'E-mail ou senha incorretos.' : /Invalid TOTP|invalid code/i.test(m) ? 'Código inválido. Confira o app autenticador.' : friendlyError(ex))
    } finally { setBusy(false) }
  }

  return (
    <AuthFrame>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {step === 1 ? (
          <>
            <div className="stack-s"><h1>{reset ? 'Redefinir senha' : 'Entrar'}</h1><span className="lbl">zinkra.com.br/erp</span></div>
            <label className="field">E-mail<input className="in" style={{ height: 44 }} type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
            {!reset ? (
              <label className="field">
                <span style={{ display: 'flex', justifyContent: 'space-between' }}>Senha
                  <button type="button" className="btn g s" style={{ height: 18, padding: 0 }} onClick={() => { setReset(true); setErr('') }}>Esqueci a senha</button>
                </span>
                <input className="in" style={{ height: 44 }} type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
              </label>
            ) : null}
          </>
        ) : (
          <>
            <div className="stack-s"><h1>Código de verificação</h1><span className="lbl">Digite os 6 números do seu app autenticador.</span></div>
            <input className="in num" style={{ height: 56, fontSize: 24, letterSpacing: '0.4em', textAlign: 'center' }} inputMode="numeric" autoComplete="one-time-code"
              maxLength={6} autoFocus value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} aria-label="Código de 6 dígitos" />
          </>
        )}
        {err ? <div className={`note ${/Enviamos/.test(err) ? 'g' : 'r'}`}>{err}</div> : null}
        <button type="submit" className="btn p" style={{ height: 44, fontSize: 14 }} disabled={busy}>
          {busy ? <Spinner /> : null}{reset ? 'Enviar link' : step === 1 ? 'Continuar' : 'Entrar no ERP'}
        </button>
        {reset ? <button type="button" className="btn g" onClick={() => { setReset(false); setErr('') }}>← Voltar</button> : null}
        {step === 2 ? <button type="button" className="btn g" onClick={() => auth.signOut().then(() => setStep(1))}>← Usar outra conta</button> : null}
        {step === 1 && !reset ? <span className="lbl" style={{ fontSize: 12, color: 'var(--mut-2)' }}>Protegido por autenticação em dois fatores.</span> : null}
      </form>
    </AuthFrame>
  )
}

function Pending() {
  const auth = useAuth()
  return (
    <AuthFrame>
      <h1>Aguardando liberação</h1>
      <p className="mut" style={{ lineHeight: 1.6 }}>Seu login foi criado, mas o Diretor geral ainda não definiu seu papel. Assim que ele liberar, é só entrar de novo.</p>
      <button type="button" className="btn" onClick={() => auth.reloadProfile()}>Verificar de novo</button>
      <button type="button" className="btn g" onClick={() => auth.signOut()}>Sair</button>
    </AuthFrame>
  )
}

function NotConfigured() {
  return (
    <AuthFrame>
      <h1>Falta configurar o Supabase</h1>
      <p className="mut" style={{ lineHeight: 1.6 }}>
        Defina <span className="num">VITE_SUPABASE_URL</span> e <span className="num">VITE_SUPABASE_ANON_KEY</span> nas variáveis
        de ambiente da Vercel (e no <span className="num">.env.local</span> para rodar no seu PC). O passo a passo está em
        <span className="num"> ERP_SETUP.md</span>.
      </p>
    </AuthFrame>
  )
}

function Home() {
  const auth = useAuth()
  if (auth.canSee('dashboard')) return <Dashboard />
  if (auth.role === 'prospector') return <Navigate to="/erp/painel" replace />
  return <Navigate to="/erp/hoje" replace />
}

function NoAccess() {
  useMeta('', 'Sem acesso')
  return (
    <div className="page">
      <div className="empty" style={{ paddingTop: 80 }}>
        <h2>Sem acesso a esta área</h2>
        <span>Seu papel não tem permissão para este módulo. Fale com o Diretor geral.</span>
      </div>
    </div>
  )
}

function Guard({ module, children }) {
  const auth = useAuth()
  if (module && !auth.canSee(module)) return <NoAccess />
  return children
}

function Gate() {
  const auth = useAuth()
  const nav = useNavigate()
  useEffect(() => {
    if (auth.profile && auth.role !== 'pendente' && !auth.needsMfa) dailyHousekeeping()
  }, [auth.profile, auth.role, auth.needsMfa])
  useEffect(() => {
    // link de redefinição de senha
    if (window.location.hash.includes('type=recovery')) nav('/erp/conta?senha=1')
  }, [nav])

  if (auth.loading) return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}><Spinner /></div>
  if (!auth.session || auth.needsMfa) return <Login />
  if (!auth.profile || auth.role === 'pendente' || !auth.profile.active) return <Pending />

  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<Home />} />
        <Route path="hoje" element={<Hoje />} />
        <Route path="inteligencia" element={<Inteligencia />} />
        <Route path="painel" element={<Guard module="prospeccao"><PainelProspector /></Guard>} />
        <Route path="leads" element={<Guard module="crm"><Leads /></Guard>} />
        <Route path="leads/:id" element={<Guard module="crm"><LeadDetalhe /></Guard>} />
        <Route path="pipelines" element={<Guard module="crm"><Pipelines /></Guard>} />
        <Route path="pipelines/:slug" element={<Guard module="crm"><Pipelines /></Guard>} />
        <Route path="prospeccao" element={<Guard module="prospeccao"><Prospeccao /></Guard>} />
        <Route path="metas" element={<Guard module="metas"><Metas /></Guard>} />
        <Route path="propostas" element={<Guard module="propostas"><Propostas /></Guard>} />
        <Route path="propostas/:id" element={<Guard module="propostas"><PropostaEditor /></Guard>} />
        <Route path="clientes" element={<Guard module="clientes"><Clientes /></Guard>} />
        <Route path="projetos" element={<Guard module="projetos"><Projetos /></Guard>} />
        <Route path="projetos/:id" element={<Guard module="projetos"><ProjetoDetalhe /></Guard>} />
        <Route path="tarefas" element={<Guard module="tarefas"><Tarefas /></Guard>} />
        <Route path="reunioes" element={<Guard module="reunioes"><Reunioes /></Guard>} />
        <Route path="financeiro" element={<Navigate to="/erp/financeiro/receber" replace />} />
        <Route path="financeiro/pagar" element={<Guard module="financeiro"><Pagar /></Guard>} />
        <Route path="financeiro/receber" element={<Guard module="financeiro"><Receber /></Guard>} />
        <Route path="financeiro/fluxo" element={<Guard module="financeiro"><Fluxo /></Guard>} />
        <Route path="ideias" element={<Guard module="ideias"><Ideias /></Guard>} />
        <Route path="playbooks" element={<Guard module="playbooks"><Playbooks /></Guard>} />
        <Route path="parceiros" element={<Guard module="parceiros"><Parceiros /></Guard>} />
        <Route path="relatorios" element={<Guard module="relatorios"><Relatorios /></Guard>} />
        <Route path="config" element={<Guard module="config"><Config /></Guard>} />
        <Route path="conta" element={<Conta />} />
        <Route path="*" element={<Navigate to="/erp" replace />} />
      </Route>
    </Routes>
  )
}

export default function ErpApp() {
  return (
    <div className="erp">
      <Helmet>
        <title>ERP Zinkra</title>
        <meta name="robots" content="noindex, nofollow" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap" />
      </Helmet>
      {!supabaseConfigured ? <NotConfigured /> : (
        <AuthProvider>
          <ConfirmProvider>
            <Gate />
            <Toasts />
          </ConfirmProvider>
        </AuthProvider>
      )}
    </div>
  )
}
