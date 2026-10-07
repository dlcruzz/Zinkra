import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { Icon } from '../lib/icons'
import { onToast } from '../lib/data'
import { centsToInput, toCents, initials } from '../lib/format'

export function PageHead({ title, sub, children }) {
  return (
    <div className="page-head">
      <div className="t">
        <h1>{title}</h1>
        {sub ? <span className="lbl">{sub}</span> : null}
      </div>
      {children ? <div className="row">{children}</div> : null}
    </div>
  )
}

export function Card({ title, action, children, className = '', pad, style }) {
  return (
    <section className={`card ${pad ? 'pad' : ''} ${className}`} style={style}>
      {title || action ? (
        <div className="card-h" style={pad ? { padding: '0 0 10px' } : undefined}>
          {typeof title === 'string' ? <h2>{title}</h2> : title}
          {action}
        </div>
      ) : null}
      {children}
    </section>
  )
}

// número que "sobe" contando até o valor; aceita número ou texto formatado ("R$ 1.234,50", "42%", "3 / 10")
export function CountUp({ value, duration = 900 }) {
  const parsed = parseNum(value)
  const [shown, setShown] = useState(parsed ? 0 : null)
  const from = useRef(0)
  useEffect(() => {
    if (!parsed) return undefined
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const start = performance.now(); const a = from.current; const b = parsed.n
    if (reduce || a === b) { setShown(b); from.current = b; return undefined }
    let raf
    const step = (t) => {
      const k = Math.min(1, (t - start) / duration); const e = 1 - Math.pow(1 - k, 3)
      setShown(a + (b - a) * e)
      if (k < 1) raf = requestAnimationFrame(step); else from.current = b
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [parsed?.n]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!parsed || shown === null) return <>{value}</>
  return <>{parsed.pre}{formatLike(shown, parsed)}{parsed.post}</>
}
function parseNum(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? { n: v, pre: '', post: '', dec: Number.isInteger(v) ? 0 : 1, br: false, sep: false } : null
  if (typeof v !== 'string') return null
  if (/\d\/\d|\d:\d\d|\d{4}-\d{2}/.test(v)) return null // datas e horas não animam
  const m = v.match(/-?\d{1,3}(?:\.\d{3})+(?:,\d+)?|-?\d+(?:,\d+)?/)
  if (!m) return null
  const raw = m[0]
  const dec = raw.includes(',') ? raw.split(',')[1].length : 0
  const n = Number(raw.replace(/\./g, '').replace(',', '.'))
  if (!Number.isFinite(n)) return null
  return { n, pre: v.slice(0, m.index), post: v.slice(m.index + raw.length), dec, sep: raw.includes('.'), br: true }
}
function formatLike(x, p) {
  if (!p.br) return p.dec ? x.toFixed(1) : String(Math.round(x))
  return x.toLocaleString('pt-BR', { minimumFractionDigits: p.dec, maximumFractionDigits: p.dec, useGrouping: p.sep })
}

export function Kpi({ label, value, hint, hintClass = 'lbl', bar, barClass = '', accent }) {
  return (
    <div className="card kpi" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10, borderColor: accent ? 'var(--green-ln)' : undefined }}>
      <span className="lbl">{label}</span>
      <span className="num big" style={accent ? { color: 'var(--green-tx)' } : undefined}><CountUp value={value} /></span>
      {bar !== undefined ? <Bar value={bar} className={barClass} /> : null}
      {hint ? <span className={hintClass}>{hint}</span> : null}
    </div>
  )
}

export function Bar({ value = 0, className = '', large }) {
  return (
    <div className={`bar ${className} ${large ? 'l' : ''}`}>
      <i style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  )
}

export function Badge({ kind = '', dot = true, children, title }) {
  return <span className={`b ${kind} ${dot ? 'dot' : ''}`} title={title}>{children}</span>
}

export function Seg({ value, onChange, options }) {
  return (
    <div className="seg" role="tablist">
      {options.map(([v, label]) => (
        <button key={v} type="button" role="tab" aria-selected={value === v} className={value === v ? 'on' : ''} onClick={() => onChange(v)}>
          {label}
        </button>
      ))}
    </div>
  )
}

export function Tabs({ value, onChange, options }) {
  return (
    <div className="tabs" role="tablist">
      {options.map(([v, label, count]) => (
        <button key={v} type="button" role="tab" aria-selected={value === v} className={`tab ${value === v ? 'on' : ''}`} onClick={() => onChange(v)}>
          {label}
          {count !== undefined && count !== null ? <span className="c">{count}</span> : null}
        </button>
      ))}
    </div>
  )
}

export function Field({ label, children, hint, style }) {
  return (
    <label className="field" style={style}>
      <span>{label}</span>
      {children}
      {hint ? <span className="lbl" style={{ fontSize: 11 }}>{hint}</span> : null}
    </label>
  )
}

export function Select({ value, onChange, options, placeholder, className = 'sel', ...rest }) {
  const list = Array.isArray(options) ? options : Object.entries(options)
  return (
    <select className={className} value={value ?? ''} onChange={(e) => onChange(e.target.value || null)} {...rest}>
      {placeholder !== undefined ? <option value="">{placeholder}</option> : null}
      {list.map((o) => {
        const [v, l] = Array.isArray(o) ? o : [o, o]
        return <option key={v} value={v}>{l}</option>
      })}
    </select>
  )
}

export function MoneyInput({ value, onChange, placeholder = '0,00', ...rest }) {
  const [txt, setTxt] = useState(centsToInput(value))
  const focused = useRef(false)
  useEffect(() => { if (!focused.current) setTxt(centsToInput(value)) }, [value])
  return (
    <input className="in num" inputMode="decimal" placeholder={placeholder} value={txt} {...rest}
      onFocus={() => { focused.current = true }}
      onChange={(e) => { setTxt(e.target.value); onChange(toCents(e.target.value)) }}
      onBlur={() => { focused.current = false; setTxt(centsToInput(toCents(txt))) }} />
  )
}

export function Empty({ icon = 'spark', children, action }) {
  return (
    <div className="empty">
      <Icon name={icon} size={20} />
      <div>{children}</div>
      {action}
    </div>
  )
}

export function Loading({ rows = 4 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 16 }} aria-busy="true" aria-label="Carregando">
      {Array.from({ length: rows }).map((_, i) => <div key={i} className="skel" style={{ height: 18, width: `${90 - i * 12}%` }} />)}
    </div>
  )
}

export function ErrorBox({ error, onRetry }) {
  if (!error) return null
  return (
    <div className="note r row" style={{ justifyContent: 'space-between' }}>
      <span>Não foi possível carregar: {error.message || String(error)}</span>
      {onRetry ? <button type="button" className="btn s" onClick={onRetry}>Tentar de novo</button> : null}
    </div>
  )
}

export function Avatar({ name, small }) {
  return <span className={`avatar ${small ? 's' : ''}`} title={name}>{initials(name)}</span>
}

function useEscape(onClose) {
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])
}

export function Modal({ title, onClose, children, footer, size = '' }) {
  useEscape(onClose)
  return (
    <div className="erp-overlay center" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.() }}>
      <div role="dialog" aria-label={typeof title === 'string' ? title : undefined} className={`modal ${size}`}>
        <div className="modal-h">
          <h2 style={{ fontSize: 15 }}>{title}</h2>
          <button type="button" className="btn ic s g" aria-label="Fechar" onClick={onClose}><Icon name="x" /></button>
        </div>
        <div className="modal-b">{children}</div>
        {footer ? <div className="modal-f">{footer}</div> : null}
      </div>
    </div>
  )
}

export function Drawer({ title, onClose, children, footer }) {
  useEscape(onClose)
  return (
    <div className="erp-overlay right" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.() }}>
      <div role="dialog" aria-label={typeof title === 'string' ? title : undefined} className="drawer">
        <div className="modal-h">
          <h2 style={{ fontSize: 16 }}>{title}</h2>
          <button type="button" className="btn ic s g" aria-label="Fechar" onClick={onClose}><Icon name="x" /></button>
        </div>
        <div className="modal-b" style={{ flex: 1 }}>{children}</div>
        {footer ? <div className="modal-f">{footer}</div> : null}
      </div>
    </div>
  )
}

// confirmação simples
const ConfirmCtx = createContext(null)
export const useConfirm = () => useContext(ConfirmCtx)
export function ConfirmProvider({ children }) {
  const [ask, setAsk] = useState(null)
  const confirm = (message, { ok = 'Confirmar', danger } = {}) =>
    new Promise((resolve) => setAsk({ message, ok, danger, resolve }))
  const close = (v) => { ask?.resolve(v); setAsk(null) }
  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      {ask ? (
        <Modal title="Confirmar" size="sm" onClose={() => close(false)}
          footer={<>
            <button type="button" className="btn" onClick={() => close(false)}>Cancelar</button>
            <button type="button" className={`btn ${ask.danger ? 'd' : 'p'}`} onClick={() => close(true)} autoFocus>{ask.ok}</button>
          </>}>
          <p style={{ fontSize: 14, lineHeight: 1.55 }}>{ask.message}</p>
        </Modal>
      ) : null}
    </ConfirmCtx.Provider>
  )
}

export function Toasts() {
  const [list, setList] = useState([])
  useEffect(() => onToast((t) => {
    setList((l) => [...l.slice(-3), t])
    setTimeout(() => setList((l) => l.filter((x) => x.id !== t.id)), t.action ? 7000 : 4200)
  }), [])
  if (!list.length) return null
  return (
    <div className="toasts" role="status" aria-live="polite">
      {list.map((t) => (
        <div key={t.id} className={`toast ${t.type}`}>
          <span style={{ flex: 1 }}>{t.message}</span>
          {t.action ? (
            <button type="button" className="btn s" onClick={() => { t.action.run(); setList((l) => l.filter((x) => x.id !== t.id)) }}>
              {t.action.label}
            </button>
          ) : null}
        </div>
      ))}
    </div>
  )
}

export function Spinner() {
  return <span className="spinner" aria-label="Carregando" />
}

// botão que mostra estado de carregamento enquanto a ação roda
export function AsyncButton({ onClick, children, className = 'btn', disabled, ...rest }) {
  const [busy, setBusy] = useState(false)
  return (
    <button type="button" className={className} disabled={disabled || busy} {...rest}
      onClick={async (e) => {
        setBusy(true)
        try { await onClick?.(e) } catch (err) { console.error(err) } finally { setBusy(false) }
      }}>
      {busy ? <Spinner /> : null}
      {children}
    </button>
  )
}

export function Stat({ label, value, sub, valueClass = '' }) {
  return (
    <div className="stat">
      <span className="lbl">{label}</span>
      <span className={`num ${valueClass}`} style={{ fontSize: 20 }}><CountUp value={value} /></span>
      {sub ? <span className="lbl">{sub}</span> : null}
    </div>
  )
}
