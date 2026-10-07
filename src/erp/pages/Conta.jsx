import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMeta } from '../components/Shell'
import { useAuth, ROLES } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { update, notify } from '../lib/data'
import { PageHead, Card, Field, AsyncButton, Spinner } from '../components/ui'

export default function Conta() {
  useMeta('Sistema', 'Minha conta')
  const auth = useAuth()
  const [sp] = useSearchParams()
  const [name, setName] = useState(auth.profile?.name || '')
  const [pw, setPw] = useState({ a: '', b: '' })

  return (
    <div className="page">
      <PageHead title="Minha conta" sub={`${auth.profile?.email} · ${ROLES[auth.role]}`} />
      <div className="cols">
        <div className="stack" style={{ flex: '1 1 420px', minWidth: 0, gap: 16 }}>
          <Card pad title={<h2>Perfil</h2>}>
            <div className="stack">
              <Field label="Nome"><input className="in" value={name} onChange={(e) => setName(e.target.value)} /></Field>
              <AsyncButton className="btn" style={{ width: 'max-content' }} onClick={async () => { await update('profiles', auth.uid, { name }); await auth.reloadProfile(); notify('Nome salvo.', 'ok') }}>Salvar</AsyncButton>
            </div>
          </Card>
          <Card pad title={<h2>{sp.get('senha') ? 'Defina sua senha' : 'Trocar senha'}</h2>} style={sp.get('senha') ? { borderColor: 'var(--green-ln)' } : undefined}>
            <div className="stack">
              <Field label="Nova senha" hint="Mínimo de 10 caracteres"><input className="in" type="password" autoComplete="new-password" value={pw.a} onChange={(e) => setPw({ ...pw, a: e.target.value })} /></Field>
              <Field label="Repita"><input className="in" type="password" autoComplete="new-password" value={pw.b} onChange={(e) => setPw({ ...pw, b: e.target.value })} /></Field>
              <AsyncButton className="btn p" style={{ width: 'max-content' }} onClick={async () => {
                if (pw.a.length < 10) return notify('Use pelo menos 10 caracteres.', 'err')
                if (pw.a !== pw.b) return notify('As senhas não conferem.', 'err')
                const { error } = await supabase.auth.updateUser({ password: pw.a })
                if (error) return notify(error.message, 'err')
                setPw({ a: '', b: '' }); notify('Senha atualizada.', 'ok')
              }}>Salvar senha</AsyncButton>
            </div>
          </Card>
        </div>
        <Mfa />
      </div>
    </div>
  )
}

function Mfa() {
  const auth = useAuth()
  const [factors, setFactors] = useState(null)
  const [enroll, setEnroll] = useState(null)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)

  const load = async () => {
    const { data } = await supabase.auth.mfa.listFactors()
    setFactors(data?.totp || [])
  }
  useEffect(() => { load() }, [])

  const start = async () => {
    setBusy(true)
    // remove tentativas antigas não verificadas
    for (const f of (factors || []).filter((x) => x.status !== 'verified')) await supabase.auth.mfa.unenroll({ factorId: f.id })
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: `ERP Zinkra ${Date.now()}` })
    setBusy(false)
    if (error) return notify(error.message, 'err')
    setEnroll(data)
  }
  const verify = async () => {
    setBusy(true)
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: enroll.id, code: code.replace(/\D/g, '') })
    setBusy(false)
    if (error) return notify('Código inválido. Confira o app e tente de novo.', 'err')
    setEnroll(null); setCode(''); await load(); await auth.reloadProfile()
    notify('Autenticação em dois fatores ativada. A partir de agora o login pede o código.', 'ok')
  }
  const verified = (factors || []).filter((f) => f.status === 'verified')

  return (
    <Card pad title={<h2>Autenticação em dois fatores (2FA)</h2>} style={{ flex: '1 1 380px', minWidth: 0, borderColor: verified.length ? undefined : 'var(--yel-ln)' }}>
      {factors === null ? <Spinner /> : verified.length ? (
        <div className="stack">
          <div className="note g">Ativa. O login pede o código do app autenticador.</div>
          <AsyncButton className="btn d" style={{ width: 'max-content' }} onClick={async () => {
            for (const f of verified) await supabase.auth.mfa.unenroll({ factorId: f.id })
            await load(); notify('2FA desativado.', 'ok')
          }}>Desativar 2FA</AsyncButton>
        </div>
      ) : enroll ? (
        <div className="stack">
          <p className="lbl" style={{ lineHeight: 1.6 }}>1. Abra o Google Authenticator, Microsoft Authenticator ou 1Password e escaneie o código.</p>
          <div style={{ background: '#fff', padding: 12, borderRadius: 8, width: 'max-content' }}>
            <img src={enroll.totp.qr_code} alt="QR code para o app autenticador" width={180} height={180} />
          </div>
          <p className="lbl">Ou digite a chave: <span className="num" style={{ color: 'var(--tx)', userSelect: 'all' }}>{enroll.totp.secret}</span></p>
          <p className="lbl">2. Digite o código de 6 números que aparece no app.</p>
          <div className="row">
            <input className="in num" style={{ width: 160, fontSize: 18, letterSpacing: '0.3em', textAlign: 'center' }} inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} aria-label="Código" />
            <button type="button" className="btn p" disabled={busy || code.length !== 6} onClick={verify}>{busy ? <Spinner /> : null}Ativar</button>
          </div>
        </div>
      ) : (
        <div className="stack">
          <p className="lbl" style={{ lineHeight: 1.6 }}>O ERP guarda o financeiro e os contatos de clientes. Ative o 2FA: mesmo que alguém descubra sua senha, não entra sem o código do seu celular.</p>
          <button type="button" className="btn p" style={{ width: 'max-content' }} disabled={busy} onClick={start}>{busy ? <Spinner /> : null}Ativar 2FA</button>
        </div>
      )}
    </Card>
  )
}
