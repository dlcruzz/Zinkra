import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../supabase'

// Só o dono vê o módulo Pessoal. A resposta vem do banco (pf_sou_dono) e fica só no estado
// do React: ao sair do ERP o Shell desmonta e nada sobra em memória. Se a função ainda não
// existe no banco (SQL não rodado) ou der erro, vale "não é o dono" e nada aparece.
const Ctx = createContext({ dono: false, pronto: false })
export const usePfDono = () => useContext(Ctx)

export function PfDonoProvider({ uid, children }) {
  const [st, setSt] = useState({ dono: false, pronto: false })
  useEffect(() => {
    let vivo = true
    setSt({ dono: false, pronto: false })
    if (!uid) return undefined
    supabase.rpc('pf_sou_dono').then(({ data, error }) => {
      if (vivo) setSt({ dono: !error && data === true, pronto: true })
    })
    return () => { vivo = false }
  }, [uid])
  return <Ctx.Provider value={st}>{children}</Ctx.Provider>
}
