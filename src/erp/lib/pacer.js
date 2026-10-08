// Controle de ritmo dos envios no WhatsApp: intervalo entre mensagens, pausa a cada bloco,
// limite por hora e por dia, e alarme sonoro quando pode voltar a enviar.
// Os números são estimativas da prática (o WhatsApp não publica limites oficiais).
import { useCallback, useEffect, useRef, useState } from 'react'

export const PRESETS = {
  recuperacao: { label: 'Recuperação (logo após bloqueio)', perBlock: 3, gapMin: 90, gapMax: 150, pauseMin: 20, perHour: 10, perDay: 20 },
  cuidadoso: { label: 'Cuidadoso', perBlock: 5, gapMin: 60, gapMax: 120, pauseMin: 15, perHour: 15, perDay: 40 },
  normal: { label: 'Normal (número aquecido)', perBlock: 8, gapMin: 45, gapMax: 90, pauseMin: 10, perHour: 25, perDay: 80 },
}
const KEY = 'zk.pacer.v1'
const dayKey = () => new Date().toLocaleDateString('sv-SE')
const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null') } catch { return null } }
const save = (v) => { try { localStorage.setItem(KEY, JSON.stringify(v)) } catch { /* sem storage */ } }

function initial() {
  const s = load()
  const base = { preset: 'recuperacao', cfg: PRESETS.recuperacao, day: dayKey(), sends: [], blockCount: 0, until: 0, reason: '' }
  if (!s) return base
  if (s.day !== dayKey()) return { ...base, preset: s.preset, cfg: s.cfg || PRESETS[s.preset] || base.cfg }
  return { ...base, ...s }
}

// ---------- alarme ----------
let ctx = null
export function unlockAudio() {
  try { ctx = ctx || new (window.AudioContext || window.webkitAudioContext)(); if (ctx.state === 'suspended') ctx.resume() } catch { /* sem áudio */ }
}
// agenda o alarme no relógio de áudio: toca na hora certa mesmo com a aba em segundo plano
let scheduled = []
export function cancelAlarm() { scheduled.forEach((o) => { try { o.stop() } catch { /* já parou */ } }); scheduled = [] }
export function alarm(times = 3, delaySec = 0) {
  unlockAudio(); if (!ctx) return
  const t0 = ctx.currentTime + 0.05 + delaySec
  for (let r = 0; r < times; r++) {
    for (let i = 0; i < 4; i++) {
      const t = t0 + r * 1.4 + i * 0.22
      const o = ctx.createOscillator(); const g = ctx.createGain()
      o.type = 'square'; o.frequency.setValueAtTime(i % 2 ? 880 : 1175, t)
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.6, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18)
      o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + 0.2)
      if (delaySec) scheduled.push(o)
    }
  }
}
function notifyDesktop(text) {
  try {
    if ('Notification' in window && Notification.permission === 'granted') new Notification('Prospecção liberada', { body: text, silent: false })
  } catch { /* sem notificação */ }
}

export function usePacer() {
  const [st, setSt] = useState(initial)
  const [now, setNow] = useState(Date.now())
  const rang = useRef(null)
  if (rang.current === null) rang.current = !(st.until > Date.now())

  useEffect(() => { save(st) }, [st])
  // só atualiza a cada segundo enquanto há cronômetro rodando; parado, atualiza a cada 30 s
  useEffect(() => {
    const fast = st.until > Date.now()
    const i = setInterval(() => { const n = Date.now(); setNow(n); if (fast && n >= st.until + 1000) clearInterval(i) }, fast ? 1000 : 30000)
    return () => clearInterval(i)
  }, [st.until])
  // virou o dia: zera contadores
  useEffect(() => { if (st.day !== dayKey()) setSt((s) => ({ ...s, day: dayKey(), sends: [], blockCount: 0, until: 0, reason: '' })) }, [now]) // eslint-disable-line react-hooks/exhaustive-deps

  const cfg = st.cfg
  const today = st.sends.length
  const lastHour = st.sends.filter((t) => now - t < 3600e3).length
  const waiting = Math.max(0, st.until - now)
  const dayDone = today >= cfg.perDay

  // alarme quando a espera termina
  useEffect(() => {
    if (st.until && waiting === 0 && !rang.current) {
      rang.current = true
      if (st.reason === 'pausa' || st.reason === 'hora') {
        if (!scheduled.length) alarm(3) // pausa iniciada antes de recarregar a página
        scheduled = []
        notifyDesktop('Pode voltar a enviar mensagens.')
      }
      const t = document.title; document.title = '🔔 Pode enviar! · ' + t.replace(/^🔔 Pode enviar! · /, '')
      setTimeout(() => { document.title = document.title.replace(/^🔔 Pode enviar! · /, '') }, 15000)
    }
  }, [waiting, st.until, st.reason])

  const status = dayDone ? 'dia' : waiting > 0 ? st.reason : 'livre'

  const registerSend = useCallback(() => {
    unlockAudio()
    if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission().catch(() => {})
    setSt((s) => {
      const t = Date.now()
      const sends = [...s.sends, t]
      const c = s.cfg
      const inHour = sends.filter((x) => t - x < 3600e3).length
      const block = s.blockCount + 1
      let until = 0; let reason = ''; let blockCount = block
      if (sends.length >= c.perDay) { reason = 'dia' }
      else if (block >= c.perBlock) { until = t + c.pauseMin * 60e3; reason = 'pausa'; blockCount = 0 }
      else if (inHour >= c.perHour) { const first = sends.filter((x) => t - x < 3600e3)[0]; until = first + 3600e3; reason = 'hora'; blockCount = 0 }
      else { const gap = c.gapMin + Math.random() * (c.gapMax - c.gapMin); until = t + gap * 1000; reason = 'intervalo' }
      rang.current = false
      cancelAlarm()
      if (reason === 'pausa' || reason === 'hora') alarm(3, (until - t) / 1000)
      return { ...s, sends, blockCount, until, reason }
    })
  }, [])

  const setPreset = (p) => setSt((s) => ({ ...s, preset: p, cfg: PRESETS[p] }))
  const skipWait = () => { cancelAlarm(); rang.current = true; setSt((s) => ({ ...s, until: 0, reason: '' })) }
  const resetDay = () => setSt((s) => ({ ...s, sends: [], blockCount: 0, until: 0, reason: '' }))

  return { cfg, preset: st.preset, today, lastHour, blockCount: st.blockCount, waiting, status, registerSend, setPreset, skipWait, resetDay, testAlarm: () => alarm(1) }
}

export const mmss = (ms) => { const s = Math.ceil(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` }
