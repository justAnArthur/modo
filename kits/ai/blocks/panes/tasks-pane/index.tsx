/*!
 * Local addition: the side pane's Tasks — the session's background agents,
 * shells and child sessions, running ones first.
 */

'use client'

import { TooltipProvider } from '@justanarthur/modo-ui/components/overlays/tooltip'
import { cn } from '@justanarthur/modo-ui/lib/utils'
import { useState } from 'react'
import { useIcon } from '../../../lib/icons'
import { IconAction, PaneEmpty, PaneSection } from '../../../lib/pane-parts'
import type { PaneTask } from '../../../lib/side-pane-types'
import { RunningGlyph } from '../../../lib/status-glyph'

const TASK_KIND_ICON = { agent: 'bot', shell: 'terminal', session: 'split' } as const

function TaskRow({
  task,
  onStop,
  onRetry,
  slot,
}: {
  task: PaneTask
  onStop?: () => void
  onRetry?: () => void
  /** The pane offers an action: keep its column, so the glyphs line up. */
  slot: boolean
}) {
  const Icon = useIcon(TASK_KIND_ICON[task.kind])
  const Failed = useIcon('circle-x')
  const Done = useIcon('circle-check')
  const Stop = useIcon('square')
  const Retry = useIcon('rotate-ccw')
  const running = task.status === 'running'

  return (
    <li className="flex min-h-11 items-center gap-2 px-2 py-1">
      <Icon size={16} strokeWidth={1.5} className="shrink-0 text-muted-foreground" />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-body text-foreground">{task.title}</span>
        <span
          className={cn(
            'truncate text-caption',
            task.status === 'failed' ? 'text-status-error' : 'text-muted-foreground',
          )}
        >
          {task.status === 'stopped' ? `Stopped · ${task.detail}` : task.detail}
        </span>
      </span>
      <span className="flex size-4 shrink-0 items-center justify-center">
        {running && <RunningGlyph size={14} />}
        {task.status === 'done' && <Done size={14} strokeWidth={1.5} className="text-muted-foreground" />}
        {task.status === 'failed' && <Failed size={14} strokeWidth={1.5} className="text-status-error" />}
      </span>
      {/* One slot for the action, so the glyphs line up whether a row has one or not. */}
      {slot && (
        <span className="flex w-7 shrink-0 justify-center">
          {running && onStop && <IconAction icon={Stop} label="Stop" onClick={onStop} />}
          {(task.status === 'failed' || task.status === 'stopped') && onRetry && (
            <IconAction icon={Retry} label="Retry" onClick={onRetry} />
          )}
        </span>
      )}
    </li>
  )
}

interface TasksPaneProps {
  /** The session's background tasks. The pane shows them as given, a Stop or Retry applied until the next `tasks` arrives. */
  tasks: PaneTask[]
  /** Called with the running task Stop ends. Omit to leave Stop out. */
  onStop?: (task: PaneTask) => void
  /** Called with the failed or stopped task Retry starts again. Omit to leave Retry out. */
  onRetry?: (task: PaneTask) => void
}

/**
 * The session's background work: subagents, shells and child sessions,
 * running ones first.
 *
 * Each row names the task with its kind as a glyph and a line on what it
 * is doing or how it ended. A running task stops from its row (with
 * `onStop`); one that failed or stopped retries (with `onRetry`). The rows
 * follow `tasks`: a Stop or Retry shows at once and holds until new `tasks`
 * arrive. With none, the pane says what runs there.
 *
 * @example {@include ./examples.mdx}
 */
export default function TasksPane({ tasks, onStop, onRetry }: TasksPaneProps) {
  const [local, setLocal] = useState({ source: tasks, list: tasks })
  const list = local.source === tasks ? local.list : tasks
  const setStatus = (id: string, status: PaneTask['status']) =>
    setLocal(l => ({
      source: tasks,
      list: (l.source === tasks ? l.list : tasks).map(t => (t.id === id ? { ...t, status } : t)),
    }))
  const running = list.filter(t => t.status === 'running')
  const finished = list.filter(t => t.status !== 'running')

  if (list.length === 0)
    return (
      <PaneEmpty
        icon="list-checks"
        title="No background tasks"
        detail="Subagents, shells and child sessions run here."
      />
    )

  const rows = (items: PaneTask[]) => (
    <ul className="m-0 flex list-none flex-col p-0">
      {items.map(task => (
        <TaskRow
          key={task.id}
          task={task}
          slot={Boolean(onStop || onRetry)}
          onStop={
            onStop &&
            (() => {
              setStatus(task.id, 'stopped')
              onStop(task)
            })
          }
          onRetry={
            onRetry &&
            (() => {
              setStatus(task.id, 'running')
              onRetry(task)
            })
          }
        />
      ))}
    </ul>
  )

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-2">
        {running.length > 0 && (
          <PaneSection title="Running" meta={running.length}>
            {rows(running)}
          </PaneSection>
        )}
        {finished.length > 0 && (
          <PaneSection title="Finished" meta={finished.length}>
            {rows(finished)}
          </PaneSection>
        )}
      </div>
    </TooltipProvider>
  )
}

export type { TasksPaneProps }

export { TasksPane }
