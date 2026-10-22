import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { update } from '../lib/data'
import { dm, today, minutesLabel } from '../lib/format'
import { PRIORITIES, PRIORITY_CLASS, FRONTS, RECURRENCE } from '../lib/constants'
import { startTimer, stopTimer } from '../lib/automations'
import { useErp } from './Shell'
import { Icon } from '../lib/icons'

export function TaskRow({ task, project, showProject = true, onOpen, owner }) {
  const erp = useErp()
  const running = erp?.timer?.entry && erp.timer.entry.task_id === task.id
  const [optimistic, setOptimistic] = useState(null)
  useEffect(() => setOptimistic(null), [task.status])
  const done = optimistic ?? task.status === 'done'
  const late = !done && task.due_on && task.due_on < today()
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderTop: '1px solid var(--line-2)', fontSize: 13 }}>
      <input type="checkbox" aria-label={done ? 'Reabrir tarefa' : 'Concluir tarefa'} checked={done}
        onChange={(e) => { const v = e.target.checked; setOptimistic(v); update('tasks', task.id, { status: v ? 'done' : 'todo' }).catch(() => setOptimistic(null)) }} />
      <button type="button" onClick={() => onOpen?.(task)} className={done ? 'strike' : ''}
        style={{ flex: 1, minWidth: 0, background: 'none', border: 0, color: done ? undefined : 'var(--tx)', textAlign: 'left', cursor: onOpen ? 'pointer' : 'default', padding: 0, font: 'inherit' }}>
        <span className="ellipsis" style={{ display: 'block' }}>{task.title}</span>
      </button>
      {task.recurrence && task.recurrence !== 'none' ? <span className="lbl" title={RECURRENCE[task.recurrence]}>↻</span> : null}
      {owner ? <span className="lbl">{owner}</span> : null}
      {!done && task.priority !== 'normal' ? <span className={PRIORITY_CLASS[task.priority]}>{PRIORITIES[task.priority]}</span> : null}
      {showProject && project ? <Link to={`/erp/projetos/${project.id}`} className="lbl ellipsis" style={{ color: 'var(--blue)', maxWidth: 160 }}>{project.name}</Link>
        : showProject ? <span className="lbl">{FRONTS[task.front] || ''}</span> : null}
      {task.due_on ? <span className={`num lbl ${late ? 'bad' : ''}`} style={late ? { color: 'var(--red)' } : undefined}>{task.due_on === today() ? 'hoje' : dm(task.due_on)}</span> : null}
      {!done ? (
        <button type="button" className={`btn s ic ${running ? '' : 'g'}`} aria-label={running ? 'Parar cronômetro' : 'Iniciar cronômetro'}
          title={running ? 'Parar cronômetro' : 'Iniciar cronômetro'}
          onClick={() => (running ? stopTimer(erp.timer.entry) : startTimer({ task_id: task.id, project_id: task.project_id }))}
          style={running ? { color: 'var(--green-tx)', borderColor: 'var(--green-ln)' } : undefined}>
          <Icon name={running ? 'stop' : 'play'} size={12} />
        </button>
      ) : null}
    </div>
  )
}

export { minutesLabel }
