import React from 'react'
import { brl0 } from '../lib/format'

// Barras agrupadas por período: series = [{name, color, values:[], dashedFrom?}]
export function GroupedBars({ labels, series, height = 200, format = brl0, goal, highlight }) {
  const max = Math.max(1, goal || 0, ...series.flatMap((s) => s.values.map((v) => Math.abs(v || 0))))
  return (
    <div className="stack" style={{ gap: 8 }}>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${labels.length}, minmax(0, 1fr))`, gap: 14, height,
        alignItems: 'end', borderBottom: '1px solid #232826', position: 'relative' }}>
        {goal ? (
          <div title={`Meta: ${format(goal)}`} style={{ position: 'absolute', left: 0, right: 0, bottom: `${(goal / max) * 100}%`,
            borderTop: '1px dashed #5A625E' }} />
        ) : null}
        {labels.map((l, i) => (
          <div key={l} style={{ display: 'flex', gap: 4, alignItems: 'end', justifyContent: 'center', height: '100%' }}>
            {series.map((s) => {
              const v = s.values[i] || 0
              const dashed = s.dashedFrom !== undefined && i >= s.dashedFrom
              return (
                <div key={s.name} title={`${s.name} · ${l}: ${format(v)}`}
                  style={{ width: 16, height: `${Math.max(v ? 1.5 : 0, (Math.abs(v) / max) * 100)}%`, borderRadius: '3px 3px 0 0',
                    background: dashed ? 'transparent' : s.color, border: dashed ? `1px dashed ${s.color}` : 0,
                    borderBottom: 0, opacity: dashed ? 1 : s.opacity || 1 }} />
              )
            })}
          </div>
        ))}
      </div>
      <div className="lbl" style={{ display: 'grid', gridTemplateColumns: `repeat(${labels.length}, minmax(0, 1fr))`, gap: 14, textAlign: 'center' }}>
        {labels.map((l, i) => <span key={l} style={i === highlight ? { color: 'var(--tx)' } : undefined}>{l}</span>)}
      </div>
    </div>
  )
}

// Funil: steps = [{label, value}]
export function Funnel({ steps }) {
  const first = Math.max(1, steps[0]?.value || 0)
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr 80px', gap: '10px 12px', alignItems: 'center', fontSize: 13 }}>
      {steps.map((s, i) => {
        const prev = i > 0 ? steps[i - 1].value : null
        const conv = prev ? Math.round((s.value / prev) * 100) : null
        return (
          <React.Fragment key={s.label}>
            <span style={{ color: 'var(--tx-3)' }}>{s.label}</span>
            <div style={{ height: 22, background: '#141816', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.max(s.value ? 1.5 : 0, (s.value / first) * 100)}%`, background: 'var(--green)',
                opacity: 1 - i * 0.08, borderRadius: 4 }} />
            </div>
            <span className="num" style={{ textAlign: 'right' }}>
              {s.value}{conv !== null ? <span className="lbl"> {conv}%</span> : null}
            </span>
          </React.Fragment>
        )
      })}
    </div>
  )
}

// Barras horizontais: rows = [{label, value, display, sub}]
export function HBars({ rows, color = 'var(--green)', cols = ['', '', ''] }) {
  const max = Math.max(1, ...rows.map((r) => r.value || 0))
  return (
    <div className="stack" style={{ gap: 0 }}>
      {cols.some(Boolean) ? (
        <div className="lbl" style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, 200px) 1fr 100px 80px', gap: 12, padding: '6px 0' }}>
          <span>{cols[0]}</span><span>{cols[1]}</span><span style={{ textAlign: 'right' }}>{cols[2]}</span><span style={{ textAlign: 'right' }}>{cols[3]}</span>
        </div>
      ) : null}
      {rows.map((r) => (
        <div key={r.label} style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, 200px) 1fr 100px 80px', gap: 12, alignItems: 'center',
          padding: '9px 0', borderBottom: '1px solid var(--line-2)', fontSize: 13 }}>
          <span className="ellipsis">{r.label}</span>
          <div style={{ height: 18, borderRadius: 4, background: '#1A1F1C', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(Math.max(0, r.value) / max) * 100}%`, background: r.color || color, borderRadius: 4 }} />
          </div>
          <span className="num" style={{ textAlign: 'right' }}>{r.display ?? r.value}</span>
          <span className="num" style={{ textAlign: 'right', color: 'var(--mut)' }}>{r.sub ?? ''}</span>
        </div>
      ))}
    </div>
  )
}

// Barra empilhada única (partes de um todo)
export function StackBar({ parts, format = (v) => v }) {
  const total = parts.reduce((a, p) => a + (p.value || 0), 0)
  return (
    <div className="stack" style={{ gap: 12 }}>
      <div style={{ display: 'flex', height: 26, borderRadius: 6, overflow: 'hidden', gap: 2, background: '#141816' }}>
        {total ? parts.filter((p) => p.value > 0).map((p) => (
          <div key={p.label} title={`${p.label}: ${format(p.value)}`} style={{ flex: p.value, background: p.color }} />
        )) : null}
      </div>
      <div className="legend">
        {parts.map((p) => (
          <span key={p.label}><i style={{ background: p.color }} />{p.label} <b className="num" style={{ fontWeight: 500, color: 'var(--tx)' }}>{format(p.value)}</b></span>
        ))}
      </div>
    </div>
  )
}
