import React from 'react'
import { useNavigate } from 'react-router-dom'
import { upsert } from '../lib/data'
import { addDays, today } from '../lib/format'
import { Icon } from '../lib/icons'

const LV = { hi: 'Urgente', md: 'Atenção', op: 'Oportunidade', info: 'Info' }

export function InsightList({ items, limit, compact, empty = 'Tudo em dia. Nenhuma sugestão agora.' }) {
  const nav = useNavigate()
  const list = limit ? items.slice(0, limit) : items
  if (!list.length) return <div className="empty"><Icon name="check" size={20} />{empty}</div>
  const snooze = (i, days) => upsert('insight_dismissals', { key: i.key, until: addDays(today(), days) }, { onConflict: 'user_id,key' })
  return (
    <div>
      {list.map((i) => (
        <div key={i.key} className="insight">
          <span className={`lv ${i.level}`} aria-label={LV[i.level]} />
          <div className="stack-s" style={{ gap: 3, minWidth: 0 }}>
            <span style={{ fontSize: 13, fontWeight: 500 }}>{i.title}</span>
            {!compact ? <span className="lbl" style={{ lineHeight: 1.5 }}>{i.detail}</span> : null}
            {!compact ? <span className="lbl" style={{ fontSize: 11, color: 'var(--mut-2)' }}>{i.area} · {LV[i.level]}</span> : null}
          </div>
          <div className="row" style={{ gap: 6, flexWrap: 'nowrap' }}>
            {i.action ? (
              <button type="button" className="btn s" onClick={() => (i.action.run ? i.action.run() : nav(i.action.to))}>{i.action.label}</button>
            ) : null}
            <button type="button" className="btn s ic g" title="Dispensar por 7 dias" aria-label="Dispensar por 7 dias" onClick={() => snooze(i, 7)}>
              <Icon name="x" size={14} />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
