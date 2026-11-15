/*!
 * Local addition: what closes a turn in the transcript — the pinned task list
 * under the latest message, and the wrap-up "next step" box with a recap, one
 * question and one or two answers.
 */

'use client'

import { useState } from 'react'
import Button from '../../../components/button'
import { useIcon } from '../../../lib/icon-context'
import { useShape } from '../../../lib/shape-context'
import { cn } from '../../../lib/utils'
import { RunningGlyph } from '../status-glyph'

export interface TaskItem {
  content: string
  status: 'pending' | 'in_progress' | 'completed'
}

export interface TaskListProps {
  /** The plan, in order. */
  items: TaskItem[]
  /** Start with every step showing; folded, the header names the step in progress. Defaults to `true`. */
  defaultOpen?: boolean
}

/** The pinned task list: the plan, with the step in progress turning. Folds to one row. */
export function TaskList({ items, defaultOpen = true }: TaskListProps) {
  const shape = useShape()
  const [open, setOpen] = useState(defaultOpen)
  const Check = useIcon('check')
  const Chevron = useIcon('chevron-up')
  const done = items.filter(i => i.status === 'completed').length
  const current = items.find(i => i.status === 'in_progress')

  return (
    <section
      aria-label="Tasks"
      className={cn('flex flex-col gap-1 border border-border p-[var(--space-3)]', shape.container)}
    >
      <div className="flex min-w-0 items-center gap-2 text-caption">
        <span className="shrink-0 weight-medium text-foreground">Tasks</span>
        {!open && current && <span className="min-w-0 truncate text-muted-foreground">{current.content}</span>}
        <span className="ml-auto shrink-0 tabular-nums text-muted-foreground">
          {done} of {items.length}
        </span>
        <Button
          variant="ghost"
          size="icon-compact"
          aria-label={open ? 'Fold the task list' : 'Show every task'}
          aria-expanded={open}
          className="-mr-1.5 size-6"
          onClick={() => setOpen(!open)}
        >
          <Chevron className={cn('transition-transform duration-fast', !open && 'rotate-180')} />
        </Button>
      </div>
      <ol className={cn('m-0 flex flex-col p-0', !open && 'hidden')}>
        {items.map(item => (
          <li key={item.content} className="flex min-h-6 items-center gap-2 text-body">
            <span className="flex size-4 shrink-0 items-center justify-center">
              {item.status === 'in_progress' ? (
                <RunningGlyph size={14} />
              ) : item.status === 'completed' ? (
                <Check size={14} strokeWidth={2} className="text-muted-foreground" />
              ) : (
                <span className="size-2.5 rounded-full border border-muted-foreground" />
              )}
            </span>
            <span
              className={cn(
                'min-w-0 truncate',
                item.status === 'in_progress' ? 'weight-medium text-foreground' : 'text-muted-foreground',
                item.status === 'pending' && 'text-foreground',
              )}
            >
              {item.content}
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}

export interface NextStepProps {
  /** Two or three sentences: what is now true, what is not done or not verified. */
  recap: string
  /** The one decision left to the user, if any. */
  ask?: string
  /** One or two answers to `ask`; the first is the recommendation. */
  actions?: string[]
  /** Called with the picked answer. */
  onAction?: (label: string) => void
}

/** The wrap-up box: a recap, and when the user has a decision to make, one question with its answers. */
export function NextStep({ recap, ask, actions = [], onAction }: NextStepProps) {
  const shape = useShape()
  const Flag = useIcon('corner-down-right')
  return (
    <section aria-label="Next step" className={cn('flex flex-col gap-3 bg-muted p-[var(--space-3)]', shape.container)}>
      <p className="m-0 text-body text-muted-foreground">{recap}</p>
      {ask && (
        <div className="flex flex-wrap items-center gap-2">
          <Flag size={16} strokeWidth={1.5} className="shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 text-body weight-medium text-foreground">{ask}</span>
          <div className="flex shrink-0 gap-2">
            {actions.slice(0, 2).map((label, i) => (
              <Button
                key={label}
                size="compact"
                variant={i === 0 ? 'primary' : 'tertiary'}
                onClick={() => onAction?.(label)}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
