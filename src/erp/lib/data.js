import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'

// ------------------------------------------------------------------
// Notificações (toasts) — barramento simples
// ------------------------------------------------------------------
const toastListeners = new Set()
export function notify(message, type = 'info', action) {
  toastListeners.forEach((fn) => fn({ id: Math.random().toString(36).slice(2), message, type, action }))
}
export function onToast(fn) {
  toastListeners.add(fn)
  return () => toastListeners.delete(fn)
}

// ------------------------------------------------------------------
// Invalidação: quando uma tabela muda, quem lê dela recarrega
// ------------------------------------------------------------------
const tableListeners = new Map() // table -> Set<fn>
export function emitChange(...tables) {
  const fired = new Set()
  tables.flat().forEach((t) => {
    ;(tableListeners.get(t) || []).forEach((fn) => {
      if (!fired.has(fn)) { fired.add(fn); fn() }
    })
  })
}
function subscribe(tables, fn) {
  tables.forEach((t) => {
    if (!tableListeners.has(t)) tableListeners.set(t, new Set())
    tableListeners.get(t).add(fn)
  })
  return () => tables.forEach((t) => tableListeners.get(t)?.delete(fn))
}

const ARCHIVABLE = new Set([
  'partners', 'search_terms', 'leads', 'playbooks', 'clients', 'proposals', 'contracts', 'projects',
  'meetings', 'tasks', 'payables', 'receivables', 'ideas', 'goals',
])

export function friendlyError(error) {
  if (!error) return ''
  const m = error.message || String(error)
  if (/row-level security|permission denied|violates row-level/i.test(m)) return 'Você não tem permissão para isso.'
  if (/duplicate key/i.test(m)) return 'Esse registro já existe.'
  if (/Failed to fetch|NetworkError/i.test(m)) return 'Sem conexão com o servidor. Tente de novo.'
  if (/JWT|not authenticated/i.test(m)) return 'Sua sessão expirou. Entre de novo.'
  return m
}

// ------------------------------------------------------------------
// Leitura
// ------------------------------------------------------------------
// useData(async () => {...}, ['tabela1','tabela2'], [deps])
export function useData(fn, tables = [], deps = []) {
  const [state, setState] = useState({ data: undefined, loading: true, error: null })
  const fnRef = useRef(fn)
  fnRef.current = fn
  const seq = useRef(0)

  const load = useCallback(async (silent) => {
    const my = ++seq.current
    if (!silent) setState((s) => ({ ...s, loading: s.data === undefined }))
    try {
      const data = await fnRef.current()
      if (my === seq.current) setState({ data, loading: false, error: null })
    } catch (error) {
      if (my === seq.current) setState((s) => ({ ...s, loading: false, error }))
      console.error(error)
    }
  }, [])

  useEffect(() => { load() }, deps) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => subscribe(tables, () => load(true)), [tables.join(',')]) // eslint-disable-line react-hooks/exhaustive-deps

  return { ...state, reload: () => load(true) }
}

// lê uma tabela inteira (ou filtrada). Lança erro em caso de falha.
// O Supabase devolve no máximo 1000 linhas por requisição; aqui buscamos em páginas
// até atingir o limite pedido (ou tudo, quando não há limite).
const PAGE_SIZE = 1000
const NO_ID = new Set(['settings', 'role_permissions', 'insight_dismissals'])
export async function fetchRows(table, { select = '*', where, order, ascending = false, limit, archived = false } = {}) {
  const max = limit || Infinity
  const out = []
  for (let from = 0; from < max; from += PAGE_SIZE) {
    const to = Math.min(from + PAGE_SIZE, max) - 1
    let q = supabase.from(table).select(select)
    if (!archived && ARCHIVABLE.has(table)) q = q.is('archived_at', null)
    if (where) q = where(q)
    if (order !== null) q = q.order(order || 'created_at', { ascending })
    // desempate estável para a paginação não repetir nem pular linhas
    if (!NO_ID.has(table) && /(^|,\s*)id(\s*,|$)|^\*$/.test(select)) q = q.order('id', { ascending: true })
    q = q.range(from, to)
    const { data, error } = await q
    if (error) throw error
    out.push(...(data || []))
    if (!data || data.length < to - from + 1) break
  }
  return out
}

export async function fetchOne(table, id, select = '*') {
  const { data, error } = await supabase.from(table).select(select).eq('id', id).maybeSingle()
  if (error) throw error
  return data
}

export function useRows(table, opts = {}, deps = []) {
  const { extraTables = [], ...rest } = opts
  const r = useData(() => fetchRows(table, rest), [table, ...extraTables], deps)
  return { rows: r.data || [], loading: r.loading, error: r.error, reload: r.reload }
}

// ------------------------------------------------------------------
// Escrita — sempre emite a mudança e mostra erro amigável
// ------------------------------------------------------------------
function fail(error, quiet) {
  const msg = friendlyError(error)
  if (!quiet) notify(msg, 'err')
  const e = new Error(msg)
  e.cause = error
  throw e
}

export async function insert(table, values, { quiet, select = '*' } = {}) {
  const { data, error } = await supabase.from(table).insert(values).select(select)
  if (error) fail(error, quiet)
  emitChange(table)
  return Array.isArray(values) ? data : data?.[0]
}

export async function update(table, id, patch, { quiet } = {}) {
  const { data, error } = await supabase.from(table).update(patch).eq('id', id).select()
  if (error) fail(error, quiet)
  if (!data?.length && !quiet) notify('Nada foi alterado. Talvez você não tenha permissão.', 'err')
  emitChange(table)
  return data?.[0]
}

export async function updateWhere(table, where, patch, { quiet } = {}) {
  const { data, error } = await where(supabase.from(table).update(patch)).select()
  if (error) fail(error, quiet)
  emitChange(table)
  return data
}

export async function remove(table, id, { quiet } = {}) {
  const { error } = await supabase.from(table).delete().eq('id', id)
  if (error) fail(error, quiet)
  emitChange(table)
}

export async function archive(table, id, { quiet, undo = true } = {}) {
  await update(table, id, { archived_at: new Date().toISOString() }, { quiet })
  if (!quiet) {
    notify('Arquivado.', 'ok', undo ? { label: 'Desfazer', run: () => update(table, id, { archived_at: null }) } : null)
  }
}

export async function upsert(table, values, { onConflict, quiet } = {}) {
  const { data, error } = await supabase.from(table).upsert(values, onConflict ? { onConflict } : undefined).select()
  if (error) fail(error, quiet)
  emitChange(table)
  return data
}

export async function rpc(fn, args = {}, { quiet } = {}) {
  const { data, error } = await supabase.rpc(fn, args)
  if (error) fail(error, quiet)
  return data
}

// configurações (tabela settings)
let settingsCache = null
export async function getSettings(force) {
  if (settingsCache && !force) return settingsCache
  const rows = await fetchRows('settings', { order: null })
  settingsCache = Object.fromEntries(rows.map((r) => [r.key, r.value]))
  return settingsCache
}
export async function saveSetting(key, value) {
  await upsert('settings', { key, value }, { onConflict: 'key' })
  settingsCache = null
}
export function useSettings() {
  const r = useData(() => getSettings(true), ['settings'], [])
  return r.data || {}
}
